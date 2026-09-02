---
sidebar_position: 2
title: Skills & Capabilities
description: SpecWeave ships with 45 skills, 73 commands, and 3 AI agents covering the full development lifecycle — planning, implementation, testing, code review, and external sync
keywords: [skills, agents, commands, capabilities, github, jira, azure-devops, tdd, code-review]
slug: skills-and-capabilities
---

import CommandTabs from '@site/src/components/CommandTabs';

# Skills & Capabilities

SpecWeave ships **batteries-included**. Every installation comes with **45 skills**, **73 commands**, and **3 AI agents** covering the full development lifecycle — no plugins to install, no configuration required.

## What's Included

### Planning & Design (7 skills)

Define what to build before writing code.

| Skill | What it does |
|-------|-------------|
| `increment` | Create a new feature/bugfix/hotfix with spec, plan, and tasks |
| `pm` | Product Manager — writes specs with user stories and acceptance criteria |
| `architect` | System Architect — designs technical approach with ADRs |
| `plan` | Generate plan.md and tasks.md for an increment |
| `brainstorm` | Multi-perspective ideation with selectable cognitive lenses |
| `diagrams` | Mermaid architecture diagrams following C4 Model conventions |
| `skill-gen` | Generate project-specific skills from detected patterns |

### Implementation (6 skills)

Execute tasks with autonomous workflows.

| Skill | What it does |
|-------|-------------|
| `do` | Execute increment tasks following spec and plan |
| `auto` | Fully autonomous execution — implement, test, fix, repeat |
| `get` | Clone and register repositories into the workspace |
| `import` | Import external issues from GitHub, Jira, or Azure DevOps |
| `debug` | Systematic 4-phase debugging with escalation protocol |
| `help` | Skill discovery and usage guidance |

### Testing & TDD (6 skills)

Test-driven development with full cycle support.

| Skill | What it does |
|-------|-------------|
| `tdd-cycle` | Full red-green-refactor cycle with validation gates |
| `tdd-red` | Write failing tests that define expected behavior |
| `tdd-green` | Write minimal code to make failing tests pass |
| `tdd-refactor` | Refactor code with test safety net |
| `e2e` | Generate and run Playwright E2E tests traced to acceptance criteria |
| `validate` | Rule-based quality checks (130+ rules) |

### Code Review & Quality (4 skills)

Multi-agent review before shipping.

| Skill | What it does |
|-------|-------------|
| `code-reviewer` | Parallel specialized reviewers for logic, security, performance, and more |
| `grill` | Critical code review and quality interrogation |
| `review` | Adversarial fresh-context review; findings cite `path:line` |
| `pr-review` | Pull request review against spec acceptance criteria |

### Team & Parallel Work (3 skills)

Coordinate multiple AI agents working simultaneously.

| Skill | What it does |
|-------|-------------|
| `team-lead` | Orchestrate parallel multi-agent work across domains |
| `team-build` | Spawn coordinated teams from battle-tested presets |
| `team-merge` | Merge completed parallel agent work |

### Lifecycle & Release (5 skills)

Close increments and ship releases.

| Skill | What it does |
|-------|-------------|
| `done` | Close increment with PM 3-gate validation |
| `pr` | Create pull request from increment feature branch |
| `npm` | Full patch release with npm publish and GitHub Release |
| `release-expert` | Multi-repo release coordination and version alignment |
| `progress-sync` | Sync progress to all connected external tools |

### GitHub Integration (3 skills)

| Skill | What it does |
|-------|-------------|
| `github-sync` | Two-way sync between specs and GitHub Projects |
| `github-issue-standard` | Consistent issue format with checkable acceptance criteria |
| `github-multi-project` | Coordinate specs and tasks across multiple repositories |

### Jira Integration (3 skills)

| Skill | What it does |
|-------|-------------|
| `jira-sync` | Two-way sync between increments and Jira epics/stories |
| `jira-mapper` | Bidirectional mapping (Increment → Epic + Stories + Subtasks) |
| `jira-resource-validator` | Validate and auto-create Jira projects and boards |

### Azure DevOps Integration (4 skills)

| Skill | What it does |
|-------|-------------|
| `ado-sync` | Two-way sync between increments and ADO work items |
| `ado-mapper` | Bidirectional conversion (Increment ↔ Epic/Feature/Story/Task) |
| `ado-multi-project` | Organize tasks across multiple ADO projects |
| `ado-resource-validator` | Validate and auto-create ADO projects, area paths, and teams |

### Media Generation (3 skills)

| Skill | What it does |
|-------|-------------|
| `image` | AI image generation via Google Gemini and Pollinations.ai |
| `video` | AI video generation via Google Veo 3.1 and Pollinations.ai |
| `remotion` | Programmatic video creation with React components |

### Documentation (1 skill)

| Skill | What it does |
|-------|-------------|
| `sync-docs` | Sync living docs for an increment |

---

## AI Agents

Skills handle specific tasks. Agents are specialized AI personas that collaborate during planning:

| Agent | Role |
|-------|------|
| **PM** | Writes spec.md with user stories and acceptance criteria |
| **Architect** | Writes plan.md with architecture decisions and component design |
| **Planner** | Generates tasks.md with BDD test plans (Given/When/Then) |

Skills like `code-reviewer` and `team-lead` spawn additional sub-agents internally for parallel work.

---

## Commands (73)

Commands are the low-level operations that skills and sync workflows invoke. Most users interact with skills directly — commands run behind the scenes for operations like `github-push`, `jira-pull`, `ado-create`, `docs-build`, `release-rc`, and more.

See [Commands Reference](../reference/commands.md) for the full list.

---

## Extending with Domain Skills

Need capabilities beyond the built-in 45? The [vskill CLI](../skills/vskill-cli.md) installs domain-specific skills:

```bash
npx vskill install --repo anton-abyzov/vskill --plugin <name>
```

| Plugin | Skills | Use case |
|--------|--------|----------|
| **mobile** | appstore | App Store Connect automation, TestFlight, certificates |
| **marketing** | slack-messaging, social-media-posting | Slack automation, cross-platform social media |
| **google-workspace** | gws | Gmail, Drive, Sheets, Docs, Calendar via CLI |
| **productivity** | survey-passing | Expert network survey automation |
| **skills** | scout | Discover and install community skills |

The [verified-skill.com](https://verified-skill.com) registry hosts community-contributed skills searchable via `npx vskill find "query"`.

---

## Extending with CLAUDE.md

Beyond skills, customize SpecWeave behavior through your project's `CLAUDE.md` file:

| Area | Examples |
|------|----------|
| **External Sync** | Add fields, transform statuses, integrate with internal tools |
| **Quality Gates** | Custom validation, linting rules, security scans |
| **Agent Behavior** | Override default prompts, add domain-specific requirements |
| **Naming Conventions** | Enforce team-specific ID formats, branch names |

---

## Next Steps

- [Getting Started](../getting-started/index.md) — Your first SpecWeave increment
- [Skills Reference](../reference/skills.md) — Detailed skill documentation
- [vskill CLI](../skills/vskill-cli.md) — Install domain-specific skills
- [Commands Reference](../reference/commands.md) — Full command list
