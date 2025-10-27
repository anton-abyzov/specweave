# SpecWeave E2E Smoke Tests

Validates SpecWeave framework installation and readiness for **interactive conversational development**.

## Purpose

These smoke tests verify that SpecWeave framework:

1. **Installs cleanly** in any environment
2. **Creates proper structure** (.specweave/, .claude/, config files)
3. **Installs core skills** correctly (specweave-detector, skill-router, etc.)
4. **Installs core agents** correctly (PM, Architect, DevOps, QA, etc.)
5. **Is ready for interactive use** (conversation-based development)

## ⚠️ IMPORTANT: SpecWeave Architecture

**SpecWeave is a CONVERSATIONAL framework, not a CLI code generator.**

**How it works:**
1. **Install** framework → `npx specweave init` or `./install.sh`
2. **Open** Claude Code → `code .`
3. **Describe** what you want → Natural language conversation
4. **Skills work autonomously** → specweave-detector routes to agents
5. **Complete project generated** → 10-30 minutes

**What smoke test validates:**
✅ **Step 1 (Installation)** - Framework installs correctly
❌ **Steps 2-5 (Conversation)** - Requires interactive Claude Code session

**Why Steps 2-5 aren't tested:**
- No CLI command for project generation (by design)
- Works through Claude Code conversations
- Cannot be automated via bash scripts
- Tested through actual usage

## Test Levels

### Level 1: Framework Installation Test (5 seconds) ✅ AUTOMATED

**Purpose**: Verify SpecWeave framework installation

**What it tests**:
- Clean folder → `./install.sh` → Verify structure
- `.specweave/` folder created
- Core skills installed (specweave-detector, skill-router, context-loader, etc.)
- Core agents installed (PM, Architect, DevOps, QA, etc.)
- Config file valid
- CLAUDE.md created
- Hooks installed and executable

**Run**: `./tests/smoke/e2e-smoke-test.sh` ✅ **PASSES**

**Duration**: ~5 seconds

---

### Level 2: Interactive Project Generation (10-30 minutes) ❌ MANUAL ONLY

**Purpose**: Validate project generation through conversation

**What it tests**:
- Framework detects .specweave/ automatically
- specweave-detector activates proactively
- skill-router routes requests correctly
- Agents orchestrate autonomously
- Complete project generated
- Tests exist and pass
- Build succeeds

**Run**: **Manual testing only** (requires Claude Code conversation)

**Process**:
1. `cd` to installed project
2. `code .` (open Claude Code)
3. Describe project: "Create event booking SaaS with Next.js..."
4. Wait 10-30 minutes
5. Verify generated project

**Why not automated**: SpecWeave works through Claude Code conversations, not CLI commands

---

### Level 3: Manual Acceptance Test (30 minutes) 👤 MANUAL

**Purpose**: End-to-end validation with real usage

**What it tests**:
- Installation → Configuration → Development → Testing → Deployment
- Real user workflow
- UX and documentation quality
- Generated code quality

**Run**: See [Manual Testing Guide](#manual-testing-guide) below

---

## What We Validate (Automated Smoke Test)

### ✅ Framework Installation (Automated)

**Required Directories:**
- `.specweave/` - Framework configuration
- `.specweave/docs/` - Framework documentation
- `.specweave/increments/` - Incremental development folder
- `.claude/skills/` - Installed skills (8+ skills)
- `.claude/agents/` - Installed agents (14+ agents)
- `.claude/hooks/` - Automation hooks
- `.claude/commands/` - Slash commands

**Required Files:**
- `CLAUDE.md` - Development guide (from template)
- `.gitignore` - Standard ignores
- `.specweave/config.yaml` - Framework configuration

**Skills Installed:**
- `specweave-detector` - Auto-detection and routing
- `skill-router` - Request routing
- `context-loader` - Context management
- `feature-planner` - Feature planning
- `hetzner-provisioner` - Deployment (Hetzner)
- And more...

**Agents Installed:**
- `pm` - Product Manager
- `architect` - System Architect
- `devops` - DevOps Engineer
- `qa-lead` - QA Lead
- `nextjs` - Next.js Specialist
- And more...

---

### 📝 Application Content (Created During Conversation)

**NOT validated by automated smoke test** (created during interactive Claude Code session):

- `specifications/` - Created by spec-author skill
- `src/` or `app/` - Created by implementation agents
- `tests/` - Created by testing agents
- `package.json` - Created during project setup
- `prisma/` or database schemas - Created as needed
- Deployment configs - Created by DevOps agent

---

### Content Validation

✅ **Framework Documentation** (Required):
- `.specweave/docs/` contains framework docs
- `.specweave/config.yaml` has valid YAML structure
- `CLAUDE.md` exists and contains development guide

📝 **Specifications include expected features** (Optional - if user creates):
- Prompt keywords appear in specs
- Example: "event management", "Stripe", "Hetzner", "booking"

📝 **Test cases follow SpecWeave format** (Optional - if user creates):
- TC-XXX or TC-XXXX format (e.g., TC-001, TC-0001)
- Acceptance criteria in specs
- Test coverage matrix in features/tests.md

📝 **Features have complete structure** (Optional - if user creates):
- spec.md - What and why
- plan.md - How to implement
- tasks.md - Executable checklist
- tests.md - Test strategy
- context-manifest.yaml - Context loading

---

### Quality Validation

✅ **Skills installed correctly**:
- `specweave-detector` - Auto-detection
- `feature-planner` - Feature planning
- `skill-router` - Request routing
- `context-loader` - Context management
- `hetzner-provisioner` - Deployment (for Hetzner scenarios)

✅ **Agents installed correctly**:
- `pm` - Product Manager
- `architect` - System Architect
- `nextjs` - Next.js Specialist (for Next.js scenarios)
- `devops` - DevOps Engineer
- `qa-lead` - QA Lead

✅ **Context manifests exist**:
- Every feature has `context-manifest.yaml`
- Manifests specify `spec_sections` and `documentation`
- Enables 70%+ token reduction

---

### Functional Validation

📝 **Dependencies install** (Optional - if user creates package.json):
- `npm install` succeeds
- `node_modules/` created
- No errors in installation

📝 **Tests pass** (Optional - if user creates tests):
- `npm test` succeeds
- E2E tests exist and pass (for UI projects)
- No failing tests

📝 **Build succeeds** (Optional - if user creates build script):
- `npm run build` completes
- No build errors
- Output artifacts created

📝 **Integration code exists** (Optional - if mentioned in prompt):
- Stripe integration present (if in prompt)
- Hetzner deployment config (if in prompt)
- Database setup (if in prompt)

---

## Running the Tests

### Quick Bash Script (Recommended)

```bash
# Make executable
chmod +x tests/smoke/e2e-smoke-test.sh

# Run
./tests/smoke/e2e-smoke-test.sh
```

**Output**:
```
=== SpecWeave E2E Smoke Test ===

→ Creating test directory: /tmp/specweave-smoke-1234567890
✓ SpecWeave installed
✓ Project initialization triggered
...
✓ All required directories exist
✓ Specifications contain expected features
✓ E2E tests exist (3 files)

=== ✅ ALL SMOKE TESTS PASSED ===

Summary:
  - Installation: ✓
  - Structure: ✓
  - Specifications: ✓
  - Features: ✓
  - Skills: ✓
  - Agents: ✓
  - E2E Tests: ✓
```

---

### Playwright E2E Test (Advanced)

```bash
# Install Playwright
npm install

# Run E2E test
npx playwright test tests/e2e/specweave-smoke.spec.ts
```

**Benefits**:
- More detailed assertions
- Better error reporting
- Parallel test execution
- Screenshot/video capture on failure

---

### GitHub Actions (CI/CD)

Automatically runs on:
- Every push to `main` or `features/*` branches
- Every pull request
- Daily at 2 AM UTC
- Manual trigger via workflow dispatch

**Workflow**: `.github/workflows/e2e-smoke-test.yml`

**Features**:
- Matrix testing (multiple scenarios)
- Performance benchmarking
- Artifact upload on failure
- Automatic issue creation on failure

---

## Test Scenarios

### Scenario 1: Simple Todo App

**Prompt**: "Create a todo app with Next.js and local storage"

**Expected**:
- Next.js project structure
- Todo CRUD operations
- Local storage persistence
- E2E tests for todo flow

**Duration**: ~2 minutes

---

### Scenario 2: SaaS Event Management (Default)

**Prompt**:
```
implement a SaaS solution with Next.js for event management,
specifically a field facility booking system for soccer.
Include backend API, deploy to Hetzner cloud (cheap hosting),
and integrate Stripe payments. Time slots should only be
bookable once payment is confirmed.
```

**Expected**:
- Next.js frontend
- Backend API
- Stripe payment integration
- Hetzner deployment config
- Booking flow E2E tests
- Payment confirmation tests

**Duration**: ~5-10 minutes

---

### Scenario 3: E-commerce Platform

**Prompt**: "Build an e-commerce platform with Next.js, Stripe payments, product catalog, and admin dashboard. Deploy to Vercel."

**Expected**:
- Product catalog
- Shopping cart
- Checkout flow
- Admin dashboard
- Stripe integration
- Vercel deployment config

**Duration**: ~5-10 minutes

---

## Debugging Failed Tests

### Step 1: Check Test Output

```bash
./tests/smoke/e2e-smoke-test.sh
```

Look for:
- `✗ FAIL: ...` - Specific failure message
- Which step failed (1-15)
- Error details

---

### Step 2: Preserve Test Artifacts

```bash
# Keep test directory for inspection
KEEP_TEST_ARTIFACTS=true ./tests/smoke/e2e-smoke-test.sh
```

Test directory will be preserved at: `/tmp/specweave-smoke-*`

---

### Step 3: Inspect Generated Project

```bash
# Navigate to test directory
cd /tmp/specweave-smoke-*

# Check structure
tree -L 2

# Read specifications
cat specifications/overview.md

# Check features
ls -la features/

# Verify skills
ls .claude/skills/

# Try to build
npm install
npm test
npm run build
```

---

### Step 4: Check GitHub Actions Logs

If running in CI:

1. Go to Actions tab
2. Find failed workflow run
3. Download artifacts (includes generated project)
4. Review logs for error details

---

## Success Criteria

All smoke tests must pass with:

- ✅ **Structure**: 100% of required directories/files exist
- ✅ **Content**: All prompt keywords appear in specs
- ✅ **Skills**: 100% of core skills installed correctly
- ✅ **Agents**: 100% of core agents installed correctly
- ✅ **Tests**: E2E tests exist for UI projects
- ✅ **Build**: `npm run build` succeeds
- ✅ **Tests Pass**: `npm test` succeeds
- ✅ **Performance**: Generation completes within timeout (default: 2 minutes)

---

## Customizing Tests

### Change Timeout

```bash
# Edit e2e-smoke-test.sh
TIMEOUT=300  # 5 minutes instead of 2
```

### Add New Scenario

```bash
# Create new test script
cp tests/smoke/e2e-smoke-test.sh tests/smoke/custom-scenario.sh

# Edit prompt
PROMPT="Your custom prompt here"

# Run
./tests/smoke/custom-scenario.sh
```

### Add to CI Matrix

```yaml
# .github/workflows/e2e-smoke-test.yml
strategy:
  matrix:
    scenario:
      - name: "Your Custom Scenario"
        prompt: "Your prompt here"
        expected_features: ["feature1", "feature2"]
```

---

## Performance Benchmarking

### Current Baseline

- **Installation**: <30 seconds
- **Simple project**: <2 minutes
- **Complex project**: <10 minutes
- **Total CI runtime**: <30 minutes

### Monitoring

GitHub Actions workflow includes performance benchmarking:
- Measures total generation time
- Compares against baseline
- Fails if exceeds threshold
- Tracks performance over time

---

## Troubleshooting

### "Directory not created" error

**Cause**: Installation failed

**Fix**:
1. Check SpecWeave is built: `npm run build`
2. Verify `npx specweave init` works manually
3. Check permissions on test directory

---

### "Specifications missing features" error

**Cause**: AI didn't include expected features

**Fix**:
1. Check prompt clarity
2. Verify ANTHROPIC_API_KEY is set
3. Increase timeout (generation may need more time)
4. Check AI model (should be claude-sonnet-4-5)

---

### "E2E tests not found" error

**Cause**: UI project didn't generate E2E tests

**Fix**:
1. Verify prompt mentions UI/frontend
2. Check `playwright-tester` skill installed
3. Ensure Next.js/React mentioned in prompt

---

### "Tests failed" error

**Cause**: Generated tests have failures

**Fix**:
1. Inspect test output: `npm test -- --verbose`
2. Check if tests are flaky (run again)
3. Verify dependencies installed correctly
4. Check test configuration (jest.config.js, playwright.config.ts)

---

## Related Documentation

- [Testing Philosophy](../../CLAUDE.md#testing-philosophy) - Complete testing strategy
- [E2E Testing](../../tests/README.md#e2e-testing) - E2E testing guide
- [GitHub Actions Workflow](../../.github/workflows/e2e-smoke-test.yml) - CI/CD configuration
- [Playwright Tests](../../tests/e2e/specweave-smoke.spec.ts) - Playwright test suite

---

## Manual Testing Guide

Since SpecWeave is conversation-based, comprehensive testing requires manual interaction with Claude Code.

### Quick Manual Smoke Test (15 minutes)

**Prerequisites:**
- SpecWeave repository cloned
- Node.js 18+ installed
- Claude Code installed

**Steps:**

1. **Install Framework**
   ```bash
   ./install.sh /tmp/specweave-manual-test-$(date +%s)
   cd /tmp/specweave-manual-test-*
   ```

2. **Verify Installation**
   ```bash
   # Check structure
   ls -la .specweave/
   ls -la .claude/skills/
   ls -la .claude/agents/
   cat CLAUDE.md | head -20
   ```

3. **Open Claude Code**
   ```bash
   code .
   ```

4. **Test Conversation (in Claude Code)**

   **Prompt:**
   ```
   Create a simple todo app with Next.js 14.

   Requirements:
   - Add, edit, delete todos
   - Local storage persistence
   - Minimal UI

   Work autonomously using SpecWeave skills.
   Generate proper structure and tests.
   ```

5. **Wait and Observe**
   - Watch skills activate automatically
   - Observe specweave-detector routing
   - See agents orchestrate
   - Duration: ~10 minutes

6. **Verify Results**
   ```bash
   # Check generated structure
   ls -la .specweave/increments/

   # Check if code was generated
   ls -la app/ 2>/dev/null || ls -la src/ 2>/dev/null

   # Check if tests exist
   ls -la tests/ 2>/dev/null

   # Try to build
   npm install
   npm run build

   # Try to test
   npm test
   ```

7. **Success Criteria**
   - ✅ Skills activated automatically
   - ✅ Increments created in .specweave/increments/
   - ✅ Application code generated
   - ✅ Tests created
   - ✅ `npm run build` succeeds
   - ✅ `npm test` passes

### Extended Manual Test (30 minutes)

Use the same process but with a more complex prompt:

```
Create an event management SaaS with Next.js 14 and PostgreSQL.

Features:
- Calendar view for event booking
- User authentication (email + OAuth)
- Payment processing with Stripe
- Admin dashboard
- Deploy to Hetzner Cloud

Requirements:
- Work autonomously using SpecWeave skills
- Generate proper Playwright E2E tests
- Create complete working application
- Include deployment configuration
```

**Additional verification:**
- ✅ Multiple increments created
- ✅ Database schema exists (Prisma)
- ✅ Stripe integration code present
- ✅ Hetzner deployment config (Terraform/Pulumi)
- ✅ E2E tests exist and pass
- ✅ Complete authentication flow

---

## Architecture Documentation

For complete architecture details, see:
- [CLAUDE.md](../../CLAUDE.md) - Complete development guide
- [SpecWeave Architecture](../../.specweave/docs/internal/architecture/) - System design
- [Skills Documentation](../../src/skills/) - Individual skill specs

---

## Future Enhancements

**Automated Testing:**
- [ ] GitHub Actions workflow for manual test scheduling
- [ ] Test result reporting to GitHub Issues
- [ ] Performance benchmarking of conversation workflow

**Manual Testing:**
- [ ] Test scenarios library (GraphQL API, mobile app, etc.)
- [ ] Checklist templates for manual testing
- [ ] Video recordings of successful tests

**Quality Assurance:**
- [ ] Visual regression testing (Percy, Chromatic) for generated UIs
- [ ] Security scanning (OWASP ZAP, Snyk) for generated code
- [ ] Accessibility testing (axe-core, Pa11y) for generated UIs
- [ ] Load testing (k6, Artillery) for generated APIs

---

**Last Updated**: 2025-10-27
**Maintained By**: SpecWeave Team
