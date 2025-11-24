# Tasks: Eliminate Skill-Agent Spawning Crashes

## Task Notation

- **Task ID**: T-001, T-002, etc.
- **Status**: [ ] pending, [x] completed
- **User Story**: US-001, US-002, etc.
- **AC**: Acceptance Criteria IDs

---

## Phase 1: Setup and Validation (Safety First)

### T-001: Create increment structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

Created increment 0055-eliminate-skill-agent-spawning-crashes with:
- spec.md (comprehensive specification)
- plan.md (technical approach)
- tasks.md (this file)
- metadata.json (to be created next)

**Validation**:
```bash
ls .specweave/increments/0055-eliminate-skill-agent-spawning-crashes/
# Should show: spec.md, plan.md, tasks.md
```

---

### T-002: Create metadata.json
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [ ] pending

Create metadata.json with:
```json
{
  "id": "0055-eliminate-skill-agent-spawning-crashes",
  "status": "in-progress",
  "type": "refactor",
  "priority": "P0",
  "created": "2025-11-24T20:00:00Z",
  "lastActivity": "2025-11-24T20:00:00Z",
  "testMode": "test-after",
  "coverageTarget": 85,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**Validation**:
```bash
cat .specweave/increments/0055-eliminate-skill-agent-spawning-crashes/metadata.json | jq .
# Should parse successfully
```

---

### T-003: Backup current SKILL.md
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

Create backup before editing:
```bash
cp plugins/specweave/skills/increment-planner/SKILL.md \
   .specweave/increments/0055-eliminate-skill-agent-spawning-crashes/SKILL.md.backup
```

**Validation**:
```bash
diff plugins/specweave/skills/increment-planner/SKILL.md \
     .specweave/increments/0055-eliminate-skill-agent-spawning-crashes/SKILL.md.backup
# Should show no differences
```

---

## Phase 2: Remove Agent Spawning (Work in Small Chunks)

### T-004: Read SKILL.md to identify exact line numbers
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending

Use Read tool to verify current line numbers for:
- STEP 3 (PM agent Task() call)
- STEP 4 (Architect agent Task() call)
- STEP 5 (Test-Aware Planner agent Task() call)

**Note**: Line numbers in plan.md may have shifted after warning was added.

---

### T-005: Refactor STEP 3 (PM Agent) - SMALL EDIT
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

**Location**: Approximately lines 263-312 (verify with T-004)

**Implementation**:
1. Use Read tool to confirm exact text
2. Use Edit tool to replace Task() call with template creation logic
3. Keep edit small (< 100 lines modified)

**NEW Content** (to replace old Task() section):
```markdown
STEP 3: Create spec.md Template

⚠️ **SAFE PATTERN**: Create template, guide user (NO agent spawning)

1. **Create basic spec.md template**:
   Use Write tool to generate:
   ```markdown
   ---
   increment: {number}-{name}
   title: "{Human Readable Title}"
   type: feature
   priority: P1
   status: planned
   created: {YYYY-MM-DD}
   structure: user-stories
   test_mode: TDD
   coverage_target: 95
   ---

   # {Feature Title}

   ## Overview
   [To be completed - tell Claude: "Complete the spec for increment {number}-{name}"]

   ## User Stories
   [To be completed by PM agent]

   ## Functional Requirements
   [To be completed by PM agent]

   ## Success Criteria
   [To be completed by PM agent]
   ```

2. **DO NOT** invoke Task() to spawn PM agent
3. Output will include guidance for user (added in STEP 6)
```

**Validation**:
```bash
grep -n "Task(" plugins/specweave/skills/increment-planner/SKILL.md | grep -i "pm"
# Should return: nothing
```

---

### T-006: Refactor STEP 4 (Architect Agent) - SMALL EDIT
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending

**Location**: Approximately lines 316-346 (verify with T-004)

**Implementation**:
1. Use Read tool to confirm exact text
2. Use Edit tool to replace Task() call with template creation logic
3. Keep edit small (< 100 lines modified)

**NEW Content** (to replace old Task() section):
```markdown
STEP 4: Create plan.md Template

⚠️ **SAFE PATTERN**: Create template, guide user (NO agent spawning)

1. **Create basic plan.md template**:
   Use Write tool to generate:
   ```markdown
   # Implementation Plan: {Feature Title}

   ## Overview
   [To be completed by Architect]

   ## Architecture Decisions
   [Architect will create ADRs in living docs - one at a time]
   [See .specweave/docs/internal/architecture/adr/]

   ## Components
   [To be completed by Architect]

   ## Technology Stack
   [To be completed by Architect]

   ## References
   - Architecture docs: .specweave/docs/internal/architecture/
   ```

2. **DO NOT** invoke Task() to spawn Architect agent
3. Output will include guidance for user (added in STEP 6)
```

**Validation**:
```bash
grep -n "Task(" plugins/specweave/skills/increment-planner/SKILL.md | grep -i "architect"
# Should return: nothing
```

---

### T-007: Refactor STEP 5 (Test-Aware Planner) - SMALL EDIT
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [ ] pending

**Location**: Approximately lines 349-382 (verify with T-004)

**Implementation**:
1. Use Read tool to confirm exact text
2. Use Edit tool to replace Task() call with template creation logic
3. Keep edit small (< 100 lines modified)

**NEW Content** (to replace old Task() section):
```markdown
STEP 5: Create tasks.md Template

⚠️ **SAFE PATTERN**: Create template, guide user (NO agent spawning)

1. **Create basic tasks.md template**:
   Use Write tool to generate:
   ```markdown
   # Tasks: {Feature Title}

   ## Phase 1: Setup
   [To be completed by test-aware-planner]

   **Instructions**: Tell Claude: "Create tasks for increment {number}-{name}"

   **What will be generated**:
   - Tasks with embedded test plans (BDD Given/When/Then format)
   - Unit/integration/E2E test cases with file paths
   - Coverage targets (80-90% overall)
   - AC-ID traceability from spec.md
   ```

2. **DO NOT** invoke Task() to spawn test-aware-planner agent
3. Output will include guidance for user (added in STEP 6)
```

**Validation**:
```bash
grep -n "Task(" plugins/specweave/skills/increment-planner/SKILL.md | grep -i "test-aware"
# Should return: nothing
```

---

### T-008: Verify ALL Task() calls removed
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending

**Validation Commands**:
```bash
# Should find NO Task() calls (except in warning/example sections):
grep -n "Task(" plugins/specweave/skills/increment-planner/SKILL.md

# Acceptable matches (in warning/examples only):
# - Line ~28: Warning section showing OLD BROKEN pattern
# - No other matches acceptable

# Should find NO "MUST USE THE TASK TOOL" text:
grep -i "must use the task tool" plugins/specweave/skills/increment-planner/SKILL.md
# Should return: nothing
```

**Pass Criteria**:
- Zero Task() calls in workflow steps (STEP 3, 4, 5)
- Zero "MUST USE THE TASK TOOL" instructions
- Only acceptable Task() references are in warning/anti-pattern examples

---

## Phase 3: Add User Guidance (NEW STEP 6)

### T-009: Add STEP 6 with user guidance output
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [ ] pending

**Location**: After STEP 5 (around line 384)

**Implementation**:
Add new STEP 6 section:

```markdown
STEP 6: Output User Guidance

After all templates are created, provide clear completion instructions:

```
✅ Increment structure created: .specweave/increments/{number}-{name}/

Files created:
- spec.md (template with YAML frontmatter)
- plan.md (template with placeholders)
- tasks.md (template with instructions)
- metadata.json (status tracking enabled)

📋 To complete planning, run these commands in sequence:

1. **Complete product specification** (user stories, requirements):

   Tell Claude: "Complete the spec for increment {number}-{name}"

   ℹ️  The PM expertise will activate automatically.
   It will fill in: Overview, User Stories, Functional Requirements, Success Criteria.

2. **Design technical architecture** (ADRs, system design):

   Tell Claude: "Design the architecture for increment {number}-{name}"

   ℹ️  The Architect will create:
   - Architecture Decision Records (ADRs) - one at a time for safety
   - System design updates
   - Component diagrams (Mermaid C4)
   - Completed plan.md with technical details

3. **Generate implementation tasks** (with embedded tests):

   Tell Claude: "Create tasks for increment {number}-{name}"

   ℹ️  The test-aware planner will generate:
   - Tasks with embedded test plans (BDD format)
   - Test cases (unit/integration/E2E with file paths)
   - Coverage targets (80-90%)
   - AC-ID traceability

---

**Why this workflow is safer** (ADR-0133):
- ✅ Agents run in MAIN context (no nesting = no context explosion)
- ✅ Architect creates 1 ADR at a time (proper chunking discipline)
- ✅ You have control and visibility at each step
- ✅ No Claude Code crashes!
```
```

**Validation**:
- Read SKILL.md and verify STEP 6 exists
- Verify emoji usage: ✅ ℹ️ 📋
- Verify clear 3-step instructions
- Verify explanation of safety benefits

---

## Phase 4: Update Documentation

### T-010: Update "Example: Creating a Feature" section
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [ ] pending

**Location**: Around line 1232+ (search for "Example: Creating a Feature")

**Changes Needed**:
1. **STEP 3 example**: Show template creation output (not Task() invocation)
2. **STEP 4 example**: Show template creation output
3. **STEP 5 example**: Show template creation output
4. **Output example**: Show complete user guidance message

**NEW Example Output**:
```markdown
**Output**:
```
✅ Feature created: 0003-stripe-payment-integration

Location: .specweave/increments/0003-stripe-payment-integration/
Files created:
- spec.md (template)
- plan.md (template)
- tasks.md (template)
- metadata.json

To complete planning:
1. Tell Claude: "Complete the spec for increment 0003-stripe-payment-integration"
2. Tell Claude: "Design the architecture for increment 0003-stripe-payment-integration"
3. Tell Claude: "Create tasks for increment 0003-stripe-payment-integration"
```
```

**Validation**:
- Search for "Task()" in examples section
- Should return: nothing (or only in "OLD way" anti-pattern examples)

---

### T-011: Remove all "MUST USE THE TASK TOOL" references
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [ ] pending

**Validation**:
```bash
grep -i "must use the task tool" plugins/specweave/skills/increment-planner/SKILL.md
# Should return: nothing

grep -i "you must use the task tool" plugins/specweave/skills/increment-planner/SKILL.md
# Should return: nothing
```

If any matches found, remove them.

---

## Phase 5: Testing and Validation

### T-012: Manual test - Create test increment
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US3-01, AC-US3-02
**Status**: [ ] pending

**Test Procedure**:
1. Tell Claude: "Plan a feature for API rate limiting"
2. Observe output
3. Verify:
   - ✅ Increment directory created
   - ✅ spec.md template created (< 50 lines, has frontmatter)
   - ✅ plan.md template created (< 50 lines)
   - ✅ tasks.md template created (< 30 lines)
   - ✅ metadata.json created (valid JSON)
   - ✅ User guidance displayed (3 steps)
   - ✅ NO Claude Code crash

**Expected Output**:
```
✅ Increment structure created: .specweave/increments/0056-api-rate-limiting/

Files created:
- spec.md (template with YAML frontmatter)
- plan.md (template with placeholders)
- tasks.md (template with instructions)
- metadata.json (status tracking enabled)

📋 To complete planning, run these commands in sequence: ...
```

**Validation Commands**:
```bash
ls .specweave/increments/0056-api-rate-limiting/
# Should show: spec.md, plan.md, tasks.md, metadata.json

cat .specweave/increments/0056-api-rate-limiting/metadata.json | jq .
# Should parse successfully

head -20 .specweave/increments/0056-api-rate-limiting/spec.md
# Should show YAML frontmatter
```

---

### T-013: Manual test - Complete planning workflow
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [ ] pending

**Test Procedure**:

1. **Step 1: Complete spec**
   ```
   Tell Claude: "Complete the spec for increment 0056-api-rate-limiting"
   ```
   Expected:
   - PM expertise activates
   - spec.md filled with user stories, requirements
   - No crashes

2. **Step 2: Design architecture**
   ```
   Tell Claude: "Design the architecture for increment 0056-api-rate-limiting"
   ```
   Expected:
   - Architect activates
   - Creates 1 ADR, asks "which ADR next?"
   - Chunking discipline works
   - No crashes

3. **Step 3: Create tasks**
   ```
   Tell Claude: "Create tasks for increment 0056-api-rate-limiting"
   ```
   Expected:
   - Test-aware planner activates
   - tasks.md filled with tasks + embedded tests
   - No crashes

**Pass Criteria**:
- All 3 steps complete without crashes
- Files properly populated
- User experience is smooth

---

### T-014: Validation - Verify no regressions
**User Story**: US-001
**Status**: [ ] pending

**Validation**:
1. Check existing increments are unaffected:
   ```bash
   ls .specweave/increments/
   # All existing increments should still exist unchanged
   ```

2. Verify warning still present at top of SKILL.md:
   ```bash
   head -50 plugins/specweave/skills/increment-planner/SKILL.md | grep "CRITICAL CRASH PREVENTION"
   # Should find the warning
   ```

3. Verify ADR-0133 exists:
   ```bash
   ls .specweave/docs/internal/architecture/adr/0133-*.md
   # Should exist
   ```

4. Verify CLAUDE.md section exists:
   ```bash
   grep -A5 "Skills Must NOT Spawn Large Content-Generating Agents" CLAUDE.md
   # Should find section
   ```

---

## Phase 6: Finalization

### T-015: Review all changes with git diff
**Status**: [ ] pending

```bash
git diff plugins/specweave/skills/increment-planner/SKILL.md | less
```

Verify:
- All Task() calls removed from workflow steps
- Templates added
- User guidance added
- Examples updated
- No accidental deletions

---

### T-016: Update increment metadata to "completed"
**Status**: [ ] pending

Edit metadata.json:
```json
{
  "status": "completed",
  "completed": "2025-11-24T22:00:00Z"
}
```

---

### T-017: Mark all spec.md ACs as completed
**Status**: [ ] pending

Update spec.md:
- Change all `- [ ]` to `- [x]` for completed ACs

---

## Summary

**Total Tasks**: 17
**Completed**: 1 (T-001)
**Pending**: 16

**Estimated Time**: 2-3 hours (working carefully in small chunks)

**Critical Success Factors**:
- Work in SMALL edits (< 100 lines per edit)
- Test after each phase
- Verify with git diff frequently
- NO large context operations
