#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const path = require('path');
const cp = require('child_process');

const indexFile = path.join(__dirname, '..', 'index.js');
const jsonTestFilename = 'examples/addis-ababa-20180202.json';
const csvTestFilename = 'examples/addis-ababa-20180202.csv';
const expectedJsonResultsFilename = 'examples/flagged/addis-ababa-20180202-defaultFlags.json';
const expectedResults = JSON.parse(fs.readFileSync(expectedJsonResultsFilename));
const csvParseOpts = {columns: true, auto_parse: true, skip_empty_lines: true};

console.log('Starting integration tests...');

const testCommand = function(child, cb) {
  let data = '';

  child.stdout.on('data', chunk => {
    data += chunk;
    cb(data);
  });

  child.stderr.on('data', chunk => {
    data += chunk;
    console.log(data);
  });
};

const jsonArgs = ['--infile', jsonTestFilename];
const csvArgs = ['--infile', csvTestFilename, '--input-format', 'csv'];

const testReadsAndOutputsJSON = function() {
  const child = cp.spawn('./index.js', jsonArgs);

  testCommand(child, data => {
    const results = JSON.parse(data);
    const testResult = assert.deepEqual(results, expectedResults);
    if (testResult === undefined) {
      console.log('\u2714 Successful: Reads and outputs JSON.')
    };
  });
};

const testReadsCSVAndOutputsJSON = function() {
  const child = cp.spawn('./index.js', csvArgs);

  testCommand(child, data => {
    const results = JSON.parse(data);
    let testResult = undefined;
    results.forEach((result, idx) => {
      assert.deepEqual(result.flags, [{flag: 'E'}, {flag: 'N'}, {flag: 'R', sequenceNumber: idx+1}]);
    });
    if (testResult === undefined) {
      console.log('\u2714 Successful: Reads CSV and outputs JSON.')
    };
  });
};

const testReadsAndOutputsCSV = function() {
  const child = cp.spawn('./index.js', [...csvArgs, '--output-format', 'csv']);

  testCommand(child, data => {
    const results = parse(data, csvParseOpts);
    let testResult = undefined;
    results.forEach((result, idx) => {
      assert.deepEqual(JSON.parse(result.flags), [{flag: 'E'}, {flag: 'N'}, {flag: 'R', sequenceNumber: idx+1}]);
    });
    if (testResult === undefined) {
      console.log('\u2714 Successful: Reads and outputs CSV.')
    };
  });
};

const testCanSkipFlags = function() {
  const child = cp.spawn('./index.js', [...jsonArgs, '--skip', 'R', 'N']);

  testCommand(child, data => {
    const results = JSON.parse(data);
    const testResult = results.forEach(r => {
      if (r.flags && r.flags.length > 0) {
        assert.equal(undefined, r.flags.find(f => f.flag === 'R'));
        assert.equal(undefined, r.flags.find(f => f.flag === 'N'));
      }
    });
    if (testResult === undefined) {
      console.log('\u2714 Successful: Configurably skips flags.')
    };
  });
}

const testCanRemoveSomeFlaggedData = function() {
  const child = cp.spawn('./index.js', [...jsonArgs, '--remove', 'E']);

  testCommand(child, data => {
    const results = JSON.parse(data);
    const testResult = assert.equal(results.length, 2);
    if (testResult === undefined) {
      console.log('\u2714 Successful: Can remove some flagged data.')
    };
  });
}

const testCanRemoveAllFlaggedData = function() {
  const child = cp.spawn('./index.js', [...jsonArgs, '--remove-all']);

  testCommand(child, data => {
    const results = JSON.parse(data);
    const testResult = assert.equal(results.length, 1);
    if (testResult === undefined) {
      console.log('\u2714 Successful: Can remove all flagged data.')
    };
  });
}

const testCanOverrideFlagConfiguration = function() {
  console.log('~ Pending: Can override flag configuration');
}

testReadsAndOutputsJSON();
testReadsCSVAndOutputsJSON();
testReadsAndOutputsCSV();
testCanSkipFlags();
testCanRemoveSomeFlaggedData();
testCanRemoveAllFlaggedData();

// Merged config passed as argument with default
testCanOverrideFlagConfiguration();
