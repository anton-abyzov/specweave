---
name: specweave-router
description: |
  ACTIVE router that detects development tasks and spawns specialized agents.
  Activates for: React, Vue, Next.js, frontend, dashboard, component, UI, UX,
  GitHub, API, backend, database, SQL, PostgreSQL, MongoDB, Redis,
  Kubernetes, K8s, Docker, Terraform, AWS, Azure, GCP, infrastructure,
  ML, machine learning, model, training, AI, data science,
  testing, TDD, test-driven, Vitest, Jest, Playwright, E2E,
  mobile, React Native, iOS, Android, Expo,
  Kafka, streaming, event-driven, messaging,
  payments, Stripe, checkout, billing, subscriptions,
  release, deploy, CI/CD, pipeline, version,
  diagram, architecture, C4, Mermaid, flowchart,
  increment, specweave, /sw:, spec.md, tasks.md, living docs.
visibility: public
user-invocable: false
allowed-tools:
  - Bash
  - Task
---

# SpecWeave ACTIVE Router

**I am an ACTIVE router.** When I detect development tasks, I **MUST spawn specialized agents**.

## CRITICAL RULE: Agent Spawning is MANDATORY

When I detect domain-specific keywords, I **MUST** spawn the appropriate agent using the Task tool.
**DO NOT** just use basic tools (Read, Write, Edit). **SPAWN THE AGENT**.

## Domain Detection Matrix

### Frontend Development
**Keywords**: React, Vue, Angular, Next.js, Nuxt, Svelte, frontend, dashboard, component, UI, UX, CSS, Tailwind, styled-components, SPA, SSR, design system, landing page, responsive

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-frontend:frontend-architect",
  prompt: "[User's request]",
  description: "Frontend architecture"
})
```

### Backend & Database
**Keywords**: API, REST, GraphQL, backend, server, database, SQL, PostgreSQL, MySQL, MongoDB, Redis, optimization, query, ORM, Prisma, migration

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-backend:database-optimizer",
  prompt: "[User's request]",
  description: "Backend/database task"
})
```

### GitHub Integration
**Keywords**: GitHub, repository, issues, PR, pull request, actions, workflow, sync, git

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-github:github-manager",
  prompt: "[User's request]",
  description: "GitHub integration"
})
```

### Testing & QA
**Keywords**: test, TDD, test-driven, Vitest, Jest, Playwright, Cypress, E2E, unit test, integration test, coverage, QA

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-testing:qa-engineer",
  prompt: "[User's request]",
  description: "Testing strategy"
})
```

### Infrastructure & DevOps
**Keywords**: Kubernetes, K8s, Docker, Terraform, AWS, Azure, GCP, infrastructure, deploy, CI/CD, pipeline, serverless, Lambda

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-infra:devops",
  prompt: "[User's request]",
  description: "Infrastructure task"
})
```

### Kubernetes Specific
**Keywords**: K8s, Kubernetes, pods, deployments, services, ingress, helm, GitOps, ArgoCD

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-k8s:kubernetes-architect",
  prompt: "[User's request]",
  description: "Kubernetes architecture"
})
```

### Machine Learning
**Keywords**: ML, machine learning, model, training, AI, neural network, TensorFlow, PyTorch, data science, prediction

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-ml:ml-engineer",
  prompt: "[User's request]",
  description: "ML implementation"
})
```

### Mobile Development
**Keywords**: mobile, React Native, iOS, Android, Expo, app, smartphone, tablet

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-mobile:mobile-architect",
  prompt: "[User's request]",
  description: "Mobile architecture"
})
```

### Payments
**Keywords**: payments, Stripe, PayPal, checkout, billing, subscription, invoice, pricing

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-payments:payment-integration",
  prompt: "[User's request]",
  description: "Payment integration"
})
```

### Kafka & Streaming
**Keywords**: Kafka, streaming, event-driven, messaging, pub/sub, consumer, producer, topic

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-kafka:kafka-architect",
  prompt: "[User's request]",
  description: "Kafka architecture"
})
```

### Release Management
**Keywords**: release, version, changelog, deploy, publish, npm publish, CI/CD, semver

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-release:release-manager",
  prompt: "[User's request]",
  description: "Release management"
})
```

### Diagrams & Architecture
**Keywords**: diagram, architecture diagram, C4, Mermaid, flowchart, sequence diagram, ER diagram

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-diagrams:diagrams-architect",
  prompt: "[User's request]",
  description: "Architecture diagram"
})
```

### JIRA Integration
**Keywords**: JIRA, Jira, epic, story, sprint, board, backlog

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-jira:jira-manager",
  prompt: "[User's request]",
  description: "JIRA integration"
})
```

### Azure DevOps Integration
**Keywords**: Azure DevOps, ADO, work items, boards, pipelines

**MANDATORY ACTION**:
```
Task({
  subagent_type: "sw-ado:ado-manager",
  prompt: "[User's request]",
  description: "ADO integration"
})
```

## Multi-Domain Tasks

When a task spans multiple domains, spawn MULTIPLE agents in parallel:

**Example**: "Build a React dashboard that displays GitHub repository statistics using TDD"

Detected domains:
1. Frontend (React, dashboard) → `sw-frontend:frontend-architect`
2. GitHub (GitHub, repository) → `sw-github:github-manager`
3. Testing (TDD) → `sw-testing:qa-engineer`

**MANDATORY ACTION** (parallel spawn):
```
Task({
  subagent_type: "sw-frontend:frontend-architect",
  prompt: "Design React dashboard architecture for displaying repository statistics",
  description: "Frontend architecture"
})

Task({
  subagent_type: "sw-testing:qa-engineer",
  prompt: "Create TDD test strategy for React dashboard with GitHub stats",
  description: "TDD strategy"
})
```

## SpecWeave Commands

For explicit `/sw:*` commands, load the appropriate plugin:

| Command | Action |
|---------|--------|
| `/sw:*` | `specweave load-plugins core` then execute |
| `/sw-github:*` | `specweave load-plugins github` then execute |
| `/sw-jira:*` | `specweave load-plugins jira` then execute |
| `/sw-ado:*` | `specweave load-plugins ado` then execute |

## Project Detection

Before spawning agents, check if this is a SpecWeave project:

```bash
test -d ".specweave" && echo "SpecWeave project"
```

If NOT a SpecWeave project, still spawn agents (they work without SpecWeave), but skip SpecWeave-specific commands.

## Token Savings

- Router only: ~800 tokens
- Full plugins: ~60,000 tokens
- Agents load context as needed

## REMEMBER

**I am ACTIVE, not passive.**

When I see "Build React dashboard with GitHub stats and TDD":
- ❌ WRONG: Use Read, Write, Edit, Bash only
- ✅ CORRECT: Spawn sw-frontend + sw-testing agents

**SPAWN THE AGENTS. ALWAYS.**
