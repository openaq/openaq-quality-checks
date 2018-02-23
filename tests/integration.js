#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const indexFile = path.join(__dirname, '..', 'index.js');
const jsonTestFilename = 'examples/addis-ababa-20180202.json';
const csvTestFilename = 'examples/addis-ababa-20180202.csv';
const expectedJsonResultsFilename = 'examples/flagged/addis-ababa-20180202-defaultFlags.json';
const expectedResults = JSON.parse(fs.readFileSync(expectedJsonResultsFilename));

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

const testReadsAndOutputsJSON = function() {
  const child = cp.spawn('./index.js', ['--infile', jsonTestFilename]);

  testCommand(child, data => {
    const results = JSON.parse(data);
    const testResult = assert.deepEqual(results, expectedResults);
    if (testResult === undefined) {
      console.log('- Successful: Reads and outputs JSON.')
    };
  });
}();

const testReadsCSVAndOutputsJSON = function() {
  const child = cp.spawn('./index.js', ['--infile', csvTestFilename, '--input-format', 'csv']);

  testCommand(child, data => {
    const results = JSON.parse(data);
    let testResult = undefined;
    results.forEach((result, idx) => {
      assert.deepEqual(result.flags, [{flag: 'E'}, {flag: 'N'}, {flag: 'R', sequenceNumber: idx+1}]);
    });
    if (testResult === undefined) {
      console.log('- Successful: Reads CSV and outputs JSON.')
    };
  });
}();

const testReadsAndOutputsCSV = function() {
  console.log('- Pending: Reads and outputs CSV');
}

const testWritesToFile = function() {
  console.log('- Pending: Reads from stdin and writes to file');
}

const testCanRemoveFlaggedData = function() {
  console.log('- Pending: Can remove flagged data')
}

// TODO: Tests for flags which override default configuration in config.yml
