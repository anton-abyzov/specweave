---
sidebar_position: 3
title: Use Case Guide
description: Find the right skill or command for your task
---

# Use Case Guide

Find the right SpecWeave skill or command for what you're trying to do.

## "I want to..." Quick Lookup

### Planning & Starting Work

| I want to... | Use this | Type |
|--------------|----------|------|
| Start a new feature | `/sw:increment "feature"` | Command |
| Get help writing specs | `/sw:pm` | Skill |
| Design system architecture | `/sw:architect` | Skill |
| Plan a product roadmap | `/sw:roadmap-planner` | Skill |
| Break down a complex feature | `/sw:role-orchestrator` | Skill |
| Create tasks with test plans | `/sw:test-aware-planner` | Skill |

### Implementing Features

| I want to... | Use this | Type |
|--------------|----------|------|
| Work autonomously (hours) | `/sw:auto` | Command |
| Work task-by-task manually | `/sw:do` | Command |
| Work with multiple agents | `/sw:auto-parallel` | Command |
| Check auto mode progress | `/sw:auto-status` | Command |
| Get React/Vue/Angular help | `/frontend:architect` | Skill |
| Get Node.js API help | `/backend:nodejs` | Skill |
| Get .NET help | `/backend:dotnet` | Skill |
| Get Python help | `/backend:python` | Skill |
| Optimize database queries | `/backend:database-optimizer` | Skill |
| Set up Kubernetes | `/k8s:deployment-generate` | Skill |
| Design Kafka architecture | `/kafka:architect` | Skill |

### Testing & Quality

| I want to... | Use this | Type |
|--------------|----------|------|
| Validate quickly (rules) | `/sw:validate` | Command |
| AI quality assessment | `/sw:qa --gate` | Command |
| Deep implementation audit | `/sw:grill` | Command |
| Follow TDD strictly | `/sw:tdd-cycle` | Skill |
| Write failing tests first | `/sw:tdd-red` | Skill |
| Get test strategy help | `/testing:qa` | Skill |
| Write E2E tests | `/testing:e2e` | Skill |
| Code review my changes | `/sw:code-reviewer` | Skill |

### Completing & Managing Work

| I want to... | Use this | Type |
|--------------|----------|------|
| Finish and get next task | `/sw:next` | Command |
| Close specific increment | `/sw:done 0007` | Command |
| Check progress | `/sw:progress` | Command |
| Pause for later | `/sw:pause` | Command |
| Resume paused work | `/sw:resume` | Command |
| Abandon increment | `/sw:abandon` | Command |
| Reopen completed work | `/sw:reopen` | Command |

### Syncing with External Tools

| I want to... | Use this | Type |
|--------------|----------|------|
| Sync to GitHub Issues | `/sw-github:sync` | Command |
| Sync to JIRA | `/sw-jira:sync` | Command |
| Sync to Azure DevOps | `/sw-ado:sync` | Command |
| Configure external sync | `/sw:external-sync-wizard` | Skill |

### Documentation

| I want to... | Use this | Type |
|--------------|----------|------|
| Write technical docs | `/sw:docs-writer` | Skill |
| Update living docs | `/sw:docs-updater` | Skill |
| Navigate project docs | `/sw:living-docs-navigator` | Skill |
| Build Docusaurus site | `/docs:docusaurus` | Skill |
| Preview documentation | `/docs:preview` | Skill |

### Security & Compliance

| I want to... | Use this | Type |
|--------------|----------|------|
| Security assessment | `/sw:security` | Skill |
| Detect security patterns | `/sw:security-patterns` | Skill |
| SOC 2/HIPAA compliance | `/sw:compliance-architecture` | Skill |
| PCI-DSS for payments | `/payments:pci-compliance` | Skill |

### Cost & Performance

| I want to... | Use this | Type |
|--------------|----------|------|
| Optimize cloud costs | `/cost:cost-optimization` | Skill |
| Analyze AWS costs | `/cost:aws-cost-expert` | Skill |
| Improve performance | `/sw:performance` | Skill |

---

## By Role

### I'm a Product Manager

```bash
/sw:pm                    # Requirements, user stories, ACs
/sw:roadmap-planner       # Quarterly planning, prioritization
/sw:increment "feature"   # Start new work
/sw:progress              # Track team progress
```

### I'm an Architect

```bash
/sw:architect             # System design, ADRs
/sw:role-orchestrator     # Coordinate multiple agents
/infra:devops             # CI/CD, deployment
/sw:security              # Security review
```

### I'm a Frontend Developer

```bash
/frontend:architect                # React/Vue patterns
/frontend:nextjs                   # Next.js specifics
/frontend:design-system-architect  # Component library
/sw:auto                           # Autonomous implementation
```

### I'm a Backend Developer

```bash
/backend:nodejs                     # Node.js APIs
/backend:database-optimizer        # SQL optimization
/kafka:architect                   # Event-driven design
/sw:auto                           # Autonomous implementation
```

### I'm a DevOps Engineer

```bash
/infra:devops                      # CI/CD pipelines
/k8s:deployment-generate           # K8s manifests
/k8s:gitops-workflow               # ArgoCD/Flux
/infra:terraform                   # Terraform IaC
```

### I'm a QA Engineer

```bash
/testing:qa                         # Test strategy
/testing:e2e                       # Playwright E2E
/testing:unit                      # Unit test patterns
/sw:tdd-cycle               # TDD workflow
/sw:grill                          # Implementation audit
```

### I'm a Security Engineer

```bash
/sw:security                       # Vulnerability assessment
/sw:security-patterns              # Real-time detection
/sw:compliance-architecture        # Compliance frameworks
/payments:pci-compliance            # PCI-DSS
```

---

## By Phase

### Phase 1: Planning

```mermaid
graph TD
    A[New Feature Request] --> B{Complex?}
    B -->|Yes| C["/sw:role-orchestrator"]
    B -->|No| D["/sw:increment"]
    C --> E[PM + Architect + DevOps + QA]
    D --> F["/sw:pm for spec refinement"]
    E --> G[spec.md + plan.md + tasks.md]
    F --> G
```

**Commands/Skills:**
- `/sw:increment "feature"` - Create increment
- `/sw:pm` - Product management
- `/sw:architect` - Architecture design
- `/sw:role-orchestrator` - Multi-agent coordination

### Phase 2: Implementation

```mermaid
graph TD
    A[tasks.md ready] --> B{Execution Mode?}
    B -->|Hands-free| C["/sw:auto"]
    B -->|Controlled| D["/sw:do"]
    B -->|Parallel| E["/sw:auto-parallel"]
    C --> F[Autonomous loop]
    D --> G[Task-by-task]
    E --> H[Multi-agent worktrees]
```

**Commands/Skills:**
- `/sw:auto` - Autonomous execution
- `/sw:do` - Manual execution
- `/frontend:*` - Frontend skills
- `/backend:*` - Backend skills

### Phase 3: Quality

```mermaid
graph TD
    A[Implementation Done] --> B["/sw:validate"]
    B --> C{Passed?}
    C -->|No| D[Fix issues]
    C -->|Yes| E["/sw:qa --gate"]
    E --> F{PASS/CONCERNS/FAIL}
    F -->|FAIL| D
    F -->|CONCERNS| G[Address concerns]
    F -->|PASS| H[Ready for release]
    D --> B
    G --> E
```

**Commands/Skills:**
- `/sw:validate` - Rule-based checks
- `/sw:qa --gate` - AI quality gate
- `/sw:grill` - Deep audit
- `/sw:code-reviewer` - Code review

### Phase 4: Completion

```mermaid
graph TD
    A[Quality Passed] --> B["/sw:next"]
    B --> C[Close increment]
    C --> D[Archive to _archive/]
    D --> E[Suggest next work]
```

**Commands/Skills:**
- `/sw:next` - Complete and suggest next
- `/sw:done` - Close increment
- `/sw-github:sync` - Sync to GitHub

---

## Common Workflows

### Start to Finish (Autonomous)

```bash
# 1. Create increment
/sw:increment "User authentication with JWT"

# 2. Let it run (go grab coffee, lunch, or sleep)
/sw:auto

# 3. Check from another terminal (optional)
/sw:auto-status

# 4. Complete when done
/sw:next

# 5. Sync to GitHub (optional)
/sw-github:sync 0007
```

### TDD Workflow

```bash
# 1. Create increment
/sw:increment "Payment processing"

# 2. TDD cycle
/sw:tdd-cycle

# OR step by step:
/sw:tdd-red        # Write failing tests
/sw:tdd-green      # Minimal implementation
/sw:tdd-refactor   # Clean up

# 3. Quality gate
/sw:qa --gate

# 4. Complete
/sw:next
```

### Quality-First Release

```bash
# 1. Quick validation
/sw:validate 0007

# 2. Deep audit
/sw:grill 0007 --full

# 3. AI quality gate
/sw:qa 0007 --gate

# 4. Code review
/sw:code-reviewer

# 5. Security check
/sw:security

# 6. Complete
/sw:done 0007
```

### Multi-Repo Project

```bash
# 1. Detect repo structure
/sw:umbrella-repo-detector

# 2. Create coordinated increment
/sw:increment "Feature spanning FE + BE"

# 3. Parallel execution
/sw:auto-parallel

# 4. Sync all to GitHub
/sw-github:github-multi-project
```

---

## Decision Trees

### Which Execution Mode?

```
Start Implementation
        │
        ▼
┌───────────────────┐
│ Do I need to make │
│ decisions during  │──Yes──▶ /sw:do (manual)
│ implementation?   │
└───────────────────┘
        │No
        ▼
┌───────────────────┐
│ Are there isolated│
│ parallel work     │──Yes──▶ /sw:auto-parallel
│ streams (FE/BE)?  │
└───────────────────┘
        │No
        ▼
    /sw:auto (autonomous)
```

### Which Quality Check?

```
Want Quality Check
        │
        ▼
┌───────────────────┐
│ Quick validation  │
│ (rules only)?     │──Yes──▶ /sw:validate
└───────────────────┘
        │No
        ▼
┌───────────────────┐
│ Deep code audit   │
│ with parallel     │──Yes──▶ /sw:grill
│ analysis?         │
└───────────────────┘
        │No
        ▼
    /sw:qa --gate (AI quality)
```

### Which Sync Command?

```
Sync to External Tool
        │
        ▼
┌───────────────────┐
│ Which tool?       │
└───────────────────┘
        │
    ┌───┴───┬───────┐
    ▼       ▼       ▼
 GitHub   JIRA    ADO
    │       │       │
    ▼       ▼       ▼
/sw-github /sw-jira /sw-ado
  :sync     :sync    :sync
```

---

## Skill Auto-Activation Keywords

Skills activate automatically when you mention these keywords:

| Keywords | Skill Activated |
|----------|-----------------|
| "user story", "acceptance criteria", "requirements" | `sw:pm` |
| "architecture", "ADR", "design decision" | `sw:architect` |
| "React", "Vue", "Angular", "frontend" | `frontend:architect` |
| "Node.js", "Express", "API endpoint" | `backend:nodejs` |
| "database", "SQL", "query optimization" | `backend:database-optimizer` |
| "Kubernetes", "K8s", "pods", "deployment" | `k8s:*` |
| "Kafka", "events", "streaming" | `kafka:architect` |
| "test", "TDD", "unit test", "E2E" | `sw:tdd-cycle` |
| "security", "OWASP", "vulnerability" | `sw:security` |
| "compliance", "SOC 2", "HIPAA", "GDPR" | `sw:compliance-architecture` |

---

## Next Steps

- [Skills Reference](./skills) - Complete skills list
- [Commands Reference](./commands) - Complete commands list
- [Quick Start](/docs/getting-started) - Get started in 5 minutes
