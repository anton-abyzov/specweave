# Three-Permission Architecture - Comprehensive Change Summary

**Date**: 2025-11-20
**Increment**: 0047-us-task-linkage
**Change Type**: Architecture Simplification
**Impact**: Critical - Changes external tool sync behavior

---

## Executive Summary

Replaced complex `bidirectional` sync configuration with **3 independent permission settings** for maximum flexibility and clarity. This architecture gives users granular control over what SpecWeave can modify in external tools (GitHub, JIRA, ADO).

**Old System**: Single `bidirectional` flag (true/false) in config.json
**New System**: 3 independent permission settings in config.json under `sync.settings`

---

## The 3 Permission Settings

Users are asked these questions during `specweave init`, stored in `.specweave/config.json`:

### Question 1: Can SpecWeave CREATE and UPDATE work items it created?
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false  // default: false
    }
  }
}
```
- **UPSERT** = CREATE initially + UPDATE as work progresses
- **Controls**: Title, Description/Body, Acceptance Criteria for **INTERNAL** items
- **Flow**: increment → living spec → CREATE external item → UPDATE on task completion
- **If false**: Stops before external item creation (local-only workflow, no external tool integration)

### Question 2: Can SpecWeave UPDATE work items created externally?
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": false  // default: false
    }
  }
}
```
- **Controls**: FULL content updates of **EXTERNAL** items (title, description, ACs, tasks, comments)
- **Flow**: increment progress → living spec → UPDATE external tool (full sync)
- **If false**: External items remain read-only snapshots (no sync back to external tool)

### Question 3: Can SpecWeave UPDATE status of work items?
```json
{
  "sync": {
    "settings": {
      "canUpdateStatus": false  // default: false
    }
  }
}
```
- **Controls**: Status field ONLY (for **BOTH** internal AND external items)
- **Flow**: Both flows (status updates after all ACs/tasks complete)
- **If false**: No status updates regardless of item origin (manual status management in external tool)

---

## Files Changed

### 1. spec.md - Acceptance Criteria Updates

#### AC-US9-02 (NEW)
```markdown
- [ ] **AC-US9-02**: Three independent permission flags control external tool sync behavior
  - **Notes**: .env flags: SPECWEAVE_CAN_CREATE_EXTERNAL_ITEMS,
    SPECWEAVE_CAN_UPDATE_EXTERNAL_ITEMS, SPECWEAVE_CAN_UPDATE_STATUS
    (all default: false for safety)
```

#### AC-US9-03 (UPDATED)
**Before**: When bidirectional=false (default), internal US syncs one-way to external tool
**After**: When CAN_CREATE_EXTERNAL_ITEMS=true, internal US creates external item and syncs content updates

#### AC-US9-04 (UPDATED)
**Before**: When bidirectional=false (default), external US syncs one-way from external tool
**After**: When CAN_UPDATE_EXTERNAL_ITEMS=true, external US content updates sync back to external tool

#### AC-US9-05 (UPDATED)
**Before**: When bidirectional=true (advanced), both directions enabled for both US types
**After**: When CAN_UPDATE_STATUS=true, status updates sync to external tool (for BOTH internal AND external items)

#### AC-US9A-04 (UPDATED)
**Before**: Status updates ONLY if bidirectional=true
**After**: Status updates ONLY if CAN_UPDATE_STATUS=true

### 2. spec.md - Functional Requirements Updates

#### FR-009 (RENAMED & UPDATED)
**Before**: Sync Direction Configuration
**After**: External Tool Permission Configuration

**Changes**:
- Added 3 permission flags with descriptions
- Added init command requirement to prompt user
- Removed `bidirectional` concept entirely

#### FR-010A (UPDATED)
Added permission checks:
- Status updates ONLY if CAN_UPDATE_STATUS=true
- Content updates to external items ONLY if CAN_UPDATE_EXTERNAL_ITEMS=true
- Internal item creation ONLY if CAN_CREATE_EXTERNAL_ITEMS=true

### 3. plan.md - Implementation Details Updates

#### Sync Config Interface (Updated)
**Before**:
```typescript
export interface SyncConfig {
  bidirectional: boolean;  // Default: false (safer)
}
```

**After**:
```typescript
export interface SyncConfig {
  canCreateExternalItems: boolean;    // Q1: Allow creating external items?
  canUpdateExternalItems: boolean;    // Q2: Allow updating external items?
  canUpdateStatus: boolean;           // Q3: Allow updating status?
}
```

#### Sync Methods (Updated)

**syncInternalUS()**:
- Check `canCreateExternalItems` permission
- If false, skip external item creation entirely
- If true, push with full updates + status (if `canUpdateStatus` enabled)

**syncExternalUS()**:
- ALWAYS pull from external (refresh snapshot)
- Check `canUpdateExternalItems` permission
- If false, skip push to external tool
- If true, push with comment-only mode + status (if `canUpdateStatus` enabled)

#### Sync Behavior Matrix (NEW)

| Origin | Q1 | Q2 | Q3 | External Created? | Title | Description | Status | Comments |
|--------|----|----|----|--------------------|-------|-------------|--------|----------|
| Internal | ✅ | - | ✅ | Yes | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update ACs/Tasks | ✅ Yes | ✅ Yes |
| Internal | ✅ | - | ❌ | Yes | ✅ Enforce format | ✅ Update ACs/Tasks | ❌ No | ✅ Yes |
| Internal | ❌ | - | - | **NO** | N/A | N/A | N/A | N/A |
| External | - | ✅ | ✅ | (pre-existing) | ✅ Update (enforce format) | ✅ Update ACs/Tasks | ✅ Yes | ✅ Yes |
| External | - | ✅ | ❌ | (pre-existing) | ✅ Update (enforce format) | ✅ Update ACs/Tasks | ❌ No | ✅ Yes |
| External | - | ❌ | ✅ | (pre-existing) | ❌ NO sync | ❌ NO sync | ✅ Yes (comment) | ✅ Yes |
| External | - | ❌ | ❌ | (pre-existing) | ❌ NO sync | ❌ NO sync | ❌ No | ❌ No |

### 4. .env.example Template (NEW SECTION)

Added permission flags section BEFORE issue tracker integrations:

```bash
# ============================================================================
# EXTERNAL TOOL SYNC PERMISSIONS (controls what SpecWeave can modify)
# ============================================================================

SPECWEAVE_CAN_CREATE_EXTERNAL_ITEMS=false
SPECWEAVE_CAN_UPDATE_EXTERNAL_ITEMS=false
SPECWEAVE_CAN_UPDATE_STATUS=false
```

---

## Behavior Changes

### Scenario 1: Solo Dev, Local Only
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false,
      "canUpdateExternalItems": false,
      "canUpdateStatus": false
    }
  }
}
```
**Result**: Everything stays in SpecWeave. No external items created. No sync. Pure local workflow.

### Scenario 2: Solo Dev, Want Visibility
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false,
      "canUpdateStatus": false
    }
  }
}
```
**Result**:
- Internal items → GitHub issues created initially + updated as work progresses
- Task completed in SpecWeave → issue updated with new content + comment posted
- External items (imported) → read-only snapshots (no sync back)
- Status updates → manual in GitHub

### Scenario 3: Team Collaboration (Full Sync)
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "canUpdateStatus": true
    }
  }
}
```
**Result**:
- Internal items → GitHub issues created + updated continuously
- External items → SpecWeave can update via comments (preserves original format)
- Status updates → synced to external tool automatically (both internal & external)

---

## Migration Impact

### Code Changes Required

1. **init.ts**: Add 3 permission questions, save to config.json under `sync.settings`
2. **post-increment-planning.sh**: Check `config.sync.settings.canUpsertInternalItems` before creating external item
3. **post-task-completion.sh**: Check `config.sync.settings.canUpdateStatus` before updating status
4. **sync-living-docs.js**: Check `config.sync.settings.canUpdateExternalItems` before pushing to external
5. **config.json**: Replace `syncDirection: "bidirectional"` with `settings: {...}` object

### Backward Compatibility

**Old config.json**:
```json
{
  "sync": {
    "settings": {
      "autoCreateIssue": true,
      "syncDirection": "bidirectional"
    }
  }
}
```

**New config.json**:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false,
      "canUpdateExternalItems": false,
      "canUpdateStatus": false
    }
  }
}
```

**Migration strategy**:
- If `syncDirection: "bidirectional"` found → set all 3 permissions to `true`
- If `syncDirection: "one-way"` or missing → set all 3 permissions to `false`
- Remove `syncDirection` field after migration
- Warn user to review config.json permissions

---

## Testing Requirements

### Unit Tests

1. Permission settings parsing from config.json
2. Sync decision logic for all 8 combinations (2³)
3. External item UPSERT guard (CREATE + UPDATE)
4. Status update guard (both internal & external)
5. Living docs sync guard (comment-only for external items)

### Integration Tests

1. Init command prompts user for 3 questions
2. config.json created with correct permission settings
3. Hook respects canUpsertInternalItems (CREATE + UPDATE)
4. Hook respects canUpdateExternalItems (comment-only mode)
5. Hook respects canUpdateStatus (both internal & external)

### E2E Tests

1. Full workflow with all permissions enabled
2. Full workflow with all permissions disabled
3. Mixed permissions (upsert=true, update=false, status=true)

---

## Rollout Plan

### Phase 1: Update Documentation (Complete)
- ✅ spec.md ACs updated (UPSERT terminology)
- ✅ spec.md FRs updated (config.json location)
- ✅ plan.md implementation details updated (SyncSettings interface)
- ✅ .env.example note added (redirects to config.json)
- ✅ Change report updated (config.json approach)

### Phase 2: Update Init Command (Pending)
- [ ] Add 3 permission questions to init flow
- [ ] Save permissions to config.json under sync.settings
- [ ] Update config.json template (replace `syncDirection` with settings object)

### Phase 3: Update Hooks (Pending)
- [ ] post-increment-planning.sh: Add canUpsertInternalItems check (UPSERT permission)
- [ ] post-task-completion.sh: Add canUpdateStatus check (status permission)
- [ ] sync-living-docs.js: Add canUpdateExternalItems check (external update permission)

### Phase 4: Update Sync Logic (Pending)
- [ ] Implement permission-based routing in sync services
- [ ] Add validation to prevent format-breaking updates
- [ ] Update conflict resolution logic

### Phase 5: Migration Tooling (Pending)
- [ ] Create migration script for old config.json files
- [ ] Add warning messages for deprecated `syncDirection` field

---

## Benefits of New Architecture

1. **Clearer Intent**: UPSERT terminology clearly indicates CREATE + UPDATE for internal items
2. **Maximum Flexibility**: Users control each aspect independently (UPSERT, UPDATE, STATUS)
3. **Safer Defaults**: All permissions default to false (no surprises, explicit opt-in)
4. **Better UX**: Questions map directly to user workflows (internal vs external items)
5. **Easier Debugging**: Permissions explicit in config.json (version controlled, team-wide visibility)
6. **Simpler Code**: No complex bidirectional logic branches, clear permission checks
7. **Centralized Configuration**: All sync settings in one place (.specweave/config.json)

---

## Related Documentation

- **Original Proposal**: `.specweave/increments/0047-us-task-linkage/spec.md`
- **Implementation Plan**: `.specweave/increments/0047-us-task-linkage/plan.md`
- **Config Template**: `.specweave/config.json` (sync.settings section)

---

## Changelog

**2025-11-20**: Architecture shift from `bidirectional` to 3 independent permissions in config.json
- Replaced AC-US9-02 through AC-US9-05 with permission-based ACs (UPSERT terminology)
- Updated FR-009 (renamed to "External Tool Permission Configuration")
- Updated FR-010A with UPSERT permission checks
- Added note to .env.example (redirects to config.json)
- Updated plan.md with SyncSettings interface and permission-based sync logic
- All permissions stored in .specweave/config.json under sync.settings (NOT .env)

---

## Next Steps

1. Implement init command updates (3 permission questions)
2. Update all hooks with permission checks
3. Create migration script for old config.json files
4. Write comprehensive tests for 8 permission combinations
5. Update living docs with new architecture
