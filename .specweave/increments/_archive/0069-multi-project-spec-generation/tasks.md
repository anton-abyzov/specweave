---
increment: 0062-multi-project-spec-generation
total_tasks: 6
completed_tasks: 6
---

# Tasks: Multi-Project Spec Generation

## User Story: US-001 - Multi-Project Detection

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

---

### T-001: Create multi-project detection utility

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed

**Description**: Create `src/utils/multi-project-detector.ts` with detection logic.

**Files**: `src/utils/multi-project-detector.ts`

---

### T-002: Update initial-increment-generator

**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-05, AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

**Description**: Integrate detection into spec generation during `specweave init`.

**Files**: `src/cli/helpers/init/initial-increment-generator.ts`

---

### T-003: Update PM Agent documentation

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Description**: Update STEP 0 in PM Agent with detection utility reference.

**Files**: `plugins/specweave/agents/pm/AGENT.md`

---

### T-004: Update Spec Generator skill

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed

**Files**: `plugins/specweave/skills/spec-generator/SKILL.md`

---

### T-005: Update Increment Planner skill

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed

**Files**: `plugins/specweave/skills/increment-planner/SKILL.md`

---

### T-006: Fix threshold bug and verify corner cases

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed

**Description**: Changed `> 0` to `> 1` for multi-project detection (requires 2+ projects).

**Test Results**: 17/17 corner cases pass ✅
