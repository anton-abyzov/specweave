---
increment: 0020
title: "Enhanced Multi-Repository GitHub Support"
type: feature
status: completed
priority: P1
estimated_hours: 16
actual_hours: 0
created: 2025-01-13
completed: 2025-11-12
closed: 2025-11-12
tags: [github, multi-repo, integration, init, ux]
notes: "Force closed 2025-11-12. 0/20 tasks completed. Increment abandoned - requirements likely changed."
---

# Increment 0020: Enhanced Multi-Repository GitHub Support

## Quick Overview

Enhance SpecWeave's GitHub integration to properly support multiple repository scenarios during initialization. Fix duplicate plugin installation issue and provide intuitive UX for various project configurations.

## Problem Statement

### Current Issues
1. **Duplicate Plugin Installation**: Plugin installation is attempted twice - once during marketplace refresh and again during issue tracker setup
2. **Poor Multi-Repo UX**: Current strategies are confusing and don't handle common scenarios well
3. **No "No Repository" Option**: Can't defer repository setup for greenfield projects
4. **Complex Strategy Names**: "repository-per-team", "team-based", etc. are not intuitive
5. **Missing Brownfield Detection**: Doesn't detect multiple git remotes automatically

### User Scenarios to Support
1. **Greenfield (No Repo Yet)**: User hasn't created a repository yet
2. **Single Repository**: Standard single-repo project
3. **Multiple Repositories**: Microservices, polyrepo architecture
4. **Monorepo with Teams**: Single repo, multiple teams/projects
5. **Brownfield Multi-Repo**: Existing project with multiple git remotes

## Solution Design

### 1. Fix Duplicate Plugin Installation
- Check if plugin is already installed before attempting installation
- Skip installation in `installPlugin()` if already present

### 2. Improved Repository Configuration Flow
```
Which GitHub setup best describes your project?
  ◯ No repository yet (will configure later)
  ◯ Single repository
  ◯ Multiple repositories (microservices/polyrepo)
  ◯ Monorepo (single repo, multiple projects)
  ◯ Auto-detect from git remotes
```

### 3. Per-Scenario Configuration

#### No Repository Yet
- Skip repository configuration
- Store credentials only
- Allow later configuration via `/specweave-github:setup`

#### Single Repository
```
GitHub owner/organization: [auto-detect or prompt]
Repository name: [auto-detect or prompt]
```

#### Multiple Repositories
```
How many repositories? [2-10]

Repository 1:
  Name/ID: frontend
  Owner: myorg
  Repo: frontend-app

Repository 2:
  Name/ID: backend
  Owner: myorg
  Repo: backend-api
```

#### Monorepo
```
Repository: myorg/monorepo
Projects in monorepo: frontend, backend, shared
```

### 4. Profile-Based Architecture
Store multiple repository profiles in config:
```json
{
  "sync": {
    "profiles": {
      "frontend": {
        "provider": "github",
        "config": { "owner": "myorg", "repo": "frontend-app" }
      },
      "backend": {
        "provider": "github",
        "config": { "owner": "myorg", "repo": "backend-api" }
      }
    }
  }
}
```

### 5. Smart Increment-to-Repo Mapping
When creating increment:
- If single repo: Use default
- If multiple repos: Prompt for selection
- If monorepo: Tag with project name
- Store mapping in increment metadata

## Implementation Plan

### Phase 1: Fix Duplicate Installation
1. Modify `installPlugin()` to check for existing installation
2. Add plugin detection utility function

### Phase 2: Improve Setup Flow
1. Redesign GitHub setup prompts
2. Add "no repository" option
3. Implement auto-detection from git remotes

### Phase 3: Multi-Profile Support
1. Create profile management system
2. Update config schema for multiple profiles
3. Implement profile selection during increment creation

### Phase 4: Testing & Documentation
1. Test all scenarios thoroughly
2. Update documentation
3. Create migration guide

## User Stories

### US1: Greenfield Project Setup
**As a** developer starting a new project
**I want to** initialize SpecWeave without a repository
**So that** I can configure GitHub later when ready

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Can select "no repository yet" option
- [ ] **AC-US1-02**: Credentials are saved for later use
- [ ] **AC-US1-03**: Can configure repository later via command

### US2: Multi-Repository Setup
**As a** developer with microservices architecture
**I want to** configure multiple GitHub repositories
**So that** increments can sync to appropriate repos

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Can add multiple repository profiles
- [ ] **AC-US2-02**: Can name/identify each profile
- [ ] **AC-US2-03**: Increment creation prompts for repo selection

### US3: Brownfield Detection
**As a** developer with existing multi-repo project
**I want** SpecWeave to detect my repositories
**So that** setup is automated

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Auto-detects git remotes
- [ ] **AC-US3-02**: Extracts owner/repo from remote URLs
- [ ] **AC-US3-03**: Presents detected repos for confirmation

## Success Criteria

1. **No Duplicate Installations**: Plugin installation happens only once
2. **Intuitive UX**: Clear, simple options for all scenarios
3. **Flexible Configuration**: Support 0, 1, or N repositories
4. **Smart Defaults**: Auto-detection when possible
5. **Backward Compatible**: Existing single-repo configs continue to work

## Out of Scope

- GitHub Enterprise Server support (already exists)
- GitHub Actions integration
- PR creation/management
- Code review workflows

## Dependencies

- Existing GitHub plugin infrastructure
- Profile management system (already exists)
- Git CLI for remote detection

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing configs | High | Ensure backward compatibility |
| Complex UI flow | Medium | User testing and iteration |
| Git remote detection failures | Low | Fallback to manual input |

## Estimated Timeline

- Phase 1 (Fix): 2 hours
- Phase 2 (Setup): 4 hours
- Phase 3 (Profiles): 6 hours
- Phase 4 (Testing): 4 hours
- **Total**: 16 hours

---

## Archive Note (2025-11-15)

**Status**: Completed under early SpecWeave architecture (pre-ADR-0032 Universal Hierarchy / ADR-0016 Multi-Project Sync).

**Unchecked ACs**: Reflect historical scope and tracking discipline. Core functionality verified in subsequent increments:
- Increment 0028: Multi-repo UX improvements
- Increment 0031: External tool status sync
- Increment 0033: Duplicate prevention
- Increment 0034: GitHub AC checkboxes fix

**Recommendation**: Accept as historical tech debt. No business value in retroactive AC validation.

**Rationale**:
- Features exist in codebase and are operational
- Later increments successfully built on this foundation
- No user complaints or functionality gaps reported
- AC tracking discipline was less strict during early development

**Tracking Status**: `historical-ac-incomplete`

**Verified**: 2025-11-15

