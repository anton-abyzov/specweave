# Tasks: Remove Redundant feature_id/featureId

## Task Summary
| Task | User Story | Status |
|------|-----------|--------|
| T-001 | US-001 | [x] completed |
| T-002 | US-002 | [x] completed |
| T-003 | US-003 | [x] completed |
| T-004 | US-003 | [x] completed |
| T-005 | US-004 | [x] completed |
| T-006 | US-004 | [x] completed |

---

### T-001: Update Type Definitions
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**:
1. Remove `featureId?: string` from `IncrementMetadataV2` interface
2. Create `deriveFeatureId(incrementId: string): string` utility function
3. Export from a central location (e.g., `src/utils/feature-id-derivation.ts`)

**Files to modify**:
- `src/core/types/increment-metadata.ts`
- Create: `src/utils/feature-id-derivation.ts`

---

### T-002: Update Living Docs Sync
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**:
1. Modify `getFeatureIdForIncrement()` to use `deriveFeatureId()` directly
2. Remove the metadata reading logic for feature_id
3. Remove `updateMetadataFeatureId()` function entirely
4. Verify external sync still passes feature ID correctly

**Files to modify**:
- `src/core/living-docs/living-docs-sync.ts`

---

### T-003: Create and Run Migration Script
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**:
1. Create script to process all metadata.json files
2. Remove fields: `feature_id`, `featureId`, `relatedIncrements`
3. Process both `.specweave/increments/` and `.specweave/increments/_archive/`
4. Preserve all other fields

**Files to create**:
- `scripts/migrate-remove-feature-id.ts`

---

### T-004: Run Migration on All Increments
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed

**Description**:
1. Run migration script
2. Verify no data loss
3. Git commit the changes

**Dependencies**: T-003

---

### T-005: Create ADR for Feature ID Derivation
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

**Description**:
1. Create ADR explaining the decision to derive feature ID
2. Document the 1:1 increment-to-feature mapping principle
3. Update CLAUDE.md if it references feature_id

**Files to create/modify**:
- `.specweave/docs/internal/architecture/adr/XXXX-derive-feature-id-from-increment.md`
- `CLAUDE.md` (if needed)

---

### T-006: Update Public Documentation
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Status**: [x] completed

**Description**:
1. Update spec-weave.com docs if they mention metadata schema
2. Update README.md if it mentions feature_id
3. Update any living docs templates

**Files to check/modify**:
- `README.md`
- `docs/` folder
- `.specweave/docs/` templates
