---
sidebar_position: 2
title: Plugin Ecosystem
description: Complete guide to SpecWeave's 21 plugins covering integrations, tech stacks, ML, infrastructure, and more
keywords: [plugins, skills, agents, commands, github, jira, kubernetes, react, ml, integration]
---

# 🧩 Plugin Ecosystem

SpecWeave's power comes from its **modular plugin architecture**. With **21 specialized plugins**, you get enterprise-grade capabilities that activate automatically based on your project needs.

:::tip Key Insight
**Progressive Disclosure**: Only relevant plugins activate based on context. Working on React? Frontend plugin loads. Mention Kubernetes? Infrastructure plugin activates. This keeps your AI context lean and efficient.
:::

## 🎯 Quick Start

All plugins are **automatically installed** during `specweave init`:

```bash
npx specweave init .
# ✅ Installs all 21 plugins (GitHub, JIRA, K8s, React, ML, etc.)
# ✅ Registers marketplace globally
# ✅ Ready to use immediately!
```

## 📊 Plugin Categories

### 🔧 Core Framework (Always Active)

#### **specweave** - Essential Framework
The foundation of SpecWeave, always loaded in every project.

**Key Capabilities:**
- 🎯 **9 Skills**: increment-planner, spec-generator, tdd-workflow, brownfield-analyzer, context-optimizer
- 🤖 **22 Agents**: PM, Architect, Tech Lead, QA Lead, Security Engineer, Code Reviewer
- ⚡ **22 Commands**: Full increment lifecycle management

**Example: Planning a New Feature**
```bash
# The PM agent (from core plugin) helps you create a spec
/specweave:increment "User authentication with OAuth"

# Output: Creates spec.md, plan.md, tasks.md with:
# - User stories with acceptance criteria
# - Technical design with architecture
# - Task breakdown with embedded test plans
# - BDD format (Given/When/Then)
```

**Skills Highlight:**
- **increment-planner**: Automatically activates when you say "plan feature", "new increment", "build X"
- **tdd-workflow**: Activates on "TDD", "test-driven", "red-green-refactor"
- **brownfield-analyzer**: Detects existing projects and maps documentation to SpecWeave structure

---

### 🔗 External Integrations

#### **specweave-github** - GitHub Issues Integration
Bidirectional sync between SpecWeave increments and GitHub Issues.

**Key Features:**
- ✅ Auto-creates issues on increment planning
- ✅ Task-level progress tracking (checkboxes)
- ✅ Universal Hierarchy: Epic → Milestone, Increment → Issue
- ✅ Smart conflict resolution

**Example: Auto-Sync Workflow**
```bash
# 1. Create increment (issue auto-created!)
/specweave:increment "Add dark mode"
# 🔗 GitHub Issue #42 created automatically

# 2. Start work
/specweave:do

# 3. Complete a task
# ✅ GitHub issue checkbox updates automatically!

# 4. Manual sync (if needed)
/specweave-github:sync 0023 --time-range 1M
```

**Commands:**
- `/specweave-github:sync` - Bidirectional sync with time range filtering
- `/specweave-github:create-issue` - Manual issue creation
- `/specweave-github:sync-epic` - Sync Epic folder to GitHub Milestone
- `/specweave-github:status` - Check sync status

**Configuration:**
```json
{
  "sync": {
    "settings": {
      "autoCreateIssue": true,
      "syncDirection": "bidirectional"
    },
    "profiles": {
      "frontend": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend"
        }
      }
    }
  }
}
```

---

#### **specweave-jira** - JIRA Integration
Enterprise JIRA integration with Epic/Story sync.

**Key Features:**
- ✅ Bidirectional Epic ↔ JIRA Epic sync
- ✅ User Stories ↔ JIRA Stories
- ✅ Status mapping (Planning → To Do, Active → In Progress)
- ✅ Multi-project support

**Example: JIRA Sync**
```bash
# Sync increment to JIRA
/specweave-jira:sync 0042

# Sync Epic folder (20+ user stories)
/specweave-jira:sync-epic FS-031-authentication

# Check status
/specweave-jira:status 0042
```

**Status Mapping:**
```
SpecWeave          → JIRA
─────────────────────────────
planning           → To Do
active             → In Progress
paused             → On Hold
completed          → Done
abandoned          → Cancelled
```

---

#### **specweave-ado** - Azure DevOps Integration
Enterprise Azure DevOps sync with Work Items.

**Key Features:**
- ✅ Epic → Azure DevOps Epic
- ✅ Increment → User Story
- ✅ Tasks → Tasks with Area Paths
- ✅ Multi-project organization strategies

**Example:**
```bash
# Sync to Azure DevOps
/specweave-ado:sync 0031

# Create work item manually
/specweave-ado:create-workitem 0031

# Check sync status
/specweave-ado:status 0031
```

---

#### **specweave-figma** - Figma Design Integration
Connect designs to implementation.

**Skills:**
- **figma-integration**: Extract design tokens, components, screens
- Converts Figma → React components
- Auto-generates prop types from Figma properties

---

### 💻 Tech Stack Plugins

#### **specweave-frontend** - Frontend Development
React, Vue, Angular, Next.js expertise.

**Agents:**
- **frontend-architect**: Component architecture, state management patterns
- **react-expert**: Hooks, performance, modern patterns
- **nextjs-specialist**: SSR, ISR, routing, API routes

**Example: React Component Planning**
```bash
# Frontend architect activates automatically
"I need to build a reusable data table component with sorting and filtering"

# Generates:
# - Component architecture (container/presentational)
# - State management approach (useState, useReducer, Zustand)
# - Performance optimizations (React.memo, useMemo)
# - Accessibility (ARIA labels, keyboard navigation)
# - Test strategy (Jest, React Testing Library)
```

**Tech Stack Coverage:**
- React, Vue 3, Angular, Svelte
- Next.js, Nuxt, SvelteKit
- State Management: Redux, Zustand, Jotai, Pinia
- Styling: Tailwind CSS, Styled Components, Emotion

---

#### **specweave-backend** - Backend Development
Node.js, Python, .NET expertise.

**Agents:**
- **backend-architect**: API design, microservices, authentication
- **nodejs-expert**: Express, Fastify, NestJS patterns
- **python-expert**: Django, FastAPI, async patterns

**Example: API Design**
```bash
"Design RESTful API for user management with authentication"

# Backend architect generates:
# - OpenAPI/Swagger spec
# - Authentication strategy (JWT, OAuth2)
# - Database schema (PostgreSQL)
# - Rate limiting and caching
# - Error handling patterns
# - API versioning strategy
```

---

#### **specweave-mobile** - Mobile Development
React Native and Expo expertise.

**Agents:**
- **mobile-architect**: Navigation, state, offline-first patterns
- **react-native-expert**: Native modules, performance optimization

**Example:**
```bash
"Build offline-first mobile app with background sync"

# Mobile architect provides:
# - React Native architecture
# - Offline data strategy (SQLite, Realm, WatermelonDB)
# - Background sync with NetInfo
# - Push notifications setup
# - Platform-specific considerations (iOS/Android)
```

---

### ☁️ Infrastructure & DevOps

#### **specweave-infrastructure** - Infrastructure Engineering
Cloud infrastructure with Hetzner, DigitalOcean, monitoring.

**Agents:**
- **devops**: CI/CD pipelines, cloud deployments
- **sre**: Incident response, troubleshooting, root cause analysis
- **observability-engineer**: Monitoring, logging, distributed tracing
- **network-engineer**: VPC, firewalls, load balancers

**Example: Production Incident**
```bash
"API response time increased to 5 seconds, CPU at 90%"

# SRE agent activates with:
# - Incident severity classification (SEV2)
# - Immediate mitigation steps
# - Root cause analysis checklist
# - Performance profiling strategy
# - Post-mortem template
```

**Playbooks:**
- High CPU Usage
- Database Deadlock
- Memory Leak Detection
- Slow API Response
- DDoS Attack Mitigation
- Disk Full Recovery
- Service Down Recovery
- Data Corruption
- Cascade Failure Prevention
- Rate Limit Exceeded

---

#### **specweave-kubernetes** - Kubernetes Orchestration
Cloud-native K8s architecture, GitOps, service mesh.

**Agent:**
- **kubernetes-architect**: EKS/AKS/GKE, Helm, ArgoCD/Flux, Istio

**Example: K8s Setup**
```bash
"Deploy microservices to Kubernetes with GitOps"

# K8s architect provides:
# - Helm chart structure
# - ArgoCD/Flux configuration
# - Service mesh setup (Istio)
# - Multi-tenancy strategy
# - Monitoring with Prometheus/Grafana
# - Security policies (Network Policies, PSP)
```

---

### 🤖 Machine Learning & Data Science

#### **specweave-ml** - ML Engineering
Complete ML lifecycle from data to deployment.

**Agents:**
- **ml-engineer**: Model training, deployment, MLOps
- **data-scientist**: Statistical analysis, predictive modeling, EDA
- **mlops-engineer**: MLflow, Kubeflow, experiment tracking

**Commands:**
- `/specweave-ml:pipeline` - Design complete ML pipeline
- `/specweave-ml:evaluate` - Evaluate model with metrics
- `/specweave-ml:deploy` - Generate deployment artifacts
- `/specweave-ml:explain` - Model explainability (SHAP, LIME)

**Example: ML Pipeline**
```bash
# Design complete ML workflow
/specweave-ml:pipeline "Customer churn prediction"

# Generates:
# 1. Data preprocessing (feature engineering, scaling)
# 2. Model training (XGBoost, Random Forest, Neural Network)
# 3. Hyperparameter tuning (Optuna)
# 4. Model evaluation (precision, recall, F1, ROC-AUC)
# 5. MLflow experiment tracking
# 6. Model registry and versioning
# 7. Deployment (FastAPI, Docker, Kubernetes)
# 8. Monitoring (data drift, model performance)
```

**Tech Stack:**
- Frameworks: TensorFlow, PyTorch, scikit-learn, XGBoost
- MLOps: MLflow, Kubeflow, Weights & Biases
- Deployment: FastAPI, TorchServe, TFServing
- Monitoring: Evidently AI, WhyLabs

---

### 💳 Specialized Domains

#### **specweave-payments** - Payment Integration
Stripe, PayPal, payment processor expertise.

**Agent:**
- **payment-integration**: Checkout flows, webhooks, PCI compliance

**Example:**
```bash
"Implement Stripe subscription billing"

# Payment integration agent provides:
# - Stripe Checkout setup
# - Subscription lifecycle management
# - Webhook handling (payment_intent.succeeded)
# - Invoice generation
# - Failed payment retry logic
# - PCI compliance checklist
```

---

### 📚 Documentation & Diagrams

#### **specweave-docs-preview** - Documentation Preview
Live Docusaurus preview with hot reload.

**Commands:**
- `/specweave-docs-preview:preview` - Launch interactive preview server
- `/specweave-docs-preview:build` - Build static site for deployment

**Example:**
```bash
# Preview living docs
/specweave-docs-preview:preview

# Output:
# 🚀 Server running at http://localhost:3000
# 📁 Auto-generated sidebar from .specweave/docs/
# 🔄 Hot reload enabled
# 📊 Mermaid diagrams rendered
```

---

#### **specweave-diagrams** - Diagram Generation
Mermaid diagrams following C4 Model conventions.

**Agent:**
- **diagrams-architect**: C4 Context/Container/Component, sequence, ER diagrams

**Example:**
```bash
"Create C4 Container diagram for microservices architecture"

# Generates:
```mermaid
graph TB
    User[User]
    WebApp[Web Application]
    API[API Gateway]
    AuthService[Auth Service]
    UserService[User Service]
    DB[(Database)]

    User -->|HTTPS| WebApp
    WebApp -->|REST| API
    API -->|gRPC| AuthService
    API -->|gRPC| UserService
    UserService -->|SQL| DB
```
```

---

### 🚀 Release Management

#### **specweave-release** - Release Orchestration
Multi-repo releases, semantic versioning, RC workflows.

**Agents:**
- **release-manager**: Coordinates releases across monorepo/polyrepo

**Commands:**
- `/specweave-release:init` - Initialize release strategy
- `/specweave-release:align` - Align versions across repos
- `/specweave-release:rc` - Manage Release Candidate lifecycle
- `/specweave-release:platform` - Multi-repo platform releases

**Example:**
```bash
# Initialize release strategy
/specweave-release:init
# Analyzes git history, CI/CD configs, recommends strategy

# Create Release Candidate
/specweave-release:rc create v1.5.0-rc.1

# Promote to production
/specweave-release:rc promote v1.5.0-rc.3
```

---

### 🎨 UI Testing & Automation

#### **specweave-ui** - Browser Automation
Playwright integration with MCP protocol.

**Features:**
- Browser automation for E2E testing
- Visual regression testing
- Accessibility testing
- Performance monitoring

---

### 🔧 Utilities

#### **specweave-cost-optimizer** - AI Cost Optimization
Tracks AI costs, suggests optimizations.

**Features:**
- Cost tracking per increment
- Model selection recommendations (Sonnet vs Haiku)
- Context optimization suggestions

---

#### **specweave-alternatives** - Tool Alternatives
Suggests alternatives when users mention specific tools.

**Example:**
```bash
"I want to use MongoDB"

# Suggests:
# ✅ MongoDB (NoSQL, document store)
# 🔄 Alternatives:
#   - PostgreSQL with JSONB (relational + document)
#   - CouchDB (CouchDB protocol)
#   - RethinkDB (real-time queries)
```

---

## 🎯 How Plugins Work Together

### Example: Full-Stack Feature Implementation

```bash
# 1. PM Agent (Core) creates spec
/specweave:increment "Real-time chat feature"

# 2. Architect Agent (Core) designs system
# - WebSocket architecture
# - Database schema (PostgreSQL)
# - Caching strategy (Redis)

# 3. Frontend Agent (Frontend Plugin) designs UI
# - React components
# - State management (Zustand)
# - WebSocket client

# 4. Backend Agent (Backend Plugin) designs API
# - WebSocket server (Socket.io)
# - Authentication (JWT)
# - Message persistence

# 5. K8s Agent (Infrastructure Plugin) plans deployment
# - Helm charts
# - Horizontal Pod Autoscaler
# - Ingress configuration

# 6. GitHub Agent (GitHub Plugin) creates issue
# - Auto-creates GitHub Issue #84
# - Links to increment

# 7. Start implementation
/specweave:do

# 8. All agents collaborate during implementation!
```

---

## 📈 Token Efficiency

**Context Optimization in Action:**

| Scenario | Active Plugins | Token Usage |
|----------|----------------|-------------|
| **Planning Only** | Core | ~12K tokens |
| **React Feature** | Core + Frontend | ~18K tokens |
| **Full-Stack API** | Core + Frontend + Backend | ~24K tokens |
| **ML Pipeline** | Core + ML + Infrastructure | ~28K tokens |
| **Enterprise (All)** | All 21 plugins | ~30K tokens |

**Result**: 75% smaller than monolithic architecture!

---

## 🔍 Finding the Right Plugin

| I want to... | Use Plugin | Key Command |
|-------------|-----------|-------------|
| Plan increment | **specweave** | `/specweave:increment` |
| Sync to GitHub | **specweave-github** | `/specweave-github:sync` |
| Deploy to K8s | **specweave-kubernetes** | Agent auto-activates |
| Build React app | **specweave-frontend** | Agent auto-activates |
| Create ML pipeline | **specweave-ml** | `/specweave-ml:pipeline` |
| Preview docs | **specweave-docs-preview** | `/specweave-docs-preview:preview` |
| Handle incidents | **specweave-infrastructure** | SRE agent + playbooks |
| Generate diagrams | **specweave-diagrams** | Agent auto-activates |
| Integrate Stripe | **specweave-payments** | Agent auto-activates |
| Manage releases | **specweave-release** | `/specweave-release:init` |

---

## 🚀 Quick Reference: All 21 Plugins

| Plugin | Purpose | Key Features |
|--------|---------|--------------|
| **specweave** | Core framework | 22 agents, 22 commands, increment lifecycle |
| **specweave-github** | GitHub sync | Bidirectional sync, auto-issue creation |
| **specweave-jira** | JIRA sync | Epic/Story sync, status mapping |
| **specweave-ado** | Azure DevOps | Work items, multi-project strategies |
| **specweave-frontend** | Frontend dev | React, Vue, Angular, Next.js |
| **specweave-backend** | Backend dev | Node.js, Python, .NET, APIs |
| **specweave-mobile** | Mobile dev | React Native, Expo, offline-first |
| **specweave-infrastructure** | DevOps | SRE, monitoring, incident response |
| **specweave-kubernetes** | K8s orchestration | Helm, GitOps, service mesh |
| **specweave-ml** | Machine Learning | MLOps, pipelines, deployment |
| **specweave-release** | Release mgmt | Semantic versioning, RC workflow |
| **specweave-payments** | Payments | Stripe, PayPal, PCI compliance |
| **specweave-ui** | Browser automation | Playwright, E2E testing |
| **specweave-diagrams** | Diagram generation | Mermaid, C4 Model |
| **specweave-docs-preview** | Docs preview | Docusaurus, hot reload |
| **specweave-figma** | Design integration | Figma → Components |
| **specweave-cost-optimizer** | Cost tracking | AI cost optimization |
| **specweave-alternatives** | Tool suggestions | Alternative recommendations |
| **specweave-docs** | Documentation | Guides, API docs |
| **specweave-testing** | Testing utilities | Test automation |
| **specweave-tooling** | Development tools | CLI utilities |

---

## 💡 Tips for Maximum Efficiency

### 1. Trust Progressive Disclosure
Don't manually load plugins. Let skills activate based on context:
- Say "React" → Frontend plugin activates
- Say "Kubernetes" → Infrastructure plugin activates
- Say "ML pipeline" → ML plugin activates

### 2. Use Context Optimizer
For large projects with 100+ files:
```bash
"Optimize context for authentication feature"
# Context optimizer removes 80% irrelevant specs/modules
```

### 3. Leverage Command Shortcuts
```bash
# Planning
/specweave:increment → /specweave:do → /specweave:done

# Quality
/specweave:validate → /specweave:qa → /specweave:check-tests

# Sync
/specweave-github:sync → /specweave:sync-docs
```

### 4. Multi-Project Setup
```json
{
  "sync": {
    "profiles": {
      "frontend": {"provider": "github", "config": {"repo": "frontend"}},
      "backend": {"provider": "github", "config": {"repo": "backend"}},
      "mobile": {"provider": "github", "config": {"repo": "mobile"}}
    }
  }
}
```

---

## 🎓 Learning Resources

- **[Getting Started Guide](/docs/intro)** - Installation and first increment
- **[Workflows](/docs/workflows/overview)** - Complete development journey
- **[Commands Reference](/docs/commands/overview)** - All essential commands
- **[Multi-Project Sync](/docs/integrations/multi-project-sync)** - GitHub/JIRA/ADO setup
- **[FAQ](/docs/faq)** - Common questions answered

---

## 🤝 Contributing

Want to add a new plugin? See [CLAUDE.md](https://github.com/anton-abyzov/specweave/blob/develop/CLAUDE.md) for plugin development guide.

**Plugin Ideas Welcome:**
- Cloud providers (AWS, GCP, Azure)
- Languages (Go, Rust, Java)
- Frameworks (Spring Boot, Django, Rails)
- Databases (MongoDB, Redis, Cassandra)
- Testing tools (Cypress, Playwright)

---

:::tip Next Steps
1. ✅ Install: `npx specweave init .`
2. 🎯 Plan: `/specweave:increment "Your feature"`
3. ⚡ Implement: `/specweave:do`
4. 🔗 Sync: `/specweave-github:sync`
5. ✅ Complete: `/specweave:done`

**All 21 plugins are ready to help you build faster!**
:::
