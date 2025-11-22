# ADR-0064: AC Embedding - Mandatory Architecture for spec.md

**Date**: 2025-11-22
**Status**: Accepted
**Priority**: CRITICAL
**Impact**: All increments, AC sync hooks, status line accuracy

---

## Context

### The Incident (2025-11-22)

Increment 0050 was created with `structure: user-stories` frontmatter, which indicated that detailed specifications lived in external living docs files (`.specweave/docs/internal/specs/specweave/FS-048/US-*.md`). The spec.md was generated as a "pointer-only" document:

```markdown
### User Stories (7 in This Increment)
- **US-001**: Smart Pagination During Init (P0) - 5 ACs
- **US-002**: CLI-First Defaults (P1) - 4 ACs
...
See individual user story files in `.specweave/docs/internal/specs/specweave/FS-048/` for complete details.
```

**The spec.md contained NO inline Acceptance Criteria.**

### The Impact

This caused a **critical failure in the AC sync system**:

1. **tasks.md** referenced 39 ACs (AC-US1-01, AC-US4-01, etc.)
2. **AC sync hook** looked for these ACs in spec.md
3. **spec.md** had 0 ACs (just references to living docs)
4. **Result**: 38 sync warnings, 0% AC completion, broken status line

**Metadata.json log** (excerpt):
```json
{
  "timestamp": "2025-11-22T06:38:00.142Z",
  "warnings": [
    "AC-US4-01 referenced in tasks.md but not found in spec.md",
    "AC-US4-02 referenced in tasks.md but not found in spec.md",
    // ... 36 more warnings
  ],
  "changesCount": 0
}
```

### Root Cause

**Architectural assumption**: The AC sync hook (`plugins/specweave/hooks/post-task-completion.sh`) was designed with the assumption that **spec.md is the source of truth for ACs**, not living docs.

**Why this assumption existed**:
- **Performance**: Reading one file (spec.md) is faster than reading N user story files
- **Simplicity**: Single source of truth reduces complexity
- **Reliability**: Atomic updates to one file are easier than coordinating multiple files

**What went wrong**:
- PM agent generated spec.md with `structure: user-stories` without embedding ACs
- No validation gate caught this before increment started
- AC sync hook silently failed with warnings (didn't block)
- Status line showed 0% completion despite 100% task completion

---

## Decision

**spec.md MUST ALWAYS contain inline Acceptance Criteria**, even when using `structure: user-stories` with external living docs.

### Architecture Principle

```
spec.md = SOURCE OF TRUTH for ACs
living docs = DOCUMENTATION LAYER (optional)
```

Living docs provide rich context, diagrams, and detailed descriptions. But for **operational purposes** (AC sync, status line, traceability), spec.md is authoritative.

### Implementation Strategy

**4-Layer Prevention System**:

1. **Utility Layer**: `src/utils/ac-embedder.ts`
   - `extractACsFromUserStory()` - Read ACs from living docs
   - `formatACsAsMarkdown()` - Format as spec.md checkboxes
   - `embedACsFromLivingDocs()` - Auto-embed into spec.md
   - `validateACsInSpec()` - Validate presence and count

2. **Validation Layer**: `src/core/validators/ac-presence-validator.ts`
   - `validateACPresence()` - Check spec.md has ACs
   - `formatValidationResult()` - Human-readable errors
   - `validateACPresenceStrict()` - Throw if validation fails

3. **Hook Layer**: `plugins/specweave/hooks/pre-increment-start.sh`
   - Runs before `/specweave:do` (pre-start gate)
   - Blocks start if spec.md has 0 ACs
   - Suggests `/specweave:embed-acs` command
   - Validates AC count matches metadata.json

4. **Command Layer**: `/specweave:embed-acs <increment-id>`
   - Manual command to fix missing ACs
   - Auto-embeds ACs from living docs
   - Updates metadata.json
   - Dry-run mode for preview

---

## Consequences

### Positive

1. ✅ **AC Sync Always Works**: Hook always finds ACs in spec.md
2. ✅ **Status Line Accuracy**: Reflects true AC completion (not 0%)
3. ✅ **Fail-Fast Validation**: Catches missing ACs before increment starts
4. ✅ **Self-Healing**: `/specweave:embed-acs` auto-fixes issues
5. ✅ **Clear Error Messages**: Tells users exactly how to fix
6. ✅ **Living Docs Still Valid**: Can still use external docs for rich context

### Negative

1. ⚠️ **Duplication**: ACs exist in both spec.md and living docs
2. ⚠️ **Maintenance**: Need to keep both in sync if ACs change
3. ⚠️ **File Size**: spec.md gets larger with embedded ACs
4. ⚠️ **Migration Effort**: Need to update existing increments

### Mitigation for Duplication

**Living docs are documentation, not source of truth**:
- Living docs provide **rich context** (diagrams, examples, technical details)
- spec.md provides **operational data** (ACs as checkboxes for sync)
- Comment in spec.md: `<!-- Auto-synced from living docs -->` indicates source
- If ACs change, regenerate with `/specweave:embed-acs --force`

---

## Alternatives Considered

### Alternative 1: Update AC Sync Hook to Read Living Docs

**Rejected**: Too complex and slow.

**Why rejected**:
- Hook would need to read N user story files (performance overhead)
- File resolution logic (which user story files exist?) adds complexity
- Error handling harder (what if living docs are partially missing?)
- Hook timeout risk (reading 10+ files on every task completion)

### Alternative 2: Deprecate `structure: user-stories` Pattern

**Rejected**: Removes valuable flexibility.

**Why rejected**:
- Living docs are valuable for large features with extensive documentation
- Pointer pattern is useful for multi-increment features
- Restricting structure reduces PM flexibility
- Better to support both patterns with clear rules

### Alternative 3: Two-Way Sync Between spec.md and Living Docs

**Rejected**: Introduces sync conflicts and race conditions.

**Why rejected**:
- What if both are edited? Which wins?
- Conflict resolution adds complexity
- Risk of data loss if sync fails
- Single source of truth is simpler and safer

---

## Implementation Plan

### Phase 1: Immediate (Done - 2025-11-22)

- [x] Create `src/utils/ac-embedder.ts` utility
- [x] Create `src/core/validators/ac-presence-validator.ts` validator
- [x] Create `plugins/specweave/hooks/pre-increment-start.sh` hook
- [x] Create `/specweave:embed-acs` command
- [x] Document in ADR-0064
- [x] Update CLAUDE.md with new rule

### Phase 2: Integration (Next)

- [ ] Update `/specweave:increment` to auto-call `embedACsFromLivingDocs()` after spec generation
- [ ] Update PM agent to always embed ACs when `structure: user-stories` is used
- [ ] Add pre-commit hook to validate AC presence in new spec.md files
- [ ] Add to `/specweave:validate` rule suite (already has AC warnings, make them errors)

### Phase 3: Migration (Backfill)

- [ ] Scan all increments for missing ACs: `grep -L "## Acceptance Criteria" .specweave/increments/*/spec.md`
- [ ] Auto-fix with: `for dir in $(find .specweave/increments -type d); do /specweave:embed-acs $(basename $dir); done`
- [ ] Validate all increments pass: `for dir in $(find .specweave/increments -type d); do /specweave:validate $(basename $dir); done`

### Phase 4: Testing

- [ ] Integration test: Create increment with `structure: user-stories`, verify ACs embedded
- [ ] Unit test: `ac-embedder.ts` with sample living docs
- [ ] E2E test: `/specweave:embed-acs` command end-to-end
- [ ] Hook test: Pre-start hook blocks when ACs missing

---

## Validation

### Success Criteria

1. ✅ No increment can start (`/specweave:do`) without ACs in spec.md
2. ✅ All increments with `structure: user-stories` have embedded ACs
3. ✅ AC count in spec.md matches metadata.json (0% desync)
4. ✅ Status line shows accurate AC completion
5. ✅ `/specweave:validate` catches missing ACs with clear error messages

### Metrics

**Before** (Increment 0050, pre-fix):
- AC count in spec.md: **0**
- AC count in metadata.json: **32**
- Sync warnings: **38**
- Status line: **0% AC completion** (despite 100% task completion)

**After** (Increment 0050, post-fix):
- AC count in spec.md: **39** ✅
- AC count in metadata.json: **39** ✅
- Sync warnings: **0** ✅
- Status line: **100% AC completion** ✅

### Monitoring

- **Pre-start hook logs**: Count how many increments blocked (should be 0 after migration)
- **Validation warnings**: Track AC presence errors in `/specweave:validate`
- **Sync failures**: Monitor `acSyncEvents` in metadata.json for warnings

---

## References

### Related Files

- **Utility**: `src/utils/ac-embedder.ts`
- **Validator**: `src/core/validators/ac-presence-validator.ts`
- **Hook**: `plugins/specweave/hooks/pre-increment-start.sh`
- **Command**: `plugins/specweave/commands/specweave-embed-acs.md`
- **Documentation**: `CLAUDE.md` (Rule #17 - AC Presence Requirement)

### Related ADRs

- **ADR-0047**: Three-File Canonical Structure (spec.md, plan.md, tasks.md)
- **ADR-0061**: No Increment-to-Increment References
- **ADR-0050**: Three-Tier Dependency Loading
- **ADR-0032**: Universal Hierarchy Mapping (GitHub issue format)

### Incident Reports

- **2025-11-22**: Increment 0050 AC sync failure (0% completion, 38 warnings)
- **2025-11-20**: Status line desync (tasks marked without TodoWrite)
- **2025-11-19**: Internal TODO vs tasks.md desync (increment 0044)

---

## Lessons Learned

### What Went Wrong

1. **No validation gate** before increment start (missing ACs not caught)
2. **Silent failure** in AC sync hook (warnings logged, but no blocking error)
3. **Implicit assumptions** not documented (spec.md as AC source of truth)
4. **PM agent freedom** without guardrails (could generate "pointer-only" specs)

### What We're Fixing

1. **Explicit validation**: Pre-start hook BLOCKS if ACs missing
2. **Fail-fast**: `/specweave:validate` shows ERRORS (not just warnings)
3. **Documentation**: ADR-0064 + CLAUDE.md rule make it explicit
4. **Automation**: Auto-embed during increment creation (no manual step)

### Future Prevention

1. ✅ **4-layer defense** (utility → validator → hook → command)
2. ✅ **Self-healing** (`/specweave:embed-acs` auto-fixes)
3. ✅ **Clear errors** (tell user exactly how to fix)
4. ✅ **Integration tests** (catch regressions before release)

---

**Status**: Accepted
**Author**: System Architect
**Reviewers**: PM, Tech Lead, DevOps
**Approved**: 2025-11-22
**Next Review**: 2025-12-22 (1 month - assess adoption)
