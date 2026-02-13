---
sidebar_position: 1
title: Enterprise Overview
description: "SpecWeave for enterprise teams — compliance audit trails, brownfield analysis, multi-repo coordination, and bidirectional sync with GitHub, JIRA, and Azure DevOps."
---

# SpecWeave for Enterprise

SpecWeave is built for the reality of enterprise development: legacy codebases, distributed teams, compliance requirements, and complex release cycles.

## Why Enterprise Teams Choose SpecWeave

### Compliance-Ready Audit Trails

Every decision is tracked in version-controlled spec files. When auditors ask "why was this built this way?" — you point them to `spec.md` and `plan.md` in your git history.

- SOC 2, HIPAA, FDA audit-ready — full decision trail in git
- Approval workflows via spec reviews before implementation
- Change tracking at the task level — who did what, when, why
- Living documentation updates automatically — no manual sync

**[Compliance standards guide →](./compliance-standards)**

### Brownfield Excellence

90%+ of enterprise work is brownfield. SpecWeave excels here:

- **Automated analysis** — scan existing codebases, get effort estimates
- **Strangler Fig pattern** — incremental migration without big-bang rewrites
- **Knowledge preservation** — specs capture existing behavior before changes
- **Risk mitigation** — small increments with quality gates at every step

**[Brownfield workflow →](../workflows/brownfield)**

### Multi-Repo Coordination

Enterprise projects span multiple repositories. SpecWeave coordinates across all of them:

- Specs reference cross-repo dependencies
- Agent teams work across repos without conflicts
- Progress syncs to the correct GitHub/JIRA project per repo
- Umbrella repo support for monorepo and polyrepo architectures

### Bidirectional External Sync

SpecWeave syncs with the tools your teams already use:

| Platform | What Syncs | Direction |
|----------|-----------|-----------|
| **GitHub** | Issues, PRs, milestones, labels | Bidirectional |
| **JIRA** | Epics, stories, status, sprint tracking | Bidirectional |
| **Azure DevOps** | Work items, area paths, iterations | Bidirectional |

Local-first architecture — works offline, syncs when ready. No vendor lock-in.

## Migration Guides

Already using GitHub, JIRA, or Azure DevOps? Start here:

- **[GitHub Migration](./github-migration)** — issues, milestones, and labels
- **[JIRA Migration](./jira-migration)** — epics, stories, and sprints
- **[Azure DevOps Migration](./azure-devops-migration)** — work items and area paths
- **[Knowledge Transfer](./knowledge-transfer-migration)** — onboard existing projects

## Enterprise Patterns

- **[Multi-Environment Deployment](./multi-environment-deployment)** — dev → QA → staging → prod
- **[Release Management](./release-management)** — weekly sprints, monthly releases, quarterly planning
- **[Monolith to Microservices](./monolith-to-microservices)** — incremental decomposition
- **[Case Study: Full Migration](./case-study-migration)** — real-world enterprise adoption

## Getting Started

```bash
npm install -g specweave
cd your-enterprise-project
specweave init .
# Select your tracker (GitHub/JIRA/ADO) during init
```

SpecWeave detects your project structure and configures accordingly. Multi-repo? It handles that too.
