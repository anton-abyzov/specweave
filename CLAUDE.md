<!-- SW:META template="claude" version="1.0.60" sections="header,start,autodetect,metarule,rules,workflow,context,lsp,structure,taskformat,secrets,syncing,mapping,testing,api,limits,troubleshooting,principles,linking,mcp,autoexecute,auto,docs" -->

<!-- SW:SECTION:header version="1.0.56" -->
**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`
<!-- SW:END:header -->

<!-- SW:SECTION:start version="1.0.56" -->
## Getting Started

**Initial increment**: `0001-project-setup` (auto-created by `specweave init`)

**Options**:
1. **Start fresh**: `rm -rf .specweave/increments/0001-project-setup` → `/sw:increment "your-feature"`
2. **Customize**: Edit spec.md and use for setup tasks
<!-- SW:END:start -->

<!-- SW:SECTION:autodetect version="1.0.56" -->
## Auto-Detection

SpecWeave auto-detects product descriptions and routes to `/sw:increment`:

**Signals** (5+ = auto-route): Project name | Features list (3+) | Tech stack | Timeline/MVP | Problem statement | Business model

**Opt-out phrases**: "Just brainstorm first" | "Don't plan yet" | "Quick discussion" | "Let's explore ideas"
<!-- SW:END:autodetect -->

<!-- SW:SECTION:metarule version="1.0.56" -->
## Meta-Rule: Think-Before-Act

**Satisfy dependencies BEFORE dependent operations.**

```
❌ node script.js → Error → npm run build
✅ npm run build → node script.js → Success
```
<!-- SW:END:metarule -->

<!-- SW:SECTION:rules version="1.0.56" -->
## Rules

1. **Files** → `.specweave/increments/####-name/` (spec.md, plan.md, tasks.md at root; reports/, scripts/, logs/ subfolders)
2. **Update immediately**: `Edit("tasks.md", "[ ] pending", "[x] completed")` + `Edit("spec.md", "[ ] AC-", "[x] AC-")`
3. **Unique IDs**: Check `ls .specweave/increments/ | grep "^[0-9]" | tail -5`
4. **Emergency**: "emergency mode" → 1 edit, 50 lines max, no agents
5. **Root clean**: NEVER create .md/reports/scripts in project root → use increment folders
<!-- SW:END:rules -->

<!-- SW:SECTION:workflow version="1.0.58" -->
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

<!-- SW:SECTION:context version="1.0.56" -->
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

<!-- SW:SECTION:lsp version="1.0.56" -->
## LSP-Enhanced Exploration (DEFAULT - Claude Code 2.0.74+)

**LSP is ENABLED BY DEFAULT** for all SpecWeave operations - 100x faster than grep for symbol resolution.

**LSP Operations** (used automatically):
| Operation | Purpose | Example Use |
|-----------|---------|-------------|
| `goToDefinition` | Jump to symbol definition | Find where a function/class is defined |
| `findReferences` | All usages across codebase | Refactoring impact analysis |
| `documentSymbol` | File structure/hierarchy | Understand module organization |
| `hover` | Type info & documentation | Check inferred types, JSDoc |
| `getDiagnostics` | Errors, warnings, hints | Real-time code quality check |

**Living Docs & Init use LSP automatically**:
```bash
# Full scan (LSP enabled by default)
/sw:living-docs --full-scan

# Init also uses LSP for accurate codebase analysis
specweave init

# LSP provides automatically:
# - Accurate API surface extraction (all exports, types, signatures)
# - Cross-module dependency graphs (semantic, not just imports)
# - Dead code detection (unreferenced symbols)
# - Type hierarchy and inheritance maps

# Disable only if language servers unavailable (not recommended):
/sw:living-docs --full-scan --no-lsp
```

**Install Language Servers** (required for LSP):
```bash
# TypeScript/JavaScript (most common)
npm install -g typescript-language-server typescript

# Python
pip install python-lsp-server

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

**Configuration** (optional, `.lsp.json` in project root):
```json
{
  "vtsls": {
    "command": "typescript-language-server",
    "args": ["--stdio"],
    "extensionToLanguage": { ".ts": "typescript", ".tsx": "typescriptreact", ".js": "javascript" }
  }
}
```

**Best Practices**:
- Install language servers before running `specweave init` or `/sw:living-docs`
- LSP runs automatically - no flags needed
- Use `findReferences` before refactoring to understand impact
- Combine with Explore agent for comprehensive codebase understanding
<!-- SW:END:lsp -->

<!-- SW:SECTION:structure version="1.0.59" -->
## Structure

```
.specweave/
├── increments/####-name/     # metadata.json, spec.md, tasks.md
├── docs/internal/
│   ├── specs/{project}/      # Living docs (check before implementing!)
│   ├── architecture/adr/     # ADRs (check before design decisions!)
│   └── operations/           # Runbooks
└── config.json
```

### ⚠️ CRITICAL: Multi-Repo Project Paths (MANDATORY)

**ALL multi-project repositories MUST be created in `repositories/` folder - NEVER in project root!**

```
❌ FORBIDDEN (pollutes root):
my-project/
├── frontend/        ← WRONG!
├── backend/         ← WRONG!
├── shared/          ← WRONG!
└── .specweave/

✅ REQUIRED (clean structure):
my-project/
├── repositories/
│   ├── frontend/    ← CORRECT!
│   ├── backend/     ← CORRECT!
│   └── shared/      ← CORRECT!
└── .specweave/
```

**This applies to ALL cases:**
- GitHub multi-repo → `repositories/`
- Azure DevOps multi-repo → `repositories/`
- Bitbucket multi-repo → `repositories/`
- **Local git multi-repo → `repositories/`** ← Same rule!
- Monorepo with multiple packages → `repositories/` or `packages/`

**When spec.md has `projects:` array:**
```yaml
projects:
  - id: my-api
    scope: "Backend API"
```
The implementation path is ALWAYS: `repositories/my-api/` (NOT `my-api/` in root!)

**Multi-repo permissions**: In `.claude/settings.json`:
```json
{"permissions":{"allow":["Write(//**)","Edit(//**)"],"additionalDirectories":["repositories"],"defaultMode":"bypassPermissions"}}
```
**Path syntax**: `//path` = absolute | `/path` = relative to settings file | `**` = recursive | `additionalDirectories` = explicit working dirs
<!-- SW:END:structure -->

<!-- SW:SECTION:taskformat version="1.0.56" -->
## Task Format

```markdown
### T-001: Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given [X] → When [Y] → Then [Z]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:secrets version="1.0.56" -->
## Secrets Check

**BEFORE CLI tools**: Check existing config first!
```bash
grep -E "(GITHUB_TOKEN|JIRA_|ADO_)" .env 2>/dev/null
cat .specweave/config.json | grep -A5 '"sync"'
gh auth status
```
<!-- SW:END:secrets -->

<!-- SW:SECTION:syncing version="1.0.56" -->
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

<!-- SW:SECTION:mapping version="1.0.56" -->
## GitHub Mapping

| SpecWeave | GitHub |
|-----------|--------|
| Feature FS-XXX | Milestone |
| Story US-XXX | Issue `[FS-XXX][US-YYY] Title` |
| Task T-XXX | Checkbox |
<!-- SW:END:mapping -->

<!-- SW:SECTION:testing version="1.0.56" -->
## Testing

BDD in tasks.md | Unit >80% | `.test.ts` (Vitest)

```typescript
// Vitest pattern: vi.fn() not jest.fn(), import not require
import { vi } from 'vitest';
vi.mock('fs', () => ({ readFile: vi.fn() }));
```
<!-- SW:END:testing -->

<!-- SW:SECTION:api version="1.0.61" -->
## API Development (OpenAPI-First)

**For API projects only.** Skip this section if your project has no REST/GraphQL endpoints.

**Use OpenAPI as the source of truth for API documentation.** Postman collections and environments are derived from OpenAPI and .env.

### Configuration (`.specweave/config.json`)

```json
{
  "apiDocs": {
    "enabled": true,
    "openApiPath": "openapi.yaml",
    "generatePostman": true,
    "postmanPath": "postman-collection.json",
    "postmanEnvPath": "postman-environment.json",
    "generateOn": "on-increment-done",
    "baseUrl": "http://localhost:3000"
  }
}
```

### Generated Artifacts

| File | Purpose | Source |
|------|---------|--------|
| `openapi.yaml` | API specification (source of truth) | Framework decorators/annotations |
| `postman-collection.json` | API requests for testing | Derived from OpenAPI |
| `postman-environment.json` | Variables (baseUrl, tokens, etc.) | Derived from .env |

### OpenAPI Generation by Framework

| Framework | Auto-Generation | Setup |
|-----------|-----------------|-------|
| **NestJS** | `@nestjs/swagger` | Decorators auto-generate OpenAPI |
| **FastAPI** | Built-in | Auto-generates at `/openapi.json` |
| **Express** | `swagger-jsdoc` | JSDoc comments -> OpenAPI |
| **Spring Boot** | `springdoc-openapi` | Annotations auto-generate |
| **Go/Gin** | `swag` | Comments -> OpenAPI |

### Workflow

```
Code (decorators/annotations)
        |
        v (auto-generated or manual)
openapi.yaml (SOURCE OF TRUTH - version controlled)
        |
        v (derived on /sw:done or /sw:api-docs)
├── postman-collection.json (requests with {{baseUrl}} variables)
└── postman-environment.json (variables from .env, secrets marked)
```

### Commands

```bash
# Generate all API docs (OpenAPI + Postman collection + environment)
/sw:api-docs --all

# Generate only OpenAPI
/sw:api-docs --openapi

# Generate only Postman collection from existing OpenAPI
/sw:api-docs --postman

# Generate only environment file from .env
/sw:api-docs --env

# Validate existing OpenAPI spec
/sw:api-docs --validate

# Generate on increment close (automatic if enabled)
/sw:done 0001  # -> triggers API doc generation
```

### Postman Import

After generation:
1. Postman → Import → `postman-collection.json`
2. Postman → Environments → Import → `postman-environment.json`
3. Fill in secret values (marked as secret type, values empty)
4. Select environment from dropdown

### When Docs Update

| `generateOn` Setting | When API Docs Regenerate |
|---------------------|--------------------------|
| `on-increment-done` | When closing increment (recommended) |
| `on-api-change` | When API files change (hook-based) |
| `manual` | Only via `/sw:api-docs` command |
<!-- SW:END:api -->

<!-- SW:SECTION:limits version="1.0.56" -->
## Limits

**Max 1500 lines/file** — extract before adding
<!-- SW:END:limits -->

<!-- SW:SECTION:troubleshooting version="1.0.56" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Skills missing | Restart Claude Code |
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
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:principles version="1.0.56" -->
## Principles

1. **Spec-first**: `/sw:increment` before coding
2. **Docs = truth**: Specs guide implementation
3. **Incremental**: Small, validated increments
4. **Traceable**: All work → specs → ACs
5. **Clean**: All files in increment folders
<!-- SW:END:principles -->

<!-- SW:SECTION:linking version="1.0.56" -->
## Bidirectional Linking

Tasks ↔ User Stories auto-linked via AC-IDs: `AC-US1-01` → `US-001`

Task format: `**AC**: AC-US1-01, AC-US1-02` (CRITICAL for linking)
<!-- SW:END:linking -->

<!-- SW:SECTION:mcp version="1.0.59" -->
## External Service Connection (MCP + Smart Fallbacks)

**Core principle: Never fight connection issues. Use the path of least resistance.**

### Connection Priority (ALWAYS follow this order)

```
MCP Server → REST API → SDK/Client → CLI → Direct Connection
     ↑                                              ↓
   BEST                                          WORST
```

### Service Connection Matrix

| Service | BEST Method | Fallback | AVOID |
|---------|-------------|----------|-------|
| **Supabase** | MCP Server | REST API / JS Client | Direct `psql` (IPv6 issues) |
| **Cloudflare** | `wrangler` + OAuth | REST API | Manual curl |
| **PostgreSQL** | MCP / Pooler (6543) | `psql` with pooler | Direct port 5432 |
| **MongoDB** | Atlas Data API | MCP / Driver | Direct connection |
| **Redis** | Upstash REST | MCP | `redis-cli` (TCP issues) |
| **AWS** | CLI with SSO | SDK | Hardcoded keys |
| **Vercel** | CLI with OAuth | REST API | Manual deploys |

### Quick Setup Commands

```bash
# MCP Servers (one-time, restart Claude Code after)
npx @anthropic-ai/claude-code-mcp add supabase
npx @anthropic-ai/claude-code-mcp add postgres

# CLI Auth (persistent OAuth sessions)
wrangler login        # Cloudflare
vercel login          # Vercel
aws configure sso     # AWS
supabase login        # Supabase CLI

# Verify auth status
wrangler whoami && vercel whoami && aws sts get-caller-identity
```

### Supabase (Most Common Issues)

```bash
# ❌ DON'T: Direct psql or supabase db push (IPv6 fails)
supabase db push  # Often fails with connection errors

# ✅ DO: Use REST API or MCP
# REST API works everywhere - no network issues
curl "${SUPABASE_URL}/rest/v1/table" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# For migrations: Use Supabase Dashboard SQL Editor
# OR use connection pooler (port 6543, NOT 5432)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-region.pooler.supabase.com:6543/postgres"
```

### Cloudflare Workers

```bash
# One-time login (saves OAuth session)
wrangler login

# All operations then work:
wrangler deploy                          # Deploy worker
echo "value" | wrangler secret put KEY   # Set secret
wrangler kv:key put --binding=KV k v     # KV operations
wrangler d1 execute DB --command "SQL"   # D1 database
```

### Auto-Detection (Run Before External Ops)

```bash
# Check configured services
grep -E "SUPABASE_|DATABASE_URL|MONGODB|UPSTASH|CF_API" .env 2>/dev/null
wrangler whoami 2>/dev/null
aws sts get-caller-identity 2>/dev/null
```

**Full reference**: See `/sw:service-connect` skill for complete patterns.
<!-- SW:END:mcp -->

<!-- SW:SECTION:autoexecute version="1.0.56" -->
## Auto-Execute Rule (CRITICAL)

**NEVER output "Manual Step Required" or "Next Steps" when credentials are available.**

### The Golden Rule

```
❌ FORBIDDEN: "Manual Step Required: Open Supabase SQL Editor..."
❌ FORBIDDEN: "Next Steps: 1. Run wrangler deploy..."
❌ FORBIDDEN: "Execute this SQL in your database console..."

✅ REQUIRED: Execute commands directly using available credentials
```

### Decision Tree

```
Credentials in .env? ──YES──→ EXECUTE IMMEDIATELY
         │
         NO
         │
         ▼
ASK for credentials (don't show manual steps!)
         │
         ▼
Save to .env → EXECUTE IMMEDIATELY → Continue
```

### Credential Lookup (MANDATORY before any external operation)

```bash
# 1. Check .env
grep -E "(SUPABASE_|DATABASE_URL|CF_API_|GITHUB_TOKEN)" .env 2>/dev/null

# 2. Check CLI auth
supabase status 2>/dev/null     # Supabase
wrangler whoami 2>/dev/null     # Cloudflare
gh auth status 2>/dev/null      # GitHub
aws sts get-caller-identity 2>/dev/null  # AWS

# 3. Use MCP server if available
# MCP servers provide direct API access
```

### Auto-Execute Examples

```bash
# Supabase SQL execution
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f schema.sql  # ✅ Execute directly
fi

# Wrangler secrets
if wrangler whoami 2>/dev/null; then
  echo "$SECRET" | wrangler secret put MY_SECRET  # ✅ Execute directly
  wrangler deploy  # ✅ Deploy directly
fi
```

### If Credentials Missing → ASK, Don't Show Manual Steps

```markdown
🔐 **Credential Required**

I need your DATABASE_URL to execute the migration.

**Paste your connection string:**
[I will save to .env and execute automatically]
```
<!-- SW:END:autoexecute -->

<!-- SW:SECTION:auto version="1.0.57" -->
## Auto Mode (Autonomous Execution)

**Auto mode enables continuous autonomous execution** until all tasks are complete.

### 🚨 CRITICAL: Zero Manual Steps in Auto Mode

**Auto mode MUST be fully autonomous. NEVER ask user to:**
- Open a web dashboard (Supabase, AWS Console, etc.)
- Copy/paste SQL into an editor
- Run commands manually
- Click buttons in UIs

**If you need external access:**
1. Check for credentials in `.env`
2. Use CLI tools (`supabase`, `wrangler`, `gh`, `aws`)
3. Use MCP servers for direct API access
4. If credentials missing → ASK for them, save to `.env`, then EXECUTE

### 🧪 Test Execution Loop (MANDATORY)

**After EVERY implementation task, run tests in a self-healing loop:**

```bash
# 1. Run unit/integration tests
npm test  # or: npx vitest run

# 2. If UI exists, run E2E tests
npx playwright test

# 3. If tests fail → FIX → RE-RUN (max 3 attempts)
```

**Test Loop Pattern (Ralph Loop):**
```
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENT → TEST → FAIL? → FIX → TEST → PASS → NEXT TASK   │
│                     ↑________________↓                       │
│                    (max 3 iterations)                        │
└─────────────────────────────────────────────────────────────┘
```

**E2E Test Execution (when UI exists):**
```bash
# Install Playwright browsers if needed
npx playwright install --with-deps chromium

# Run E2E tests with proper reporting
npx playwright test --reporter=list

# On failure, capture screenshot/trace
npx playwright test --trace on
```

**Focus on MVP Critical Paths:**
1. **Authentication flows** (login, logout, register)
2. **Core business transactions** (create, update, delete)
3. **Payment/checkout flows** (if applicable)
4. **Data integrity scenarios**

### ⚠️ Pragmatic Completion (NOT 100% Blindly!)

**Don't blindly follow 100% completion rules!** Reality:
- Specs have bugs, ambiguities, conflicts
- Requirements change mid-implementation
- Some planned tasks become irrelevant
- Edge cases may not be worth the effort

**Smart Completion Criteria:**
```
┌─────────────────────────────────────────────────────────────┐
│ MUST COMPLETE (block release):                               │
│ • MVP critical paths (auth, core CRUD, payments)            │
│ • Security-sensitive flows                                   │
│ • Data integrity operations                                  │
│ • User-facing error handling                                 │
├─────────────────────────────────────────────────────────────┤
│ SHOULD COMPLETE (aim for, but pragmatic):                    │
│ • Edge case handling                                         │
│ • Performance optimizations                                  │
│ • Nice-to-have features                                      │
├─────────────────────────────────────────────────────────────┤
│ CAN SKIP/DEFER (if blocking progress):                       │
│ • Conflicting requirements (flag and ask user)              │
│ • Over-engineered edge cases                                 │
│ • Tasks made obsolete by other changes                       │
└─────────────────────────────────────────────────────────────┘
```

**When to STOP and ask user:**
- Spec conflicts with another spec
- Task seems unnecessary given implementation
- Edge case would require major refactoring
- Requirement is ambiguous

### 🧑‍🤝‍🧑 Smart Test User Strategy

**Create test users strategically, not blindly:**

```typescript
// Good: Create users with specific roles/states
const testUsers = {
  admin: { email: 'admin@test.com', role: 'admin' },
  regularUser: { email: 'user@test.com', role: 'user' },
  premiumUser: { email: 'premium@test.com', plan: 'premium' },
  blockedUser: { email: 'blocked@test.com', status: 'blocked' },
};

// When to create multiple test users:
// ✅ Testing role-based access control
// ✅ Testing subscription tiers
// ✅ Testing user states (active, blocked, pending)
// ✅ Testing multi-user interactions (sharing, permissions)

// When ONE test user is enough:
// ✅ Basic CRUD operations
// ✅ Form validation
// ✅ UI component tests
// ✅ API endpoint tests (mocked auth)
```

**E2E Test User Setup:**
```typescript
// playwright/fixtures/users.ts
export const testUsers = {
  // Seeded in database before tests
  admin: { id: 'test-admin-001', email: 'admin@test.local' },
  user: { id: 'test-user-001', email: 'user@test.local' },
};

// Use fixtures, don't create users per test!
test.use({ storageState: 'playwright/.auth/user.json' });
```

### 🔐 E2E Authentication (CRITICAL - Avoid Flaky Tests!)

**Auth is the #1 cause of flaky E2E tests. Be ULTRASMART about it:**

```
┌─────────────────────────────────────────────────────────────┐
│ E2E AUTH STRATEGY (in order of preference):                  │
├─────────────────────────────────────────────────────────────┤
│ 1. BEST: Reuse auth state (storageState)                    │
│    - Login ONCE in global setup                              │
│    - Reuse session across all tests                          │
│    - 10x faster, zero flakiness                              │
│                                                              │
│ 2. GOOD: API-based auth (bypass UI)                         │
│    - Call auth API directly                                  │
│    - Set cookies/tokens programmatically                     │
│    - Faster than UI login                                    │
│                                                              │
│ 3. AVOID: UI login per test                                 │
│    - Slow (3-5s per test)                                   │
│    - Flaky (timing, captcha, rate limits)                   │
│    - Only for testing login flow itself                      │
└─────────────────────────────────────────────────────────────┘
```

**Playwright Auth Setup (MANDATORY pattern):**

```typescript
// playwright/auth.setup.ts - Global setup, runs ONCE
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Option 1: UI login (only in setup, not per test!)
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // Save auth state for reuse
  await page.context().storageState({ path: authFile });
});

// Option 2: API-based auth (PREFERRED - faster, more reliable)
setup('authenticate via API', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: 'test@example.com', password: 'testpass123' }
  });

  // Extract and save cookies/tokens
  await request.storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project - runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Tests use auth state from setup
    {
      name: 'chromium',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

```typescript
// tests/dashboard.spec.ts - NO LOGIN CODE NEEDED!
test('user can view dashboard', async ({ page }) => {
  // Already authenticated via storageState!
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

**Handling Auth Edge Cases:**

```typescript
// For tests that need DIFFERENT users:
test.describe('admin features', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('admin can delete users', async ({ page }) => {
    // Uses admin auth state
  });
});

// For tests that need NO auth (login page testing):
test.describe('login flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    // Test the actual login UI
  });
});
```

**Common Auth Flakiness Fixes:**

| Problem | Solution |
|---------|----------|
| Session expires mid-test | Increase token TTL for test env, or refresh in setup |
| Rate limited on login | Use API auth, not UI; seed test users with known creds |
| Captcha blocks tests | Disable captcha in test env, or use bypass token |
| OAuth redirect fails | Mock OAuth provider, or use test-specific flow |
| Token not persisted | Wait for storage to complete before saving state |
| Different auth per test | Use separate storageState files per user role |

**Test Database Strategy:**

```typescript
// global-setup.ts - Seed ONCE before all tests
async function globalSetup() {
  // 1. Reset test database to known state
  await resetTestDatabase();

  // 2. Seed test users (with KNOWN passwords!)
  await seedTestUsers([
    { email: 'user@test.local', password: 'Test123!', role: 'user' },
    { email: 'admin@test.local', password: 'Admin123!', role: 'admin' },
  ]);

  // 3. Seed test data
  await seedTestData();
}

// DON'T create users per test - use seeded users!
```

**Auto Mode E2E Checklist:**
```
Before running E2E tests in auto mode:
✅ Test users seeded in database with known passwords
✅ Auth state files generated (user.json, admin.json)
✅ playwright.config.ts uses storageState
✅ Individual tests DON'T login (except login flow tests)
✅ Test env has relaxed rate limits
✅ Captcha/2FA disabled or bypassed in test env
```

### 🔄 Continuous Refactoring (Part of Auto Loop)

**As tests grow, REFACTOR proactively:**

```
After every 3-5 tasks:
1. Review test organization → Extract shared fixtures
2. Review code duplication → Extract utilities
3. Review file sizes → Split if >300 lines
4. Review imports → Consolidate, remove unused
```

**Refactoring Triggers:**
- Test file > 200 lines → Split by feature
- Duplicate test setup → Extract to fixtures
- Same assertion pattern 3+ times → Create helper
- Source file > 300 lines → Extract module

### 📊 Test Status Reporting (MANDATORY in Auto Mode)

**After EVERY task, report test status to user:**

```markdown
## 🧪 Test Status Report

| Type | Status | Pass/Total | Coverage |
|------|--------|------------|----------|
| Unit | ✅ | 42/42 | 87% |
| Integration | ✅ | 12/12 | - |
| E2E | ⚠️ | 8/10 | - |

**Failing tests:**
- `auth.spec.ts:45` - Login redirect not working
- `checkout.spec.ts:112` - Payment timeout

**Next:** Fixing E2E failures before continuing...
```

### 🏠 Local-First Development

**If no deployment instructions provided, BUILD AND TEST LOCALLY FIRST:**

```
1. Implement feature locally
2. Run ALL tests (unit, integration, E2E)
3. Verify everything works
4. THEN ask user about deployment preferences
```

**Don't assume deployment target!** Ask user:
```markdown
🚀 **Deployment Options**

Your scraper is ready and all tests pass locally.

**Where would you like to deploy?**
- Vercel Cron (serverless, free tier available)
- Railway (always-on, $5/mo)
- GitHub Actions (CI-based, free)
- Local cron (self-hosted)
- Other?
```

### 🔧 Infrastructure Decision-Making

**For scrapers, cron jobs, background tasks - ULTRATHINK on best approach:**

```
┌─────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE DECISION TREE                                 │
├─────────────────────────────────────────────────────────────┤
│ Scraper/Cron Job:                                           │
│ ├─ Frequency < 1/hour → Vercel Cron, GitHub Actions         │
│ ├─ Frequency ≥ 1/hour → Railway, Render, dedicated server   │
│ ├─ Heavy compute → Dedicated VM, Docker container           │
│ └─ Real-time → Always-on server, WebSocket                  │
│                                                              │
│ Data Storage:                                                │
│ ├─ Simple KV → Upstash Redis, Vercel KV                     │
│ ├─ Relational → Supabase, PlanetScale, Neon                 │
│ ├─ Document → MongoDB Atlas, Supabase                       │
│ └─ Time-series → TimescaleDB, InfluxDB                      │
│                                                              │
│ File Storage:                                                │
│ ├─ Static assets → Cloudflare R2, S3                        │
│ └─ Large files → S3, GCS, Backblaze B2                      │
└─────────────────────────────────────────────────────────────┘
```

**When implementing scrapers/cron jobs:**
1. **Ultrathink** on best hosting options given requirements
2. **Research** rate limits, costs, reliability
3. **Propose** 2-3 options with trade-offs
4. **Build locally first** with tests
5. **Deploy** only after user confirms target

### For Claude Code Users

Auto mode uses Claude Code's Stop Hook to create a feedback loop:
- `/sw:do` continues until all tasks complete
- `/sw:auto-status` shows session progress
- `/sw:cancel-auto` stops autonomous execution

Session state stored in `.specweave/state/auto-session.json`.

### For Non-Claude AI Systems

If using SpecWeave with other AI systems (GPT, Gemini, etc.), implement this loop pattern:

```bash
# Bash loop for autonomous execution
while true; do
    # Check if all tasks complete
    TOTAL=$(grep -c "^### T-" .specweave/increments/*/tasks.md 2>/dev/null || echo "0")
    DONE=$(grep -c '\[x\].*completed' .specweave/increments/*/tasks.md 2>/dev/null || echo "0")

    if [ "$TOTAL" -gt 0 ] && [ "$DONE" -ge "$TOTAL" ]; then
        echo "All tasks complete!"
        break
    fi

    # Feed prompt to your AI
    cat PROMPT.md | your-ai-cli

    # Safety: max iterations
    ITER=$((ITER + 1))
    if [ "$ITER" -ge 100 ]; then
        echo "Max iterations reached"
        break
    fi
done
```

**Key Concepts**:
- **Completion Detection**: Check tasks.md for `[x] completed` status
- **Completion Tag**: Output `<auto-complete>DONE</auto-complete>` when finished
- **Max Iterations**: Always set a limit (default: 100)
- **Human Gates**: Pause for sensitive ops (deploy, publish, force-push)

**Human-Gated Operations** (require manual approval):
- `npm publish`, `git push --force`, `rm -rf /`
- Any `production` deployment
- API key or credential changes
- Database migrations (`drop`, `delete from`, `migrate`)

**Circuit Breaker Pattern**: If external API (GitHub, JIRA) fails 3+ times, queue operations and continue.
<!-- SW:END:auto -->

<!-- SW:SECTION:docs version="1.0.56" -->
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
