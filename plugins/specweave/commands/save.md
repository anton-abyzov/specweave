---
disable-model-invocation: true
description: Smart auto-commit with remote sync (handles pull/rebase/stash, auto-generates messages, supports multi-repo). Ensures clean working tree — every file committed or gitignored.
argument-hint: "[message]"
---

# sw:save - Smart Save with Auto-Sync

## Project Overrides

**Skill Memories**: If `.specweave/skill-memories/save.md` exists, read and apply its learnings.

## Usage

```bash
sw:save           # Fully automatic - generates message, syncs, pushes
sw:save "msg"     # Your message, auto-sync
sw:save -i        # Interactive - asks before each step
sw:save --dry-run # Preview without executing
```

## Core Guarantee

**After `sw:save` completes, `git status` must be clean in every repo** — zero untracked files, zero unstaged changes. Achieved by:
- Committing all important files (source, config, docs, specs, lock files)
- Gitignoring all unimportant files (build output, deps, OS junk, secrets)
- Applying this per-repo for both umbrella and all nested repositories

## Execution Order (MANDATORY)

Steps 2–7 run **per repo** — first all nested repos (innermost first), then the umbrella/parent project last.

### 1. Scan for Nested Repos (ALWAYS FIRST)

```bash
for dir in repositories packages services apps libs workspace; do
  [ -d "$dir" ] && find "$dir" -maxdepth 4 -name ".git" -type d | while read gitdir; do
    repo="${gitdir%/.git}"
    echo "Found: $repo"
  done
done
[ -d ".git" ] && echo "Found: . (parent project)"
```

**Three-tier detection**: (1) `umbrella.childRepos` from `.specweave/config.json` if configured, (2) git-scan of nested `.git` dirs up to 4 levels deep, (3) parent project `.git`.

### 2. Pre-Flight Check

```bash
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "no-upstream")
BASE=$(git merge-base HEAD @{u} 2>/dev/null || echo "no-base")
```

Determine state: `up-to-date` | `ahead` | `behind` | `diverged` | `no-tracking`.

### 3. Smart Sync

- **behind/diverged**: Stash dirty files, `git pull --rebase`, unstash
- **no-tracking**: `git push -u origin HEAD`
- **up-to-date/ahead**: No sync needed, proceed

### 4. Smart Staging (MANDATORY — replaces `git add -A`)

**Goal**: Every file in the repo is accounted for — either staged for commit or covered by `.gitignore`. Nothing left dangling.

#### Phase 1: Stage all tracked modifications

```bash
git add -u   # Modified/deleted files already under source control — always safe
```

This handles: edited source files, updated configs, deleted files, submodule pointer changes.

#### Phase 2: Classify untracked files

```bash
git ls-files --others --exclude-standard
```

This lists files that are (a) not tracked and (b) not already covered by `.gitignore`. For each, classify using the table below. Match **top-down** — first match wins.

| Class | Patterns | Action |
|-------|----------|--------|
| **Dependencies** | `node_modules/`, `vendor/`, `bower_components/`, `.pnp.*`, `__pypackages__/`, `.venv/`, `venv/`, `env/` (Python) | `.gitignore` |
| **Build output** | `dist/`, `build/`, `.next/`, `.nuxt/`, `.output/`, `out/`, `.svelte-kit/`, `.vercel/`, `.netlify/`, `.turbo/`, `storybook-static/`, `*.tsbuildinfo` | `.gitignore` |
| **Cache** | `.cache/`, `.parcel-cache/`, `.eslintcache`, `.stylelintcache`, `tsconfig.tsbuildinfo` | `.gitignore` |
| **Coverage** | `coverage/`, `.nyc_output/`, `lcov.info` | `.gitignore` |
| **Logs** | `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`, `lerna-debug.log*` | `.gitignore` |
| **OS artifacts** | `.DS_Store`, `Thumbs.db`, `desktop.ini`, `._*`, `ehthumbs.db` | `.gitignore` |
| **Editor/IDE** | `.idea/`, `*.iml`, `*.swp`, `*.swo`, `*~`, `.project`, `.classpath`, `.settings/` | `.gitignore` |
| **Runtime** | `.wrangler/`, `.dev.vars`, `*.pid`, `*.seed`, `.env.sentry-build-plugin` | `.gitignore` |
| **Package artifacts** | `*.tgz`, `*.tar.gz` (in repo root or release dirs) | `.gitignore` |
| **Secrets** | `.env`, `.env.local`, `.env.*.local` (**NOT** `.env.example`, `.env.template`, `.env.sample`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore` | `.gitignore` + **warn user** |
| **Large binaries** | Any single file > 5 MB not inside `src/` or `assets/` | **skip** + **warn user** (don't gitignore — let user decide) |
| **Source (default)** | Everything else: source files, configs, docs, specs, tests, lock files, CI files, `.specweave/`, `.github/`, `*.md` | `git add <file>` |

**Critical**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` are **Source** — always commit.

#### Phase 3: Update .gitignore (if patterns were added)

For each pattern classified as `.gitignore` in Phase 2:

1. **Check if .gitignore exists** — if not, create it
2. **Check if pattern already present** — `grep -qxF '<pattern>' .gitignore` (exact line match) or check if a parent pattern already covers it (e.g., `node_modules/` covers `node_modules/foo/`)
3. **Append missing patterns** under a clearly marked section:

```gitignore
# Auto-managed by sw:save — do not edit this section manually
.DS_Store
node_modules/
dist/
.env
```

If the `# Auto-managed by sw:save` section already exists, append new patterns there. Otherwise create it at the end of the file.

4. **Stage .gitignore**: `git add .gitignore`

#### Phase 4: Stage remaining approved source files

```bash
git add <each file classified as Source in Phase 2>
```

Use `git add` with explicit file paths — **never** `git add -A` or `git add .`.

#### Phase 5: Verify clean state

```bash
untracked=$(git ls-files --others --exclude-standard)
if [ -n "$untracked" ]; then
  echo "WARNING: Remaining untracked files (not staged, not gitignored):"
  echo "$untracked"
fi
```

- If **zero untracked** remain → clean state achieved, proceed
- If **untracked remain** (missed by classification) → warn, but still proceed with commit. These files carry forward to next save.
- In `--interactive` mode: prompt user for each remaining untracked file (stage / gitignore / skip)

### 5. Auto-Commit Message (if none provided)

Analyze **staged files only** using `git diff --cached --name-only` and categorize:

| Pattern | Type |
|---------|------|
| `src/**/*.ts` (not test) | `feat:` / `refactor:` |
| `*.test.ts`, `tests/` | `test:` |
| `*.md`, `docs/` | `docs:` |
| `package.json`, `*.config.*` | `chore:` |
| `.github/`, CI files | `ci:` |
| `.specweave/increments/*/` | use increment name |
| `.gitignore` (only change) | `chore: update gitignore` |
| Mixed (many categories) | `chore: sync changes` or most dominant type |

**Format**: `type(scope): action description` — scope from common path, action from most common status (add/update/remove). If active increment and increment files changed, reference it.

### 6. Commit and Push

```bash
git commit -m "<message>"
git push origin <branch>
```

**No `git add` here** — all staging was completed in Step 4.

For multi-repo: Steps 2–6 run per repo. Nested repos commit/push first (innermost first), umbrella project last (so submodule pointers reflect the latest nested commits).

### 7. Report Summary

Show per repo:

```
=== Save Report ===

repo: repositories/org/my-app
  committed: 12 files (8 source, 2 config, 1 test, 1 doc)
  gitignored: 3 patterns added (.DS_Store, dist/, .env)
  warnings: .env detected — added to .gitignore
  push: origin/main ✓

repo: . (umbrella)
  committed: 4 files (3 specs, 1 submodule ref)
  gitignored: 0 patterns (already covered)
  push: origin/main ✓

All repos clean ✓
```

If `--dry-run`: show what WOULD be committed, gitignored, and warned — execute nothing.

## Conflict Handling

**Auto-resolvable**: `package-lock.json`/`yarn.lock` (delete + reinstall), `.specweave/` metadata (keep LOCAL), `dist/`/`build/` (keep REMOTE).

**Manual resolution required**: Source code, config files, env files. Present options: resolve manually, try merge instead, abort, or force push (requires typing "FORCE").

**NEVER force push by default.** `--force` flag requires explicit "FORCE" confirmation.

## No Remote Configured

Prompt user with the **exact project name** in the dialog. Options: enter URL manually, skip push (commit only), or cancel. For umbrella: check if clone job is running first.

## Flags

| Flag | Description |
|------|-------------|
| `-i` / `--interactive` | Ask confirmation before each step |
| `--dry-run` | Preview without executing |
| `--sync=rebase` | (default) Pull --rebase before push |
| `--sync=merge` | Pull --merge instead |
| `--sync=none` | Skip auto-sync |
| `--no-push` | Commit only |
| `--force` | Force push (requires "FORCE" confirmation) |
| `--branch <name>` | Create new branch instead of force pushing |
| `--repos <list>` | Only save specific repos (comma-separated) |
| `--skip-no-remote` | Skip repos without remotes |
| `--all` | Include repos outside umbrella config |
