---
increment: 0062-multi-project-spec-generation
title: "Multi-Project Spec Generation"
type: feature
priority: P1
status: completed
created: 2025-11-26
completed: 2025-11-26
test_mode: test-after
coverage_target: 80
---

# Feature: Multi-Project Spec Generation

## Overview

When generating `spec.md` for increments, SpecWeave must detect multi-project configurations and generate project-scoped user stories (US-FE-001, US-BE-001) instead of generic ones (US-001).

**Problem**: Previously, spec generation always used generic `US-001`, `AC-US1-01` format, ignoring multi-project configurations like umbrella mode or multiple project folders.

**Solution**: Created automated multi-project detection that checks all config formats and generates appropriate user story IDs.

---

## User Stories

### US-001: Multi-Project Detection

**As a** developer working with multiple projects (FE/BE/Shared)
**I want** SpecWeave to automatically detect my multi-project setup
**So that** generated specs use project-scoped user story IDs

**Acceptance Criteria**:
- [x] **AC-US1-01**: Detect `umbrella.enabled` with 2+ `childRepos`
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US1-02**: Detect `multiProject.enabled` with 2+ projects
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US1-03**: Detect sync profiles with board/area path mapping
  - Priority: P1
  - Testable: Yes

- [x] **AC-US1-04**: Detect multiple folders in specs/ directory
  - Priority: P1
  - Testable: Yes

- [x] **AC-US1-05**: Single project (like SpecWeave) returns `isMultiProject: false`
  - Priority: P0 (Critical)
  - Testable: Yes

---

### US-002: Project-Scoped User Story Generation

**As a** PM planning an increment for multi-project setup
**I want** generated user stories to have project prefixes
**So that** each repo gets only its relevant user stories

**Acceptance Criteria**:
- [x] **AC-US2-01**: Multi-project specs generate `US-FE-001`, `US-BE-001` format
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US2-02**: Multi-project specs generate `AC-FE-US1-01` format ACs
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US2-03**: Single-project specs generate `US-001`, `AC-US1-01` format
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US2-04**: Frontmatter includes `multi_project: true` and `projects:` array
  - Priority: P1
  - Testable: Yes

---

## Implementation Summary

**Files Created:**
- `src/utils/multi-project-detector.ts` - Detection utility with all config format checks

**Files Modified:**
- `src/cli/helpers/init/initial-increment-generator.ts` - Uses detection during init
- `plugins/specweave/agents/pm/AGENT.md` - Updated STEP 0 detection docs
- `plugins/specweave/skills/spec-generator/SKILL.md` - Reference to detection utility
- `plugins/specweave/skills/increment-planner/SKILL.md` - Reference to detection utility

**Key Functions:**
- `detectMultiProjectMode(projectRoot)` - Returns `{ isMultiProject, projects, detectionReason }`
- `inferProjectPrefix(projectId)` - Infers FE/BE/SHARED from repo names
- `formatUserStoryId(num, prefix)` - Returns `US-001` or `US-FE-001`
- `formatAcceptanceCriteriaId(usNum, acNum, prefix)` - Returns `AC-US1-01` or `AC-FE-US1-01`

**Corner Cases Verified:**
- SpecWeave (1 project with multiProject.enabled) → single-project ✅
- Empty config → single-project ✅
- 2+ projects → multi-project ✅

---

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| All corner cases pass | 17/17 | ✅ |
| Build succeeds | Yes | ✅ |
| SpecWeave detected as single-project | Yes | ✅ |
