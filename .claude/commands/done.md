---
description: 🔥 Shorthand for /close-increment - Close completed increment (Alias)
---

# Close Increment (Short Alias)

**⚡ Quick Alias**: This is a shorthand command for `/close-increment`.

Use this when you want to quickly close an increment without typing the full command name.

---

## Full Command

For complete documentation, see `/close-increment`.

This alias provides the exact same functionality as the full command.

---

## Usage

```bash
/done <increment-id>
```

**Examples**:
```bash
/done 0001
/done 0042
```

---

## What This Does

1. **Validates completion**:
   - ✅ All P1 tasks completed
   - ✅ Tests passing
   - ✅ Documentation updated
   - ⚠️ Warns if incomplete

2. **Handles leftover tasks**:
   - Prompts to transfer incomplete tasks to new increment
   - OR mark as deferred/cancelled
   - Ensures no work is lost

3. **Updates status** to `closed` in `tasks.md`

4. **Archives increment** (if configured)

5. **Suggests next steps**:
   - Merge PR (if using git workflow)
   - Deploy (if using CI/CD)
   - Create release notes

---

## Before Closing Checklist

**Required**:
- [ ] All P1 tasks completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated

**Optional** (based on project):
- [ ] Performance validated
- [ ] Security reviewed
- [ ] Accessibility tested
- [ ] E2E tests passing

---

## Leftover Task Handling

If you have incomplete tasks, you'll be prompted:

```
⚠️ Incomplete Tasks Found: 3

Options:
1. Transfer to new increment (recommended)
2. Mark as deferred (with reason)
3. Cancel tasks (not recommended)

What would you like to do?
```

**Best Practice**: Transfer to new increment to maintain continuity.

---

## Other Useful Aliases

- `/ci` - Create increment (shorthand for `/create-increment`)
- `/si` - Start increment (shorthand for `/start-increment`)
- `/vi` - Validate increment (shorthand for `/validate-increment`)
- `/ls` - List increments (shorthand for `/list-increments`)

---

**💡 Tip**: Always run `/vi --quality` before `/done` to ensure quality.
