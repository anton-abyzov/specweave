---
name: save
description: SMART save - auto-generates commit messages, handles git pull/merge/rebase automatically, resolves divergent branches, stashes dirty work. Works for single repos and umbrella multi-repo setups. Run with no args for fully automatic save.
---

# /sw:save - Smart Save with Auto-Sync

**SMART SAVE** - Handles everything automatically: commit message generation, remote sync (pull/rebase), branch setup, and push. Just run `/sw:save` and it figures out what to do!

## ⚠️ MANDATORY: Nested Repository Scanning (SpecWeave-Specific)

**THIS IS NOT OPTIONAL.** Before ANY git operations, you MUST scan for nested repositories:

### Step 1: ALWAYS Scan for Nested Repos First

```bash
# MANDATORY: Execute this BEFORE anything else
echo "🔍 Scanning for nested repositories..."

# Priority folders for SpecWeave projects
NESTED_REPOS=()
for dir in repositories packages services apps libs; do
  if [ -d "$dir" ]; then
    for repo in "$dir"/*/; do
      if [ -d "${repo}.git" ]; then
        NESTED_REPOS+=("${repo%/}")
        echo "  📁 Found: ${repo%/}"
      fi
    done
  fi
done

# Also include parent project if it has .git
if [ -d ".git" ]; then
  echo "  📁 Found: . (parent project)"
fi
```

### Step 2: Report What Was Found

```markdown
📡 **Repository Scan Results:**

| Repository | Path | Status |
|------------|------|--------|
| parent-project | . | ✅ Has changes |
| frontend | repositories/frontend | ✅ Has changes |
| backend | repositories/backend | ⏭️ No changes |
| shared-lib | repositories/shared-lib | ✅ Has changes |

**Total:** 4 repos found, 3 with changes
```

### Why This Matters

SpecWeave projects often use the `repositories/` folder for multi-repo setups. **NEVER** assume single-repo mode without explicitly checking for nested repos first.

**Common SpecWeave project structure:**
```
my-project/
├── .specweave/           # SpecWeave config
├── repositories/         # ← ALWAYS check this folder!
│   ├── frontend/.git     # Nested repo
│   ├── backend/.git      # Nested repo
│   └── shared/.git       # Nested repo
└── .git                  # Parent repo
```

---

## TL;DR - Just Works!

```bash
/sw:save           # FULLY AUTOMATIC - generates message, syncs, pushes (NO prompts!)
/sw:save "msg"     # Your message, auto-sync
/sw:save -i        # Interactive - asks before each step
```

**What it handles automatically:**
- ✅ All files included (`git add -A`) - trust your `.gitignore`
- ✅ No commit message? → Generates from changes
- ✅ Remote has new commits? → Auto-pulls (rebase by default)
- ✅ Uncommitted changes during pull? → Auto-stash/unstash
- ✅ Branch not tracking? → Auto-setup with `-u`
- ✅ Multi-repo umbrella? → Syncs all repos
- ⚠️ Warns (but doesn't block) if secrets/huge files detected
- ⛔ **NEVER force pushes** - Always merges with remote safely

## What This Command Does (In Order)

### ⚠️ EXECUTION ORDER IS MANDATORY

1. **🔍 SCAN FOR NESTED REPOS (ALWAYS FIRST!)**
   - Check `repositories/`, `packages/`, `services/`, `apps/`, `libs/`
   - Find ALL `.git` directories up to 4 levels deep
   - Include parent project if it has `.git`
   - **NEVER skip this step even for "simple" projects!**

2. **📊 Report discovered repos** - Show table of all repos found with their status

3. **🔍 Pre-flight check** - Check remote status for EACH repo BEFORE anything else

4. **🔄 Smart sync** - Auto-pull/rebase if behind remote (with stash if needed)

5. **📝 Auto-commit message** - Generate from changes if not provided

6. **🚀 Push** - Push to remote with auto-retry on recoverable errors

7. **✅ Report** - Show summary of what was done across ALL repos

### Repository Detection (MANDATORY Auto-Discovery)

**⚠️ THIS IS NOT OPTIONAL. ALWAYS RUN THESE CHECKS:**

The `/sw:save` command uses a **three-tier detection strategy**:

1. **Umbrella Config (priority)** - If `umbrella.childRepos` is configured in `.specweave/config.json`, uses that list
2. **🔴 Git-Scan (ALWAYS RUN THIS!)** - Scan for nested `.git` directories (up to 4 levels deep)
   - **MUST check**: `repositories/`, `packages/`, `services/`, `apps/`, `libs/`
   - Works for microservices architectures without explicit configuration
   - **NEVER assume no nested repos without scanning first!**
3. **Parent Project** - Always includes the root project if it has `.git`

### 🔴 MANDATORY: Execute These Commands FIRST

```bash
# Step 0: ALWAYS run this before ANY git operations!
echo "🔍 Scanning for repositories..."

# Check for nested repos in standard SpecWeave folders
for folder in repositories packages services apps libs; do
  if [ -d "$folder" ]; then
    echo "  Checking $folder/..."
    for repo in "$folder"/*/; do
      if [ -d "${repo}.git" ]; then
        echo "  ✅ Found repo: ${repo%/}"
      fi
    done
  fi
done

# Check parent project
if [ -d ".git" ]; then
  echo "  ✅ Found repo: . (parent project)"
fi
```

#### Git-Scan Algorithm (CRITICAL for Microservices)

**MANDATORY: When no umbrella config exists, ALWAYS scan for nested repos:**

```bash
# Step 1: Find all nested .git directories (excluding .git itself and node_modules)
find . -maxdepth 4 -type d -name ".git" \
  -not -path "./.git" \
  -not -path "*/node_modules/*" \
  -not -path "*/.specweave/*" \
  2>/dev/null

# Step 2: For each .git found, the parent directory is a repo
# Example output:
#   ./repositories/frontend/.git    → repositories/frontend is a repo
#   ./repositories/backend/.git     → repositories/backend is a repo
#   ./packages/shared/.git          → packages/shared is a repo
```

**Priority scan paths** (check these first for performance):
1. `repositories/*/`  - Standard SpecWeave multi-repo layout
2. `packages/*/`      - Monorepo packages
3. `services/*/`      - Microservices
4. `apps/*/`          - App directories
5. `libs/*/`          - Library directories

**Full discovery example:**

```bash
# Discovery script that /sw:save internally executes
REPOS=()

# 1. Check umbrella config first
if [ -f ".specweave/config.json" ]; then
  UMBRELLA_REPOS=$(jq -r '.umbrella.childRepos[]?.path // empty' .specweave/config.json 2>/dev/null)
  if [ -n "$UMBRELLA_REPOS" ]; then
    while IFS= read -r repo; do
      [ -d "$repo/.git" ] && REPOS+=("$repo")
    done <<< "$UMBRELLA_REPOS"
  fi
fi

# 2. If no umbrella config OR it's empty, scan for nested repos
if [ ${#REPOS[@]} -eq 0 ]; then
  # Scan priority paths first
  for dir in repositories packages services apps libs; do
    if [ -d "$dir" ]; then
      for repo in "$dir"/*/; do
        [ -d "${repo}.git" ] && REPOS+=("${repo%/}")
      done
    fi
  done

  # Full recursive scan if nothing found in priority paths
  if [ ${#REPOS[@]} -eq 0 ]; then
    while IFS= read -r git_dir; do
      REPOS+=("$(dirname "$git_dir")")
    done < <(find . -maxdepth 4 -type d -name ".git" -not -path "./.git" -not -path "*/node_modules/*" 2>/dev/null)
  fi
fi

# 3. Always include parent project if it has .git
[ -d ".git" ] && REPOS+=(".")

# Result: REPOS array contains all repositories to process
echo "Discovered repos: ${REPOS[*]}"
```

**Example: Microservices without config**

```
my-project/                    # ← Parent repo (included via tier 3)
├── repositories/
│   ├── frontend/              # ← Auto-discovered via tier 2
│   │   └── .git
│   ├── backend/               # ← Auto-discovered via tier 2
│   │   └── .git
│   └── shared-lib/            # ← Auto-discovered via tier 2
│       └── .git
└── .specweave/
```

Running `/sw:save` will detect and commit+push to **all 4 repositories** automatically!

**Microservices in `services/` folder:**
```
my-platform/
├── services/
│   ├── auth-service/          # ← Auto-discovered
│   │   └── .git
│   ├── payment-service/       # ← Auto-discovered
│   │   └── .git
│   └── notification-service/  # ← Auto-discovered
│       └── .git
└── .specweave/
```

**Monorepo with `packages/`:**
```
my-monorepo/
├── packages/
│   ├── frontend/              # ← Auto-discovered
│   │   └── .git
│   ├── backend/               # ← Auto-discovered
│   │   └── .git
│   └── shared/                # ← Auto-discovered
│       └── .git
└── .git                       # ← Parent repo also included
```

## Usage

```bash
# FULLY AUTOMATIC - zero prompts! (DEFAULT)
/sw:save

# With your own commit message
/sw:save "feat: Add menu builder"

# Interactive mode - asks before each action
/sw:save -i
/sw:save --interactive

# Dry run - preview without executing
/sw:save --dry-run

# Force push (careful! requires "FORCE" confirmation)
/sw:save --force
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

#### 8. Execute (Default) or Confirm (Interactive Mode)

**DEFAULT BEHAVIOR (no `-i` flag):** Just use the generated message and proceed:

```markdown
📊 Analyzing changes...

🤖 Auto-generated: `docs(docs-site): add academy section and update learning journey`

✅ Committing and pushing...
```

**INTERACTIVE MODE (`-i` flag):** Ask for confirmation:

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

## SMART SYNC ALGORITHM (The Magic!)

### Pre-Flight Check - BEFORE Any Commit

**ALWAYS check remote status first.** Don't wait for push to fail!

```bash
# Step 1: Fetch without merge (safe, just gets info)
git fetch origin

# Step 2: Check relationship between local and remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "no-upstream")
BASE=$(git merge-base HEAD @{u} 2>/dev/null || echo "no-base")

# Step 3: Determine sync state
if [ "$REMOTE" = "no-upstream" ]; then
  STATE="no-tracking"
elif [ "$LOCAL" = "$REMOTE" ]; then
  STATE="up-to-date"
elif [ "$LOCAL" = "$BASE" ]; then
  STATE="behind"           # Remote has commits we don't have
elif [ "$REMOTE" = "$BASE" ]; then
  STATE="ahead"            # We have commits remote doesn't have
else
  STATE="diverged"         # Both have unique commits
fi
```

### Smart Sync Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRE-FLIGHT CHECK                            │
├─────────────────────────────────────────────────────────────────┤
│  git fetch origin (safe - just gets metadata)                   │
│  Compare LOCAL vs REMOTE vs BASE                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ UP-TO-   │    │ AHEAD    │    │ BEHIND   │
    │ DATE     │    │ (local   │    │ (remote  │
    │          │    │ has new) │    │ has new) │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
    Just commit     Just commit     ┌────┴────┐
    and push        and push        │ STASH   │
                                    │ PULL    │
                                    │ UNSTASH │
                                    └────┬────┘
                                         │
                                    Then commit
                                    and push

           ┌───────────────┴───────────────┐
           ▼                               ▼
    ┌──────────────┐                ┌──────────────┐
    │ DIVERGED     │                │ NO TRACKING  │
    │ (both have   │                │ (new branch) │
    │ unique)      │                │              │
    └──────┬───────┘                └──────┬───────┘
           │                               │
    ┌──────┴──────┐                   Auto setup:
    │   STASH     │                   git push -u
    │   PULL      │                   origin HEAD
    │   --rebase  │
    │   UNSTASH   │
    └──────┬──────┘
           │
      Then commit
      and push
```

### Stash Handling (Auto-Magic!)

**Problem**: Can't pull/rebase with uncommitted changes.
**Solution**: Auto-stash, sync, unstash.

```bash
# Check if working tree is dirty
DIRTY=$(git status --porcelain)

if [ -n "$DIRTY" ] && [ "$STATE" != "up-to-date" ] && [ "$STATE" != "ahead" ]; then
  echo "📦 Stashing uncommitted changes..."
  git stash push -m "specweave-save-autostash"
  STASHED=true
fi

# Do the sync (pull/rebase)
git pull --rebase origin $(git branch --show-current)

# Restore stash if we stashed
if [ "$STASHED" = true ]; then
  echo "📦 Restoring stashed changes..."
  git stash pop
fi
```

### Conflict Handling

**If rebase/merge has conflicts:**

```markdown
⚠️  **Merge conflict detected!**

Conflicting files:
  - src/services/auth.ts
  - package.json

Options:
  1. 🔧 Resolve conflicts manually (I'll wait)
  2. ⏮️  Abort rebase, keep local state
  3. 🔀 Try merge instead of rebase

? Choose:
```

**Smart Auto-Resolution** (no user input needed for these):

| File Type | Resolution | Reason |
|-----------|------------|--------|
| `package-lock.json` | Delete, run `npm install` | Auto-regenerates correctly |
| `yarn.lock` | Delete, run `yarn` | Auto-regenerates correctly |
| `.specweave/increments/*/metadata.json` | Keep LOCAL | Your work takes precedence |
| `.specweave/increments/*/tasks.md` | Keep LOCAL | Your progress |
| `*.md` in `.specweave/` | Keep LOCAL | Your documentation |
| `dist/`, `build/`, `node_modules/` | Keep REMOTE | Will rebuild anyway |

**Files that ALWAYS need manual resolution:**
- Source code (`*.ts`, `*.js`, `*.tsx`)
- Configuration (`*.config.*`, `tsconfig.json`)
- Environment (`.env*`)

### Smart File Importance Detection

When conflicts occur, automatically categorize:

```markdown
🔍 Analyzing conflict importance...

MUST INCLUDE (your work):
  ✓ src/services/auth.ts (modified by you)
  ✓ tests/auth.test.ts (new file)
  ✓ .specweave/increments/0042/ (your increment)

CAN AUTO-RESOLVE:
  ✓ package-lock.json → npm install
  ✓ dist/bundle.js → rebuild

NEEDS DECISION:
  ⚠️ package.json (both modified version)
     LOCAL:  "version": "1.2.0"
     REMOTE: "version": "1.1.5"
     → Keep LOCAL (your version bump)? [Y/n]
```

### NEVER Force Push (Safety First!)

**Force push is DISABLED by default.** Even with `--force` flag:

```markdown
User: /sw:save --force

Claude:
⚠️  Force push requested!

This will OVERWRITE remote history. Are you SURE?
  - Remote has 3 commits that will be LOST
  - Other team members may lose work

? Type "FORCE" to confirm (or anything else to cancel):
```

**The `--force` flag requires explicit confirmation** because:
- It destroys remote history
- Team members lose commits
- Usually indicates a workflow problem

**Better alternatives:**
- Let auto-sync handle it (rebase/merge)
- Create a new branch: `/sw:save --branch fix-conflict`
- Ask team to pull before you push

### Full Smart Workflow

```markdown
/sw:save

📡 Scanning repositories...
   Mode: Single repo (my-project)

🔍 Pre-flight check...
   Remote: origin/develop
   Local:  3 commits ahead, 2 commits behind
   State:  DIVERGED

📦 Stashing uncommitted changes... (5 files)
   Created: stash@{0} "specweave-save-autostash"

🔄 Syncing with remote...
   git pull --rebase origin develop
   ✓ Rebased 3 commits onto latest remote

📦 Restoring stashed changes...
   ✓ Applied stash@{0}

📊 Analyzing changes...
   Detected: 5 modified files in src/
   Active increment: 0042-menu-builder

🤖 Auto-generated message:
   feat(menu): implement drag-drop menu builder

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Action: [1] Use message  [2] Edit  [3] Custom
> 1

💾 Committing...
   git add -A
   git commit -m "feat(menu): implement drag-drop menu builder"

🚀 Pushing...
   git push origin develop
   ✓ Pushed to origin/develop

✅ DONE!
   Synced:    2 commits from remote
   Committed: 1 new commit
   Pushed:    4 commits total
```

### Workflow

### Step 1: Detect Repositories

```markdown
📡 Scanning for repositories...

Mode: Umbrella (3 child repos)

Repositories:
  1. sw-qr-menu-fe (./sw-qr-menu-fe)
  2. sw-qr-menu-be (./sw-qr-menu-be)
  3. sw-qr-menu-shared (./sw-qr-menu-shared)
```

### Step 2: Pre-Flight Check (NEW!)

```markdown
🔍 Pre-flight check...

sw-qr-menu-fe:
  Branch: develop
  Remote: origin/develop
  State:  ✓ UP-TO-DATE

sw-qr-menu-be:
  Branch: develop
  Remote: origin/develop
  State:  ⚠️ BEHIND (2 commits)
  Action: Will pull --rebase before push

sw-qr-menu-shared:
  Branch: develop
  Remote: origin/develop
  State:  ✓ AHEAD (1 commit, ready to push)
```

### Step 3: Smart Sync (Auto-Pull/Rebase)

```markdown
🔄 Syncing repositories...

sw-qr-menu-be:
  📦 Stashing 3 uncommitted files...
  🔄 git pull --rebase origin develop
     Applied: 2 commits from remote
  📦 Restoring stashed files...
  ✓ Synced!

sw-qr-menu-fe:
  ✓ Already up-to-date

sw-qr-menu-shared:
  ✓ Already ahead, ready to push
```

### Step 4: Generate/Confirm Message

```markdown
📊 Analyzing changes across repos...

sw-qr-menu-fe (4 files):
  🤖 Auto: feat(components): add menu builder UI

sw-qr-menu-be (2 files):
  🤖 Auto: feat(api): add menu endpoints

sw-qr-menu-shared (0 files):
  ⏭️  Skip (no changes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Use per-repo messages or same for all?
  [1] Per-repo (auto-generated)
  [2] Same message (enter custom)
  [3] Edit each

> 1
```

### Step 5: Commit & Push

```markdown
💾 Saving changes...

sw-qr-menu-fe:
  git add -A
  git commit -m "feat(components): add menu builder UI"
  git push origin develop
  ✓ Done!

sw-qr-menu-be:
  git add -A
  git commit -m "feat(api): add menu endpoints"
  git push origin develop
  ✓ Done!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ SUMMARY

  Synced:    1 repo (pulled 2 commits)
  Saved:     2/3 repos
  Skipped:   1 (no changes)

  Commits:
    sw-qr-menu-fe: feat(components): add menu builder UI
    sw-qr-menu-be: feat(api): add menu endpoints
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
  ❌ Push failed: Permission denied (publickey)

  Quick fixes:
  1. Test SSH: ssh -T git@github.com
  2. Switch to HTTPS: git remote set-url origin https://github.com/...
  3. Check token scope (needs 'repo')

? [R]etry / [S]kip repo / [A]bort all
```

### Divergent History (NOW HANDLED AUTOMATICALLY!)

**Old behavior**: Wait for push to fail, then ask.
**New behavior**: Detect BEFORE push, auto-sync!

```markdown
🔍 Pre-flight detected: DIVERGED (3 ahead, 2 behind)

🔄 Auto-syncing...
   git stash push -m "autostash"
   git pull --rebase origin develop
   git stash pop
   ✓ Synced!

Now ready to commit and push.
```

**If auto-sync fails** (rare, only on complex conflicts):

```markdown
⚠️  Rebase conflict in: src/services/auth.ts

Options:
  1. 🔧 Open editor to resolve (I'll wait)
  2. 🔀 Try merge instead of rebase
  3. ⏮️  Abort and keep local state (no push)
  4. 💪 Force push (overwrites remote - DANGEROUS)

? Choice:
```

### Branch Not Tracking (NOW AUTO-SETUP!)

**Old behavior**: Ask user what to do.
**New behavior**: Auto-setup tracking!

```markdown
🔍 Pre-flight: Branch 'feature-x' has no upstream

🔧 Auto-fixing...
   git push -u origin feature-x
   ✓ Branch now tracks origin/feature-x
```

### Stash Conflicts (Rare)

```markdown
⚠️  Stash pop conflict!

Your stashed changes conflict with pulled changes.
Conflicting files:
  - package.json

Options:
  1. 🔧 Resolve manually (stash is in stash@{0})
  2. 🗑️  Drop stash, keep pulled version
  3. ⏮️  Restore original state (abort everything)

? Choice:
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
  Staging: git add -A
  Committing: chore: Update dependencies
  Pushing: origin/main
  Done

Summary:
  Saved: 1/1 repository
```

### No Remote Configured (Single Repo or Parent Project)

If operating in single-repo mode and no git remote is configured, prompt the user with the **EXACT project name** in the question:

```markdown
⚠️  No remote repository configured for 'sw-content-repurposer' (parent project).

How would you like to proceed?
  1. 📝 Enter URL manually - I'll provide the GitHub/GitLab URL for this repository
  2. ⏭️  Skip push (commit only) - Just commit locally, I'll set up remote later
  3. ❌ Cancel - Don't commit or push anything right now
```

**IMPORTANT**: Always include the project/repository name in the dialog so the user knows WHICH repository is missing the remote. For umbrella setups, this helps distinguish between:
- Parent project (the umbrella root directory)
- Child repositories (cloned into `repositories/` folder)

**Check for pending clone jobs**: If `umbrella.childRepos` is empty but a clone job is running (check `/sw:jobs`), inform the user:

```markdown
ℹ️  Repository cloning is in progress (job: a84e4fe5).

The child repositories are being cloned in the background. Options:
  1. ⏳ Wait for cloning to complete (run `/sw:jobs` to check status)
  2. 💾 Save parent project only (commit .specweave/ changes)
  3. ❌ Cancel and retry later
```

## Flags and Options

| Flag | Description |
|------|-------------|
| `--interactive` / `-i` | **Interactive mode** - Ask for confirmation before each step |
| `--dry-run` | Preview mode - show what would happen |
| `--sync=rebase` | (default) Pull --rebase before push |
| `--sync=merge` | Pull --merge instead of rebase |
| `--sync=none` | Skip auto-sync (old behavior) |
| `--no-stash` | Don't auto-stash (fail if dirty + needs sync) |
| `--repos <list>` | Only save specific repos (comma-separated) |
| `--skip-no-remote` | Skip repos without remotes (don't prompt) |
| `--all` | Include repos outside umbrella config |
| `--no-push` | Commit but don't push |
| `--force` | Force push (REQUIRES typing "FORCE" to confirm!) |
| `--branch <name>` | Create new branch instead of force pushing |

### Quick Reference

```bash
# Most common - fully automatic (DEFAULT!)
/sw:save

# Preview what will happen
/sw:save --dry-run

# Custom message, automatic sync
/sw:save "feat: new feature"

# Interactive - asks before each step
/sw:save -i

# Merge instead of rebase
/sw:save --sync=merge

# Create branch if conflicts (safest!)
/sw:save --branch my-changes

# Old behavior (fail if behind)
/sw:save --sync=none
```

### Conflict Resolution Strategy

**Default priority: YOUR WORK WINS**

When merging with remote, the command follows this priority:
1. **Your code changes** - Always preserved
2. **Your increment files** - Always preserved
3. **Lock files** - Regenerated (npm/yarn)
4. **Build artifacts** - Use remote (will rebuild)
5. **Config conflicts** - Ask user

This ensures you never lose work while still syncing with team.

## Best Practices

1. **Just run `/sw:save`** - Zero prompts, fully automatic! Let it figure things out
2. **Use `-i` for control** - Interactive mode when you want to review/edit the message
3. **Preview with `--dry-run`** - See what will happen before committing
4. **Configure `githubUrl` in umbrella config** - Enables auto-remote setup
5. **Trust the auto-message** - It analyzes changes intelligently

## Example Interactions

### Zero-Args Fully Automatic (The Power Move!)

```
User: /sw:save

Claude:
📡 Scanning... Single repo (specweave)

🔍 Pre-flight check...
   Branch: develop → origin/develop
   State:  DIVERGED (2 ahead, 3 behind)

📦 Stashing 5 uncommitted files...
🔄 Syncing: git pull --rebase origin develop
   ✓ Rebased 2 commits onto 3 new remote commits
📦 Restoring stashed files...

📊 Analyzing changes...
   🤖 Auto: feat(save): add smart sync with auto-pull

💾 Saving...
   git add -A
   git commit -m "feat(save): add smart sync with auto-pull"
   git push origin develop

✅ DONE! (synced 3 + pushed 3 commits)
```

**That's it!** One command, zero prompts, handles everything.

### With Commit Message (Still Smart!)

```
User: /sw:save "feat: Complete user registration"

Claude:
📡 Scanning... Umbrella (3 repos)

🔍 Pre-flight check...
   frontend:  ✓ UP-TO-DATE
   backend:   ⚠️ BEHIND (2 commits)
   shared:    ✓ No changes

🔄 Syncing backend...
   git pull --rebase origin develop
   ✓ Applied 2 remote commits

💾 Saving...

frontend:
  git add -A && commit && push ✓

backend:
  git add -A && commit && push ✓

✅ Saved 2/3 repos with: feat: Complete user registration
```

### Interactive Mode (With `-i` flag)

```
User: /sw:save -i

Claude:
📡 Scanning... Single repo

🔍 Pre-flight: ✓ UP-TO-DATE (no sync needed)

📊 Analyzing changes...
   5 modified docs, 1 new folder

🤖 Auto-generated:
   docs(docs-site): add academy section

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? [1] Use  [2] Edit  [3] Custom

User: 1

💾 Committing & pushing...
✅ Done!
```

### Handling Merge Conflicts (Rare but Covered!)

```
User: /sw:save

Claude:
📡 Scanning... Single repo

🔍 Pre-flight: DIVERGED

📦 Stashing...
🔄 Syncing: git pull --rebase
   ⚠️ CONFLICT in src/config.ts

Conflict preview:
   <<<<<<< HEAD
   maxRetries: 5
   =======
   maxRetries: 3
   >>>>>>> upstream

? Options:
  [1] 🔧 Resolve manually (I'll wait)
  [2] 🔀 Try merge instead
  [3] ⏮️ Abort (keep local)
  [4] 💪 Force push (DANGEROUS)

User: 1

Waiting for conflict resolution...
Run: git rebase --continue
Then say: continue

User: continue

🔄 Continuing...
📦 Restoring stash...
💾 Saving...
✅ Done!
```

### First-Time Remote Setup

```
User: /sw:save "Initial commit"

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
User: /sw:save --dry-run

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

- `/sw-release:align` - Align versions across repos (for releases)
- `/sw:sync-progress` - Sync task progress to external tools
- `/sw-github:sync` - Sync increments to GitHub issues

## Dependencies

**Required:**
- Git installed and configured
- SSH key or HTTPS credentials for push

**Optional:**
- Umbrella config (for multi-repo mode)
- GitHub CLI (`gh`) for repo creation

---

**Use this command** to save and push changes across all your repositories with a single command, handling remote setup automatically.