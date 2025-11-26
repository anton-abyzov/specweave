# ADR-0143: JIRA/ADO Multi-Level Project Mapping Architecture

## Status

Accepted

## Context

### Problem Statement

Current SpecWeave multi-project support has gaps for enterprise JIRA and Azure DevOps setups:

1. **GitHub multi-repo works well**: Each GitHub repository maps cleanly to a SpecWeave project
2. **JIRA/ADO have different organizational models**:
   - **JIRA**: Single project with multiple **boards** (Scrum, Kanban) per team
   - **ADO**: Single project with multiple **area paths** for teams/components

### Real-World Scenarios

**JIRA Example (Large Enterprise):**
```
JIRA Project: CORE
├── Frontend Board (Scrum)     → SpecWeave project: FE
├── Backend Board (Kanban)     → SpecWeave project: BE
├── Mobile Board (Scrum)       → SpecWeave project: MOBILE
└── Platform Board (Kanban)    → SpecWeave project: PLATFORM
```

**ADO Example (Enterprise):**
```
ADO Project: MyProduct
├── Area: MyProduct\Frontend   → SpecWeave project: FE
├── Area: MyProduct\Backend    → SpecWeave project: BE
├── Area: MyProduct\Mobile     → SpecWeave project: MOBILE
└── Area: MyProduct\DevOps     → SpecWeave project: DEVOPS
```

### Multi-Project User Stories

A critical requirement: User stories often span MULTIPLE projects:

**Example: US-001 "Implement OAuth Authentication"**
- **BE project**: OAuth API endpoints, token validation
- **FE project**: Login UI with OIDC integration
- **Shared project**: Common auth types, interfaces, utilities

## Decision

### 1. JIRA Board → SpecWeave Project Mapping

**New Configuration Pattern:**

```typescript
interface JiraConfig {
  domain: string;

  // Pattern 1: Single project (existing, backward compatible)
  projectKey?: string;

  // Pattern 2: Multiple projects (existing)
  projects?: string[];

  // Pattern 3: NEW - Single project with board-based teams
  boardMapping?: {
    projectKey: string;           // JIRA project (e.g., "CORE")
    boards: JiraBoardMapping[];   // Board → SpecWeave project
  };
}

interface JiraBoardMapping {
  boardId: number;                // JIRA board ID
  boardName: string;              // Display name (e.g., "Frontend Board")
  specweaveProject: string;       // SpecWeave project ID (e.g., "FE")
  keywords?: string[];            // Auto-classification keywords
}
```

### 2. ADO Area Path → SpecWeave Project Mapping

**New Configuration Pattern:**

```typescript
interface AdoConfig {
  organization: string;

  // Pattern 1: Single project (existing)
  project?: string;

  // Pattern 2: Multiple projects (existing)
  projects?: string[];

  // Pattern 3: Single project with area paths (enhanced)
  areaPaths?: string[];           // Simple list (existing)

  // Pattern 4: NEW - Area path → SpecWeave project mapping
  areaPathMapping?: {
    project: string;              // ADO project (e.g., "MyProduct")
    mappings: AdoAreaMapping[];   // Area → SpecWeave project
  };
}

interface AdoAreaMapping {
  areaPath: string;               // Full area path (e.g., "MyProduct\\Frontend")
  specweaveProject: string;       // SpecWeave project ID (e.g., "FE")
  keywords?: string[];            // Auto-classification keywords
}
```

### 3. Two-Level Directory Structure

**For JIRA/ADO with board/area mapping:**

```
.specweave/docs/internal/specs/
├── _epics/                       # Epic-level features (existing)
│
├── JIRA-CORE/                    # Level 1: External container (JIRA project)
│   ├── FE/                       # Level 2: SpecWeave project (board mapping)
│   │   ├── FS-001/
│   │   └── FS-002/
│   ├── BE/
│   │   └── FS-003/
│   └── MOBILE/
│       └── FS-004/
│
└── ADO-MyProduct/                # Level 1: External container (ADO project)
    ├── FE/                       # Level 2: SpecWeave project (area path)
    ├── BE/
    └── DEVOPS/
```

**For GitHub (unchanged):**
```
.specweave/docs/internal/specs/
├── my-frontend-repo/             # Direct mapping: 1 repo = 1 project
├── my-backend-repo/
└── my-mobile-repo/
```

### 4. Duplicate Project Name Prevention

**Problem:** Two ADO projects might have same area path names (e.g., both have "Frontend")

**Solution:** Composite key with external container prefix:

```typescript
function generateUniqueProjectId(
  externalContainer: string,      // "JIRA-CORE" or "ADO-MyProduct"
  localName: string               // "Frontend" or "BE"
): string {
  // Check for collision in existing projects
  const baseId = localName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // If collision detected, use prefixed version
  if (projectExists(baseId)) {
    return `${externalContainer}-${baseId}`.toLowerCase();
  }

  return baseId;
}
```

**Examples:**
- First project: `JIRA-CORE/Frontend` → `fe`
- Collision: `ADO-Other/Frontend` → `ado-other-fe`

### 5. Multi-Project User Stories in spec.md

**Enhanced spec.md frontmatter:**

```yaml
---
increment: 0001-oauth-implementation
feature_id: FS-001
status: active

# Single project (existing, backward compatible)
project: BE

# NEW: Multi-project user stories
projects:
  - id: BE
    scope: "OAuth API endpoints, token validation, session management"
  - id: FE
    scope: "Login UI with OIDC, token storage, logout flow"
  - id: Shared
    scope: "Common auth types, interfaces, JWT utilities"

# Cross-project dependencies (optional)
dependencies:
  - from: FE
    to: Shared
    reason: "FE uses auth types from Shared"
  - from: BE
    to: Shared
    reason: "BE uses JWT utilities from Shared"
---
```

### 6. Init Flow Changes

**JIRA Init (after project selection):**

```
📋 JIRA Project Organization

You selected project: CORE

How do you want to organize work items?

○ Single project (all work in CORE) [default for 1 team]
● Board-based teams (recommended for multiple teams)
○ Component-based teams

[Selected: Board-based teams]

🔍 Fetching boards from CORE...

Found 4 boards:
☑ Frontend Board (Scrum, 23 items) → FE
☑ Backend Board (Kanban, 45 items) → BE
☑ Mobile Board (Scrum, 12 items) → MOBILE
☐ Archive Board (Simple, 0 items) [deselected]

✓ Created SpecWeave projects: FE, BE, MOBILE
✓ Mapped to JIRA boards in project CORE
```

**ADO Init (after project selection):**

```
🔷 Azure DevOps Project Organization

You selected project: MyProduct

How do you want to organize work items?

○ Single project (all work at root level) [default for 1 team]
● Area path-based teams (recommended for enterprise)
○ Team-based organization

[Selected: Area path-based teams]

🔍 Fetching area paths from MyProduct...

Found 5 area paths:
☑ MyProduct\Frontend → FE
☑ MyProduct\Backend → BE
☑ MyProduct\Mobile → MOBILE
☐ MyProduct\Archive [deselected]
☐ MyProduct (root) [deselected]

✓ Created SpecWeave projects: FE, BE, MOBILE
✓ Mapped to ADO area paths in project MyProduct
```

### 7. Import Commands

**New slash commands:**

```bash
# Import additional boards from a JIRA project
/specweave-jira:import-boards --project CORE

# Import area paths from an ADO project
/specweave-ado:import-areas --project MyProduct

# General import that detects provider
/specweave:import-external --provider jira|ado|github
```

## Consequences

### Positive

1. **Enterprise support**: Large organizations with JIRA/ADO can use SpecWeave
2. **Team autonomy**: Each team's board/area maps to isolated SpecWeave project
3. **Flexible hierarchy**: Support both simple (1 project) and complex (N teams) setups
4. **Multi-project US**: User stories can span multiple projects naturally
5. **Clear sync targets**: Each SpecWeave project knows its external sync destination

### Negative

1. **Complexity**: Two-level directory structure adds cognitive load
2. **Migration**: Existing projects need migration if adopting board/area mapping
3. **Config size**: More configuration options to learn

### Neutral

1. **Backward compatible**: Single project mode unchanged
2. **Progressive disclosure**: Simple users don't see complex options

## Implementation Plan

### Phase 1: Type Definitions & Config
1. Update `JiraConfig` type with `boardMapping`
2. Update `AdoConfig` type with `areaPathMapping`
3. Add `projects` array to spec.md frontmatter type

### Phase 2: Init Flow
1. Add board discovery to JIRA init
2. Add area path discovery to ADO init
3. Create project mapping prompts

### Phase 3: Directory Structure
1. Implement two-level spec organization
2. Add duplicate prevention logic
3. Create migration utility for existing projects

### Phase 4: Commands & Sync
1. Create `/specweave-jira:import-boards`
2. Create `/specweave-ado:import-areas`
3. Update sync logic to use board/area targeting

### Phase 5: Multi-Project US
1. Update PM agent for multi-project awareness
2. Modify spec.md generation
3. Add cross-project dependency tracking

## References

- ADR-0016: Multi-Project External Sync Architecture
- ADR-0018: Strategy-Based Team Mapping
- ADR-0054: ADO Area Path Mapping
- ADR-0142: Umbrella Multi-Repo Support
