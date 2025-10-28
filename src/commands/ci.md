---
description: 🔥 Shorthand for /create-increment - Create new increment (Alias)
---

# Create Increment (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/create-increment`.

Use this when you want to quickly create a new SpecWeave increment without typing the full command name.

---

## Full Command

For complete documentation, see `/create-increment`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/ci "Feature name"
```

**Example**:
```bash
/ci "User authentication"
/ci "Payment processing"
/ci "Admin dashboard"
```

---

## What This Does

1. **Auto-numbers** the increment (e.g., 0001, 0002, 0003...)
2. **Creates folder** at `.specweave/increments/XXXX-feature-name/`
3. **Generates files**:
   - `spec.md` - WHAT & WHY (user stories, acceptance criteria)
   - `plan.md` - HOW (architecture, implementation strategy)
   - `tasks.md` - Implementation checklist
   - `tests.md` - Test strategy and coverage matrix
   - `context-manifest.yaml` - Context loading configuration
4. **Invokes agents**:
   - PM agent (requirements analysis)
   - Architect agent (technical design)
   - QA Lead agent (test strategy)

---

## Other Useful Aliases

- `/si` - Start increment (shorthand for `/start-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/done` - Close increment (shorthand for `/close-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)
- `/at` - Add tasks (shorthand for `/add-tasks`)

---

**💡 Tip**: Use `/ci` for speed, `/create-increment` for clarity in scripts.
