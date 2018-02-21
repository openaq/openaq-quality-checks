class ArgumentError extends Error {};

class Flagger {
  constructor(args = {}) {
    this.requireArgument(args, 'data', {dataType: Array});
    this.requireArgument(args, 'flag', {dataType: String});
    this.requireArgument(args, 'type', {validValues: ['exact', 'set', 'range']});

    switch (args.type) {
      case 'exact': {
        this.requireArgument(args, 'value', {dataType: Number});
        this.config = {...args};
        break;
      }
      case 'set': {
        this.requireArgument(args, 'values', {dataType: Array});
        this.config = {...args};
        break;
      }
      default: {
        // This should have been caught in requireArgument
        break;
      }
    }
  }

  requireArgument(args, arg, opts = {}) {
    if (!args[arg]) {
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
}

module.exports = {
  ArgumentError,
  Flagger
}
