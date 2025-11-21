# ADR-0054: Azure DevOps Area Path Mapping (Hierarchical Sub-Projects)

**Date**: 2025-11-21
**Status**: Accepted

## Context

Azure DevOps uses **hierarchical area paths** to organize work across teams and sub-teams. This is fundamentally different from JIRA's flat project structure.

**ADO Area Path Example**:
```
Platform
├── Backend
│   ├── API
│   ├── Database
│   └── Services
├── Frontend
│   ├── Web
│   └── Mobile
└── Infrastructure
    ├── DevOps
    └── Security
```

**Problem**:
- SpecWeave currently maps 1 JIRA project → 1 SpecWeave project folder
- ADO has 1 project with 10+ area paths (how to map?)
- Users want flexibility: map top-level only (3 folders) OR full tree (10 folders)

**Requirements**:
- Support ADO hierarchical area paths
- User chooses granularity (top-level, two-level, full tree)
- Bidirectional sync (ADO ↔ SpecWeave)
- Automatic folder creation based on area paths
- Handle area path renames/deletions

## Decision

Implement **area path mapping with user-selectable granularity**:

### Mapping Options

**Option 1: Top-Level Only** (Default)
- Map only first-level area paths to SpecWeave projects
- Example: `Platform/Backend` → `.specweave/docs/internal/specs/backend/`
- Result: 3 project folders (Backend, Frontend, Infrastructure)
- **Use Case**: Small teams, simple organization

**Option 2: Two-Level**
- Map two-level area paths to SpecWeave projects
- Example: `Platform/Backend/API` → `.specweave/docs/internal/specs/backend-api/`
- Result: 8 project folders (Backend-API, Backend-Database, Frontend-Web, etc.)
- **Use Case**: Medium teams, moderate granularity

**Option 3: Full Tree**
- Map ALL area paths (including nested) to SpecWeave projects
- Example:
  - `Platform` → `.specweave/docs/internal/specs/platform/`
  - `Platform/Backend` → `.specweave/docs/internal/specs/platform-backend/`
  - `Platform/Backend/API` → `.specweave/docs/internal/specs/platform-backend-api/`
- Result: 10 project folders (all area paths)
- **Use Case**: Large orgs, maximum granularity

**Option 4: Custom Selection**
- User manually selects specific area paths from tree
- Checkbox UI with tree visualization
- **Use Case**: Non-standard hierarchies, mixed granularity

### Area Path to Project ID Conversion

**Naming Convention**: `kebab-case` (consistent with SpecWeave naming)

**Examples**:
| Area Path | Project ID |
|-----------|------------|
| `Platform/Backend` | `backend` |
| `Platform/Backend/API` | `backend-api` |
| `Platform/Frontend/Web` | `frontend-web` |
| `Platform/Infrastructure/DevOps` | `infrastructure-devops` |
| `Platform` | `platform` |

**Algorithm**:
```typescript
function mapToProjectId(areaPath: string): string {
  // Remove root (Platform)
  const parts = areaPath.split('/').slice(1);

  // Convert to kebab-case
  return parts
    .map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .join('-');
}
```

### Init Flow Integration

```
specweave init → Azure DevOps setup
  ↓
1. Prompt for ADO credentials (PAT)
  ↓
2. Fetch area paths (recursive tree, depth=10)
   API: GET /_apis/wit/classificationnodes/areas?$depth=10
  ↓
3. Show granularity prompt
   ┌─────────────────────────────────────────────┐
   │ How would you like to map area paths?      │
   │                                             │
   │ 1. 📁 Top-level only (3 projects)          │
   │ 2. 📁📁 Two-level (8 projects)              │
   │ 3. 📁🌳 Full tree (10 projects)             │
   │ 4. ✏️  Custom (select specific paths)      │
   └─────────────────────────────────────────────┘
  ↓
4. Create project folders based on selection
   .specweave/docs/internal/specs/backend/
   .specweave/docs/internal/specs/frontend/
   .specweave/docs/internal/specs/infrastructure/
  ↓
5. Save area path mapping to .env
   ADO_AREA_PATH_GRANULARITY=top-level
   ADO_PROJECTS=backend,frontend,infrastructure
   ADO_AREA_PATH_BACKEND=Platform/Backend
   ADO_AREA_PATH_FRONTEND=Platform/Frontend
   ADO_AREA_PATH_INFRASTRUCTURE=Platform/Infrastructure
```

### Bidirectional Sync

**ADO → SpecWeave** (New area path created in ADO):
- Detect new area path during sync
- Prompt: "New area path detected: Platform/Backend/Microservices. Create SpecWeave project? (Y/n)"
- Create folder: `.specweave/docs/internal/specs/backend-microservices/`
- Update `.env`: `ADO_AREA_PATH_BACKEND_MICROSERVICES=Platform/Backend/Microservices`

**SpecWeave → ADO** (New project created in SpecWeave):
- Detect new project folder during sync
- Prompt: "New project folder: backend-microservices/. Create ADO area path? (Y/n)"
- Create area path: `Platform/Backend/Microservices`
- Update `.env`: `ADO_AREA_PATH_BACKEND_MICROSERVICES=Platform/Backend/Microservices`

### Area Path Renames

**Scenario**: User renames `Platform/Backend/API` → `Platform/Backend/REST` in ADO

**Detection**:
- Store area path ID (not name) in `.env`
- Compare ID on sync (ID unchanged, name changed)
- Detect rename

**Prompt**:
```
⚠️  Area path renamed in Azure DevOps:
   Old: Platform/Backend/API
   New: Platform/Backend/REST

Would you like to update the SpecWeave project folder?
  1. Yes, rename backend-api/ → backend-rest/
  2. No, keep backend-api/ (manual mapping)
```

**Action**:
- If Yes: Rename folder, update `.env`
- If No: Keep existing folder, log discrepancy

## Alternatives Considered

### Alternative 1: Flat Mapping (Ignore Hierarchy)
**Approach**: Map all area paths to flat project list (no hierarchy)

**Pros**:
- Simpler implementation (no tree parsing)
- Consistent with JIRA (flat projects)

**Cons**:
- ❌ **Loses organizational context** (Backend/API vs. Frontend/API becomes "api-backend" and "api-frontend")
- ❌ **Naming conflicts** (multiple "API" area paths)
- ❌ **Doesn't match ADO mental model** (users think in hierarchy)

**Why Not**: ADO users expect hierarchical organization. Flat mapping loses context.

### Alternative 2: Always Use Full Tree (No Granularity Choice)
**Approach**: Always map all area paths (no user choice)

**Pros**:
- Simpler (no granularity prompt)
- Maximum granularity (every area path mapped)

**Cons**:
- ❌ **Overwhelming for small teams** (10+ project folders for 3-team org)
- ❌ **No flexibility** (user can't choose simpler mapping)
- ❌ **Noise** (many projects = harder navigation)

**Why Not**: Flexibility is important. Small teams want top-level only. Large teams want full tree.

### Alternative 3: Automatic Granularity (Based on Area Path Count)
**Logic**:
- If ≤ 5 area paths → Full tree
- If 6-20 area paths → Two-level
- If > 20 area paths → Top-level only

**Pros**:
- Automatic (no user prompt)
- Adaptive to org size

**Cons**:
- ❌ **No user control** (what if user wants full tree for 30 area paths?)
- ❌ **Complex logic** (hard to understand why it chose a specific granularity)
- ❌ **Inconsistent** (different orgs get different defaults)

**Why Not**: Explicit user choice is clearer. Users should control granularity.

### Alternative 4: No Area Path Support (ADO = Single Project)
**Approach**: Treat ADO like JIRA (1 project → 1 SpecWeave folder)

**Pros**:
- Simplest implementation (reuse JIRA logic)
- No new code needed

**Cons**:
- ❌ **Ignores ADO's core feature** (area paths)
- ❌ **Poor UX for large ADO orgs** (all work items in single project)
- ❌ **Doesn't match user expectations** (ADO users expect area path mapping)

**Why Not**: ADO area paths are fundamental to ADO workflow. Must support them.

## Consequences

### Positive
- ✅ **ADO-specific feature** (addresses unique ADO hierarchy)
- ✅ **Flexibility** (user chooses granularity)
- ✅ **Scalability** (supports 10+ area paths or 100+ area paths)
- ✅ **Bidirectional sync** (ADO ↔ SpecWeave)
- ✅ **Rename handling** (detects and prompts for renames)
- ✅ **Consistent naming** (kebab-case project IDs)

### Negative
- ❌ **ADO-only complexity** (JIRA doesn't need this)
- ❌ **Area path tree parsing** (recursive API calls)
- ❌ **Rename detection complexity** (must track IDs)
- ❌ **Granularity prompt** (extra step during init)

### Risks & Mitigations

**Risk 1: Deep Area Path Trees (10+ Levels)**
- **Problem**: Organization with 100+ area paths is overwhelming
- **Mitigation**:
  - Default to "top-level" granularity (safe choice)
  - Show counts in prompt (helps user decide)
  - Support custom selection (manual checkbox)

**Risk 2: Area Path Renames (Sync Breaks)**
- **Problem**: ADO area path renamed → SpecWeave project ID no longer matches
- **Mitigation**:
  - Store ADO area path ID (not name) in `.env`
  - Detect renames via ID comparison
  - Prompt user: "Area path renamed: Backend/API → Backend/REST. Update SpecWeave project? (Y/n)"

**Risk 3: Area Path Deletions (Orphaned Projects)**
- **Problem**: ADO area path deleted → SpecWeave project folder remains
- **Mitigation**:
  - Detect deletion during sync (area path ID no longer exists)
  - Prompt: "Area path deleted in ADO: Backend/Legacy. Archive SpecWeave project? (Y/n)"
  - If Yes: Move to `.specweave/archive/backend-legacy/`

**Risk 4: Naming Conflicts (Same Name, Different Paths)**
- **Problem**: `Frontend/API` and `Backend/API` → both map to "api" (conflict)
- **Mitigation**:
  - Include parent in project ID: `frontend-api` and `backend-api`
  - Collision detection: If duplicate ID, append `-2`, `-3`, etc.
  - Warn user: "Project ID collision detected: backend-api-2"

## Implementation Notes

### Area Path API Endpoint

**Azure DevOps**:
```
GET https://dev.azure.com/{org}/{project}/_apis/wit/classificationnodes/areas?$depth=10

Response:
{
  "id": 1,
  "name": "Platform",
  "hasChildren": true,
  "children": [
    {
      "id": 2,
      "name": "Backend",
      "path": "\\Platform\\Backend",
      "hasChildren": true,
      "children": [...]
    }
  ]
}
```

### Area Path Tree Structure

```typescript
export interface AreaPathNode {
  id: number;         // ADO area path ID (for rename detection)
  name: string;       // Display name ("Backend")
  path: string;       // Full path ("Platform/Backend/API")
  level: number;      // 0 = root, 1 = top-level, 2 = two-level
  children: AreaPathNode[];
}
```

### Granularity Flattening

```typescript
function flattenAreaPaths(
  root: AreaPathNode,
  granularity: 'top-level' | 'two-level' | 'full-tree'
): AreaPathNode[] {
  switch (granularity) {
    case 'top-level':
      return getNodesByLevel(root, 1);  // Level 1 only

    case 'two-level':
      return getNodesByLevel(root, 2);  // Levels 1-2

    case 'full-tree':
      return getAllNodes(root);  // All levels
  }
}
```

### .env Configuration

```bash
# ADO Area Path Mapping
ADO_STRATEGY=project-per-team
ADO_AREA_PATH_GRANULARITY=top-level
ADO_PROJECTS=backend,frontend,infrastructure

# Area Path Mappings (ID for rename detection)
ADO_AREA_PATH_BACKEND_ID=2
ADO_AREA_PATH_BACKEND=Platform/Backend
ADO_AREA_PATH_FRONTEND_ID=3
ADO_AREA_PATH_FRONTEND=Platform/Frontend
ADO_AREA_PATH_INFRASTRUCTURE_ID=4
ADO_AREA_PATH_INFRASTRUCTURE=Platform/Infrastructure
```

## Related Decisions

- **ADR-0050**: Three-Tier Dependency Loading (area paths are Tier 2 dependencies)
- **ADR-0052**: Smart Pagination (applies to area path loading)
- **ADR-0049**: Universal Hierarchy Mapping (ADO area paths extend hierarchy mapper)

## References

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md`
- **User Story**: `.specweave/docs/internal/specs/specweave/FS-048/us-006-ado-area-path-mapping.md`
- **ADO API Docs**: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/classification-nodes/get-classification-nodes
- **Existing Code**: `src/integrations/ado/ado-client.ts` (ADO API client)
