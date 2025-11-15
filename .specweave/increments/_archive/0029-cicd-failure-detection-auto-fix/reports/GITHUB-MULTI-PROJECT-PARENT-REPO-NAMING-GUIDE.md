# GitHub Multi-Project Parent Repo Naming - Prevention Guide

**Problem**: When setting up GitHub integration with multi-project + parent repo, it's easy to create mismatched parent repo names, resulting in duplicate repositories.

**Example of the Problem**:
```bash
# User runs init with -shared flag
specweave init . -shared

# Config stores: sw-gh-inventory-shared ✅
# Directory name: sw-gh-inventory
# Git remote created: sw-gh-inventory ❌ (missing -shared!)
# .env stores: sw-gh-inventory ❌ (missing -shared!)

# Result: Two parent repos exist:
# 1. sw-gh-inventory-shared (correct, from config)
# 2. sw-gh-inventory (incorrect, from git remote)
```

---

## Root Cause Analysis

**Multiple Sources of Truth**:

| Source | Value | Correct? |
|--------|-------|----------|
| Directory name | `sw-gh-inventory` | N/A (just a folder) |
| `-shared` flag | Appends `-shared` | ✅ Correct logic |
| Config (`config.json`) | `sw-gh-inventory-shared` | ✅ Correct |
| Git remote URL | `sw-gh-inventory` | ❌ Missing `-shared` |
| `.env` PARENT_REPO_NAME | `sw-gh-inventory` | ❌ Missing `-shared` |

**The Disconnect**:
- ✅ SpecWeave init correctly stores `sw-gh-inventory-shared` in config
- ❌ When creating git remote, the `-shared` suffix was forgotten
- ❌ When populating .env, the `-shared` suffix was forgotten
- Result: Config says one thing, git/env say another

---

## Prevention Strategies

### 1. **Single Source of Truth: Config File**

**Proposal**: Store parent repo name explicitly in `.specweave/config.json`:

```json
{
  "multiProject": {
    "enabled": true,
    "parentRepoName": "sw-gh-inventory-shared",  // ← Explicit!
    "sharedMode": true,
    "approach": "github"
  }
}
```

**Benefits**:
- ✅ ONE place to check for correct parent repo name
- ✅ Git remote and .env can reference this value
- ✅ Validation can check consistency

**Implementation**:
- `specweave init` stores parent repo name in config
- GitHub sync commands read from config (not .env)
- Validation checks git remote matches config

---

### 2. **Enhanced .env.example with Clear Guidance**

**Current** (ambiguous):
```bash
# Multi-project parent repository mapping (optional)
# Format: project-id:repo-name
# Example: shared:my-parent-repo
PARENT_REPO_NAME=
```

**Improved** (explicit warnings):
```bash
# ============================================
# MULTI-PROJECT PARENT REPOSITORY (CRITICAL!)
# ============================================
#
# IMPORTANT: If you used `-shared` flag during init, the parent repo name
# MUST include the `-shared` suffix!
#
# ❌ WRONG: PARENT_REPO_NAME=sw-gh-inventory
# ✅ CORRECT: PARENT_REPO_NAME=sw-gh-inventory-shared
#
# HOW TO CHECK: Run this command:
#   cat .specweave/config.json | grep parentRepoName
#
# The value here MUST EXACTLY MATCH config.json!
#
# Format: project-id:repo-name
# Example: shared:my-project-shared
#
PARENT_REPO_NAME=shared:sw-gh-inventory-shared
```

**Key Improvements**:
- ⚠️ Bold warning about `-shared` suffix
- ✅ Shows correct vs incorrect example
- 🔍 Provides validation command
- 📝 Pre-filled with correct value from config

---

### 3. **Pre-Flight Validation in GitHub Sync Commands**

**Add validation before syncing**:

```typescript
// plugins/specweave-github/lib/github-sync-validator.ts

async function validateParentRepoSetup(): Promise<ValidationResult> {
  const config = loadConfig();
  const parentRepoName = config.multiProject?.parentRepoName;

  // Check 1: Config has parent repo name
  if (!parentRepoName) {
    return {
      valid: false,
      errors: ["Parent repo name not found in config.json"]
    };
  }

  // Check 2: Git remote exists and matches
  const gitRemote = execSync('git remote get-url origin').toString().trim();
  const remoteRepoName = gitRemote.split('/').pop()?.replace('.git', '');

  if (remoteRepoName !== parentRepoName) {
    return {
      valid: false,
      errors: [
        `❌ Git remote mismatch!`,
        `   Config expects: ${parentRepoName}`,
        `   Git remote has: ${remoteRepoName}`,
        ``,
        `Fix with:`,
        `   git remote set-url origin https://github.com/owner/${parentRepoName}.git`
      ]
    };
  }

  // Check 3: .env matches config (if .env exists)
  const envParentRepo = process.env.PARENT_REPO_NAME?.split(':')[1];
  if (envParentRepo && envParentRepo !== parentRepoName) {
    return {
      valid: false,
      warnings: [
        `⚠️  .env mismatch (will be ignored):`,
        `   Config: ${parentRepoName}`,
        `   .env:   ${envParentRepo}`,
        ``,
        `Update .env to match config.json`
      ]
    };
  }

  return { valid: true };
}
```

**Usage**:
```typescript
// Before syncing
const validation = await validateParentRepoSetup();
if (!validation.valid) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}
```

---

### 4. **Git Remote Validation During Init**

**Add to `specweave init` command**:

```typescript
// After creating config.json
const parentRepoName = calculateParentRepoName(dirName, flags.shared);

console.log(`\n📋 Parent Repository Setup`);
console.log(`   Name: ${parentRepoName}`);
console.log(`   GitHub URL: https://github.com/${owner}/${parentRepoName}`);
console.log(``);
console.log(`⚠️  IMPORTANT: When creating git remote, use EXACTLY this name:`);
console.log(`   git remote add origin https://github.com/${owner}/${parentRepoName}.git`);
console.log(``);

// Offer to create git remote automatically
const createRemote = await confirm({
  message: 'Create git remote automatically?',
  default: true
});

if (createRemote) {
  const owner = await input({
    message: 'GitHub owner (username or org):',
    default: process.env.GITHUB_OWNER || ''
  });

  execSync(`git remote add origin https://github.com/${owner}/${parentRepoName}.git`);
  console.log(`✅ Git remote created: ${parentRepoName}`);
  console.log(`   Run: git push -u origin main`);
}
```

**Benefits**:
- ✅ Clear display of expected parent repo name
- ✅ Offer to create git remote automatically (prevents typos)
- ✅ Shows exact command if user wants to do it manually

---

### 5. **Documentation Updates**

**Add to Multi-Project Setup Guide** (`.specweave/docs/public/guides/multi-project-setup.md`):

#### Critical: Parent Repo Naming Convention

**If you used `-shared` flag**, your parent repo name MUST include `-shared` suffix:

```bash
# ❌ WRONG Setup:
specweave init . -shared               # Init with -shared flag
git remote add origin .../my-repo.git  # ❌ Missing -shared!

# ✅ CORRECT Setup:
specweave init . -shared                     # Init with -shared flag
git remote add origin .../my-repo-shared.git # ✅ Includes -shared!
```

**Validation Command**:
```bash
# Check config.json for expected name:
cat .specweave/config.json | grep parentRepoName

# Check git remote:
git remote get-url origin

# These MUST match!
```

**If They Don't Match**:
```bash
# Fix git remote:
git remote set-url origin https://github.com/owner/correct-name.git

# Update .env:
PARENT_REPO_NAME=shared:correct-name
```

---

### 6. **Automated Validation Script**

**Create**: `scripts/validate-parent-repo-setup.sh`

```bash
#!/bin/bash
# Validate parent repo setup consistency

CONFIG_PARENT=$(jq -r '.multiProject.parentRepoName // empty' .specweave/config.json)
GIT_REMOTE=$(git remote get-url origin 2>/dev/null | sed 's/.*\///' | sed 's/\.git$//')
ENV_PARENT=$(grep PARENT_REPO_NAME .env 2>/dev/null | cut -d: -f2)

echo "🔍 Validating Parent Repo Setup..."
echo ""
echo "Config:      $CONFIG_PARENT"
echo "Git Remote:  $GIT_REMOTE"
echo ".env:        $ENV_PARENT"
echo ""

# Check consistency
if [ "$CONFIG_PARENT" != "$GIT_REMOTE" ]; then
  echo "❌ MISMATCH DETECTED!"
  echo ""
  echo "Config expects: $CONFIG_PARENT"
  echo "Git remote has: $GIT_REMOTE"
  echo ""
  echo "Fix with:"
  echo "  git remote set-url origin https://github.com/owner/$CONFIG_PARENT.git"
  exit 1
fi

if [ -n "$ENV_PARENT" ] && [ "$CONFIG_PARENT" != "$ENV_PARENT" ]; then
  echo "⚠️  .env mismatch (update to match config)"
  exit 1
fi

echo "✅ All consistent!"
exit 0
```

**Usage**:
```bash
# Run before syncing
bash scripts/validate-parent-repo-setup.sh

# Or add to pre-commit hook
```

---

## Recommended Implementation Order

### Phase 1: Immediate (Quick Wins)
1. ✅ **Update .env.example** with clear warnings (5 min)
2. ✅ **Add validation script** (`validate-parent-repo-setup.sh`) (10 min)
3. ✅ **Update multi-project setup guide** with naming section (10 min)

### Phase 2: Short-Term (Next Release)
4. 🔄 **Add parentRepoName to config.json** (init command) (30 min)
5. 🔄 **Add pre-flight validation** to GitHub sync commands (45 min)
6. 🔄 **Add git remote auto-creation** to init command (30 min)

### Phase 3: Long-Term (Future Enhancement)
7. 🔮 **Auto-detect mismatches** on every SpecWeave command (1 hour)
8. 🔮 **Interactive repair wizard** for mismatched setups (2 hours)

---

## User Guidance (Quick Reference)

**✅ DO**:
- Run `cat .specweave/config.json | grep parentRepoName` to check expected name
- Use EXACT name from config when creating git remote
- Update .env to match config.json
- Run validation script before syncing

**❌ DON'T**:
- Assume directory name = parent repo name
- Forget `-shared` suffix if you used `-shared` flag
- Manually edit parent repo name without checking config
- Create git remote without validating against config

**If You Made a Mistake**:
```bash
# 1. Check config for correct name
cat .specweave/config.json | grep parentRepoName

# 2. Fix git remote
git remote set-url origin https://github.com/owner/correct-name.git

# 3. Update .env
# Edit .env → PARENT_REPO_NAME=shared:correct-name

# 4. Delete incorrect repo on GitHub (if created)
# Go to: https://github.com/owner/incorrect-name/settings
# Scroll to bottom → "Delete this repository"

# 5. Validate
bash scripts/validate-parent-repo-setup.sh
```

---

## Summary

**The Core Issue**: Multiple sources of truth for parent repo name created confusion.

**The Solution**: Make config.json the single source of truth, validate consistency, and provide clear guidance.

**Quick Wins** (implement now):
1. Enhanced .env.example with warnings
2. Validation script
3. Updated documentation

**Long-Term** (next release):
1. parentRepoName in config.json
2. Pre-flight validation in sync commands
3. Auto-create git remote in init command

This will prevent future confusion and make GitHub multi-project setup bulletproof! 🛡️
