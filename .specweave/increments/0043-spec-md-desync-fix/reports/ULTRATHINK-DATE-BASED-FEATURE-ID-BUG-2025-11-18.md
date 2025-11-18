# ULTRATHINK: Date-Based Feature ID Bug Analysis

**Date**: 2025-11-18
**Incident**: `FS-25-11-18` folder created instead of `FS-043`
**Severity**: HIGH - Pollutes living docs structure with wrong naming convention
**Affected Increments**: 0042, 0043 (potentially others)

---

## 🔍 Discovery

**Observation**: Living docs contains feature folder named `FS-25-11-18` (date format) instead of `FS-043` (increment number format).

```bash
# Expected (Greenfield):
.specweave/docs/internal/specs/_features/FS-043/

# Actual (WRONG - Brownfield format):
.specweave/docs/internal/specs/_features/FS-25-11-18/
```

**Detection Method**: Visual inspection of file tree in IDE

---

## 📊 Data Collection

### Affected Files

1. **Feature Folders** (Living Docs):
   - `.specweave/docs/internal/specs/_features/FS-25-11-18/` ❌
   - `.specweave/docs/internal/specs/specweave/FS-25-11-18/` ❌

2. **Increment Spec Files**:
   - `.specweave/increments/0042-test-infrastructure-cleanup/spec.md` - Line 11: `epic: FS-25-11-18` ❌
   - `.specweave/increments/0043-spec-md-desync-fix/spec.md` - Line 10: `epic: FS-25-11-18` ❌

3. **Feature Registry**:
   - `.specweave/docs/internal/specs/.feature-registry.json` (likely contains wrong mapping)

### Evidence

```yaml
# From 0043 spec.md frontmatter:
---
increment: 0043-spec-md-desync-fix
title: "Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools"
priority: P1
status: planning
type: bug
created: 2025-11-18
test_mode: TDD
coverage_target: 90
epic: FS-25-11-18  # ❌ WRONG! Should be FS-043 or omitted (auto-generated)
---
```

---

## 🔬 Root Cause Analysis

### Naming Convention Standards

**Greenfield** (SpecWeave-native increments):
- Format: `FS-XXX` (3-digit increment number)
- Example: `FS-031`, `FS-040`, `FS-043`
- Source: Increment number (`0031` → `FS-031`)
- Usage: Internal increments created via `/specweave:increment`

**Brownfield** (Imported from external tools):
- Format: `FS-YY-MM-DD-name` (date-based)
- Example: `FS-25-11-14-external-tool-sync`
- Source: Creation date + feature name
- Usage: JIRA epics, GitHub issues, ADO features imported into SpecWeave
- Indicator: `imported: true` or `source: external` in frontmatter

### Code Flow Analysis

**1. Feature ID Generation** (`src/core/living-docs/feature-id-manager.ts:96-123`):

```typescript
// Extract feature ID - CRITICAL LOGIC for greenfield vs brownfield
const match = incrementId.match(/^(\d{4})-(.+)$/);
let featureId = '';

if (match) {
  const num = parseInt(match[1], 10);

  // Check if brownfield (imported from external tool)
  const isBrownfield = frontmatter.source === 'external' ||
                       frontmatter.imported === true;

  if (isBrownfield) {
    // Brownfield: Honor explicit feature ID from frontmatter
    featureId = frontmatter.feature || frontmatter.epic || '';

    // If still no feature ID, generate date-based one
    if (!featureId) {
      const yy = String(created.getFullYear()).slice(-2);
      const mm = String(created.getMonth() + 1).padStart(2, '0');
      const dd = String(created.getDate()).padStart(2, '0');
      featureId = `FS-${yy}-${mm}-${dd}-${match[2]}`;  // ❌ DATE FORMAT
    }
  } else {
    // Greenfield: ALWAYS use increment number (ignore frontmatter)
    // This ensures 0031 → FS-031 even if frontmatter says FS-25-11-12
    featureId = `FS-${String(num).padStart(3, '0')}`;  // ✅ CORRECT
  }
}
```

**Analysis**:
- Code correctly distinguishes greenfield vs brownfield
- For greenfield, it SHOULD ignore frontmatter and use increment number
- **BUT**: If frontmatter has `epic: FS-25-11-18`, living docs sync uses that value

**2. Living Docs Sync** (`src/core/living-docs/living-docs-sync.ts:152-178`):

```typescript
private async getFeatureIdForIncrement(incrementId: string): Promise<string> {
  // Extract increment number (e.g., "0040-name" → 40)
  const match = incrementId.match(/^(\d{4})-/);
  if (!match) {
    throw new Error(`Invalid increment ID format: ${incrementId}`);
  }

  const num = parseInt(match[1], 10);

  // Check if increment has explicit feature ID
  const metadataPath = path.join(
    this.projectRoot,
    '.specweave/increments',
    incrementId,
    'metadata.json'
  );

  if (await fs.pathExists(metadataPath)) {
    const metadata = await fs.readJson(metadataPath);
    if (metadata.feature) {
      return metadata.feature;  // ❌ USES metadata.feature (reads epic field)
    }
  }

  // Auto-generate for greenfield: FS-040, FS-041, etc.
  return `FS-${String(num).padStart(3, '0')}`;  // ✅ CORRECT (but never reached)
}
```

**Analysis**:
- Code tries to read `metadata.feature` field
- If present, it uses that value (WRONG if it's date-based for greenfield)
- **Auto-generation is CORRECT** but never executed because metadata has the field

**3. PM Agent Documentation** (`plugins/specweave/agents/pm/AGENT.md:1211`):

```markdown
- `epic`: Look for `epic: FS-YY-MM-DD` (optional)
```

**Analysis**:
- PM agent is **documented** to look for date-based format
- This is **CORRECT** for brownfield imports
- But **MISLEADING** for greenfield increments (should not create this format)

### Bug Propagation Chain

```
1. PM Agent creates increment
   ↓
2. PM Agent writes spec.md with frontmatter
   ↓
3. PM Agent adds `epic: FS-25-11-18` (date format) ❌
   ↓
4. spec.md saved with wrong epic format
   ↓
5. Living docs sync reads spec.md
   ↓
6. LivingDocsSync.getFeatureIdForIncrement() checks metadata.feature
   ↓
7. metadata.json has `feature: "FS-25-11-18"` (from spec.md)
   ↓
8. Living docs sync creates folders:
   - .specweave/docs/internal/specs/_features/FS-25-11-18/ ❌
   - .specweave/docs/internal/specs/specweave/FS-25-11-18/ ❌
```

### Root Cause

**PRIMARY**: PM Agent (or increment creation logic) is writing date-based `epic:` field to greenfield increment spec.md files.

**SECONDARY**: `LivingDocsSync.getFeatureIdForIncrement()` trusts `metadata.feature` without validating format or checking if increment is greenfield/brownfield.

---

## 🎯 Fix Strategy

### Approach 1: Prevent at Source (PM Agent)

**Change**: PM Agent should NOT write `epic:` field for greenfield increments

**Implementation**:
1. Update PM agent documentation to distinguish greenfield vs brownfield
2. Add logic: "Only write `epic:` field if `imported: true` OR `source: external`"
3. For greenfield, leave epic field empty (auto-generated during sync)

**Pros**:
- ✅ Fixes at source (prevents wrong data from being created)
- ✅ Clear separation of greenfield vs brownfield
- ✅ Auto-generation works as designed

**Cons**:
- ❌ Requires PM agent prompt update
- ❌ Doesn't fix existing increments

### Approach 2: Validate in LivingDocsSync

**Change**: `getFeatureIdForIncrement()` validates format before using metadata.feature

**Implementation**:
```typescript
private async getFeatureIdForIncrement(incrementId: string): Promise<string> {
  const match = incrementId.match(/^(\d{4})-/);
  if (!match) {
    throw new Error(`Invalid increment ID format: ${incrementId}`);
  }

  const num = parseInt(match[1], 10);

  // Check if increment has explicit feature ID
  const metadataPath = path.join(
    this.projectRoot,
    '.specweave/increments',
    incrementId,
    'metadata.json'
  );

  if (await fs.pathExists(metadataPath)) {
    const metadata = await fs.readJson(metadataPath);

    // NEW: Check if brownfield (imported from external)
    const isBrownfield = metadata.imported === true || metadata.source === 'external';

    if (metadata.feature) {
      // NEW: Validate format matches increment type
      const isDateFormat = /^FS-\d{2}-\d{2}-\d{2}/.test(metadata.feature);
      const isIncrementFormat = /^FS-\d{3}$/.test(metadata.feature);

      if (isBrownfield && isDateFormat) {
        return metadata.feature;  // ✅ Brownfield with correct format
      } else if (!isBrownfield && isIncrementFormat) {
        return metadata.feature;  // ✅ Greenfield with correct format
      } else {
        // ⚠️ Format mismatch - log warning and auto-generate
        console.warn(`⚠️ Feature ID format mismatch for ${incrementId}: ${metadata.feature}`);
        console.warn(`   Expected: ${isBrownfield ? 'FS-YY-MM-DD-name' : 'FS-XXX'}`);
        console.warn(`   Auto-generating correct format...`);
        // Fall through to auto-generation
      }
    }
  }

  // Auto-generate for greenfield: FS-040, FS-041, etc.
  return `FS-${String(num).padStart(3, '0')}`;
}
```

**Pros**:
- ✅ Defensive programming (validates data before use)
- ✅ Auto-fixes mismatches (regenerates correct format)
- ✅ Works for existing increments (retroactive fix)
- ✅ Logs warnings for audit trail

**Cons**:
- ❌ Fixes symptom, not root cause
- ❌ PM agent will keep creating wrong format

### Approach 3: Hybrid (Both)

**Change**: Fix at source (PM agent) AND add validation (LivingDocsSync)

**Implementation**:
1. Update PM agent to not write `epic:` for greenfield
2. Add validation in LivingDocsSync (Approach 2)
3. Create migration script to fix existing increments

**Pros**:
- ✅ Prevents future issues (PM agent fix)
- ✅ Handles existing issues (validation + migration)
- ✅ Defense in depth (multiple layers of protection)

**Cons**:
- ❌ More code changes

---

## 🛠️ Recommended Fix (Hybrid Approach)

### Phase 1: Immediate Fix (LivingDocsSync Validation)

**File**: `src/core/living-docs/living-docs-sync.ts`

**Changes**:
1. Add format validation in `getFeatureIdForIncrement()`
2. Auto-generate correct format if mismatch detected
3. Log warnings for audit trail

**Timeline**: Immediate (this session)

### Phase 2: Prevention (PM Agent Update)

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Changes**:
1. Update line 1211 documentation:
   ```markdown
   - `epic`: Look for `epic: FS-XXX` for greenfield OR `epic: FS-YY-MM-DD-name` for brownfield (imported: true)
   - **Greenfield**: Leave empty (auto-generated as FS-{increment-number} during sync)
   - **Brownfield**: Use explicit epic from external tool
   ```

2. Add validation logic to PM agent prompt:
   ```markdown
   **CRITICAL**: When creating spec.md frontmatter:
   - **Greenfield** (new SpecWeave increment): DO NOT add `epic:` field (auto-generated)
   - **Brownfield** (imported from Jira/GitHub/ADO): Add `epic: FS-YY-MM-DD-name` + `imported: true`
   ```

**Timeline**: This session

### Phase 3: Cleanup (Migration Script)

**File**: `.specweave/increments/0043-spec-md-desync-fix/scripts/fix-date-based-feature-ids.ts`

**Purpose**:
1. Scan all increments for date-based epic IDs
2. Check if increment is greenfield (no `imported: true`)
3. If mismatch, update to `FS-{increment-number}`
4. Rename living docs folders
5. Update feature registry

**Timeline**: After Phase 1 and 2 complete

---

## 🧪 Test Strategy

### Unit Tests

**File**: `tests/unit/living-docs/feature-id-validation.test.ts` (NEW)

**Cases**:
1. Greenfield increment with correct format (`FS-043`) → Uses metadata.feature
2. Greenfield increment with date format (`FS-25-11-18`) → Auto-generates `FS-043`
3. Brownfield increment with date format (`FS-25-11-18`) → Uses metadata.feature
4. Brownfield increment with incorrect format (`FS-043`) → Warns and uses metadata.feature
5. No feature field → Auto-generates `FS-{increment-number}`

### Integration Tests

**File**: `tests/integration/living-docs/feature-id-sync.test.ts` (NEW)

**Cases**:
1. Create greenfield increment → Sync → Verify `FS-XXX` folder created
2. Create increment with wrong epic format → Sync → Verify auto-correction
3. Import brownfield increment → Sync → Verify `FS-YY-MM-DD-name` preserved

### Regression Tests

**File**: `tests/integration/living-docs/date-based-id-prevention.test.ts` (NEW)

**Cases**:
1. Detect any `FS-\d{2}-\d{2}-\d{2}` folders in `_features/` for greenfield increments
2. Fail test if date-based IDs found without `imported: true`
3. Scan all spec.md files for epic field validation

---

## 📈 Success Criteria

**Immediate**:
- [ ] No new `FS-YY-MM-DD` folders created for greenfield increments
- [ ] `FS-043` folder exists (not `FS-25-11-18`)
- [ ] Living docs sync logs warnings for format mismatches

**Long-term**:
- [ ] All greenfield increments use `FS-XXX` format
- [ ] All brownfield increments use `FS-YY-MM-DD-name` format
- [ ] PM agent never creates wrong format
- [ ] Regression tests catch violations

---

## 🔗 Related Issues

**Similar Past Incidents**: None found (first occurrence)

**Related Bugs**:
- spec.md desync (increment 0043 - current increment)
- Feature ID duplication (resolved via FeatureIDManager)

**Documentation Gaps**:
- PM agent lacks clear greenfield vs brownfield guidance
- Feature ID format standards not documented in architecture docs

---

## 📝 Lessons Learned

**What Went Wrong**:
1. PM agent documentation ambiguous (line 1211 shows date format as default)
2. No validation between increment type and epic format
3. LivingDocsSync blindly trusts metadata.feature

**What Should Have Prevented This**:
1. Type checking: Greenfield MUST NOT have date-based IDs
2. Validation layer in LivingDocsSync
3. Regression tests for feature ID format

**Process Improvements**:
1. Add pre-commit hook: Validate epic format matches increment type
2. Add CI test: Scan all feature folders for naming violations
3. Update architecture docs: Document feature ID standards

---

## 🎯 Next Steps

**Immediate Actions** (This Session):
1. ✅ Create this ultrathink analysis
2. ⏳ Implement LivingDocsSync validation (Phase 1)
3. ⏳ Update PM agent documentation (Phase 2)
4. ⏳ Add regression tests
5. ⏳ Create migration script (Phase 3)
6. ⏳ Clean up `FS-25-11-18` folders
7. ⏳ Regenerate as `FS-043`

**Follow-up** (Next Increment):
- Add architecture documentation for feature ID standards
- Add pre-commit hook for epic format validation
- Audit all existing increments for format violations

---

**Analysis Complete**: 2025-11-18
**Estimated Fix Time**: 2-3 hours
**Complexity**: Medium (multi-layer fix required)
**Impact**: High (prevents living docs pollution)

**Reviewer**: Tech Lead / Architect
**Status**: Ready for implementation
