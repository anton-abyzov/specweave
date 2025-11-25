---
sidebar_position: 15
title: "Lesson 14: GitHub Integration Guide"
description: "Complete guide to syncing SpecWeave with GitHub Issues"
---

# Lesson 14: GitHub Integration Guide

**Time**: 45 minutes
**Goal**: Set up and master bidirectional GitHub sync

---

## Why GitHub Integration?

GitHub Issues is where most development teams track work. SpecWeave integration provides:

- **Automatic issue creation** when increments start
- **Bidirectional checkbox sync** (task completed → checkbox checked)
- **Progress visibility** for non-technical stakeholders
- **Audit trail** linking code commits to requirements

---

## Setup Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB INTEGRATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SpecWeave                        GitHub                   │
│   ─────────                        ──────                   │
│   Increment 0042         ──────▶   Issue #142               │
│     └─ tasks.md          ◀──────     └─ Checkboxes          │
│                                                             │
│   Bidirectional Sync:                                       │
│   • Task completed → Checkbox checked                       │
│   • Checkbox checked → Task updated                         │
│   • Progress % → Issue comment                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create GitHub Token

### Navigate to GitHub Settings

```
1. Go to: https://github.com/settings/tokens
2. Click: "Generate new token (classic)"
3. Or use: Fine-grained tokens (recommended)
```

### Required Scopes (Classic Token)

```
☑ repo                  ← Full repository access
☑ read:org              ← Organization membership
☑ workflow              ← GitHub Actions (optional)
```

### Required Permissions (Fine-grained Token)

```
Repository permissions:
  ☑ Issues: Read and write
  ☑ Pull requests: Read (optional)
  ☑ Contents: Read (for commit linking)
  ☑ Metadata: Read

Organization permissions:
  ☑ Members: Read (for team detection)
```

### Store the Token

```bash
# Option 1: Environment variable (recommended)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Option 2: .env file (gitignored)
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" >> .env

# Option 3: GitHub CLI (if installed)
gh auth login
# SpecWeave auto-detects gh cli auth
```

---

## Step 2: Initialize with GitHub

### During specweave init

```bash
specweave init .

# Questions you'll see:
? Which Git provider are you using?
  ❯ GitHub (github.com)

? Do you want to sync increments with an external issue tracker?
  ❯ Yes, GitHub Issues

? GitHub organization/owner name: your-org

? Repository name: your-repo

? Create issues automatically when increment starts? (Y/n)
```

### After Init - Verify Configuration

```bash
cat .specweave/config.json
```

```json
{
  "sync": {
    "github": {
      "enabled": true,
      "owner": "your-org",
      "repo": "your-repo",
      "autoCreateIssues": true,
      "syncCheckboxes": true,
      "addProgressComments": true
    }
  }
}
```

### Test Connection

```bash
/specweave-github:status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB CONNECTION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Token: Valid (expires: never)
✅ Repository: your-org/your-repo
✅ Permissions: Issues (RW), Contents (R)
✅ Rate limit: 4892/5000 (resets in 45 min)

Ready for sync!
```

---

## Step 3: Team Strategy Selection

### Repository-per-Team (Microservices)

**Use when**: Each team owns separate repositories.

```bash
? Select team mapping strategy:
  ❯ Repository-per-team

? Repository names (comma-separated):
  frontend-app,backend-api,mobile-app
```

**What happens**:

```
.specweave/docs/specs/
├── frontend-app/      ← Issues go to frontend-app repo
├── backend-api/       ← Issues go to backend-api repo
└── mobile-app/        ← Issues go to mobile-app repo
```

**Config**:

```json
{
  "sync": {
    "github": {
      "strategy": "repository-per-team",
      "owner": "your-org",
      "repos": ["frontend-app", "backend-api", "mobile-app"]
    }
  }
}
```

### Team-Based (Monorepo)

**Use when**: Single repository, multiple teams.

```bash
? Select team mapping strategy:
    Team-based (monorepo with team labels)

? Team names (comma-separated):
  frontend,backend,mobile,qa
```

**What happens**:

```
All issues → same repository
Team identification via labels: team:frontend, team:backend, etc.
```

**Config**:

```json
{
  "sync": {
    "github": {
      "strategy": "team-based",
      "owner": "your-org",
      "repo": "main-product",
      "teams": ["frontend", "backend", "mobile", "qa"]
    }
  }
}
```

### Team-Multi-Repo (Platform Teams)

**Use when**: Teams own multiple repositories.

```bash
? Select team mapping strategy:
    Team-multi-repo (complex team-to-repo mapping)

? Team-to-repo mapping (JSON):
{
  "platform-team": ["api-gateway", "auth-service"],
  "frontend-team": ["web-app", "mobile-app"]
}
```

**Config**:

```json
{
  "sync": {
    "github": {
      "strategy": "team-multi-repo",
      "owner": "your-org",
      "teamRepoMapping": {
        "platform-team": ["api-gateway", "auth-service"],
        "frontend-team": ["web-app", "mobile-app"]
      }
    }
  }
}
```

---

## Creating GitHub Issues

### Automatic Creation

When `autoCreateIssues: true`:

```bash
/specweave:increment "User authentication"

# Output:
Creating increment: 0042-user-authentication
✓ spec.md generated
✓ plan.md generated
✓ tasks.md generated
✓ GitHub Issue #142 created: https://github.com/your-org/your-repo/issues/142
```

### Manual Creation

If auto-create is disabled:

```bash
/specweave-github:create-issue 0042

# Output:
Creating GitHub issue for 0042-user-authentication...

Issue created: #142
URL: https://github.com/your-org/your-repo/issues/142
```

### Issue Format

The created issue looks like:

```markdown
## [FS-001][US-001] User Authentication

Implementation of user authentication feature.

### Acceptance Criteria

- [ ] **AC-US1-01**: Login with email/password works
- [ ] **AC-US1-02**: JWT token issued on success
- [ ] **AC-US1-03**: Rate limit 5 attempts per minute
- [ ] **AC-US1-04**: Session persists across refreshes

### Tasks

- [ ] T-001: Create AuthService
- [ ] T-002: Implement JWT token generation
- [ ] T-003: Add login endpoint
- [ ] T-004: Implement rate limiting
- [ ] T-005: Write unit tests
- [ ] T-006: Write integration tests

---

📋 Managed by SpecWeave | Increment: 0042-user-authentication
```

---

## Syncing Progress

### Manual Sync

```bash
/specweave-github:sync 0042

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: SpecWeave → GitHub

Changes:
  ✓ T-001: pending → completed (checkbox checked)
  ✓ T-002: pending → completed (checkbox checked)
  ✓ AC-US1-01: unchecked → checked
  ✓ Progress comment added: "60% complete (6/10 tasks)"

Sync complete!
```

### Automatic Sync (Hooks)

When configured, sync happens automatically:

```bash
# After each task completion during /specweave:do
T-003: Add login endpoint
├── Creating src/auth/login.ts
├── Tests: ✓ 4/4 passing
├── GitHub sync: ✓ Checkbox checked
└── ✓ Complete
```

### Bidirectional Sync

If someone checks a box directly on GitHub:

```bash
/specweave-github:sync 0042 --from-external

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB SYNC: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direction: GitHub → SpecWeave

Changes detected:
  ⚠️ T-004: GitHub shows complete, tasks.md shows pending

Update tasks.md? (Y/n)
  ✓ T-004 marked complete in tasks.md
```

---

## Sync Strategies

### Configure in config.json

```json
{
  "sync": {
    "github": {
      "direction": "bidirectional",     // or "export-only", "import-only"
      "conflictResolution": "external-wins",  // or "specweave-wins", "manual"
      "syncInterval": "on-task-completion",   // or "manual", "hourly"
      "addProgressComments": true,
      "closeOnDone": true
    }
  }
}
```

### Direction Options

| Direction | SpecWeave → GitHub | GitHub → SpecWeave |
|-----------|-------------------|-------------------|
| `bidirectional` | ✅ | ✅ |
| `export-only` | ✅ | ❌ |
| `import-only` | ❌ | ✅ |

### Conflict Resolution

```
Conflict: Task marked complete in SpecWeave, incomplete in GitHub

external-wins:
  → SpecWeave task reverted to pending

specweave-wins:
  → GitHub checkbox checked

manual:
  → Prompt user for decision
```

---

## Closing Issues

### Automatic Close

When increment completes:

```bash
/specweave:done 0042

# Output includes:
...
✓ GitHub Issue #142 closed with comment:

  "✅ Increment 0042-user-authentication completed!

   Final status:
   - 10/10 tasks complete
   - All acceptance criteria verified
   - Quality gate: PASSED

   Completion report: .specweave/increments/0042-user-authentication/reports/completion.md"
```

### Manual Close

```bash
/specweave-github:close-issue 0042

# Or close without completion (abandoned):
/specweave-github:close-issue 0042 --reason "Feature cancelled"
```

---

## Labels and Milestones

### Automatic Labels

SpecWeave adds these labels automatically:

| Label | When Applied |
|-------|--------------|
| `specweave` | All managed issues |
| `status:active` | Increment is active |
| `status:paused` | Increment is paused |
| `priority:high` | Hotfix increments |
| `team:frontend` | Team-based strategy |

### Custom Labels

Configure in config.json:

```json
{
  "sync": {
    "github": {
      "labels": {
        "prefix": "sw",           // sw:active, sw:paused
        "includeFeatureId": true, // FS-001
        "includeIncrementType": true  // feature, hotfix, bug
      }
    }
  }
}
```

### Milestone Integration

```json
{
  "sync": {
    "github": {
      "milestones": {
        "enabled": true,
        "pattern": "Sprint {sprint_number}"  // Sprint 23
      }
    }
  }
}
```

---

## Troubleshooting

### "Authentication failed"

```bash
# Check token validity
/specweave-github:status

# If expired, regenerate:
# https://github.com/settings/tokens

# Update token:
export GITHUB_TOKEN=ghp_new_token
# or update .env
```

### "Rate limit exceeded"

```bash
/specweave-github:status

# Output:
⚠️ Rate limit: 0/5000 (resets in 23 min)

# Wait for reset, or use authenticated requests:
# Fine-grained tokens have higher limits
```

### "Issue not found"

```bash
# Check issue exists
gh issue view 142

# Re-link increment to issue:
/specweave-github:link 0042 --issue 142
```

### "Sync conflict"

```bash
# Force from SpecWeave (overwrite GitHub)
/specweave-github:sync 0042 --force

# Force from GitHub (overwrite SpecWeave)
/specweave-github:sync 0042 --from-external --force
```

### "Checkboxes not updating"

```bash
# Check issue body format
# SpecWeave expects:
# - [ ] T-001: Task name
# - [x] T-002: Completed task

# If format is different, re-create issue:
/specweave-github:create-issue 0042 --overwrite
```

---

## GitHub Actions Integration

### Auto-sync on Push

```yaml
# .github/workflows/specweave-sync.yml
name: SpecWeave Sync

on:
  push:
    branches: [main, develop]
    paths:
      - '.specweave/increments/**/tasks.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Sync to GitHub
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          specweave sync-progress --auto-yes
```

### Status Check on PR

```yaml
# .github/workflows/specweave-validate.yml
name: SpecWeave Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Validate Increments
        run: |
          specweave validate --all --ci
          # Fails if any increment has validation errors
```

---

## Real-World Example

### Full Workflow

```bash
# 1. Create increment (auto-creates GitHub issue)
/specweave:increment "Add user profile page"

# Output:
✓ Increment 0050-user-profile-page created
✓ GitHub Issue #200 created

# 2. Implement tasks
/specweave:do

# Each task completion syncs to GitHub automatically
# Checkboxes get checked, progress comments added

# 3. Check sync status
/specweave-github:status 0050

# Output:
Issue #200: In sync ✓
  Local tasks:  8/12 complete
  GitHub tasks: 8/12 complete

# 4. Complete increment
/specweave:done 0050

# Output:
✓ Quality gates passed
✓ GitHub Issue #200 closed
✓ Completion comment added
```

---

## Quick Exercise

Set up GitHub integration:

```bash
# 1. Create token at github.com/settings/tokens
# 2. Export token
export GITHUB_TOKEN=your_token

# 3. Initialize or reconfigure
specweave init . --reconfigure

# 4. Test connection
/specweave-github:status

# 5. Create test increment
/specweave:increment "Test GitHub sync"

# 6. Verify issue created
gh issue list --limit 5
```

---

## Key Takeaways

1. **Token scopes matter** — `repo` and `read:org` are essential
2. **Choose the right strategy** — repo-per-team, team-based, or team-multi-repo
3. **Bidirectional sync** keeps everything in sync automatically
4. **Automatic issue creation** reduces manual work
5. **GitHub Actions** can automate sync in CI/CD

---

## Glossary Terms Used

- **[Bidirectional Sync](/docs/glossary/terms/bidirectional-sync)** — Two-way synchronization
- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[Quality Gate](/docs/glossary/terms/quality-gate)** — Validation checkpoint

---

## What's Next?

Learn how to integrate with JIRA for enterprise project management.

**:next** → [Lesson 15: JIRA Integration Guide](./15-jira-integration)
