# SpecDistributor Redesign - Universal Hierarchy

**Date**: 2025-11-14
**File**: `src/core/living-docs/spec-distributor.ts`
**Current Size**: 984 lines
**Target**: Complete rewrite for universal hierarchy

---

## Current Flow (v2.0.0)

```
1. parseIncrementSpec()
   └─ Parse spec.md into ParsedIncrementSpec

2. detectFeatureMapping() [via HierarchyMapper]
   └─ Detect which feature folder (external-tool-status-sync/)

3. classifyContent()
   └─ Split into epic-level vs user-story-level content

4. generateEpicFile()
   └─ Create EpicFile (FEATURE.md)

5. generateUserStoryFiles()
   └─ Create UserStoryFile[] (us-*.md)

6. writeEpicFile()
   └─ Write to {feature}/FEATURE.md

7. writeUserStoryFiles()
   └─ Write to {feature}/us-*.md

8. updateTasksWithUserStoryLinks()
   └─ Add bidirectional links (Tasks → User Stories)
```

**Output**:
```
specs/default/
└── external-tool-status-sync/
    ├── FEATURE.md
    ├── us-001-*.md
    └── us-002-*.md
```

---

## New Flow (v3.0.0 - Universal Hierarchy)

```
1. parseIncrementSpec()
   └─ Parse spec.md + detect projects + detect epic

2. detectEpicMapping() [OPTIONAL]
   └─ Detect EPIC-YYYY-QN-{name} (if specified in frontmatter)

3. detectFeatureMapping() [REQUIRED]
   └─ Detect FS-YY-MM-DD-{feature-name}

4. detectProjects() [REQUIRED]
   └─ Detect which projects (dynamic from config)

5. classifyContentByProject()
   └─ Split user stories BY PROJECT

6. generateEpicFile() [OPTIONAL]
   └─ Create EpicThemeFile (EPIC.md) if epic detected

7. generateFeatureFile() [REQUIRED]
   └─ Create FeatureFile (FEATURE.md for cross-project overview)

8. generateProjectContextFiles() [REQUIRED]
   └─ Create project-specific README.md for each project

9. generateUserStoryFilesByProject() [REQUIRED]
   └─ Create user story files grouped by project

10. writeEpicFile() [OPTIONAL]
    └─ Write to _epics/EPIC-*/EPIC.md

11. writeFeatureFile() [REQUIRED]
    └─ Write to _features/FS-*/FEATURE.md

12. writeProjectContextFiles() [REQUIRED]
    └─ Write to {project}/FS-*/README.md (for each project)

13. writeUserStoryFilesByProject() [REQUIRED]
    └─ Write to {project}/FS-*/us-*.md

14. updateTasksWithUserStoryLinks()
    └─ Add bidirectional links (now project-aware)
```

**Output** (Example: Cross-project feature):
```
specs/
├── _epics/                                        # ✨ NEW
│   └── EPIC-2025-Q4-platform/
│       └── EPIC.md                                # Epic overview
│
├── _features/                                     # ✨ NEW
│   └── FS-25-11-14-external-tool-sync/
│       └── FEATURE.md                             # Cross-project feature overview
│
├── backend/                                       # ✨ DYNAMIC (from config)
│   └── FS-25-11-14-external-tool-sync/
│       ├── README.md                              # Backend-specific context
│       ├── us-001-backend-api.md                  # Backend user stories
│       └── us-002-webhook-handler.md
│
└── frontend/                                      # ✨ DYNAMIC (from config)
    └── FS-25-11-14-external-tool-sync/            # SAME feature!
        ├── README.md                              # Frontend-specific context
        ├── us-001-status-ui.md                    # Frontend user stories
        └── us-002-manual-sync.md
```

---

## Key Design Decisions

### 1. User Stories are Project-Specific

**OLD**: All user stories in one folder
```
external-tool-status-sync/
├── us-001-backend-api.md        # Mixed!
├── us-002-frontend-ui.md        # Mixed!
└── us-003-webhook-handler.md    # Mixed!
```

**NEW**: User stories split by project
```
backend/FS-25-11-14-external-tool-sync/
├── us-001-backend-api.md        # Backend only
└── us-002-webhook-handler.md

frontend/FS-25-11-14-external-tool-sync/
├── us-001-status-ui.md          # Frontend only
└── us-002-manual-sync.md
```

**How to Detect Project for Each User Story**:
1. **Frontmatter** (explicit): `project: backend`
2. **Title Keywords**: "Backend API" → backend, "Frontend UI" → frontend
3. **Description Keywords**: Contains "React", "UI" → frontend, "API", "Node.js" → backend
4. **Fallback**: Assign to all detected projects (cross-project user story)

### 2. Three Types of Files

| File Type | Location | Purpose | Required? |
|-----------|----------|---------|-----------|
| **EPIC.md** | `_epics/EPIC-*/` | Strategic theme | OPTIONAL |
| **FEATURE.md** | `_features/FS-*/` | Cross-project feature overview | REQUIRED |
| **README.md** | `{project}/FS-*/` | Project-specific feature context | REQUIRED |
| **us-*.md** | `{project}/FS-*/` | User stories (project-specific) | REQUIRED |

### 3. Content Distribution Logic

**Epic Content** (EPIC.md):
- Strategic overview (business goals)
- List of features in this epic
- Success metrics, timeline, stakeholders
- Extracted from increment spec if epic specified

**Feature Content** (FEATURE.md):
- High-level feature description (what, not how)
- Business value
- List of implementing projects
- User stories BY PROJECT (cross-reference)
- Implementation history

**Project Context Content** (README.md):
- Feature context for THIS PROJECT
- Tech stack, dependencies
- Architecture specific to this project
- Links to user stories in this project

**User Story Content** (us-*.md):
- Same as before but now project-aware
- Links to related user stories in OTHER projects

---

## Implementation Steps

### Step 1: Update parseIncrementSpec()

**ADD**:
- Detect epic from frontmatter
- Detect projects from frontmatter/increment name

```typescript
async parseIncrementSpec(incrementId: string): Promise<ParsedIncrementSpec> {
  // ... existing parsing ...

  // NEW: Detect epic
  const epicMapping = await this.hierarchyMapper.detectEpicMapping(incrementId);

  // NEW: Detect projects
  const projects = await this.hierarchyMapper.detectProjects(incrementId);

  return {
    ...parsed,
    epic: epicMapping?.epicId,
    projects,
  };
}
```

### Step 2: Add classifyContentByProject()

**NEW METHOD**: Split user stories by project

```typescript
private async classifyContentByProject(
  parsed: ParsedIncrementSpec,
  featureMapping: FeatureMapping
): Promise<Map<string, UserStory[]>> {
  const storiesByProject = new Map<string, UserStory[]>();

  for (const story of parsed.userStories) {
    // Detect which project(s) this story belongs to
    const storyProjects = await this.detectUserStoryProject(story, featureMapping.projects);

    for (const project of storyProjects) {
      if (!storiesByProject.has(project)) {
        storiesByProject.set(project, []);
      }
      storiesByProject.get(project)!.push(story);
    }
  }

  return storiesByProject;
}

private async detectUserStoryProject(
  story: UserStory,
  availableProjects: string[]
): Promise<string[]> {
  // Method 1: Frontmatter (if user story has project field)
  // Method 2: Title/description keywords
  // Method 3: Fallback - all projects (cross-project story)
}
```

### Step 3: Add generateEpicFile() [OPTIONAL]

```typescript
private async generateEpicFile(
  parsed: ParsedIncrementSpec,
  epicMapping: EpicMapping,
  featureMapping: FeatureMapping
): Promise<EpicThemeFile | null> {
  if (!epicMapping) return null;

  return {
    id: epicMapping.epicId,
    title: parsed.title,
    type: 'epic',
    status: 'in-progress',
    strategicOverview: parsed.overview,
    features: [featureMapping.featureId],
    successMetrics: [],
    timeline: {
      start: parsed.created || new Date().toISOString(),
      targetCompletion: 'TBD',
      currentPhase: 'Phase 1',
    },
    stakeholders: {},
    externalLinks: parsed.externalLinks || {},
  };
}
```

### Step 4: Add generateFeatureFile() [REQUIRED]

```typescript
private async generateFeatureFile(
  parsed: ParsedIncrementSpec,
  featureMapping: FeatureMapping,
  storiesByProject: Map<string, UserStory[]>
): Promise<FeatureFile> {
  // Convert stories to summaries grouped by project
  const userStoriesByProject = new Map<string, UserStorySummary[]>();

  for (const [project, stories] of storiesByProject.entries()) {
    const summaries = stories.map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      phase: s.phase,
      filePath: `../../${project}/${featureMapping.featureFolder}/${this.generateUserStoryFilename(s.id, s.title)}`,
    }));
    userStoriesByProject.set(project, summaries);
  }

  return {
    id: featureMapping.featureId,
    title: parsed.title,
    type: 'feature',
    status: 'in-progress',
    priority: parsed.priority,
    created: parsed.created || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    epic: featureMapping.epic,
    projects: featureMapping.projects,
    overview: parsed.overview,
    businessValue: parsed.businessValue,
    implementationHistory: [],
    userStoriesByProject,
    externalLinks: parsed.externalLinks || {},
    totalStories: parsed.userStories.length,
    completedStories: 0,
    overallProgress: 0,
  };
}
```

### Step 5: Add generateProjectContextFiles()

```typescript
private async generateProjectContextFiles(
  featureMapping: FeatureMapping,
  parsed: ParsedIncrementSpec
): Promise<Map<string, string>> {
  const contextFiles = new Map<string, string>();

  for (const project of featureMapping.projects) {
    const projectContext = await this.hierarchyMapper.getProjectContext(project);
    if (!projectContext) continue;

    const content = this.formatProjectContextFile(
      featureMapping,
      projectContext,
      parsed
    );

    contextFiles.set(project, content);
  }

  return contextFiles;
}

private formatProjectContextFile(
  featureMapping: FeatureMapping,
  projectContext: ProjectContext,
  parsed: ParsedIncrementSpec
): string {
  return `---
id: ${featureMapping.featureId}-${projectContext.projectId}
title: "${parsed.title} - ${projectContext.projectName} Implementation"
feature: ${featureMapping.featureId}
project: ${projectContext.projectId}
type: feature-context
status: in-progress
---

# ${projectContext.projectName} Implementation: ${parsed.title}

**Feature**: [${featureMapping.featureId}](../../../_features/${featureMapping.featureFolder}/FEATURE.md)

## ${projectContext.projectName}-Specific Context

[Feature context for ${projectContext.projectName}]

## Tech Stack

${projectContext.techStack.map(t => `- ${t}`).join('\n')}

## User Stories (${projectContext.projectName})

[User stories will be listed here]

## Dependencies

[Project-specific dependencies]
`;
}
```

### Step 6: Update File Writing Methods

**writeEpicFile()** [NEW]:
```typescript
private async writeEpicFile(
  epic: EpicThemeFile | null,
  epicMapping: EpicMapping | null
): Promise<string | null> {
  if (!epic || !epicMapping) return null;

  const epicPath = path.join(epicMapping.epicPath, 'EPIC.md');
  const content = this.formatEpicFile(epic);

  await fs.ensureDir(path.dirname(epicPath));
  await fs.writeFile(epicPath, content, 'utf-8');

  console.log(`   ✅ Written epic overview to ${epicMapping.epicFolder}/EPIC.md`);
  return epicPath;
}
```

**writeFeatureFile()** [NEW]:
```typescript
private async writeFeatureFile(
  feature: FeatureFile,
  featureMapping: FeatureMapping
): Promise<string> {
  const featurePath = path.join(featureMapping.featurePath, 'FEATURE.md');
  const content = this.formatFeatureFile(feature);

  await fs.ensureDir(path.dirname(featurePath));
  await fs.writeFile(featurePath, content, 'utf-8');

  console.log(`   ✅ Written feature overview to _features/${featureMapping.featureFolder}/FEATURE.md`);
  return featurePath;
}
```

**writeProjectContextFiles()** [NEW]:
```typescript
private async writeProjectContextFiles(
  contextFiles: Map<string, string>,
  featureMapping: FeatureMapping
): Promise<string[]> {
  const paths: string[] = [];

  for (const [project, content] of contextFiles.entries()) {
    const projectPath = featureMapping.projectPaths.get(project);
    if (!projectPath) continue;

    const contextPath = path.join(projectPath, 'README.md');

    await fs.ensureDir(path.dirname(contextPath));
    await fs.writeFile(contextPath, content, 'utf-8');

    paths.push(contextPath);
  }

  console.log(`   ✅ Written ${contextFiles.size} project context files`);
  return paths;
}
```

**writeUserStoryFilesByProject()** [UPDATED]:
```typescript
private async writeUserStoryFilesByProject(
  storiesByProject: Map<string, UserStory[]>,
  featureMapping: FeatureMapping,
  incrementId: string
): Promise<Map<string, string[]>> {
  const pathsByProject = new Map<string, string[]>();

  for (const [project, stories] of storiesByProject.entries()) {
    const projectPath = featureMapping.projectPaths.get(project);
    if (!projectPath) continue;

    await fs.ensureDir(projectPath);

    const paths: string[] = [];

    for (const story of stories) {
      const userStoryFile = this.convertToUserStoryFile(story, featureMapping, incrementId, project);
      const filename = this.generateUserStoryFilename(userStoryFile.id, userStoryFile.title);
      const filePath = path.join(projectPath, filename);

      const content = this.formatUserStoryFile(userStoryFile);

      await fs.writeFile(filePath, content, 'utf-8');
      paths.push(filePath);
    }

    pathsByProject.set(project, paths);
  }

  console.log(`   ✅ Written user stories to ${featureMapping.projects.length} project(s)`);
  return pathsByProject;
}
```

---

## Migration Path

### Phase 1: Add New Methods (Non-Breaking)
- Add epic/feature/project detection
- Add new file generation methods
- Keep old methods for backward compatibility

### Phase 2: Update distribute() Method
- Switch to new flow
- Call new methods
- Maintain backward compatibility where possible

### Phase 3: Remove Old Methods
- Remove deprecated methods after migration

---

## Testing Strategy

### Unit Tests
1. Test epic detection (optional)
2. Test feature detection (required)
3. Test project detection (dynamic)
4. Test user story classification by project
5. Test file generation for each type

### Integration Tests
1. Test complete distribution flow
2. Test cross-project features
3. Test single-project features
4. Test epic + feature hierarchy

### E2E Tests
1. Test increment completion with new structure
2. Test living docs sync
3. Test external tool sync with new hierarchy

---

**Next Steps**:
1. Implement new methods in spec-distributor.ts
2. Update distribute() method to use new flow
3. Add backward compatibility layer
4. Test with existing increments
5. Update tests

---

**Implementation Status**: Design Complete - Ready for Code
