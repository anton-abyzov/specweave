# ADR-0007: GitHub-First Task-Level Synchronization

**Status**: Accepted
**Date**: 2025-11-01
**Deciders**: SpecWeave Core Team (Anton Abyzov)
**Related**: Increment 0004-plugin-architecture

---

## Context

### Current State (v0.4.0)

SpecWeave currently syncs **increments** to GitHub as single issues:
- 1 Increment → 1 GitHub Issue
- Issue body contains task checklist
- All tasks tracked within one issue
- Progress updated via comments

**Example**:
```
Issue #42: [INC-0004] Plugin Architecture
Body:
## Tasks
- [ ] T-001: Create plugin type definitions
- [ ] T-002: Create plugin manifest schema
...
- [ ] T-048: Test marketplace installation
```

### Problem

Teams need **granular task-level tracking** for:

1. **Individual Assignment**: Cannot assign specific tasks to team members (only epic-level assignment)
2. **Parallel Work**: Hard to coordinate multiple developers working on different tasks
3. **Focused Discussions**: All task discussions mixed in one thread (noisy)
4. **GitHub Projects**: Cannot drag individual tasks on Kanban boards (only epic)
5. **Dependencies**: Cannot link task dependencies via GitHub's native issue linking
6. **Visibility**: Managers/stakeholders cannot see progress at task level

### User Pain Points

**Team Lead**:
> "We have 48 tasks in this increment. I need to assign Task 1-5 to Alice, 6-10 to Bob, and 11-15 to Carol. But there's only one GitHub issue, so I can't assign granularly. Everyone has to coordinate manually."

**Developer**:
> "I'm working on Task 7, but the epic issue has 200 comments about all 48 tasks. I can't find the relevant discussion for my specific task."

**Project Manager**:
> "I want to see which tasks are done on our Kanban board. But there's only one card for the entire increment. I can't visualize progress at task level."

---

## Decision

Implement **task-level GitHub synchronization** with the following architecture:

### Hierarchy

```
GitHub Milestone (Release)
    ↓
GitHub Epic Issue (Increment)
    ↓
GitHub Task Issues (T-001, T-002, ...)
    ↓
GitHub Task Lists (Subtasks within issue)
```

### Mapping

| SpecWeave Concept | GitHub Concept | Example |
|-------------------|----------------|---------|
| Release/Version | Milestone | `v0.4.0` |
| Increment | Epic Issue | `#42: [INC-0004] Plugin Architecture` |
| Task | Task Issue | `#43: [T-001] Create plugin type definitions` |
| Subtask | Checkbox in issue body | `- [ ] S-001-01: Define PluginManifest` |
| Dependency | Issue link | `Depends on #43, #44` |
| Blocker | Issue link | `Blocks #47, #48` |

### Sync Strategy

**GitHub is PRIMARY** (JIRA remains secondary for enterprise):

1. **Initial Sync** (`/specweave:github:sync-tasks 0004`):
   - Create Milestone: `v0.4.0`
   - Create Epic Issue: `#42` (increment summary + task checklist)
   - Create 48 Task Issues: `#43-#90` (one per task, linked to epic)
   - Update `tasks.md` with issue numbers
   - Store mapping in `.github-sync.yaml`

2. **During Development** (`/specweave:do`):
   - Task completed → Close task issue (#43)
   - Check off task in epic (#42)
   - Post completion comment (stats, files changed, next task)
   - Update epic progress (7/48 = 15%)

3. **Subtask Tracking**:
   - Subtasks as checkboxes in task issue body
   - Sync checkbox state on subtask completion
   - Comment when all subtasks done

---

## Rationale

### Why Task-Level Sync?

1. **SpecWeave Dogfoods GitHub**: `github.com/anton-abyzov/specweave` uses GitHub, not JIRA
2. **Open Source Standard**: GitHub issues are ubiquitous (JIRA requires license)
3. **Better Collaboration**: Granular assignment, parallel work, focused discussions
4. **Native Integration**: GitHub Projects, Actions, Dependabot, webhooks
5. **Simpler**: GitHub CLI (`gh`) is easier than JIRA REST API
6. **Transparent**: Public repos can show progress to community

### Why Not Just JIRA?

- SpecWeave doesn't use JIRA internally (GitHub primary)
- Open source projects typically use GitHub
- JIRA requires commercial license ($7-14/user/month)
- GitHub is free for public repos
- GitHub has superior integration with git workflow

**JIRA Still Supported**: Remains as optional plugin for enterprise teams

### Why 1 Task = 1 Issue?

**Alternative 1**: Keep 1 increment = 1 issue (current)
- ❌ No granular assignment
- ❌ Noisy discussion thread
- ❌ No Kanban per-task

**Alternative 2**: 1 increment = 1 issue + comments per task
- 🟡 Better than current, but comments lack full issue features
- ❌ Cannot assign comments
- ❌ Cannot link dependencies
- ❌ No Kanban cards

**Alternative 3**: 1 task = 1 issue ✅ (CHOSEN)
- ✅ Full GitHub features per task
- ✅ Granular assignment
- ✅ Focused discussion
- ✅ Kanban integration
- ✅ Dependency linking
- ⚠️ More issues created (48 for increment 0004)

**Mitigate "Too Many Issues"**:
- Use labels to filter: `increment:0004`, `phase:1`, `task`
- Close issues as completed (hidden by default in GitHub)
- Archive to Projects after increment done
- Optional: Disable auto-sync (`auto_create_task_issues: false`)

---

## Consequences

### Positive

✅ **Better Team Collaboration**:
- Assign T-001 to Alice, T-002 to Bob (granular assignment)
- Parallel work without coordination overhead
- Focused discussions (one thread per task, not 200 comments mixed)

✅ **Native GitHub Workflow**:
- Drag tasks on GitHub Projects Kanban
- Link pull requests to task issues
- Automated workflows via GitHub Actions
- Dependency visualization (issue graph)

✅ **Superior Project Management**:
- Real-time progress at task level
- Filter by assignee, label, milestone
- Track blockers and dependencies
- Export data via GitHub API

✅ **Open Source Friendly**:
- Public visibility into development
- Community can see progress
- Contributors can help with specific tasks

### Negative

⚠️ **More GitHub Issues**:
- 48 tasks = 48 issues (vs 1 epic)
- Potential clutter in issue tracker
- Mitigation: Labels, filters, auto-close

⚠️ **GitHub Rate Limits**:
- API limit: 5000 requests/hour (authenticated)
- Batch creation: 10 issues/minute (6s delay)
- Mitigation: Rate limit checking, batching, delays

⚠️ **Potential Drift**:
- Manual GitHub edits may conflict with SpecWeave
- Mitigation: Sync status checks, drift warnings, force re-sync

⚠️ **Noise for Solo Developers**:
- Solo dev may not need 48 separate issues
- Mitigation: Make task-level sync optional (config flag)

### Neutral

🔄 **JIRA Still Supported**:
- Remains as optional plugin for enterprise
- Can dual-sync (GitHub + JIRA simultaneously)
- No breaking changes for JIRA users

🔄 **Backward Compatible**:
- Existing increment-level sync still works
- Task-level sync is additive (not breaking)
- Can migrate incrementally

---

## Implementation

### Components

**TypeScript Libraries** (`src/plugins/specweave-github/lib/`):
- `task-parser.ts` - Parse tasks.md into structured Task objects
- `github-client.ts` - GitHub CLI wrapper (uses `gh` command)
- `task-sync.ts` - Orchestrate sync (create milestone, epic, task issues)
- `subtask-sync.ts` - Sync subtask checkboxes to GitHub

**Slash Command**:
- `/specweave:github:sync-tasks` - Sync all tasks for increment

**Integration**:
- `/specweave:do` - Close task issue on completion, update epic
- `/specweave:done` - Close epic issue when increment completes

**Templates**:
- `tasks.md.template` - Enhanced with GitHub Issue, Assignee, Dependencies fields

### Workflow

![architecture-adr-adr-0007-github-first-task-sync-0](../diagrams/architecture-adr-adr-0007-github-first-task-sync-0.svg)

---

## Alternatives Considered

### Alternative 1: Keep Current (1 Increment = 1 Issue)

**Pros**:
- Simple
- Fewer issues
- No changes needed

**Cons**:
- Cannot assign tasks granularly
- Discussion thread becomes noisy (200+ comments)
- No Kanban per-task
- Limited project management features

**Verdict**: ❌ Rejected (doesn't meet team needs)

### Alternative 2: Use GitHub Projects + Checklists

**Approach**: Use GitHub Projects with task items (not issues)

**Pros**:
- Lightweight
- Still in one issue
- Some Kanban support

**Cons**:
- Task items lack full issue features
- Cannot assign task items to people
- Cannot link dependencies
- Cannot create PR references

**Verdict**: ❌ Rejected (lacks features we need)

### Alternative 3: Use External Tool (Linear, Asana, etc.)

**Approach**: Sync to third-party project management tool

**Pros**:
- Feature-rich PM tools
- Better UI than GitHub

**Cons**:
- Requires additional accounts/licenses
- More complexity
- Worse git integration
- Not open source friendly

**Verdict**: ❌ Rejected (adds complexity, cost)

### Alternative 4: 1 Task = 1 Issue ✅ (CHOSEN)

**Approach**: Create individual GitHub issues for each task

**Pros**:
- Full GitHub features per task
- Native workflow
- No external dependencies
- Transparent for open source

**Cons**:
- More issues created
- Rate limit consideration

**Verdict**: ✅ **Accepted** (best balance of features vs complexity)

---

## Risk Mitigation

### Risk 1: Too Many GitHub Issues

**Mitigation**:
- Labels for filtering (`task`, `increment:0004`, `phase:1`)
- Auto-close tasks as completed
- Archive old increments to Projects
- Config option to disable: `auto_create_task_issues: false`

### Risk 2: GitHub Rate Limits

**Mitigation**:
- Batch creation (10 issues/minute, 6s delay)
- Rate limit checking before sync
- Configurable batch size and delay
- Graceful failure with retry instructions

### Risk 3: Manual GitHub Edits Cause Drift

**Mitigation**:
- Drift detection: `/specweave:github:status 0004`
- Force re-sync: `/specweave:github:sync-tasks 0004 --force`
- Warning when drift detected
- tasks.md remains source of truth

### Risk 4: Complexity for Solo Developers

**Mitigation**:
- Make task-level sync optional (default: on for teams, off for solo)
- Dry-run mode: `--dry-run` to preview
- Documentation for disabling

---

## Success Metrics

### Performance

- **Sync Speed**: < 2 minutes to sync 48 tasks (including rate limiting)
- **Accuracy**: 100% tasks synced correctly
- **Uptime**: 99% sync success rate (handle transient GitHub errors)

### Adoption

- **SpecWeave Dogfooding**: Use on increments 0004, 0005, 0006
- **User Feedback**: >= 4/5 rating for "task-level sync is useful"
- **Issue Count**: Demonstrate value with 50+ tasks managed via GitHub

### Quality

- **Drift Detection**: < 5% drift cases (manual edits conflicting with sync)
- **Rate Limit Errors**: < 1% of syncs fail due to rate limits
- **Documentation**: >= 90% of questions answered by docs (reduce support load)

---

## References

- **Related ADRs**:
  - [ADR-0002: Context Loading Architecture](adr-0002-context-loading-architecture.md)
  - [ADR-0006: Plugin Architecture](adr-0006-plugin-architecture.md)

- **Implementation**:
  - Increment: [0004-plugin-architecture](../../increments/0004-plugin-architecture/)
  - Tasks: T-024-C through T-024-H (Phase 2.5)

- **External References**:
  - [GitHub CLI Documentation](https://cli.github.com/manual/)
  - [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
  - [GitHub Issues API](https://docs.github.com/en/rest/issues)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-01 | Anton Abyzov | Initial ADR - GitHub-first task sync |

---

**Status**: ✅ Accepted
**Next**: Implement tasks T-024-C through T-024-H (v0.4.1 release)
