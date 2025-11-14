# SpecWeave Plugin Matrix - Detailed Overview

## Plugin Summary Matrix

| Plugin | Type | Skills | Agents | Commands | Primary Use |
|--------|------|--------|--------|----------|------------|
| **specweave** | Core | 18 | 10 | 22+ | Increment planning, spec generation, TDD, living docs |
| **specweave-github** | Integration | 3 | 2 | 8 | GitHub Issues sync, bidirectional tracking |
| **specweave-jira** | Integration | 3 | 1 | 3 | JIRA epics/stories sync, project tracking |
| **specweave-ado** | Integration | 4 | 3 | 5 | Azure DevOps work items, multi-project sync |
| **specweave-frontend** | Tech Stack | 3 | 0 | 0 | React, Vue, Angular, Next.js development |
| **specweave-backend** | Tech Stack | 3 | 1 | 0 | Node.js, Python, .NET API development |
| **specweave-mobile** | Tech Stack | 7 | 1 | 0 | React Native, Expo mobile development |
| **specweave-ui** | Testing | 1 | 0 | 0 | Playwright E2E testing, visual regression |
| **specweave-kubernetes** | Infrastructure | 4 | 1 | 0 | K8s manifests, Helm, security, GitOps |
| **specweave-infrastructure** | Infrastructure | 5 | 5 | 2 | Cloud provisioning, monitoring, SLOs |
| **specweave-release** | Release | 4 | 1 | 4 | Release management, version alignment, RC workflow |
| **specweave-ml** | AI/ML | 13 | 3 | 4 | ML pipelines, model evaluation, deployment |
| **specweave-docs** | Documentation | 3 | 0 | 0 | Docusaurus, spec-driven brainstorming |
| **specweave-docs-preview** | Documentation | 1 | 0 | 2 | Interactive docs preview, static build |
| **specweave-figma** | Design | 1 | 0 | 0 | Design-to-code, token extraction, component generation |
| **specweave-diagrams** | Visualization | 2 | 1 | 0 | Mermaid diagrams, C4 model, architecture |
| **specweave-testing** | Testing | 1 | 0 | 0 | Playwright E2E testing, browser automation |
| **specweave-payments** | Financial | 4 | 1 | 0 | Stripe, PayPal, billing, PCI compliance |
| **specweave-cost-optimizer** | Optimization | 1 | 0 | 0 | Cloud cost analysis, platform comparison |
| **specweave-tooling** | Meta | 2 | 0 | 0 | Skill creation, skill router |
| **specweave-alternatives** | Analysis | 2 | 0 | 0 | BMAD, spec-kit comparison |

**Totals**: 21 plugins | 78 skills | 31 agents | 54+ commands

---

## Core Plugin Deep Dive

### specweave - Architecture

```
specweave/
├── Skills (18)
│   ├── Planning: increment-planner
│   ├── Specs: spec-generator, multi-project-spec-mapper
│   ├── TDD: tdd-workflow
│   ├── Brownfield: brownfield-analyzer, brownfield-onboarder
│   ├── Quality: increment-quality-judge, increment-quality-judge-v2
│   ├── Context: context-loader, context-optimizer
│   ├── Framework: specweave-framework, specweave-detector
│   ├── Setup: plugin-validator, plugin-expert, project-kickstarter
│   ├── Orchestration: role-orchestrator
│   ├── Utilities: translator, docs-updater
│
├── Agents (10)
│   ├── Product: pm
│   ├── Architecture: architect
│   ├── Engineering: tech-lead, qa-lead, test-aware-planner
│   ├── Specialized: security, performance, docs-writer
│   ├── Workflow: tdd-orchestrator, reflective-reviewer
│
├── Commands (22)
│   ├── Increment Lifecycle: increment, do, done, status, progress
│   ├── State Management: pause, resume, abandon, next
│   ├── Validation: validate, qa, check-tests
│   ├── Documentation: sync-docs, sync-tasks, update-scope, import-docs
│   ├── TDD: tdd-cycle, tdd-red, tdd-green, tdd-refactor
│   ├── Utilities: translate, costs, init-multiproject
│
├── Hooks (8)
│   ├── post-task-completion: Sound, living docs sync, external tool sync
│   ├── post-increment-planning: GitHub issue auto-creation
│   └── (6 more lifecycle hooks)
│
└── Living Docs System
    ├── Universal Hierarchy (Epic → Spec → Task)
    ├── Intelligent Sync (9 categories, multi-project)
    ├── Status Line (1ms render)
    └── Enterprise Organization (6 domains)
```

---

## Integration Plugin Comparison

### External Tool Sync Capabilities

| Feature | GitHub | JIRA | ADO |
|---------|--------|------|-----|
| **Bidirectional Sync** | Yes | Yes | Yes |
| **Hierarchy** | Milestone/Issue | Epic/Story | Epic/Feature |
| **Conflict Resolution** | Yes | Yes | Yes |
| **Multi-Project** | Yes | Yes (per-board) | Yes (per-area) |
| **Auto-Create Issues** | Yes | No | No |
| **Task-Level Tracking** | Yes | No | No |
| **Spec Sync** | Yes | Yes | Yes |
| **Epic Sync** | Yes | Yes | No |
| **Post-Task Hook** | Yes | Yes | Yes |

### Sync Profile Configuration

```json
// GitHub Profile
{
  "provider": "github",
  "config": {
    "owner": "anton-abyzov",
    "repo": "specweave"
  }
}

// JIRA Profile
{
  "provider": "jira",
  "config": {
    "url": "https://your-instance.atlassian.net",
    "projectKey": "SW",
    "boardId": "1234"
  }
}

// Azure DevOps Profile
{
  "provider": "ado",
  "config": {
    "organization": "https://dev.azure.com/yourorg",
    "project": "SpecWeave",
    "areaPath": "Backend\\Team A"
  }
}
```

---

## Tech Stack Coverage Matrix

### Frontend Options
| Framework | Coverage | Features |
|-----------|----------|----------|
| React | Full | Hooks, state mgmt, forms, routing, TanStack Query |
| Vue | Full | Composition API, Pinia, forms, routing |
| Angular | Full | RxJS, forms, services, DI |
| Next.js | Full | App Router, RSC, NextAuth, Prisma, Tailwind |

### Backend Options
| Stack | Coverage | Features |
|-------|----------|----------|
| Node.js | Full | Express, Fastify, NestJS, GraphQL, authentication |
| Python | Full | FastAPI, Django, Flask, async, data science |
| .NET | Full | ASP.NET Core, EF Core, minimal APIs, gRPC |

### Mobile Options
| Platform | Coverage | Features |
|----------|----------|----------|
| React Native | Full | Setup, debugging, optimization, native modules |
| Expo | Full | Development, builds, publishing, deployment |

### Infrastructure Options
| Service | Coverage | Features |
|---------|----------|----------|
| Kubernetes | Full | Manifests, Helm, security, GitOps |
| Hetzner Cloud | Full | Provisioning, IaC, managed Postgres |
| Cloud Platforms | Full | AWS, Vercel, Railway, Fly.io, DigitalOcean |
| Monitoring | Full | Prometheus, Grafana, distributed tracing |

---

## ML Plugin Capabilities

### End-to-End ML Workflow Support

```
Experiment Design
├── Experiment Tracking (MLflow, Weights & Biases, Neptune)
├── Feature Engineering (manual, automated)
└── Model Selection (AutoML)

Model Training
├── Computer Vision (image classification, detection, segmentation)
├── NLP (text classification, NER, sentiment analysis)
├── Time Series (Prophet, ARIMA, deep learning)
├── Anomaly Detection (statistical, ML-based)
└── Standard ML (regression, classification, clustering)

Model Evaluation
├── Metrics (accuracy, precision, recall, F1, AUC, confusion matrix)
├── Explainability (SHAP, LIME, feature importance)
└── Model Registry (MLflow, Model Zoo)

Deployment
├── FastAPI endpoints
├── Docker containerization
├── Kubernetes orchestration
├── Cloud deployment (AWS, GCP, Azure)
└── Monitoring & observability
```

### Supported ML Frameworks
- **Deep Learning**: TensorFlow, PyTorch, Transformers
- **Classical ML**: scikit-learn, XGBoost, LightGBM
- **Specialized**: Prophet (forecasting), YOLO (vision), HuggingFace (NLP)

---

## Skills Auto-Activation Keywords

### High-Priority Keywords
These trigger immediate skill activation:

**specweave**: increment, planning, feature, spec, TDD, testing
**specweave-github**: GitHub, issue, sync, bidirectional
**specweave-jira**: JIRA, epic, story, subtask
**specweave-ado**: Azure DevOps, ADO, work item
**specweave-frontend**: React, Vue, Angular, Next.js, UI, component
**specweave-backend**: Node.js, Python, .NET, API, REST, database
**specweave-ml**: ML, machine learning, AI, deep learning, TensorFlow, PyTorch

### Secondary Keywords
Increase likelihood of activation when in context:

**specweave-kubernetes**: K8s, Kubernetes, Helm, container, Docker, deployment
**specweave-infrastructure**: cloud, infrastructure, provisioning, monitoring, SLO
**specweave-release**: release, versioning, deployment, changelog, npm publish
**specweave-mobile**: React Native, Expo, iOS, Android, mobile, app

---

## Token Efficiency Analysis

### Context Loading Behavior

| Scenario | Core | Optional | Estimated |
|----------|------|----------|-----------|
| SpecWeave only | Always | None | 12K tokens |
| + GitHub | Always | GitHub | 14K tokens |
| + Frontend | Always | Frontend | 15K tokens |
| + Backend | Always | Backend | 15K tokens |
| + ML | Always | ML | 18K tokens |
| Full Setup | Always | All 20 | 28-30K tokens |

### Progressive Disclosure Savings
- Core loads: Always (essential)
- Optional skills: Only if keywords detected
- Context optimizer: Removes irrelevant skills (up to 80% reduction)
- Per-conversation: Skills only active during that conversation

### Optimization Strategies
1. Use project-specific keywords
2. Enable context-optimizer for large projects
3. Leverage auto-activation (don't manually load)
4. Specify technology stack early
5. Use `/specweave:progress` to monitor context

---

## Command Namespacing

All commands use `/specweave-{plugin}:` prefix to avoid conflicts:

```bash
# Core framework (no plugin name)
/specweave:increment
/specweave:do
/specweave:done

# External integrations
/specweave-github:sync
/specweave-jira:sync
/specweave-ado:sync

# Infrastructure
/specweave-infrastructure:monitor-setup
/specweave-kubernetes:deploy

# Specialized
/specweave-ml:pipeline
/specweave-release:init
/specweave-docs-preview:preview
```

---

## Dependency Graph

### Core Plugin Dependencies
```
specweave (core)
├── Independent (18 skills can work standalone)
└── Agents coordinate with each other
```

### Integration Plugin Dependencies
```
specweave-github/jira/ado
├── Depends on: specweave core (for increment structure)
├── Optional: External tool credentials (.env)
└── Can work independently
```

### Tech Stack Dependencies
```
specweave-frontend/backend/mobile
├── Depends on: specweave core (optional)
├── Independent: Each stack can be used alone
└── Compatible: Can be used together for full-stack
```

### Specialized Plugin Dependencies
```
specweave-ml/infrastructure/release
├── Depends on: specweave core (optional)
├── Suggested: Tech stack plugins for deployment
└── Enhanced by: Other integration plugins
```

---

## Installation Verification

After `specweave init`, verify plugins:

```bash
# List all installed plugins
/plugin list --installed
# Should show ~20 specweave plugins

# Test core functionality
/specweave:status
# Should show current increment status

# Test GitHub integration (if configured)
/specweave-github:status
# Should show sync status

# Test context efficiency
/specweave:progress
# Should show active skills
```

---

## Future Plugin Roadmap

Based on current architecture, these areas could expand:

- **specweave-security**: OWASP, compliance, penetration testing
- **specweave-data**: Database migration, ETL, data pipeline
- **specweave-devops**: Advanced CI/CD, IaC management
- **specweave-analytics**: Metrics, dashboards, reporting
- **specweave-legal**: Contract generation, compliance docs

Current 21 plugins provide comprehensive coverage for modern development.

---

## Summary

SpecWeave's plugin architecture provides:
- **Modular Design**: 21 independent plugins, all auto-installed
- **Smart Activation**: Only load what's needed per conversation
- **Progressive Disclosure**: Start with core, expand as needed
- **Token Efficient**: 12K-30K tokens depending on plugins used
- **Comprehensive Coverage**: From planning to deployment to analytics
- **Extensible**: Easy to add new plugins following same pattern

**Key Achievement**: 75%+ smaller core plugin than pre-plugin architecture while maintaining 100% feature coverage.
