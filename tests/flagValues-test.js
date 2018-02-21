import test from 'ava';

// describe 'flagger#init'
test.todo('requires an array of measurements');
test.todo('requires a flag string')
test.todo('requires a type')

// describe 'exact' type
// init
test.todo('requires a value')
// flag
test.todo('flags values which match the value')
test.todo('does not flag values which do not match the value')

// describe 'set' type
// init
test.todo('requires a values array of values to flag')
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
