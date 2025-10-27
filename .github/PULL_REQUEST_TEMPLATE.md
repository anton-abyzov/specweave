# Pull Request

## Overview

<!--
Provide a brief summary of the changes in this PR.
What feature/fix does this implement?
-->

**Type**: <!-- Feature | Bug Fix | Enhancement | Documentation | Infrastructure -->

**Related Issue**: <!-- #123 or N/A -->

**Feature**: <!-- .specweave/increments/00001-feature-name or N/A -->

---

## Changes

<!--
Describe the changes made in this PR:
- What was added?
- What was modified?
- What was removed?
-->

### Files Changed

<!--
List key files and their purpose:
- `src/foo/bar.ts`: Added authentication logic
- `tests/e2e/login.spec.ts`: Added E2E tests for login
-->

---

## Specification Alignment

<!-- ✅ This PR implements requirements from: docs/internal/strategy/xxx/yyy.md -->

**Spec Reference**: <!-- Link to spec file or "N/A" -->

**Acceptance Criteria Coverage**:
<!--
List acceptance criteria from spec and mark as complete:
- [x] TC-0001: User can log in with email/password
- [x] TC-0002: Invalid password shows error message
- [ ] TC-0003: Forgot password link displayed
-->

---

## Test Coverage

### Test Case Traceability (TC-0001)

<!--
Ensure all test cases are covered:
- TC-0001: tests/e2e/login.spec.ts (line 15)
- TC-0002: tests/e2e/login.spec.ts (line 42)
-->

### Test Results

<!--
Paste test run results:
-->

```
npm test

# Results here
```

### Coverage Metrics

<!--
Provide coverage metrics if applicable:
- Overall: XX%
- Changed files: XX%
- E2E coverage: X/X scenarios
-->

---

## Brownfield Impact

<!-- If this PR modifies existing code: -->

**Modifies Existing Code**: <!-- Yes | No -->

**If Yes**:
- [ ] Documentation exists for current behavior
- [ ] Tests exist for current behavior
- [ ] Regression tests pass
- [ ] Impact analysis completed

**Documentation References**:
<!--
Link to existing documentation:
- Spec: docs/internal/strategy/xxx/existing-behavior.md
- Architecture: .specweave/docs/architecture/xxx.md
- Tests: tests/e2e/xxx.spec.ts
-->

---

## Skills Validation (if applicable)

<!-- If this PR adds/modifies skills in src/skills/: -->

**Skills Modified**: <!-- List skill names or "N/A" -->

**Skill Tests**:
- [ ] Minimum 3 test cases exist in `test-cases/`
- [ ] YAML format validated
- [ ] Test cases cover: basic, edge cases, integration

---

## Checklist

### Pre-submission

- [ ] Code follows project conventions (see CLAUDE.md)
- [ ] Spec exists and is aligned with implementation
- [ ] Tests written and passing (TC-0001 referenced)
- [ ] Documentation updated (if applicable)
- [ ] No merge conflicts
- [ ] Self-reviewed code

### Specification

- [ ] Spec exists in `docs/internal/strategy/` or `.specweave/increments/####/spec.md`
- [ ] Implementation aligns with spec
- [ ] No scope creep (changes outside spec)

### Testing

- [ ] Unit tests written
- [ ] Integration tests written (if applicable)
- [ ] E2E tests written (if UI changes)
- [ ] All tests passing
- [ ] Test coverage >80% for changed files
- [ ] TC-0001 IDs referenced in test names

### Documentation

- [ ] CLAUDE.md updated (if structure changed)
- [ ] API docs updated (if API changed)
- [ ] Changelog entry added (will be auto-updated on merge)
- [ ] ADR created (if architecture decision made)

### Security & Performance

- [ ] No secrets committed
- [ ] No obvious performance regressions
- [ ] Security implications reviewed
- [ ] Dependency vulnerabilities checked

---

## SpecWeave Validation

<!--
After opening this PR, SpecWeave GitHub Actions will:
- ✅ Validate spec existence and alignment
- ✅ Check test coverage and TC-0001 traceability
- ✅ Verify brownfield protection (docs/tests exist)
- ✅ Validate skills have ≥3 test cases
- ✅ Check security vulnerabilities (enterprise tier)
- ✅ Detect performance regressions (enterprise tier)

You'll receive automated comments with validation results.
-->

**GitHub Actions Status**: <!-- Will be populated by workflow -->

---

## Screenshots / Demos

<!--
Add screenshots, GIFs, or videos if applicable:
-->

---

## Additional Notes

<!--
Any other information reviewers should know:
- Breaking changes?
- Migration steps?
- Rollback plan?
- Feature flags?
-->

---

## Reviewer Notes

<!--
Tag specific reviewers or request reviews:
-->

**Reviewers**: <!-- @username1 @username2 -->

**Review Focus**:
<!--
What should reviewers focus on?
- Architecture decisions
- Security implications
- Performance impact
- User experience
-->

---

**Generated with SpecWeave** | [Setup Guide](.specweave/docs/guides/github-action-setup.md)
