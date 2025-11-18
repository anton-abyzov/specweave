---
increment: 0039-ultra-smart-next-command
title: "Ultra-Smart Next Command - Intelligent Workflow Orchestrator"
priority: P1
status: in-progress
created: 2025-11-16
started: 2025-11-17
structure: user-stories
project: specweave
test_mode: TDD
coverage_target: 95
---

# Feature: Ultra-Smart Next Command - Intelligent Workflow Orchestrator

## Complete Requirements

**See Living Spec**: [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md)

This spec.md is a temporary reference for increment 0039. The permanent source of truth is the living spec at `.specweave/docs/internal/specs/_features/FS-039/FEATURE.md`.

---

## Quick Summary

Enhance the /specweave:next command to be ultra-intelligent, automatically detecting the current workflow phase and orchestrating the entire SpecWeave workflow autonomously. Users can just hit `/specweave:next` repeatedly to move through planning → execution → validation → QA → closure → next increment.

### Vision

Transform SpecWeave from a powerful but manual system into an autonomous workflow orchestrator:
- **Current**: User runs 8+ commands manually (inc → plan → do → validate → done → next)
- **Future**: User runs 1 command repeatedly (/specweave:next → auto-detects phase → auto-executes)

### Key Capabilities

1. **Auto-Detect Workflow Phase**: No increments → spec.md only → plan needed → tasks ready → validation needed → closure ready
2. **Auto-Call Commands**: /specweave:plan, /specweave:do, /specweave:validate, /specweave:qa
3. **Intelligent Suggestions**: Backlog ranking, dependency validation, priority filtering
4. **Autonomous Mode**: --autonomous flag for zero-prompt execution (ship features while you sleep!)
5. **Confidence Scoring**: 95% accuracy, transparent confidence scores, user control

### Business Value

- **40% faster workflows**: 4 minutes manual overhead → 30 seconds automated
- **Better UX**: "What's next?" is one command, not mental overhead
- **Autonomous shipping**: Power users can enable full automation
- **Onboarding**: Beginners don't need to memorize command sequences

---

## User Stories (12 Total)

### US-001: Auto-Detect Current Workflow Phase (Priority: P1)

**As a** developer working in SpecWeave
**I want** /specweave:next to automatically detect where I am in the workflow
**So that** I don't need to remember which command to run next

**Acceptance Criteria**:
- [ ] AC-US1-01: Detect if no increments exist (clean slate)
- [ ] AC-US1-02: Detect if spec.md exists but no plan.md/tasks.md (needs planning)
- [ ] AC-US1-03: Detect if plan.md/tasks.md exist with incomplete tasks (needs execution)
- [ ] AC-US1-04: Detect if all P1 tasks completed but not validated (needs validation)
- [ ] AC-US1-05: Detect if increment completed but not closed (needs closure)
- [ ] AC-US1-06: Detect if all increments closed (suggest new or backlog)
- [ ] AC-US1-07: Detect multi-project context (project-specific detection)

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-002: Auto-Call /specweave:plan When Needed (Priority: P1)

**As a** developer who just created a spec.md
**I want** /specweave:next to automatically call /specweave:plan
**So that** I don't need to manually run the plan command

**Acceptance Criteria**:
- [ ] AC-US2-01: Detect spec.md exists without plan.md
- [ ] AC-US2-02: Auto-invoke Architect Agent to create plan.md
- [ ] AC-US2-03: Auto-invoke test-aware-planner to create tasks.md with embedded tests
- [ ] AC-US2-04: Validate plan.md and tasks.md were created successfully
- [ ] AC-US2-05: Handle planning errors gracefully
- [ ] AC-US2-06: User can skip auto-planning with --skip-plan flag

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-003: Auto-Call /specweave:do When Ready (Priority: P1)

**As a** developer with a complete plan.md and tasks.md
**I want** /specweave:next to automatically call /specweave:do
**So that** I can start implementation without manual command execution

**Acceptance Criteria**:
- [ ] AC-US3-01: Detect plan.md and tasks.md exist with uncompleted tasks
- [ ] AC-US3-02: Auto-invoke /specweave:do to execute next task
- [ ] AC-US3-03: Resume from last incomplete task
- [ ] AC-US3-04: User can skip auto-execution with --dry-run flag

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-004: Auto-Suggest Validation When Appropriate (Priority: P2)

**As a** developer who completed all P1 tasks
**I want** /specweave:next to suggest running /specweave:validate
**So that** I can catch issues before attempting closure

**Acceptance Criteria**:
- [ ] AC-US4-01: Detect all P1 tasks completed but not validated
- [ ] AC-US4-02: Suggest /specweave:validate with clear rationale
- [ ] AC-US4-03: User can auto-validate with --auto-validate flag
- [ ] AC-US4-04: Skip validation if already run recently

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-005: Auto-Move to Next Active Increment (Priority: P1)

**As a** developer with multiple increments in progress
**I want** /specweave:next to move to the next active increment when current is done
**So that** I can continue work without manually selecting the next increment

**Acceptance Criteria**:
- [ ] AC-US5-01: Detect current increment is completed
- [ ] AC-US5-02: Find next active increment (oldest by lastActivity)
- [ ] AC-US5-03: Validate WIP limit before switching
- [ ] AC-US5-04: Display next increment context

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-006: Auto-Suggest /specweave:qa for Verification (Priority: P2)

**As a** developer who completed an increment
**I want** /specweave:next to suggest running /specweave:qa
**So that** I can get AI-powered quality assessment before closing

**Acceptance Criteria**:
- [ ] AC-US6-01: Detect increment is ready for QA
- [ ] AC-US6-02: Suggest /specweave:qa with quality gate explanation
- [ ] AC-US6-03: User can auto-run QA with --auto-qa flag
- [ ] AC-US6-04: Use judge LLM for quality assessment

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-007: Implement /specweave:plan Command (Priority: P1)

**As a** developer with a spec.md but no plan.md
**I want** to run /specweave:plan to generate plan.md and tasks.md
**So that** I can plan implementation without running /specweave:do

**Acceptance Criteria**:
- [ ] AC-US7-01: Command exists at /specweave:plan
- [ ] AC-US7-02: Accepts optional increment ID
- [ ] AC-US7-03: Auto-detects current increment if no ID provided
- [ ] AC-US7-04: Validates spec.md exists before planning
- [ ] AC-US7-05: Invokes Architect Agent to create plan.md
- [ ] AC-US7-06: Invokes test-aware-planner to create tasks.md
- [ ] AC-US7-07: Updates metadata.json with planning timestamp
- [ ] AC-US7-08: Handles multi-project mode

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-008: Intelligent Backlog Suggestions (Priority: P2)

**As a** developer who completed all active increments
**I want** /specweave:next to suggest backlog items intelligently
**So that** I don't waste time deciding what to work on next

**Acceptance Criteria**:
- [ ] AC-US8-01: Scan .specweave/increments/_backlog/ for planned items
- [ ] AC-US8-02: Rank backlog items by priority
- [ ] AC-US8-03: Filter by dependencies
- [ ] AC-US8-04: Display top 3 recommendations with rationale
- [ ] AC-US8-05: User can start backlog item with one command

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-009: Confidence Scoring System (Priority: P2)

**As a** developer
**I want** /specweave:next to show confidence scores for phase detection
**So that** I can trust the automation and override when confidence is low

**Acceptance Criteria**:
- [ ] AC-US9-01: Calculate confidence score (0.0 to 1.0)
- [ ] AC-US9-02: Display confidence score in output
- [ ] AC-US9-03: Prompt user when confidence < 0.7
- [ ] AC-US9-04: Auto-proceed when confidence >= 0.9
- [ ] AC-US9-05: User can override with --force flag

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-010: Autonomous Workflow Mode (Priority: P3)

**As a** power user
**I want** to run /specweave:next --autonomous to execute the entire workflow automatically
**So that** I can press one button and ship a feature with zero manual intervention

**Acceptance Criteria**:
- [ ] AC-US10-01: --autonomous flag enables full automation
- [ ] AC-US10-02: Auto-plan if spec.md exists (no prompt)
- [ ] AC-US10-03: Auto-execute all tasks (no prompt)
- [ ] AC-US10-04: Auto-validate when tasks complete (no prompt)
- [ ] AC-US10-05: Auto-run QA when validation passes (no prompt)
- [ ] AC-US10-06: Auto-close when QA passes (no prompt)
- [ ] AC-US10-07: Auto-start next backlog item (no prompt)
- [ ] AC-US10-08: Stop on critical errors
- [ ] AC-US10-09: Generate detailed log

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-011: Auto-Sync Plan and Tasks on Spec Changes (Priority: P1)

**As a** developer who needs to update spec.md after planning
**I want** plan.md and tasks.md to automatically regenerate when spec.md changes
**So that** my implementation artifacts stay synchronized with the specification

**Acceptance Criteria**:
- [x] AC-US11-01: Detect when spec.md is modified after plan.md exists
  - ✅ Implemented in `SpecSyncManager.detectSpecChange()`
  - ✅ Compares file modification timestamps (spec.md mtime > plan.md mtime)
  - ✅ Returns `SpecChangeDetectionResult` with timestamps and reason
  - ✅ 14 unit tests passing
- [ ] AC-US11-02: Automatically regenerate plan.md using Architect Agent
  - ❌ TODO: Architect Agent invocation not implemented
  - ❌ Only skeleton code with "not yet implemented" comment
- [ ] AC-US11-03: Automatically regenerate tasks.md based on updated plan.md
  - ❌ TODO: test-aware-planner invocation not implemented
  - ❌ Only skeleton code with "not yet implemented" comment
- [ ] AC-US11-04: Preserve task completion status during regeneration
  - ❌ TODO: Task status mapping logic not implemented
  - ❌ Design exists but no code
- [ ] AC-US11-05: Show clear diff of what changed in plan/tasks
  - ❌ TODO: Diff generation not implemented
- [x] AC-US11-06: User can skip auto-sync with --skip-sync flag
  - ✅ Implemented in `syncIncrement(incrementId, skipSync)` parameter
  - ✅ Returns early with "skipped by user" reason when skipSync=true
  - ✅ Unit tests passing
- [x] AC-US11-07: Hook works in Claude Code (via user-prompt-submit hook)
  - ✅ Integrated in `plugins/specweave/hooks/user-prompt-submit.sh` (+70 lines)
  - ✅ Detects active increment and checks for spec changes
  - ✅ Shows warning message before commands execute
  - ✅ Non-blocking (decision: "approve" with systemMessage)
- [x] AC-US11-08: Instructions in AGENTS.md for non-Claude tools (Cursor, etc.)
  - ✅ Created `AGENTS.md` (500 lines)
  - ✅ Bash/PowerShell detection scripts
  - ✅ Manual regeneration workflows
  - ✅ Status preservation techniques
  - ✅ VS Code/Cursor integration examples
- [x] AC-US11-09: Handle edge cases (spec.md deleted, invalid format, concurrent edits)
  - ✅ Missing spec.md: Returns specChanged=false, reason="does not exist"
  - ✅ Missing plan.md: Returns specChanged=false, reason="planning phase"
  - ✅ Concurrent edits: Uses modification time comparison
  - ✅ All edge cases covered in unit tests
- [x] AC-US11-10: Log sync events to increment metadata
  - ✅ Implemented in `logSyncEvent()` private method
  - ✅ Appends event to `metadata.json` syncEvents array
  - ✅ Keeps only last 10 events (oldest removed)
  - ✅ Logs timestamp, type, modification times, reason
  - ✅ Unit tests passing

**Rationale**:
Spec-driven development means spec.md is the source of truth. When it changes, downstream artifacts (plan.md, tasks.md) must reflect those changes to maintain consistency. This prevents the common problem where spec evolves but implementation follows an outdated plan.

**See Living Spec** for complete AC details, test plans, and implementation notes.

---

### US-012: Auto-Update AC Status from Task Completion (Priority: P1)

**As a** developer working on SpecWeave increments
**I want** spec.md AC checkboxes to automatically update when related tasks complete
**So that** AC status always reflects actual implementation progress without manual updates

**Acceptance Criteria**:
- [ ] AC-US12-01: Detect task completion via **AC**: tag in tasks.md
- [ ] AC-US12-02: Parse spec.md to find corresponding AC checkbox
- [ ] AC-US12-03: Update AC checkbox from [ ] to [x] when all related tasks complete
- [ ] AC-US12-04: Handle partial completion (some tasks done, others not)
- [ ] AC-US12-05: Integrate into post-task-completion hook
- [ ] AC-US12-06: Manual command /specweave:sync-acs to force sync
- [ ] AC-US12-07: Validate AC-task mapping (ensure all ACs have tasks)
- [ ] AC-US12-08: Show diff before updating spec.md
- [ ] AC-US12-09: Rollback capability if user rejects changes
- [ ] AC-US12-10: Log AC status changes to metadata.json

**Rationale**:
Currently, AC checkboxes in spec.md must be updated manually, which:
1. Creates sync drift between tasks.md (source of truth for completion) and spec.md (source of truth for requirements)
2. Wastes developer time on manual checkbox updates
3. Leads to stale ACs showing [ ] when implementation is actually complete
4. Breaks the automation promise of SpecWeave

By automatically syncing AC status from task completion, we ensure spec.md always reflects true progress.

**Implementation Strategy**:
1. Parse tasks.md to extract **AC**: tags and completion status
2. Build mapping: AC-ID → List of tasks → Overall completion %
3. Parse spec.md to find AC checkboxes
4. Update checkboxes based on task completion
5. Trigger on: task completion hook, /specweave:done validation, manual /specweave:sync-acs

**Edge Cases**:
- AC with no tasks → Keep [ ] (require manual verification)
- AC with partial tasks → Keep [ ] until ALL tasks complete
- Task with multiple ACs → Update all mapped ACs
- AC manually checked → Preserve manual override (log conflict)

**Dependencies**:
- Requires tasks.md to have **AC**: tags (existing pattern)
- Requires spec.md to have AC-ID pattern (existing: AC-US##-##)

---

## Functional Requirements Summary

See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#functional-requirements) for complete FR list.

**Key FRs**:
- FR-001: Phase Detection Engine (>= 95% accuracy)
- FR-002: Command Orchestration (auto-invoke plan/do/validate/qa)
- FR-003: /specweave:plan Command (new command)
- FR-004: Increment Transition Logic (respect WIP limits)
- FR-005: Backlog Intelligence (priority ranking, dependency filtering)
- FR-006: Increment Structure Validation (prevent duplicate task files, enforce single source of truth)

---

## Non-Functional Requirements Summary

See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#non-functional-requirements) for complete NFR list.

**Key NFRs**:
- NFR-001: Performance (< 500ms phase detection, < 1s orchestration)
- NFR-002: Accuracy (>= 95% phase detection accuracy)
- NFR-003: Reliability (handle partial state, agent failures)
- NFR-004: Usability (clear prompts, human-readable confidence scores)

---

## Success Criteria

See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#success-criteria) for complete metrics.

**Key Metrics**:
1. **Time-to-Completion**: 40% reduction (4 min → 30 sec overhead)
2. **User Satisfaction**: 85%+ report "easier workflow"
3. **Accuracy**: >= 95% phase detection on common workflows
4. **Adoption**: 30%+ power users enable --autonomous
5. **Error Rate**: < 5% of executions result in errors

---

## Implementation Approach

### Phase 1: Foundation (Week 1)
- Implement /specweave:plan command
- Enhance phase detection with confidence scoring
- **Add increment structure validation (prevent duplicate task files)**
- Unit tests

### Phase 2: Orchestration (Week 2)
- Auto-call logic (plan, do, validate)
- Increment transition logic
- Integration tests

### Phase 3: Intelligence (Week 3)
- Backlog scanning and ranking
- Dependency validation
- Intelligent suggestions

### Phase 4: Autonomy (Week 4)
- Autonomous mode (--autonomous flag)
- E2E tests
- Performance optimization

### Phase 5: Polish (Week 5)
- UX refinement
- Error message clarity
- Documentation

---

## Integration Points

- **Phase Detection Algorithm** (ADR-0003-009): Reuse existing PhaseDetector class
- **PM Agent Validation Gates**: Invoke 3-gate check before auto-closure
- **Increment Lifecycle State Machine**: Detect state transitions
- **Multi-Project Support** (v0.16.11+): Project-aware detection

---

## Related Documentation

- **Living Spec**: [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md)
- **ADR-0003-009**: [Phase Detection Algorithm](../../docs/internal/architecture/adr/0003-009-phase-detection-algorithm.md)
- **Increment Lifecycle Guide**: [increment-lifecycle.md](../../docs/internal/delivery/guides/increment-lifecycle.md)
- **Existing Command**: [specweave-next.md](../../../plugins/specweave/commands/specweave-next.md)

---

**This increment transforms SpecWeave into an autonomous workflow orchestrator. Users can ship features with one command!**
