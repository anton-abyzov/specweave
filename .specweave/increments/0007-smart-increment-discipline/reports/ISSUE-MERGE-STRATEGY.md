# GitHub Issue Merge Strategy: #15 → #4

**Created**: 2025-11-04
**Objective**: Consolidate tracking for increment 0007 into single issue (#4)

---

## Context

### Issue #4 (CLOSED) - The Original
- **Title**: "[Increment 0007] Increment Management v2.0 (Test-Aware + Smart Status)"
- **Status**: CLOSED (completed)
- **Created**: 2025-11-04
- **Comments**: 27 detailed progress updates
- **Labels**: enhancement, increment, specweave
- **Content**: Comprehensive implementation journey (T-001 through T-024)

**Strengths**:
- ✅ Complete historical record
- ✅ All progress comments preserved
- ✅ Implementation details documented
- ✅ 27 progress updates showing work evolution

**Weaknesses**:
- ❌ Very detailed (maybe too much)
- ❌ Title uses old naming convention
- ❌ Currently closed (needs reopen)

### Issue #15 (OPEN) - The Cleaner Version
- **Title**: "[INC-0007] Smart Increment Discipline v2.0 (COMPLETED)"
- **Status**: OPEN
- **Created**: 2025-11-04T18:11:46Z
- **Comments**: 0
- **Labels**: None
- **Content**: Executive summary format with impact metrics

**Strengths**:
- ✅ Clean, executive summary
- ✅ Modern naming convention [INC-XXXX]
- ✅ Focus on outcomes (impact metrics)
- ✅ Concise deliverables

**Weaknesses**:
- ❌ No historical context
- ❌ No progress tracking
- ❌ Created as duplicate (unnecessary)

---

## Decision: Consolidate into #4

**Rationale**:
1. **Historical Value**: #4 has 27 progress comments showing implementation journey
2. **Audit Trail**: Complete record of work for compliance/learning
3. **Context Preservation**: Future developers can see HOW work was done, not just WHAT
4. **Avoid Duplication**: One source of truth is better than two

**User Instruction**:
> "Use #4 as the base one that will live and be extended by merge"

---

## Merge Strategy

### Phase 1: Enhance #4 (Keep Best of Both)

**1. Reopen Issue #4**
```bash
gh issue reopen 4 --comment "$(cat <<'EOF'
🔄 **Issue Reopened for Consolidation**

This is the original tracking issue for increment 0007 with complete
historical context (27 progress updates).

Issue #15 was created as a cleaner version, but we're consolidating
back to this issue to preserve the implementation journey and audit trail.

**What's Being Merged**:
- ✅ Executive summary from #15 (added to description)
- ✅ Modern naming convention [INC-0007]
- ✅ Impact metrics and deliverables
- ✅ All historical progress preserved

**Why Consolidate**:
- Single source of truth
- Complete audit trail
- Historical context for future reference
- Compliance and learning value

---
🤖 Reopened by SpecWeave - Consolidating #15 into #4
EOF
)"
```

**2. Update #4 Description** (Hybrid Format)

Strategy: Keep detailed breakdown BUT add executive summary at top

```markdown
# [INC-0007] Smart Increment Discipline v2.0

**Status**: ✅ COMPLETED
**Version**: v0.7.0
**Delivered**: 2025-11-04

> **Note**: This issue consolidates tracking from #15. See merge comment below for details.

---

## Executive Summary (From #15)

Complete increment management system combining TWO major enhancements:

### Part 1: Test-Aware Planning (✅ Delivered)
- **Eliminated tests.md** → Tests now embedded in tasks.md
- **BDD format**: Given/When/Then test plans
- **AC-ID traceability**: spec.md → tasks.md → tests
- **Coverage targets**: Realistic 80-90% per task

### Part 2: Smart Status Management (✅ Delivered)
- **Pause/Resume/Abandon commands**: Flexible workflow management
- **Type-based limits**: hotfix/bug/feature/refactor/experiment
- **WIP limits v2.0**: Simplified to 1 active (focus-first)
- **Metadata system**: Increment status tracking

---

## Impact

- ✅ **70%+ token reduction** from eliminating tests.md
- ✅ **Improved productivity** via WIP limits (research-backed)
- ✅ **Better traceability** via AC-ID linking
- ✅ **Flexible workflow** via pause/resume/abandon

---

## Links

- **Spec**: [spec.md](.specweave/increments/0007-smart-increment-discipline/spec.md)
- **Plan**: [plan.md](.specweave/increments/0007-smart-increment-discipline/plan.md)
- **Tasks**: [tasks.md](.specweave/increments/0007-smart-increment-discipline/tasks.md)

---

<details>
<summary><strong>📋 Original Detailed Breakdown (Click to Expand)</strong></summary>

# [Increment 0007] Increment Management v2.0 (Test-Aware + Smart Status)

[... original detailed content from #4 ...]

</details>

---

🤖 Generated with SpecWeave
```

**3. Update Labels on #4**
```bash
gh issue edit 4 \
  --add-label "completed" \
  --add-label "v0.7.0"
```

---

### Phase 2: Close #15 (Cross-Reference)

**1. Add Comment to #15**
```bash
gh issue comment 15 --body "$(cat <<'EOF'
🔄 **Consolidated into Issue #4**

This issue was created as a cleaner version of the original tracking
issue (#4), but we've decided to consolidate back to #4 to preserve
the complete implementation history.

**What Happened**:
- ✅ Executive summary merged into #4 description
- ✅ Modern naming convention [INC-0007] adopted in #4
- ✅ Impact metrics added to #4
- ✅ All historical progress preserved in #4

**Primary Tracking Issue**: #4

Closing this as duplicate. All future updates will be on #4.

---
🤖 Consolidated by SpecWeave
EOF
)"
```

**2. Close #15 as Duplicate**
```bash
gh issue close 15 --reason "not planned" --comment "Closing as duplicate of #4 (consolidated)"
```

---

### Phase 3: Update Metadata

**File**: `.specweave/increments/0007-smart-increment-discipline/metadata.json`

```json
{
  "id": "0007-smart-increment-discipline",
  "status": "completed",
  "type": "feature",
  "created": "2025-11-04T04:50:46.046Z",
  "lastActivity": "2025-11-04T13:30:00.000Z",
  "github": {
    "issue": 4,
    "url": "https://github.com/anton-abyzov/specweave/issues/4",
    "synced": "2025-11-04T13:30:00.000Z",
    "notes": "Consolidated from #15 to preserve historical context"
  }
}
```

---

## Execution Checklist

- [ ] Phase 1.1: Reopen #4 with consolidation comment
- [ ] Phase 1.2: Update #4 description (hybrid format)
- [ ] Phase 1.3: Update #4 labels (+completed, +v0.7.0)
- [ ] Phase 2.1: Add cross-reference comment to #15
- [ ] Phase 2.2: Close #15 as duplicate
- [ ] Phase 3: Update metadata.json to point to #4
- [ ] Verify: #4 is open, #15 is closed, metadata points to #4

---

## Result

**After Merge**:
- ✅ Issue #4: Primary tracking issue (OPEN)
  - Executive summary at top (clean)
  - Historical details in collapsible section
  - 27+ progress comments preserved
  - Labels: enhancement, increment, specweave, completed, v0.7.0

- ✅ Issue #15: Closed as duplicate
  - Cross-reference to #4
  - Clear explanation of consolidation

- ✅ Metadata: Points to #4
  - Single source of truth
  - Notes explain consolidation

**Benefits**:
- ✅ Single source of truth (no confusion)
- ✅ Complete audit trail (historical value)
- ✅ Clean presentation (executive summary)
- ✅ Cross-referenced (easy to find)
- ✅ Compliant (audit trail for compliance)

---

**End of Merge Strategy**
