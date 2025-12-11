---
increment: 0119-project-board-context-enforcement
status: planned
phases:
  - cli
  - hooks
  - skills
  - validation
  - auto-sync
estimated_tasks: 11
---

# Tasks: Project/Board Context Enforcement

## Phase 1: CLI Context Command

### T-001: Create CLI context command with projects subcommand ⚡
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Description**:
Create `src/cli/commands/context.ts` with `specweave context projects` subcommand that returns project context as JSON.

**Implementation**:
1. Create new command file at `src/cli/commands/context.ts`
2. Import `detectStructureLevel` from `src/utils/structure-level-detector.js`
3. Create `projects` subcommand that calls detection and outputs JSON
4. Include: level, projects, boardsByProject (if 2-level), detectionReason, source
5. Register command in `src/cli/index.ts`

**Expected Output**:
```json
{
  "level": 1,
  "projects": [{"id": "my-app", "name": "My App"}],
  "detectionReason": "multiProject configuration",
  "source": "multi-project"
}
```

**Test Plan**:
```gherkin
Given a project with multiProject.enabled=true and 2 projects
When I run "specweave context projects"
Then I receive JSON with level=1 and 2 projects listed
And the output includes detectionReason
```

**Files to modify**:
- `src/cli/commands/context.ts` (new)
- `src/cli/index.ts` (register command)

---

### T-002: Add boards subcommand with project filter ⚡
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model**: haiku
**Depends on**: T-001

**Description**:
Add `specweave context boards --project=<id>` subcommand that returns boards for a specific project (2-level structures only).

**Implementation**:
1. Add `boards` subcommand to context command
2. Accept `--project` option (required for 2-level)
3. Call `detectStructureLevel()` and filter boardsByProject
4. Return empty array for 1-level structures with warning
5. Return boards array for 2-level

**Expected Output**:
```json
{
  "project": "acme-corp",
  "boards": [
    {"id": "digital-ops", "name": "Digital Operations"},
    {"id": "mobile-team", "name": "Mobile Team"}
  ]
}
```

**Test Plan**:
```gherkin
Given a 2-level structure with ADO area paths
When I run "specweave context boards --project=acme-corp"
Then I receive JSON with boards array for that project
```

---

### T-003: Add interactive select subcommand 🧠
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P2
**Model**: sonnet
**Depends on**: T-001, T-002

**Description**:
Add `specweave context select` subcommand with interactive prompts for project (and board) selection.

**Implementation**:
1. Add `select` subcommand to context command
2. If single project + single board (2-level) → auto-select, return JSON
3. If multiple projects → prompt with list
4. If 2-level and multiple boards → prompt for board after project
5. Return selected values as JSON

**Expected Output**:
```json
{
  "selected": {
    "project": "acme-corp",
    "board": "digital-ops"
  },
  "autoSelected": false
}
```

**Test Plan**:
```gherkin
Given a multi-project setup with 3 projects
When I run "specweave context select" and choose project "web-app"
Then I receive JSON with selected.project = "web-app"
```

---

## Phase 2: Enhanced Validation Hook

### T-004: Enhance spec-project-validator hook with detection API 🧠
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Description**:
Enhance `plugins/specweave/hooks/spec-project-validator.sh` to validate project/board against actual config.

**Implementation**:
1. Call `specweave context projects` to get available projects
2. Parse spec.md YAML frontmatter for project/board values
3. Validate project exists in returned projects list
4. For 2-level: validate board exists under project
5. BLOCK with actionable error showing available options
6. Check for unresolved placeholders (`{{PROJECT_ID}}`, `{{BOARD_ID}}`)

**Error Output**:
```
❌ Invalid project "my-folder" in spec.md

Available projects:
  • my-app-fe (Frontend)
  • my-app-be (Backend)
  • shared-lib (Shared Library)

Fix: Update project: field in spec.md YAML frontmatter
```

**Test Plan**:
```gherkin
Given a spec.md with project: "invalid-project"
When the hook runs during Write tool
Then it BLOCKS with error listing available projects
```

---

### T-005: Add --force bypass to validation hook ⚡
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Priority**: P2
**Model**: haiku
**Depends on**: T-004

**Description**:
Add `--force` flag support to allow bypassing project validation for edge cases.

**Implementation**:
1. Check for `SPECWEAVE_FORCE_PROJECT=1` environment variable
2. If set, log warning but allow the write
3. Document the bypass in error messages

---

## Phase 3: Skill Updates

### T-006: Update increment-planner SKILL.md with MANDATORY detection 🧠
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Description**:
Update `plugins/specweave/skills/increment-planner/SKILL.md` to make context detection MANDATORY and blocking.

**Implementation**:
1. Add new STEP before spec generation (before current Step 0B)
2. Mark as ⛔ MANDATORY with visual callout
3. Add exact Bash command Claude MUST run
4. Add example JSON output with parsing instructions
5. Add selection rules (auto-select when single option)
6. Add validation that project/board values came from detection output

**New Content**:
```markdown
### STEP 0A: Get Project Context (⛔ MANDATORY - BLOCKING!)

**YOU CANNOT PROCEED WITHOUT THIS STEP**

Before generating ANY spec.md content, run:

\`\`\`bash
specweave context projects
\`\`\`

Parse the JSON output and use those values for project/board.
NEVER invent or guess project names!
```

---

### T-007: Update spec templates with validation markers ⚡
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P2
**Model**: haiku
**Depends on**: T-006

**Description**:
Update spec templates to include validation-friendly placeholders and comments.

**Files**:
- `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`
- `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`

**Changes**:
1. Add comment: `# ⚠️ MUST be from "specweave context projects" output`
2. Ensure placeholders are clearly marked as MUST-REPLACE

---

## Phase 4: Living Docs Validation

### T-008: Add path validation to living-docs-sync 🧠
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Description**:
Add validation to `src/core/living-docs/living-docs-sync.ts` that checks project/board before creating files.

**Implementation**:
1. Add `validateTargetPath()` private method
2. Call `validateProjectContext()` from structure-level-detector
3. If invalid, throw error with:
   - Expected path (e.g., `specs/my-app/FS-119/`)
   - Actual project/board from spec
   - Available options
4. Log expected vs actual path at debug level
5. Create parent directories if valid but missing

**Error Output**:
```
❌ Cannot sync increment to living docs

Project "my-folder" not found in configuration.

Available projects:
  • my-app-fe
  • my-app-be

Expected path: specs/my-app-fe/FS-119/
Actual project in spec.md: my-folder

Fix: Update project: field in spec.md
```

**Test Plan**:
```gherkin
Given a spec.md with invalid project
When living docs sync runs
Then it fails with error showing available projects
And the error includes expected vs actual path
```

---

## Phase 5: Auto-Sync Living Docs After Increment Operations

### T-009: Add post-increment-planning hook to trigger living docs sync 🧠
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Description**:
Update or create `post-increment-planning.sh` hook to automatically trigger living docs sync after increment creation.

**Implementation**:
1. Check if `plugins/specweave/hooks/post-increment-planning.sh` exists
2. Add call to `specweave sync-specs <increment-id>` after increment files created
3. Parse increment ID from hook context (passed as argument or env var)
4. Capture sync output and display to user
5. Make sync NON-BLOCKING (continue even if sync fails)

**Hook Logic**:
```bash
#!/bin/bash
# post-increment-planning.sh

INCREMENT_ID="$1"

echo "🔄 Auto-syncing increment to living docs..."

# Trigger living docs sync
if specweave sync-specs "$INCREMENT_ID" 2>&1; then
  echo "✅ Living docs synced successfully"
else
  echo "⚠️ Living docs sync had errors (non-blocking)"
  echo "💡 Run manually: specweave sync-specs $INCREMENT_ID"
fi
```

**Test Plan**:
```gherkin
Given a new increment created via /specweave:increment
When the post-increment-planning hook runs
Then it calls specweave sync-specs with the increment ID
And living docs FS-XXX folder is created
```

---

### T-010: Update increment-planner SKILL.md to invoke sync after creation 🧠
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-05, AC-US6-06
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet
**Depends on**: T-006

**Description**:
Update `plugins/specweave/skills/increment-planner/SKILL.md` to add MANDATORY sync step at the end of increment creation.

**Implementation**:
1. Add new STEP after all files created (after STEP 7)
2. Mark as ⛔ MANDATORY - "EVERY increment MUST sync"
3. Add exact command: `/specweave:sync-specs <increment-id>`
4. Document expected output
5. Add error handling guidance

**New Content to Add**:
```markdown
### STEP 9: Sync to Living Docs (⛔ MANDATORY!)

**EVERY increment MUST be synced to living docs immediately after creation.**

Run:
\`\`\`bash
/specweave:sync-specs {{INCREMENT_ID}}
\`\`\`

Expected output:
\`\`\`
🔄 Syncing increment to living docs...
✅ Living docs synced: FS-119
   Created: 4 files (FEATURE.md, us-001.md, us-002.md, us-003.md)
   Path: internal/specs/my-app/FS-119/
\`\`\`

**WHY THIS IS MANDATORY:**
- Without sync, `internal/specs/` is OUT OF SYNC with increments
- External tool sync (GitHub/JIRA/ADO) READS from living docs
- Skipping this step = external sync will FAIL
```

---

### T-011: Add external tool sync trigger after living docs sync 🧠
**User Story**: US-006
**Satisfies ACs**: AC-US6-07
**Status**: [x] completed
**Priority**: P2
**Model**: sonnet
**Depends on**: T-009

**Description**:
Ensure that after living docs sync, external tool sync is triggered if enabled in config.

**Implementation**:
1. Check `sync.settings.canUpsertInternalItems` in config
2. If enabled, call `syncToExternalTools()` after `syncIncrement()`
3. This is already partially implemented in `living-docs-sync.ts` - verify it works
4. Add clear output showing external sync status

**Expected Output**:
```
🔄 Syncing increment to living docs...
✅ Living docs synced: FS-119
   Created: 4 files

📡 Syncing to external tools: github
   ✅ Created GitHub issue: #789 [FS-119][US-001] Login Form
   ✅ Created GitHub issue: #790 [FS-119][US-002] Auth API
```

**Test Plan**:
```gherkin
Given sync.settings.canUpsertInternalItems = true
And increment 0119 is synced to living docs
When external tool sync triggers
Then GitHub issues are created for each user story
```

---

## Summary

| Phase | Tasks | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| CLI | T-001, T-002, T-003 | P1-P2 | 2h |
| Hooks | T-004, T-005 | P1-P2 | 1h |
| Skills | T-006, T-007 | P1-P2 | 1h |
| Validation | T-008 | P1 | 1h |
| Auto-Sync | T-009, T-010, T-011 | P1-P2 | 2h |
| **Total** | **11 tasks** | | **~7h** |

## Completion Criteria

- [ ] All P1 tasks completed
- [ ] `specweave context projects` returns valid JSON
- [ ] Hook blocks invalid project/board
- [ ] SKILL.md has MANDATORY detection step
- [ ] Living docs sync validates before writing
- [ ] **Living docs auto-sync after /specweave:increment**
- [ ] **External tool sync triggers if enabled**
