class ArgumentError extends Error {};

class Flagger {
  constructor(args = {}) {
    // TODO(aimee): DRY all the requiremeArguments into a single function we
    // call with a validation definition
    this.requireArgument(args, 'flag', {dataType: String});
    this.requireArgument(args, 'type', {validValues: ['exact', 'set', 'range']});

    switch (args.type) {
      case 'exact': {
        this.requireArgument(args, 'value', {dataType: Number});
        break;
      }
      case 'set': {
        this.requireArgument(args, 'values', {dataType: Array});
        break;
      }
      case 'range': {
        this.requireArgument(args, 'start', {dataType: Object});
        this.requireArgument(args, 'end', {dataType: Object});
        const {start, end} = args;
        this.requireArgument(start, 'value', {dataType: Number});
        this.requireArgument(end, 'value', {dataType: Number});
        this.validateLimits({start, end});
      }
      default: {
        // This should have been caught in requireArgument
        break;
      }
    }
    this.config = {...args};
  }

  requireArgument(args, arg, opts = {}) {
    if (args[arg] === undefined || args[arg] === null) {
      throw new ArgumentError(`Missing required argument ${arg}.`);
    }

    const { dataType } = opts;
    if (dataType && !(args[arg].constructor === dataType)) {
      throw new TypeError(`${arg} is not required type ${dataType.name}.`);
    }

    const { validValues } = opts;
    if (validValues && !validValues.includes(args[arg])) {
      throw new TypeError(`${arg} is not one of ${validValues.join(', ')}.`);
    }
  }

  validateLimits(opts) {
    if (opts.start.value >= opts.end.value) {
      throw new ArgumentError('Start must be less than end.');
    }
  }

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

  flag(data) {
    return data.map((datum) => {
      // datum is a reference to each object in data, so make a copy.
      let flaggedDatum = {...datum};
      return this.addFlag(flaggedDatum);
    });
  }
}

module.exports = {
  ArgumentError,
  Flagger
}
