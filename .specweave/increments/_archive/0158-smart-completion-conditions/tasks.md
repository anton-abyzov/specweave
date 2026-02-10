---
increment: 0158-smart-completion-conditions
status: active
dependencies: []
phases:
  - design
  - implementation
  - testing
  - documentation
estimated_tasks: 35
estimated_weeks: 1
---

# Tasks for Smart Completion Conditions

## Phase 1: Project Type Detection (8 tasks)

### T-001: Create project-detector.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 to AC-US1-10 | **Status**: [x] completed
**Test**: Given project files → When detectProjectType() called → Then returns correct type with confidence

- Create `src/core/auto/project-detector.ts`
- Define `ProjectType` enum and `ProjectDetection` interface
- Implement indicator-based detection with weighted scoring
- Add confidence calculation (sum of weights / max possible)
- Return fallback 'generic' type if confidence <0.7

### T-002: Implement web-frontend detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given playwright.config.ts → When detect → Then web-frontend (confidence >0.8)

- Check for playwright.config.ts (weight: 0.9)
- Check for cypress.config.ts (weight: 0.9)
- Check for next.config.js (weight: 0.8)
- Check for vite.config.ts (weight: 0.7)
- Check for src/pages/, src/app/ (weight: 0.6 each)
- Check dependencies: react, vue, angular (weight: 0.5 each)

### T-003: Implement mobile-native detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given .detoxrc.js → When detect → Then mobile-native (confidence >0.8)

- Check for .detoxrc.js (weight: 0.9)
- Check for maestro.yaml (weight: 0.9)
- Check for android/app/, ios/Podfile (weight: 0.7 each)
- Check for pubspec.yaml (Flutter, weight: 0.6)
- Check dependencies: react-native, detox (weight: 0.8 each)

### T-004: Implement backend-API detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given openapi.yaml + express → When detect → Then backend-api (confidence >0.8)

- Check for openapi.yaml, swagger.yaml (weight: 0.9)
- Check for src/routes/, src/controllers/ (weight: 0.6 each)
- Check dependencies: express, fastapi, @nestjs/core (weight: 0.7 each)
- Check for integration test files (weight: 0.6)

### T-005: Implement library detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [x] completed
**Test**: Given package.json with main field, no pages → When detect → Then library

- Check package.json has main or exports field (weight: 0.6)
- Check for src/index.ts, lib/ (weight: 0.5, 0.4)
- Check absence of pages/routes directories (weight: 0.3)
- Check absence of build step (weight: 0.2)

### T-006: Implement desktop-app and CLI-tool detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06, AC-US1-07 | **Status**: [x] completed
**Test**: Given electron config → When detect → Then desktop-app

- Desktop: Check for electron, tauri config files (weight: 0.8)
- CLI: Check dependencies: commander.js, click, cobra (weight: 0.7)
- CLI: Check for bin field in package.json (weight: 0.6)

### T-007: Add multi-factor validation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-10 | **Status**: [x] completed
**Test**: Given single indicator → When confidence <0.7 → Then fallback to generic

- Require at least 2 indicators for classification
- Log all matched indicators with weights
- Return detailed detection result with `indicators` array

### T-008: Write unit tests for project detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 to AC-US1-10 | **Status**: [x] completed
**Test**: Given test fixtures → When all detectors run → Then 100% accuracy on known projects

- Test each project type with fixture directories
- Test confidence scoring edge cases
- Test multi-type ambiguity (e.g., Next.js fullstack)
- Test performance (<100ms requirement)

## Phase 2: Smart Defaults System (6 tasks)

### T-009: Create default-conditions.ts
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 to AC-US2-10 | **Status**: [x] completed
**Test**: Given project type → When getDefaultConditions() → Then returns correct mandatory conditions

- Create `src/core/auto/default-conditions.ts`
- Define `MANDATORY_CONDITIONS` map by project type
- Implement `getDefaultConditions(projectType, userOverrides?)`
- Implement merge logic preserving mandatory flags

### T-010: Define web-frontend defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given web-frontend → When get defaults → Then includes mandatory e2e + e2e-cov

- build (mandatory: true)
- tests (mandatory: true)
- e2e (mandatory: true, autoHeal: false)
- e2e-coverage (threshold: 70, mandatory: true)
- types (mandatory: true)

### T-011: Define mobile-native and backend-API defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Test**: Given mobile → Then e2e mandatory | Given API → Then integration mandatory

- Mobile: build, tests, e2e (mandatory), e2e-cov ≥60%
- Backend: build, tests, integration (mandatory), cov ≥80%, types

### T-012: Define library and CLI defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05, AC-US2-06 | **Status**: [x] completed
**Test**: Given library → Then tests + types mandatory, no e2e

- Library: build, tests (mandatory), cov ≥80%, types
- CLI: build, tests, types

### T-013: Implement merge logic with mandatory enforcement
**User Story**: US-002 | **Satisfies ACs**: AC-US2-08, AC-US2-09 | **Status**: [x] completed
**Test**: Given user removes mandatory condition → When merge → Then mandatory preserved

- User can add new conditions
- User can adjust thresholds (within limits)
- User CANNOT remove conditions with mandatory=true
- Log warnings if user attempts to override mandatory

### T-014: Write unit tests for smart defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 to AC-US2-10 | **Status**: [x] completed
**Test**: Given all project types → When merge with overrides → Then mandatory preserved

- Test each project type's defaults
- Test merge scenarios (add, replace attempts)
- Test mandatory preservation
- Test invalid override rejection

## Phase 3: Setup Script Integration (4 tasks)

### T-015: Update setup-auto.sh with project detection
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 to AC-US3-08 | **Status**: [x] completed
**Test**: Given /sw:auto → When session starts → Then project detected and conditions applied

- Add call to `node detect-project-type.js` in setup-auto.sh
- Store detected type in session JSON (`projectType` field)
- Pass project type to get-default-conditions.js
- Merge smart defaults into `completionConditions` array

### T-016: Create detect-project-type.js CLI wrapper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Test**: Given project root → When CLI called → Then outputs JSON detection result

- Wrapper script calls TypeScript detector
- Outputs JSON: `{"type": "web-frontend", "confidence": 0.92, ...}`
- Exit code 0 on success, 1 on error
- Performance: <100ms

### T-017: Create get-default-conditions.js CLI wrapper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
**Test**: Given project type → When CLI called → Then outputs conditions JSON array

- Takes project type as argument
- Outputs JSON array of CompletionCondition objects
- Includes mandatory flags
- Handles invalid types gracefully

### T-018: Add startup output with detection info
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06 | **Status**: [x] completed
**Test**: Given session start → When project detected → Then user sees type and conditions

```
🚀 Auto Session Started

Project Type: web-frontend (confidence: 92%)
Completion Conditions:
  • 🔨 Build must pass (auto-heal: 3 retries)
  • ✅ Tests must pass (unit + integration)
  • 🎭 E2E tests must pass (MANDATORY)
  • 📊 E2E coverage must be ≥70% (MANDATORY)
  • 🔍 Type-check must pass
```

## Phase 4: Stop Hook Enforcement (6 tasks)

### T-019: Update stop-auto.sh to call condition validator
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Test**: Given session with conditions → When stop hook runs → Then validator called first

- Insert `validate-completion-conditions.sh` call BEFORE task completion check
- Check exit code: 0 = pass, 1 = fail
- On failure, HARD BLOCK (don't allow completion)
- Pass session file and transcript path to validator

### T-020: Enhance validate-completion-conditions.sh output
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03, AC-US4-04 | **Status**: [x] completed
**Test**: Given failed condition → When validate → Then shows detailed error with fix instructions

- Generate structured JSON output for each condition
- Include: type, status (passed/failed), details, suggestion
- Format human-readable output with colors
- Show passed conditions with ✅, failed with ❌

### T-021: Implement structured E2E validation
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [x] completed
**Test**: Given Playwright tests → When validate → Then parses JSON reporter output

- Run: `npx playwright test --reporter=json`
- Parse JSON output for test counts
- Extract failed test details (file, line, error)
- Don't rely on grep patterns (brittle)

### T-022: Implement coverage file validation
**User Story**: US-004 | **Satisfies ACs**: AC-US4-06 | **Status**: [x] completed
**Test**: Given coverage report → When validate → Then reads actual coverage %

- Read coverage-final.json (Jest/Vitest)
- Read .nyc_output/coverage.json (NYC)
- Parse coverage percentage from structured data
- Compare against threshold from condition

### T-023: Add logging to auto-iterations.log
**User Story**: US-004 | **Satisfies ACs**: AC-US4-09 | **Status**: [x] completed
**Test**: Given condition check → When runs → Then logs to iterations log

```json
{"timestamp":"2026-01-07T12:00:00Z","event":"condition_check","type":"e2e","status":"failed","details":{"passed":7,"failed":3}}
```

### T-024: Update re-feed prompt for failed conditions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-10 | **Status**: [x] completed
**Test**: Given failed E2E → When block → Then prompt includes fix instructions

```
⚠️ E2E TESTS FAILING

3 tests failed:
  • tests/auth.spec.ts:45 - Login redirect broken
  • tests/checkout.spec.ts:12 - Payment form validation

Fix these tests and re-run: npx playwright test
```

## Phase 5: E2E Coverage Enhancements (5 tasks)

### T-025: Enhance E2E coverage manifest generation
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 to AC-US5-03 | **Status**: [x] completed
**Test**: Given first E2E run → When complete → Then .e2e-coverage.json created

- Auto-detect framework from config files
- Generate initial manifest with discovered routes
- Include framework-specific metadata
- Track generation timestamp

### T-026: Implement Playwright custom reporter
**User Story**: US-005 | **Satisfies ACs**: AC-US5-06 | **Status**: [x] completed
**Test**: Given Playwright test run → When tests complete → Then manifest updated

- Create `@specweave/playwright-coverage-reporter`
- Hook into Playwright's reporter API
- Track route visits from test URLs
- Update manifest atomically

### T-027: Implement route and viewport tracking
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03, AC-US5-04 | **Status**: [x] completed
**Test**: Given test visits route on mobile → When complete → Then manifest shows mobile viewport covered

- Track which routes tested (from page.goto() calls)
- Track viewport from test context
- Calculate coverage: routes tested / total routes discovered
- Warn about missing viewports (non-blocking)

### T-028: Add untested route detection to stop hook
**User Story**: US-005 | **Satisfies ACs**: AC-US5-09 | **Status**: [x] completed
**Test**: Given 45% coverage → When stop hook → Then shows untested route list and blocks

```
📊 E2E COVERAGE BELOW THRESHOLD

Route Coverage: 45% (threshold: 70%)

❌ UNTESTED ROUTES (8):
  • /dashboard
  • /settings/billing
  • /admin/users

Add E2E tests for these routes to continue.
```

### T-029: Write E2E coverage tracking tests
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 to AC-US5-10 | **Status**: [x] completed
**Test**: Given E2E tests → When run with reporter → Then coverage calculated correctly

- Test manifest generation
- Test route tracking
- Test viewport tracking
- Test coverage calculation

## Phase 6: Comprehensive Testing (3 tasks)

### T-030: Write unit tests for all modules
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 to AC-US7-10 | **Status**: [x] completed
**Test**: Given test suite → When run → Then >90% code coverage

- Test project-detector.ts (all project types)
- Test default-conditions.ts (merge logic)
- Test config.ts (validation, precedence)
- Use fixtures for realistic project structures

### T-031: Write integration tests for auto mode
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 to AC-US7-10 | **Status**: [x] completed
**Test**: Given auto session → When conditions enforced → Then session completes only when all pass

- Test web project: blocks without E2E
- Test API project: blocks without integration tests
- Test library: blocks without unit tests
- Test auto-heal for build failures

### T-032: Write E2E tests (dogfooding)
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 to AC-US7-10 | **Status**: [x] completed
**Test**: Given SpecWeave project → When auto mode used for this feature → Then all conditions enforced

- Use `/sw:auto --e2e --e2e-cov 70` for this increment
- Ensure E2E tests cover all user flows
- Validate that enforcement actually works
- Meta: Test the feature by using it to build itself!

## Phase 7: Documentation & Migration (3 tasks)

### T-033: Update auto command documentation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 to AC-US6-10 | **Status**: [x] completed
**Test**: Given docs → When user reads → Then understands smart defaults and configuration

- Update `plugins/specweave/commands/auto.md`
- Document project type detection
- Document smart defaults by type
- Add configuration examples
- Add troubleshooting section

### T-034: Write migration guide
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 to AC-US6-10 | **Status**: [x] completed
**Test**: Given existing auto users → When read guide → Then successfully migrate to v1.1.0

- Create `MIGRATION-V1.1.0.md`
- Explain opt-in → opt-out → mandatory rollout
- Show config examples for each phase
- Add troubleshooting for common issues
- Explain how to opt-out (with warnings)

### T-035: Update CLAUDE.md and internal docs
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 to AC-US6-10 | **Status**: [x] completed
**Test**: Given CLAUDE.md → When Claude reads → Then uses smart defaults correctly

- Update auto mode section with smart defaults
- Add examples: `/sw:auto` (detects project, applies defaults)
- Document config options
- Update troubleshooting section
- Add to "Best Practices" section
