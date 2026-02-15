---
increment: 0220-docs-site-cleanup
title: "Decouple docs-site scripts from root package.json"
type: refactor
priority: P1
status: in-progress
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Decouple docs-site scripts from root package.json

## Overview

Remove 5 `docs:*` convenience scripts from root `package.json` that couple `docs-site/` (SpecWeave product website) to the main project. Update CONTRIBUTING.md to reference `specweave docs` CLI instead. Prerequisite for 0219-multi-repo-migrate.

## User Stories

### US-001: Remove docs scripts from root package.json (P0)
**Project**: specweave
**Board**: modules

**As a** SpecWeave developer
**I want** the root package.json to not contain docs-site proxy scripts
**So that** docs-site is decoupled and can later be moved to an umbrella workspace

**Acceptance Criteria**:
- [x] **AC-US1-01**: The 5 `docs:*` scripts are removed from root `package.json`
- [x] **AC-US1-02**: `npm run rebuild` passes without errors
- [x] **AC-US1-03**: `npm test` passes without errors
- [x] **AC-US1-04**: GitHub Actions workflows (`deploy-docs.yml`, `docs-build.yml`) are unaffected (they use `cd docs-site` directly)

---

### US-002: Update documentation references (P0)
**Project**: specweave
**Board**: modules

**As a** contributor
**I want** CONTRIBUTING.md to reference the correct docs commands
**So that** I know how to preview and build docs

**Acceptance Criteria**:
- [x] **AC-US2-01**: CONTRIBUTING.md references `specweave docs preview` and `specweave docs build` instead of `npm run docs:*`
- [x] **AC-US2-02**: For public site development, CONTRIBUTING.md shows `cd docs-site && npm start` as the direct approach

## Out of Scope

- Changes to `docs-site/` itself
- Changes to GitHub Actions workflows
- Changes to `specweave docs` CLI command
