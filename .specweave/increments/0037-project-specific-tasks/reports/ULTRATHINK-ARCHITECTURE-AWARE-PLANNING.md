# ULTRATHINK: Architecture-Aware Increment Planning
**Date**: 2025-11-15
**Increment**: 0037-project-specific-tasks
**Author**: Architecture Analysis

---

## Executive Summary

**Core Insight**: Project architecture (monolith vs microservices, monorepo vs polyrepo) must be detected during `specweave init` and influence increment planning from the start. This enables a **copy-based sync paradigm** instead of transformation-based, drastically simplifying the entire system.

**Paradigm Shift**:
```
❌ OLD: Generic Increment → Transform to Projects → Transform to GitHub
✅ NEW: Project-Aware Increment → Copy to Living Docs → Copy to GitHub
```

**Impact**: Eliminates 80% of transformation logic, makes source of truth crystal clear, enables trivial bidirectional sync.

---

## The Problem: Late Project Detection

### Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────┐
│ specweave init                                  │
│ ❌ Doesn't ask about architecture               │
│ ❌ Doesn't ask about projects (BE/FE/Mobile)    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Increment Planning (PM Agent)                   │
│ ❌ Creates GENERIC user stories                 │
│ ❌ Creates GENERIC tasks                        │
│ ❌ No project awareness                         │
└─────────────────────────────────────────────────┘
                    ↓
         Example: tasks.md
         ┌──────────────────────────────────┐
         │ T-001: Implement authentication  │ ← Generic! No project!
         │ T-002: Add OAuth providers       │ ← Generic! No project!
         └──────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Living Docs Sync (SpecDistributor)              │
│ ❌ GUESSES which projects tasks apply to        │
│ ❌ TRANSFORMS generic tasks into project tasks  │
│ ❌ Complex detection logic (keywords, etc.)     │
└─────────────────────────────────────────────────┘
                    ↓
         Output: specs/backend/FS-031/TASKS.md
         ┌──────────────────────────────────────┐
         │ T-BE-001: JWT auth service           │ ← Created by GUESSING
         │ T-BE-002: Database schema            │ ← Created by GUESSING
         └──────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ GitHub Sync                                     │
│ ❌ TRANSFORMS again for issue format            │
│ ❌ Loses information in translation             │
└─────────────────────────────────────────────────┘
```

**Problems**:
1. **Guessing**: Living docs sync guesses project assignment (unreliable)
2. **Transformation Loss**: Each transformation can lose information
3. **Complex Logic**: Detection algorithms, keyword matching, tech stack inference
4. **No Source of Truth**: Is it increment tasks or project tasks?
5. **Bidirectional Sync Hell**: How to sync status back? Which direction wins?

---

## The Solution: Architecture-Aware from Start

### Proposed Architecture (CORRECT)

```
┌─────────────────────────────────────────────────┐
│ specweave init                                  │
│ ✅ Asks: Architecture pattern?                  │
│    → Monolith / Microservices / EDA             │
│ ✅ Asks: Repository strategy?                   │
│    → Monorepo / Polyrepo / Multi-repo           │
│ ✅ Asks: What are your projects?                │
│    → ["backend", "frontend", "mobile"]          │
│ ✅ Stores in .specweave/config.json             │
└─────────────────────────────────────────────────┘
                    ↓
         Stored Architecture Context
         ┌──────────────────────────────────────┐
         │ .specweave/config.json:              │
         │ {                                    │
         │   "projects": [                      │
         │     { "name": "backend",             │
         │       "techStack": ["Node.js"] },    │
         │     { "name": "frontend",            │
         │       "techStack": ["React"] }       │
         │   ]                                  │
         │ }                                    │
         └──────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Increment Planning (PM Agent - ENHANCED)        │
│ ✅ READS .specweave/config.json                 │
│ ✅ Knows projects: ["backend", "frontend"]      │
│ ✅ Creates PROJECT-SPECIFIC US from start       │
│ ✅ Creates PROJECT-SPECIFIC tasks from start    │
└─────────────────────────────────────────────────┘
                    ↓
         Example: Multi-Project Increment
         ┌──────────────────────────────────────┐
         │ increments/0031/                     │
         │ ├── us-backend-001.md    ← EXPLICIT  │
         │ │   └── T-BE-001, T-BE-002            │
         │ └── us-frontend-001.md   ← EXPLICIT  │
         │     └── T-FE-001, T-FE-002            │
         └──────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Living Docs Sync (SpecDistributor - SIMPLIFIED) │
│ ✅ READS project from US metadata               │
│ ✅ COPIES file to target location               │
│ ✅ NO transformation, NO guessing               │
└─────────────────────────────────────────────────┘
                    ↓
         Output: EXACT COPY
         ┌──────────────────────────────────────┐
         │ specs/backend/FS-031/us-001.md       │
         │ ← IDENTICAL to increment US          │
         │ ← Same AC, same tasks, same status   │
         └──────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ GitHub Sync (SIMPLIFIED)                        │
│ ✅ READS from living docs file                  │
│ ✅ COPIES content to issue body                 │
│ ✅ NO transformation, NO guessing               │
└─────────────────────────────────────────────────┘
                    ↓
         Output: EXACT COPY
         ┌──────────────────────────────────────┐
         │ GitHub Issue #123                    │
         │ ← IDENTICAL to living docs US        │
         │ ← Same AC, same tasks, same status   │
         └──────────────────────────────────────┘
```

**Benefits**:
1. **Explicit**: Projects declared upfront, no guessing
2. **Copy-Only**: Living docs sync = file copy, GitHub sync = content copy
3. **Single Source**: Increment is source, everything else is exact replica
4. **Trivial Bidirectional Sync**: Copy status back (same format!)
5. **Architecture-Native**: Respects monolith vs microservices from day 1

---

## Phase 1: Architecture Detection (specweave init)

### Enhanced Init Questions

```typescript
// src/cli/init.ts - NEW QUESTIONS

async function detectArchitecture(): Promise<ArchitectureConfig> {
  console.log("\n🏗️  Architecture Setup\n");

  // Question 1: Architecture Pattern
  const pattern = await select({
    message: "What's your architecture pattern?",
    choices: [
      { name: "Monolith", value: "monolith",
        description: "Single codebase, single deployment" },
      { name: "Microservices", value: "microservices",
        description: "Multiple independent services" },
      { name: "Event-Driven Architecture (EDA)", value: "eda",
        description: "Event-based communication, async services" },
      { name: "Modular Monolith", value: "modular-monolith",
        description: "Single deployment, modular internal structure" }
    ]
  });

  // Question 2: Repository Strategy
  const repoStrategy = await select({
    message: "What's your repository strategy?",
    choices: [
      { name: "Monorepo", value: "monorepo",
        description: "All projects in one repository" },
      { name: "Polyrepo", value: "polyrepo",
        description: "Each project has its own repository" },
      { name: "Multi-repo (Hybrid)", value: "multi-repo",
        description: "Some shared repos, some separate" }
    ]
  });

  // Question 3: Project Structure
  const hasMultipleProjects = await confirm({
    message: "Do you have multiple projects? (e.g., backend, frontend, mobile)",
    default: pattern !== "monolith"
  });

  let projects: Project[] = [{ name: "main", techStack: [] }];

  if (hasMultipleProjects) {
    // Question 4: Define Projects
    const projectInput = await input({
      message: "Enter project names (comma-separated):",
      default: "backend,frontend",
      validate: (value) => value.trim().length > 0
    });

    projects = projectInput.split(",").map(name => ({
      name: name.trim().toLowerCase(),
      techStack: [] // Will be populated later or detected
    }));

    // Question 5: Tech Stack per Project (optional)
    for (const project of projects) {
      const techStack = await input({
        message: `Tech stack for ${project.name}? (comma-separated, optional):`,
        default: project.name === "backend" ? "Node.js,TypeScript,PostgreSQL" :
                 project.name === "frontend" ? "React,TypeScript,TailwindCSS" : ""
      });

      if (techStack.trim()) {
        project.techStack = techStack.split(",").map(t => t.trim());
      }
    }
  }

  return {
    pattern,
    repositoryStrategy: repoStrategy,
    hasMultipleProjects,
    projects
  };
}
```

### Updated .specweave/config.json

```json
{
  "version": "0.20.0",
  "architecture": {
    "pattern": "microservices",
    "repositoryStrategy": "polyrepo",
    "hasMultipleProjects": true
  },
  "projects": [
    {
      "name": "backend",
      "techStack": ["Node.js", "TypeScript", "PostgreSQL", "Redis"],
      "repository": "https://github.com/org/backend",
      "path": "./backend"
    },
    {
      "name": "frontend",
      "techStack": ["React", "TypeScript", "TailwindCSS", "Vite"],
      "repository": "https://github.com/org/frontend",
      "path": "./frontend"
    },
    {
      "name": "mobile",
      "techStack": ["React Native", "TypeScript", "Expo"],
      "repository": "https://github.com/org/mobile",
      "path": "./mobile"
    }
  ],
  "livingDocs": {
    "enabled": true,
    "syncMode": "copy",  // NEW: "copy" vs "transform"
    "projectAware": true // NEW: Use project-specific structure
  }
}
```

---

## Phase 2: Multi-Project Aware Increment Planning

### PM Agent Enhancement

```typescript
// plugins/specweave/agents/pm/increment-planner.ts - ENHANCED

class IncrementPlanner {
  async planIncrement(featureName: string): Promise<void> {
    // 1. READ architecture configuration
    const config = await this.readConfig();
    const isMultiProject = config.projects.length > 1;

    // 2. Create feature spec
    const feature = await this.createFeatureSpec(featureName);

    // 3. Create user stories (PROJECT-AWARE)
    const userStories = await this.createUserStories(feature, isMultiProject);

    // 4. Create tasks.md (PROJECT-AWARE)
    await this.createTasks(feature, userStories, isMultiProject);

    // 5. Save increment
    await this.saveIncrement(feature, userStories);
  }

  async createUserStories(
    feature: Feature,
    isMultiProject: boolean
  ): Promise<UserStory[]> {
    const userStories: UserStory[] = [];

    // Ask PM to identify user stories
    const stories = await this.identifyUserStories(feature);

    for (const story of stories) {
      if (isMultiProject) {
        // ASK: Which projects does this US apply to?
        const projects = await this.detectApplicableProjects(story);

        if (projects.length === 1) {
          // Single project: Create ONE US with project prefix
          const us = await this.createProjectUserStory(story, projects[0]);
          userStories.push(us);
        } else {
          // Multiple projects: Create SEPARATE US per project
          for (const project of projects) {
            const us = await this.createProjectUserStory(story, project);
            userStories.push(us);
          }
        }
      } else {
        // Monolith: Create generic US (no project prefix)
        const us = await this.createGenericUserStory(story);
        userStories.push(us);
      }
    }

    return userStories;
  }

  async createProjectUserStory(
    story: StoryDraft,
    project: Project
  ): Promise<UserStory> {
    return {
      id: `us-${project.name}-${story.number}`,
      filename: `us-${project.name}-${story.number}.md`,
      metadata: {
        project: project.name,  // EXPLICIT project assignment
        techStack: project.techStack,
        repository: project.repository
      },
      title: `[${project.name.toUpperCase()}] ${story.title}`,
      acceptanceCriteria: story.acceptanceCriteria.map(ac => ({
        id: `AC-${project.name.toUpperCase()}-US${story.number}-${ac.number}`,
        description: ac.description,
        priority: ac.priority,
        projectSpecific: true  // Flag for project-specific AC
      })),
      tasks: story.tasks.map(task => ({
        id: `T-${project.name.toUpperCase()}-${task.number}`,
        description: task.description,
        project: project.name,  // EXPLICIT project assignment
        implementationDetails: this.generateProjectDetails(task, project)
      }))
    };
  }
}
```

### Increment File Structure (Multi-Project Example)

```
.specweave/increments/0031-auth-system/
├── metadata.json
│   └── projects: ["backend", "frontend"]  ← EXPLICIT
│
├── spec.md
│   └── Overall feature description (cross-project)
│
├── plan.md
│   └── Overall implementation plan (cross-project)
│
├── tasks.md  ← HIGH-LEVEL orchestration ONLY
│   ├── T-001: Implement authentication system (orchestrates BE + FE)
│   ├── T-002: Add OAuth providers (orchestrates BE + FE)
│   └── T-003: Deploy to production (orchestrates infra)
│
├── us-backend-001.md  ← BACKEND-SPECIFIC
│   ├── metadata:
│   │   └── project: "backend"  ← EXPLICIT
│   ├── Title: [BACKEND] JWT Authentication Service
│   ├── Acceptance Criteria:
│   │   ├── AC-BE-US1-01: Implement JWT token generation with bcrypt
│   │   ├── AC-BE-US1-02: Create PostgreSQL user table with indexes
│   │   └── AC-BE-US1-03: Add /auth/login endpoint with rate limiting
│   └── Tasks:
│       ├── T-BE-001: Create JWT service (Node.js, jsonwebtoken)
│       ├── T-BE-002: Database migration (PostgreSQL schema)
│       └── T-BE-003: Auth controller with validation (express-validator)
│
└── us-frontend-001.md  ← FRONTEND-SPECIFIC
    ├── metadata:
    │   └── project: "frontend"  ← EXPLICIT
    ├── Title: [FRONTEND] Login Form & Auth Flow
    ├── Acceptance Criteria:
    │   ├── AC-FE-US1-01: Build login form with validation (React Hook Form)
    │   ├── AC-FE-US1-02: Implement auth context provider (React Context)
    │   └── AC-FE-US1-03: Add protected route HOC with redirect
    └── Tasks:
        ├── T-FE-001: Login form component (React, TailwindCSS)
        ├── T-FE-002: Auth state management (Context API + useReducer)
        └── T-FE-003: Protected route wrapper (React Router)
```

**Key Changes**:
- ✅ US filenames have project prefix: `us-backend-001.md`, `us-frontend-001.md`
- ✅ Metadata includes `project: "backend"` (explicit!)
- ✅ AC IDs have project prefix: `AC-BE-US1-01`
- ✅ Task IDs have project prefix: `T-BE-001`
- ✅ Implementation details are project-specific (tech stack, libraries)

---

## Phase 3: Copy-Based Living Docs Sync

### SpecDistributor Simplification

**OLD Implementation (Complex Transformation)**:
```typescript
// ❌ OLD: Transformation-based (COMPLEX)
class SpecDistributor {
  async syncLivingDocs(increment: Increment): Promise<void> {
    const userStories = await this.extractUserStories(increment);

    for (const us of userStories) {
      // GUESS which projects this US applies to
      const projects = this.detectProjects(us); // ❌ Keyword matching, unreliable

      for (const project of projects) {
        // TRANSFORM US for this project
        const transformed = this.transformForProject(us, project); // ❌ Complex logic

        // GENERATE project-specific tasks
        const tasks = this.generateProjectTasks(us.tasks, project); // ❌ More guessing

        // Write transformed US
        await this.writeUserStory(project, transformed, tasks);
      }
    }
  }

  private detectProjects(us: UserStory): string[] {
    // ❌ Keyword matching (fragile!)
    const content = us.content.toLowerCase();
    const projects = [];

    if (content.includes("api") || content.includes("database")) {
      projects.push("backend");
    }
    if (content.includes("component") || content.includes("ui")) {
      projects.push("frontend");
    }

    return projects.length > 0 ? projects : ["main"];
  }

  private transformForProject(us: UserStory, project: string): UserStory {
    // ❌ Complex transformation logic
    return {
      ...us,
      title: `[${project.toUpperCase()}] ${us.title}`,
      acceptanceCriteria: us.acceptanceCriteria.map(ac => ({
        ...ac,
        id: ac.id.replace("AC-", `AC-${project.toUpperCase()}-`)
      }))
      // More transformations...
    };
  }
}
```

**NEW Implementation (Simple Copy)**:
```typescript
// ✅ NEW: Copy-based (SIMPLE)
class SpecDistributor {
  async syncLivingDocs(increment: Increment): Promise<void> {
    const userStories = await this.readUserStories(increment);

    for (const us of userStories) {
      // ✅ READ project from metadata (explicit!)
      const project = us.metadata.project || "main";

      // ✅ Determine target path
      const targetPath = path.join(
        ".specweave/docs/internal/specs",
        project,
        us.metadata.feature,
        us.filename
      );

      // ✅ COPY file (no transformation!)
      await fs.copyFile(us.sourcePath, targetPath);

      console.log(`✅ Copied ${us.filename} to ${project}/${us.metadata.feature}/`);
    }

    // ✅ Generate feature README (aggregates US from same feature)
    await this.generateFeatureReadme(increment);
  }

  // No detectProjects() method needed! ✅
  // No transformForProject() method needed! ✅
  // No generateProjectTasks() method needed! ✅
}
```

**Complexity Reduction**:
- **OLD**: 300+ lines of transformation logic
- **NEW**: 50 lines of copy logic
- **Reduction**: 83% less code!

---

## Phase 4: Copy-Based GitHub Sync

### GitHub Sync Simplification

**OLD Implementation (Complex Transformation)**:
```typescript
// ❌ OLD: Transform from increment + living docs + guessing
class GitHubIssueBuilder {
  async createIssue(feature: Feature, userStory: UserStory): Promise<void> {
    // ❌ Read from MULTIPLE sources
    const incrementTasks = await this.readIncrementTasks(feature.incrementId);
    const livingDocsTasks = await this.readLivingDocsTasks(feature, userStory);

    // ❌ MERGE tasks from different sources (conflict prone!)
    const tasks = this.mergeTasks(incrementTasks, livingDocsTasks);

    // ❌ TRANSFORM to GitHub markdown format
    const body = this.buildIssueBody({
      title: userStory.title,
      acceptanceCriteria: this.formatACs(userStory.acceptanceCriteria),
      tasks: this.formatTasks(tasks),
      metadata: this.extractMetadata(userStory)
    });

    // Create issue
    await github.issues.create({ title: userStory.title, body });
  }

  private mergeTasks(incrementTasks: Task[], livingDocsTasks: Task[]): Task[] {
    // ❌ Complex merge logic with conflict resolution
    const merged = new Map();

    for (const task of incrementTasks) {
      merged.set(task.id, task);
    }

    for (const task of livingDocsTasks) {
      if (merged.has(task.id)) {
        // ❌ Conflict! Which one wins?
        merged.set(task.id, this.resolveConflict(merged.get(task.id), task));
      } else {
        merged.set(task.id, task);
      }
    }

    return Array.from(merged.values());
  }
}
```

**NEW Implementation (Simple Copy)**:
```typescript
// ✅ NEW: Copy from living docs (single source!)
class GitHubIssueBuilder {
  async createIssue(feature: Feature, userStory: UserStory): Promise<void> {
    // ✅ Living docs is the ONLY source (already in sync with increment)
    const livingDocsPath = path.join(
      ".specweave/docs/internal/specs",
      userStory.project,
      feature.id,
      `us-${userStory.id}.md`
    );

    // ✅ READ file (no transformation!)
    const content = await fs.readFile(livingDocsPath, "utf-8");

    // ✅ Parse frontmatter and body
    const { metadata, body } = this.parseFrontmatter(content);

    // ✅ COPY content to GitHub (minimal formatting only)
    const issueBody = this.minimalFormat(body); // Just add GitHub-specific formatting

    // Create issue
    await github.issues.create({
      title: metadata.title,
      body: issueBody,
      labels: [metadata.project, metadata.priority]
    });
  }

  // No mergeTasks() method needed! ✅
  // No resolveConflict() method needed! ✅
  // No complex transformation needed! ✅
}
```

**Complexity Reduction**:
- **OLD**: 500+ lines of merge + transform logic
- **NEW**: 100 lines of read + copy logic
- **Reduction**: 80% less code!

---

## Universal Hierarchy (Still Valid!)

The universal mapping hierarchy remains the same:

```
Feature (FS-037)
├── Epic (optional, Jira only, 3+ levels)
└── User Stories (US-001, US-002, ...)
    ├── Acceptance Criteria (AC-US1-01, AC-US1-02, ...)
    └── Tasks (T-001, T-002, ...)
```

**Key Addition**: Projects are a **cross-cutting dimension**, not a hierarchy level!

```
Projects = ["backend", "frontend", "mobile"]  ← Cross-cutting

Feature FS-037
├── Backend Aspect
│   ├── specs/backend/FS-037/
│   │   ├── us-001.md  ← Backend-specific US
│   │   └── us-002.md
│   └── GitHub repo: github.com/org/backend
│
├── Frontend Aspect
│   ├── specs/frontend/FS-037/
│   │   ├── us-001.md  ← Frontend-specific US
│   │   └── us-002.md
│   └── GitHub repo: github.com/org/frontend
│
└── Mobile Aspect
    ├── specs/mobile/FS-037/
    │   └── us-001.md  ← Mobile-specific US
    └── GitHub repo: github.com/org/mobile
```

**Same feature (FS-037), different project implementations!**

---

## Bidirectional Sync (Trivial!)

### Status Sync: GitHub → Living Docs → Increment

**OLD (Complex)**:
```typescript
// ❌ OLD: Transform status across different formats
async syncStatus(issue: GitHubIssue): Promise<void> {
  const incrementTasks = await this.readIncrementTasks();
  const livingDocsTasks = await this.readLivingDocsTasks();
  const issueTasks = this.parseIssueTasks(issue.body);

  // ❌ Three-way merge (conflict-prone!)
  for (const issueTask of issueTasks) {
    const incrementTask = incrementTasks.find(t => t.id === issueTask.id);
    const livingDocsTask = livingDocsTasks.find(t => t.id === issueTask.id);

    if (incrementTask && livingDocsTask) {
      // ❌ Which one is source of truth?
      if (issueTask.status !== incrementTask.status) {
        await this.updateIncrementTask(issueTask);
      }
      if (issueTask.status !== livingDocsTask.status) {
        await this.updateLivingDocsTask(issueTask);
      }
    }
  }
}
```

**NEW (Simple)**:
```typescript
// ✅ NEW: Single direction copy (GitHub is external source)
async syncStatus(issue: GitHubIssue): Promise<void> {
  // ✅ Parse tasks from issue (same format as living docs!)
  const issueTasks = this.parseIssueTasks(issue.body);

  // ✅ Update living docs (COPY status)
  const livingDocsPath = this.getLivingDocsPath(issue);
  await this.updateTaskStatus(livingDocsPath, issueTasks);

  // ✅ COPY living docs back to increment (source of truth sync)
  const incrementPath = this.getIncrementPath(issue);
  await fs.copyFile(livingDocsPath, incrementPath);

  console.log("✅ Status synced: GitHub → Living Docs → Increment");
}
```

**Why It Works**:
- Same format everywhere (no transformation!)
- Single direction: External tool → Living docs → Increment
- Copy operation only (no merge logic!)

---

## Implementation Impact on 0037

### Spec Changes Required

**BEFORE (Transformation-Based)**:
> "Implement task splitting logic where living docs sync SPLITS generic increment tasks into project-specific tasks"

**AFTER (Copy-Based)**:
> "Implement multi-project increment planning where PM agent creates project-specific US/tasks from the start, and living docs sync COPIES them to the correct location"

### Phase Renaming

| OLD Phase | NEW Phase |
|-----------|-----------|
| Phase 1: Task Splitting Logic | Phase 1: Architecture Detection (init) |
| Phase 2: Bidirectional Tracking | Phase 2: Multi-Project Planning (PM agent) |
| Phase 3: GitHub Sync Integration | Phase 3: Copy-Based Living Docs Sync |
| Phase 4: Testing & Migration | Phase 4: Copy-Based GitHub Sync |
|  | Phase 5: Testing & Migration |

---

## Benefits Summary

### Code Reduction
- **SpecDistributor**: 83% less code (300 → 50 lines)
- **GitHubIssueBuilder**: 80% less code (500 → 100 lines)
- **Total**: ~700 lines eliminated

### Reliability Improvement
- **No Guessing**: Projects explicit in metadata
- **No Transformation**: Copy operations can't lose data
- **Single Source**: Increment is truth, everything else is replica

### Developer Experience
- **Clear Architecture**: Projects defined upfront
- **Obvious Intent**: Filename `us-backend-001.md` is self-documenting
- **Predictable**: Copy operations are deterministic

### Maintenance
- **Less Code**: 80% reduction in sync logic
- **Simpler Logic**: Copy instead of transform
- **Fewer Bugs**: No merge conflicts, no guessing errors

---

## Migration Strategy

### For Existing Increments

**Option 1: Lazy Migration (Recommended)**
- Keep existing increments as-is (backward compatible)
- New increments use copy-based paradigm
- Migration script available for conversion

**Option 2: Batch Migration**
```bash
# Migrate all increments to copy-based
npm run migrate:copy-based

# What it does:
# 1. Reads increment tasks.md
# 2. Detects projects (heuristic-based, one-time)
# 3. Splits into us-{project}-{id}.md files
# 4. Adds project metadata
# 5. Updates living docs sync to use copy mode
```

### Configuration Flag

```json
{
  "livingDocs": {
    "syncMode": "copy",      // "copy" or "transform" (legacy)
    "projectAware": true     // Enable multi-project features
  }
}
```

---

## Risks & Mitigations

### Risk 1: User Doesn't Know Architecture Upfront
**Mitigation**: Allow changing architecture later via `specweave config:update`

### Risk 2: Single Project Users Confused by Questions
**Mitigation**: Smart defaults (detect monolith → skip project questions)

### Risk 3: Existing Increments Break
**Mitigation**: Backward compatibility mode (transform-based sync still available)

### Risk 4: Too Many Files in Multi-Project
**Mitigation**: Clear folder structure, good documentation

---

## Next Steps

1. **Update 0037 Spec**: Reflect copy-based paradigm (not transformation)
2. **Design Init Enhancement**: Add architecture detection questions
3. **Design PM Agent Enhancement**: Multi-project planning logic
4. **Prototype Copy-Based Sync**: Proof of concept
5. **Migration Script**: Convert existing increments

---

## Conclusion

This paradigm shift eliminates the fundamental complexity in SpecWeave's sync architecture:

**From**: Generic → Guess → Transform → Merge → Conflict
**To**: Explicit → Copy → Done

**Result**:
- 80% less code
- 100% more reliable
- Infinitely more maintainable
- Architecture-native from day 1

**The key insight**: If you detect architecture early and plan increments accordingly, sync becomes trivial because there's nothing to transform—just copy!
