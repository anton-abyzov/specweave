---
name: specweave-release:npm
description: Bump patch version, auto-commit dirty changes, push to GitHub, build, publish to npmjs.org. Use --ci for GitHub Actions publish. Use --only for local publish without git push. Use --only --local for version bump only.
---

# /specweave-release:npm - NPM Release Automation

You are the NPM Release Assistant. Your job is to automate the patch version release process.

## Command Modes

| Command | Flow | Use Case |
|---------|------|----------|
| `/specweave-release:npm` | Auto-commit → **PUSH** → Bump → Build → **Publish** → Push tag | **DEFAULT: INSTANT RELEASE** |
| `/specweave-release:npm --ci` | Bump → Push → **CI publishes** | Let GitHub Actions handle npm publish |
| `/specweave-release:npm --only` | Bump → Build → **Publish locally** → NO push | Quick local release, push later |
| `/specweave-release:npm --only --local` | **Bump ONLY** → NO build, NO publish, NO git | FASTEST: Local testing only |

## Detecting Mode

Check flags in the command invocation:

```
--ci           → CI MODE: push to git, GitHub Actions publishes (requires clean working tree)
--only --local → Version bump ONLY (no build, no publish, no git) - FASTEST
--only         → Direct publish to npm (bypass CI), no git push
(no flags)     → DEFAULT: INSTANT RELEASE (auto-commit, push, build, publish, push tag)
```

**Flag Detection Order:**
1. Check for `--ci` flag → CI MODE (GitHub Actions publishes)
2. Check for `--only` flag
3. If `--only` present, check for `--local` flag → LOCAL MODE (fastest)
4. If `--only` only → DIRECT MODE
5. No flags → **DEFAULT: INSTANT RELEASE** (auto-commit dirty, push, build, publish)

**If `--ci`**: Use CI MODE (section "CI Mode Workflow")
**If `--only --local`**: Use LOCAL MODE (section "Local Mode Workflow") - FASTEST!
**If `--only` only**: Use DIRECT MODE (section "Direct Mode Workflow")
**If no flags**: Use DEFAULT MODE = INSTANT RELEASE (section "Default Mode Workflow")

---

## DEFAULT MODE WORKFLOW (no flags) - INSTANT RELEASE

This is the **default** workflow when no flags are provided. Auto-commits any dirty changes, syncs git FIRST, then publishes to npmjs.org. One command does everything!

**Use case**: You made changes and want to release immediately. No manual steps needed.

**CRITICAL ORDER**: Git sync FIRST, then release. This ensures:
- Your code is safe on remote before any release operations
- If npm publish fails, git is already synced (clean state)
- No risk of local-only commits that could be lost

### 1. Pre-flight Check (Minimal)

```bash
# Verify we're on develop branch
git rev-parse --abbrev-ref HEAD

# Get current version
node -p "require('./package.json').version"
```

**STOP if**: Not on `develop` branch (ask user to switch)

### 2. Auto-Commit Dirty Changes (if any)

```bash
# Check for uncommitted changes
git status --porcelain
```

If dirty, generate smart commit message and commit:

```bash
git add -A
git commit -m "[auto-generated message based on changed files]"
```

**Message generation rules:**
- `src/**` changes → `fix: update implementation`
- `plugins/**` changes → `feat(plugins): update plugin`
- `.specweave/**` changes → `chore: update specweave config`
- `*.md` changes → `docs: update documentation`
- Mixed → `chore: update code and documentation`

### 3. PUSH DIRTY COMMIT TO REMOTE FIRST! (CRITICAL!)

**BEFORE any release operations, sync git:**

```bash
# Push dirty commit to remote FIRST - ensures code is safe before release
git push origin develop
```

**Why this order?**
- ✅ Your changes are safely on GitHub BEFORE release starts
- ✅ If npm publish fails later, git is already synced
- ✅ No risk of "released but not pushed" state
- ✅ Clean recovery if anything fails mid-release

### 4. Bump Patch Version

```bash
npm version patch -m "chore: bump version to %s"
```

This creates a NEW commit + tag locally.

### 5. Build Package

```bash
npm run rebuild
```

### 6. Publish to NPM (with explicit registry!)

```bash
# CRITICAL: Always specify registry to avoid ~/.npmrc redirecting to private feeds!
npm publish --registry https://registry.npmjs.org
```

### 7. Push Version Commit + Tag

```bash
# Push the version bump commit and tag
git push origin develop --follow-tags
```

### 8. Report Results

```markdown
✅ **Instant release complete!**

📦 **Version**: vX.Y.Z
🔗 **NPM**: https://www.npmjs.com/package/specweave
🏷️ **GitHub**: https://github.com/anton-abyzov/specweave/releases/tag/vX.Y.Z

**What happened**:
- ✅ Dirty changes auto-committed
- ✅ Pushed to GitHub (code safe!)
- ✅ Version bumped to X.Y.Z
- ✅ Package built
- ✅ Published to npmjs.org
- ✅ Version tag pushed to GitHub

**Verify**: `npm view specweave version --registry https://registry.npmjs.org`
```

## Default Mode Success Criteria

✅ Any dirty changes auto-committed
✅ **Dirty commit pushed to remote FIRST**
✅ Version bumped in package.json
✅ Git commit and tag created
✅ Package rebuilt
✅ Published to npmjs.org (explicit registry!)
✅ Version commit + tag pushed to GitHub

---

## CI MODE WORKFLOW (--ci flag)

Use this workflow when `--ci` flag is detected. Push to git and let GitHub Actions handle npm publish.

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

### 5. Report Results

```markdown
✅ Release initiated successfully!

📦 **Version**: vX.Y.Z
🔗 **Tag**: https://github.com/anton-abyzov/specweave/releases/tag/vX.Y.Z
⏳ **GitHub Actions**: https://github.com/anton-abyzov/specweave/actions

**Next steps**:
1. Monitor GitHub Actions workflow (1-2 minutes)
2. Verify npm publish: https://www.npmjs.com/package/specweave
3. Check GitHub release notes
```

## CI Mode Success Criteria

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
# Publish directly to npmjs.org (bypasses GitHub Actions)
# CRITICAL: Always specify registry to avoid ~/.npmrc redirecting to private feeds!
npm publish --registry https://registry.npmjs.org
```

**What this does**:
- Builds package tarball
- Publishes to **npmjs.org** registry immediately (ignores ~/.npmrc)
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

## Quick Reference

```bash
# DEFAULT: Instant release (auto-commits dirty, publishes, pushes)
/specweave-release:npm

# CI release (GitHub Actions handles npm publish) - requires clean tree
/specweave-release:npm --ci

# Quick local publish, sync git later
/specweave-release:npm --only

# FASTEST: Version bump only (no publish, no git, no build)
/specweave-release:npm --only --local
```

| Scenario | Command | Auto-Commit Dirty? | NPM Published By | Git Pushed |
|----------|---------|-------------------|------------------|------------|
| **INSTANT RELEASE** | (no flags) | ✅ Yes | You (npmjs.org) | ✅ Yes |
| CI release | `--ci` | ❌ STOP | GitHub Actions | ✅ Yes |
| Quick local, push later | `--only` | ❌ STOP | You (npmjs.org) | ❌ No |
| **FASTEST local test** | `--only --local` | N/A | ❌ None | ❌ No |

---

## LOCAL MODE WORKFLOW (--only --local flags) - FASTEST!

Use this workflow when BOTH `--only` AND `--local` flags are detected. This is the **fastest possible** version bump - NO npm publish, NO git operations, NO build. Just increment the version number for local testing.

**Use case**: You need to quickly test a new version locally without publishing anywhere. Perfect for:
- Testing version-dependent features
- Local development iterations
- Quick version bumps before a real release

### 1. Minimal Pre-flight Check

```bash
# Just verify current version (no git checks needed!)
node -p "require('./package.json').version"
```

**NO git checks** - we're not committing or pushing anything!

### 2. Bump Version (NO git commit, NO tag)

```bash
# Bump version WITHOUT creating git commit or tag
npm version patch --no-git-tag-version
```

**What this does**:
- Updates `package.json` version ONLY
- Updates `package-lock.json` version ONLY
- NO git commit created
- NO git tag created
- INSTANT (< 1 second)

### 3. Report Results (Local Mode)

Show the user:
```markdown
⚡ **FAST local version bump!**

📦 **Version**: X.Y.Z → X.Y.(Z+1)

**What happened**:
- ✅ package.json version bumped
- ✅ package-lock.json updated
- ⏭️ NO git commit (use `git add . && git commit` later)
- ⏭️ NO git tag (use `git tag vX.Y.Z` later)
- ⏭️ NO npm publish (use `npm publish` later)
- ⏭️ NO build (use `npm run rebuild` later)

**Next steps when ready to release**:
1. Build: `npm run rebuild`
2. Test: `npm test`
3. Commit: `git add . && git commit -m "chore: bump version to X.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Publish: `npm publish --registry https://registry.npmjs.org`
6. Push: `git push origin develop --follow-tags`

**Or use**: `/specweave-release:npm --only --push` for full release
```

## Local Mode Safety Rules

- ✅ FASTEST possible - single npm command
- ✅ NO network operations (no npm publish, no git push)
- ✅ NO disk-heavy operations (no build)
- ✅ Safe to run multiple times (just increments version)
- ⚠️ Remember: version is NOT published or committed!
- ⚠️ Run `npm run rebuild` before testing locally

## Success Criteria (Local Mode)

✅ Version bumped in package.json
✅ Version bumped in package-lock.json
⏭️ NO git commit
⏭️ NO git tag
⏭️ NO npm publish
⏭️ NO build

**Time**: < 1 second
