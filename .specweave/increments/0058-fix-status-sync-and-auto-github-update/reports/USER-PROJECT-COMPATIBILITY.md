# User Project Compatibility Analysis
**Increment**: 0058-fix-status-sync-and-auto-github-update
**Date**: 2025-11-24
**Status**: ✅ **COMPATIBLE** (with setup requirements)

---

## Overview

The auto GitHub sync fixes in this increment are **fully compatible** with user projects using SpecWeave, but require proper setup and label configuration.

---

## ✅ What Works Out of the Box

1. **Label Mapping Logic**:
   - Maps living docs status values to GitHub labels
   - Handles multiple variations (`completed` → `status:complete`, `in-progress` → `status:active`)
   - Defensive fallback for unknown status values

2. **Automatic Issue Closure**:
   - Closes GitHub issues when all ACs verified complete
   - Updates issue progress automatically
   - Smart duplicate detection prevents duplicate issues

3. **Repository Detection**:
   - Reads configuration from `.specweave/config.json`
   - Fallback to environment variables (`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`)
   - Works with any GitHub repository (public or private)

---

## 🔧 Setup Requirements for User Projects

### 1. GitHub Configuration

**Option A: config.json (Recommended)**
```json
{
  "sync": {
    "github": {
      "enabled": true,
      "owner": "your-username",
      "repo": "your-repo"
    }
  }
}
```

**Option B: Environment Variables**
```bash
export GITHUB_OWNER="your-username"
export GITHUB_REPO="your-repo"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
```

### 2. Required GitHub Labels

**CRITICAL**: The following labels MUST exist in the user's GitHub repository:

| Label Name | Description | Color |
|------------|-------------|-------|
| `status:complete` | User story completed | Green (#28a745) |
| `status:active` | User story in progress | Blue (#0366d6) |
| `status:not_started` | User story not started | Gray (#6a737d) |
| `p0` | Priority 0 (critical) | Red (#d73a4a) |
| `p1` | Priority 1 (high) | Orange (#d93f0b) |
| `p2` | Priority 2 (medium) | Yellow (#fbca04) |
| `specweave` | SpecWeave-managed issue | Purple (#7057ff) |
| `user-story` | User story issue | Pink (#e99695) |

**If labels don't exist**: `gh issue create` will fail with error:
```
could not add label: 'status:complete' not found
```

---

## 🚀 Quick Setup Script for Users

**File**: `scripts/setup-github-labels.sh`

```bash
#!/bin/bash
# Setup required GitHub labels for SpecWeave sync

# Colors
GREEN="#28a745"
BLUE="#0366d6"
GRAY="#6a737d"
RED="#d73a4a"
ORANGE="#d93f0b"
YELLOW="#fbca04"
PURPLE="#7057ff"
PINK="#e99695"

echo "🏷️  Creating SpecWeave GitHub labels..."

# Status labels
gh label create "status:complete" --description "User story completed" --color "$GREEN" --force
gh label create "status:active" --description "User story in progress" --color "$BLUE" --force
gh label create "status:not_started" --description "User story not started" --color "$GRAY" --force

# Priority labels
gh label create "p0" --description "Priority 0 (critical)" --color "$RED" --force
gh label create "p1" --description "Priority 1 (high)" --color "$ORANGE" --force
gh label create "p2" --description "Priority 2 (medium)" --color "$YELLOW" --force

# Type labels
gh label create "specweave" --description "SpecWeave-managed issue" --color "$PURPLE" --force
gh label create "user-story" --description "User story issue" --color "$PINK" --force

echo "✅ Labels created successfully!"
echo ""
echo "Next steps:"
echo "1. Configure GitHub sync in .specweave/config.json"
echo "2. Set GITHUB_TOKEN environment variable"
echo "3. Run: /specweave:sync-progress"
```

**Usage**:
```bash
# In user's project root
chmod +x scripts/setup-github-labels.sh
./scripts/setup-github-labels.sh
```

---

## 🔍 Validation Checklist

**Before first sync, users should verify**:

1. ✅ GitHub CLI (`gh`) installed and authenticated
   ```bash
   gh auth status
   ```

2. ✅ Repository configuration in `.specweave/config.json`
   ```bash
   jq '.sync.github' .specweave/config.json
   ```

3. ✅ Required labels exist in repository
   ```bash
   gh label list | grep -E "(status:|p[0-2]|specweave|user-story)"
   ```

4. ✅ Test sync with dry-run (future feature)
   ```bash
   /specweave:sync-progress --dry-run
   ```

---

## 🐛 Common Issues & Solutions

### Issue 1: "could not add label: 'status:complete' not found"

**Cause**: Label doesn't exist in repository

**Solution**:
```bash
# Create label manually
gh label create "status:complete" --description "Completed" --color "#28a745"

# Or run setup script
./scripts/setup-github-labels.sh
```

### Issue 2: "GitHub credentials not configured"

**Cause**: Missing configuration

**Solution**:
```bash
# Check config
cat .specweave/config.json | jq '.sync.github'

# Or set environment variables
export GITHUB_OWNER="your-username"
export GITHUB_REPO="your-repo"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
```

### Issue 3: "Failed to create Milestone: HTTP 403"

**Cause**: Token missing `repo` scope

**Solution**:
```bash
# Re-authenticate with correct scopes
gh auth login --scopes repo,write:discussion
```

### Issue 4: Issues not closing automatically

**Cause**: ACs not properly formatted in living docs

**Solution**:
```bash
# Embed ACs from living docs into spec.md
/specweave:embed-acs <increment-id>

# Then sync
/specweave:sync-progress <increment-id>
```

---

## 📦 Distribution via npm

**When released**:

1. **SpecWeave maintainers**:
   ```bash
   npm version patch
   npm publish
   ```

2. **Users update**:
   ```bash
   npm update specweave
   # Or
   npm install specweave@latest
   ```

3. **Changes take effect** immediately after update

---

## 🎯 Future Enhancements

### 1. Automatic Label Creation (High Priority)

**File**: `plugins/specweave-github/lib/label-manager.ts`

```typescript
export class LabelManager {
  /**
   * Ensure required labels exist in repository
   * Auto-creates missing labels with correct colors
   */
  static async ensureLabels(client: GitHubClient): Promise<void> {
    const requiredLabels = [
      { name: 'status:complete', color: '28a745', description: 'Completed' },
      { name: 'status:active', color: '0366d6', description: 'In progress' },
      { name: 'status:not_started', color: '6a737d', description: 'Not started' },
      // ... more labels
    ];

    for (const label of requiredLabels) {
      try {
        await client.getLabel(label.name);
      } catch (err) {
        // Label doesn't exist, create it
        await client.createLabel(label);
        console.log(`   ✅ Created label: ${label.name}`);
      }
    }
  }
}
```

**Integration**: Call `LabelManager.ensureLabels()` before first sync

### 2. Validation Command

```bash
/specweave-github:validate

# Output:
✅ GitHub CLI authenticated
✅ Repository configured (owner/repo)
✅ Token has correct scopes (repo, write:discussion)
❌ Missing labels: status:complete, p0
   Run: /specweave-github:setup-labels

✅ Ready for sync!
```

### 3. Interactive Setup Wizard

```bash
/specweave-github:setup

# Interactive prompts:
? GitHub username: your-username
? Repository name: your-repo
? Create required labels? (Y/n) y
✅ Configuration saved
✅ Labels created
✅ Ready to sync!
```

---

## ✅ Conclusion

The auto GitHub sync fixes are **fully compatible** with user projects, requiring:

1. **Minimal setup**: GitHub configuration + token
2. **One-time label creation**: Run setup script or create manually
3. **Standard SpecWeave workflow**: No changes to user workflow

**Recommendation for SpecWeave maintainers**:
- Add automatic label creation in next release (v0.26.8 or v0.27.0)
- Add validation command (`/specweave-github:validate`)
- Include setup script in npm package
- Document in main README and setup guide

**Recommendation for users**:
- Run label setup script before first sync
- Verify configuration with validation checklist
- Report issues on GitHub with detailed logs

---

**See Also**:
- `.specweave/increments/0058-fix-status-sync-and-auto-github-update/spec.md`
- ADR-0032 (Universal Hierarchy Mapping)
- GitHub Sync Documentation
