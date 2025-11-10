# Tasks for Increment 0014: Proactive Plugin Validation System

---
increment: 0014-proactive-plugin-validation
total_tasks: 10
test_mode: TDD
coverage_target: 90%
version_target: 0.9.4
---

## Overview

Implement proactive plugin validation system to ensure SpecWeave marketplace and plugins are installed before any workflow command executes. Enables seamless environment migration (local → VM → Cloud IDE).

**Key Features**:
- ✅ Auto-detect missing marketplace/plugins
- ✅ Auto-install with user consent
- ✅ Context-aware plugin detection (keywords → plugins)
- ✅ CLI command for manual validation
- ✅ Integration into ALL 22 commands

---

## T-001: Implement Core PluginValidator Class

**AC**: AC-US1-02, AC-US1-03, AC-US4-01

**Test Plan** (BDD format):
- **Given** .claude/settings.json missing → **When** validate() → **Then** missing.marketplace = true
- **Given** specweave plugin not installed → **When** validate() → **Then** missing.corePlugin = true
- **Given** all components installed → **When** validate() → **Then** valid = true

**Test Cases**:
- Unit (`tests/unit/plugin-validator.test.ts`):
  - `checkMarketplace()` detects missing settings.json
  - `checkMarketplace()` detects missing specweave marketplace entry
  - `checkMarketplace()` validates correct marketplace config
  - `checkCorePlugin()` detects missing specweave plugin
  - `checkCorePlugin()` detects installed specweave plugin
  - `validate()` returns correct ValidationResult structure
  - Error handling for file system errors
  - Error handling for permission errors
  - **Coverage: 95%**

**Implementation**:
1. Create `src/utils/plugin-validator.ts`
2. Define interfaces: `ValidationResult`, `ValidationOptions`, `InstallResult`
3. Implement `PluginValidator` class:
   - `checkMarketplace()`: Check `.claude/settings.json` exists and contains specweave marketplace
   - `checkCorePlugin()`: Execute `claude plugin list --installed | grep "specweave "`
   - `validate()`: Main entry point, orchestrates all checks
4. Add error handling for:
   - File not found (ENOENT)
   - Permission denied (EACCES)
   - Claude CLI not available
5. Add TypeScript strict mode compliance
6. Export all interfaces and class

**Estimated Effort**: 4 hours

**Dependencies**: None

---

## T-002: Implement Keyword-Based Context Detection

**AC**: AC-US2-01, AC-US2-02

**Test Plan** (BDD format):
- **Given** description "Add GitHub sync" → **When** detectRequiredPlugins() → **Then** returns ["specweave-github"]
- **Given** description "Stripe billing with React UI" → **When** detectRequiredPlugins() → **Then** returns ["specweave-payments", "specweave-frontend"]
- **Given** generic description → **When** detectRequiredPlugins() → **Then** returns []

**Test Cases**:
- Unit (`tests/unit/plugin-validator.test.ts`):
  - GitHub keywords → specweave-github (7 keywords tested)
  - Jira keywords → specweave-jira (6 keywords tested)
  - Stripe keywords → specweave-payments (6 keywords tested)
  - React keywords → specweave-frontend (8 keywords tested)
  - Kubernetes keywords → specweave-kubernetes (7 keywords tested)
  - Multiple plugin detection (combined keywords)
  - Case-insensitive matching
  - Partial word matching (e.g., "GitHub" in "GitHub Issues")
  - Scoring threshold (2+ keywords = high confidence)
  - No false positives for generic descriptions
  - **Coverage: 100%** (critical for accuracy)

**Implementation**:
1. Define `PLUGIN_KEYWORDS` constant (15+ plugins)
2. Implement `detectRequiredPlugins(description: string): string[]`:
   - Lowercase description
   - Score each plugin based on keyword matches
   - Return plugins with score ≥ 2 (high confidence threshold)
3. Keywords to map:
   - `specweave-github`: github, git, issues, pr, pull request, repository, commit
   - `specweave-jira`: jira, epic, story, sprint, backlog, atlassian
   - `specweave-ado`: azure devops, ado, azure, devops, work item
   - `specweave-payments`: stripe, billing, payment, subscription, invoice, checkout
   - `specweave-frontend`: react, nextjs, next.js, vue, angular, svelte, frontend, ui
   - `specweave-kubernetes`: kubernetes, k8s, helm, pod, deployment, service mesh, kubectl
   - `specweave-ml`: machine learning, ml, tensorflow, pytorch, model, training, dataset
   - `specweave-observability`: prometheus, grafana, monitoring, metrics, alerting
   - `specweave-security`: security, owasp, vulnerability, penetration, audit
   - `specweave-diagrams`: diagram, c4, mermaid, architecture, visualization
   - ... (15 plugins total)

**Estimated Effort**: 2 hours

**Dependencies**: T-001

---

## T-003: Implement Installation Logic

**AC**: AC-US1-02, AC-US1-03

**Test Plan** (BDD format):
- **Given** marketplace missing → **When** installMarketplace() → **Then** .claude/settings.json created with specweave marketplace
- **Given** plugin missing → **When** installPlugin("specweave") → **Then** plugin installed successfully
- **Given** installation error → **When** installPlugin() → **Then** returns InstallResult with error

**Test Cases**:
- Unit (`tests/unit/plugin-validator.test.ts`):
  - `installMarketplace()` creates .claude directory if missing
  - `installMarketplace()` preserves existing settings
  - `installMarketplace()` adds specweave marketplace config
  - `installPlugin()` executes correct command
  - `installPlugin()` verifies installation succeeded
  - Error handling for file system errors
  - Error handling for Claude CLI not available
  - **Coverage: 85%**

- Integration (`tests/integration/plugin-validation.test.ts`):
  - End-to-end marketplace installation
  - End-to-end plugin installation
  - Rollback on failure
  - **Coverage: 80%**

**Implementation**:
1. Implement `installMarketplace()`:
   - Check if `.claude/settings.json` exists
   - Read existing settings or create new object
   - Add specweave marketplace to `extraKnownMarketplaces`
   - Write settings with proper formatting (spaces: 2)
   - Return `InstallResult`
2. Implement `installPlugin(name: string)`:
   - Execute `claude plugin install ${name}` via child_process
   - Capture stdout/stderr
   - Verify installation by checking plugin list
   - Return `InstallResult`
3. Add graceful degradation:
   - If Claude CLI not available, show manual instructions
   - If network error, suggest offline mode
4. Add retry logic (1 retry on failure)

**Estimated Effort**: 3 hours

**Dependencies**: T-001

---

## T-004: Implement CLI Command

**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05

**Test Plan** (BDD format):
- **Given** specweave validate-plugins → **When** execute → **Then** shows validation report
- **Given** --auto-install flag → **When** missing components → **Then** auto-installs
- **Given** --dry-run flag → **When** missing components → **Then** shows what would be installed (no installation)
- **Given** validation fails → **When** execute → **Then** exits with code 1

**Test Cases**:
- Unit (`tests/unit/plugin-validator.test.ts`):
  - Command registration
  - Flag parsing (--auto-install, --context, --dry-run, --verbose)
  - Output formatting (colors, spinners)
  - Exit code 0 on success, 1 on failure
  - **Coverage: 90%**

- Integration (`tests/integration/plugin-validation.test.ts`):
  - Execute command with --dry-run
  - Execute command with --auto-install
  - Execute command with --context
  - Execute command with --verbose
  - Verify output matches expected format
  - **Coverage: 85%**

**Implementation**:
1. Create `src/cli/commands/validate-plugins.ts`
2. Define command using Commander:
   ```typescript
   program
     .command('validate-plugins')
     .description('Validate SpecWeave plugin installation')
     .option('--auto-install', 'Auto-install missing components', false)
     .option('--context <description>', 'Increment description for context detection')
     .option('--dry-run', 'Show what would be installed', false)
     .option('--verbose', 'Show detailed validation steps', false)
     .action(async (options) => { /* implementation */ });
   ```
3. Implement action handler:
   - Create `PluginValidator` instance
   - Call `validate(options)`
   - Display results with ora spinner
   - Use chalk for colored output
   - Exit with correct code
4. Add to `src/cli/index.ts` (main CLI entry point)

**Estimated Effort**: 2 hours

**Dependencies**: T-001, T-002, T-003

---

## T-005: Update Commands with STEP 0 Validation (Priority Commands)

**AC**: AC-US1-01, AC-US1-04, AC-US1-05

**Test Plan** (BDD format):
- **Given** /specweave:increment → **When** execute → **Then** STEP 0 validation runs first
- **Given** validation passes → **When** STEP 0 complete → **Then** proceeds to STEP 1 (PM Agent)
- **Given** validation fails → **When** STEP 0 complete → **Then** stops with error

**Test Cases**:
- Integration (`tests/integration/plugin-validation.test.ts`):
  - specweave-increment.md triggers validation
  - specweave-do.md triggers validation
  - specweave-next.md triggers validation
  - Validation output appears before PM Agent output
  - **Coverage: 90%**

- E2E (`tests/e2e/plugin-validation.spec.ts`):
  - Fresh environment: /specweave:increment auto-installs plugins
  - Context detection: "GitHub sync" → suggests specweave-github
  - Skip validation: User declines auto-install
  - **Coverage: 85%**

**Implementation**:
1. Update 3 priority commands (Phase 1 rollout):
   - `plugins/specweave/commands/specweave-increment.md`
   - `plugins/specweave/commands/specweave-do.md`
   - `plugins/specweave/commands/specweave-next.md`

2. Add STEP 0 template to each:
   ```markdown
   ## STEP 0: Plugin Validation (MANDATORY - ALWAYS FIRST!)

   🚨 **CRITICAL**: Before ANY planning or execution, validate plugin installation.

   Use the Bash tool to run:
   ```bash
   npx specweave validate-plugins --auto-install --context="$(cat <<'EOF'
   [USER'S INCREMENT DESCRIPTION]
   EOF
   )"
   ```

   **If validation passes**: Proceed to STEP 1
   **If validation fails**: Show errors and STOP
   ```

3. Ensure validation runs BEFORE existing STEP 1 (PM Agent)

**Estimated Effort**: 2 hours

**Dependencies**: T-004

---

## T-006: Update Remaining Commands with STEP 0 Validation

**AC**: AC-US1-01

**Test Plan** (BDD format):
- **Given** any /specweave:* command → **When** execute → **Then** STEP 0 validation runs first

**Test Cases**:
- Integration (`tests/integration/plugin-validation.test.ts`):
  - All 22 commands have STEP 0
  - Validation template is consistent
  - **Coverage: 85%**

**Implementation**:
1. Update remaining 19 commands with STEP 0 template:
   - `specweave-done.md`
   - `specweave-progress.md`
   - `specweave-validate.md`
   - `specweave-sync-docs.md`
   - `specweave-sync-tasks.md`
   - `specweave-pause.md`
   - `specweave-resume.md`
   - `specweave-abandon.md`
   - `specweave-check-tests.md`
   - `specweave-costs.md`
   - `specweave-translate.md`
   - `specweave-update-scope.md`
   - `specweave-status.md`
   - `specweave-qa.md`
   - `specweave-tdd-cycle.md`
   - `specweave-tdd-red.md`
   - `specweave-tdd-green.md`
   - `specweave-tdd-refactor.md`
   - `specweave.md` (master command)

2. Use script for bulk update:
   ```bash
   for file in plugins/specweave/commands/specweave-*.md; do
     # Insert STEP 0 before existing STEP 1
     sed -i '' '/## STEP 1:/i\
## STEP 0: Plugin Validation...\
' "$file"
   done
   ```

**Estimated Effort**: 2 hours

**Dependencies**: T-005

---

## T-007: Create Proactive Plugin Validator Skill

**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04

**Test Plan** (BDD format):
- **Given** /specweave:* command → **When** skill activates → **Then** validates plugins proactively
- **Given** missing plugins → **When** skill runs → **Then** shows clear error messages
- **Given** installation errors → **When** skill runs → **Then** shows actionable guidance

**Test Cases**:
- Integration (`tests/integration/skills/plugin-validator.test.ts`):
  - Skill activates on SpecWeave command keywords
  - Skill calls TypeScript validator
  - Skill shows progress indicators
  - Skill handles errors gracefully
  - **Coverage: 80%**

**Implementation**:
1. Create `plugins/specweave/skills/plugin-validator/SKILL.md`
2. YAML frontmatter:
   ```yaml
   ---
   name: plugin-validator
   description: Proactively validates SpecWeave plugin installation before workflows. Auto-activates when /specweave:* commands detected. Ensures marketplace registered, core plugin installed, and context-specific plugins available. Activates for plugin validation, environment setup, missing plugins, specweave commands.
   ---
   ```
3. Skill content:
   - Explain validation process
   - When to validate
   - What gets validated
   - How to handle errors
   - Manual installation instructions
4. Add tool restrictions (read-only):
   ```yaml
   allowed-tools: Read, Bash, Grep
   ```

**Estimated Effort**: 2 hours

**Dependencies**: T-001, T-004

---

## T-008: Implement Comprehensive Unit Tests

**AC**: ALL (unit test coverage for all ACs)

**Test Plan** (BDD format):
- **Given** test suite → **When** npm test → **Then** 70+ tests pass with 90%+ coverage

**Test Cases**:
- Unit (`tests/unit/plugin-validator.test.ts` - 70 test cases):

**Marketplace Detection** (10 tests):
  1. Detects missing .claude/settings.json
  2. Detects missing specweave marketplace entry
  3. Validates correct marketplace config (GitHub source)
  4. Handles corrupt settings.json
  5. Handles permission errors (EACCES)
  6. Handles file not found (ENOENT)
  7. Detects local marketplace (dev mode)
  8. Validates marketplace structure (source.source, source.repo, source.path)
  9. Handles empty settings.json
  10. Handles settings.json with other marketplaces

**Plugin Detection** (15 tests):
  11. Detects missing specweave plugin
  12. Detects installed specweave plugin
  13. Parses plugin version correctly
  14. Handles Claude CLI not available
  15. Handles empty plugin list
  16. Detects multiple plugins
  17. Case-insensitive plugin name matching
  18. Handles plugin list command timeout
  19. Handles plugin list command error
  20. Validates plugin naming convention
  21. Detects alpha/beta versions
  22. Handles malformed plugin list output
  23. Checks plugin is active (not disabled)
  24. Handles network errors when fetching plugin list
  25. Validates plugin source (marketplace vs local)

**Keyword Mapping** (20 tests):
  26. "GitHub" → specweave-github
  27. "git issues" → specweave-github
  28. "pull request" → specweave-github
  29. "Jira epic" → specweave-jira
  30. "sprint planning" → specweave-jira
  31. "Stripe billing" → specweave-payments
  32. "payment integration" → specweave-payments
  33. "React frontend" → specweave-frontend
  34. "Next.js app" → specweave-frontend
  35. "Kubernetes deployment" → specweave-kubernetes
  36. "k8s pod" → specweave-kubernetes
  37. "helm chart" → specweave-kubernetes
  38. "machine learning model" → specweave-ml
  39. "TensorFlow training" → specweave-ml
  40. Multiple plugins: "GitHub sync with React UI" → [specweave-github, specweave-frontend]
  41. Case-insensitive: "GITHUB" → specweave-github
  42. Partial match: "GitHub Issues API" → specweave-github
  43. No false positives: "generic feature" → []
  44. Scoring threshold: 1 keyword = no match, 2+ keywords = match
  45. Overlapping keywords: "Azure DevOps" → specweave-ado (not specweave-kubernetes)

**Installation Logic** (10 tests):
  46. installMarketplace() creates .claude directory
  47. installMarketplace() creates settings.json
  48. installMarketplace() preserves existing settings
  49. installMarketplace() adds specweave marketplace
  50. installMarketplace() handles file write errors
  51. installPlugin() executes correct command
  52. installPlugin() verifies installation
  53. installPlugin() handles Claude CLI errors
  54. installPlugin() retries on failure (1 retry)
  55. installPlugin() returns InstallResult with errors

**Validation Logic** (10 tests):
  56. validate() detects all missing components
  57. validate() with autoInstall=true triggers installation
  58. validate() with dryRun=true skips installation
  59. validate() with context detects required plugins
  60. validate() caches results (5 min TTL)
  61. validate() invalidates cache after TTL
  62. validate() handles concurrent calls (race conditions)
  63. validate() aggregates multiple errors
  64. validate() shows recommendations
  65. validate() returns correct ValidationResult structure

**Edge Cases** (5 tests):
  66. Empty increment description (no context plugins)
  67. Very long description (performance test)
  68. Special characters in description
  69. Non-English characters (UTF-8)
  70. Malicious input (injection attempts)

**Overall Coverage**: 95%+

**Implementation**:
1. Create `tests/unit/plugin-validator.test.ts`
2. Use Jest as test framework
3. Mock file system operations (fs-extra)
4. Mock child_process (for Claude CLI)
5. Mock Date.now() for cache testing
6. Use fixtures for test data:
   - `tests/fixtures/settings-valid.json`
   - `tests/fixtures/settings-invalid.json`
   - `tests/fixtures/plugin-list-output.txt`

**Estimated Effort**: 4 hours

**Dependencies**: T-001, T-002, T-003

---

## T-009: Implement Integration and E2E Tests

**AC**: AC-US1-01, AC-US2-01, AC-US3-01, AC-US4-01

**Test Plan** (BDD format):
- **Given** fresh environment → **When** run command → **Then** auto-installs all components
- **Given** context "GitHub sync" → **When** validate → **Then** suggests specweave-github

**Test Cases**:

**Integration** (`tests/integration/plugin-validation.test.ts` - 13 tests):
  1. CLI command: specweave validate-plugins (no flags)
  2. CLI command: --auto-install flag
  3. CLI command: --dry-run flag
  4. CLI command: --context flag
  5. CLI command: --verbose flag
  6. CLI command: exit code 0 on success
  7. CLI command: exit code 1 on failure
  8. Marketplace installation (end-to-end)
  9. Plugin installation (end-to-end)
  10. Context detection (multiple plugins)
  11. Cache behavior (TTL 5 min)
  12. Error recovery (retry logic)
  13. Concurrent validation calls

**E2E** (`tests/e2e/plugin-validation.spec.ts` - 6 tests):
  1. Fresh environment (Docker): /specweave:increment auto-installs
  2. Partial installation: marketplace exists, plugin missing
  3. Context detection: "Add GitHub sync" → specweave-github suggested
  4. User accepts auto-install → installation proceeds
  5. User declines auto-install → manual instructions shown
  6. Network error → offline mode suggested

**Coverage Target**: 85%+ (integration), 80%+ (E2E)

**Implementation**:
1. Create `tests/integration/plugin-validation.test.ts`
   - Use real file system (tmpdir for isolation)
   - Mock Claude CLI (spawn-mock)
   - Test CLI command execution
   - Test validation flows

2. Create `tests/e2e/plugin-validation.spec.ts`
   - Use Playwright for browser-based testing
   - Use Docker for fresh environment simulation
   - Test full workflows
   - Verify user prompts and outputs

3. Add test scripts to package.json:
   ```json
   {
     "scripts": {
       "test:plugin-validator": "jest tests/unit/plugin-validator.test.ts",
       "test:integration": "jest tests/integration/plugin-validation.test.ts",
       "test:e2e:plugin-validation": "playwright test tests/e2e/plugin-validation.spec.ts"
     }
   }
   ```

**Estimated Effort**: 3 hours

**Dependencies**: T-001, T-004, T-008

---

## T-010: Documentation and Rollout

**AC**: AC-US3-03, AC-US3-04

**Test Plan** (BDD format):
- **Given** user reads docs → **When** follows instructions → **Then** successfully validates plugins
- **Given** validation error → **When** user checks troubleshooting → **Then** finds solution

**Test Cases**:
- Manual validation:
  1. Follow README.md "Getting Started" → validation runs automatically
  2. Follow troubleshooting guide → resolve common errors
  3. Read ADR-0018 → understand architecture decisions
  - **Validation**: Manual testing + user feedback

**Implementation**:

1. **Create ADR-0018**: `.specweave/docs/internal/architecture/adr/0018-plugin-validation.md`
   - Context: Why we need proactive validation
   - Decision: Auto-validation before all commands
   - Alternatives: Manual validation, lazy loading, no validation
   - Consequences: Improved UX, slight performance overhead
   - Trade-offs: Complexity vs reliability

2. **Update CLAUDE.md**: Add "Plugin Validation System" section
   - How it works (4 phases)
   - CLI command usage
   - Configuration options
   - Troubleshooting common issues
   - Developer guide (adding new plugins to keyword map)

3. **Update README.md**: "Getting Started" section
   - Add note: "Plugin validation runs automatically"
   - Remove manual plugin installation steps
   - Add troubleshooting link

4. **Create User Guide**: `docs-site/docs/guides/environment-setup.md`
   - Environment migration (local → VM → Cloud IDE)
   - Manual validation command
   - Context-aware plugin detection
   - Offline mode
   - Troubleshooting

5. **Update CHANGELOG.md**: v0.9.4 entry
   ```markdown
   ## [0.9.4] - 2025-11-09

   ### Added
   - **Proactive Plugin Validation System**: Auto-validates and installs SpecWeave plugins before commands
   - CLI command: `specweave validate-plugins [options]`
   - Context-aware plugin detection (15+ plugins mapped to keywords)
   - Integration into all 22 SpecWeave commands (STEP 0 validation)
   - Comprehensive test coverage (90%+): 70 unit, 13 integration, 6 E2E tests

   ### Changed
   - All `/specweave:*` commands now validate plugins before execution
   - Improved first-run experience (zero manual setup)

   ### Fixed
   - Cryptic errors from missing plugins (now clear guidance)
   - Environment migration friction (now seamless)
   ```

6. **Create completion report**: `.specweave/increments/0014-proactive-plugin-validation/reports/COMPLETION-SUMMARY.md`
   - Original scope vs delivered
   - Metrics (test coverage, performance)
   - Lessons learned
   - Future enhancements

**Estimated Effort**: 2 hours

**Dependencies**: T-001 through T-009

---

## Summary

**Total Tasks**: 10
**Total Estimated Effort**: 26 hours
**Coverage Target**: 90%+ (95% unit, 85% integration, 80% E2E)
**Version Target**: 0.9.4

**Critical Path**:
1. T-001 (Core validator) → 4h
2. T-002 (Context detection) → 2h
3. T-003 (Installation) → 3h
4. T-004 (CLI command) → 2h
5. T-005 (Priority commands) → 2h
6. T-008 (Unit tests) → 4h
**Total Critical Path**: 17 hours

**Parallel Work**:
- T-006 (Remaining commands) → 2h (parallel with T-008)
- T-007 (Proactive skill) → 2h (parallel with T-008)
- T-009 (Integration/E2E tests) → 3h (after T-008)
- T-010 (Documentation) → 2h (parallel with T-009)

**Risk Mitigation**:
- ⚠️  Claude CLI availability: Graceful degradation to manual instructions
- ⚠️  Network failures: Offline mode detection, clear error messages
- ⚠️  Performance overhead: Caching (5 min TTL), parallel checks
- ⚠️  False positives: High confidence threshold (2+ keywords), manual override

**Success Criteria**:
- ✅ All 10 tasks completed
- ✅ 90%+ test coverage achieved
- ✅ Zero manual plugin installations after this increment
- ✅ <5 seconds validation overhead
- ✅ Works on macOS, Linux, Windows
- ✅ E2E tests pass on fresh environments

---

**Tasks Ready for Implementation**
Test-first approach recommended (TDD mode)
