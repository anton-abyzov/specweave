# Plan: with-simple-flag

Archived plan originally generated with `sw:increment --simple`. Kept for backwards-compat regression testing so that the 0669 `--simple` deprecation does not break loading of pre-existing increments.

## Architecture Decisions

- `--simple` flag is retained in metadata for historical auditing.
- Resuming this increment should route through the `--simple-compat` alias added in 1.1.0.
