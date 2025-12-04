---
increment: 0097-umbrella-module-detection
title: Umbrella Repository Module Detection
type: feature
priority: critical
status: completed
created: 2024-12-03
---

# Umbrella Repository Module Detection

## Problem Statement

SpecWeave's living docs builder fails to detect modules in umbrella/multi-repo projects. When a project contains 200+ cloned child repositories (e.g., from Azure DevOps), the discovery phase reports "0 modules detected" because:

1. Module detection only scans `src/`, `lib/`, `app/`, `packages/` folders
2. No recognition of `.git` directories as module boundaries
3. Clone job output (repo list) is not consumed by living docs builder
4. Tech stack detection only reads root-level config files

## User Stories

### US-001: Umbrella Module Detection
**As a** developer working with an umbrella repository containing multiple cloned repos
**I want** SpecWeave to automatically detect each child repo as a module
**So that** living docs builder can analyze and document each project correctly

#### Acceptance Criteria
- [x] **AC-US1-01**: Child repos with `.git` directories are detected as modules
- [x] **AC-US1-02**: Modules from clone job config.json are recognized when available
- [x] **AC-US1-03**: Each detected module has correct path, name, and file stats
- [x] **AC-US1-04**: Detection works for 200+ repos without performance issues

### US-002: Clone Job Integration
**As a** user who ran clone-repos job
**I want** living docs builder to use the clone job's repo list
**So that** I don't need to wait for re-scanning of already-known repos

#### Acceptance Criteria
- [x] **AC-US2-01**: Living docs worker reads repos from clone job config when available
- [x] **AC-US2-02**: Repo metadata (path, name, team) is preserved from clone job
- [x] **AC-US2-03**: Fallback to .git scanning when no clone job exists

### US-003: Per-Module Tech Stack Detection
**As a** developer documenting a multi-repo project
**I want** each module's tech stack to be detected independently
**So that** I can see which technologies are used in each child repo

#### Acceptance Criteria
- [x] **AC-US3-01**: Tech stack detection runs per-module for umbrella projects
- [x] **AC-US3-02**: Each module's package.json/go.mod/etc is parsed
- [x] **AC-US3-03**: Aggregated tech stack summary includes all modules
- [x] **AC-US3-04**: Framework detection (React, Vue, .NET, etc.) works per-module

### US-004: Umbrella Config Persistence
**As a** user who completed clone-repos job
**I want** the umbrella structure to be persisted to config.json
**So that** subsequent runs don't need to re-discover the repo structure

#### Acceptance Criteria
- [x] **AC-US4-01**: Clone job writes `umbrella.childRepos` to config.json
- [x] **AC-US4-02**: Config includes repo path, name, team mapping
- [x] **AC-US4-03**: Living docs can read umbrella config without clone job

## Technical Requirements

- No breaking changes to existing single-repo discovery
- Performance: Handle 500+ repos in under 30 seconds
- Memory: Streaming/iterative processing for large repo counts
