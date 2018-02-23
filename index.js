#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const parse = require('csv-parse/lib/sync');

const Flagger = require('./lib/flagger');
const defaultConfig = yaml.safeLoad(fs.readFileSync('./config.yml', 'utf8'));

// cat examples/simple.json | ./index.js
// ./index.js --infile examples/simple.json
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 --infile foo.json', 'flags the contents of given file and write to stdout')
    .nargs('--infile', 1)
    .describe('--infile', 'Input file, json or csv')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2018')
    .argv;

let data = '';

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
    parsedData = JSON.parse(data).results;
  }
  return parsedData;  
}

if (argv.infile) {
  data = fs.readFileSync(argv.infile, 'utf8');
  const parsedData = parseData(data);
  const flaggedData = flagData(parsedData);
  console.log(JSON.stringify(flaggedData));
} else {
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', function() {
    const chunk = this.read();
    if (chunk !== null) {
      data += chunk;
    }
  });

  process.stdin.on('end', function() {
    const parsedData = parseData(data);
    const flaggedData = flagData(parsedData);
    console.log(JSON.stringify(flaggedData));
  });
}
