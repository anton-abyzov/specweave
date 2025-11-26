---
sidebar_position: 8
title: "Lesson 7: External Tools"
description: "Connect GitHub, JIRA, and Azure DevOps"
---

# Lesson 7: External Tools

**Time**: 35 minutes
**Goal**: Set up sync with project management tools

:::tip Deep-Dive Guides Available
This lesson provides an overview. For comprehensive setup guides, see:
- [Lesson 14: GitHub Integration Guide](./14-github-integration)
- [Lesson 15: JIRA Integration Guide](./15-jira-integration)
- [Lesson 16: Azure DevOps Integration Guide](./16-ado-integration)
:::

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

### The Real Benefits

Beyond time savings, integration provides:

1. **PM Visibility**: Non-technical stakeholders see progress without accessing code
2. **Audit Trail**: Requirements link to implementation to completion
3. **Team Sync**: Everyone sees the same status, everywhere
4. **Automation**: Close issues when increments complete

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

### Split-Source Sync (Default)

> **Note**: Previously called "bidirectional" but renamed for clarity. This is NOT true bidirectional where the same data can be edited in both places. Instead:
> - **Content** (specs, tasks) flows **SpecWeave → External** (one way)
> - **Status** (checkboxes, closed) flows **External → SpecWeave** (one way)

```json
{
  "sync": {
    "direction": "bidirectional",
    "conflictResolution": "external-wins"
  }
}
```

Different data types flow in different directions. External tool wins on status conflicts.

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

## Practical Example: Full Integration Workflow

Here's a real-world example showing how integration works end-to-end:

### Scenario: Building a User Profile Feature

```bash
# 1. Create increment (GitHub issue auto-created)
/specweave:increment "User profile feature"

# Output:
✓ Increment 0050-user-profile created
✓ GitHub Issue #200 created: "User Profile Feature"
  URL: https://github.com/your-org/your-repo/issues/200
```

### The GitHub Issue Created

```markdown
## [FS-001][US-001] User Profile Feature

Implementation of user profile viewing and editing.

### Acceptance Criteria
- [ ] AC-US1-01: User can view their profile
- [ ] AC-US1-02: Profile shows name, email, avatar
- [ ] AC-US1-03: User can edit profile fields
- [ ] AC-US1-04: Changes persist after refresh

### Tasks
- [ ] T-001: Create ProfileService
- [ ] T-002: Build profile view component
- [ ] T-003: Implement edit functionality
- [ ] T-004: Write unit tests
- [ ] T-005: Write E2E tests

📋 Managed by SpecWeave | Increment: 0050-user-profile
```

### During Development

```bash
# 2. Implement tasks
/specweave:do

# As each task completes, GitHub syncs automatically:
T-001: Create ProfileService
├── Creating src/services/ProfileService.ts
├── Tests: ✓ 4/4 passing
├── GitHub: ✓ Checkbox checked
└── ✓ Complete

# PM checks GitHub issue and sees:
- [x] T-001: Create ProfileService  ← Auto-checked!
- [ ] T-002: Build profile view component
...
```

### Completion

```bash
# 3. Finish and close
/specweave:done 0050

# Output:
✓ All tasks complete (5/5)
✓ Quality gates passed
✓ GitHub Issue #200 closed
✓ Completion comment added
```

### The Final GitHub Comment

```markdown
✅ **Increment Complete!**

**Final Status:**
- Tasks: 5/5 (100%)
- Tests: 18/18 passing
- Coverage: 92%

**Deliverables:**
- ProfileService (src/services/ProfileService.ts)
- ProfileView component (src/components/ProfileView.tsx)
- ProfileEdit component (src/components/ProfileEdit.tsx)

🎉 Closed by SpecWeave
```

---

## Choosing Your Integration

### Decision Matrix

| Scenario | Best Choice |
|----------|-------------|
| **Startup, technical team** | GitHub Issues |
| **Enterprise, existing JIRA** | JIRA |
| **Microsoft shop, ADO pipelines** | Azure DevOps |
| **Multiple tools needed** | Configure all, use primary |

### Can I Use Multiple Tools?

Yes! Configure multiple integrations:

```json
{
  "sync": {
    "github": {
      "enabled": true,
      "primary": true
    },
    "jira": {
      "enabled": true,
      "primary": false
    }
  }
}
```

The **primary** tool is where issues are created by default.

---

## The Init Questions Explained

During `specweave init`, you'll be asked:

### Question 1: "Which Git provider?"

```
? Which Git provider are you using?
  ❯ GitHub (github.com)
    GitLab
    Azure DevOps
```

**Why it matters**: Determines which plugin gets installed and how commits link to issues.

### Question 2: "Sync with issue tracker?"

```
? Do you want to sync increments with an external issue tracker?
  ❯ Yes, GitHub Issues
    Yes, JIRA
    Yes, Azure DevOps Work Items
    No, keep everything local
```

**Why it matters**: "No" means all tracking stays in `.specweave/`. "Yes" enables bidirectional sync.

### Question 3: Team Strategy

```
? How is your team organized?
  ❯ Repository-per-team (microservices)
    Team-based (monorepo)
    Team-multi-repo (platform teams)
```

**Why it matters**: Determines how specs map to external tool structure.

---

## Glossary Terms Used

- **[JIRA](/docs/glossary/terms/jira)** — Atlassian project tracking
- **[Azure DevOps](/docs/glossary/terms/azure-devops)** — Microsoft DevOps platform
- **[Epic](/docs/glossary/terms/epic)** — Large story spanning sprints
- **[Split-Source Sync](/docs/glossary/terms/split-source-sync)** — Content flows one way, status flows other way

---

## Key Commands

```bash
# Status & Diagnostics
/specweave-github:status          # Check GitHub connection
/specweave-jira:status            # Check JIRA connection
/specweave-ado:status             # Check ADO connection
/specweave:sync-diagnostics       # Rate limits, errors

# Syncing
/specweave:sync-progress          # Full sync (all systems)
/specweave-github:sync 0001       # GitHub sync (one increment)
/specweave-jira:sync 0001         # JIRA sync (one increment)
/specweave-ado:sync 0001          # ADO sync (one increment)

# Issue Management
/specweave-github:create-issue 0001   # Create GitHub issue
/specweave-github:close-issue 0001    # Close GitHub issue
```

---

## Next Steps

This lesson gave you the overview. For complete setup instructions:

- **GitHub users** → [Lesson 14: GitHub Integration Guide](./14-github-integration)
- **JIRA users** → [Lesson 15: JIRA Integration Guide](./15-jira-integration)
- **Azure DevOps users** → [Lesson 16: Azure DevOps Integration Guide](./16-ado-integration)

Or continue to learn about AI model selection:

**:next** → [Lesson 8: AI Model Selection](./08-ai-model-selection)
