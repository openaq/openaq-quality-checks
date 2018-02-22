const test = require('ava');
const Flagger = require('../lib/flagger');

const commonProperties = {flag: 'F'};
const exactFlaggerProperties = { ...commonProperties, type: 'exact' };
const setFlaggerProperties = { ...commonProperties, type: 'set' };
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
  const error = t.throws(() => new Flagger());
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "flag" fails because ["flag" is required]');
});

test('requires flag property to be a string', t => {
  const error = t.throws(() => new Flagger({flag: 1}));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "flag" fails because ["flag" must be a string]');
});

test('requires a type', t => {
  const error = t.throws(() => new Flagger(commonProperties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "type" fails because ["type" is required]');
});

test('requires type to be one of string, set, or array', t => {
  const error = t.throws(() => new Flagger({ ...commonProperties, type: 'cupcake' }));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "type" fails because ["type" must be one of [exact, set, range]]');
});

// describe 'exact' type
// init
test('requires a value', t => {
  const error = t.throws(() => new Flagger(exactFlaggerProperties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "value" fails because ["value" is required]');
});

test('requires value to be a number', t => {
  // TODO(aimee): Seems like there might be a bug in joi if we set value to a
  // stringified (e.g. value: '1') number it will not error.
  const error = t.throws(() => new Flagger({ ...exactFlaggerProperties, value: 'keylime' }));
  t.is(error.message, 'child "value" fails because ["value" must be a number]');
});

test('sets properties when valid', t => {
  const flagger = new Flagger({ ...exactFlaggerProperties, value: 1 });
  t.is(flagger.config.flag, commonProperties.flag);
  t.is(flagger.config.type, 'exact');
  t.is(flagger.config.value, 1);
});

// exact flag
test('flags values which match the value', t => {
  const flagger = new Flagger({ ...exactFlaggerProperties, value: 1 });
  const updatedData = flagger.flag(data);
  t.deepEqual(updatedData[0].flags[0], {flag: 'F'});
  t.is(updatedData[1].flags, undefined);
  t.deepEqual(updatedData[2].flags[0], {flag: 'F'});
  t.is(updatedData[3].flags, undefined);
});

// describe 'set' type
// init
test('requires values property', t => {
  const error = t.throws(() => new Flagger(setFlaggerProperties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "values" fails because ["values" is required]');
});

test('requires values to be an Array', t => {
  const error = t.throws(() => new Flagger({ ...setFlaggerProperties, values: 1 }));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "values" fails because ["values" must be an array]');
});

// flag
test('flags values which match any of the set', t => {
  const flagger = new Flagger({ ...setFlaggerProperties, values: [1, '1'] });
  const flaggedData = flagger.flag(data);
  t.deepEqual(flaggedData[0].flags[0], {flag: 'F'});
  t.is(flaggedData[1].flags, undefined);
  t.deepEqual(flaggedData[2].flags[0], {flag: 'F'});
  t.deepEqual(flaggedData[3].flags[0], {flag: 'F'});
});

// describe 'range' type
// init
test('requires a start object', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerProperties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "start" fails because ["start" is required]');
});

test('requires an end object', t => {
  const properties = { ...rangeFlaggerProperties, start: {value: 1} };
  const error = t.throws(() => new Flagger(properties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "end" fails because ["end" is required]');
});

test('requires a start value', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerPropertiesWithEmptyLimits));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "start" fails because [child "value" fails because ["value" is required]]');
});

test('requires an end value', t => {
  const properties = { ...rangeFlaggerPropertiesWithEmptyLimits, start: {value: 1}};
  const error = t.throws(() => new Flagger(properties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "end" fails because [child "value" fails because ["value" is required]]');
});

test('raises an error if the end object is less than the start object', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerPropertiesWithBadLimits));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "end" fails because [child "value" fails because ["value" must be greater than 1]]');
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

test('flags values exclusively using the end endpoint', t => {
  const properties = {
    ...rangeFlaggerPropertiesWithGoodLimits,
    end: {
      value: 1,
      exclusive: true // don't flag 1's
    }
  }
  const flagger = new Flagger(properties);
  const flaggedData = flagger.flag(data);
  t.is(flaggedData[0].flags, undefined);
  t.deepEqual(flaggedData[1].flags[0], {flag: 'F'});
  t.is(flaggedData[2].flags, undefined);
  t.is(flaggedData[3].flags, undefined);
});

test('flags values exclusively using the start endpoint', t => {
  const properties = {
    ...rangeFlaggerPropertiesWithGoodLimits,
    start: {
      value: 0,
      exclusive: true // don't flag 0's
    }
  }
  const flagger = new Flagger(properties);
  const flaggedData = flagger.flag(data);
  t.deepEqual(flaggedData[0].flags[0], {flag: 'F'});
  t.is(flaggedData[1].flags, undefined);
  t.deepEqual(flaggedData[2].flags[0], {flag: 'F'});
  t.is(flaggedData[3].flags, undefined);
});
