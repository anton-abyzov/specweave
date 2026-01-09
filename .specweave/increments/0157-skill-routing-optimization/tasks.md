---
increment: 0157-skill-routing-optimization
status: completed
dependencies: []
phases:
  - phase-1-repository-detection
  - phase-2-skill-routing-fix
  - phase-3-increment-validation
  - phase-4-skill-visibility
  - phase-5-error-messages
  - phase-6-documentation
estimated_tasks: 24
estimated_effort: "11-14 hours"
---

# Implementation Tasks: Skill Routing Optimization

## Phase 1: Repository Detection (US-001)

### T-001: Create Repository Detector Utility
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed | **Model**: 💎 Opus

Implement repository detection logic to identify when running in SpecWeave's own repository.

**Implementation Steps**:
1. Create `src/utils/repository-detector.ts`
2. Implement `detectSpecWeaveRepository(cwd)` function
3. Check package.json name === "specweave"
4. Check for src/cli/commands directory
5. Check for plugins/specweave directory
6. Return detection result with confidence level

**Test Plan**:
- **Given**: Various project structures
- **When**: Detection function called
- **Then**: Correctly identifies SpecWeave repo
- **Test File**: `tests/unit/repository-detector.test.ts`
```typescript
describe('detectSpecWeaveRepository', () => {
  it('detects SpecWeave repo with all signals', () => {
    const fixture = createSpecWeaveFixture();
    const result = detectSpecWeaveRepository(fixture.path);
    expect(result.isSpecWeaveRepo).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.detectionSignals).toHaveLength(3);
  });

  it('returns false for user project', () => {
    const fixture = createUserProjectFixture();
    const result = detectSpecWeaveRepository(fixture.path);
    expect(result.isSpecWeaveRepo).toBe(false);
  });

  it('handles missing package.json gracefully', () => {
    const result = detectSpecWeaveRepository('/tmp/empty');
    expect(result.isSpecWeaveRepo).toBe(false);
    expect(result.confidence).toBe('low');
  });
});
```

---

### T-002: Add Self-Awareness Prompt to increment.md
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04, AC-US1-05, AC-US1-06 | **Status**: [x] completed | **Model**: ⚡ Haiku

Update `/sw:increment` command documentation to include self-awareness check.

**Implementation Steps**:
1. Edit `plugins/specweave/commands/increment.md`
2. Add Step 0A-Prime: "Self-Awareness Check" before Step 0A
3. Include bash code to run repository detection
4. Add prompt template for user confirmation
5. Document --force-specweave-dev flag

**Test Plan**:
- **Manual Test**: Run `/sw:increment` in SpecWeave repo
- **Validation**: Confirmation prompt appears
- **Test**: User can choose Continue/Cancel/Examples

---

### T-003: Implement Self-Awareness in increment-planner Skill
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07 | **Status**: [x] completed | **Model**: 💎 Opus

Add self-awareness check to increment-planner skill before creating any files.

**Implementation Steps**:
1. Edit increment-planner skill index.md
2. Add STEP 0-Prime: Call repository detector
3. If SpecWeave repo detected, output warning
4. Provide options: Continue for SpecWeave dev, Suggest examples/ for tests, Cancel
5. Check for --force-specweave-dev flag in args
6. Log decision to metadata if continuing

**Test Plan**:
- **Given**: Running in SpecWeave repo
- **When**: increment-planner skill invoked
- **Then**: Warning displayed and user prompted
- **Test File**: Manual test + capture output

---

## Phase 2: Skill Routing Fix (US-002)

### T-004: Clarify /sw:increment Documentation
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-03 | **Status**: [x] completed | **Model**: ⚡ Haiku

Update `/sw:increment` documentation to explicitly show increment-planner invocation.

**Implementation Steps**:
1. Edit `plugins/specweave/commands/increment.md`
2. In Step 5, add explicit example: `Skill(command: "increment-planner")`
3. Add warning box: "DO NOT call /sw:plan - that's for existing increments"
4. Update workflow diagram to show correct flow
5. Add troubleshooting section for common mistakes

**Test Plan**:
- **Manual Review**: Documentation is clear and unambiguous
- **User Testing**: Ask contributor to follow docs and verify success

---

### T-005: Add Existence Validation to /sw:plan
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02, AC-US2-04, AC-US2-05 | **Status**: [x] completed | **Model**: 💎 Opus

Add validation to `/sw:plan` to ensure increment exists before proceeding.

**Implementation Steps**:
1. Edit `src/cli/commands/plan.ts` (if exists) or plan.md
2. Add validation check: increment directory exists
3. Check for spec.md file existence
4. If missing, throw formatted error with suggestions
5. Show available increments if none specified

**Test Plan**:
- **Given**: Non-existent increment ID
- **When**: /sw:plan 9999 called
- **Then**: Clear error message with suggestions
- **Test File**: `tests/integration/plan-command.test.ts`
```typescript
describe('/sw:plan validation', () => {
  it('errors when increment does not exist', async () => {
    await expect(runCommand('plan', ['9999']))
      .rejects.toThrow(/Increment.*not found/);
  });

  it('provides helpful suggestions in error', async () => {
    try {
      await runCommand('plan', ['9999']);
    } catch (error) {
      expect(error.message).toContain('/sw:increment');
      expect(error.message).toContain('create new');
    }
  });
});
```

---

## Phase 3: Increment Validation (US-003)

### T-006: Create Increment Validator
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed | **Model**: 💎 Opus

Implement increment number validation logic.

**Implementation Steps**:
1. Create `src/core/increment-validator.ts`
2. Implement `validateIncrementNumber(requested, projectRoot)` function
3. Scan increments directory for highest number
4. Compare requested vs next available
5. Return validation result with recommendations

**Test Plan**:
- **Given**: Various increment sequences
- **When**: Validation function called
- **Then**: Correct sequential analysis
- **Test File**: `tests/unit/increment-validator.test.ts`
```typescript
describe('validateIncrementNumber', () => {
  it('validates sequential number as correct', () => {
    const result = validateIncrementNumber('0158', fixtureWith0157);
    expect(result.isSequential).toBe(true);
    expect(result.nextAvailable).toBe('0158');
  });

  it('detects non-sequential number', () => {
    const result = validateIncrementNumber('0001', fixtureWith0157);
    expect(result.isSequential).toBe(false);
    expect(result.nextAvailable).toBe('0158');
    expect(result.warning).toContain('0001 but next available is 0158');
  });

  it('handles empty increments directory', () => {
    const result = validateIncrementNumber('0001', emptyFixture);
    expect(result.isSequential).toBe(true);
    expect(result.nextAvailable).toBe('0001');
  });
});
```

---

### T-007: Integrate Validation into increment-planner
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed | **Model**: 💎 Opus

Add validation prompt to increment-planner before creating directory.

**Implementation Steps**:
1. Edit increment-planner skill
2. After STEP 1 (get next number), validate requested number
3. If non-sequential, display warning with options
4. Options: Use next (recommended), Force requested, Cancel
5. If forcing, add warning to metadata.json
6. Suggest use case: "Non-sequential only for examples/tests"

**Test Plan**:
- **Manual Test**: Request increment 0001 when 0157 exists
- **Validation**: Prompt appears with options
- **Verify**: Choosing "Use next" creates 0158, not 0001

---

## Phase 4: Skill Visibility Controls (US-004)

### T-008: Extend Skill Manifest Schema
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed | **Model**: ⚡ Haiku

Add visibility and invocableBy fields to skill manifest TypeScript types.

**Implementation Steps**:
1. Edit `src/types/skill-manifest.ts`
2. Add `visibility?: 'public' | 'internal'` field
3. Add `invocableBy?: string[]` field (default ['*'])
4. Update JSON schema validation if exists
5. Document new fields in comments

**Test Plan**:
- **Compilation**: TypeScript compiles without errors
- **Validation**: Schema validates with new fields

---

### T-009: Update Skill Loader
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed | **Model**: 💎 Opus

Modify skill loader to parse and store visibility fields.

**Implementation Steps**:
1. Edit `src/cli/skill-loader.ts`
2. Parse `visibility` from manifest.json (default "public")
3. Parse `invocableBy` from manifest.json (default ["*"])
4. Store fields in loaded skill object
5. Add debug logging for visibility status

**Test Plan**:
- **Given**: Skill with visibility: "internal"
- **When**: Skill loaded
- **Then**: Visibility field correctly stored
- **Test File**: `tests/unit/skill-loader.test.ts`

---

### T-010: Implement Skill Invocation Guards
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-05 | **Status**: [x] completed | **Model**: 💎 Opus

Add enforcement logic to skill invoker to respect visibility controls.

**Implementation Steps**:
1. Edit `src/cli/skill-invoker.ts` (or equivalent)
2. Add `canInvokeSkill(skillName, invokedBy)` function
3. Check visibility === "internal" → verify invokedBy in invocableBy list
4. Throw formatted error if not allowed
5. Allow public skills for all callers

**Test Plan**:
- **Given**: Internal skill, direct user invocation
- **When**: Skill invocation attempted
- **Then**: Error thrown with helpful message
- **Test File**: `tests/unit/skill-invoker.test.ts`
```typescript
describe('skill invocation guards', () => {
  it('allows public skills for any caller', () => {
    const skill = { visibility: 'public' };
    expect(canInvokeSkill(skill, 'user')).toBe(true);
  });

  it('blocks direct invocation of internal skill', () => {
    const skill = { visibility: 'internal', invocableBy: ['sw:increment'] };
    expect(() => canInvokeSkill(skill, 'user'))
      .toThrow(/internal skill/);
  });

  it('allows internal skill from authorized caller', () => {
    const skill = { visibility: 'internal', invocableBy: ['sw:increment'] };
    expect(canInvokeSkill(skill, 'sw:increment')).toBe(true);
  });
});
```

---

### T-011: Mark increment-planner as Internal
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03, AC-US4-04 | **Status**: [x] completed | **Model**: ⚡ Haiku

Update increment-planner manifest to mark it as internal.

**Implementation Steps**:
1. Edit `plugins/specweave/skills/increment-planner/manifest.json`
2. Add `"visibility": "internal"`
3. Add `"invocableBy": ["sw:increment"]`
4. Update skill README to document restrictions
5. Add note: "This skill is internal - use /sw:increment instead"

**Test Plan**:
- **Manual Test**: Try calling increment-planner directly
- **Validation**: Error message shown
- **Verify**: /sw:increment can still call it

---

### T-012: Filter Internal Skills in /plugin list
**User Story**: US-004 | **Satisfies ACs**: AC-US4-06, AC-US4-07 | **Status**: [x] completed | **Model**: 💎 Opus

Update `/plugin list` command to hide internal skills by default.

**Implementation Steps**:
1. Edit `src/cli/commands/plugin.ts`
2. In list command, filter skills where visibility !== "internal"
3. Add `--all` flag to show internal skills
4. When --all used, show "(internal)" label next to internal skills
5. Update command help text

**Test Plan**:
- **Given**: increment-planner marked as internal
- **When**: /plugin list executed
- **Then**: increment-planner not shown
- **When**: /plugin list --all executed
- **Then**: increment-planner shown with (internal) label
- **Test File**: `tests/integration/plugin-list.test.ts`

---

## Phase 5: Error Messages (US-005)

### T-013: Create Error Formatter Utility
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-05 | **Status**: [x] completed | **Model**: 💎 Opus

Implement standardized error message formatting.

**Implementation Steps**:
1. Create `src/utils/error-formatter.ts`
2. Define `FormattedError` interface
3. Implement `formatCommandError(command, error, context)` function
4. Add command-specific formatters (plan, increment, etc.)
5. Include emoji, title, description, suggestions, examples

**Test Plan**:
- **Given**: Various error scenarios
- **When**: Error formatter called
- **Then**: Consistent, helpful message
- **Test File**: `tests/unit/error-formatter.test.ts`
```typescript
describe('error formatter', () => {
  it('formats plan command errors helpfully', () => {
    const error = new Error('Increment not found');
    const formatted = formatCommandError('sw:plan', error);

    expect(formatted.emoji).toBe('❌');
    expect(formatted.title).toContain('not found');
    expect(formatted.suggestions).toContain(/create new.*\/sw:increment/);
    expect(formatted.examples).toHaveLength(2);
  });

  it('includes actionable next steps', () => {
    const formatted = formatCommandError('sw:plan', new Error('Missing spec.md'));
    formatted.suggestions.forEach(s => {
      expect(s).toMatch(/^(To |Use |Run )/); // Actionable verbs
    });
  });
});
```

---

### T-014: Apply Formatter to /sw:plan Command
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-04 | **Status**: [x] completed | **Model**: ⚡ Haiku

Update /sw:plan error handling to use formatter.

**Implementation Steps**:
1. Edit plan command implementation
2. Import error formatter
3. Replace raw error throws with formatted errors
4. Ensure all error paths use formatter
5. Test all error scenarios

**Test Plan**:
- **Manual Test**: Trigger each error scenario
- **Validation**: Formatted message appears
- **Verify**: Suggestions are helpful and accurate

---

### T-015: Apply Formatter to Other Commands
**User Story**: US-005 | **Satisfies ACs**: AC-US5-05 | **Status**: [x] completed | **Model**: ⚡ Haiku

Apply error formatter to remaining commands for consistency.

**Implementation Steps**:
1. Identify all command error paths
2. Update each to use error formatter
3. Add command-specific formatting rules
4. Ensure emoji consistency (❌ for errors, ⚠️ for warnings, 💡 for tips)
5. Test error messages across all commands

**Test Plan**:
- **Test**: Trigger errors in /sw:do, /sw:done, /sw:validate
- **Validation**: All follow same format pattern

---

## Phase 6: Documentation (US-006)

### T-016: Update /sw:increment Documentation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 | **Status**: [x] completed | **Model**: ⚡ Haiku

Ensure /sw:increment docs accurately reflect correct workflow.

**Implementation Steps**:
1. Edit `plugins/specweave/commands/increment.md`
2. Update Step 5-6 with correct skill invocation
3. Add code example: `Skill(command: "increment-planner", args: "...")`
4. Remove any references to calling /sw:plan during creation
5. Add troubleshooting section

**Test Plan**:
- **Review**: Documentation review with contributor
- **Validation**: Can create increment by following docs exactly

---

### T-017: Update /sw:plan Documentation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02 | **Status**: [x] completed | **Model**: ⚡ Haiku

Clarify that /sw:plan is for existing increments only.

**Implementation Steps**:
1. Edit `plugins/specweave/commands/plan.md`
2. Add prominent note at top: "For EXISTING increments only"
3. Update description to emphasize pre-condition
4. Add "When NOT to use" section
5. Link to /sw:increment for creating new

**Test Plan**:
- **Review**: Clear distinction between create vs plan
- **Validation**: User feedback confirms clarity

---

### T-018: Add Workflow Diagram to CLAUDE.md
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [x] completed | **Model**: ⚡ Haiku

Create visual workflow diagram for increment creation.

**Implementation Steps**:
1. Edit `CLAUDE.md` in SpecWeave repository
2. Add workflow section for increment creation
3. Create Mermaid diagram showing: /sw:increment → increment-planner → spec/plan/tasks
4. Show alternative path: spec exists → /sw:plan
5. Add notes about when to use each command

**Test Plan**:
- **Visual Review**: Diagram renders correctly
- **Validation**: Workflow is clear and unambiguous

---

### T-019: Document increment-planner Skill
**User Story**: US-006 | **Satisfies ACs**: AC-US6-04 | **Status**: [x] completed | **Model**: ⚡ Haiku

Add comprehensive documentation to increment-planner skill.

**Implementation Steps**:
1. Edit increment-planner README.md
2. Document purpose: "Internal skill called by /sw:increment"
3. Document when it's invoked
4. Document that users should NOT call directly
5. Document parameters and options

**Test Plan**:
- **Review**: Documentation is clear
- **Validation**: README explains restriction clearly

---

### T-020: Update Workflow Examples in CLAUDE.md
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05 | **Status**: [x] completed | **Model**: ⚡ Haiku

Update all workflow examples in CLAUDE.md to use correct commands.

**Implementation Steps**:
1. Search CLAUDE.md for all increment creation examples
2. Replace any incorrect /sw:plan calls with /sw:increment
3. Ensure examples show proper sequencing
4. Add "What NOT to do" section with common mistakes
5. Include self-awareness example for SpecWeave contributors

**Test Plan**:
- **Review**: All examples use correct commands
- **Validation**: No references to /sw:plan during creation

---

## Testing Phase

### T-021: Write Unit Tests
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed | **Model**: 💎 Opus

Create comprehensive unit test suite for all new components.

**Implementation Steps**:
1. Repository detector tests (T-001)
2. Increment validator tests (T-006)
3. Skill invoker guard tests (T-010)
4. Error formatter tests (T-013)
5. Achieve 80%+ coverage on new code

**Test Plan**:
- **Coverage**: Run `npm run test:coverage`
- **Target**: 80%+ on new modules
- **Test Files**: Multiple (see individual tasks)

---

### T-022: Write Integration Tests
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed | **Model**: 💎 Opus

Create integration tests for full workflow.

**Implementation Steps**:
1. Test /sw:increment in SpecWeave repo (gets warning)
2. Test /sw:increment in user project (no warning)
3. Test /sw:plan with non-existent increment (error)
4. Test /sw:plan with existing increment (success)
5. Test non-sequential number handling

**Test Plan**:
- **Test File**: `tests/integration/increment-workflow.test.ts`
```typescript
describe('increment creation workflow', () => {
  it('warns when creating in SpecWeave repo', async () => {
    const output = await runInSpecWeaveRepo('sw:increment "test feature"');
    expect(output).toContain('Running in SpecWeave repository');
    expect(output).toContain('confirm');
  });

  it('creates without warning in user project', async () => {
    const output = await runInUserProject('sw:increment "test feature"');
    expect(output).not.toContain('SpecWeave repository');
  });

  it('errors clearly when planning non-existent increment', async () => {
    await expect(runCommand('sw:plan 9999'))
      .rejects.toThrow(/not found.*create new/);
  });
});
```

---

### T-023: Manual E2E Testing
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed | **Model**: ⚡ Haiku

Perform end-to-end manual testing of all scenarios.

**Test Scenarios**:
1. Create increment in SpecWeave repo → See warning → Confirm
2. Create increment with non-sequential number → Get prompt → Choose
3. Try calling increment-planner directly → Get blocked
4. Run /sw:plan on non-existent → Get helpful error
5. Run /plugin list → Internal skills hidden
6. Run /plugin list --all → Internal skills shown

**Test Plan**:
- **Checklist**: All scenarios pass
- **Validation**: User experience is smooth
- **Documentation**: Any issues discovered are fixed

---

### T-024: Update Test Documentation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05 | **Status**: [x] completed | **Model**: ⚡ Haiku

Document testing procedures for this feature.

**Implementation Steps**:
1. Create testing guide in increment docs/
2. Document how to test repository detection
3. Document how to test skill routing
4. Add troubleshooting guide
5. Include expected outputs for each scenario

**Test Plan**:
- **Review**: Testing guide is complete
- **Validation**: Another contributor can follow guide

---

## Summary

**Total Tasks**: 24
- Phase 1 (Repository Detection): 3 tasks
- Phase 2 (Skill Routing Fix): 2 tasks
- Phase 3 (Increment Validation): 2 tasks
- Phase 4 (Skill Visibility): 5 tasks
- Phase 5 (Error Messages): 3 tasks
- Phase 6 (Documentation): 5 tasks
- Testing: 4 tasks

**Estimated Effort**: 11-14 hours
**Target Coverage**: 80%+
**Test Mode**: test-after (from config)

**Priority Order**:
1. Phase 2 (Quick fix for immediate issue)
2. Phase 1 (Prevent contributor confusion)
3. Phase 3 (Improve UX for increment numbering)
4. Phase 5 (Better error messages)
5. Phase 4 (Internal skill management)
6. Phase 6 (Documentation updates)
