# Analyzer Overrides

Crylic includes a powerful static analysis system for many functions, such as determining which files are components, how components are linked, and where to edit code when applying changes.

When it specifically comes to determining which files are components, multiple assumptions are made that help speed up project load times. Some example assumptions include 'all component files start with an upper case letter' and 'test files are not components'.

These assumptions can be changed in the case that components are not being found within Crylic. All the overrides are set in the [config file](../reference/configuration-file.md#analyzer).
