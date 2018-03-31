'use strict';

const _ = require('lodash');
const Joi = require('joi');
const objectPath = require('object-path');

/**
 * Flagger adds flags data.
 * What data is flagged depends on arguments passed to the constructor.
 *
 * @example:
 * const flagger = new Flagger({flag: 'F', type: 'exact'});
 * flagger.flag(data);
 *
 * @param  {Object} `args` - configuration for a new Flagger instance.
 *   `args` requires:
 *     - `flag`       {String}: What string to use when adding a flag.
 *     - `type`       {String}: What type of check on values to run. Must be one of 'exact', 'set', 'range', or 'repeats'.
 *     - `valueField` {String}: Optional - The name of the field to flag. Defaults to 'value'. Can use object-path syntax for nested fields.
 *     - `value`      {Number}: When type is 'exact', `value` is required.
 *     - `values`     {Array}: When type is 'set', `values` is required.
 *     - `start`      {Object}: When type is 'range', `start` is required.
 *     - `end`        {Object}: When type is 'range', `end` is required.
 *     - `groupBy`    {String|Array}: When type is 'repeats', `groupBy` is used to group the data by one or more fields.
 *.    - `orderBy`    {String}: When type is 'repeats', `orderBy` is used to order data within a group.
 * @return {Flagger}
 */
class Flagger {
  constructor(args = {}) {
    const schema = Joi.object().keys({
      flag: Joi.string().required(),
      type: Joi.any().valid('exact', 'set', 'range', 'repeats').required(),
      valueField: Joi.string(),
      value: Joi.number().when('type', {is: 'exact', then: Joi.required()}),
      values: Joi.array().when('type', {is: 'set', then: Joi.required()}),
      includes: Joi.boolean(),
      start: Joi.object()
        .keys({
          value: Joi.number().required(),
          exclusive: Joi.boolean()
        }),
      end: Joi.object()
        .keys({
          value: Joi.number().required(),
          exclusive: Joi.boolean()
        }),
      repeatMinimum: Joi.number().positive(),
      groupBy: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
      orderBy: Joi.string()
    })
      .when(Joi.object({ start: Joi.exist(), end: Joi.exist() }).unknown(), {
        then: Joi.object({
          end: Joi.object().keys({value: Joi.number().greater(Joi.ref('$startValue'))})
        })
      })
      .when(Joi.object({ type: 'range' }).unknown(), {
        then: Joi.object().or('start', 'end')
      });

    // This is a workaround for checking if the end value is greater than the
    // start value, Joi.ref can't point up the object tree, but we can pass a
    // reference to the start value via the context object.
    const startValue = (args.start && typeof args.start.value === 'number') ? args.start.value : undefined;

    Joi.validate(args, schema, { context: { startValue: startValue } }, (err, value) => {
      if (err) throw err;
    });

    this.config = args;
    // for sets
    this.config.includes = this.config.includes !== 'false';
    this.config.valueField = this.config.valueField || 'value';
  }

  /**
   * `addFlag` adds a flag object to the datum flags field if the item matches the flagger criteria.
   *
   * @param {Object} `datum` - expected to have a value field
   * @return {Object} `datum` - same as input datum, but potentially having a new flag in a `flags` field.
   */
  addFlag(datum, additionalFlags = {}) {
    let addFlag = false;
    const datumValue = objectPath.get(datum, this.config.valueField);
    switch (this.config.type) {
      case 'exact': {
        addFlag = datumValue === this.config.value;
        break;
      }
      case 'set': {
        const valueInSet = this.config.values.includes(datumValue);
        // TODO: There is probably a way to simplify this boolean expression
        addFlag = (valueInSet && this.config.includes) || (!valueInSet && !this.config.includes);
        break;
      }
      case 'range': {
        // inclusive
        const isNumber = typeof (datumValue) === 'number';
        const isGreaterOrEqualToStart = () => {
          if (!this.config.start) return true;
          if (this.config.start.exclusive === true) {
            return datumValue > this.config.start.value;
          } else {
            return datumValue >= this.config.start.value;
          }
        };
        const isLessOrEqualToEnd = () => {
          if (!this.config.end) return true;
          if (this.config.end.exclusive === true) {
            return datumValue < this.config.end.value;
          } else {
            return datumValue <= this.config.end.value;
          }
        };
        addFlag = isNumber && isGreaterOrEqualToStart() && isLessOrEqualToEnd();
        break;
      }
      case 'repeats': {
        addFlag = true;
        break;
      }
      default: {
        break;
      }
    }
    if (addFlag) {
      datum.flags = datum.flags || [];
      datum.flags.push({flag: this.config.flag, ...additionalFlags});
    }
    return datum;
  }

  /**
   * `flagRepeats` flags sequences of the same value.
   *
   * `flagRepeats` uses the first item in the `data` argument flag sequence of items with the same value.
   * As it checks for repeats, it "shifts" the initial data array on recursive calls.
   *
   * @param  {Array} data    Initial array of data items. Upon last call it should be the empty array.
   * @return {Array}         Final `results` array, populated from initial data array.
   */
  flagRepeats(data) {
    let itemsRemaining = _.map(data, _.clone);
    let flaggedResults = [];
    const repeatMinimum = this.config.repeatMinimum ? this.config.repeatMinimum : 2;

    // loop:
    while (itemsRemaining.length > 0) {
      let currentSequenceIndex = 1;
      let currentValue = objectPath.get(itemsRemaining[0], this.config.valueField);
      let nextValue = objectPath.get(itemsRemaining[1], this.config.valueField);
      let currentRepeats = [itemsRemaining[0]];
      while (nextValue === currentValue) {
        currentRepeats.push(itemsRemaining[currentSequenceIndex]);
        currentSequenceIndex += 1;
        nextValue = objectPath.get(itemsRemaining[currentSequenceIndex], this.config.valueField);
      }
      if (currentRepeats.length >= repeatMinimum) {
        // add flags
        currentRepeats = currentRepeats.map((item, idx) => {
          return this.addFlag(item, {sequenceNumber: idx + 1});
        });
      }
      flaggedResults = flaggedResults.concat(currentRepeats);
      itemsRemaining = itemsRemaining.slice(currentSequenceIndex, itemsRemaining.length);
    }
    return flaggedResults;
  }

  groupAndOrderData(data) {
    let groupedAndOrderedGroups = [];
    const groupByFields = _.castArray(this.config.groupBy);
    const groupedBy = _.groupBy(data, d => {
      return _.map(groupByFields, f => objectPath.get(d, f));
    });
    Object.keys(groupedBy).forEach((key) => {
      const group = _.orderBy(groupedBy[key], this.config.orderBy);
      groupedAndOrderedGroups.push(group);
    });
    return groupedAndOrderedGroups;
  }

  /**
   * `flag` flags a list of data objects.
   *
   * @param  {Array} `data` an array of objects, each which is expected to have a `value` field for flagging.
   * @return {Array} Same data as input argument, but with flags fields added.
   */
  flag(data) {
    if (this.config.type === 'repeats') {
      // if there is a group and order by, we want to group and order by and
      // then flag repeats in each group.
      if ((this.config.groupBy !== undefined) && (this.config.orderBy !== undefined)) {
        let flaggedData = [];
        const groups = this.groupAndOrderData(data);
        groups.forEach((group) => flaggedData.push(...this.flagRepeats(group)));
        return flaggedData;
      } else {
        return this.flagRepeats(data);
      }
    }

    return data.map((datum) => {
      // datum is a reference to each object in data, so make a copy.
      let flaggedDatum = {...datum};
      return this.addFlag(flaggedDatum);
    });
  }
}

module.exports = Flagger;
