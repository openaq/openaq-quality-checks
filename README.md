# OpenAQ Quality Checks

OpenAQ Quality Checks is a command line interface for flagging potentially invalid air quality measurements.

Have an OpenAQ data quality concern or experience you would like to share? Please add it to the [OpenAQ Community: What is your OpenAQ data quality experience?](https://github.com/openaq/openaq-quality-checks/issues/2) issue!

## Use

### Prerequisites

* [node, npm, nvm](https://docs.npmjs.com/getting-started/installing-node)
* [jq](https://stedolan.github.io/jq/) is recommended if using json.

### Install

```
nvm use 8.9.4
npm install openaq-quality-checks -g
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

There are 2 modes of configuration: **config file** and **command line arguments**.

#### 1. Config File

The config file configures the flags. It defines which checks should be run, what values should be flagged, and what string to use for each flag.

A set of default flags are configured in [`config.yml`](config.yml). The default flags are:

* **`E`** flags the value -999
* **`N`** flags negative values
* **`R`** flags repeating values, grouped by coordinates and ordered by date.

This default config file can be overriden using the `--config <file.yml>` argument, which should point to a yml file which has the following structure:

```yaml
keyOne: # Arbitrary identifier for the flag, e.g. 'errors'. Useful for merging with the default configuration.
  flag: Any string, e.g. E
  type: One of exact|set|range|repeats
  # Depending on the type, other values may be included. See lib/flagger.js for what can be configured.
keyTwo:
  # ...
```

This configuration is merged with the default configuration, overriding fields that exist and adding fields that do not exist.

#### 2. Commmand Line Arguments

Command line arguments configure

* data input (defaults to STDIN)
* input and output data format (defaults to json)
* flags to skip (defaults to none), and,
* which flags should be used to remove data from the output (default none).

```bash
$ quality-check --help
Usage: index.js [options]

Options:
  --version         Show version number                                [boolean]
  --infile          Input file. Should be the same format as input-format (which
                    default to json).
  --input-format    Input format, can be csv or json. Defaults to json.
  --ouptput-format  Output format, can be csv or json. Defaults to json.
  --skip            Comma-separated list of flags to skip.
  --remove          Comma-separated list of flags to use in removing data from
                    output.
  --remove-all      Removes all flagged data.
  --config          Config file to override default config.
  -h, --help        Show help                                          [boolean]

Examples:
  index.js --infile foo.json  Flags the contents of a file and writes to stdout.
  cat foo.json | index.js     Flags the contents of stdin and writes to stdout.

copyright 2018

```

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
quality-check --infile examples/addis-ababa-20180202.json --skip N,R | jq .
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

#### Using a different data source

The tool was built with OpenAQ in mind but also to be flexible to other data sources. For example, if you want to analyze aggregated world news using [reddit's worldnews subreddit](https://www.reddit.com/r/worldnews/), you might want to flag posts from unknown news organization.

Using a config like the one in [`examples/worldnews-config.yml`](./examples/worldnews-config.yml), e.g.:

```yaml
# examples/worldnews-config.yml
unknown_sources:
  flag: UKNOWN_SOURCE
  type: set
  values: ["theguardian.com", "bbc.co.uk", "bloomberg.com", "bbc.com", "reuters.com", "npr.org", "independent.co.uk", "cnn.com"]
  includes: 'false'
  valueField: 'data.domain'
```

We can flag all unknown news organizations:

```
echo $(curl -H "User-Agent: laptopterminal" https://www.reddit.com/r/worldnews.json?limit=50) | \
  jq '.data.children' | \
  quality-check --config examples/worldnews-config.yml | \
  jq '.'
```
