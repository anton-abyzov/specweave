# ULTRATHINK: Broken Spec Links Analysis & Solution

**Date**: 2025-11-16
**Increment**: 0039-ultra-smart-next-command
**Issue**: Spec files reference non-existent SPEC-XXXX links instead of proper FS-XXX living docs structure

---

## Executive Summary

**Problem**: Increment 0039 spec.md contains 5 broken links referencing `SPEC-0039` format that don't exist in living docs.

**Root Cause**: Outdated instructions in `increment-planner` skill and `PM` agent still tell agents to use the OLD format (`spec-{number}-{name}.md`) instead of the NEW format (`_features/FS-{number}/FEATURE.md`).

**Impact**:
- ❌ Links in spec.md are broken (404)
- ❌ Living docs sync was never run for increment 0039
- ❌ No FS-039 folder exists in living docs
- ❌ Future increments will have same problem until instructions are updated

**Solution**:
1. Fix increment 0039 spec.md links (5 replacements)
2. Update increment-planner and PM agent instructions
3. Run living docs sync to create FS-039 structure
4. Verify all links work

---

## Detailed Analysis

### 1. Current Broken State

#### **Increment 0039 Broken Links**

**File**: `.specweave/increments/0039-ultra-smart-next-command/spec.md`

**5 Broken References**:

1. **Line 17** - Header link:
   ```markdown
   **See Living Spec**: [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md)
   ```
   **Problem**: File doesn't exist at `docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md`

2. **Line 19** - Description:
   ```markdown
   This spec.md is a temporary reference for increment 0039. The permanent source of truth is the living spec at `.specweave/docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md`.
   ```
   **Problem**: Same non-existent path

3. **Line 333** - Functional requirements link:
   ```markdown
   See [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md#functional-requirements) for complete FR list.
   ```
   **Problem**: Broken link with anchor

4. **Line 347** - Non-functional requirements link:
   ```markdown
   See [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md#non-functional-requirements) for complete NFR list.
   ```
   **Problem**: Broken link with anchor

5. **Line 411** - Implementation notes link:
   ```markdown
   - **Living Spec**: [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md)
   ```
   **Problem**: Broken link

#### **Missing Living Docs Structure**

**Expected but doesn't exist**:
```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-039/                          ❌ MISSING
│       └── FEATURE.md                   ❌ MISSING
└── specweave/
    └── FS-039/                          ❌ MISSING
        ├── README.md                    ❌ MISSING
        └── us-*.md files                ❌ MISSING
```

---

### 2. Correct Format (How It Should Be)

#### **Reference: Increment 0038 (Correct Example)**

**File**: `.specweave/increments/0038-serverless-architecture-intelligence/spec.md`

**Line 16** - Correct link format:
```markdown
**See Living Spec**: [FS-038](../../docs/internal/specs/_features/FS-038/FEATURE.md)
```

**Actual files exist**:
```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-038/                          ✅ EXISTS
│       └── FEATURE.md                   ✅ EXISTS (530 lines)
└── specweave/
    └── FS-038/                          ✅ EXISTS
        ├── README.md                    ✅ EXISTS
        ├── us-001-*.md                  ✅ EXISTS
        ├── us-002-*.md                  ✅ EXISTS
        └── ...                          ✅ EXISTS
```

#### **FEATURE.md Structure**

**File**: `.specweave/docs/internal/specs/_features/FS-038/FEATURE.md`

**Lines 1-11** - YAML frontmatter:
```yaml
---
id: FS-038
title: "Serverless Architecture Intelligence"
type: feature
status: planning
priority: P1
created: 2025-11-16
lastUpdated: 2025-11-16T00:00:00.000Z
projects: ["specweave"]
sourceIncrement: 0038-serverless-architecture-intelligence
---
```

**Line 21** - Bidirectional link back to increment:
```markdown
This feature was created from increment: [`0038-serverless-architecture-intelligence`](../../../../../increments/0038-serverless-architecture-intelligence)
```

---

### 3. Root Cause: Outdated Instructions

#### **Problem 1: increment-planner Skill**

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Line 233** - OLD format instruction:
```markdown
- Specs go to: `{projectManager.getSpecsPath()}/spec-{number}-{name}.md`
```

**Line 275** - OLD format instruction:
```markdown
- Create at: {projectManager.getSpecsPath()}/spec-{number}-{name}.md
  (This resolves to specs/{activeProject}/ with FLATTENED structure v0.16.11+)
```

**Line 303** - OLD reference format:
```markdown
- OR it can just reference the spec: "See SPEC-{number}-{name} for complete requirements"
```

**Problem**: Tells PM agent to create `spec-{number}-{name}.md` files and reference them as `SPEC-{number}`

---

#### **Problem 2: PM Agent**

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Line 303** - OLD format instruction:
```markdown
Location: .specweave/docs/internal/specs/spec-####-{name}.md
```

**Lines 402-410** - OLD format examples:
```markdown
3. **Use CORRECT flattened path** (v0.16.11+):
   - ✅ **CORRECT**: `.specweave/docs/internal/specs/{project-id}/spec-{number}-{name}.md`
   - ❌ **WRONG**: `.specweave/docs/internal/projects/{project-id}/specs/...` (OLD nested structure)

**Examples**:
- Single project: `.specweave/docs/internal/specs/default/spec-0001-user-authentication.md`
- Backend project: `.specweave/docs/internal/specs/backend/spec-0002-api-auth.md`
- Frontend project: `.specweave/docs/internal/specs/frontend/spec-0003-dark-mode.md`
- Parent repo: `.specweave/docs/internal/specs/_parent/spec-0004-system-architecture.md`
```

**Problem**: Tells PM agent to create flat `.md` files in project folders, but the ACTUAL system uses:
- `_features/FS-{number}/FEATURE.md` for feature overviews
- `{project}/FS-{number}/us-*.md` for user stories
- Folder structure, not flat files

---

### 4. Actual Living Docs Structure (v0.18.0+)

#### **Three-Layer Architecture**

```
.specweave/docs/internal/specs/
│
├── _features/                           # Layer 1: Cross-project feature overviews
│   ├── FS-023/
│   │   └── FEATURE.md                   # Feature summary (what/why/value)
│   ├── FS-028/
│   │   └── FEATURE.md
│   ├── FS-031/
│   │   └── FEATURE.md
│   ├── FS-033/
│   │   └── FEATURE.md
│   ├── FS-035/
│   │   └── FEATURE.md
│   ├── FS-037/
│   │   └── FEATURE.md
│   └── FS-038/
│       └── FEATURE.md
│
└── specweave/                           # Layer 2: Project-specific user stories
    ├── FS-023/
    │   ├── README.md                    # Project context
    │   ├── us-001-*.md                  # User story details
    │   ├── us-002-*.md
    │   └── ...
    ├── FS-028/
    │   ├── README.md
    │   └── us-*.md
    ├── FS-031/
    │   ├── README.md
    │   ├── us-001-rich-external-issue-content.md
    │   ├── us-002-task-level-mapping-traceability.md
    │   ├── us-003-status-mapping-configuration.md
    │   ├── us-004-bidirectional-status-sync.md
    │   ├── us-005-user-prompts-on-completion.md
    │   ├── us-006-conflict-resolution.md
    │   └── us-007-multi-tool-workflow-support.md
    └── ...

# Layer 3: Implementation details (tasks, code)
.specweave/increments/                   # Temporary work folders
├── 0031-external-tool-status-sync/
│   ├── spec.md                          # Can duplicate or reference FEATURE.md
│   ├── plan.md
│   ├── tasks.md                         # Source of truth for tasks
│   └── ...
└── ...
```

#### **ID Format: FS-XXX (Not SPEC-XXXX)**

**Current active features**:
- ✅ FS-023, FS-028, FS-031, FS-033, FS-035, FS-037, FS-038
- ❌ FS-039 (missing - needs to be created)

**OLD format (deprecated v0.17.x)**:
- SPEC-0001, SPEC-0002, etc.
- Flat files: `spec-0001-name.md`

**NEW format (v0.18.0+)**:
- FS-001, FS-002, etc.
- Folder structure: `_features/FS-XXX/FEATURE.md`

---

### 5. Link Format Reference

#### **Increment spec.md → Feature Overview**

**From**: `.specweave/increments/{number}-{name}/spec.md`
**To**: `.specweave/docs/internal/specs/_features/FS-{XXX}/FEATURE.md`

**Relative path**: `../../docs/internal/specs/_features/FS-{XXX}/FEATURE.md`

**Format**:
```markdown
**See Living Spec**: [FS-{XXX}](../../docs/internal/specs/_features/FS-{XXX}/FEATURE.md)
```

**Example (0038)**:
```markdown
**See Living Spec**: [FS-038](../../docs/internal/specs/_features/FS-038/FEATURE.md)
```

**Example (0039 - what it should be)**:
```markdown
**See Living Spec**: [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md)
```

---

#### **Feature Overview → User Stories**

**From**: `.specweave/docs/internal/specs/_features/FS-{XXX}/FEATURE.md`
**To**: `.specweave/docs/internal/specs/{project}/FS-{XXX}/us-{id}-{slug}.md`

**Relative path**: `../../{project}/FS-{XXX}/us-{id}-{slug}.md`

**Format**:
```markdown
- [US-001: Title](../../{project}/FS-{XXX}/us-001-slug.md)
```

**Example (FS-031)**:
```markdown
- [US-001: Rich External Issue Content](../../specweave/FS-031/us-001-rich-external-issue-content.md)
```

---

#### **User Story → Feature Overview**

**From**: `.specweave/docs/internal/specs/{project}/FS-{XXX}/us-*.md`
**To**: `.specweave/docs/internal/specs/_features/FS-{XXX}/FEATURE.md`

**Relative path**: `../../_features/FS-{XXX}/FEATURE.md`

**Format**:
```markdown
**Feature**: [FS-{XXX}](../../_features/FS-{XXX}/FEATURE.md)
```

**Example (US-001 in FS-031)**:
```markdown
**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)
```

---

#### **User Story → Increment**

**From**: `.specweave/docs/internal/specs/{project}/FS-{XXX}/us-*.md`
**To**: `.specweave/increments/{number}-{name}/tasks.md`

**Relative path**: `../../../../../increments/{number}-{name}/tasks.md`

**Format**:
```markdown
**Increment**: [{number}-{name}](../../../../../increments/{number}-{name}/tasks.md)
```

**Example (US-001 in FS-031)**:
```markdown
**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)
```

---

#### **Task (in tasks.md) → User Story**

**From**: `.specweave/increments/{number}-{name}/tasks.md`
**To**: `.specweave/docs/internal/specs/{project}/FS-{XXX}/us-{id}-{slug}.md`

**Relative path**: `../../docs/internal/specs/{project}/FS-{XXX}/us-{id}-{slug}.md`

**Format**:
```markdown
**User Story**: [US-{id}: Title](../../docs/internal/specs/{project}/FS-{XXX}/us-{id}-{slug}.md)
```

**Example (Task in increment 0031)**:
```markdown
**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/specweave/FS-031/us-001-rich-external-issue-content.md)
```

---

### 6. How Living Docs Sync Works

#### **Code Location**: `src/core/living-docs/spec-distributor.ts`

**Line 1015-1020** - Feature link generation:
```typescript
const featureRelativePath = `../../_features/${userStory.epic}/FEATURE.md`;
lines.push(`**Feature**: [${userStory.epic}](${featureRelativePath})`);
```

**Line 1797** - User story link generation in tasks.md:
```typescript
const newRelativePath = `../../docs/internal/specs/${project}/${featureMapping.featureId}/${this.generateUserStoryFilename(story.id, story.title)}`;
```

**Key classes**:
1. **SpecDistributor** - Distributes increment content to living docs
2. **HierarchyMapper** - Maps increments to FS-XXX IDs
3. **FeatureIDManager** - Assigns unique FS-XXX IDs

**Process**:
1. User runs `/specweave:sync-docs update`
2. SpecDistributor reads increment spec.md
3. HierarchyMapper assigns FS-XXX ID (if not already assigned)
4. SpecDistributor creates:
   - `_features/FS-XXX/FEATURE.md` (feature overview)
   - `{project}/FS-XXX/README.md` (project context)
   - `{project}/FS-XXX/us-*.md` (user stories)
5. Bidirectional links are generated automatically

**Metadata tracking** - `metadata.json` stores FS-XXX mapping:
```json
{
  "featureId": "FS-039",
  "featureTitle": "Ultra-Smart Next Command - Intelligent Workflow Orchestrator"
}
```

---

### 7. Why Increment 0039 Has Broken Links

**Timeline**:

1. **User requested**: `/specweave:increment "Ultra-Smart Next Command"`
2. **PM agent loaded**: Used `increment-planner` skill instructions
3. **Instructions said** (line 303): `"See SPEC-{number}-{name} for complete requirements"`
4. **PM agent created**:
   - `.specweave/increments/0039-ultra-smart-next-command/spec.md`
   - With broken links to `SPEC-0039`
5. **Living docs sync**: NEVER RUN
6. **Result**:
   - ❌ No FS-039 folder exists
   - ❌ No FEATURE.md created
   - ❌ Links in spec.md point to non-existent files

**Why PM agent followed outdated instructions**:
- PM agent is designed to follow skill instructions exactly
- increment-planner skill has OLD format instructions (v0.17.x era)
- PM agent has no way to know these instructions are outdated
- PM agent trusts skill content as source of truth

---

### 8. Other Increments With Broken Links

**Search results**: Only increment 0039 has SPEC-XXXX broken links

**Verified correct format**:
- ✅ Increment 0023 → FS-023
- ✅ Increment 0028 → FS-028
- ✅ Increment 0031 → FS-031
- ✅ Increment 0033 → FS-033
- ✅ Increment 0035 → FS-035
- ✅ Increment 0037 → FS-037
- ✅ Increment 0038 → FS-038

**Archived increments**:
- `.specweave/increments/_archive/0027-multi-repo-github-sync/spec.md` has `SPEC-0027`
- This is CORRECT - it's archived from v0.17.x era when SPEC-XXXX was the format

---

## Solution

### Step 1: Fix Increment 0039 Spec.md Links

**File**: `.specweave/increments/0039-ultra-smart-next-command/spec.md`

**5 Replacements**:

1. **Line 17**:
   ```diff
   - **See Living Spec**: [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md)
   + **See Living Spec**: [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md)
   ```

2. **Line 19**:
   ```diff
   - This spec.md is a temporary reference for increment 0039. The permanent source of truth is the living spec at `.specweave/docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md`.
   + This spec.md is a temporary reference for increment 0039. The permanent source of truth is the living spec at `.specweave/docs/internal/specs/_features/FS-039/FEATURE.md`.
   ```

3. **Line 333**:
   ```diff
   - See [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md#functional-requirements) for complete FR list.
   + See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#functional-requirements) for complete FR list.
   ```

4. **Line 347**:
   ```diff
   - See [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md#non-functional-requirements) for complete NFR list.
   + See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#non-functional-requirements) for complete NFR list.
   ```

5. **Line 359** (approximate):
   ```diff
   - See [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md#success-criteria) for complete metrics.
   + See [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md#success-criteria) for complete metrics.
   ```

6. **Line 411**:
   ```diff
   - - **Living Spec**: [SPEC-0039](../../docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md)
   + - **Living Spec**: [FS-039](../../docs/internal/specs/_features/FS-039/FEATURE.md)
   ```

---

### Step 2: Update increment-planner Skill Instructions

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**3 Sections to Update**:

**Update 1 - Line 233**:
```diff
**In PM Agent Instructions**:
- DO NOT hardcode `.specweave/docs/internal/specs/`
- USE ProjectManager to get correct path for active project
- - Specs go to: `{projectManager.getSpecsPath()}/spec-{number}-{name}.md`
+ - Feature overviews go to: `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
+ - User stories go to: `.specweave/docs/internal/specs/{project}/FS-{number}/us-{id}-{slug}.md`
```

**Update 2 - Lines 272-280**:
```diff
  1. Spec (living docs - SOURCE OF TRUTH, permanent):
     - IMPORTANT: Use ProjectManager to get correct path for active project
-     - Create at: {projectManager.getSpecsPath()}/spec-{number}-{name}.md
-       (This resolves to specs/{activeProject}/ with FLATTENED structure v0.16.11+)
+     - Living docs are created via /specweave:sync-docs update (not manually)
+     - Structure (v0.18.0+):
+       - Feature overview: `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
+       - User stories: `.specweave/docs/internal/specs/{project}/FS-{number}/us-*.md`
     - This is the COMPLETE, PERMANENT source of truth
     - Include ALL of:
```

**Update 3 - Line 303**:
```diff
  3. Increment spec.md (optional, can duplicate living spec):
     - Create .specweave/increments/{number}-{name}/spec.md
     - This CAN duplicate content from living spec.md (temporary reference - that's OK!)
-     - OR it can just reference the spec: "See SPEC-{number}-{name} for complete requirements"
+     - OR it can just reference the spec: "See [FS-{number}](../../docs/internal/specs/_features/FS-{number}/FEATURE.md) for complete requirements"
```

---

### Step 3: Update PM Agent Instructions

**File**: `plugins/specweave/agents/pm/AGENT.md`

**2 Sections to Update**:

**Update 1 - Line 303**:
```diff
  console.log('  ✅ Increment specs reference it (avoid duplication)');
  console.log('');
-   console.log('Location: .specweave/docs/internal/specs/spec-####-{name}.md');
-   console.log('⚠️  CRITICAL: Specs are FILES, not directories!');
+   console.log('Location: .specweave/docs/internal/specs/_features/FS-####/FEATURE.md');
+   console.log('⚠️  CRITICAL: Living docs are created via /specweave:sync-docs update!');
  console.log('');
```

**Update 2 - Lines 400-411**:
```diff
-3. **Use CORRECT flattened path** (v0.16.11+):
-   - ✅ **CORRECT**: `.specweave/docs/internal/specs/{project-id}/spec-{number}-{name}.md`
-   - ❌ **WRONG**: `.specweave/docs/internal/projects/{project-id}/specs/...` (OLD nested structure)
+3. **Use CORRECT three-layer structure** (v0.18.0+):
+   - ✅ **CORRECT**: `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md` (cross-project)
+   - ✅ **CORRECT**: `.specweave/docs/internal/specs/{project}/FS-{number}/us-*.md` (project-specific)
+   - ❌ **WRONG**: `.specweave/docs/internal/specs/{project}/spec-{number}-{name}.md` (OLD v0.17.x)

**Examples**:
-   - Single project: `.specweave/docs/internal/specs/default/spec-0001-user-authentication.md`
-   - Backend project: `.specweave/docs/internal/specs/backend/spec-0002-api-auth.md`
-   - Frontend project: `.specweave/docs/internal/specs/frontend/spec-0003-dark-mode.md`
-   - Parent repo: `.specweave/docs/internal/specs/_parent/spec-0004-system-architecture.md`
+   - Feature overview: `.specweave/docs/internal/specs/_features/FS-001/FEATURE.md`
+   - Backend user story: `.specweave/docs/internal/specs/backend/FS-002/us-001-api-auth.md`
+   - Frontend user story: `.specweave/docs/internal/specs/frontend/FS-003/us-001-dark-mode.md`
+   - Cross-project feature: `.specweave/docs/internal/specs/_features/FS-004/FEATURE.md`

-   **CRITICAL**: Specs are **FILES**, not directories! The spec file itself contains all content.
+   **CRITICAL**: Living docs are created via `/specweave:sync-docs update` - NOT manually created!
```

---

### Step 4: Create FS-039 Living Docs Structure

**Run living docs sync**:
```bash
/specweave:sync-docs update
```

**Expected output**:
```
✅ Created .specweave/docs/internal/specs/_features/FS-039/FEATURE.md
✅ Created .specweave/docs/internal/specs/specweave/FS-039/README.md
✅ Created 12 user story files in .specweave/docs/internal/specs/specweave/FS-039/
✅ Updated metadata.json with featureId: FS-039
```

---

### Step 5: Verification Checklist

**After all fixes**:

- [ ] Increment 0039 spec.md has no SPEC-0039 references
- [ ] Increment 0039 spec.md has FS-039 references
- [ ] FS-039 folder exists in `_features/`
- [ ] FS-039/FEATURE.md file exists
- [ ] FS-039 folder exists in `specweave/`
- [ ] User story files exist in `specweave/FS-039/`
- [ ] All links in spec.md resolve correctly (no 404)
- [ ] metadata.json has featureId: FS-039
- [ ] increment-planner skill uses FS-XXX format
- [ ] PM agent instructions use FS-XXX format
- [ ] No grep results for "SPEC-0039" in non-archived increments

---

## Impact Analysis

### Increments Affected

**Direct impact**:
- ✅ Increment 0039 (5 broken links)

**Indirect impact** (outdated instructions):
- ⚠️ increment-planner skill (affects future increments)
- ⚠️ PM agent (affects future planning)

**No impact**:
- ✅ Increments 0023, 0028, 0031, 0033, 0035, 0037, 0038 (already correct)
- ✅ Archived increments (legacy format is expected)

### Future Prevention

**After fixing instructions**:
- ✅ Future increments will use FS-XXX format
- ✅ PM agent will reference correct living docs paths
- ✅ No more broken SPEC-XXXX links

---

## Timeline

**Estimated time**: 15 minutes

1. **Fix spec.md** (5 min):
   - 5 search-and-replace operations
   - 1 file affected

2. **Update skills/agents** (5 min):
   - 2 files affected
   - ~10 line changes total

3. **Run sync-docs** (2 min):
   - Automatic FS-039 creation
   - Verify folder structure

4. **Verification** (3 min):
   - Test all links work
   - Check metadata.json
   - Grep for any remaining SPEC-XXXX

---

## References

### Working Examples

**Increment 0038** (correct FS-XXX format):
- Spec: `.specweave/increments/0038-serverless-architecture-intelligence/spec.md:16`
- Feature: `.specweave/docs/internal/specs/_features/FS-038/FEATURE.md`
- User stories: `.specweave/docs/internal/specs/specweave/FS-038/us-*.md`

**Increment 0031** (correct FS-XXX format):
- Spec: `.specweave/increments/0031-external-tool-status-sync/spec.md`
- Feature: `.specweave/docs/internal/specs/_features/FS-031/FEATURE.md`
- User stories: `.specweave/docs/internal/specs/specweave/FS-031/us-001-*.md` (7 files)

### Code References

**SpecDistributor** (link generation):
- `src/core/living-docs/spec-distributor.ts:1015-1020` (feature links)
- `src/core/living-docs/spec-distributor.ts:1797` (user story links)

**HierarchyMapper** (FS-XXX assignment):
- `src/core/living-docs/hierarchy-mapper.ts:245-280` (feature mapping)

**Outdated instructions**:
- `plugins/specweave/skills/increment-planner/SKILL.md:233,275,303`
- `plugins/specweave/agents/pm/AGENT.md:303,402-411`

---

## Conclusion

**Root cause**: Outdated instructions in PM tooling (increment-planner + PM agent)

**Fix complexity**: Low (search-and-replace + instruction updates)

**Risk**: Very low (only affects increment 0039 + future prevention)

**Testing**: Automated (link resolution + grep verification)

**Long-term benefit**: Future increments will have correct links from the start

---

**Next Steps**: Execute solution in order (Step 1 → Step 5)
