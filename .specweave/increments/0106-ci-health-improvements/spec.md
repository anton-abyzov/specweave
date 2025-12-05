---
increment: 0106-ci-health-improvements
project: specweave
status: completed
---

# CI Health Improvements

## Overview

Fix GitHub Actions failures to ensure CI remains healthy. Focus on unit tests as the primary quality gate while making other workflows more robust.

## Problem Statement

Almost every GitHub Actions workflow is failing:
- **DORA Metrics**: Scheduled workflow fails (permission issues)
- **E2E Smoke Test**: Requires ANTHROPIC_API_KEY secret
- **Test & Validate**: Flaky time-based test causes intermittent failures
- **Release**: Manual workflow but has issues

## User Stories

### US-001: Fix Flaky Unit Tests
**As a** developer
**I want** unit tests to pass consistently
**So that** CI provides reliable feedback

#### Acceptance Criteria
- [x] **AC-US1-01**: Fix time-based test flakiness in `dashboard-data.test.ts`
- [x] **AC-US1-02**: All unit tests pass locally and in CI

### US-002: Make E2E Workflow Robust
**As a** maintainer
**I want** E2E workflow to handle missing secrets gracefully
**So that** scheduled runs don't fail if API key is unavailable

#### Acceptance Criteria
- [x] **AC-US2-01**: E2E workflow skips or provides clear message when ANTHROPIC_API_KEY missing
- [x] **AC-US2-02**: Workflow doesn't create failure noise in Actions tab

### US-003: Fix DORA Metrics Workflow
**As a** maintainer
**I want** DORA metrics to work on scheduled runs
**So that** we track deployment frequency automatically

#### Acceptance Criteria
- [x] **AC-US3-01**: DORA metrics workflow handles permission issues gracefully
- [x] **AC-US3-02**: Scheduled runs don't fail silently

## Out of Scope
- Full E2E test automation with API keys
- New metrics dashboards
