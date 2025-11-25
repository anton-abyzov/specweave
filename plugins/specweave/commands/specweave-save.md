---
name: specweave:save
description: Save and push changes across all repositories in an umbrella setup. Detects repos with changes, sets up remotes if missing, auto-generates or accepts user commit message, and pushes to origin. Works for single repos and multi-repo umbrella setups.
---

# /specweave:save - Save Changes Across Repositories

Save and push changes across all repositories in your project. Works for both single repos and umbrella multi-repo setups.

## What This Command Does

1. **Detects repositories** - Finds all repos (umbrella childRepos or current repo)
2. **Checks for changes** - Identifies repos with uncommitted changes
3. **Sets up remotes** - Prompts for remote URL if missing
4. **Auto-generates or accepts commit message** - Smart message generation from changes
5. **Pushes to remote** - Pushes commits to origin

## Usage

```bash
# Auto-generate commit message from changes (NEW!)
/specweave:save

# With explicit commit message
/specweave:save "feat: Add menu builder feature"

# Dry run (show what would happen, don't execute)
/specweave:save --dry-run

# Save specific repos only (umbrella mode)
/specweave:save "fix: Bug fixes" --repos frontend,backend

# Skip repos without remote (don't prompt)
/specweave:save "chore: Updates" --skip-no-remote
```

## Auto-Generated Commit Messages (IMPORTANT!)

When no commit message is provided, **automatically analyze git changes and generate a conventional commit message**.

### Step-by-Step Algorithm

#### 1. Get Git Changes

```bash
# Get file status
git status --porcelain

# Get diff stats for context
git diff --stat HEAD

# Check for active increment
ls .specweave/increments/*/metadata.json 2>/dev/null | head -1
```

#### 2. Categorize Files by Type

Parse `git status --porcelain` output. Status codes:
- `??` = untracked (new)
- ` M` or `M ` = modified
- ` D` or `D ` = deleted
- `R ` = renamed
- `A ` = added (staged)

**File Category Rules:**

| Pattern | Category | Commit Type |
|---------|----------|-------------|
| `*.md`, `docs/`, `README*`, `CHANGELOG*` | docs | `docs:` |
| `src/**/*.ts` (excluding `*.test.ts`) | source | `feat:` or `refactor:` |
| `*.test.ts`, `tests/`, `__tests__/`, `*.spec.ts` | tests | `test:` |
| `package.json`, `package-lock.json`, `*.config.*`, `tsconfig*` | config | `chore:` |
| `.github/`, `.gitlab-ci*`, `Jenkinsfile`, `.circleci/` | ci | `ci:` |
| `esbuild*`, `webpack*`, `dist/`, `build/` | build | `build:` |
| `.specweave/increments/*/` | increment | use increment name |
| `*.css`, `*.scss`, `*.less` | styles | `style:` |
| `scripts/`, `bin/` | scripts | `chore:` |

#### 3. Determine Primary Type

```
Count files per category:
  docs: 5 files
  source: 2 files
  tests: 1 file

Primary = category with most files
If tie → prefer in order: feat > docs > test > chore
```

#### 4. Determine Action Verb

```
Count by status:
  new (??, A): 3 files → "add"
  modified (M): 5 files → "update"
  deleted (D): 0 files → "remove"
  renamed (R): 0 files → "rename"

Primary action = most common status
If new > modified → "add"
If deleted > others → "remove"
Else → "update"
```

#### 5. Derive Scope from Common Path

```
Files:
  docs-site/docs/guides/file1.md
  docs-site/docs/overview/file2.md
  docs-site/docs/intro.md

Common path = docs-site/docs/
Scope = "docs-site" (first significant directory)

Rules:
- If all files share a common directory → use as scope
- If files are in src/[subdir]/ → use subdir as scope
- If files are scattered → no scope (omit parentheses)
- Special scopes: cli, hooks, plugins, docs-site
```

#### 6. Check for Increment Context

```bash
# Find active increment
ACTIVE=$(cat .specweave/increments/*/metadata.json 2>/dev/null | \
  grep -l '"status": "active"' | head -1)

if [ -n "$ACTIVE" ]; then
  INCREMENT_NAME=$(dirname "$ACTIVE" | xargs basename)
  # Example: 0001-academy-restructure
fi
```

**If increment is active AND increment files are in changes:**
- Include increment reference in message
- Use increment title/name for context

#### 7. Generate Message

**Format:** `type(scope): action description`

**Generation Rules:**

```
# Pattern 1: Pure docs changes
docs(docs-site): update learning journey documentation

# Pattern 2: New feature with tests
feat(auth): add user authentication service

# Pattern 3: Increment-related work
docs: add academy section (0001-academy-restructure)

# Pattern 4: Mixed changes
chore: update config and documentation

# Pattern 5: Single file change
refactor(cli): simplify init command logic

# Pattern 6: Dependency updates
chore(deps): update package dependencies
```

**Description Templates:**

| Action | File Count | Template |
|--------|------------|----------|
| add | 1 | `add [filename without ext]` |
| add | 2-5 | `add [primary thing] and [count-1] more` |
| add | >5 | `add [category] files` |
| update | 1 | `update [filename]` |
| update | 2-5 | `update [primary thing] and related files` |
| update | >5 | `update [scope/category]` |
| remove | any | `remove [thing(s)]` |

#### 8. Present for Confirmation

```markdown
📊 **Analyzing changes...**

Detected:
  📄 5 modified documentation files
  📁 1 new increment folder (0001-academy-restructure)
  📁 1 new docs section (academy/)

🤖 **Auto-generated commit message:**

  `docs(docs-site): add academy section and update learning journey`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? **Choose action:**
  1️⃣  Use this message
  2️⃣  Edit message
  3️⃣  Enter custom message
```

### Example Auto-Generations

**Example 1: Documentation updates**
```
Input:
 M docs-site/docs/guides/specweave-learning-journey.md
 M docs-site/docs/intro.md
 M docs-site/docs/overview/features.md
?? docs-site/docs/academy/

Output: docs(docs-site): add academy section and update documentation
```

**Example 2: Feature development**
```
Input:
?? src/services/payment.ts
?? src/services/payment.test.ts
 M src/types/index.ts

Output: feat: add payment service with tests
```

**Example 3: CI/CD changes**
```
Input:
 M .github/workflows/ci.yml
 M .github/workflows/release.yml

Output: ci: update CI and release workflows
```

**Example 4: Dependency update**
```
Input:
 M package.json
 M package-lock.json

Output: chore(deps): update dependencies
```

**Example 5: Refactoring**
```
Input:
 M src/cli/commands/init.ts
 M src/cli/helpers/init/types.ts
 M src/cli/helpers/init/config-detection.ts

Output: refactor(cli): update init command structure
```

**Example 6: Mixed changes with increment**
```
Input:
 M src/components/Menu.tsx
 M docs/api.md
?? .specweave/increments/0042-menu-builder/

Active increment: 0042-menu-builder

Output: feat: implement menu builder (0042)
```

**Example 7: Test additions**
```
Input:
?? tests/integration/auth.test.ts
?? tests/integration/payment.test.ts
 M jest.config.js

Output: test: add integration tests for auth and payment
```

**Example 8: Single file**
```
Input:
 M README.md

Output: docs: update README
```

### Fallback Behavior

If analysis cannot determine a meaningful message:

```markdown
⚠️ Could not auto-generate a meaningful commit message.

Changes detected:
  - 15 files across multiple categories
  - No clear primary category

? Please enter a commit message:
> _
```

### Multi-Repo Message Generation

For umbrella setups, generate per-repo messages:

```markdown
📊 Analyzing changes across repositories...

**frontend** (4 files):
  Auto-generated: `feat(components): add menu builder UI`

**backend** (2 files):
  Auto-generated: `feat(api): add menu endpoints`

**shared** (1 file):
  Auto-generated: `chore: update shared types`

? Use same message for all, or per-repo messages?
  1️⃣  Same message (enter custom)
  2️⃣  Use auto-generated per-repo messages
  3️⃣  Edit each message
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

### Step 4: Get or Generate Commit Message

**If message was provided in command:**
```markdown
Commit message: "feat: Add menu builder with drag-drop support"
```

**If NO message provided (auto-generate):**
```markdown
📊 Analyzing changes...

Detected:
  📄 3 modified source files (src/components/)
  📄 2 new test files
  📁 1 new increment folder

🤖 Auto-generated commit message:

  feat(components): add menu builder with drag-drop support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Choose action:
  1. ✅ Use this message
  2. ✏️  Edit message
  3. 📝 Enter custom message

> 1

Using: "feat(components): add menu builder with drag-drop support"
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
| `--yes` or `-y` | Accept auto-generated message without confirmation |

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

### Auto-Generated Message (No Args)

```
User: /specweave:save

Claude:
Scanning for repositories...
Mode: Single repository
Repository: my-app (.)

Checking git status...

my-app:
  Status: 7 files changed
  Remote: origin -> github.com/user/my-app

📊 Analyzing changes...

Detected:
  📄 5 modified documentation files
  📁 1 new docs section (academy/)
  📁 1 new increment folder

🤖 Auto-generated commit message:

  docs(docs-site): add academy section and update documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Choose action:
  1. ✅ Use this message
  2. ✏️  Edit message
  3. 📝 Enter custom message

User: 1

Saving changes...

my-app:
  git add -A
  git commit -m "docs(docs-site): add academy section and update documentation"
  git push origin develop

Summary:
  ✅ Saved: 1/1 repository
  📝 Message: docs(docs-site): add academy section and update documentation
```

### Quick Auto-Save (--yes flag)

```
User: /specweave:save --yes

Claude:
Scanning for repositories...
Mode: Single repository

📊 Auto-analyzing changes...

Detected: 3 modified source files in src/cli/

🤖 Auto-generated: refactor(cli): update command handlers

Saving changes (auto-confirmed)...

my-app:
  git add -A
  git commit -m "refactor(cli): update command handlers"
  git push origin develop

✅ Done! Saved with auto-generated message.
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