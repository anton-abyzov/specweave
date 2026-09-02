# SpecWeave Plugin Scripts

Small, zero-reasoning helpers that read SpecWeave state and print it. They exist
so status-style commands do not have to round-trip through the model.

All user-facing helpers are **Node scripts** — they run identically on macOS,
Linux and Windows (`cmd`, PowerShell, Git Bash). The 2.0 cleanup removed the
bash variants (`read-status.sh`, `read-progress.sh`, `read-jobs.sh`, …) and the
`UserPromptSubmit` hook that used to intercept prompts to run them.

## Scripts

```bash
node plugins/specweave/scripts/status.js      # increment status overview
node plugins/specweave/scripts/progress.js    # task completion progress
node plugins/specweave/scripts/jobs.js        # background job status
```

Supporting helpers: `detect-project-type.js`, `get-default-conditions.js`,
`chunk-prompt.js`.

`rebuild-dashboard-cache.sh` is the one remaining shell script; it is invoked by
`specweave cache --rebuild` and is unix-only (tracked as a follow-up port).

## Equivalent CLI commands

```bash
specweave status      # increments overview
specweave task list   # task progress for one increment
specweave jobs        # background jobs
```

## Hooks

SpecWeave registers exactly four Claude Code hooks (SessionStart, PreToolUse,
Stop, PreCompact) in `plugins/specweave/hooks/hooks.json`. They all run
`node ${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs <event>` in exec form — no shell, no
bash. See `plugins/specweave/hooks/run.mjs`.
