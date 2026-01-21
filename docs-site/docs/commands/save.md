---
sidebar_position: 7
---

# /sw:save - Save Changes Across Repositories

Save and push changes across all repositories in your project. Works for both single repos and umbrella multi-repo setups.

## Overview

The `/sw:save` command simplifies git operations across multiple repositories:

- **Detects repositories** - Finds all repos (umbrella childRepos or current repo)
- **Checks for changes** - Identifies repos with uncommitted changes
- **Sets up remotes** - Prompts for remote URL if missing
- **Commits changes** - Stages all changes with user-provided message
- **Pushes to remote** - Pushes commits to origin

## Usage

```bash
# Interactive (prompts for commit message)
/sw:save

# With commit message
/sw:save "feat: Add menu builder feature"

# Dry run (show what would happen, don't execute)
/sw:save --dry-run

# Save specific repos only (umbrella mode)
/sw:save "fix: Bug fixes" --repos frontend,backend

# Skip repos without remote (don't prompt)
/sw:save "chore: Updates" --skip-no-remote
```

## Workflow Example

### Multi-Repo (Umbrella Mode)

```
/sw:save "feat: Complete user registration flow"

Scanning for repositories...
Mode: Umbrella (3 child repos)

Checking git status...

frontend:
  Status: 4 files changed
  Remote: origin -> github.com/user/frontend

backend:
  Status: 2 files changed
  Remote: origin -> github.com/user/backend

shared:
  Status: No changes (skipping)

Saving changes...

frontend:
  ✓ git add -A
  ✓ git commit -m "feat: Complete user registration flow"
  ✓ git push origin main

backend:
  ✓ git add -A
  ✓ git commit -m "feat: Complete user registration flow"
  ✓ git push origin main

Summary:
  ✓ Saved: 2/3 repositories
  ⏭️ Skipped: 1 (no changes)
```

### Single Repo Mode

```
/sw:save "chore: Update dependencies"

Scanning for repositories...
Mode: Single repository
Repository: my-project (.)

my-project:
  Status: 2 files changed
  - package.json (modified)
  - package-lock.json (modified)
  Remote: origin -> github.com/user/my-project

Saving changes...

my-project:
  ✓ git add -A
  ✓ git commit -m "chore: Update dependencies"
  ✓ git push origin main

Summary:
  ✓ Saved: 1/1 repository
```

## Remote Setup

When a repository has no remote configured, you'll be prompted:

```
frontend:
  ⚠️ No remote configured.

Options:
  1. Enter remote URL manually
  2. Use GitHub convention (github.com/[org]/frontend)
  3. Use URL from umbrella config
  4. Skip this repo

? Choice: [1/2/3/4]
```

### Using Umbrella Config

If `githubUrl` is configured in your umbrella config, remotes are set up automatically:

```json
{
  "umbrella": {
    "enabled": true,
    "childRepos": [
      {
        "id": "myapp-frontend",
        "path": "./myapp-frontend",
        "prefix": "FE",
        "githubUrl": "https://github.com/myorg/myapp-frontend"
      }
    ]
  }
}
```

**Note**: The `id` MUST match the repo name (not arbitrary abbreviations like `fe`).

## Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would happen, don't execute |
| `--repos <list>` | Only save specific repos (comma-separated) |
| `--skip-no-remote` | Skip repos without remotes (don't prompt) |
| `--all` | Include repos outside umbrella config |
| `--no-push` | Commit but don't push |
| `--force` | Force push (use with caution!) |

## Error Handling

### Push Failure (Authentication)

```
frontend:
  ❌ Pushing failed!

  Error: Permission denied (publickey)

  Troubleshooting:
  1. Check SSH key is added: ssh -T git@github.com
  2. Use HTTPS instead: git remote set-url origin https://...
  3. Check GitHub token has 'repo' scope

? Continue with other repos? [Yes / No]
```

### Push Failure (Divergent History)

```
backend:
  ❌ Pushing failed!

  Error: Updates were rejected (remote contains work not in local)

  Options:
  1. Pull and merge: git pull --rebase origin main
  2. Force push (DANGEROUS): git push --force
  3. Skip this repo

? Choice: [1/2/3]
```

## Best Practices

1. **Use descriptive commit messages** - Same message applies to all repos
2. **Review changes first** - Use `--dry-run` to see what will happen
3. **Configure githubUrl** - Set in umbrella config for seamless remote setup
4. **Handle failures** - Don't ignore push failures, resolve before continuing

## Related Commands

- [`/sw-release:align`](/docs/enterprise/release-management) - Align versions across repos (for releases)
- [`/sw:sync-progress`](/docs/commands/overview#3-monitoring) - Sync task progress to external tools
- [`/sw-github:sync`](/docs/integrations/issue-trackers) - Sync increments to GitHub issues

## See Also

- [Multi-Project Setup Guide](/docs/guides/multi-project-setup) - Full guide to umbrella multi-repo setups
- [GitHub Integration](/docs/integrations/issue-trackers) - Sync with GitHub Issues
