---
sidebar_position: 11
title: "Lesson 10: Advanced Patterns"
description: "Master advanced workflows"
---

# Lesson 10: Advanced Patterns

**Time**: 35 minutes
**Goal**: Master workflows for complex projects

---

## Pattern 1: Parallel Development

**When**: Large team, independent features

```
Developer A: 0001-authentication
Developer B: 0002-payment-processing
Developer C: 0003-notification-system
```

**Coordination**:
```bash
# View team status
/specweave:status --all

# Output:
0001-authentication        ████████░░  65%  (Dev A)
0002-payment-processing    ██████░░░░  50%  (Dev B)
0003-notification-system   ████░░░░░░  35%  (Dev C)

Total WIP: 3/5 (2 slots available)
```

---

## Pattern 2: Feature Flags

**When**: Gradual rollout needed

```markdown
<!-- spec.md -->

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `FF_NEW_AUTH` | false | Enable new auth flow |

## Rollout Plan

1. Week 1: Internal testing (admin only)
2. Week 2: 10% users
3. Week 3: 50% users
4. Week 4: 100% (remove flag)
```

---

## Pattern 3: [Microservices](/docs/glossary/terms/microservices) Coordination

**When**: Multiple repos need coordinated changes

```
my-app/
├── frontend/        → 0001-fe-user-auth
├── backend-auth/    → 0001-be-auth-service
├── backend-api/     → 0001-be-api-gateway
└── infrastructure/  → 0001-infra-auth
```

**Orchestration**:
```bash
# Start infra first
cd infrastructure && /specweave:do

# Then backend (parallel)
cd backend-auth && /specweave:do &
cd backend-api && /specweave:do &

# Finally frontend
cd frontend && /specweave:do
```

---

## Pattern 4: Hotfix Workflow

**When**: Production emergency

```bash
# Create hotfix (bypasses WIP)
/specweave:increment "Critical: Fix CVE-2025-1234" --type hotfix

# Fast-track execution
/specweave:do

# Expedited close
/specweave:done 0001 --expedite
```

**Hotfix spec template**:
```yaml
---
increment: 0050-hotfix-cve-2025
type: hotfix
priority: critical
bypass_gates: [docs]  # Skip doc gate for speed
---

# Hotfix: CVE-2025-1234

## Issue
SQL injection in search endpoint

## Fix
Parameterize query in SearchService.ts

## Verification
- [ ] Exploit no longer works
- [ ] Existing tests pass
```

---

## Pattern 5: Spike/Exploration

**When**: Technical unknown to investigate

```bash
/specweave:increment "Spike: Evaluate GraphQL migration" --type spike
```

**Spike structure**:
```yaml
---
increment: 0010-spike-graphql
type: spike
timebox: 8h
---

# Spike: GraphQL Migration

## Questions to Answer
1. Can we migrate incrementally?
2. What's the performance impact?
3. How do we handle auth?

## Timebox
8 hours max. Stop and document regardless.
```

**Outcome**:
```markdown
## Findings
1. **Incremental migration**: YES - Apollo Federation
2. **Performance**: 15% slower simple, 40% faster complex
3. **Auth**: Works with existing JWT

## Recommendation
Proceed with 0011-graphql-phase-1
```

---

## Pattern 6: Brownfield Integration

**When**: Adopting SpecWeave on existing project

```bash
# Initialize for brownfield
specweave init . --brownfield

# Import existing issues
/specweave-github:sync --import-only --since "2025-01-01"

# Create new increment
/specweave:increment "New feature X"

# Link to existing issue
/specweave-github:create-issue 0001 --link-existing 42
```

---

## Pattern 7: Multi-Project Mode

**When**: Separate specs per team

```bash
# Initialize multi-project
/specweave:init-multiproject

# Creates:
.specweave/
├── projects/
│   ├── frontend/
│   │   └── specs/
│   ├── backend/
│   │   └── specs/
│   └── mobile/
│       └── specs/
└── _shared/
    └── specs/  # Cross-team features
```

**Switching projects**:
```bash
/specweave:switch-project frontend
/specweave:increment "New UI component"
```

---

## Pattern 8: Release Train

**When**: Scheduled releases

```markdown
Q1 2025 Release Train:
├── 0001-authentication     ✅ Complete
├── 0002-payments           ✅ Complete
├── 0003-notifications      🔄 In Progress
├── 0004-analytics          📋 Backlog
└── 0005-performance        📋 Backlog
```

**Release command**:
```bash
/specweave-release:npm
# Creates version bump, git tag, changelog
```

---

## Pattern 9: AI Code Review

**When**: Pre-commit quality check

```bash
/specweave:qa 0001 --review-only
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODE REVIEW: 0001-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Changed: 12
Lines: +342 / -45

Security:
  ⚠️ src/auth.ts:45 - Potential SQL injection
  ✅ Password hashing using bcrypt

Performance:
  ⚠️ src/user-service.ts:120 - N+1 query

Suggestions:
  1. Parameterize query at auth.ts:45
  2. Add eager loading at user-service.ts:120
```

---

## Pattern Selection Guide

| Scenario | Pattern |
|----------|---------|
| Multiple developers | Parallel Development |
| Gradual rollout | Feature Flags |
| Multiple services | Microservices Coordination |
| Production emergency | Hotfix Workflow |
| Technical unknown | Spike/Exploration |
| Existing codebase | Brownfield Integration |
| Multiple teams | Multi-Project Mode |
| Scheduled releases | Release Train |
| Quality assurance | AI Code Review |

---

## Glossary Terms Used

- **[Microservices](/docs/glossary/terms/microservices)** — Independent service architecture
- **[Feature Flags](/docs/glossary/terms/feature-flags)** — Toggle features on/off
- **[Branching Strategy](/docs/glossary/terms/branching-strategy)** — Git workflow

---

## Congratulations!

You've completed the SpecWeave Academy.

### Core Philosophy

> **Specification is the [source of truth](/docs/glossary/terms/source-of-truth).**
> **AI is your implementation partner.**
> **[Quality gates](/docs/glossary/terms/acceptance-criteria) protect your codebase.**

### What's Next

- **Practice**: Apply patterns to real projects
- **Customize**: Adapt to your team's needs
- **Contribute**: Share patterns with the community

### Resources

- [Full Documentation](/)
- [Commands Reference](/docs/commands/overview)
- [Glossary](/docs/glossary)
- [GitHub Repository](https://github.com/specweave/specweave)

---

🎉 **Now go build something amazing with SpecWeave!**
