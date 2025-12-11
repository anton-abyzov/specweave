---
id: chunked-editing
title: Chunked Editing
sidebar_label: Chunked Editing
---

# Chunked Editing

**Chunked Editing** is a best practice for making multiple changes to files by breaking large edits into smaller, sequential operations. This prevents [context explosion](/docs/glossary/terms/context-explosion) and ensures reliable file modifications.

---

## Why It Matters

Large edit operations can fail or cause crashes because:

1. **Context load**: Each edit loads file content into memory
2. **Verification**: Claude verifies changes match expectations
3. **Rollback preparation**: State saved for potential rollback
4. **Token limits**: Combined context may exceed limits

---

## Safe Chunk Sizes

| Lines Changed | Risk Level | Recommendation |
|---------------|------------|----------------|
| 1-30 lines | Safe | Single edit operation |
| 30-60 lines | Moderate | Consider splitting |
| 60+ lines | High | Split into chunks |
| 100+ lines | Very High | Must split |

---

## Chunked Editing Pattern

Instead of one large edit:

```bash
# ❌ RISKY: 100+ line edit
Edit file with old_string (50 lines) → new_string (80 lines)
```

Use multiple smaller edits:

```bash
# ✅ SAFE: Multiple small edits
Edit 1: Change function signature (5 lines)
Edit 2: Update first section (20 lines)
Edit 3: Update second section (25 lines)
Edit 4: Add new helper function (30 lines)
```

---

## When to Use Chunked Editing

1. **Large refactors**: Breaking changes across a file
2. **Multi-section updates**: Changes in different parts of file
3. **Complex migrations**: Updating patterns throughout file
4. **Adding new code**: Large new sections

---

## Practical Example

### Before (Risky)

```
Task: Add authentication to all API routes

❌ Single edit:
- Remove 50 lines of old middleware
- Add 80 lines of new auth middleware
- Update 20 route definitions
Total: 150 lines changed at once = HIGH RISK
```

### After (Safe)

```
Task: Add authentication to all API routes

✅ Chunked approach:
Edit 1: Add auth middleware import (2 lines)
Edit 2: Add auth config section (15 lines)
Edit 3: Update route group 1 (10 lines)
Edit 4: Update route group 2 (10 lines)
Edit 5: Update route group 3 (10 lines)
Edit 6: Remove old middleware (cleanup)
Total: 6 smaller edits = SAFE
```

---

## Best Practices

1. **Plan edits before starting**: Identify logical chunks
2. **One concern per edit**: Group related changes
3. **Verify after each chunk**: Check file state
4. **Commit checkpoints**: Save progress between major chunks
5. **Use focused reads**: Read only the section you're editing

---

## With SpecWeave

When working on increments:

```bash
# Large file + active increment = HIGH RISK
# Pause increment first
/sw:pause 0058

# Make chunked edits
# Edit 1, verify
# Edit 2, verify
# Edit 3, verify

# Resume increment
/sw:resume 0058
```

---

## Related Terms

- [Context Explosion](/docs/glossary/terms/context-explosion) - What chunked editing prevents
- [Source of Truth](/docs/glossary/terms/source-of-truth) - Files being edited
- [Hooks](/docs/glossary/terms/hooks) - May trigger on edits
