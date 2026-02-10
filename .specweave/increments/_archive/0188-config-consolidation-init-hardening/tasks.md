# 0188: Tasks

## Phase 1: Config Type Consolidation (US-001)

### T-001: [RED] Write tests for unified config type and backward-compat re-exports
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-06, AC-US1-08 | **Status**: [x] completed
**Test**: Given tests importing SpecweaveConfig from both old and new paths → When compiled and run → Then tests FAIL (new path missing fields, old path not yet a re-export)
**Details**:
- Extend `tests/unit/core/config/config-manager.test.ts` with tests for:
  - Importing `SpecweaveConfig` from `src/core/config/types.ts` has all ~100 fields
  - Importing from old path `src/core/types/config.ts` resolves same type
  - `SpecWeaveConfig` alias exists and equals `SpecweaveConfig`
  - `DEFAULT_CONFIG` has all required fields (testing, limits, archiving, planning, etc.)
- Tests must FAIL initially (fields missing in new types file)

### T-002: [GREEN] Merge all interfaces into src/core/config/types.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-05 | **Status**: [x] completed
**Depends On**: T-001
**Test**: Given the unified types file → When importing `SpecweaveConfig` → Then all ~100 fields are available with correct types
**Details**:
- Copy all interfaces from `src/core/types/config.ts` (TestingConfig, LimitsConfig, ArchivingConfig, LivingDocsConfig, ApiDocsConfig, PlanningConfig, etc.) into `src/core/config/types.ts`
- Merge the comprehensive DEFAULT_CONFIG (140-line version) into `src/core/config/types.ts`
- Add `SpecWeaveConfig` as type alias for `SpecweaveConfig` (backward compat)
- Validate DEFAULT_CONFIG satisfies `SpecweaveConfig` type at compile time

### T-003: [GREEN] Convert old types file to re-export shim
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-06 | **Status**: [x] completed
**Depends On**: T-001
**Test**: Given any of the 25+ files importing from `src/core/types/config.ts` → When compiled → Then no errors
**Details**:
- Replace `src/core/types/config.ts` body with re-exports from `../config/types.js`
- Add `@deprecated` JSDoc comment pointing to canonical path

### T-004: [RED] Write tests for ConfigManager backward-compat methods
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-07 | **Status**: [x] completed
**Test**: Given tests calling `ConfigManager.load()` and `ConfigManager.save()` (old API) → When run → Then tests FAIL (methods don't exist on new ConfigManager)
**Details**:
- Add tests to `tests/unit/core/config/config-manager.test.ts` for:
  - `ConfigManager.load()` returns full config (backward compat)
  - `ConfigManager.loadAsync()` returns full config
  - `ConfigManager.save(config)` persists config
  - `ConfigManager.saveSync(config)` persists config
  - Importing `ConfigManager` from old path `src/core/config-manager.ts` works

### T-005: [GREEN] Merge ConfigManager methods and convert old to re-export
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-07 | **Status**: [x] completed
**Depends On**: T-004
**Test**: Given code calling `ConfigManager.load()` (old API) or `ConfigManager.read()` (new API) → When executed → Then both work correctly
**Details**:
- Port `load()`, `loadAsync()`, `save()`, `saveSync()` methods from old ConfigManager into new one (as aliases)
- Replace `src/core/config-manager.ts` body with re-export from `./config/config-manager.js`
- Add `@deprecated` JSDoc comment

### T-006: [REFACTOR] Verify full build and all existing tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-08 | **Status**: [x] completed
**Depends On**: T-002, T-003, T-005
**Test**: Given `npm run rebuild && npm run test:unit` → When executed → Then all 310+ tests pass with zero modifications

---

## Phase 2: CI/CD Config Schema (US-002)

### T-007: [RED] Write tests for CiCdConfig type and defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Depends On**: T-006
**Test**: Given test accessing `DEFAULT_CONFIG.cicd.pushStrategy` → When run → Then FAILS (cicd field doesn't exist yet)
**Details**:
- Add tests to config-manager test suite for:
  - `DEFAULT_CONFIG.cicd` exists
  - `DEFAULT_CONFIG.cicd.pushStrategy` equals `'direct'`
  - `DEFAULT_CONFIG.cicd.autoFix.enabled` is `true`
  - `DEFAULT_CONFIG.cicd.autoFix.maxRetries` is `1`
  - `DEFAULT_CONFIG.cicd.autoFix.allowedBranches` equals `['develop', 'main']`

### T-008: [GREEN] Add CiCdConfig interface and defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Depends On**: T-007
**Test**: Given the unified config type → When accessing `config.cicd.pushStrategy` → Then it returns `'direct'` by default
**Details**:
- Add `CiCdConfig` interface to `src/core/config/types.ts`
- Add `cicd?: CiCdConfig` to `SpecweaveConfig`
- Add defaults to `DEFAULT_CONFIG.cicd`

### T-009: [RED] Write test for cicd config-loader unified config integration
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Depends On**: T-008
**Test**: Given `config.json` with `cicd.pushStrategy: 'pr-based'` → When cicd config-loader reads config → Then test FAILS (loader still uses standalone logic)

### T-010: [GREEN] Integrate cicd config-loader with unified config
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Depends On**: T-009
**Test**: Given `config.json` with `cicd.pushStrategy: 'pr-based'` → When cicd config-loader reads config → Then it uses unified config value over env vars
**Details**:
- Modify `src/core/cicd/config-loader.ts` to read from unified ConfigManager first
- Fall back to env vars and .env file only if unified config has no cicd section

---

## Phase 3: Init Wizard Fixes (US-003, US-004, US-005)

### T-011: [RED] Write test for unified CI detection
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Test**: Given various CI env var combinations (GITLAB_CI, CIRCLECI, non-TTY) → When `isNonInteractive` evaluated → Then test FAILS (function not yet extracted)
**Details**:
- Create `tests/unit/cli/commands/init-ci-detection.test.ts`
- Test all env vars: CI, GITHUB_ACTIONS, GITLAB_CI, CIRCLECI, JENKINS_URL, !isTTY
- Test `--quick` flag maps to non-interactive

### T-012: [GREEN] Unify CI detection in init.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-011
**Test**: Given `GITLAB_CI=true` → When running init → Then ALL wizard steps are skipped (including LSP setup)
**Details**:
- Extract `isNonInteractive()` function (testable, single definition)
- Remove duplicate `isQuickMode` definition at line 877
- Replace all `isCI` and `isQuickMode` references

### T-013: [RED] Write tests for translation string replacements
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given each of 9 languages → When translation strings accessed → Then test FAILS for 6 languages (missing `enableChoice`/`disableChoice` fields)
**Details**:
- Create `tests/unit/cli/helpers/init/translation-config.test.ts`
- Test all 9 languages have `enableChoice` and `disableChoice` fields
- Test no English fragments leak into non-English strings
- Test no hard-coded `.replace()` calls remain

### T-014: [GREEN] Fix translation string replacements for all 9 languages
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Depends On**: T-013
**Test**: Given language='ja' → When translation config prompt is shown → Then enable/disable choices display in Japanese
**Details**:
- Add `enableChoice` and `disableChoice` fields to each language's strings object
- Replace hard-coded `.replace()` chain at lines 394-402 with direct field access
- All 9 languages: en, ru, es, zh, de, fr, ja, ko, pt

### T-015: [GREEN] Add user feedback for skipped steps in continueExisting
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [x] completed
**Test**: Given `continueExisting=true` → When init wizard runs → Then console shows gray messages for each preserved step
**Details**:
- At line 692 (external-import skip): announce skip
- At lines 762, 779, 797, 814 (testing/interview/quality/translation): announce skips
- Use localized strings based on selected language

---

## Phase 4: Provider Symmetry (US-006)

### T-016: [RED] Write tests for multi-project folder helper
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [x] completed
**Test**: Given `createMultiProjectFolders(dir, 'github', ['frontend', 'backend'])` → When called → Then test FAILS (function doesn't exist yet)
**Details**:
- Create `tests/unit/cli/helpers/init/multi-project-folders.test.ts`
- Test folder creation for each provider (github, bitbucket, jira, ado)
- Test folder name normalization (lowercase, spaces to hyphens)

### T-017: [GREEN] Extract multi-project folder helper
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [x] completed
**Depends On**: T-016
**Test**: Given `createMultiProjectFolders(dir, 'github', ['frontend', 'backend'])` → When called → Then `specs/frontend/` and `specs/backend/` directories are created
**Details**:
- Create `src/cli/helpers/init/multi-project-folders.ts`
- Extract folder creation logic from init.ts lines 94-263

### T-018: [GREEN] Add GitHub/Bitbucket multi-project folder creation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02 | **Status**: [x] completed
**Depends On**: T-017
**Test**: Given GitHub init with 3 selected repos → When init completes → Then `specs/{repo-name}/` folders exist for each repo
**Details**:
- After `setupRepositoryHosting()` returns repo selections, call `createMultiProjectFolders()`
- Refactor JIRA and ADO paths to use the shared helper

### T-019: [REFACTOR] Final integration verification
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed
**Depends On**: T-006, T-010, T-012, T-014, T-015, T-018
**Test**: Given `npm run rebuild && npm run test:unit && npm run test:e2e` → When executed → Then all pass
