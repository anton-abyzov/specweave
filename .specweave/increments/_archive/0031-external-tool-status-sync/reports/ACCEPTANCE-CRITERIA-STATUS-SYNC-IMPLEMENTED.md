# Acceptance Criteria Status Sync Implementation

**Date**: 2025-11-14
**Feature**: Automatic AC Status Updates from Completed Tasks

## Summary

Successfully implemented automatic synchronization of acceptance criteria (AC) status in living docs based on task completion status. When tasks are marked as completed in `tasks.md`, their associated ACs are automatically checked off in the corresponding user story files during living docs sync.

## Problem Statement

Previously, when tasks were completed and marked with `**Status**: [x]`, the acceptance criteria referenced in those tasks (via the `**AC**: AC-US1-01, AC-US1-02` field) remained unchecked in the living docs user story files. This created a disconnect between implementation status and requirements tracking.

## Solution Implemented

### 1. Core Implementation (`spec-distributor.ts`)

Added three new methods to the `SpecDistributor` class:

#### `updateAcceptanceCriteriaStatus(incrementId: string)`
- Main entry point for AC status synchronization
- Reads tasks.md from increment
- Extracts completed ACs
- Updates user story files with checked ACs

#### `extractCompletedAcceptanceCriteria(tasksContent: string)`
- Parses tasks.md content
- Identifies tasks with `**Status**: [x]` (completed)
- Extracts AC-IDs from `**AC**: ` field
- Maps ACs to their parent user stories
- Returns Map<UserStoryId, Set<AC-IDs>>

#### `updateUserStoryACStatus(completedACs: Map, incrementId: string)`
- Scans all user story files in living docs
- Matches AC-IDs with user story content
- Updates checkboxes from `- [ ]` to `- [x]` for completed ACs
- Writes updated files back to disk

### 2. Hook Integration (`sync-living-docs.ts`)

Modified the `hierarchicalDistribution` function to call AC status update after spec distribution:

```typescript
// Update acceptance criteria status based on completed tasks
console.log('   📊 Updating acceptance criteria status from completed tasks...');
await distributor.updateAcceptanceCriteriaStatus(incrementId);
```

### 3. Command Updates

#### `/specweave:sync-specs` Command
Added AC status update to the spec sync command:

```javascript
// Update acceptance criteria status based on completed tasks
console.log('');
console.log('📊 Updating acceptance criteria status...');
await distributor.updateAcceptanceCriteriaStatus('${INCREMENT_ID}');
```

## How It Works

### Workflow

1. **Task Completion**: Developer marks task as complete in `tasks.md`:
   ```markdown
   ### T-001: Implement Authentication
   **Status**: [x] (100% - Completed)
   **AC**: AC-US1-01, AC-US1-02, AC-US1-03
   ```

2. **Trigger Points** (Any of these):
   - Automatic: Post-task-completion hook fires after TodoWrite
   - Manual: User runs `/specweave:sync-specs`
   - Closure: User runs `/specweave:done`

3. **AC Status Update**:
   - System reads completed tasks from `tasks.md`
   - Extracts AC-IDs from completed tasks
   - Maps AC-IDs to user stories (AC-US1-01 → US-001)
   - Updates user story files in living docs

4. **Result**: User story ACs updated:
   ```markdown
   ## Acceptance Criteria
   - [x] **AC-US1-01**: User can log in with email
   - [x] **AC-US1-02**: Session persists across refreshes
   - [x] **AC-US1-03**: Invalid credentials show error
   ```

### Pattern Matching

The implementation handles multiple AC-ID patterns:
- `AC-US1-01` → Maps to US-001
- `AC-001` → Uses task's user story link to determine parent
- `AC-030` → Generic AC (uses context to determine story)

### Multi-Project Support

The updater scans all project folders:
- `.specweave/docs/internal/specs/default/`
- `.specweave/docs/internal/specs/backend/`
- `.specweave/docs/internal/specs/frontend/`
- etc.

## Testing

Tested with increment 0031-external-tool-status-sync:

```bash
node -e "
import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const distributor = new SpecDistributor(process.cwd());
  await distributor.updateAcceptanceCriteriaStatus('0031-external-tool-status-sync');
});
"
```

Output:
```
📊 Updating acceptance criteria status for increment: 0031-external-tool-status-sync
   📝 Found 6 completed acceptance criteria to update
   ✅ Updated AC-US1-01 in US-001 (default/FS-032)
   ✅ Updated AC-US1-02 in US-001 (default/FS-032)
   ...
   ✅ Updated 3 user story file(s) with completed acceptance criteria
```

## Benefits

1. **Complete Traceability**: Requirements status automatically reflects implementation
2. **No Manual Updates**: AC checkboxes update automatically when tasks complete
3. **Audit Trail**: Shows which requirements have been verified through implementation
4. **LLM-Friendly**: AI can see which ACs are complete without checking tasks
5. **Project Management**: Clear visibility into requirement completion

## Integration Points

The AC status updater runs at these points:

1. **Post-Task-Completion Hook** (Automatic)
   - Fires after any TodoWrite operation
   - Runs living docs sync + AC status update
   - Non-blocking, best-effort

2. **Sync Specs Command** (Manual)
   - `/specweave:sync-specs`
   - Explicitly syncs specs + updates AC status

3. **Done Command** (Closure)
   - `/specweave:done`
   - Final sync when closing increment

## Future Enhancements

1. **Bidirectional Sync**: Update task status from AC checkboxes
2. **Partial Completion**: Support partially completed ACs (e.g., `[~]`)
3. **Test Status Integration**: Link AC status to test results
4. **Reporting**: Generate AC coverage reports
5. **External Tool Sync**: Update AC status in GitHub/JIRA/ADO

## Files Modified

- `src/core/living-docs/spec-distributor.ts` (+178 lines)
- `plugins/specweave/lib/hooks/sync-living-docs.ts` (+3 lines)
- `plugins/specweave/commands/specweave-sync-specs.md` (+4 lines)

## Conclusion

The acceptance criteria status sync feature is now fully integrated into SpecWeave's living docs system. It ensures that requirement completion status stays synchronized with implementation progress, providing clear visibility into which acceptance criteria have been satisfied through completed work.