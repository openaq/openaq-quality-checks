class ArgumentError extends Error {};

class Flagger {
  constructor(args = {}) {
    this.requireArgument(args, 'data', {dataType: Array});
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
    if (opts.start >= opts.end) {
      throw new ArgumentError('Start must be less than end.');
    }
  }
}

module.exports = {
  ArgumentError,
  Flagger
}