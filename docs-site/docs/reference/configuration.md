---
sidebar_position: 4
title: Configuration
description: Every key SpecWeave 2.0 reads from .specweave/config.json, plus increment metadata.
---

# Configuration reference

SpecWeave 2.0 has an **exact** config surface. Every key listed here has a reader in the code; anything else in `.specweave/config.json` produces one warning line on load and is ignored.

`specweave init` writes the file. `specweave update` migrates a 1.x file to this shape in a single pass.

---

## A complete 2.0 config

```json
{
  "version": "2.0",
  "project": { "name": "my-app" },
  "adapters": { "default": "claude" },
  "testing": {
    "mode": "TDD",
    "commands": ["npm test", "npm run lint"],
    "coverage": { "unit": 95, "integration": 90, "e2e": 100 }
  },
  "limits": { "activeIncrements": 3 },
  "planning": { "deepInterview": "off" },
  "livingDocs": false,
  "sync": { "enabled": false }
}
```

That is the whole default. Everything below is optional.

---

## Core keys

### `version`

Config schema version. 2.0 configs carry `"2.0"`. The migrator sets it.

### `project`

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | The only field SpecWeave itself reads. |
| `version`, `description`, `techStack`, `team` | — | Metadata for your own use. |

### `adapters`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `default` | `"claude"` \| `"codex"` \| `"generic"` | `"claude"` | Which instruction-file flavour `specweave update-instructions` generates. |

### `testing`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `mode` | `"TDD"` \| `"test-after"` \| `"manual"` \| `"none"` | `"TDD"` | How tests are written for new work. |
| `commands` | `string[]` | `[]` | The project's verification commands, run **in order** by `specweave verify`. Empty means auto-detect from `package.json` scripts (`test` → `lint` → `build`), Cargo, pytest or go. |
| `coverage.unit` | number | `95` | Line coverage target (%). |
| `coverage.integration` | number | `90` | Line coverage target (%). |
| `coverage.e2e` | number | `100` | Pass-rate of written e2e tests, not line coverage. |

`testing.commands` is the single most valuable key in the file: it is exactly what `verify.json` records, and therefore what the closure gate is checking.

### `limits`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `activeIncrements` | number | `3` | **Advisory.** Exceeding it prints one info note. Nothing blocks. `0` disables the note. |

The 1.x hard WIP cap is gone.

### `planning`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `deepInterview` | `"off"` \| `"warn"` | `"off"` | `"warn"` makes the planning skill ask the structured interview questions and note the gaps. Enforcement is skill-side only — no hook blocks a write in 2.0. |

### `livingDocs`

| Value | Effect |
|-------|--------|
| `false` (default) | Living docs are never generated. |
| `"onDone"` | Regenerated when an increment is completed. |

Off by default because the 1.x auto-generated tree was never read. The diagram/JPG generators were removed entirely.

### `workspace`

Multi-repo workspaces (the umbrella repo plus its children). Replaces the 1.x `umbrella`, `multiProject` and `projectMappings` blocks, which the migrator folds in automatically.

```json
{
  "workspace": {
    "name": "acme",
    "repos": [
      { "id": "web-ui", "path": "repositories/acme/web-ui", "prefix": "FE", "role": "frontend" },
      { "id": "api",    "path": "repositories/acme/api",    "prefix": "BE", "role": "backend" }
    ]
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Workspace display name. |
| `rootRepo` | object | Sync targets for the umbrella repo itself. |
| `repos[].id` | string | Must match the canonical source name (GitHub repo name, Jira key lowercased, ADO project kebab-cased). |
| `repos[].path` | string | Relative or absolute path. |
| `repos[].prefix` | string | User-story prefix — `US-FE-001`. |
| `repos[].techStack`, `repos[].role` | — | Story routing hints. |
| `repos[].sync` | object | Per-repo `github` / `jira` / `ado` targets. |

The umbrella section of `CLAUDE.md` is emitted only when `workspace.repos` is non-empty.

### `sync`

See the [`specweave sync` reference](/docs/reference/sync-cli) for the full block. The essentials:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `false` | Master switch. Nothing talks to a tracker until this is true. |
| `github` / `jira` / `ado` | object | — | Per-provider `{ enabled, … }`. GitHub is first-class; Jira and ADO are opt-in and community-maintained. |
| `settings.autoSyncOnCompletion` | boolean | `true` | Push on `specweave complete`. |
| `defaultProfile` | string | — | Fallback profile when an increment names none. |

`sync.mode` was removed: the queued event-queue path dropped events on a partial flush.

### `auto`

Settings for `specweave auto`.

| Field | Type | Default |
|-------|------|---------|
| `enabled` | boolean | — |
| `maxIterations` | number | `2500` |
| `maxTurns` | number | `50` |
| `maxRetries` | number | `20` |
| `requireTests` | boolean | `false` |

---

## Kept beyond the advertised surface

These keys are not part of the 2.0 story, but real code still reads them, so they are accepted without a warning:

| Key | Reader |
|-----|--------|
| `lsp` | LSP config and the plugin detector. |
| `cicd` | `specweave branch-name` and the CI/CD config loader. Carries `pushStrategy`, `git.*`, `release.*`. |
| `repository` | The external-issue auto-creator and `specweave sync` health. |
| `issueTracker` | The 1.x tracker block, still written by the `specweave sync setup` wizard and read by the Jira/ADO paths. |
| `hooks` | Closure-time tracker flags (`close_github_issue`, `close_jira_issue`, `close_ado_work_item`, `close_external_issue`) read by the lifecycle dispatcher. The living-docs flags were removed — use `livingDocs`. |
| `plugins` | The Claude adapter's `plugins.enabled` list. |

---

## Removed keys

The migrator deletes these outright and records what it dropped in `.specweave/state/config-migration-2.json`:

`contextBudget` · `quality` · `cache` · `deduplication` · `archiving` · `apiDocs` · `statusLine` · `incrementAssist` · `billing` · `translation` · `language` · `documentation` · `reflect` · `pluginAutoLoad` · `grill` · `codeReview` · `qualityGates` · `skillGen`

Removed `hooks` sub-keys: `banner`, `post_increment_planning`, `post_task_completion`.

Removed `testing` sub-keys (after the renames below): `defaultTestMode`, `defaultCoverageTarget`, `coverageTargets`, `tddEnforcement`, `playwright`.

## Renames applied by the migrator

| 1.x | 2.0 |
|-----|-----|
| `testing.defaultTestMode` | `testing.mode` |
| `testing.coverageTargets` | `testing.coverage` |
| `limits.maxActiveIncrements` | `limits.activeIncrements` (advisory) |
| `hooks.*.sync_living_docs` | `livingDocs: "onDone"` \| `false` |
| `planning.deepInterview.{enabled,enforcement}` | `planning.deepInterview: "off"` \| `"warn"` |
| `umbrella`, `multiProject`, `projectMappings` | `workspace` |
| `sync.mode` | removed |

---

## Increment metadata

`.specweave/increments/NNNN-slug/metadata.json`:

| Field | Notes |
|-------|-------|
| `id` | The four-digit increment number. |
| `status` | `planned` \| `active` \| `completed` \| `abandoned` \| `paused`. **Set only by CLI transitions** — never edit it by hand. |
| `type` | feature, bug, hotfix, refactor, … |
| `created`, `updated` | ISO timestamps. |
| `externalLinks` | Tracker keys and URLs written by `specweave sync push`. Never hand-edit. |
| `closeReason` | Why an increment was closed or abandoned without a green verify. |
| `supersedes` | Set by `create-increment --supersedes NNNN`, which abandons the old increment with a matching `closeReason`. |
| `parent` | Parent increment, when one exists. |

---

## Git configuration written by init and update

`.gitignore`:

```
.specweave/state/
.specweave/logs/
.specweave/jobs/
.specweave/cache/
.specweave/backups/
.specweave/increments/**/reports/artifacts/
.claude/worktrees/
```

`.gitattributes`:

```
**/ledger.jsonl merge=union
```

The `merge=union` line is required for multi-agent work: it makes a ledger conflict concatenate both sides instead of forcing a manual merge, and the fold is order-independent.
