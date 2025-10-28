---
description: 🔥 Shorthand for /start-increment - Start working on increment (Alias)
---

# Start Increment (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/start-increment`.

Use this when you want to quickly start working on an increment without typing the full command name.

---

## Full Command

For complete documentation, see `/start-increment`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/si <increment-id>
```

**Examples**:
```bash
/si 0001
/si 0042
/si 0123
```

---

## What This Does

1. **Updates status** to `in-progress` in `tasks.md`
2. **Loads context** via context-manifest.yaml
3. **Creates feature branch** (if git workflow enabled)
4. **Shows increment summary**:
   - Spec highlights (user stories, goals)
   - Architecture approach
   - Task breakdown
   - Test strategy

---

## Typical Workflow

```bash
# 1. Create increment
/ci "User authentication"

# 2. Review generated specs
# ... check spec.md, plan.md, tasks.md ...

# 3. Start working
/si 0001

# 4. Implement tasks
# ... write code, tests, docs ...

# 5. Validate quality
/vi 0001 --quality

# 6. Close when done
/done 0001
```

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/done` - Close increment (shorthand for `/close-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)
- `/at` - Add tasks (shorthand for `/add-tasks`)

---

**💡 Tip**: Always validate (`/vi`) before starting to catch spec issues early.
