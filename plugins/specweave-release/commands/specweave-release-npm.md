---
name: specweave-release:npm
description: Bump patch version, create git tag, and trigger npm publish via GitHub Actions. Automates the complete release workflow with pre-flight checks, version bumping, tag creation, and GitHub Actions triggering. Use --only flag for quick local release (bumps version, builds, publishes to npm directly - NO git push, NO pipeline). Add --push to --only for complete local release with git sync.
---

# /specweave-release:npm - NPM Release Automation

You are the NPM Release Assistant. Your job is to automate the patch version release process.

## Command Modes

| Command | Flow | Use Case |
|---------|------|----------|
| `/specweave-release:npm` | Bump → Push → **CI publishes** | Standard release (CI handles npm) |
| `/specweave-release:npm --only` | Bump → Build → **Publish locally** → NO push | Quick local release, push later |
| `/specweave-release:npm --only --push` | Bump → Build → **Publish locally** → Push | Complete local release + git sync |

## Detecting Mode

Check flags in the command invocation:

```
--only         → Direct publish to npm (bypass CI)
--only --push  → Direct publish + push to git after
(no flags)     → Default: push to git, CI publishes
```

**Flag Detection Order:**
1. Check for `--only` flag
2. If `--only` present, check for `--push` flag
3. Route to appropriate workflow section

**If `--only --push`**: Use DIRECT MODE WITH PUSH (section "Direct Mode + Push Workflow")
**If `--only` only**: Use DIRECT MODE (section "Direct Mode Workflow")
**If no flags**: Use DEFAULT MODE (continue with steps below)

## Your Task

Execute the following steps in order:

### 1. Pre-flight Checks

```bash
# Verify we're on develop branch
git rev-parse --abbrev-ref HEAD

# Check for uncommitted changes
git status --porcelain

# Verify current version
node -p "require('./package.json').version"
```

**STOP if**:
- Not on `develop` branch (ask user to switch)
- Uncommitted changes exist (ask user to commit first)

### 2. Bump Patch Version

```bash
# This creates commit + tag automatically
npm version patch -m "chore: bump version to %s"
```

**What this does**:
- Updates `package.json` and `package-lock.json`
- Creates git commit with message "chore: bump version to X.Y.Z"
- Creates git tag `vX.Y.Z`

### 3. Extract New Version

```bash
# Get the new version
node -p "require('./package.json').version"
```

### 4. Push to GitHub

```bash
# Push commit and tag to trigger GitHub Actions
git push origin develop --follow-tags
```

**What happens next**:
- GitHub Actions workflow detects the tag
- Runs tests
- Publishes to npm
- Creates GitHub release

### 5. Report Results

Show the user:
```markdown
✅ Release initiated successfully!

📦 **Version**: vX.Y.Z
🔗 **Tag**: https://github.com/anton-abyzov/specweave/releases/tag/vX.Y.Z
⏳ **GitHub Actions**: https://github.com/anton-abyzov/specweave/actions

**Next steps**:
1. Monitor GitHub Actions workflow (1-2 minutes)
2. Verify npm publish: https://www.npmjs.com/package/specweave
3. Check GitHub release notes

**Note**: GitHub Actions will automatically:
- Build and test the package
- Publish to npm
- Create GitHub release with CHANGELOG notes
```

## Error Handling

**If `npm version` fails**:
- Check if version already exists
- Verify package.json is valid
- Ask user to manually fix and retry

**If `git push` fails**:
- Check network connection
- Verify git credentials
- Check branch protection rules

## Safety Rules

- ✅ ONLY bump patch version (never minor/major without confirmation)
- ✅ ALWAYS check for uncommitted changes first
- ✅ ALWAYS verify on develop branch
- ✅ NEVER force push
- ✅ NEVER skip pre-flight checks

## Success Criteria (Default Mode)

✅ Version bumped in package.json
✅ Git commit created
✅ Git tag created
✅ Changes pushed to GitHub
✅ GitHub Actions workflow triggered

---

## DIRECT MODE WORKFLOW (--only flag)

Use this workflow when `--only` flag is detected. This publishes directly to npm WITHOUT git push or GitHub Actions.

### 1. Pre-flight Checks (Same as Default)

```bash
# Verify we're on develop branch
git rev-parse --abbrev-ref HEAD

# Check for uncommitted changes
git status --porcelain

# Verify current version
node -p "require('./package.json').version"
```

**STOP if**:
- Not on `develop` branch (ask user to switch)
- Uncommitted changes exist (ask user to commit first)

### 2. Bump Patch Version (Same as Default)

```bash
# This creates commit + tag automatically
npm version patch -m "chore: bump version to %s"
```

**What this does**:
- Updates `package.json` and `package-lock.json`
- Creates git commit with message "chore: bump version to X.Y.Z"
- Creates git tag `vX.Y.Z`

### 3. Extract New Version

```bash
# Get the new version
node -p "require('./package.json').version"
```

### 4. Build Package

```bash
# Build the package before publishing
npm run rebuild
```

**Critical**: Must rebuild to ensure dist/ is up-to-date before publishing.

### 5. Publish to NPM Directly

```bash
# Publish directly to npm (bypasses GitHub Actions)
npm publish
```

**What this does**:
- Builds package tarball
- Publishes to npm registry immediately
- No GitHub Actions involvement

### 6. Report Results (Direct Mode)

Show the user:
```markdown
✅ **Published directly to npm!**

📦 **Version**: vX.Y.Z
🔗 **NPM**: https://www.npmjs.com/package/specweave
🏷️ **Git Tag**: vX.Y.Z (local only)

**What happened**:
- ✅ Version bumped and committed locally
- ✅ Git tag created locally
- ✅ Package built (npm run rebuild)
- ✅ Published to npm directly
- ⏸️ Git NOT pushed (use `git push origin develop --follow-tags` later if needed)

**Verify**:
- Check npm: https://www.npmjs.com/package/specweave
- Verify version: `npm view specweave version`
- Install globally: `npm install -g specweave@X.Y.Z`

**Note**: Local release only. Push to GitHub manually when ready:
`git push origin develop --follow-tags`
```

## Direct Mode Safety Rules

- ✅ ALWAYS rebuild before publishing (`npm run rebuild`)
- ✅ Use `--only` for emergency/quick releases or local testing
- ✅ Default mode (GitHub Actions) is preferred for regular releases
- ✅ Direct mode gives immediate feedback (no CI wait time)
- ⚠️ Remember to push git changes later to sync GitHub

## Success Criteria (Direct Mode)

✅ Version bumped in package.json
✅ Git commit created locally
✅ Git tag created locally
✅ Package rebuilt
✅ Published to npm directly
⏸️ Git NOT pushed (manual sync later)

---

## DIRECT MODE + PUSH WORKFLOW (--only --push flags)

Use this workflow when BOTH `--only` AND `--push` flags are detected. This is the **complete local release** - publishes to npm directly AND pushes to git.

**Use case**: You want full control - publish immediately, then sync git. No CI involvement in npm publish.

### 1. Pre-flight Checks

```bash
# Verify we're on develop branch
git rev-parse --abbrev-ref HEAD

# Check for uncommitted changes
git status --porcelain

# Verify current version
node -p "require('./package.json').version"
```

**STOP if**:
- Not on `develop` branch (ask user to switch)

**If uncommitted changes exist → AUTO-COMMIT FIRST (Step 1b)**

### 1b. Auto-Commit Uncommitted Changes (if any)

When `--only --push` is used, uncommitted changes should be committed automatically before version bump.

**Algorithm to generate commit message:**

1. Run `git status --porcelain` and categorize files:
   - `src/**` → code changes
   - `*.md`, `docs/` → documentation
   - `.specweave/docs/internal/**` → internal docs
   - `plugins/**` → plugin changes
   - `tests/**`, `*.test.ts` → test changes
   - `package*.json`, `*.config.*` → config/deps

2. Determine primary category (most files) and action (add/update/remove):
   - New files (`??`, `A`) → "add"
   - Modified (`M`) → "update"
   - Deleted (`D`) → "remove"

3. Generate concise message: `type: action description`

**Examples:**
- Many ADR renames + docs moves → `chore: reorganize internal docs structure`
- Plugin command updates → `feat(release): add --push flag to npm release`
- Mixed code + docs → `chore: update code and documentation`

**Execute auto-commit:**
```bash
git add -A
git commit -m "[generated message]"
```

Then continue with version bump.

### 2. Bump Patch Version

```bash
# This creates commit + tag automatically
npm version patch -m "chore: bump version to %s"
```

### 3. Extract New Version

```bash
# Get the new version
node -p "require('./package.json').version"
```

### 4. Build Package

```bash
# Build the package before publishing
npm run rebuild
```

**Critical**: Must rebuild to ensure dist/ is up-to-date before publishing.

### 5. Publish to NPM Directly

```bash
# Publish directly to npm (bypasses GitHub Actions)
npm publish
```

### 6. Push to Git (NEW!)

```bash
# Push commit and tag to sync with remote
git push origin develop --follow-tags
```

**What this does**:
- Syncs your version bump commit to GitHub
- Pushes the version tag (vX.Y.Z)
- Does NOT trigger CI npm publish (already published!)

### 7. Report Results (Direct Mode + Push)

Show the user:
```markdown
✅ **Complete local release!**

📦 **Version**: vX.Y.Z
🔗 **NPM**: https://www.npmjs.com/package/specweave
🏷️ **Git Tag**: https://github.com/anton-abyzov/specweave/releases/tag/vX.Y.Z

**What happened**:
- ✅ Version bumped and committed
- ✅ Git tag created
- ✅ Package built (npm run rebuild)
- ✅ Published to npm directly
- ✅ Pushed to GitHub (commit + tag)

**Verify**:
- NPM: https://www.npmjs.com/package/specweave
- Version: `npm view specweave version`
- GitHub: Check releases page

**Note**: This was a direct publish. GitHub Actions will NOT republish
(the tag already exists, CI skips existing versions).
```

## Direct Mode + Push Safety Rules

- ✅ ALWAYS rebuild before publishing
- ✅ Publishes FIRST, then pushes (ensures npm has the version)
- ✅ If push fails, npm already has the release (safe state)
- ✅ CI will skip publishing for this version (tag already exists)
- ⚠️ Use when you need immediate npm availability + git sync

## Success Criteria (Direct Mode + Push)

✅ Version bumped in package.json
✅ Git commit created
✅ Git tag created
✅ Package rebuilt
✅ Published to npm directly
✅ Pushed to GitHub (commit + tag synced)

---

## Quick Reference

```bash
# Standard release (CI handles npm publish)
/specweave-release:npm

# Quick local publish, sync git later
/specweave-release:npm --only

# Complete local release (publish + push)
/specweave-release:npm --only --push
```

| Scenario | Command | NPM Published By | Git Pushed |
|----------|---------|------------------|------------|
| Normal release | (no flags) | GitHub Actions | ✅ Yes |
| Quick local, push later | `--only` | You (local) | ❌ No |
| Complete local release | `--only --push` | You (local) | ✅ Yes |
