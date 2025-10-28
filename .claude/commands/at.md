---
description: 🔥 Shorthand for /add-tasks - Add tasks to increment (Alias)
---

# Add Tasks (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/add-tasks`.

Use this when you want to quickly add tasks to an increment without typing the full command name.

---

## Full Command

For complete documentation, see `/add-tasks`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/at <increment-id> <task-description>
```

**Examples**:
```bash
/at 0001 "Implement login endpoint"
/at 0001 "Add password validation"
/at 0001 "Write E2E tests for auth flow"
```

---

## What This Does

1. **Analyzes task** against spec/plan
2. **Determines priority** (P1, P2, P3)
3. **Estimates effort** (based on complexity)
4. **Identifies dependencies** (from existing tasks)
5. **Adds to tasks.md** with proper formatting
6. **Updates progress** percentage

---

## Task Format

Tasks are added with:
- ✅ **Task ID** (auto-numbered: T001, T002, ...)
- ✅ **Description** (clear, actionable)
- ✅ **Priority** (P1/P2/P3)
- ✅ **Estimated time** (based on analysis)
- ✅ **Dependencies** (if any)
- ✅ **Status** (Pending by default)

**Example Output**:
```markdown
### T012: Implement login endpoint
**Priority**: P1
**Estimated**: 2 hours
**Depends on**: T008
**Status**: [ ] Pending

**Implementation**:
- Create POST /api/auth/login endpoint
- Validate email and password
- Return JWT token on success
- Handle rate limiting
```

---

## Bulk Add

You can add multiple tasks by calling the command multiple times or providing a list:

```bash
/at 0001 "Task 1"
/at 0001 "Task 2"
/at 0001 "Task 3"
```

---

## When to Add Tasks

**During planning**:
- Breaking down large features
- After spec/plan review

**During implementation**:
- Discovered new requirements
- Technical debt identified
- Bug fixes needed

**After review**:
- Feedback from code review
- QA findings
- Security audit results

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/si` - Start increment (shorthand for `/start-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/done` - Close increment (shorthand for `/close-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)

---

**💡 Tip**: Add tasks as you discover them - don't wait until sprint planning!
