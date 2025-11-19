# ADR-0037-001: Copy-Based Sync Paradigm

**Date**: 2025-11-15
**Status**: Proposed
**Context**: Multi-project feature development workflow
**Impact**: Critical - Fundamental architecture change

---

## Executive Summary

This ADR documents a fundamental paradigm shift in how SpecWeave handles multi-project features. We're moving from a **transformation-based sync** (where increment content is split/transformed during living docs sync) to a **copy-based sync** (where increment content is created project-specific from the start and simply copied to the right locations).

**Key Insight**: Architecture decisions must happen during `specweave init` and increment planning, NOT during living docs sync.

---

## Context

### Current Problem (Transformation-Based Sync)

**Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│ Increment Planning (generic, architecture-unaware)          │
│ - Creates: us-001.md (generic user story)                   │
│ - Creates: T-001 (generic task: "Implement authentication") │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Living Docs Sync (COMPLEX TRANSFORMATION)                   │
│ - SpecDistributor.classifyContentByProject()                │
│ - TaskProjectSpecificGenerator.generateProjectSpecificTasks()│
│ - ACProjectSpecificGenerator.makeProjectSpecific()          │
│ - Output: us-backend-001.md, us-frontend-001.md             │
│ - Output: T-BE-001, T-FE-001 (generated from T-001)         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ GitHub Sync (ANOTHER TRANSFORMATION)                         │
│ - Reads living docs files                                   │
│ - Transforms again for GitHub issue format                  │
│ - Output: GitHub issue body with checkboxes                 │
└─────────────────────────────────────────────────────────────┘
```

**Issues**:

1. **Project detection happens TOO LATE**:
   - PM agent creates generic increment without knowing projects
   - Living docs sync tries to "guess" which project each story/task belongs to
   - Complex keyword detection logic, fragile heuristics

2. **Multiple transformation layers**:
   - Increment → Living Docs (transformation)
   - Living Docs → GitHub (transformation)
   - Each layer has its own logic, hard to maintain
   - Bidirectional sync is nightmare (how to map back?)

3. **Architecture decisions made during sync**:
   - "Is this a backend or frontend task?" decided during living docs sync
   - Should be decided during increment planning!

4. **No monolith vs microservices awareness**:
   - `specweave init` doesn't ask about architecture
   - No way to store: "This is a monorepo with backend/frontend" vs "This is a polyrepo with 3 services"

5. **Status synchronization complexity**:
   - How to sync completion status from living docs back to increment?
   - Which is source of truth? Increment tasks.md or living docs TASKS.md?
   - Current approach: bidirectional tracking logic (complex!)

6. **GitHub vs JIRA hierarchy mismatch**:
   - GitHub: 2-level (Issue → Checkboxes)
   - JIRA: 3-level (Epic → Story → Task)
   - No explicit mapping during init

---

### Proposed Solution (Copy-Based Sync)

**Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│ specweave init (ARCHITECTURE-AWARE)                         │
│ - Ask: Monolith / Microservices / Event-Driven?             │
│ - Ask: Monorepo / Polyrepo / Multi-repo?                    │
│ - Ask: How many projects? (backend, frontend, mobile, etc.) │
│ - Store in .specweave/config.json                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ /specweave:increment (MULTI-PROJECT AWARE)                  │
│ PM Agent:                                                    │
│ - Reads config: projects = ["backend", "frontend"]          │
│ - Asks: "Does this feature need backend? (y/n)"             │
│ - Asks: "Does this feature need frontend? (y/n)"            │
│ - Creates: us-backend-001.md (backend-specific)             │
│ - Creates: us-frontend-001.md (frontend-specific)           │
│ - Creates: tasks.md with T-BE-001, T-FE-001                 │
│ - NO TRANSFORMATION NEEDED LATER!                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Living Docs Sync (SIMPLE COPY)                              │
│ - Copy us-backend-001.md → specs/backend/FS-XXX/us-001.md   │
│ - Copy us-frontend-001.md → specs/frontend/FS-XXX/us-001.md │
│ - Copy AC status (checkboxes) exactly as-is                 │
│ - Copy task status exactly as-is                            │
│ - NO TRANSFORMATION! Just file placement.                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ GitHub Sync (SIMPLE COPY)                                   │
│ - Read living docs file: specs/backend/FS-XXX/us-001.md     │
│ - Copy content to GitHub issue body (no transformation)     │
│ - Copy AC checkboxes as-is                                  │
│ - Copy task checkboxes as-is                                │
│ - Bidirectional sync = trivial (copy status back)           │
└─────────────────────────────────────────────────────────────┘
```

**Benefits**:

1. **Single source of truth**: Increment is created correctly from the start
2. **No transformation logic**: Living docs sync = file copy + placement
3. **No bidirectional sync complexity**: Status is same everywhere (copy)
4. **Architecture-aware from init**: Config stores monolith/microservices/polyrepo
5. **Project detection during planning**: PM agent knows which projects to create
6. **GitHub vs JIRA handled during init**: Config knows which external tool

---

## Decision

**We adopt the copy-based sync paradigm** for all multi-project features in SpecWeave.

This requires:

1. **Phase 1**: Enhance `specweave init` to detect architecture
2. **Phase 2**: Enhance PM Agent to be multi-project aware during increment planning
3. **Phase 3**: Simplify SpecDistributor to copy files (not transform)
4. **Phase 4**: Simplify GitHub sync to copy content (not transform)
5. **Phase 5**: Update universal hierarchy docs to clarify cross-cutting dimension

---

## Alternatives Considered

### Alternative 1: Keep Transformation-Based Sync (Current Approach)

**Pros**:
- Already implemented (sunk cost)
- Works for simple cases (single-project increments)

**Cons**:
- Complex transformation logic in SpecDistributor
- Complex bidirectional tracking logic
- Fragile keyword detection
- Status sync is nightmare
- No architecture awareness
- Multiple sources of truth (increment vs living docs)

**Why not chosen**: Doesn't scale to real-world multi-project scenarios. The transformation logic is too complex and fragile.

---

### Alternative 2: Hybrid Approach (Transform Only for Legacy)

**Description**: Keep transformation for backward compatibility, but use copy-based for new increments.

**Pros**:
- Backward compatible with existing increments
- Clean path forward for new work

**Cons**:
- Two code paths to maintain (transformation vs copy)
- Confusing for users (which mode am I in?)
- Legacy increments never get cleaned up

**Why not chosen**: Better to have a migration script than maintain two paradigms forever.

---

### Alternative 3: Post-Processing Transformation

**Description**: PM agent creates generic increment, then a separate `/specweave:split` command transforms it into project-specific files.

**Pros**:
- Explicit user control over transformation
- Can review generic increment before splitting

**Cons**:
- Still requires transformation logic
- Extra manual step (users will forget)
- Status sync still complex

**Why not chosen**: Why create generic if we know we need project-specific? Better to create correctly from the start.

---

## Consequences

### Positive

1. **Simpler codebase**:
   - Remove `TaskProjectSpecificGenerator` (not needed!)
   - Remove `ACProjectSpecificGenerator` (not needed!)
   - Remove `classifyContentByProject` (not needed!)
   - Reduce SpecDistributor from 2200 lines to ~800 lines

2. **Single source of truth**:
   - Increment files are created correctly from the start
   - Living docs = exact copy of increment
   - GitHub = exact copy of living docs
   - No ambiguity about which file is canonical

3. **Trivial bidirectional sync**:
   - User ticks checkbox in GitHub issue
   - Webhook updates living docs file (copy status)
   - Living docs file updates increment (copy status)
   - No complex mapping logic needed

4. **Architecture-aware from the start**:
   - Config stores: monolith vs microservices
   - Config stores: projects (backend, frontend, mobile)
   - Config stores: external tool (GitHub vs JIRA)
   - PM agent uses this info during planning

5. **Realistic increment planning**:
   - PM agent asks: "Does this feature need backend?"
   - Creates backend-specific US only if needed
   - Creates frontend-specific US only if needed
   - No "split all tasks equally" heuristics

6. **Clear project boundaries**:
   - Backend team: Works on specs/backend/FS-XXX/*
   - Frontend team: Works on specs/frontend/FS-XXX/*
   - No confusion about which files to edit

### Negative

1. **Breaking change**:
   - Existing increments use old format (generic user stories)
   - Need migration script to convert to project-specific format
   - Or: keep old increments as-is, only new increments use new format

2. **More files during increment planning**:
   - Old: 1 user story file (us-001.md)
   - New: 2 user story files (us-backend-001.md, us-frontend-001.md)
   - But: reflects reality! (backend and frontend are different)

3. **PM agent becomes more complex**:
   - Need to read config
   - Need to ask which projects feature applies to
   - Need to generate multiple US files
   - But: complexity is in the right place (planning, not sync)

4. **Cross-project features need careful handling**:
   - Example: Shared types (both backend and frontend)
   - Solution: Create US for each project that uses it
   - Or: Create separate "shared" project for cross-cutting concerns

### Neutral

1. **Learning curve**:
   - Users need to understand project-specific planning
   - But: mirrors real-world development (backend != frontend)

2. **Config.json becomes critical**:
   - Must be set up correctly during init
   - But: that's the right place for architecture decisions

---

## Implementation Plan

### Phase 1: Config Schema Design (This ADR)

**Files**:
- `.specweave/increments/0037-project-specific-tasks/reports/CONFIG-SCHEMA.md`

**Deliverables**:
- Define `.specweave/config.json` structure for architecture info
- Define project schema (id, name, type, techStack, keywords)
- Define architecture patterns (monolith, microservices, event-driven)
- Define repository strategies (monorepo, polyrepo, multi-repo)

**Effort**: 2-3 hours

---

### Phase 2: `specweave init` Enhancement

**Files**:
- `src/commands/init.ts`

**Changes**:
1. Add architecture detection questions:
   - "Architecture pattern? (monolith / microservices / event-driven)"
   - "Repository strategy? (monorepo / polyrepo / multi-repo)"
   - "External tracker? (GitHub / JIRA / Azure DevOps / None)"

2. Add project setup questions:
   - "How many projects? (1 for monolith, 2+ for multi-project)"
   - For each project: "Project name?", "Type? (backend/frontend/mobile/infrastructure)"
   - For each project: "Tech stack?" (multi-select)

3. Store in `.specweave/config.json`:
   ```json
   {
     "architecture": {
       "pattern": "microservices",
       "repositoryStrategy": "monorepo",
       "externalTracker": "github"
     },
     "multiProject": {
       "enabled": true,
       "projects": {
         "backend": {
           "name": "Backend API",
           "type": "backend",
           "techStack": ["Node.js", "PostgreSQL", "TypeScript"],
           "keywords": ["api", "backend", "database"]
         },
         "frontend": {
           "name": "Web UI",
           "type": "frontend",
           "techStack": ["React", "Next.js", "TypeScript"],
           "keywords": ["ui", "frontend", "component"]
         }
       }
     }
   }
   ```

**Effort**: 4-6 hours

---

### Phase 3: PM Agent Multi-Project Awareness

**Files**:
- `plugins/specweave/agents/pm.md` (agent instructions)
- `plugins/specweave/commands/increment.sh` (command logic)

**Changes**:

1. PM Agent reads config during increment planning:
   ```bash
   # In /specweave:increment command
   config=$(cat .specweave/config.json)
   projects=$(echo "$config" | jq -r '.multiProject.projects | keys[]')
   ```

2. PM Agent asks which projects this feature applies to:
   ```
   User: /specweave:increment "user authentication"

   PM Agent: I see you have 2 projects configured: backend, frontend

   Question 1: Does this feature require backend work? (y/n)
   > y

   Question 2: Does this feature require frontend work? (y/n)
   > y

   PM Agent: Creating project-specific user stories...
   - us-backend-001-jwt-auth-service.md
   - us-backend-002-user-database-schema.md
   - us-frontend-001-login-form-component.md
   - us-frontend-002-auth-state-management.md
   ```

3. PM Agent creates project-specific files in increment:
   ```
   .specweave/increments/0045-user-authentication/
   ├── spec.md (references both backend and frontend)
   ├── plan.md
   ├── tasks.md (contains T-BE-001, T-FE-001, etc.)
   ├── user-stories/
   │   ├── backend/
   │   │   ├── us-001-jwt-auth-service.md
   │   │   └── us-002-user-database-schema.md
   │   └── frontend/
   │       ├── us-001-login-form-component.md
   │       └── us-002-auth-state-management.md
   ```

4. File naming convention:
   - User stories: `user-stories/{project}/us-{num}-{slug}.md`
   - Tasks: `T-{PROJECT}-{num}` (e.g., T-BE-001, T-FE-001)
   - Acceptance criteria: `AC-{PROJECT}-{US}-{num}` (e.g., AC-BE-US1-01)

**Effort**: 8-12 hours

---

### Phase 4: SpecDistributor Simplification (Copy-Based Sync)

**Files**:
- `src/core/living-docs/spec-distributor.ts`

**Changes**:

1. Remove transformation logic:
   - Delete `classifyContentByProject()` (line 1115)
   - Delete `generateProjectSpecificTasks()` (called at line 1395)
   - Delete `ACProjectSpecificGenerator` usage (line 1430)

2. Implement simple copy logic:
   ```typescript
   async copyUserStoryFiles(incrementId: string, featureMapping: FeatureMapping) {
     const incrementPath = path.join('.specweave/increments', incrementId);
     const userStoriesPath = path.join(incrementPath, 'user-stories');

     // For each project folder in increment
     const projects = await fs.readdir(userStoriesPath);

     for (const project of projects) {
       const projectUSPath = path.join(userStoriesPath, project);
       const usFiles = await fs.readdir(projectUSPath);

       for (const file of usFiles) {
         const sourcePath = path.join(projectUSPath, file);
         const targetPath = path.join(
           '.specweave/docs/internal/specs',
           project,
           featureMapping.featureId,
           file
         );

         // Simple copy (preserves AC checkboxes, task checkboxes, status)
         await fs.copy(sourcePath, targetPath);
       }
     }
   }
   ```

3. Status sync becomes trivial:
   - Living docs sync: Copy from increment → living docs
   - Bidirectional sync: Copy from living docs → increment (when external tool updates)
   - No transformation, no mapping logic

**Effort**: 6-8 hours

---

### Phase 5: GitHub Sync Simplification

**Files**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
- `plugins/specweave-github/lib/github-feature-sync.ts`

**Changes**:

1. Read living docs file directly:
   ```typescript
   async buildIssueBody(userStoryPath: string) {
     // Read the living docs file
     const content = await fs.readFile(userStoryPath, 'utf-8');

     // Extract sections (no transformation!)
     const description = this.extractSection(content, 'Description');
     const acceptanceCriteria = this.extractSection(content, 'Acceptance Criteria');
     const tasks = this.extractSection(content, 'Tasks');

     // Copy to GitHub issue format
     return `
## Description
${description}

## Acceptance Criteria
${acceptanceCriteria}

## Tasks
${tasks}
     `;
   }
   ```

2. Bidirectional sync:
   - User ticks checkbox in GitHub issue
   - Webhook handler updates living docs file (find checkbox, update status)
   - Living docs sync copies back to increment (preserving status)

**Effort**: 4-6 hours

---

### Phase 6: Documentation Updates

**Files**:
- `.specweave/increments/0037-project-specific-tasks/spec.md` (rewrite)
- `.specweave/docs/internal/architecture/hld-system.md` (update)
- `.specweave/docs/public/guides/user-guide.md` (update)

**Changes**:
- Document copy-based sync paradigm
- Update user guide with new increment planning flow
- Update architecture docs with config schema

**Effort**: 3-4 hours

---

### Phase 7: Migration Script (Backward Compatibility)

**Files**:
- `scripts/migrate-to-copy-based-sync.ts`

**Purpose**: Convert existing increments (generic user stories) to new format (project-specific user stories)

**Strategy**:
1. Lazy migration: Only migrate when increment is edited
2. Or: Manual migration via script
3. Or: Keep old increments as-is (frozen)

**Effort**: 4-6 hours

---

## Total Estimated Effort

- Phase 1: Config schema design (2-3 hours)
- Phase 2: `specweave init` enhancement (4-6 hours)
- Phase 3: PM agent multi-project awareness (8-12 hours)
- Phase 4: SpecDistributor simplification (6-8 hours)
- Phase 5: GitHub sync simplification (4-6 hours)
- Phase 6: Documentation updates (3-4 hours)
- Phase 7: Migration script (4-6 hours)

**Total**: 31-45 hours (~1-2 weeks for 1 developer)

---

## Risks and Mitigations

### Risk 1: Breaking Change for Existing Users

**Impact**: High (existing increments use old format)

**Mitigation**:
1. **Versioned config**: Add `config.version` field
   ```json
   {
     "version": "2.0.0",
     "architecture": { ... }
   }
   ```
2. **Feature flag**: `config.livingDocs.useCopyBasedSync = true`
3. **Migration script**: Convert old increments on-demand
4. **Documentation**: Clear upgrade guide

---

### Risk 2: Cross-Project Features (Shared Code)

**Impact**: Medium (how to handle features that apply to ALL projects?)

**Mitigation**:
1. **Option A**: Create US for each project that uses it
   - Example: Shared types → us-backend-001-shared-types.md, us-frontend-001-shared-types.md
2. **Option B**: Create separate "shared" project
   - `config.projects.shared` for cross-cutting concerns
3. **Option C**: Allow multi-project US
   - Single US file with `projects: ["backend", "frontend"]` in frontmatter

**Recommendation**: Option C (multi-project US) for rare cases, Option A (duplicate US) for most cases

---

### Risk 3: PM Agent Complexity

**Impact**: Medium (PM agent logic becomes more complex)

**Mitigation**:
1. **Progressive disclosure**: Only ask project questions if `multiProject.enabled = true`
2. **Smart defaults**: If increment name contains "backend", pre-select backend project
3. **Configuration presets**: "Full-stack feature" = select all projects automatically

---

### Risk 4: User Confusion (Why Multiple US Files?)

**Impact**: Low (users need education)

**Mitigation**:
1. **Clear documentation**: Explain why backend != frontend
2. **Examples**: Show real-world increment with project-specific US
3. **Interactive init**: Explain architecture questions clearly

---

## Success Metrics

### Code Quality
- **Lines of code reduction**: Target 60% reduction in SpecDistributor (2200 → 800 lines)
- **Cyclomatic complexity**: Reduce from 45 → 15 (simpler logic)
- **Test coverage**: Maintain 95%+ (simpler code is easier to test)

### User Experience
- **Increment planning time**: Increase by 2-3 minutes (acceptable for correct planning)
- **Living docs sync time**: Reduce from 5s → 1s (simple copy is faster)
- **Status sync accuracy**: 100% (copy is lossless, transformation is lossy)

### Developer Experience (SpecWeave Contributors)
- **Onboarding time**: Reduce by 50% (simpler architecture)
- **Bug density**: Reduce by 70% (fewer transformation layers = fewer bugs)
- **Feature development velocity**: Increase by 40% (less legacy code to navigate)

---

## Related Decisions

- **ADR-0001**: Universal Hierarchy (Epic → Feature → User Story → Task)
- **ADR-0002**: GitHub vs JIRA Hierarchy Mapping
- **ADR-0034**: Project-Specific Acceptance Criteria
- **Future ADR**: Multi-Repo Support (polyrepo architecture)

---

## Review and Approval

**Reviewers**: @anton-abyzov (maintainer)
**Approval Status**: Pending review
**Next Steps**: Create CONFIG-SCHEMA.md and PM-AGENT-MULTI-PROJECT.md

---

**Status**: Proposed (2025-11-15)
**Decision Deadline**: 2025-11-22
**Implementation Start**: TBD (after approval)
