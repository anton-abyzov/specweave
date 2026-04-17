# Plan: with-state-markers

Legacy plan that predates the 0669 state-marker removal. It references a `skill-chain-0001.json` state file that newer SpecWeave versions no longer emit but must still tolerate when present.

## Architecture Decisions

- The on-disk marker file is treated as read-only metadata by newer versions.
- No new markers are written; existing markers are left untouched.
