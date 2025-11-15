# SpecWeave Plugin Analysis - Comprehensive Report

**Total Plugins**: 21
**Skills**: 78+
**Agents**: 31
**Commands**: 54+

---

## CORE PLUGIN

### specweave
**Type**: Core Framework Plugin (Auto-Loaded)
**Purpose**: Essential SpecWeave framework providing increment planning, specification generation, TDD workflow, living docs sync, and brownfield support.

**Skills (18)**:
- increment-planner: Creates comprehensive implementation plans for all increment types (features, hotfixes, bugs, refactors, POCs, experiments, product development, MVP creation)
- spec-generator: Generates comprehensive specifications (spec.md, plan.md, tasks.md with embedded tests)
- tdd-workflow: Test-driven development workflow coordinator with red-green-refactor cycle
- brownfield-analyzer: Analyzes existing brownfield projects to map documentation structure to SpecWeave pattern
- brownfield-onboarder: Intelligently onboards brownfield projects by merging existing CLAUDE.md backups into SpecWeave structure
- context-loader: Explains SpecWeave context efficiency through Claude's native progressive disclosure and sub-agent parallelization
- context-optimizer: Second-pass context optimization that removes irrelevant specs/agents from loaded context (80%+ token reduction)
- increment-quality-judge: Optional AI-powered quality assessment for specifications, plans, and tests
- increment-quality-judge-v2: Enhanced AI-powered quality assessment with RISK SCORING (BMAD pattern) and quality gate decisions
- plugin-expert: Expert knowledge of Claude Code's plugin system, marketplace management, and installation commands
- plugin-installer: DEPRECATED - auto-installed during specweave init (backward compatibility only)
- plugin-validator: Validates SpecWeave plugin installation when explicitly requested
- project-kickstarter: Proactively detects product/project descriptions and guides through SpecWeave increment planning
- role-orchestrator: Multi-agent orchestration system that coordinates specialized agents (PM, Architect, DevOps, QA, Tech Lead, Security)
- specweave-detector: Detects SpecWeave context (.specweave/ directory exists) and provides workflow documentation
- specweave-framework: Expert knowledge of SpecWeave framework structure, rules, conventions, and increment lifecycle
- translator: LLM-native translation skill for SpecWeave content (14+ languages, zero-cost)
- docs-updater: Updates living documentation and strategic docs before implementation
- multi-project-spec-mapper: Intelligent multi-project specification splitting and organization

**Agents (10)**:
- pm: Product Manager agent - market research, user stories, competitive analysis, feature scope, go-to-market strategy
- architect: System architect - high-level design, tech stack decisions, scalability planning, integration architecture
- tech-lead: Technical lead agent - code organization, design patterns, technical debt, performance optimization
- qa-lead: QA specialist - test strategy, test case design, edge case identification, quality gates
- test-aware-planner: Test-aware planning expert - embeds tests directly in tasks for BDD workflow
- security: Security engineer - threat modeling, vulnerability assessment, compliance, authentication/authorization
- performance: Performance specialist - optimization, profiling, load testing, caching strategies
- docs-writer: Documentation specialist - API docs, user guides, architecture documentation, living docs
- tdd-orchestrator: TDD expert - enforces red-green-refactor discipline with automated validation gates
- reflective-reviewer: Reviews implementation against original specs and identifies gaps

**Commands (22)**:
- /specweave:increment: Plan new product increment - PM-led process with auto-close
- /specweave:do: Execute increment implementation following spec and plan
- /specweave:done: Close increment with PM validation
- /specweave:validate: Validate SpecWeave increment with rule-based checks
- /specweave:qa: Run quality assessment with risk scoring and quality gate decisions
- /specweave:status: Show increment status overview
- /specweave:progress: Check current increment progress and next action
- /specweave:pause: Pause an active increment
- /specweave:resume: Resume a paused increment
- /specweave:abandon: Abandon incomplete increment
- /specweave:next: Smart increment transition
- /specweave:sync-docs: Bidirectional documentation sync
- /specweave:sync-tasks: Sync tasks.md with actual completion status
- /specweave:update-scope: Log scope changes during implementation
- /specweave:check-tests: Validate test coverage for increment tasks
- /specweave:tdd-cycle: Execute comprehensive TDD workflow
- /specweave:tdd-red: Write comprehensive failing tests
- /specweave:tdd-green: Implement minimal code to make tests pass
- /specweave:tdd-refactor: Refactor code with test safety net
- /specweave:translate: Translate project content to target language
- /specweave:import-docs: Import brownfield documentation
- /specweave:costs: Display AI cost dashboard
- /specweave:init-multiproject: Initialize multi-project mode

**Special Features**:
- Post-task-completion hook: Sound notification, living docs sync, external tool sync
- Post-increment-planning hook: Auto-creates GitHub issues
- 8 lifecycle hooks for automation
- Intelligent living docs sync (9 categories, multi-project support)
- Living docs architecture (Universal Hierarchy)
- Status line feature (1ms render, auto-updates)
- Enterprise specs organization (6 domains)

---

## EXTERNAL TOOL INTEGRATION PLUGINS

### specweave-github
**Type**: External Integration Plugin
**Purpose**: GitHub Issues integration for SpecWeave increments with bidirectional sync

**Skills (3)**:
- github-sync: Bidirectional increment ↔ issue sync with conflict resolution
- github-issue-tracker: Task-level progress tracking via issue comments, checklists, and labels
- github-multi-project: Expert at organizing specs and splitting tasks across multiple GitHub repositories

**Agents (2)**:
- github-manager: AI specialist for GitHub CLI operations, API calls, and sync coordination
- github-task-splitter: Intelligently splits increment tasks into GitHub issues

**Commands (8)**:
- /specweave-github:sync: Synchronize SpecWeave increment with GitHub issue (multi-project support)
- /specweave-github:create-issue: Create GitHub issue from SpecWeave increment
- /specweave-github:close-issue: Close GitHub issue on increment completion
- /specweave-github:status: Check GitHub sync status for increment
- /specweave-github:sync-from: Sync state from GitHub to SpecWeave (bidirectional)
- /specweave-github:sync-tasks: Sync increment tasks to GitHub issues (task-level granularity)
- /specweave-github:sync-spec: Sync SpecWeave spec to GitHub Project (bidirectional)
- /specweave-github:sync-epic: Sync SpecWeave Epic folder to GitHub (Milestone + Issues)

**Special Features**:
- Automatic GitHub issue creation after increment planning
- Multi-project support with profile-based routing
- Time range filtering (1W/1M/3M/6M/ALL) for rate limit protection
- Universal Hierarchy architecture (Epic → Milestone, Increment → Issue)
- Post-task-completion hook for automatic GitHub updates
- Task-level progress comments and checkboxes

---

### specweave-jira
**Type**: External Integration Plugin
**Purpose**: JIRA integration for SpecWeave increments with bidirectional sync

**Skills (2)**:
- jira-sync: Bidirectional sync between increments and JIRA epics/stories
- jira-resource-validator: Validates JIRA projects/boards exist, creates missing resources
- specweave-jira-mapper: Expert in bidirectional conversion with conflict resolution

**Agents (1)**:
- jira-manager: AI specialist for JIRA API operations and sync coordination

**Commands (3)**:
- /specweave-jira:sync: Sync SpecWeave increments with JIRA epics/stories
- /specweave-jira:sync-spec: Sync SpecWeave spec to JIRA Epic (bidirectional)
- /specweave-jira:sync-epic: Sync SpecWeave Epic folder to JIRA (Epic + Stories)

**Special Features**:
- Per-project configuration support (JIRA_BOARDS_{ProjectKey})
- Bidirectional sync with conflict resolution
- Universal Hierarchy architecture (Epic → JIRA Epic, Increment → Story)
- JIRA resource auto-creation (projects, boards, epics, stories)

---

### specweave-ado
**Type**: External Integration Plugin
**Purpose**: Azure DevOps integration with bidirectional sync and multi-project support

**Skills (4)**:
- ado-sync: Bidirectional sync between increments and ADO work items
- ado-resource-validator: Validates ADO projects and resources, creates missing ones
- ado-multi-project: Expert at organizing specs across multiple ADO projects (project-per-team, area-path, team-based)
- specweave-ado-mapper: Expert in bidirectional conversion with conflict resolution

**Agents (3)**:
- ado-manager: ADO API operations and sync coordination
- ado-multi-project-mapper: Maps increments/specs to correct ADO projects
- ado-sync-judge: Validates sync integrity and detects conflicts

**Commands (5)**:
- /specweave-ado:sync: Bidirectional sync between increment and ADO work item
- /specweave-ado:create-workitem: Create ADO work item from increment
- /specweave-ado:close-workitem: Close ADO work item on completion
- /specweave-ado:status: Check ADO sync status
- /specweave-ado:sync-spec: Sync SpecWeave spec to ADO Feature (bidirectional)

**Special Features**:
- Per-project configuration (AZURE_DEVOPS_AREA_PATHS_{ProjectName}, AZURE_DEVOPS_TEAMS_{ProjectName})
- Three organizational strategies: project-per-team, area-path-based, team-based
- Post-task-completion hook for ADO updates
- Universal Hierarchy architecture

---

## TECH STACK PLUGINS

### specweave-frontend
**Type**: Tech Stack Plugin
**Purpose**: Frontend development for React, Vue, and Angular projects

**Skills (3)**:
- frontend: React, Vue, Angular developer - UI components, state management, forms, routing, API integration
- nextjs: NextJS 14+ specialist - App Router, Server Components, NextAuth.js, Prisma, Tailwind CSS
- design-system-architect: Design systems expert using Atomic Design methodology

**Agents**: None

**Commands**: None

---

### specweave-backend
**Type**: Tech Stack Plugin
**Purpose**: Backend API development for Node.js, Python, and .NET

**Skills (3)**:
- nodejs-backend: Node.js/TypeScript expert - Express, Fastify, NestJS, Prisma, TypeORM, Mongoose, authentication, GraphQL
- python-backend: Python expert - FastAPI, Django, Flask, SQLAlchemy, Pydantic, async, data processing
- dotnet-backend: .NET/C# expert - ASP.NET Core, Entity Framework, minimal APIs, gRPC, SignalR, authentication

**Agents (1)**:
- database-optimizer: Specializes in database schema optimization and query performance

**Commands**: None

---

### specweave-mobile
**Type**: Tech Stack Plugin
**Purpose**: React Native and Expo development for mobile applications

**Skills (7)**:
- react-native-setup: Environment setup, project scaffolding, and configuration
- expo-workflow: Expo development server, builds, publishing, and app store deployment
- mobile-debugging: Debugger setup, remote debugging, performance monitoring tools
- performance-optimization: Memory management, bundle size, animation optimization
- native-modules: Native module development and integration with JavaScript
- device-testing: Testing on real devices, simulators, and emulators
- metro-bundler: Metro bundler configuration and optimization

**Agents (1)**:
- mobile-architect: Mobile architecture specialist

**Commands**: None

---

### specweave-ui
**Type**: UI/UX Testing & Design Plugin
**Purpose**: Complete UI/UX development toolkit with Playwright E2E testing and design system integration

**Skills (1)**:
- browser-automation: Playwright E2E testing, visual regression, accessibility testing

**Agents**: None

**Commands**: None

---

## INFRASTRUCTURE & DEPLOYMENT PLUGINS

### specweave-kubernetes
**Type**: Infrastructure Plugin
**Purpose**: Kubernetes deployment and management with security policies and GitOps

**Skills (4)**:
- k8s-manifest-generator: Create production-ready K8s manifests (Deployments, Services, ConfigMaps, Secrets)
- helm-chart-scaffolding: Design and manage Helm charts with templating
- k8s-security-policies: Implement NetworkPolicy, PodSecurityPolicy, RBAC
- gitops-workflow: GitOps with ArgoCD and Flux for automated deployments

**Agents (1)**:
- kubernetes-architect: Kubernetes architecture specialist

**Commands**: None

---

### specweave-infrastructure
**Type**: Infrastructure Plugin
**Purpose**: Cloud infrastructure provisioning and monitoring with focus on cost-effectiveness

**Skills (5)**:
- hetzner-provisioner: Hetzner Cloud provisioning with Terraform/Pulumi - CX11/CX21/CX31, managed Postgres, Docker
- prometheus-configuration: Prometheus setup for metric collection and monitoring
- grafana-dashboards: Create production Grafana dashboards for real-time visualization
- distributed-tracing: Distributed tracing with Jaeger/Tempo for microservices
- slo-implementation: Define SLIs/SLOs with error budgets and alerting

**Agents (5)**:
- devops: DevOps engineer - CI/CD, infrastructure management, tooling
- sre: Site Reliability Engineer - monitoring, on-call, incident response
- observability-engineer: Observability specialist - tracing, metrics, logs
- network-engineer: Network infrastructure specialist
- performance-engineer: Performance tuning and optimization

**Commands (2)**:
- /specweave-infrastructure:monitor-setup: Set up comprehensive monitoring (Prometheus, Grafana, distributed tracing, log aggregation)
- /specweave-infrastructure:slo-implement: Implement Service Level Objectives

---

### specweave-release
**Type**: Release Management Plugin
**Purpose**: Comprehensive release management across single-repo, multi-repo, and monorepo architectures

**Skills (4)**:
- release-strategy-advisor: Detect existing release strategies and recommend improvements
- version-aligner: Align versions across multiple repositories
- rc-manager: Manage Release Candidate (RC) lifecycle with testing and validation
- release-coordinator: Coordinate multi-repo platform releases

**Agents (1)**:
- release-manager: Release orchestration specialist

**Commands (4)**:
- /specweave-release:init: Detect or create release strategy
- /specweave-release:align: Align versions across multiple repositories
- /specweave-release:rc: Manage Release Candidate lifecycle
- /specweave-release:platform: Coordinate multi-repo platform releases

**Special Features**:
- Semantic versioning support
- Brownfield release strategy detection
- Coordinated releases for multi-repo setups
- RC workflow with canary deployments
- CI/CD integration

---

## MACHINE LEARNING PLUGINS

### specweave-ml
**Type**: ML/AI Expertise Plugin
**Purpose**: Complete ML/AI workflow integration from experiment tracking to production deployment

**Skills (13)**:
- ml-pipeline-orchestrator: Design and implement complete ML pipelines
- ml-pipeline-workflow: ML pipeline workflow coordinator
- experiment-tracker: Track experiments with MLflow, Weights & Biases, or Neptune
- model-evaluator: Comprehensive model evaluation with metrics (accuracy, precision, recall, F1, AUC, confusion matrix)
- model-explainer: Generate model explainability reports (SHAP, LIME, feature importance)
- ml-deployment-helper: Generate deployment artifacts (API, Docker, monitoring)
- feature-engineer: Feature engineering and transformation strategies
- automl-optimizer: AutoML framework selection and hyperparameter optimization
- cv-pipeline-builder: Computer Vision pipeline builder (image classification, object detection, segmentation)
- nlp-pipeline-builder: NLP pipeline builder (text classification, NER, sentiment analysis)
- time-series-forecaster: Time series forecasting (Prophet, ARIMA, deep learning)
- anomaly-detector: Anomaly detection algorithms and implementation
- data-visualizer: Data visualization and exploratory data analysis
- model-registry: Model registry and versioning (MLflow, Model Zoo)

**Agents (3)**:
- data-scientist: Data science expert - analysis, modeling, experimentation
- ml-engineer: ML engineer - pipeline building, deployment, optimization
- mlops-engineer: MLOps specialist - experiment tracking, model registry, CI/CD

**Commands (4)**:
- /specweave-ml:pipeline: Design and implement complete ML pipeline
- /specweave-ml:evaluate: Evaluate ML model with comprehensive metrics
- /specweave-ml:explain: Generate model explainability reports
- /specweave-ml:deploy: Generate deployment artifacts

---

## DOCUMENTATION PLUGINS

### specweave-docs
**Type**: Documentation Plugin
**Purpose**: Documentation generation and spec-driven workflows

**Skills (3)**:
- docusaurus: Docusaurus documentation site generation from SpecWeave structure
- spec-driven-brainstorming: Spec-driven feature ideation with Socratic questioning
- spec-driven-debugging: Spec-driven debugging framework for systematic bug investigation

**Agents**: None

**Commands**: None

---

### specweave-docs-preview
**Type**: Documentation Preview Plugin
**Purpose**: Interactive documentation preview with Docusaurus

**Skills (1)**:
- docs-preview: Launch interactive documentation preview server with hot reload

**Commands (2)**:
- /specweave-docs-preview:preview: Launch interactive preview server
- /specweave-docs-preview:build: Build static documentation site for deployment

---

## DESIGN & DEVELOPMENT PLUGINS

### specweave-figma
**Type**: Design Integration Plugin
**Purpose**: Design-to-code workflow patterns for Figma integration

**Skills (1)**:
- figma-to-code: Design-to-code with design token extraction, component generation (React/Angular/Vue/Svelte), Atomic Design

**Agents**: None

**Commands**: None

---

### specweave-diagrams
**Type**: Architecture Visualization Plugin
**Purpose**: Architecture diagram generation with Mermaid following C4 Model conventions

**Skills (2)**:
- diagrams-architect: Expert in creating Mermaid diagrams following C4 Model
- diagrams-generator: Generate C4/sequence/ER/deployment diagrams

**Agents (1)**:
- diagrams-architect: Architecture visualization specialist

**Commands**: None

---

### specweave-testing
**Type**: Testing Plugin
**Purpose**: End-to-end browser testing with Playwright

**Skills (1)**:
- e2e-playwright: Playwright E2E testing - user flows, screenshots, accessibility checks, visual regression

**Agents**: None

**Commands**: None

---

## UTILITY & SPECIALIZED PLUGINS

### specweave-cost-optimizer
**Type**: Cost Optimization Plugin
**Purpose**: Cloud cost optimization and platform comparison

**Skills (1)**:
- cost-optimizer: Analyzes requirements and recommends cheapest platform (Hetzner, Vercel, AWS, Railway, Fly.io, DigitalOcean)

**Agents**: None

**Commands**: None

---

### specweave-payments
**Type**: Financial Integration Plugin
**Purpose**: Payment processing integration for Stripe, PayPal, and billing automation

**Skills (4)**:
- stripe-integration: Stripe checkout, subscriptions, webhooks, payment handling
- paypal-integration: PayPal integration, checkout, subscriptions
- billing-automation: Recurring billing, subscription lifecycle, invoice management
- pci-compliance: PCI DSS compliance guidance and best practices

**Agents (1)**:
- payment-integration: Payment system specialist

**Commands**: None

---

### specweave-tooling
**Type**: Meta-Tooling Plugin
**Purpose**: SpecWeave skill development and orchestration tools

**Skills (2)**:
- skill-creator: Create new skills with proper structure, test cases, activation triggers
- skill-router: Intelligent skill activation based on context

**Agents**: None

**Commands**: None

---

### specweave-alternatives
**Type**: Comparison & Analysis Plugin
**Purpose**: Compare SpecWeave with BMAD, spec-kit, and other spec-driven frameworks

**Skills (2)**:
- bmad-method-expert: BMAD framework expert with dynamic gap analysis
- spec-kit-expert: spec-kit framework expert with dynamic gap analysis

**Agents**: None

**Commands**: None

---

## SUMMARY STATISTICS

### By Category
- **Core Framework**: 1 plugin (22+ commands, 18 skills, 10 agents)
- **External Integration**: 3 plugins (GitHub, JIRA, Azure DevOps)
- **Tech Stack**: 3 plugins (Frontend, Backend, Mobile)
- **Infrastructure**: 2 plugins (Kubernetes, Infrastructure)
- **ML/AI**: 1 plugin (13 skills, 3 agents)
- **Documentation**: 2 plugins (Docs, Docs Preview)
- **Design**: 3 plugins (Figma, Diagrams, Testing/UI)
- **Utilities**: 3 plugins (Cost Optimizer, Payments, Tooling, Alternatives)

### Total Coverage
- **Total Plugins**: 21
- **Total Skills**: 78+
- **Total Agents**: 31
- **Total Commands**: 54+
- **Coverage Areas**: 
  - Increment planning and specification
  - Multi-project sync (GitHub, JIRA, ADO)
  - Tech stacks (React, Vue, Angular, Node.js, Python, .NET, React Native)
  - Infrastructure (K8s, Cloud, Monitoring)
  - Machine Learning (Complete ML lifecycle)
  - Documentation (Docusaurus, living docs)
  - Design (Figma, Mermaid diagrams, Atomic Design)
  - Testing (E2E, unit, integration)
  - Release management (Multi-repo, RC workflow)
  - Payment processing (Stripe, PayPal)
  - Cost optimization

### Auto-Load Behavior
- **Core Plugin** (specweave): Always auto-loaded (essential for all projects)
- **Optional Plugins**: All installed by default, but only activate when:
  - User mentions relevant keywords in conversation
  - Skills detect tech stack or domain keywords
  - Commands are explicitly invoked
  - Agents are called via Task tool

### Token Efficiency
- **Progressive Disclosure**: Only relevant skills activate per conversation
- **Core Plugin**: ~12K tokens (75% smaller than pre-plugin architecture)
- **Multi-plugin Setup**: ~25-30K tokens with all plugins installed, but only paying for what's used
- **Context Optimization**: Second-pass optimization removes irrelevant skills (80%+ reduction possible)
