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
    .example('$0 --infile foo.json', 'Flags the contents of a file and writes to stdout.')
    .example('cat foo.json | $0', 'Flags the contents of stdin and writes to stdout.')
    .nargs('--infile', 1)
    .describe('infile', 'Input file. Should be the same format as input-format (which default to json).')
    .nargs('--input-format', 1)
    .describe('input-format', 'Input format, can be csv or json. Defaults to json.')
    .nargs('--ouptput-format', 1)
    .describe('ouptput-format', 'Output format, can be csv or json. Defaults to json.')
    .array('--skip')
    .describe('skip', 'Space-separated list of flags to skip.') 
    .array('--remove')
    .describe('remove', 'Space-separated list data to remove if flagged.')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2018')
    .argv;

function flagData(data) {
  let flaggedData = [...data];
  Object.values(defaultConfig).forEach((flagConfig) => {
    if (argv.skip === undefined || !argv.skip.includes(flagConfig.flag)) {
      const flagger = new Flagger(flagConfig);
      flaggedData = flagger.flag(flaggedData);
    }
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

function removeSomeFlaggedData(flaggedData) {
  return flaggedData.filter(d => {
    // return the data if it has no flags OR not if none of its flags are
    // included in argv.remove.
    return !d.flags || !d.flags.find(f => argv.remove.includes(f.flag));
  });
}

function removeAllFlaggedData(flaggedData) {
  return flaggedData.filter(d => {
    // return the data if flags is undefined or length is 0 Note: You could
    // potentially remove certain flags and then remove all flagged and return
    // data that had originally been flagged.
    return !d.flags || d.flags.length === 0;
  });
}

function readFlagOutput(data) {
  const parsedData = parseData(data);
  let flaggedData = flagData(parsedData);
  if (argv.remove && argv.remove.length > 0) {
    flaggedData = removeSomeFlaggedData(flaggedData);
  }
  if (argv['remove-all']) {
    flaggedData = removeAllFlaggedData(flaggedData);
  }
  const outData = (argv['output-format'] === 'csv') ? stringify(flaggedData, {header: true}) : JSON.stringify(flaggedData);
  console.log(outData);
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
