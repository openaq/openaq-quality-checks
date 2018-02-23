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

console.log('\nStarting integration tests...');

const testReadsAndOutputsJSON = function() {
  let data = '';
  const child = cp.spawn('./index.js', ['--infile', jsonTestFilename]);

  child.stdout.on('data', (chunk) => {
    data += chunk;
    const results = JSON.parse(data);
    const testResult = assert.deepEqual(results, expectedResults);
    if (testResult === undefined) {
      console.log('- Successful: Reads and outputs JSON.')
    };
  });

  child.stderr.on('data', (chunk) => {
    data += chunk;
    console.log(data);
  });
}();

// const testReadsCSVAndOutputsJSON = function() {
//   let data = '';
//   const child = cp.spawn('./index.js', ['--infile', csvTestFilename, '--input-format', 'csv']);

//   child.stdout.on('data', (chunk) => {
//     data += chunk;
//     const results = JSON.parse(data);
//     let testResult = undefined;
//     results.forEach((result, idx) => {
//       assert.deepEqual(result.flags, [{flag: 'E'}, {flag: 'N'}, {flag: 'R', sequenceNumber: idx+1}]);
//     });
//     if (testResult === undefined) {
//       console.log('- Successful: Reads CSV and outputs JSON.')
//     };
//   });
//   child.stderr.on('data', (chunk) => {
//     data += chunk;
//     console.log(data);
//   });
// }();

const testReadsAndOutputsCSV = function() {
  console.log('- Pending: Reads and outputs CSV');

}

const testReadsFromStdinAndWritesToFile = function() {
  console.log('- Pending: Reads from stdin and writes to file');
}

const testCanRemoveFlaggedData = function() {
  console.log('- Pending: Can remove flagged data')
}

const testGroupsByCoordinatesOrderedByDatetime = function() {
  // let data = '';
  // const child = cp.spawn('./index.js', ['--infile', jsonTestFilename]);

  // child.stdout.on('data', (chunk) => {
  //   data += chunk;
  //   const results = JSON.parse(data);
  //   const testResult = assert.deepEqual(results, expectedResults);
  //   if (testResult === undefined) {
  //     console.log('- Successful: Reads and outputs JSON.')
  //   };
  // });
  console.log('- Pending: Groups by coordinates ordered by datetime');
}

const testGroupsByLocationOrderedByDatetime = function() {
  console.log('- Pending: Groups by location ordered by datetime');
}

// test.todo('it configurably reads and outputs CSV')
// test.todo('it configurably writes a CSV file')
// test.todo('it configurably writes a JSON file')
