# Init Command - Issue Tracker Configuration Complete

**Date**: 2025-11-10
**Increment**: 0015-hierarchical-external-sync
**Status**: ✅ Init improvements complete, sync configured
**Changes**: Init now detects existing config and prompts for reconfiguration

---

## Summary of Changes

### 1. Config.json Updated ✅ COMPLETE

**File**: `.specweave/config.json`

**Added**:
```json
{
  "sync": {
    "activeProfile": "specweave-dev",
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "displayName": "SpecWeave Development",
        "description": "GitHub sync for SpecWeave framework development",
        "strategy": "simple",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      }
    },
    "settings": {
      "autoDetectProject": true,
      "autoCreateIssue": true,
      "syncDirection": "bidirectional",
      "defaultTimeRange": "1M",
      "rateLimitProtection": true,
      "conflictResolution": "prompt"
    }
  },
  "hooks": {
    "post_spec_update": {
      "auto_sync": true
    },
    "post_user_story_complete": {
      "auto_sync": true
    },
    "post_task_completion": {
      "sync_living_docs": true,
      "sync_tasks_md": true,
      "external_tracker_sync": true
    }
  }
}
```

**What This Enables**:
- ✅ **GitHub sync profile** configured for anton-abyzov/specweave
- ✅ **Bidirectional sync** enabled (Local ↔ GitHub)
- ✅ **Auto-create issues** on increment planning
- ✅ **Automatic hooks** fire after spec updates, user story completion, task completion
- ✅ **Rate limiting** protection (max 500 items/sync, warn at 100)

---

### 2. Init.ts Updated ✅ COMPLETE

**File**: `src/cli/commands/init.ts`

**Changes**:

#### Before (Lines 895-898):
```typescript
if (isFrameworkRepo) {
  console.log(chalk.blue('\n🔍 Detected SpecWeave framework repository'));
  console.log(chalk.gray('   Framework development mode enabled'));
  console.log(chalk.gray('   Skipping issue tracker setup (framework uses GitHub Issues)\n'));
}
```

#### After (Lines 912-950):
```typescript
// Check if sync config already exists
const configPath = path.join(targetDir, '.specweave', 'config.json');
let existingTracker: string | null = null;

if (fs.existsSync(configPath)) {
  const config = await fs.readJson(configPath);
  if (config.sync?.activeProfile && config.sync?.profiles) {
    const activeProfile = config.sync.profiles[config.sync.activeProfile];
    if (activeProfile?.provider) {
      existingTracker = activeProfile.provider;
    }
  }
}

if (existingTracker) {
  // Existing config detected - ask if user wants to reconfigure
  console.log(chalk.blue('\n🔍 Existing Issue Tracker Configuration Detected'));
  console.log(chalk.gray(`   Current: ${existingTracker.charAt(0).toUpperCase() + existingTracker.slice(1)}`));
  console.log('');

  const { reconfigure } = await inquirer.prompt([{
    type: 'confirm',
    name: 'reconfigure',
    message: 'Do you want to reconfigure your issue tracker?',
    default: false
  }]);

  if (!reconfigure) {
    console.log(chalk.gray('   ✓ Keeping existing configuration\n'));
  } else {
    await setupIssueTracker({ ... });
  }
} else {
  // No existing config - run setup
  if (isFrameworkRepo) {
    console.log(chalk.blue('\n🔍 Detected SpecWeave framework repository'));
    console.log(chalk.gray('   Recommended: Configure GitHub sync for automatic bidirectional sync'));
    console.log('');
  }

  await setupIssueTracker({ ... });
}
```

**What Changed**:
- ✅ **Detects existing sync config** from `.specweave/config.json`
- ✅ **Asks user** if they want to reconfigure (default: No)
- ✅ **Framework repo** detection still works (shows helpful message)
- ✅ **Always runs** issue tracker setup (not skipped for framework repo)
- ✅ **isFrameworkRepo flag** passed to setupIssueTracker

---

### 3. Types Updated ✅ COMPLETE

**File**: `src/cli/helpers/issue-tracker/types.ts`

**Added**:
```typescript
export interface SetupOptions {
  projectPath: string;
  language: SupportedLanguage;
  maxRetries?: number; // Default: 3
  isFrameworkRepo?: boolean; // ✅ NEW - True if this is the SpecWeave framework repo itself
}
```

---

## How It Works Now

### Scenario 1: Fresh Init (No Existing Config)

```bash
$ specweave init .
```

**Output**:
```
🚀 SpecWeave Initialization

...plugins install...

🎯 Issue Tracker Integration

Which issue tracker do you use?
  🐙 GitHub Issues (detected)
  📋 Jira
  🔷 Azure DevOps
  ⏭️  None (skip)
```

**User selects GitHub** → Configures sync → Done!

---

### Scenario 2: Existing Config (Re-Init)

```bash
$ specweave init .
```

**Output**:
```
🚀 SpecWeave Initialization

📦 Existing SpecWeave project detected!
   Found .specweave/ folder with your increments, docs, and configuration.

What would you like to do?
  ✨ Continue working (keep all existing increments, docs, and history)
  🔄 Fresh start (delete .specweave/ and start from scratch)
  ❌ Cancel (exit without changes)

> Continue

...plugins install...

🔍 Existing Issue Tracker Configuration Detected
   Current: Github

Do you want to reconfigure your issue tracker? (y/N)

> N

✓ Keeping existing configuration
```

**Result**: Existing config preserved!

---

### Scenario 3: User Wants to Change Tracker (GitHub → Jira)

```bash
$ specweave init .
```

**User**:
1. Selects "Continue working"
2. Config detected: Current = Github
3. User answers "Yes" to reconfigure
4. Selects Jira from menu
5. Enters Jira credentials
6. Config updated to Jira!

---

## Next Steps

### ✅ Completed
1. Config.json updated with GitHub sync profile
2. Init.ts updated to detect existing config
3. Types updated with isFrameworkRepo flag
4. Build successful

### ⏳ Remaining

#### Phase 1: Create Specs from Existing Increments

**Goal**: Convert existing SpecWeave increments to living docs specs

**Steps**:
1. Scan `.specweave/increments/` for completed increments
2. Group increments by feature area (e.g., 0001-0005 = "Core Framework")
3. Create specs in `.specweave/docs/internal/specs/`:
   - `spec-001-core-framework-architecture.md`
   - `spec-002-intelligent-ai-capabilities.md`
   - `spec-003-multilingual-support.md`
   - etc.
4. Extract user stories from increment specs
5. Link increments to specs via frontmatter

**Example**:
```yaml
---
id: spec-001
title: Core Framework & Architecture
status: complete
priority: P0
increments:
  - 0001-core-framework
  - 0002-core-enhancements
  - 0004-plugin-architecture
  - 0005-cross-platform-cli
userStories:
  - id: US-001
    title: NPM installation and CLI basics
    status: done
    acceptanceCriteria:
      - id: AC-001-01
        description: Users can install via npm
        status: done
  - id: US-002
    title: Plugin system foundation
    status: done
---
```

#### Phase 2: Sync Specs to GitHub

**Goal**: Create GitHub Projects for each spec and sync user stories as issues

**Steps**:
1. For each spec in `.specweave/docs/internal/specs/`:
   - Run `/specweave-github:sync-spec spec-001`
   - Creates GitHub Project with title `[SPEC-001] Core Framework & Architecture`
   - Creates 35 GitHub Issues for 35 user stories
   - Links spec frontmatter to GitHub Project ID
2. Result: All specs synced to GitHub

**Example**:
```bash
$ /specweave-github:sync-spec spec-001

🔄 Syncing spec spec-001 to GitHub Project...
   Creating new GitHub Project...
   ✅ Created GitHub Project #5: https://github.com/anton-abyzov/specweave/projects/5
   Syncing 35 user stories...
   ✅ Created US-001 → Issue #200
   ✅ Created US-002 → Issue #201
   ...
✅ Sync complete!
```

#### Phase 3: Test Bidirectional Sync

**Goal**: Verify changes in GitHub sync back to local specs

**Steps**:
1. Open GitHub Project #5
2. Close one issue (#200)
3. Run `/specweave-github:sync-spec spec-001 --direction from-github`
4. Verify `spec-001.md` updated with `US-001` marked done
5. Result: Bidirectional sync works!

#### Phase 4: Enable Automatic Sync

**Goal**: Hooks fire automatically on spec updates

**Steps**:
1. Edit `spec-001.md` manually (change user story)
2. Hook fires: `post-spec-update.sh`
3. Syncs to GitHub automatically
4. Verify GitHub Project updated
5. Result: Automatic sync works!

---

## Testing

### Manual Test

```bash
# 1. Build project
npm run build

# 2. Run init (should detect existing config)
specweave init .

# Expected output:
# 🔍 Existing Issue Tracker Configuration Detected
#    Current: Github
#
# Do you want to reconfigure your issue tracker? (y/N)

# 3. Answer "N" → Config preserved
# 4. Answer "Y" → Reconfiguration flow starts
```

---

## Architecture

### Current State

```
.specweave/config.json
├── sync.activeProfile = "specweave-dev"
├── sync.profiles.specweave-dev
│   ├── provider = "github"
│   ├── config.owner = "anton-abyzov"
│   └── config.repo = "specweave"
└── sync.settings
    ├── autoCreateIssue = true
    ├── syncDirection = "bidirectional"
    └── ...
```

### Flow

```
User runs: specweave init .
   ↓
Check if .specweave/config.json exists
   ↓
Yes → Extract sync.profiles.activeProfile.provider
   ↓
Show: "Current: Github"
   ↓
Ask: "Do you want to reconfigure?"
   ↓
No → Keep existing config
Yes → Run setupIssueTracker()
```

---

## Files Changed

| File | Lines Changed | Status |
|------|--------------|--------|
| `.specweave/config.json` | +63 lines | ✅ Complete |
| `src/cli/commands/init.ts` | ~40 lines modified | ✅ Complete |
| `src/cli/helpers/issue-tracker/types.ts` | +1 line | ✅ Complete |
| **Total** | ~104 lines | ✅ Complete |

---

## Benefits

### Before
- ❌ Framework repo skipped issue tracker setup
- ❌ No detection of existing config
- ❌ Had to manually edit config.json
- ❌ No guidance on reconfiguration

### After
- ✅ Framework repo prompts for GitHub sync
- ✅ Detects existing config automatically
- ✅ Asks user if they want to reconfigure
- ✅ Preserves config by default (safe)
- ✅ Clear, helpful messages

---

## Next Session

**Priority**:
1. Create specs from existing increments (Phase 1)
2. Sync specs to GitHub Projects (Phase 2)
3. Test bidirectional sync (Phase 3)
4. Verify automatic hooks fire correctly (Phase 4)

**Commands to run**:
```bash
# Build first
npm run build

# Create specs (manual for now, can automate later)
vim .specweave/docs/internal/specs/spec-001-core-framework.md

# Sync to GitHub
/specweave-github:sync-spec spec-001

# Test bidirectional
# (make changes in GitHub, then sync back)
/specweave-github:sync-spec spec-001 --direction from-github
```

---

**Author**: Claude (Autonomous Implementation)
**Date**: 2025-11-10
**Increment**: 0015-hierarchical-external-sync
**Status**: ✅ Init Configuration Complete, Ready for Spec Creation & Sync
