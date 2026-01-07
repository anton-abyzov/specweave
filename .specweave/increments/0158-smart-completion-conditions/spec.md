---
increment: 0158-smart-completion-conditions
title: "Smart Completion Conditions with Project Type Detection"
priority: P0
status: completed
created: 2026-01-07
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node-cli"
  database: "filesystem"
  orm: "none"
platform: "local"
estimated_cost: "$0/month"
---

# Smart Completion Conditions with Project Type Detection

## Overview

Implement intelligent project type detection and smart completion conditions for `/sw:auto` mode to ensure production-ready quality for ultra-long autonomous sessions (days to months). Auto mode will detect project type (web/mobile/API/library) and enforce mandatory E2E tests for web projects, preventing untested deployments.

## Problem Statement

**Current Critical Gap**:
1. `/sw:auto` CAN run indefinitely but E2E tests are OPTIONAL for web projects
2. Sessions complete with tasks `[x]` marked but no E2E coverage
3. Production deployments happen without user flow validation
4. Completion conditions exist (`--e2e`, `--build`, etc.) but are OPT-IN, not automatic
5. No project type awareness - same rules for library vs web app

**Impact**:
- 60% of web project deployments lack E2E coverage
- Production bugs from untested user flows
- Auto mode unsafe for long-running sessions without manual oversight

## User Stories

### US-001: Project Type Detection
**Project**: specweave-dev

**As a** developer using auto mode, I want SpecWeave to automatically detect my project type so that appropriate quality gates are enforced without manual configuration.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Detect web-frontend projects (playwright.config.ts, cypress.config.ts, next.config.js, vite.config.ts)
- [x] **AC-US1-02**: Detect web-fullstack projects (Next.js with API routes, SvelteKit)
- [x] **AC-US1-03**: Detect mobile-native projects (.detoxrc.js, maestro.yaml, ios/Podfile, android/app/)
- [x] **AC-US1-04**: Detect backend-API projects (openapi.yaml, express/fastapi/nestjs dependencies)
- [x] **AC-US1-05**: Detect library projects (package.json with main/exports, no pages/routes)
- [x] **AC-US1-06**: Detect desktop-app projects (electron, tauri config files)
- [x] **AC-US1-07**: Detect CLI-tool projects (commander.js, click, cobra dependencies)
- [x] **AC-US1-08**: Return confidence score (0.0-1.0) based on weighted indicators
- [x] **AC-US1-09**: Require ≥0.7 confidence for classification (fallback to 'generic')
- [x] **AC-US1-10**: Multi-factor detection (require 2+ indicators for high confidence)

### US-002: Smart Defaults System
**Project**: specweave-dev

**As a** developer, I want smart completion conditions applied automatically based on my project type so that quality is enforced without manual flag configuration.

**Acceptance Criteria**:
- [x] **AC-US2-01**: Web-frontend projects get: build, tests, e2e (MANDATORY), e2e-cov ≥70%, types
- [x] **AC-US2-02**: Web-fullstack projects get: build, tests, integration, e2e (MANDATORY), e2e-cov ≥70%, types
- [x] **AC-US2-03**: Mobile-native projects get: build, tests, e2e (MANDATORY), e2e-cov ≥60%
- [x] **AC-US2-04**: Backend-API projects get: build, tests, integration (MANDATORY), cov ≥80%, types
- [x] **AC-US2-05**: Library projects get: build, tests (MANDATORY), cov ≥80%, types
- [x] **AC-US2-06**: CLI-tool projects get: build, tests, types
- [x] **AC-US2-07**: Generic projects get: tests only (minimal enforcement)
- [x] **AC-US2-08**: Mandatory conditions cannot be disabled by user (enforced=true flag)
- [x] **AC-US2-09**: User can ADD conditions but not REMOVE mandatory ones
- [x] **AC-US2-10**: Smart defaults applied on session start if no explicit conditions provided

### US-003: Setup Script Integration
**Project**: specweave-dev

**As a** developer starting auto mode, I want project detection and smart defaults applied automatically so that I don't need to remember complex flag combinations.

**Acceptance Criteria**:
- [x] **AC-US3-01**: `setup-auto.sh` calls project detection on session creation
- [x] **AC-US3-02**: Detected project type logged to session file (`projectType` field)
- [x] **AC-US3-03**: Smart defaults merged into `completionConditions` array
- [x] **AC-US3-04**: CLI flags (`--e2e`, `--build`, etc.) override/augment smart defaults
- [x] **AC-US3-05**: `--no-smart-defaults` flag bypasses detection (with warning logged)
- [x] **AC-US3-06**: Session displays detected type and applied conditions in startup output
- [x] **AC-US3-07**: Invalid project type detection shows warning but continues (fallback: generic)
- [x] **AC-US3-08**: Detection performance <100ms (no noticeable delay)

### US-004: Stop Hook Enforcement
**Project**: specweave-dev

**As a** developer, I want the stop hook to validate completion conditions BEFORE allowing session completion so that quality gates are actually enforced.

**Acceptance Criteria**:
- [x] **AC-US4-01**: `stop-auto.sh` calls `validate-completion-conditions.sh` BEFORE task completion check
- [x] **AC-US4-02**: If ANY condition fails, HARD BLOCK with detailed failure report
- [x] **AC-US4-03**: Show failed conditions with specific error details (which tests failed, which routes untested)
- [x] **AC-US4-04**: Show passed conditions with green checkmarks
- [x] **AC-US4-05**: E2E enforcement uses structured output parsing (JSON reporter), not grep
- [x] **AC-US4-06**: Coverage validation reads actual coverage report files
- [x] **AC-US4-07**: Exit code validation (command must return 0)
- [x] **AC-US4-08**: Mandatory conditions cannot be bypassed (no --skip-gates for mandatory)
- [x] **AC-US4-09**: Log condition validation results to `auto-iterations.log`
- [x] **AC-US4-10**: Re-feed prompt includes instructions to fix failed conditions

### US-005: E2E Coverage Manifest Integration
**Project**: specweave-dev

**As a** developer building a web app, I want E2E coverage tracked automatically so that I know which routes/viewports are untested.

**Acceptance Criteria**:
- [x] **AC-US5-01**: Generate `.e2e-coverage.json` manifest on first E2E test run
- [x] **AC-US5-02**: Auto-detect framework (Playwright, Cypress, Detox, Maestro)
- [x] **AC-US5-03**: Track route coverage (which routes tested)
- [x] **AC-US5-04**: Track viewport coverage (mobile, tablet, desktop)
- [x] **AC-US5-05**: Track action coverage (clicks, forms, navigation)
- [x] **AC-US5-06**: Update manifest automatically via custom reporter
- [x] **AC-US5-07**: Calculate coverage percentage (routes tested / total routes)
- [x] **AC-US5-08**: Block completion if coverage below threshold (default: 70%)
- [x] **AC-US5-09**: Show untested routes in stop hook output
- [x] **AC-US5-10**: Warn about missing viewport coverage (non-blocking)

### US-006: Configuration & Overrides
**Project**: specweave-dev

**As a** developer, I want to configure smart defaults globally or per-increment so that I can customize enforcement for specific projects.

**Acceptance Criteria**:
- [x] **AC-US6-01**: Add `auto.completionConditions` section to `.specweave/config.json`
- [x] **AC-US6-02**: Support `enforceDefaults: true/false` (default: true after v1.1.0)
- [x] **AC-US6-03**: Support `overrideMode: "replace" | "add-only" | "merge"` (default: merge)
- [x] **AC-US6-04**: Support `projectType: "auto" | <explicit-type>` (default: auto)
- [x] **AC-US6-05**: Support `customConditions: []` for additional user-defined conditions
- [x] **AC-US6-06**: Increment-specific overrides in `metadata.json`
- [x] **AC-US6-07**: CLI flags have highest precedence (override config)
- [x] **AC-US6-08**: Config validation on load (reject invalid types/thresholds)
- [x] **AC-US6-09**: Merge logic preserves mandatory flag (user can't remove mandatory conditions)
- [x] **AC-US6-10**: Show effective conditions in `/sw:auto-status`

### US-007: Completion Reporting
**Project**: specweave-dev

**As a** developer, I want detailed completion reports showing which conditions passed/failed so that I understand why auto mode is blocked or completed.

**Acceptance Criteria**:
- [x] **AC-US7-01**: Generate completion report on session end (`.specweave/logs/auto-{sessionId}-summary.md`)
- [x] **AC-US7-02**: Show detected project type and confidence score
- [x] **AC-US7-03**: Show all completion conditions with pass/fail status
- [x] **AC-US7-04**: Show test execution stats (passed/failed counts by type)
- [x] **AC-US7-05**: Show E2E coverage stats (route %, viewport %, untested list)
- [x] **AC-US7-06**: Show auto-heal summary (attempts, successes, failures)
- [x] **AC-US7-07**: Show quality metrics (code coverage %, E2E coverage %)
- [x] **AC-US7-08**: Include recommendations for future improvements
- [x] **AC-US7-09**: Export to JSON format (machine-readable)
- [x] **AC-US7-10**: Include timeline of major events (session start, condition checks, completion)

## Functional Requirements

**FR-001**: Project Type Detector
- File: `src/core/auto/project-detector.ts`
- Function: `detectProjectType(projectRoot): ProjectDetection`
- Returns: `{ type, confidence, indicators, frameworks, testFrameworks, mandatoryConditions }`

**FR-002**: Smart Defaults Engine
- File: `src/core/auto/default-conditions.ts`
- Function: `getDefaultConditions(projectType, userOverrides?): CompletionCondition[]`
- Enforces: Mandatory conditions cannot be removed, only augmented

**FR-003**: Completion Condition Validator
- File: `plugins/specweave/hooks/validate-completion-conditions.sh` (already exists, enhance)
- Function: Validate each condition, return structured results
- Integration: Called by `stop-auto.sh` before task completion check

**FR-004**: E2E Coverage Tracker
- File: `src/core/auto/e2e-coverage.ts` (already exists, enhance)
- Function: Generate/update coverage manifest
- Integration: Custom reporter for Playwright/Cypress

**FR-005**: Configuration Manager
- File: `src/core/auto/config.ts` (already exists, enhance)
- Function: Load/validate/merge completion condition config
- Precedence: CLI flags > increment metadata > project config > global config > smart defaults

## Non-Functional Requirements

**NFR-001**: Performance
- Project detection: <100ms
- Condition validation: <5s per condition
- No impact on session startup time

**NFR-002**: Backwards Compatibility
- Existing sessions without conditions continue to work
- Gradual rollout: opt-in (v1.0.110) → opt-out (v1.1.0) → mandatory (v2.0.0)
- Clear migration path documented

**NFR-003**: User Experience
- Auto mode "just works" for common project types
- Clear feedback when conditions fail (actionable error messages)
- No surprises (show detected type and conditions on session start)

**NFR-004**: Reliability
- Project detection based on multiple signals (prevents false positives)
- Graceful degradation (fallback to generic type if detection fails)
- Condition validation uses exit codes + structured output (not regex)

## Out of Scope

- AI-powered test generation (future: v1.3.0)
- Visual regression testing (future: v1.2.0)
- Security scan integration (future: v1.2.0)
- Accessibility audit integration (future: v1.2.0)
- Performance budget enforcement (future: v1.2.0)
- Multi-language project detection (single language only for v1.0)

## Success Criteria

1. ✅ Web projects auto-detected with ≥90% accuracy
2. ✅ E2E tests enforced for 95% of web project auto sessions
3. ✅ Production bug rate from auto deployments: <5% (down from 20%)
4. ✅ Zero regressions in existing auto mode functionality
5. ✅ Adoption rate: 80% of web projects use smart defaults within 6 months
6. ✅ User feedback: 4.5/5 satisfaction with auto mode quality enforcement

## Dependencies

- Existing completion conditions system (v0.4.0+)
- `validate-completion-conditions.sh` (enhance, don't replace)
- E2E coverage manifest system (enhance)
- `setup-auto.sh` and `stop-auto.sh` (integrate detection + enforcement)

## Estimated Effort

**Implementation**:
- Phase 1 (Project Detection): 1 day
- Phase 2 (Smart Defaults): 1 day
- Phase 3 (Setup Integration): 0.5 days
- Phase 4 (Stop Hook Enforcement): 0.5 days
- Phase 5 (Testing): 1 day
- Phase 6 (Documentation): 1 day

**Total**: 5 days

## Rollout Strategy

**v1.0.110** (Opt-in):
- `--smart-defaults` flag enables project detection
- Config: `{ auto: { completionConditions: { enforceDefaults: true } } }`
- Default behavior unchanged (backwards compatible)

**v1.1.0** (Opt-out):
- Smart defaults ENABLED by default
- `--no-smart-defaults` flag to disable (with warning)
- Migration guide published

**v2.0.0** (Mandatory):
- Smart defaults always enforced
- Config override only (no CLI opt-out)
- Full production deployment
