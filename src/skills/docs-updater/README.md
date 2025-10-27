# docs-updater Skill

**Status**: To be developed
**Priority**: High

## Purpose

Updates product documentation (.specweave/docs/) during implementation

## When It Activates

- When tasks.md specifies documentation updates
- During implementation of tasks
- When feature is completed
- User says "update documentation"

## What It Does

1. **Reads task requirements**: Understands what was implemented
2. **Updates docs**: Modifies .specweave/docs/ files
3. **Status tracking**: Changes [DRAFT] → [COMPLETE]
4. **Bi-directional links**: Maintains links between docs and increments
5. **Format adaptation**: Matches existing doc structure (features/ or modules/)

## Example

```markdown
# Task says:
**Documentation Updates**:
- [ ] .specweave/docs/features/payment.md [DRAFT]
- [ ] .specweave/docs/api/payments.md [DRAFT]

# docs-updater:
1. Reads implementation
2. Updates payment.md with actual code examples
3. Updates API docs with real endpoints
4. Changes status to [COMPLETE]
```

## Integration

- Called by: task-builder (when tasks need doc updates)
- Calls: None (updates files directly)
- Updates: .specweave/docs/**/*.md

---

**To implement**: See task in .specweave/increments/
