# Changelog

## 1.1.1

* "Whitelisting": Add `includes` configuration option. Defaults to `true`. When `includes: 'false'` in a config file, values _not_ in a set of values will be flagged for a `set` flagger. This enables a "whitelisting" where anything _not_ in the whitelist of `values` is flagged.

## 1.1.0

* Update --remove and --skip flags to use comma separated values. Also now produce documentation.

## 1.0.0

* Initial release
