# ADR-0061: No Increment-to-Increment References (Feature-First Architecture)

**Status**: Accepted
**Date**: 2025-11-22
**Deciders**: Core Team
**Priority**: P0 (Critical - Architectural Foundation)

---

## Context

### The Bug That Led to This ADR

The spec-detector (`src/core/spec-detector.ts`) had a critical architectural flaw that **required user story files to reference increments**:

```typescript
// ❌ BROKEN LOGIC (Lines 86-89)
const references = extractIncrementReferences(content, frontmatter);
if (references.includes(path.basename(incrementPath))) {
  // Only sync specs that reference this increment
}
```

This created a **circular dependency problem**:
- Increment 0050 → references FS-048 (via `feature_id` in metadata.json)
- FS-048 User Stories → required to reference 0050 (via frontmatter or content)

**Result**: Hooks detected 0 specs, created 0 GitHub issues, appeared broken.

### The Correct Architecture

Increments should ONLY reference features (one-way):

```
INCREMENT (metadata.json) → feature_id → FEATURE → USER STORIES
        ↓ NEVER ↓
    OTHER INCREMENTS ❌
```

**No circular dependencies. No reverse references required.**

---

## Decision

**Increments MUST NEVER reference other increments.**

The only allowed relationship is:
- **Increment → Feature** (via `feature_id` in metadata.json or spec.md frontmatter)
- **Feature → User Stories** (via living docs folder structure)

### Implementation

#### Fixed Spec Detector Logic

**File**: `src/core/spec-detector.ts`

```typescript
// ✅ CORRECT LOGIC (v0.24.0+)
export async function detectSpecsInIncrement(
  incrementPath: string,
  config: any = {}
): Promise<MultiSpecDetectionResult> {
  // STEP 1: Read increment metadata to get feature_id
  const metadata = JSON.parse(fs.readFileSync(path.join(incrementPath, 'metadata.json'), 'utf-8'));
  const featureId = metadata.feature_id;

  if (!featureId) {
    return { specs: [], isMultiSpec: false, projects: [] };
  }

  // STEP 2: Find all user stories for this feature_id
  return await detectSpecsByFeatureId(featureId, config);
}

async function detectSpecsByFeatureId(featureId: string, config: any = {}): Promise<MultiSpecDetectionResult> {
  // Scan: .specweave/docs/internal/specs/{project}/{featureId}/us-*.md
  // Filter: frontmatter.feature === featureId
  // Return: All matching user stories
}
```

**Key Changes**:
1. **Read increment metadata FIRST** - Extract `feature_id`
2. **Find user stories by feature** - Scan `.specweave/docs/internal/specs/{project}/{featureId}/`
3. **Verify frontmatter match** - Ensure `frontmatter.feature === featureId`
4. **NO reverse references required** - User stories don't need to know about increments

---

## Consequences

### ✅ Benefits

1. **No Circular Dependencies**
   - Increments reference features (forward only)
   - User stories don't reference increments
   - Clean separation of concerns

2. **Hooks Work Automatically**
   - When task completes in increment 0050 (feature_id: FS-048)
   - Hook reads metadata → finds FS-048 → finds all user stories
   - Creates/updates GitHub issues for all user stories
   - NO manual configuration needed

3. **Simpler Living Docs**
   - User story files are pure specifications
   - No need to update them when increments are created
   - Single source of truth

4. **Multi-Increment Support**
   - Multiple increments can reference same feature (Phase 1a, 1b, 1c)
   - Each increment auto-syncs ALL user stories for that feature
   - No duplication, no desync

### ⚠️ Risks Mitigated

1. **Prevents Increment References**
   - Pre-commit hook validates NO increment references in living docs
   - Spec-detector ignores any reverse references (defensive)

2. **Migration Path**
   - Existing increments with bad references still work (defensive fallback)
   - New increments follow correct architecture

3. **Documentation**
   - CLAUDE.md updated with CRITICAL warning
   - ADR captures architectural decision
   - Code comments reference this ADR

---

## Validation

### Test Cases

#### TC-1: Increment with feature_id
```bash
# Setup
echo '{"feature_id": "FS-048"}' > .specweave/increments/0050-test/metadata.json

# Execute
node dist/src/cli/commands/detect-specs.js --increment 0050-test

# Expected
{
  "specs": [US-001, US-002, ..., US-008],  // All 8 user stories
  "isMultiSpec": true,
  "projects": ["specweave"]
}
```

#### TC-2: User Story with NO increment reference
```yaml
# .specweave/docs/internal/specs/specweave/FS-048/us-001-smart-pagination.md
---
id: US-001
feature: FS-048
title: "Smart Pagination"
# NO increments field ✅
---
```

**Result**: Still detected and synced to GitHub (issue #703)

#### TC-3: Multiple Increments, Same Feature
```bash
# 0048-phase-1a (feature_id: FS-048) → Syncs all 8 user stories
# 0050-phase-1b-7 (feature_id: FS-048) → Syncs same 8 user stories
# No conflicts, no duplication (GitHub issues already exist)
```

---

## Enforcement

### 1. Pre-Commit Hook Validation

**File**: `scripts/pre-commit-increment-validation.sh` (NEW)

```bash
#!/bin/bash
# Validates NO increment-to-increment references

LIVING_DOCS=".specweave/docs/internal/specs"

# Check user story files
for us_file in $(find "$LIVING_DOCS" -name "us-*.md"); do
  # Fail if contains increment references
  if grep -q "increments:" "$us_file"; then
    echo "❌ VIOLATION: $us_file contains 'increments:' field"
    echo "   ADR-0061: User stories MUST NOT reference increments"
    exit 1
  fi

  if grep -q "0[0-9][0-9][0-9]-" "$us_file"; then
    echo "❌ VIOLATION: $us_file contains increment ID pattern"
    echo "   ADR-0061: User stories MUST NOT reference increments"
    exit 1
  fi
done

echo "✅ No increment-to-increment references detected"
```

### 2. Spec Detector Defensive Code

**File**: `src/core/spec-detector.ts` (Lines 158-160)

```typescript
// 5. Verify this user story belongs to the feature
if (frontmatter.feature !== featureId) {
  continue; // Skip if feature mismatch (defensive)
}

// DEFENSIVE: Ignore any 'increments' field (should not exist per ADR-0061)
// We only care about 'feature' field
```

### 3. Documentation Updates

**File**: `CLAUDE.md` (Section 7: Source of Truth)

```markdown
### 7a. NO Increment References (ADR-0061) ⛔

**CRITICAL**: Increments NEVER reference other increments!

❌ WRONG:
- User story frontmatter: `increments: [0050-...]`
- User story content: "Implemented in 0050-..."
- Increment dependencies on other increments

✅ CORRECT:
- Increment metadata.json: `feature_id: "FS-048"`
- User story frontmatter: `feature: "FS-048"`
- Flow: INCREMENT → FEATURE → USER STORIES
```

---

## Related

- **ADR-0032**: Universal Hierarchy Mapping (Features → Milestones, User Stories → Issues)
- **ADR-0050**: Split Secrets/Config (Feature metadata in config.json, not .env)
- **Incident**: 2025-11-22 - Hooks appeared broken (0 specs detected, 0 issues created)
- **Fix Commit**: Rewrite `detectSpecsInIncrement()` to use feature_id lookup

---

## Revision History

- **2025-11-22**: Initial version (architectural fix for spec-detector bug)
