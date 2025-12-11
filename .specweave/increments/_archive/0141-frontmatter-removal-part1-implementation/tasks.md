# Tasks: Frontmatter Project Removal - Part 1

**Increment**: 0141-frontmatter-removal-part1-implementation
**Status**: completed
**Test Mode**: test-after
**Coverage Target**: 80%
**Parent**: 0140-remove-frontmatter-project-field (T-011 to T-024)

---

## Phase 3: Remove Frontmatter References

### T-011: Update Living Docs Sync Tests
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update `src/core/living-docs/__tests__/living-docs-sync.test.ts`
2. Remove tests that verify `frontmatter.project` usage
3. Add tests that verify ProjectResolutionService integration
4. Update mocks to include resolution service
5. Ensure all existing tests pass

**Files Modified**:
- `src/core/living-docs/__tests__/living-docs-sync.test.ts`

**Test Plan**:
```gherkin
Scenario: All living docs sync tests pass
  Given updated test suite
  When npm test runs
  Then all tests pass
  And no references to frontmatter.project in test expectations
```

---

### T-012: Remove Frontmatter References from project-detector.ts
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (simple removal)

**Implementation**:
1. Open `src/core/living-docs/project-detector.ts`
2. Remove lines 199-206 (frontmatter scoring logic)
3. Update `detectProject()` method to skip frontmatter check
4. Update tests to not expect frontmatter scoring

**Files Modified**:
- `src/core/living-docs/project-detector.ts`
- `src/core/living-docs/__tests__/project-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: Detector skips frontmatter
  Given spec with frontmatter project: my-app
  When detectProject() called
  Then frontmatter is NOT scored
  And only keyword matching and tech stack used
```

---

### T-013: Remove Frontmatter References from hierarchy-mapper.ts
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (method removal)

**Implementation**:
1. Open `src/core/living-docs/hierarchy-mapper.ts`
2. Remove `detectProjectsFromFrontmatter()` method (lines 595-617)
3. Remove calls to this method
4. Update tests

**Files Modified**:
- `src/core/living-docs/hierarchy-mapper.ts`
- `src/core/living-docs/__tests__/hierarchy-mapper.test.ts`

**Test Plan**:
```gherkin
Scenario: Hierarchy mapper uses per-US fields only
  Given spec with frontmatter project and per-US projects
  When hierarchy mapping performed
  Then uses per-US projects
  And ignores frontmatter
```

---

### T-014: Update spec-identifier-detector.ts
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-07
**Status**: [x] completed
**Priority**: P2
**Model**: 💎 Opus (external tool integration)

**Implementation**:
1. Open `src/core/specs/spec-identifier-detector.ts`
2. Remove `frontmatter.project || 'default'` fallback (lines 105, 123, 141)
3. Inject ProjectResolutionService via constructor
4. Use resolution service to get project
5. Update tests

**Files Modified**:
- `src/core/specs/spec-identifier-detector.ts`
- `src/core/specs/__tests__/spec-identifier-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: External link resolution uses service
  Given JIRA external link without frontmatter project
  When detectIdentifier() called
  Then uses ProjectResolutionService to resolve project
  And generates correct project code
```

---

### T-015: Update GitHub Sync (user-story-issue-builder.ts)
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (label removal)

**Implementation**:
1. Open `plugins/specweave-github/lib/user-story-issue-builder.ts`
2. Remove lines 606-608 (frontmatter project label logic)
3. Update to derive project from per-US fields in issue body
4. Update tests

**Files Modified**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
- `plugins/specweave-github/__tests__/user-story-issue-builder.test.ts`

**Test Plan**:
```gherkin
Scenario: GitHub issue uses per-US project
  Given US with **Project**: web-app
  When GitHub issue created
  Then issue body includes project information
  And no frontmatter-based label added
```

---

### T-016: Update JIRA and ADO Sync
**User Story**: US-002
**Satisfies ACs**: AC-US2-05, AC-US2-07
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (similar to GitHub changes)

**Implementation**:
1. Update JIRA sync files to use resolution service
2. Update ADO sync files to use resolution service
3. Remove frontmatter references from both
4. Update tests

**Files Modified**:
- `plugins/specweave-jira/lib/*.ts`
- `plugins/specweave-ado/lib/*.ts`

**Test Plan**:
```gherkin
Scenario: JIRA sync uses resolved project
  Given increment syncing to JIRA
  When epic created
  Then uses ProjectResolutionService for project code

Scenario: ADO sync uses resolved project
  Given increment syncing to ADO
  When work item created
  Then uses resolved project for area path mapping
```

---

### T-017: Verify Zero Frontmatter References in src/
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (grep verification)

**Implementation**:
1. Run: `grep -r "frontmatter\.project" src/`
2. Verify output is empty
3. Run: `grep -r "yamlData\.project" src/` (alias check)
4. Verify output is empty
5. Add to CI/CD pipeline as verification step

**Test Plan**:
```gherkin
Scenario: No frontmatter.project references remain
  Given all code changes complete
  When grep search runs
  Then finds 0 matches in src/ directory
  And CI/CD verification passes
```

---

## Phase 4: Update Templates

### T-018: Update Single-Project Template
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line from YAML frontmatter
3. Add comment: `# NO project field - resolved from per-US fields or config`
4. Ensure per-US `**Project**:` field remains in user story section

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`

**Test Plan**:
```gherkin
Scenario: Generated spec has no frontmatter project
  Given increment planner uses single-project template
  When spec.md generated
  Then YAML frontmatter has no project: field
  And user stories have **Project**: field
```

---

### T-019: Update Multi-Project Template
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line
3. Remove `board: {{RESOLVED_BOARD}}` line
4. Add comment: `# NO project/board fields - each US specifies its own`
5. Ensure all user stories have **Project**: and **Board**: fields

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`

**Test Plan**:
```gherkin
Scenario: Multi-project spec has no frontmatter fields
  Given increment planner uses multi-project template
  When spec.md generated
  Then YAML frontmatter has no project: or board: fields
  And each user story has explicit **Project**: and **Board**:
```

---

### T-020: Update All Other Templates
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (batch template updates)

**Implementation**:
1. Find all template files: `find plugins/specweave/skills/increment-planner/templates -name "*.md"`
2. Update each template to remove frontmatter project/board
3. Verify per-US fields remain
4. Update any template generation code

**Files Modified**:
- All files in `plugins/specweave/skills/increment-planner/templates/`

**Test Plan**:
```gherkin
Scenario: All templates updated consistently
  Given 12 template files
  When all templates reviewed
  Then 0 templates have frontmatter project: field
  And all templates have per-US **Project**: fields
```

---

### T-021: Update Template Documentation
**User Story**: US-003
**Satisfies ACs**: AC-US3-05, AC-US3-06
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (docs update)

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md`
2. Update STEP 4 (Create spec.md Template) section
3. Remove references to frontmatter project field
4. Update example specs in documentation
5. Add migration notes

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `docs-site/docs/` (example specs)

**Test Plan**:
```gherkin
Scenario: Skill documentation is current
  Given skill documentation updated
  When user reads SKILL.md
  Then sees no frontmatter project examples
  And understands per-US fields are source of truth
```

---

## Phase 5: Update Validation Hooks

### T-022: Update spec-project-validator.sh Hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (bash scripting + validation logic)

**Implementation**:
1. Open `plugins/specweave/hooks/spec-project-validator.sh`
2. Remove frontmatter project: validation (single-project mode)
3. Remove frontmatter project: validation (multi-project mode)
4. Keep per-US **Project**: validation as primary
5. Update error messages to point to per-US fields
6. Test with various spec.md configurations

**Files Modified**:
- `plugins/specweave/hooks/spec-project-validator.sh`

**Test Plan**:
```gherkin
Scenario: Hook allows missing frontmatter in single-project
  Given single-project mode
  And spec.md with no frontmatter project:
  And all USs have **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook allows missing frontmatter in multi-project
  Given multi-project mode
  And spec.md with no frontmatter project:
  And all USs have valid **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook blocks missing per-US project
  Given spec.md with no **Project**: fields in USs
  When hook runs
  Then returns {"decision": "block"}
  And reason mentions "Each user story MUST have explicit project"
```

---

### T-023: Elevate per-us-project-validator.sh to Primary
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (hook priority adjustment)

**Implementation**:
1. Update hook execution order in `hooks.json`
2. Make `per-us-project-validator.sh` run before `spec-project-validator.sh`
3. Update documentation to reflect primary validation
4. Test hook execution order

**Files Modified**:
- `plugins/specweave/hooks/hooks.json`
- Hook documentation

**Test Plan**:
```gherkin
Scenario: Per-US validator runs first
  Given hooks.json configured
  When Write tool used on spec.md
  Then per-us-project-validator.sh executes first
  And spec-project-validator.sh executes second
```

---

### T-024: Update Validation Hook Tests
**User Story**: US-004
**Satisfies ACs**: AC-US4-06
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update hook test files
2. Add tests for optional frontmatter
3. Update tests to expect per-US validation as primary
4. Ensure all tests pass

**Files Modified**:
- `plugins/specweave/hooks/__tests__/*.test.ts`

**Test Plan**:
```gherkin
Scenario: Validation tests pass with optional frontmatter
  Given updated test suite
  When npm test runs
  Then all hook validation tests pass
  And optional frontmatter scenarios covered
```

---

## Summary

**Total Tasks**: 14 (T-011 to T-024)
**Estimated Effort**: 1-2 weeks
**Coverage Target**: 80%
**Test Mode**: test-after

**Phase Breakdown**:
- Phase 3: Remove Frontmatter References (7 tasks)
- Phase 4: Update Templates (4 tasks)
- Phase 5: Update Validation Hooks (3 tasks)

**Model Distribution**:
- ⚡ Haiku: 12 tasks (straightforward updates)
- 💎 Opus: 2 tasks (complex logic - T-014, T-022)

**Critical Path**:
1. Phase 3 (T-011 to T-017) - Must complete first
2. Phase 4 (T-018 to T-021) - Can overlap with Phase 3
3. Phase 5 (T-022 to T-024) - Must complete last (depends on Phase 3)
