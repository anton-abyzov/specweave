# /add-tasks - Add Tasks to Existing Increment

**Command**: `/add-tasks <increment-id> <description> [options]`

**Purpose**: Add new tasks to an existing increment during implementation

**Framework**: Framework-agnostic (works with all tech stacks)

---

## Usage

```bash
/add-tasks 001 "Fix error handling in context-loader"
/add-tasks 001 --priority P2 "Add caching to skill-router"
/add-tasks 001 "Multiple task lines..." --estimate "3 days"
```

## Arguments

- `<increment-id>` (required): Increment number (e.g., `001`, `002`)
- `<description>` (required): Task description
- `--priority` (optional): P1/P2/P3 (default: P2)
- `--estimate` (optional): Time estimate (default: detected from description)

---

## When to Use

**Add as task** ✅ when:
- Duration: Hours-Days
- Components affected: 1 agent/skill
- Discovered during implementation
- Examples: Bug fixes, small enhancements, error handling

**Create new increment** ❌ when:
- Duration: Weeks+
- Components affected: 2+ agents/skills
- Major new feature
- Use `/create-increment` instead

---

## Workflow

### Step 1: Validate Increment

```
Validating increment 001-core-framework...

→ Status: in-progress ✅ (can add tasks)
→ Current tasks: 50
→ Completed: 44 (88%)
```

**If increment not valid**:
```
❌ Cannot add tasks

Reason: Increment 001 status is "closed"

Options:
A) Create new increment (recommended)
B) Reopen 001 (if justified)
```

### Step 2: Auto-Increment Task ID

```
→ Scanning tasks.md for highest task ID...
→ Found: T050
→ New task ID: T051
```

### Step 3: Add to tasks.md

```markdown
## Additional Tasks (Added During Implementation)

### T051: Fix error handling in context-loader
**Added**: 2025-10-26
**Discovered**: During integration testing
**Priority**: P1
**Estimated**: 2 hours
**Status**: [ ] Pending

**Implementation**:
- Check if manifest file exists before parsing
- Return helpful error message with file path
- Log warning to .specweave/increments/001-core-framework/logs/errors.log

**Acceptance Criteria**:
- [ ] Handles missing manifest gracefully
- [ ] Error message includes file path
- [ ] No crash when manifest not found
```

### Step 4: Update Frontmatter

Update `spec.md`:

```yaml
---
updated: 2025-10-26      # ← Current date
total_tasks: 51          # ← Incremented
completed_tasks: 44      # ← Unchanged
completion_rate: 86      # ← Recalculated (44/51)
---
```

### Step 5: Confirm

```
✅ Task added successfully

Summary:
→ Task ID: T051
→ Description: Fix error handling in context-loader
→ Priority: P1
→ Increment: 001-core-framework
→ Total tasks: 51 (was 50)
→ Completion rate: 86% (was 88%)

File: .specweave/increments/001-core-framework/tasks.md
```

---

## Examples

### Example 1: Bug Fix

```bash
/add-tasks 001 "Fix null pointer in skill-router when no skills installed"

# Result:
→ Task T052: Fix null pointer in skill-router
→ Priority: P1 (critical bug)
→ Estimated: 1 hour
```

### Example 2: Enhancement

```bash
/add-tasks 001 --priority P2 "Add caching to context-loader for better performance"

# Result:
→ Task T053: Add caching to context-loader
→ Priority: P2 (enhancement)
→ Estimated: 1 day
```

### Example 3: Multiple Tasks

```bash
/add-tasks 001 "Add error handling, logging, and validation to hetzner-provisioner"

# Result:
→ Task T054: Add error handling to hetzner-provisioner
→ Task T055: Add logging to hetzner-provisioner
→ Task T056: Add validation to hetzner-provisioner
→ Priority: P2 (improvements)
```

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md#adding-tasks-to-current-increment) - Task addition guide
- [INCREMENT-LIFECYCLE-DESIGN.md](../../.specweave/increments/001-core-framework/reports/INCREMENT-LIFECYCLE-DESIGN.md) - Lifecycle design

---

**Command Type**: Task management
**Framework Support**: All
**Impact**: Adds tasks to existing increment, updates completion rate
