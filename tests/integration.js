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

const testCanRemoveSomeFlaggedData = function() {
  console.log('~ Pending: Can remove some flagged data');
}

const testCanRemoveAllFlaggedData = function() {
  console.log('~ Pending: Can remove all flagged data');
}

const testCanOverrideFlagConfiguration = function() {
  console.log('~ Pending: Can override flag configuration');
}

testReadsAndOutputsJSON();
testReadsCSVAndOutputsJSON();
testReadsAndOutputsCSV();

// Pending tests
testCanRemoveSomeFlaggedData();
testCanRemoveAllFlaggedData();
testCanOverrideFlagConfiguration();

