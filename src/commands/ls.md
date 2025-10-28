---
description: 🔥 Shorthand for /list-increments - List all increments (Alias)
---

# List Increments (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/list-increments`.

Use this when you want to quickly list increments without typing the full command name.

---

## Full Command

For complete documentation, see `/list-increments`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/ls [--status=<status>] [--format=<format>]
```

**Examples**:
```bash
/ls                          # All increments
/ls --status=in-progress     # Only in-progress
/ls --status=planned         # Only planned
/ls --format=detailed        # Detailed view
```

---

## What This Shows

**Default View** (Summary):
```
📋 SpecWeave Increments

Status: in-progress (2) | planned (3) | completed (5) | closed (4)

In Progress:
  0012-user-authentication     [████████░░] 80% (8/10 tasks)
  0013-payment-integration     [███░░░░░░░] 30% (3/10 tasks)

Planned:
  0014-admin-dashboard         [░░░░░░░░░░]  0% (0/15 tasks)
  0015-analytics-module        [░░░░░░░░░░]  0% (0/12 tasks)
```

**Detailed View** (`--format=detailed`):
Shows full spec summary, architecture approach, test coverage, etc.

---

## Status Filters

| Status | Description | Alias |
|--------|-------------|-------|
| `backlog` | Not yet planned | Ideas, proposals |
| `planned` | Spec created, not started | Ready to work |
| `in-progress` | Active work | Currently implementing |
| `completed` | Tasks done, ready to close | Awaiting review/merge |
| `closed` | Finished and archived | Done |

---

## Typical Usage

**Quick check**:
```bash
/ls --status=in-progress     # What am I working on?
```

**Planning**:
```bash
/ls --status=planned         # What's next?
```

**Review**:
```bash
/ls --format=detailed        # Full increment overview
```

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/si` - Start increment (shorthand for `/start-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/done` - Close increment (shorthand for `/close-increment`)
- `/at` - Add tasks (shorthand for `/add-tasks`)

---

**💡 Tip**: Use `/ls` daily to track progress across all increments.
