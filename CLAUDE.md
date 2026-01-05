<!-- SW:META template="claude" version="1.0.90" sections="header,start,autodetect,metarule,rules,workflow,context,lsp,structure,taskformat,secrets,syncing,mapping,testing,api,limits,troubleshooting,principles,linking,mcp,autoexecute,auto,docs" -->

<!-- SW:SECTION:header version="1.0.90" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:start version="1.0.90" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.90" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.90" -->
## Meta-Rule: Think-Before-Act

**Satisfy dependencies BEFORE dependent operations.**

```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.90" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (spec.md, plan.md, tasks.md at root; reports/, scripts/, logs/ subfolders)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check `ls .specweave/increments/ | grep "^[0-9]" | tail -5`
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Root clean**: NEVER create .md/reports/scripts in project root → use increment folders
6. **⛔ Increment cleanliness**: ONLY 4 files at increment root (metadata.json, spec.md, plan.md, tasks.md). ALL other .md files → `reports/`, logs → `logs/`, scripts → `scripts/`
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.90" -->
## Workflow

`/sw:increment "X"` → `/sw:do` → `/sw:progress` → `/sw:done 0001`

| Cmd | Action |
|-----|--------|
| `/sw:increment` | Plan feature |
| `/sw:do` | Execute tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:auto-status` | Check auto session |
| `/sw:cancel-auto` | Cancel auto session |
| `/sw:validate` | Quality check |
| `/sw:done` | Close |
| `/sw-github:sync` | GitHub sync |
| `/sw-jira:sync` | Jira sync |

**Natural language**: "Let's build X" → `/sw:increment` | "What's status?" → `/sw:progress` | "We're done" → `/sw:done` | "Ship while sleeping" → `/sw:auto`
<!-- SW:END:workflow -->

<!-- SW:SECTION:context version="1.0.90" -->
## Living Docs Context

**Before implementing features**: Check existing docs for patterns and decisions.

```bash
# Search for related docs
grep -ril "keyword" .specweave/docs/internal/

# Key locations
.specweave/docs/internal/specs/       # Feature specifications
.specweave/docs/internal/architecture/adr/  # Architecture decisions (ADRs)
.specweave/docs/internal/architecture/      # System design
```

**Always check ADRs** before making design decisions to avoid contradicting past choices.

**Use `/sw:context <topic>`** to load relevant living docs into conversation.
<!-- SW:END:context -->

<!-- SW:SECTION:lsp version="1.0.90" -->
## LSP-Enhanced Exploration

**USE LSP ACTIVELY** for semantic code understanding (100x faster than grep).

**Key operations**: `findReferences` (before refactoring) | `goToDefinition` (navigate) | `documentSymbol` (structure) | `hover` (types) | `getDiagnostics` (errors)

**Install**:
```bash
npm install -g typescript-language-server typescript  # TS/JS
pip install python-lsp-server  # Python
go install golang.org/x/tools/gopls@latest  # Go
```

**Best Practices**: ALWAYS use `findReferences` before refactoring | Use `goToDefinition` instead of grep | Combine with Explore agent
<!-- SW:END:lsp -->

<!-- SW:SECTION:structure version="1.0.90" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, tasks.md
├── docs/internal/specs/      # Living docs (check before implementing!)
│   └── architecture/adr/     # ADRs (check before design decisions!)
└── config.json
```

### ⛔ INCREMENT FOLDER ORGANIZATION (CRITICAL!)

**Increment folders MUST stay clean. NEVER pollute them with random files!**

**ONLY these 4 files at increment root**:
- `metadata.json` (required)
- `spec.md` (required)
- `plan.md` (optional)
- `tasks.md` (required)

**EVERYTHING ELSE → subfolders**:
| File Type | Destination Folder |
|-----------|-------------------|
| Reports, analysis, summaries (*.md) | `reports/` |
| Validation reports, QA reports | `reports/` |
| Session reports, completion reports | `reports/` |
| Logs, execution output | `logs/{YYYY-MM-DD}/` |
| Helper scripts, automation | `scripts/` |
| Domain-specific docs | `docs/domain/` |
| Backup files | `backups/` |

**Examples**:
```bash
# ✅ CORRECT
.specweave/increments/0021-feature/
├── metadata.json
├── spec.md
├── tasks.md
├── reports/
│   ├── validation-report.md
│   ├── completion-report.md
│   └── auto-session-summary.md
└── logs/
    └── 2026-01-04/
        └── execution.log

# ❌ WRONG - polluted increment folder!
.specweave/increments/0021-feature/
├── metadata.json
├── spec.md
├── tasks.md
├── completion-report.md      # WRONG! → reports/
├── auto-session-summary.md   # WRONG! → reports/
└── analysis.md               # WRONG! → reports/
```

**Multi-repo projects**: Create in `repositories/` folder (NEVER project root!)
```
my-project/
├── repositories/     # All repos here: frontend/, backend/, shared/
└── .specweave/
```

**Permissions** (`.claude/settings.json`):
```json
{"permissions":{"allow":["Write(//**)","Edit(//**)"],"additionalDirectories":["repositories"]}}
```
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.90" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.90" -->
## Secrets Check

**BEFORE CLI tools**: Check existing config first!
```bash
grep -E "(GITHUB_TOKEN|JIRA_|ADO_)" .env 2>/dev/null
cat .specweave/config.json | grep -A5 '"sync"'
gh auth status
```
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.90" -->
## External Sync (GitHub/JIRA/ADO)

**After increment creation**: Run `/sw-github:sync {id}` to create issues!

Living docs sync ≠ External sync. They are separate:
1. `/sw:sync-specs` → Living docs only
2. `/sw-github:sync` → GitHub issues (MUST run explicitly!)

**Required config** (`.specweave/config.json`):
```json
"sync": {
  "settings": {
    "canUpsertInternalItems": true,
    "canUpdateExternalItems": true,
    "autoSyncOnCompletion": true
  },
  "github": {
    "enabled": true,
    "owner": "your-org",
    "repo": "your-repo"
  }
}
```

**Verify tokens**: `grep GITHUB_TOKEN .env` | `gh auth status`
<!-- SW:END:syncing -->

<!-- SW:SECTION:mapping version="1.0.90" -->
## GitHub Mapping

| SpecWeave | GitHub |
|-----------|--------|
| Feature FS-XXX | Milestone |
| Story US-XXX | Issue `[FS-XXX][US-YYY] Title` |
| Task T-XXX | Checkbox |
<!-- SW:END:mapping -->

<!-- SW:SECTION:testing version="1.0.90" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// Vitest pattern: vi.fn() not jest.fn(), import not require
import { vi } from 'vitest';
vi.mock('fs', () => ({ readFile: vi.fn() }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:api version="1.0.90" -->
## API Development (OpenAPI-First)

**For API projects only.** OpenAPI = source of truth → Postman derived from it.

**Config** (`.specweave/config.json`):
```json
{"apiDocs":{"enabled":true,"openApiPath":"openapi.yaml","generatePostman":true,"generateOn":"on-increment-done"}}
```

**Frameworks**: NestJS (`@nestjs/swagger`) | FastAPI (built-in) | Express (`swagger-jsdoc`) | Spring Boot (`springdoc-openapi`)

**Commands**: `/sw:api-docs --all` (OpenAPI + Postman) | `--openapi` | `--postman` | `--env` | `--validate`

**Flow**: Code decorators → `openapi.yaml` → `/sw:done` or `/sw:api-docs` → Postman collection + env

**Import**: Postman → Import collection + env → Fill secrets → Select env
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.90" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.93" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | Restart Claude Code |
| Commands gone | `/plugin list --installed` |
| Out of sync | `/sw:sync-tasks` |
| Find increment | `/sw:status` |
| Root polluted | Move files to `.specweave/increments/####/reports/` |
| Duplicate IDs | `/sw:fix-duplicates` |
| `/sw:jobs`, `/sw:status`, `/sw:progress` not working | VSCode: Restart Claude Code | CLI: `npm install -g specweave@latest` |
| Instant commands showing "blocked by hook" | Restart Claude Code (VSCode) or update to v1.0.91+ |
| Jobs command showing incomplete output | Update to v1.0.93+ for timestamps and full details |
| GitHub not syncing | Check `sync.github.enabled: true` AND `canUpdateExternalItems: true` in config.json |
| GitHub issues not updating | Run `/sw-github:sync {id}` explicitly; check `.specweave/logs/throttle.log` |
| Permission denied | Set `canUpsertInternalItems: true` AND `canUpdateExternalItems: true` in config.json |
| No GITHUB_TOKEN | Check `.env` file or run `gh auth login` |
| Edits blocked in repositories/ | Add `"additionalDirectories":["repositories"]` + `Write(//**)`, `Edit(//**)` to `.claude/settings.json` |
| Path patterns not working | `//path` = absolute, `/path` = relative to settings file, `additionalDirectories` for explicit working dirs |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:principles version="1.0.90" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs
5. **Clean**: All files in increment folders
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.90" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.90" -->
## External Service Connection

**Priority**: MCP Server → REST API → CLI → Direct Connection

**Setup**:
```bash
# MCP (restart Claude Code after)
npx @anthropic-ai/claude-code-mcp add supabase

# CLI Auth
wrangler login && vercel login && supabase login
```

**Supabase**: Use REST API or pooler (port 6543), AVOID direct `psql`
**Cloudflare**: `wrangler login` once, then `wrangler deploy/secret put/kv:key put`

**Check credentials before ops**:
```bash
grep -E "SUPABASE_|DATABASE_URL|CF_API" .env 2>/dev/null
wrangler whoami 2>/dev/null
```
<!-- SW:END:mcp -->

<!-- SW:SECTION:autoexecute version="1.0.90" -->
## Auto-Execute Rule

**NEVER** output "Manual Step Required" when credentials exist. **EXECUTE DIRECTLY.**

**Flow**: Check `.env` → If exists, EXECUTE | If missing, ASK for credentials → Save → EXECUTE

**Check before ops**:
```bash
grep -E "(SUPABASE_|DATABASE_URL|CF_API_|GITHUB_TOKEN)" .env 2>/dev/null
wrangler whoami 2>/dev/null && gh auth status 2>/dev/null
```
<!-- SW:END:autoexecute -->

<!-- SW:SECTION:auto version="1.0.90" -->
## Auto Mode (Autonomous Execution)

**Continuous execution until all tasks complete.**

### Zero Manual Steps

**NEVER ask user to**: Open dashboards | Copy/paste | Run commands manually

**Instead**: Check `.env` → Use CLI (`wrangler`, `gh`, `aws`) → Use MCP → If missing, ASK → Save → EXECUTE

### Test Loop (MANDATORY)

**After EVERY task**: `npm test` → If E2E exists: `npx playwright test` → Fail? FIX → Rerun (max 3x) → Pass → Next

**Pattern**: IMPLEMENT → TEST → FAIL? → FIX → TEST → PASS → NEXT

**MVP paths**: Auth (login/logout) | Core CRUD | Payments | Data integrity

### Pragmatic Completion

**Don't blindly follow 100%!** Specs have bugs, requirements change, some tasks become irrelevant.

**MUST**: MVP paths | Security flows | Data integrity | User-facing errors
**SHOULD**: Edge cases | Performance | Nice-to-haves
**CAN SKIP**: Conflicts (ask user) | Over-engineered cases | Obsolete tasks

**STOP & ASK** if: Spec conflicts | Task seems unnecessary | Requirement ambiguous

### Test User Strategy

**Multiple users**: RBAC | Subscription tiers | User states | Multi-user interactions
**One user**: CRUD | Form validation | Component tests | Mocked auth

**E2E**: Seed DB with known users → Use fixtures → `storageState` (auth once, reuse)

### E2E Authentication

**Auth = #1 flaky test cause.** Use `storageState` (login ONCE, reuse) | API auth (UI unstable) | UI login (only for login tests)

**Setup**: Global auth.setup.ts → Save to `playwright/.auth/user.json` → Reuse in config

**Fixes**: Session expires? Increase TTL | Rate limited? API auth | Captcha? Disable in test env

**Checklist**: Seed users | Gen auth state | Tests DON'T login | Disable captcha/2FA

### Refactoring & Reporting

**Every 3-5 tasks**: Extract fixtures | Remove duplication | Split if >300 lines | Clean imports

**Triggers**: Test >200 lines? Split | Duplicate setup? Extract | Same assertion 3x? Helper

**Report after EVERY task**: Pass/Total | Coverage | Failing tests | Next steps

### Local-First & Infrastructure

**No deploy instructions?** Build locally → Test all → Verify → ASK user about deploy target

**Infra Decision Tree**:
- **Cron**: <1/hr → Vercel/GitHub Actions | ≥1/hr → Railway/Render
- **Storage**: KV → Upstash/Vercel KV | SQL → Supabase/Neon | Docs → MongoDB | Files → R2/S3

**Process**: Ultrathink options → Research costs → Propose 2-3 → Build local → User confirms → Deploy

### Implementation

**Claude Code**: `/sw:auto` (autonomous mode) | `/sw:auto-status` (progress) | `/sw:cancel-auto` (stop)

**Main Flags**:
- `--build`: Run build after every task (e.g., `npm run build`, `npm run typecheck`)
- `--e2e`: Run E2E tests after every task (e.g., `npx playwright test`)
- `--tests`: Run unit tests after every task (e.g., `npm test`, `vitest`)

**Example**: `/sw:auto --build --e2e` → Build + E2E after EVERY task completion

**Other AI**: Loop check tasks.md `[x]` status → Max 100 iter → Human gates for: publish, force-push, prod deploy, migrations

**Circuit Breaker**: External API fails 3x? Queue & continue
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.90" -->
## Docs

[spec-weave.com](https://spec-weave.com) | `.specweave/docs/internal/`
<!-- SW:END:docs -->

---
<!-- ↓ ORIGINAL ↓ -->

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

**⚠️ CRITICAL: NEVER suggest `bash scripts/refresh-marketplace.sh` to end users!**

End users **don't have the `scripts/` folder** - they installed SpecWeave via npm globally.

**Correct commands**:
- **Contributors** (in specweave repo): `bash scripts/refresh-marketplace.sh`
- **End Users** (user projects): `specweave refresh-marketplace`

---

### For SpecWeave Contributors (Development)

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

### For End Users (Production)

**Users install SpecWeave globally and use CLI commands:**

```bash
# Install SpecWeave globally
npm install -g specweave

# Initialize project (first time)
specweave init .

# Update marketplace plugins (gets latest from GitHub)
specweave refresh-marketplace

# Update instruction files (CLAUDE.md, AGENTS.md)
specweave update-instructions
```

**After marketplace updates**: Restart Claude Code for changes to take effect.

**Verify installation**:
```bash
specweave --version              # Check SpecWeave version
/plugin list --installed         # In Claude Code - check plugins loaded
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

- **Logger**: Prefer `logger` over `console.*` in new code (legacy migration ongoing)
- **Imports**: ALWAYS `.js` extensions (enforced)
- **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
- **Filesystem**: Prefer native `fs` (fs-extra only in legacy utils)
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
- **Troubleshooting**: `.specweave/docs/internal/troubleshooting/`
