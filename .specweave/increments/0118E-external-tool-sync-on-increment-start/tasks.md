---
increment: 0118E-external-tool-sync-on-increment-start
status: planned
phases:
  - implementation
  - testing
estimated_tasks: 4
---

# Tasks: External Tool Sync on Increment Start

## Phase 1: Implementation

### T-001: Update specweave-increment.md to trigger sync-specs
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US2-02, AC-US2-04
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**:
Add Step 10 to the `/specweave:increment` command that triggers `LivingDocsSync.syncIncrement()` after increment files are created. This will automatically cascade to external tool sync via the existing `syncToExternalTools()` mechanism.

**Files**:
- `plugins/specweave/commands/specweave-increment.md`

**Implementation**:

Add after Step 9 (current "Sync Strategic Docs" step):

```markdown
### Step 10: Trigger Living Docs & External Tool Sync (NEW!)

**🔄 CRITICAL: After increment files are created, sync to living docs AND external tools:**

\`\`\`
🔄 Syncing increment to living docs...
📡 Syncing to external tools (GitHub/JIRA/ADO)...
\`\`\`

**This step uses the existing sync infrastructure:**

1. Call `/specweave:sync-specs {increment-id}` OR use LivingDocsSync directly
2. LivingDocsSync.syncIncrement() will:
   - Create FS-XXX folder with FEATURE.md and us-*.md files
   - Call syncToExternalTools() which detects GitHub/JIRA/ADO from config
   - Check permissions (canUpsertInternalItems) before creating issues
   - Create issues in external tools automatically

**Expected output:**
\`\`\`
✅ Living docs synced: FS-118E
   Created: 4 files (FEATURE.md, us-001.md, us-002.md, us-003.md)

📡 Syncing to external tools: github
   ✅ Synced to GitHub: 0 updated, 3 created
\`\`\`

**Error handling:**
- External tool sync failures are NON-BLOCKING
- If sync fails, show warning: "⚠️ External sync failed. Run /specweave:sync-specs {id} to retry"
```

**Acceptance Criteria Tests**:
```gherkin
Given user runs /specweave:increment "my feature"
And sync.github.enabled is true in config.json
When increment files are created successfully
Then LivingDocsSync.syncIncrement() should be called
And syncToExternalTools() should create GitHub issues
And user should see "Synced to GitHub: X created"

Given external tool sync fails (rate limit, auth error)
When increment files are created successfully
Then increment creation should still succeed
And warning should show "External sync failed, run /specweave:sync-specs to retry"
```

---

### T-002: Add permission checks to syncToExternalTools
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**:
Add permission checking to `syncToExternalTools()` in `living-docs-sync.ts` to respect `sync.settings` before calling individual sync methods.

**Files**:
- `src/core/living-docs/living-docs-sync.ts`

**Implementation**:

Update `syncToExternalTools()` method (around line 1190):

```typescript
private async syncToExternalTools(
  incrementId: string,
  featureId: string,
  projectPath: string
): Promise<void> {
  try {
    // 1. Detect external tool configuration
    const externalTools = await this.detectExternalTools(incrementId);
    if (externalTools.length === 0) {
      return;
    }

    // 2. Load sync settings (NEW!)
    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    let syncSettings = {
      canUpsertInternalItems: false,
      canUpdateExternalItems: false,
      canUpdateStatus: false
    };

    if (existsSync(configPath)) {
      try {
        const config = await readJson(configPath);
        syncSettings = {
          canUpsertInternalItems: config.sync?.settings?.canUpsertInternalItems ?? false,
          canUpdateExternalItems: config.sync?.settings?.canUpdateExternalItems ?? false,
          canUpdateStatus: config.sync?.settings?.canUpdateStatus ?? false
        };
      } catch (error) {
        this.logger.warn('   ⚠️  Failed to load sync settings, using defaults (disabled)');
      }
    }

    // 3. Check canUpsertInternalItems permission for creating issues
    if (!syncSettings.canUpsertInternalItems) {
      this.logger.log('   ⚠️  Skipping external sync - canUpsertInternalItems is disabled in config');
      this.logger.log('   💡 Enable in .specweave/config.json: sync.settings.canUpsertInternalItems: true');
      return;
    }

    this.logger.log(\`\n📡 Syncing to external tools: \${externalTools.join(', ')}\`);
    this.logger.log(\`   📋 Permissions: upsert=\${syncSettings.canUpsertInternalItems}, update=\${syncSettings.canUpdateExternalItems}, status=\${syncSettings.canUpdateStatus}\`);

    // 4. Sync to each configured external tool (pass permissions)
    for (const tool of externalTools) {
      try {
        switch (tool) {
          case 'github':
            await this.syncToGitHub(featureId, projectPath, syncSettings);
            break;
          case 'jira':
            await this.syncToJira(featureId, projectPath, syncSettings);
            break;
          case 'ado':
            await this.syncToADO(featureId, projectPath, syncSettings);
            break;
        }
      } catch (error) {
        this.logger.error(\`   ⚠️  Failed to sync to \${tool}:\`, error);
      }
    }
  } catch (error) {
    this.logger.error('   ⚠️  External tool sync failed:', error);
  }
}
```

**Acceptance Criteria Tests**:
```gherkin
Given canUpsertInternalItems is false in config.json
When syncToExternalTools is called
Then external sync should be skipped
And log should show "Skipping - canUpsertInternalItems is disabled"

Given canUpsertInternalItems is true
And canUpdateStatus is false
When syncToExternalTools creates issues
Then issues should be created
But status updates should be skipped
```

---

### T-003: Update increment-planner skill to include sync step
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-03
**Status**: [x] completed
**Priority**: P1
**Model Hint**: haiku

**Description**:
Update the increment-planner skill to document that it should trigger sync-specs after creating increment files.

**Files**:
- `plugins/specweave/skills/increment-planner/SKILL.md`

**Implementation**:

Add to the workflow section (after STEP 7: Write Files):

```markdown
### STEP 8: Trigger Living Docs Sync

**After all increment files are written, trigger sync to living docs and external tools:**

\`\`\`typescript
// Use the slash command (preferred)
// Claude will execute: /specweave:sync-specs {incrementId}
\`\`\`

**This automatically:**
1. Creates living docs (FS-XXX/FEATURE.md, us-*.md)
2. Checks sync.settings permissions (canUpsertInternalItems)
3. Syncs to GitHub/JIRA/ADO if configured and permitted
```

**Acceptance Criteria Tests**:
```gherkin
Given increment-planner skill creates increment files
When STEP 8 executes
Then sync-specs should be triggered for the new increment
```

---

## Phase 2: Testing & Verification

### T-004: Verify E2E sync flow with permission checks
**User Story**: US-001, US-003, US-004
**Satisfies ACs**: AC-US1-03 to AC-US1-07, AC-US3-01 to AC-US3-05, AC-US4-01 to AC-US4-03
**Status**: [x] completed
**Priority**: P2
**Model Hint**: haiku

**Description**:
Test the complete flow including permission checks:

1. Test with `canUpsertInternalItems: true` → issues created
2. Test with `canUpsertInternalItems: false` → issues NOT created, clear message
3. Test with `canUpdateStatus: false` → issues created but status not updated

**Test Steps**:
```bash
# Test 1: Permissions enabled (current config)
cat .specweave/config.json | jq '.sync.settings'
# Should show: canUpsertInternalItems: true

# Test 2: Create increment and verify sync
/specweave:increment "test sync"
# Should see: "📡 Syncing to external tools: github"
# Should see: "✅ Synced to GitHub: X created"

# Test 3: Temporarily disable permission
jq '.sync.settings.canUpsertInternalItems = false' .specweave/config.json > tmp.json
mv tmp.json .specweave/config.json

# Test 4: Run sync-specs manually
/specweave:sync-specs 0119
# Should see: "⚠️ Skipping - canUpsertInternalItems is disabled"

# Test 5: Restore permissions
jq '.sync.settings.canUpsertInternalItems = true' .specweave/config.json > tmp.json
mv tmp.json .specweave/config.json
```

**Acceptance Criteria Tests**:
```gherkin
Given canUpsertInternalItems is true
When increment is created
Then GitHub issues should be created

Given canUpsertInternalItems is false
When increment is created
Then GitHub issues should NOT be created
And log should show permission denied message
```

---

## Phase 3: External Issue Closure

### T-005: Auto-close GitHub issue on increment completion
**User Story**: US-005
**Satisfies ACs**: AC-US5-01 to AC-US5-07
**Status**: [x] completed
**Priority**: P1
**Model Hint**: sonnet

**Description**:
Update `/specweave:done` command to automatically close the linked GitHub issue when an external-origin increment (E-suffix) is completed. The increment metadata contains `external_ref: github#owner/repo#issue_number` which should be parsed and used to close the issue.

**Files**:
- `plugins/specweave/commands/specweave-done.md`

**Implementation**:

Add to Step 5 (Post-Closure Sync) section, after B) Close GitHub Issue:

```markdown
### C) Auto-Close External-Origin GitHub Issue (NEW - v0.32.2+)

**For increments with E-suffix (external origin), auto-close the source issue:**

1. **Check for external_ref in metadata.json**:
   \`\`\`typescript
   const metadata = await readJson(metadataPath);
   const externalRef = metadata.external_ref;

   if (externalRef && externalRef.startsWith('github#')) {
     // Parse: github#owner/repo#issue_number
     const match = externalRef.match(/^github#([^#]+)#(\d+)$/);
     if (match) {
       const [, ownerRepo, issueNumber] = match;
       // ownerRepo = "anton-abyzov/specweave"
       // issueNumber = "786"
     }
   }
   \`\`\`

2. **Check canUpdateStatus permission**:
   \`\`\`typescript
   const config = await readJson(configPath);
   if (!config.sync?.settings?.canUpdateStatus) {
     console.log('⚠️ Skipping issue closure - canUpdateStatus is disabled');
     return;
   }
   \`\`\`

3. **Close issue via gh CLI**:
   \`\`\`bash
   gh issue close 786 -R anton-abyzov/specweave --comment "$(cat <<'EOF'
   ✅ **Fixed in SpecWeave increment 0118E**

   ## PM Validation Passed
   - ✅ Gate 1: All tasks completed
   - ✅ Gate 2: Tests passing
   - ✅ Gate 3: Documentation updated

   ## Deliverables
   - Added Step 10 to /specweave:increment for external sync trigger
   - Added permission checks to syncToExternalTools()
   - Updated increment-planner skill with STEP 9

   🔗 Closed automatically by /specweave:done
   EOF
   )"
   \`\`\`

4. **Handle errors gracefully**:
   \`\`\`
   If gh CLI not installed:
     ⚠️ GitHub CLI not installed. Run manually: gh issue close 786

   If auth fails:
     ⚠️ GitHub auth failed. Run: gh auth login
   \`\`\`
```

**Expected Output**:
```
🐙 External Issue Closure:
   ✓ Detected external_ref: github#anton-abyzov/specweave#786
   ✓ Permission check passed (canUpdateStatus: true)
   ✓ Closing GitHub issue #786...
   ✓ Issue #786 closed with completion summary
```

**Acceptance Criteria Tests**:
```gherkin
Given increment has external_ref "github#owner/repo#786"
And canUpdateStatus is true
When /specweave:done completes successfully
Then GitHub issue #786 should be closed
And completion comment should be added

Given increment has NO external_ref
When /specweave:done completes
Then no external issue closure should be attempted

Given canUpdateStatus is false
When /specweave:done completes
Then issue should NOT be closed
And warning should show "canUpdateStatus is disabled"
```

---

## Task Summary

| ID | Task | Status | Priority | ACs |
|----|------|--------|----------|-----|
| T-001 | Update specweave-increment.md | ✅ completed | P1 | AC-US1-01, AC-US1-02, AC-US2-02, AC-US2-04 |
| T-002 | Add permission checks | ✅ completed | P1 | AC-US3-01 to AC-US3-05 |
| T-003 | Update increment-planner skill | ✅ completed | P1 | AC-US2-01, AC-US2-03 |
| T-004 | Verify E2E with permissions | ✅ completed | P2 | Multiple ACs |
| T-005 | Auto-close GitHub issue on completion | ✅ completed | P1 | AC-US5-01 to AC-US5-07 |

## Key Insights

1. **The sync architecture is CORRECT!** Only missing the trigger from increment creation.
2. **Permission checks MUST happen** in `syncToExternalTools()` before calling sync methods.
3. **Your config has permissions enabled** (`canUpsertInternalItems: true`), so sync should work once triggered.
