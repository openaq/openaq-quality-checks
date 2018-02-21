const test = require('ava');

const {Flagger, ArgumentError} = require('../lib/flagger');

// describe 'flagger#init'
test('requires a data property', t => {
  const error = t.throws(() => new Flagger(), ArgumentError);
  t.is(error.message, 'Missing required argument data.');
});

test('requires data property to be an array', t => {
  const error = t.throws(() => new Flagger({data: 'not an array'}), TypeError);
  t.is(error.message, 'data is not required type Array.');
});

test('requires a flag property', t => {
  const error = t.throws(() => new Flagger({data: []}), ArgumentError);
  t.is(error.message, 'Missing required argument flag.');
});

test('requires flag property to be a string', t => {
  const error = t.throws(() => new Flagger({data: [], flag: 1}), TypeError);
  t.is(error.message, 'flag is not required type String.');
});

test('requires a type', t => {
  const error = t.throws(() => new Flagger({data: [], flag: '1'}), ArgumentError);
  t.is(error.message, 'Missing required argument type.');
});

test('requires type to be one of string, set, or array', t => {
  const error = t.throws(() => new Flagger({data: [], flag: '1', type: 'cupcake'}), TypeError);
  t.is(error.message, 'type is not one of exact, set, range.');
});

// describe 'exact' type
// init
test('requires a value', t => {
  const error = t.throws(() => new Flagger({data: [], flag: '1', type: 'exact'}), ArgumentError);
  t.is(error.message, 'Missing required argument value.');
});

test('requires value to be a number', t => {
  const flaggerProperties = {
    data: [],
    flag: '1',
    type: 'exact',
    value: '1'
  };
  const error = t.throws(() => new Flagger(flaggerProperties), TypeError);
  t.is(error.message, 'value is not required type Number.');
});

test('sets properties when valid', t => {
  const flaggerProperties = {
    data: [],
    flag: '1',
    type: 'exact',
    value: 1
  };
  const flagger = new Flagger(flaggerProperties);
  t.is(flagger.config.flag, '1');
  t.is(flagger.config.type, 'exact');
  t.is(flagger.config.value, 1);
});

// flag
test.todo('flags values which match the value')
test.todo('does not flag values which do not match the value')

// describe 'set' type
// init
test('requires values property', t => {
  const error = t.throws(() => new Flagger({data: [], flag: '1', type: 'set'}), ArgumentError);
  t.is(error.message, 'Missing required argument values.');
});

test('requires values to be an Array', t => {
  const flaggerProperties = {
    data: [],
    flag: '1',
    type: 'set',
    values: '1'
  };
  const error = t.throws(() => new Flagger(flaggerProperties), TypeError);
  t.is(error.message, 'values is not required type Array.');
});

// flag
test.todo('flags values which match any of the set')
test.todo('does not flag values which are not in the set')

// describe 'range' type
// init
test.todo('requires a start object')
test.todo('requires an end object')
test.todo('raises an error if the end object is less than the start object')
// flag
test.todo('flags values inclusively')
test.todo('flags values exclusively')
test.todo('does not flag values which are not in range, inclusively')
test.todo('does not flag values which are not in range, exclusively')
