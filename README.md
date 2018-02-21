# OpenAQ Quality Checks

OpenAQ Quality Checks is a command line interface for flagging potentially invalid air quality measurements.

Have an OpenAQ data quality concern or experience you would like to share? Please add it to the [OpenAQ Community: What is your OpenAQ data quality experience?](https://github.com/openaq/openaq-quality-check/issues/2) issue!

## Use

### Prerequisits

* [node, npm, nvm](https://docs.npmjs.com/getting-started/installing-node)

### Setup

```bash
nvm use
yarn install
```

### Example Usage

```bash
cat examples/simple.json | ./index.js
# or
./index.js --infile examples/simple.json
```
