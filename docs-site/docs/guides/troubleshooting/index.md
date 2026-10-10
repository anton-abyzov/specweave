---
sidebar_position: 1
title: Troubleshooting
description: Fix common SpecWeave 3.0 problems by symptom - install errors, doctor, hooks, stale claims, ledger merge conflicts, verify and complete, handoff, sync and state cleanup.
---

# Troubleshooting

Start with the health check. It covers the environment, config, instruction files, increments, hooks, git and the installed plugin, and it tells you which command fixes each failure.

```bash
specweave doctor              # full check; exits 1 when something failed
specweave doctor --quick      # skip slow checks (network, hook dry-runs)
specweave doctor --fix        # apply the safe fixes it knows about
specweave doctor --fix-status # repair metadata.json and spec.md status mismatches
```

`--fix` removes leftover legacy command directories and stale plugin caches, repairs lockfile hashes, and refreshes an out-of-date SpecWeave pre-commit hook. `--fix-status` treats `metadata.json` as the source of truth and rewrites the status in `spec.md` wherever the two disagree, which only matters for increments created before 3.0. Add `--verbose` to see every check, or `--json` for a machine-readable report.

If the problem is not listed below, run `specweave update` (CLI, instruction files, config and plugin in one go) and then `specweave doctor` again.

## Install and upgrade

### `SyntaxError: Unexpected token 'with'`

Your Node.js is too old. SpecWeave needs Node.js 20.12.0 or later.

```bash
node --version
nvm install 22 && nvm use 22   # or install the current LTS another way
npm install -g specweave@3
```

### `specweave: command not found`

The CLI is not installed globally, or npm's global bin folder is not on your `PATH`.

```bash
npm install -g specweave@3
npm prefix -g   # its bin/ folder must be on PATH
```

If `npm install -g` fails with `EACCES`, use a Node version manager such as nvm so global packages install into your home directory, rather than running npm with `sudo`.

### `npm ERR! code E401` during install or update

A stale auth token in `~/.npmrc` is sent even for public packages. Install while ignoring your npm config:

```bash
npm install -g specweave@3 --registry https://registry.npmjs.org --userconfig /dev/null
```

To fix the cause, remove or refresh the `registry.npmjs.org` token in `~/.npmrc` (`npm login` refreshes it).

### The first commit after upgrading from 2.x is rejected

An old SpecWeave pre-commit hook rejects `ledger.jsonl` and `handoff.md` at the increment root. `specweave doctor` reports it as a failed "Pre-commit hook" check. Either command rewrites it (a hand-written hook is reported, never replaced):

```bash
specweave doctor --fix
specweave update
```

### Skills or slash commands are missing in Claude Code

```bash
specweave update            # refreshes the plugin as well as the project files
specweave refresh-plugins   # just the plugin
```

Then restart the Claude Code session. Never edit `~/.claude/plugins/installed_plugins.json` by hand; Claude Code manages it. In a cloud session or a Claude Code Projects thread there is no plugin; the same skills load from `.claude/skills/`, which `init` writes and you commit.

## Hooks

SpecWeave installs two Claude Code hooks: SessionStart, which prints a short pickup, and Stop, which only acts while an auto session is running. The Jev Bash guard adds a PreToolUse hook only if you turn it on.

### A hook printed an error or blocked something

Warnings, errors and blocks go to `.specweave/logs/hooks.jsonl`. Read them with:

```bash
specweave hooks log                # last 20 entries
specweave hooks log --errors-only
specweave hooks log --blocks-only
specweave hooks log --hook stop --last 50
```

`specweave doctor` also dry-runs each hook and reports one that fails or runs too long.

### A session hangs or crashes on a hook

Turn hooks off for this shell, clear the leftover state, and restart the tool:

```bash
export SPECWEAVE_DISABLE_HOOKS=1
specweave gc --yes
```

Then find the cause with `specweave hooks log --errors-only` and `specweave doctor`. Turn hooks back on with `unset SPECWEAVE_DISABLE_HOOKS`. If hooks never run at all, check that this variable is not set in your shell profile.

## Tasks and the ledger

### `refused: T-03 is claimed by codex@laptop since ...`

Another agent holds a live claim. Pick another task (`specweave task next`), or ask that agent to release it. The refusal names your three options:

```bash
specweave task release T-03          # run as the agent that holds it
specweave task claim T-03 --force    # take it over deliberately
```

A claim older than the lease is **stale** and can be claimed without `--force`. The lease is 2 hours by default; change it with `tasks.leaseHours` in `.specweave/config.json`. `specweave task list` shows which claims are stale.

If the holder is you under another tool name (for example you switched from Claude Code to Codex on the same machine), you can set `SPECWEAVE_TOOL` so the identity matches, or release the old claims first with `specweave task release --all-mine` from the old tool. A handoff releases your claims for you.

### A claim is refused because of `Files` or dependencies

`shares Files with live claim(s)` means another agent is editing the same files; pick a different task. `depends on T-01 (not done)` means an earlier task must finish first. `--force` overrides both when you are sure.

### `done needs evidence`

`task done` records proof. Give it a command to run, or evidence you already have:

```bash
specweave task done T-02 --run "npm test -- draft"
specweave task done T-02 --evidence "a1b2c3d, 14 tests passed"
```

With `--run`, a non-zero exit means the task is **not** done; the full output is in `reports/task-T-02.txt` inside the increment.

### Merge conflict in `ledger.jsonl`

The ledger is append-only, so the right resolution is always to **keep every line from both sides**. Order does not matter; events are sorted by timestamp when read. Open the file, delete only the `<<<<<<<`, `=======` and `>>>>>>>` marker lines, keep every event line, then `git add` it. Never resolve it with `git checkout --ours` or `--theirs`, which throws away one side's claims and completions.

To stop this happening, make sure `.gitattributes` contains:

```
**/ledger.jsonl merge=union
```

`specweave init` writes it and `specweave update-instructions` (part of `specweave update`) adds it to an existing project.

## Verify and complete

### `reports/verify.json missing` or `verify.json is not ok`

`specweave complete` closes an increment only after a passing `specweave verify`.

```bash
specweave verify 0042
specweave complete 0042
```

`verify` runs the project's test, lint and build commands (from `testing.commands` in `.specweave/config.json`, or detected from your stack) and writes `reports/verify.md` and `reports/verify.json`. It also fails when acceptance criteria are not met. An AC is met when every task covering it is done, so the usual fix is to finish the open tasks, not to tick boxes. If verify prints `No verification commands`, fill in the Commands table in `AGENTS.md` or set `testing.commands`.

To close anyway, for example work that was dropped, give a reason. It is stored as `closeReason` in `metadata.json`:

```bash
specweave complete 0042 --reason "superseded by 0045"
```

### A task command says there is no active increment, or several

`task`, `verify` and `handoff` act on the single active increment. Pass the id when there are several (`specweave task next 0042`), start a planned one with `specweave start 0042`, or check with `specweave status`.

## Handoff and pickup

### The next session cannot see my work

A cloud session (a Claude Code Projects thread, Codex cloud) or another machine sees only what is pushed. `specweave handoff` pushes by default when the repository has a remote: the branch, plus a snapshot of your uncommitted edits to `wip/<branch>` and `specweave-handoff`. Check its output:

- `Nothing was pushed` means the repository has no `origin` remote, or you passed `--no-push`. Add the remote and run `specweave handoff` again, or use `specweave handoff --inline` for a prompt you can paste.
- A `warning:` line means a push failed (no permission, offline, detached HEAD, no commits yet). Fix what it names and run `specweave handoff` again.

See [Cross-tool handoff](/docs/guides/cross-tool-handoff).

### `pickup` says a handoff is waiting but applied nothing

`specweave pickup` only changes your checkout when it is safe:

- **Uncommitted changes here.** Commit or stash them, then run `specweave pickup` again.
- **The branches have diverged.** Merge the handed-off branch as the message says, then run `specweave pickup` again.
- **You ran `--no-apply`.** That only shows what is waiting.

Applied edits are left unstaged, the way the previous session had them.

### `pickup` shows the wrong increment

Pass the id: `specweave pickup 0042`. If an increment you finished still shows as active, close it with `specweave complete`, or pause it with `specweave pause 0042 --reason "..."`.

## Sync

Sync only runs when you ask (`specweave sync push`), so a status change never fails because of a tracker.

```bash
specweave sync status            # token source, account, can-push, provider health
specweave sync setup --validate  # check the saved configuration and credentials
specweave sync push 0042 --dry-run
```

Report the output of `sync status` as it is; its token and permission errors are specific. See [GitHub sync](/docs/guides/github-sync) and the [sync CLI reference](/docs/reference/sync-cli).

## Auto mode

```bash
specweave auto-status     # what the session is doing
specweave cancel-auto     # stop it
specweave auto --reset    # clear stale auto state before starting again
```

## Clean up local state

`specweave gc` removes known junk from `.specweave/state/` (old markers, circuit-breaker files, caches). It is a dry run unless you pass `--yes`, it never touches the files coordination depends on, and it also reports the size of `.worktrees/` and any nested `.specweave/` folders without deleting them.

```bash
specweave gc          # show what would be removed
specweave gc --yes    # remove it
```

The SessionStart hook runs the same cleanup quietly at most once a day. `.specweave/state/` is local; `doctor` warns if it is tracked by git.

## Recover lost or broken increment files

Increments are ordinary files in git, so git is the recovery tool:

```bash
git log --oneline -- .specweave/increments/0042-checkout/
git restore --source=HEAD~1 .specweave/increments/0042-checkout/spec.md
```

Do not rewrite or delete lines in `ledger.jsonl` to "fix" a state. Append a new event instead: `specweave task release`, `task skip --reason`, or `task block --reason`.

## Still stuck

Open an issue at [github.com/anton-abyzov/specweave/issues](https://github.com/anton-abyzov/specweave/issues) with:

- `specweave --version` and `node --version`
- the output of `specweave doctor --json`
- recent entries from `specweave hooks log --errors-only` if a hook is involved
- the steps that reproduce it

## See also

- [FAQ](/docs/faq)
- [SpecWeave 3.0](/docs/guides/specweave-3)
- [Commands reference](/docs/reference/commands)
