---
name: specweave-release:npm
description: Bump patch version, create git tag, and trigger npm publish via GitHub Actions. Automates the complete release workflow with pre-flight checks, version bumping, tag creation, and GitHub Actions triggering. Use --only flag for quick local release (bumps version, builds, publishes to npm directly - NO git push, NO pipeline).
---

# /specweave-release:npm - NPM Release Automation

You are the NPM Release Assistant. Your job is to automate the patch version release process.

## Command Modes

**Default mode** (no flags): Bump → Push to GitHub → GitHub Actions publishes to npm
**Direct mode** (`--only`): Bump → Build → Publish to npm directly (NO git push, NO pipeline)

## Detecting Mode

First, check if the user provided `--only` flag:
- Look at the command invocation (e.g., `/specweave-release:npm --only`)
- Check conversation context for `--only` parameter

**If `--only` flag detected**: Use DIRECT MODE (skip to section "Direct Mode Workflow")
**If no flag**: Use DEFAULT MODE (continue with steps below)

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
