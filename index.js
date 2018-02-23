#!/usr/bin/env node
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const stringify = require('csv-stringify/lib/sync')
const yaml = require('js-yaml');

const defaultConfig = yaml.safeLoad(fs.readFileSync('./config.yml', 'utf8'));
const Flagger = require('./lib/flagger');

// cat examples/simple.json | ./index.js
// ./index.js --infile examples/simple.json
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 --infile foo.json', 'flags the contents of given file and write to stdout')
    .nargs('--infile', 1)
    .describe('infile', 'Location of input file, expected json or csv format')
    .nargs('--outfile', 1)
    .describe('outfile', 'Location of output file to write to, expected json or csv format')
    .nargs('--input-format', 1)
    .describe('input-format', 'Format of input, can be csv or json, defaults to json')
    .nargs('--ouptput-format', 1)
    .describe('ouptput-format', 'Format of output, can be csv or json, defaults to json')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2018')
    .argv;

function flagData(data) {
  let flaggedData = [...data];
  Object.values(defaultConfig).forEach((flagConfig) => {
    const flagger = new Flagger(flagConfig);
    flaggedData = flagger.flag(flaggedData);
  });
  return flaggedData;
};

function parseData(data) {
  let parsedData;
  if (argv['input-format'] === 'csv') {
    parsedData = parse(data, {columns: true, auto_parse: true});
  } else {
    // TODO(aimee): Assumption about schema here should be flexible - that JSON
    // data is nested under 'results' is an assumption we're interpreting data
    // from the API.
    parsedData = JSON.parse(data).results;
  }
  return parsedData;  
}

function readFlagOutput(data) {
  const parsedData = parseData(data);
  const flaggedData = flagData(parsedData);
  const outData = (argv['output-format'] === 'csv') ? stringify(flaggedData, {header: true}) : JSON.stringify(flaggedData);
  if (argv.outfile) {
    fs.writeFileSync(argv.outfile, outData);
    console.log(`Flagged data written to file ${argv.outfile}`);
  } else {
    console.log(outData);
  }
}

let data = '';

if (argv.infile) {
  data = fs.readFileSync(argv.infile, 'utf8');
  readFlagOutput(data);
} else {
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
      data += chunk;
    }
  });

  process.stdin.on('end', () => {
    readFlagOutput(data);
  });
}
