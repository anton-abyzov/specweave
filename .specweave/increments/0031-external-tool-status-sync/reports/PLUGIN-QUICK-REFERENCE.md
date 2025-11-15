# SpecWeave Plugin Quick Reference Guide

## Installation & Activation

All plugins are auto-installed during `specweave init`. Skills activate based on keywords in their descriptions when those keywords appear in conversation.

### Plugin Auto-Activation Keywords

#### Core Plugin (specweave)
- Keywords: increment, planning, feature planning, spec, TDD, pm, architect, brownfield, migration, tests, living docs

#### specweave-github
- Keywords: GitHub, issues, GitHub integration, sync, bidirectional, project management

#### specweave-jira
- Keywords: JIRA, Jira, atlassian, epic, story, subtask, issue tracking

#### specweave-ado
- Keywords: Azure DevOps, ADO, work items, project management

#### specweave-ml
- Keywords: machine learning, AI, ML, MLOps, experiment tracking, model evaluation, deep learning, neural networks, TensorFlow, PyTorch, scikit-learn

#### specweave-infrastructure
- Keywords: infrastructure, cloud, hetzner, monitoring, prometheus, grafana, SLO, observability

#### specweave-kubernetes
- Keywords: kubernetes, k8s, helm, deployment, gitops, docker, container

#### specweave-frontend
- Keywords: frontend, react, vue, angular, nextjs, ui, component, design system

#### specweave-backend
- Keywords: backend, nodejs, python, dotnet, rest api, api, graphql, database

#### specweave-mobile
- Keywords: react native, expo, ios, android, mobile, app

#### specweave-release
- Keywords: release, versioning, semver, deployment, changelog, npm publish, version bump

#### specweave-ui
- Keywords: playwright, e2e, testing, ui testing, browser automation, visual regression

#### specweave-diagrams
- Keywords: diagram, mermaid, architecture, c4 model, visualization, sequence diagram

#### specweave-figma
- Keywords: figma, design, design system, design tokens, component generation

#### specweave-docs
- Keywords: documentation, docusaurus, spec-driven, brainstorming, debugging

#### specweave-docs-preview
- Keywords: preview docs, documentation preview, docusaurus server, view docs

#### specweave-testing
- Keywords: playwright, e2e, testing, browser automation

#### specweave-payments
- Keywords: stripe, paypal, payment, billing, subscription, checkout

#### specweave-cost-optimizer
- Keywords: cost, budget, pricing, cheapest, optimize, save money

#### specweave-tooling
- Keywords: skill creation, skill development, meta-tooling

#### specweave-alternatives
- Keywords: BMAD, spec-kit, openspec, compare frameworks

---

## Command Reference by Plugin

### Core Commands (specweave)
```bash
/specweave:increment          # Plan new increment (PM-led)
/specweave:do                 # Execute tasks
/specweave:done               # Complete increment
/specweave:status             # Show status overview
/specweave:progress           # Show progress
/specweave:pause              # Pause increment
/specweave:resume             # Resume increment
/specweave:abandon            # Abandon increment
/specweave:next               # Smart transition
/specweave:validate           # Validate increment
/specweave:qa                 # Quality assessment
/specweave:check-tests        # Validate tests
/specweave:sync-docs          # Sync living docs
/specweave:sync-tasks         # Sync task status
/specweave:update-scope       # Log scope changes
/specweave:tdd-cycle          # Full TDD cycle
/specweave:tdd-red            # Write tests
/specweave:tdd-green          # Implement code
/specweave:tdd-refactor       # Refactor code
/specweave:translate          # Translate content
/specweave:import-docs        # Import brownfield docs
/specweave:costs              # AI cost dashboard
```

### GitHub Commands
```bash
/specweave-github:sync        # Sync with GitHub issue
/specweave-github:create-issue
/specweave-github:close-issue
/specweave-github:status
/specweave-github:sync-from   # GitHub → SpecWeave
/specweave-github:sync-tasks  # Task-level sync
/specweave-github:sync-spec   # Spec → GitHub Project
/specweave-github:sync-epic   # Epic → Milestone
```

### JIRA Commands
```bash
/specweave-jira:sync          # Sync with JIRA
/specweave-jira:sync-spec     # Spec → JIRA Epic
/specweave-jira:sync-epic     # Epic → JIRA Epic
```

### Azure DevOps Commands
```bash
/specweave-ado:sync           # Sync with ADO
/specweave-ado:create-workitem
/specweave-ado:close-workitem
/specweave-ado:status
/specweave-ado:sync-spec      # Spec → ADO Feature
```

### ML Commands
```bash
/specweave-ml:pipeline        # Design ML pipeline
/specweave-ml:evaluate        # Evaluate model
/specweave-ml:explain         # Explainability report
/specweave-ml:deploy          # Deployment artifacts
```

### Infrastructure Commands
```bash
/specweave-infrastructure:monitor-setup
/specweave-infrastructure:slo-implement
```

### Release Commands
```bash
/specweave-release:init       # Detect/create strategy
/specweave-release:align      # Align versions
/specweave-release:rc         # Release Candidate
/specweave-release:platform   # Multi-repo release
```

### Docs Commands
```bash
/specweave-docs-preview:preview
/specweave-docs-preview:build
```

---

## Agent Reference

### Core Agents
- **pm**: Product management - feature scope, user research, go-to-market
- **architect**: System design - tech stack, scalability, integration
- **tech-lead**: Technical strategy - code organization, design patterns
- **qa-lead**: Quality assurance - test strategy, edge cases
- **security**: Security specialist - threat modeling, compliance
- **performance**: Performance tuning - profiling, optimization
- **docs-writer**: Documentation - API docs, guides
- **tdd-orchestrator**: TDD discipline - red-green-refactor enforcement
- **test-aware-planner**: Test-embedded planning - BDD workflow
- **reflective-reviewer**: Gap detection - spec vs implementation

### Infrastructure Agents
- **devops**: CI/CD, infrastructure management
- **sre**: Monitoring, on-call, incidents
- **observability-engineer**: Tracing, metrics, logs
- **network-engineer**: Network infrastructure
- **performance-engineer**: Optimization, load testing

### Specialized Agents
- **data-scientist**: Data analysis, modeling, experimentation
- **ml-engineer**: ML pipeline, deployment, optimization
- **mlops-engineer**: Experiment tracking, model registry, CI/CD
- **mobile-architect**: Mobile app architecture
- **kubernetes-architect**: K8s deployment architecture
- **payment-integration**: Payment system specialist
- **release-manager**: Release orchestration
- **github-manager**: GitHub operations
- **jira-manager**: JIRA operations
- **ado-manager**: Azure DevOps operations
- **diagrams-architect**: Diagram generation
- **database-optimizer**: Query optimization, schema design

---

## Tech Stack Coverage

### Frontend
- **React**: Modern hooks, state management (Redux, Zustand), forms, routing, TanStack Query
- **Vue**: 3.x composition API, state management, forms, routing
- **Angular**: Modern Angular (v14+), RxJS, forms, services
- **Next.js**: 14+ App Router, Server Components, NextAuth, Prisma, Tailwind

### Backend
- **Node.js**: Express, Fastify, NestJS, GraphQL, Prisma, TypeORM, authentication
- **Python**: FastAPI, Django, Flask, SQLAlchemy, async patterns, data science
- **.NET**: ASP.NET Core, EF Core, minimal APIs, gRPC, SignalR

### Mobile
- **React Native**: Environment setup, debugging, performance optimization
- **Expo**: App building, publishing, deployment to app stores

### Databases
- **Relational**: PostgreSQL, MySQL, SQL Server (with Prisma, TypeORM, SQLAlchemy, EF Core)
- **Document**: MongoDB (with Mongoose, Pydantic)
- **Cache**: Redis (for sessions, jobs, caching)

### Cloud Platforms
- **Hetzner Cloud**: Cost-effective VPS provisioning (CX11/CX21/CX31)
- **AWS**: General-purpose cloud services
- **Vercel**: Frontend deployment and hosting
- **Railway**: Easy deployment platform
- **Fly.io**: Container deployment
- **DigitalOcean**: VPS and managed services

### Deployment & Infrastructure
- **Kubernetes**: Manifests, Helm charts, security policies, GitOps
- **Docker**: Containerization, multi-stage builds
- **Monitoring**: Prometheus, Grafana, distributed tracing (Jaeger/Tempo)
- **CI/CD**: GitHub Actions, GitOps workflows

### Machine Learning
- **Frameworks**: TensorFlow, PyTorch, scikit-learn, Transformers
- **Experiment Tracking**: MLflow, Weights & Biases, Neptune
- **Specialized**: Computer Vision (YOLOv8, etc.), NLP, Time Series (Prophet, ARIMA)
- **Deployment**: FastAPI, Docker, Kubernetes, cloud platforms

---

## Typical Workflows

### Building a New Feature
1. `/specweave:increment "Feature name"`
2. Architect designs system (uses architect agent)
3. `/specweave:do` to start implementation
4. `/specweave:check-tests` to validate test coverage
5. Complete tasks → GitHub/JIRA/ADO auto-updates
6. `/specweave:done` to close increment
7. Living docs auto-sync

### Multi-Repo Release
1. `/specweave-release:init` to detect strategy
2. `/specweave-release:align` to sync versions
3. Update CHANGELOG.md
4. `/specweave-release:rc` to create release candidate
5. Test, then promote to production

### ML Model Development
1. `/specweave:increment "ML Model: Feature Name"`
2. `/specweave-ml:pipeline` to design full pipeline
3. Execute training via `/specweave:do`
4. `/specweave-ml:evaluate` for metrics
5. `/specweave-ml:explain` for explainability
6. `/specweave-ml:deploy` for production artifacts

### Infrastructure Setup
1. `/specweave:increment "Infrastructure: Monitoring"`
2. `/specweave-infrastructure:monitor-setup` for Prometheus/Grafana
3. `/specweave-infrastructure:slo-implement` for SLOs
4. Deploy to Kubernetes via `/specweave:do`
5. Verify monitoring dashboards

---

## Context Loading & Token Efficiency

### Progressive Disclosure
- Only relevant skills activate per conversation
- Core plugin (~12K tokens) always loaded
- Optional plugins load only when keywords detected
- Context optimizer can reduce tokens by 80%+

### Managing Context
```bash
# Check what's loaded
/specweave:progress    # Shows active context

# Reduce context for large projects
# Use context-optimizer skill explicitly
# Or request: "Optimize context for this conversation"
```

### Multi-Project Token Reduction
- Single `.specweave/` at root (not nested)
- Project-specific skills only activate when project mentioned
- Parent repo `.specweave/` serves all child repos
- Separate specs by project (specs/backend/, specs/frontend/)

---

## Configuration Files

### Main Config
**Location**: `.specweave/config.json`

**Key Settings**:
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true,
      "auto_sound": true
    }
  },
  "sync": {
    "settings": {
      "autoCreateIssue": true,
      "syncDirection": "bidirectional"
    },
    "activeProfile": "specweave-dev",
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    }
  },
  "multiProject": {
    "projects": {
      "backend": {
        "name": "Backend Services",
        "keywords": ["api", "backend"]
      },
      "frontend": {
        "name": "Frontend App",
        "keywords": ["ui", "frontend"]
      }
    }
  }
}
```

### Environment Variables
```bash
# GitHub
GITHUB_TOKEN=github_pat_...
GIT_REPO_OWNER=anton-abyzov
GIT_REPO_NAME=specweave

# JIRA
JIRA_URL=https://your-instance.atlassian.net
JIRA_USER=your-email@example.com
JIRA_API_TOKEN=api_token_...
JIRA_BOARDS_PROJECT_A=1234

# Azure DevOps
AZURE_DEVOPS_ORG=https://dev.azure.com/yourorg
AZURE_DEVOPS_TOKEN=pat_...
AZURE_DEVOPS_AREA_PATHS_Backend="Backend Project/Backend Team"
AZURE_DEVOPS_TEAMS_Backend="Backend Team"

# Cloud Platforms
AWS_REGION=us-east-1
HETZNER_TOKEN=token_...
```

---

## Performance Tips

### Reduce Token Usage
1. Use `context-optimizer` skill for large projects
2. Specify project when working multi-project
3. Disable unused plugins (though all are already installed efficiently)
4. Use `/specweave:status` to check active context

### Speed Up Workflows
1. Enable auto-create for GitHub issues
2. Use bidirectional sync to avoid manual updates
3. Use `/specweave:do` for smart resume (picks up where you left off)
4. Embed tests in tasks.md (no separate test files)

### Monitor Costs
1. Use `/specweave:costs` to see AI spending
2. Review plugin usage patterns
3. Use time-range filtering in multi-project sync
4. Leverage skill auto-activation (don't manually load unnecessary skills)

---

## Troubleshooting

### Plugin Not Activating
1. Check skill description has relevant keywords
2. Restart Claude Code after plugin changes
3. Verify plugin installed: `/plugin list --installed`

### Command Not Found
1. Use `/specweave:` prefix (not `/` alone)
2. Verify plugin is installed
3. Check command name exactly (case-sensitive)

### Sync Not Working
1. Verify environment variables set (.env file)
2. Check credentials are valid (gh auth status, jira login, etc.)
3. Review sync configuration in .specweave/config.json
4. Try manual sync first to diagnose

### Tests Not Embedded
1. Use new task format: add "**Test Plan** (BDD):" section
2. Don't create separate tests.md files
3. Use `/specweave:check-tests` to validate
4. AC-IDs must be linked to tasks

---

## Next Steps

- Read [SpecWeave Documentation](https://spec-weave.com)
- Browse [Plugin Marketplace](https://github.com/anton-abyzov/specweave/.claude-plugin/marketplace.json)
- Review [Architecture Decisions](../.specweave/docs/internal/architecture/adr/)
- Check [Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)
