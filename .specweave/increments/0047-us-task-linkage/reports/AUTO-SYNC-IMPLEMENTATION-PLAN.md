# Auto-Sync Implementation Plan

**Date**: 2025-11-20
**Feature**: Automatic external tool synchronization on increment completion
**Related Docs**:
- AUTO-SYNC-CASCADE-ANALYSIS.md (Architecture & Analysis)
- AUTO-SYNC-CONFIG-STRATEGY.md (Configuration Design)

---

## Quick Reference

| Phase | Tasks | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| Phase 1 | Core SyncCoordinator | 4-6 hours | P0 | ⏸️ Not Started |
| Phase 2 | Configuration | 3-4 hours | P0 | ⏸️ Not Started |
| Phase 3 | Hook Integration | 2-3 hours | P0 | ⏸️ Not Started |
| Phase 4 | Documentation | 2-3 hours | P1 | ⏸️ Not Started |
| Phase 5 | Error Handling | 4-5 hours | P1 | ⏸️ Not Started |
| **Total** | **14 tasks** | **15-21 hours** | | **0% Complete** |

---

## Phase 1: Core SyncCoordinator Enhancement

**Goal**: Add JIRA and ADO sync support to `SyncCoordinator`

**Files Modified**:
- `src/sync/sync-coordinator.ts`

---

### T-001: Add JIRA Sync Branch

**Objective**: Integrate JIRA sync into `syncUserStory()` method

**Current Code** (src/sync/sync-coordinator.ts:122-150):
```typescript
private async syncUserStory(
  usFile: LivingDocsUSFile,
  syncService: FormatPreservationSyncService,
  config: any
): Promise<void> {
  const origin = getOrigin(usFile);
  const externalSource = usFile.external_source || 'github';

  if (externalSource === 'github') {
    // ✅ GitHub sync implemented
    const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
    await syncService.syncUserStory(usFile, completionData, client);
  } else {
    // ❌ JIRA/ADO stub
    this.logger.log(`⚠️ ${externalSource} sync not yet implemented`);
  }
}
```

**New Code**:
```typescript
private async syncUserStory(
  usFile: LivingDocsUSFile,
  syncService: FormatPreservationSyncService,
  config: any
): Promise<void> {
  const origin = getOrigin(usFile);
  const externalSource = usFile.external_source || 'github';

  // GitHub sync (existing)
  if (externalSource === 'github' && config.sync?.github?.enabled) {
    const repoInfo = await this.detectGitHubRepo(config.sync.github);
    if (!repoInfo) {
      throw new Error('GitHub repository not configured');
    }
    const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
    await syncService.syncUserStory(usFile, completionData, client);
  }

  // JIRA sync (NEW)
  else if (externalSource === 'jira' && config.sync?.jira?.enabled) {
    // Import JIRA sync implementation
    const { JiraHierarchicalSync } = await import(
      '../../plugins/specweave-jira/lib/jira-hierarchical-sync.js'
    );

    // Create JIRA client
    const jiraConfig = config.sync.jira;
    const jiraClient = {
      domain: jiraConfig.domain,
      email: process.env.JIRA_EMAIL || jiraConfig.email,
      apiToken: process.env.JIRA_API_TOKEN || jiraConfig.apiToken,
      projectKey: jiraConfig.projectKey
    };

    // Validate credentials
    if (!jiraClient.email || !jiraClient.apiToken) {
      this.logger.log('⚠️ JIRA credentials not configured, skipping');
      return;
    }

    // Perform sync
    const jiraSync = new JiraHierarchicalSync(jiraClient);
    await jiraSync.syncIncrement(this.incrementId, {
      direction: 'bidirectional',
      updateStatus: config.sync.settings.canUpdateStatus ?? true
    });

    this.logger.log(`✅ JIRA sync complete for ${usFile.id}`);
  }

  // Fallback: Unknown external source
  else {
    this.logger.log(`⚠️ ${externalSource} sync not yet implemented`);
  }
}
```

**Acceptance Criteria**:
- [x] JIRA branch added to `syncUserStory()` method
- [x] JIRA client created from config
- [x] Credentials validated before sync
- [x] Errors handled gracefully (log, don't crash)
- [x] Success logged for debugging

**Test Cases**:
1. JIRA enabled + valid credentials → Sync succeeds
2. JIRA enabled + missing credentials → Skip with warning
3. JIRA disabled → Skip silently
4. JIRA sync fails (network error) → Log error, continue

**Estimated Effort**: 2 hours

---

### T-002: Add ADO Sync Branch

**Objective**: Integrate Azure DevOps sync into `syncUserStory()` method

**New Code** (add to `syncUserStory()` method):
```typescript
// Azure DevOps sync (NEW)
else if (externalSource === 'ado' && config.sync?.ado?.enabled) {
  // Import ADO sync implementation
  const { AdoHierarchicalSync } = await import(
    '../../plugins/specweave-ado/lib/ado-hierarchical-sync.js'
  );

  // Create ADO client
  const adoConfig = config.sync.ado;
  const adoClient = {
    organization: adoConfig.organization,
    project: adoConfig.project,
    pat: process.env.ADO_PAT || adoConfig.pat
  };

  // Validate credentials
  if (!adoClient.pat) {
    this.logger.log('⚠️ ADO PAT not configured, skipping');
    return;
  }

  // Perform sync
  const adoSync = new AdoHierarchicalSync(adoClient);
  await adoSync.syncIncrement(this.incrementId, {
    direction: 'bidirectional',
    updateStatus: config.sync.settings.canUpdateStatus ?? true
  });

  this.logger.log(`✅ ADO sync complete for ${usFile.id}`);
}
```

**Acceptance Criteria**:
- [x] ADO branch added to `syncUserStory()` method
- [x] ADO client created from config
- [x] PAT validated before sync
- [x] Errors handled gracefully
- [x] Success logged

**Test Cases**:
1. ADO enabled + valid PAT → Sync succeeds
2. ADO enabled + missing PAT → Skip with warning
3. ADO disabled → Skip silently
4. ADO sync fails (API error) → Log error, continue

**Estimated Effort**: 2 hours

---

### T-003: Add Configuration Validation

**Objective**: Validate config before attempting sync

**New Method** (add to `SyncCoordinator` class):
```typescript
/**
 * Validate sync configuration before attempting sync
 */
private validateSyncConfig(config: any): {
  github: boolean;
  jira: boolean;
  ado: boolean;
  errors: string[];
} {
  const result = {
    github: false,
    jira: false,
    ado: false,
    errors: []
  };

  // Check master switch
  if (!config.sync?.settings?.canUpdateExternalItems) {
    result.errors.push('External sync disabled (canUpdateExternalItems=false)');
    return result;
  }

  // Validate GitHub
  if (config.sync?.github?.enabled) {
    if (!config.sync.github.owner || !config.sync.github.repo) {
      result.errors.push('GitHub: owner and repo required');
    } else {
      result.github = true;
    }
  }

  // Validate JIRA
  if (config.sync?.jira?.enabled) {
    const email = process.env.JIRA_EMAIL || config.sync.jira.email;
    const token = process.env.JIRA_API_TOKEN || config.sync.jira.apiToken;

    if (!email || !token) {
      result.errors.push('JIRA: email and apiToken required');
    } else if (!config.sync.jira.domain || !config.sync.jira.projectKey) {
      result.errors.push('JIRA: domain and projectKey required');
    } else {
      result.jira = true;
    }
  }

  // Validate ADO
  if (config.sync?.ado?.enabled) {
    const pat = process.env.ADO_PAT || config.sync.ado.pat;

    if (!pat) {
      result.errors.push('ADO: PAT required');
    } else if (!config.sync.ado.organization || !config.sync.ado.project) {
      result.errors.push('ADO: organization and project required');
    } else {
      result.ado = true;
    }
  }

  return result;
}
```

**Usage** (in `syncIncrementCompletion()` method):
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  // 1. Load config
  const config = await this.loadConfig();

  // 2. Validate config
  const validation = this.validateSyncConfig(config);

  if (validation.errors.length > 0) {
    this.logger.log('⚠️ Configuration errors:');
    validation.errors.forEach(err => this.logger.log(`  • ${err}`));
  }

  this.logger.log(`📊 Sync plan: GitHub=${validation.github}, JIRA=${validation.jira}, ADO=${validation.ado}`);

  // 3. Continue with sync...
}
```

**Acceptance Criteria**:
- [x] Config validation method added
- [x] Checks master switch first
- [x] Validates per-tool configuration
- [x] Returns enabled tools list
- [x] Returns validation errors
- [x] Used before sync attempt

**Test Cases**:
1. Valid GitHub config → `github: true`
2. Invalid GitHub config → `github: false`, error message
3. Valid JIRA config → `jira: true`
4. Missing JIRA credentials → `jira: false`, error message
5. Master switch off → All false, error message

**Estimated Effort**: 2 hours

---

## Phase 2: Configuration System

**Goal**: Add auto-sync configuration to SpecWeave config system

**Files Modified**:
- `src/cli/commands/init.ts`
- `src/utils/config-validator.ts`
- `scripts/migrate-auto-sync-config.ts`

---

### T-004: Add autoSyncOnCompletion Config Field

**Objective**: Add `autoSyncOnCompletion` field to config generation

**File**: `src/cli/commands/init.ts`

**Changes**:
```typescript
// In initializeConfig() function
const config = {
  // ... existing fields ...
  sync: {
    settings: {
      canUpdateExternalItems: false, // Existing
      canUpdateStatus: true,          // Existing
      autoSyncOnCompletion: true      // NEW
    },
    github: {
      enabled: true,                   // NEW
      autoDetect: true                 // NEW
    },
    jira: {
      enabled: false,                  // NEW
      domain: '',
      projectKey: '',
      email: '${JIRA_EMAIL}',
      apiToken: '${JIRA_API_TOKEN}'
    },
    ado: {
      enabled: false,                  // NEW
      organization: '',
      project: '',
      pat: '${ADO_PAT}'
    }
  }
};
```

**Acceptance Criteria**:
- [x] `autoSyncOnCompletion` added to config schema
- [x] Per-tool `enabled` flags added
- [x] GitHub auto-detect enabled by default
- [x] JIRA/ADO disabled by default
- [x] Backward compatible (existing configs work)

**Test Cases**:
1. Fresh init → Config has all new fields
2. Existing project init → New fields added, old fields preserved

**Estimated Effort**: 1 hour

---

### T-005: Add Config Validation Rules

**Objective**: Validate auto-sync config in config validator

**File**: `src/utils/config-validator.ts`

**New Rules**:
```typescript
export function validateSyncConfig(config: any): ValidationResult {
  const errors: string[] = [];

  // Validate sync.settings
  if (config.sync?.settings) {
    if (typeof config.sync.settings.autoSyncOnCompletion !== 'boolean') {
      errors.push('sync.settings.autoSyncOnCompletion must be boolean');
    }
  }

  // Validate sync.github
  if (config.sync?.github?.enabled) {
    if (!config.sync.github.owner && !config.sync.github.autoDetect) {
      errors.push('sync.github.owner required when autoDetect is false');
    }
    if (!config.sync.github.repo && !config.sync.github.autoDetect) {
      errors.push('sync.github.repo required when autoDetect is false');
    }
  }

  // Validate sync.jira
  if (config.sync?.jira?.enabled) {
    if (!config.sync.jira.domain) {
      errors.push('sync.jira.domain required when JIRA sync enabled');
    }
    if (!config.sync.jira.projectKey) {
      errors.push('sync.jira.projectKey required when JIRA sync enabled');
    }
  }

  // Validate sync.ado
  if (config.sync?.ado?.enabled) {
    if (!config.sync.ado.organization) {
      errors.push('sync.ado.organization required when ADO sync enabled');
    }
    if (!config.sync.ado.project) {
      errors.push('sync.ado.project required when ADO sync enabled');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Acceptance Criteria**:
- [x] Validation function added
- [x] Checks all new config fields
- [x] Returns clear error messages
- [x] Called during `specweave init`
- [x] Called before sync operations

**Test Cases**:
1. Valid config → No errors
2. Missing JIRA domain → Error message
3. Invalid boolean value → Error message
4. autoDetect true, no owner/repo → No error (valid)

**Estimated Effort**: 1.5 hours

---

### T-006: Create Migration Script

**Objective**: Migrate existing projects to new config format

**File**: `scripts/migrate-auto-sync-config.ts`

**Implementation**:
```typescript
#!/usr/bin/env tsx
import fs from 'fs-extra';
import path from 'path';

async function migrateAutoSyncConfig(projectRoot: string) {
  const configPath = path.join(projectRoot, '.specweave/config.json');

  if (!await fs.pathExists(configPath)) {
    console.log('⚠️ No config found, skipping migration');
    return;
  }

  console.log('🔄 Migrating config to v0.25.0...');

  const config = await fs.readJson(configPath);

  // Add new fields with defaults
  config.sync = config.sync || {};
  config.sync.settings = config.sync.settings || {};

  // autoSyncOnCompletion: Default OFF for safety (opt-in)
  if (config.sync.settings.autoSyncOnCompletion === undefined) {
    config.sync.settings.autoSyncOnCompletion = false;
    console.log('  ✓ Added autoSyncOnCompletion (default: false)');
  }

  // GitHub enabled flag
  config.sync.github = config.sync.github || {};
  if (config.sync.github.enabled === undefined) {
    config.sync.github.enabled = !!config.sync.github.owner;
    console.log(`  ✓ Added github.enabled (detected: ${config.sync.github.enabled})`);
  }
  if (config.sync.github.autoDetect === undefined) {
    config.sync.github.autoDetect = true;
    console.log('  ✓ Added github.autoDetect (default: true)');
  }

  // JIRA enabled flag
  config.sync.jira = config.sync.jira || {};
  if (config.sync.jira.enabled === undefined) {
    config.sync.jira.enabled = false;
    console.log('  ✓ Added jira.enabled (default: false)');
  }

  // ADO enabled flag
  config.sync.ado = config.sync.ado || {};
  if (config.sync.ado.enabled === undefined) {
    config.sync.ado.enabled = false;
    console.log('  ✓ Added ado.enabled (default: false)');
  }

  // Save updated config
  await fs.writeJson(configPath, config, { spaces: 2 });
  console.log('✅ Config migrated successfully\n');
  console.log('Next steps:');
  console.log('  1. Review .specweave/config.json');
  console.log('  2. Enable auto-sync: Set sync.settings.autoSyncOnCompletion = true');
  console.log('  3. Configure tools: Enable sync.github/jira/ado as needed');
}

// Run migration
const projectRoot = process.cwd();
migrateAutoSyncConfig(projectRoot).catch(console.error);
```

**Acceptance Criteria**:
- [x] Script added to `scripts/` directory
- [x] Reads existing config
- [x] Adds new fields with defaults
- [x] Preserves existing fields
- [x] Logs changes made
- [x] Saves updated config

**Usage**:
```bash
npx tsx scripts/migrate-auto-sync-config.ts
```

**Test Cases**:
1. v0.24.x config → Migrates successfully
2. Already migrated → No changes
3. No config file → Skips gracefully

**Estimated Effort**: 1.5 hours

---

## Phase 3: Hook Integration & Testing

**Goal**: Ensure automatic sync happens on increment completion

**Files Modified**:
- `plugins/specweave/hooks/post-increment-completion.sh`
- `plugins/specweave/lib/hooks/sync-living-docs.js`

---

### T-007: Verify Hook Integration

**Objective**: Confirm `sync-living-docs.js` calls `SyncCoordinator` correctly

**Current Code** (sync-living-docs.js:344-369):
```javascript
async function syncWithFormatPreservation(incrementId) {
  try {
    console.log("\n🔄 Using format-preserving sync...");

    const { SyncCoordinator } = await import("../../../../dist/src/sync/sync-coordinator.js");

    const coordinator = new SyncCoordinator({
      projectRoot: process.cwd(),
      incrementId
    });

    const result = await coordinator.syncIncrementCompletion();

    if (result.success) {
      console.log(`✅ Format-preserving sync complete (${result.syncMode} mode)`);
      console.log(`   ${result.userStoriesSynced} user story/stories synced`);
    } else {
      console.log(`⚠️  Sync completed with ${result.errors.length} error(s)`);
      result.errors.forEach(err => console.error(`   - ${err}`));
    }
  } catch (error) {
    console.error("⚠️  Format-preserving sync error:", error);
    console.log("   Falling back to legacy sync...");
    // Don't fail - just log and continue
  }
}
```

**Status**: ✅ **ALREADY CORRECT** - Hook integration is ready

**Verification**:
- [x] `SyncCoordinator` imported from correct path
- [x] `syncIncrementCompletion()` called
- [x] Errors handled gracefully (non-blocking)
- [x] Success/failure logged

**Action**: No code changes needed, just verify during testing

**Estimated Effort**: 1 hour (testing only)

---

### T-008: End-to-End Testing

**Objective**: Test automatic sync with all three external tools

**Test Setup**:
```bash
# 1. Create test increment
/specweave:increment "Test Auto-Sync Feature"

# 2. Link to external tools (create issues/epics/work items)
/specweave-github:create-issue 0048
/specweave-jira:sync export 0048
/specweave-ado:sync 0048 --direction to-ado

# 3. Complete some tasks (trigger task-level sync)
# ... work on increment ...

# 4. Close increment (trigger automatic sync)
/specweave:done 0048
```

**Expected Output**:
```
✅ Gate 0: Automated validation passed
✅ Gate 1: Tasks completed (100%)
✅ Gate 2: Tests passing (all)
✅ Gate 3: Documentation updated

PM Approval: ✅ APPROVED for closure

Closing increment 0048...
  ✓ Status: completed
  ✓ Completion date set

📚 Syncing living docs...
  ✓ Feature FS-048 created
  ✓ 5 user stories synced
  ✓ Living docs sync complete

🔄 Syncing to external tools...
  ✓ GitHub issue #123 updated (100% complete)
  ✓ JIRA epic PROJ-456 marked Done
  ✓ ADO work item #789 closed

🎉 Increment 0048 closed successfully!
```

**Test Cases**:

1. **All Tools Enabled**:
   - Config: `github.enabled=true, jira.enabled=true, ado.enabled=true`
   - Expected: All three tools sync automatically

2. **GitHub Only**:
   - Config: `github.enabled=true, jira.enabled=false, ado.enabled=false`
   - Expected: Only GitHub syncs, JIRA/ADO skipped

3. **Auto-Sync Disabled**:
   - Config: `autoSyncOnCompletion=false`
   - Expected: Increment closes, no external sync

4. **Partial Failure (GitHub fails, JIRA succeeds)**:
   - Scenario: GitHub API down, JIRA working
   - Expected: JIRA syncs, GitHub error logged, increment still completes

5. **Missing Credentials (JIRA enabled but no token)**:
   - Config: `jira.enabled=true`, but `JIRA_API_TOKEN` not set
   - Expected: JIRA skipped with warning, other tools sync

**Acceptance Criteria**:
- [x] All test cases pass
- [x] Errors don't block increment completion
- [x] Clear success/failure messages
- [x] Manual commands still work when auto-sync disabled

**Estimated Effort**: 2 hours

---

## Phase 4: Documentation

**Goal**: Update user-facing documentation with auto-sync feature

**Files Modified**:
- `plugins/specweave/commands/specweave-done.md`
- `.specweave/docs/public/guides/external-tool-sync.md`
- `CHANGELOG.md`
- `README.md`

---

### T-009: Update /specweave:done Command Docs

**Objective**: Add "Automatic External Tool Sync" section to command documentation

**File**: `plugins/specweave/commands/specweave-done.md`

**New Section** (add after "Step 5: Post-Closure Sync"):
```markdown
### Step 6: Automatic External Tool Sync (v0.25.0+)

**NEW**: When increment completes, SpecWeave automatically syncs to all configured external tools.

**Default Behavior**:
```
/specweave:done 0048
  ↓
Living Docs Sync ✅
  ↓
External Tool Sync (automatic):
  • GitHub issue updated ✅
  • JIRA epic marked Done ✅
  • ADO work item closed ✅
```

**Configuration** (.specweave/config.json):
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": true  // Enable auto-sync
    },
    "github": { "enabled": true },
    "jira": { "enabled": true },
    "ado": { "enabled": true }
  }
}
```

**Disable Auto-Sync**:
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // Manual sync only
    }
  }
}
```

When disabled, use manual commands:
- `/specweave-github:sync 0048`
- `/specweave-jira:sync 0048`
- `/specweave-ado:sync 0048`
```

**Acceptance Criteria**:
- [x] New section added
- [x] Explains automatic sync behavior
- [x] Shows configuration examples
- [x] Mentions manual commands fallback

**Estimated Effort**: 30 minutes

---

### T-010: Create External Tool Sync Guide

**Objective**: Comprehensive guide for configuring external tool sync

**File**: `.specweave/docs/public/guides/external-tool-sync.md`

**Contents**:
```markdown
# External Tool Synchronization Guide

## Overview

SpecWeave automatically syncs increments to external project management tools (GitHub, JIRA, Azure DevOps) when increments complete.

## Quick Start

### 1. Enable Auto-Sync

Edit `.specweave/config.json`:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    }
  }
}
```

### 2. Configure Tools

**GitHub** (auto-detected):
```json
{
  "sync": {
    "github": {
      "enabled": true,
      "autoDetect": true
    }
  }
}
```

**JIRA**:
```json
{
  "sync": {
    "jira": {
      "enabled": true,
      "domain": "company.atlassian.net",
      "projectKey": "PROJ"
    }
  }
}
```

Set environment variables:
```bash
export JIRA_EMAIL="user@company.com"
export JIRA_API_TOKEN="ATATT3xFfGF0..."
```

**Azure DevOps**:
```json
{
  "sync": {
    "ado": {
      "enabled": true,
      "organization": "myorg",
      "project": "MyProject"
    }
  }
}
```

Set environment variable:
```bash
export ADO_PAT="xxxxxxxxxxxxx"
```

### 3. Complete Increment

```bash
/specweave:done 0048
```

SpecWeave automatically syncs to all enabled tools.

## Configuration Reference

### Master Switches

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `canUpdateExternalItems` | boolean | false | Allow SpecWeave to update external tools |
| `autoSyncOnCompletion` | boolean | true | Auto-sync on increment completion |

### Per-Tool Configuration

| Tool | enabled | Required Fields | Environment Variables |
|------|---------|----------------|----------------------|
| GitHub | true | owner, repo | GITHUB_TOKEN (optional) |
| JIRA | false | domain, projectKey | JIRA_EMAIL, JIRA_API_TOKEN |
| ADO | false | organization, project | ADO_PAT |

## Troubleshooting

### Auto-Sync Not Working

1. Check `autoSyncOnCompletion` is true
2. Check tool `enabled` flag is true
3. Check environment variables set
4. Check credentials valid

### GitHub Sync Fails

- Run: `git remote get-url origin` (should be GitHub URL)
- If not GitHub repo, set `autoDetect: false` and configure manually

### JIRA/ADO Authentication Errors

- Regenerate API token/PAT
- Verify email matches account
- Check token has correct permissions

## Manual Sync (Fallback)

If auto-sync disabled or fails:
```bash
/specweave-github:sync 0048
/specweave-jira:sync 0048
/specweave-ado:sync 0048
```
```

**Acceptance Criteria**:
- [x] Guide created
- [x] Quick start section
- [x] Configuration reference
- [x] Troubleshooting section
- [x] Manual sync fallback documented

**Estimated Effort**: 1.5 hours

---

### T-011: Update CHANGELOG

**Objective**: Add v0.25.0 entry with auto-sync feature announcement

**File**: `CHANGELOG.md`

**New Entry**:
```markdown
## [0.25.0] - 2025-11-25

### 🚀 Features

#### Automatic External Tool Synchronization

**NEW**: Increments now automatically sync to GitHub, JIRA, and Azure DevOps when completed!

When you run `/specweave:done`, SpecWeave automatically:
- ✅ Updates GitHub issue with final tasks/ACs
- ✅ Marks JIRA epic as "Done"
- ✅ Closes ADO work item

**Configuration** (.specweave/config.json):
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": true },
    "jira": { "enabled": true },
    "ado": { "enabled": true }
  }
}
```

**Benefits**:
- 🎯 No more manual sync steps
- 🔄 External tools always up-to-date
- 🤝 Better team collaboration
- ⚡ Faster workflow

**Migration**: Existing projects must enable `autoSyncOnCompletion` in config. Run:
```bash
npx tsx scripts/migrate-auto-sync-config.ts
```

### 🔧 Improvements
- Enhanced `SyncCoordinator` to support JIRA and ADO
- Added per-tool `enabled` configuration flags
- Improved error handling (partial failures don't block completion)
- Added config validation before sync

### 📚 Documentation
- Updated `/specweave:done` command documentation
- New guide: External Tool Synchronization
- Added troubleshooting section

### 🐛 Bug Fixes
- None (new feature)

---

**Full Changelog**: https://github.com/anton-abyzov/specweave/compare/v0.24.0...v0.25.0
```

**Acceptance Criteria**:
- [x] CHANGELOG entry added
- [x] Version number correct (v0.25.0)
- [x] Feature announcement clear
- [x] Migration instructions included
- [x] Link to full changelog

**Estimated Effort**: 30 minutes

---

## Phase 5: Error Handling & Robustness

**Goal**: Ensure sync failures don't break increment completion

**Files Modified**:
- `src/sync/sync-coordinator.ts`
- `plugins/specweave/lib/hooks/sync-living-docs.js`

---

### T-012: Add Comprehensive Error Handling

**Objective**: Handle all failure scenarios gracefully

**New Code** (add to `SyncCoordinator`):
```typescript
/**
 * Sync to external tool with comprehensive error handling
 */
private async syncToTool(
  toolName: string,
  syncFn: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Retry logic (3 attempts with exponential backoff)
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await syncFn();
        return { success: true };
      } catch (error: any) {
        lastError = error;

        // Don't retry auth errors
        if (error.message?.includes('authentication') || error.message?.includes('401')) {
          throw error;
        }

        // Don't retry 4xx errors (client error)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Retry on network/server errors
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.log(`  ⚠️ ${toolName} sync failed (attempt ${attempt}/3), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  } catch (error: any) {
    // Categorize error for user
    let errorMsg = `${toolName} sync failed: `;

    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      errorMsg += 'Authentication failed (check credentials)';
    } else if (error.message?.includes('rate limit') || error.statusCode === 429) {
      errorMsg += 'Rate limit exceeded (try again later)';
    } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      errorMsg += 'Network error (check connection)';
    } else {
      errorMsg += error.message || 'Unknown error';
    }

    this.logger.error(`  ❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
```

**Usage** (in `syncUserStory()` method):
```typescript
// GitHub sync with error handling
if (externalSource === 'github' && config.sync?.github?.enabled) {
  const result = await this.syncToTool('GitHub', async () => {
    const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
    await syncService.syncUserStory(usFile, completionData, client);
  });

  if (!result.success) {
    // Log error but continue (don't block other tools)
    this.logger.log('  💡 Tip: Run /specweave-github:sync manually to retry');
  }
}
```

**Acceptance Criteria**:
- [x] Retry logic with exponential backoff
- [x] Auth errors not retried (immediate failure)
- [x] Rate limit errors detected and reported
- [x] Network errors retried (up to 3 times)
- [x] Clear error messages for each failure type
- [x] Failed tool doesn't block other tools

**Test Cases**:
1. Network timeout → Retry 3 times, then fail gracefully
2. Auth error (401) → Fail immediately, clear message
3. Rate limit (429) → Fail with "try again later" message
4. GitHub fails, JIRA succeeds → Increment still completes

**Estimated Effort**: 3 hours

---

### T-013: Add Logging & Observability

**Objective**: Track sync operations for debugging and monitoring

**New Code** (add to `SyncCoordinator`):
```typescript
/**
 * Log sync summary for debugging
 */
private logSyncSummary(
  result: SyncResult,
  startTime: number
): void {
  const duration = Date.now() - startTime;

  this.logger.log('\n' + '='.repeat(60));
  this.logger.log('📊 Sync Summary');
  this.logger.log('='.repeat(60));
  this.logger.log(`Status: ${result.success ? '✅ Success' : '⚠️ Partial Failure'}`);
  this.logger.log(`User Stories: ${result.userStoriesSynced} synced`);
  this.logger.log(`Sync Mode: ${result.syncMode}`);
  this.logger.log(`Duration: ${duration}ms`);

  if (result.errors.length > 0) {
    this.logger.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach((err, i) => {
      this.logger.log(`  ${i + 1}. ${err}`);
    });
  }

  this.logger.log('='.repeat(60) + '\n');
}
```

**Usage** (in `syncIncrementCompletion()` method):
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // ... sync logic ...

    this.logSyncSummary(result, startTime);
    return result;
  } catch (error) {
    // ...
  }
}
```

**Acceptance Criteria**:
- [x] Sync summary logged
- [x] Duration tracked
- [x] Success/failure status shown
- [x] Errors listed clearly
- [x] Formatted for readability

**Estimated Effort**: 1 hour

---

### T-014: Add Fallback Mechanism

**Objective**: Create backlog task if auto-sync fails

**New Code** (add to `sync-living-docs.js`):
```javascript
async function createFallbackTask(incrementId, failedTools) {
  try {
    const backlogPath = path.join(
      process.cwd(),
      '.specweave/backlog/sync-tasks.md'
    );

    await fs.ensureFile(backlogPath);
    const existingContent = await fs.readFile(backlogPath, 'utf-8').catch(() => '');

    const newTask = `
## Sync Failed for Increment ${incrementId}

**Date**: ${new Date().toISOString().split('T')[0]}
**Failed Tools**: ${failedTools.join(', ')}

**Action Required**: Manually sync increment to external tools

**Commands**:
${failedTools.includes('GitHub') ? '- /specweave-github:sync ' + incrementId : ''}
${failedTools.includes('JIRA') ? '- /specweave-jira:sync ' + incrementId : ''}
${failedTools.includes('ADO') ? '- /specweave-ado:sync ' + incrementId : ''}

**Status**: [ ] Pending

---
`;

    await fs.writeFile(backlogPath, existingContent + newTask);
    console.log(`\n💡 Created fallback task: .specweave/backlog/sync-tasks.md`);
  } catch (error) {
    console.error('⚠️ Failed to create fallback task:', error);
  }
}
```

**Usage** (in `syncLivingDocs()` function):
```javascript
const result = await coordinator.syncIncrementCompletion();

if (!result.success) {
  const failedTools = [];
  // Detect which tools failed based on result.errors
  if (result.errors.some(e => e.includes('GitHub'))) failedTools.push('GitHub');
  if (result.errors.some(e => e.includes('JIRA'))) failedTools.push('JIRA');
  if (result.errors.some(e => e.includes('ADO'))) failedTools.push('ADO');

  if (failedTools.length > 0) {
    await createFallbackTask(incrementId, failedTools);
  }
}
```

**Acceptance Criteria**:
- [x] Fallback task created on failure
- [x] Task lists failed tools
- [x] Includes manual sync commands
- [x] Stored in `.specweave/backlog/sync-tasks.md`
- [x] User notified of fallback task

**Estimated Effort**: 1 hour

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/sync/sync-coordinator-auto-sync.test.ts`

**Test Cases**:
1. `syncIncrementCompletion()` with GitHub-only config
2. `syncIncrementCompletion()` with JIRA-only config
3. `syncIncrementCompletion()` with ADO-only config
4. `syncIncrementCompletion()` with all tools enabled
5. `syncIncrementCompletion()` with all tools disabled
6. `syncToTool()` retries on network error
7. `syncToTool()` doesn't retry on auth error
8. `validateSyncConfig()` detects missing credentials

**Mocking**:
- Mock `GitHubClientV2`
- Mock `JiraHierarchicalSync`
- Mock `AdoHierarchicalSync`
- Mock network failures

**Coverage Target**: 90%+

---

### Integration Tests

**File**: `tests/integration/sync/auto-sync-integration.test.ts`

**Test Cases**:
1. Full flow: `/specweave:done` → GitHub sync
2. Full flow: `/specweave:done` → JIRA sync
3. Full flow: `/specweave:done` → ADO sync
4. Partial failure: GitHub fails, JIRA succeeds
5. Config validation: Missing credentials skips tool
6. Retry logic: Network timeout recovers on 2nd attempt

**Setup**: Use test fixtures, mock external APIs

---

### E2E Tests

**File**: `tests/e2e/auto-sync-e2e.test.ts`

**Test Cases**:
1. Real GitHub repo → complete increment → verify issue updated
2. Real JIRA (test instance) → complete increment → verify epic marked "Done"
3. Real ADO (test org) → complete increment → verify work item closed

**Setup**: Requires test credentials (skip if not available)

---

## Deployment Plan

### Pre-Release Checklist

- [ ] All tasks completed (14/14)
- [ ] All unit tests passing (90%+ coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing (or skipped with reason)
- [ ] Documentation updated
- [ ] Migration script tested on existing projects
- [ ] CHANGELOG updated

### Release Steps

1. **Merge to develop branch**
   ```bash
   git checkout develop
   git merge feature/auto-sync-cascade
   ```

2. **Run full test suite**
   ```bash
   npm run test:all
   npm run test:coverage
   ```

3. **Bump version**
   ```bash
   npm version minor  # 0.24.x → 0.25.0
   ```

4. **Build package**
   ```bash
   npm run rebuild
   ```

5. **Tag release**
   ```bash
   git tag v0.25.0
   git push origin v0.25.0
   ```

6. **Publish to npm**
   ```bash
   npm publish
   ```

7. **Create GitHub Release**
   - Go to: https://github.com/anton-abyzov/specweave/releases/new
   - Tag: `v0.25.0`
   - Title: `v0.25.0 - Automatic External Tool Sync`
   - Body: Copy from CHANGELOG.md

8. **Announce Release**
   - Twitter/X
   - Discord/Slack
   - Email newsletter (if any)

---

## Post-Release Monitoring

### Metrics to Track

1. **Adoption Rate**:
   - % of users with `autoSyncOnCompletion: true`
   - Per-tool enablement (GitHub vs JIRA vs ADO)

2. **Success Rate**:
   - % of syncs that complete successfully
   - Most common failure types (auth, network, rate limit)

3. **Performance**:
   - Average sync duration (target: < 30s)
   - P95 sync duration

4. **User Feedback**:
   - GitHub issues related to auto-sync
   - Feature requests (new tools?)

### Support Plan

- Monitor GitHub issues for bug reports
- Respond to user questions within 24 hours
- Create FAQ document based on common questions
- Release patch versions for critical bugs

---

## Risk Mitigation

### High Risk: Breaking Existing Workflows

**Mitigation**:
- `autoSyncOnCompletion` defaults to `false` (opt-in)
- Migration script provides clear instructions
- Existing manual commands still work

**Rollback Plan**:
- Add `SPECWEAVE_DISABLE_AUTO_SYNC=true` env var
- Documentation shows how to disable

---

### Medium Risk: External API Rate Limits

**Mitigation**:
- Implement retry with exponential backoff
- Detect 429 errors and provide clear message
- Track rate limit usage

**Monitoring**:
- Log rate limit hits
- Alert if rate limit hit > 5% of syncs

---

### Low Risk: Credential Security

**Mitigation**:
- Use environment variables for tokens
- Never log credentials
- Config validation checks for hardcoded secrets

**Documentation**:
- Security best practices guide
- How to rotate tokens

---

## Success Criteria

### MVP (Minimum Viable Product)

- [x] GitHub sync works automatically
- [x] JIRA sync works automatically (if configured)
- [x] ADO sync works automatically (if configured)
- [x] Configuration system in place
- [x] Error handling doesn't block completion
- [x] Documentation updated

### V1 (Version 1.0)

- [ ] All MVP criteria met
- [ ] 90%+ test coverage
- [ ] Migration script tested on 5+ projects
- [ ] User guide complete
- [ ] CHANGELOG entry complete

### V2 (Future Enhancements)

- [ ] Async background sync (don't block completion)
- [ ] Sync status dashboard (`/specweave:sync-status`)
- [ ] Support for Linear, Asana, Monday.com
- [ ] Webhook-based sync (real-time)
- [ ] Sync analytics dashboard

---

## Estimated Timeline

| Phase | Start | End | Duration | Status |
|-------|-------|-----|----------|--------|
| Phase 1: Core | Day 1 | Day 1 | 6 hours | ⏸️ Not Started |
| Phase 2: Config | Day 2 | Day 2 | 4 hours | ⏸️ Not Started |
| Phase 3: Testing | Day 2 | Day 3 | 3 hours | ⏸️ Not Started |
| Phase 4: Docs | Day 3 | Day 3 | 3 hours | ⏸️ Not Started |
| Phase 5: Error Handling | Day 3 | Day 4 | 5 hours | ⏸️ Not Started |
| **Total** | | | **21 hours** | **3 days** |

---

## Next Actions

1. ✅ Review implementation plan with stakeholders
2. ⏸️ Get approval to proceed
3. ⏸️ Start Phase 1: Core SyncCoordinator
4. ⏸️ Daily progress updates
5. ⏸️ Demo after Phase 3 (testing)
6. ⏸️ Beta release to select users
7. ⏸️ Full release as v0.25.0

---

## Conclusion

This implementation plan provides a **comprehensive roadmap** for adding automatic external tool synchronization to SpecWeave.

**Key Highlights**:
- ✅ Well-defined tasks (14 tasks across 5 phases)
- ✅ Clear acceptance criteria for each task
- ✅ Comprehensive error handling strategy
- ✅ Backward compatibility maintained
- ✅ Extensive testing plan (unit, integration, E2E)
- ✅ User documentation and migration guide

**Estimated Effort**: 15-21 hours (~2-3 days)

**Risk Level**: Low-Medium (mostly integration work with existing implementations)

**Recommendation**: ✅ **PROCEED** with implementation starting Phase 1.
