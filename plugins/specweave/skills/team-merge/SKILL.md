---
description: Merge completed parallel agent work and trigger GitHub sync per increment. Activates for: team merge, merge agents, combine work, team finish.
---

# Team Merge

**Verify all teammates completed, run quality gates, close increments, and trigger sync.**

## Usage

```bash
sw:team-merge
sw:team-merge --dry-run            # Preview merge plan
sw:team-merge --skip-sync          # Merge without GitHub/JIRA sync
```

## What This Skill Does

1. **Verify all teammates completed** -- block if any are still running
2. **Run quality gates per domain** -- `sw:grill` for each increment
3. **Close increments in dependency order** -- `sw:done` per increment
4. **Trigger sync** -- pushes to GitHub (`sw-github:sync`) or JIRA (`sw-jira:push`)

## Workflow

### Step 1: Pre-flight Check

Native Agent Teams share the filesystem, so verification is straightforward:

```
For each teammate's increment:
  - Check tasks.md is 100% complete
  - Verify sw:grill quality gate passed
  - If any teammate still running -> report and ask user to wait
```

### Step 2: Validate Repository Structure

For multi-repo team sessions, verify all agent work follows the repository directory convention:

```bash
# Check for repos created outside repositories/ directory
if [ -d "repositories" ]; then
  for git_dir in ./*/.git; do
    repo_name=$(dirname "$git_dir")
    if [[ "$repo_name" != ./repositories/* && "$repo_name" != "./.git" ]]; then
      echo "WARNING: Repository $repo_name found outside repositories/ directory"
      echo "Expected: repositories/{org}/$(basename $repo_name)/"
    fi
  done
fi
```

If repos are found outside `repositories/`, report as a warning with remediation instructions. The merge proceeds but the report flags the issue for cleanup.

### Step 3: Determine Closure Order

Dependencies flow: shared -> backend -> frontend (or as defined by team topology)

```
Closure order respects contract chain:
1. shared/types (no dependencies)
2. database (depends on shared types)
3. backend (depends on database + shared)
4. frontend (depends on backend API + shared types)
5. devops/qa/security (independent, close last)
```

### Step 4: Close Each Increment

For each teammate's increment, in dependency order:

**PRE-CLOSURE**: Ensure increment is in "active" or "ready_for_review" status:
```bash
STATUS=$(jq -r '.status' .specweave/increments/<id>/metadata.json)
if [ "$STATUS" = "planned" ] || [ "$STATUS" = "backlog" ]; then
  # Edit metadata.json to set "status": "active"
fi
```

#### Step 4a: Closure via Subagent (Claude Code — preferred)

Spawn an `sw-closer` subagent per increment for a fresh context:

```typescript
Agent({
  subagent_type: "sw:sw-closer",
  prompt: "Close increment <ID>. Increment path: .specweave/increments/<ID>/",
  description: "Close increment <ID>"
})
```

Wait for each sw-closer to complete before spawning the next (dependency order). If a closer fails, log the failure and continue to the next increment.

#### Step 4b: Direct Closure (Non-cloud tools / fallback)

If the `Agent` tool is NOT available, invoke closure directly:

```bash
sw:done <increment-id> --auto
```

If `sw:done` fails, fix root cause and retry (max 2 retries). Common fixes: sync ACs, update task counts, write missing reports.

This ensures:
- Increment is in correct lifecycle status before closure attempt
- `sw:grill` runs for each increment
- `tasks.md` and `spec.md` ACs are validated
- `metadata.json` is updated to `completed`
- Living docs are generated
- Failures are retried rather than silently skipped

### Step 5: Trigger Sync

For each closed increment, trigger external sync:

```bash
# GitHub Issues sync
sw-github:sync <increment-id>

# JIRA sync (if configured)
sw-jira:push <increment-id>
```

### Step 6: Execution Summary

The team's durable artifacts are already in `.specweave/increments/` (spec.md, tasks.md, grill-report.json, metadata.json). No additional archival of ephemeral Claude Code state is needed.

Print a structured execution summary as the final output:

```
Team Execution Summary
═══════════════════════
Team: {team_name}

Agents:
  {agent-1}: COMPLETED (T-8/8, tests passing)
  {agent-2}: COMPLETED (T-12/12, tests passing)

Increments closed: {list}
Sync: {GitHub/JIRA status}
```

### Step 7: Shutdown Agents and Destroy Team

**7a. Send shutdown_request to all agents** you know from the team session:

```typescript
SendMessage({ type: "shutdown_request", recipient: "<agent-1>", content: "Merge complete" });
SendMessage({ type: "shutdown_request", recipient: "<agent-2>", content: "Merge complete" });
// ... for every agent in this team
```

Harmless if agents already exited. **NOTE**: `shutdown_request` via `SendMessage` does NOT close the tmux pane — Phase 7c below is the ONLY mechanism that kills orphaned panes. **NEVER skip 7c.**

**7b. Destroy team:**

```typescript
TeamDelete()
```

If `TeamDelete` fails (agents still shutting down), wait 3 seconds, retry once.

**7c. Kill orphaned panes (MANDATORY — this is the ONLY thing that closes tmux panes):**

`SendMessage` shutdown does NOT close tmux panes. **ALWAYS run this script.**

```bash
if command -v tmux >/dev/null 2>&1; then
  CURRENT_PANE=$(tmux display-message -p '#{pane_id}' 2>/dev/null || echo "")
  for pane_id in $(tmux list-panes -a -F '#{pane_id}' 2>/dev/null); do
    [ -n "$CURRENT_PANE" ] && [ "$pane_id" = "$CURRENT_PANE" ] && continue
    if tmux capture-pane -t "$pane_id" -p -S -50 2>/dev/null | grep -q "Resume this session"; then
      tmux kill-pane -t "$pane_id" 2>/dev/null
    fi
  done
fi
```

## Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show merge plan without executing |
| `--skip-sync` | Merge without triggering GitHub/JIRA sync |
| `--skip-done` | Skip running sw:done (increments stay active) |

## Example

```
User: sw:team-merge

Checking teammates...
  backend (0301-api-endpoints)   -- done, grill passed
  frontend (0302-ui-components)  -- done, grill passed
  shared (0300-shared-types)     -- done, grill passed

Closure order: 0300 -> 0301 -> 0302

Running sw:done 0300-shared-types...      done
Running sw:done 0301-api-endpoints...     done
Running sw:done 0302-ui-components...     done

Syncing to GitHub...
  0300 -> issue #45 closed
  0301 -> issue #46 closed
  0302 -> issue #47 closed

Team Execution Summary
═══════════════════════
Team: feature-checkout
Agents:
  shared-agent:   COMPLETED (T-4/4, tests passing)
  backend-agent:  COMPLETED (T-8/8, tests passing)
  frontend-agent: COMPLETED (T-6/6, tests passing)
Increments closed: 0300, 0301, 0302
Sync: GitHub issues #45, #46, #47 closed

Shutting down agents... done
TeamDelete: team cleaned up.
All increments merged and synced.
```

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#team-merge)
