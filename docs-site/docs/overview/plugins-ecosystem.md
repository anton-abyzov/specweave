---
sidebar_position: 2
title: Plugin Ecosystem
description: SpecWeave's unified plugin architecture — 1 bundled plugin with 44 skills, plus 100,000+ community skills via verified-skill.com
keywords: [plugins, skills, agents, commands, github, jira, integration, vskill]
---

import CommandTabs from '@site/src/components/CommandTabs';

# Plugin Ecosystem

SpecWeave uses a **unified plugin architecture**. The core framework ships with **1 bundled plugin** providing 44 skills covering the full development lifecycle including GitHub, JIRA, Azure DevOps sync, release management, diagrams, media generation, and documentation. Additional domain-specific plugins are available via the [vskill CLI](../skills/vskill-cli.md) and the [verified-skill.com](https://verified-skill.com) registry (100,000+ community skills).

![Plugin Architecture](/img/diagrams/plugin-architecture.svg)

:::info Core Plugin vs Community Skills
The **bundled plugin** installs automatically with `specweave init`. **Community skills** are installed on-demand via `npx vskill install`. See [Installing Skills](../skills/installation.md) for details.
:::

## Bundled Plugin

The unified `specweave` plugin ships with every installation. All capabilities are organized into a single plugin for simpler installation, faster loading, and easier maintenance.

### specweave (sw) — Unified Framework

The complete SpecWeave platform: core lifecycle, integrations, release management, diagrams, media, and documentation tools.

- **44 Skills** organized by domain:
  - **Core (28)**: increment, pm, architect, plan, do, done, auto, validate, grill, judge-llm, debug, brainstorm, team-lead, team-build, team-merge, code-reviewer, tdd-cycle, tdd-red, tdd-green, tdd-refactor, e2e, get, import, pr, npm, progress-sync, sync-docs, skill-gen
  - **GitHub (4)**: github-sync, github-issue-standard, pr-review, github-multi-project
  - **JIRA (3)**: jira-sync, jira-mapper, jira-resource-validator
  - **Azure DevOps (4)**: ado-sync, ado-mapper, ado-multi-project, ado-resource-validator
  - **Release (1)**: release-expert
  - **Diagrams (1)**: diagrams
  - **Media (3)**: image, video, remotion
- **3 Agents**: PM, Architect, Test-Aware Planner (plus sub-agents within skills like code-reviewer and team-lead)
- **74+ Commands**: Full increment lifecycle, GitHub/JIRA/ADO sync, release management, documentation tools

**Plan a feature:**

<CommandTabs
  natural="I want to add user authentication with OAuth"
  claude='/sw:increment "User authentication with OAuth"'
  other='increment "User authentication with OAuth"'
/>

**Execute, sync, and close:**

<CommandTabs
  natural="Start implementing, then sync to GitHub when done"
  claude="/sw:do"
  other="do"
/>

---

## vskill Marketplace Plugins (5)

These plugins are installed via the [vskill CLI](../skills/vskill-cli.md):

```bash
npx vskill install --repo anton-abyzov/vskill --plugin <name>
```

| Plugin | Skills | Description |
|--------|--------|-------------|
| **mobile** | 1 (appstore) | Mobile development — React Native, Expo, Flutter, SwiftUI, app store |
| **skills** | 1 (scout) | Skill discovery and evaluation |
| **marketing** | 2 (slack-messaging, social-media-posting) | Cross-platform social media and Slack automation |
| **productivity** | 1 (survey-passing) | Expert network survey automation |
| **google-workspace** | 2 (gws, greet-anton) | Google Workspace CLI — Gmail, Drive, Sheets, Docs, Calendar |

---

## Community Skills (100,000+)

The [verified-skill.com](https://verified-skill.com) registry hosts community-contributed skills across all domains:

```bash
# Search the registry
npx vskill find "react components"

# Install from the registry
npx vskill install <skill-name>
```

Browse by category: Coding (53,752), AI/ML (13,176), Design, DevOps, Data, Testing, Marketing, and more.

See [Verified Skills](../skills/verified/verified-skills.md) for the trust tier system and security model.

---

## How Plugins Work Together

Plugins activate based on project context. A typical workflow:

1. **PM Agent** (core) creates the spec with user stories
2. **Architect Agent** (core) designs the technical approach
3. **GitHub Plugin** auto-creates a GitHub Issue for the increment
4. **Domain skills** (installed via vskill) provide specialized guidance
5. **Implementation** proceeds when you say "start implementing" (or `/sw:do`)
6. **Sync** keeps external tools updated automatically

---

## Extending with CLAUDE.md

Beyond plugins, customize SpecWeave behavior through your project's `CLAUDE.md` file:

| Area | Examples |
|------|----------|
| **External Sync** | Add fields, transform statuses, integrate with internal tools |
| **Quality Gates** | Custom validation, linting rules, security scans |
| **Agent Behavior** | Override default prompts, add domain-specific requirements |
| **Naming Conventions** | Enforce team-specific ID formats, branch names |

---

## Next Steps

- [Installing Skills](../skills/installation.md) — Install community skills from the registry
- [vskill CLI Reference](../skills/vskill-cli.md) — Full CLI documentation
- [Getting Started](../getting-started/index.md) — Your first SpecWeave increment
- [Workflows](../workflows/overview.md) — Complete development journey
