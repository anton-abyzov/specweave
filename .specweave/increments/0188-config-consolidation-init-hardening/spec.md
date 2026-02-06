# 0188: Config Type Consolidation & Init Wizard Hardening

## Overview

The SpecWeave codebase has accumulated two parallel config type systems (`SpecweaveConfig` vs `SpecWeaveConfig`), two ConfigManager implementations, and two DEFAULT_CONFIG objects. The init wizard has inconsistent CI detection, broken i18n string replacements for 6/9 languages, silent behavior in `continueExisting` mode, and asymmetric provider handling. This increment consolidates the config architecture and hardens the init wizard.

## Problem Statement

1. **Dual config types**: `SpecweaveConfig` (camelCase, 100 fields, 25+ importers) in `src/core/types/config.ts` and `SpecWeaveConfig` (PascalCase, 16 fields, 12 importers) in `src/core/config/types.ts` — confusing for contributors, impossible to maintain.
2. **Dual ConfigManagers**: Old (156 lines, no validation) at `src/core/config-manager.ts`, new (506 lines, validation + migration) at `src/core/config/config-manager.ts` — code calling different managers get different behavior.
3. **Init wizard bugs**: CI detection uses different env vars at different points, translation string replacements are hard-coded for 3/9 languages, `continueExisting` silently skips 4 steps, GitHub/Bitbucket lack multi-project folder creation that JIRA/ADO have.

---

## User Stories

### US-001: Unified Config Type System

**As a** SpecWeave contributor
**I want** a single config type definition and ConfigManager
**So that** I don't encounter confusing import paths and inconsistent behavior

**Acceptance Criteria**:
- [x] AC-US1-01: Single `SpecweaveConfig` type exported from `src/core/config/types.ts` with all ~100 fields
- [x] AC-US1-02: Old `src/core/types/config.ts` re-exports from new location (backward compat) with deprecation comment
- [x] AC-US1-03: Single `ConfigManager` at `src/core/config/config-manager.ts` with all methods from both implementations
- [x] AC-US1-04: Old `src/core/config-manager.ts` re-exports from new location with deprecation comment
- [x] AC-US1-05: Single `DEFAULT_CONFIG` with all ~100 fields, validated against the type
- [x] AC-US1-06: All 25+ importers of old type path continue to compile without changes
- [x] AC-US1-07: All 15+ importers of old ConfigManager continue to work without changes
- [x] AC-US1-08: All existing unit tests pass without modification

### US-002: CI/CD Configuration in Config Schema

**As a** project maintainer
**I want** CI/CD strategy (direct push vs PR-based) configurable in `.specweave/config.json`
**So that** each project can choose its auto-fix approach

**Acceptance Criteria**:
- [x] AC-US2-01: `CiCdConfig` interface added with `pushStrategy: 'direct' | 'pr-based'`, `autoFix.enabled`, `autoFix.maxRetries`, `autoFix.allowedBranches`
- [x] AC-US2-02: `cicd` section added to unified `SpecweaveConfig` type
- [x] AC-US2-03: `DEFAULT_CONFIG.cicd` populated with sensible defaults (`pushStrategy: 'direct'`, `autoFix.enabled: true`, `maxRetries: 1`, `allowedBranches: ['develop', 'main']`)
- [x] AC-US2-04: Existing standalone `src/core/cicd/config-loader.ts` reads from unified config first, falls back to env vars

### US-003: Init Wizard CI Detection Fix

**As a** developer running `specweave init` in CI environments
**I want** consistent CI detection across all wizard steps
**So that** init doesn't show interactive prompts in non-TTY environments

**Acceptance Criteria**:
- [x] AC-US3-01: Single `isCI` constant defined once, used everywhere in init.ts
- [x] AC-US3-02: `isQuickMode` removed or aliased to the single `isCI` definition
- [x] AC-US3-03: GitLab CI, CircleCI, and non-TTY environments correctly detected for ALL wizard steps including LSP setup

### US-004: Translation String Replacements for All Languages

**As a** non-English SpecWeave user
**I want** the init wizard translation prompts to display correctly in my language
**So that** the UI isn't broken with untranslated English fragments

**Acceptance Criteria**:
- [x] AC-US4-01: All 9 languages (en, ru, es, zh, de, fr, ja, ko, pt) have proper enable/disable choice text in translation-config.ts
- [x] AC-US4-02: Hard-coded `.replace('Translat', ...)` pattern replaced with per-language string definitions
- [x] AC-US4-03: Each language's `translatedStrings` object includes dedicated `enableChoice` and `disableChoice` fields

### US-005: Init Wizard User Feedback for Skipped Steps

**As a** developer running `specweave init` with `continueExisting`
**I want** to see which configuration steps are being preserved
**So that** I understand what's happening and can re-run with `--force` if needed

**Acceptance Criteria**:
- [x] AC-US5-01: When `continueExisting` is true, each skipped step prints a gray message like "Keeping existing testing configuration"
- [x] AC-US5-02: External import step skip is announced (currently silent jump to 'living-docs')
- [x] AC-US5-03: Translation step skip is announced for non-English languages

### US-006: Symmetric Provider Multi-Project Support

**As a** developer using GitHub or Bitbucket with multiple repositories
**I want** multi-project folder structure created during init
**So that** I get the same organized specs layout as JIRA and ADO users

**Acceptance Criteria**:
- [x] AC-US6-01: GitHub multi-repo selection creates `specs/{repo-name}/` folders (matching JIRA/ADO behavior)
- [x] AC-US6-02: Bitbucket multi-repo selection creates `specs/{repo-name}/` folders
- [x] AC-US6-03: Folder creation logic extracted into a shared helper used by all 4 providers

---

## Out of Scope

- Global user-level config (`~/.specweave/defaults.json`) — tracked separately
- Config UI/web dashboard — future increment
- Full i18n audit of all CLI messages — only fixing translation-config.ts replacements
- CI auto-fix workflow template generation from config — future increment
