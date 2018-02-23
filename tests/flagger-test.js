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
const repeatsFlaggerProperties = { ...commonProperties, type: 'repeats' };
const data = [{value: 1}, {value: 0}, {value: 1}, {value: '1'}];

function testUndefinedFlags(t, data) {
  return data.forEach((d) => t.is(d.flags, undefined));
}

function testFlags(t, flaggedData, opts = {flag: 'F', withSequence: false}) {
  flaggedData.forEach((d, idx) => {
    t.is(d.flags[0].flag, opts.flag);
    if (opts.withSequence) t.is(d.flags[0].sequenceNumber, idx + 1);
  });
};

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
  t.is(error.message, 'child "type" fails because ["type" must be one of [exact, set, range, repeats]]');
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

// flag exact values
test('flags values which match the value', t => {
  const flagger = new Flagger({ ...exactFlaggerProperties, value: 1 });
  const flaggedData = flagger.flag(data);
  testUndefinedFlags(t, [flaggedData[1], flaggedData[3]]);
  testFlags(t, [flaggedData[0], flaggedData[2]]);
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

// flag sets
test('flags values which match any of the set', t => {
  const flagger = new Flagger({ ...setFlaggerProperties, values: [1, '1'] });
  const flaggedData = flagger.flag(data);
  testUndefinedFlags(t, [flaggedData[1]]);
  testFlags(t, [flaggedData[0], ...flaggedData.slice(2,4)]);
});

// describe 'range' type
// init
test('requires a start or end object', t => {
  const error = t.throws(() => new Flagger(rangeFlaggerProperties));
  t.is(error.name, 'ValidationError');
  t.is(error.message, '"value" must contain at least one of [start, end]');
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

// flag ranges
test('flags values inclusively by default', t => {
  const flagger = new Flagger(rangeFlaggerPropertiesWithGoodLimits);
  const flaggedData = flagger.flag(data);
  testFlags(t, flaggedData.slice(0,3));
  testUndefinedFlags(t, [flaggedData[3]]);
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
  testFlags(t, [flaggedData[1]]);
  testUndefinedFlags(t, [flaggedData[0], ...flaggedData.slice(2, 4)]);
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
  testFlags(t, [flaggedData[0], flaggedData[2]]);
  testUndefinedFlags(t, [flaggedData[1], flaggedData[3]]);
});

test('flags values less than end if no start is given', t => {
  const properties = {...rangeFlaggerPropertiesWithGoodLimits};
  delete properties['start'];
  const dataWithNegatives = [...data, {value: -1}]
  const flagger = new Flagger(properties);
  const flaggedData = flagger.flag(dataWithNegatives); 
  testFlags(t, [...flaggedData.slice(0,3), flaggedData[4]]);
  testUndefinedFlags(t, [flaggedData[3]]);
});

test('flags values less than end if no start is given', t => {
  const properties = {...rangeFlaggerPropertiesWithGoodLimits};
  delete properties['end'];
  const dataWithMorePositives = [...data, {value: 2}]
  const flagger = new Flagger(properties);
  const flaggedData = flagger.flag(dataWithMorePositives); 
  testFlags(t, [...flaggedData.slice(0,3), flaggedData[4]]);
  testUndefinedFlags(t, [flaggedData[3]]);
});

// flags repeats
test('throws an error if repeatMinimum is not a number', t => {
  const error = t.throws(() => new Flagger({...repeatsFlaggerProperties, repeatMinimum: 0}));
  t.is(error.name, 'ValidationError');
  t.is(error.message, 'child "repeatMinimum" fails because ["repeatMinimum" must be a positive number]')
});

const dataWithRepeats = [{value: 1}, {value: 0}, {value: 0}, {value: '1'}];

test('flags repeat values', t => {
  const flagger = new Flagger(repeatsFlaggerProperties);
  const flaggedData = flagger.flag(dataWithRepeats);
  testUndefinedFlags(t, [flaggedData[0], flaggedData[3]]);
  testFlags(t, flaggedData.slice(1,3), {flag: 'F', withSequence: true});
});

test('does not flag repeat values when repeated less than repeatMinimum times', t => {
  const flagger = new Flagger({...repeatsFlaggerProperties, repeatMinimum: 3});
  const flaggedData = flagger.flag(dataWithRepeats);
  testUndefinedFlags(t, flaggedData);
});

test('flags repeat values when repeated at least repeatMinimum times', t => {
  const dataWithMoreRepeats = [...dataWithRepeats.slice(0,3), {value: 0}];
  const flagger = new Flagger({...repeatsFlaggerProperties, repeatMinimum: 3});
  const flaggedData = flagger.flag(dataWithMoreRepeats);
  const expectedFlag = {flag: 'F'};
  testUndefinedFlags(t, [flaggedData[0]]);
  testFlags(t, flaggedData.slice(1,4), {flag: 'F', withSequence: true});
});

test('flags multiple sets of repeats, restarting sequenceNumber', t => {
  const dataWithMulitipleRepeats = [
    {
      id: 2,
      value: 1
    }, {
      id: 3,
      value: 1
    }, {
      id: 4,
      value: 2
    }, {
      id: 5,
      value: 2
    }
  ];
  const flagger = new Flagger({...repeatsFlaggerProperties});
  const flaggedData = flagger.flag(dataWithMulitipleRepeats);
  const expectedFlag = {flag: 'F'};
  flaggedData.forEach((datum, idx) => {
    t.deepEqual(datum, {
      id: idx+2,
      value: dataWithMulitipleRepeats[idx].value,
      flags: [
        {
          ...expectedFlag,
          sequenceNumber: Math.floor(idx%2)+1
        }
      ]
    });
  });
});

test('flag repeats using configured grouped and ordered by', t => {
  const dataWithGroups = [
    {
      id: 0,
      group: 2,
      value: 1,
      date: '2018-02-03'
    }, {
      id: 1,
      group: 3,
      value: 1,
      date: '2018-02-03'
    }, {
      id: 2,
      group: 2,
      value: 1,
      date: '2018-02-02'
    }, {
      id: 4,
      group: 3,
      value: 1,
      date: '2018-02-02'
    }
  ];
  const dataWithGroupsGroupedAndOrdered = [
    {
      id: 2,
      group: 2,
      value: 1,
      date: '2018-02-02'
    },
    {
      id: 0,
      group: 2,
      value: 1,
      date: '2018-02-03'
    }, {
      id: 4,
      group: 3,
      value: 1,
      date: '2018-02-02'
    }, {
      id: 1,
      group: 3,
      value: 1,
      date: '2018-02-03'
    }
  ];
  const flagger = new Flagger({...repeatsFlaggerProperties, groupBy: 'group', orderBy: 'date'});
  const flaggedData = flagger.flag(dataWithGroups);
  const expectedFlag = {flag: 'F'};
  flaggedData.forEach((datum, idx) => {
    const expectedItemFields = dataWithGroupsGroupedAndOrdered[idx];
    t.deepEqual(datum, {
      ...expectedItemFields,
      flags: [
        {
          ...expectedFlag,
          sequenceNumber: Math.floor(idx%2)+1
        }
      ]
    });
  });
});

test('flag repeats using configured nested grouped by', t => {
  const dataWithNestedGroups = [
    {
      id: 0,
      group: {lat: 1, lon: 2},
      value: 1,
      date: '2018-02-03'
    }, {
      id: 1,
      group: {lat: 3, lon: 4},
      value: 1,
      date: '2018-02-03'
    }, {
      id: 2,
      group: {lat: 1, lon: 2},
      value: 1,
      date: '2018-02-02'
    }
  ];
  const dataWithNestedGroupsGroupedAndOrdered = [
    {
      id: 2,
      group: {lat: 1, lon: 2},
      value: 1,
      date: '2018-02-02'
    },
    {
      id: 0,
      group: {lat: 1, lon: 2},
      value: 1,
      date: '2018-02-03'
    }, {
      id: 1,
      group: {lat: 3, lon: 4},
      value: 1,
      date: '2018-02-03'
    }
  ];
  const flagger = new Flagger({
    ...repeatsFlaggerProperties,
    groupBy: {group: ['lat', 'long']},
    orderBy: 'date'
  });
  const flaggedData = flagger.flag(dataWithNestedGroups);
  const expectedFlag = {flag: 'F'};
  flaggedData.slice(0,2).forEach((datum, idx) => {
    const expectedItemFields = dataWithNestedGroupsGroupedAndOrdered[idx];
    t.deepEqual(datum, {
      ...expectedItemFields,
      flags: [
        {
          ...expectedFlag,
          sequenceNumber: Math.floor(idx%2)+1
        }
      ]
    });
  });
  testUndefinedFlags(t, [flaggedData[2]]);
});
