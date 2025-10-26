# SpecWeave E2E Smoke Tests

Comprehensive smoke tests that validate SpecWeave's ability to generate complete, production-ready projects from natural language prompts.

## Purpose

These smoke tests verify that SpecWeave can:

1. **Install cleanly** in any environment
2. **Generate complete projects** from natural language
3. **Produce proper structure** (specs, features, code, tests)
4. **Create working code** that builds and passes tests
5. **Include all required components** (E2E tests, deployment config, integrations)

## Test Levels

### Level 1: Installation Smoke Test (30 seconds)

**Purpose**: Verify basic installation

**What it tests**:
- Clean folder → `npx specweave init` → Verify structure
- `.specweave/` folder created
- Core skills installed
- Core agents installed
- Config file valid

**Run**: Part of `e2e-smoke-test.sh`

---

### Level 2: Simple Project Smoke Test (2 minutes)

**Purpose**: Verify basic project generation

**What it tests**:
- Initialize SpecWeave
- Simple prompt: "Create a todo app with Next.js"
- Verify basic structure (specs, features, src, tests)
- Verify builds and runs

**Run**: `./tests/smoke/simple-smoke-test.sh` (TODO)

---

### Level 3: Complex Project Smoke Test (5-10 minutes)

**Purpose**: Validate complete SaaS generation (production-ready)

**What it tests**:
- Complex prompt with multiple integrations
- Example: Event management SaaS with Next.js, Stripe, Hetzner deployment
- Comprehensive validation (see below)

**Run**: `./tests/smoke/e2e-smoke-test.sh`

---

## What We Validate

### Structure Validation

✅ **Required Directories** (Framework components):
- `.specweave/` - Framework configuration
- `.specweave/docs/` - Framework documentation
- `.specweave/increments/` - Incremental changes (starts with init, then 0001, 0002, etc.)
- `.claude/skills/` - Installed skills
- `.claude/agents/` - Installed agents

✅ **Required Files** (Framework components):
- `CLAUDE.md` - Development guide
- `README.md` - Project documentation
- `.specweave/config.yaml` - Configuration

📝 **Optional Directories** (User-created content):
- `specifications/` - Business requirements (created by users)
- `features/` - Implementation plans (created by users)
- `src/` - Source code (created by users)
- `tests/` - Test suite (created by users)
- `tests/e2e/` - E2E tests (created for UI projects)

📝 **Optional Files** (User-created content):
- `package.json` - Dependencies and scripts (created by users)
- `specifications/overview.md` - System overview (created by users)

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

## Future Enhancements

- [ ] Add more test scenarios (GraphQL API, mobile app, etc.)
- [ ] Visual regression testing (Percy, Chromatic)
- [ ] Performance profiling (Lighthouse, WebPageTest)
- [ ] Security scanning (OWASP ZAP, Snyk)
- [ ] Accessibility testing (axe-core, Pa11y)
- [ ] Load testing (k6, Artillery)
- [ ] Multi-cloud deployment testing (AWS, GCP, Azure)

---

**Last Updated**: 2025-01-26
**Maintained By**: SpecWeave Team
