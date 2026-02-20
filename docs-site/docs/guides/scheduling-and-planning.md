# Scheduling and Planning with SpecWeave

**How to manage sprints, estimates, and release planning alongside SpecWeave implementation tracking**

---

## Overview

SpecWeave is **implementation-first**, not **planning-first**. We focus on execution (what/how/status), while you use external tools for coordination (when/effort/capacity).

### Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: SpecWeave (Implementation Truth)                   │
├─────────────────────────────────────────────────────────────┤
│ • What to build (specs, user stories, acceptance criteria) │
│ • How to build (plans, architecture, tasks)                 │
│ • Implementation status (completed, in progress, blocked)   │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    Sync (status only)
                            ↕
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: External Tool (Planning Truth)                     │
├─────────────────────────────────────────────────────────────┤
│ • When to build (sprints, iterations, release dates)        │
│ • How much effort (story points, hours, estimates)          │
│ • Team capacity (velocity, sprint planning, burndown)       │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight**: SpecWeave populates issues, you organize them for scheduling.

---

## What SpecWeave Does NOT Manage

SpecWeave deliberately **does not sync** scheduling and planning metadata:

| Metadata Type | Examples | Why Not Synced |
|---------------|----------|----------------|
| **Sprint/Iteration** | Sprint 23, Iteration 4, 2025-W47 | Team coordination, not implementation |
| **Estimates** | Story points, hours, t-shirt sizes | Varies by team, not source code |
| **Dates** | Due dates, target dates, release dates | Planning concern, not implementation |
| **Capacity** | Team velocity, sprint capacity | Team management, not code execution |
| **Time Tracking** | Logged hours, remaining hours | Team management, not implementation |
| **Burndown** | Sprint burndown, release burndown | Reporting concern, not code execution |

**Why**: Scheduling is a **team coordination concern** managed in external tools. SpecWeave focuses on implementation (what/how/status), not planning (when/effort).

---

## Recommended Workflow by Tool

### GitHub Users: GitHub Projects

**Setup**:
1. SpecWeave syncs increments → GitHub Issues (automatic via `/specweave-github:create-issue`)
2. Create GitHub Project for scheduling (Web UI or CLI)
3. Add SpecWeave issues to Project
4. Manage sprints/estimates/dates in Project UI

**Workflow**:

```bash
# 1. SpecWeave creates increment + syncs to GitHub
/specweave:increment "Multi-repo scheduling support"
# → Creates increment 0034-multi-repo-scheduling
# → Auto-creates GitHub issue #67 (via post-increment-planning hook)

# 2. Manually add to GitHub Project (via Web UI or CLI)
gh project item-add <PROJECT_NUMBER> \
  --owner anton-abyzov \
  --url https://github.com/anton-abyzov/specweave/issues/67

# 3. Set scheduling fields in GitHub Project UI:
# - Sprint: "2025-W47"
# - Story Points: 8
# - Target Version: "0.19.0"
# - Due Date: "2025-11-30"

# 4. Work on increment as usual
/specweave:do
# → Updates GitHub issue status automatically
# → GitHub Project reflects changes (status, checkboxes)
```

**Recommended GitHub Project Template**: "Feature release"

**Why**:
- ✅ Milestone-centric (matches SpecWeave's Feature concept)
- ✅ Prioritized work items (P1/P2/P3 matches SpecWeave tasks)
- ✅ Custom fields for estimates and dates
- ✅ Multiple views (Board, Table, Roadmap)

**Setup Steps**:
1. Go to: `https://github.com/users/[USERNAME]/projects/new`
2. Select "Feature release" template
3. Name it: "SpecWeave Development Roadmap"
4. Add custom fields:
   - **Sprint** (Iteration) - Text field
   - **Story Points** - Number field
   - **Target Version** - Single select (0.19.0, 0.20.0, etc.)
   - **Epic** (Feature ID) - Text field (FS-XXX)
5. Create views:
   - **By Sprint**: Group by Sprint field
   - **By Epic**: Group by Epic field
   - **Roadmap**: Timeline view with Target Version
   - **Backlog**: All unassigned items

**Result**: You get scheduling via GitHub Projects UI, while SpecWeave sync handles implementation status.

---

### JIRA Users: JIRA Boards + Sprints

**Setup**:
1. SpecWeave syncs increments → JIRA Epics/Stories (via `/specweave-jira:sync`)
2. Use JIRA's native sprint planning
3. Assign stories to sprints in JIRA
4. SpecWeave reflects implementation status only

**Workflow**:

```bash
# 1. SpecWeave creates increment + syncs to JIRA
/specweave:increment "Authentication service"
# → Creates increment 0035-authentication-service
# → Syncs to JIRA epic PROJ-123

# 2. In JIRA Board:
# - Assign epic to Sprint 23
# - Set story points: 13
# - Set due date: 2025-11-30
# - Set labels: backend, security, P1

# 3. Work on increment as usual
/specweave:do
# → Updates JIRA epic status automatically (In Progress → Done)
# → JIRA board reflects completion
# → Sprint burndown updates automatically
```

**JIRA Fields SpecWeave Uses**:
- ✅ **Status** (Synced) - To Do → In Progress → Done
- ✅ **Description** (Synced) - User stories, acceptance criteria
- ✅ **Comments** (Synced) - Completion summaries
- ❌ **Sprint** (NOT synced) - Managed in JIRA
- ❌ **Story Points** (NOT synced) - Managed in JIRA
- ❌ **Due Date** (NOT synced) - Managed in JIRA
- ❌ **Time Tracking** (NOT synced) - Managed in JIRA

**Result**: JIRA handles sprint planning, SpecWeave handles implementation.

---

### Azure DevOps Users: ADO Boards + Iterations

**Setup**:
1. SpecWeave syncs increments → ADO Work Items (via `/specweave-ado:sync`)
2. Use ADO's iteration planning
3. Set Iteration Path and Effort in ADO
4. SpecWeave reflects implementation status only

**Workflow**:

```bash
# 1. SpecWeave creates increment + syncs to ADO
/specweave:increment "Payment gateway integration"
# → Creates increment 0036-payment-gateway
# → Syncs to ADO feature #456

# 2. In ADO Board:
# - Set Iteration Path: Sprint 23
# - Set Effort: 13
# - Set Target Date: 2025-11-30
# - Set Area Path: Backend\Payments

# 3. Work on increment as usual
/specweave:do
# → Updates ADO work item status (Active → Resolved → Closed)
# → ADO sprint board reflects completion
# → Sprint capacity updates automatically
```

**ADO Fields SpecWeave Uses**:
- ✅ **State** (Synced) - New → Active → Resolved → Closed
- ✅ **Description** (Synced) - User stories, acceptance criteria
- ✅ **Discussion** (Synced) - Completion summaries
- ❌ **Iteration Path** (NOT synced) - Managed in ADO
- ❌ **Effort** (NOT synced) - Managed in ADO
- ❌ **Target Date** (NOT synced) - Managed in ADO
- ❌ **Remaining Work** (NOT synced) - Managed in ADO

**Result**: ADO handles iteration planning, SpecWeave handles implementation.

---

## Alternative: Milestones for Simple Release Planning

If you don't need full sprint planning, use milestones:

### GitHub Milestones

```bash
# Create milestones for releases
gh milestone create "v0.19.0" --due-date 2025-11-30
gh milestone create "v0.20.0" --due-date 2025-12-31

# Assign issues to milestones (manually or via hook)
gh issue edit 67 --milestone "v0.19.0"

# View by milestone
gh issue list --milestone "v0.19.0"
```

**Benefit**: Simpler than Projects, still gives release planning.

### JIRA Fix Versions

```bash
# In JIRA UI:
# 1. Create Fix Version "v0.19.0" (due 2025-11-30)
# 2. Assign epic to Fix Version
# 3. View Release page for roadmap
```

### ADO Iteration Paths

```bash
# In ADO UI:
# 1. Create Iteration "Release 0.19.0" (dates 2025-11-01 to 2025-11-30)
# 2. Assign work item to Iteration
# 3. View Sprint planning for roadmap
```

---

## FAQ

### Q: Can SpecWeave sync sprint assignments?

**A**: No. SpecWeave does NOT sync sprint/iteration assignments. Manage sprints in external tools (GitHub Projects, JIRA Boards, ADO Sprints).

### Q: Can SpecWeave sync story points?

**A**: No. SpecWeave does NOT sync story points or effort estimates. Set estimates in external tools.

### Q: Can SpecWeave sync due dates?

**A**: No. SpecWeave does NOT sync due dates or target dates. Set dates in external tools.

### Q: Why doesn't SpecWeave manage scheduling?

**A**: Scheduling is a **team coordination concern**, not an **implementation concern**. Different stakeholders (PMs, clients, teams) need different scheduling views. SpecWeave stays focused on execution (what/how/status), not planning (when/effort).

### Q: What if I use multiple tools (GitHub + JIRA)?

**A**: Use SpecWeave's multi-project sync (see [Multi-Project Sync Guide](./multi-project-sync.md)). SpecWeave syncs implementation status to both tools, while you manage scheduling separately in each tool.

### Q: How do I track velocity if SpecWeave doesn't sync estimates?

**A**: Track velocity in external tools:
- **GitHub Projects**: Add "Story Points" custom field, generate reports
- **JIRA**: Built-in velocity charts and sprint reports
- **ADO**: Built-in velocity charts and sprint burndown

---

## Best Practices

### 1. Use External Tools for Scheduling

✅ **DO**:
- Create GitHub Project for sprint planning
- Use JIRA Boards for sprint assignment
- Use ADO Sprints for iteration planning
- Set estimates in external tools
- Set dates in external tools

❌ **DON'T**:
- Expect SpecWeave to manage sprints
- Try to sync sprint assignments from SpecWeave
- Store estimates in SpecWeave specs

### 2. Keep SpecWeave Implementation-Focused

✅ **DO**:
- Write clear user stories with acceptance criteria
- Break work into P1/P2/P3 tasks
- Track implementation progress via `/specweave:do`
- Update external tools automatically via sync

❌ **DON'T**:
- Add sprint names to spec.md
- Add story points to tasks.md
- Mix planning metadata with implementation specs

### 3. Let SpecWeave Populate, You Organize

**Workflow**:
1. SpecWeave creates increment → syncs to external tool (issue/epic/work item)
2. You organize in external tool (assign to sprint, set estimates, set dates)
3. SpecWeave tracks implementation → updates external tool automatically

**Result**: Clear separation of concerns.

---

## Example Workflows

### Example 1: GitHub Projects for Sprint Planning

**Goal**: Track SpecWeave increments in 2-week sprints with story points

**Setup**:
```bash
# 1. Create GitHub Project
gh project create --owner anton-abyzov --title "SpecWeave Sprints"

# 2. Add custom fields (via Web UI):
# - Sprint (Iteration): Text
# - Story Points: Number
# - Status: Single select (Backlog, In Progress, Done)

# 3. Create sprints (via Web UI):
# - Sprint 23 (2025-11-18 to 2025-11-29)
# - Sprint 24 (2025-12-02 to 2025-12-13)
```

**Daily Workflow**:
```bash
# Morning: Plan increment
/specweave:increment "User authentication"
# → Creates increment 0037 + GitHub issue #70

# Add to GitHub Project (Web UI):
# - Sprint: Sprint 23
# - Story Points: 8
# - Status: Backlog

# Afternoon: Start work
/specweave:do
# → Updates issue to "In Progress" automatically
# → GitHub Project shows progress

# Next day: Complete work
/specweave:done 0037
# → Updates issue to "Closed" automatically
# → GitHub Project shows "Done"
# → Sprint burndown updates
```

### Example 2: JIRA Sprints with Team Velocity

**Goal**: Track SpecWeave increments in JIRA sprints with velocity charts

**Setup** (in JIRA):
1. Create project "SpecWeave Development"
2. Enable Scrum board
3. Create sprints (2-week cycles)
4. Configure velocity chart

**Daily Workflow**:
```bash
# Morning: Plan increment
/specweave:increment "Payment processing"
# → Creates increment 0038
# → Syncs to JIRA epic SPEC-123

# In JIRA Board:
# - Assign to Sprint 23
# - Set story points: 13
# - Move to "To Do"

# Afternoon: Start work
/specweave:do
# → Updates JIRA epic to "In Progress" automatically

# Next week: Complete work
/specweave:done 0038
# → Updates JIRA epic to "Done" automatically
# → Sprint burndown updates
# → Velocity chart updates
```

### Example 3: ADO Iterations with Capacity Planning

**Goal**: Track SpecWeave increments in ADO iterations with team capacity

**Setup** (in ADO):
1. Create project "SpecWeave Development"
2. Configure iteration paths (3-week sprints)
3. Set team capacity (developers + hours)

**Daily Workflow**:
```bash
# Monday: Plan increment
/specweave:increment "Infrastructure monitoring"
# → Creates increment 0039
# → Syncs to ADO feature #456

# In ADO Board:
# - Set Iteration Path: Sprint 23
# - Set Effort: 20 hours
# - Set Assigned To: Team

# Tuesday: Start work
/specweave:do
# → Updates ADO feature to "Active" automatically

# Friday: Complete work
/specweave:done 0039
# → Updates ADO feature to "Closed" automatically
# → Sprint capacity updates
# → Team velocity updates
```

---

## Summary

**SpecWeave's Philosophy**:
- ✅ Implementation tracking (what/how/status)
- ❌ Scheduling management (when/effort/capacity)

**Your Workflow**:
1. Use SpecWeave for implementation (specs, tasks, progress)
2. Use external tools for scheduling (sprints, estimates, dates)
3. SpecWeave syncs implementation status automatically
4. You organize in external tools for planning

**Result**: Best of both worlds - focused implementation tracking + flexible scheduling.

---

## Next Steps

- [Status Sync Guide](./status-sync-guide.md) - Configure sync with external tools
- [Multi-Project Sync](./multi-project-sync.md) - Sync to multiple projects/repos
- [GitHub Sync](../../../plugins/specweave-github/README.md) - GitHub-specific setup
- [JIRA Sync](../../../plugins/specweave-jira/README.md) - JIRA-specific setup
- [ADO Sync](../../../plugins/specweave-ado/README.md) - Azure DevOps-specific setup
