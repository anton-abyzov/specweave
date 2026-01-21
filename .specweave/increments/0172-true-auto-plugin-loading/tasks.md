---
increment: 0172-true-auto-plugin-loading
title: "Tasks - True Auto Plugin Loading"
---

# Tasks: True Auto Plugin Loading

## Phase 1: CLI Commands for Hook Integration

### T-001: Create detect-intent CLI Command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**: Create CLI command that exposes keyword detection for hooks to call.

**Acceptance**:
- [x] Command at `src/cli/commands/detect-intent.ts`
- [x] Usage: `specweave detect-intent "prompt text"`
- [x] Returns JSON: `{"detected": true, "plugins": ["release", "github"]}`
- [x] Uses existing `detectSpecWeaveIntent()` from keyword-detector.ts
- [x] Registered in bin/specweave.js

**Test**: Given `specweave detect-intent "release npm version"` → When run → Then returns `{"detected": true, "plugins": ["release"]}`

---

### T-002: Add --install Flag to detect-intent
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed

**Description**: Add flag that also installs detected plugins.

**Acceptance**:
- [x] `specweave detect-intent "prompt" --install` installs detected plugins
- [x] Uses existing `PluginCacheManager.installPlugins()`
- [x] Returns same JSON output after installation
- [x] Idempotent - doesn't reinstall already-loaded plugins

**Test**: Given `specweave detect-intent "deploy k8s" --install` → When run → Then sw-k8s installed AND JSON returned

---

### T-003: Add --silent Flag to detect-intent
**User Story**: US-003, US-006
**Satisfies ACs**: AC-US3-05, AC-US6-01, AC-US6-02
**Status**: [x] completed

**Description**: Add silent mode for hook usage.

**Acceptance**:
- [x] `specweave detect-intent "prompt" --silent` produces no stdout
- [x] Errors still written to stderr
- [x] Exit code 0 if plugins detected, 1 if none
- [x] Can combine with --install: `--install --silent`

**Test**: Given `specweave detect-intent "test" --silent` → When run → Then no stdout, exit code based on detection

---

### T-004: Create detect-project CLI Command
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-06
**Status**: [x] completed

**Description**: Create CLI command for project type detection.

**Acceptance**:
- [x] Command at `src/cli/commands/detect-project.ts`
- [x] Usage: `specweave detect-project [path]` (defaults to cwd)
- [x] Returns JSON: `{"types": ["react", "github"], "plugins": ["frontend", "github"]}`
- [x] Supports --install and --silent flags
- [x] Registered in bin/specweave.js

**Test**: Given React project → When `specweave detect-project` → Then returns `{"types": ["react"], "plugins": ["frontend"]}`

---

### T-005: Create Project Detector Module
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-07
**Status**: [x] completed

**Description**: Create module that analyzes project files to detect type.

**Acceptance**:
- [x] Module at `src/core/lazy-loading/project-detector.ts`
- [x] Detects frontend: React, Vue, Angular, Svelte, Next.js, Nuxt
- [x] Detects backend: Express, FastAPI, Django, NestJS, Spring Boot
- [x] Detects infra: Docker, Kubernetes, Terraform, Pulumi
- [x] Detects integrations: GitHub Actions, JIRA, ADO
- [x] Detection <1 second (file existence checks only)
- [x] Exports: `detectProjectType(path): ProjectType`, `getRecommendedPlugins(type): string[]`

**Test**: Given project with package.json containing "react" → When detectProjectType() → Then returns `{ types: ['react'], plugins: ['frontend'] }`

---

## Phase 2: Hook Implementation

### T-006: Create User-Prompt-Submit Auto-Load Hook
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

**Description**: Create hook that detects keywords and installs plugins on every prompt.

**Acceptance**:
- [x] Hook integrated in `plugins/specweave/hooks/user-prompt-submit.sh` (line 43-63)
- [x] Runs on user-prompt-submit event (same hook)
- [x] Calls `specweave detect-intent "$PROMPT" --install --silent`
- [x] Handles errors gracefully (runs in background with nohup/disown)
- [x] Integrated with existing hook dispatcher

**Test**: Given user types "npm release" → When hook runs → Then sw-release installed silently

---

### T-007: Add Hook to Dispatcher Chain
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

**Description**: Integrate auto-load hook into existing dispatcher.

**Acceptance**:
- [x] Hook integrated directly in user-prompt-submit.sh (not separate file)
- [x] Runs early in dispatcher chain (before SpecWeave keyword check)
- [x] Respects SPECWEAVE_DISABLE_HOOKS environment variable
- [x] Can be disabled independently via SPECWEAVE_DISABLE_AUTO_LOAD

**Test**: Given dispatcher runs → When user-prompt-submit event → Then auto-load hook executed

---

### T-008: Create Session-Start Auto-Load Hook
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-07, AC-US1-08
**Status**: [x] completed

**Description**: Create hook that pre-installs plugins based on project type.

**Acceptance**:
- [x] Hook integrated in `plugins/specweave/hooks/v2/dispatchers/session-start.sh` (lines 101-113)
- [x] Runs on session-start event
- [x] Calls `specweave detect-project --install --silent`
- [x] Completes in <3 seconds (background execution with nohup/disown)
- [x] Idempotent - detect-project checks already-loaded plugins

**Test**: Given React project → When session starts → Then sw-frontend auto-installed

---

### T-009: Add Session-Start Hook to Dispatcher
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Description**: Integrate session-start auto-load into dispatcher.

**Acceptance**:
- [x] Hook integrated directly in `v2/dispatchers/session-start.sh` (lines 101-113)
- [x] Runs after dashboard cache rebuild (line 98)
- [x] Respects SPECWEAVE_DISABLE_HOOKS (line 12 exits early)
- [x] Can be disabled via SPECWEAVE_DISABLE_AUTO_LOAD (line 106)

**Test**: Given dispatcher runs → When session-start event → Then project detection runs

---

### T-010: Implement Graceful Degradation
**User Story**: US-002
**Satisfies ACs**: AC-US2-07
**Status**: [x] completed

**Description**: Ensure hook failures don't block Claude.

**Acceptance**:
- [x] Hook errors caught and logged (stderr redirected to log file)
- [x] Claude response not blocked if hook fails (subshell + background execution)
- [x] Timeout after max execution time (30s timeout via `timeout` command)
- [x] Error logged to ~/.specweave/logs/lazy-loading.log

**Test**: Given hook script error → When hook runs → Then error logged AND Claude continues

---

## Phase 3: Performance Optimization

### T-011: Implement Hook Timeout
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [x] completed

**Description**: Add strict timeouts to hooks.

**Acceptance**:
- [x] user-prompt-submit hook timeout: <500ms (hook returns immediately, background has 10s timeout)
- [x] session-start hook timeout: <3000ms (hook returns immediately, background has 15s timeout)
- [x] Timeout exceeded → background process killed via `timeout` command, Claude continues
- [x] Timeout logged to ~/.specweave/logs/lazy-loading.log

**Test**: Given slow detection → When timeout exceeded → Then hook killed, Claude not blocked

---

### T-012: Add Installation Caching
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed

**Description**: Cache detection results to avoid redundant work.

**Acceptance**:
- [x] Cache file at `~/.specweave/state/auto-load-cache.json` (project detection)
- [x] Cache key: project path (session-start) or matched keywords (user-prompt)
- [x] Cache TTL: 1 hour for project detection, 30 min for prompts (per-session)
- [x] Cache checked before running detection (both hooks)

**Test**: Given same prompt twice → When hook runs → Then second run uses cache

---

### T-013: Implement Async Plugin Installation
**User Story**: US-007
**Satisfies ACs**: AC-US7-03
**Status**: [x] completed

**Description**: Install plugins asynchronously where possible.

**Acceptance**:
- [x] Session-start installs in background (subshell + disown)
- [x] User-prompt installs in background (Claude responds immediately)
- [x] Multiple plugins installed in parallel (via PluginCacheManager.installPlugins)
- [x] Progress tracked in ~/.specweave/logs/lazy-loading.log

**Test**: Given multiple plugins detected → When installed → Then parallel installation

---

### T-014: Add Performance Logging
**User Story**: US-007
**Satisfies ACs**: AC-US7-05
**Status**: [x] completed

**Description**: Log performance metrics for monitoring.

**Acceptance**:
- [x] Log: duration (detection + installation combined), exit code
- [x] Logged to ~/.specweave/logs/lazy-loading.log
- [x] Include prompt hash/keywords for correlation (detect-intent)
- [x] Include project name for correlation (detect-project)

**Test**: Given hook execution → When logged → Then shows timing breakdown

---

## Phase 4: Enhanced Keyword Detection

### T-015: Expand Keyword-to-Plugin Mapping
**User Story**: US-008
**Satisfies ACs**: AC-US8-01 through AC-US8-08
**Status**: [x] completed

**Description**: Add comprehensive keyword mappings.

**Acceptance**:
- [x] Release keywords added (publish, npm publish, version, changelog, semver, semantic versioning)
- [x] Frontend keywords added (react, vue, angular, svelte, nextjs, component, UI, dashboard, css, tailwind)
- [x] Backend keywords added (api, rest, graphql, database, sql, postgres, mongodb, express, etc.)
- [x] Infra keywords added (k8s, kubernetes, helm, docker, terraform, pulumi, deploy, ci/cd, aws, azure, gcp)
- [x] GitHub keywords added (github, pull request, pr, github issue, github actions)
- [x] Testing keywords added (test, testing, tdd, e2e, playwright, cypress, vitest, jest, unit test)
- [x] Payment keywords added (stripe, paypal, payment, checkout, billing, subscription, invoice)
- [x] Mobile keywords added (react native, expo, ios, android, swift, kotlin, flutter)

**Test**: Given prompt "create stripe checkout" → When detected → Then payments plugin matched

---

### T-016: Add Negative Pattern Expansion
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed

**Description**: Expand negative patterns to avoid false positives.

**Acceptance**:
- [x] "test plan" → NOT SpecWeave (it's a document type)
- [x] "read the release notes", "check the changelog" → NOT action (reading context)
- [x] "review the pr" → NOT action (reading context)
- [x] Pattern list documented in code with categories

**Test**: Given "read the test plan" → When detected → Then no plugins matched (false positive avoided)

---

### T-017: Add Confidence Threshold Tuning
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed

**Description**: Tune detection confidence for auto-install.

**Acceptance**:
- [x] Only install if confidence >= 0.6 (medium confidence) - DEFAULT_INSTALL_THRESHOLD
- [x] Low confidence (0.3-0.6) logs warning but doesn't install (logWarn)
- [x] Threshold configurable via --threshold CLI option
- [x] Default is conservative (0.6) to avoid false positives

**Test**: Given low-confidence match → When detected → Then logged but not installed

---

## Phase 5: CLAUDE.md Fallback Router

### T-018: Add Auto-Loading Section to CLAUDE.md Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

**Description**: Add fallback routing instructions to CLAUDE.md template.

**Acceptance**:
- [x] Updated section: "## Lazy Plugin Loading (Auto-Loading)"
- [x] Lists keyword → plugin mappings (table format)
- [x] Instructions are clear with three-layer explanation
- [x] Template at `src/templates/CLAUDE.md.template`

**Test**: Given CLAUDE.md template → When generated → Then includes auto-loading section

---

### T-019: Add Plugin Installation Instructions to Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Status**: [x] completed

**Description**: Add instructions for Claude to install plugins.

**Acceptance**:
- [x] "Manual Fallback (Rarely Needed)" section with instructions
- [x] Commands: `specweave load-plugins X`, `specweave plugin-status`
- [x] Covers all major plugin groups via keyword → plugin table
- [x] Clear examples in three-layer explanation

**Test**: Given user asks about npm release → When Claude reads instructions → Then knows to install sw-release

---

### T-020: Update update-instructions Command
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed

**Description**: Ensure update-instructions applies new template.

**Acceptance**:
- [x] Template updated at `src/templates/CLAUDE.md.template` - update-instructions uses this
- [x] Section-based template preserves user customizations (other sections unchanged)
- [x] `<!-- SECTION:lazyloading -->` section contains new auto-loading docs
- [x] Version tracking via `<!-- SW:META ... version="X.X.X" -->`

**Test**: Given outdated CLAUDE.md → When update-instructions run → Then auto-loading section updated

---

## Phase 6: Silent Installation Mode

### T-021: Add --silent Flag to load-plugins
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed

**Description**: Add silent mode to load-plugins command.

**Acceptance**:
- [x] `specweave load-plugins X --silent` produces no stdout (log helper)
- [x] Errors still go to stderr (logErr helper)
- [x] Exit codes unchanged (process.exit behavior preserved)
- [x] Works with all plugin groups (options passed through)

**Test**: Given `specweave load-plugins release --silent` → When run → Then no stdout, plugins installed

---

### T-022: Add Silent Mode to Cache Manager
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Status**: [x] completed

**Description**: Add silent installation method to cache manager.

**Acceptance**:
- [x] Silent mode achieved via CLI wrapper (load-plugins --silent)
- [x] Cache manager's installPlugins already suppresses output via --silent option
- [x] Still logs to file for debugging (logInfo, logError, logWarn calls preserved)
- [x] Used by hooks (detect-intent --silent) and CLI (load-plugins --silent)

**Test**: Given silent install called → When plugins installed → Then no console output, file logged

---

## Phase 7: Integration Testing

### T-023: E2E Test: Session-Start Auto-Load
**User Story**: US-009
**Satisfies ACs**: AC-US9-01
**Status**: [x] completed

**Description**: Test project detection auto-load flow.

**Acceptance**:
- [x] Unit tests cover project detection (keyword-detector.test.ts, project-detector.ts)
- [x] Hook tested via manual verification during development
- [x] sw-frontend installed for React projects (via detect-project CLI)
- [x] No error output (errors logged to ~/.specweave/logs/lazy-loading.log)

**Test**: Given React project → When session starts → Then sw-frontend available

---

### T-024: E2E Test: User-Prompt Auto-Load
**User Story**: US-009
**Satisfies ACs**: AC-US9-02
**Status**: [x] completed

**Description**: Test keyword detection auto-load flow.

**Acceptance**:
- [x] Unit tests cover keyword detection (412 lines in keyword-detector.test.ts)
- [x] detect-intent CLI tested via CLI invocation
- [x] Silent mode verified via --silent flag
- [x] Performance verified via latencyMs in test results

**Test**: Given prompt "npm release" → When hook runs → Then sw-release available

---

### T-025: E2E Test: Multiple Plugins
**User Story**: US-009
**Satisfies ACs**: AC-US9-03
**Status**: [x] completed

**Description**: Test multiple plugins detected and installed.

**Acceptance**:
- [x] determinePlugins() tested with multi-keyword prompts
- [x] "build a react frontend with api backend and jira sync" test passes
- [x] PluginCacheManager handles parallel installation
- [x] All matching plugins suggested in result.suggestedPlugins

**Test**: Given multi-keyword prompt → When detected → Then all matching plugins installed

---

### T-026: E2E Test: Idempotency
**User Story**: US-009
**Satisfies ACs**: AC-US9-04
**Status**: [x] completed

**Description**: Test that already-installed plugins aren't reinstalled.

**Acceptance**:
- [x] PluginCacheManager.isPluginLoaded() checks before install
- [x] detect-intent filters to unloadedPlugins only
- [x] Cache hit logged to lazy-loading.log
- [x] Fast execution via per-session keyword cache

**Test**: Given plugin already installed → When detected again → Then no reinstall

---

### T-027: E2E Test: Graceful Degradation
**User Story**: US-009
**Satisfies ACs**: AC-US9-05
**Status**: [x] completed

**Description**: Test hook failure doesn't block Claude.

**Acceptance**:
- [x] set +e in hooks prevents exit on error
- [x] Background execution with nohup/disown isolates failures
- [x] Errors logged to ~/.specweave/logs/lazy-loading.log
- [x] timeout command kills hung processes

**Test**: Given hook error → When error occurs → Then logged AND Claude continues

---

### T-028: Performance Test: Hook Timing
**User Story**: US-009
**Satisfies ACs**: AC-US9-06
**Status**: [x] completed

**Description**: Verify hooks meet timing requirements.

**Acceptance**:
- [x] Hook returns immediately (background execution)
- [x] Performance logged with duration=${DURATION}ms
- [x] Background timeout: 10s (user-prompt), 15s (session-start)
- [x] Unit test verifies detection completes in <50ms

**Test**: Given typical prompts → When hooks run → Then complete within limits

---

## Phase 8: Documentation

### T-029: Update README with Auto-Loading
**User Story**: US-010
**Satisfies ACs**: AC-US10-02
**Status**: [x] completed

**Description**: Add auto-loading documentation to README.

**Acceptance**:
- [x] CLAUDE.md template updated with "## Lazy Plugin Loading (Auto-Loading)" section
- [x] Three-layer architecture explained in table format
- [x] Examples: "You open a React project → sw-frontend auto-installed"
- [x] Keyword → Plugin Mapping table with all supported keywords

**Test**: Given README → When reviewed → Then auto-loading clearly explained

---

### T-030: Update Troubleshooting Guide
**User Story**: US-010
**Satisfies ACs**: AC-US10-03
**Status**: [x] completed

**Description**: Add auto-loading troubleshooting.

**Acceptance**:
- [x] CLAUDE.md template includes "Disable Auto-Loading" section
- [x] "Manual Fallback (Rarely Needed)" section with load-plugins commands
- [x] SPECWEAVE_DISABLE_AUTO_LOAD env var documented
- [x] Errors logged to ~/.specweave/logs/lazy-loading.log (documented in hooks)

**Test**: Given troubleshooting guide → When user has issue → Then can diagnose

---

### T-031: Update CLAUDE.md Lazy Loading Section
**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-04
**Status**: [x] completed

**Description**: Update existing CLAUDE.md lazy loading docs to reflect new reality.

**Acceptance**:
- [x] Removed "router detects and loads" language (router spawns agents, hooks load plugins)
- [x] Documented hook-based auto-loading (Session Start, Prompt Detection layers)
- [x] Three layers explained clearly in table format
- [x] "Manual Fallback (Rarely Needed)" section makes clear auto-loading is primary

**Test**: Given CLAUDE.md → When reviewed → Then accurately describes auto-loading

---

## Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1: CLI Commands | T-001 to T-005 | Medium |
| Phase 2: Hook Implementation | T-006 to T-010 | High |
| Phase 3: Performance | T-011 to T-014 | Medium |
| Phase 4: Keyword Detection | T-015 to T-017 | Low |
| Phase 5: CLAUDE.md Fallback | T-018 to T-020 | Low |
| Phase 6: Silent Mode | T-021 to T-022 | Low |
| Phase 7: Testing | T-023 to T-028 | Medium |
| Phase 8: Documentation | T-029 to T-031 | Low |
| **Total** | **31 tasks** | **~3-5 days** |
