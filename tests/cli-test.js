const test = require('ava');
const fs = require('fs');

//const jsonTestFile = fs.readFileSync('../examples/addis-ababa-20180202.json', 'utf8');
const jsonTestFilename ='examples/addis-ababa-20180202.json';

const { spawn } = require('child_process');
const child = spawn(`./index.js --infile ${jsonTestFilename}`);

child.stdout.on('data', (data) => {
  console.log(`child stdout:\n${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`child stderr:\n${data}`);
});

test.todo('it reads and outputs JSON by default')
test.todo('it configurably reads a CSV and outputs JSON')
test.todo('it configurably reads and outputs CSV')
test.todo('it configurably writes a CSV file')
test.todo('it configurably writes a JSON file')
