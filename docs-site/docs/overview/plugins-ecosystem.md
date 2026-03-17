---
sidebar_position: 2
title: Plugin Ecosystem
description: SpecWeave's modular plugin architecture — 8 bundled plugins with 44 skills, plus community skills via verified-skill.com
keywords: [plugins, skills, agents, commands, github, jira, integration, vskill]
---

# Plugin Ecosystem

SpecWeave uses a **modular plugin architecture**. The core framework ships with **8 bundled plugins** providing 44 skills. Additional domain-specific plugins are available via the [vskill CLI](../skills/vskill-cli.md) and the [verified-skill.com](https://verified-skill.com) registry (99,680+ community skills).

![Plugin Architecture](/img/diagrams/plugin-architecture.svg)

:::info Core Plugin vs Community Skills
**Bundled plugins** install automatically with `specweave init`. **Community skills** are installed on-demand via `npx vskill install`. See [Installing Skills](../skills/installation.md) for details.
:::

## Bundled Plugins (8)

These plugins ship with every SpecWeave installation.

### specweave (sw) — Core Framework

The foundation of SpecWeave, always loaded in every project.

- **28 Skills**: increment, pm, architect, plan, do, done, auto, validate, grill, judge-llm, debug, brainstorm, team-lead, team-build, team-merge, code-reviewer, tdd-cycle, tdd-red, tdd-green, tdd-refactor, e2e, get, import, pr, npm, progress-sync, sync-docs, skill-gen
- **3 Agents**: PM, Architect, Test-Aware Planner (plus sub-agents within skills like code-reviewer and team-lead)
- **Commands**: Full increment lifecycle (`/sw:increment`, `/sw:do`, `/sw:done`, `/sw:auto`, `/sw:validate`)

```bash
# The PM agent creates a spec with user stories and acceptance criteria
/sw:increment "User authentication with OAuth"

# Execute tasks from the spec
/sw:do

# Close with quality gates
/sw:done
```

---

### specweave-github (sw-github) — GitHub Integration

Bidirectional sync between SpecWeave increments and GitHub Issues.

- **4 Skills**: github-sync, github-issue-standard, pr-review, github-multi-project
- Auto-creates issues on increment planning
- Task-level progress tracking via checkboxes
- Universal Hierarchy: Epic to Milestone, Increment to Issue

```bash
/sw-github:sync 0023 --time-range 1M
```

---

### specweave-jira (sw-jira) — JIRA Integration

Enterprise JIRA integration with Epic/Story sync.

- **3 Skills**: jira-sync, jira-mapper, jira-resource-validator
- Bidirectional Epic and Story sync
- Status mapping (Planning to To Do, Active to In Progress)

---

### specweave-ado (sw-ado) — Azure DevOps Integration

Enterprise Azure DevOps sync with Work Items.

- **4 Skills**: ado-sync, ado-mapper, ado-multi-project, ado-resource-validator
- Epic to Azure DevOps Epic mapping
- Multi-project organization strategies

---

### specweave-release (sw-release) — Release Management

Multi-repo releases with semantic versioning and RC workflows.

- **1 Skill**: release-expert
- Coordinates releases across monorepo and polyrepo setups

---

### specweave-diagrams (sw-diagrams) — Diagram Generation

Mermaid diagrams following C4 Model conventions.

- **1 Skill**: diagrams
- C4 Context, Container, Component, sequence, ER, and deployment diagrams

---

### specweave-media (sw-media) — Media Generation

AI-powered image and video generation.

- **3 Skills**: image, video, remotion
- Integrates with AI image/video generation APIs

---

### specweave-docs (docs) — Documentation Tools

Documentation generation and Docusaurus preview.

- **7 Commands**: view, generate, build, validate, health, init, organize
- No standalone skills (documentation capabilities are in the core plugin)

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

## Community Skills (99,680+)

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
5. **Implementation** proceeds with `/sw:do`
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
