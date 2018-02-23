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
yarn test
```

### Example Usage

#### Read and output JSON

Note: Commands below require [jq](https://stedolan.github.io/jq/), but jq is just for pretty printing json. If you don't have jq installed, remove the trailing `| jq .`

```bash
cat examples/addis-ababa-20180202.json | ./index.js | jq .
# or
./index.js --infile examples/addis-ababa-20180202.json | jq .
```

#### Read and output CSV

```bash
export flags='--input-format csv --output-format csv'
cat examples/addis-ababa-20180202.csv | ./index.js ${flags}
# or
./index.js --infile examples/addis-ababa-20180202.csv ${flags}
```
