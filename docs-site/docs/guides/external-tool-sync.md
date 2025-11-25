# External Tool Sync

**Automatic synchronization between SpecWeave specs and external tools (GitHub, JIRA, Azure DevOps).**

> **Clarification**: This is NOT true bidirectional sync where you can edit in either place. Different data types flow in different directions—content always flows FROM SpecWeave, status always flows TO SpecWeave.

## Overview

SpecWeave implements **split-direction sync** with different sync directions for different types of data:

| Data Type | Sync Direction | Source of Truth | What Syncs |
|-----------|---------------|-----------------|------------|
| **CONTENT** | SpecWeave → External Tool | `.specweave/docs/internal/specs/` | Title, Description, User Stories, Acceptance Criteria |
| **STATUS** | External Tool → SpecWeave | GitHub/JIRA/ADO | State (Open/Closed), Progress, Assignees |
| **COMMITS** | SpecWeave → External Tool | Git history | Commit links, PR links, implementation updates |

**Key Principle**: Specs are the **permanent source of truth** for WHAT we're building. External tools manage HOW we track it.

---

## Architecture: Split Source of Truth

### The Problem

Traditional approaches force you to choose:
- **Option A**: External tool (JIRA) is source of truth → Developers must copy changes to docs manually
- **Option B**: Docs (SpecWeave) is source of truth → PMs must copy changes to JIRA manually

**Both approaches fail!** One system becomes stale.

### The Solution: Split-Direction Sync

SpecWeave syncs **different data types in different directions**:

```
┌─────────────────────────────────────────────────────────────┐
│ SpecWeave Specs (.specweave/docs/internal/specs/)          │
│ Source of Truth: CONTENT (title, description, user stories)│
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ CONTENT SYNC (SpecWeave → External)
                  │ - Create new work items
                  │ - Update title/description when spec changes
                  │ - Sync user stories and acceptance criteria
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ External Tools (GitHub Issues, JIRA Epics, ADO Features)   │
│ Source of Truth: STATUS (state, progress, assignments)     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ STATUS SYNC (External → SpecWeave)
                  │ - Read issue state (Open/Closed)
                  │ - Read progress percentage
                  │ - Read assignees
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ SpecWeave Implementation (.specweave/increments/)          │
│ Source of Truth: IMPLEMENTATION (code, commits, PRs)       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ COMMIT SYNC (SpecWeave → External)
                  │ - Post commit links to work items
                  │ - Post PR links when merged
                  │ - Update progress comments
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ External Tools - Comments Section                          │
└─────────────────────────────────────────────────────────────┘
```

**Result**: Best of both worlds!
- ✅ Specs stay complete and up-to-date (SpecWeave manages content)
- ✅ PMs/stakeholders track progress in their preferred tool (GitHub/JIRA/ADO manages status)
- ✅ Implementation history linked to work items (commit comments)

---

## Content Sync (SpecWeave → External Tool)

### When It Runs

**Automatic** (via hooks):
- After creating new increment with `/specweave:increment`
- When spec.md is created in `.specweave/docs/internal/specs/`

**Manual** (CLI):
- When spec content is manually updated
- Run: `node dist/cli/commands/sync-spec-content.js --spec <path> --provider github|jira|ado`

### What It Does

**Creates new work items** if spec doesn't have external link:
```bash
# User creates spec
vim .specweave/docs/internal/specs/spec-001-user-auth.md

# Hook runs automatically
# → Creates GitHub issue #456
# → Adds link to spec.md: **GitHub Project**: https://github.com/org/repo/issues/456
```

**Updates existing work items** when spec content changes:
```bash
# User updates spec (adds user story)
vim .specweave/docs/internal/specs/spec-001-user-auth.md

# Hook detects change (title, description, or user story count)
# → Updates GitHub issue #456 with new content
# → Does NOT change issue state (Open/Closed)
```

### What It Syncs

**Title**:
```markdown
# Spec                          # GitHub Issue
title: "User Authentication"  → Title: "[SPEC-001] User Authentication"
```

**Description**:
```markdown
# Spec                          # GitHub Issue Body
Add user authentication        → ## Summary
system with OAuth support.       Add user authentication system with OAuth support.
```

**User Stories**:

From spec.md:
```markdown
**US-001**: Basic Login
**Acceptance Criteria**:
- AC-US1-01: Login with email/password
```

To GitHub Issue Body:
```markdown
## User Stories
### US-001: Basic Login
**Acceptance Criteria:**
- [ ] AC-US1-01: Login with email/password
```

### What It Does NOT Sync

❌ **State/Status**:
- GitHub: Open/Closed
- JIRA: To Do/In Progress/Done
- ADO: New/Active/Resolved/Closed

❌ **Progress Percentage** (managed by task completion)

❌ **Assignees** (managed in external tool)

❌ **Labels/Tags** (except initial `specweave` label)

---

## Status Sync (External Tool → SpecWeave)

### When It Runs

**Automatic** (via hooks):
- After task completion (post-task-completion hook)
- When syncing increment progress

**Manual** (CLI):
- Run: `/specweave-github:sync <increment-id>`

### What It Does

**Reads status from external tool**:
```bash
# GitHub issue #456 is "Closed"
# SpecWeave reads state and marks increment as complete
```

**Does NOT update external tool state**:
```bash
# ❌ WRONG: Completing tasks in SpecWeave does NOT close GitHub issue
# ✅ CORRECT: Close issue in GitHub → SpecWeave reads closure
```

### Why This Direction?

**Rationale**: External tools (GitHub/JIRA/ADO) are the **workflow management systems**. They handle:
- Kanban boards
- Sprint planning
- Stakeholder visibility
- Team collaboration

SpecWeave focuses on **specification and implementation**, not workflow management.

---

## Commit Sync (SpecWeave → External Tool)

### When It Runs

**Automatic** (via hooks):
- After task completion (detects new commits)
- When increment is marked complete

### What It Does

**Posts commit links to work items**:
```markdown
## GitHub Issue Comment

### User Story: US-001 (Login)

**Commits**:
- [abc123f](https://github.com/org/repo/commit/abc123f): Add AuthService with JWT
- [def456g](https://github.com/org/repo/commit/def456g): Add login API endpoint

**PR**: [#789](https://github.com/org/repo/pull/789): Implement user authentication

---

🤖 Auto-posted by SpecWeave
```

**Links user stories to commits** (via AC-IDs):
```bash
# Task references AC-US1-01, AC-US1-02
# Commits for this task → posted under "US-001" section in comment
```

---

## Configuration

### Enable/Disable Sync

**`.specweave/config.json`**:
```json
{
  "sync": {
    "enabled": true,
    "settings": {
      "syncSpecContent": true,     // Content sync (SpecWeave → External)
      "syncCommitLinks": true,     // Commit sync (SpecWeave → External)
      "syncDirection": "bidirectional"  // Read status from external
    },
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "myrepo"
        }
      }
    }
  }
}
```

### Per-Provider Settings

**GitHub**:
```json
{
  "sync": {
    "profiles": {
      "github-main": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "main-app"
        }
      }
    }
  }
}
```

**JIRA**:
```json
{
  "sync": {
    "profiles": {
      "jira-dev": {
        "provider": "jira",
        "config": {
          "domain": "mycompany.atlassian.net",
          "projectKey": "PROJ"
        }
      }
    }
  }
}
```

**Environment Variables** (JIRA):
```bash
export JIRA_EMAIL="user@company.com"
export JIRA_API_TOKEN="your-api-token"
```

**Azure DevOps**:
```json
{
  "sync": {
    "profiles": {
      "ado-backend": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "project": "backend-services"
        }
      }
    }
  }
}
```

**Environment Variables** (ADO):
```bash
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

---

## Workflow Examples

### Example 1: Create New Spec → Auto-Create Work Item

```bash
# 1. PM creates spec
/specweave:increment "User authentication with OAuth"

# PM agent generates:
# - .specweave/docs/internal/specs/spec-001-user-auth.md
# - .specweave/increments/0001-user-auth/spec.md (subset)

# 2. post-increment-planning hook fires
# → Detects spec-001-user-auth.md is new
# → Creates GitHub issue #456
# → Adds link to spec-001-user-auth.md

# 3. Developer starts work
/specweave:do

# 4. As tasks complete, commits are posted to issue #456
# → Comment: "US-001 implemented in commits abc123f, def456g"
```

### Example 2: Update Spec → Auto-Update Work Item

```bash
# 1. PM updates spec (adds new user story)
vim .specweave/docs/internal/specs/spec-001-user-auth.md

# Add:
# **US-004**: Password Reset
# **Acceptance Criteria**:
# - AC-US4-01: User can request password reset link

# 2. Manual sync (automatic in future)
node dist/cli/commands/sync-spec-content.js \
  --spec .specweave/docs/internal/specs/spec-001-user-auth.md \
  --provider github

# Output:
# 🔄 Syncing spec content to github...
#    Spec: spec-001-user-auth.md
#
# 🔄 Checking for changes in issue #456
#    📝 Changes detected:
#       - user stories: 3 → 4
#
# ✅ Updated issue #456
#    URL: https://github.com/myorg/myrepo/issues/456

# 3. GitHub issue #456 now shows US-004
```

### Example 3: Close Work Item → Read Status

```bash
# 1. PM closes GitHub issue #456 (all work complete)

# 2. Developer syncs status
/specweave-github:sync 0001

# Output:
# 🔄 Syncing increment 0001-user-auth with GitHub...
# ✅ Increment marked complete (issue #456 closed)

# 3. SpecWeave marks increment as complete
```

---

## Best Practices

### DO ✅

1. **Keep specs up-to-date**: Treat `.specweave/docs/internal/specs/` as source of truth for requirements
2. **Let external tools manage workflow**: Close issues in GitHub/JIRA/ADO, not SpecWeave
3. **Review sync results**: Check comments in external tools after task completion
4. **Use AC-IDs for traceability**: Link tasks to user stories via `AC-US{story}-{number}`

### DON'T ❌

1. **Don't manually update specs to match external tools**: Content flows SpecWeave → External
2. **Don't manually close issues in SpecWeave**: Status flows External → SpecWeave
3. **Don't skip sync hooks**: Hooks ensure specs and external tools stay in sync
4. **Don't duplicate specs**: One spec in `.specweave/docs/internal/specs/`, referenced by increments

---

## Troubleshooting

### "Spec not syncing to GitHub"

**Check**:
1. Sync enabled in config: `config.sync.enabled = true`
2. Spec content sync enabled: `config.sync.settings.syncSpecContent = true`
3. Active profile configured: `config.sync.activeProfile` set
4. Provider credentials valid (GitHub token, JIRA API token, ADO PAT)

**Manual sync**:
```bash
node dist/cli/commands/sync-spec-content.js \
  --spec .specweave/docs/internal/specs/spec-001.md \
  --provider github \
  --verbose
```

### "Changes not detected"

**Possible causes**:
- Spec content identical to external tool (no changes)
- Whitespace differences (normalized during comparison)
- User story count unchanged

**Force update**:
```bash
# Manually update spec to trigger change detection
# Add a comment or minor edit, then sync
```

### "Multiple work items created"

**Cause**: Hook ran multiple times or manual creation

**Fix**:
```bash
# Check metadata.json for external link
cat .specweave/increments/0001-user-auth/metadata.json

# Should show:
# {
#   "github": {
#     "issue": 456,
#     "url": "https://github.com/org/repo/issues/456"
#   }
# }

# If duplicate, close extra issue manually in GitHub
```

---

## Technical Implementation

### Change Detection Algorithm

```typescript
function detectContentChanges(localSpec, externalContent) {
  const changes = [];

  // 1. Title change (exact match)
  if (localSpec.title !== externalContent.title) {
    changes.push(`title: "${externalContent.title}" → "${localSpec.title}"`);
  }

  // 2. Description change (normalized whitespace)
  const normalize = (str) => str.replace(/\s+/g, ' ').trim();
  if (normalize(localSpec.description) !== normalize(externalContent.description)) {
    changes.push('description updated');
  }

  // 3. User story count change
  if (localSpec.userStories.length !== externalContent.userStoryCount) {
    changes.push(`user stories: ${externalContent.userStoryCount} → ${localSpec.userStories.length}`);
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
}
```

### Provider-Specific Formatting

**GitHub** (Markdown):
```markdown
## User Stories

### US-001: Basic Login

**Acceptance Criteria:**
- [ ] AC-US1-01: User can log in with email/password
- [ ] AC-US1-02: Invalid credentials show error
```

**JIRA** (JIRA Markup):
```
h2. User Stories

h3. US-001: Basic Login

*Acceptance Criteria:*
* (x) AC-US1-01: User can log in with email/password
* (/) AC-US1-02: Invalid credentials show error
```

**Azure DevOps** (HTML):
```html
<h2>User Stories</h2>

<h3>US-001: Basic Login</h3>

<p><strong>Acceptance Criteria:</strong></p>
<ul>
  <li>☐ AC-US1-01: User can log in with email/password</li>
  <li>☑ AC-US1-02: Invalid credentials show error</li>
</ul>
```

---

## Summary

**Bidirectional sync = Different sync directions for different data types**:

1. **CONTENT** (Title, Description, User Stories): SpecWeave → External Tool
2. **STATUS** (Open/Closed, Progress): External Tool → SpecWeave
3. **COMMITS** (Links, PRs): SpecWeave → External Tool

**Result**: Specs stay complete, external tools manage workflow, implementation is traceable.

**For more details**: See [Spec Commit Sync Guide](./spec-commit-sync.md)
