---
id: specweave-done
title: /specweave:done Command
sidebar_label: specweave:done
---

# /specweave:done Command

The **`/specweave:done`** command closes an [increment](/docs/glossary/terms/increments) after validating that all [quality gates](/docs/glossary/terms/quality-gate) pass.

## What It Does

**Key actions:**
- Validates all tasks in [tasks.md](/docs/glossary/terms/tasks-md) are complete
- Runs [/specweave:qa](/docs/glossary/terms/specweave-qa) with `--gate` flag
- [PM Agent](/docs/glossary/terms/pm-agent) validates completion
- Creates completion report
- Closes external tool issues (GitHub, JIRA, ADO)
- Updates [living docs](/docs/glossary/terms/living-docs)

## Usage

```bash
# Close specific increment
/specweave:done 0007

# Close active increment
/specweave:done
```

## Three-Gate Validation

### Gate 1: Tasks Complete

All tasks in tasks.md must be marked `[x]`:

```markdown
### T-001: Implement AuthService
**Status**: [x] completed  ← Required

### T-002: Add JWT validation
**Status**: [x] completed  ← Required
```

### Gate 2: Tests Pass

Minimum [test coverage](/docs/glossary/terms/test-coverage):
- Unit tests: 90%
- Integration tests: 85%
- [E2E](/docs/glossary/terms/e2e) tests: 100% critical paths

### Gate 3: Docs Updated

[Living documentation](/docs/glossary/terms/living-docs) synchronized:
- [ADRs](/docs/glossary/terms/adr) updated (Proposed → Accepted)
- API docs current
- Feature lists updated

## Output

```bash
$ /specweave:done 0007

📊 Validating increment 0007-user-authentication...

✅ Gate 1: Tasks Complete (42/42)
✅ Gate 2: Tests Pass (92% coverage)
✅ Gate 3: Docs Updated

🎉 Increment 0007-user-authentication COMPLETED!

📝 Completion Report:
  - Duration: 2.1 weeks
  - Tasks: 42 completed
  - Coverage: 92%
  - ADRs: 3 accepted

🔗 GitHub Issue #123 closed
```

## PM Agent Review

The [PM Agent](/docs/glossary/terms/pm-agent) validates:
- All [acceptance criteria](/docs/glossary/terms/acceptance-criteria) satisfied
- No scope creep detected
- Business objectives met
- Documentation complete

## Related

- [Quality Gate](/docs/glossary/terms/quality-gate) - Validation checkpoints
- [/specweave:qa](/docs/glossary/terms/specweave-qa) - Quality assessment
- [/specweave:do](/docs/glossary/terms/specweave-do) - Execute tasks
- [PM Agent](/docs/glossary/terms/pm-agent) - Validation agent
- [Increments](/docs/glossary/terms/increments) - Work units
