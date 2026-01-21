# PM Phase 1: Research & Validation

## Pre-Flight Checks

Before planning ANY increment, validate:

### 1. Increment Discipline Check

```bash
# Check for incomplete increments
ls .specweave/increments/ | grep -v "_archive\|_abandoned\|_paused"
```

**Rule**: You CANNOT plan increment N+1 until increment N is DONE.

### 2. Scan Existing Documentation

```bash
# Check living docs for related context
grep -ril "keyword" .specweave/docs/internal/

# Check existing ADRs
ls .specweave/docs/internal/architecture/adr/

# Read relevant specs
cat .specweave/docs/internal/specs/{module}/
```

### 3. Identify Project Structure

- Single repo vs multi-repo?
- Existing modules/services?
- Tech stack?
- External dependencies?

## Research Workflow

1. **Understand the request**
   - What does user want to build?
   - Who is the target user?
   - What problem does it solve?

2. **Check for existing context**
   - Living docs with related features?
   - ADRs with architectural decisions?
   - Previous increments in same area?

3. **Estimate scope**
   - Number of user stories (3-6 typical)
   - Number of acceptance criteria
   - Dependencies on other work

4. **Ask clarifying questions**
   - Edge cases?
   - Performance requirements?
   - Security considerations?

## Output Format

```markdown
## Research Summary

**Feature**: [Name]
**Scope**: [Small/Medium/Large]
**Estimated User Stories**: [N]
**Estimated Acceptance Criteria**: [N]

**Context Found**:
- [List relevant living docs, ADRs, previous increments]

**Clarifying Questions**:
1. [Question 1]
2. [Question 2]

Ready to create spec.md?
```

## Token Budget: 300-500 tokens

Keep research phase concise. Ask questions, don't assume.
