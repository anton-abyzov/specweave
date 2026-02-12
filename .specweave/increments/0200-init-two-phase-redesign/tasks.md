# Tasks: 0200 — Redesign Init Flow

## US-001: Minimal Questions Init

### T-001: [RED] Write tests for provider and credential auto-detection
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given .git/config has `github.com/org/repo` remote → When detectProvider() runs → Then returns `{ provider: 'github', owner: 'org', repo: 'repo' }`
**Test**: Given .git/config has `dev.azure.com/org` remote → When detectProvider() runs → Then returns `{ provider: 'ado', organization: 'org' }`
**Test**: Given .git/config has no remote → When detectProvider() runs → Then returns null (prompting needed)
**Test**: Given `gh auth token` returns valid token → When detectCredentials('github') runs → Then returns token without prompting
**Test**: Given .env has GITHUB_TOKEN → When detectCredentials('github') runs → Then returns token from .env
**Test**: Given no credentials anywhere → When detectCredentials('github') runs → Then returns null
**Impl**: `tests/unit/cli/helpers/init/provider-detection.test.ts` (23 tests)

### T-002: [GREEN] Enhance detectProvider() and detectCredentials()
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Depends On**: T-001
**Impl**: `src/cli/helpers/init/provider-detection.ts` — supports GitHub/ADO/Bitbucket HTTPS+SSH remotes, credential detection via gh auth → .env → process.env

### T-003: [RED] Write tests for streamlined init question flow
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US1-08 | **Status**: [x] completed
**Test**: Given GitHub detected + gh auth exists → When init runs → Then ≤2 prompts shown (language + confirm tracker)
**Test**: Given GitHub provider detected → When tracker prompt shown → Then GitHub Issues is pre-selected default
**Test**: Given org detected in remote → When repo setup runs → Then asks "add more repos from {org}?" (not upfront mono/multi)
**Test**: Given init runs → When all prompts complete → Then no greenfield/brownfield question was asked
**Test**: Given init runs → When all prompts complete → Then no mono/multi-repo taxonomy question was asked
**Test**: Given .specweave/ exists → When re-init runs → Then existing config values used as defaults
**Impl**: `tests/unit/cli/helpers/init/prompt-flow.test.ts` (23 tests) — injectable deps pattern, verifies prompt counts, tracker suggestions, CI mode, re-init defaults

### T-004: [GREEN] Implement streamlined prompt flow
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US1-08 | **Status**: [x] completed
**Depends On**: T-002, T-003
**Impl**: `src/cli/helpers/init/prompt-flow.ts` — `runPromptFlow()` orchestrator with injectable `PromptCallbacks`, `suggestTracker()` helper, CI/re-init support

## US-002: Brownfield Auto-Detection

### T-005: [RED] Write tests for brownfield detection (default-brownfield heuristic)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-05 | **Status**: [x] completed
**Test**: Given empty repo (only README + LICENSE + .gitignore) → When isGreenfield() runs → Then returns true (no source files = greenfield)
**Test**: Given `npm init -y` boilerplate (package.json with 0 deps, no source files) → When isGreenfield() runs → Then returns true
**Test**: Given repo with package.json (0 deps) + 1 placeholder file in src/ → When isGreenfield() runs → Then returns false (has source file = brownfield)
**Test**: Given real project (package.json with deps + source files) → When isGreenfield() runs → Then returns false (brownfield default)
**Test**: Given multi-repo: 2 empty repos + 1 repo with source files → When isGreenfield() runs for all → Then returns false (any repo has code = brownfield)
**Test**: Given multi-repo: all repos empty → When isGreenfield() runs for all → Then returns true (all empty = greenfield)
**Impl**: `tests/unit/cli/helpers/init/greenfield-detection.test.ts` (26 tests)

### T-006: [GREEN] Implement isGreenfield() with fast empty-repo scan
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-05 | **Status**: [x] completed
**Depends On**: T-005
**Impl**: `src/cli/helpers/init/greenfield-detection.ts` — scans for source files (early termination), checks package manager deps, max depth 5

### T-007: [REFACTOR] Update living-docs-preflight to use isGreenfield()
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Depends On**: T-006
**Impl**: `detectBrownfield()` in living-docs-preflight.ts now delegates to `isGreenfield()`. Backward compat maintained. living-docs.ts verified passing (55 tests).

## US-003: Smart Defaults + Summary Banner

### T-008: [RED] Write tests for smart defaults application
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed
**Impl**: `tests/unit/cli/helpers/init/smart-defaults.test.ts` (18 tests)

### T-009: [GREEN] Implement applySmartDefaults()
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed
**Depends On**: T-008
**Impl**: `src/cli/helpers/init/smart-defaults.ts` — sets TDD, standard gates, interview off, LSP (Claude), translation based on language. Preserves existing config values.

### T-010: [RED] Write tests for summary banner output
**User Story**: US-003 | **Satisfies ACs**: AC-US2-04, AC-US3-06, AC-US3-07 | **Status**: [x] completed
**Impl**: `tests/unit/cli/helpers/init/summary-banner.test.ts` (22 tests)

### T-011: [GREEN] Implement displaySummaryBanner()
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06, AC-US3-07 | **Status**: [x] completed
**Depends On**: T-010
**Impl**: `src/cli/helpers/init/summary-banner.ts` — pure `formatSummaryBanner()` + `displaySummaryBanner()`. Conditional brownfield/living-docs hints.

## US-004: Break Up God Function

### T-012: [RED] Write integration tests for new init architecture
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06 | **Status**: [x] completed
**Impl**: `tests/unit/cli/helpers/init/init-architecture.test.ts` (13 tests) — standalone function tests, full pipeline composition, file size constraints
**Test**: Given GitHub single repo + gh auth → When initCommand() runs → Then calls detectProvider() → detectCredentials() → promptFlow() → applySmartDefaults() → isGreenfield() → displaySummaryBanner()
**Test**: Given detectProvider() → When called standalone → Then returns provider info without side effects
**Test**: Given detectCredentials() → When called standalone → Then returns credentials without prompting
**Test**: Given isGreenfield() → When called standalone → Then returns boolean without init context
**Test**: Given applySmartDefaults() → When called standalone → Then modifies config object without prompts

### T-013: [GREEN] Rewire initCommand() into composable phase functions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06 | **Status**: [x] completed
**Depends On**: T-004, T-006, T-009, T-011, T-012
**Impl**: `src/cli/commands/init.ts` — replaced wizard loop with `applySmartDefaults()`, auto-install git hooks, auto-enable LSP, `isGreenfieldCheck()` + `displaySummaryBanner()`. Each composable phase function <200 lines.

### T-014: [REFACTOR] Remove dead wizard loop and old prompt functions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [x] completed
**Depends On**: T-013
**Impl**: Removed from init.ts: wizard step loop, `saveLivingDocsConfig()`, `displayLivingDocsInstructions()`. Removed imports: promptTestingConfig, promptDeepInterviewConfig, promptQualityGatesConfig, promptTranslationConfig, promptAndRunExternalImport, updateConfigWithTesting/DeepInterview/QualityGates/Translation, collectLivingDocsInputs, WIZARD_BACK, logGoingBack. Underlying config update functions preserved in their modules for future `specweave config` command.
