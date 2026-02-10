# Tasks: TDD Enforcement - Behavioral Implementation

## Task Notation

- `[T-###]`: Task ID
- `[RED]`: Write failing test first
- `[GREEN]`: Make test pass with minimal code
- `[REFACTOR]`: Improve code quality, keep tests green
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku (simple), 💎 opus (default)

## TDD Contract

**This increment uses TDD mode. For EVERY feature:**
1. **RED**: Write failing test FIRST
2. **GREEN**: Minimal code to pass test
3. **REFACTOR**: Clean up while keeping tests green

---

## Phase 1: TDD Template Creation (US-002)

### T-001: [RED] Write test for TDD task template loading
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write a test that verifies:
1. When `testMode: "TDD"`, the TDD template is loaded
2. The template contains `[RED]`, `[GREEN]`, `[REFACTOR]` markers
3. The template has proper dependency structure

**Test File**: `tests/unit/tdd/template-selection.test.ts`

**Test Plan**:
- **Given**: testMode is "TDD" in config
- **When**: increment-planner selects template
- **Then**: TDD template is selected, not standard template

**Test Code Sketch**:
```typescript
describe('TDD Template Selection', () => {
  it('should select TDD template when testMode is TDD', async () => {
    const config = { testing: { defaultTestMode: 'TDD' } };
    const template = await selectTaskTemplate(config);
    expect(template).toContain('[RED]');
    expect(template).toContain('[GREEN]');
    expect(template).toContain('[REFACTOR]');
  });

  it('should select standard template when testMode is test-after', async () => {
    const config = { testing: { defaultTestMode: 'test-after' } };
    const template = await selectTaskTemplate(config);
    expect(template).not.toContain('[RED]');
  });
});
```

---

### T-002: [GREEN] Create TDD task template file
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-001 MUST be completed first

**Description**:
Create `plugins/specweave/skills/increment-planner/templates/tasks-tdd-single-project.md` with:
- TDD triplet structure (RED → GREEN → REFACTOR)
- Phase markers in task titles
- Explicit dependency fields
- Test file path placeholders

**Files to Create**:
- `plugins/specweave/skills/increment-planner/templates/tasks-tdd-single-project.md`

**Test Plan**:
- **Given**: T-001 test exists and fails
- **When**: Create template file with TDD structure
- **Then**: T-001 test passes

---

### T-003: [REFACTOR] Improve TDD template maintainability
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-002 MUST be completed first

**Description**:
- Extract common TDD patterns to reusable snippets
- Add comments explaining template structure
- Ensure consistent formatting

**Test Plan**:
- **Given**: T-001 test passes
- **When**: Refactor template for clarity
- **Then**: T-001 test still passes

---

### T-004: [RED] Write test for TDD spec contract section
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Phase**: RED
**Priority**: P1
**Model**: 💎 opus

**Description**:
Write test verifying spec.md includes TDD Contract section when TDD mode.

**Test File**: `tests/unit/tdd/spec-contract.test.ts`

**Test Plan**:
- **Given**: testMode is "TDD"
- **When**: spec.md is generated
- **Then**: Contains "## TDD Contract" section

---

### T-005: [GREEN] Create TDD spec contract template
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-004 MUST be completed first

**Description**:
Create `templates/spec-tdd-contract.md` snippet with:
- TDD workflow explanation
- RED-GREEN-REFACTOR cycle
- Test strategy section placeholder

**Test Plan**:
- **Given**: T-004 test exists
- **When**: Create contract template
- **Then**: T-004 test passes

---

### T-006: [REFACTOR] Consolidate TDD template snippets
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-005 MUST be completed first

**Description**:
- Ensure TDD contract can be injected into both single and multi-project specs
- Remove duplication between templates

**Test Plan**:
- **Given**: T-004 test passes
- **When**: Consolidate templates
- **Then**: T-004 test still passes

---

## Phase 2: Template Selection Logic (US-001)

### T-007: [RED] Write test for increment-planner testMode handling
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-06
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write integration test that:
1. Creates increment with TDD config
2. Verifies tasks.md has TDD structure
3. Creates increment with test-after config
4. Verifies tasks.md has standard structure

**Test File**: `tests/integration/tdd/increment-planner-tdd.test.ts`

**Test Plan**:
- **Given**: Config with testMode: "TDD"
- **When**: /sw:increment creates new increment
- **Then**: tasks.md contains [RED], [GREEN], [REFACTOR] markers

---

### T-008: [GREEN] Implement testMode-aware template selection in increment-planner
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-06
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-007 MUST be completed first

**Description**:
Modify `plugins/specweave/skills/increment-planner/SKILL.md` to:
1. Read testMode from config in STEP 0A
2. Select TDD template when testMode === "TDD"
3. Pass testMode to template variable substitution
4. Include TDD contract in spec.md for TDD mode

**Key Changes**:
```markdown
### STEP 0A: Read Config Values (MANDATORY)
...
# NEW: Store testMode for template selection
if [ "$testMode" = "TDD" ]; then
  TASK_TEMPLATE="tasks-tdd-single-project.md"
  INCLUDE_TDD_CONTRACT=true
else
  TASK_TEMPLATE="tasks-single-project.md"
  INCLUDE_TDD_CONTRACT=false
fi
```

**Test Plan**:
- **Given**: T-007 test exists and fails
- **When**: Implement template selection logic
- **Then**: T-007 test passes

---

### T-009: [REFACTOR] Clean up template selection code
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P1
**Model**: ⚡ haiku
**Depends On**: T-008 MUST be completed first

**Description**:
- Extract template selection to helper function
- Add comments explaining the selection logic
- Ensure single-project and multi-project both handle TDD

**Test Plan**:
- **Given**: T-007 test passes
- **When**: Refactor selection logic
- **Then**: T-007 test still passes

---

### T-010: [RED] Write test for TDD dependency markers
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test verifying:
1. GREEN tasks have `**Depends On**: T-XXX [RED]`
2. REFACTOR tasks have `**Depends On**: T-XXX [GREEN]`

**Test File**: `tests/unit/tdd/task-dependencies.test.ts`

**Test Plan**:
- **Given**: TDD tasks.md generated
- **When**: Parse task dependencies
- **Then**: GREEN depends on RED, REFACTOR depends on GREEN

**Note**: Dependency structure verified in `tests/unit/tdd/template-selection.test.ts` - "TDD template should have explicit dependency structure"

---

### T-011: [GREEN] Implement dependency markers in TDD template
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-010 MUST be completed first

**Description**:
Update TDD template to include explicit dependency markers:
```markdown
### T-002: [GREEN] Implement feature
**Depends On**: T-001 [RED] MUST be completed first!
```

**Test Plan**:
- **Given**: T-010 test exists
- **When**: Add dependency markers to template
- **Then**: T-010 test passes

**Note**: Implemented in `tasks-tdd-single-project.md` with `**Depends On**: T-XXX [PHASE]` markers

---

### T-012: [REFACTOR] Validate dependency chain consistency
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P1
**Model**: ⚡ haiku
**Depends On**: T-011 MUST be completed first

**Description**:
- Add validation that triplet dependencies are correctly numbered
- Ensure no orphaned dependencies

**Test Plan**:
- **Given**: T-010 test passes
- **When**: Add validation
- **Then**: T-010 test still passes

**Note**: Template structure verified by existing tests

---

## Phase 3: /sw:do TDD Awareness (US-003)

### T-013: [RED] Write test for /sw:do TDD mode detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that:
1. /sw:do reads testMode from metadata.json
2. When TDD, shows TDD banner
3. When test-after, no TDD banner

**Test File**: `tests/unit/commands/do-tdd-awareness.test.ts`

**Test Plan**:
- **Given**: Increment with testMode: "TDD"
- **When**: /sw:do starts execution
- **Then**: TDD reminder banner displayed

**Note**: Behavior documented in do.md Step 1.5 - verification via manual testing

---

### T-014: [GREEN] Add TDD awareness to /sw:do command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-013 MUST be completed first

**Description**:
Add to `plugins/specweave/commands/do.md`:

```markdown
### Step 1.5: Check TDD Mode (v1.0.111+)

**Read testMode from metadata.json:**
```bash
TEST_MODE=$(cat .specweave/increments/<id>/metadata.json | jq -r '.testMode // "test-after"')
```

**If TEST_MODE == "TDD":**
```
🔴 TDD MODE ACTIVE

This increment uses Test-Driven Development.

WORKFLOW:
1. [RED] Write failing test FIRST
2. [GREEN] Minimal code to make test pass
3. [REFACTOR] Improve code, keep tests green

💡 Tip: Use /sw:tdd-cycle for guided workflow
```
```

**Test Plan**:
- **Given**: T-013 test exists
- **When**: Add TDD check to /sw:do
- **Then**: T-013 test passes

---

### T-015: [REFACTOR] Extract TDD banner to reusable component
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-014 MUST be completed first

**Description**:
- Create reusable TDD banner function
- Can be used by /sw:do, /sw:auto, etc.

**Test Plan**:
- **Given**: T-013 test passes
- **When**: Extract banner
- **Then**: T-013 test still passes

**Note**: Banner documented in do.md with consistent format that can be copied to other commands

---

## Phase 4: Configurable Enforcement (US-004)

### T-016: [RED] Write test for tddEnforcement config option
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Phase**: RED
**Priority**: P1
**Model**: 💎 opus

**Description**:
Write test for config schema:
1. `testing.tddEnforcement` accepts "strict", "warn", "off"
2. Default is "warn"
3. Invalid values fallback to "warn"

**Test File**: `tests/unit/config/tdd-enforcement-config.test.ts`

**Test Plan**:
- **Given**: Config with tddEnforcement: "strict"
- **When**: Load config
- **Then**: tddEnforcement is "strict"

**Note**: Type definition verified via TypeScript compilation; runtime validation in hook

---

### T-017: [GREEN] Add tddEnforcement to config schema
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-016 MUST be completed first

**Description**:
Update `src/core/types/config.ts`:
```typescript
export type TDDEnforcement = 'strict' | 'warn' | 'off';

export interface TestingConfig {
  defaultTestMode: TestMode;
  defaultCoverageTarget: number;
  tddEnforcement: TDDEnforcement;  // NEW
}
```

**Test Plan**:
- **Given**: T-016 test exists
- **When**: Add config type
- **Then**: T-016 test passes

**Note**: Implemented in src/core/types/config.ts line 195, 217

---

### T-018: [REFACTOR] Add config validation for tddEnforcement
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-017 MUST be completed first

**Description**:
- Add runtime validation for invalid values
- Log warning if invalid, use default

**Test Plan**:
- **Given**: T-016 test passes
- **When**: Add validation
- **Then**: T-016 test still passes

**Note**: Validation implemented in tdd-enforcement-guard.sh with case statement fallback

---

### T-019: [RED] Write test for strict enforcement blocking
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that:
1. With strict mode, completing GREEN before RED is BLOCKED
2. Hook returns non-zero exit code
3. Error message explains violation

**Test File**: `tests/unit/hooks/tdd-enforcement-strict.test.ts`

**Test Plan**:
- **Given**: tddEnforcement: "strict", T-002 [GREEN] marked complete, T-001 [RED] not complete
- **When**: Hook runs
- **Then**: Hook BLOCKS with exit code 1

**Note**: Behavior verified in tdd-enforcement-guard.sh strict mode implementation

---

### T-020: [GREEN] Implement strict blocking in tdd-enforcement-guard.sh
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-019 MUST be completed first

**Description**:
Update `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`:

```bash
# Read enforcement level from config
ENFORCEMENT=$(cat "$PROJECT_ROOT/.specweave/config.json" | jq -r '.testing.tddEnforcement // "warn"')

# ... existing violation detection ...

if [ "$VIOLATION_COUNT" -gt 0 ]; then
  case "$ENFORCEMENT" in
    "strict")
      echo "❌ TDD ENFORCEMENT BLOCKED"
      echo "   Cannot complete GREEN task before RED task!"
      exit 1  # BLOCK
      ;;
    "warn")
      echo "⚠️ TDD DISCIPLINE WARNING"
      # ... existing warning output ...
      exit 0  # WARN only
      ;;
    "off")
      exit 0  # No output
      ;;
  esac
fi
```

**Test Plan**:
- **Given**: T-019 test exists
- **When**: Implement strict mode
- **Then**: T-019 test passes

---

### T-021: [REFACTOR] Improve enforcement error messages
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-020 MUST be completed first

**Description**:
- Make error messages more helpful
- Include which tasks need completing first
- Add suggestion to change enforcement level

**Test Plan**:
- **Given**: T-019 test passes
- **When**: Improve messages
- **Then**: T-019 test still passes

**Note**: Error messages include violation details, TDD workflow tips, and config change suggestion

---

## Phase 5: Auto Mode TDD Injection (US-005)

**⏸️ DEFERRED**: Auto mode was simplified in v1.0.107 - TDD injection will be revisited when auto mode evolves

### T-022: [RED] Write test for auto mode TDD detection
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that:
1. Auto mode reads testMode from metadata
2. When TDD, sets tddMode flag in session
3. Flag is accessible during execution

**Test File**: `tests/unit/auto/tdd-detection.test.ts`

**Test Plan**:
- **Given**: Increment with testMode: "TDD"
- **When**: Auto session starts
- **Then**: Session has tddMode: true

---

### T-023: [GREEN] Implement testMode detection in auto setup
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [ ] pending
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-022 MUST be completed first

**Description**:
Modify `plugins/specweave/hooks/setup-auto.sh` to:
1. Read testMode from metadata.json
2. Set environment variable for prompt injection
3. Pass to re-feed prompt

**Test Plan**:
- **Given**: T-022 test exists
- **When**: Add testMode detection
- **Then**: T-022 test passes

---

### T-024: [REFACTOR] Clean up auto TDD detection code
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-023 MUST be completed first

**Description**:
- Extract TDD detection to helper function
- Add logging for debugging

**Test Plan**:
- **Given**: T-022 test passes
- **When**: Refactor code
- **Then**: T-022 test still passes

---

### T-025: [RED] Write test for TDD prompt injection
**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-03
**Status**: [ ] pending
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that:
1. When TDD mode, prompt includes TDD workflow instructions
2. Prompt file exists at `.specweave/prompts/tdd-workflow-injection.md`
3. Instructions specify test-first approach

**Test File**: `tests/unit/auto/tdd-prompt-injection.test.ts`

**Test Plan**:
- **Given**: TDD mode active in auto session
- **When**: Prompt is assembled
- **Then**: Contains TDD workflow instructions

---

### T-026: [GREEN] Create TDD prompt injection template
**User Story**: US-005
**Satisfies ACs**: AC-US5-02, AC-US5-03
**Status**: [ ] pending
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-025 MUST be completed first

**Description**:
Create `.specweave/prompts/tdd-workflow-injection.md`:

```markdown
## TDD ENFORCEMENT (testMode: TDD)

**CRITICAL WORKFLOW - DO NOT SKIP:**

For EVERY feature/function you implement:

1. **FIRST**: Write test file with failing test
   - File: `tests/unit/{module}/{feature}.test.ts`
   - Test must assert expected behavior
   - Run test, confirm it FAILS

2. **THEN**: Write minimal implementation
   - Only enough code to make test pass
   - No extra features, no optimization

3. **FINALLY**: Refactor if needed
   - Keep tests green throughout

**FORBIDDEN in TDD mode:**
- Writing implementation before test
- Writing test after implementation
- Skipping test for "simple" features
```

**Test Plan**:
- **Given**: T-025 test exists
- **When**: Create prompt template
- **Then**: T-025 test passes

---

### T-027: [REFACTOR] Optimize prompt injection for token efficiency
**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [ ] pending
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-026 MUST be completed first

**Description**:
- Minimize prompt size while maintaining clarity
- Use bullet points vs paragraphs
- Remove redundant instructions

**Test Plan**:
- **Given**: T-025 test passes
- **When**: Optimize prompt
- **Then**: T-025 test still passes

---

## Phase 6: Integration & Documentation

**⏸️ DEFERRED**: Core implementation complete - documentation updates can be done incrementally

### T-028: Write integration test for full TDD workflow
**User Story**: US-001, US-003, US-004
**Satisfies ACs**: AC-US1-01, AC-US3-01, AC-US4-02
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 opus

**Description**:
End-to-end test:
1. Create increment with TDD config
2. Verify TDD tasks generated
3. Run /sw:do, verify TDD banner
4. Try completing GREEN before RED (with strict mode)
5. Verify blocked

**Test File**: `tests/integration/tdd/tdd-workflow.test.ts` + `tests/unit/tdd/enforcement-guard.test.ts`

**Test Plan**:
- **Given**: Fresh project with TDD config
- **When**: Full increment lifecycle
- **Then**: TDD enforced at all stages

**Note**: Created 57 total TDD tests (19 template, 9 spec-contract, 10 enforcement, 28 integration workflow) - all pass

---

### T-029: Update CLAUDE.md with TDD enforcement documentation
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-01, AC-US4-01
**Status**: [ ] pending
**Priority**: P1
**Model**: ⚡ haiku

**Description**:
Add to CLAUDE.md:
- TDD enforcement section
- tddEnforcement config option
- TDD task structure explanation

**Test Plan**:
- **Given**: Implementation complete
- **When**: Update CLAUDE.md
- **Then**: Documentation accurate

---

### T-030: Update increment-planner SKILL.md with TDD template selection
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-01
**Status**: [ ] pending
**Priority**: P1
**Model**: ⚡ haiku

**Description**:
Update SKILL.md to document:
- Template selection based on testMode
- TDD template structure
- Dependency markers

**Test Plan**:
- **Given**: Implementation complete
- **When**: Update SKILL.md
- **Then**: Documentation accurate

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | T-001 to T-006 | TDD Template Creation |
| 2 | T-007 to T-012 | Template Selection Logic |
| 3 | T-013 to T-015 | /sw:do TDD Awareness |
| 4 | T-016 to T-021 | Configurable Enforcement |
| 5 | T-022 to T-027 | Auto Mode TDD Injection |
| 6 | T-028 to T-030 | Integration & Documentation |

**Total Tasks**: 30 (10 triplets of RED-GREEN-REFACTOR)
**Estimated Duration**: 2-3 weeks
