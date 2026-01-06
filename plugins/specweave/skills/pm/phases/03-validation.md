# PM Phase 3: Validation

## Validation Checklist

Before marking increment ready, verify:

### 1. Spec Quality
- [ ] All user stories have acceptance criteria
- [ ] AC IDs follow format: AC-US{N}-{NN}
- [ ] Problem statement is clear
- [ ] Success metrics defined

### 2. File Structure
- [ ] `spec.md` in increment root
- [ ] `plan.md` in increment root (if architecture done)
- [ ] `tasks.md` in increment root (if planning done)
- [ ] `metadata.json` exists with correct status

### 3. Metadata Check

```json
{
  "increment": "0001-feature-name",
  "status": "active",
  "priority": "P0",
  "type": "feature",
  "created": "2026-01-06"
}
```

### 4. Cross-Reference Check
- [ ] User stories reference correct project
- [ ] Tasks link to user stories (T-001 → US-001)
- [ ] Acceptance criteria are traceable

## Common Issues

### Missing AC IDs
```markdown
❌ Wrong:
- [ ] User can log in

✅ Correct:
- [ ] **AC-US1-01**: User can log in with valid credentials
```

### Orphan Files
```markdown
❌ Wrong:
.specweave/increments/0001-auth/PM-REPORT.md

✅ Correct:
.specweave/increments/0001-auth/reports/PM-REPORT.md
```

### Status Mismatch
```markdown
❌ Wrong:
metadata.json says "completed" but tasks.md has unchecked tasks

✅ Correct:
All tasks [x] completed → status can be "completed"
```

## Validation Report Format

```markdown
## Increment Validation Report

**Increment**: 0001-feature-name
**Status**: ✅ VALID / ❌ ISSUES FOUND

### Checks
| Check | Status | Notes |
|-------|--------|-------|
| Spec quality | ✅ | 5 US, 18 ACs |
| File structure | ✅ | All files correct |
| Metadata | ✅ | Status matches |
| Cross-references | ✅ | All linked |

### Issues (if any)
- [Issue 1]
- [Issue 2]

### Recommendation
[Ready for implementation / Needs fixes]
```

## Token Budget: 200-400 tokens
