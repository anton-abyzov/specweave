# Tasks: Umbrella Work Item Matching

## Task List

### T-001: Enhance Work Item Matcher for Umbrella
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P0

Modify `src/core/living-docs/workitem-matcher.ts`:
- Add `matchByAreaPath()` function for ADO area path matching
- Add `matchByTeamPrefix()` function for team-based matching
- Enhance `scoreMatch()` to include structural matching
- Increase score weight for area path matches

**Tests**:
- [ ] Test: Area path "Acme\Inventory" matches "inventory-*"
- [ ] Test: Team folder maps to repo prefix
- [ ] Test: Combined scoring improves accuracy

---

### T-002: Add ADO Area Path to Repo Mapping
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P0

Create mapping logic in `workitem-matcher.ts`:
- Parse ADO area path format (backslash separated)
- Normalize to repo naming conventions (lowercase, hyphen)
- Support mapping configuration in config.json
- Report unmatched items with suggested mappings

**Tests**:
- [ ] Test: Multiple area path formats supported
- [ ] Test: Suggestions generated for unmatched items
- [ ] Test: Custom mappings from config.json work

---

### T-003: Update Foundation Builder for Umbrella
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P1

Modify `src/core/living-docs/foundation-builder.ts`:
- Add umbrella-specific overview section
- Group modules by team in skeleton
- Show tech stack distribution across teams
- Include child repo count and structure

**Tests**:
- [ ] Test: Overview shows umbrella status
- [ ] Test: Tech stack grouped by team
- [ ] Test: Module skeleton has team sections

---

### T-004: Improve Suggestions Generator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P1

Modify `src/core/living-docs/suggestions-generator.ts`:
- List unmatched work items with module suggestions
- Flag undocumented modules as potential tech debt
- Calculate correct coverage for umbrella projects
- Group suggestions by team

**Tests**:
- [ ] Test: Unmatched items have suggestions
- [ ] Test: Coverage percentage accurate
- [ ] Test: Suggestions grouped by team

---

### T-005: Unit Tests for Work Item Matching
**User Story**: US-001, US-002
**Satisfies ACs**: All
**Status**: [x] completed
**Priority**: P1

Create/update tests:
- Test ADO area path parsing
- Test team-to-repo mapping
- Test combined scoring algorithm
- Test performance with large datasets

**Tests**:
- [ ] Test: All matching paths covered
- [ ] Test: Edge cases handled
- [ ] Test: 500 items × 200 repos < 60s

---

### T-006: Integration Test Full Pipeline
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All critical ACs
**Status**: [x] completed
**Priority**: P2

Create integration test:
1. Setup umbrella with work items from ADO import
2. Run full living docs builder pipeline
3. Verify module-workitem-map.json populated
4. Verify SUGGESTIONS.md has useful content
5. Verify foundation docs reflect umbrella

**Tests**:
- [ ] Test: Full pipeline end-to-end
- [ ] Test: All outputs generated correctly
