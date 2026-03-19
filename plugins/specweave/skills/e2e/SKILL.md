---
description: Generate, run, and report Playwright E2E tests traced to spec.md acceptance criteria. Supports accessibility auditing via --a11y. Use when saying "e2e tests", "playwright tests", "run e2e", "generate e2e", "accessibility audit", "a11y test".
argument-hint: "--generate|--run|--a11y <increment-id>"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
context: fork
model: sonnet
---

# E2E Testing — Playwright + AC Traceability

## Project Overrides

!`s="e2e"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

Generate Playwright E2E tests from spec.md acceptance criteria, run them, and produce a structured report that maps pass/fail results to AC-IDs. Consumed by sw:done Gate 2a for automated closure gating.

## Modes

| Flag | Action |
|------|--------|
| `--generate <id>` | Read spec.md → create one `.spec.ts` per US with one `test()` per AC |
| `--run <id>` | Execute `npx playwright test` → parse results → write `e2e-report.json` |
| `--a11y <id>` | Like `--run` but also scans each page with `@axe-core/playwright` |

Combine `--run` + `--a11y` to get both functional and accessibility results. `--generate` ignores `--a11y` (warn if combined).

---

## Step 1: Parse Arguments

Extract mode and increment ID from `$ARGUMENTS`:

```bash
# Parse: --generate 0042 | --run 0042 | --a11y 0042 | --run --a11y 0042
MODE="run"       # default
A11Y=false
INCREMENT_ID=""

for arg in $ARGUMENTS; do
  case "$arg" in
    --generate) MODE="generate" ;;
    --run)      MODE="run" ;;
    --a11y)     A11Y=true ;;
    *)          INCREMENT_ID="$arg" ;;
  esac
done
```

If no increment ID provided, check for an active increment:
```bash
ACTIVE=$(find .specweave/increments -maxdepth 2 -name "metadata.json" -exec grep -l '"active"' {} \; 2>/dev/null | head -1)
```

If still no ID → **STOP**: "No increment ID provided and no active increment found."

Resolve increment path: `.specweave/increments/<id>/`

## Step 2: Environment Validation — Playwright Detection

**MANDATORY before any operation.** Detect Playwright installation:

```bash
# 1. Find playwright.config
PW_CONFIG=$(find . repositories -maxdepth 4 -name "playwright.config.ts" -o -name "playwright.config.js" 2>/dev/null | head -1)

# 2. Check for @playwright/test in package.json
PW_PACKAGE=$(grep -r '"@playwright/test"' package.json packages/*/package.json repositories/*/*/package.json 2>/dev/null | head -1)
```

**Decision matrix**:

| Config | Package | Action |
|--------|---------|--------|
| Found | Found | **Proceed** — use config path |
| Missing | Found | **FAIL**: "Playwright installed but no config found. Run `npx playwright init` to create playwright.config.ts" |
| Missing | Missing | **FAIL**: "Playwright not installed. Run `npm init playwright@latest` to set up E2E testing" |
| Found | Missing | **Proceed** with warning: "Playwright config found but package not in package.json (global install?)" |

Store `PW_CONFIG` path for later use.

## Step 3: Read spec.md — AC Extraction

Parse the increment's spec.md to extract acceptance criteria:

```bash
# Extract ACs: matches both [ ] and [x] checkboxes
grep -E '^\s*-\s*\[[ x]\]\s*\*\*AC-' .specweave/increments/<id>/spec.md
```

**Parsing algorithm**:

1. Read `.specweave/increments/<id>/spec.md`
2. For each line matching `- [[ x]] **AC-USx-xx**: <text>`:
   - Extract AC-ID (e.g., `AC-US1-01`)
   - Extract description text (the Given/When/Then or plain text after the colon)
   - Derive parent US-ID from AC prefix (e.g., `AC-US1-01` → `US-001`)
   - Flag `hasGWT` if text contains "Given" AND "When" AND "Then"
3. Group ACs by parent US-ID
4. Detect journey sequences: ACs under the same US that describe sequential steps on the same page

**Edge cases**:
- **No ACs found**: Output "No acceptance criteria found in spec.md — nothing to generate" and exit cleanly
- **ACs without Given/When/Then**: Generate a test stub with `// TODO: AC text does not follow GWT format — implement test manually`
- **Duplicate AC-IDs**: Warn, append `-dup1` suffix to the test name

Store the parsed result as a structured list for subsequent steps.

---

## Step 4: Generate Mode (`--generate`)

**Goal**: Create Playwright test files from extracted ACs.

### 4a. Determine Output Directory

```bash
# Read testDir from playwright config, default to e2e/
TEST_DIR=$(grep -oP "testDir:\s*['\"]([^'\"]+)" "$PW_CONFIG" | head -1 | sed "s/testDir:\s*['\"]//")
TEST_DIR="${TEST_DIR:-e2e}"
mkdir -p "$TEST_DIR"
```

### 4b. Generate Test Files

For each user story, create `{TEST_DIR}/us-{NNN}.spec.ts`:

**Template for standard ACs** (one test per AC):

```typescript
import { test, expect } from '@playwright/test';

test.describe('US-001: <User Story Title>', () => {
  test('AC-US1-01: <AC description summary>', async ({ page }) => {
    // Given: <given clause>
    // When: <when clause>
    // Then: <then clause>

    // TODO: Implement test steps
    // AC text: <full AC text>
  });

  test('AC-US1-02: <AC description summary>', async ({ page }) => {
    // ...
  });
});
```

**Template for journey ACs** (grouped into one test):

When multiple ACs under the same US describe sequential steps (e.g., "user sees form" → "user submits form" → "user sees confirmation"), group them:

```typescript
test('AC-US1-01 → AC-US1-03: <journey description>', async ({ page }) => {
  // --- AC-US1-01: <description> ---
  // Given/When/Then steps...

  // --- AC-US1-02: <description> ---
  // Given/When/Then steps...

  // --- AC-US1-03: <description> ---
  // Given/When/Then steps...
});
```

### 4c. Post-Generate Summary

Output:
```
Generated E2E tests:
  {TEST_DIR}/us-001.spec.ts (3 ACs: AC-US1-01, AC-US1-02, AC-US1-03)
  {TEST_DIR}/us-002.spec.ts (2 ACs: AC-US2-01, AC-US2-02)

Total: 5 tests across 2 files
Next: Implement test steps, then run with sw:e2e --run <id>
```

---

## Step 5: Run Mode (`--run`)

**Goal**: Execute Playwright tests and produce AC-mapped `e2e-report.json`.

### 5a. Execute Playwright

```bash
# Run with JSON reporter for structured output
npx playwright test --reporter=json 2>&1 | tee /tmp/pw-results.json

# Capture exit code
PW_EXIT=$?
```

If Playwright exits non-zero, that's expected for failing tests — continue to report generation.

### 5b. Parse Results and Map to ACs

1. Read the JSON reporter output
2. For each test result:
   - Extract test title
   - Match AC-ID from title using regex: `/AC-US\d+-\d+/`
   - Map to status: `passed` → `pass`, `failed` → `fail`, `skipped` → `skip`
   - Extract duration and error message (if failed)
3. Tests without AC-IDs in title → report under `acId: "UNMAPPED"`

### 5c. Write e2e-report.json

Write to `.specweave/increments/<id>/reports/e2e-report.json`:

```json
{
  "incrementId": "<id>",
  "timestamp": "<ISO-8601>",
  "mode": "run",
  "playwrightConfig": "<path to playwright.config.ts>",
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0
  },
  "results": [
    {
      "acId": "AC-US1-01",
      "testFile": "e2e/us-001.spec.ts",
      "status": "pass",
      "duration": 1234,
      "error": null
    },
    {
      "acId": "AC-US1-02",
      "testFile": "e2e/us-001.spec.ts",
      "status": "fail",
      "duration": 5678,
      "error": "Expected element to be visible but it was hidden"
    }
  ]
}
```

### 5d. Output Summary

```
E2E Results for increment <id>:
  Total: 5 | Passed: 4 | Failed: 1 | Skipped: 0

  FAILED:
    AC-US1-02: Expected element to be visible but it was hidden (us-001.spec.ts)

  Report: .specweave/increments/<id>/reports/e2e-report.json
```

If `summary.failed > 0`:
```
⚠ E2E tests have failures. Fix before closing increment.
```

If `summary.failed === 0`:
```
All E2E tests passed. Gate 2a will allow closure.
```

---

## Step 6: A11y Mode (`--a11y`)

**Goal**: Extend run mode with accessibility scanning via `@axe-core/playwright`.

### 6a. Check axe-core Installation

```bash
grep -q '"@axe-core/playwright"' package.json 2>/dev/null
```

If not installed:
```
@axe-core/playwright is not installed. Install it:
  npm install -D @axe-core/playwright axe-core

Then re-run: sw:e2e --a11y <id>
```

### 6b. Inject A11y Scans

When generating tests with `--a11y`, add after each test's primary assertions:

```typescript
import AxeBuilder from '@axe-core/playwright';

// After primary test assertions:
const a11yResults = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
  .analyze();
```

When running existing tests, the a11y scan must be part of the generated test code. If tests were generated without `--a11y`, recommend regenerating with the flag.

### 6c. A11y Report Extension

For each AC result, attach a11y data:

```json
{
  "acId": "AC-US1-01",
  "status": "pass",
  "a11y": {
    "violations": [
      {
        "rule": "color-contrast",
        "impact": "serious",
        "description": "Elements must have sufficient color contrast",
        "nodes": 3,
        "helpUrl": "https://dequeuniversity.com/rules/axe/4.7/color-contrast"
      }
    ],
    "passes": 42
  }
}
```

### 6d. Standalone A11y (No AC Context)

When `--a11y` runs without `--generate` context (pre-existing tests without AC-IDs):

- Group violations by page URL instead of AC-ID
- Write to the top-level `a11y` field in the report:

```json
{
  "a11y": {
    "violations": [
      {
        "pageUrl": "/login",
        "rule": "color-contrast",
        "impact": "serious",
        "nodes": 2
      }
    ],
    "passes": 87
  }
}
```

### 6e. axe-core Rule Tags Reference

| Tag | Meaning |
|-----|---------|
| `wcag2a` / `wcag2aa` | WCAG 2.0 Level A / AA |
| `wcag21aa` / `wcag22aa` | WCAG 2.1 / 2.2 Level AA |
| `best-practice` | Non-WCAG best practices |

Default: `['wcag2a', 'wcag2aa', 'wcag21aa']` (covers standard compliance).

---

## Step 7: Report Schema Reference

### e2e-report.json (complete)

```json
{
  "incrementId": "string",
  "timestamp": "ISO-8601",
  "mode": "run | generate | a11y",
  "playwrightConfig": "path/to/playwright.config.ts",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  },
  "results": [
    {
      "acId": "AC-US1-01",
      "testFile": "e2e/us-001.spec.ts",
      "status": "pass | fail | skip",
      "duration": 1234,
      "error": null,
      "a11y": {
        "violations": [],
        "passes": 0
      }
    }
  ],
  "a11y": {
    "violations": [],
    "passes": 0
  }
}
```

**Consumption by sw:done Gate 2a**:
1. Read `.specweave/increments/<id>/reports/e2e-report.json`
2. If `summary.failed > 0` → **BLOCK closure**
3. If report missing → **BLOCK closure** (report must exist after sw:e2e invocation)
4. If `summary.failed === 0` → **PASS gate**

---

## Step 8: Edge Cases and Error Handling

| Scenario | Behavior |
|----------|----------|
| No spec.md | "spec.md not found at increment path. Run sw:increment first." |
| spec.md with no ACs | "No acceptance criteria found in spec.md — nothing to generate." Exit cleanly. |
| ACs without GWT format | Generate test stub with `// TODO: implement` comment |
| Duplicate AC-IDs | Warn, append `-dup1` suffix |
| Playwright timeout on a test | Report as `status: "fail"`, `error: "Test timed out after Xms"` |
| `--generate` + `--a11y` combined | Warn: "a11y flag is only used with --run. Generating without a11y scans." |
| No Playwright config | FAIL with installation instructions (see Step 2) |
| Pre-existing tests without AC-IDs | Map to `acId: "UNMAPPED"` in results |
| JSON reporter not available | Fall back to parsing Playwright stdout for pass/fail counts |

## Anti-Rationalization

| Excuse | Rebuttal |
|--------|----------|
| "Tests are too simple to need AC tracing" | Tracing is free — it costs one string in the test title. Skip it and you lose audit trail. |
| "I'll add AC-IDs later" | You won't. Generate with `--generate` and they're there from the start. |
| "Accessibility can wait" | WCAG violations caught at dev time cost 10x less to fix than post-release. Use `--a11y`. |
| "The report is overkill for a small project" | Gate 2a reads the report. No report = no closure. The schema is fixed overhead, not per-test. |

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#e2e)
