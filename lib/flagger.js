class ArgumentError extends Error {};

class Flagger {
  constructor(args = {}) {
    this.requireArgument(args, 'data', Array);
    this.requireArgument(args, 'flag', String)
  }

  requireArgument(args, arg, dataType) {
    if (!args[arg]) {
      throw new ArgumentError(`Missing required argument ${arg}.`);
    }
    if (!(args[arg].constructor === dataType)) {
      throw new TypeError(`${arg} is not required type ${dataType.name}.`);
    }
  }
}

module.exports = {
  ArgumentError,
  Flagger
}
