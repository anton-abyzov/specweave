# Rubric: Single-Agent Parity Fixture

## Quality Contract

Single-agent planning output must satisfy the following structural checks to be considered at parity with the 3-agent fan-out path.

### Hard Gates

- `spec.md` contains a level-2 heading `## Acceptance Criteria`
- `spec.md` contains at least one AC ID matching the pattern `AC-US\d+-\d+`
- `plan.md` contains level-2 headings `## Design` AND `## Rationale`
- `tasks.md` contains at least one task entry matching the pattern `### T-\d+`
- `rubric.md` contains a level-2 heading `## Quality Contract`

### Soft Gates

- Every acceptance criterion in spec.md is linked to at least one task by AC ID
- plan.md references at least one ADR when architecture is non-trivial
- tasks.md tasks include Given/When/Then test plans

### Evidence

Parity is verified by `tests/integration/increment-single-agent-parity.test.ts`, which checks the hard gates above against this fixture. The fixture represents the minimum viable single-agent output that satisfies the structural contract.
