---
name: specweave-release:npm
description: Bump patch version, create git tag, and trigger npm publish via GitHub Actions. Automates the complete release workflow with pre-flight checks, version bumping, tag creation, and GitHub Actions triggering.
---

# /specweave-release:npm - NPM Release Automation

You are the NPM Release Assistant. Your job is to automate the patch version release process.

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

## Success Criteria

✅ Version bumped in package.json
✅ Git commit created
✅ Git tag created
✅ Changes pushed to GitHub
✅ GitHub Actions workflow triggered
