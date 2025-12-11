# Increment Split Information

**Original Increment**: 0140-remove-frontmatter-project-field
**Split Date**: 2025-12-10
**Reason**: 44 tasks exceeded recommended limit (25 tasks soft limit per increment)

---

## Split Strategy

This increment was split into **2 manageable parts**:

### Part 1: Core Implementation (0141)
**Increment**: [0141-frontmatter-removal-part1-implementation](../0141-frontmatter-removal-part1-implementation/)
**Tasks**: T-011 to T-024 (14 tasks)
**Status**: Planned
**Focus**: Complete code changes, template updates, validation hooks

**Phases**:
- Phase 3: Remove Frontmatter References (T-011 to T-017)
- Phase 4: Update Templates (T-018 to T-021)
- Phase 5: Update Validation Hooks (T-022 to T-024)

**Prerequisites Completed** (from 0140):
- ✅ Phase 1: ProjectResolutionService (T-001 to T-006)
- ✅ Phase 2: Living Docs Sync Integration (T-007 to T-010)

---

### Part 2: Migration & Rollout (0142)
**Increment**: [0142-frontmatter-removal-part2-migration](../0142-frontmatter-removal-part2-migration/)
**Tasks**: T-025 to T-044 (20 tasks)
**Status**: Backlog (waiting for 0141 to complete)
**Focus**: Migration script, testing, documentation, production rollout

**Phases**:
- Phase 6: Migration Script (T-025 to T-028)
- Phase 7: Documentation (T-029 to T-033)
- Phase 8: Testing & Validation (T-034 to T-040)
- Phase 9: Rollout & Cleanup (T-041 to T-044)

---

## Execution Order

1. ✅ **0140 Phases 1-2** (COMPLETED): T-001 to T-010
   - ProjectResolutionService created and tested
   - LivingDocsSync integrated with resolution service

2. 🔄 **0141 Part 1** (NEXT): T-011 to T-024
   - Remove all frontmatter references
   - Update all templates
   - Update validation hooks

3. ⏳ **0142 Part 2** (AFTER 0141): T-025 to T-044
   - Create migration script
   - Update comprehensive documentation
   - Full test suite validation
   - Production migration and monitoring

---

## Why This Split?

**Problem**: 44 tasks in single increment = context explosion = crash risk
**Solution**: Strategic 2-increment split maintaining logical phase boundaries

**Benefits**:
- ✅ Each increment has manageable task count (14 and 20)
- ✅ Clear separation: implementation vs. migration/testing
- ✅ Can validate Part 1 before executing Part 2
- ✅ Lower risk of session crashes
- ✅ Easier to track progress

**Preserved Context**:
- All tasks maintain original numbering (T-011, T-012, etc.)
- Phase structure preserved
- Dependencies clearly documented
- Parent increment tracked in metadata

---

## Original Status (Before Split)

**Total Tasks**: 44
**Completed**: T-001 to T-010 (10 tasks - 23%)
**Remaining**: T-011 to T-044 (34 tasks - 77%)

**Phases**:
1. ✅ ProjectResolutionService Implementation (T-001 to T-006)
2. ✅ Update Living Docs Sync (T-007 to T-011)
3. 🔄 Remove Frontmatter References (T-012 to T-017)
4. ⏳ Update Templates (T-018 to T-021)
5. ⏳ Update Validation Hooks (T-022 to T-024)
6. ⏳ Migration Script (T-025 to T-028)
7. ⏳ Documentation (T-029 to T-033)
8. ⏳ Testing & Validation (T-034 to T-040)
9. ⏳ Rollout & Cleanup (T-041 to T-044)

---

## Next Steps

1. Execute **0141** to complete core implementation
2. After 0141 completes and all tests pass:
   - Update 0141 status to "completed"
   - Move 0142 from "backlog" to "planned"
   - Execute **0142** for migration and rollout

3. After both complete:
   - Mark original 0140 as "completed" (via split)
   - Archive all three increments together
   - Document lessons learned

---

## References

- Original increment: [0140-remove-frontmatter-project-field](../0140-remove-frontmatter-project-field/)
- Part 1: [0141-frontmatter-removal-part1-implementation](../0141-frontmatter-removal-part1-implementation/)
- Part 2: [0142-frontmatter-removal-part2-migration](../0142-frontmatter-removal-part2-migration/)
- ADR: `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md` (created in 0142)
