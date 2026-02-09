---
description: Merge completed parallel agent work and trigger GitHub sync per increment. Activates for: team merge, merge agents, combine work, team finish.
---

# Team Merge

**Merge parallel agent work in dependency order and trigger sync.**

## Usage

```bash
/sw:team-merge [--session <id>]
```

## What This Skill Does

1. **Read session state** from `.specweave/state/parallel/session.json`
2. **Verify all agents completed** — block if any are still running
3. **Merge in dependency order** — shared first, then dependent domains
4. **Trigger GitHub sync** per merged increment

## Workflow

### Step 1: Pre-flight Check

```
Read .specweave/state/parallel/session.json
For each agent:
  - Check status == "done" (from tasks.md 100%)
  - If any running → report and ask user to wait
```

### Step 2: Determine Merge Order

Dependencies flow: shared → backend → frontend (or as defined in session)

### Step 3: Merge Each Agent's Work

For worktree-based agents:
```bash
git merge --no-ff <worktree-branch> -m "merge: <domain> from team session"
```

For same-tree agents (all working in same repo):
- Verify no file conflicts (agents own different files)
- Stage and commit each agent's changes

### Step 4: Trigger Sync

For each merged increment:
```
/sw-github:sync-spec <increment-id>
```

### Step 5: Clean Up

- Update session state to "merged"
- Archive completed increments if configured

## Options

| Option | Description |
|--------|-------------|
| `--session` | Specify session ID (defaults to latest) |
| `--dry-run` | Show merge plan without executing |
| `--skip-sync` | Merge without triggering GitHub sync |

## Conflict Resolution

If file conflicts are detected during merge:
1. List conflicting files and owning agents
2. Ask user to choose resolution strategy
3. Apply resolution and continue merge

## Example

```
User: /sw:team-merge