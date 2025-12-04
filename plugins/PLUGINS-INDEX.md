# SpecWeave Plugins Index

**Purpose**: Lightweight plugin manifest for progressive disclosure. Load plugin content only when triggers match.

**Total Plugins**: 26 | **Last Updated**: 2025-12-04

---

## Progressive Loading Pattern

1. **Scan this index** at session start (~5KB)
2. **Match triggers** to user intent
3. **Load plugin content** only when matched
4. **Savings**: ~95% (index only vs all plugins)

---

## Core Plugins (Essential)

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave** | increment, feature, plan, spec, tasks, TDD, PM, architect | Core framework. Planning, specs, TDD, living docs. |

## Integration Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-github** | GitHub, issues, gh, sync to GitHub, GitHub sync | Bidirectional GitHub Issues sync |
| **specweave-jira** | JIRA, Jira, epics, stories, sync to JIRA | JIRA integration and sync |
| **specweave-ado** | Azure DevOps, ADO, work items, Azure boards | Azure DevOps integration |

## Infrastructure Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-infrastructure** | deploy, terraform, kubernetes, docker, CI/CD, devops, AWS, Azure, GCP | Infrastructure-as-Code, DevOps, SRE |
| **specweave-kubernetes** | k8s, kubernetes, EKS, AKS, GKE, pods, helm, GitOps | Kubernetes architecture, GitOps |
| **specweave-kafka** | Kafka, event streaming, MSK, Event Hubs, kcat, topics | Apache Kafka integration |
| **specweave-kafka-streams** | Kafka Streams, KStream, KTable, stream processing | Kafka Streams topology |
| **specweave-confluent** | Confluent, eCKU, Schema Registry, ksqlDB | Confluent Cloud architecture |

## Frontend Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-frontend** | React, Vue, Angular, Next.js, frontend, UI, components | Frontend architecture, design systems |
| **specweave-ui** | UI components, design system, Storybook, Figma | UI component development |
| **specweave-figma** | Figma, design tokens, design-to-code | Figma integration |
| **specweave-mobile** | React Native, mobile, iOS, Android | Mobile app development |

## Backend Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-backend** | backend, API, REST, GraphQL, database, microservices | Backend architecture |
| **specweave-payments** | Stripe, PayPal, payments, checkout, subscription, PCI | Payment integration |

## ML/AI Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-ml** | ML, machine learning, model, training, MLOps | ML pipelines, model deployment |

## Quality & Testing

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-testing** | test, E2E, Playwright, Vitest, Jest, QA | Test automation, QA strategy |

## Documentation & Release

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-docs** | documentation, README, API docs, technical writing, docs site, Docusaurus, preview, build docs | Documentation generation and preview |
| **specweave-release** | release, version, npm publish, changelog, RC | Release management |

## Specialized Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-diagrams** | diagram, Mermaid, C4, architecture diagram | Mermaid diagram generation |
| **specweave-n8n** | n8n, workflow, automation, no-code | n8n workflow templates |
| **specweave-alternatives** | alternative, compare, evaluation, technology choice | Technology comparison |
| **specweave-cost-optimizer** | cost, optimize, reduce cost, cloud cost | Cloud cost optimization |

## Development Plugins

| Plugin | Triggers | Description |
|--------|----------|-------------|
| **specweave-core** | core utilities, shared, common | Core shared utilities |
| **specweave-plugin-dev** | create plugin, plugin development | Plugin development guide |
| **specweave-tooling** | tooling, skill create, agent create | SpecWeave tooling |

---

## Quick Lookup Table

| User Intent | Load Plugin |
|-------------|-------------|
| "Plan a feature" | `specweave` |
| "Sync to GitHub" | `specweave-github` |
| "Deploy to AWS" | `specweave-infrastructure` |
| "Create React app" | `specweave-frontend` |
| "Add Stripe payments" | `specweave-payments` |
| "Set up Kafka" | `specweave-kafka` |
| "Create K8s manifest" | `specweave-kubernetes` |
| "ML pipeline" | `specweave-ml` |
| "Write E2E tests" | `specweave-testing` |
| "Create release" | `specweave-release` |

---

## Token Efficiency

- **This index**: ~150 lines (~3KB)
- **All plugins loaded**: ~24.6 MB markdown
- **Savings**: ~99.98% by loading on-demand

**Pattern**: Load index → Match triggers → Load only matched plugin content
