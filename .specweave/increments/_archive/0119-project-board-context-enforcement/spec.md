---
increment: 0119-project-board-context-enforcement
title: "Enforce Project/Board Context in Increment Planning"
type: feature
priority: P1
status: completed
created: 2025-12-07
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Enforce Project/Board Context in Increment Planning

## Problem Statement

When users create new increments via `/specweave:increment` after completing `specweave init` with multi-project/multi-board setup, the system fails to:

1. **Detect configured projects/boards** - Falls back to folder name (e.g., `my-folder`) instead of querying actual config
2. **Enforce project selection** - Generates specs with `project: <folder-name>` instead of valid configured project
3. **Enforce board selection for 2-level structures** - Omits `board:` field entirely when required
4. **Validate project/board values** - Allows unresolved placeholders like `{{PROJECT_ID}}`
5. **Auto-sync to living docs** - After increment creation, `internal/specs/` folders are NOT updated automatically

### Example of the Bug

User prompt: "ultrathink to create new inc to get last 2 commits git history"

**Actual (WRONG):**
```yaml
project: my-folder  # <- Folder name, NOT a configured project!
# board: missing!   # <- Missing for 2-level structures
```

**Expected (CORRECT):**
```yaml
project: my-app-fe    # <- From config.json multiProject.projects
board: frontend-team  # <- From detectStructureLevel() for 2-level
```

## Root Cause Analysis

The gap exists between:
1. **Documented behavior** in `increment-planner/SKILL.md` (describes smart selection logic)
2. **Actual behavior** in Claude's response generation (ignores the detection API)

The `detectStructureLevel()` utility exists in `src/utils/structure-level-detector.ts` but:
- Is NOT invoked by Claude during increment planning
- Claude Code generates specs without consulting the config
- No runtime enforcement blocks invalid project/board values

## Solution Overview

1. **Pre-planning context injection** - Before Claude generates spec, inject project/board context
2. **Validation hook** - Block spec.md writes with invalid project/board
3. **Smart selection API** - Create CLI helper that Claude MUST call before generating
4. **Enhanced skill instructions** - Make detection MANDATORY with examples
5. **Auto-sync living docs** - After increment create/update, AUTOMATICALLY trigger `/specweave:sync-specs`

## User Stories

### US-001: Project Context Injection Before Planning (P1)
**Project**: specweave

**As a** user who ran `specweave init` with multi-project setup
**I want** the increment planner to automatically detect my configured projects
**So that** I don't have to manually specify which project each increment targets

#### Acceptance Criteria

- [x] **AC-US1-01**: When `/specweave:increment` runs, it MUST call `detectStructureLevel()` first
- [x] **AC-US1-02**: Detected projects MUST be presented to user if multiple exist
- [x] **AC-US1-03**: For 2-level structures, boards MUST be detected and presented
- [x] **AC-US1-04**: Single project/board MUST be auto-selected silently
- [x] **AC-US1-05**: Selected project/board MUST be injected into spec.md template

---

### US-002: Validation Guard for spec.md Project/Board (P1)
**Project**: specweave

**As a** framework maintainer
**I want** a validation hook that blocks spec.md creation with invalid project/board
**So that** living docs sync works correctly from day one

#### Acceptance Criteria

- [x] **AC-US2-01**: Hook detects 1-level vs 2-level structure using `detectStructureLevel()`
- [x] **AC-US2-02**: For 1-level: BLOCK if `project:` is missing or unresolved placeholder
- [x] **AC-US2-03**: For 2-level: BLOCK if `project:` OR `board:` is missing or placeholder
- [x] **AC-US2-04**: Provide clear error message with available projects/boards
- [x] **AC-US2-05**: Allow override with `--force` flag for edge cases

---

### US-003: CLI Helper for Project Selection (P2)
**Project**: specweave

**As a** Claude Code agent following increment-planner skill
**I want** a CLI command that returns project/board context as JSON
**So that** I can inject correct values into spec.md template

#### Acceptance Criteria

- [x] **AC-US3-01**: Command `specweave context projects` returns JSON with available projects
- [x] **AC-US3-02**: Command `specweave context boards --project=<id>` returns boards for project
- [x] **AC-US3-03**: Command `specweave context select` runs interactive selection
- [x] **AC-US3-04**: Output includes structure level (1 or 2)
- [x] **AC-US3-05**: Output includes detection reason for debugging

---

### US-004: Enhanced Skill Instructions with MANDATORY Detection (P1)
**Project**: specweave

**As a** user creating increments via Claude
**I want** the increment-planner skill to MANDATE project detection before spec generation
**So that** Claude always consults the config before generating specs

#### Acceptance Criteria

- [x] **AC-US4-01**: SKILL.md Step 0B marked as MANDATORY with visual callout
- [x] **AC-US4-02**: Add example Bash command Claude MUST run before generating
- [x] **AC-US4-03**: Add validation that project/board came from detection (not invented)
- [x] **AC-US4-04**: Document error recovery if detection fails

---

### US-005: Living Docs Sync Path Validation (P1)
**Project**: specweave

**As a** user with 2-level structure (ADO/JIRA boards)
**I want** living docs sync to validate the target path before creating files
**So that** specs land in the correct `{project}/{board}/FS-XXX/` folder

#### Acceptance Criteria

- [x] **AC-US5-01**: Sync reads project/board from spec.md YAML frontmatter
- [x] **AC-US5-02**: For 2-level: validate `{project}/{board}` path exists or create it
- [x] **AC-US5-03**: FAIL if project doesn't exist in config (with helpful error)
- [x] **AC-US5-04**: FAIL if board doesn't exist under project (with helpful error)
- [x] **AC-US5-05**: Log expected vs actual path for debugging

---

### US-006: Auto-Sync Living Docs After Increment Creation/Update (P1)
**Project**: specweave

**As a** user creating or updating increments
**I want** living docs to be automatically synced after `/specweave:increment` completes
**So that** `internal/specs/` folders are always in sync with increments without manual commands

#### Acceptance Criteria

- [x] **AC-US6-01**: After increment creation, AUTOMATICALLY trigger `syncIncrement()`
- [x] **AC-US6-02**: After increment spec.md update, AUTOMATICALLY trigger sync
- [x] **AC-US6-03**: Sync creates `FS-XXX/` folder with `FEATURE.md` and `us-*.md` files
- [x] **AC-US6-04**: Sync respects project/board for correct folder placement
- [x] **AC-US6-05**: Sync output shows what was created/updated
- [x] **AC-US6-06**: Sync errors are NON-BLOCKING but clearly reported
- [x] **AC-US6-07**: External tool sync (GitHub/JIRA/ADO) triggers if enabled in config

#### Why This is Critical

Without auto-sync:
1. User creates increment via `/specweave:increment`
2. Increment exists in `.specweave/increments/0119-xxx/`
3. BUT `internal/specs/{project}/FS-119/` does NOT exist
4. External tool sync fails (reads from living docs)
5. User must manually run `/specweave:sync-specs 0119`
6. This is a gap that causes desync between increments and living docs

#### Expected Flow

```
User: /specweave:increment "Add user auth"
    ↓
Claude creates spec.md, plan.md, tasks.md, metadata.json
    ↓
✅ AUTO-TRIGGER: syncIncrement("0119-user-auth")
    ↓
Living docs created:
  internal/specs/my-app/FS-119/FEATURE.md
  internal/specs/my-app/FS-119/us-001-login-form.md
    ↓
✅ AUTO-TRIGGER: syncToExternalTools() (if enabled)
    ↓
GitHub issue created: [FS-119][US-001] Login Form
```

## Functional Requirements

### FR-001: Project Detection API Integration

The increment planning flow MUST:
1. Call `detectStructureLevel()` at the START of planning
2. Cache the result for the session
3. Use detected projects/boards in all subsequent steps

### FR-002: Spec Template Injection

The spec.md template MUST:
1. Have `project:` field populated from detection (never empty)
2. Have `board:` field populated for 2-level structures
3. Never contain unresolved placeholders like `{{PROJECT_ID}}`

### FR-003: Validation Before Write

Before any spec.md write:
1. Parse YAML frontmatter
2. Validate project exists in `multiProject.projects` or detected projects
3. For 2-level: validate board exists under project
4. Block write with actionable error if validation fails

### FR-004: Auto-Sync Living Docs After Increment Operations

After `/specweave:increment` creates or updates an increment:
1. AUTOMATICALLY call `LivingDocsSync.syncIncrement(incrementId)`
2. Create `FS-XXX/` folder in correct project (and board for 2-level)
3. Generate `FEATURE.md` from spec.md overview
4. Generate `us-*.md` files from user stories
5. Report sync results (files created/updated)
6. If external sync enabled, trigger `syncToExternalTools()`

### FR-005: Hook-Based Auto-Sync Trigger

The auto-sync MUST be triggered via hook mechanism:
1. Hook event: `PostIncrementCreation` or `PostIncrementUpdate`
2. Hook calls: `specweave sync-specs <increment-id>` OR direct API
3. Hook is NON-BLOCKING (errors logged, not thrown)
4. Hook respects `livingDocs.autoGenerate` config

## Success Criteria

1. **Zero invalid specs created** - All new increments have valid project/board
2. **Living docs sync success rate** - 100% of specs sync to correct folder
3. **User friction reduction** - Single project auto-selects silently
4. **Clear errors** - Invalid project/board shows available options

## Out of Scope

- Migrating existing specs with invalid project/board (separate cleanup task)
- Multi-project increment spanning multiple projects (each US has own project)
- Changing the structure level after init (requires re-init)

## Dependencies

- `src/utils/structure-level-detector.ts` (exists, needs integration)
- `plugins/specweave/hooks/spec-project-validator.sh` (exists, needs enhancement)
- `increment-planner/SKILL.md` (exists, needs updates)

## Technical Notes

### Structure Level Detection API

```typescript
import { detectStructureLevel } from './utils/structure-level-detector.js';

const config = detectStructureLevel(projectRoot);
// config.level: 1 | 2
// config.projects: ProjectInfo[]
// config.boardsByProject?: Record<string, BoardInfo[]>
// config.detectionReason: string
// config.source: 'ado-area-path' | 'jira-board' | 'multi-project' | etc.
```

### Property to Check for 2-Level

The key indicator for 2-level structure is:
- `config.level === 2`
- `config.boardsByProject` is defined and non-empty

This is already implemented in `detectStructureLevel()`.
