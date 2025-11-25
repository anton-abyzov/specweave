---
sidebar_position: 8
title: "Lesson 7: External Tools"
description: "Integrate SpecWeave with GitHub, JIRA, and Azure DevOps"
---

# Lesson 7: External Tool Integration

**Duration**: 45 minutes
**Prerequisites**: Lessons 1-6, external tool account
**Outcome**: Set up bidirectional sync with your project management tools

---

## Why Integrate?

### The Manual Sync Problem

```
Without integration:

Developer finishes task
    │
    ├── Updates tasks.md ✓
    │
    ├── Opens GitHub... updates issue... ⏰ (2 min)
    │
    ├── Opens JIRA... updates story... ⏰ (3 min)
    │
    └── Forgets to update something... ❌

Time wasted: 5+ minutes per task
Things missed: Frequent
```

### The SpecWeave Solution

```
With integration:

Developer finishes task
    │
    └── Updates tasks.md ✓
            │
            └── Hook fires automatically
                    │
                    ├── GitHub issue updated ✓
                    ├── JIRA story updated ✓
                    └── Azure DevOps synced ✓

Time wasted: 0 minutes
Things missed: Never
```

---

## Supported Platforms

| Platform | Capabilities |
|----------|--------------|
| **GitHub Issues** | Create, update, close, progress sync, checkbox tracking |
| **JIRA** | Epic/Story hierarchy, status sync, custom fields |
| **Azure DevOps** | Work items, area paths, iteration sync |
| **Linear** | Coming Q1 2026 |

---

## GitHub Integration

### Setup

**Step 1: Create GitHub Token**

```bash
# Go to: GitHub → Settings → Developer settings → Personal access tokens
# Create token with scopes:
#   - repo (full control)
#   - read:org (if using org repos)
```

**Step 2: Configure SpecWeave**

```bash
# Add to .env (gitignored)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Or during init:
specweave init .
# Answer "GitHub" for git provider
# Paste token when prompted
```

**Step 3: Verify Connection**

```bash
/specweave-github:status
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB CONNECTION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Connected to GitHub
  Repository: owner/repo-name
  Token: Valid (expires: never)
  Permissions: repo, read:org

Ready for sync!
```

### Creating Issues from Increments

```bash
/specweave-github:create-issue 0001
```

**Generated GitHub Issue**:

```markdown
## [FS-001][US-001] User Authentication

### Summary
Enable users to securely log in to the platform.

### Acceptance Criteria
- [ ] AC-US1-01: Login form validates email format
- [ ] AC-US1-02: Error message shown for invalid credentials
- [ ] AC-US1-03: Session persists for 24 hours
- [ ] AC-US1-04: Three failed attempts trigger lockout

### Tasks
- [ ] T-001: Create AuthService
- [ ] T-002: Implement password hashing
- [ ] T-003: Add JWT token generation
- [ ] T-004: Create login endpoint
- [ ] T-005: Write integration tests

---
📋 Managed by SpecWeave
🔗 Increment: 0001-user-authentication
```

### Syncing Progress

```bash
/specweave-github:sync 0001
```

**What syncs**:
- Task completion (checkboxes)
- AC completion (checkboxes)
- Status changes (open/closed)
- Comments (from SpecWeave to GitHub)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYNCING TO GITHUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment: 0001-user-authentication
GitHub Issue: #42

Changes detected:
  ✓ T-001: completed → checkbox checked
  ✓ T-002: completed → checkbox checked
  ✓ AC-US1-01: verified → checkbox checked
  ✓ Progress: 40% → comment added

Sync complete!
```

### Bidirectional Sync

GitHub changes sync back to SpecWeave:

```
GitHub Issue #42 (external):
  - [ ] T-003: Add JWT token generation  ← Someone unchecked this!

↓ /specweave:sync-progress

tasks.md updated:
  T-003: status changed from completed → pending

⚠️ External change detected - tasks.md updated
```

---

## JIRA Integration

### Setup

**Step 1: Get JIRA Credentials**

```bash
# Go to: Atlassian → Account Settings → Security → API tokens
# Create new API token
```

**Step 2: Configure SpecWeave**

```bash
# Add to .env (gitignored)
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=xxxxxxxxxxxxxx
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_PROJECT_KEY=PROJ
```

**Step 3: Verify Connection**

```bash
/specweave-jira:sync --status
```

### JIRA Hierarchy Mapping

```
SpecWeave              JIRA
─────────              ────
Feature (FS-XXX)  →    Epic
User Story (US-XXX) →  Story
Task (T-XXX)      →    Sub-task
```

### Creating JIRA Items

```bash
/specweave-jira:sync 0001 --create
```

**Creates**:
1. Epic for the increment
2. Stories for each user story
3. Sub-tasks for each task

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATING JIRA ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment: 0001-user-authentication

Created:
  Epic: PROJ-100 "User Authentication Feature"
    └── Story: PROJ-101 "US-001: User Login"
        ├── Sub-task: PROJ-102 "T-001: Create AuthService"
        ├── Sub-task: PROJ-103 "T-002: Password hashing"
        └── Sub-task: PROJ-104 "T-003: JWT generation"
    └── Story: PROJ-105 "US-002: Password Reset"
        ├── Sub-task: PROJ-106 "T-004: Reset endpoint"
        └── Sub-task: PROJ-107 "T-005: Email service"

All items linked to increment metadata.
```

### Status Mapping

| SpecWeave Status | JIRA Status |
|------------------|-------------|
| `planning` | To Do |
| `in-progress` | In Progress |
| `completed` | Done |
| `paused` | On Hold |
| `abandoned` | Cancelled |

### Syncing Status

```bash
/specweave-jira:sync 0001
```

**Bidirectional rules**:
- **External wins**: If JIRA status changes, SpecWeave updates
- **Conflict resolution**: Most recent change wins
- **Audit trail**: All syncs logged

---

## Azure DevOps Integration

### Setup

**Step 1: Create PAT**

```bash
# Go to: Azure DevOps → User Settings → Personal Access Tokens
# Create with scopes:
#   - Work Items: Read & Write
#   - Project and Team: Read
```

**Step 2: Configure SpecWeave**

```bash
# Add to .env
ADO_PAT=xxxxxxxxxxxxxxxxxxxx
ADO_ORGANIZATION=your-org
ADO_PROJECT=your-project
```

### Creating Work Items

```bash
/specweave-ado:create-workitem 0001
```

### ADO Hierarchy Mapping

```
SpecWeave              Azure DevOps
─────────              ────────────
Feature (FS-XXX)  →    Feature
User Story (US-XXX) →  User Story
Task (T-XXX)      →    Task
```

### Area Path Mapping

For multi-team projects:

```json
// .specweave/config.json
{
  "ado": {
    "areaPathMapping": {
      "frontend": "Project\\Team-Frontend",
      "backend": "Project\\Team-Backend",
      "mobile": "Project\\Team-Mobile"
    }
  }
}
```

---

## Full Sync Command

The master sync command:

```bash
/specweave:sync-progress
```

**What it does**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FULL PROGRESS SYNC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Sync tasks.md from actual status
  ✓ 12 tasks verified
  ✓ 2 status updates applied

Step 2: Sync to living documentation
  ✓ FEATURES.md updated
  ✓ Feature folder synced

Step 3: Sync to external tools
  GitHub:
    ✓ Issue #42 updated (3 checkboxes)
  JIRA:
    ✓ Epic PROJ-100 updated
    ✓ 5 sub-tasks status changed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All systems in sync!
Last sync: 2025-11-25 14:32:00
```

---

## Sync Strategies

### Strategy 1: Bidirectional (Default)

```json
{
  "sync": {
    "direction": "bidirectional",
    "conflictResolution": "external-wins"
  }
}
```

- Changes flow both ways
- External tool status wins on conflict
- Best for teams using both tools

### Strategy 2: Export Only

```json
{
  "sync": {
    "direction": "export-only"
  }
}
```

- SpecWeave → External only
- External changes ignored
- Best for SpecWeave-first teams

### Strategy 3: Import Only

```json
{
  "sync": {
    "direction": "import-only"
  }
}
```

- External → SpecWeave only
- Good for brownfield projects
- Brings external data into SpecWeave

---

## Automatic Sync (Hooks)

Set up automatic sync on task completion:

```json
// plugins/specweave/hooks/hooks.json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "tools": ["Edit"],
      "match": "tasks.md",
      "command": "specweave sync-progress --silent"
    }
  ]
}
```

**Result**: Every time tasks.md changes, external tools update automatically.

---

## Troubleshooting

### Issue: "Authentication failed"

```bash
# Check token validity
/specweave-github:status

# If expired, regenerate and update .env
# Then reinitialize:
specweave init . --reconfigure
```

### Issue: "Issue not found"

```bash
# Verify issue exists
gh issue view 42

# Re-link increment to issue
/specweave-github:create-issue 0001 --link-existing 42
```

### Issue: "Sync conflict"

```bash
# View sync status
/specweave-github:status 0001

# Force sync from SpecWeave (overwrites external)
/specweave-github:sync 0001 --force

# Force sync from external (overwrites SpecWeave)
/specweave:sync-progress --from-external
```

### Issue: "Rate limit exceeded"

```bash
# Check rate limit status
/specweave:sync-diagnostics

# Wait and retry, or use token with higher limits
```

---

## Practice Exercise

### Exercise 1: GitHub Integration

```bash
# 1. Set up GitHub token
# 2. Create increment
/specweave:increment "Test GitHub sync"

# 3. Create GitHub issue
/specweave-github:create-issue 0001

# 4. Complete some tasks
/specweave:do --until T-002

# 5. Sync and verify
/specweave-github:sync 0001
# Check GitHub issue - tasks should be checked!
```

### Exercise 2: Test Bidirectional Sync

```bash
# 1. With increment synced to GitHub
# 2. Manually uncheck a task in GitHub issue
# 3. Run sync
/specweave:sync-progress

# 4. Check tasks.md - task should be unchecked!
```

---

## Summary

External tool integration provides:

| Feature | Benefit |
|---------|---------|
| **Auto-create issues** | No manual issue creation |
| **Progress sync** | Checkboxes update automatically |
| **Status mapping** | Status flows both ways |
| **Living connection** | Always in sync |

**Key commands**:
```bash
/specweave:sync-progress          # Full sync
/specweave-github:sync 0001       # GitHub sync
/specweave-jira:sync 0001         # JIRA sync
/specweave-ado:sync 0001          # ADO sync
```

:next → [Lesson 8: AI Model Selection](./08-ai-model-selection)
