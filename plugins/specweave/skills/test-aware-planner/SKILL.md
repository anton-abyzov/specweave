---
name: test-aware-planner
description: Generate tasks.md with embedded test plans in BDD format, one user story at a time to prevent crashes. Use for test-first task planning where each task includes Given/When/Then scenarios. Produces implementation tasks with inline test specifications.
allowed-tools: Read, Write, Grep, Glob, Edit
---

# Test-Aware Planner Skill

## Overview

You generate `tasks.md` with embedded test plans for each task. No separate tests.md - tests are inline with tasks.

## Progressive Disclosure

Load phases as needed:

| Phase | When to Load | File |
|-------|--------------|------|
| Spec Analysis | Reading spec.md/plan.md | `phases/01-spec-analysis.md` |
| Task Generation | Creating tasks | `phases/02-task-generation.md` |
| Validation | Checking AC coverage | `phases/03-validation.md` |

## Core Principles

1. **ONE user story per response** - Never generate all tasks at once
2. **Embedded tests** - Test plans inline with tasks
3. **AC coverage** - Every AC-ID must be covered

## Quick Reference

### Task Format

```markdown
## User Story: US-001 - Title

**Linked ACs**: AC-US1-01, AC-US1-02
**Tasks**: X total, 0 completed

### T-001: Task Title

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

**Test Plan**:
- **Given** precondition
- **When** action
- **Then** expected result

**Test Cases**:
1. **Unit**: `tests/unit/feature.test.ts`
   - testFeatureSuccess(): Description
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/flow.test.ts`
   - testFullFlow(): Description
   - **Coverage Target**: 85%

**Implementation**:
1. Create file
2. Implement function
3. Run tests
```

### Coverage Targets

| Code Type | Target |
|-----------|--------|
| Core logic | 90-95% |
| API endpoints | 85-90% |
| Utilities | 80-85% |
| Overall | 80-90% |

### Multi-Project Format

If umbrella.enabled in config:
```markdown
## Phase 1: Shared (sw-app-shared)

### User Story: US-SHARED-001 - Types
**Linked ACs**: AC-SHARED-US1-01
```

## Workflow

1. **Analysis** (< 500 tokens): List user stories, ask which first
2. **Generate ONE US tasks** (< 800 tokens): Write to tasks.md
3. **Report progress**: "US-001 complete. Ready for US-002?"
4. **Repeat**: One user story at a time

## Token Budget

- **Analysis**: 300-500 tokens
- **Each user story**: 600-800 tokens

**NEVER exceed 2000 tokens per response!**

## Validation Checklist

- [ ] All AC-IDs from spec.md covered
- [ ] Each testable task has Given/When/Then
- [ ] Coverage targets are 80-90%
- [ ] Tasks grouped by User Story
- [ ] Frontmatter has by_user_story map
