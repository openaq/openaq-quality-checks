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
 *     - `flag`    {String}: What string to use when adding a flag.
 *     - `type`    {String}: What type of check on values to run. Must be one of 'exact', 'set', 'range', or 'repeats'.
 *     - `value`   {Number}: When type is 'exact', `value` is required.
 *     - `values`  {Array}: When type is 'set', `values` is required.
 *     - `start`   {Object}: When type is 'range', `start` is required.
 *     - `end`     {Object}: When type is 'range', `end` is required.
 *     - `groupBy` {String|Array}: When type is 'repeats', `groupBy` is used to group the data by one or more fields.
 *.    - `orderBy` {String}: When type is 'repeats', `orderBy` is used to order data within a group.
 * @return {Flagger}
 */
class Flagger {
  constructor(args = {}) {
    const schema = Joi.object().keys({
      flag: Joi.string().required(),
      type: Joi.any().valid('exact', 'set', 'range', 'repeats').required(),
      value: Joi.number().when('type', {is: 'exact', then: Joi.required()}),
      values: Joi.array().when('type', {is: 'set', then: Joi.required()}),
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
      groupBy: Joi.any(),
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

    const result = Joi.validate(args, schema, { context: { startValue: startValue } }, (err, value) => {
      if (err) throw err;
    });

    this.config = args;
  }

  /**
   * `addFlag` adds a flag object to the datum flags field if the item matches the flagger criteria.
   *
   * @param {Object} `datum` - expected to have a value field
   * @return {Object} `datum` - same as input datum, but potentially having a new flag in a `flags` field.
   */
  addFlag(datum, additionalFlags = {}) {
    let addFlag = false;
    switch (this.config.type) {
      case 'exact': {
        addFlag = datum.value === this.config.value;
        break;
      }
      case 'set': {
        addFlag = this.config.values.includes(datum.value);
        break;
      }
      case 'range': {
        // inclusive
        const isNumber = typeof(datum.value) === 'number';
        const isGreaterOrEqualToStart = () => {
          if (!this.config.start) return true;
          if (this.config.start.exclusive === true) {
            return datum.value > this.config.start.value;
          } else {
            return datum.value >= this.config.start.value;
          }
        }
        const isLessOrEqualToEnd = () => {
          if (!this.config.end) return true;
          if (this.config.end.exclusive === true) {
            return datum.value < this.config.end.value;
          } else {
            return datum.value <= this.config.end.value;
          }
        }
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
   * @param  {Array} results Starts empty, values from data are added on recursive calls to flagRepeats
   * @return {Array}         Final `results` array, populated from initial data array.
   */
  flagRepeats(data, results = []) {
    // Base case
    if (data.length === 0) return results;

    // Setup variables for our repeat-checking loop
    let currentIndex = 0;
    let currentItem = {...data[0]};
    let nextItem = data[currentIndex+1];
    let currentSequence = [];
    const currentValue = currentItem.value;

    while (nextItem && currentValue === nextItem.value) {
      currentSequence.push(currentItem);
      currentIndex += 1;
      currentItem = {...data[currentIndex]};
      nextItem = {...data[currentIndex+1]};
    }

    if (currentIndex === 0) {
      results.push(currentItem);
    } else {
      currentSequence.push(currentItem);
      currentSequence.forEach((item, idx) => {
        let flaggedItem = {...item};
        if ((this.config.repeatMinimum === undefined) || (currentSequence.length >= this.config.repeatMinimum)) {
          flaggedItem = this.addFlag(item, {sequenceNumber: idx+1})
        }
        results.push(flaggedItem);
      });
    }
    return this.flagRepeats(data.slice(currentIndex+=1, data.length), results);
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
