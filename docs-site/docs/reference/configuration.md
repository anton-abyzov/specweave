---
sidebar_position: 4
title: Configuration
description: The keys SpecWeave 3.0 reads from .specweave/config.json, what init writes, and which old keys are removed.
---

# Configuration reference

`.specweave/config.json` holds project settings. `specweave init` writes it, and you rarely need to touch it. Every key on this page has a reader in the code. A top-level key SpecWeave does not know produces one warning line when the config loads and is otherwise ignored.

Per-increment state is not here. It lives in each increment's `metadata.json` and `ledger.jsonl`; see the [metadata reference](/docs/reference/metadata-reference).

## What init writes

For a Claude Code project with a GitHub remote, `specweave init` writes roughly this:

```json
{
  "version": "2.0",
  "project": { "name": "my-app", "version": "0.1.0" },
  "adapters": { "default": "claude" },
  "repository": { "provider": "github", "organization": "acme", "repo": "my-app" },
  "testing": { "commands": [] },
  "limits": { "activeIncrements": 3 },
  "planning": { "deepInterview": "off" },
  "auto": { "maxTurns": 20, "maxSessionAge": 7200, "requireTests": false },
  "livingDocs": false,
  "lsp": { "enabled": true },
  "workspace": { "name": "my-app", "repos": [] },
  "sync": { "enabled": true, "autoSync": true, "settings": { "canUpsertInternalItems": true, "canUpdateExternalItems": true, "canUpdateStatus": true } }
}
```

`version` is the config schema version. It stays `"2.0"` in SpecWeave 3.0 because the file format did not change.

Without a git remote, `repository.provider` is `"local"` and there is no `sync` block. With another tool, `adapters.default` names it (`codex`, `cursor`, `copilot`, `gemini`, `generic` and so on) and `lsp` is not written.

The single most useful edit is filling in `testing.commands`.

## Core keys

### `project`

| Field | Notes |
|-------|-------|
| `name` | The project name. The only field SpecWeave itself reads. |
| `version`, `description`, `techStack`, `team` | For your own use. |

### `adapters`

| Field | Default | Notes |
|-------|---------|-------|
| `default` | `"claude"` | The tool chosen at `init`. `refresh-plugins` uses it to decide where the skills go. |

### `testing`

| Field | Default | Notes |
|-------|---------|-------|
| `commands` | `[]` | The commands `specweave verify` runs, in order. Empty means auto-detect: `package.json` scripts `test`, `lint`, `build`, then Cargo, pytest or Go. |
| `mode` | not set | `TDD`, `test-after`, `manual` or `none`: how tests are written for new work. `init` writes it only when you choose one. |
| `coverage.unit`, `coverage.integration` | not set | Line coverage targets in percent. Below target is a warning at close, not a block. Written only when you set a target. |
| `coverage.e2e` | not set | Share of written end-to-end tests that must pass. Not line coverage. |

### `tasks`

| Field | Default | Notes |
|-------|---------|-------|
| `leaseHours` | `2` | Hours before an unfinished claim is stale and another agent may take the task over. |

### `limits`

| Field | Default | Notes |
|-------|---------|-------|
| `activeIncrements` | `3` | Advisory. Going over prints one note; nothing blocks. `0` turns the note off. |

### `planning`

| Field | Default | Notes |
|-------|---------|-------|
| `deepInterview` | `"off"` | `"warn"` asks the planning skill to cover a structured set of questions and note the gaps. It never blocks. |

### `auto`

Settings for `specweave auto` and its Stop hook.

| Field | Default | Notes |
|-------|---------|-------|
| `maxTurns` | `20` | Hard stop for one auto session. |
| `maxSessionAge` | `7200` | Seconds before an idle auto session is treated as stale and reset. |
| `requireTests` | `false` | Add a "tests pass" condition to the session's success criteria. |

These are the only `auto` keys 3.0 reads. Projects created with 2.x may also have `enabled`, `maxRetries`, `requireValidation`, `requireJudgeLLM` and `skipQualityGates`; they are ignored.

### `workspace`

Multi-repo workspaces: an umbrella folder with child repos under `repositories/`. `init` fills this in when it finds child repos.

```json
{
  "workspace": {
    "name": "acme",
    "repos": [
      { "id": "web-ui", "path": "repositories/acme/web-ui", "prefix": "FE", "role": "frontend" },
      { "id": "api", "path": "repositories/acme/api", "prefix": "BE", "role": "backend" }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `name` | Workspace name. |
| `rootRepo` | Sync target for the umbrella repo itself. |
| `repos[].id` | Must match the repository name. |
| `repos[].path` | Relative or absolute path. |
| `repos[].prefix`, `repos[].role`, `repos[].techStack` | Routing hints. |
| `repos[].sync` | Per-repo `github`, `jira` or `ado` target. |

The old `umbrella`, `multiProject` and `projectMappings` blocks are folded into `workspace` when the config loads.

### `sync`

External trackers. Nothing is written to GitHub, Jira or Azure DevOps until you run `specweave sync push`; starting, pausing or resuming an increment never calls a tracker.

| Field | Notes |
|-------|-------|
| `enabled` | Master switch. `init` turns it on when it finds a GitHub or Azure DevOps remote. |
| `github` | `{ "enabled", "owner", "repo" }`. First-class. |
| `jira` | `{ "enabled", "domain", "projectKey" }`. Opt-in. |
| `ado` | `{ "enabled", "organization", "project" }`. Opt-in. |
| `settings.canUpsertInternalItems`, `settings.canUpdateExternalItems` | `sync push` only creates missing issues when one of these is `true`. |
| `defaultProfile`, `profiles` | Named tracker targets, written by `specweave sync setup`. |

Flags and token resolution are in the [`specweave sync` reference](/docs/reference/sync-cli).

### `hooks`

The explicit close-on-complete setting. With it, `specweave complete` closes the GitHub issue, Jira issue or Azure DevOps work item that `sync push` linked to the increment. Without it, `complete` leaves every tracker alone. `specweave sync setup` writes `close_external_issue: true`; set it to `false` to keep closure local.

```json
{ "hooks": { "post_increment_done": { "close_external_issue": true } } }
```

`close_external_issue` covers every tracker. The narrower keys close one kind only: `close_github_issue` for GitHub, `close_jira_issue` and `close_ado_work_item` for Jira and Azure DevOps. Closure is skipped when `sync.settings.canUpdateExternalItems` is `false`.

### `jev`

Jev (System One) is off until `specweave jev setup` writes `"enabled": true` after a live test call. Only the name of the environment variable that holds the key is stored, never the key.

| Field | Default |
|-------|---------|
| `enabled` | `false` |
| `provider` | `"openrouter"` (or `"typesafe"`) |
| `model` | `"jev-1.13"` on OpenRouter |
| `apiKeyEnv` | provider default: `OPENROUTER_API_KEY` or `TYPESAFE_API_KEY`, then `JEV_API_KEY` |
| `timeoutMs` | `4000` |
| `thresholds` | `{ "route": 0.7, "guardDeny": 0.85, "guardWarn": 0.5 }` |
| `guards.bash` | `false` |
| `modelRouting` | `true` |
| `browse` | `{ "allowDomains": [], "maxSteps": 20 }` |

`SPECWEAVE_JEV=0` turns Jev off for one process; `SPECWEAVE_JEV_PROVIDER` and `SPECWEAVE_JEV_MODEL` override the file. See [Jev](/docs/guides/jev-system-one).

## Kept for compatibility

These keys are accepted without a warning because some code still reads them. You do not need to set them.

| Key | Read by |
|-----|---------|
| `repository` | Remote detection at `init`, and issue creation during `sync push`. |
| `lsp` | `{ "enabled": true }` for Claude Code projects. See [LSP integration](/docs/guides/lsp-integration). |
| `cicd` | `specweave branch-name` and the CI/CD helpers (`pushStrategy`, `git`, `release`). |
| `issueTracker` | The older tracker block that `specweave sync setup` still writes for Jira and Azure DevOps. |
| `plugins` | `plugins.enabled`, the list of enabled Claude Code plugins. |
| `livingDocs` | `false` by default. `"onDone"` regenerates living docs when an increment closes; `specweave update` sets it for 2.x projects that used living docs. |

## Removed keys

`specweave update` and `specweave update-instructions` delete these and record what they dropped in `.specweave/state/config-migration-2.json`:

`contextBudget`, `quality`, `cache`, `deduplication`, `archiving`, `apiDocs`, `statusLine`, `incrementAssist`, `billing`, `translation`, `language`, `documentation`, `reflect`, `pluginAutoLoad`, `banner`, `grill`, `codeReview`, `qualityGates`, `skillGen`.

Also removed: `hooks.banner`, `hooks.post_increment_planning`, `hooks.post_task_completion`, `sync.mode`, and the `testing` sub-keys `defaultTestMode`, `defaultCoverageTarget`, `coverageTargets`, `tddEnforcement` and `playwright` (after they are renamed to `testing.mode` and `testing.coverage`). `limits.maxActiveIncrements` becomes `limits.activeIncrements`.

## Git files

`init` and `update-instructions` add this line to `.gitattributes` so parallel agents never conflict on the ledger:

```
**/ledger.jsonl merge=union
```

They also add runtime folders such as `.specweave/state/` and `.specweave/logs/` to `.gitignore`. `.specweave/increments/` and `.specweave/memory/` are committed.
