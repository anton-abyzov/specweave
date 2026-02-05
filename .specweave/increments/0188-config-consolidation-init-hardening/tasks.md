# 0188: Tasks

## Phase 1: Config Type Consolidation (US-001)

### T-001: Merge all interfaces into src/core/config/types.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-05 | **Status**: [ ] pending
**Test**: Given the unified types file → When importing `SpecweaveConfig` → Then all ~100 fields are available with correct types
**Details**:
- Copy all interfaces from `src/core/types/config.ts` (TestingConfig, LimitsConfig, ArchivingConfig, LivingDocsConfig, ApiDocsConfig, PlanningConfig, etc.) into `src/core/config/types.ts`
- Merge the comprehensive DEFAULT_CONFIG (140-line version) into `src/core/config/types.ts`
- Add `SpecWeaveConfig` as type alias for `SpecweaveConfig` (backward compat for PascalCase importers)
- Validate DEFAULT_CONFIG satisfies `SpecweaveConfig` type at compile time

### T-002: Convert old types file to re-export shim
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02, AC-US1-06 | **Status**: [ ] pending
**Depends On**: T-001
**Test**: Given any of the 25+ files importing from `src/core/types/config.ts` → When compiled → Then no errors
**Details**:
- Replace `src/core/types/config.ts` body with re-exports from `../config/types.js`
- Add `@deprecated` JSDoc comment pointing to canonical path
- Verify all existing imports still resolve

### T-003: Merge ConfigManager methods and convert old to re-export
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-07 | **Status**: [ ] pending
**Depends On**: T-001
**Test**: Given code calling `ConfigManager.load()` (old API) or `ConfigManager.read()` (new API) → When executed → Then both work correctly
**Details**:
- Port `load()`, `loadAsync()`, `save()`, `saveSync()` methods from old ConfigManager into new one (as aliases or adapters for `read()`/`write()`)
- Replace `src/core/config-manager.ts` body with re-export from `./config/config-manager.js`
- Add `@deprecated` JSDoc comment

### T-004: Verify all existing tests pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-08 | **Status**: [ ] pending
**Depends On**: T-002, T-003
**Test**: Given `npm run test:unit` → When executed → Then all 310+ tests pass with zero modifications

---

## Phase 2: CI/CD Config Schema (US-002)

### T-005: Add CiCdConfig interface and defaults
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [ ] pending
**Depends On**: T-001
**Test**: Given the unified config type → When accessing `config.cicd.pushStrategy` → Then it returns `'direct'` by default
**Details**:
- Add `CiCdConfig` interface to `src/core/config/types.ts`
- Add `cicd?: CiCdConfig` to `SpecweaveConfig`
- Add defaults to `DEFAULT_CONFIG.cicd`

### T-006: Integrate cicd config-loader with unified config
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [ ] pending
**Depends On**: T-005
**Test**: Given `config.json` with `cicd.pushStrategy: 'pr-based'` → When cicd config-loader reads config → Then it uses unified config value over env vars
**Details**:
- Modify `src/core/cicd/config-loader.ts` to read from unified ConfigManager first
- Fall back to env vars and .env file only if unified config has no cicd section

---

## Phase 3: Init Wizard Fixes (US-003, US-004, US-005)

### T-007: Unify CI detection in init.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [ ] pending
**Test**: Given `GITLAB_CI=true` → When running init → Then ALL wizard steps are skipped (including LSP setup at line 877)
**Details**:
- Define single `isNonInteractive` constant at top of `initCommand()` (line ~273)
- Check: `options.quick || CI || GITHUB_ACTIONS || GITLAB_CI || CIRCLECI || JENKINS_URL || !process.stdin.isTTY`
- Remove duplicate `isQuickMode` definition at line 877
- Replace all `isCI` and `isQuickMode` references with `isNonInteractive`

### T-008: Fix translation string replacements for all 9 languages
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [ ] pending
**Test**: Given language='ja' → When translation config prompt is shown → Then enable/disable choices display in Japanese (not broken English fragments)
**Details**:
- Add `enableChoice` and `disableChoice` fields to each language's strings object in `translation-config.ts`
- Replace hard-coded `.replace('Translat', ...).replace('Перевод:', ...)` chain at lines 394-402 with direct field access
- All 9 languages: en, ru, es, zh, de, fr, ja, ko, pt

### T-009: Add user feedback for skipped steps in continueExisting
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [ ] pending
**Test**: Given `continueExisting=true` → When init wizard runs → Then console shows gray messages for each preserved step
**Details**:
- At line 692 (external-import skip): add `console.log(chalk.gray('  Keeping existing external import settings'))`
- At lines 762, 779, 797, 814 (testing/interview/quality/translation skips): add gray "Keeping existing {step} configuration" messages
- Use localized strings based on selected language

---

## Phase 4: Provider Symmetry (US-006)

### T-010: Extract multi-project folder helper
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [ ] pending
**Test**: Given `createMultiProjectFolders(dir, 'github', ['frontend', 'backend'])` → When called → Then `specs/frontend/` and `specs/backend/` directories are created
**Details**:
- Create `src/cli/helpers/init/multi-project-folders.ts`
- Extract folder creation logic from init.ts lines 94-263 into `createMultiProjectFolders(targetDir, provider, projects[])`
- Normalize folder names (lowercase, spaces to hyphens)

### T-011: Add GitHub/Bitbucket multi-project folder creation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02 | **Status**: [ ] pending
**Depends On**: T-010
**Test**: Given GitHub init with 3 selected repos → When init completes → Then `specs/{repo-name}/` folders exist for each repo
**Details**:
- After `setupRepositoryHosting()` returns repo selections, call `createMultiProjectFolders()` for GitHub/Bitbucket
- Refactor JIRA and ADO paths to use the shared helper

---

## Phase 5: Tests

### T-012: Unit tests for unified config
**User Story**: US-001 | **Satisfies ACs**: AC-US1-08 | **Status**: [ ] pending
**Depends On**: T-003
**Test**: Given ConfigManager.load() (old API) → When called → Then returns config with all ~100 fields populated
**Details**:
- Extend `tests/unit/core/config/config-manager.test.ts`
- Test backward compat aliases (load/save → read/write)
- Test DEFAULT_CONFIG completeness
- Test type alias (`SpecWeaveConfig` = `SpecweaveConfig`)

### T-013: Unit test for CI detection
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [ ] pending
**Depends On**: T-007
**Test**: Given various CI env var combinations → When `isNonInteractive` evaluated → Then correctly returns true for all CI environments
**Details**:
- Create `tests/unit/cli/commands/init-ci-detection.test.ts`
- Test: CI=true, GITHUB_ACTIONS=true, GITLAB_CI=true, CIRCLECI=true, !isTTY

### T-014: Unit test for translation choices
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [ ] pending
**Depends On**: T-008
**Test**: Given each of 9 languages → When translation strings accessed → Then `enableChoice` and `disableChoice` are non-empty and in the correct language
**Details**:
- Create `tests/unit/cli/helpers/init/translation-config.test.ts`
- Verify all 9 language objects have the new fields
- Verify no English fragments leak into non-English strings

### T-015: Final integration verification
**User Story**: All | **Satisfies ACs**: All | **Status**: [ ] pending
**Depends On**: T-012, T-013, T-014
**Test**: Given `npm run rebuild && npm run test:unit && npm run test:e2e` → When executed → Then all pass
