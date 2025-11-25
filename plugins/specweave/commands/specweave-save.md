---
name: specweave:save
description: Save and push changes across all repositories in an umbrella setup. Detects repos with changes, sets up remotes if missing, commits with user-provided message, and pushes to origin. Works for single repos and multi-repo umbrella setups.
---

# /specweave:save - Save Changes Across Repositories

Save and push changes across all repositories in your project. Works for both single repos and umbrella multi-repo setups.

## What This Command Does

1. **Detects repositories** - Finds all repos (umbrella childRepos or current repo)
2. **Checks for changes** - Identifies repos with uncommitted changes
3. **Sets up remotes** - Prompts for remote URL if missing
4. **Commits changes** - Stages all changes with user-provided message
5. **Pushes to remote** - Pushes commits to origin

## Usage

```bash
# Interactive (prompts for commit message)
/specweave:save

# With commit message
/specweave:save "feat: Add menu builder feature"

# Dry run (show what would happen, don't execute)
/specweave:save --dry-run

# Save specific repos only (umbrella mode)
/specweave:save "fix: Bug fixes" --repos frontend,backend

# Skip repos without remote (don't prompt)
/specweave:save "chore: Updates" --skip-no-remote
```

## Workflow

### Step 1: Detect Repositories

```markdown
Scanning for repositories...

Mode: Umbrella (3 child repos)

Repositories found:
  1. sw-qr-menu-fe (./sw-qr-menu-fe)
  2. sw-qr-menu-be (./sw-qr-menu-be)
  3. sw-qr-menu-shared (./sw-qr-menu-shared)
```

**For single repo:**
```markdown
Scanning for repositories...

Mode: Single repository

Repository: my-project (.)
```

### Step 2: Check Git Status

```markdown
Checking git status...

sw-qr-menu-fe:
  Status: 3 files changed
  - src/components/MenuBuilder.tsx (modified)
  - src/hooks/useMenu.ts (new)
  - package.json (modified)
  Remote: origin -> github.com/user/sw-qr-menu-fe

sw-qr-menu-be:
  Status: 5 files changed
  - src/routes/menu.ts (modified)
  - src/models/MenuItem.ts (new)
  - src/services/MenuService.ts (modified)
  - tests/menu.test.ts (new)
  - package.json (modified)
  Remote: origin -> github.com/user/sw-qr-menu-be

sw-qr-menu-shared:
  Status: No changes
  Skipping (nothing to commit)
```

### Step 3: Handle Missing Remotes

```markdown
sw-qr-menu-fe:
  No remote configured.

Options:
  1. Enter remote URL manually
  2. Use GitHub convention (github.com/[user]/sw-qr-menu-fe)
  3. Skip this repo

? Choice: [1/2/3]

> 2

Using: https://github.com/user/sw-qr-menu-fe
git remote add origin https://github.com/user/sw-qr-menu-fe
```

### Step 4: Get Commit Message

```markdown
? Enter commit message (applies to all repos):
> feat: Add menu builder with drag-drop support

Commit message: "feat: Add menu builder with drag-drop support"
```

### Step 5: Execute Save

```markdown
Saving changes...

sw-qr-menu-fe:
  Staging: git add -A
  Committing: feat: Add menu builder with drag-drop support
  Pushing: origin/main
  Done

sw-qr-menu-be:
  Staging: git add -A
  Committing: feat: Add menu builder with drag-drop support
  Pushing: origin/main
  Done

Summary:
  Saved: 2/3 repositories
  Skipped: 1 (no changes)
  Commit: feat: Add menu builder with drag-drop support
```

## Remote Setup Options

When a repository has no remote configured:

### Option 1: Manual URL

```markdown
Enter remote URL: https://github.com/myorg/my-repo.git

git remote add origin https://github.com/myorg/my-repo.git
```

### Option 2: GitHub Convention

Uses the folder name as repo name under your GitHub username/org:

```markdown
GitHub organization/user: myorg
Repo name (folder): sw-qr-menu-fe

Remote: https://github.com/myorg/sw-qr-menu-fe
git remote add origin https://github.com/myorg/sw-qr-menu-fe
```

### Option 3: From Umbrella Config

If `githubUrl` is configured in umbrella config:

```json
{
  "umbrella": {
    "childRepos": [
      {
        "id": "sw-qr-menu-fe",
        "path": "./sw-qr-menu-fe",
        "githubUrl": "https://github.com/myorg/sw-qr-menu-fe"
      }
    ]
  }
}
```

```markdown
Using URL from umbrella config:
git remote add origin https://github.com/myorg/sw-qr-menu-fe
```

### Option 4: Skip

```markdown
Skipping sw-qr-menu-fe (no remote, user chose to skip)
```

## Error Handling

### Push Failure (Authentication)

```markdown
sw-qr-menu-fe:
  Pushing failed!

  Error: Permission denied (publickey)

  Troubleshooting:
  1. Check SSH key is added: ssh -T git@github.com
  2. Use HTTPS instead: git remote set-url origin https://...
  3. Check GitHub token has 'repo' scope

? Continue with other repos? [Yes / No]
```

### Push Failure (Divergent History)

```markdown
sw-qr-menu-be:
  Pushing failed!

  Error: Updates were rejected (remote contains work not in local)

  Options:
  1. Pull and merge: git pull --rebase origin main
  2. Force push (DANGEROUS): git push --force
  3. Skip this repo

? Choice: [1/2/3]
```

### Branch Not Tracking

```markdown
sw-qr-menu-shared:
  Current branch 'feature-x' has no upstream.

  Options:
  1. Push with tracking: git push -u origin feature-x
  2. Push to main: git push origin HEAD:main
  3. Skip this repo

? Choice: [1/2/3]
```

## Integration with Umbrella Config

This command reads from `.specweave/config.json`:

```json
{
  "umbrella": {
    "enabled": true,
    "childRepos": [
      {
        "id": "sw-qr-menu-fe",
        "path": "./sw-qr-menu-fe",
        "prefix": "FE",
        "githubUrl": "https://github.com/myorg/sw-qr-menu-fe"
      },
      {
        "id": "sw-qr-menu-be",
        "path": "./sw-qr-menu-be",
        "prefix": "BE",
        "githubUrl": "https://github.com/myorg/sw-qr-menu-be"
      }
    ]
  }
}
```

### ID Strategy

**IMPORTANT**: The `id` field MUST match your canonical source name:

| Scenario | ID Source | Example |
|----------|-----------|---------|
| 1:1 Repo Mapping | Exact repo name | `sw-qr-menu-fe` |
| JIRA Project | Project key (lowercase) | `WEBAPP` → `webapp` |
| ADO Project | Project name (kebab-case) | `Frontend Team` → `frontend-team` |

```
✅ CORRECT: id: "sw-qr-menu-fe" (matches repo name)
❌ WRONG:   id: "fe" (arbitrary abbreviation)
```

**Benefits:**
- Auto-discovers all child repos
- Uses `githubUrl` for remote setup
- Skips repos not in config (optional: `--all` to include)

## Single Repo Mode

Without umbrella config, operates on current repository:

```markdown
/specweave:save "chore: Update dependencies"

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
  Staging: git add -A
  Committing: chore: Update dependencies
  Pushing: origin/main
  Done

Summary:
  Saved: 1/1 repository
```

## Flags and Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would happen, don't execute |
| `--repos <list>` | Only save specific repos (comma-separated) |
| `--skip-no-remote` | Skip repos without remotes (don't prompt) |
| `--all` | Include repos outside umbrella config |
| `--no-push` | Commit but don't push |
| `--force` | Force push (use with caution!) |

## Best Practices

1. **Use descriptive commit messages** - Same message applies to all repos
2. **Review changes first** - Use `--dry-run` to see what will happen
3. **Configure githubUrl** - Set in umbrella config for seamless remote setup
4. **Handle failures** - Don't ignore push failures, resolve before continuing

## Example Interactions

### Quick Save

```
User: /specweave:save "feat: Complete user registration flow"

Claude:
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
  git add -A
  git commit -m "feat: Complete user registration flow"
  git push origin main

backend:
  git add -A
  git commit -m "feat: Complete user registration flow"
  git push origin main

Summary:
  Saved: 2/3 repositories
  Skipped: 1 (no changes)
```

### First-Time Remote Setup

```
User: /specweave:save "Initial commit"

Claude:
Scanning for repositories...
Mode: Umbrella (2 child repos)

frontend:
  Status: 15 files changed
  Remote: Not configured

? No remote configured for frontend. Choose:
  1. Enter URL manually
  2. Use GitHub convention
  3. Skip this repo

User: 2

? GitHub organization/user: myorg

Claude:
Adding remote: git remote add origin https://github.com/myorg/frontend

backend:
  Status: 10 files changed
  Remote: Not configured (using from umbrella config)
  Adding remote: git remote add origin https://github.com/myorg/backend

Saving changes...
[continues with commit and push]
```

### Dry Run Preview

```
User: /specweave:save --dry-run

Claude:
DRY RUN MODE - No changes will be made

Scanning for repositories...
Mode: Umbrella (3 child repos)

Would process:

frontend:
  Status: 3 files changed
  Would: git add -A
  Would: git commit -m "[message]"
  Would: git push origin main

backend:
  Status: 1 file changed
  Would: git add -A
  Would: git commit -m "[message]"
  Would: git push origin main

shared:
  Status: No changes
  Would: Skip (nothing to commit)

? Enter commit message to see full preview: feat: Update API

Preview complete. Run without --dry-run to execute.
```

## Related Commands

- `/specweave-release:align` - Align versions across repos (for releases)
- `/specweave:sync-progress` - Sync task progress to external tools
- `/specweave-github:sync` - Sync increments to GitHub issues

## Dependencies

**Required:**
- Git installed and configured
- SSH key or HTTPS credentials for push

**Optional:**
- Umbrella config (for multi-repo mode)
- GitHub CLI (`gh`) for repo creation

---

**Use this command** to save and push changes across all your repositories with a single command, handling remote setup automatically.