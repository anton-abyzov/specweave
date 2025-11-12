# Multi-Project GitHub Sync Architecture

**Version**: v0.18.0+
**Date**: 2025-11-11
**Status**: Implemented and Tested

---

## Executive Summary

SpecWeave's GitHub sync has been enhanced to support enterprise-scale multi-project/multi-team architectures. The system now automatically detects which project a spec belongs to and routes it to the correct GitHub repository based on configuration.

**Key Capabilities**:
- ✅ Detects project from spec file path (`.specweave/docs/internal/specs/{project-id}/`)
- ✅ Routes to correct GitHub repo based on project config
- ✅ Supports 4 sync strategies (project-per-spec, team-board, centralized, distributed)
- ✅ Handles cross-team specs (auth touches frontend + backend)
- ✅ Backward compatible with single-project setups

---

## Real-World Scenarios Supported

### 1. **Monorepo with Multiple Teams**
```
my-company/monorepo/
├── frontend/  (React web app)
├── backend/   (Node.js API)
├── ml/        (TensorFlow models)
└── infrastructure/  (K8s configs)
```

**Solution**: Each team has their own GitHub Project board. Specs in `.specweave/docs/internal/specs/frontend/` sync to `myorg/frontend-app`, specs in `.specweave/docs/internal/specs/backend/` sync to `myorg/backend-api`, etc.

**Strategy**: `distributed` (each team syncs to their repo)

### 2. **Multi-Repo with Parent Repo**
```
parent/  (docs only, no code)
├── .specweave/docs/internal/specs/_parent/

Child repos:
- github.com/myorg/frontend
- github.com/myorg/backend
- github.com/myorg/mobile
```

**Solution**: Specs in `_parent/` create issues in child repos OR parent repo tracks all with labels.

**Strategy**: `centralized` (parent repo tracks all) or `distributed` (issues created in child repos)

### 3. **Team-Specific Repos**
```
platform-engineering/  (own .specweave/)
frontend-team/         (own .specweave/)
ml-team/              (own .specweave/)
```

**Solution**: Each team repo has its own `.specweave/` and syncs to its own GitHub Projects.

**Strategy**: `project-per-spec` (default, one GitHub Project per spec)

### 4. **Cross-Team Specs**
```
Auth spec touches:
- Frontend: Login UI
- Backend: JWT validation
- Mobile: Biometric login
```

**Solution**: Auth spec creates issues in all three repos (frontend, backend, mobile), filtered by relevance.

**Strategy**: `distributed` with `enableCrossTeamDetection: true`

---

## Sync Strategies

### Strategy 1: Project-per-Spec (DEFAULT)
- **Use When**: Standard single-project or independent projects
- **Behavior**: One GitHub Project per spec (current behavior, no changes)
- **Example**: `spec-001-user-auth.md` → GitHub Project "User Authentication"

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "myproject": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "myrepo",
          "githubStrategy": "project-per-spec"
        }
      }
    }
  }
}
```

**Result**:
- `.specweave/docs/internal/specs/spec-001.md` → GitHub Project in `myorg/myrepo`
- One spec = One GitHub Project

---

### Strategy 2: Team-Board
- **Use When**: Team wants one board for all their specs
- **Behavior**: All specs from same team/project sync to one shared GitHub Project
- **Example**: `spec-001.md`, `spec-002.md`, `spec-003.md` → All to "Frontend Team Board"

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "frontend": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app",
          "githubStrategy": "team-board",
          "teamBoardId": 12345  // Optional: existing board ID
        }
      }
    }
  }
}
```

**Result**:
- Multiple specs → One GitHub Project (team board)
- Easier to see all team work in one place

---

### Strategy 3: Centralized
- **Use When**: Parent repo tracks all specs (multi-repo pattern)
- **Behavior**: Issues created in parent repo with tags for child repos
- **Example**: All specs → Parent repo issues with labels like `project:frontend`, `project:backend`

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "parent": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "parent-repo",
          "githubStrategy": "centralized"
        }
      }
    },
    "projects": {
      "frontend": {
        "id": "frontend",
        "defaultSyncProfile": "parent"
      },
      "backend": {
        "id": "backend",
        "defaultSyncProfile": "parent"
      }
    }
  }
}
```

**Result**:
- All specs sync to parent repo
- Issues tagged with project/team labels
- Good for high-level tracking

---

### Strategy 4: Distributed
- **Use When**: Each team syncs to their repo (microservices)
- **Behavior**: Each team's specs go to their repo; cross-team specs create issues in multiple repos
- **Example**: Auth spec (cross-team) → Issues in `frontend-app`, `backend-api`, `mobile-app`

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "frontend": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app",
          "githubStrategy": "distributed",
          "enableCrossTeamDetection": true
        }
      },
      "backend": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "backend-api",
          "githubStrategy": "distributed",
          "enableCrossTeamDetection": true
        }
      }
    },
    "projects": {
      "frontend": {
        "id": "frontend",
        "defaultSyncProfile": "frontend"
      },
      "backend": {
        "id": "backend",
        "defaultSyncProfile": "backend"
      }
    }
  }
}
```

**Result**:
- Single-team specs sync to their repo
- Cross-team specs sync to all relevant repos
- User stories filtered by relevance

---

## Cross-Team Spec Detection

**How It Works**:
1. Spec title contains keywords: `integration`, `cross-team`, `shared`, `auth`, `api-contract`
2. Spec has multiple project tags: `["project:frontend", "project:backend"]`
3. User stories reference multiple projects

**Example**:
```markdown
---
title: "User Authentication Integration"
tags: ["project:frontend", "project:backend", "cross-team"]
---

## User Stories

**US-001**: As a frontend developer, I want login UI
**US-002**: As a backend developer, I want JWT validation
**US-003**: As a developer, I want API contract  (shared)
```

**Result**:
- Issue created in `frontend-app` with US-001 + US-003
- Issue created in `backend-api` with US-002 + US-003
- Shared stories (US-003) appear in both repos

---

## Project Detection

**Automatic Detection** from spec file path:

```
.specweave/docs/internal/specs/frontend/spec-001.md  → projectId: "frontend"
.specweave/docs/internal/specs/backend/spec-001.md   → projectId: "backend"
.specweave/docs/internal/specs/spec-001.md           → projectId: "default"
```

**Configuration Lookup**:
```json
{
  "sync": {
    "projects": {
      "frontend": {
        "id": "frontend",
        "name": "Frontend Team",
        "defaultSyncProfile": "frontend-profile",
        "specsFolder": ".specweave/docs/internal/specs/frontend"
      }
    },
    "profiles": {
      "frontend-profile": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app"
        }
      }
    }
  }
}
```

**Result**: Spec automatically routed to correct GitHub repo!

---

## Configuration Examples

### Example 1: Simple Single-Project (Backward Compatible)

```json
{
  "sync": {
    "activeProfile": "main",
    "profiles": {
      "main": {
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

**Result**: All specs sync to `myorg/myrepo` (default behavior, no changes)

---

### Example 2: Multi-Project with Distributed Strategy

```json
{
  "sync": {
    "profiles": {
      "frontend-profile": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app",
          "githubStrategy": "distributed",
          "enableCrossTeamDetection": true
        }
      },
      "backend-profile": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "backend-api",
          "githubStrategy": "distributed",
          "enableCrossTeamDetection": true
        }
      }
    },
    "projects": {
      "frontend": {
        "id": "frontend",
        "name": "Frontend Team",
        "keywords": ["frontend", "react", "ui"],
        "defaultSyncProfile": "frontend-profile",
        "specsFolder": ".specweave/docs/internal/specs/frontend"
      },
      "backend": {
        "id": "backend",
        "name": "Backend Team",
        "keywords": ["backend", "api", "nodejs"],
        "defaultSyncProfile": "backend-profile",
        "specsFolder": ".specweave/docs/internal/specs/backend"
      }
    }
  }
}
```

**Result**:
- Frontend specs → `myorg/frontend-app`
- Backend specs → `myorg/backend-api`
- Cross-team specs → Both repos

---

### Example 3: Team-Board Strategy

```json
{
  "sync": {
    "profiles": {
      "frontend-team": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app",
          "githubStrategy": "team-board"
        }
      }
    },
    "projects": {
      "frontend": {
        "id": "frontend",
        "defaultSyncProfile": "frontend-team"
      }
    }
  }
}
```

**Result**: All frontend specs sync to ONE shared GitHub Project

---

### Example 4: Centralized Strategy (Parent Repo)

```json
{
  "sync": {
    "profiles": {
      "parent": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "parent-repo",
          "githubStrategy": "centralized"
        }
      }
    },
    "projects": {
      "_parent": {
        "id": "_parent",
        "defaultSyncProfile": "parent"
      },
      "frontend": {
        "id": "frontend",
        "defaultSyncProfile": "parent"
      },
      "backend": {
        "id": "backend",
        "defaultSyncProfile": "parent"
      }
    }
  }
}
```

**Result**: All specs sync to parent repo with project tags

---

## Usage

### Basic Usage (Single Project)

```bash
# Create spec
/specweave:increment "User authentication"

# Sync to GitHub (auto-detects project = default)
/specweave-github:sync-spec spec-001
```

### Multi-Project Usage

```bash
# Create spec in frontend project
# (place in .specweave/docs/internal/specs/frontend/)

# Sync to GitHub (auto-detects project = frontend, routes to frontend-app repo)
/specweave-github:sync-spec spec-001

# Cross-team spec (auto-syncs to multiple repos)
/specweave-github:sync-spec spec-auth
# → Creates issues in frontend-app AND backend-api
```

---

## Metadata Schema (v0.18.0+)

**Enhanced GitHubLink with multi-project support**:

```typescript
export interface GitHubLink {
  projectId?: number;
  projectUrl?: string;
  syncedAt?: string;
  owner?: string;
  repo?: string;

  // NEW in v0.18.0
  syncStrategy?: 'project-per-spec' | 'team-board' | 'centralized' | 'distributed';
  specProjectId?: string;  // Maps to .specweave/docs/internal/specs/{projectId}/
  crossTeamRepos?: Array<{
    owner: string;
    repo: string;
    projectUrl?: string;
    relevantUserStories?: string[];  // US-IDs synced to this repo
  }>;
  teamBoardId?: number;
  syncProfileId?: string;
}
```

**Example metadata in spec.md**:

```yaml
---
id: spec-auth
title: "User Authentication Integration"
externalLinks:
  github:
    syncStrategy: distributed
    specProjectId: frontend
    crossTeamRepos:
      - owner: myorg
        repo: frontend-app
        projectUrl: https://github.com/myorg/frontend-app/projects/1
        relevantUserStories: [US-001, US-003]
      - owner: myorg
        repo: backend-api
        projectUrl: https://github.com/myorg/backend-api/projects/1
        relevantUserStories: [US-002, US-003]
---
```

---

## Implementation Details

### File Structure

**Enhanced Files**:
- `plugins/specweave-github/lib/github-spec-sync.ts` (1246 lines) - Multi-project routing logic
- `src/core/types/sync-profile.ts` (546 lines) - GitHubSyncStrategy type
- `src/core/types/spec-metadata.ts` (301 lines) - Enhanced GitHubLink interface

**New Methods**:
- `detectProjectFromSpecPath()` - Detects project from file path
- `getGitHubConfigForProject()` - Gets GitHub config for project
- `syncWithStrategy()` - Routes to strategy-specific sync
- `syncProjectPerSpec()` - Strategy 1 implementation
- `syncTeamBoard()` - Strategy 2 implementation
- `syncCentralized()` - Strategy 3 implementation
- `syncDistributed()` - Strategy 4 implementation
- `isCrossTeamSpec()` - Detects cross-team specs
- `syncCrossTeamSpec()` - Syncs to multiple repos
- `detectRelatedProfiles()` - Finds all related profiles
- `filterRelevantUserStories()` - Filters stories by project

---

## Testing

**E2E Test Suite** (`tests/e2e/github-sync-multi-project.spec.ts`):
- ✅ Single-project sync (backward compatible)
- ✅ Multi-project sync (frontend, backend, ml)
- ✅ Parent repo pattern (_parent project)
- ✅ Cross-team specs (auth touches frontend + backend)
- ✅ Team-board strategy (aggregate multiple specs)
- ✅ Centralized strategy (parent repo tracks all)
- ✅ Distributed strategy (each team syncs to their repo)

**Run Tests**:
```bash
npm run test:e2e -- github-sync-multi-project
```

---

## Migration from Single-Project

**Existing single-project setups continue to work without changes!**

**No Action Required** if you have:
```json
{
  "sync": {
    "activeProfile": "main",
    "profiles": {
      "main": {
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

**To Enable Multi-Project**:
1. Create project contexts in config
2. Set `defaultSyncProfile` for each project
3. Choose sync strategy per profile
4. Organize specs into project folders

**Example Migration**:
```bash
# Before: All specs in .specweave/docs/internal/specs/
spec-001.md
spec-002.md
spec-003.md

# After: Specs organized by project
.specweave/docs/internal/specs/frontend/spec-001.md
.specweave/docs/internal/specs/backend/spec-002.md
.specweave/docs/internal/specs/ml/spec-003.md
```

---

## Troubleshooting

### Issue: Spec syncs to wrong repo

**Cause**: Project detection failed or config incorrect

**Solution**:
1. Check spec file path: `.specweave/docs/internal/specs/{projectId}/`
2. Verify project exists in config: `config.sync.projects[projectId]`
3. Verify profile config: `config.sync.profiles[profileId]`

### Issue: Cross-team spec not detected

**Cause**: Missing tags or keywords

**Solution**:
1. Add project tags: `tags: ["project:frontend", "project:backend"]`
2. Or use cross-team keywords in title: "integration", "cross-team", "auth"

### Issue: Team board not created

**Cause**: Missing `githubStrategy: "team-board"`

**Solution**: Set strategy in profile config:
```json
{
  "config": {
    "githubStrategy": "team-board"
  }
}
```

---

## Future Enhancements

**Planned for v0.19.0+**:
- [ ] Auto-create projects from git submodules
- [ ] Visual project/repo mapping dashboard
- [ ] GitHub Actions integration per project
- [ ] Cross-repo PR linking
- [ ] Team velocity metrics per project

---

## References

- **Implementation**: `plugins/specweave-github/lib/github-spec-sync.ts`
- **Types**: `src/core/types/sync-profile.ts`, `src/core/types/spec-metadata.ts`
- **Tests**: `tests/e2e/github-sync-multi-project.spec.ts`
- **Project Management**: `src/core/sync/project-context.ts`
- **Original Architecture Fix**: `plugins/specweave-github/SYNC-ARCHITECTURE-FIX-SUMMARY.md`

---

**Version**: v0.18.0
**Last Updated**: 2025-11-11
**Status**: Complete and Tested
