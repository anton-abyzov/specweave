---
id: specweave-increment
title: /sw:increment Command
sidebar_label: specweave:increment
---

# /sw:increment Command

The **`/sw:increment`** command is SpecWeave's primary planning command that creates a new [increment](/docs/glossary/terms/increments) with full PM-led workflow.

## What It Does

**Key actions:**
- Creates new increment folder (`0XXX-feature-name/`)
- Generates [spec.md](/docs/glossary/terms/spec-md) with [user stories](/docs/glossary/terms/user-stories) and [acceptance criteria](/docs/glossary/terms/acceptance-criteria)
- Generates [plan.md](/docs/glossary/terms/plan-md) with architecture and [ADRs](/docs/glossary/terms/adr)
- Generates [tasks.md](/docs/glossary/terms/tasks-md) with embedded [BDD](/docs/glossary/terms/bdd) tests
- Runs strategic agent review ([Architect](/docs/glossary/terms/architect-agent), [QA Lead](/docs/glossary/terms/qa-lead-agent))

## Usage

```bash
# Create feature increment
/sw:increment "User authentication with JWT"

# Create specific type
/sw:increment "Payment processing" --type=feature
/sw:increment "Critical login bug" --type=hotfix
/sw:increment "Try GraphQL" --type=experiment
```

## Increment Types

| Type | Purpose | WIP Limit |
|------|---------|-----------|
| **feature** | New functionality | 1 (default) |
| **hotfix** | Critical fix | 1 (emergency slot) |
| **bug** | Non-critical bug fix | Shares feature limit |
| **refactor** | Code improvement | Shares feature limit |
| **experiment** | Spike/POC | Auto-abandons after 14 days |

## Output Structure

```
.specweave/increments/0007-user-authentication/
├── spec.md           ← Requirements & user stories
├── plan.md           ← Architecture & technical design
├── tasks.md          ← Implementation tasks with tests
└── metadata.json     ← Status tracking
```

## PM-Led Workflow

1. **Market Research** - Analyze requirements
2. **Specification** - Write user stories with ACs
3. **Architecture** - Design technical approach
4. **Planning** - Break into tasks with test cases
5. **Review** - Strategic agent validation

## Related

- [Increments](/docs/glossary/terms/increments) - Work units
- [spec.md](/docs/glossary/terms/spec-md) - Specification format
- [plan.md](/docs/glossary/terms/plan-md) - Plan format
- [tasks.md](/docs/glossary/terms/tasks-md) - Task format
- [PM Agent](/docs/glossary/terms/pm-agent) - Planning agent
