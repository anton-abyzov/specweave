# Technical Plan: Per-US Project/Board Enforcement

## Architecture Overview

This increment creates a **5-layer enforcement system** that ensures every User Story has proper project/board targeting:

```
Layer 5: External Plugin Integration
    ├── specweave-github per-US sync
    ├── specweave-jira per-US sync
    └── specweave-ado per-US sync
           │
Layer 4: Living Docs Per-US Placement
    └── syncIncrement() uses US.project for folder routing
           │
Layer 3: Smart Project Resolution
    └── Auto-resolve project from keywords/context
           │
Layer 2: Validation Hook (BLOCKING)
    └── Pre-Tool-Use hook blocks spec.md without per-US project
           │
Layer 1: Context Injection
    └── Inject project options BEFORE Claude generates spec
```

## Component Architecture

### Component 1: Context Injector (`src/hooks/pre-increment-planning.ts`)

**Purpose**: Inject project/board context into conversation before spec generation.

**Responsibilities**:
- Detect structure level (1 or 2)
- List available projects from config
- List boards per project (2-level)
- Format context block for Claude

**Interface**:
```typescript
export interface InjectedContext {
  structureLevel: 1 | 2;
  projects: Array<{ id: string; name: string }>;
  boardsByProject?: Record<string, Array<{ id: string; name: string }>>;
  instructions: string;
}

export function injectProjectContext(
  projectRoot: string,
  incrementDescription: string
): Promise<InjectedContext>;
```

**Integration Point**: Called by UserPromptSubmit hook when `/specweave:increment` detected.

---

### Component 2: Per-US Validator (`plugins/specweave/hooks/per-us-project-validator.sh`)

**Purpose**: BLOCK spec.md writes that lack per-US project fields.

**Responsibilities**:
- Parse spec.md content from tool input
- Count total User Stories (### US-XXX pattern)
- Count USs with **Project**: field
- For 2-level: also check **Board**: field
- Return structured error with missing USs

**Logic Flow**:
```
1. Extract spec content from $TOOL_INPUT_CONTENT
2. Count ### US-\d+ matches → total_us
3. Count **Project**: lines after US headings → us_with_project
4. If us_with_project < total_us → BLOCK with error
5. If 2-level detected → also check **Board**: count
6. Exit 0 = allow, Exit 1 = block
```

**Configuration** (hooks.json):
```json
{
  "event": "PreToolUse",
  "matcher": {
    "tool": ["Write", "Edit"],
    "pathPattern": ".specweave/increments/.*/spec\\.md$"
  },
  "script": "plugins/specweave/hooks/per-us-project-validator.sh",
  "blocking": true
}
```

---

### Component 3: Project Resolver (`src/utils/project-resolver.ts`)

**Purpose**: Auto-resolve project/board from US content and context.

**Responsibilities**:
- Single project auto-selection
- Keyword-based project matching
- Cross-cutting detection integration
- Confidence scoring (high/medium/low)
- Learning from existing spec patterns

**Interface**:
```typescript
export interface ProjectResolution {
  resolved: boolean;
  projectId?: string;
  boardId?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ResolverConfig {
  structureConfig: StructureLevelConfig;
  existingPatterns?: Map<string, string>;  // keyword → project
  crossCuttingKeywords?: Record<string, string[]>;  // project → keywords
}

export class ProjectResolver {
  constructor(projectRoot: string, config: ResolverConfig);

  resolveForUserStory(usContent: string): ProjectResolution;
  resolveForIncrement(incrementDescription: string): ProjectResolution[];
  learnFromExistingSpecs(): void;
}
```

**Resolution Priority**:
1. Single project in config → auto-select (high confidence)
2. Exact keyword match from learned patterns → use (high confidence)
3. Cross-cutting detector match → suggest (medium confidence)
4. Generic keyword match → suggest (low confidence)
5. No match → prompt user

---

### Component 4: External Sync Orchestrator Integration

**Purpose**: Connect external plugins to per-US sync infrastructure.

**GitHub Plugin** (`plugins/specweave-github/lib/per-us-sync.ts`):
```typescript
export async function syncUserStoriesToGitHub(
  incrementId: string,
  userStories: UserStoryData[],
  projectMappings: Record<string, ProjectMapping>,
  options: SyncOptions
): Promise<USSyncResult[]> {
  const orchestrator = new ExternalSyncOrchestrator(projectRoot);
  await orchestrator.loadProjectMappings();

  // Group by project
  const groups = orchestrator.groupUSsByProject(userStories, defaultProject);

  const results: USSyncResult[] = [];

  for (const [projectId, stories] of groups) {
    const mapping = orchestrator.getProjectMapping(projectId);
    if (!mapping?.github) {
      results.push(...stories.map(us => ({
        usId: us.id, provider: 'github', success: false,
        error: `No GitHub mapping for project "${projectId}"`
      })));
      continue;
    }

    // Sync to correct repo
    for (const us of stories) {
      const issue = await gitHubClient.createOrUpdateIssue(
        mapping.github.owner,
        mapping.github.repo,
        buildIssueContent(us)
      );
      results.push({
        usId: us.id, provider: 'github', success: true,
        issueNumber: issue.number, url: issue.html_url
      });
    }
  }

  return results;
}
```

**JIRA Plugin** - Same pattern with `mapping.jira.project/board`
**ADO Plugin** - Same pattern with `mapping.ado.project/areaPath`

---

### Component 5: Living Docs Per-US Router

**Purpose**: Route each US file to its declared project folder.

**Modification to** `src/core/living-docs/living-docs-sync.ts`:

```typescript
async function syncUserStory(
  us: UserStoryData,
  featureId: string,
  structureConfig: StructureLevelConfig,
  defaultProject: string
): Promise<void> {
  // Use per-US project, or fall back to default
  const projectId = us.project || defaultProject;

  // For 2-level, also need board
  const boardId = us.board || getDefaultBoard(projectId, structureConfig);

  // Build path
  const specsPath = structureConfig.level === 2
    ? path.join(specsRoot, projectId, boardId, featureId)
    : path.join(specsRoot, projectId, featureId);

  await ensureDir(specsPath);

  // Write US file
  const usFileName = `us-${us.id.toLowerCase().replace('us-', '')}-${slugify(us.title)}.md`;
  await writeFile(path.join(specsPath, usFileName), generateUSContent(us));
}
```

---

### Component 6: Config Schema Extension

**Add to** `src/core/schemas/specweave-config.schema.json`:

```json
{
  "projectMappings": {
    "type": "object",
    "description": "Maps SpecWeave project IDs to external tool targets",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "github": {
          "type": "object",
          "properties": {
            "owner": { "type": "string", "description": "GitHub org or user" },
            "repo": { "type": "string", "description": "Repository name" }
          },
          "required": ["owner", "repo"]
        },
        "jira": {
          "type": "object",
          "properties": {
            "project": { "type": "string", "description": "JIRA project key" },
            "board": { "type": "string", "description": "JIRA board name (optional)" }
          },
          "required": ["project"]
        },
        "ado": {
          "type": "object",
          "properties": {
            "project": { "type": "string", "description": "ADO project name" },
            "areaPath": { "type": "string", "description": "ADO area path (optional)" }
          },
          "required": ["project"]
        }
      }
    },
    "examples": [
      {
        "frontend-app": {
          "github": { "owner": "myorg", "repo": "frontend-app" }
        },
        "backend-api": {
          "jira": { "project": "BE", "board": "api-team" }
        }
      }
    ]
  }
}
```

## Data Models

### UserStoryData (Existing, No Change)

```typescript
interface UserStoryData {
  id: string;              // "US-001"
  title: string;
  description: string;
  acceptanceCriteria: string[];
  project?: string;        // Per-US project (v0.33.0+)
  board?: string;          // Per-US board for 2-level (v0.33.0+)
  externalProvider?: 'github' | 'jira' | 'ado';
  // ... other fields
}
```

### ExternalRefs in metadata.json (Existing, Enforce Usage)

```typescript
interface USExternalRefsMap {
  [usId: string]: {
    github?: USExternalRef;
    jira?: USExternalRef;
    ado?: USExternalRef;
  };
}

interface USExternalRef {
  provider: 'github' | 'jira' | 'ado';
  issueNumber: number | string;
  url: string;
  targetProject: string;
  lastSynced?: string;
}
```

### ProjectMapping (New)

```typescript
interface ProjectMapping {
  github?: { owner: string; repo: string };
  jira?: { project: string; board?: string };
  ado?: { project: string; areaPath?: string };
}

type ProjectMappings = Record<string, ProjectMapping>;
```

## Implementation Strategy

### Phase 1: Validation Layer (Week 1)

1. **T-001**: Create per-US validation hook
2. **T-002**: Add hook to hooks.json
3. **T-003**: Add 2-level board validation
4. **T-004**: Add bypass with --force flag

### Phase 2: Context Injection (Week 1)

5. **T-005**: Create pre-increment-planning hook
6. **T-006**: Integrate with /specweave:increment command
7. **T-007**: Format context block for Claude

### Phase 3: Smart Resolution (Week 2)

8. **T-008**: Create ProjectResolver class
9. **T-009**: Implement keyword learning from existing specs
10. **T-010**: Integrate CrossCuttingDetector

### Phase 4: Config Schema (Week 2)

11. **T-011**: Add projectMappings to schema
12. **T-012**: Add schema validation
13. **T-013**: Update init to prompt for mappings (optional)

### Phase 5: External Plugin Integration (Week 3)

14. **T-014**: Update GitHub plugin for per-US sync
15. **T-015**: Update JIRA plugin for per-US sync
16. **T-016**: Update ADO plugin for per-US sync
17. **T-017**: Store externalRefs per US in metadata

### Phase 6: Living Docs Routing (Week 3)

18. **T-018**: Modify syncIncrement for per-US folder routing
19. **T-019**: Generate cross-project FEATURE.md links
20. **T-020**: Handle 2-level project/board paths

### Phase 7: Status & Testing (Week 4)

21. **T-021**: Update /specweave:status for cross-project view
22. **T-022**: Integration tests for cross-project workflow
23. **T-023**: Documentation updates

## Testing Strategy

### Unit Tests

- `per-us-project-validator.test.ts`: Hook validation logic
- `project-resolver.test.ts`: Resolution algorithm
- `external-sync-orchestrator.test.ts`: Per-US grouping

### Integration Tests

- `cross-project-sync.spec.ts`: Full workflow end-to-end
- `github-per-us-sync.spec.ts`: GitHub plugin integration
- `jira-per-us-sync.spec.ts`: JIRA plugin integration
- `ado-per-us-sync.spec.ts`: ADO plugin integration

### Test Scenarios

1. Single project, single US → auto-select, sync to one target
2. Single project, multiple USs → all sync to same target
3. Multiple projects, USs with explicit project → each syncs correctly
4. Multiple projects, US missing project → validation blocks
5. 2-level structure → validates both project AND board
6. Cross-project increment → living docs in multiple folders

## Deployment Plan

### Rollout Strategy

1. **Deploy validation hook (non-blocking)**: Log warnings only
2. **Enable context injection**: Start injecting project options
3. **Enable validation blocking**: After 1 week of warnings
4. **Deploy external sync integration**: Gradual rollout per plugin
5. **Full enforcement**: All layers active

### Backward Compatibility

- **Fallback mode**: USs without `**Project**:` use increment-level project
- **Legacy flag**: `--legacy` skips per-US validation
- **Migration period**: 2 weeks of warnings before blocking

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude ignores context injection | Medium | High | Validation hook is BLOCKING |
| Existing specs break | Low | Medium | Fallback to increment project |
| API rate limits | Low | Low | Batch by provider |
| Complex 2-level structures | Medium | Medium | Thorough testing with ADO/JIRA |
| Performance impact | Low | Low | Hooks < 50ms, caching enabled |

## Architecture Decision Records

### ADR-0144: Per-US Project Enforcement Strategy

**Context**: Need to enforce per-US project targeting at runtime.

**Decision**: 5-layer approach with BLOCKING validation hook.

**Rationale**:
- Context injection alone doesn't guarantee compliance
- Validation hook provides hard enforcement
- Smart resolution reduces user friction
- External plugin integration completes the flow

**Consequences**:
- New specs MUST have per-US project fields
- Existing specs continue with fallback
- External sync accuracy improved
