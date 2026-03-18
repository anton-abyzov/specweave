---
sidebar_position: 0
title: Reference
description: Complete reference documentation for SpecWeave skills and commands
---

# Reference Documentation

Complete reference for all SpecWeave skills, commands, and capabilities.

## What's the Difference?

| Type | Purpose | Example |
|------|---------|---------|
| **Skills** | Domain expertise and best practices | `/sw:architect`, `/mobile:appstore` |
| **Commands** | Execute specific actions | `/sw:auto`, `/sw:done`, `/sw:validate` |

:::tip Both Are Slash Commands Now
In Claude Code, skills and commands are invoked the same way - with `/sw:name`. Skills provide domain knowledge; commands perform actions.
:::

## Quick Navigation

### [Skills Reference](./skills)

**80+ specialized skills** organized by domain:
- **Core**: Planning, architecture, orchestration
- **Frontend**: React, Vue, Next.js, design systems
- **Backend**: Node.js, Python, .NET, databases
- **Infrastructure**: DevOps, Kubernetes, observability
- **Testing**: TDD, E2E, quality gates
- **Security**: OWASP, compliance, threat modeling
- **Data**: Kafka, streaming, ML/AI
- **And more**: Mobile, payments, documentation, cost optimization

### [Commands Reference](./commands)

**All slash commands** organized by purpose:
- **Planning**: `/sw:increment`
- **Execution**: `/sw:auto`, `/sw:do`, `/sw:auto-parallel`
- **Quality**: `/sw:validate`, `/sw:qa`, `/sw:grill`
- **Completion**: `/sw:next`, `/sw:done`
- **Sync**: `/sw-github:sync`, `/sw-jira:sync`, `/sw-ado:sync`

### [Use Case Guide](./use-case-guide)

**Find the right tool** for your task:
- "I want to..." quick lookup tables
- Role-based recommendations (PM, Architect, Frontend, Backend, DevOps, QA)
- Phase-based workflows (Plan → Implement → Quality → Complete)
- Decision trees for choosing execution mode, quality checks, sync tools

---

## Most Used

### Planning

```bash
/sw:increment "Feature description"    # Start new work
/sw:pm                                 # Product management
/sw:architect                          # System design
```

### Execution

```bash
/sw:auto                              # Autonomous (hours!)
/sw:do                                # Manual task-by-task
/sw:progress                          # Check status
```

### Quality

```bash
/sw:validate                          # Quick rule check
/sw:qa --gate                         # AI quality gate
/sw:grill                             # Deep audit
```

### Completion

```bash
/sw:next                              # Complete + suggest next
/sw-github:sync 0007                  # Sync to GitHub
```

---

## Plugin Ecosystem

Skills come from plugins. Core plugin `sw` is always installed. Domain plugins auto-load based on your tech stack:

| Plugin | Skills Count | Domain |
|--------|--------------|--------|
| `sw` (core) | 44 | Planning, execution, quality, sync, utilities |
| `mobile` | 1 | App Store Connect automation |
| `marketing` | 3 | Marketing and social media |
| `google-workspace` | 3 | Google Workspace CLI |
| `productivity` | 1 | Personal productivity |
| `skills` | 1 | Skill discovery |

### Installing Plugins

```bash
# The sw plugin installs automatically via specweave init
# Domain plugins install manually:
npx vskill install --repo anton-abyzov/vskill --plugin mobile
npx vskill install --repo anton-abyzov/vskill --plugin marketing
npx vskill install --repo anton-abyzov/specweave --plugin sw
```

---

## Next Steps

- [Skills Reference](./skills) - All skills by domain
- [Commands Reference](./commands) - All commands by purpose
- [Use Case Guide](./use-case-guide) - Find the right tool
