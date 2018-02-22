'use strict';

const Joi = require('joi');

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
 *     - `flag`   {String}: What string to use when adding a flag.
 *     - `type`   {String}: What type of check on values to run. Must be one of 'exact', 'set', or 'range'.
 *     - `value`  {Number}: When type is 'exact', `value` is required.
 *     - `values` {Array}: When type is 'set', `values` is required.
 *     - `start`  {Object}: When type is 'range', `start` is required.
 *     - `end`    {Object}: When type is 'range', `end` is required.
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
      repeatMinimum: Joi.number().positive()
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
   * @returns {Object} `datum` - same as input datum, but potentially having a new flag in a `flags` field.
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
      datum.flags.push({...additionalFlags, flag: this.config.flag});
    }
    return datum;
  }

  flagRepeats(data, results = []) {
    if (data.length === 1) {
      results.push(data[0]);
      return results;
    }
    if (data.length === 0) return results;

    let currentItem = {...data[0]};
    const currentValue = currentItem.value;
    let currentIndex = 0;
    let currentSequence = [];
    let nextItem = data[currentIndex+1];

    while (nextItem && currentValue === nextItem.value) {
      currentSequence.push(currentItem);
      currentIndex += 1;
      currentItem = {...data[currentIndex]};
      nextItem = {...data[currentIndex+1]};
    }

    if (currentIndex === 0) {
      results.push(currentItem);
    } else {
      // we need to add the last thing
      const nextItem = {...data[currentIndex]};
      currentSequence.push(nextItem);
      currentSequence.forEach((item, idx) => {
        let flaggedItem = {...item};
        if ((this.config.repeatMinimum === undefined) || (currentSequence.length >= this.config.repeatMinimum)) {
          flaggedItem = this.addFlag(item, {sequenceNumber: idx+1})
        }
        results.push(flaggedItem);
      });
    }
    return this.flagRepeats(data.slice(currentIndex += 1, data.length), results);
  }

  /**
   * `flag` flags a list of data objects.
   *
   * @param  {Array} `data` an array of objects, each which is expected to have a `value` field for flagging.
   * @return {Array} Same data as input argument, but with flags fields added.
   */
  flag(data) {
    if (this.config.type === 'repeats') {
      return this.flagRepeats(data);
    }

    return data.map((datum) => {
      // datum is a reference to each object in data, so make a copy.
      let flaggedDatum = {...datum};
      return this.addFlag(flaggedDatum);
    });
  }
}

module.exports = Flagger;
