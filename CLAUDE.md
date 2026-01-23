<!-- SW:META template="claude" version="1.0.141" sections="header,start,autodetect,metarule,rules,workflow,reflect,skillmemories,context,lsp,structure,taskformat,secrets,syncing,mapping,testing,api,limits,troubleshooting,lazyloading,principles,linking,mcp,autoexecute,auto,docs" -->

<!-- SW:SECTION:header version="1.0.141" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:start version="1.0.141" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.141" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.141" -->
## Meta-Rule: Think-Before-Act

**Satisfy dependencies BEFORE dependent operations.**

```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.141" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (spec.md, plan.md, tasks.md at root; reports/, scripts/, logs/ subfolders)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check `ls .specweave/increments/ | grep "^[0-9]" | tail -5`
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Root clean**: NEVER create .md/reports/scripts in project root → use increment folders
6. **⛔ Increment cleanliness**: ONLY 4 files at increment root (metadata.json, spec.md, plan.md, tasks.md). ALL other .md files → `reports/`, logs → `logs/`, scripts → `scripts/`
7. **⛔ Initialization guard**: `.specweave/` folders MUST ONLY exist where `specweave init` was run. NEVER create `.specweave/` in parent, nested, or unrelated directories. Check `config.json` exists before creating ANY `.specweave/` subfolders.
8. **⛔ Marketplace refresh**: ALWAYS use `specweave refresh-marketplace` CLI command. NEVER suggest `scripts/refresh-marketplace.sh` - end users don't have the scripts folder (npm global install).
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.141" -->
## Workflow

`/sw:increment "X"` → `/sw:do` → `/sw:progress` → `/sw:done 0001`

| Cmd | Action |
|-----|--------|
| `/sw:increment` | Plan feature |
| `/sw:do` | Execute tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:auto-status` | Check auto session |
| `/sw:cancel-auto` | ⚠️ EMERGENCY ONLY manual cancel |
| `/sw:validate` | Quality check |
| `/sw:done` | Close |
| `/sw-github:sync` | GitHub sync |
| `/sw-jira:sync` | Jira sync |

**Natural language**: "Let's build X" → `/sw:increment` | "What's status?" → `/sw:progress` | "We're done" → `/sw:done` | "Ship while sleeping" → `/sw:auto`
<!-- SW:END:workflow -->

<!-- SW:SECTION:reflect version="1.0.141" -->
## Self-Improving Skills (Reflect)

**Learn once, never repeat.** Claude learns from corrections and patterns across sessions.

**How it works**:
1. Session ends → Stop hook runs LLM extraction
2. Learnings saved to **Skill Memories** section below (organized by skill)
3. Future sessions see learnings immediately (they're in this file!)

**What gets captured** (SpecWeave-specific only):
- Skill behavior preferences: "mobile: Run expo tests on localhost:8081"
- Workflow preferences: "general: User prefers small increments (max 5 tasks)"
- Tech stack choices: "frontend: Prefer Vercel over Cloudflare for this project"

**What does NOT get captured**:
- Generic coding patterns (not SpecWeave's job)
- One-time fixes that won't recur

**Config** (`.specweave/config.json`):
```json
{ "reflect": { "enabled": true, "model": "haiku", "maxLearningsPerSession": 3 } }
```

**Disable**: Set `"reflect": { "enabled": false }` in config
<!-- SW:END:reflect -->

## Skill Memories

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->
<!-- Learnings are organized by skill name. User edits override SpecWeave defaults. -->

<!-- SW:SECTION:skillmemories version="1.0.141" -->
## Skill Memories

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->
<!-- Learnings are organized by skill name. User edits override SpecWeave defaults. -->
<!-- SW:END:skillmemories -->

<!-- SW:SECTION:context version="1.0.141" -->
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

<!-- SW:SECTION:lsp version="1.0.141" -->
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

<!-- SW:SECTION:structure version="1.0.141" -->
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

<!-- SW:SECTION:taskformat version="1.0.141" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.141" -->
## Secrets Check

**BEFORE CLI tools**: Check existing config first!
```bash
# Check if credentials EXIST (never display values!)
grep -qE "(GITHUB_TOKEN|GH_TOKEN|JIRA_|AZURE_DEVOPS_|ADO_)" .env 2>/dev/null && echo "Credentials found in .env"
cat .specweave/config.json | grep -A5 '"sync"'
gh auth status
```

**SECURITY**: NEVER use `grep TOKEN .env` without `-q` flag - it exposes credentials in terminal!
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.141" -->
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

**Verify tokens**: `grep -q GITHUB_TOKEN .env && echo "Token configured"` | `gh auth status`
<!-- SW:END:syncing -->

<!-- SW:SECTION:mapping version="1.0.141" -->
## GitHub Mapping

| SpecWeave | GitHub |
|-----------|--------|
| Feature FS-XXX | Milestone |
| Story US-XXX | Issue `[FS-XXX][US-YYY] Title` |
| Task T-XXX | Checkbox |
<!-- SW:END:mapping -->

<!-- SW:SECTION:testing version="1.0.141" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// ESM mocking: vi.hoisted() + vi.mock() (Vitest 4.x+)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module', () => ({ func: mockFn }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:api version="1.0.141" -->
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

<!-- SW:SECTION:limits version="1.0.141" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.141" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | Restart Claude Code |
| Plugins outdated | `specweave refresh-marketplace` (NEVER use `scripts/refresh-marketplace.sh` - that's for contributors only!) |
| Commands gone | `/plugin list --installed` |
| Out of sync | `/sw:sync-tasks` |
| Find increment | `/sw:status` |
| Root polluted | Move files to `.specweave/increments/####/reports/` |
| Duplicate IDs | `/sw:fix-duplicates` |
| GitHub not syncing | Check `sync.github.enabled: true` AND `canUpdateExternalItems: true` in config.json |
| GitHub issues not updating | Run `/sw-github:sync {id}` explicitly; check `.specweave/logs/throttle.log` |
| Permission denied | Set `canUpsertInternalItems: true` AND `canUpdateExternalItems: true` in config.json |
| No GITHUB_TOKEN | Check `.env` file or run `gh auth login` |
| Edits blocked in repositories/ | Add `"additionalDirectories":["repositories"]` + `Write(//**)`, `Edit(//**)` to `.claude/settings.json` |
| Path patterns not working | `//path` = absolute, `/path` = relative to settings file, `additionalDirectories` for explicit working dirs |
| Router not spawning agents | Restart Claude Code; check `/plugin` shows `sw-router` |
| Need all plugins loaded | Install via `/plugin` UI or `claude plugin install sw-*@specweave` |
| Plugin install fails "Source path does not exist" | Run: `cd ~/.claude/plugins/marketplaces/specweave && git checkout HEAD -- plugins` |
| Marketplace shows 0 installed | Normal if using auto-load; check `/plugin list` for actual status |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:lazyloading version="1.0.141" -->
## Lazy Plugin Loading (Auto-Loading)

**SpecWeave automatically loads plugins** when you need them - no manual action required.

### Three-Layer Auto-Loading

| Layer | When | What Happens |
|-------|------|--------------|
| **Session Start** | Claude starts | Detects project type (React, K8s, etc.) → installs matching plugins |
| **Prompt Detection** | You type | Detects keywords (stripe, terraform, etc.) → installs matching plugins |
| **Router Spawn** | Implementation | Router spawns specialized agents via Task tool (isolated context) |

**Example flow**:
1. You open a React project → `sw-frontend` auto-installed
2. You type "add stripe checkout" → `sw-payments` auto-installed
3. You run `/sw:do` → Router spawns `frontend-architect` agent

### Keyword → Plugin Mapping

| Keywords | Plugin Installed |
|----------|------------------|
| react, vue, angular, nextjs, UI, component | `sw-frontend` |
| stripe, payment, checkout, billing | `sw-payments` |
| k8s, kubernetes, docker, terraform | `sw-k8s`, `sw-infrastructure` |
| github, PR, issue, actions | `sw-github` |
| jira, epic, story | `sw-jira` |
| release, changelog, npm publish | `sw-release` |
| test, tdd, playwright, vitest | `sw-testing` |
| ml, pytorch, tensorflow, training | `sw-ml` |

### Manual Plugin Installation

If auto-loading misses something, use Claude's native plugin commands:
```bash
# Install plugins (uses short names from marketplace.json)
claude plugin install sw@specweave           # Core framework
claude plugin install sw-frontend@specweave  # Frontend development
claude plugin install sw-github@specweave    # GitHub integration

# Enable/disable installed plugins
claude plugin enable sw-frontend@specweave
claude plugin disable sw-frontend@specweave

# List installed plugins
claude plugin list

# Update marketplace cache (if plugins folder missing)
claude plugin marketplace update specweave
```

**Plugin names** use SHORT format: `sw`, `sw-frontend`, `sw-github` (NOT `specweave-frontend`)

### Disable Auto-Loading

```bash
export SPECWEAVE_DISABLE_AUTO_LOAD=1  # Disable auto-loading
```

### Token Savings

| Mode | Context Usage |
|------|---------------|
| Default (core + auto-load) | ~3-5K tokens |
| All plugins loaded | ~60K+ tokens |
| Agent spawn (forked) | 0 tokens in main context |
<!-- SW:END:lazyloading -->

<!-- SW:SECTION:principles version="1.0.141" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs
5. **Clean**: All files in increment folders
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.141" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.142" -->
## External Services

**Priority**: CLI tools first (simpler) → MCP for complex integrations

**CLI tools** (check auth first):
```bash
gh auth status          # GitHub
wrangler whoami         # Cloudflare
supabase status         # Supabase
```

**MCP servers** (for richer integrations):
```bash
claude mcp add --transport http github https://api.github.com/mcp
claude mcp add --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres
/mcp                    # Check status in Claude Code
```

MCP supports lazy-loading (auto mode) - tools load on-demand when >10% context.
<!-- SW:END:mcp -->

<!-- SW:SECTION:auto version="1.0.142" -->
## Auto Mode

**Commands**: `/sw:auto` (start) | `/sw:auto-status` (check) | `/sw:cancel-auto` (emergency only)

**Pattern**: IMPLEMENT → TEST → FAIL? → FIX → PASS → NEXT

**Pragmatic completion**: MUST (MVP, security, data integrity) | SHOULD (edge cases) | CAN SKIP (conflicts - ask user)

**STOP & ASK** if: Spec conflicts | Task unnecessary | Requirement ambiguous
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.141" -->
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

## Marketplace Commands

| Who | Command |
|-----|---------|
| **Contributors** | `bash scripts/refresh-marketplace.sh` (defaults to --github) |
| **End Users** | `specweave refresh-marketplace` |

⚠️ NEVER suggest `scripts/` to end users - they don't have it (npm global install).

---

## Critical Safety Rules (Contributors)

### 1. Context Management (CRASH PREVENTION)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
/sw:pause XXXX → edit large file → /sw:resume XXXX
```

- **Token budget**: ~80k/increment | **Max tasks**: 25 | **Max lines/file**: 1500

### 2. Status Workflow

**NEVER edit metadata.json to "completed" directly!** Use `/sw:done <id>` which validates ACs.

Programmatic closure: `MetadataManager.updateStatus(id, IncrementStatus.COMPLETED)` - only succeeds from `ready_for_review`.

### 3. Task-AC Auto-Sync

Hooks auto-update when task marked complete: task checkboxes → spec.md ACs → `ready_for_review` status.

### 4. Per-US Project Fields

User Stories need `**Project**: my-project` field for external sync. Each US = ONE Project.

### 5. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`

### 6. Parallel Agents

**Parallel agents + large files = CRASH** (context shared). Process files ONE BY ONE.

### 7. Skills Agents

Skills spawning content-generating agents = CRASH (context explosion).

### 8. NODE_OPTIONS and VSCode Debug Mode

**⚠️ When spawning child processes (like `claude CLI`), they fail in VSCode Debug mode!**

**Root Cause**: VSCode debugger sets `NODE_OPTIONS` with inspector flags (`--inspect-brk`). These get inherited by child processes, causing them to try to attach to the debugger and fail with exit code 1.

**Symptoms:**
- Tests pass with "Run Test" but fail with "Debug Test"
- Spawned processes exit with code 1 and empty stdout/stderr
- `spawnSync` or `execFileSync` calls fail silently

**Solution - Strip debugger env vars before spawning (works on ALL platforms + CI/CD):**
```typescript
function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };
  // Debugger flags (VSCode, WebStorm, IntelliJ)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;
  // Coverage/instrumentation (CI/CD pipelines)
  delete cleanEnv.NODE_V8_COVERAGE;
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;
  return cleanEnv;
}

// Use in spawn calls:
const result = spawnSync('claude', ['--version'], {
  encoding: 'utf8',
  env: getCleanEnv(),  // ← CRITICAL for debug mode + CI/CD
});
```

**Files using this pattern:**
- `src/utils/claude-cli-detector.ts` - All child process spawning
- `tests/integration/lazy-loading/claude-cli-detection.test.ts` - Test utilities

**See:** `.specweave/docs/public/troubleshooting/vscode-debug-child-processes.md`

---

## Skills vs Agents (Automatic vs Explicit)

**SpecWeave provides expertise through Skills (auto-activate) and Agents (explicit spawn).**

### Skills (Auto-Activate) - YOU DON'T CALL THESE

Skills activate **automatically** when Claude detects keywords in your prompt. **You never invoke skills directly** - they're loaded transparently when relevant.

**How it works:**
```
You: "Design the authentication system architecture"
      ↓
Claude detects: "architecture" keyword
      ↓
Loads: plugins/specweave/skills/architect/SKILL.md
      ↓
Response includes architecture expertise automatically
```

**Activation rate**: ~20-50% with basic descriptions. Use specific keywords for better activation.

| Domain | Keywords That Activate | Example Prompts |
|--------|----------------------|-----------------|
| **Architecture** | architecture, system design, ADR, microservices, API design | "Design the auth system architecture" |
| **Tech Lead** | code review, best practices, refactoring, clean code | "Review my code for best practices" |
| **QA Lead** | test strategy, QA, quality gates, E2E testing | "Create a test strategy for this feature" |
| **Security** | security, OWASP, vulnerabilities, auth security | "Review security of this implementation" |
| **Docs** | documentation, README, API docs, technical writing | "Write documentation for this API" |
| **Infrastructure** | Terraform, serverless, Lambda, cloud setup, IaC | "Generate Terraform for this deployment" |
| **Performance** | optimization, profiling, caching, performance | "Optimize this database query" |
| **TDD** | TDD, test-driven, red-green-refactor, test-first | "Let's use TDD for this feature" |
| **PM** | product, requirements, user story, MVP, roadmap | "Help me plan this product feature" |

**Pro tip**: If skills aren't activating, add explicit keywords: "Help me **design the architecture** for..." instead of just "Help me with the backend".

### Agents (Task Tool Spawn)

For complex, isolated tasks requiring specialized plugins, spawn via Task tool:

| Domain | Agent (`subagent_type`) | Triggers |
|--------|-------------------------|----------|
| **Frontend** | `sw-frontend:frontend-architect` | React, Vue, Next.js, components, UI |
| **Backend** | `sw-backend:database-optimizer` | API, database, microservices, SQL |
| **Kubernetes** | `sw-k8s:kubernetes-architect` | K8s, EKS, AKS, GKE, pods, helm, GitOps |
| **DevOps** | `sw-infra:devops` | Terraform, Docker, CI/CD, AWS, Azure, GCP |
| **Kafka** | `sw-kafka:kafka-architect` | Kafka, topics, event streaming, MSK |
| **Confluent** | `sw-confluent:confluent-architect` | Confluent Cloud, Schema Registry, ksqlDB |
| **Mobile** | `sw-mobile:mobile-architect` | React Native, iOS, Android |
| **ML/AI** | `sw-ml:ml-engineer` | ML, model, training, MLOps |
| **Data Science** | `sw-ml:data-scientist` | data analysis, notebooks, pandas |
| **Testing/QA** | `sw-testing:qa-engineer` | E2E, Playwright, Vitest, Jest, QA |
| **Observability** | `sw-infra:observability-engineer` | monitoring, Prometheus, Grafana, SLOs |
| **SRE** | `sw-infra:sre` | incidents, outages, production debugging |
| **Network** | `sw-infra:network-engineer` | networking, VPC, DNS, load balancing |
| **Diagrams** | `sw-diagrams:diagrams-architect` | Mermaid, C4, architecture diagrams |
| **Payments** | `sw-payments:payment-integration` | Stripe, PayPal, checkout, PCI |
| **Release** | `sw-release:release-manager` | release, version, changelog, npm publish |
| **GitHub** | `sw-github:github-manager` | GitHub issues, PRs, sync |
| **JIRA** | `sw-jira:jira-manager` | JIRA, epics, stories, sync |
| **ADO** | `sw-ado:ado-manager` | Azure DevOps, work items |

### Usage Pattern

```typescript
// Skills auto-activate - just describe what you need (NO explicit call):
"Design the authentication system architecture"  // → architect skill loads automatically
"Review my code for security issues"             // → security skill loads automatically
"Let's use TDD for this feature"                 // → tdd-orchestrator skill loads automatically

// Agents spawn for isolated complex tasks (explicit Task call):
Task({
  subagent_type: "sw-k8s:kubernetes-architect:kubernetes-architect",
  prompt: "Create K8s manifests for a 3-tier web app with Ingress",
  description: "K8s manifests design"
})
```

### When to Use What

| Scenario | Use | Why |
|----------|-----|-----|
| Architecture decisions | Skills (auto) | Keywords trigger automatically |
| Code review, security | Skills (auto) | Keywords trigger automatically |
| Complex K8s/infra | Agents (Task) | Needs isolated context |
| Frontend architecture | Agents (Task) | Specialized plugin |
| ML pipelines | Agents (Task) | Specialized plugin |
| External syncs | Commands | Use `/sw-github:sync` etc. |

**Reference**: See `plugins/PLUGINS-INDEX.md` for full plugin catalog with triggers.

---

## Secrets & Service Integration Check (MANDATORY)

**BEFORE using CLI tools that require authentication (gh, jira, az, etc.), ALWAYS check for existing configuration:**

1. **Check `.env` file** for tokens/credentials:
   ```bash
   # Look for relevant tokens before running CLI commands (presence only!)
   grep -qE "(GITHUB_TOKEN|GH_TOKEN|JIRA_|AZURE_DEVOPS_|ADO_)" .env 2>/dev/null && echo "Credentials found"
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

# JIRA - check configured domain (presence only - never display values!)
grep -q JIRA .env && echo "JIRA config in .env"
cat .specweave/config.json | grep -A5 '"jira"'

# Azure DevOps - check org/project (presence only!)
grep -qE "(ADO_|AZURE_DEVOPS)" .env && echo "ADO config in .env"
cat .specweave/config.json | grep -A5 '"ado"'
```

**Rule**: NEVER assume CLI tools are unconfigured. Check first, then use existing credentials.

---

## Coding Standards

- **Logger**: Prefer `logger` over `console.*` in new code (legacy migration ongoing)
- **Imports**: ALWAYS `.js` extensions (enforced)
- **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
- **Filesystem**: Prefer native `fs` (fs-extra only in legacy utils)
- **Config vs Secrets**: Config in `config.json`, secrets in `.env`

### Plugin Naming Convention (`sw-*` vs `specweave-*`)

**Two naming systems exist for plugins:**

| System | Format | Example |
|--------|--------|---------|
| **Marketplace names** | `sw`, `sw-*` | `sw`, `sw-frontend`, `sw-github` |
| **Directory names** | `specweave`, `specweave-*` | `specweave`, `specweave-frontend`, `specweave-github` |

**Use MARKETPLACE names (`sw-*`) for:**
- Claude CLI: `claude plugin install sw@specweave`
- API inputs: `installPlugins(['sw', 'sw-github'])`
- LLM responses: `detectPluginsViaLLM()` returns `['sw-frontend']`
- `keyword-detector.ts` constants (PLUGIN_GROUPS, KEYWORD_PLUGIN_MAP)

**Use DIRECTORY names (`specweave-*`) for:**
- Filesystem paths: `~/.claude/plugins/marketplaces/specweave/plugins/specweave-frontend/`
- Registry keys: `specweave-router@specweave` in `installed_plugins.json`
- State file: `loadedPlugins: ['specweave', 'specweave-github']`
- Test mocks: `createMockPlugin(path, 'specweave')`

**Conversion functions** (in `cache-manager.ts`):
```typescript
marketplaceNameToDirectory('sw')          // → 'specweave'
marketplaceNameToDirectory('sw-frontend') // → 'specweave-frontend'
directoryToMarketplaceName('specweave')   // → 'sw'
```

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
# Core workflow
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:auto                   # Autonomous execution
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:next                   # Smart transition (auto-close + suggest)

# Quality & validation
/sw:validate 0001          # Validate increment
/sw:qa 0001                # Quality assessment
/sw:judge-llm 0001         # LLM-as-Judge validation

# Status & sync
/sw:status                 # All increments overview
/sw:sync-progress          # Full sync
/sw:context "auth"         # Load living docs context
/sw:save                   # Smart git commit & push
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
# 4. Restart
```

### Disable Hooks
```bash
export SPECWEAVE_DISABLE_HOOKS=1
```

### Crash Loop
```bash
rm -f .specweave/state/*.lock
npm run rebuild
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| File ops | Write/Edit/Read tools ONLY (never Bash heredoc/echo) |
| Source of truth | tasks.md + spec.md (update immediately) |
| Completion | `/sw:done` only (NEVER edit metadata.json directly) |
| Increment root | ONLY 4 files: spec.md, plan.md, tasks.md, metadata.json |
| Increment IDs | Start from 0001 (NEVER 0000), check uniqueness first |
| Reports/logs | Always to `reports/`, `logs/` subfolders |
| Multi-repo | Clone to `repositories/` (never project root) |
| Secrets | Check `.env` first, never display values (`grep -q`) |
| Marketplace | `specweave refresh-marketplace` (not `scripts/`) |
| Stuck session | Kill + `pkill -f "bash.*specweave"` + `rm .specweave/state/*.lock` |

---

## References

- **Internal Docs**: `.specweave/docs/internal/`
- **ADRs**: `.specweave/docs/internal/architecture/adr/`
- **Troubleshooting**: `.specweave/docs/internal/troubleshooting/`
