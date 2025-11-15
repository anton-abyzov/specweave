# External Tool Hierarchy Mapping - Implementation Report

**Date**: 2025-11-14
**Increment**: 0031-external-tool-status-sync
**Status**: ✅ COMPLETE

## Overview

Successfully implemented clear external tool hierarchy mapping indicators in SpecWeave work items. Users can now immediately see how SpecWeave's hierarchy (Epic → Feature → User Story → Task) maps to their external tool's hierarchy (JIRA Epic, GitHub Issue, ADO Feature, etc.).

## Implementation Details

### 1. Type Definitions (`types.ts`)

Added new `ExternalToolMapping` interface:

```typescript
export interface ExternalToolMapping {
  provider: 'github' | 'jira' | 'ado';
  externalType: string; // e.g., "epic", "story", "issue", "feature"
  externalId?: string; // e.g., "AUTH-100", "#45", "12345"
  externalUrl?: string; // Full URL to external item
  hierarchyLevel: 'epic' | 'feature' | 'user-story' | 'task';
  mappingNote?: string; // Explains the divergence
}
```

Updated interfaces:
- `FeatureFile` - Added `externalToolMapping?: ExternalToolMapping`
- `UserStoryFile` - Added `externalToolMapping?: ExternalToolMapping`

### 2. Detection Logic (`spec-distributor.ts`)

**New Method**: `detectExternalToolMapping(incrementId: string)`

Detects external tool mapping from `metadata.json` with priority order:
1. **JIRA** (highest divergence: Epic → Feature)
2. **ADO** (same level: Feature → Feature)
3. **GitHub** (divergence: Issue → Feature)

**Example Detection**:
```typescript
// JIRA mapping
{
  provider: 'jira',
  externalType: 'epic',
  externalId: 'SCRUM-24',
  externalUrl: 'https://jira.atlassian.com/browse/SCRUM-24',
  hierarchyLevel: 'feature',
  mappingNote: 'JIRA Epic maps to SpecWeave Feature'
}

// GitHub mapping
{
  provider: 'github',
  externalType: 'issue',
  externalId: '#375',
  externalUrl: 'https://github.com/anton-abyzov/specweave/issues/375',
  hierarchyLevel: 'feature',
  mappingNote: 'GitHub Issue maps to SpecWeave Feature'
}
```

### 3. Feature File Formatting

**Frontmatter Enhancement**:
```yaml
---
id: FS-031
title: "External Tool Status Synchronization"
externalTool:
  provider: github
  type: issue
  id: "#375"
  url: "https://github.com/anton-abyzov/specweave/issues/375"
---
```

**Title Enhancement**:
```markdown
# External Tool Status Synchronization (GITHUB Issue: #375)
```

**New Section**: External Tool Mapping
```markdown
## External Tool Mapping

**Mapped from**: GITHUB Issue [#375](https://github.com/anton-abyzov/specweave/issues/375)

> **Note**: GitHub Issue maps to SpecWeave Feature

This SpecWeave Feature corresponds to a issue in GITHUB. The hierarchy mapping is:
- **SpecWeave**: Feature (FS-031)
- **GITHUB**: Issue (#375)
```

### 4. User Story File Formatting

**Frontmatter Enhancement**:
```yaml
---
id: US-001
epic: FS-031
title: "Rich External Issue Content"
externalTool:
  provider: github
  type: issue
  id: "#375"
  url: "https://github.com/anton-abyzov/specweave/issues/375"
---
```

**Title Enhancement**:
```markdown
# US-001: Rich External Issue Content (GITHUB Issue: #375)
```

## Hierarchy Mapping Matrix

| SpecWeave | GitHub | JIRA | Azure DevOps | Mapping Note |
|-----------|--------|------|--------------|--------------|
| **Epic** | N/A | Epic | Epic | Strategic theme (optional in SpecWeave) |
| **Feature** | Issue | Epic | Feature | **DIVERGENCE**: JIRA Epic → SpecWeave Feature |
| **User Story** | N/A | Story | User Story | Detailed requirements |
| **Task** | Checkbox | Sub-task | Task | Implementation unit |

## Test Results

### Test 1: GitHub Mapping (Increment 0031)

**Source**: `metadata.json`
```json
{
  "github": {
    "issue": 375,
    "url": "https://github.com/anton-abyzov/specweave/issues/375"
  }
}
```

**Result**: ✅ SUCCESS
- Feature file shows: "(GITHUB Issue: #375)"
- External Tool Mapping section present
- Frontmatter includes external tool metadata

### Test 2: JIRA Mapping (Increment 0003)

**Source**: `metadata.json`
```json
{
  "jira": {
    "epicKey": "SCRUM-24",
    "synced": "2025-11-10T09:03:46.000Z"
  }
}
```

**Result**: ✅ SUCCESS
- Feature file shows: "(JIRA Epic: SCRUM-24)"
- External Tool Mapping section explains divergence
- Frontmatter includes JIRA epic metadata

### Test 3: ADO Mapping

**Status**: Not yet tested (no ADO-synced increments available)
**Expected**: Should show "(ADO Feature: 12345)" with same-level mapping note

## Key Benefits

### 1. Immediate Clarity
Users can see at a glance how SpecWeave's hierarchy maps to their external tool:
```
FS-031: External Tool Status Synchronization (JIRA Epic: AUTH-100)
```

### 2. LLM-Friendly Context
Frontmatter metadata helps LLMs understand the mapping:
```yaml
externalTool:
  provider: jira
  type: epic
  id: "AUTH-100"
```

### 3. Divergence Explanation
Clear note explains when hierarchies don't align:
```
JIRA Epic maps to SpecWeave Feature
```

### 4. Traceability
Direct links to external items:
```
Mapped from: JIRA Epic [AUTH-100](https://jira.atlassian.com/browse/AUTH-100)
```

## Files Modified

1. **`src/core/living-docs/types.ts`**
   - Added `ExternalToolMapping` interface
   - Updated `FeatureFile` and `UserStoryFile` types

2. **`src/core/living-docs/spec-distributor.ts`**
   - Added `detectExternalToolMapping()` method
   - Updated `generateFeatureFile()` to include mapping
   - Updated `formatFeatureFile()` to display mapping
   - Updated `formatUserStoryFile()` to display mapping

## Examples in Production

### GitHub Issue → SpecWeave Feature
```
File: .specweave/docs/internal/specs/_features/FS-031/FEATURE.md

# External Tool Status Synchronization (GITHUB Issue: #375)

## External Tool Mapping
**Mapped from**: GITHUB Issue [#375](https://github.com/...)
> **Note**: GitHub Issue maps to SpecWeave Feature
```

### JIRA Epic → SpecWeave Feature
```
File: .specweave/docs/internal/specs/_features/FS-003/FEATURE.md

# Intelligent Model Selection (JIRA Epic: SCRUM-24)

## External Tool Mapping
**Mapped from**: JIRA Epic [SCRUM-24](https://jira.atlassian.com/browse/SCRUM-24)
> **Note**: JIRA Epic maps to SpecWeave Feature
```

## Next Steps

1. ✅ **DONE**: Implement basic mapping detection
2. ✅ **DONE**: Add frontmatter metadata
3. ✅ **DONE**: Add title indicators
4. ✅ **DONE**: Add mapping explanation section
5. ⏭️ **TODO**: Test with Azure DevOps
6. ⏭️ **TODO**: Add user story-level external mappings (if needed)
7. ⏭️ **TODO**: Document in user guide

## Conclusion

Successfully implemented clear external tool hierarchy mapping indicators. Users now have immediate visibility into how SpecWeave's work items map to their external tool's hierarchy, making it much easier to understand and navigate the divergence between systems (especially JIRA Epic → SpecWeave Feature).

The implementation is:
- ✅ **LLM-friendly**: Rich frontmatter metadata
- ✅ **User-friendly**: Clear visual indicators in titles and headers
- ✅ **Traceable**: Direct links to external items
- ✅ **Documented**: Explains the mapping divergence
- ✅ **Extensible**: Easy to add new providers

---

**Status**: Implementation complete, ready for testing and documentation.

## Update: Follow-up Session (2025-11-14)

After implementation, re-tested the feature with real increments to verify the external tool mapping indicators work correctly in production.

### Production Verification

**Test Case 1: GitHub Mapping**
- Increment: 0031-external-tool-status-sync
- External: GitHub Issue #375
- Result: ✅ Title shows "(GITHUB Issue: #375)"
- Frontmatter: ✅ externalTool.provider = github
- Section: ✅ External Tool Mapping explains divergence

**Test Case 2: JIRA Mapping**
- Increment: 0003-intelligent-model-selection
- External: JIRA Epic SCRUM-24
- Result: ✅ Title shows "(JIRA Epic: SCRUM-24)"
- Frontmatter: ✅ externalTool.provider = jira
- Section: ✅ External Tool Mapping explains divergence

### Real-World Example (FS-031)

```markdown
---
id: FS-031
title: "External Tool Status Synchronization"
externalTool:
  provider: github
  type: issue
  id: "#375"
  url: "https://github.com/anton-abyzov/specweave/issues/375"
---

# External Tool Status Synchronization (GITHUB Issue: #375)

## External Tool Mapping

**Mapped from**: GITHUB Issue [#375](https://github.com/...)

> **Note**: GitHub Issue maps to SpecWeave Feature

This SpecWeave Feature corresponds to a issue in GITHUB. The hierarchy mapping is:
- **SpecWeave**: Feature (FS-031)
- **GITHUB**: Issue (#375)
```

### Final Status

✅ **COMPLETE**: External tool hierarchy mapping indicators working in production
✅ **TESTED**: GitHub and JIRA providers verified
✅ **DOCUMENTED**: Implementation report created
⏭️ **TODO**: Test Azure DevOps when data available
⏭️ **TODO**: Add to user documentation
⏭️ **TODO**: Reference in ADR-0032

---

**Implementation verified and working as designed.**
