# Unified Multi-Project Sync Architecture

**Decision**: Simplify sync options from 3 strategies to 2 core approaches
**Date**: 2025-11-11
**Status**: APPROVED (pending implementation)

---

## 🎯 Problem Statement

**Current State** (Too Complex):
- ✅ **simple**: One project/repo (works, keep)
- ❌ **filtered**: Multiple projects + sub-organizations + filters (too granular for most users)
- ⚠️ **custom**: Raw JQL/GraphQL/WIQL (works, but experts only)
- ❌ **DEPRECATED**: `project-per-team`, `component-based`, `board-based` (legacy, confusing)

**User Feedback**:
- "Component-based option is confusing - when would I use it?"
- "Too many choices during init - just make it work smart"
- "I have 3 JIRA projects (FE/BE/MOBILE) - why do I need to configure filters/boards?"

---

## ✅ Solution: Two-Tier Architecture

### Tier 1: **Intelligent Multi-Project** (Default, 90% of users)

**What it does**:
- Auto-detects multiple projects from config (JIRA projects, GitHub repos, ADO projects)
- Intelligently maps user stories to projects based on content
- Creates project-specific folder structure
- Syncs each project to correct external tracker

**User Experience**:
```bash
$ specweave init

# During init:
? Configure external sync? (Y/n) Y
? Which provider? (Use arrow keys)
  ❯ GitHub
    JIRA
    Azure DevOps
    None (skip)

# If GitHub:
? Do you have multiple GitHub repositories? (Y/n) Y
? GitHub repositories (comma-separated): company/frontend-web, company/backend-api, company/mobile-app

✅ Detected 3 repos - will create intelligent project mapping
✅ Specs will be organized: specs/frontend-web/, specs/backend-api/, specs/mobile-app/
✅ Each spec syncs to its corresponding GitHub repo automatically

# If JIRA:
? JIRA domain: company.atlassian.net
? Do you have multiple JIRA projects? (Y/n) Y
? JIRA projects (comma-separated): FE, BE, MOBILE

✅ Detected 3 projects - will create intelligent project mapping
✅ Specs will be organized: specs/FE/, specs/BE/, specs/MOBILE/
✅ Each spec syncs to its corresponding JIRA project automatically
```

**No complex filters/boards/components** - just project names!

### Tier 2: **Custom Queries** (Advanced, 10% of users)

**What it does**:
- Power users can write raw JQL/GraphQL/WIQL queries
- Bypass intelligent mapping for full control
- Use case: Complex filtering (labels, sprints, teams, components)

**User Experience**:
```bash
? Configure external sync? (Y/n) Y
? Which provider? JIRA
? Use intelligent multi-project mapping or custom JQL? (Use arrow keys)
  ❯ Intelligent (recommended - auto-map user stories to projects)
    Custom JQL (advanced - write your own query)

# If Custom JQL:
? JIRA JQL query: project IN (FE, BE, MOBILE) AND labels IN (sprint-42) AND component = "Core"

✅ Custom query mode enabled
✅ You have full control over what syncs
⚠️  Note: Intelligent project mapping is disabled (manual organization required)
```

---

## 📊 Comparison: Before vs After

| Aspect | Before (3 strategies) | After (2 tiers) |
|--------|----------------------|-----------------|
| **Options** | simple, filtered, custom | intelligent, custom |
| **Complexity** | High (containers, sub-orgs, filters) | Low (just project names) |
| **Init Questions** | 7-10 questions | 3-5 questions |
| **User Story Mapping** | Manual | Automatic (AI classification) |
| **Folder Structure** | Manual | Automatic (project-based) |
| **Sync Configuration** | Complex JSON | Simple list |
| **Use Case Coverage** | 100% (but confusing) | 100% (simpler) |

---

## 🏗️ GitHub Master-Project + Nested-Repos Pattern

**User Request**: "Master project in root (high-level epics) + nested repos (detailed tasks)"

**Architecture**:

```
Master GitHub Repo (company/master-project):
├── Epic: User Authentication (high-level)
│   ├── Story: Frontend Login UI → LINK to company/frontend-web#42
│   ├── Story: Backend Auth API → LINK to company/backend-api#15
│   └── Story: Mobile Biometric → LINK to company/mobile-app#8
├── Epic: Payment Processing (high-level)
│   ├── Story: Stripe Integration → LINK to company/backend-api#20
│   └── Story: Payment UI → LINK to company/frontend-web#50

Frontend Repo (company/frontend-web):
├── Issue #42: Implement Login UI
│   ├── Task: Create login component
│   ├── Task: Add form validation
│   └── Task: Connect to auth API
├── Issue #50: Build Payment Form
    └── ... (detailed implementation tasks)

Backend Repo (company/backend-api):
├── Issue #15: User Authentication Service
│   ├── Task: JWT generation
│   ├── Task: Password hashing
│   └── Task: Session management
├── Issue #20: Stripe Integration
    └── ... (detailed implementation tasks)
```

**SpecWeave Mapping**:
```
.specweave/docs/internal/specs/
├── master/                          # High-level epics
│   └── spec-0001-user-auth.md       # Epic-level spec
│       → Syncs to: company/master-project#10 (Epic)
│
├── frontend-web/                    # Detailed tasks
│   └── spec-0001-login-ui.md        # Implementation spec
│       → Syncs to: company/frontend-web#42 (Issue)
│
└── backend-api/                     # Detailed tasks
    └── spec-0001-auth-service.md    # Implementation spec
        → Syncs to: company/backend-api#15 (Issue)
```

**Benefits**:
- ✅ **High-level tracking**: Master repo shows overall progress (10,000-foot view)
- ✅ **Detailed tracking**: Each repo shows implementation details
- ✅ **Cross-linking**: Master epic links to detailed issues (traceability)
- ✅ **Team autonomy**: Frontend team works in their repo, backend in theirs
- ✅ **No duplication**: Specs live in `.specweave/`, issues are mirrors

**Configuration**:
```json
{
  "sync": {
    "activeProfile": "github-multi",
    "profiles": {
      "github-multi": {
        "provider": "github",
        "config": {
          "owner": "company",
          "masterRepo": "master-project",  // ✅ NEW: High-level epics
          "repos": [
            "frontend-web",
            "backend-api",
            "mobile-app"
          ]
        },
        "settings": {
          "masterRepoLevel": "epic",        // ✅ NEW: Master = Epics only
          "nestedRepoLevel": "story-task"   // ✅ NEW: Nested = Stories/Tasks
        }
      }
    }
  }
}
```

---

## 🔧 Implementation Plan

### Phase 1: Simplify Sync Options ✅ (This Document)

**What**:
- ✅ Document unified architecture
- ✅ Define two-tier approach (intelligent vs custom)
- ✅ Design GitHub master+nested pattern

### Phase 2: Refactor Sync Profiles (Code Changes)

**What**:
- Remove `filtered` strategy (merge into `intelligent`)
- Remove deprecated `JiraStrategy` types
- Simplify `GitHubConfig`, `JiraConfig`, `AdoConfig`
- Add `masterRepo` support for GitHub

**Files to Change**:
- `src/core/types/sync-profile.ts` - Simplify types
- `src/cli/commands/init.ts` - Simplify init wizard
- `src/core/sync/profile-validator.ts` - Update validation

### Phase 3: Implement Multi-Project Sync

**What**:
- ✅ Project mapper (done)
- ✅ Spec splitter (done)
- ❌ GitHub sync with project mapping (pending)
- ❌ JIRA sync with project mapping (pending)
- ❌ ADO sync with project mapping (pending)

**Files to Create/Update**:
- `plugins/specweave-github/lib/github-multi-project-sync.ts`
- `plugins/specweave-jira/lib/jira-multi-project-sync.ts`
- `plugins/specweave-ado/lib/ado-multi-project-sync.ts`

### Phase 4: Enhance PM Agent

**What**:
- Auto-detect multi-project setup
- Use project mapper for user story classification
- Create project-specific specs automatically
- Sync to correct external trackers

**Files to Update**:
- `plugins/specweave/agents/pm/AGENT.md`

### Phase 5: Update Hooks

**What**:
- Post-task-completion hook uses multi-project sync
- Auto-update correct project in GitHub/JIRA/ADO
- Handle master+nested repo pattern

**Files to Update**:
- `plugins/specweave-github/hooks/post-task-completion.sh`
- `plugins/specweave-jira/hooks/post-task-completion.sh`
- `plugins/specweave-ado/hooks/post-task-completion.sh`

---

## 📝 Simplified Init Flow (New UX)

### Option 1: Single Project (Simple)

```bash
$ specweave init my-app

? Configure external sync? (Y/n) Y
? Which provider? GitHub
? GitHub repository: company/my-app

✅ Single project mode
✅ Specs will sync to: company/my-app
```

**Config Created**:
```json
{
  "sync": {
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "company",
          "repo": "my-app"
        }
      }
    }
  }
}
```

### Option 2: Multiple Projects (Intelligent)

```bash
$ specweave init my-monorepo

? Configure external sync? (Y/n) Y
? Which provider? JIRA
? JIRA domain: company.atlassian.net
? Do you have multiple JIRA projects? (Y/n) Y
? JIRA projects (comma-separated): FE, BE, MOBILE

✅ Multi-project mode enabled
✅ Intelligent project mapping activated
✅ Folder structure: specs/FE/, specs/BE/, specs/MOBILE/
✅ User stories will be auto-classified by content
```

**Config Created**:
```json
{
  "sync": {
    "activeProfile": "jira-multi",
    "profiles": {
      "jira-multi": {
        "provider": "jira",
        "config": {
          "domain": "company.atlassian.net",
          "projects": ["FE", "BE", "MOBILE"]  // ✅ Simple list!
        },
        "settings": {
          "intelligentMapping": true,  // ✅ Auto-classify user stories
          "autoCreateFolders": true    // ✅ Auto-create project folders
        }
      }
    }
  }
}
```

### Option 3: GitHub Master + Nested Repos

```bash
$ specweave init my-platform

? Configure external sync? (Y/n) Y
? Which provider? GitHub
? GitHub organization: company
? Do you have a master tracking repo? (Y/n) Y
? Master repo (for high-level epics): company/master-project
? Nested repos (comma-separated): frontend-web, backend-api, mobile-app

✅ Master+nested mode enabled
✅ High-level epics → company/master-project
✅ Detailed tasks → frontend-web, backend-api, mobile-app
✅ Cross-linking enabled
```

**Config Created**:
```json
{
  "sync": {
    "activeProfile": "github-master-nested",
    "profiles": {
      "github-master-nested": {
        "provider": "github",
        "config": {
          "owner": "company",
          "masterRepo": "master-project",  // ✅ High-level
          "repos": ["frontend-web", "backend-api", "mobile-app"]  // ✅ Detailed
        },
        "settings": {
          "masterRepoLevel": "epic",
          "nestedRepoLevel": "story-task",
          "crossLinking": true  // ✅ Epic → Issue links
        }
      }
    }
  }
}
```

### Option 4: Custom Query (Advanced)

```bash
$ specweave init my-advanced-setup

? Configure external sync? (Y/n) Y
? Which provider? JIRA
? JIRA domain: company.atlassian.net
? Use intelligent mapping or custom JQL? Custom JQL
? JIRA JQL query: project IN (PROJ-A, PROJ-B) AND labels IN (sprint-42)

✅ Custom query mode enabled
⚠️  Intelligent mapping disabled (manual organization)
```

**Config Created**:
```json
{
  "sync": {
    "activeProfile": "jira-custom",
    "profiles": {
      "jira-custom": {
        "provider": "jira",
        "config": {
          "domain": "company.atlassian.net",
          "customQuery": "project IN (PROJ-A, PROJ-B) AND labels IN (sprint-42)"
        },
        "settings": {
          "intelligentMapping": false  // ✅ Manual control
        }
      }
    }
  }
}
```

---

## 🚀 Migration from Old Config

**Backward Compatibility**: Old configs continue to work with deprecation warnings

**Old Config** (component-based, deprecated):
```json
{
  "jira": {
    "strategy": "component-based",
    "projectKey": "SHARED",
    "components": ["Frontend", "Backend", "Mobile"]
  }
}
```

**Migration** (auto-detect and suggest):
```
⚠️  DEPRECATED: component-based strategy is no longer supported

Suggested migration:
  Option 1: Use intelligent multi-project mapping
    → Create separate JIRA projects: FE, BE, MOBILE
    → Auto-classify user stories by content
    → Cleaner separation, better team autonomy

  Option 2: Use custom JQL query
    → component IN ("Frontend", "Backend", "Mobile")
    → Keep shared project, manual organization

Run: specweave migrate-sync-config
```

---

## ✅ Summary

**Removed** (too complex):
- ❌ `filtered` strategy (containers, sub-organizations, filters)
- ❌ `component-based` strategy (deprecated)
- ❌ `board-based` strategy (deprecated)
- ❌ Complex init questions (7-10 questions)

**Kept** (essential):
- ✅ **simple**: One project/repo (backward compatible)
- ✅ **intelligent**: Multi-project with auto-classification (NEW, default)
- ✅ **custom**: Raw queries for power users (advanced)

**Added** (new capabilities):
- ✅ Intelligent project mapper (keyword/tech-stack/component analysis)
- ✅ GitHub master+nested pattern (epic-level + detailed tasks)
- ✅ Auto-folder creation (specs/FE/, specs/BE/, etc.)
- ✅ Auto-classification (user stories → correct project)
- ✅ Simplified init (3-5 questions instead of 7-10)

**Result**: Same power, 50% less complexity, better UX!

---

**Next Steps**: Implement Phase 2-5 (refactor code, implement multi-project sync, update hooks)
