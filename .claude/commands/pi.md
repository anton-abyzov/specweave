---
description: 🔥 Shorthand for /create-increment - Plan Product Increment (Alias)
---

# Plan Product Increment (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/create-increment`.

**PI = Product Increment** - Standard Agile terminology for a planned unit of work.

Use this when you want to quickly create a new SpecWeave increment without typing the full command name.

---

## Full Command

For complete documentation, see `/create-increment`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/pi "Feature name"
```

**Example**:
```bash
/pi "User authentication"
/pi "Payment processing"
/pi "Admin dashboard"
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

**💡 Tip**: Use `/pi` for speed (PI = Product Increment in Agile), `/create-increment` for clarity in scripts.
