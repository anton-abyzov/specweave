# Plan: with-15-task-cap

Archived under the pre-1.1.0 TASK_CAP = 15 regime. The 0669 alignment raised the cap to 40, but per-increment overrides (via `metadata.json` `taskCap`) still honor the old number so long-running archived agents don't need to be re-planned.

## Architecture Decisions

- `taskCap: 15` is retained in metadata and respected on resume.
- New increments default to `taskCap: 40` globally.
