---
sidebar_position: 0
title: Reference
description: Complete reference documentation for SpecWeave skills and commands
---

import CommandTabs from '@site/src/components/CommandTabs';

# Reference Documentation

Complete reference for all SpecWeave skills, commands, and capabilities.

## What's the Difference?

| Type | Purpose | Example |
|------|---------|---------|
| **Skills** | Domain expertise and best practices | `sw:increment`, `/mobile:appstore` |
| **Commands** | Execute specific actions | `sw:auto`, `sw:done`, `sw:review` |

:::tip Both Are Slash Commands Now
In Claude Code, skills and commands are invoked the same way - with `sw:&lt;name&gt;`. Skills provide domain knowledge; commands perform actions.
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
- **Planning**: `sw:increment`
- **Execution**: `sw:auto`, `sw:do`, `sw:team`
- **Quality**: `sw:review`, `sw:qa`
- **Completion**: `specweave task next`, `sw:done`
- **Sync**: `sw:sync` (push, pull, status, setup)

### [Configuration Reference](./configuration)

**Every config.json property** documented with types, defaults, and examples:
- Quick reference table of all disableable features
- config.json sections: testing, living docs, sync, CI/CD, and more
- metadata.json fields for per-increment overrides
- Environment variables for runtime control

### [Use Case Guide](/docs/reference/commands)

**Find the right tool** for your task:
- "I want to..." quick lookup tables
- Role-based recommendations (PM, Architect, Frontend, Backend, DevOps, QA)
- Phase-based workflows (Plan → Implement → Quality → Complete)
- Decision trees for choosing execution mode, quality checks, sync tools

---

## Most Used

### Planning

<CommandTabs
  natural="Let's build a new feature"
  claude='sw:increment "Feature description"'
  other='increment "Feature description"'
/>

```bash
sw:increment                                 # Product management
sw:increment                          # System design
```

### Execution

<CommandTabs
  natural="Ship while I sleep"
  claude="sw:auto"
  other="auto"
/>

```bash
sw:do                                # Manual task-by-task
specweave status                          # Check status
```

### Quality

<CommandTabs
  natural="Check the quality of my work"
  claude="sw:review"
  other="validate"
/>

Additional: `sw:qa --gate` (AI quality gate), `sw:review` (deep audit).

### Completion

<CommandTabs
  natural="What's next?"
  claude="specweave task next"
  other="next"
/>

Additional: `sw:sync 0007` (sync to GitHub).

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
- [Configuration Reference](./configuration) - All config properties
- [Use Case Guide](/docs/reference/commands) - Find the right tool
