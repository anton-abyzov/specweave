# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**⛔ THIS IS THE #1 RULE - VIOLATING THIS WILL GET YOUR PR REJECTED ⛔**

**ALL AI-generated files MUST go into the CURRENT INCREMENT folder**, NOT in the project root!

### ❌ NEVER Create in Root (Pollutes Repository)

```
❌ WRONG - ROOT FILES (REJECTED!):
/PLUGIN-MIGRATION-COMPLETE.md          # NO! Goes to increment reports/
/SESSION-SUMMARY-2025-10-28.md         # NO! Goes to increment reports/
/ADR-006-DEEP-ANALYSIS.md              # NO! Goes to .specweave/docs/internal/architecture/adr/
/ANALYSIS-MULTI-TOOL-COMPARISON.md     # NO! Goes to increment reports/
/migration-helper.sh                   # NO! Goes to increment scripts/
/execution.log                         # NO! Goes to increment logs/
/specweave-0.5.1.tgz                   # NO! Build artifact, should be in .gitignore
/yolov8n.pt                            # NO! ML model, should be in .gitignore

✅ CORRECT - INCREMENT FOLDERS:
.specweave/increments/0004-plugin-architecture/
├── spec.md                            # Spec files (core 3)
├── plan.md
├── tasks.md                           # Tasks with embedded tests
├── reports/                           # ✅ PUT REPORTS HERE!
│   ├── PLUGIN-MIGRATION-COMPLETE.md   # ✅ Completion reports
│   ├── SESSION-SUMMARY.md             # ✅ Session summaries
│   └── ANALYSIS-*.md                  # ✅ Analysis files
├── scripts/                           # ✅ PUT SCRIPTS HERE!
│   └── migration-helper.sh            # ✅ Helper scripts
└── logs/                              # ✅ PUT LOGS HERE!
    └── execution.log                  # ✅ Execution logs

.specweave/docs/internal/architecture/ # ✅ PUT ADRS/DIAGRAMS HERE!
└── adr/
    └── 0006-deep-analysis.md          # ✅ Architecture decisions
```

### Why This Matters

- ✅ **Complete traceability** - Know which increment created which files
- ✅ **Easy cleanup** - Delete increment folder = delete all files
- ✅ **Clear context** - All files for a feature in one place
- ✅ **No root clutter** - Project root stays clean and professional
- ✅ **Better git history** - Changes grouped by increment

### What IS Allowed in Root?

**ONLY these files belong in root**:
- ✅ `CLAUDE.md` (this file - contributor guide)
- ✅ `README.md`, `CHANGELOG.md`, `LICENSE` (project documentation)
- ✅ `package.json`, `tsconfig.json`, `.gitignore` (config files)
- ✅ Directories: `src/`, `tests/`, `plugins/`, `.specweave/`, etc. (source code)

**Everything else goes in increment folders or `.gitignore`!**

### Build Artifacts (Add to .gitignore)

These should NEVER be committed:
- ❌ `*.tgz`, `*.tar.gz` - NPM package archives
- ❌ `*.pt`, `*.pth` - ML model files (download on demand)
- ❌ `dist/`, `build/` - Compiled outputs (already in .gitignore)
- ❌ `*.log` - Log files (already in .gitignore)

**Before committing, ALWAYS check**: `git status` - If you see `.md` files in root, MOVE THEM!

---

## Why Claude Code is Best-in-Class

**CRITICAL**: SpecWeave is designed for Claude Code FIRST. Other tools are supported but with reduced capabilities.

### Anthropic Sets the Standards

Claude Code isn't just another AI coding assistant - **Anthropic defines the industry standards**:

1. **MCP (Model Context Protocol)** - Industry standard for context management
2. **Skills** - Proven pattern for auto-activating capabilities
3. **Agents** - Proven pattern for role-based, isolated workflows
4. **Hooks** - Proven pattern for lifecycle automation

### Why SpecWeave + Claude Code = 10x Better

| Feature | Claude Code (Native) | Cursor 2.0 | Other (Copilot, ChatGPT, etc.) |
|---------|---------------------|------------|-------------------------------|
| **Living Docs** | ✅ Auto-sync via hooks | ❌ Manual | ❌ Manual |
| **Skills** | ✅ Auto-activate | 🟡 Must @mention | ❌ None |
| **Commands** | ✅ Plugin-based `/specweave:*` | 🟡 Team commands | ❌ None |
| **Hooks** | ✅ Pre/Post lifecycle | ❌ No hooks | ❌ No hooks |
| **Agents** | ✅ Isolated contexts | 🟡 Shared (8 parallel) | ❌ None |
| **Context** | ✅ MCP + 60-80% reduction | 🟡 @ shortcuts | ❌ High usage |
| **Quality** | ⭐⭐⭐⭐⭐ 100% Reliable | ⭐⭐⭐ 60% Less reliable | ⭐⭐ 40% Manual workflow |

**Quick Comparison**:

**Claude Code** - Full automation with native hooks, MCP protocol, plugin system, isolated agent contexts. **ONLY fully reliable option.**
**Cursor 2.0** - Partial support (AGENTS.md compilation, team commands, @ shortcuts) but no hooks, no agent isolation, less reliable than Claude
**Other (Copilot, ChatGPT, Gemini)** - Manual workflow, high context usage, AGENTS.md support but no automation, least reliable

**The Key Differentiator**: Only Claude Code supports **automated living docs** via native hooks. After EVERY task completion, docs sync automatically - zero manual intervention. This is why SpecWeave is designed Claude Code-first, though it gracefully degrades to other tools.

---

## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0002-core-enhancements`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (too generic, rejected)
- ❌ `0004` (no description, rejected)

**Rationale**:
- **Clear intent at a glance** - "0003-intelligent-model-selection" tells you exactly what it does
- **Easy to reference** - "the model selection increment" vs "increment 3"
- **Better git history** - Commit messages naturally include feature name
- **Searchable by feature** - `git log --grep="model-selection"` works
- **Self-documenting** - Increment folders are readable without opening files

**When Creating Increments**:
```bash
# ❌ Wrong
/specweave:inc "0004"

# ✅ Correct
/specweave:inc "0004-cost-optimization"
/specweave:inc "0005-github-sync-enhancements"
```

**Enforcement**:
- `/specweave:inc` command validates naming (rejects bare numbers)
- Code review requirement (descriptive names mandatory)
- This document serves as the source of truth

**Quick Reference**:
- `####` = Zero-padded 4-digit number (0001, 0002, 0003, ...)
- `-descriptive-name` = Kebab-case description (lowercase, hyphens)
- Max 50 chars total (for readability)
- No special characters except hyphens

---

## Increment Discipline

### Core Philosophy: **ONE Active Increment = Maximum Focus**

Simplified from complex per-type limits to **focus-first architecture**:
- ✅ **Default**: 1 active increment (maximum productivity)
- ✅ **Emergency ceiling**: 2 active max (hotfix/bug can interrupt)
- ✅ **Hard cap**: Never >2 active (enforced)

**Why 1?** Research shows:
- 1 task = 100% productivity
- 2 tasks = 20% slower (context switching cost)
- 3+ tasks = 40% slower + more bugs

### What is an Increment?

**An increment can be any type of work**, not just features. SpecWeave supports six increment types:

| Type | Description | Use When | Can Interrupt? | Examples |
|------|-------------|----------|----------------|----------|
| **feature** | Standard feature development | Adding new functionality | No | User authentication, payment integration, real-time chat |
| **hotfix** | Critical production fixes | Production is broken | ✅ Yes (emergency) | Security patch, critical bug causing downtime |
| **bug** | Production bugs with SRE investigation | Bug requires root cause analysis | ✅ Yes (emergency) | Memory leak investigation, performance degradation |
| **change-request** | Stakeholder requests | Business requirements change | No | UI redesign per stakeholder feedback, API contract changes |
| **refactor** | Code improvement | Technical debt, code quality | No | Extract service layer, migrate to TypeScript, improve test coverage |
| **experiment** | POC/spike work | Exploring options, prototypes | No* | Evaluate GraphQL vs REST, test new library, architecture spike |

**Notes**:
- **Experiments auto-abandon** after 14 days of inactivity (prevents accumulation of stale POCs)
- **Types are for tracking**, not separate limits (git log shows hotfixes vs features)
- **Single simple rule**: 1 active, allow 2 for emergencies only

**Key Insight**: The increment structure (spec.md, plan.md, tasks.md) works for ALL types. A bug investigation still needs:
- **spec.md**: What's broken? Why? What's the expected behavior?
- **plan.md**: How to investigate? What tools? What hypothesis?
- **tasks.md**: Investigation steps, fix implementation, verification tests

### WIP Limits

**Configuration** (`.specweave/config.json`):
```json
{
  "limits": {
    "maxActiveIncrements": 1,  // Default: 1 active (focus)
    "hardCap": 2,               // Emergency ceiling (never exceeded)
    "allowEmergencyInterrupt": true, // hotfix/bug can interrupt
    "typeBehaviors": {
      "canInterrupt": ["hotfix", "bug"], // Emergency types
      "autoAbandonDays": {
        "experiment": 14  // Auto-abandon stale experiments
      }
    }
  }
}
```

**Enforcement**:
- **0 active** → Create new (no warnings)
- **1 active** → Warn about context switching (allow with confirmation)
- **2 active** → HARD BLOCK (must complete or pause one first)

**Exception**: Hotfix/bug can interrupt to start 2nd active (emergency only)

**Multiple hotfixes?** Combine into ONE increment:
```bash
# ❌ Wrong: Multiple hotfix increments
0009-sql-injection-fix
0010-xss-vulnerability-fix
0011-csrf-token-fix

# ✅ Right: Combined hotfix increment
0009-security-fixes (SQL + XSS + CSRF)
```

**⛔ THE IRON RULE: You CANNOT start increment N+1 until increment N is DONE**

This is **NOT negotiable**. It is a **hard enforcement** to prevent chaos, scope creep, and stale documentation.

### Why This Rule Exists

**The Problem**:
- Multiple incomplete increments piling up (0002, 0003, 0006 all in progress)
- No clear source of truth ("which increment are we working on?")
- Living docs become stale (sync doesn't know what's current)
- Scope creep (jumping between features without finishing)
- Quality degradation (tests not run, docs not updated)

**The Solution**:
- ✅ **Hard block** on `/specweave:inc` if previous increments incomplete
- ✅ **Helper commands** to close increments properly
- ✅ **Clear guidance** on how to resolve incomplete work
- ✅ **Force discipline** = force quality

### What "DONE" Means

An increment is DONE if **ONE** of the following is true:

1. **All tasks completed**: All tasks in `tasks.md` marked `[x] Completed`
2. **Completion report exists**: `COMPLETION-SUMMARY.md` with "✅ COMPLETE" status
3. **Explicit closure**: Closed via `/specweave:close` with documentation

### The Enforcement

**When you try to start a new increment**:

```bash
/specweave:inc "new feature"
```

**If previous increments are incomplete, you'll see**:

```
❌ Cannot create new increment!

Previous increments are incomplete:

📋 Increment 0002-core-enhancements
   Status: 73% complete (11/15 tasks)
   Pending:
     - T-008: Migrate DIAGRAM-CONVENTIONS.md content
     - T-010: Create context-manifest.yaml
     - T-012: Test agent invocation manually
     - T-013: Run skill test suite
     - T-015: Create PR when increment complete

📋 Increment 0003-intelligent-model-selection
   Status: 50% complete (11/22 tasks)
   Pending: 11 tasks

💡 What would you like to do?

1️⃣  Close incomplete increments:
   /specweave:close

2️⃣  Check status:
   /specweave:status

3️⃣  Force create (DANGEROUS - violates discipline!):
   Add --force flag to bypass this check

⚠️  The discipline exists for a reason:
   - Prevents scope creep
   - Ensures completions are tracked
   - Maintains living docs accuracy
   - Keeps work focused
```

### How to Resolve Incomplete Increments

#### Option 1: Complete the Work (Recommended)

```bash
# Continue working on incomplete increment
/specweave:do

# Once all tasks done, it's automatically complete
/specweave:inc "new feature"  # ✅ Now works!
```

#### Option 2: Close Interactively

```bash
# Interactive closure with options
/specweave:close

# You'll be asked to choose:
# - Force complete (mark all tasks done)
# - Move tasks to next increment (defer work)
# - Reduce scope (mark tasks as won't-do)
# - Create completion report (manual close)
```

#### Option 3: Check Status First

```bash
# See all incomplete increments
/specweave:status

# Output shows:
# ✅ 0001-core-framework
# ✅ 0004-plugin-architecture
# ⏳ 0002-core-enhancements (73% complete)
# ⏳ 0003-intelligent-model-selection (50% complete)
```

#### Option 4: Force Create (Emergency Only!)

```bash
# Bypass the check (USE SPARINGLY!)
/specweave:inc "urgent-hotfix" --force

# This is logged and should be explained in the next standup/PR
```

### The Three Options for Closing

When using `/specweave:close`, you get **THREE options**:

#### 1. **Adjust Scope** (Simplest - Recommended)

Remove parts from `spec.md`, regenerate `plan.md` and `tasks.md` to match reduced scope:

```bash
# 1. Edit spec.md - remove features you're not doing
# 2. Delete plan.md and tasks.md
# 3. Regenerate from spec
/specweave:inc "same increment" --regenerate

# Now tasks match reduced scope → 100% complete!
```

#### 2. **Move Scope to Next Increment**

Transfer incomplete tasks to the new increment:

```bash
# Via /specweave:close
# Select "Move tasks to next increment"
# Tasks are migrated with documentation
# Old increment closed, new increment gets the work
```

#### 3. **Extend Existing Increment** (Merge Work)

Simplest option: **Don't start a new increment**. Just extend the current one:

```bash
# Instead of creating 0003, extend 0002:
# 1. Update spec.md to include new features
# 2. Update plan.md with new implementation details
# 3. Add new tasks to tasks.md
# 4. Minimize tests if needed (focus on critical paths)

# Work on combined scope in ONE increment
/specweave:do
```

### Helper Commands

| Command | Purpose |
|---------|---------|
| `/specweave:status` | Show all increments and their completion status |
| `/specweave:close` | Interactive closure of incomplete increments |
| `/specweave:force-close <id>` | Mark all tasks complete (dangerous!) |

### Enforcement Points

1. **`/specweave:inc` command** - Hard block (Step 0A)
2. **PM agent** - Pre-flight validation before planning
3. **CI/CD** (future) - Prevent PR merges with incomplete increments

### Philosophy: Discipline = Quality

**Why enforce this strictly?**

- **Focus**: Work on ONE thing at a time
- **Completion**: Finish before starting new
- **Quality**: Tests run, docs updated, code reviewed
- **Clarity**: Everyone knows what's current
- **Velocity**: Actually shipping > endless WIP

**Old Way (suggest)**:
```
User: "Just let me start the new feature, I'll come back to this"
Result: 5 incomplete increments, nothing ships
```

**New Way (enforce)**:
```
Framework: "Close this first, then start new"
User: *closes increment properly*
Result: Clean increments, clear progress, shipping regularly
```

### Real-World Example

**Scenario**: You have 0002 at 73% complete, want to start 0006.

**Old approach** (broken):
```bash
/specweave:inc "0006-i18n"
# ✅ Creates 0006 (no check)
# Result: 0002, 0003, 0006 all incomplete
```

**Current approach** (disciplined):
```bash
/specweave:inc "0006-i18n"
# ❌ Blocked! "Close 0002 and 0003 first"

# Check status
/specweave:status
# Shows: 0002 (73%), 0003 (50%) incomplete

# Close them
/specweave:close
# Select 0002 → Force complete (work was done, just not marked)
# Select 0003 → Move tasks to 0007 (defer work)

# Now can proceed
/specweave:inc "0006-i18n"
# ✅ Works! Clean slate, disciplined workflow
```

### Exception: The `--force` Flag

For **emergencies only** (hotfixes, urgent features):

```bash
/specweave:inc "urgent-security-fix" --force
```

**This bypasses the check** but:
- ✅ Logs the force creation
- ✅ Warns in CLI output
- ✅ Should be explained in PR/standup
- ✅ Should close previous increments ASAP

**Use sparingly!** The discipline exists for a reason.

---

**Summary**: Close previous increments before starting new ones. Use `/specweave:status` and `/specweave:close` to maintain discipline. This isn't bureaucracy—it's quality enforcement.

---

## Test-Aware Planning

**MAJOR ARCHITECTURE CHANGE**: Tests are now embedded in tasks.md instead of separate tests.md file.

### Why the Change?

**OLD Format**:
- ❌ Separate tests.md file (duplication, sync issues)
- ❌ Manual TC-ID management (TC-001, TC-002, etc.)
- ❌ No BDD format (hard to understand test intent)
- ❌ Tests disconnected from tasks (traceability gaps)

**NEW Format**:
- ✅ Tests embedded in tasks.md (single source of truth)
- ✅ BDD format (Given/When/Then - clear intent)
- ✅ AC-ID traceability (spec.md → tasks.md → tests)
- ✅ Test-first workflow (TDD supported naturally)
- ✅ Coverage targets per task (realistic 80-90%, not 100%)

### Quick Workflow Example

**Step 1: Create increment** → PM agent generates spec.md with user stories and AC-IDs:

```bash
/specweave:inc "Add user authentication"  # → generates spec.md with AC-US1-01, AC-US1-02, etc.
```

**spec.md excerpt** (acceptance criteria with AC-IDs):

### US1: Basic Login Flow
**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in with valid email/password (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials show error (P1, testable)
- [ ] **AC-US1-03**: 5 failed attempts lock account 15min (P2, testable)
```

**Step 2: Architect creates plan.md** with architecture and test strategy (85% unit, 80% integration, 100% E2E critical path)

**Step 3: test-aware-planner generates tasks.md** with embedded tests:

```markdown
---
increment: 0008-user-authentication
total_tasks: 5
test_mode: TDD
coverage_target: 85%
---

# Tasks for Increment 0008: User Authentication

## T-001: Implement Authentication Service (FULL EXAMPLE)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token + timestamp update

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword, nonexistentUser, rateLimiting → 90% coverage
- Integration (`auth-flow.test.ts`): loginEndpoint, lockedAccount → 85% coverage
- **Overall: 87% coverage**

**Implementation**: AuthService.ts, password hashing (bcrypt), JWT generation, rate limiting (Redis), TDD tests

---

## T-002 through T-005 (Abbreviated)

- **T-002**: Session Manager (AC-US2-01, AC-US2-02) - session persistence, "Remember Me", 85% coverage, deps: T-001
- **T-003**: Login API Endpoint (AC-US1-01, AC-US1-02) - REST API, validation, rate limiting, 85% coverage, deps: T-001, T-002
- **T-004**: Update Documentation - API docs, flow diagram, user guide (validation: manual review, link checker, build check)
- **T-005**: Security Audit (AC-US1-03) - OWASP scan, password/JWT verification, 90% coverage, deps: T-001, T-002, T-003
```

**Step 4: Validate** → `/specweave:check-tests 0008` shows per-task coverage, AC-ID coverage, missing tests, recommendations

**AC-ID Format**: `AC-US{story}-{number}` (e.g., AC-US1-01) enables traceability from spec.md → tasks.md → tests

### Agent Invocation (increment-planner skill)

The `increment-planner` skill automatically invokes the `test-aware-planner` agent:

```markdown
STEP 4: Invoke Test-Aware Planner Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "test-aware-planner",
  description: "Generate tasks with embedded tests",
  prompt: "Create tasks.md with embedded test plans for: [user feature description]

  FIRST, read the increment files:
  - .specweave/increments/0008-user-authentication/spec.md
  - .specweave/increments/0008-user-authentication/plan.md

  Generate tasks.md with:
  - Test Plan (Given/When/Then in BDD format)
  - Test Cases (unit/integration/E2E with file paths)
  - Coverage Targets (80-90% overall)
  - Implementation steps
  - Ensure all AC-IDs from spec.md are covered"
)
```

### TDD Workflow Mode

When `test_mode: TDD` in tasks.md frontmatter:

**Red → Green → Refactor**:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

**Example**:
```bash
# 1. RED - Write failing test
vim tests/unit/services/auth.test.ts
npm test  # ❌ Fails (expected)

# 2. GREEN - Implement feature
vim src/services/auth/AuthService.ts
npm test  # ✅ Passes

# 3. REFACTOR - Improve code
vim src/services/auth/AuthService.ts
npm test  # ✅ Still passes
```

### Migration from OLD Format

**If you have increments with tests.md**:

```bash
# Option 1: Keep old format (works, but deprecated)
# No action needed - old increments continue to work

# Option 2: Migrate to new format (recommended)
# 1. Extract tests from tests.md
# 2. Embed them in tasks.md for each task
# 3. Delete tests.md
# 4. Run /specweave:check-tests to validate
```

**Note**: New increments ONLY use tasks.md format. Backward compatibility removed per user feedback (greenfield product).

### Quick Reference

| Aspect | OLD (tests.md) | NEW (tasks.md) |
|--------|---------------|----------------|
| **File** | Separate tests.md | Embedded in tasks.md |
| **Format** | TC-IDs (TC-001) | Function names + BDD |
| **Traceability** | Manual | Automatic (AC-IDs) |
| **BDD** | No | Yes (Given/When/Then) |
| **Sync Issues** | Yes (tasks ↔ tests) | No (single file) |
| **Coverage** | Per test case | Per task + overall |
| **TDD Support** | Limited | Native (test_mode: TDD) |

---

## Root-Level .specweave/ Folder (MANDATORY)

**CRITICAL ARCHITECTURE RULE**: SpecWeave ONLY supports root-level `.specweave/` folders. Nested `.specweave/` folders are NOT supported and MUST be prevented.

### The Rule: ONE Source of Truth

```
✅ CORRECT - Root-level only:
my-project/
├── .specweave/              ← ONE source of truth
│   ├── increments/
│   ├── docs/
│   └── logs/
├── frontend/
├── backend/
└── infrastructure/

❌ WRONG - Nested .specweave/ (NOT SUPPORTED):
my-project/
├── .specweave/              ← Root level
│   └── ...
├── backend/
│   └── .specweave/          ← ❌ NESTED - PREVENTS THIS!
└── frontend/
    └── .specweave/          ← ❌ NESTED - PREVENTS THIS!
```

### Why Root-Level Only?

**Single Source of Truth**:
- ✅ One central location for all specs, increments, architecture
- ✅ No duplication or fragmentation
- ✅ Clear ownership and responsibility
- ✅ Simplified living docs sync (one place to update)

**Cross-Cutting Features**:
- ✅ Increments often span multiple modules (frontend + backend + infra)
- ✅ Architecture decisions (ADRs) apply system-wide
- ✅ Strategy docs are project-level, not module-level
- ✅ Living docs sync works best with one central location

**Plugin Detection**:
- ✅ Four-phase detection assumes one `.specweave/` folder
- ✅ Auto-detection scans from root only
- ✅ No ambiguity about where plugins are enabled

**Prevents Chaos**:
- ❌ Nested folders cause: Which is the source of truth?
- ❌ Duplication: Same increment in multiple places?
- ❌ Conflicts: Different modules with same increment numbers?
- ❌ Complexity: Where do cross-cutting features live?

### Multi-Repo & Microservices Pattern

**Problem**: "My project has multiple repos, microservices, or complex architecture"

**Solution**: Create a **parent folder** with ONE root-level `.specweave/`

The pattern is the same whether you have:
- Multiple git repos (polyrepo architecture)
- Microservices (separate service directories)
- Monorepo with multiple modules

```
microservices-project/       ← Create parent folder
├── .specweave/              ← ONE source of truth for entire system
│   ├── increments/
│   │   ├── 0001-add-service-mesh/      ← Cross-cutting
│   │   ├── 0002-user-svc-v2/           ← Single service
│   │   └── 0003-checkout-flow/         ← Multi-service
│   ├── docs/
│   │   ├── internal/
│   │   │   ├── strategy/               ← System-wide strategy
│   │   │   ├── architecture/
│   │   │   │   ├── service-mesh.md     ← System-wide
│   │   │   │   ├── api-contracts.md    ← Cross-service
│   │   │   │   └── adr/
│   │   │   │       └── 0001-service-mesh-choice.md
│   │   │   └── ...
│   │   └── public/
│   └── logs/
│
├── services/
│   ├── user-service/        ← Can be separate git repos
│   ├── order-service/       ← Or monorepo subdirectories
│   ├── payment-service/
│   └── notification-service/
│
├── infrastructure/
│   ├── k8s/
│   └── terraform/
│
└── shared/
    └── api-contracts/
```

**How to Set Up**:

```bash
# Option 1: Multiple repos (clone as subdirectories)
mkdir microservices-project && cd microservices-project
npx specweave init .
git clone https://github.com/myorg/user-service.git services/user-service
git clone https://github.com/myorg/order-service.git services/order-service

# Option 2: Git submodules (advanced)
mkdir microservices-project && cd microservices-project
git init && npx specweave init .
git submodule add https://github.com/myorg/user-service.git services/user-service

# Option 3: Monorepo (services in same repo)
mkdir microservices-project && cd microservices-project
git init && npx specweave init .
mkdir -p services/{user,order,payment}

# Work normally - SpecWeave sees all services
/specweave:inc "0001-add-service-mesh"
# Creates: .specweave/increments/0001-add-service-mesh/
# Can reference: services/user-service/, infrastructure/k8s/, etc.
```

**Benefits**:
- ✅ One `.specweave/` for entire system (no duplication)
- ✅ Each repo maintains its own git history (if using polyrepo)
- ✅ Cross-service increments are natural (e.g., checkout flow)
- ✅ System-wide architecture docs in one place
- ✅ Living docs cover all services

### Enforcement

**Validation in `init.ts`**:

```typescript
// Check for parent .specweave/
function detectNestedSpecweave(targetDir: string): string | null {
  let currentDir = path.dirname(targetDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');
    if (fs.existsSync(specweavePath)) {
      return currentDir; // Found parent .specweave/
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

// Prevent nested initialization
const parentSpecweave = detectNestedSpecweave(targetDir);
if (parentSpecweave) {
  console.error('❌ Nested .specweave/ folders are not supported!');
  console.error(`   Found parent .specweave/ at: ${parentSpecweave}`);
  console.error(`   Use the parent folder for all increments.`);
  process.exit(1);
}
```

**Detection Rules**:
- ❌ Prevent `specweave init` in subdirectories if parent `.specweave/` exists
- ✅ Suggest using parent folder instead
- ✅ Provide clear error messages with path to parent

**Code Review**:
- ❌ Reject PRs with nested `.specweave/` folders
- ✅ Enforce via linting/validation scripts

### Summary

| Aspect | Root-Level Only | Nested (NOT Supported) |
|--------|----------------|------------------------|
| **Source of Truth** | ✅ One central location | ❌ Multiple conflicting sources |
| **Cross-Cutting Features** | ✅ Natural | ❌ Complex coordination |
| **Living Docs Sync** | ✅ Simple | ❌ Merge conflicts |
| **Plugin Detection** | ✅ Works | ❌ Ambiguous |
| **Multi-Repo** | ✅ Parent folder | ❌ Fragmented |
| **Complexity** | ✅ Simple | ❌ High |

**Bottom Line**: Root-level `.specweave/` only. For multi-repo projects, create a parent folder. No exceptions.

---

## Project Scale - Plugin Architecture

### Core Plugin (Always Auto-Loaded)

**Plugin**: `specweave` - The essential SpecWeave plugin loaded in every project:
- **Skills**: 9 skills (increment-planner, tdd-workflow, spec-generator, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer)
- **Agents**: 22 agents (PM, Architect, Tech Lead, + 19 specialized including tdd-orchestrator)
- **Commands**: 22 commands (/specweave:inc, /specweave:do, /specweave:next, /specweave:done, /specweave:progress, /specweave:validate, /specweave:sync-docs, + 15 specialized)
- **Hooks**: 8 lifecycle hooks
- **Size**: ~12K tokens

**Result**: **75%+ context reduction** out of the box!

**Why So Small?**
- External sync (GitHub, Jira) = separate plugins
- Tech stacks (React, K8s) = separate plugins
- Domain expertise (ML, payments) = separate plugins
- Core plugin = only increment lifecycle + living docs automation

### Available Plugins (Opt-In)

**Implemented Plugins**:

| Plugin | Skills | Agents | Commands | Status |
|--------|--------|--------|----------|--------|
| **specweave-github** | 2 | 1 | 4 | ✅ COMPLETE |

**GitHub Plugin Features:**
- github-sync: Bidirectional increment ↔ issue sync
- github-issue-tracker: Task-level progress tracking
- github-manager agent: AI specialist for GitHub CLI
- Commands: create-issue, sync, close-issue, status
- Auto-detects: `.git/`, `github.com` remote, `GITHUB_TOKEN`

**Planned Plugins** (future releases):

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **frontend-stack** | 5 | 1 | 0 | React, Next.js, design systems |
| **kubernetes** | 3 | 1 | 2 | Deploying to K8s, Helm |

**Domain Plugins**:

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **ml-ops** | 3 | 3 | 1 | Machine learning, TensorFlow, PyTorch |
| **observability** | 4 | 4 | 2 | Prometheus, Grafana, monitoring |
| **payment-processing** | 4 | 1 | 0 | Stripe, billing, subscriptions |
| **e2e-testing** | 1 | 0 | 0 | Playwright, E2E browser automation, visual regression |
| **figma-ecosystem** | 5 | 2 | 0 | Design integration, Figma API |
| **security** | 3 | 1 | 0 | Security scanning, best practices |
| **diagrams** | 2 | 1 | 0 | C4 diagrams, Mermaid |

**Backend Stacks**:

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **nodejs-backend** | 1 | 1 | 0 | Express, Fastify, NestJS |
| **python-backend** | 1 | 1 | 0 | FastAPI, Django, Flask |
| **dotnet-backend** | 1 | 1 | 0 | ASP.NET Core, EF Core |

**Enterprise Sync** (Alternative to GitHub):

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **jira-sync** | 1 | 1 | 2 | JIRA project tracking |
| **ado-sync** | 1 | 1 | 2 | Azure DevOps tracking |

### Context Efficiency Examples

**Before** - Monolithic approach:
- Simple React app: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- Backend API: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- ML pipeline: Loads ALL 44 skills + 20 agents ≈ **50K tokens**

**After** - Modular plugin architecture:
- Simple React app: Core + frontend-stack + github ≈ **16K tokens** (68% reduction!)
- Backend API: Core + nodejs-backend + github ≈ **15K tokens** (70% reduction!)
- ML pipeline: Core + ml-ops + github ≈ **18K tokens** (64% reduction!)
- SpecWeave itself: Core + github + diagrams ≈ **15K tokens** (70% reduction!)

### How Plugins Are Loaded (Intelligent Auto-Loading)

**SpecWeave's plugin system is designed to be intelligent and non-intrusive:**

#### Phase 1: Initialize (FULLY AUTOMATED!)

When you run `specweave init`:

1. ✅ **GitHub Marketplace Registration**
   - Creates `.claude/settings.json` with GitHub marketplace reference
   - **No local copying** - plugins fetched from GitHub on-demand
   - Settings.json structure:
     ```json
     {
       "extraKnownMarketplaces": {
         "specweave": {
           "source": {
             "source": "github",
             "repo": "anton-abyzov/specweave",
             "path": ".claude-plugin"
           }
         }
       }
     }
     ```
   - Claude Code automatically discovers plugins from GitHub
   - No manual `/plugin marketplace add` needed!

2. ✅ **Core Plugin Auto-Installation**
   - Automatically runs: `claude plugin marketplace add` and `claude plugin install specweave@specweave`
   - Works via CLI during init (uses user's shell to access `claude` command)
   - Slash commands available IMMEDIATELY - no manual install!
   - Success message: "✔ SpecWeave core plugin installed automatically!"
   - Graceful fallback: If CLI unavailable, shows manual install instructions

3. ℹ️  **Optional Plugins Suggested**
   - Based on project detection (Git, package.json, etc.)
   - User can install now or later

**Key Architectural Change**:
- ❌ Old: Copied `.claude-plugin/` + `plugins/` to every project (~2MB bloat)
- ✅ New: Reference GitHub marketplace (~2KB settings.json, always up-to-date)

#### Phase 2: Increment Planning (On-Demand Loading)

When you create increments (e.g., `/specweave:inc "Add Stripe billing"`):

1. **Spec Analysis** (NEW! v0.6.0+)
   - increment-planner skill scans spec.md content
   - Detects keywords: "Stripe", "GitHub", "Kubernetes", "React", etc.
   - Maps keywords → required plugins (see Step 6 in increment-planner/SKILL.md)

2. **Plugin Suggestion** (Non-Blocking)
   ```
   🔌 This increment requires additional plugins:

   Required:
   • specweave-payments - Stripe integration (detected: "billing", "Stripe")

   📦 Install: /plugin install specweave-payments@specweave

   Or continue without it (can install later)
   ```

3. **User Decision**
   - Install now → Plugin activates immediately (after Claude Code restart)
   - Install later → Skills won't be available until plugin installed
   - Skip → Increment creation continues (not blocked)

#### Phase 3: Implementation (Auto-Activation)

When plugins are installed:

1. **Skills Auto-Activate**
   - Based on description keywords (Claude Code native behavior)
   - No manual invocation needed
   - Example: Mention "GitHub" → github-sync skill activates

2. **Context Efficiency**
   - Only loaded plugins consume tokens
   - 70%+ reduction vs. monolithic approach
   - Real-time: Simple React app = 16K tokens (was 50K in v0.3.7)

### Manual Plugin Management

All plugin management happens through Claude Code's native commands:

```bash
# List installed plugins
/plugin list --installed

# Install a specific plugin
/plugin install specweave-kubernetes@specweave

# Uninstall a plugin
/plugin uninstall specweave-kubernetes

# List all available plugins from marketplace
/plugin list specweave
```

**Key Insight**: SpecWeave uses **ONLY** Claude Code's native plugin system:
- Plugins install globally via `/plugin install specweave-{name}@specweave`
- Work across ALL projects (like VS Code extensions)
- Auto-activate based on skills' description keywords
- Managed by Claude Code (updates, uninstall, etc.)

### Development vs Production Setup

**Two different scenarios with different marketplace configurations:**

#### SpecWeave Repo (Development)

```
specweave/  (GitHub repo - Contributors)
├── .claude/
│   └── settings.json              # Empty or minimal (no local paths supported)
├── .claude-plugin/
│   └── marketplace.json           # Marketplace definition
└── plugins/
    ├── specweave/                 # Core plugin SOURCE CODE
    └── specweave-github/          # Plugin SOURCE CODE
```

**Marketplace setup for development** (use CLI, NOT settings.json):

Local paths are **NOT supported** in `extraKnownMarketplaces` in settings.json. Use CLI instead:

```bash
# Add local marketplace (only way for development)
/plugin marketplace add ./.claude-plugin

# Then install plugins
/plugin install specweave@specweave
```

**Why CLI-only?** Claude Code's `extraKnownMarketplaces` in settings.json only supports remote sources (GitHub, Git). Local paths must be added via CLI commands.

#### User Projects (Production)

```
my-saas-app/  (User's project)
├── .claude/
│   └── settings.json              # GitHub remote reference
├── .specweave/
│   └── increments/
└── src/
```

**Settings.json for users** (.claude/settings.json):
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",
        "path": ".claude-plugin"
      }
    }
  }
}
```

**Key Differences**:
- ✅ **Development**: Local `.claude-plugin/` and `plugins/` in repo (for editing)
- ✅ **Production**: GitHub reference only (no local plugin copies)
- ✅ **Development**: Use CLI `/plugin marketplace add ./.claude-plugin` (settings.json cannot reference local paths)
- ✅ **Production**: Use GitHub object in settings.json: `{"source": {"source": "github", ...}}`

No per-project installation needed!

---

## Project Architecture

### Source of Truth Principle

**CRITICAL**: SpecWeave follows a strict source-of-truth pattern:

```
src/                            ← SOURCE OF TRUTH (TypeScript code only)
├── core/                       ← Core framework logic (TypeScript utilities)
│   ├── plugin-loader.ts
│   ├── config-manager.ts
│   ├── types/                  ← TypeScript type definitions
│   └── schemas/                ← JSON schemas
├── cli/                        ← CLI commands
├── hooks/                      ← TypeScript utilities for hooks
│   └── lib/                    ← Hook helper functions
├── adapters/                   ← Tool adapters (legacy)
├── templates/                  ← Templates for user projects
└── utils/                      ← Utility functions

plugins/                        ← ROOT: All plugins (version controlled)
├── specweave/             ← CORE PLUGIN (framework essentials)
│   ├── .claude-plugin/         ← plugin.json (Claude native)
│   ├── skills/                 ← Core skills (9 total)
│   │   ├── spec-generator/
│   │   ├── increment-planner/
│   │   ├── tdd-workflow/
│   │   └── ...
│   ├── agents/                 ← Core agents (3 core + 19 specialized)
│   │   ├── pm/
│   │   ├── architect/
│   │   ├── tech-lead/
│   │   └── ...
│   ├── commands/               ← Core commands (7 core + 15 specialized)
│   │   ├── inc.md
│   │   ├── do.md
│   │   └── ...
│   ├── hooks/                  ← Lifecycle hooks (8 total)
│   │   ├── post-task-completion.sh
│   │   ├── pre-implementation.sh
│   │   └── ...
│   └── lib/                    ← TypeScript utilities (optional)
│
└── specweave-{name}/           ← Other plugins (GitHub, Figma, etc.)
    ├── .claude-plugin/         ← plugin.json (Claude native)
    ├── skills/                 ← Plugin skills
    ├── agents/                 ← Plugin agents
    ├── commands/               ← Plugin commands
    └── lib/                    ← TypeScript utilities (optional)

.claude/                        ← INSTALLED (gitignored in user projects)
├── agents/                     ← Installed from plugins/*/agents/
├── commands/                   ← Installed from plugins/*/commands/
├── hooks/                      ← Installed from plugins/*/hooks/
└── skills/                     ← Installed from plugins/*/skills/

.specweave/                     ← FRAMEWORK DATA (always present)
├── increments/                 ← Feature development
├── docs/                       ← Strategic documentation
└── logs/                       ← Logs and execution history
```

**Rules**:
- ✅ `src/` = TypeScript code ONLY (compiled to `dist/`)
- ✅ ALL skills/agents/commands/hooks = Inside `plugins/` (including core!)
- ✅ `plugins/specweave/` = Core framework plugin (always loaded)
- ✅ `.claude/` = Plugin settings only (settings.json references marketplace)
- ❌ NEVER mix `*.ts` and `SKILL.md` in the same directory
- ❌ NEVER create new files in project root (use increment folders)

**Key Architectural Principle**:
- TypeScript code (`*.ts`) goes in `src/` → compiled to `dist/`
- Claude-native files (`SKILL.md`, `AGENT.md`, `*.md`) stay in `plugins/` → loaded directly by Claude Code
- Even "core" framework components are in `plugins/specweave/` (everything is a plugin!)
- This separation ensures clean builds and prevents mixing compiled code with runtime files

### Tech Stack

**Core**:
- TypeScript 5.x (strict mode)
- Node.js 18+ (ESM + CommonJS)
- Commander.js (CLI framework)
- Inquirer.js (interactive prompts)
- fs-extra (file operations)

**Testing**:
- Playwright (E2E browser tests)
- Jest (unit + integration tests)
- ts-jest (TypeScript support)

**Documentation**:
- Docusaurus 3.x (docs-site/)
- Mermaid diagrams (architecture visualization)
- Markdown (all docs)

**Distribution**:
- NPM package (`npm publish`)
- Install script (`install.sh`)

---

## Directory Structure

```
specweave/
├── src/                        # SOURCE OF TRUTH (TypeScript code ONLY)
│   ├── cli/                    # CLI commands (init, version)
│   │   └── commands/
│   │       └── init.ts         # Main installation logic
│   ├── core/                   # Core framework logic (TypeScript only)
│   │   ├── plugin-loader.ts    # Load plugins from disk
│   │   ├── plugin-manager.ts   # Plugin lifecycle management
│   │   ├── plugin-detector.ts  # Auto-detect plugins (4 phases)
│   │   ├── config-manager.ts   # Config loading/validation
│   │   ├── types/
│   │   │   └── plugin.ts       # Plugin type definitions
│   │   └── schemas/
│   │       ├── plugin-manifest.schema.json
│   │       └── specweave-config.schema.json
│   ├── hooks/                  # TypeScript utilities for hooks
│   │   └── lib/                # Hook helper functions
│   ├── adapters/               # Tool adapters (legacy)
│   │   ├── adapter-interface.ts
│   │   ├── adapter-base.ts
│   │   ├── claude/
│   │   ├── cursor/ (legacy)
│   │   └── generic/ (legacy)
│   ├── templates/              # User project templates
│   │   ├── CLAUDE.md.template
│   │   ├── AGENTS.md.template
│   │   └── ...
│   └── utils/                  # Utility functions
│
├── plugins/                    # ALL PLUGINS (root level)
│   ├── specweave/         # CORE PLUGIN (framework essentials)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json     # Claude native manifest
│   │   ├── skills/             # Core skills (9 total)
│   │   │   ├── spec-generator/         # Specification generation for increments
│   │   │   ├── increment-planner/      # Increment planning and spec generation
│   │   │   ├── context-loader/         # Context loading optimization
│   │   │   ├── tdd-workflow/           # Test-driven development workflow
│   │   │   ├── project-kickstarter/    # New project bootstrapping
│   │   │   ├── brownfield-analyzer/    # Existing codebase analysis
│   │   │   ├── brownfield-onboarder/   # Brownfield project onboarding
│   │   │   ├── increment-quality-judge/# Quality assessment
│   │   │   └── context-optimizer/      # Context optimization
│   │   ├── agents/             # Core agents (22 total)
│   │   │   ├── pm/             # Product Manager agent
│   │   │   ├── architect/      # System Architect agent
│   │   │   ├── tech-lead/      # Tech Lead agent
│   │   │   └── ...
│   │   ├── commands/           # Core commands (22 total)
│   │   │   ├── inc.md        # /specweave:inc
│   │   │   ├── do.md         # /specweave:do
│   │   │   ├── done.md       # /specweave:done
│   │   │   └── ...
│   │   ├── hooks/              # Lifecycle hooks (8 total)
│   │   │   ├── post-task-completion.sh # Auto-runs after tasks complete
│   │   │   ├── pre-implementation.sh   # Pre-task validation
│   │   │   └── ...
│   │   └── lib/                # TypeScript utilities (optional)
│   │
│   ├── specweave-github/       # GitHub Issues integration
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json     # Claude native manifest
│   │   ├── skills/
│   │   │   ├── github-sync/
│   │   │   └── github-issue-tracker/
│   │   ├── agents/
│   │   │   └── github-manager/
│   │   ├── commands/
│   │   │   ├── github-create-issue.md
│   │   │   ├── github-sync.md
│   │   │   └── ...
│   │   └── lib/                # TypeScript utilities
│   ├── specweave-figma/        # Figma design sync
│   ├── specweave-infrastructure/ # K8s, Helm, Terraform
│   └── ... (18 plugins total)
│
├── .claude-plugin/             # Claude Code marketplace (root level)
│   ├── marketplace.json        # Plugin catalog (18 plugins)
│   └── README.md               # Marketplace documentation
│
├── .claude/                    # Pre-installed for SpecWeave dev
│   ├── agents/                 # Installed from plugins/*/agents/
│   ├── commands/               # Installed from plugins/*/commands/
│   ├── hooks/                  # Installed from plugins/*/hooks/
│   └── skills/                 # Installed from plugins/*/skills/
│
├── .specweave/                 # SpecWeave's own increments
│   ├── increments/
│   │   ├── 0001-core-framework/
│   │   ├── 0002-core-enhancements/
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   ├── tasks.md        # Tasks with embedded tests (v0.7.0+)
│   │   │   ├── logs/           # ✅ Session logs go here
│   │   │   ├── scripts/        # ✅ Helper scripts
│   │   │   └── reports/        # ✅ Analysis files
│   │   └── _backlog/
│   ├── docs/
│   │   ├── internal/           # Strategic docs (NEVER published) - 6 core folders
│   │   │   ├── strategy/       # Business rationale, vision, PRDs, OKRs
│   │   │   ├── rfc/            # Feature specifications (detailed requirements, project history)
│   │   │   │   └── rfc-####-{name}.md  # User stories, AC, implementation plans
│   │   │   ├── architecture/   # Technical design (HLD, LLD, ADR, diagrams)
│   │   │   │   ├── adr/        # Architecture Decision Records (why we chose X over Y)
│   │   │   │   └── diagrams/   # Mermaid + SVG (C4 model diagrams)
│   │   │   ├── delivery/       # Build & release processes (roadmap, DORA, branching)
│   │   │   ├── operations/     # Production operations (runbooks, SLOs, incidents)
│   │   │   └── governance/     # Policies (security, compliance, coding standards)
│   │   └── public/             # User-facing docs (can publish)
│   │       ├── guides/
│   │       └── api/
│   └── logs/
│
├── tests/
│   ├── e2e/                    # Playwright E2E tests
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   └── specs/                  # Test specifications
│
├── bin/                        # Installation scripts
│   ├── install-all.sh
│   ├── install-skills.sh
│   └── install-agents.sh
│
├── scripts/                    # Build/deployment scripts
│   ├── install-brownfield.sh
│   └── generate-diagram-svgs.sh
│
├── docs-site/                  # Docusaurus documentation site
│
├── CLAUDE.md                   # This file (for contributors)
├── README.md                   # GitHub README (for users)
├── CHANGELOG.md                # Version history
├── package.json                # NPM package definition
└── tsconfig.json               # TypeScript configuration
```

---

## File Organization Rules

### ✅ ALLOWED in Root

- `CLAUDE.md` (this file)
- `README.md`, `CHANGELOG.md`, `LICENSE`
- Standard config files (`package.json`, `tsconfig.json`, `.gitignore`)
- Build artifacts (`dist/`, only if needed temporarily)

### ❌ NEVER Create in Root (Pollutes Repository)

**See comprehensive rules at top of document**: [🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!](#-critical-never-pollute-project-root)

**Quick summary**:
- ✅ ALL AI-generated files → increment folders (`.specweave/increments/####/reports/`, `logs/`, `scripts/`)
- ✅ Architecture decisions → `.specweave/docs/internal/architecture/adr/`
- ❌ NEVER create `.md` files, scripts, or logs in project root
- ❌ Build artifacts (`.tgz`, `.pt`, etc.) → add to `.gitignore`

### Runtime Artifacts (NOT Source Controlled)

**Logs and ephemeral files** should NEVER be committed:

```
❌ NEVER COMMIT:
.specweave/logs/                        # Framework runtime logs
.specweave/logs/last-hook-fire          # Hook execution timestamps
.specweave/increments/*/logs/           # Increment execution logs
.specweave/cache/                       # Temporary cache
*.tmp                                   # Temporary files
```

**Why?**
- ✅ Logs are execution artifacts, not source code
- ✅ They change on every run (noise in git history)
- ✅ They cause unnecessary merge conflicts
- ✅ They bloat the repository over time
- ✅ They're developer-specific, not shared state

**Enforcement**: `.gitignore` excludes these patterns automatically.

---

## Internal Documentation Structure

**Location**: `.specweave/docs/internal/` - Six core folders for engineering playbook

**Quick Reference**:

| Folder | Purpose | Use When | Examples |
|--------|---------|----------|----------|
| **strategy/** | Business rationale (Why?) | Defining business case for features | `prd-user-auth.md` |
| **specs/** | Feature specifications (What?) | Detailed requirements with user stories | `spec-0007-smart-discipline.md` |
| **architecture/** | Technical design (How?) | System architecture, decisions | `hld-system.md`, `adr/0001-postgres.md` |
| **delivery/** | Build & release (How we build) | Git workflow, DORA metrics, CI/CD | `branch-strategy.md`, `dora-metrics.md` |
| **operations/** | Production ops (How we run) | Runbooks, incidents, performance | `runbook-api.md`, `performance-tuning.md` |
| **governance/** | Policies (Guardrails) | Security, compliance, coding standards | `security-policy.md`, `coding-standards.md` |

**Document Flow**: `PRD → Spec → Architecture → Delivery → Operations`

**See**: [Internal Docs README](.specweave/docs/internal/README.md) for complete guidance

---

## Specs Architecture: Two Locations Explained

**CRITICAL ARCHITECTURAL CONCEPT**: SpecWeave uses specs in TWO locations for different purposes. Understanding this distinction is essential.

### The Core Question: Why Two Locations?

1. **Living Docs Specs**: `.specweave/docs/internal/specs/spec-####-name/spec.md` - **Permanent knowledge base**
2. **Increment Specs**: `.specweave/increments/####-name/spec.md` - **Temporary implementation snapshot**

### The Answer: Permanent vs Temporary

**Living Docs Specs = Permanent Knowledge Base**

- **Location**: `.specweave/docs/internal/specs/spec-0005-authentication/spec.md`
- **Purpose**: COMPLETE, PERMANENT source of truth
- **Lifecycle**: Created once, updated over time, NEVER deleted
- **Scope**: Comprehensive (entire feature, 20 user stories)
- **Contains**:
  - ✅ ALL user stories (US-001, US-002, ..., US-020)
  - ✅ ALL acceptance criteria (AC-US1-01, AC-US1-02, ...)
  - ✅ ALL functional requirements (FR-001, FR-002, ...)
  - ✅ Links to brownfield documentation (existing project docs)
  - ✅ External PM tool links (Jira epic, ADO work item, GitHub milestone)
  - ✅ Architecture decisions rationale
  - ✅ Success criteria & metrics

**Increment Specs = Implementation Snapshot**

- **Location**: `.specweave/increments/0007-basic-login/spec.md`
- **Purpose**: TEMPORARY implementation reference
- **Lifecycle**: Created per increment, can be deleted after completion
- **Scope**: Focused subset (3 user stories for this increment only)
- **Contains**:
  - ✅ Reference to living docs: `"See: SPEC-0005-authentication"`
  - ✅ Subset of user stories: `"Implements: US-001, US-002, US-003 only"`
  - ✅ What's being implemented RIGHT NOW
  - ✅ Out of scope: Lists what's NOT in this increment

### Real-World Example: Authentication Feature

**Living Docs Spec** (Permanent):
```
File: .specweave/docs/internal/specs/spec-0005-authentication/spec.md

# SPEC-0005: User Authentication System
Complete authentication system with OAuth2, JWT, 2FA, session management

## User Stories (20 total)
- US-001: Basic Login (P1) ← Increment 0007
- US-002: Password Reset (P1) ← Increment 0007
- US-010: OAuth2 Integration (P2) ← Increment 0012
- US-018: Two-Factor Authentication (P2) ← Increment 0018
... (16 more stories)

## Brownfield Integration
- See: /docs/legacy/auth-system-v1.md (current system)

## External References
- Jira: AUTH-123 (stakeholder epic)
```

**Increment 1: Basic Login** (Temporary):
```
File: .specweave/increments/0007-basic-login/spec.md

# Increment 0007: Basic Login
**Implements**: SPEC-0005-authentication (US-001 to US-003 only)
**Complete Specification**: See ../../docs/internal/specs/spec-0005-authentication/

## What We're Implementing (This Increment)
- US-001: Basic Login ✅
- US-002: Password Reset ✅
- US-003: Session Management ✅

## Out of Scope (For This Increment)
- ❌ OAuth2 integration (US-010) → Increment 0012
- ❌ 2FA (US-018) → Increment 0018
```

**Increment 2: OAuth Integration** (Temporary):
```
File: .specweave/increments/0012-oauth-integration/spec.md

# Increment 0012: OAuth2 Integration
**Implements**: SPEC-0005-authentication (US-010 to US-012 only)
**Complete Specification**: See ../../docs/internal/specs/spec-0005-authentication/

## Dependencies
- Requires: Increment 0007 (basic login infrastructure)
```

### Key Benefits

**Why This Architecture?**

1. **Permanent Knowledge Base**: Living docs = long-term memory. Answer: "How did we build authentication?"
2. **Focused Implementation**: Increment specs = short-term focus. Answer: "What am I building RIGHT NOW?"
3. **Brownfield Integration**: Living docs link to existing project documentation, increment specs don't need this complexity
4. **Clean After Completion**: Delete increment specs (optional), living docs remain as knowledge base
5. **External PM Tool Integration**: Jira epic → Living docs spec (permanent link), increment specs don't need external links

### When to Use Which?

**Create Living Docs Spec When**:
- ✅ Planning a major feature (authentication, payments, messaging)
- ✅ Feature spans multiple increments (will take weeks/months)
- ✅ Need brownfield integration (link to existing project docs)
- ✅ Want permanent historical record (how did we build this?)
- ✅ Need external PM tool link (Jira epic, ADO feature, GitHub milestone)

**Create Increment Spec When**:
- ✅ Starting implementation of one increment
- ✅ Want quick reference (what am I building right now?)
- ✅ Need focused scope (just 3 user stories, not 20)

### Comparison Table

| Aspect | Living Docs Specs | Increment Specs |
|--------|------------------|----------------|
| **Location** | `.specweave/docs/internal/specs/` | `.specweave/increments/####/` |
| **Lifecycle** | ✅ Permanent (never deleted) | ⏳ Temporary (optional deletion) |
| **Scope** | 📚 Complete feature (20 US) | 🎯 Focused subset (3 US) |
| **Size** | 500+ lines (comprehensive) | 50-100 lines (focused) |
| **Purpose** | Knowledge base + history | Implementation tracker |
| **Coverage** | ALL user stories | SUBSET of user stories |
| **Brownfield** | ✅ Links to existing docs | ❌ Rarely needed |
| **External Links** | ✅ Jira, ADO, GitHub | ❌ Rarely needed |
| **Multiple Increments** | ✅ One spec → many increments | ❌ One increment → one spec |
| **After Completion** | ✅ Remains forever | ⚠️ Can be deleted |

### Analogy: Wikipedia vs Sticky Notes

- **Living Docs Specs** = 📚 Wikipedia Article (permanent, comprehensive, updated over time)
- **Increment Specs** = 📝 Sticky Note Reminder (temporary, focused, disposable after done)

### Typical Workflow

**Phase 1: Planning** (PM Agent)
```
User: "I want to build authentication with OAuth and 2FA"
PM Agent:
1. Creates living docs spec:
   → .specweave/docs/internal/specs/spec-0005-authentication/spec.md
   → Contains ALL 20 user stories (comprehensive)
   → Links to brownfield docs
   → Linked to Jira epic AUTH-123
```

**Phase 2: Increment 1** (Basic Login)
```
User: "/specweave:inc 0007-basic-login"
PM Agent:
1. Creates increment spec:
   → .specweave/increments/0007-basic-login/spec.md
   → References living docs: "See SPEC-0005"
   → Contains ONLY US-001 to US-003 (focused)
2. Implementation happens...
3. Increment completes ✅
4. Increment spec can be deleted (optional)
```

**Phase 3: Increment 2** (OAuth)
```
User: "/specweave:inc 0012-oauth-integration"
PM Agent:
1. Creates increment spec:
   → .specweave/increments/0012-oauth-integration/spec.md
   → References SAME living docs: "See SPEC-0005"
   → Contains ONLY US-010 to US-012 (focused)
2. Implementation happens...
3. Increment completes ✅
```

**Phase 4: All Done!**
```
After ALL increments complete (0007, 0012, 0018):
- ✅ Living docs spec REMAINS (.specweave/docs/internal/specs/spec-0005-authentication/)
- ⏳ Increment specs can be deleted (optional)
- ✅ Historical record preserved (living docs)
- ✅ Jira epic AUTH-123 remains linked to living docs
```

### Relationship

**One living docs spec → Many increment specs**

```
spec-0005-authentication (Living Docs - Permanent)
├── 0007-basic-login (Increment - Temporary)
├── 0012-oauth-integration (Increment - Temporary)
└── 0018-two-factor-auth (Increment - Temporary)
```

### Summary

**Two Locations, Two Purposes**:

1. **Living Docs Specs** (`.specweave/docs/internal/specs/`):
   - ✅ Permanent knowledge base
   - ✅ Complete feature specification
   - ✅ Links to brownfield docs
   - ✅ External PM tool integration
   - ✅ Spans multiple increments

2. **Increment Specs** (`.specweave/increments/####/`):
   - ⏳ Temporary implementation tracker
   - 🎯 Focused subset of work
   - 📝 Quick reference: "What am I building?"
   - 🗑️ Can be deleted after completion

**Result**: Clean, focused implementation + permanent knowledge base

**For comprehensive explanation**: See [SPECS-ARCHITECTURE-CLARIFICATION.md](.specweave/increments/0007-smart-increment-discipline/reports/SPECS-ARCHITECTURE-CLARIFICATION.md)

---

## Living Completion Reports

### The Problem with Traditional Reports

**Traditional approach** (report written at the end):
```
Start increment: Plan 10 user stories
During work: Scope changes 5 times (not documented)
End increment: Write report "Completed 8/10 stories"
Future: "Why was Story 5 removed?" → No one remembers!
```

**Problems**:
- ❌ No audit trail for scope changes
- ❌ Decision rationale lost
- ❌ Difficult for onboarding/compliance
- ❌ Can't learn from past iterations

### Living Reports Solution

**SpecWeave approach** (report updated in real-time):
```
Start: Initialize completion report (v1.0)
During work:
  - 2025-11-06: Added US6 (dark mode) → /update-scope → v1.1
  - 2025-11-07: Deferred US3 (CSV export) → /update-scope → v1.2
  - 2025-11-08: WebSockets → Polling pivot → /update-scope → v1.3
End: Finalize report with complete scope evolution history
Future: "Why was Story 5 removed?" → Check report, find exact reason with WHO approved and WHY!
```

**Benefits**:
- ✅ Complete audit trail (every scope change documented)
- ✅ Real-time context (captured when decision is fresh)
- ✅ Regulatory compliance (explains deviations from plan)
- ✅ Learning for future increments
- ✅ Onboarding new team members (understand project history)

### Report Structure

**Location**: `.specweave/increments/{id}/reports/COMPLETION-REPORT.md`

**Sections**:
1. **Original Scope**: What was planned at increment start
2. **Scope Evolution**: Living log of changes (updated during increment)
3. **Final Delivery**: What was actually delivered
4. **What Changed and Why**: Rationale for scope changes
5. **Lessons Learned**: What we learned for next time
6. **Metrics**: Velocity, scope creep, test coverage, defects

### Workflow

**1. Initialize Report** (automatic when increment created):
```bash
/specweave:inc "User dashboard"
# Creates: .specweave/increments/0008-user-dashboard/reports/COMPLETION-REPORT.md (v1.0)
```

**2. Update During Work** (whenever scope changes):
```bash
# Quick log
/specweave:update-scope "Added dark mode toggle (stakeholder request from CMO, +16 hours)"

# Or interactive
/specweave:update-scope
# Prompts:
#   - What changed? (Added/Removed/Modified)
#   - Why? (Business reason, technical blocker, etc.)
#   - Impact? (+/- hours)
#   - Who approved? (PM, stakeholder, etc.)
#   - Documentation? (ADR, GitHub issue, etc.)
```

**3. Finalize at Completion** (via `/specweave:done`):
```bash
/specweave:done 0008
# Validates report completeness
# Prompts to fill any missing sections
# Marks increment as complete
```

### Example Entry

```markdown
## Scope Evolution (Living Updates)

### 2025-11-06: Added user story

**Changed**: US6: Dark mode toggle
**Reason**: Stakeholder request from CMO (high priority, blocks marketing launch)
**Impact**: +16 hours
**Decision**: PM + CMO
**Documentation**: GitHub issue #45

---

### 2025-11-07: Removed/deferred user story

**Changed**: US3: Data export to CSV
**Reason**: Not critical for MVP, can be added later without breaking changes
**Impact**: -8 hours (deferred to increment 0009)
**Decision**: PM
**Documentation**: None

---

### 2025-11-08: Technical pivot (architecture change)

**Changed**: WebSockets → Long-polling
**Reason**: WebSocket library had critical security vulnerability (CVE-2025-1234)
**Impact**: -4 hours (simpler implementation)
**Decision**: Architect + Security Lead
**Documentation**: ADR-008: Why We Chose Polling Over WebSockets

---
```

### When to Update

✅ **DO update** when:
- Adding new user story or task
- Removing/deferring work
- Modifying scope of existing story
- Making architecture pivots (technical decisions)
- Reducing/expanding scope
- Blocking issues discovered

❌ **DON'T update** for:
- Bug fixes discovered during implementation (normal)
- Minor implementation details
- Code refactoring (unless scope-affecting)

### Best Practices

1. **Update in real-time**: Don't batch updates (capture context while fresh)
2. **Be specific**: "Added US6: Dark mode" not "Added feature"
3. **Include rationale**: Always answer WHY
4. **Link to docs**: ADR, GitHub issue, Jira ticket
5. **Track approvals**: Who made the decision
6. **Quantify impact**: +/- hours for scope changes

### Commands

| Command | Purpose |
|---------|---------|
| `/specweave:inc "feature"` | Creates increment with initial completion report |
| `/specweave:update-scope` | Log scope change during increment |
| `/specweave:done <id>` | Finalize report and mark increment complete |

**See**: [update-scope.md](plugins/specweave/commands/update-scope.md) for detailed documentation

---

## Development Workflow

### Making Changes

**ALL components belong to plugins** (following [Claude Code's plugin system](https://docs.claude.com/en/docs/claude-code/plugins)).

**1. Editing Skills** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/skills/spec-generator/SKILL.md

# Other plugins (opt-in):
vim plugins/specweave-github/skills/github-sync/SKILL.md

# Skills auto-activate based on description keywords
```

**2. Editing Agents** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/agents/pm/AGENT.md

# Other plugins (opt-in):
vim plugins/specweave-github/agents/github-manager/AGENT.md

# Test by invoking via Task tool
```

**3. Editing Commands** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/commands/do.md

# Other plugins (opt-in):
vim plugins/specweave-github/commands/github-sync.md

# Test via /command-name
```

**4. Creating New Plugins** (see "Plugins" section below for complete instructions)

**5. Editing Framework Code** (`src/core/`, `src/cli/`):
```bash
# Edit TypeScript (config manager, plugin loader, etc.)
vim src/core/config-manager.ts

# Build and test
npm run build && npm test
```

### Testing Strategy

**Four Levels of Testing** (mirroring SpecWeave's philosophy):

1. **Specification Tests** (`.specweave/docs/internal/strategy/`)
   - Acceptance criteria in PRDs
   - Manual validation

2. **Embedded Tests** (`.specweave/increments/####/tasks.md`)
   - Test plans embedded in tasks (BDD format, v0.7.0+)
   - AC-ID traceability (AC-US1-01, AC-US1-02, etc.)

3. **Integration Tests** (`tests/integration/{skill-name}/`)
   - Tests for plugin and skill functionality
   - Tool sync (github, ado, jira)
   - Brownfield detection and other integrations
   - Run via: `npm run test:integration`

4. **Code Tests** (`tests/`)
   - **E2E (Playwright)**: MANDATORY for UI features
     - `tests/e2e/specweave-smoke.spec.ts`
     - Run: `npm run test:e2e`
   - **Integration**: Tool sync, brownfield detection
     - `tests/integration/`
     - Run: `npm run test:integration`
   - **Unit**: Core logic, config parsing
     - `tests/unit/`
     - Run: `npm test`

**Coverage Requirements**:
- Critical paths: 90%+
- Overall: 80%+
- Tests MUST tell the truth (no false positives)

### Hooks and Automation

**Post-Task Completion Hook** (`.claude/hooks/post-task-completion.sh`):

**Smart Session-End Detection**:
- ✅ Tracks inactivity gaps between TodoWrite calls
- ✅ Only plays sound when session is TRULY ending (15s+ inactivity after all tasks complete)
- ✅ Skips sound during rapid work (Claude creating multiple todo lists)
- ✅ Enhanced logging with decision reasoning in `.specweave/logs/hooks-debug.log`
- ✅ Debouncing prevents duplicate hook fires

**How It Works**:
```
Problem: Claude creates multiple todo lists in one conversation
- List 1: [A, B, C] → completes → sound plays ❌
- List 2: [D, E] → completes 30s later → sound plays again ❌
- User hears sounds while Claude is still working!

Solution: Inactivity-based detection
- 10:00:00 - Task done (gap: 5s) → skip sound
- 10:00:05 - Task done (gap: 5s) → skip sound
- 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
- ... (15+ seconds pass)
- 10:01:00 - All done (gap: 50s) → PLAY SOUND! ✅ (session ending)
```

**Configuration** (`src/hooks/post-task-completion.sh`):
- `INACTIVITY_THRESHOLD=15` - Seconds of inactivity to assume session ending (adjustable)
- `DEBOUNCE_SECONDS=2` - Prevents duplicate hook fires

**Manual Actions** (Claude MUST do after each task):
- Update `CLAUDE.md` when structure changes
- Update `README.md` for user-facing changes
- Update `CHANGELOG.md` for API changes

**Living Docs Sync** (after `/specweave:do` completes):
- Run `/specweave:sync-docs update`
- Updates `.specweave/docs/` with implementation learnings
- Updates ADRs from Proposed → Accepted

---

## Plugins

**SpecWeave is built 100% on [Claude Code's native plugin system](https://docs.claude.com/en/docs/claude-code/plugins)**.

### Architecture: Everything is a Plugin

**Critical Understanding**: SpecWeave doesn't have a "core framework" separate from plugins. Instead:

```
SpecWeave = Collection of Claude Code Plugins
├── specweave (auto-loaded) ← The "framework" IS a plugin
├── specweave-github (opt-in)
├── specweave-figma (opt-in)
└── ...all other plugins (opt-in)
```

**What this means**:
- ✅ `specweave` is a Claude Code plugin (happens to auto-load)
- ✅ All plugins follow identical structure (`.claude-plugin/plugin.json`, `skills/`, `agents/`, `commands/`)
- ✅ Adding a skill = adding it to a plugin (always)
- ❌ There are NO "core framework components" outside plugins

**Why this matters**:
- Uniform architecture (no special cases)
- All plugins discoverable via Claude Code's plugin system
- Easy to extend (just add another plugin)
- Future-proof (follows Anthropic's standards)

**Further reading**:
- 📖 [Claude Code Plugin Docs](https://docs.claude.com/en/docs/claude-code/plugins)
- 📖 [Plugin Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- 📖 [Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)

### Available SpecWeave Plugins

**Location**: `plugins/` (root level)

**Discovery**:
- Browse all plugins: `ls plugins/` or check [.claude-plugin/marketplace.json](/.claude-plugin/marketplace.json)
- Live catalog: See `.claude-plugin/README.md` for current marketplace contents
- Auto-detection during `specweave init` suggests relevant plugins

**Plugin Structure** (all follow same pattern):
```
plugins/specweave-{name}/
├── .claude-plugin/plugin.json  # Claude native manifest
├── skills/                     # Auto-activating capabilities (SKILL.md files)
├── agents/                     # Specialized AI agents (AGENT.md files)
├── commands/                   # Slash commands (.md files)
└── lib/                        # TypeScript utilities (optional)
```

**Key Plugins** (for reference):
- `specweave` - Framework essentials (always loaded)
- `specweave-github` - GitHub Issues integration
- `specweave-{frontend|backend|infrastructure}` - Tech stack plugins

**For complete list**: Check `plugins/` directory or marketplace.json

### Plugin Decision Tree

**Key Insight**: In Claude Code's plugin system, EVERYTHING is a plugin. The only question is: **Which plugin does this belong to?**

**Decision**: Which plugin should contain this feature?

```
Is this feature...
├─ Used by EVERY project? → specweave (auto-loaded)
│  Examples: increment-planner, spec-generator, tdd-workflow, PM/Architect agents
│
├─ Part of increment lifecycle? → specweave (auto-loaded)
│  Examples: /specweave:inc, /specweave:do, living docs hooks
│
├─ Tech stack specific? → New plugin: specweave-{stack}
│  Examples: specweave-frontend (React, Next.js), specweave-kubernetes
│
├─ Domain expertise? → New plugin: specweave-{domain}
│  Examples: specweave-ml (TensorFlow), specweave-payments (Stripe)
│
├─ External integration? → New plugin: specweave-{tool}
│  Examples: specweave-github, specweave-jira, specweave-figma
│
└─ Optional enhancement? → New plugin: specweave-{feature}
   Examples: specweave-diagrams, specweave-cost-optimizer
```

**Plugin Structure** (all follow Claude Code's standard):
```
plugins/specweave-{name}/
├── .claude-plugin/plugin.json  # Required
├── skills/                     # Optional
├── agents/                     # Optional
├── commands/                   # Optional
└── hooks/                      # Optional
```

**Result**: Core plugin stayed at ~12K tokens (75% smaller than v0.3.7!)

### Adding a New Plugin (Contributors)

**Create New Plugin**:
```bash
# 1. Create plugin structure
mkdir -p plugins/specweave-myplugin/{.claude-plugin,skills,agents,commands,lib}

# 2. Create plugin.json (Claude native format)
cat > plugins/specweave-myplugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "specweave-myplugin",
  "description": "What it does and when to use it",
  "version": "1.0.0",
  "author": {"name": "Your Name"}
}
EOF

# 3. Add components (see Claude docs for format):
# - skills/my-skill/SKILL.md
# - agents/my-agent/AGENT.md
# - commands/my-command.md
# - lib/my-utility.ts (optional)

# 4. Add to marketplace
vim .claude-plugin/marketplace.json
# Add entry:
# {
#   "name": "specweave-myplugin",
#   "description": "What it does and when to use it",
#   "source": "../plugins/specweave-myplugin"
# }

# 5. Test locally
/plugin marketplace add ./.claude-plugin
/plugin install myplugin@marketplace
```

**See**: [.claude-plugin/README.md](/.claude-plugin/README.md) for marketplace documentation

---

## Key SpecWeave Principles (for Contributors)

### 1. Source of Truth Discipline
- `src/` is ALWAYS the source of truth
- `.claude/` is ALWAYS installed/generated (never edit directly)
- Keep root folder clean (use increment folders)

### 2. Documentation = Code
- All changes must update relevant documentation
- ADRs for architecture decisions
- RFCs for feature proposals
- Inline code comments for complex logic

### 3. Testing is Non-Negotiable
- E2E tests MANDATORY for UI features (Playwright)
- 80%+ coverage for critical paths
- Tests must tell the truth (no false positives)

### 4. Incremental Development
- Work in small, measurable increments
- Use SpecWeave's own workflow (`/specweave:inc`, `/specweave:do`, etc.)
- All work traces back to specs

### 5. Adapter-First Design
- Core framework must be tool-agnostic
- Tool-specific features in adapters only
- Plain Markdown + YAML = maximum portability

---

## Release Process

### Versioning Strategy

**IMPORTANT**: SpecWeave follows semantic versioning (semver), but version bumps are **MANUAL** and controlled:

**The Rules**:
- ✅ **Patch version** (0.7.X) - Increment ONLY when explicitly requested by maintainer
- ✅ **Minor version** (0.X.0) - Increment ONLY when maintainer says to
- ✅ **Major version** (X.0.0) - Increment ONLY when maintainer says to
- ❌ **NEVER auto-increment** versions after each increment completion

**Why Manual Control?**
- Multiple increments may be part of the same release (e.g., 0.7.0 = increments 0006 + 0007 + 0008)
- Version bumps signal user-facing releases, not internal development progress
- Maintainer decides when features are ready to ship
- Prevents version number inflation (e.g., jumping from 0.7.0 to 0.12.0 in one day)

**When Completing Increments**:
```bash
# ❌ WRONG - Don't auto-bump version
git commit -m "feat: complete increment 0008"
npm version patch  # ❌ NO! Wait for maintainer approval

# ✅ CORRECT - Just commit the work
git commit -m "feat: complete increment 0008"
# Version stays at 0.7.0 until maintainer says to bump
```

**When Maintainer Requests Version Bump**:
```bash
# Maintainer says: "Bump to 0.7.1"
npm version patch  # ✅ Now bump
npm publish        # ✅ And publish

# Maintainer says: "Bump to 0.8.0"
npm version minor  # ✅ New minor version
npm publish
```

**Summary**: Complete increments → commit code → maintainer decides when to bump version and publish.

---

### NPM Publishing

**NPM Publishing**:
```bash
# 1. Update version (ONLY when maintainer requests)
npm version patch|minor|major

# 2. Update CHANGELOG.md
vim CHANGELOG.md

# 3. Build and test
npm run build
npm test
npm run test:e2e

# 4. Publish to NPM
npm publish

# 5. Tag and push
git push origin develop --tags
```

**Installation Methods**:
1. **NPM**: `npm install -g specweave`
2. **Script**: `curl -fsSL https://spec-weave.com/install.sh | bash`
3. **Manual**: Clone repo, `npm install`, `npm run build`

---

## Adapter System (Legacy)

**SpecWeave is Claude Code-first** - The framework is designed specifically for Claude Code's native capabilities.

**Primary Tool**:
- ✅ **Claude Code** - Native support (slash commands, agents, skills, hooks, MCP)

**Legacy Multi-Tool Support** (may be removed):
- ⚠️  Cursor (via `.cursorrules` + AGENTS.md compilation)
- ⚠️  Generic (via AGENTS.md, for Copilot/ChatGPT/Gemini/etc.)

**Why Claude-First?**
The adapter system was originally designed to support multiple tools, but this added significant complexity without meaningful benefit. Claude Code provides:
- ✅ **Native plugin marketplace** - No compilation needed
- ✅ **Auto-activating skills** - No manual @ mentions
- ✅ **Isolated agent contexts** - True role separation
- ✅ **Pre/post lifecycle hooks** - Automated living docs sync
- ✅ **MCP protocol** - Industry standard for context management

Other tools simply can't match these capabilities. The adapters remain in the codebase for now but are considered legacy and may be removed in a future version.

**See**: "Why Claude Code is Best-in-Class" section above for detailed comparison

---

## Common Tasks

### Adding Skills, Agents, or Commands

**All components go into plugins** (see "Plugins" section above for complete instructions).

**Quick reference**:
- **Core components**: `plugins/specweave/{skills|agents|commands|hooks}/`
- **Plugin components**: `plugins/specweave-{name}/{skills|agents|commands}/`
- **Tests**: `tests/integration/{component-name}/` or `tests/unit/`

**For detailed instructions**: See "Adding a New Plugin (Contributors)" section above

### Update Documentation

```bash
# Internal docs (architecture, ADRs, RFCs)
vim .specweave/docs/internal/architecture/hld-system.md

# Public docs (user-facing guides, can be published)
vim .specweave/docs/public/guides/user-guide.md
vim docs-site/docs/guides/getting-started.md

# Build docs site
cd docs-site && npm run build
```

### Translation Workflow (Multilingual Support)

**SpecWeave supports multilingual development** via post-generation translation (Increment 0006).

**Key Concept**: Users work in their native language (great UX), system auto-translates to English (maintainable docs).

**Workflow**:

```bash
# 1. User creates increment in Russian
/specweave:inc "Добавить пользовательскую аутентификацию"

# 2. PM agent generates spec.md in Russian (natural, user-friendly)

# 3. post-increment-planning hook fires automatically
#    - Detects Russian content
#    - Translates spec.md, plan.md, tasks.md to English (~$0.01 cost)
#    - Files now in English (maintainable)

# User sees:
# ✅ Increment created
# 🌐 Detected Russian content. Translating to English...
#   📄 spec.md... ✅
#   📄 plan.md... ✅
#   📄 tasks.md... ✅
# ✅ Translation complete! Cost: ~$0.01
```

**Configuration** (`.specweave/config.json`):

```json
{
  "language": "ru",
  "translation": {
    "enabled": true,
    "autoTranslateInternalDocs": true,
    "autoTranslateLivingDocs": false,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true,
    "translationModel": "haiku"
  }
}
```

**Key Settings**:
- `language`: Primary language (en, ru, es, zh, de, fr, ja, ko, pt)
- `autoTranslateInternalDocs`: Auto-translate spec/plan/tasks to English (default: true)
- `autoTranslateLivingDocs`: Auto-translate ADRs/HLDs after task completion (default: false)
- `translationModel`: Model to use (haiku/sonnet/opus, default: haiku)

**Supported Languages**:
- English (en)
- Russian (ru)
- Spanish (es)
- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

**Cost**: ~$0.01 per increment (3 files, Haiku model)

**Implementation Details**:
- Language detection: Heuristic-based (<1ms, zero cost)
- Code preservation: Never translates code blocks, inline code, or links
- Validation: Checks heading count, code block count, link count, YAML structure
- See: `.specweave/increments/0006-llm-native-i18n/reports/IMPLEMENTATION-COMPLETE.md`

**Testing Translation Utilities**:

```bash
# Run translation unit tests
npm test -- tests/unit/i18n/translation.test.ts

# Test result: 67/67 passing (100%)
```

**Files**:
- Utilities: `src/utils/translation.ts` (673 lines, 11 languages)
- CLI Script: `src/hooks/lib/translate-file.ts` (398 lines)
- Hook: `plugins/specweave/hooks/post-increment-planning.sh` (307 lines)
- Tests: `tests/unit/i18n/translation.test.ts` (705 lines, 67 tests)
- Schema: `src/core/schemas/specweave-config.schema.json`

---

## Troubleshooting

**Skills not activating?**
1. Check plugin is installed: `/plugin list --installed`
2. Verify YAML frontmatter in `plugins/{plugin}/skills/{skill}/SKILL.md`
3. Restart Claude Code
4. Check description has clear trigger keywords

**Commands not working?**
1. Check plugin is installed: `/plugin list --installed`
2. Verify command exists: `plugins/{plugin}/commands/{command}.md`
3. Check YAML frontmatter
4. Restart Claude Code

**Tests failing?**
1. Run `npm run build` first
2. Check test output for specific errors
3. Verify test data in `tests/fixtures/`
4. Check Playwright browser install: `npx playwright install`

**Root folder polluted?**
1. Identify which increment created the files
2. Move to `.specweave/increments/####/reports/`
3. Update `.gitignore` if needed

---

## Getting Help

**Documentation**:
- User docs: https://spec-weave.com
- Contributor docs: `.specweave/docs/internal/`
- Architecture: `.specweave/docs/internal/architecture/`

**Community**:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discussions: https://github.com/anton-abyzov/specweave/discussions

**Current Increment**:
- Spec: `.specweave/increments/0002-core-enhancements/spec.md`
- Plan: `.specweave/increments/0002-core-enhancements/plan.md`
- Tasks: `.specweave/increments/0002-core-enhancements/tasks.md`

---

## Quick Reference

**Commands (for SpecWeave development)**:

*Convenient short forms (use daily)*:
- `/inc "feature"` - Plan new increment
- `/do` - Execute tasks (smart resume)
- `/done 0002` - Close increment
- `/validate 0002` - Validate increment
- `/status` - Show increment status overview
- `/pause 0002 --reason="..."` - Pause active increment (system command, used by SpecWeave)
- `/resume 0002` - Resume paused increment (system command, used by SpecWeave)
- `/abandon 0002 --reason="..."` - Abandon increment
- `/validate-coverage` - Check test coverage

*Full namespace forms (explicit, avoids conflicts)*:
- `/specweave:inc "feature"` - Plan new increment
- `/specweave:do` - Execute tasks (smart resume)
- `/specweave:done 0002` - Close increment
- `/specweave:validate 0002` - Validate increment
- `/specweave:progress` - Check status
- `/specweave:sync-docs update` - Sync living docs
- `/specweave:status` - Show increment status with rich details
- `/specweave:pause` - Pause active increment (system command, used by SpecWeave)
- `/specweave:resume` - Resume paused increment (system command, used by SpecWeave)
- `/specweave:abandon` - Abandon increment
- `/specweave:validate-coverage` - Validate test coverage

**Both forms work identically** - use short forms for speed, namespace forms for clarity.

**Build & Test**:
- `npm run build` - Compile TypeScript
- `npm test` - Run unit tests (includes skill tests in `tests/unit/`, `tests/integration/`)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:integration` - Run integration tests

**File Structure**:
- Source of truth: `src/` (TypeScript) and `plugins/` (skills/agents/commands)
- Plugin settings: `.claude/settings.json` (marketplace references)
- Increments: `.specweave/increments/`
- Internal Docs: `.specweave/docs/internal/` (strategy, architecture, ADRs)
- Public Docs: `.specweave/docs/public/` and `docs-site/` (user guides, API docs)
- Tests: `tests/` (unit, integration, E2E, skill tests)

---

**Remember**:
1. Edit source files in `src/`, not `.claude/`
2. Keep root folder clean (use increment folders)
3. Test before committing (E2E + unit + integration)
4. Update docs when structure changes
5. Follow increment-based workflow

**SpecWeave Documentation**: https://spec-weave.com
**Last Updated**: 2025-11-04
