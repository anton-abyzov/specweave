---
id: US-002
title: "Three-Tier Permission Model"
feature: FS-049
project: specweave
type: user-story
status: proposed
priority: P0
created: 2025-11-22
external_tools:
  github:
    type: issue
    number: 717
    url: https://github.com/anton-abyzov/specweave/issues/717
---

# US-002: Three-Tier Permission Model

**Feature**: [FS-049: Automatic GitHub Sync with Permission Gates](../../../_features/FS-049/FEATURE.md)

## User Story

**As a** SpecWeave user
**I want** fine-grained control over automatic sync behavior
**So that** I can enable living docs sync without forcing external tracker sync

## Context

**Problem**: Single permission flag (`canUpsertInternalItems`) controls both living docs AND external sync. Users want decoupled control.

**Use Cases**:
1. **Living Docs Only**: Enable `canUpsertInternalItems`, disable `canUpdateExternalItems`
   - Scenario: User wants local docs updated, but manual GitHub control
2. **Full Auto-Sync**: Enable both flags + `autoSyncOnCompletion`
   - Scenario: User wants zero manual work (recommended default)
3. **Manual Control**: Disable `autoSyncOnCompletion`
   - Scenario: User wants to review changes before syncing to GitHub

## Acceptance Criteria

- [ ] **AC-US2-01**: Config supports three independent flags
  - **Priority**: P0
  - **Testable**: Yes (config validation test)
  - **Verification**:
    ```json
    {
      "sync": {
        "settings": {
          "canUpsertInternalItems": true,    // GATE 1: Living docs
          "canUpdateExternalItems": true,    // GATE 2: External trackers
          "autoSyncOnCompletion": true       // GATE 3: Auto-trigger
        }
      }
    }
    ```

- [ ] **AC-US2-02**: GATE 1 (`canUpsertInternalItems`) controls living docs sync
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: When false, living docs NOT updated

- [ ] **AC-US2-03**: GATE 2 (`canUpdateExternalItems`) controls external tracker sync
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: When false, GitHub sync skipped (even if GATE 1 true)

- [ ] **AC-US2-04**: GATE 3 (`autoSyncOnCompletion`) controls automatic trigger
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: When false, user must manually run `/specweave-github:sync`

- [ ] **AC-US2-05**: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync
  - **Priority**: P0
  - **Testable**: Yes
  - **Verification**: When false, GitHub skipped (allows Jira/ADO only)

- [ ] **AC-US2-06**: Default config has `autoSyncOnCompletion: true`
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**: Check `specweave init` default config generation

- [ ] **AC-US2-07**: User sees clear message when sync skipped due to permission gates
  - **Priority**: P1
  - **Testable**: Yes
  - **Verification**:
    ```
    ℹ️  External sync disabled (canUpdateExternalItems=false)
    ⚠️  Automatic sync disabled (autoSyncOnCompletion=false)
       Run /specweave-github:sync to sync manually
    ```

## Implementation Notes

**Permission Gate Evaluation (Pseudocode)**:
```typescript
async syncIncrementCompletion() {
  const config = await this.loadConfig();

  // GATE 1: Living docs sync
  if (!config.sync?.settings?.canUpsertInternalItems) {
    this.logger.log('ℹ️  Living docs sync disabled');
    return { success: true, syncMode: 'read-only' };
  }

  await syncLivingDocs();

  // GATE 2: External tracker sync
  if (!config.sync?.settings?.canUpdateExternalItems) {
    this.logger.log('ℹ️  External sync disabled (canUpdateExternalItems=false)');
    return { success: true, syncMode: 'living-docs-only' };
  }

  // GATE 3: Automatic sync on completion
  const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true; // DEFAULT: true
  if (!autoSync) {
    this.logger.log('⚠️  Automatic sync disabled (autoSyncOnCompletion=false)');
    this.logger.log('   Run /specweave-github:sync to sync manually');
    return { success: true, syncMode: 'manual-only' };
  }

  // GATE 4: GitHub enabled
  if (!config.sync?.github?.enabled) {
    this.logger.log('⏭️  GitHub sync SKIPPED (sync.github.enabled=false)');
    return { success: true, syncMode: 'external-disabled' };
  }

  // All gates passed → auto-sync
  await createGitHubIssues();
}
```

## Test Strategy

**Unit Tests**:
- Each gate independently tested (4 tests)
- Gate combinations tested (16 combinations)
- Default config tested

**Integration Tests**:
- Verify message output for each gate failure
- Verify sync behavior for each gate combination

## Truth Table (Permission Gates)

| GATE 1 | GATE 2 | GATE 3 | GATE 4 | Result | Sync Mode |
|--------|--------|--------|--------|--------|-----------|
| false  | *      | *      | *      | Skip   | read-only |
| true   | false  | *      | *      | Living Docs Only | living-docs-only |
| true   | true   | false  | *      | Manual Trigger | manual-only |
| true   | true   | true   | false  | External Disabled | external-disabled |
| true   | true   | true   | true   | Auto-Sync ✅ | full-sync |

## Configuration Examples

**Example 1: Full Auto-Sync (Recommended Default)**
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": {
      "enabled": true
    }
  }
}
```

**Example 2: Living Docs Only (No External Sync)**
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false  // Blocks external sync
    }
  }
}
```

**Example 3: Manual GitHub Sync**
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": false  // Manual trigger only
    },
    "github": {
      "enabled": true
    }
  }
}
```

## Edge Cases

**Edge Case 1: Missing Config Fields**
- **Scenario**: User has old config without new fields
- **Expected**: Use defaults (`autoSyncOnCompletion: true`)
- **Rationale**: Backward compatibility

**Edge Case 2: Conflicting Settings**
- **Scenario**: `canUpdateExternalItems: true` but `sync.github.enabled: false`
- **Expected**: Skip GitHub (GATE 4 wins), but allow Jira/ADO
- **Rationale**: Tool-specific gates take precedence

## Related Stories

- [US-001: Automatic Issue Creation](./us-001-auto-issue-creation.md) - Uses permission gates
- [US-004: Error Isolation](./us-004-error-isolation.md) - Error handling with gates

## External Tool Links

- **GitHub Issue**: (To be created)

---

**Status**: Proposed
**Implementation**: Planned for 0051-automatic-github-sync
