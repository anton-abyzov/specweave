---
increment: 0018-strict-increment-discipline-enforcement
title: "Strict Increment Discipline Enforcement"
priority: P1
status: abandoned
created: 2025-11-10
target_version: "0.13.0"

structure: user-stories
estimated_weeks: 2
estimated_cost: "$0 (framework improvement)"

dependencies: []

tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  runtime: "nodejs"
  cli_framework: "commander"
  testing: "jest, playwright"
---

# Increment 0018: Strict Increment Discipline Enforcement

**Complete Specification**: See living docs for full requirements (created after PM agent completion)

---

## Quick Overview

Implement mandatory pre-flight checks to prevent multiple active increments and enforce the iron rule: **Cannot start increment N+1 until increment N is DONE**.

**Core Value**: Prevent framework integrity violations by enforcing discipline at the CLI level, not just documentation level.

---

## Real-World Problem (What We Just Hit)

On 2025-11-10, we discovered critical enforcement failures:

1. **Increment 0016 created while 0015 was active** (should have been BLOCKED!)
2. **Increment 0015 marked completed but GitHub issue #29 never closed**
3. **Increment 0016 showed status:"active" but hidden from `npx specweave status`**
4. **No enforcement warnings or errors** despite violating the "2 active max" rule

This revealed that PM agent instructions exist but **checks weren't actually executed**.

---

## Key Features (Summary)

### 1. CLI Discipline Check Command (US-018-001)
**Priority**: P1 (Critical)

Create `npx specweave check-discipline` command that:
- Scans all increments in `.specweave/increments/`
- Counts active increments (not completed/paused/abandoned)
- Returns exit code 1 if violations (> maxActiveIncrements from config)
- Shows clear error messages with actionable suggestions
- Supports JSON output for automation (`--json` flag)

### 2. PM Agent Pre-Flight Integration (US-018-002)
**Priority**: P1 (Critical)

Update PM agent to **actually execute** validation:
- Add mandatory Step 0: Run `npx specweave check-discipline` via Bash tool
- Exit immediately if check fails (exit code != 0)
- Show errors to user with suggested fixes
- No bypass except `--force` flag (with logging)

### 3. GitHub Sync Verification (US-018-003)
**Priority**: P1 (Critical)

Create post-increment-completion hook that:
- Reads metadata.json for github.issue number
- Verifies issue state via `gh issue view`
- Auto-closes issue if still open with completion summary
- Logs all sync actions to `.specweave/logs/github-sync.log`
- Non-blocking (increment can complete even if GitHub unavailable)

### 4. Status Command Improvements (US-018-004)
**Priority**: P2 (Important)

Fix `npx specweave status` to:
- Query ALL metadata.json files (no filtering/hiding)
- Show all active increments consistently
- Match metadata reality (no discrepancies)
- Add verbose logging for debugging

### 5. Metadata Consistency Validation (US-018-005)
**Priority**: P2 (Important)

Create metadata validator that:
- Detects inconsistencies (status:"active" but tasks 100% complete)
- Auto-repairs corrupt metadata when possible
- Generates validation reports
- Suggests manual fixes for complex cases

---

## User Stories

### US-018-001: CLI Discipline Check Command (P1)

**As a** developer working on SpecWeave
**I want** a CLI command to validate increment discipline
**So that** I can verify compliance before creating new increments

**Acceptance Criteria**:
- [ ] **AC-US1-01**: `npx specweave check-discipline` returns exit code 0 if compliant (P1, testable)
- [ ] **AC-US1-02**: Returns exit code 1 if violations detected (>maxActiveIncrements) (P1, testable)
- [ ] **AC-US1-03**: Shows clear error messages listing all active increments (P1, testable)
- [ ] **AC-US1-04**: Suggests actionable fixes (/done, /pause commands) (P1, testable)
- [ ] **AC-US1-05**: Supports --json flag for automation integration (P2, testable)

### US-018-002: PM Agent Pre-Flight Validation (P1)

**As a** PM agent
**I want** to execute discipline validation before planning
**So that** I can block invalid increment creation attempts

**Acceptance Criteria**:
- [ ] **AC-US2-01**: PM agent runs `npx specweave check-discipline` via Bash tool (P1, testable)
- [ ] **AC-US2-02**: Blocks planning if exit code != 0 (P1, testable)
- [ ] **AC-US2-03**: Shows violation details to user (P1, testable)
- [ ] **AC-US2-04**: Allows --force bypass with warning logged (P2, testable)
- [ ] **AC-US2-05**: No bypass at hard cap (2 active) regardless of --force (P1, testable)

### US-018-003: GitHub Sync Verification (P1)

**As a** developer completing an increment
**I want** GitHub issues to auto-close when increment completes
**So that** external tracking stays synchronized

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Post-completion hook checks GitHub issue state (P1, testable)
- [ ] **AC-US3-02**: Auto-closes open issues with completion summary (P1, testable)
- [ ] **AC-US3-03**: Logs all sync actions to github-sync.log (P1, testable)
- [ ] **AC-US3-04**: Non-blocking if GitHub unavailable (P2, testable)

### US-018-004: Status Command Improvements (P2)

**As a** developer checking increment status
**I want** `npx specweave status` to show ALL active increments
**So that** I see accurate WIP state

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Queries ALL metadata.json files (P2, testable)
- [ ] **AC-US4-02**: Shows all active increments (no filtering/hiding) (P1, testable)
- [ ] **AC-US4-03**: Matches metadata.json reality 100% (P1, testable)

---

## Functional Requirements

### FR-001: CLI Command Implementation
- New file: `src/cli/commands/check-discipline.ts`
- Uses `IncrementStatusDetector.getAllIncomplete()`
- Uses `ConfigManager.load()` for WIP limits
- Exit codes: 0 (compliant), 1 (violations), 2 (errors)

### FR-002: PM Agent Integration
- Update `plugins/specweave/agents/pm/AGENT.md`
- Add Bash tool execution (not just TypeScript snippets)
- Clear error messaging with next steps

### FR-003: Post-Completion Hook
- New file: `plugins/specweave/hooks/post-increment-completion.sh`
- Bash script with `gh` CLI integration
- Error handling and logging

### FR-004: Metadata Validator
- New file: `src/core/increment/metadata-validator.ts`
- Detects inconsistencies
- Auto-repair capabilities
- Validation reporting

---

## Success Criteria

### Enforcement Metrics
- **Zero new violations** in SpecWeave dogfooding (after deployment)
- **100% GitHub sync accuracy** (issues closed when increments completed)
- **100% PM agent blocking** (invalid increment creations prevented)
- **100% status accuracy** (CLI shows all active increments)

### Quality Gates
- **85%+ test coverage** (unit + integration + E2E)
- **<1 second CLI execution** (for 100 increments)
- **<2 seconds hook execution** (including GitHub API calls)
- **Zero false positives** (valid increments not blocked)

---

## Out of Scope (This Increment)

### Deferred to Future Increments
- ❌ Historical violation detection and remediation
- ❌ Configurable WIP limits per project type
- ❌ Emergency override workflows with approval
- ❌ Enforcement analytics and reporting dashboards
- ❌ JIRA/ADO sync verification (only GitHub in this increment)

### Explicitly Not Included
- Changing the fundamental increment structure
- Modifying the 2-increment hard cap (stays at 2)
- Automatic increment merging or splitting

---

## Implementation Priorities

**P1 Tasks** (Must-Have for 0.13.0):
- CLI check-discipline command (T-001, T-002, T-003)
- PM agent integration (T-004, T-005)
- GitHub sync hook (T-007, T-009)
- E2E tests for critical paths (T-006, T-011)

**P2 Tasks** (Important):
- Metadata validator (T-008)
- Status command fixes (T-004 part)
- Integration tests (T-012)
- Performance tests (T-018)

**P3 Tasks** (Nice-to-Have):
- Documentation updates (T-013 through T-017)
- ADR validation (T-019)
- Final integration testing (T-020)

---

## Dependencies

**None** - This increment is self-contained and doesn't depend on other incomplete work.

---

## References

- **Living Docs**: (To be created by PM agent in `.specweave/docs/internal/projects/default/specs/`)
- **Architecture**: `.specweave/docs/internal/architecture/adr/0020-cli-discipline-validation.md`
- **Architecture**: `.specweave/docs/internal/architecture/adr/0021-pm-agent-enforcement.md`
- **Architecture**: `.specweave/docs/internal/architecture/adr/0022-github-sync-architecture.md`
- **Diagrams**: `.specweave/docs/internal/architecture/diagrams/discipline/enforcement-flow.mmd`
- **Related Increments**: 0007-smart-increment-discipline (initial implementation)

---

## External PM Tool Sync

**Repository**: anton-abyzov/specweave
**DOG-FOOD REQUIREMENT** (ADR-0007): SpecWeave repo MUST use GitHub sync to demonstrate its own features.

**Auto-Sync Configuration**:
- GitHub issue will be auto-created via post-increment-planning hook
- Progress updates posted after each task completion
- Issue auto-closed when increment marked complete

---

**Next Steps**:
1. Review this spec for completeness
2. Approve architecture plan (plan.md)
3. Start implementation: `/specweave:do`


---

## Archive Note (2025-11-15)

**Status**: Completed under early SpecWeave architecture (pre-ADR-0032 Universal Hierarchy / ADR-0016 Multi-Project Sync).

**Unchecked ACs**: Reflect historical scope and tracking discipline. Core functionality verified in subsequent increments:
- Increment 0028: Multi-repo UX improvements
- Increment 0031: External tool status sync
- Increment 0033: Duplicate prevention
- Increment 0034: GitHub AC checkboxes fix

**Recommendation**: Accept as historical tech debt. No business value in retroactive AC validation.

**Rationale**:
- Features exist in codebase and are operational
- Later increments successfully built on this foundation
- No user complaints or functionality gaps reported
- AC tracking discipline was less strict during early development

**Tracking Status**: `historical-ac-incomplete`

**Verified**: 2025-11-15

