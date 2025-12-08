---
increment: 0124-spec-project-validator-regex-fix
status: active
estimated_tasks: 3
---

# Tasks: Fix spec-project-validator Hook Regex

## T-001: Fix matcher_content regex in hooks.json
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P1

**Description**:
Update the `matcher_content` regex in `plugins/specweave/hooks/hooks.json` to match all increment patterns including E-suffixed and 3-digit increments.

**Current Regex**:
```
\\.specweave/increments/\\d{4}-[^/]+/spec\\.md
```

**Fixed Regex**:
```
\\.specweave/increments/\\d{3,4}E?-[^/]+/spec\\.md
```

**Files to modify**:
- `plugins/specweave/hooks/hooks.json`

---

## T-002: Add unit tests for regex pattern matching
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed
**Priority**: P1
**Depends on**: T-001

**Description**:
Create test cases to verify the regex matches all expected patterns.

**Test Cases**:
```bash
# Should match (standard)
.specweave/increments/0001-feature/spec.md
.specweave/increments/0124-fix-regex/spec.md

# Should match (E-suffix)
.specweave/increments/0001E-external/spec.md
.specweave/increments/0111E-dora-fix/spec.md

# Should match (3-digit)
.specweave/increments/001-legacy/spec.md
.specweave/increments/999-max/spec.md

# Should NOT match
.specweave/increments/1-too-short/spec.md
.specweave/increments/00001-too-long/spec.md
.specweave/increments/0001-feature/plan.md (not spec.md)
```

**Files to create**:
- `tests/unit/hooks/spec-project-validator.test.ts`

---

## T-003: Verify JIRA 2-level detection logic
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P1

**Description**:
Verify that `src/utils/structure-level-detector.ts` correctly identifies JIRA configurations as 2-level when multiple boards exist.

**Current Logic** (lines 216-259):
- Checks `profile.config?.boardMapping?.boards?.length`
- Groups boards by `specweaveProject`
- Returns 2-level if `projectSet.size > 1 || boards.length > 1`

**Verification**:
- The logic IS correct - JIRA with multiple boards OR multiple projects IS detected as 2-level
- No code changes needed - just verification

**Test Cases**:
```typescript
// JIRA with 2 boards under same project = 2-level
const config = {
  sync: {
    profiles: {
      jira: {
        provider: 'jira',
        config: {
          boardMapping: {
            boards: [
              { id: '1', name: 'Frontend', specweaveProject: 'my-app' },
              { id: '2', name: 'Backend', specweaveProject: 'my-app' }
            ]
          }
        }
      }
    }
  }
};
// Result: level = 2, boardsByProject = { 'my-app': [{id: 'frontend'}, {id: 'backend'}] }
```

**Files to verify**:
- `src/utils/structure-level-detector.ts` (no changes needed, logic is correct)

---

## Summary

| Task | Priority | Status |
|------|----------|--------|
| T-001: Fix regex | P1 | Completed |
| T-002: Add tests | P1 | Completed |
| T-003: Verify JIRA | P1 | Completed |
