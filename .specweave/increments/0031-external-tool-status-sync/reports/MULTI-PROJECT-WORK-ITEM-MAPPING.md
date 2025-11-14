# Multi-Project Work Item Mapping - Complete Analysis

**Date**: 2025-11-13
**Purpose**: Ensure 100% alignment between SpecWeave and external tools across ALL work item types
**Scope**: GitHub, Jira, Azure DevOps - Complete hierarchies

---

## 🎯 The Challenge

Different tools organize work differently:
- **Jira**: Spaces → Projects → Components → Epics → Stories → Sub-tasks
- **Azure DevOps**: Organizations → Projects → Teams → Area Paths → Features → User Stories → Tasks
- **GitHub**: Organizations → Repositories → Projects → Milestones → Issues

**SpecWeave must map intelligently to ALL of these!**

---

## 📊 Complete Hierarchy Mapping

### SpecWeave Internal Structure

```
.specweave/
├── docs/internal/
│   ├── specs/                    # Living documentation
│   │   ├── {project-id}/        # Project folder (backend, frontend, mobile)
│   │   │   ├── README.md        # Project overview
│   │   │   └── FS-*/            # Epic/Feature folders
│   │   │       ├── README.md    # Epic overview
│   │   │       └── us-*.md      # User stories
│   │   └── _parent/             # Parent repository (multi-repo)
│   └── architecture/            # Cross-project architecture
└── increments/
    └── ####-feature-name/       # Temporary increment
        ├── spec.md              # Feature spec (3-5 user stories)
        ├── plan.md              # Implementation plan
        └── tasks.md             # Task list
```

**Key Insight**: SpecWeave has TWO layers:
1. **Living Docs** (permanent) - `docs/internal/specs/`
2. **Increments** (temporary) - `increments/####/`

---

## 🔷 Jira Mapping (Complete Hierarchy)

### Jira Structure

```
Jira Space (e.g., "Engineering")
├── Project (e.g., "BACKEND")
│   ├── Components (e.g., "Authentication", "Payments")
│   ├── Epics
│   │   └── Stories
│   │       └── Sub-tasks
│   └── Boards
│       ├── Kanban Board
│       └── Scrum Board
└── Project (e.g., "FRONTEND")
    └── Components (e.g., "Dashboard", "Settings")
```

### SpecWeave → Jira Mapping

| SpecWeave | Jira | Example |
|-----------|------|---------|
| **Project** (`backend/`) | **Jira Project** | `BACKEND` (project key) |
| **Epic Folder** (`FS-031/`) | **Epic** | `BACKEND-123` |
| **User Story** (`us-001-*.md`) | **Story** | `BACKEND-456` |
| **Task** (`T-001` in tasks.md) | **Sub-task** | `BACKEND-457` |
| **Increment** (`0031-*`) | **Sprint** (optional) | Sprint 15 |

**Important Nuances**:
- **Components**: SpecWeave doesn't map directly, but could use project folders as components
- **Boards**: Each Jira project can have multiple boards (Kanban, Scrum)
- **Issue Types**: Jira has Story, Task, Bug, Epic - SpecWeave auto-detects via label detector

---

### Scenario 1: Single Jira Project (Simple)

**Setup**:
- Company: Acme Corp
- Jira Domain: `acme.atlassian.net`
- Jira Project: `BACKEND` (single project)

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "jira",
    "includeStatus": true,
    "includeTaskCheckboxes": true,
    "autoApplyLabels": true,
    "activeProfile": "jira-default",
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "config": {
          "domain": "acme",
          "projectKey": "BACKEND"     // Single project
        }
      }
    }
  }
}
```

**Mapping Example**:
```
SpecWeave:
.specweave/increments/0031-external-tool-status-sync/
├── spec.md (5 user stories)
├── tasks.md (24 tasks)

Jira:
BACKEND-123 (Epic) ← increment 0031
├── BACKEND-124 (Story) ← US-001
├── BACKEND-125 (Story) ← US-002
├── BACKEND-126 (Story) ← US-003
├── BACKEND-127 (Story) ← US-004
└── BACKEND-128 (Story) ← US-005
    ├── BACKEND-129 (Sub-task) ← T-001
    ├── BACKEND-130 (Sub-task) ← T-002
    └── ... (22 more sub-tasks)
```

---

### Scenario 2: Multi-Project Jira (Project-Per-Team)

**Setup**:
- Frontend Team → Jira Project `FE`
- Backend Team → Jira Project `BE`
- Mobile Team → Jira Project `MOBILE`

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "jira",
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "config": {
          "domain": "acme",
          "projects": ["FE", "BE", "MOBILE"],  // Multi-project!
          "strategy": "project-per-team"
        }
      }
    }
  }
}
```

**SpecWeave Structure**:
```
.specweave/docs/internal/specs/
├── frontend/              # Project: FE
│   └── FS-031-dashboard/
│       ├── README.md
│       └── us-001-*.md
├── backend/               # Project: BE
│   └── FS-031-api/
│       ├── README.md
│       └── us-001-*.md
└── mobile/                # Project: MOBILE
    └── FS-031-app/
        ├── README.md
        └── us-001-*.md
```

**Jira Mapping**:
```
FE-100 (Epic) ← FS-031-dashboard
├── FE-101 (Story) ← frontend/us-001
└── FE-102 (Story) ← frontend/us-002

BE-200 (Epic) ← FS-031-api
├── BE-201 (Story) ← backend/us-001
└── BE-202 (Story) ← backend/us-002

MOBILE-300 (Epic) ← FS-031-app
├── MOBILE-301 (Story) ← mobile/us-001
└── MOBILE-302 (Story) ← mobile/us-002
```

**How It Works**:
1. SpecWeave detects project from folder: `backend/` → Jira project `BE`
2. Creates epic in correct Jira project
3. Creates stories under that epic
4. Tasks → sub-tasks

---

### Scenario 3: Jira Components Strategy

**Setup**:
- Single Jira project: `PLATFORM`
- Components: `auth`, `payments`, `notifications`

**SpecWeave Config**:
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "config": {
          "domain": "acme",
          "projectKey": "PLATFORM",
          "componentMapping": {
            "auth": "Authentication",
            "payments": "Payments",
            "notifications": "Notifications"
          }
        }
      }
    }
  }
}
```

**Jira Mapping**:
```
PLATFORM-100 (Epic: Authentication component)
├── PLATFORM-101 (Story: Login flow) → Component: Authentication
└── PLATFORM-102 (Story: OAuth) → Component: Authentication

PLATFORM-200 (Epic: Payments component)
├── PLATFORM-201 (Story: Stripe) → Component: Payments
└── PLATFORM-202 (Story: Webhooks) → Component: Payments
```

---

## 🔷 Azure DevOps Mapping (Complete Hierarchy)

### ADO Structure

```
Organization (e.g., "acme-corp")
├── Project (e.g., "Platform")
│   ├── Teams
│   │   ├── Frontend Team
│   │   └── Backend Team
│   ├── Area Paths
│   │   ├── Platform\Frontend
│   │   └── Platform\Backend
│   ├── Work Items
│   │   ├── Epics
│   │   ├── Features
│   │   ├── User Stories
│   │   └── Tasks
│   └── Iterations (Sprints)
└── Project (e.g., "Mobile")
    └── Teams
        └── Mobile Team
```

### SpecWeave → ADO Mapping

| SpecWeave | Azure DevOps | Example |
|-----------|--------------|---------|
| **Project** (`backend/`) | **Area Path** | `Platform\Backend` |
| **Epic Folder** (`FS-031/`) | **Epic** or **Feature** | Epic #123 |
| **User Story** (`us-001-*.md`) | **User Story** | User Story #456 |
| **Task** (`T-001` in tasks.md) | **Task** | Task #457 |
| **Increment** (`0031-*`) | **Iteration** (Sprint) | Sprint 15 |

**Important Nuances**:
- **Teams**: ADO has explicit teams (Frontend Team, Backend Team)
- **Area Paths**: Hierarchical (`Platform\Backend\Auth`)
- **Iterations**: ADO uses iterations/sprints for time-based organization
- **Work Item Types**: Epic → Feature → User Story → Task (4-level hierarchy)

---

### Scenario 1: Single ADO Project (Simple)

**Setup**:
- Organization: `acme-corp`
- Project: `Platform`
- No teams/area paths

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "ado",
    "profiles": {
      "ado-default": {
        "provider": "ado",
        "config": {
          "organization": "acme-corp",
          "project": "Platform"       // Single project
        }
      }
    }
  }
}
```

**Mapping Example**:
```
SpecWeave:
.specweave/increments/0031-external-tool-status-sync/

Azure DevOps:
Epic #100: External Tool Status Synchronization
├── Feature #101: Rich External Issue Content
│   ├── User Story #102: Task-Level Mapping
│   │   ├── Task #103: T-001 - Create Enhanced Content Builder
│   │   └── Task #104: T-002 - Create Spec-to-Increment Mapper
│   └── User Story #105: Label Detection
└── Feature #106: Bidirectional Sync
```

---

### Scenario 2: Multi-Project ADO (Project-Per-Team)

**Setup**:
- Organization: `acme-corp`
- Projects: `Frontend`, `Backend`, `Mobile`

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "ado",
    "profiles": {
      "ado-multi": {
        "provider": "ado",
        "config": {
          "organization": "acme-corp",
          "projects": ["Frontend", "Backend", "Mobile"],  // Multi-project!
          "strategy": "project-per-team"
        }
      }
    }
  }
}
```

**Mapping**:
```
SpecWeave:
.specweave/docs/internal/specs/
├── frontend/FS-031-dashboard/
├── backend/FS-031-api/
└── mobile/FS-031-app/

Azure DevOps:
Frontend Project:
├── Epic #10: Dashboard UI
│   └── User Story #11: Frontend us-001

Backend Project:
├── Epic #20: REST API
│   └── User Story #21: Backend us-001

Mobile Project:
├── Epic #30: Mobile App
│   └── User Story #31: Mobile us-001
```

---

### Scenario 3: ADO Area Paths Strategy

**Setup**:
- Single project: `Platform`
- Area Paths: `Platform\Frontend`, `Platform\Backend`, `Platform\Mobile`

**SpecWeave Config**:
```json
{
  "sync": {
    "profiles": {
      "ado-default": {
        "provider": "ado",
        "config": {
          "organization": "acme-corp",
          "project": "Platform",
          "areaPaths": [
            "Platform\\Frontend",
            "Platform\\Backend",
            "Platform\\Mobile"
          ],
          "strategy": "area-path-based"
        }
      }
    }
  }
}
```

**Mapping**:
```
Platform Project:
├── Area Path: Platform\Frontend
│   └── Epic #100 (Area: Frontend)
├── Area Path: Platform\Backend
│   └── Epic #200 (Area: Backend)
└── Area Path: Platform\Mobile
    └── Epic #300 (Area: Mobile)
```

---

### Scenario 4: ADO Teams Strategy

**Setup**:
- Single project: `Platform`
- Teams: `Frontend Team`, `Backend Team`, `Mobile Team`

**SpecWeave Config**:
```json
{
  "sync": {
    "profiles": {
      "ado-default": {
        "provider": "ado",
        "config": {
          "organization": "acme-corp",
          "project": "Platform",
          "teams": [
            "Frontend Team",
            "Backend Team",
            "Mobile Team"
          ],
          "strategy": "team-based"
        }
      }
    }
  }
}
```

**Mapping**:
```
Platform Project:
├── Frontend Team (owns):
│   └── Epic #100
├── Backend Team (owns):
│   └── Epic #200
└── Mobile Team (owns):
    └── Epic #300
```

---

## 🐙 GitHub Mapping (Complete Hierarchy)

### GitHub Structure

```
Organization (e.g., "acme-corp")
├── Repository (e.g., "frontend")
│   ├── Projects (Beta) - Kanban boards
│   ├── Milestones
│   └── Issues
│       └── Issue #1
│           ├── Task checkboxes (in description)
│           └── Labels
└── Repository (e.g., "backend")
    └── Issues
```

### SpecWeave → GitHub Mapping

| SpecWeave | GitHub | Example |
|-----------|--------|---------|
| **Project** (`backend/`) | **Repository** | `acme-corp/backend` |
| **Epic Folder** (`FS-031/`) | **Milestone** (optional) | Milestone: "External Sync" |
| **Increment** (`0031-*`) | **Issue** | Issue #45 |
| **User Story** (`us-001-*.md`) | **Section in issue description** | Collapsible `<details>` |
| **Task** (`T-001` in tasks.md) | **Checkbox in issue** | `- [ ] **T-001**: Task` |

**Important Nuances**:
- **No native hierarchy**: GitHub is flat (just issues)
- **Projects (Beta)**: GitHub has project boards but they're not hierarchical
- **Milestones**: Optional grouping mechanism
- **Labels**: Primary organization method ([Bug], [Feature], spec, increment)

---

### Scenario 1: Single GitHub Repository (Simple)

**Setup**:
- Repository: `acme-corp/platform`

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "github",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "platform"          // Single repo
        }
      }
    }
  }
}
```

**Mapping Example**:
```
SpecWeave:
.specweave/increments/0031-external-tool-status-sync/
├── spec.md (5 user stories)
└── tasks.md (24 tasks)

GitHub:
Issue #45: [INC-0031] External Tool Status Synchronization
├── Labels: increment, spec, enhancement
├── Milestone: (optional)
└── Description:
    ## Summary
    ...

    ## User Stories
    <details>
      <summary>US-001: Rich External Issue Content</summary>
      - [x] AC-US1-01: ...
      - [ ] AC-US1-02: ...
    </details>

    ## Tasks
    **Progress**: 12/24 (50%)
    `████████░░░░` 50%

    - [x] **T-001**: Create Enhanced Content Builder ✅
    - [ ] **T-002**: Create Spec-to-Increment Mapper
    - [ ] **T-003**: Enhance GitHub Content Sync
    ... (21 more tasks)
```

---

### Scenario 2: Multi-Repository GitHub (Monorepo Alternative)

**Setup**:
- Repositories: `frontend`, `backend`, `mobile`
- Each repo has its own issues

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "github",
    "profiles": {
      "frontend-repo": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "frontend"
        }
      },
      "backend-repo": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "backend"
        }
      },
      "mobile-repo": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "mobile"
        }
      }
    }
  }
}
```

**SpecWeave Structure**:
```
.specweave/docs/internal/specs/
├── frontend/FS-031-dashboard/
│   └── (increment creates issue in frontend repo)
├── backend/FS-031-api/
│   └── (increment creates issue in backend repo)
└── mobile/FS-031-app/
    └── (increment creates issue in mobile repo)
```

**GitHub Mapping**:
```
acme-corp/frontend:
├── Issue #10: [FS-031] Dashboard UI
│   └── Labels: spec, enhancement

acme-corp/backend:
├── Issue #20: [FS-031] REST API
│   └── Labels: spec, enhancement

acme-corp/mobile:
├── Issue #30: [FS-031] Mobile App
│   └── Labels: spec, enhancement
```

---

### Scenario 3: Monorepo with Projects

**Setup**:
- Single repository: `acme-corp/platform` (monorepo)
- Multiple projects inside: `apps/frontend/`, `apps/backend/`, `apps/mobile/`

**SpecWeave Config**:
```json
{
  "sync": {
    "provider": "github",
    "profiles": {
      "github-monorepo": {
        "provider": "github",
        "config": {
          "owner": "acme-corp",
          "repo": "platform",
          "monorepoProjects": ["frontend", "backend", "mobile"]  // Monorepo!
        }
      }
    }
  }
}
```

**GitHub Mapping**:
```
acme-corp/platform (monorepo):
├── Issue #10: [Frontend][FS-031] Dashboard UI
│   └── Labels: spec, enhancement, frontend
├── Issue #20: [Backend][FS-031] REST API
│   └── Labels: spec, enhancement, backend
└── Issue #30: [Mobile][FS-031] Mobile App
    └── Labels: spec, enhancement, mobile
```

**Key Difference**: Uses labels to differentiate (not separate repos)

---

## 🔄 Cross-Tool Comparison

### Hierarchy Depth

| Level | Jira | Azure DevOps | GitHub |
|-------|------|--------------|--------|
| **Level 1** | Space | Organization | Organization |
| **Level 2** | Project | Project | Repository |
| **Level 3** | Epic | Area Path / Team | Milestone (optional) |
| **Level 4** | Story | Epic / Feature | Issue |
| **Level 5** | Sub-task | User Story | Checkbox in issue |
| **Level 6** | - | Task | - |

**Observation**: ADO has the deepest hierarchy (6 levels), GitHub the flattest (3 levels)

---

### Project Strategies Comparison

| Strategy | Jira | Azure DevOps | GitHub |
|----------|------|--------------|--------|
| **Single Project** | ✅ projectKey: "BACKEND" | ✅ project: "Platform" | ✅ repo: "platform" |
| **Multi-Project** | ✅ projects: ["FE", "BE"] | ✅ projects: ["Frontend", "Backend"] | ✅ Multiple profiles |
| **Component-Based** | ✅ Components | ✅ Area Paths | ❌ Use labels |
| **Team-Based** | ✅ Board per team | ✅ Teams | ❌ Use labels |
| **Monorepo** | ❌ Use components | ❌ Use area paths | ✅ monorepoProjects |

---

## 📋 SpecWeave Smart Detection Algorithm

**How SpecWeave decides where to sync**:

1. **Read increment frontmatter**:
   ```yaml
   ---
   project: backend      # Explicit project (100% confidence)
   epic: FS-031         # Explicit epic (100% confidence)
   ---
   ```

2. **Detect from increment ID**:
   - `0031-backend-api` → Project: `backend` (90% confidence)
   - `0031-feature-dashboard` → Project: `frontend` (70% confidence via keywords)

3. **Analyze spec content**:
   - Keywords: "React", "Next.js" → Project: `frontend` (60% confidence)
   - Keywords: "PostgreSQL", "API" → Project: `backend` (60% confidence)

4. **Check tech stack in config**:
   ```json
   {
     "multiProject": {
       "projects": {
         "backend": {
           "techStack": ["Node.js", "PostgreSQL"]
         }
       }
     }
   }
   ```

5. **Fallback to default project**: `default` (50% confidence)

---

## 🎯 Recommended Configurations

### Small Team (1-5 people)

**Recommendation**: Single project, simple sync

**GitHub**:
```json
{
  "sync": {
    "provider": "github",
    "profiles": {
      "main": {
        "config": {
          "owner": "acme-corp",
          "repo": "platform"
        }
      }
    }
  }
}
```

**Jira**:
```json
{
  "sync": {
    "provider": "jira",
    "profiles": {
      "main": {
        "config": {
          "domain": "acme",
          "projectKey": "PLATFORM"
        }
      }
    }
  }
}
```

---

### Medium Team (5-20 people, 2-3 sub-teams)

**Recommendation**: Multi-project with component/area path strategy

**GitHub (Multi-Repo)**:
```json
{
  "sync": {
    "profiles": {
      "frontend": {
        "config": {
          "owner": "acme-corp",
          "repo": "frontend"
        }
      },
      "backend": {
        "config": {
          "owner": "acme-corp",
          "repo": "backend"
        }
      }
    }
  }
}
```

**Jira (Components)**:
```json
{
  "sync": {
    "profiles": {
      "main": {
        "config": {
          "domain": "acme",
          "projectKey": "PLATFORM",
          "componentMapping": {
            "frontend": "Frontend",
            "backend": "Backend"
          }
        }
      }
    }
  }
}
```

**ADO (Area Paths)**:
```json
{
  "sync": {
    "profiles": {
      "main": {
        "config": {
          "organization": "acme-corp",
          "project": "Platform",
          "areaPaths": [
            "Platform\\Frontend",
            "Platform\\Backend"
          ]
        }
      }
    }
  }
}
```

---

### Large Team (20+ people, 5+ sub-teams)

**Recommendation**: Multi-project, project-per-team strategy

**GitHub (Parent Repo + Child Repos)**:
```json
{
  "sync": {
    "profiles": {
      "parent": {
        "config": {
          "owner": "acme-corp",
          "repo": "platform-parent"  // Coordination repo
        }
      },
      "frontend": {
        "config": {
          "owner": "acme-corp",
          "repo": "frontend"
        }
      },
      "backend": {
        "config": {
          "owner": "acme-corp",
          "repo": "backend"
        }
      },
      "mobile": {
        "config": {
          "owner": "acme-corp",
          "repo": "mobile"
        }
      }
    }
  }
}
```

**Jira (Multi-Project)**:
```json
{
  "sync": {
    "profiles": {
      "main": {
        "config": {
          "domain": "acme",
          "projects": ["FE", "BE", "MOBILE"],
          "strategy": "project-per-team"
        }
      }
    }
  }
}
```

**ADO (Multi-Project)**:
```json
{
  "sync": {
    "profiles": {
      "main": {
        "config": {
          "organization": "acme-corp",
          "projects": ["Frontend", "Backend", "Mobile"],
          "strategy": "project-per-team"
        }
      }
    }
  }
}
```

---

## 🔍 Edge Cases & Solutions

### Edge Case 1: Cross-Project Dependencies

**Scenario**: Backend increment depends on Frontend increment

**SpecWeave Solution**:
```yaml
---
project: backend
dependencies:
  - frontend/FS-030-dashboard
---
```

**Jira Mapping**:
```
BE-100 (Epic: Backend API)
└── Links to: FE-50 (Epic: Frontend Dashboard)
    Link Type: "depends on"
```

**GitHub Mapping**:
```
Issue #20 (Backend API)
└── "Depends on #10" in description
```

---

### Edge Case 2: Shared Components

**Scenario**: Authentication library used by both frontend and backend

**SpecWeave Solution**:
```
.specweave/docs/internal/specs/
└── shared/FS-031-auth-library/
    └── us-001-oauth.md
```

**Config**:
```json
{
  "sync": {
    "profiles": {
      "shared-components": {
        "config": {
          "repo": "shared-libraries"
        }
      }
    }
  }
}
```

---

### Edge Case 3: Multi-Tenant SaaS

**Scenario**: Different customers with customizations

**SpecWeave Solution**:
```
.specweave/docs/internal/specs/
├── core/FS-031-payment-core/      # Shared core
├── customer-a/FS-031-custom-a/    # Customer A customizations
└── customer-b/FS-031-custom-b/    # Customer B customizations
```

**Jira Mapping**:
```
Projects:
├── CORE (shared)
├── CUSTOMER-A
└── CUSTOMER-B
```

---

## ✅ Implementation Checklist

### For GitHub Sync

- [x] Single repository support
- [x] Multi-repository support
- [x] Monorepo support
- [x] Issue creation with checkboxes
- [x] Label auto-detection
- [x] Status sync
- [ ] Milestone assignment (deferred)
- [ ] GitHub Projects integration (deferred)

### For Jira Sync

- [x] Single project support
- [x] Multi-project support
- [ ] Component mapping (deferred)
- [ ] Board assignment (deferred)
- [ ] Epic creation (placeholder exists)
- [ ] Story creation (placeholder exists)
- [ ] Sub-task creation (placeholder exists)
- [ ] Jira-specific checkboxes `(x)` (placeholder exists)

### For ADO Sync

- [x] Single project support
- [x] Multi-project support
- [ ] Area path mapping (deferred)
- [ ] Team assignment (deferred)
- [ ] Epic → Feature → User Story → Task hierarchy (deferred)
- [ ] Iteration assignment (deferred)

---

## 🎯 Conclusion

**SpecWeave is designed to be tool-agnostic** while respecting each tool's unique structure:

1. **GitHub**: Flat structure → SpecWeave flattens increments into issues with checkboxes
2. **Jira**: Deep hierarchy → SpecWeave maps to Epic → Story → Sub-task
3. **Azure DevOps**: Complex hierarchy → SpecWeave maps to Epic → Feature → User Story → Task

**Key Success Factors**:
- ✅ Smart project detection (frontmatter → ID → keywords → config)
- ✅ Flexible mapping (supports all common strategies)
- ✅ Provider-specific formatting (GitHub checkboxes vs Jira `(x)`)
- ✅ Extensible architecture (easy to add new providers)

**Current Status**:
- ✅ GitHub: 100% functional (Phase 1 + 2 complete)
- ⏸️ Jira: 40% functional (placeholder exists, needs implementation)
- ⏸️ ADO: 40% functional (placeholder exists, needs implementation)
