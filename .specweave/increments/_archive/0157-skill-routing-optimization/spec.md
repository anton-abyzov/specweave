---
increment: 0157-skill-routing-optimization
title: "Skill Routing Optimization and Self-Awareness Guards"
priority: P1
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

# Skill Routing Optimization and Self-Awareness Guards

## Overview

Optimize SpecWeave's skill routing to prevent confusion between `/sw:increment` and `/sw:plan`, add self-awareness guards to detect when running in SpecWeave's own repository, and improve error messages and validation throughout the increment creation workflow.

## Problem Statement

**Current Issues**:
1. `/sw:increment` command documentation incorrectly suggested calling `/sw:plan` instead of `increment-planner` skill
2. No self-awareness when running in SpecWeave repo itself (vs user projects)
3. No validation when user specifies non-sequential increment numbers
4. Confusing error messages when skills called in wrong context
5. No visibility controls for internal-only skills

## User Stories

### US-001: Self-Awareness Guard
**Project**: specweave-dev

**As a** SpecWeave contributor, I want the framework to detect when it's running in its own repository so that I get appropriate warnings before creating increments for SpecWeave development vs creating test examples.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Detect SpecWeave repo by checking `package.json` name field equals "specweave"
- [x] **AC-US1-02**: Detect SpecWeave repo by checking for `src/cli/commands` directory existence
- [x] **AC-US1-03**: Detect SpecWeave repo by checking for `plugins/specweave` directory existence
- [x] **AC-US1-04**: When detected, display warning: "⚠️ Running in SpecWeave repository itself!"
- [x] **AC-US1-05**: Prompt user to confirm: "Creating increment FOR SpecWeave development" vs "Testing with example"
- [x] **AC-US1-06**: Provide options: Continue, Cancel, or Suggest examples/ directory for tests
- [x] **AC-US1-07**: Add `--force-specweave-dev` flag to bypass warning for CI/automation

### US-002: Fix Skill Routing Logic
**Project**: specweave-dev

**As a** SpecWeave user, I want `/sw:increment` to correctly invoke the `increment-planner` skill (not `/sw:plan`) so that new increments are created properly from scratch.

**Acceptance Criteria**:
- [x] **AC-US2-01**: `/sw:increment` command invokes `increment-planner` skill directly
- [x] **AC-US2-02**: `/sw:plan` is ONLY called for existing increments with spec.md
- [x] **AC-US2-03**: Update `/sw:increment` command documentation to clarify workflow
- [x] **AC-US2-04**: `/sw:plan` validates increment exists before proceeding
- [x] **AC-US2-05**: Error message when `/sw:plan` called on non-existent increment is clear and helpful

### US-003: Increment Number Validation
**Project**: specweave-dev

**As a** SpecWeave user, I want validation when I specify a non-sequential increment number so that I understand the implications and can make an informed choice.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Detect when requested number != next available number
- [x] **AC-US3-02**: Show warning: "Requested 0001 but next available is 0157"
- [x] **AC-US3-03**: Offer options: Use next (0157), Force requested (0001), Cancel
- [x] **AC-US3-04**: When forcing non-sequential, log warning to metadata
- [x] **AC-US3-05**: Suggest use case for non-sequential: "Only for examples/tests"

### US-004: Skill Visibility Controls
**Project**: specweave-dev

**As a** SpecWeave developer, I want to mark certain skills as internal-only so that they don't appear in user-facing command lists.

**Acceptance Criteria**:
- [x] **AC-US4-01**: Add `visibility: "internal" | "public"` field to skill manifests
- [x] **AC-US4-02**: Add `invocableBy: string[]` field to restrict which skills can invoke
- [x] **AC-US4-03**: `increment-planner` marked as `visibility: "internal"`
- [x] **AC-US4-04**: `increment-planner` only invocable by `["sw:increment"]`
- [x] **AC-US4-05**: Error message when user tries to call internal skill directly (ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL)
- [x] **AC-US4-06**: `/plugin list` command filters internal skills by default (documentation-based enforcement)
- [x] **AC-US4-07**: `/plugin list --all` shows internal skills with (internal) label (documentation-based enforcement)

### US-005: Improved Error Messages
**Project**: specweave-dev

**As a** SpecWeave user, I want clear, actionable error messages when I use commands incorrectly so that I can understand what went wrong and how to fix it.

**Acceptance Criteria**:
- [x] **AC-US5-01**: `/sw:plan` without existing increment shows helpful error with next steps (error-formatter.ts integrated)
- [x] **AC-US5-02**: Error distinguishes between "create new" vs "plan existing" (ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT)
- [x] **AC-US5-03**: Error includes examples of correct usage (error formatter has example field)
- [x] **AC-US5-04**: Error shows available increments when ambiguous (ERROR_MESSAGES.INCREMENT_NOT_FOUND with suggestions)
- [x] **AC-US5-05**: All error messages follow consistent format with emoji indicators (formatError with severity icons)

### US-006: Documentation Updates
**Project**: specweave-dev

**As a** SpecWeave user, I want accurate documentation for increment creation commands so that I understand the correct workflow.

**Acceptance Criteria**:
- [x] **AC-US6-01**: Update `/sw:increment` command docs with correct skill routing (error handling section added)
- [x] **AC-US6-02**: Update `/sw:plan` command docs to clarify it's for existing increments (error handling section added)
- [x] **AC-US6-03**: Add workflow diagram showing: increment → increment-planner → spec/plan/tasks (documented in command files)
- [x] **AC-US6-04**: Document `increment-planner` skill purpose and when it's called (marked as internal with clear warnings)
- [x] **AC-US6-05**: Update CLAUDE.md with corrected workflow examples (added rules 9-10 and troubleshooting entries)

## Functional Requirements

**FR-001**: Repository Detection
- Detect SpecWeave repo via multiple signals (package.json, directory structure)
- Function: `isSpecWeaveRepository(): boolean`
- Location: `src/utils/repository-detector.ts`

**FR-002**: Skill Routing
- `/sw:increment` → `Skill(command: "increment-planner")`
- `/sw:plan` → Validate increment exists → Generate plan/tasks
- Clear separation of concerns

**FR-003**: Increment Validation
- Function: `validateIncrementNumber(requested, next): ValidationResult`
- Returns: `{ isSequential, nextAvailable, recommendation }`

**FR-004**: Skill Manifest Schema
- Add `visibility` field (defaults to "public")
- Add `invocableBy` field (defaults to `["*"]`)
- Enforce restrictions at skill invocation

**FR-005**: Error Message Standards
- Consistent format: `❌ Error: {what went wrong}`
- Always include: `💡 {how to fix it}`
- Provide examples when helpful

## Non-Functional Requirements

**NFR-001**: Backwards Compatibility
- Existing increments continue to work
- No breaking changes to public APIs
- Deprecation warnings for old patterns

**NFR-002**: Performance
- Repository detection < 5ms
- No impact on normal increment creation flow
- Validation checks don't slow down CLI

**NFR-003**: User Experience
- Clear, non-technical error messages
- Helpful suggestions, not just errors
- Consistent terminology across all commands

## Out of Scope

- Redesigning entire skill system architecture
- Changing increment numbering scheme (still 0001-9999)
- Multi-repo increment creation (separate feature)
- Automated increment number assignment based on priority
- Skill dependency management
- Dynamic skill loading/unloading

## Success Criteria

1. SpecWeave repo detection works 100% of time
2. `/sw:increment` never calls `/sw:plan` incorrectly
3. Users get clear warning when specifying non-sequential numbers
4. Internal skills not visible to end users by default
5. Error messages are helpful and actionable (user testing confirms)
6. Zero regressions in existing increment creation workflow
7. Documentation updated and accurate

## Dependencies

- None (internal refactor)

## Estimated Effort

- Implementation: 6-8 hours
- Testing: 3-4 hours
- Documentation: 2 hours

**Total**: 11-14 hours
