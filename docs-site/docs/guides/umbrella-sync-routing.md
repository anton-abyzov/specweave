# Umbrella Sync Routing

**For**: Teams using umbrella (multi-repo) SpecWeave projects
**Version**: 1.0.366+

---

## What Is Umbrella Sync Routing?

When you run SpecWeave as an **umbrella project** (multiple repos under one workspace), sync routing determines **which repository** receives GitHub issues, JIRA tickets, and ADO work items for each increment.

Without umbrella mode, there's one target per platform — all issues go to the same repo/project. With umbrella mode, each child repo can have its own sync targets, and SpecWeave routes tickets to the right place based on the `**Project**:` field in your spec.

---

## Quick Summary

| Mode | Config | Behavior |
|------|--------|----------|
| **Single repo** | No `umbrella` section | All tickets → global sync config |
| **Umbrella** | `umbrella.enabled: true` | `**Project**:` field controls where tickets go |

The `**Project**:` field is the single source of truth for routing. When it matches a child repo, tickets go to that repo's sync targets. When it matches the umbrella project name, tickets go to the umbrella's own targets. No match → global fallback.

---

## How It Works

### The Decision Flow

When SpecWeave syncs an increment to external tools, it reads the `**Project**:` field from the spec's user stories and resolves the sync target:

```
resolveSyncTarget(projectName, config)
│
├─ umbrella.enabled = false (or absent)?
│  └─ GLOBAL targets (single-repo mode)
│
│  (umbrella mode)
│
├─ projectName matches umbrella.projectName?
│  └─ umbrella.sync targets (umbrella-scoped work)
│
├─ projectName matches a childRepo name or id?
│  └─ childRepo.sync targets (per-repo routing)
│
├─ projectName prefix matches a childRepo? (e.g., US-VSK-001 → prefix VSK)
│  └─ childRepo.sync targets (prefix-based fallback)
│
└─ no match
   └─ GLOBAL targets (fallback)
```

### Where the Project Name Comes From

SpecWeave reads the project name from your spec.md in this order:

1. **YAML frontmatter**: `project: my-app` (newer format)
2. **Markdown body**: `**Project**: my-app` (legacy format, still fully supported)
3. **User story field**: The `**Project**:` line inside each `### US-NNN` section

---

## Configuration

### Example

```json
{
  "sync": {
    "github": { "owner": "acme", "repo": "acme-platform" },
    "jira": { "projectKey": "PLAT" }
  },
  "umbrella": {
    "enabled": true,
    "projectName": "acme-platform",
    "sync": {
      "github": { "owner": "acme", "repo": "acme-platform" },
      "jira": { "projectKey": "PLAT" }
    },
    "childRepos": [
      {
        "id": "frontend",
        "name": "frontend",
        "prefix": "FE",
        "path": "repositories/acme/frontend",
        "sync": {
          "github": { "owner": "acme", "repo": "frontend" },
          "jira": { "projectKey": "FE" }
        }
      },
      {
        "id": "backend",
        "name": "backend",
        "prefix": "BE",
        "path": "repositories/acme/backend",
        "sync": {
          "github": { "owner": "acme", "repo": "backend" },
          "jira": { "projectKey": "BE" }
        }
      }
    ]
  }
}
```

### Config Reference

| Field | Required | Description |
|-------|----------|-------------|
| `sync.github` | Yes | Global GitHub target (fallback when no child repo matches) |
| `sync.jira` | No | Global JIRA target |
| `sync.ado` | No | Global ADO target |
| `umbrella.enabled` | Yes | Enables umbrella mode and per-repo routing |
| `umbrella.projectName` | No | Name of the umbrella project (for umbrella-scoped increments) |
| `umbrella.sync` | No | Sync targets for umbrella-scoped work |
| `umbrella.childRepos[].sync.github` | No | Per-repo GitHub target |
| `umbrella.childRepos[].sync.jira` | No | Per-repo JIRA target |
| `umbrella.childRepos[].sync.ado` | No | Per-repo ADO target |

---

## Scenarios

### Scenario 1: Single Repo (No Umbrella)

**Setup**: Standard single-repo project. No `umbrella` section in config.

```json
{
  "sync": {
    "github": { "owner": "alice", "repo": "my-app" },
    "jira": { "projectKey": "APP" }
  }
}
```

**Behavior**: Every increment syncs to `alice/my-app` on GitHub and `APP` in JIRA. No routing logic — there's only one target.

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0001-auth-flow` | `alice/my-app#1` | `APP-1` |
| `0002-dashboard` | `alice/my-app#2` | `APP-2` |

---

### Scenario 2: Umbrella Mode

**Setup**: `umbrella.enabled: true` with child repos that have `sync` config.

Using the config from the [Example](#example) above:

#### 2a. Spec says `**Project**: frontend`

Resolver matches `childRepos[0].name === "frontend"` → routes to the frontend repo's sync targets.

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0010-login-page` | `acme/frontend#1` | `FE-1` |

#### 2b. Spec says `**Project**: backend`

Resolver matches `childRepos[1].name === "backend"` → routes to the backend repo's sync targets.

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0011-api-auth` | `acme/backend#1` | `BE-1` |

#### 2c. Spec says `**Project**: acme-platform` (umbrella itself)

Resolver matches `umbrella.projectName` → uses `umbrella.sync` targets. Use this for cross-cutting work that belongs to the umbrella, not a specific child repo (CI pipelines, shared config, etc.).

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0012-ci-pipeline` | `acme/acme-platform#1` | `PLAT-1` |

#### 2d. Child repo has no `sync` config

If a child repo is registered but has no `sync` field, the resolver matches by name but returns empty targets. Callers fall back to the global config.

```json
{
  "id": "shared-lib",
  "name": "shared-lib",
  "prefix": "SH",
  "path": "repositories/acme/shared-lib"
}
```

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0013-types-update` | `acme/acme-platform#2` (global fallback) | `PLAT-2` (global fallback) |

**Tip**: Add `sync` config to child repos to get proper per-repo routing.

#### 2e. Unknown project name

If the `**Project**:` field doesn't match any child repo name, ID, or prefix, the resolver falls back to global config.

| Increment | GitHub Issue | JIRA Issue |
|-----------|-------------|------------|
| `0015-mystery-project` | `acme/acme-platform#3` (global) | `PLAT-3` (global) |

---

## How Agents Use the Project Field

When `/sw:increment` creates a new increment, the PM agent (`sw:pm`) sets the `**Project**:` field in each user story. The agent reads `umbrella.enabled` from config:

- **`umbrella.enabled: true`**: The PM assigns `**Project**:` based on which child repo the work belongs to. Cross-cutting work gets the umbrella project name.
- **`umbrella.enabled: false`**: The PM uses the global project name. All routing goes to the single global target.

This means routing is determined at spec creation time, not at sync time. The `**Project**:` field is the contract between planning and sync.

---

## Setup

### New umbrella project

When you run `specweave migrate-to-umbrella`, it automatically:

1. Sets `umbrella.enabled: true`
2. Registers the first child repo
3. Copies global sync config to `umbrella.sync`

You then add `sync` config to each child repo as needed.

### Adding sync targets to child repos

After migration, edit `.specweave/config.json` to add per-repo sync targets:

```json
{
  "umbrella": {
    "childRepos": [
      {
        "id": "my-service",
        "name": "my-service",
        "sync": {
          "github": { "owner": "acme", "repo": "my-service" },
          "jira": { "projectKey": "SVC" }
        }
      }
    ]
  }
}
```

Or run `/sw:sync-setup` to configure sync targets interactively.

---

## Partial Sync Config

Child repos don't need all three platforms configured. If a child repo only has `github` in its sync config, GitHub issues route to that repo while JIRA/ADO fall back to global.

```json
{
  "id": "docs-site",
  "sync": {
    "github": { "owner": "acme", "repo": "docs-site" }
  }
}
```

| Platform | Target | Why |
|----------|--------|-----|
| GitHub | `acme/docs-site` | Matched from child repo |
| JIRA | `PLAT` (global) | No JIRA config on child → fallback |
| ADO | `GlobalProject` (global) | No ADO config on child → fallback |

---

## Troubleshooting

### Tickets going to wrong repo

1. Check that your spec has `**Project**: repo-name` matching a `childRepos[].name`
2. Verify the child repo has a `sync` section in config.json
3. Confirm `umbrella.enabled` is `true`

### Tickets always going to global

- Is `umbrella.enabled` set to `true`?
- Does the `**Project**:` field in your spec match a child repo name exactly?
- Does that child repo have a `sync` section?

### Child repo has sync config but tickets go to global

The `**Project**:` field must exactly match `childRepos[].name` or `childRepos[].id`. Check for typos or case mismatches.

---

## Related Docs

- [External Tool Sync](./external-tool-sync.md) — How sync works (content vs status direction)
- [Sync Strategies](./sync-strategies.md) — Simple, Filtered, and Custom sync modes
- [Multi-Project Sync Architecture](./multi-project-sync-architecture.md) — Profile-based sync for advanced setups
