hello

# SpecWeave Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## Git Commits

- Do NOT include "Generated with Claude Code" or AI-assisted notes in commit messages
- Do NOT include "Co-Authored-By: Claude" in commit messages
- Keep commit messages clean and professional

---

## Marketplace Installation (CRITICAL)

**ALWAYS use GitHub marketplace mode. NEVER use local symlinks or directory mode.**

```bash
# ✅ CORRECT: Install from GitHub (production, stable)
bash scripts/refresh-marketplace.sh --github

# ❌ FORBIDDEN: Local/symlink mode (causes stale hooks, filesystem coupling)
# bash scripts/refresh-marketplace.sh --local
```

**Why GitHub mode is mandatory:**
- Local mode creates filesystem coupling → stale hooks after changes
- GitHub mode pulls committed code → stable, production-ready
- See ADR-0062 for architectural decision rationale

**Quick refresh & install all 24 plugins:**
```bash
bash scripts/refresh-marketplace.sh  # Defaults to --github
```

---

## Critical Safety Rules

### 1. Context Management (CRASH PREVENTION)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/sw:pause XXXX → edit → /sw:resume XXXX
# OR close completed increments: /sw:done XXXX
```

- **Token budget per increment**: ~80k tokens max
- **Max 25 tasks per increment** (soft limit) - consider splitting if >25
- **Max 1500 lines/file** (2000+ = crash risk)

### 2. Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work - IMMEDIATELY update both:
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

### 3. Status Workflow

**NEVER edit metadata.json to "completed" directly!**

Correct workflow:
1. All tasks completed → auto-transition to `ready_for_review`
2. `/sw:done <id>` → validates ACs + asks for user confirmation
3. Only then → status becomes `completed` with approvedAt timestamp

If implementing closure programmatically:
```typescript
MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);
// Only succeeds if current status is "ready_for_review"
```

### 4. Task-AC Auto-Sync (EDA)

When you mark a task complete in tasks.md, hooks auto-update:
1. All **Acceptance** checkboxes in that task: `- [ ]` → `- [x]`
2. Corresponding ACs in spec.md: `- [ ] **AC-US1-01**` → `- [x] **AC-US1-01**`
3. When ALL tasks complete → auto-transitions to `ready_for_review`

### 5. Per-US **Project**: Fields

Every User Story SHOULD have `**Project**:` field for proper sync:

```markdown
### US-001: Login Form
**Project**: my-project       # Use config.project.name or multiProject.projects key
**As a** user, I want...
```

**Each User Story = ONE Project** (and ONE Board for 2-level structures)

### 6. File Operations

**Use Write/Edit tools for file creation. NEVER use Bash heredoc/echo redirects.**

```
❌ FORBIDDEN: Bash("cat > file.md << 'EOF'...")
❌ FORBIDDEN: Bash("echo '...' > file.md")
✅ CORRECT:   Write({ file_path: "...", content: "..." })
```

### 7. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`

### 8. NEVER Spawn Parallel Agents for Multi-File Migrations

**Parallel agents reading large files = CRASH** (context shared, not isolated!)

```
❌ FORBIDDEN: "Let me use parallel agents" for 46-file migration
✅ CORRECT: Process files ONE BY ONE, use Edit tool directly
```

### 9. Increment Structure

**Increment root - ONLY**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`, `docs/`

**Increment IDs MUST be unique** across all directories (including _archive, _abandoned, _paused).
Use `IncrementNumberManager.generateIncrementId()` - it validates automatically.

### 10. Skills Must NOT Spawn Large Agents

Skills spawning content-generating agents = CRASH (context explosion)

### 11. Repository Locations (Multi-Repo)

**Clone to `/repositories`, NEVER project root.**

```
project-root/
├── repositories/           # All repos here
│   ├── frontend/
│   ├── backend/
│   └── shared/
├── .specweave/             # Config at umbrella level
└── CLAUDE.md
```

**Path refs in specs**: `repositories/backend/src/...`

---

## Proactive Agent Usage (USE THE EXPERTS!)

**SpecWeave has 40+ specialized agents. USE THEM instead of doing domain work directly!**

When the user's request involves specialized domains, **spawn the appropriate agent** via Task tool:

### Agent Quick Reference

| Domain | Agent (`subagent_type`) | Triggers |
|--------|-------------------------|----------|
| **Architecture** | `specweave:architect:architect` | system design, ADR, technical design, patterns |
| **Frontend** | `specweave-frontend:frontend-architect:frontend-architect` | React, Vue, Next.js, components, UI |
| **Backend** | `specweave-backend:database-optimizer:database-optimizer` | API, database, microservices, SQL |
| **Kubernetes** | `specweave-kubernetes:kubernetes-architect:kubernetes-architect` | K8s, EKS, AKS, GKE, pods, helm, GitOps |
| **Infrastructure** | `specweave-infrastructure:devops:devops` | Terraform, Docker, CI/CD, AWS, Azure, GCP |
| **Kafka** | `specweave-kafka:kafka-architect:kafka-architect` | Kafka, topics, event streaming, MSK |
| **Confluent** | `specweave-confluent:confluent-architect:confluent-architect` | Confluent Cloud, Schema Registry, ksqlDB |
| **Mobile** | `specweave-mobile:mobile-architect:mobile-architect` | React Native, iOS, Android |
| **ML/AI** | `specweave-ml:ml-engineer:ml-engineer` | ML, model, training, MLOps |
| **Data Science** | `specweave-ml:data-scientist:data-scientist` | data analysis, notebooks, pandas |
| **Testing/QA** | `specweave-testing:qa-engineer:qa-engineer` | E2E, Playwright, Vitest, Jest, QA |
| **Security** | `specweave:security:security` | security review, OWASP, auth, vulnerabilities |
| **Performance** | `specweave-infrastructure:performance-engineer:performance-engineer` | optimization, profiling, caching |
| **Observability** | `specweave-infrastructure:observability-engineer:observability-engineer` | monitoring, Prometheus, Grafana, SLOs |
| **SRE** | `specweave-infrastructure:sre:sre` | incidents, outages, production debugging |
| **Network** | `specweave-infrastructure:network-engineer:network-engineer` | networking, VPC, DNS, load balancing |
| **Diagrams** | `specweave-diagrams:diagrams-architect:diagrams-architect` | Mermaid, C4, architecture diagrams |
| **Payments** | `specweave-payments:payment-integration:payment-integration` | Stripe, PayPal, checkout, PCI |
| **Docs** | `specweave:docs-writer:docs-writer` | documentation, README, API docs |
| **Release** | `specweave-release:release-manager:release-manager` | release, version, changelog, npm publish |
| **GitHub** | `specweave-github:github-manager:github-manager` | GitHub issues, PRs, sync |
| **JIRA** | `specweave-jira:jira-manager:jira-manager` | JIRA, epics, stories, sync |
| **ADO** | `specweave-ado:ado-manager:ado-manager` | Azure DevOps, work items |

### Usage Pattern

```typescript
// ❌ WRONG: Doing K8s/infra/frontend work directly
"Let me write the Kubernetes manifests..."

// ✅ CORRECT: Spawn the expert agent
Task({
  subagent_type: "specweave-kubernetes:kubernetes-architect:kubernetes-architect",
  prompt: "Create K8s manifests for a 3-tier web app with Ingress",
  description: "K8s manifests design"
})
```

### When to Use Agents

- **ANY architecture decisions** → `specweave:architect:architect`
- **Infrastructure/DevOps code** → `specweave-infrastructure:devops:devops`
- **K8s manifests/GitOps** → `specweave-kubernetes:kubernetes-architect:kubernetes-architect`
- **Frontend components** → `specweave-frontend:frontend-architect:frontend-architect`
- **Test strategy/E2E** → `specweave-testing:qa-engineer:qa-engineer`
- **Security review** → `specweave:security:security`
- **Performance tuning** → `specweave-infrastructure:performance-engineer:performance-engineer`

**Rule**: If a plugin/agent exists for the domain, USE IT. Don't reinvent expertise.

**Reference**: See `plugins/PLUGINS-INDEX.md` for full plugin catalog with triggers.

---

## Secrets & Service Integration Check (MANDATORY)

**BEFORE using CLI tools that require authentication (gh, jira, az, etc.), ALWAYS check for existing configuration:**

1. **Check `.env` file** for tokens/credentials:
   ```bash
   # Look for relevant tokens before running CLI commands
   grep -E "(GITHUB_TOKEN|JIRA_|AZURE_|ADO_)" .env 2>/dev/null
   ```

2. **Check `.specweave/config.json`** for service configuration:
   ```bash
   # Check sync configuration
   cat .specweave/config.json | grep -A 10 '"sync"'
   ```

3. **Check project-specific config files**:
   - `.github/` for GitHub Actions secrets references
   - `package.json` for repository URLs
   - `.specweave/config.json` for external tool settings

**Common patterns**:
```bash
# GitHub - check if already authenticated
gh auth status

# JIRA - check configured domain
grep JIRA .env .specweave/config.json 2>/dev/null

# Azure DevOps - check org/project
grep -E "(ADO_|AZURE_DEVOPS)" .env .specweave/config.json 2>/dev/null
```

**Rule**: NEVER assume CLI tools are unconfigured. Check first, then use existing credentials.

---

## Coding Standards

- **Logger**: ALL `src/` code uses `logger`, NEVER `console.*`
- **Imports**: ALWAYS `.js` extensions
- **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
- **Filesystem**: Native `fs` only (NEVER `fs-extra`)
- **Config vs Secrets**: Config in `config.json`, secrets in `.env`

---

## Key Formats

### Task Format
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
```

### spec.md Format
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---
### US-001: Feature Name
**Project**: my-project
**As a** user, I want...
```

### GitHub Issue Format
**ONLY**: `[FS-XXX][US-YYY] User Story Title`

### ADR Naming
**Format**: `XXXX-decision-title.md` (4-digit, NO `adr-` prefix)
**Location**: `.specweave/docs/internal/architecture/adr/`

### External Increment E-Suffix
```
✅ 0111E-dora-metrics-fix (external GitHub issue)
❌ 0111-dora-metrics-fix  (missing E suffix for external)
```

---

## Commands

```bash
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:sync-progress          # Full sync
/sw:validate 0001          # Validate increment
```

---

## Build & Test

```bash
npm run rebuild     # Clean + build
npm test            # Smoke tests
npm run test:all    # All tests
```

---

## Emergency

### Session Stuck ("Marinating...")
```bash
# 1. Force quit Claude Code
# 2. Kill zombies:
pkill -f "cat.*EOF"
pkill -9 -f "bash.*specweave"
# 3. Clean locks:
rm -f .specweave/state/*.lock
rm -rf .specweave/state/.dedup-cache/*.lock
# 4. Restart
```

### Disable Hooks
```bash
export SPECWEAVE_DISABLE_HOOKS=1
# Or bypass specific validations:
export SPECWEAVE_FORCE_PROJECT=1
export SPECWEAVE_FORCE_METADATA=1
```

### Crash Loop / Prompt Duplication
```bash
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache
npm run rebuild
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| File ops | Write/Edit/Read tools ONLY |
| Source of truth | tasks.md + spec.md |
| Completion | NEVER edit metadata.json directly |
| Increment root | ONLY spec.md, plan.md, tasks.md, metadata.json |
| Stuck session | Kill + pkill zombies + clean locks |

---

## References

- **Internal Docs**: `.specweave/docs/internal/`
- **ADRs**: `.specweave/docs/internal/architecture/adr/`
- **Emergency**: `.specweave/docs/internal/emergency-procedures/`
