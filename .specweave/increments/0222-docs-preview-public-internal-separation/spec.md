---
increment: 0222-docs-preview-public-internal-separation
title: "Docs Preview Public/Internal Separation"
type: feature
priority: P1
status: active
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Docs Preview Public/Internal Separation

## Overview

Add `--scope internal|public` flag to docs preview, build, validate commands. Internal docs on port 3015, public docs on port 3016, matching the sw-docs plugin convention.

## User Stories

### US-001: Scope-Aware Docs Preview (P0)
**Project**: specweave

**As a** developer
**I want** to preview both internal and public documentation separately
**So that** I can verify public docs before they go to production

**Acceptance Criteria**:
- [x] **AC-US1-01**: `specweave docs preview` launches on port 3015 (internal, default)
- [x] **AC-US1-02**: `specweave docs preview --scope public` launches on port 3016 from `.specweave/docs/public/`
- [x] **AC-US1-03**: Helpful error when public docs directory is empty/missing
- [x] **AC-US1-04**: Both servers can run simultaneously on their respective ports

---

### US-002: Scope-Aware Docs Build & Validate (P0)
**Project**: specweave

**As a** developer
**I want** to build and validate public docs independently
**So that** I can catch issues before syncing to the production site

**Acceptance Criteria**:
- [x] **AC-US2-01**: `specweave docs build --scope public` builds public docs into `docs-site-public/build/`
- [x] **AC-US2-02**: `specweave docs validate --scope public` validates public docs
- [x] **AC-US2-03**: Default scope remains `internal` for all commands

---

### US-003: Status Shows Both Scopes (P1)
**Project**: specweave

**As a** developer
**I want** docs status to show both internal and public documentation
**So that** I can see the full picture at a glance

**Acceptance Criteria**:
- [x] **AC-US3-01**: `specweave docs status` shows status for both internal and public docs

---

### US-004: Test Coverage (P1)
**Project**: specweave

**As a** developer
**I want** tests to cover the new scope functionality
**So that** regressions are caught early

**Acceptance Criteria**:
- [x] **AC-US4-01**: Existing tests pass unchanged (backwards compat)
- [x] **AC-US4-02**: New tests for scope=public path resolution and port assignment

## Out of Scope

- Content distributor changes (distributing to public docs) - future increment
- Production site (docs-site/) deployment changes
- `--public` boolean shorthand alias (can be added later)
