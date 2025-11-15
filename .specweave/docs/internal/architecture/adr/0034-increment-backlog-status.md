# ADR-0034: Increment Backlog Status

**Status**: Accepted
**Date**: 2025-11-14
**Decision Makers**: SpecWeave Core Team
**Tags**: #increment-lifecycle #status-management #wip-limits #backlog

---

## Context

### Problem Statement

Users need a way to plan and organize future increments without violating WIP (Work In Progress) limits. Currently, the only options are:

1. **Active**: Start work immediately (counts towards WIP limits)
2. **Paused**: For work that started but got blocked

**Gap**: No status for "planned but not yet started" increments.

### User Pain Points

**Without Backlog Status**:
- ❌ Can't plan multiple increments without starting them all
- ❌ Creating increments immediately makes them active (WIP violation)
- ❌ No clear way to prioritize future work
- ❌ Stakeholder requests have nowhere to go (can't capture without starting)

**Workaround (Before Backlog)**:
- Users create increments and immediately pause them with reason "not started yet"
- **Problem**: Semantically incorrect (paused = blocked, not "not started")
- **Problem**: Confuses reporting (paused = expecting resume soon)

### Requirements

1. **Status for planned work**: Increments planned but not ready to start
2. **Does NOT count towards WIP**: Backlog increments excluded from WIP limits
3. **Clear semantics**: Backlog ≠ Paused (different use cases)
4. **Prioritization**: Allow organizing work by priority
5. **Transition rules**: Clear paths to/from backlog

---

## Decision

**We will add a new `BACKLOG` status** to the increment lifecycle.

### Status Definition

**Backlog**:
- **Definition**: Increment is planned (spec created) but not ready to start
- **WIP Counting**: Does NOT count towards WIP limits
- **Use Cases**: Low priority, waiting for approvals, future work
- **Difference from Paused**: Never started (Paused = started but blocked)

### Implementation Details

#### 1. Core Type Changes

```typescript
// src/core/types/increment-metadata.ts
export enum IncrementStatus {
  ACTIVE = 'active',
  BACKLOG = 'backlog',  // ← NEW
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

// Valid transitions
export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
  [IncrementStatus.ACTIVE]: [
    IncrementStatus.BACKLOG,  // ← NEW: Can move active → backlog
    IncrementStatus.PAUSED,
    IncrementStatus.COMPLETED,
    IncrementStatus.ABANDONED
  ],
  [IncrementStatus.BACKLOG]: [  // ← NEW
    IncrementStatus.ACTIVE,
    IncrementStatus.ABANDONED
  ],
  // ... rest unchanged
};

// Metadata fields
export interface IncrementMetadata {
  // ... existing fields
  backlogReason?: string;      // ← NEW
  backlogAt?: string;           // ← NEW (ISO 8601)
}
```

#### 2. WIP Limit Exclusion

**Key Insight**: Existing code already excludes folders starting with `_`:

```typescript
// src/core/increment/metadata-manager.ts:260
const incrementFolders = fs.readdirSync(incrementsPath)
  .filter(name => {
    const folderPath = path.join(incrementsPath, name);
    return fs.statSync(folderPath).isDirectory() && !name.startsWith('_');
  });
```

**No special exclusion logic needed!** Backlog increments with `status: 'backlog'` in metadata.json are filtered by status, not folder name.

**WIP Counting**:
```typescript
// src/core/increment/limits.ts:73
const activeOfType = allIncrements.filter(
  m => m.type === type && m.status === IncrementStatus.ACTIVE  // ← Only ACTIVE counted
);
```

✅ **Backlog increments automatically excluded from WIP counts**

#### 3. Commands

**New Command**: `/specweave:backlog <id>`
- Moves increment from active → backlog
- Prompts for reason
- Updates metadata.json
- Displays confirmation

**Updated Command**: `/specweave:resume <id>`
- Now handles both paused AND backlog
- Different messages for each:
  - Paused: "Was paused for X days"
  - Backlog: "Was in backlog for X days"

**Updated Command**: `/specweave:status`
- Shows backlog section in output
- New filter: `--backlog`
- Counts backlog in summary

#### 4. Discipline Checker

Updated to count backlog separately:

```typescript
// src/core/increment/discipline-checker.ts
private countByStatus(increments: IncrementStatus[]): {
  statusCounts: {
    total: number;
    active: number;
    backlog: number;  // ← NEW
    paused: number;
    completed: number;
    abandoned: number;
  };
  statusMap: Map<string, string>;
}
```

**Validation**: Backlog increments do NOT trigger WIP violations

---

## Rationale

### Why This Approach?

**Option 1: Use Paused Status (Rejected)**
- ❌ Semantically incorrect (paused = blocked, not "not started")
- ❌ Confuses reporting and metrics
- ❌ No way to distinguish blocked work from future plans

**Option 2: Use _backlog Folder (Rejected)**
- ❌ Breaks traceability (increment numbers scattered)
- ❌ Complex folder moves
- ❌ Status line breaks (expects increments/NNNN)

**Option 3: Add BACKLOG Status (✅ Chosen)**
- ✅ Clear semantics (backlog = planned but not started)
- ✅ No folder moves needed (status in metadata)
- ✅ Clean transitions (backlog ↔ active)
- ✅ Excluded from WIP automatically (status-based filtering)
- ✅ Easy to report on (status field query)

### Key Design Decisions

#### Decision 1: Status vs Folder

**Chosen**: Status-based (metadata.json)
**Reason**: Simpler, more flexible, no filesystem complexity

#### Decision 2: WIP Counting

**Chosen**: Exclude backlog from WIP limits
**Reason**: Core purpose is to plan without violating WIP

#### Decision 3: Transition Rules

**Allowed Transitions**:
- ✅ active → backlog (deprioritize)
- ✅ backlog → active (start work)
- ✅ backlog → abandoned (no longer needed)

**Blocked Transitions**:
- ❌ paused → backlog (already started, can't "un-start")
- ❌ completed → backlog (already done)

**Rationale**: Backlog is for work not yet started. Can't move started/completed work to backlog.

---

## Consequences

### Positive

1. **✅ Clear prioritization**: Users can plan multiple increments and prioritize
2. **✅ No WIP violations**: Planning doesn't count towards limits
3. **✅ Better semantics**: Backlog vs Paused distinction clear
4. **✅ Stakeholder visibility**: Planned work visible in backlog
5. **✅ Flexible workflow**: Create specs, prioritize later

### Negative

1. **⚠️  New concept to learn**: Users must understand backlog vs paused
2. **⚠️  Backlog can grow unbounded**: Needs grooming/cleanup
3. **⚠️  Migration needed**: Existing "paused but not started" increments

### Risks and Mitigations

**Risk 1: Backlog Grows Too Large**
- **Mitigation**: Warning when backlog >10 items
- **Mitigation**: Weekly grooming reminders in `/status`
- **Mitigation**: Auto-suggest abandoning items >30 days old

**Risk 2: Users Confuse Backlog and Paused**
- **Mitigation**: Clear documentation with examples
- **Mitigation**: Command help text explains difference
- **Mitigation**: Status output shows both with different icons

**Risk 3: Backlog Becomes Procrastination**
- **Mitigation**: WIP discipline still enforced
- **Mitigation**: Regular review prompts
- **Mitigation**: Clear prioritization in `/status --backlog`

---

## Implementation Checklist

### Core Changes

- [x] Add `BACKLOG` to `IncrementStatus` enum
- [x] Add `VALID_TRANSITIONS` for backlog
- [x] Add `backlogReason` and `backlogAt` to metadata interface
- [x] Update `MetadataManager.updateStatus()` to handle backlog
- [x] Add `MetadataManager.getBacklog()` method

### Commands

- [x] Create `/specweave:backlog` command
- [x] Update `/specweave:resume` to handle backlog
- [x] Update `/specweave:status` to show backlog
- [x] Add `--backlog` filter to status command

### Validation & Reporting

- [x] Update `DisciplineChecker` to count backlog separately
- [x] Update `ValidationResult` interface to include backlog count
- [x] Ensure backlog does NOT trigger WIP violations

### Documentation

- [x] Create backlog management guide
- [x] Update increment glossary with backlog lifecycle
- [x] Update command documentation
- [x] Create ADR (this document)

### Testing

- [ ] Unit tests for backlog status transitions
- [ ] Unit tests for WIP counting (backlog excluded)
- [ ] Integration tests for backlog commands
- [ ] E2E tests for backlog workflow

---

## Related Decisions

- **ADR-0007**: Increment Status Management
- **ADR-0012**: WIP Limits and Context Switching
- **ADR-0018**: Strict Increment Discipline Enforcement

---

## References

- [Backlog Management Guide](../../public/guides/backlog-management.md)
- [Increment Glossary](/docs/glossary/terms/increment)
- Command docs: `plugins/specweave/commands/specweave-backlog.md`
- Implementation: `src/core/types/increment-metadata.ts`

---

**Accepted**: 2025-11-14
**Supersedes**: None
**Superseded By**: None
