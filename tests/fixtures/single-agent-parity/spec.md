# Spec: Single-Agent Parity Fixture

**Increment**: fixture-single-agent-parity
**Purpose**: Represents the expected output of single-agent planning for parity with the 3-agent fan-out path.

## Summary

Demonstrates that a single agent, running Step 4 of the increment skill without the `--parallel` flag, produces the same top-level document structure as the 3-agent (PM + Architect + Planner) fan-out.

## User Stories

### US-001: Single-agent produces spec.md with acceptance criteria

**Project**: specweave

**As a** developer running a small increment
**I want** one agent to write the full spec
**So that** I do not pay the overhead of a 3-agent team for simple work

**Acceptance Criteria**:
- [ ] **AC-US1-01**: spec.md contains an `## Acceptance Criteria` section
- [ ] **AC-US1-02**: Every AC uses the `AC-US<N>-<NN>` ID format

### US-002: Single-agent output is indistinguishable from fan-out at the structural level

**Project**: specweave

**As a** downstream tool (sync, judge, closure)
**I want** single-agent and 3-agent output to have matching top-level sections
**So that** I do not need branching logic to consume either

**Acceptance Criteria**:
- [ ] **AC-US2-01**: plan.md has `## Design` and `## Rationale` headings
- [ ] **AC-US2-02**: tasks.md has at least one `### T-NN` entry
- [ ] **AC-US2-03**: rubric.md has a `## Quality Contract` heading

## Acceptance Criteria

All acceptance criteria above (AC-US1-01, AC-US1-02, AC-US2-01, AC-US2-02, AC-US2-03) must be satisfied for the parity contract.
