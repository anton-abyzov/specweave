---
name: github-sync
description: Bi-directional synchronization between GitHub and SpecWeave. Maps GitHub Milestones to Release Plans, Issues to RFCs/Tasks. Maintains sync status. Activates for GitHub, sync GitHub, map GitHub to SpecWeave, GitHub issues.
---

# GitHub Sync Skill

**Purpose**: Enable bi-directional synchronization between GitHub and SpecWeave.

**When to Use**: When integrating SpecWeave with GitHub Projects/Issues.

---

## GitHub Concept Mapping

| GitHub Concept | SpecWeave Concept | Location |
|----------------|-------------------|----------|
| **Milestone** | **Release Plan** | `docs/internal/delivery/release-v1.0.md` |
| **Project** | **Increment** or **Release** | Depends on scope |
| **Issue (feature)** | **RFC** | `docs/internal/architecture/rfc/0001-{name}.md` |
| **Issue (bug)** | **Incident** | `docs/internal/operations/incidents/{id}.md` |
| **Issue (task)** | **Task** | `features/{increment}/tasks.md` |
| **Pull Request** | **Implementation** | Code linked to increment |
| **Label** | **Tag** | `metadata.yaml` → tags |

---

## Status Mapping

| GitHub State | SpecWeave Status | Notes |
|--------------|------------------|-------|
| Open | `planned` or `in_progress` | Depends on labels/assignee |
| Closed | `completed` or `cancelled` | Depends on why closed |

---

## Configuration

**.specweave/config.yaml**:
```yaml
sync:
  github:
    enabled: true
    repo: company/repo
    auth:
      type: token
      token_env: GITHUB_TOKEN
    sync_interval: 15m
    webhooks:
      enabled: true
      secret_env: GITHUB_WEBHOOK_SECRET
    mappings:
      milestone: release_plan
      issue_feature: rfc  # Issues labeled "feature"
      issue_bug: incident  # Issues labeled "bug"
      issue_task: task     # Issues labeled "task"
```

---

## Authentication

### Personal Access Token

1. **Generate Token**: GitHub → Settings → Developer Settings → Personal Access Tokens
2. **Scopes**: `repo`, `read:project`
3. **Set Environment Variable**:
   ```bash
   export GITHUB_TOKEN="your_token_here"
   ```

---

## Sync Commands

```bash
# Sync all
specweave sync --all

# Sync specific increment
specweave sync --increment 0001 --tool github

# Pull from GitHub
specweave sync --increment 0001 --tool github --direction pull
```

---

## Traceability

**Command**: `specweave trace --github-milestone 5`

**Output**:
```
GitHub Milestone: 5 "v1.0 Release"
  URL: https://github.com/company/repo/milestone/5
    ↓
SpecWeave Release Plan: docs/internal/delivery/release-v1.0.md
  Increments Included:
    - 0001-user-authentication
    - 0002-payment-processing
    - 0003-notification-system
```

---

## Related Documentation

- [TOOL-CONCEPT-MAPPING.md](../../../docs/TOOL-CONCEPT-MAPPING.md)
- [jira-sync/SKILL.md](../jira-sync/SKILL.md) - Similar sync pattern
