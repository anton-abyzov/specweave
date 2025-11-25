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

## Command Reference by Workflow Stage

Here's a comprehensive reference of commands organized by when you'll use them:

### Planning Phase

```bash
# Create new work
/specweave:increment "feature"      # New feature increment
/specweave:increment "fix" --type bug       # Bug fix
/specweave:increment "spike" --type spike   # Exploration

# Review specs
cat .specweave/increments/0001-feature/spec.md
cat .specweave/increments/0001-feature/plan.md
cat .specweave/increments/0001-feature/tasks.md
```

### Implementation Phase

```bash
# Execute work
/specweave:do                        # Auto-resume active increment
/specweave:do 0001                   # Specific increment

# Check progress
/specweave:progress                  # All increments
/specweave:progress 0001             # Specific increment

# Workflow guidance
/specweave:workflow                  # Smart suggestions
/specweave:next                      # What to do next
```

### Quality Phase

```bash
# Validation
/specweave:validate 0001             # Rule-based checks (120+ rules)
/specweave:qa 0001                   # AI quality assessment
/specweave:qa 0001 --pre             # Before starting work
/specweave:qa 0001 --gate            # Before closing

# Testing
/specweave:check-tests 0001          # Test coverage check
```

### Completion Phase

```bash
# Close increment
/specweave:done 0001                 # Normal close (validates gates)
/specweave:done 0001 --expedite      # Emergency close (skip gates)

# Sync documentation
/specweave:sync-docs update          # Update living docs
/specweave:sync-progress             # Full sync to all systems
```

### Lifecycle Management

```bash
# Status transitions
/specweave:pause 0001                # Pause (blocked, deprioritized)
/specweave:resume 0001               # Resume paused work
/specweave:backlog 0001              # Move to backlog
/specweave:abandon 0001              # Cancel (obsolete, requirements changed)

# Workspace cleanup
/specweave:archive 0001              # Archive completed increment
/specweave:archive --completed       # Archive all completed
/specweave:restore 0001              # Restore archived increment

# Status overview
/specweave:status                    # All increments
/specweave:status --all              # Include completed
/specweave:sync-status               # Fix status desync
```

### External Tool Sync

```bash
# GitHub
/specweave-github:status             # Check connection
/specweave-github:create-issue 0001  # Create issue
/specweave-github:sync 0001          # Sync progress
/specweave-github:close-issue 0001   # Close issue

# JIRA
/specweave-jira:status               # Check connection
/specweave-jira:sync 0001            # Sync to JIRA
/specweave-jira:sync 0001 --create   # Create Epic hierarchy

# Azure DevOps
/specweave-ado:status                # Check connection
/specweave-ado:sync 0001             # Sync to ADO
/specweave-ado:create-workitem 0001  # Create work item
```

---

## Glossary Terms Used

- **[Microservices](/docs/glossary/terms/microservices)** — Independent service architecture
- **[Feature Flags](/docs/glossary/terms/feature-flags)** — Toggle features on/off
- **[Branching Strategy](/docs/glossary/terms/branching-strategy)** — Git workflow
- **[Quality Gate](/docs/glossary/terms/quality-gate)** — Validation checkpoint
- **[WIP Limits](/docs/glossary/terms/wip-limits)** — Work-in-progress constraints

---

## Continue Learning

You've completed the core curriculum! For specialized topics, continue with:

### Deep-Dive Lessons

- [Lesson 11: The Vibe Coding Problem](./11-vibe-coding-problem) — Why SpecWeave exists
- [Lesson 12: The specweave init Deep Dive](./12-init-deep-dive) — Master initialization
- [Lesson 13: Increment Lifecycle Management](./13-increment-lifecycle) — Status, cleanup, archiving
- [Lesson 14: GitHub Integration Guide](./14-github-integration) — Complete GitHub setup
- [Lesson 15: JIRA Integration Guide](./15-jira-integration) — Complete JIRA setup
- [Lesson 16: Azure DevOps Integration Guide](./16-ado-integration) — Complete ADO setup

---

## Congratulations!

You've completed the SpecWeave Academy core curriculum.

### Core Philosophy

> **Specification is the [source of truth](/docs/glossary/terms/source-of-truth).**
> **AI is your implementation partner.**
> **[Quality gates](/docs/glossary/terms/acceptance-criteria) protect your codebase.**

### What's Next

- **Practice**: Apply patterns to real projects
- **Deep-dive**: Explore lessons 11-16 for specialized topics
- **Customize**: Adapt to your team's needs
- **Contribute**: Share patterns with the community

### Resources

- [Full Documentation](/)
- [Commands Reference](/docs/commands/overview)
- [Glossary](/docs/glossary)
- [GitHub Repository](https://github.com/specweave/specweave)

---

**Now go build something amazing with SpecWeave!**
