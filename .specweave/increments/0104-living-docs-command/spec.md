---
increment: 0104-living-docs-command
status: completed
---

# Standalone Living Docs Command

## Problem Statement

Currently, the Living Docs Builder can only be launched during `specweave init`. If Claude Code crashes after init completes but before/during the living docs job, users have no way to:
1. Re-launch the living docs builder independently
2. Resume an orphaned job easily
3. Trigger living docs analysis on demand for brownfield projects

For large enterprise projects (247+ repos), this is a critical gap.

## Solution

Create `/specweave:living-docs` command that:
1. Can be run independently after init
2. Supports `--resume <jobId>` to continue orphaned jobs
3. Accepts same options as init (depth, priority areas, etc.)
4. Works with `--depends-on <jobId>` for job chaining
5. Detects orphaned jobs and offers to resume them

## User Stories

### US-001: Re-launch Living Docs After Crash
**As a** user whose Claude Code crashed after init
**I want to** re-launch the living docs builder
**So that** I can complete documentation generation without re-running full init

**Acceptance Criteria:**
- [x] **AC-US1-01**: `/specweave:living-docs` command exists and is documented
- [x] **AC-US1-02**: Command launches living-docs-builder job in background
- [x] **AC-US1-03**: Command shows job ID and monitoring instructions

### US-002: Resume Orphaned Jobs
**As a** user with an orphaned living docs job
**I want to** resume from the last checkpoint
**So that** I don't lose progress from previous analysis

**Acceptance Criteria:**
- [x] **AC-US2-01**: `--resume <jobId>` resumes specific job from checkpoint
- [x] **AC-US2-02**: Command auto-detects orphaned jobs and offers to resume
- [x] **AC-US2-03**: Resume continues from last completed phase

### US-003: Configure Analysis Depth
**As a** user
**I want to** specify analysis depth and priority areas
**So that** I can control scope and cost of analysis

**Acceptance Criteria:**
- [x] **AC-US3-01**: `--depth` accepts: quick, standard, deep-native, deep-api
- [x] **AC-US3-02**: `--priority` accepts comma-separated module names
- [x] **AC-US3-03**: `--sources` accepts additional doc folders

## Technical Design

### Command Interface
```bash
/specweave:living-docs [options]
  --resume <jobId>          # Resume orphaned job
  --depth <level>           # quick|standard|deep-native|deep-api
  --priority <modules>      # auth,payments,api (comma-separated)
  --sources <folders>       # docs/,wiki/ (comma-separated)
  --depends-on <jobIds>     # Wait for jobs before starting
  --foreground              # Run in current session (not background)
```

### Implementation
1. Command: `plugins/specweave/commands/specweave-living-docs.md`
2. CLI: `src/cli/commands/living-docs.ts`
3. Reuses: `launchLivingDocsJob()` from `job-launcher.ts`
4. Reuses: Checkpoint system from `living-docs-worker.ts`
