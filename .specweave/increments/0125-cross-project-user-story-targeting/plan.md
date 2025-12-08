# Implementation Plan: Cross-Project User Story Targeting

## Overview

Replace increment-level `activeProject` with per-User-Story project/board declarations, enabling proper multi-system sync for cross-cutting features.

## Phase 1: Data Model Changes (Foundation)

### 1.1 Extend UserStoryData Type

**File**: `src/core/living-docs/types.ts`

```typescript
export interface UserStoryData {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  // NEW: Per-US targeting
  project?: string;           // Target project (e.g., "frontend-app")
  board?: string;             // Target board for 2-level (e.g., "web-team")
  externalProvider?: string;  // Preferred provider: "github" | "jira" | "ado"
  // ... existing fields
}
```

### 1.2 Update spec.md Parser

**File**: `src/core/living-docs/sync-helpers/spec-parser.ts`

Add extraction of `**Project**:` and `**Board**:` from US sections:

```typescript
function extractUserStoryProject(usSection: string): { project?: string; board?: string } {
  const projectMatch = usSection.match(/\*\*Project\*\*:\s*([^\n]+)/i);
  const boardMatch = usSection.match(/\*\*Board\*\*:\s*([^\n]+)/i);
  return {
    project: projectMatch?.[1]?.trim(),
    board: boardMatch?.[1]?.trim()
  };
}
```

### 1.3 Add Project Mappings Schema

**File**: `src/core/schemas/project-mapping.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "projectMappings": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "github": {
            "type": "object",
            "properties": {
              "owner": { "type": "string" },
              "repo": { "type": "string" }
            }
          },
          "jira": {
            "type": "object",
            "properties": {
              "project": { "type": "string" },
              "board": { "type": "string" }
            }
          },
          "ado": {
            "type": "object",
            "properties": {
              "project": { "type": "string" },
              "areaPath": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

## Phase 2: Living Docs Multi-Project Sync

### 2.1 Create Cross-Project Sync Orchestrator

**File**: `src/core/living-docs/cross-project-sync.ts`

```typescript
export class CrossProjectSync {
  /**
   * Group user stories by target project
   */
  groupByProject(userStories: UserStoryData[], defaultProject: string): Map<string, UserStoryData[]> {
    const groups = new Map<string, UserStoryData[]>();

    for (const us of userStories) {
      const project = us.project || defaultProject;
      if (!groups.has(project)) {
        groups.set(project, []);
      }
      groups.get(project)!.push(us);
    }

    return groups;
  }

  /**
   * Sync increment to multiple project folders
   */
  async syncToMultipleProjects(
    incrementId: string,
    featureId: string,
    userStoryGroups: Map<string, UserStoryData[]>
  ): Promise<MultiProjectSyncResult> {
    const results: ProjectSyncResult[] = [];

    for (const [project, stories] of userStoryGroups) {
      const result = await this.syncProjectFolder(incrementId, featureId, project, stories);
      results.push(result);
    }

    // Create cross-references between project folders
    await this.createCrossReferences(featureId, userStoryGroups);

    return { projects: results };
  }
}
```

### 2.2 Update LivingDocsSync.syncIncrement()

**File**: `src/core/living-docs/living-docs-sync.ts`

Modify to use grouping:

```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // ... existing setup ...

  // NEW: Group USs by project
  const crossProjectSync = new CrossProjectSync(this.projectRoot);
  const groups = crossProjectSync.groupByProject(parsed.userStories, this.projectId);

  // Check if cross-project
  if (groups.size > 1) {
    this.logger.log(`📦 Cross-project increment detected: ${groups.size} projects`);
    return await this.syncMultiProject(incrementId, featureId, groups, options);
  }

  // Single project - existing logic
  // ...
}
```

### 2.3 Generate Cross-Reference Links

In each project's FEATURE.md, add:

```markdown
## Related Projects

This feature spans multiple projects:
- [frontend-app](../../frontend-app/FS-125/) - US-001: Login Form UI
- [backend-api](../../backend-api/FS-125/) - US-002: Auth API Endpoints
- [security-compliance](../../security-compliance/FS-125/) - US-004: Security Audit
```

## Phase 3: External Tool Multi-Target Sync

### 3.1 Update External Refs Structure

**File**: `src/core/types/increment-metadata.ts`

```typescript
export interface IncrementMetadata {
  id: string;
  // Deprecated: single external_ref
  external_ref?: ExternalRef;

  // NEW: per-US external refs
  external_refs?: Record<string, ExternalRef>;  // Key: US ID
}

export interface ExternalRef {
  provider: 'github' | 'jira' | 'ado';
  github?: { owner: string; repo: string; issue: number; url: string };
  jira?: { project: string; key: string; url: string };
  ado?: { project: string; id: number; url: string };
}
```

### 3.2 Create Multi-Target External Sync

**File**: `src/core/living-docs/external-sync-orchestrator.ts`

```typescript
export class ExternalSyncOrchestrator {
  /**
   * Sync USs to their respective external tools
   */
  async syncUserStories(
    incrementId: string,
    featureId: string,
    userStories: UserStoryData[],
    projectMappings: ProjectMappings
  ): Promise<ExternalSyncResult[]> {
    const results: ExternalSyncResult[] = [];

    // Group by project for batching
    const byProject = this.groupByProject(userStories);

    for (const [projectId, stories] of byProject) {
      const mapping = projectMappings[projectId];
      if (!mapping) {
        results.push({ projectId, status: 'skipped', reason: 'No mapping configured' });
        continue;
      }

      // Determine provider from mapping or US preference
      const provider = this.determineProvider(stories[0], mapping);

      // Sync batch to provider
      const syncResult = await this.syncToProvider(provider, projectId, stories, mapping);
      results.push(syncResult);
    }

    return results;
  }
}
```

### 3.3 Provider-Specific Sync Updates

**GitHub** (`src/external-tools/github/github-sync.ts`):
- Accept `owner` and `repo` per call (not global)
- Create issues in specified repo

**JIRA** (`src/external-tools/jira/jira-sync.ts`):
- Accept `project` and `board` per call
- Create issues in specified project

**ADO** (`src/external-tools/ado/ado-sync.ts`):
- Accept `project` and `areaPath` per call
- Create work items in specified area

## Phase 4: Increment Planner Updates

### 4.1 Cross-Cutting Detection

**File**: `src/utils/cross-cutting-detector.ts`

```typescript
const CROSS_CUTTING_PATTERNS = {
  multiTech: [
    /\b(react|vue|angular)\b.*\b(node|express|fastapi|django)\b/i,
    /\bfrontend\b.*\bbackend\b/i,
    /\bui\b.*\bapi\b/i
  ],
  multiTeam: [
    /\b(frontend|fe)\s+team\b/i,
    /\b(backend|be)\s+team\b/i,
    /\bsecurity\s+team\b/i,
    /\binfrastructure\b/i
  ],
  multiRepo: [
    /\bdeploy\s+to\s+\w+\s+and\s+\w+\b/i,
    /\bshared\s+between\b/i,
    /\bmultiple\s+(repos?|repositories)\b/i
  ]
};

export function detectCrossCutting(description: string): {
  isCrossCutting: boolean;
  detectedPatterns: string[];
  suggestedProjects: string[];
} {
  // ... pattern matching logic
}
```

### 4.2 Update increment-planner SKILL.md

Add step for per-US project selection when cross-cutting detected:

```markdown
### Step 1.6: Cross-Cutting Detection (v0.33.0+)

If feature description matches cross-cutting patterns:

1. **Detect cross-cutting nature:**
   ```bash
   specweave detect-cross-cutting "OAuth with React frontend and Node backend"
   # Output: { "isCrossCutting": true, "suggested": ["frontend", "backend"] }
   ```

2. **Prompt for per-US project assignment:**
   ```
   🔀 Cross-cutting feature detected!

   This feature appears to span multiple projects:
   - Frontend (React, login form)
   - Backend (Node, auth API)

   Please assign projects to each user story:

   US-001: Login Form UI
   → Project: [frontend-app] (auto-detected)

   US-002: Auth API Endpoints
   → Project: [backend-api] (auto-detected)

   US-003: Shared Types
   → Project: [?] Select: frontend-app / backend-api / shared-lib / other
   ```

3. **Generate spec.md with per-US projects**
```

## Phase 5: Status & Dashboard Updates

### 5.1 Update /specweave:status Command

Show cross-project breakdown:

```
📊 Increment: 0125-oauth-implementation

Status: active (3/5 USs completed)

Cross-Project Breakdown:
┌────────────────────┬──────────┬─────────────────────────────┐
│ Project            │ Provider │ User Stories                │
├────────────────────┼──────────┼─────────────────────────────┤
│ frontend-app       │ GitHub   │ US-001 ✅ (#45 closed)      │
│ backend-api        │ GitHub   │ US-002 🔄 (#78 in-progress) │
│ security-compliance│ JIRA     │ US-004 🔴 (SEC-789 blocked) │
│ ⚠️ Not mapped      │ -        │ US-003 (no sync target)     │
└────────────────────┴──────────┴─────────────────────────────┘
```

## Implementation Order

1. **Week 1**: Phase 1 (Data Model) + Phase 2.1-2.2 (Basic multi-project sync)
2. **Week 2**: Phase 2.3 (Cross-refs) + Phase 3.1-3.2 (External sync structure)
3. **Week 3**: Phase 3.3 (Provider updates) + Phase 4 (Planner)
4. **Week 4**: Phase 5 (Status) + Testing + Documentation

## Testing Strategy

### Unit Tests
- `cross-project-sync.test.ts` - Grouping logic
- `spec-parser.test.ts` - Per-US field extraction
- `external-sync-orchestrator.test.ts` - Multi-target sync

### Integration Tests
- `cross-project-workflow.spec.ts` - End-to-end cross-project sync
- `backward-compat.spec.ts` - Single-project increments still work

### E2E Tests
- Create increment with 3 USs targeting different GitHub repos
- Verify issues created in correct repos
- Verify living docs organized by project

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing increments | Backward compat: fall back to increment-level project |
| Rate limiting across providers | Batch requests per provider, respect limits |
| Circular cross-references | Use relative paths, no duplicate content |
| Config complexity | Smart defaults, guided setup wizard |

## ADR Reference

This implementation requires ADR for:
- ADR-0145: Per-User-Story Project Targeting
- ADR-0146: Cross-Project Feature Organization
- ADR-0147: External Refs Schema Migration
