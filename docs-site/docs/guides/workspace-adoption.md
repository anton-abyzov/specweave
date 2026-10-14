---
title: Adopt existing repositories
sidebar_position: 18
---

# Adopt existing repositories

Keep your repositories where they are. A SpecWeave workspace has one planning root containing `.specweave/config.json`; its `workspace.repos` inventory can point to nested, sibling or external checkouts. The familiar `repositories/<owner>/<repo>` layout remains the default for new clones, not a requirement for existing work.

## Preview and register

Run this from any directory. A relative source path is resolved from the directory where you invoked the command, even when `--workspace` selects another planning root.

```bash
specweave --workspace ./planning get ../existing-api --dry-run --json
specweave --workspace ./planning get ../existing-api --json
```

The preview reports the canonical source path, proposed workspace entry, existing child planning root, action and fingerprint. To apply exactly the preview you inspected, supply its fingerprint:

```bash
specweave --workspace ./planning get ../existing-api --expected-fingerprint <fingerprint> --json
```

A changed config, path or origin rejects that apply. Preview again after reviewing the change. Repeating a completed registration without a stale fingerprint is a no-op.

Local adoption changes only the planning workspace config. It does not clone, move, initialize or commit the checkout; history, dirty files, untracked files, existing child config and native tool sessions remain where they are. No source checkout credentials are copied into the inventory. Remote sources such as `owner/repo` still use the existing clone flow; preview flags apply only to local adoption.

## Select the planning root

```bash
specweave --workspace /projects/planning task list
SPECWEAVE_WORKSPACE=/projects/planning specweave task list
```

The command-line option explicitly selects and enters the planning root. The environment variable also carries context to hooks and child tools; when inherited from a checkout, its real path must belong to that workspace. Invalid explicit context fails rather than falling back to another project. Symlinks are resolved before membership is checked.

Without explicit selection, SpecWeave discovers ancestor workspaces through registered membership or the conventional repository layout. A sibling or external checkout needs explicit context because its planning root is not an ancestor. If a registered nested checkout already owns increments, SpecWeave asks for an explicit root instead of silently changing authority. Adopting a repository does not merge its existing plans into the selected workspace.

The CLI and hook root resolver use the same planning context. Handoff inventory includes registered paths and the Git worktrees belonging to them; missing checkouts remain registered and are omitted from checkout scans. It does not recursively search your home directory.

## Identity and compatibility

The inventory remains in `.specweave/config.json`:

```json
{
  "workspace": {
    "name": "Product",
    "repos": [
      {
        "id": "acme-api",
        "path": "../existing-api",
        "prefix": "API",
        "identity": "github.com/acme/api",
        "sync": { "github": { "owner": "acme", "repo": "api" } }
      }
    ]
  }
}
```

Existing IDs, prefixes, sync bindings and paths are preserved. New IDs include the remote owner when available; collisions receive a deterministic suffix. Canonical remote identity strips credentials and transport details. Idempotency requires the same physical checkout: two clones of one remote remain separate, while two spellings or symlinks of the same checkout do not create duplicates. A changed recorded origin fails for explicit review.

Concurrent adoption calls serialize through `.specweave/config.json.adoption.lock` and replace the config atomically. If a process is interrupted, a leftover lock fails closed after a bounded wait. Check the PID recorded in that lock before removing it; never remove a live writer's lock. Other tools should not edit the config concurrently. There is no automatic mass relocation or historical increment renumbering.

SpecWithCode can read this same inventory to preview and attach existing repositories. Its approved-folder permissions, local project identity and native plans remain separate; registration in SpecWeave alone does not grant the app filesystem access or change its planning root.

## Configuration schema

The npm package includes `src/core/schemas/specweave-config.schema.json` and its adjacent workspace and sync schemas. Point an editor's `$schema` reference at that installed file. Location-based schema references let editors resolve the adjacent files locally without fetching a schema service. The old absolute `https://verified-skill.com/schemas/specweave-config.json` identifier is no longer declared by the packaged schema; existing configurations that explicitly reference that remote URL must update their `$schema` reference to the installed file. Configuration loading itself does not fetch `$schema` URLs.
