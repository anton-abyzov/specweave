/**
 * The config *schema* version 2.0 configs carry.
 *
 * This is deliberately NOT the package version: `.specweave/config.json` has
 * its own shape version (see the 2.0 design), and the CLI's npm version moves
 * independently. Nothing here may be derived from package.json.
 *
 * @module core/config/schema-version
 */

/** Value written to `config.version` by the 1.x → 2.0 migration. */
export const CONFIG_SCHEMA_VERSION = '2.0';
