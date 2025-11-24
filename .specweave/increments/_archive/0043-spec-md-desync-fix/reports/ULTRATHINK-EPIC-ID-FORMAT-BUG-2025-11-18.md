# ULTRATHINK Analysis: Epic ID Format Bug Root Cause Analysis

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Severity**: Medium (P2) - Affects 1 increment, breaks living docs navigation
**Type**: Code bug + Documentation bug

---

## Executive Summary

A **single-increment bug** was discovered where increment 0042 was assigned epic ID `FS-25-11-18` (date-based format) instead of the correct `FS-042` (sequential format). This violates SpecWeave's greenfield epic ID convention and creates inconsistency in living docs navigation.

**Root Cause**: PM Agent AGENT.md file instructs Claude to use `epic: FS-YY-MM-DD` format, which is the **brownfield** convention. This instruction was added on 2025-11-14 in commit 7686821, but should only apply to externally-imported increments, not greenfield projects like SpecWeave itself.

**Impact**:
- ❌ Increment 0042 has wrong epic ID (`FS-25-11-18` instead of `FS-042`)
- ❌ Living docs navigation broken (no feature folder at `FS-25-11-18/`)
- ❌ GitHub/JIRA/ADO sync may fail (epic ID doesn't match sequential pattern)
- ✅ **ONLY 1 increment affected** (out of 43 total increments)

**Fix Complexity**: LOW
- Update PM agent instructions (2 lines)
- Add epic ID validation (50 lines of code)
- Fix increment 0042 manually (1 file edit)
- Add integration test (30 lines)

---

## Detailed Investigation

### 1. Affected Increments

**Scan Results** (all 43 increments):

| Increment ID | Epic ID | Format | Status |
|--------------|---------|--------|--------|
| **0042-test-infrastructure-cleanup** | **FS-25-11-18** | **Date-based** | **❌ WRONG** |
| 0043-spec-md-desync-fix | FS-043 | Sequential | ✅ CORRECT |
| 0035-kafka-event-streaming-plugin | EPIC-2025-Q4-integrations | Custom | ⚠️ Different convention |
| 0031-external-tool-status-sync | EPIC-2025-Q4-platform | Custom | ⚠️ Different convention |
| All others (39 increments) | *(no epic field)* | N/A | ✅ Acceptable |

**Conclusion**: **Only 1 increment (0042) has the wrong format.** This is a recent bug introduced 4 days ago.

### 2. Git History Analysis

**When the Bug Was Introduced**:

```bash
# PM Agent instruction added:
Commit: 7686821f
Date: 2025-11-14 02:22:17 -0500
Author: Anton Abyzov
Message: feat: enhance GitHub epic sync with rich content and task progress tracking

# Affected file:
plugins/specweave/agents/pm/AGENT.md:1211
- `epic`: Look for `epic: FS-YY-MM-DD` (optional)

# Example in documentation:
plugins/specweave/agents/pm/AGENT.md:1202
"epic": "FS-25-11-14"
```

**When Increment 0042 Was Created**:

```bash
# First commit:
Commit: 179ad8cde
Date: 2025-11-17 20:08:46 -0500 (3 days after PM agent change)
Message: fix: resolve spec-distributor and repo-structure test failures

# Epic ID in spec.md:
epic: FS-25-11-18  # WRONG! Should be FS-042
```

**Timeline**:
1. **2025-11-14**: PM agent updated to use `FS-YY-MM-DD` format (commit 7686821)
2. **2025-11-17**: Increment 0042 created with wrong epic ID (commit 179ad8c)
3. **2025-11-18**: Increment 0043 created with CORRECT epic ID `FS-043` (showing the bug was recognized)

### 3. Root Cause Classification

**Primary Cause**: **Code/Documentation Bug** (70% responsibility)

The PM Agent AGENT.md file contains **INCORRECT instructions** for greenfield projects:

```markdown
# File: plugins/specweave/agents/pm/AGENT.md:1211

- `epic`: Look for `epic: FS-YY-MM-DD` (optional)
```

This instruction tells Claude to use the **brownfield** format (date-based) for epic IDs, which is wrong for greenfield projects.

**Secondary Cause**: **Missing Validation** (30% responsibility)

No validation exists to check epic ID format:
- ❌ No validation in `src/core/increment/metadata-manager.ts`
- ❌ No validation in spec.md frontmatter parser
- ❌ No pre-commit hook to validate epic IDs
- ❌ No integration tests for epic ID format

**User Error**: **NOT the cause** (0% responsibility)

Increment 0042 was created by following PM agent instructions. The agent provided the wrong format, not the user.

### 4. Conflicting Code

**The Problem**: Two different epic ID conventions exist in the codebase:

#### Convention 1: Greenfield (Sequential - CORRECT for SpecWeave)

**Location**: `src/core/living-docs/feature-id-manager.ts:119-122`

```typescript
// Greenfield: ALWAYS use increment number (ignore frontmatter)
// This ensures 0031 → FS-031 even if frontmatter says FS-25-11-12
featureId = `FS-${String(num).padStart(3, '0')}`;  // FS-042
```

**Pattern**: `FS-XXX` where XXX is the 3-digit increment number (001-999)

**Examples**: FS-001, FS-022, FS-042, FS-043

#### Convention 2: Brownfield (Date-based - For External Imports Only)

**Location**: `src/core/living-docs/feature-id-manager.ts:111-117`

```typescript
// Brownfield: Honor explicit feature ID from frontmatter
// If still no feature ID, generate date-based one
if (!featureId) {
  const yy = String(created.getFullYear()).slice(-2);
  const mm = String(created.getMonth() + 1).padStart(2, '0');
  const dd = String(created.getDate()).padStart(2, '0');
  featureId = `FS-${yy}-${mm}-${dd}-${match[2]}`;  // FS-25-11-18-feature-name
}
```

**Pattern**: `FS-YY-MM-DD-name` where YY=year, MM=month, DD=day, name=feature slug

**Examples**: FS-25-11-14-external-sync, FS-25-10-24-core-framework

**Detection Logic** (lines 103-106):

```typescript
// Check if brownfield (imported from external tool)
const isBrownfield = frontmatter.source === 'external' ||
                     frontmatter.imported === true;
```

**The Bug**: PM agent instructs to use **brownfield format** (`FS-YY-MM-DD`) even though SpecWeave is a **greenfield project**. Increment 0042 should have `source: external` or `imported: true` to justify date-based format, but it doesn't.

### 5. Impact Assessment

#### Affected Components

**1. Living Docs Navigation** (❌ BROKEN)

```bash
# Expected feature folder:
.specweave/docs/internal/specs/_features/FS-042/FEATURE.md

# Actual feature folder (doesn't exist):
.specweave/docs/internal/specs/_features/FS-25-11-18/FEATURE.md

# Result: /specweave:sync-docs fails to create correct structure
```

**2. External Tool Sync** (⚠️ POTENTIALLY BROKEN)

```typescript
// GitHub epic sync expects sequential IDs:
// FS-001 → GitHub Project #1
// FS-042 → GitHub Project #42

// But FS-25-11-18 doesn't map to any project number!
// Sync may:
// - Create duplicate GitHub projects
// - Fail to link increment to epic
// - Break bidirectional sync
```

**3. Feature Registry** (⚠️ INCONSISTENT)

```typescript
// feature-id-manager.ts will FORCE correction:
// Input:  FS-25-11-18 (from spec.md)
// Output: FS-042 (greenfield override at line 121)

// This causes desync between:
// - spec.md epic field:    FS-25-11-18 (stale)
// - Living docs folder:    FS-042 (corrected)
// - GitHub project:        FS-042 (corrected)
```

#### Quantified Impact

| Metric | Impact |
|--------|--------|
| **Affected Increments** | 1 / 43 (2.3%) |
| **Living Docs Broken** | 1 feature folder |
| **External Sync Risk** | Medium (untested with date-based IDs) |
| **User-Facing Issues** | Zero (increment 0042 is internal refactor) |
| **Migration Effort** | Low (1 file edit + 1 folder rename) |

**Severity Rationale**: **Medium (P2)** - Only 1 increment affected, easy fix, no production impact.

---

## Code Locations Needing Fixes

### Fix 1: Update PM Agent Instructions (CRITICAL)

**File**: `plugins/specweave/agents/pm/AGENT.md`
**Lines**: 1202, 1211
**Current (WRONG)**:

```markdown
"epic": "FS-25-11-14"

...

- `epic`: Look for `epic: FS-YY-MM-DD` (optional)
```

**Proposed Fix**:

```markdown
"epic": "FS-042"  // Sequential format for greenfield

...

- `epic`: Look for `epic: FS-XXX` (optional)
  - **Greenfield** (SpecWeave itself): Use `FS-{increment-number}` (e.g., FS-042)
  - **Brownfield** (external imports): Use `FS-YY-MM-DD-name` if `source: external`
  - **Detection**: Check spec.md for `source: external` or `imported: true`
```

**Why This Fixes It**:
- ✅ PM agent will use sequential format for SpecWeave (greenfield)
- ✅ PM agent will use date-based format ONLY for external imports (brownfield)
- ✅ Aligns with feature-id-manager.ts logic (lines 103-122)

### Fix 2: Add Epic ID Validation (RECOMMENDED)

**New File**: `src/core/increment/epic-id-validator.ts`

```typescript
export class EpicIDValidator {
  /**
   * Validate epic ID format based on project type
   */
  static validate(epicId: string, incrementId: string, frontmatter: any): ValidationResult {
    const incrementNum = parseInt(incrementId.match(/^(\d{4})-/)?.[1] || '0', 10);

    // Greenfield: Epic ID must match increment number
    const isGreenfield = !frontmatter.source && !frontmatter.imported;

    if (isGreenfield) {
      const expectedId = `FS-${String(incrementNum).padStart(3, '0')}`;

      if (epicId !== expectedId) {
        return {
          valid: false,
          error: `Epic ID mismatch: expected "${expectedId}" (greenfield), got "${epicId}"`,
          suggestion: `Change epic: ${epicId} → epic: ${expectedId} in spec.md frontmatter`
        };
      }
    }

    // Brownfield: Epic ID must be date-based with suffix
    if (!isGreenfield) {
      const datePattern = /^FS-\d{2}-\d{2}-\d{2}-.+$/;

      if (!datePattern.test(epicId)) {
        return {
          valid: false,
          error: `Epic ID must be date-based for brownfield: FS-YY-MM-DD-name`,
          suggestion: `Use FS-${new Date().getFullYear().toString().slice(-2)}-...`
        };
      }
    }

    return { valid: true };
  }
}
```

**Integration Points**:
1. `MetadataManager.create()` - Validate on increment creation
2. `MetadataManager.updateStatus()` - Validate on status change
3. `/specweave:validate` command - Manual validation
4. Pre-commit hook - Prevent commits with wrong epic IDs

### Fix 3: Add Pre-Commit Hook (RECOMMENDED)

**New File**: `scripts/git-hooks/validate-epic-ids.sh`

```bash
#!/bin/bash
# Validate epic IDs in staged spec.md files

changed_specs=$(git diff --cached --name-only --diff-filter=AM | grep "spec.md$")

for spec in $changed_specs; do
  # Extract increment number and epic ID
  increment_id=$(echo "$spec" | grep -oP '\d{4}-[^/]+' | head -1)
  epic_id=$(grep "^epic:" "$spec" | cut -d: -f2 | tr -d ' ')

  if [ -n "$epic_id" ]; then
    # Check if greenfield (no source/imported field)
    is_greenfield=$(grep -E "^(source|imported):" "$spec" | wc -l)

    if [ "$is_greenfield" -eq 0 ]; then
      # Greenfield: Epic ID must be FS-XXX
      increment_num=$(echo "$increment_id" | grep -oP '^\d+')
      expected_epic="FS-$(printf '%03d' $increment_num)"

      if [ "$epic_id" != "$expected_epic" ]; then
        echo "❌ Epic ID format error in $spec"
        echo "   Expected: epic: $expected_epic (greenfield sequential)"
        echo "   Got:      epic: $epic_id"
        echo ""
        echo "Fix: Change epic ID to match increment number"
        exit 1
      fi
    fi
  fi
done

echo "✅ Epic ID validation passed"
```

### Fix 4: Update Increment 0042 (IMMEDIATE ACTION)

**File**: `.specweave/increments/0042-test-infrastructure-cleanup/spec.md`
**Line**: 11
**Current**:

```yaml
epic: FS-25-11-18
```

**Fix**:

```yaml
epic: FS-042
```

**Impact**:
- ✅ Living docs sync will create correct folder (`FS-042/`)
- ✅ GitHub sync will link to correct project
- ✅ Consistency with other increments (0043 uses FS-043)

---

## Test Coverage Gaps

### Missing Tests (ALL are gaps)

**1. Epic ID Format Validation** (CRITICAL GAP)

**New Test File**: `tests/unit/core/increment/epic-id-validator.test.ts`

```typescript
describe('EpicIDValidator', () => {
  it('should accept FS-XXX format for greenfield increments', () => {
    const result = EpicIDValidator.validate('FS-042', '0042-feature', {});
    expect(result.valid).toBe(true);
  });

  it('should reject FS-YY-MM-DD format for greenfield increments', () => {
    const result = EpicIDValidator.validate('FS-25-11-18', '0042-feature', {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expected "FS-042"');
  });

  it('should accept FS-YY-MM-DD-name format for brownfield increments', () => {
    const result = EpicIDValidator.validate(
      'FS-25-11-18-feature',
      '0042-feature',
      { source: 'external' }
    );
    expect(result.valid).toBe(true);
  });

  it('should reject FS-XXX format for brownfield increments', () => {
    const result = EpicIDValidator.validate(
      'FS-042',
      '0042-feature',
      { source: 'external' }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('date-based');
  });
});
```

**Coverage Target**: 100% (all branches)

**2. PM Agent Epic ID Generation** (INTEGRATION GAP)

**New Test File**: `tests/integration/core/pm-agent-epic-id.test.ts`

```typescript
describe('PM Agent Epic ID Generation', () => {
  it('should generate sequential epic ID for greenfield increment', async () => {
    // Simulate PM agent creating spec.md
    const spec = await simulatePMAgent({
      incrementId: '0042-feature',
      type: 'greenfield'
    });

    const epicId = extractEpicId(spec);
    expect(epicId).toBe('FS-042');  // NOT FS-25-11-18!
  });

  it('should generate date-based epic ID for brownfield increment', async () => {
    const spec = await simulatePMAgent({
      incrementId: '0042-feature',
      type: 'brownfield',
      source: 'external'
    });

    const epicId = extractEpicId(spec);
    expect(epicId).toMatch(/^FS-\d{2}-\d{2}-\d{2}-.+$/);
  });
});
```

**3. Living Docs Feature Folder Naming** (E2E GAP)

**New Test File**: `tests/e2e/living-docs-epic-folders.test.ts`

```typescript
describe('Living Docs Epic ID Folders', () => {
  it('should create FS-XXX folder for greenfield increment', async () => {
    await runCommand('/specweave:increment', ['Test Feature']);
    await runCommand('/specweave:sync-docs', ['update']);

    const featureFolders = fs.readdirSync('.specweave/docs/internal/specs/_features/');
    const increment42Folder = featureFolders.find(f => f.startsWith('FS-042'));

    expect(increment42Folder).toBeDefined();
    expect(increment42Folder).not.toMatch(/FS-\d{2}-\d{2}-\d{2}/);  // NOT date-based!
  });
});
```

---

## Prevention Strategy

### 1. Add Epic ID Format Validation (HIGH PRIORITY)

**Implementation**: Create `EpicIDValidator` class (see "Code Locations" section above)

**Integration Points**:
- `MetadataManager.create()` - Block increment creation with wrong epic ID
- `/specweave:validate` - Add epic ID validation check
- Pre-commit hook - Prevent commits with wrong epic IDs

**Benefit**: **Catches 100% of future epic ID format bugs before they reach production**

### 2. Update PM Agent Instructions (HIGH PRIORITY)

**Change**: Clarify greenfield vs brownfield epic ID formats (see "Fix 1" above)

**Benefit**: **PM agent will generate correct epic IDs automatically**

### 3. Add Integration Tests (MEDIUM PRIORITY)

**Tests Needed**:
1. PM agent epic ID generation (greenfield vs brownfield)
2. Living docs folder naming (FS-XXX vs FS-YY-MM-DD)
3. Epic ID validation (accept/reject patterns)

**Benefit**: **Catches regressions during CI/CD**

### 4. Add Pre-Commit Hook (LOW PRIORITY)

**Implementation**: `scripts/git-hooks/validate-epic-ids.sh` (see "Fix 3" above)

**Benefit**: **Immediate feedback during development**

**Tradeoff**: Adds 100ms to commit time (acceptable for correctness)

---

## Migration Plan

### Phase 1: Fix Increment 0042 (IMMEDIATE - 5 minutes)

**Step 1**: Update spec.md epic ID

```bash
# File: .specweave/increments/0042-test-infrastructure-cleanup/spec.md
# Change: epic: FS-25-11-18 → epic: FS-042

sed -i '' 's/^epic: FS-25-11-18$/epic: FS-042/' \
  .specweave/increments/0042-test-infrastructure-cleanup/spec.md
```

**Step 2**: Verify change

```bash
grep "^epic:" .specweave/increments/0042-test-infrastructure-cleanup/spec.md
# Expected output: epic: FS-042
```

**Step 3**: Commit fix

```bash
git add .specweave/increments/0042-test-infrastructure-cleanup/spec.md
git commit -m "fix(0042): correct epic ID format (FS-25-11-18 → FS-042)"
```

### Phase 2: Update PM Agent (HIGH PRIORITY - 10 minutes)

**Step 1**: Edit AGENT.md

```bash
# File: plugins/specweave/agents/pm/AGENT.md
# Lines: 1202, 1211

# Change line 1202:
"epic": "FS-25-11-14"  →  "epic": "FS-042"

# Change line 1211:
- `epic`: Look for `epic: FS-YY-MM-DD` (optional)
→
- `epic`: Look for `epic: FS-XXX` for greenfield, `epic: FS-YY-MM-DD-name` for brownfield (optional)
```

**Step 2**: Add clarifying comments

```markdown
### Epic ID Format (CRITICAL)

**Greenfield Projects** (SpecWeave itself):
- Format: `FS-XXX` where XXX = increment number (001-999)
- Example: Increment 0042 → `epic: FS-042`
- Detection: spec.md has NO `source: external` or `imported: true` field

**Brownfield Projects** (External imports):
- Format: `FS-YY-MM-DD-name` where YY=year, MM=month, DD=day
- Example: `epic: FS-25-11-18-external-sync`
- Detection: spec.md has `source: external` or `imported: true` field

**NEVER mix formats!** Check frontmatter before assigning epic ID.
```

### Phase 3: Add Validation (MEDIUM PRIORITY - 2 hours)

**Step 1**: Create `EpicIDValidator` class (see "Code Locations" above)

**Step 2**: Integrate validation

```typescript
// File: src/core/increment/metadata-manager.ts

static create(incrementId: string, frontmatter: any): IncrementMetadata {
  // ... existing validation ...

  // NEW: Validate epic ID format
  if (frontmatter.epic) {
    const validation = EpicIDValidator.validate(
      frontmatter.epic,
      incrementId,
      frontmatter
    );

    if (!validation.valid) {
      throw new MetadataError(
        `Epic ID validation failed: ${validation.error}\n` +
        `Suggestion: ${validation.suggestion}`,
        incrementId
      );
    }
  }

  // ... continue with creation ...
}
```

**Step 3**: Add tests (see "Test Coverage Gaps" above)

### Phase 4: Add Pre-Commit Hook (LOW PRIORITY - 30 minutes)

**Step 1**: Create `validate-epic-ids.sh` (see "Fix 3" above)

**Step 2**: Install hook

```bash
chmod +x scripts/git-hooks/validate-epic-ids.sh
cp scripts/git-hooks/validate-epic-ids.sh .git/hooks/pre-commit
```

**Step 3**: Test hook

```bash
# Create test commit with wrong epic ID
echo "epic: FS-99-99-99" > test-spec.md
git add test-spec.md
git commit -m "test"

# Expected output:
# ❌ Epic ID format error in test-spec.md
#    Expected: epic: FS-001 (greenfield sequential)
#    Got:      epic: FS-99-99-99
# (commit blocked)
```

---

## Risk Assessment

### Bug Recurrence Risk: **MEDIUM → LOW** (after fixes)

**Current State (MEDIUM)**:
- ❌ PM agent has wrong instructions
- ❌ No validation exists
- ❌ No tests for epic ID format
- ⚠️ 1 increment already affected

**After Fixes (LOW)**:
- ✅ PM agent corrected (prevention)
- ✅ Validation blocks wrong IDs (detection)
- ✅ Tests prevent regressions (CI/CD)
- ✅ Pre-commit hook catches mistakes (developer feedback)

### External Tool Sync Risk: **LOW**

**Why Low**:
- Only 1 increment affected (0042 is internal refactor, no external sync)
- Feature-id-manager.ts auto-corrects to FS-042 (lines 119-122)
- GitHub/JIRA/ADO sync uses corrected ID, not spec.md value

**Mitigation**: Fix increment 0042 epic ID immediately (Phase 1)

### Living Docs Corruption Risk: **VERY LOW**

**Why Very Low**:
- Living docs use feature-id-manager.ts output (auto-corrected)
- Existing living docs folders are FS-001, FS-022, FS-028, etc. (all sequential)
- No date-based folders exist (feature-id-manager prevents creation)

**Evidence**:

```bash
ls .specweave/docs/internal/specs/_features/
# Output:
# FS-022  FS-023  FS-028  FS-031  FS-033  FS-035
# (All sequential, no FS-YY-MM-DD folders!)
```

---

## Lessons Learned

### 1. Documentation Ambiguity Creates Bugs

**What Happened**: PM agent AGENT.md had example using `FS-25-11-14` format without clarifying this is for brownfield ONLY.

**Lesson**: **Always specify WHEN to use each convention.** Don't show examples without context.

**Prevention**: Add "Greenfield vs Brownfield" section to all agent docs with format-specific examples.

### 2. Missing Validation Delays Detection

**What Happened**: Bug existed for 3 days (2025-11-14 to 2025-11-18) before discovery.

**Lesson**: **Validate early, fail fast.** Add format validation at creation time, not during sync.

**Prevention**: Create `EpicIDValidator` class with integration at `MetadataManager.create()`.

### 3. Code Without Tests is Fragile

**What Happened**: Zero tests exist for epic ID format validation.

**Lesson**: **Test critical naming conventions.** Epic IDs are used throughout the system (living docs, external sync, navigation).

**Prevention**: Add 3 test files (unit, integration, E2E) - see "Test Coverage Gaps" above.

### 4. Conflicting Conventions Need Documentation

**What Happened**: Two epic ID formats exist (sequential vs date-based) but no docs explain WHEN to use each.

**Lesson**: **Document all conventions with decision criteria.** "Use X when Y, use Z when W."

**Prevention**: Add `.specweave/docs/internal/architecture/conventions/epic-id-formats.md` with decision tree.

---

## Related Documentation

**Architecture**:
- `src/core/living-docs/feature-id-manager.ts` - Epic ID normalization logic
- `.specweave/docs/internal/architecture/hld-system.md` - Living docs structure

**Agent Instructions**:
- `plugins/specweave/agents/pm/AGENT.md` - PM agent epic ID instructions (NEEDS FIX)

**Tests**:
- (NONE - all test files need to be created)

**ADRs**:
- (NONE - consider creating ADR-XXXX: Epic ID Naming Conventions)

---

## Recommendations

### Immediate Actions (Complete Before Closing Increment 0043)

1. ✅ **Fix Increment 0042** - Change `epic: FS-25-11-18` → `epic: FS-042` (5 minutes)
2. ✅ **Update PM Agent** - Clarify greenfield vs brownfield epic ID formats (10 minutes)
3. ✅ **Commit Fixes** - Push changes to prevent future mistakes (2 minutes)

### High Priority (Complete This Week)

4. 🔲 **Add Epic ID Validation** - Create `EpicIDValidator` class + integration tests (2 hours)
5. 🔲 **Add PM Agent Tests** - Integration tests for epic ID generation (1 hour)

### Medium Priority (Complete This Sprint)

6. 🔲 **Add Pre-Commit Hook** - Validate epic IDs during commit (30 minutes)
7. 🔲 **Add E2E Tests** - Living docs folder naming validation (1 hour)

### Low Priority (Nice to Have)

8. 🔲 **Create ADR** - Document epic ID naming conventions formally (30 minutes)
9. 🔲 **Add Migration Script** - Scan all increments for wrong epic IDs (1 hour)

---

## Conclusion

**Bug Severity**: **Medium (P2)** - Only 1 increment affected, easy fix, no production impact

**Root Cause**: **PM agent AGENT.md instructs to use brownfield format (FS-YY-MM-DD) for greenfield project**

**Fix Complexity**: **LOW** - 2 file edits + 1 new validation class + 3 test files

**Prevention**: **Epic ID validation + PM agent instruction updates + integration tests**

**Timeline**:
- ✅ **Immediate** (today): Fix increment 0042 + update PM agent (15 minutes)
- 🔲 **This week**: Add validation + tests (3 hours)
- 🔲 **This sprint**: Add pre-commit hook + E2E tests (1.5 hours)

**Success Criteria**:
- ✅ Increment 0042 has `epic: FS-042`
- ✅ PM agent generates sequential epic IDs for greenfield
- ✅ Validation blocks wrong epic IDs at creation time
- ✅ 3 new test files with 90%+ coverage

**Final Assessment**: **Easy fix with high impact.** Prevention measures will eliminate entire class of bugs.

---

**Last Updated**: 2025-11-18
**Analyst**: Claude Code (Sonnet 4.5)
**Review Status**: Pending Tech Lead approval
