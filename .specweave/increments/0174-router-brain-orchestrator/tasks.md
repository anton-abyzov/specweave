# Tasks - Router Brain Orchestrator

## Phase 1: Enhance LLM Detector

### T-001: Add routing types to LLM detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed

Add TypeScript interfaces for skill routing:
- `SkillRouting` interface with skills array
- `SkillInfo` interface with name, plugin, priority, invokeWhen
- `WorkflowInfo` interface with phases and suggestPlanMode

**Test**: Given LLM response with routing → When parsed → Then routing object contains skills array with correct types

---

### T-002: Update LLM system prompt with routing rules
**User Story**: US-001, US-002, US-003
**Satisfies ACs**: AC-US1-01, AC-US2-01, AC-US3-01
**Status**: [x] completed

Extend `buildDetectionPrompt()` to include:
- Skill routing matrix (domain → skill mapping)
- Invoke timing rules
- Multi-skill coordination rules
- TDD mode integration

**Test**: Given prompt "create React dashboard with TDD" → When LLM analyzes → Then returns sw-testing as primary, sw-frontend as secondary

---

### T-003: Parse routing from LLM response
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Update `detectPluginsViaLLM()` to:
- Extract `routing` field from JSON response
- Validate skill names against known plugins
- Handle missing/invalid routing gracefully

**Test**: Given valid routing JSON → When parsed → Then LLMDetectionResult.routing is populated

---

## Phase 2: Update Hook

### T-004: Extract routing in user-prompt-submit hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

Update `user-prompt-submit.sh` to:
- Parse routing.skills from detect-intent JSON
- Extract primary and secondary skills
- Get invokeWhen timing for each skill

**Test**: Given detect-intent returns routing → When hook parses → Then ROUTING_SKILLS variable contains skill info

---

### T-005: Build brain message with workflow steps
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-01, AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed

Build comprehensive BRAIN_MSG that includes:
- Analysis summary table (plugins, increment, TDD, skills)
- Ordered workflow steps based on invokeWhen
- Skill invocation instructions
- TDD guidance when enabled

**Test**: Given multi-skill routing with TDD → When brain message built → Then message shows ordered workflow with TDD first

---

### T-006: Handle multi-skill coordination
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

Implement skill ordering logic:
- TDD mode → testing skill becomes primary
- `with_primary` skills shown together
- `after_primary` skills shown in sequence
- Clear instructions for each skill

**Test**: Given TDD enabled + frontend task → When routing determined → Then sw-testing is primary, sw-frontend is with_primary

---

## Phase 3: Testing

### T-007: Integration test for skill routing
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All
**Status**: [x] completed

Create integration test that:
1. Sends prompt "create React dashboard with Stripe checkout using TDD"
2. Verifies sw-frontend, sw-testing, sw-payments detected
3. Verifies TDD makes sw-testing primary
4. Verifies brain message has correct workflow order

**Test**: Full end-to-end test of router brain functionality
