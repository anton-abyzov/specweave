---
description: "[DEPRECATED] GitHub sync guidance. Superseded by the live sw-github:* command family. For actual syncing use sw-github:push / sw-github:pull / sw-github:close / sw-github:sync."
version: 1.0.1
user-invokable: false
deprecated: true
---

> ⚠️ DEPRECATED — superseded by the live `sw-github:*` command family.

This skill's standalone guidance is retired. GitHub sync is performed by the
increment-based command family, which is the source of truth:

| Action | Live command |
|--------|--------------|
| Push local progress to GitHub Issues | `sw-github:push [increment-id]` |
| Pull issue state back into the spec | `sw-github:pull` |
| Create the GitHub Issue/milestone | `sw-github:create` |
| Close issues on increment completion | `sw-github:close` |
| Two-way reconcile | `sw-github:sync` |
| Check sync status | `sw-github:status` |

**Mapping** (per CLAUDE.md): Feature → Milestone · User Story → Issue · Task → Checkbox.

## Why this skill is deprecated

- The increment-based `sw-github:*` commands are the supported path. Run them
  directly; this skill no longer carries its own workflow guidance (it was
  contradictory — it pointed at a `sw-github:sync-spec` command that does not
  exist and claimed increment-based sync was "removed" when it is the live flow).
- Setup and credentials are handled by `sw:sync-setup`. Configuration lives in
  `.specweave/config.json` (`sync.*`); the GitHub token is read from
  `GITHUB_TOKEN` / `GH_TOKEN` in `.env` (or `gh auth login`).
- For the deprecation policy, see
  `.specweave/docs/internal/specs/skill-deprecation-policy.md`.

## Removal

Scheduled for removal once the `sw-github:*` command help fully absorbs any
remaining setup notes. Until then this stub exists only to avoid contradictory
guidance; it is non-activating (`user-invokable: false`).
