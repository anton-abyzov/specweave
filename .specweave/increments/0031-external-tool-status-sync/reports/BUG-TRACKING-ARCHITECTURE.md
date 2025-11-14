# Bug Tracking Architecture for Universal Hierarchy

## Overview

This document defines how bugs fit into SpecWeave's Universal Hierarchy alongside User Stories.

## Bug Hierarchy Position

Bugs exist at the **same level as User Stories** within features:

```
EPIC
├── FEATURE
│   ├── User Story (US-001)
│   ├── User Story (US-002)
│   ├── Bug (BUG-001)        ← Same level as US
│   └── Bug (BUG-002)
```

## File Structure

```
.specweave/docs/internal/specs/default/FS-25-11-12/
├── us-001-rich-external-issue-content.md      # User Story
├── us-002-task-level-mapping.md               # User Story
├── bug-001-status-sync-failure.md             # Bug
└── bug-002-duplicate-issue-creation.md        # Bug
```

## Bug File Format

```markdown
---
id: BUG-001
feature: FS-25-11-12
title: "Status Sync Failure"
type: bug
severity: P1        # P1 (Critical), P2 (Major), P3 (Minor)
status: open        # open, in-progress, resolved, closed
created: 2025-11-14
reporter: user@example.com
---

# BUG-001: Status Sync Failure

## Description
Clear description of the bug...

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen...

## Actual Behavior
What actually happens...

## Environment
- Version: 0.18.2
- OS: macOS
- Node: 18.x

## Root Cause Analysis
(Added after investigation)

## Resolution
(Added when fixed)

## Implementation
**Increment**: [0033-bug-fixes](../../../../../increments/0033-bug-fixes/tasks.md)

**Tasks**:
- [T-001: Fix status sync](../../../../../increments/0033-bug-fixes/tasks.md#t-001)
```

## GitHub Issue Format

Bug issues follow the same pattern as User Stories:

```
Title: [FS-25-11-12 BUG-001] Status Sync Failure
Labels: bug, P1, specweave
```

## Key Differences: Bugs vs User Stories

| Aspect | User Story | Bug |
|--------|------------|-----|
| **Purpose** | New functionality | Fix existing functionality |
| **Format** | "As a... I want... So that..." | Description + Reproduction steps |
| **Acceptance Criteria** | Feature requirements | Bug is fixed + no regression |
| **Priority** | P1/P2/P3 (business value) | P1/P2/P3 (severity) |
| **Testing** | Feature tests | Regression tests |
| **Lifecycle** | planning → in-progress → complete | open → in-progress → resolved → closed |

## Implementation Strategy

### Phase 1: Bug Reporting (Current)
- Bugs tracked as GitHub issues manually
- Link to feature via labels or description

### Phase 2: Bug Integration (Future)
1. Add `bug-*.md` file support to spec-distributor.ts
2. Update GitHub sync to handle BUG-XXX IDs
3. Add bug-specific fields (severity, environment, reproduction)
4. Create bug report templates

### Phase 3: Full Integration (Future)
- Bug dashboard showing bugs by feature
- Automatic bug → increment mapping
- Bug metrics and trends
- Integration with error monitoring tools

## Best Practices

1. **Bug Numbering**: Bugs are numbered per feature (BUG-001, BUG-002)
2. **Severity Levels**:
   - P1: Critical - System down, data loss, security
   - P2: Major - Feature broken, workaround exists
   - P3: Minor - Cosmetic, edge case

3. **Bug Lifecycle**:
   - **Open**: Bug reported, needs triage
   - **In-Progress**: Being fixed
   - **Resolved**: Fix implemented, needs verification
   - **Closed**: Fix verified in production

4. **Bug Location**: Bugs live in the feature folder where they occur

5. **Bug Increments**: Multiple bugs can be fixed in a single "bug-fix" increment

## GitHub Sync Updates

The sync script should handle both User Stories and Bugs:

```bash
# Process User Stories
for story_file in "$feature_dir"/us-*.md; do
  # Create issue with [FS-YY-MM-DD US-XXX] format
done

# Process Bugs
for bug_file in "$feature_dir"/bug-*.md; do
  # Create issue with [FS-YY-MM-DD BUG-XXX] format
done
```

## Migration Path

For existing projects with bugs:
1. Identify bugs currently tracked as issues
2. Create bug-*.md files in appropriate feature folders
3. Link bugs to fix increments
4. Update GitHub issues with proper format

## Decision

**Recommendation**: Implement Phase 1 now (manual tracking), plan Phase 2 for next quarter.

Bugs are conceptually at the same level as User Stories but with different lifecycle and fields. They belong to Features and get fixed via Increments, maintaining full traceability.