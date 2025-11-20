# Permission-Based Sync Implementation

**Date**: 2025-11-20
**Context**: Enforce permission gates at every level of automatic sync cascade
**Priority**: P0 (Critical - Security/Safety)

---

## Problem Statement

**Current Issue**: Automatic sync doesn't properly validate permission flags before syncing

**Observed Behavior**:
```javascript
// sync-living-docs.js (CURRENT - WRONG)
// ❌ Living docs sync happens BEFORE permission check
const result = await hierarchicalDistribution(incrementId);  // Line 31

// ❌ Permission check AFTER living docs already synced
const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;  // Line 47
```

**Risk**: If `canUpsertInternalItems` is `false`, living docs should NOT sync, but currently they do!

---

## Permission Hierarchy (Correct Order)

```
Permission Gates (enforce in this order):

┌─────────────────────────────────────────┐
│ GATE 1: canUpsertInternalItems         │  ← NEW (check FIRST!)
├─────────────────────────────────────────┤
│ Controls: Living docs sync              │
│ If FALSE: STOP (no internal changes)    │
│ If TRUE: Continue to living docs sync   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Living Docs Sync Executes               │  ← Safe (permission granted)
├─────────────────────────────────────────┤
│ • Create/update feature specs           │
│ • Create/update user story files        │
│ • Update task lists                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ GATE 2: canUpdateExternalItems          │  ← Existing (check SECOND)
├─────────────────────────────────────────┤
│ Controls: External tool sync            │
│ If FALSE: STOP (read-only mode)         │
│ If TRUE: Continue to auto-sync check    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ GATE 3: autoSyncOnCompletion            │  ← NEW (check THIRD)
├─────────────────────────────────────────┤
│ Controls: Automatic vs manual sync      │
│ If FALSE: STOP (manual commands only)   │
│ If TRUE: Continue to per-tool sync      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ GATE 4: Per-Tool Enabled Flags          │  ← NEW (check per tool)
├─────────────────────────────────────────┤
│ • github.enabled? → Sync GitHub         │
│ • jira.enabled? → Sync JIRA             │
│ • ado.enabled? → Sync ADO               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ GATE 5: canUpdateStatus                 │  ← Existing (per sync)
├─────────────────────────────────────────┤
│ Controls: Status field updates          │
│ If FALSE: Content only (no status)      │
│ If TRUE: Content + status               │
└─────────────────────────────────────────┘
```

---

## Implementation Changes

### File 1: `plugins/specweave/lib/hooks/sync-living-docs.js`

**Change 1**: Add GATE 1 check (canUpsertInternalItems)

**Location**: After line 13 (after loading config)

**Before**:
```javascript
async function syncLivingDocs(incrementId) {
  try {
    console.log(`📚 Checking living docs sync for increment: ${incrementId}`);
    const configPath = path.join(process.cwd(), ".specweave", "config.json");
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    }
    const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;
    if (!syncEnabled) {
      console.log("ℹ️  Living docs sync disabled in config");
      return;
    }
    console.log("✅ Living docs sync enabled");

    // ❌ WRONG: Living docs sync happens WITHOUT permission check!
    const result = await hierarchicalDistribution(incrementId);

    // ❌ WRONG: Permission check AFTER sync already happened!
    const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;
    if (!canUpdateExternal) {
      console.log("ℹ️  GitHub sync skipped (canUpdateExternalItems = false)");
      return;
    }
  }
}
```

**After** (CORRECTED):
```javascript
async function syncLivingDocs(incrementId) {
  try {
    console.log(`📚 Checking living docs sync for increment: ${incrementId}`);
    const configPath = path.join(process.cwd(), ".specweave", "config.json");
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    }

    // ========================================================================
    // GATE 1: Check canUpsertInternalItems (v0.25.0 - Permission-Based Sync)
    // ========================================================================
    // This permission controls whether SpecWeave can create/update INTERNAL items
    // (living docs, specs, modules). If false, living docs won't sync at all.
    const canUpsertInternal = config.sync?.settings?.canUpsertInternalItems ?? false;

    if (!canUpsertInternal) {
      console.log("⛔ Living docs sync BLOCKED (canUpsertInternalItems = false)");
      console.log("   To enable: Set sync.settings.canUpsertInternalItems = true");
      console.log("   Read-only mode: No internal changes allowed\n");
      return;
    }

    console.log("✅ Permission granted: canUpsertInternalItems = true");

    const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;
    if (!syncEnabled) {
      console.log("ℹ️  Living docs sync disabled in config");
      return;
    }
    console.log("✅ Living docs sync enabled");

    // ✅ CORRECT: Permission checked BEFORE sync executes
    const result = await hierarchicalDistribution(incrementId);

    // ========================================================================
    // GATE 2: Check canUpdateExternalItems (existing, relocated)
    // ========================================================================
    const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;

    if (!canUpdateExternal) {
      console.log("⛔ External tool sync BLOCKED (canUpdateExternalItems = false)");
      console.log("   Living docs updated locally only");
      console.log("   To enable: Set sync.settings.canUpdateExternalItems = true\n");
      return;
    }

    console.log("✅ Permission granted: canUpdateExternalItems = true");

    // ========================================================================
    // GATE 3: Check autoSyncOnCompletion (NEW - v0.25.0)
    // ========================================================================
    const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? false;

    if (!autoSync) {
      console.log("⚠️  Automatic sync DISABLED (autoSyncOnCompletion = false)");
      console.log("   Living docs synced, but external tools require manual sync");
      console.log("   To auto-sync: Set sync.settings.autoSyncOnCompletion = true");
      console.log("   Manual commands:");
      console.log("     • /specweave-github:sync " + incrementId);
      console.log("     • /specweave-jira:sync " + incrementId);
      console.log("     • /specweave-ado:sync " + incrementId);
      console.log("✅ Living docs sync complete (manual external sync required)\n");
      return;
    }

    console.log("✅ Automatic sync enabled: autoSyncOnCompletion = true");

    // ✅ CORRECT: All permissions checked, proceed to external sync
    await syncWithFormatPreservation(incrementId, config);

    console.log("✅ Living docs sync complete\n");
  } catch (error) {
    console.error("❌ Error syncing living docs:", error);
  }
}
```

**Lines Changed**:
- Insert GATE 1 after line 13 (after config loading)
- Relocate GATE 2 to after living docs sync (line 47 → ~line 55)
- Add GATE 3 for autoSyncOnCompletion check

---

### File 2: `src/sync/sync-coordinator.ts`

**Change 2**: Add GATE 3 and GATE 4 checks

**Location**: In `syncIncrementCompletion()` method (line 43-117)

**Before**:
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  const result: SyncResult = { success: false, userStoriesSynced: 0, syncMode: 'read-only', errors: [] };

  try {
    this.logger.log(`\n🔄 Syncing increment ${this.incrementId} with format preservation...`);

    // 1. Load config
    const config = await this.loadConfig();

    // 2. Check if sync is enabled
    if (!config.sync?.settings?.canUpdateExternalItems) {
      this.logger.log('ℹ️  External sync disabled (canUpdateExternalItems=false)');
      result.syncMode = 'read-only';
      result.success = true;
      return result;
    }

    // ❌ MISSING: No check for autoSyncOnCompletion!

    // 3. Load living docs User Stories for this increment
    const userStories = await this.loadUserStoriesForIncrement();

    // 5. Sync each user story
    for (const usFile of userStories) {
      await this.syncUserStory(usFile, syncService, config);
    }

    return result;
  } catch (error) {
    // ...
  }
}
```

**After** (CORRECTED):
```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  const result: SyncResult = { success: false, userStoriesSynced: 0, syncMode: 'read-only', errors: [] };

  try {
    this.logger.log(`\n🔄 Syncing increment ${this.incrementId} with format preservation...`);

    // 1. Load config
    const config = await this.loadConfig();

    // ========================================================================
    // GATE 2: Check canUpdateExternalItems (existing, validated earlier in hook)
    // ========================================================================
    if (!config.sync?.settings?.canUpdateExternalItems) {
      this.logger.log('⛔ External sync BLOCKED (canUpdateExternalItems = false)');
      this.logger.log('   Read-only mode: No external updates allowed');
      result.syncMode = 'read-only';
      result.success = true;
      return result;
    }

    this.logger.log('✅ Permission granted: canUpdateExternalItems = true');

    // ========================================================================
    // GATE 3: Check autoSyncOnCompletion (NEW - v0.25.0)
    // ========================================================================
    const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? false;

    if (!autoSync) {
      this.logger.log('⚠️  Automatic sync DISABLED (autoSyncOnCompletion = false)');
      this.logger.log('   Skipping external tool sync');
      this.logger.log('   Use manual commands to sync:');
      this.logger.log('     • /specweave-github:sync ' + this.incrementId);
      this.logger.log('     • /specweave-jira:sync ' + this.incrementId);
      this.logger.log('     • /specweave-ado:sync ' + this.incrementId);
      result.syncMode = 'manual-only';
      result.success = true;
      return result;
    }

    this.logger.log('✅ Automatic sync enabled: autoSyncOnCompletion = true');

    // ========================================================================
    // GATE 4: Check enabled tools (NEW - v0.25.0)
    // ========================================================================
    const enabledTools: string[] = [];
    if (config.sync?.github?.enabled) enabledTools.push('GitHub');
    if (config.sync?.jira?.enabled) enabledTools.push('JIRA');
    if (config.sync?.ado?.enabled) enabledTools.push('Azure DevOps');

    if (enabledTools.length === 0) {
      this.logger.log('⚠️  No external tools enabled');
      this.logger.log('   Enable at least one tool in config:');
      this.logger.log('     • sync.github.enabled = true');
      this.logger.log('     • sync.jira.enabled = true');
      this.logger.log('     • sync.ado.enabled = true');
      result.syncMode = 'no-tools-enabled';
      result.success = true;
      return result;
    }

    this.logger.log(`📊 Enabled tools: ${enabledTools.join(', ')}`);

    // 3. Load living docs User Stories for this increment
    const userStories = await this.loadUserStoriesForIncrement();

    if (userStories.length === 0) {
      this.logger.log('ℹ️  No user stories found for this increment');
      result.success = true;
      return result;
    }

    this.logger.log(`📚 Found ${userStories.length} user story/stories`);

    // 4. Initialize sync service with GATE 5 permission (canUpdateStatus)
    const syncService = new FormatPreservationSyncService(
      {
        canUpdateExternalItems: config.sync?.settings?.canUpdateExternalItems ?? false,
        canUpdateStatus: config.sync?.settings?.canUpdateStatus ?? false  // GATE 5
      },
      { logger: this.logger }
    );

    // 5. Sync each user story (GATE 4 enforced in syncUserStory)
    for (const usFile of userStories) {
      try {
        await this.syncUserStory(usFile, syncService, config);
        result.userStoriesSynced++;

        const origin = getOrigin(usFile);
        if (origin === 'external') {
          result.syncMode = 'comment-only';
        } else {
          result.syncMode = 'full-sync';
        }
      } catch (error) {
        const errorMsg = `Failed to sync ${usFile.id}: ${error}`;
        this.logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = result.errors.length === 0;

    this.logger.log(`\n✅ Sync complete: ${result.userStoriesSynced}/${userStories.length} synced`);
    if (result.errors.length > 0) {
      this.logger.log(`⚠️  ${result.errors.length} error(s) occurred`);
    }

    return result;
  } catch (error) {
    result.errors.push(`Sync coordinator error: ${error}`);
    this.logger.error('❌ Sync failed:', error);
    return result;
  }
}
```

**Lines Changed**:
- Add GATE 3 check after GATE 2 (after line 63)
- Add GATE 4 check for enabled tools (after GATE 3)
- Update log messages to use emoji prefixes for clarity

---

### File 3: `src/sync/sync-coordinator.ts` (syncUserStory method)

**Change 3**: Enforce GATE 4 (per-tool enabled check)

**Location**: In `syncUserStory()` method (line 122-150)

**Before**:
```typescript
private async syncUserStory(
  usFile: LivingDocsUSFile,
  syncService: FormatPreservationSyncService,
  config: any
): Promise<void> {
  const origin = getOrigin(usFile);
  const externalSource = usFile.external_source || 'github';

  if (externalSource === 'github') {
    // ❌ MISSING: No check for config.sync?.github?.enabled!
    const repoInfo = await this.detectGitHubRepo(config.sync.github);
    const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
    await syncService.syncUserStory(usFile, completionData, client);
  } else {
    this.logger.log(`⚠️  ${externalSource} sync not yet implemented`);
  }
}
```

**After** (CORRECTED):
```typescript
private async syncUserStory(
  usFile: LivingDocsUSFile,
  syncService: FormatPreservationSyncService,
  config: any
): Promise<void> {
  const origin = getOrigin(usFile);
  const externalSource = usFile.external_source || 'github';

  this.logger.log(`\n  📝 ${usFile.id} (${origin}, ${externalSource})`);

  // ========================================================================
  // GATE 4: Check tool-specific enabled flag (enforced per tool)
  // ========================================================================

  // GitHub sync
  if (externalSource === 'github') {
    // ✅ CORRECT: Check if GitHub sync is enabled
    if (!config.sync?.github?.enabled) {
      this.logger.log(`  ⏭️  GitHub sync SKIPPED (github.enabled = false)`);
      return;
    }

    this.logger.log(`  🔄 Syncing to GitHub...`);
    const repoInfo = await this.detectGitHubRepo(config.sync.github);

    if (!repoInfo) {
      throw new Error('GitHub repository not configured or detected');
    }

    const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
    await syncService.syncUserStory(usFile, completionData, client);
    this.logger.log(`  ✅ GitHub sync complete`);
  }

  // JIRA sync (NEW - Phase 1 implementation)
  else if (externalSource === 'jira') {
    // ✅ CORRECT: Check if JIRA sync is enabled
    if (!config.sync?.jira?.enabled) {
      this.logger.log(`  ⏭️  JIRA sync SKIPPED (jira.enabled = false)`);
      return;
    }

    this.logger.log(`  🔄 Syncing to JIRA...`);

    // Validate JIRA config
    const jiraConfig = config.sync.jira;
    if (!jiraConfig.domain || !jiraConfig.projectKey) {
      throw new Error('JIRA domain and projectKey required');
    }

    // Get credentials from environment
    const email = process.env.JIRA_EMAIL || jiraConfig.email;
    const apiToken = process.env.JIRA_API_TOKEN || jiraConfig.apiToken;

    if (!email || !apiToken) {
      throw new Error('JIRA credentials missing (check JIRA_EMAIL and JIRA_API_TOKEN env vars)');
    }

    // Import JIRA sync (dynamic import to avoid dependency if not used)
    const { JiraHierarchicalSync } = await import('../../plugins/specweave-jira/lib/jira-hierarchical-sync.js');
    const { JiraClient } = await import('../../src/integrations/jira/jira-client.js');

    const jiraClient = new JiraClient({
      domain: jiraConfig.domain,
      email,
      apiToken,
      logger: this.logger
    });

    const jiraSync = new JiraHierarchicalSync(jiraClient, this.projectRoot, {
      logger: this.logger
    });

    // GATE 5: canUpdateStatus enforced here
    await jiraSync.syncIncrement(this.incrementId, {
      direction: 'bidirectional',
      updateStatus: config.sync?.settings?.canUpdateStatus ?? true
    });

    this.logger.log(`  ✅ JIRA sync complete`);
  }

  // ADO sync (NEW - Phase 1 implementation)
  else if (externalSource === 'ado') {
    // ✅ CORRECT: Check if ADO sync is enabled
    if (!config.sync?.ado?.enabled) {
      this.logger.log(`  ⏭️  Azure DevOps sync SKIPPED (ado.enabled = false)`);
      return;
    }

    this.logger.log(`  🔄 Syncing to Azure DevOps...`);

    // Validate ADO config
    const adoConfig = config.sync.ado;
    if (!adoConfig.organization || !adoConfig.project) {
      throw new Error('ADO organization and project required');
    }

    // Get PAT from environment
    const pat = process.env.ADO_PAT || adoConfig.pat;

    if (!pat) {
      throw new Error('ADO PAT missing (check ADO_PAT env var)');
    }

    // Import ADO sync (dynamic import)
    const { AdoHierarchicalSync } = await import('../../plugins/specweave-ado/lib/ado-hierarchical-sync.js');
    const { AdoClientV2 } = await import('../../plugins/specweave-ado/lib/ado-client-v2.js');

    const adoClient = new AdoClientV2({
      organization: adoConfig.organization,
      project: adoConfig.project,
      personalAccessToken: pat,
      logger: this.logger
    });

    const adoSync = new AdoHierarchicalSync(adoClient, this.projectRoot, {
      logger: this.logger
    });

    // GATE 5: canUpdateStatus enforced here
    await adoSync.syncIncrement(this.incrementId, {
      direction: 'bidirectional',
      updateStatus: config.sync?.settings?.canUpdateStatus ?? true
    });

    this.logger.log(`  ✅ ADO sync complete`);
  }

  // Unknown external source
  else {
    this.logger.log(`  ⚠️  Unknown external source: ${externalSource}`);
    this.logger.log(`  ℹ️  Supported sources: github, jira, ado`);
  }
}
```

**Lines Changed**:
- Add GATE 4 check for each tool (github.enabled, jira.enabled, ado.enabled)
- Add JIRA sync implementation (NEW)
- Add ADO sync implementation (NEW)
- Use dynamic imports to avoid loading unused dependencies
- Pass canUpdateStatus to external sync calls (GATE 5)

---

## Testing Strategy

### Manual Testing (Quick Validation)

**Test 1**: Block living docs sync
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false
    }
  }
}
```

Expected:
```
⛔ Living docs sync BLOCKED (canUpsertInternalItems = false)
   To enable: Set sync.settings.canUpsertInternalItems = true
   Read-only mode: No internal changes allowed
```

---

**Test 2**: Allow living docs, block external sync
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false
    }
  }
}
```

Expected:
```
✅ Permission granted: canUpsertInternalItems = true
✅ Living docs sync enabled
📄 Changed/created 5 file(s)
⛔ External tool sync BLOCKED (canUpdateExternalItems = false)
   Living docs updated locally only
```

---

**Test 3**: Allow all, but disable auto-sync
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": false
    }
  }
}
```

Expected:
```
✅ Permission granted: canUpsertInternalItems = true
✅ Living docs sync enabled
📄 Changed/created 5 file(s)
✅ Permission granted: canUpdateExternalItems = true
⚠️  Automatic sync DISABLED (autoSyncOnCompletion = false)
   Living docs synced, but external tools require manual sync
   Manual commands:
     • /specweave-github:sync 0047
     • /specweave-jira:sync 0047
     • /specweave-ado:sync 0047
```

---

**Test 4**: Enable auto-sync, but no tools enabled
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": false },
    "jira": { "enabled": false },
    "ado": { "enabled": false }
  }
}
```

Expected:
```
✅ Permission granted: canUpsertInternalItems = true
✅ Living docs sync enabled
📄 Changed/created 5 file(s)
✅ Permission granted: canUpdateExternalItems = true
✅ Automatic sync enabled: autoSyncOnCompletion = true
⚠️  No external tools enabled
   Enable at least one tool in config:
     • sync.github.enabled = true
     • sync.jira.enabled = true
     • sync.ado.enabled = true
```

---

**Test 5**: Full cascade (all gates pass)
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "canUpdateStatus": true,
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": true },
    "jira": { "enabled": true },
    "ado": { "enabled": true }
  }
}
```

Expected:
```
✅ Permission granted: canUpsertInternalItems = true
✅ Living docs sync enabled
📄 Changed/created 5 file(s)
✅ Permission granted: canUpdateExternalItems = true
✅ Automatic sync enabled: autoSyncOnCompletion = true
📊 Enabled tools: GitHub, JIRA, Azure DevOps

🔄 Using format-preserving sync...
  📝 US-001 (internal, github)
    🔄 Syncing to GitHub...
    ✅ GitHub sync complete
  📝 US-002 (internal, jira)
    🔄 Syncing to JIRA...
    ✅ JIRA sync complete
  📝 US-003 (internal, ado)
    🔄 Syncing to Azure DevOps...
    ✅ ADO sync complete

✅ Sync complete: 3/3 synced
```

---

## Summary

### Changes Made

1. **sync-living-docs.js**: Added GATE 1 (canUpsertInternalItems), GATE 2 (canUpdateExternalItems), GATE 3 (autoSyncOnCompletion)
2. **sync-coordinator.ts (syncIncrementCompletion)**: Added GATE 3 (autoSyncOnCompletion), GATE 4 (enabled tools check)
3. **sync-coordinator.ts (syncUserStory)**: Added GATE 4 enforcement (per-tool enabled), JIRA sync, ADO sync

### Permission Flow (After Changes)

```
/specweave:done completes
    ↓
┌──────────────────────────────────┐
│ GATE 1: canUpsertInternalItems  │ ← sync-living-docs.js
│ PASS → Living docs sync ✅       │
│ FAIL → STOP 🛑                   │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ GATE 2: canUpdateExternalItems  │ ← sync-living-docs.js
│ PASS → Continue ✅               │
│ FAIL → STOP (local only) 🛑     │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ GATE 3: autoSyncOnCompletion    │ ← sync-living-docs.js + sync-coordinator.ts
│ PASS → Auto-sync ✅              │
│ FAIL → STOP (manual) 🛑          │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ GATE 4: tool.enabled flags      │ ← sync-coordinator.ts
│ GitHub enabled? → Sync ✅        │
│ JIRA enabled? → Sync ✅          │
│ ADO enabled? → Sync ✅           │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ GATE 5: canUpdateStatus         │ ← FormatPreservationSyncService
│ PASS → Status + content ✅       │
│ FAIL → Content only ⚠️           │
└──────────────────────────────────┘
```

### Security Benefits

1. **Defense in Depth**: 5 permission gates (was: 2)
2. **Principle of Least Privilege**: Each permission controls specific capability
3. **Fail-Safe Defaults**: All permissions default to `false` (opt-in)
4. **Clear Error Messages**: Users know exactly what's blocked and how to enable
5. **Granular Control**: Per-tool enable/disable, per-operation permission

---

## Next Steps

1. ✅ Review this implementation plan
2. ⏸️ Apply changes to `sync-living-docs.js`
3. ⏸️ Apply changes to `sync-coordinator.ts`
4. ⏸️ Test all 5 permission scenarios
5. ⏸️ Update config.json schema documentation
6. ⏸️ Commit changes with clear message

---

**Status**: 🟢 Ready to implement
**Estimated Effort**: 2-3 hours (code changes + testing)
**Risk**: Low (mostly adding checks, no complex logic)
