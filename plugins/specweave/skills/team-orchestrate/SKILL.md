---
description: Orchestrate multi-agent parallel development across repos/domains. Use when building features across frontend, backend, shared services. Activates for: team setup, parallel agents, multi-repo work, orchestrate agents, team orchestrate.
---

# Team Orchestrate

**Plan and launch parallel development agents across domains/repos.**

## Usage

```bash
/sw:team-orchestrate "<feature description>"
```

## What This Skill Does

1. **Analyze the feature** — detect which domains (frontend, backend, shared, etc.) are involved
2. **Create per-domain increments** — each agent gets its own increment with focused tasks
3. **Spawn parallel agents** — use the Task tool to launch agents for each domain
4. **Assign ownership** — each agent owns specific files and directories

## Workflow

### Step 1: Feature Analysis

Read the feature request and determine:
- Which codebases/repos are affected
- What user stories belong to which domain
- Dependencies between domains (e.g., API contract before frontend)

### Step 2: Create Domain Increments

For each domain, create a SpecWeave increment:

```
.specweave/increments/XXXX-feature-frontend/
.specweave/increments/XXXX-feature-backend/
.specweave/increments/XXXX-feature-shared/
```

### Step 3: Spawn Agents

Use the Task tool to launch parallel agents:

```typescript
// Frontend agent
Task({
  subagent_type: "general-purpose",
  prompt: "Implement frontend increment XXXX-feature-frontend. Your workspace is src/frontend/. Follow the tasks in tasks.md.",
  run_in_background: true,
});

// Backend agent
Task({
  subagent_type: "general-purpose",
  prompt: "Implement backend increment XXXX-feature-backend. Your workspace is src/backend/. Follow the tasks in tasks.md.",
  run_in_background: true,
});
```

### Step 4: Record Session State

Write agent session state to `.specweave/state/parallel/session.json`:

```json
{
  "sessionId": "session-uuid",
  "startedAt": "2026-02-06T...",
  "agents": [
    {
      "domain": "frontend",
      "incrementId": "XXXX-feature-frontend",
      "taskId": "agent-task-id",
      "status": "running",
      "fileOwnership": ["src/frontend/**"]
    }
  ]
}
```

## File Ownership Rules

- Each agent owns specific file patterns (no overlap)
- Shared files (e.g., API types) are owned by the "shared" agent
- Conflicts are detected during merge (T-020)

## Agent Teams Detection

If `$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set, use native Agent Teams for peer-to-peer coordination instead of Task tool.

## Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show proposed agent plan without launching |
| `--domains` | Override domain detection (e.g., `--domains frontend,backend`) |

## Example

```
User: /sw:team-orchestrate "Build checkout flow across frontend and backend"

Assistant analyzes and proposes:
- Frontend agent: checkout UI, cart summary, payment form
- Backend agent: payment API, order service, inventory check
- Shared: order types, payment types

Creates 3 increments, spawns 3 agents, records session.
```
