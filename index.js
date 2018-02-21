#!/usr/bin/env node
var fs = require('fs');

// cat examples/simple.json | ./index.js
// ./index.js --infile examples/simple.json
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 --infile foo.js', 'writes the contents given file to stdout')
    .nargs('--infile', 1)
    .describe('--infile', 'Input file, json or csv')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2018')
    .argv;

let data = '';

if (argv.infile) {
  data = fs.readFileSync(argv.infile, 'utf8');
} else {
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', function() {
    const chunk = this.read();
    if (chunk !== null) {
      data += chunk;
    }
  });

  process.stdin.on('end', function() {
    console.log(data);
  });
}
