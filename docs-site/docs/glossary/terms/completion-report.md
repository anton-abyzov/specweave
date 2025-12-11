---
id: completion-report
title: Completion Report
sidebar_label: Completion Report
---

# Completion Report

A **completion report** is automatically generated when closing an [increment](/docs/glossary/terms/increments) with [/sw:done](/docs/glossary/terms/specweave-done), documenting what was accomplished.

## When Generated

Created automatically when:
1. [/sw:done](/docs/glossary/terms/specweave-done) is called
2. All [quality gates](/docs/glossary/terms/quality-gate) pass
3. [PM Agent](/docs/glossary/terms/pm-agent) validates completion

## Report Contents

### Summary Section

```markdown
## Completion Report: 0007-user-authentication

**Status**: Completed
**Duration**: 2.1 weeks (Nov 1 - Nov 15, 2025)
**Type**: Feature
```

### Tasks Summary

```markdown
## Task Summary

- **Total Tasks**: 42
- **Completed**: 42 (100%)
- **User Stories Completed**: 3/3
```

### Test Coverage

```markdown
## Test Coverage

| Type | Coverage | Target |
|------|----------|--------|
| Unit | 92% | 90% |
| Integration | 88% | 85% |
| E2E | 100% | 100% critical |
```

### ADRs Created

```markdown
## Architecture Decisions

- **ADR-0032**: JWT for authentication (Accepted)
- **ADR-0035**: bcrypt for password hashing (Accepted)
- **ADR-0036**: Token rotation strategy (Accepted)
```

### Deliverables

```markdown
## Deliverables

- `src/services/AuthService.ts` - Core authentication
- `src/middleware/jwt.ts` - Token validation
- `src/routes/auth.ts` - Auth endpoints
- `tests/auth.test.ts` - 45 test cases
```

## Storage Location

```
.specweave/increments/0007-user-authentication/
├── spec.md
├── plan.md
├── tasks.md
├── metadata.json
└── reports/
    └── completion-report.md  ← Generated here
```

## Living Docs Sync

The completion report is also synced to [living documentation](/docs/glossary/terms/living-docs):

```
.specweave/docs/internal/increments/
└── 0007-user-authentication/
    └── completion-report.md
```

## Related

- [/sw:done](/docs/glossary/terms/specweave-done) - Close command
- [Quality Gate](/docs/glossary/terms/quality-gate) - Validation checks
- [Living Docs](/docs/glossary/terms/living-docs) - Documentation system
- [Increments](/docs/glossary/terms/increments) - Work units
