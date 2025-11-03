# GitHub-First Architecture Proposal
**Date**: 2025-11-01
**Increment**: 0004-plugin-architecture
**Status**: Proposed
**Priority**: P0 (Critical for SpecWeave's workflow)

---

## Executive Summary

Transform SpecWeave from **JIRA-first to GitHub-first** as the primary issue tracking and synchronization mechanism. This proposal introduces:

1. **Granular Task Sync**: Each task in `tasks.md` becomes a GitHub issue (not just increments)
2. **Subtask Support**: Tasks can have subtasks represented as GitHub task lists
3. **JIRA Becomes Optional Plugin**: Move JIRA to plugin architecture (secondary sync option)
4. **RFC Folder Reorganization**: Consolidate RFCs to `.specweave/docs/internal/architecture/rfc/`
5. **Enhanced GitHub Integration**: Leverage GitHub's native project management features

---

## Current State Analysis

### What We Have (v0.4.0)

**GitHub Plugin** (`src/plugins/specweave-github/`):
- ✅ **Increment → GitHub Issue** (1 increment = 1 issue)
- ✅ **Progress Updates** (comments after task completion)
- ✅ **Auto-Close** (close issue when increment completes)
- ✅ **Task Checklists** (checkboxes within single issue body)
- ⚠️ **Limitation**: All tasks in ONE issue (not granular enough)

**JIRA Integration** (`src/integrations/jira/`):
- ✅ **Bidirectional sync** (Jira Epic ↔ SpecWeave Increment)
- ✅ **Story-level mapping** (Jira Story ↔ SpecWeave User Story)
- ✅ **Sub-task support** (Jira Sub-task ↔ SpecWeave Task)
- ⚠️ **Problem**: Not in plugin architecture (core integration)
- ⚠️ **Usage**: SpecWeave itself doesn't use JIRA (uses GitHub)

### What's Broken

1. **Task Granularity Gap**:
   - SpecWeave has 48 tasks for increment 0004
   - Current GitHub plugin creates 1 issue with 48 checkboxes
   - Teams want 48 **separate issues** for assignment, discussion, tracking

2. **JIRA Priority Misalignment**:
   - SpecWeave dogfoods GitHub (github.com/anton-abyzov/specweave)
   - JIRA code exists but SpecWeave doesn't use it
   - JIRA should be optional plugin, not core

3. **RFC Folder Confusion**:
   - RFCs moved from `.specweave/docs/rfcs/` to `.specweave/docs/internal/architecture/rfc/`
   - Git shows deleted files in old location, new files untracked
   - JIRA mapper references new location but docs don't clarify

---

## Proposed Architecture

### 1. GitHub-First Sync Model

**Three-Level Hierarchy**:

```
GitHub Milestone (Release)
    ↓
GitHub Epic Issue (Increment)
    ↓
GitHub Task Issues (T-001, T-002, ...)
    ↓
GitHub Task Lists (Subtasks)
```

**Example for Increment 0004**:

```
Milestone: v0.4.0 - Plugin Architecture

Epic Issue #42: [INC-0004] Plugin Architecture
├─ Issue #43: [T-001] Create plugin type definitions
│  └─ Subtasks (in issue body):
│     - [ ] Define PluginManifest interface
│     - [ ] Define Plugin interface
│     - [ ] Define Skill, Agent, Command types
│     - [ ] Add JSDoc documentation
│
├─ Issue #44: [T-002] Create plugin manifest JSON schema
│  └─ Subtasks:
│     - [ ] Write schema.json
│     - [ ] Add validation logic
│     - [ ] Test with valid manifests
│     - [ ] Test error cases
│
├─ Issue #45: [T-003] Implement PluginLoader class
│  └─ Subtasks:
│     - [ ] loadFromDirectory() method
│     - [ ] loadManifest() method
│     - [ ] validateManifest() method
│     - [ ] loadSkills/Agents/Commands methods
│     - [ ] Error handling
│     - [ ] Unit tests
│
... (45 more task issues)
```

**Benefits**:
- ✅ **Granular Assignment**: Assign T-001 to dev1, T-002 to dev2
- ✅ **Parallel Work**: Team can tackle multiple tasks simultaneously
- ✅ **Focused Discussions**: Comments specific to each task
- ✅ **Better Tracking**: Close issues individually as tasks complete
- ✅ **GitHub Projects**: Drag tasks across Kanban boards
- ✅ **Dependencies**: Link issues (T-003 depends on T-001, T-002)

### 2. tasks.md Structure Enhancement

**Current Format** (increment 0004):
```markdown
### T-001: Create Plugin Type Definitions
**Priority**: P0
**Estimate**: 2 hours
**Status**: pending

**Description**: Create TypeScript interfaces and types for plugin system.

**Files to Create**:
- `src/core/types/plugin.ts`

**Implementation**:
[TypeScript code example]

**Acceptance Criteria**:
- ✅ All interfaces defined
- ✅ TypeScript compiles without errors
```

**Proposed Enhancement**:
```markdown
### T-001: Create Plugin Type Definitions
**Priority**: P0
**Estimate**: 2 hours
**Status**: pending
**GitHub Issue**: #43
**Assignee**: @developer1

**Description**: Create TypeScript interfaces and types for plugin system.

**Subtasks**:
- [ ] S-001-01: Define PluginManifest interface (30min)
- [ ] S-001-02: Define Plugin interface (30min)
- [ ] S-001-03: Define Skill, Agent, Command types (45min)
- [ ] S-001-04: Add JSDoc documentation (15min)

**Files to Create**:
- `src/core/types/plugin.ts`

**Implementation**:
[TypeScript code example]

**Acceptance Criteria**:
- ✅ All interfaces defined
- ✅ TypeScript compiles without errors
- ✅ JSDoc on all exports
- ✅ Unit tests pass

**Dependencies**:
- None (foundation task)

**Blocks**:
- T-003 (PluginLoader needs types)
- T-004 (PluginManager needs types)
```

**New Fields**:
- `GitHub Issue`: Link to GitHub issue number
- `Assignee`: Team member responsible
- `Subtasks`: Granular steps within task (optional)
- `Dependencies`: Which tasks must complete first
- `Blocks`: Which tasks are waiting on this one

### 3. Sync Workflow

**A. Increment Creation** (`/specweave:inc`):

```bash
User: /specweave:inc "0004-plugin-architecture"

SpecWeave:
1. Creates increment folder structure
2. Generates spec.md, plan.md, tasks.md, tests.md
3. Parses tasks.md to extract all tasks
4. Creates GitHub Milestone: "v0.4.0 - Plugin Architecture"
5. Creates GitHub Epic Issue #42: "[INC-0004] Plugin Architecture"
   - Body: Executive summary from spec.md
   - Labels: increment, P0
   - Milestone: v0.4.0
6. Creates 48 GitHub Task Issues (#43-#90):
   - Title: "[T-001] Create plugin type definitions"
   - Body: Task description + subtasks + acceptance criteria
   - Labels: task, phase-1-foundation, P0
   - Milestone: v0.4.0
   - Linked to Epic #42 (via "Part of #42" in body)
7. Updates tasks.md with GitHub issue numbers
8. Stores mapping in .specweave/increments/0004/.github-sync.yaml

✅ Created 1 epic + 48 task issues on GitHub
```

**B. Task Execution** (`/specweave:do`):

```bash
User: /specweave:do

SpecWeave:
1. Finds next pending task: T-001
2. Sets task status: in_progress
3. Updates GitHub Issue #43:
   - Add label: in-progress
   - Post comment: "🚀 Task started by @developer1"
4. Claude executes task implementation
5. On completion:
   - Set task status: completed
   - Update GitHub Issue #43:
     - Check off task checkbox in Epic #42
     - Close Issue #43
     - Post comment with summary:
       * Files changed
       * Tests passing
       * Time taken (actual vs estimate)
   - Update Epic #42 progress: "7/48 tasks complete (15%)"

✅ Task T-001 completed and synced to GitHub
```

**C. Subtask Tracking**:

Each task issue can have subtasks as GitHub task lists:

```markdown
## Subtasks

- [x] S-001-01: Define PluginManifest interface ✅
- [x] S-001-02: Define Plugin interface ✅
- [ ] S-001-03: Define Skill, Agent, Command types 🔄
- [ ] S-001-04: Add JSDoc documentation ⏳
```

**Sync Logic**:
- SpecWeave updates checkboxes as work progresses
- Can manually check off in GitHub (syncs back to tasks.md)
- Progress bar in issue shows subtask completion

### 4. JIRA Migration to Plugin

**Move** `src/integrations/jira/` → `src/plugins/specweave-jira/`

**Structure**:
```
src/plugins/specweave-jira/
├── .claude-plugin/
│   └── manifest.json
├── skills/
│   └── jira-sync/
│       └── SKILL.md
├── agents/
│   └── jira-manager/
│       └── AGENT.md
├── commands/
│   ├── jira-create-epic.md
│   ├── jira-sync.md
│   └── jira-close-epic.md
├── lib/
│   ├── jira-client.ts (moved from integrations/)
│   └── jira-mapper.ts (moved from integrations/)
└── README.md
```

**manifest.json**:
```json
{
  "name": "specweave-jira",
  "version": "1.0.0",
  "description": "JIRA integration for SpecWeave increments. Alternative to GitHub sync for enterprise teams using Atlassian.",
  "auto_detect": {
    "env_vars": ["JIRA_URL", "JIRA_TOKEN"],
    "packages": ["jira-client"]
  },
  "provides": {
    "skills": ["jira-sync"],
    "agents": ["jira-manager"],
    "commands": [
      "specweave.jira.create-epic",
      "specweave.jira.sync",
      "specweave.jira.close-epic"
    ]
  },
  "triggers": ["jira", "JIRA", "epic", "story", "subtask", "atlassian"]
}
```

**Why Plugin?**:
- ✅ SpecWeave itself doesn't use JIRA (uses GitHub)
- ✅ Enterprise teams can opt-in if needed
- ✅ Reduces core context by ~8K tokens
- ✅ Same functionality, just optional
- ✅ Can coexist with GitHub plugin (dual sync)

### 5. RFC Folder Consolidation

**Current Mess**:
```
# OLD LOCATION (deleted in git)
.specweave/docs/rfcs/
├── rfc-0003-specweave-test-test-epic-for-sync.md ❌
└── rfc-0005-authentication-features.md ❌

# NEW LOCATION (untracked in git)
.specweave/docs/internal/architecture/rfc/
├── rfc-0003-specweave-test-test-epic-for-sync.md ✅
└── rfc-0005-authentication-features.md ✅
```

**Clean Solution**:

1. **Commit the move** (this is correct!):
   ```bash
   git add .specweave/docs/internal/architecture/rfc/
   git commit -m "refactor(docs): consolidate RFCs to internal/architecture/rfc/"
   ```

2. **Update all references**:
   - `src/integrations/jira/jira-mapper.ts` ✅ (already correct)
   - `CLAUDE.md` - Document RFC location
   - `README.md` - Update docs structure
   - `.specweave/docs/internal/architecture/README.md` - Add RFC index

3. **Final structure**:
   ```
   .specweave/docs/internal/architecture/
   ├── adr/ (Architecture Decision Records)
   ├── rfc/ (Request for Comments - detailed specs)
   ├── diagrams/ (Mermaid + SVG)
   └── hld-system.md (High-Level Design)
   ```

**Why This Location?**:
- ✅ RFCs are INTERNAL strategic docs (not public)
- ✅ Grouped with ADRs and diagrams (architectural artifacts)
- ✅ Aligns with JIRA mapper expectations
- ✅ Cleaner than top-level `docs/rfcs/`

**Connect to 0004**:

Add to `.specweave/increments/0004-plugin-architecture/spec.md`:

```markdown
### US-014: RFC Folder Consolidation

**As a** SpecWeave contributor
**I want** RFCs in a consistent location
**So that** documentation structure is clear

**Acceptance Criteria**:
- ✅ All RFCs in `.specweave/docs/internal/architecture/rfc/`
- ✅ Old location deleted
- ✅ All references updated
- ✅ README.md documents structure
```

---

## Implementation Plan

### Phase 1: RFC Cleanup (1 hour)

**Tasks**:
- [ ] Commit RFC folder move
- [ ] Update CLAUDE.md documentation
- [ ] Update README.md structure section
- [ ] Add to increment 0004 spec

**Outcome**: Clean RFC structure, no git warnings

### Phase 2: Enhanced GitHub Sync (8 hours)

**Tasks**:
- [ ] Update `github-sync` skill:
  - Parse tasks.md to extract tasks
  - Create GitHub issues per task (not just increment)
  - Support subtask checkboxes
  - Link task issues to epic issue
- [ ] Update `github-issue-tracker` skill:
  - Per-task issue management
  - Dependency tracking (blocks/depends-on)
  - Assignee sync
- [ ] Add new command: `/specweave:github:sync-tasks`
  - Force re-sync all tasks for increment
  - Handle drift (manual GitHub changes)
- [ ] Update tasks.md template:
  - Add `GitHub Issue` field
  - Add `Assignee` field
  - Add `Subtasks` section
  - Add `Dependencies` and `Blocks` fields

**Outcome**: Full task-level GitHub integration

### Phase 3: JIRA Plugin Migration (4 hours)

**Tasks**:
- [ ] Move `src/integrations/jira/` → `src/plugins/specweave-jira/`
- [ ] Create plugin manifest
- [ ] Create SKILL.md for jira-sync
- [ ] Create AGENT.md for jira-manager
- [ ] Update tests to reflect plugin structure
- [ ] Add to plugin marketplace

**Outcome**: JIRA as optional plugin

### Phase 4: Documentation (2 hours)

**Tasks**:
- [ ] Update CLAUDE.md:
  - GitHub-first philosophy
  - JIRA as optional plugin
  - RFC structure
- [ ] Update README.md:
  - GitHub integration highlights
  - Task-level tracking
- [ ] Create migration guide:
  - For teams using JIRA (enable plugin)
  - For teams using GitHub (no change)

**Outcome**: Clear documentation

### Phase 5: Dogfooding (2 hours)

**Tasks**:
- [ ] Re-sync increment 0004 with new architecture:
  - Create 48 GitHub issues for tasks
  - Test task completion flow
  - Verify epic updates
- [ ] Test on increment 0003 (intelligent-model-selection)
- [ ] Validate with real SpecWeave workflow

**Outcome**: Proven in production

---

## Migration Strategy

### For Existing SpecWeave Projects

**Scenario 1: Using GitHub** (most users):
```bash
# Automatically upgrade to task-level sync
specweave migrate:v0.4.1

# Re-sync existing increments (optional)
/specweave:github:sync-tasks 0004 --create-issues
```

**Scenario 2: Using JIRA** (enterprise):
```bash
# Enable JIRA plugin
specweave plugin enable specweave-jira

# Continue using JIRA sync
/specweave:jira.sync 0004
```

**Scenario 3: Using Both** (rare):
```bash
# Enable both plugins
specweave plugin enable specweave-github
specweave plugin enable specweave-jira

# Dual sync (GitHub primary, JIRA mirror)
# Both update automatically
```

### For SpecWeave Itself

```bash
# 1. RFC cleanup
git add .specweave/docs/internal/architecture/rfc/
git commit -m "refactor(docs): consolidate RFCs to internal/architecture/rfc/"

# 2. Re-sync increment 0004 with task-level issues
/specweave:github:sync-tasks 0004 --create-issues
# Creates issues #43-#90 on github.com/anton-abyzov/specweave

# 3. Test workflow
/specweave:do
# Completes T-001, closes issue #43, updates epic #42

# 4. Migrate JIRA to plugin
specweave plugin create specweave-jira
# Move files, create manifest, test
```

---

## Benefits

### For SpecWeave Users

1. **Better Team Collaboration**:
   - Assign tasks to specific developers
   - Discuss tasks in dedicated GitHub issues
   - Track blockers and dependencies

2. **Superior Project Management**:
   - Use GitHub Projects (Kanban boards)
   - Filter by assignee, label, milestone
   - Visualize dependencies (issue links)

3. **Reduced Context Bloat**:
   - JIRA plugin only loads if needed (-8K tokens)
   - GitHub plugin optimized for task-level sync

4. **Industry-Standard Workflow**:
   - GitHub is ubiquitous (JIRA requires license)
   - Open source projects use GitHub natively
   - Easier onboarding for new contributors

### For SpecWeave Itself

1. **Dogfooding Excellence**:
   - Use our own GitHub integration (eat our own dog food)
   - Prove SpecWeave works for real projects
   - Showcase best practices

2. **Open Source Alignment**:
   - github.com/anton-abyzov/specweave uses GitHub issues
   - Community can see tasks, track progress
   - Transparent development

3. **Maintainability**:
   - GitHub plugin is simpler than JIRA
   - Fewer dependencies (just `gh` CLI)
   - Better integration with GitHub Actions

---

## Risks & Mitigations

### Risk 1: Breaking Change for JIRA Users

**Mitigation**:
- JIRA plugin provides same functionality
- Migration guide explains enable process
- Auto-detect during `specweave init`
- Support both during transition (v0.4.x)

### Risk 2: GitHub API Rate Limits

**Problem**: Creating 48 issues could hit rate limits

**Mitigation**:
- Batch create with delays (10 issues/minute)
- Use GitHub GraphQL API (more efficient)
- Cache locally, sync asynchronously
- Show progress bar during sync

### Risk 3: Manual GitHub Edits Cause Drift

**Problem**: User closes task issue manually, SpecWeave out of sync

**Mitigation**:
- Periodic sync check (daily or on-demand)
- `/specweave:github:status 0004` shows drift
- `/specweave:github:sync-tasks 0004 --force` re-syncs
- Warning if drift detected: "Issue #43 closed in GitHub but task T-001 still pending locally"

### Risk 4: Too Many GitHub Issues

**Problem**: 48 issues per increment clutters repository

**Mitigation**:
- Use labels to filter: `increment:0004`, `phase:1`
- Close tasks as completed (hidden by default in GitHub)
- Archive to GitHub Projects after increment done
- Configurable: `auto_create_task_issues: false` to disable

---

## Success Criteria

**Must Have**:
- ✅ RFC folder consolidated to `.specweave/docs/internal/architecture/rfc/`
- ✅ Each task in tasks.md syncs to GitHub issue
- ✅ Subtasks represented as GitHub task lists
- ✅ JIRA moved to plugin architecture
- ✅ SpecWeave dogfoods GitHub sync (increment 0004 synced)
- ✅ Documentation updated (CLAUDE.md, README.md)
- ✅ Migration guide for JIRA users

**Nice to Have**:
- GitHub Projects template (auto-configure Kanban)
- GitHub Actions integration (auto-close on PR merge)
- Issue templates for tasks (.github/ISSUE_TEMPLATE/task.md)
- Dependency visualization (Mermaid diagram from task links)

---

## Timeline

**Week 1** (Phase 1-2):
- Days 1-2: RFC cleanup + GitHub sync enhancement
- Days 3-5: Testing and refinement

**Week 2** (Phase 3-4):
- Days 1-2: JIRA plugin migration
- Days 3-4: Documentation
- Day 5: Dogfooding (re-sync 0004)

**Total**: 10 days (2 weeks)

---

## Next Steps

1. **Review this proposal** with SpecWeave team
2. **Approve architectural direction** (GitHub-first, JIRA plugin)
3. **Create implementation tasks** (add to increment 0004 or new increment)
4. **Execute Phase 1** (RFC cleanup - quick win!)
5. **Prototype Phase 2** (task-level GitHub sync)
6. **Dogfood on SpecWeave** (real-world validation)

---

## Appendix: Comparison Matrix

| Feature | Current (v0.4.0) | Proposed (v0.4.1) |
|---------|------------------|-------------------|
| **Increment → GitHub** | 1 issue per increment | 1 epic + N task issues |
| **Task Tracking** | Checkboxes in epic body | Individual issues per task |
| **Assignees** | Epic-level only | Per-task granular |
| **Discussions** | All in one thread | Focused per task |
| **Dependencies** | Manual (in plan.md) | GitHub issue links |
| **Subtasks** | N/A | GitHub task lists |
| **JIRA Integration** | Core (always loaded) | Plugin (opt-in) |
| **RFC Location** | Inconsistent | `.specweave/docs/internal/architecture/rfc/` |
| **Context Usage** | Core + JIRA (~20K) | Core only (~12K) |

---

**Decision**: Pending approval
**Owner**: Anton Abyzov
**Reviewers**: SpecWeave Core Team
**Version**: 1.0
**Last Updated**: 2025-11-01
