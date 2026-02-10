---
description: Merge completed parallel agent work and trigger GitHub sync per increment. Activates for: team merge, merge agents, combine work, team finish.
---

# Team Merge

**Merge parallel agent work in dependency order and trigger sync.**

## Usage

```bash
/sw:team-merge [--session <id>]
/sw:team-merge --dry-run            # Preview merge plan
/sw:team-merge --skip-sync          # Merge without GitHub/JIRA sync
```

## What This Skill Does

1. **Read session state** from `.specweave/state/parallel/session.json` (or native Agent Teams)
2. **Verify all agents completed** — block if any are still running
3. **Merge in dependency order** — shared first, then dependent domains
4. **Run `/sw:done` per increment** — triggers quality gates and closes each increment
5. **Trigger sync** — pushes to GitHub (`/sw-github:sync`) or JIRA (`/sw-jira:push`)

## Mode Detection

- **Native Agent Teams**: Query team for completion status, then proceed with merge
- **Subagent mode**: Read `.specweave/state/parallel/session.json` for agent states

## Workflow

### Step 1: Pre-flight Check

```
Read session state (native team or JSON file)
For each agent:
  - Check status == "done" (from tasks.md 100%)
  - Verify /sw:grill quality gate passed
  - If any running → report and ask user to wait
```

### Step 2: Determine Merge Order

Dependencies flow: shared → backend → frontend (or as defined in session)

```
Merge order respects contract chain:
1. shared/types (no dependencies)
2. database (depends on shared types)
3. backend (depends on database + shared)
4. frontend (depends on backend API + shared types)
5. devops/qa/security (independent, merge last)
```

### Step 3: Close Each Increment

For each agent's increment, in dependency order:

```bash
# Run /sw:done per increment — triggers quality gates
/sw:done <increment-id>
```

This ensures:
- `/sw:grill` runs for each increment
- `tasks.md` and `spec.md` ACs are validated
- `metadata.json` is updated to `completed`
- Living docs are generated

### Step 4: Merge Each Agent's Work

For worktree-based agents:
```bash
git merge --no-ff <worktree-branch> -m "merge: <domain> from team session"
```

For same-tree agents (all working in same repo):
- Verify no file conflicts (agents own different files)
- Stage and commit each agent's changes

### Step 5: Trigger Sync

For each merged increment, trigger external sync:

```bash
# GitHub Issues sync
/sw-github:sync <increment-id>

# JIRA sync (if configured)
/sw-jira:push <increment-id>
```

### Step 6: Clean Up

- Update session state to "merged"
- In native Agent Teams mode, signal team completion
- Remove worktree branches if `--cleanup-branches` flag set
- Archive completed increments if configured

## Options

| Option | Description |
|--------|-------------|
| `--session` | Specify session ID (defaults to latest) |
| `--dry-run` | Show merge plan without executing |
| `--skip-sync` | Merge without triggering GitHub/JIRA sync |
| `--skip-done` | Merge without running /sw:done (increments stay active) |
| `--cleanup-branches` | Delete agent worktree branches after merge |

## Conflict Resolution

If file conflicts are detected during merge:
1. List conflicting files and owning agents
2. Ask user to choose resolution strategy:
   - **Accept upstream** — keep the earlier agent's version
   - **Accept downstream** — keep the later agent's version
   - **Manual** — open conflict markers for user to resolve
3. Apply resolution and continue merge

## Example

```
User: /sw:team-merge