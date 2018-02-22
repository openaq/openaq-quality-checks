const Joi = require('joi');

/**
 * Flagger adds flags to an array of items.
 * What data is flagged is configurable given the arguments passed to the constructor.
 *
 */
class Flagger {
  /**
   * Flagger constructor.
   *
   * example: new Flagger({flag: 'F', type: 'exact'})
   *
   * @param  {Object} `args` - configuration for the Flagger instance.
   *   `args` requires:
   *     - flag (string)
   *     - type (string, one of 'exact', 'set', 'range')
   *     - type 'exact' requires a value
   *     - type 'set' requires an array of values
   *     - type 'range' requires a start and end object, each of which require a value field.
   * @return {Flagger instance}
   */
  constructor(args = {}) {
    const schema = Joi.object().keys({
      flag: Joi.string().required(),
      type: Joi.any().valid('exact', 'set', 'range').required(),
      value: Joi.number().when('type', {is: 'exact', then: Joi.required()}),
      values: Joi.array().when('type', {is: 'set', then: Joi.required()}),
      start: Joi.object()
        .keys({
          value: Joi.number().required(),
          exclusive: Joi.boolean()
        })
        .when('type', {is: 'range', then: Joi.required()}),
      end: Joi.object()
        .keys({
          value: Joi.number().greater(Joi.ref('$startValue')).required(),
          exclusive: Joi.boolean()
        })
        .when('type', {is: 'range', then: Joi.required()})
    });

    // This is a workaround for checking if the end value is greater than the
    // start value, Joi.ref can't point up the object tree, but we can pass a
    // reference to the start value via the context object.
    const startValue = (args.start && typeof args.start.value === 'number') ? args.start.value : undefined;

    const result = Joi.validate(args, schema, { context: { startValue: startValue } }, (err, value) => {
      if (err) throw err;
    });

    this.config = {...args};
  }

  /**
   * `addFlag` adds a flag object to the datum flags field if the item matches the flagger criteria.
   *
   * @param {Object} `datum` - expected to have a value field
   * @returns {Object} `datum` - same as input datum, but potentially having a new flag in a `flags` field.
   */
  addFlag(datum) {
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
          if (this.config.start.exclusive === true) {
            return datum.value > this.config.start.value;
          } else {
            return datum.value >= this.config.start.value;
          }
        }
        const isLessOrEqualToEnd = () => {
          if (this.config.end.exclusive === true) {
            return datum.value < this.config.end.value;
          } else {
            return datum.value <= this.config.end.value;
          }
        }
        addFlag = isNumber && isGreaterOrEqualToStart() && isLessOrEqualToEnd();
        break;
      }
      default: {
        break;
      }
    }
    if (addFlag) {
      datum.flags = datum.flags || [];
      datum.flags.push({flag: this.config.flag});      
    }
    return datum;
  }

  /**
   * `flag` flags a list of data objects.
   *
   * @param  {Array} `data` an array of objects, each which is expected to have a `value` field for flagging.
   * @return {Array} Same data as input argument, but with flags fields added.
   */
  flag(data) {
    return data.map((datum) => {
      // datum is a reference to each object in data, so make a copy.
      let flaggedDatum = {...datum};
      return this.addFlag(flaggedDatum);
    });
  }
}

module.exports = Flagger;
