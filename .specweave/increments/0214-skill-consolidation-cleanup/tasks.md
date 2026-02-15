# Tasks: Skill Consolidation & Cleanup

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[x]`: Completed
- `[ ]`: Not started
- Model hints: haiku (simple), opus (default)

## Phase 1: Delete Orphans

### T-001: Delete orphaned skills [P]
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**: Delete 3 orphaned skill directories that have zero callers.

**Files**:
- Delete `plugins/specweave/skills/increment-work-router/` (562 lines)
- Delete `plugins/specweave/skills/tdd-orchestrator/` (228 lines)
- Delete `plugins/specweave/skills/pm-closure-validation/` (542 lines)

**Test**: Given the 3 skills are deleted → When grepping for their names across all files → Then zero references remain

---

### T-002: Clean stale references to deleted skills
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04
**Status**: [x] completed

**Description**: Scan all SKILL.md files, hooks, and source code for references to the 3 deleted skills. Fix any found.

**Test**: Given deletion is complete → When `grep -r "increment-work-router\|tdd-orchestrator\|pm-closure-validation" plugins/ src/` → Then zero matches

---

## Phase 2: Merge increment-planner INTO increment

### T-003: Rewrite increment SKILL.md with merged content
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01
**Status**: [x] completed

**Description**: Replace `increment/SKILL.md` with merged content from `increment-planner/SKILL.md`. Add `increment`'s unique pre-flights (discipline check, tech stack detection). Add post-creation sync step. Remove `disable-model-invocation: true`. Keep `context: fork` and `model: opus`.

**Files**:
- Rewrite `plugins/specweave/skills/increment/SKILL.md`

**Test**: Given the merged skill → When reviewing content → Then it contains all sections from both original skills with no duplication

---

### T-004: Delete increment-planner directory
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02
**Status**: [x] completed

**Description**: Delete the `increment-planner` skill directory after content has been merged into `increment`.

**Files**:
- Delete `plugins/specweave/skills/increment-planner/`

---

### T-005: Update hook references
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03
**Status**: [x] completed

**Description**: Update all `sw:increment-planner` references in `user-prompt-submit.sh` to `sw:increment`. Update associated comments.

**Files**:
- `plugins/specweave/hooks/user-prompt-submit.sh` (10+ occurrences)

**Test**: Given hook is updated → When grepping for `increment-planner` → Then zero matches in hook file

---

### T-006: Update source code references
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04
**Status**: [x] completed

**Description**: Update references to `increment-planner` in TypeScript source files and guard scripts. Mostly comments.

**Files**:
- `src/core/increment/spec-sync-manager.ts` (line 645)
- `src/core/workflow/cost-estimator.ts` (line 133)
- `src/cli/commands/plan/agent-invoker.ts` (lines 4, 64, 246, 441)
- `plugins/specweave/hooks/v2/guards/spec-template-enforcement-guard.sh` (line 12)

**Test**: Given all files updated → When grepping for `increment-planner` across src/ and plugins/ → Then zero matches

---

## Phase 3: Verify

### T-007: Rebuild plugin cache and verify
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05
**Status**: [x] completed

**Description**: Run `specweave refresh-marketplace` to rebuild plugin cache. Verify skill count decreased. Run `npm run rebuild && npm test`.

**Test**: Given cache is rebuilt → When listing skills → Then count shows 41 (down from 45)
