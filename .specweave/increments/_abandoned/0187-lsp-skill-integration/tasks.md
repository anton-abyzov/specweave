---
increment: 0187-lsp-skill-integration
status: planned
total_tasks: 28
completed_tasks: 0
priority: P1
type: refactor
phases:
  - phase-1-documentation
  - phase-2-agent-updates
  - phase-3-skill-updates
  - phase-4-validation
estimated_duration: 2-3 weeks
test_mode: TDD
coverage_target: 80
---

# Implementation Tasks: LSP Integration Across Skills and Agents

**Increment**: 0187-lsp-skill-integration
**Test Strategy**: TDD (tests written BEFORE implementation)
**Coverage Target**: 80% minimum

---

## Phase 1: Documentation & Patterns (Foundation)

### T-001: Create LSP Integration Guide Structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Create `docs-site/docs/guides/lsp-for-skills.md`
- Add frontmatter and basic structure
- Include sections: Quick Start, Core Operations, Error Handling
- Add to Docusaurus sidebars.ts

**Acceptance**:
- [ ] File exists at docs-site/docs/guides/lsp-for-skills.md
- [ ] Has all required sections (Quick Start, 5 Operations, Error Handling)
- [ ] Renders correctly in Docusaurus preview

**Test Plan** (TDD - write first):
```
Given docs-site/docs/guides/lsp-for-skills.md exists
When viewing in Docusaurus at localhost:3000/guides/lsp-for-skills
Then all sections render with proper formatting
And navigation sidebar includes LSP guide entry
```

---

### T-002: Document goToDefinition Operation
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-001

**Implementation**:
- Add goToDefinition section to LSP guide
- Include: Purpose, Use Cases, Example YAML, Expected Output
- Show fallback pattern (grep) if LSP unavailable
- Real example from frontend-architect use case

**Acceptance**:
- [ ] goToDefinition section complete with all subsections
- [ ] YAML example shows skill usage pattern
- [ ] Expected output format documented
- [ ] Fallback behavior documented

**Test Plan** (TDD):
```
Given LSP guide goToDefinition section
When skill author reads it
Then they understand WHEN to use goToDefinition (navigate to definitions)
And HOW to write YAML instruction ("Use goToDefinition on file.ts:42")
And WHAT output to expect (file path + line number)
And FALLBACK if LSP unavailable (use grep)
```

---

### T-003: Document findReferences Operation
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-001

**Implementation**:
- Add findReferences section to LSP guide
- Use case: Impact analysis before refactoring
- Example from database-optimizer: "Find all usages before schema change"
- Expected output: List of file:line locations

**Acceptance**:
- [ ] findReferences section complete
- [ ] Impact analysis use case documented
- [ ] Database-optimizer example included
- [ ] Output format (location list) shown

**Test Plan** (TDD):
```
Given findReferences section in LSP guide
When database optimizer agent author reads it
Then they understand to use findReferences before schema changes
And can write YAML: "Use findReferences on models/User.ts:getUserById"
And expect list of all call sites as output
```

---

### T-004: Document documentSymbol Operation
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-001

**Implementation**:
- Add documentSymbol section to LSP guide
- Use case: Map file structure, extract API surface
- Example from living-docs: API extraction workflow
- Expected output: Symbol tree (functions, classes, exports)

**Acceptance**:
- [ ] documentSymbol section complete
- [ ] API surface extraction use case documented
- [ ] Living-docs example workflow included
- [ ] Symbol tree output format shown

**Test Plan** (TDD):
```
Given documentSymbol section
When living-docs command author reads it
Then they understand documentSymbol extracts file structure
And can write YAML: "Use documentSymbol on src/index.ts to list exports"
And expect symbol tree with functions, classes, interfaces
```

---

### T-005: Document hover and getDiagnostics Operations
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-001

**Implementation**:
- Add hover section: Type signature extraction
- Add getDiagnostics section: Code quality assessment
- Examples for both operations
- Expected outputs documented

**Acceptance**:
- [ ] hover section complete with type extraction examples
- [ ] getDiagnostics section complete with quality check examples
- [ ] Both show expected output formats
- [ ] Real use cases from agents included

**Test Plan** (TDD):
```
Given hover and getDiagnostics sections
When agent author reads them
Then they understand hover gets type info ("function(x: number): string")
And getDiagnostics gets errors/warnings list
And can write appropriate YAML instructions for both
```

---

### T-006: Add LSP vs Grep Decision Tree
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-002, T-003, T-004, T-005

**Implementation**:
- Create decision tree section in LSP guide
- When to use LSP (symbol resolution, type info, navigation)
- When to use Grep (text search, pattern matching, comments)
- Hybrid approach: Use both strategically

**Acceptance**:
- [ ] Decision tree clearly shows LSP vs Grep use cases
- [ ] Includes Mermaid flowchart or table
- [ ] Hybrid approach documented
- [ ] Real examples for each choice

**Test Plan** (TDD):
```
Given LSP vs Grep decision tree
When skill author is choosing between LSP and Grep
Then they can determine correct tool based on task
And understand: LSP for symbols, Grep for text
And know when to use hybrid approach
```

---

### T-007: Document LSP Error Handling Patterns
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-001

**Implementation**:
- Add Error Handling section to LSP guide
- Pattern: Check language server availability
- Pattern: Fallback to grep if LSP fails
- Pattern: Handle LSP timeout gracefully

**Acceptance**:
- [ ] Error handling section complete
- [ ] Language server availability check documented
- [ ] Fallback patterns shown
- [ ] Timeout handling included

**Test Plan** (TDD):
```
Given Error Handling section
When agent encounters LSP failure
Then skill instructions include fallback to grep
And provide helpful error message
And continue with reduced functionality (not crash)
```

---

### T-008: Create Example Skill YAML with LSP
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-002, T-003, T-004, T-005

**Implementation**:
- Create example skill in LSP guide
- Show complete SKILL.md with LSP instructions
- Include: description, triggers, LSP usage patterns
- Add comments explaining each LSP operation

**Acceptance**:
- [ ] Complete example SKILL.md shown
- [ ] All 5 LSP operations demonstrated
- [ ] Comments explain when/how to use each
- [ ] Can be copy-pasted as template

**Test Plan** (TDD):
```
Given example SKILL.md in LSP guide
When new skill author copies it
Then they have working template with LSP
And understand all 5 LSP operations usage
And can adapt for their specific skill
```

---

### T-009: Create LSP Patterns Library
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Create `plugins/specweave/lib/lsp-patterns.md`
- Add header and structure
- Include pattern template format
- Setup for 6 patterns to be added

**Acceptance**:
- [ ] File created at plugins/specweave/lib/lsp-patterns.md
- [ ] Has pattern template format
- [ ] Ready for individual patterns

**Test Plan** (TDD):
```
Given lsp-patterns.md file
When skill author needs LSP example
Then they find pattern library easily
And can copy reusable patterns
```

---

### T-010: Add Pre-Refactoring Pattern
**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-009

**Implementation**:
- Add "Pattern 1: Pre-Refactoring Impact Analysis" to lsp-patterns.md
- Use findReferences to locate all usages
- Review each reference before making changes
- Include complete example with actual file paths

**Acceptance**:
- [ ] Pattern 1 complete with all sections
- [ ] findReferences usage shown
- [ ] Real example included
- [ ] Copy-pasteable format

**Test Plan** (TDD):
```
Given Pattern 1 in lsp-patterns.md
When refactoring agent uses it
Then all function usages are found with findReferences
And agent reviews each usage before changes
And no breaking changes made to existing code
```

---

### T-011: Add API Extraction Pattern
**User Story**: US-006
**Satisfies ACs**: AC-US6-03
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-009

**Implementation**:
- Add "Pattern 2: API Surface Extraction"
- Use documentSymbol to list all exports
- Filter for public API (exported symbols)
- Use hover to get type signatures

**Acceptance**:
- [ ] Pattern 2 complete
- [ ] documentSymbol + hover workflow shown
- [ ] Export filtering explained
- [ ] Full API extraction example

**Test Plan** (TDD):
```
Given Pattern 2 in lsp-patterns.md
When living-docs extracts API surface
Then documentSymbol lists all symbols
And only exported ones are included in API docs
And hover provides accurate type signatures
```

---

### T-012: Add Dead Code Detection, Type Navigation, and JSDoc Patterns
**User Story**: US-006
**Satisfies ACs**: AC-US6-04, AC-US6-05, AC-US6-06
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-009

**Implementation**:
- Add Pattern 3: Dead Code Detection (findReferences = 0)
- Add Pattern 4: Type Hierarchy Navigation (goToDefinition chain)
- Add Pattern 5: JSDoc Extraction (hover for documentation)
- Each with use case, operations, expected output

**Acceptance**:
- [ ] Patterns 3, 4, 5 complete
- [ ] Dead code detection workflow clear
- [ ] Type navigation chain shown
- [ ] JSDoc extraction example included

**Test Plan** (TDD):
```
Given Patterns 3, 4, 5 in lsp-patterns.md
When agent looks for dead code
Then findReferences with 0 results identifies unused functions
And when navigating types, goToDefinition chain works
And hover extracts JSDoc for documentation generation
```

---

## Phase 2: Agent Updates (High-Value Implementations)

### T-013: Update Frontend Architect with documentSymbol
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-004, T-008

**Implementation**:
- Edit `plugins/specweave-frontend/agents/frontend-architect/AGENT.md`
- Add "## LSP Integration" section
- Add documentSymbol usage for component structure mapping
- Example: "Use documentSymbol on src/components/Button.tsx to map exports"

**Acceptance**:
- [ ] LSP Integration section added to AGENT.md
- [ ] documentSymbol usage instructions clear
- [ ] Real React component example included
- [ ] No breaking changes to existing content

**Test Plan** (TDD):
```
Given updated frontend-architect AGENT.md with LSP section
When agent analyzes React component structure
Then agent uses documentSymbol instead of grep
And accurately maps component exports
And extracts prop types with hover
```

---

### T-014: Add findReferences to Frontend Architect
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-013

**Implementation**:
- Add findReferences usage to frontend-architect AGENT.md
- Use case: Before refactoring component props
- Example: "Use findReferences on Button component to find all usages"
- Include fallback pattern

**Acceptance**:
- [ ] findReferences section added
- [ ] Refactoring use case documented
- [ ] Example with actual component name
- [ ] Fallback to grep if LSP unavailable

**Test Plan** (TDD):
```
Given frontend-architect with findReferences instructions
When refactoring component props (e.g., rename onClick to onPress)
Then agent finds all component usages with findReferences
And reviews each usage site before changing props
And provides migration plan if breaking
```

---

### T-015: Add hover Type Extraction to Frontend Architect
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04, AC-US2-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-014

**Implementation**:
- Add hover usage to frontend-architect AGENT.md
- Use case: Extract TypeScript type signatures for documentation
- Complete example workflow
- Final review and validation of all LSP additions

**Acceptance**:
- [ ] hover section added with type extraction
- [ ] Complete example workflow included
- [ ] All 3 LSP operations (documentSymbol, findReferences, hover) integrated
- [ ] AGENT.md validated for correctness

**Test Plan** (TDD):
```
Given frontend-architect with complete LSP integration
When documenting React component
Then hover extracts prop types: interface ButtonProps { onClick: () => void }
And includes type info in component documentation
And all LSP operations work together seamlessly
```

---

### T-016: Update Database Optimizer with findReferences
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-010

**Implementation**:
- Edit `plugins/specweave-backend/agents/database-optimizer/AGENT.md`
- Add "## LSP Integration" section
- Add findReferences for query usage analysis
- Example: "Use findReferences on getUserById to find all call sites"

**Acceptance**:
- [ ] LSP Integration section added to database-optimizer AGENT.md
- [ ] findReferences usage clear for query analysis
- [ ] Real ORM function example included
- [ ] Schema change use case documented

**Test Plan** (TDD):
```
Given database-optimizer with findReferences instructions
When planning schema migration (e.g., rename column)
Then agent uses findReferences on affected ORM functions
And identifies all queries that need updating
And provides migration plan with zero downtime
```

---

### T-017: Add goToDefinition and hover to Database Optimizer
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-016

**Implementation**:
- Add goToDefinition for navigating to ORM model definitions
- Add hover for extracting ORM function signatures
- Complete example workflow
- Final validation

**Acceptance**:
- [ ] goToDefinition section added
- [ ] hover section added
- [ ] All 3 operations integrated
- [ ] AGENT.md complete and validated

**Test Plan** (TDD):
```
Given database-optimizer with complete LSP integration
When analyzing database query impact
Then goToDefinition navigates to model definition
And hover extracts function signature: async getUserById(id: string): Promise<User>
And findReferences finds all usages
And complete impact analysis provided
```

---

### T-018: Update Explore Agent with LSP Navigation
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Update Explore agent documentation (find correct location)
- Add instruction: "ALWAYS use goToDefinition instead of grep for symbol navigation"
- Add documentSymbol for understanding file structure quickly
- Hybrid approach: LSP for symbols, grep for text

**Acceptance**:
- [ ] Explore agent docs updated with LSP preference
- [ ] goToDefinition prioritized over grep
- [ ] documentSymbol usage documented
- [ ] Hybrid approach explained

**Test Plan** (TDD):
```
Given Explore agent with LSP navigation instructions
When exploring codebase for function definition
Then agent uses goToDefinition (not grep) to navigate
And uses documentSymbol to understand file structure
And only uses grep for text pattern searches
```

---

### T-019: Add getDiagnostics and Complete Explore Agent
**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04, AC-US5-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-018

**Implementation**:
- Add getDiagnostics for code quality assessment during exploration
- Document hybrid approach clearly
- Complete example workflows
- Final validation

**Acceptance**:
- [ ] getDiagnostics section added
- [ ] Hybrid approach (LSP + grep) documented
- [ ] Complete example workflows included
- [ ] All updates validated

**Test Plan** (TDD):
```
Given Explore agent with complete LSP integration
When exploring unfamiliar codebase
Then getDiagnostics shows code quality issues early
And hybrid approach used: LSP for symbols, grep for text
And navigation is semantic, not text-based
```

---

## Phase 3: Skill & Command Updates

### T-020: Update Living Docs Command with LSP Instructions
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-011

**Implementation**:
- Edit `plugins/specweave/commands/living-docs.md`
- Add "## LSP-Enhanced API Extraction" section
- Document documentSymbol usage for extracting exported symbols
- Clarify LSP is default, --no-lsp is fallback

**Acceptance**:
- [ ] LSP-Enhanced API Extraction section added
- [ ] documentSymbol usage documented
- [ ] Default vs fallback clarified
- [ ] Example workflow included

**Test Plan** (TDD):
```
Given living-docs command with LSP instructions
When generating API documentation
Then documentSymbol extracts all exported functions/classes
And API docs include accurate type signatures
And dead exports (0 references) are flagged
```

---

### T-021: Add findReferences for Dead Code Detection
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04, AC-US4-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-020

**Implementation**:
- Add findReferences usage to living-docs command
- Document dead code detection pattern (0 references)
- Complete example: documentSymbol + findReferences workflow
- Final validation

**Acceptance**:
- [ ] findReferences for dead code documented
- [ ] Complete API extraction workflow shown
- [ ] All LSP additions validated
- [ ] --no-lsp fallback still documented

**Test Plan** (TDD):
```
Given living-docs with findReferences dead code detection
When analyzing API surface
Then functions with 0 findReferences results are marked as unused
And recommendation to remove dead code provided
And living docs accurately reflect used vs unused APIs
```

---

### T-022: Update Backend Skills with LSP
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05
**Priority**: P2
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-011

**Implementation**:
- Identify backend-focused skills (API development, REST, GraphQL)
- Add LSP sections to relevant SKILL.md files
- Document documentSymbol for API endpoint extraction
- Add findReferences for dependency analysis
- Include examples for Express, FastAPI, NestJS, Spring Boot

**Acceptance**:
- [ ] At least 3 backend skills updated with LSP
- [ ] documentSymbol and findReferences usage documented
- [ ] Framework-specific examples included
- [ ] All updates validated

**Test Plan** (TDD):
```
Given backend skills with LSP integration
When analyzing REST API
Then documentSymbol extracts all route handlers
And findReferences identifies all endpoint usages
And framework-specific patterns work (Express, FastAPI, etc.)
```

---

## Phase 4: Validation & Testing

### T-023: Create LSP Integration Test Suite
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Create `tests/integration/lsp/lsp-operations.test.ts`
- Setup test fixtures (sample TypeScript files)
- Add test infrastructure (language server mock or real)
- Prepare for 5 LSP operation tests

**Acceptance**:
- [ ] Test file created with structure
- [ ] Test fixtures created
- [ ] Can run with `npm run test:integration`
- [ ] Ready for individual operation tests

**Test Plan** (self-test):
```
Given LSP integration test suite setup
When running npm run test:integration
Then test file discovered and executed
And fixtures loaded correctly
And ready for LSP operation tests
```

---

### T-024: Test documentSymbol Operation
**User Story**: US-008
**Satisfies ACs**: AC-US8-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-023

**Implementation**:
- Add documentSymbol test case
- Create fixture: TypeScript file with exports
- Verify documentSymbol extracts all symbols correctly
- Test: functions, classes, interfaces, types

**Acceptance**:
- [ ] documentSymbol test passing
- [ ] Extracts all exported symbols
- [ ] Symbol types correctly identified
- [ ] Test coverage >80%

**Test Plan**:
```
Given sample TypeScript file with 3 exports (function, class, interface)
When running documentSymbol via typescript-language-server
Then all 3 symbols extracted correctly
And symbol kinds match (Function, Class, Interface)
And positions accurate (file:line:character)
```

---

### T-025: Test findReferences, goToDefinition, hover
**User Story**: US-008
**Satisfies ACs**: AC-US8-03, AC-US8-04, AC-US8-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-024

**Implementation**:
- Add findReferences test: verify all usages found
- Add goToDefinition test: verify navigation works
- Add hover test: verify type info extracted
- All tests use real typescript-language-server

**Acceptance**:
- [ ] findReferences test passing
- [ ] goToDefinition test passing
- [ ] hover test passing
- [ ] All tests cover edge cases

**Test Plan**:
```
Given sample function with 3 call sites
When running findReferences
Then all 3 usages found with correct locations

Given function call
When running goToDefinition
Then navigates to function definition

Given function name
When running hover
Then extracts type signature correctly
```

---

### T-026: Test getDiagnostics and Error Cases
**User Story**: US-008
**Satisfies ACs**: AC-US8-06, AC-US8-07
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-025

**Implementation**:
- Add getDiagnostics test: verify errors detected
- Test error file: TypeScript type errors
- Test warning file: unused variables
- Add error handling tests (language server not running, etc.)

**Acceptance**:
- [ ] getDiagnostics test passing
- [ ] Type errors detected correctly
- [ ] Warnings detected correctly
- [ ] Error cases handled gracefully

**Test Plan**:
```
Given TypeScript file with type error
When running getDiagnostics
Then error detected with correct message and location

Given language server not running
When attempting LSP operation
Then graceful failure with helpful error message
And fallback behavior documented
```

---

### T-027: Manual Testing & Validation
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020, T-021, T-022

**Implementation**:
- Test frontend-architect in real React project
- Test database-optimizer in real backend project
- Test Explore agent in unfamiliar codebase
- Test living-docs API extraction
- Verify all LSP operations work in Claude Code

**Acceptance**:
- [ ] Frontend-architect uses documentSymbol on real component
- [ ] Database-optimizer uses findReferences on real ORM
- [ ] Explore agent prefers goToDefinition over grep
- [ ] Living-docs extracts accurate API surface
- [ ] All fallbacks work when LSP unavailable

**Manual Test Checklist**:
```
[ ] Open Claude Code in React project
[ ] Ask frontend-architect to analyze component
[ ] Verify documentSymbol used (check logs/output)
[ ] Ask to refactor props
[ ] Verify findReferences used before changes
[ ] Repeat for database-optimizer, Explore, living-docs
[ ] Test fallback: disable language server, verify grep used
```

---

### T-028: Update ADR-0222 Implementation Checklist
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-027

**Implementation**:
- Open `.specweave/docs/internal/architecture/adr/0222-smart-lsp-integration.md`
- Check off implementation checklist items:
  - [ ] Add LSP calls to living-docs API extraction
  - [ ] Add LSP calls to specweave init brownfield analysis
  - [ ] Use findReferences in refactoring operations
  - [ ] Use getDiagnostics in code quality checks
  - [ ] Update Explore agent to prefer LSP navigation
- Add completion notes

**Acceptance**:
- [ ] All 5 checklist items marked complete
- [ ] Completion date added
- [ ] Implementation notes added

**Test Plan**:
```
Given ADR-0222 implementation checklist
When reviewing completed work
Then all checklist items are implemented
And ADR marked as fully implemented
And future maintainers know LSP is active
```

---

## Testing Summary

**Total Tests**: 6 automated + 5 manual = 11 tests

**Integration Tests** (TDD - written first):
- documentSymbol extraction (T-024)
- findReferences usage finding (T-025)
- goToDefinition navigation (T-025)
- hover type extraction (T-025)
- getDiagnostics error detection (T-026)
- Error handling (T-026)

**Manual Testing** (T-027):
- Frontend-architect in React project
- Database-optimizer in backend project
- Explore agent in unfamiliar codebase
- Living-docs API extraction
- Fallback behavior verification

**Coverage Target**: 80% minimum (config)
**Test Mode**: TDD (tests written BEFORE implementation)

---

## Success Criteria

From spec.md:
- [ ] All 8 user stories implemented (28 tasks)
- [ ] Integration tests passing (>80% coverage)
- [ ] Manual testing complete (all 5 agents validated)
- [ ] ADR-0222 checklist items checked
- [ ] No regressions in existing agent behavior
- [ ] At least 5 agents/skills actively using LSP

---

**Next Step**: Begin Phase 1 implementation in TDD mode (write tests first)

Run: `/sw:do 0162`
