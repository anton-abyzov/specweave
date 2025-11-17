---
name: specweave-plan
description: Generate plan.md and tasks.md for PLANNING increment using Architect Agent
---

# /specweave:plan - Generate Implementation Plan

Generate `plan.md` and `tasks.md` for an increment using Architect Agent and test-aware-planner.

## Usage

```bash
/specweave:plan                      # Auto-detect PLANNING increment
/specweave:plan 0039                 # Explicit increment ID
/specweave:plan --force              # Overwrite existing plan/tasks
/specweave:plan 0039 --verbose       # Verbose output
```

## What It Does

1. **Auto-detect increment** (if not specified):
   - Prefers PLANNING status
   - Falls back to single ACTIVE increment

2. **Validate pre-conditions**:
   - spec.md exists and is not empty
   - Increment is not COMPLETED/ABANDONED
   - plan.md/tasks.md don't exist (unless --force)

3. **Generate plan.md** (via Architect Agent):
   - Technical approach
   - Architecture design
   - Dependencies
   - Risk assessment

4. **Generate tasks.md** (via test-aware-planner):
   - Checkable task list
   - Embedded test plans (BDD format)
   - Coverage targets

5. **Update metadata**:
   - PLANNING → ACTIVE transition (tasks.md now exists)
   - Update lastUpdated timestamp

## Options

- `--force`: Overwrite existing plan.md/tasks.md
- `--preserve-task-status`: Keep existing task completion status (requires --force)
- `--verbose`: Show detailed execution information

## Examples

**Auto-detect and plan**:
```bash
/specweave:plan
# ✅ Auto-detected increment: 0039-ultra-smart-next-command
# ✅ Generated plan.md (2.5K)
# ✅ Generated tasks.md (4.2K, 15 tasks)
# ✅ Transitioned PLANNING → ACTIVE
```

**Force regenerate**:
```bash
/specweave:plan 0039 --force
# ⚠️  Overwriting existing plan.md
# ⚠️  Overwriting existing tasks.md
# ✅ Generated plan.md (2.8K)
# ✅ Generated tasks.md (5.1K, 18 tasks)
```

**Multiple PLANNING increments**:
```bash
/specweave:plan
# ❌ Multiple increments in PLANNING status found:
#    - 0040-feature-a
#    - 0041-feature-b
# Please specify: /specweave:plan 0040
```

## Workflow Integration

**Typical workflow**:
```bash
# 1. Create increment (generates spec.md)
/specweave:increment "Add user authentication"
# Status: BACKLOG → PLANNING (spec.md created)

# 2. Edit spec.md (add requirements, ACs)
# ... edit spec.md ...

# 3. Generate plan and tasks
/specweave:plan
# Status: PLANNING → ACTIVE (tasks.md created)

# 4. Execute tasks
/specweave:do
```

## Error Handling

**spec.md not found**:
```bash
❌ spec.md not found in increment '0039-ultra-smart-next-command'
💡 Create spec.md first using `/specweave:increment` or manually
```

**plan.md already exists**:
```bash
❌ plan.md already exists in increment '0039'
💡 Use --force to overwrite existing plan.md
```

**Increment closed**:
```bash
❌ Cannot generate plan for COMPLETED increment
💡 Reopen increment with `/specweave:reopen` first
```

## Architecture

**Components**:
- `IncrementDetector`: Auto-detect or validate increment
- `PlanValidator`: Validate pre-conditions
- `ArchitectAgentInvoker`: Generate plan.md via Architect Agent
- `TaskGeneratorInvoker`: Generate tasks.md via test-aware-planner
- `PlanCommandOrchestrator`: Coordinate execution pipeline

**State transitions**:
- PLANNING → ACTIVE (when tasks.md created)
- ACTIVE → ACTIVE (regenerate plan/tasks)
- BACKLOG → (no change - spec.md already exists)

## Related Commands

- `/specweave:increment` - Create new increment (generates spec.md)
- `/specweave:do` - Execute tasks from tasks.md
- `/specweave:validate` - Validate increment structure
- `/specweave:sync-docs` - Sync spec changes to living docs

## Notes

- **Auto-transition**: Creating tasks.md automatically transitions PLANNING → ACTIVE
- **Force mode**: Use with caution - overwrites existing work
- **Preserve status**: Use `--preserve-task-status` to keep completion checkmarks when regenerating
- **Architect Agent**: Requires ~10-30 seconds for plan generation
- **Test coverage**: tasks.md includes embedded test plans for each task

---

**Part of**: Increment 0039 (Ultra-Smart Next Command)
**Status**: Phase 1 - Foundation (US-007)
