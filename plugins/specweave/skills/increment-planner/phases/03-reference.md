# Phase 3: Reference & Examples

Load this phase for detailed examples and troubleshooting.

## Example Scenarios

### Scenario 1: Single Project
```
Config: 1 project (my-app)
Feature: "Add authentication"

→ AUTO-SELECT: my-app
→ NO question asked
```

### Scenario 2: Multiple Projects, Clear Keywords
```
Config: 3 projects (web-app, api-service, mobile-app)
Feature: "Add React dashboard"

→ Keywords: React, dashboard, charts (all FE)
→ Confidence: 95% web-app
→ AUTO-SELECT + notify
```

### Scenario 3: Multi-Area Feature
```
Config: 3 projects (web-app, api-service, shared-lib)
Feature: "User authentication with JWT"

→ Spans FE (login) + BE (API) + shared (types)
→ Output: "Multi-project detected:
   • US-001: Login UI → web-app
   • US-002: Auth API → api-service
   • US-003: Auth types → shared-lib"
```

### Scenario 4: 2-Level Structure
```
Config: 1 project (corp), 5 boards
Feature: "Add reporting dashboard"

→ Project: AUTO-SELECT corp
→ Board: Detect "reporting" → analytics
→ Suggest + confirm
```

### Scenario 5: Ambiguous
```
Config: 4 projects
Feature: "Improve performance"

→ No clear match
→ ASK with ALL options
```

## TDD Task Structure

When `testMode: "TDD"`:

```markdown
### T-001: [RED] Write failing test for auth
**Depends On**: None
**Phase**: RED

### T-002: [GREEN] Implement auth
**Depends On**: T-001
**Phase**: GREEN

### T-003: [REFACTOR] Improve auth code
**Depends On**: T-002
**Phase**: REFACTOR
```

## Model Selection

| Model | Use For |
|-------|---------|
| ⚡ Haiku | Clear instructions, CRUD, config |
| 💎 Opus | Architecture, integration, security |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| spec.md BLOCKED | Create metadata.json FIRST |
| Number conflict | Run duplicate check |
| Claude crashes | Don't spawn agents from skill |
| Missing AC-IDs | Use format: AC-US1-01 |
| Tests missing | Embed in tasks.md |

## Common Patterns

### Simple Feature
```
1. Get next: 0015
2. Short name: user-authentication
3. Create directory
4. metadata.json FIRST
5. spec.md, tasks.md
6. Guide user
```

### Critical Hotfix
```
Type: hotfix
Priority: P1
Skip plan.md (simple)
```

### Bug Investigation
```
Type: bug
spec: What's broken? Impact?
plan: Investigation approach
tasks: Steps, fix, verify
```

## Integration Commands

```bash
# GitHub
/sw-github:create-issue 0021

# Jira
/sw-jira:sync 0021

# ADO
/sw-ado:create-workitem 0021
```
