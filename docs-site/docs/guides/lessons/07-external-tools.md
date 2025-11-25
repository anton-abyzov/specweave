---
sidebar_position: 8
title: "Lesson 7: External Tools"
description: "Connect GitHub, JIRA, and Azure DevOps"
---

# Lesson 7: External Tools

**Time**: 35 minutes
**Goal**: Set up sync with project management tools

---

## Why Integrate?

### Without Integration

```
Developer finishes task
    │
    ├── Updates tasks.md ✓
    ├── Opens GitHub... (2 min)
    ├── Opens JIRA... (3 min)
    └── Forgets something... ❌

Time wasted: 5+ min per task
```

### With Integration

```
Developer finishes task
    │
    └── Updates tasks.md ✓
            │
            └── Hook fires automatically
                    ├── GitHub issue ✓
                    ├── JIRA story ✓
                    └── ADO work item ✓

Time wasted: 0 min
```

---

## Supported Platforms

| Platform | Features |
|----------|----------|
| **GitHub Issues** | Create, update, close, checkbox sync |
| **[JIRA](/docs/glossary/terms/jira)** | Epic/Story hierarchy, status sync |
| **[Azure DevOps](/docs/glossary/terms/azure-devops)** | Work items, area paths |

---

## GitHub Setup

### Step 1: Create Token

```
GitHub → Settings → Developer settings → Personal access tokens
Scopes: repo, read:org
```

### Step 2: Configure

```bash
# In .env (gitignored)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Or during init:
specweave init .
```

### Step 3: Verify

```bash
/specweave-github:status
```

```
✅ Connected to GitHub
  Repository: owner/repo-name
  Token: Valid

Ready for sync!
```

### Creating Issues

```bash
/specweave-github:create-issue 0001
```

Creates:
```markdown
## [FS-001][US-001] User Authentication

### Acceptance Criteria
- [ ] AC-US1-01: Login form validates email
- [ ] AC-US1-02: Error message for invalid creds

### Tasks
- [ ] T-001: Create AuthService
- [ ] T-002: Implement password hashing

📋 Managed by SpecWeave
```

### Syncing Progress

```bash
/specweave-github:sync 0001
```

```
Changes synced:
  ✓ T-001: completed → checkbox checked
  ✓ AC-US1-01: verified → checkbox checked
  ✓ Progress: 40% → comment added

Sync complete!
```

---

## JIRA Setup

### Step 1: Get API Token

```
Atlassian → Account Settings → Security → API tokens
```

### Step 2: Configure

```bash
# In .env
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=xxxxxxxxxxxxxx
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_PROJECT_KEY=PROJ
```

### Hierarchy Mapping

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

Creates:
```
Epic: PROJ-100 "User Authentication Feature"
  └── Story: PROJ-101 "US-001: User Login"
      ├── Sub-task: PROJ-102 "T-001: AuthService"
      └── Sub-task: PROJ-103 "T-002: Password hashing"
```

---

## Azure DevOps Setup

### Step 1: Create PAT

```
Azure DevOps → User Settings → Personal Access Tokens
Scopes: Work Items (Read & Write)
```

### Step 2: Configure

```bash
# In .env
ADO_PAT=xxxxxxxxxxxxxxxxxxxx
ADO_ORGANIZATION=your-org
ADO_PROJECT=your-project
```

### Syncing

```bash
/specweave-ado:sync 0001
```

---

## Full Sync Command

The master command syncs everything:

```bash
/specweave:sync-progress
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FULL PROGRESS SYNC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Sync tasks.md
  ✓ 12 tasks verified

Step 2: Sync to living docs
  ✓ FEATURES.md updated

Step 3: Sync to external tools
  GitHub: ✓ Issue #42 updated
  JIRA: ✓ Epic PROJ-100 synced

All systems in sync!
```

---

## Sync Strategies

Configure in `.specweave/config.json`:

### Bidirectional (Default)

```json
{
  "sync": {
    "direction": "bidirectional",
    "conflictResolution": "external-wins"
  }
}
```

Changes flow both ways. External tool wins on conflict.

### Export Only

```json
{
  "sync": {
    "direction": "export-only"
  }
}
```

SpecWeave → External only.

### Import Only

```json
{
  "sync": {
    "direction": "import-only"
  }
}
```

External → SpecWeave only.

---

## Troubleshooting

### Authentication Failed

```bash
/specweave-github:status
# Check if token valid/expired
```

### Sync Conflict

```bash
# Force from SpecWeave
/specweave-github:sync 0001 --force

# Force from external
/specweave:sync-progress --from-external
```

### Rate Limit

```bash
/specweave:sync-diagnostics
# Wait for reset or use different token
```

---

## Glossary Terms Used

- **[JIRA](/docs/glossary/terms/jira)** — Atlassian project tracking
- **[Azure DevOps](/docs/glossary/terms/azure-devops)** — Microsoft DevOps platform
- **[Epic](/docs/glossary/terms/epic)** — Large story spanning sprints
- **[Bidirectional Sync](/docs/glossary/terms/bidirectional-sync)** — Two-way synchronization

---

## Key Commands

```bash
/specweave:sync-progress          # Full sync
/specweave-github:sync 0001       # GitHub sync
/specweave-jira:sync 0001         # JIRA sync
/specweave-ado:sync 0001          # ADO sync
```

---

## What's Next?

Learn how to choose the right AI model for each task.

**:next** → [Lesson 8: AI Model Selection](./08-ai-model-selection)
