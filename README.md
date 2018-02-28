# OpenAQ Quality Checks

OpenAQ Quality Checks is a command line interface for flagging potentially invalid air quality measurements.

Have an OpenAQ data quality concern or experience you would like to share? Please add it to the [OpenAQ Community: What is your OpenAQ data quality experience?](https://github.com/openaq/openaq-quality-check/issues/2) issue!

## Use

### Prerequisites

* [node, npm, nvm](https://docs.npmjs.com/getting-started/installing-node)
* [jq](https://stedolan.github.io/jq/) is recommended if using json.

### Install

```
nvm use 8.9.4
npm install openaq-quality-check -g
```

### Develop

```bash
git clone https://github.com/openaq/openaq-quality-checks
cd openaq-quality-checks
nvm use
yarn install
yarn test
```

### Configuration

openaq-quality-checks expects a list of items, either in json or csv.

A set of default flags are configured in [`config.yml`](config.yml). The default flags are:

* **`E`** flags the value -999
* **`N`** flags negative values
* **`R`** flags repeating values, grouped by coordinates and ordered by date.

This configuration can be overriden using the `--config <file.yml>` argument, which should point to a yml file which has the following structure:

```yaml
keyOne: # Arbitrary identifier for the flag, e.g. 'errors'. Useful for merging with the default configuration.
  flag: Any string, e.g. E
  type: One of exact|set|range|repeats
  # Depending on the type, other values may be included. See lib/flagger.js for what can be configured.
keyTwo:
  # ...
```

This configuration is merged with the default configuration, overriding fields that exist and adding fields that do not exist.

### Example Commands

#### Read and output JSON

Note: Commands below require [jq](https://stedolan.github.io/jq/), but jq is just for pretty printing json. If you don't have jq installed, remove the trailing `| jq .`

```bash
cat examples/addis-ababa-20180202.json | quality-check | jq .
# or
quality-check --infile examples/addis-ababa-20180202.json | jq .
```

#### Read and output CSV

```bash
cat examples/addis-ababa-20180202.csv | quality-check --input-format csv --output-format csv
# or
quality-check --infile examples/addis-ababa-20180202.csv --input-format csv --output-format csv
```

#### Override the default configuration

```
quality-check --infile examples/addis-ababa-20180202.json --config tests/test-config.yml | jq .
```

#### Skip the 'N' and 'R' flags

```
quality-check --infile examples/addis-ababa-20180202.json --skip N R | jq .
```

#### Remove all errors

```
quality-check --infile examples/addis-ababa-20180202.json --remove E | jq .
```

#### Remove all flagged items

```
quality-check --infile examples/addis-ababa-20180202.json --remove-all | jq .
```

#### Using the API call

```
curl 'https://api.openaq.org/v1/measurements?location=US%20Diplomatic%20Post:%20Addis%20Ababa%20School&date_from=2018-02-02&date_to=2018-02-06&limit=10' | jq '.results' | quality-check | jq .
```
