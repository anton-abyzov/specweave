# ADO Duplicate Folder Bug (Fixed in v0.37.0)

## Problem

ADO import created duplicate project folders with different casing and spacing:

**Example:**
```
.specweave/docs/internal/specs/
├── Nova CAD/              ← Display name with space
│   ├── cpp-team/
│   └── cs-team/
└── nova-cad/              ← Normalized (duplicate!)
    ├── cpp-team/
    ├── cs-team/
    └── nova-cad/          ← Nested duplicate!
```

## Root Cause

The bug occurred in two places where `containerId` was extracted:

1. **[external-import-grouping.ts:176](../../../../../../src/cli/helpers/init/external-import-grouping.ts#L176)** (Fixed)
   ```typescript
   // ❌ OLD (Bug):
   const containerId = parentItem.adoProjectName || 'default';
   // Uses display name: "Nova CAD"

   // ✅ NEW (Fixed):
   if (parentItem.adoAreaPath) {
     const segments = parentItem.adoAreaPath.split('\\');
     containerId = normalizeToProjectId(segments[0]) || 'default';
   }
   // Uses normalized name: "nova-cad"
   ```

2. **Area path extraction logic** (Line 182-185):
   - For area path `"Nova CAD\\CPP Team"`:
     - First segment: `"Nova CAD"` → normalized to `"nova-cad"` (containerId)
     - Last segment: `"CPP Team"` → normalized to `"cpp-team"` (projectId)

3. **Path construction** in [item-converter.ts:1233-1237](../../../../../../src/importers/item-converter.ts#L1233-L1237):
   ```typescript
   return path.join(
     specsDir,        // ".specweave/docs/internal/specs"
     containerDirName, // "Nova CAD" (bug) → "nova-cad" (fixed)
     projectId         // "cpp-team"
   );
   ```

## Why Duplicates Occurred

1. **Parent items** created folders with **display name** (`"Nova CAD"`)
2. **Orphan items** created folders with **normalized name** (`"nova-cad"`)
3. **Self-reference area paths** (`"Nova CAD\\Nova CAD"`) created nested duplicates

## The Fix (v0.37.0)

**Three changes in `external-import-grouping.ts`:**

1. **Lines 179-190** (Parent items):
   - Extract first segment from `adoAreaPath`
   - Normalize it: `"Nova CAD"` → `"nova-cad"`

2. **Lines 241-250** (Orphan items):
   - Same normalization logic
   - Ensures consistency

3. **Lines 324-330** (`groupNonHierarchyItems`):
   - Applied same fix for non-hierarchy ADO items

**Key change:**
```typescript
// Extract PROJECT name (first segment) from area path and normalize
if (parentItem.adoAreaPath) {
  const segments = parentItem.adoAreaPath.split('\\');
  containerId = normalizeToProjectId(segments[0]) || 'default';
}
```

## Future Behavior

**After v0.37.0, all ADO imports use normalized folder names:**

```
.specweave/docs/internal/specs/
└── nova-cad/              ← Only this folder created
    ├── cpp-team/
    ├── cs-team/
    └── settings-application/
```

## Cleanup Existing Duplicates

**Run the cleanup script:**

```bash
bash scripts/cleanup/remove-ado-duplicate-folders.sh
```

**The script will:**
1. Find folders with spaces (display names)
2. Check for normalized versions
3. Prompt you to merge duplicates
4. Remove nested duplicates (e.g., `nova-cad/nova-cad/`)

**Options when merging:**
- **Option 1**: Merge display name → normalized (recommended)
- **Option 2**: Merge normalized → display name
- **Option 3**: Skip

## Verification

**After cleanup, verify structure:**

```bash
# List all project folders
ls -la .specweave/docs/internal/specs/

# Should see only lowercase names with hyphens
# Example: nova-cad, nova-cloud-platform, nova-iomt-platform

# Check for nested duplicates
find .specweave/docs/internal/specs -type d -name "*/*" | grep -E "(.+)/\1$"
# Should return empty (no nested duplicates)
```

## Technical Details

**Area Path Structure:**
- Format: `"Project\\Area\\Subarea"`
- Example: `"Nova CAD\\CPP Team"`
- Segments: `["Nova CAD", "CPP Team"]`

**Normalization:**
- Function: `normalizeToProjectId()`
- Converts: `"Nova CAD"` → `"nova-cad"`
- Rules: Lowercase + spaces to hyphens

**2-Level Folder Structure:**
- Level 1: Project (first segment) → `nova-cad/`
- Level 2: Area/Board (last segment) → `cpp-team/`
- Full path: `specs/nova-cad/cpp-team/FS-XXX/`

## Related Issues

- GitHub: [Issue #XXX](https://github.com/specweave/specweave/issues/XXX)
- ADR: [ADR-XXXX: Normalize ADO Container IDs](../architecture/adr/XXXX-normalize-ado-container-ids.md)

## Version Info

- **Bug introduced**: v0.30.0 (ADO 2-level structure support)
- **Bug fixed**: v0.37.0
- **Affected files**:
  - `src/cli/helpers/init/external-import-grouping.ts`
  - `src/importers/item-converter.ts` (uses normalized containerId)
