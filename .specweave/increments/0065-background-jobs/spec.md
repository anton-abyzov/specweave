---
increment: 0065-background-jobs
title: "Background Jobs for Long-Running Operations"
priority: P1
status: completed
created: 2024-11-26
completed: 2024-11-26
type: feature
tech_stack:
  language: typescript
  framework: nodejs
---

# Background Jobs for Long-Running Operations

## Overview

Enable long-running operations (repo cloning, 10K+ issue imports) to run in background while users continue working. Track progress across sessions.

## User Stories

### US-001: Background Repo Cloning
**As a** user setting up multi-repo project
**I want** repo cloning to run in background
**So that** I can continue working while repos clone

**Acceptance Criteria**:
- [x] **AC-US1-01**: Cloning starts in background after init prompts
- [x] **AC-US1-02**: Progress shows `(2/4) → repo-name`
- [x] **AC-US1-03**: `/specweave:jobs` shows cloning progress
- [x] **AC-US1-04**: Job persists across Claude sessions

### US-002: Background Issue Import
**As a** user importing 10K+ issues
**I want** import to run in background
**So that** I can work while large imports complete

**Acceptance Criteria**:
- [x] **AC-US2-01**: Import starts after `/specweave:import-external`
- [x] **AC-US2-02**: Progress shows items/total with ETA
- [x] **AC-US2-03**: Rate limits auto-pause job
- [x] **AC-US2-04**: Resume with `/specweave:jobs --resume <id>`

### US-003: Job Management
**As a** user
**I want** to monitor and manage background jobs
**So that** I have visibility into long-running operations

**Acceptance Criteria**:
- [x] **AC-US3-01**: `/specweave:jobs` shows all active jobs
- [x] **AC-US3-02**: `--id <id>` shows job details
- [x] **AC-US3-03**: `--resume <id>` resumes paused job
- [x] **AC-US3-04**: Jobs auto-cleanup (keep last 10)

## Technical Notes

### Implementation Summary
- Core job manager: `src/core/background/job-manager.ts`
- Types: `src/core/background/types.ts`
- Module exports: `src/core/background/index.ts`
- Slash command: `plugins/specweave/commands/specweave-jobs.md`
- Repo cloning integration: `src/core/repo-structure/repo-initializer.ts`
- External import integration: `src/cli/helpers/init/external-import.ts`
- Test suite: `tests/integration/core/background-job-manager.test.ts` (16 tests)
- Internal docs: `.specweave/docs/internal/architecture/background-jobs.md`
- Public docs: `docs/BACKGROUND-JOBS.md`
