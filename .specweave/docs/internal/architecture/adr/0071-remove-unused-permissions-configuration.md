# ADR-0071: Remove Unused Top-Level Permissions Configuration

**Status**: Accepted
**Date**: 2025-11-23
**Context**: Increment 0051 (Automatic GitHub Sync with Permission Gates)
**Replaces**: None
**Related**: ADR-0047 (Three-Permission Architecture)

## Context

### The Duplication Problem

During increment 0051 (Automatic GitHub Sync), we discovered duplicate permission configuration in `src/core/config/types.ts`:

**Active permissions** (used everywhere):
```typescript
// src/core/config/types.ts:125-136
export interface SyncSettings {
  canUpsertInternalItems: boolean;   // GATE 1 - Living docs sync
  canUpdateExternalItems: boolean;   // GATE 2 - External tracker sync
  canUpdateStatus: boolean;          // GATE 3 - Status sync (ADR-0047)
  autoSyncOnCompletion?: boolean;    // GATE 4 - Auto-sync (0051, new)
}
```

**Dead code permissions** (never used):
```typescript
// src/core/config/types.ts:200-204 (REMOVED)
export interface PermissionsConfiguration {
  canCreate: boolean;
  canUpdate: boolean;
  canUpdateStatus: boolean;  // ← DUPLICATE!
}
```

### Usage Analysis

Comprehensive grep analysis confirmed **ZERO usage**:

```bash
# Top-level permissions - ZERO matches
$ grep -r "config\.permissions\." src/
(no results)

$ grep -r "PermissionsConfiguration" src/
src/core/config/types.ts:200:export interface PermissionsConfiguration {
src/core/config/types.ts:302:  permissions?: PermissionsConfiguration;
# Only defined, never imported or used

# Active sync.settings - 9+ files, 21+ usages
$ grep -r "sync\.settings\.canUpdateStatus" src/
src/sync/sync-coordinator.ts:389
src/sync/format-preservation-sync.ts:116
src/sync/format-preservation-sync.ts:159
(... 18 more matches)
```

### Historical Context

**Timeline:**
- **v0.22.x**: Used top-level `permissions` configuration
- **v0.23.0** (ADR-0047): Introduced three-permission architecture under `sync.settings`
- **v0.23.0+**: Migration script converted old permissions to new format
- **v0.23.0-v0.24.11**: Both schemas existed (forgot to remove old one)
- **v0.24.12** (this ADR): Removed unused top-level `permissions`

The top-level `permissions` was **legacy cruft** that should have been removed when ADR-0047 was implemented.

### Why This Matters for Increment 0051

Increment 0051 adds `autoSyncOnCompletion` to `sync.settings`, creating a 4-gate permission model. Having two permission schemas caused confusion:

1. **Which one controls sync?** (Answer: `sync.settings`)
2. **Do both need to be set?** (Answer: No, only `sync.settings`)
3. **What is `permissions` for?** (Answer: Nothing, dead code)

## Decision

**REMOVE** the unused top-level permissions configuration:

1. Delete `PermissionsConfiguration` interface
2. Remove `permissions` field from `SpecWeaveConfig`
3. Remove `permissions` from `DEFAULT_CONFIG`

**Rationale:**
- Zero usage = zero impact on users
- Reduces code complexity
- Eliminates confusion during increment 0051 work
- Prevents future developers from using the wrong permission model

## Alternatives Considered

### Alternative 1: Deprecate Gradually ❌

**Approach:**
- Mark `PermissionsConfiguration` as `@deprecated` in v0.24.12
- Add migration warning when detected
- Remove in v0.25.0

**Rejected because:**
- Zero usage means no users to migrate
- Adds complexity for no benefit
- Config validator already ignores unknown fields

### Alternative 2: Document and Keep ❌

**Approach:**
- Add JSDoc explaining difference between `sync.settings` and `permissions`
- Keep both schemas, mark one as preferred

**Rejected because:**
- Keeping dead code increases maintenance burden
- Documentation can't prevent confusion (two permission systems)
- No valid use case for top-level `permissions`

### Alternative 3: Immediate Removal ✅ CHOSEN

**Approach:**
- Remove immediately in v0.24.12
- Document in ADR and CHANGELOG
- No migration needed (zero usage)

**Chosen because:**
- Zero usage = zero migration burden
- Clean codebase = easier maintenance
- Eliminates confusion immediately
- Aligns with SpecWeave principle: "NEVER keep dead code"

## Implementation

### Files Modified

**src/core/config/types.ts**:
- Lines 197-206: Removed `PermissionsConfiguration` interface (9 lines)
- Line 302: Removed `permissions?: PermissionsConfiguration;` field (4 lines)
- Lines 320-324: Removed `permissions` from `DEFAULT_CONFIG` (5 lines)
- **Total**: 18 lines removed

**CHANGELOG.md**:
- Added entry under "Unreleased" → "Removed" section
- Documented as legacy cleanup with reference to this ADR

### Verification

**Zero usage confirmed**:
```bash
# Before removal
$ grep -r "permissions\.canUpdateStatus" src/
(no results)

# After removal (same result)
$ grep -r "permissions\.canUpdateStatus" src/
(no results)

# Active code still works
$ grep -r "settings\.canUpdateStatus" src/
(9 files, 21+ matches)
```

**Tests:**
- All 3,215 unit tests passing
- Zero new failures after removal
- Build succeeds without errors

**No config.json files affected**:
```bash
$ grep -r '"permissions":' .specweave/ --include="config.json"
(no results)
```

## Consequences

### Positive Consequences ✅

1. **Clearer permission model**
   - Only one permission system: `sync.settings.*`
   - Developers can't accidentally use wrong permissions
   - Documentation is simpler

2. **Reduced code complexity**
   - 18 lines of dead code removed
   - One less interface to maintain
   - Cleaner TypeScript types

3. **Better UX for increment 0051**
   - No confusion when adding `autoSyncOnCompletion`
   - Clear 4-gate model: all gates in `sync.settings`
   - Easier to explain to users

### Negative Consequences ❌

1. **Breaking schema change**
   - `permissions` field removed from `SpecWeaveConfig`
   - TypeScript will error if code tries to access it
   - **Mitigation**: Zero usage means zero breakage

2. **No migration path**
   - Hypothetical users with `permissions` in config.json will have it ignored
   - **Mitigation**: Config validator ignores unknown fields, no errors

3. **Potential future regret**
   - If we need general permissions later, we removed the placeholder
   - **Mitigation**: Can reintroduce if needed with proper design

### Risk Assessment

**Overall Risk**: **LOW** (0.5/10.0)

**Security**: 0.0 (no security impact)
**Technical**: 0.5 (minor breaking change, but zero usage)
**Implementation**: 0.0 (already implemented, tests pass)
**Operational**: 0.0 (no user impact)

## Validation

### Pre-Removal Checklist ✅

- ✅ Confirmed zero usage via grep (3 different searches)
- ✅ Verified no config.json files use `permissions`
- ✅ Checked migration scripts don't create `permissions`
- ✅ Verified tests pass after removal (3,215 passing)
- ✅ Confirmed build succeeds without errors

### Post-Removal Checklist ✅

- ✅ Created this ADR documenting decision
- ✅ Updated CHANGELOG.md with removal notice
- ✅ Verified TypeScript compilation succeeds
- ✅ Confirmed no new test failures
- ✅ Added to increment 0051 tasks.md (source of truth)

## References

**Related ADRs**:
- [ADR-0047: Three-Permission Architecture](0065-three-tier-permission-gates.md) - Introduced `sync.settings.*` model
- [ADR-0065: Three-Tier Permission Gates](./0065-three-tier-permission-gates.md) - 4-gate model for increment 0051

**Related Increments**:
- Increment 0051: Automatic GitHub Sync with Permission Gates

**Migration Scripts** (for historical context):
- `scripts/migrate-sync-permissions.ts` - Migrated old `permissions` to `sync.settings` (v0.23.0)

**Code Locations**:
- `src/core/config/types.ts:125-136` - Active `SyncSettings` interface
- `src/sync/sync-coordinator.ts:389` - Usage of `sync.settings.canUpdateStatus`

## Approval

**Decision Maker**: Technical Lead (autonomous decision based on zero-usage evidence)
**Reviewed By**: User confirmation ("it's duplicate, make sure all properly updated")
**Date**: 2025-11-23

---

**Status**: ✅ Implemented (v0.24.12)
**Rollback Plan**: Revert commit, add `@deprecated` annotation if any issues found
