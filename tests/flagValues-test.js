const test = require('ava');

const { Flagger, ArgumentError } = require('../lib/flagger');

const commonProperties = {flag: 'F'};
const exactFlaggerProperties = {...commonProperties, type: 'exact'};
const setFlaggerProperties = {...commonProperties, type: 'set'};
const rangeFlaggerProperties = { ...commonProperties, type: 'range' };
const rangeFlaggerPropertiesWithEmptyLimits = { 
  ...rangeFlaggerProperties,
  start: {},
  end: {}
};
const rangeFlaggerPropertiesWithBadLimits = {
  ...rangeFlaggerProperties,
  start: {
    value: 1
  },
  end: {
    value: 0
  }
};
const rangeFlaggerPropertiesWithGoodLimits = {
  ...rangeFlaggerProperties,
  start: {
    value: 0
  },
  end: {
    value: 1
  }
};
const data = [{value: 1}, {value: 0}, {value: 1}, {value: '1'}];

// describe 'flagger#init'
test('requires a flag property', t => {
  const error = t.throws(() => new Flagger(), ArgumentError);
  t.is(error.message, 'Missing required argument flag.');
});

test('requires flag property to be a string', t => {
  const error = t.throws(() => new Flagger({flag: 1}), TypeError);
  t.is(error.message, 'flag is not required type String.');
});

test('requires a type', t => {
  const error = t.throws(() => new Flagger(commonProperties), ArgumentError);
  t.is(error.message, 'Missing required argument type.');
});

test('requires type to be one of string, set, or array', t => {
  const error = t.throws(() => new Flagger({...commonProperties, type: 'cupcake'}), TypeError);
  t.is(error.message, 'type is not one of exact, set, range.');
});

// describe 'exact' type
// init
test('requires a value', t => {
  const error = t.throws(() => new Flagger(exactFlaggerProperties), ArgumentError);
  t.is(error.message, 'Missing required argument value.');
});

test('requires value to be a number', t => {
  const error = t.throws(() => new Flagger({...exactFlaggerProperties, value: '1'}), TypeError);
  t.is(error.message, 'value is not required type Number.');
});

test('sets properties when valid', t => {
  const flagger = new Flagger({...exactFlaggerProperties, value: 1});
  t.is(flagger.config.flag, commonProperties.flag);
  t.is(flagger.config.type, 'exact');
  t.is(flagger.config.value, 1);
});

// exact flag
test('flags values which match the value', t => {
  const flagger = new Flagger({...exactFlaggerProperties, value: 1});
  const updatedData = flagger.flag(data);
  t.deepEqual(updatedData[0].flags[0], {flag: 'F'});
  t.is(updatedData[1].flags, undefined);
  t.deepEqual(updatedData[2].flags[0], {flag: 'F'});
  t.is(updatedData[3].flags, undefined);
});

// describe 'set' type
// init
test('requires values property', t => {
  const error = t.throws(() => new Flagger(setFlaggerProperties), ArgumentError);
  t.is(error.message, 'Missing required argument values.');
});

test('requires values to be an Array', t => {
  const error = t.throws(() => new Flagger({...setFlaggerProperties, values: 1}), TypeError);
  t.is(error.message, 'values is not required type Array.');
});

// flag
test('flags values which match any of the set', t => {
  const flagger = new Flagger({...setFlaggerProperties, values: [1, '1']});
  const flaggedData = flagger.flag(data);
  t.deepEqual(flaggedData[0].flags[0], {flag: 'F'});
  t.is(flaggedData[1].flags, undefined);
  t.deepEqual(flaggedData[2].flags[0], {flag: 'F'});
  t.deepEqual(flaggedData[3].flags[0], {flag: 'F'});
});

// describe 'range' type
// init
test('requires a start object', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerProperties), ArgumentError);
  t.is(error.message, 'Missing required argument start.');
});

test('requires an end object', t => {
  const properties = {...rangeFlaggerProperties, start: {}};
  const error = t.throws(() => new Flagger(properties), ArgumentError);
  t.is(error.message, 'Missing required argument end.');
});

test('requires a start value', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerPropertiesWithEmptyLimits), ArgumentError);
  t.is(error.message, 'Missing required argument value.');
});

test('requires an end value', t => {
  const properties = { ...rangeFlaggerPropertiesWithEmptyLimits, start: {value: 1}};
  const error = t.throws(() => new Flagger(properties), ArgumentError);
  t.is(error.message, 'Missing required argument value.');
});

test('raises an error if the end object is less than the start object', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerPropertiesWithBadLimits), ArgumentError);
  t.is(error.message, 'Start must be less than end.');
});

// flag
test('flags values inclusively by default', t => {
  const flagger = new Flagger(rangeFlaggerPropertiesWithGoodLimits);
  const flaggedData = flagger.flag(data);
  t.deepEqual(flaggedData[0].flags[0], {flag: 'F'});
  t.deepEqual(flaggedData[1].flags[0], {flag: 'F'});
  t.deepEqual(flaggedData[2].flags[0], {flag: 'F'});
  t.is(flaggedData[3].flags, undefined);  
});

test.todo('flags values exclusively')
test.todo('does not flag values which are not in range, inclusively')
test.todo('does not flag values which are not in range, exclusively')
