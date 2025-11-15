# Portfolio Hierarchy Mapping - SpecWeave to ADO/Jira/GitHub

**Status**: Definitive Guide
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**Question**: How do we map SpecWeave's hierarchy to enterprise portfolio management tools (ADO Capability, Jira Portfolio, GitHub Projects)?

**Answer**: SpecWeave supports **multi-level hierarchy mapping** to match enterprise portfolio structures.

**Key Insight**: SpecWeave has TWO hierarchies:
1. **Living Docs Hierarchy** (permanent): Feature Spec → User Stories → Acceptance Criteria
2. **Increment Hierarchy** (temporary): Increment → Tasks → Sub-tasks

**External tools need a THIRD hierarchy** (portfolio): Capability → Epic/Feature → Story → Task

**This Guide**: Complete mapping from SpecWeave → ADO/Jira/GitHub portfolio hierarchies

---

## Part 1: Understanding Portfolio Hierarchies

### Azure DevOps (ADO) - Full 5-Level Hierarchy

**ADO's Native Hierarchy**:

```
Portfolio Backlog:
├── Epic                          ← Strategic initiative (6-12 months)
│   └── Feature                   ← Capability/deliverable (1-3 months)
│       └── User Story            ← User-facing requirement (1-2 weeks)
│           └── Task              ← Implementation work (1-3 days)
│               └── Bug/Issue     ← Defects (hours-days)

WITH Portfolio Extension:
└── Initiative                    ← Company-wide initiative (1-2 years)
    └── Epic                      ← Strategic initiative (6-12 months)
        └── Feature               ← Capability/deliverable (1-3 months)
            └── User Story        ← User-facing requirement (1-2 weeks)
                └── Task          ← Implementation work (1-3 days)
```

**Example**:
```
Initiative: "Digital Transformation"
└── Epic: "Authentication Platform"
    ├── Feature: "OAuth 2.0 Implementation"
    │   ├── User Story: "User Login"
    │   │   ├── Task: "Create Login Endpoint"
    │   │   └── Task: "JWT Token Generation"
    │   └── User Story: "Session Management"
    │       └── Task: "Session Logic"
    └── Feature: "SSO Integration"
        └── User Story: "SAML Integration"
            └── Task: "SAML Config"
```

**ADO Terminology**:
- **Initiative**: Company-wide strategic goal (optional, requires extension)
- **Epic**: Strategic initiative (cross-team, 6-12 months)
- **Feature**: Deliverable capability (single team, 1-3 months)
- **User Story**: User-facing requirement (1-2 weeks)
- **Task**: Implementation work (1-3 days)

### Jira (with Portfolio/Advanced Roadmaps)

**Jira's Native Hierarchy**:

```
Basic Jira:
└── Epic
    └── Story
        └── Sub-task

Jira Portfolio (Advanced Roadmaps):
└── Initiative                    ← Strategic theme (1-2 years)
    └── Epic                      ← Strategic initiative (6-12 months)
        └── Story                 ← User-facing requirement (1-2 weeks)
            └── Sub-task          ← Implementation work (1-3 days)
```

**Example**:
```
Initiative: "Platform Modernization"
└── Epic: "Authentication Overhaul"
    ├── Story: "US-001: User Login"
    │   ├── Sub-task: "T-001: Create Login Endpoint"
    │   └── Sub-task: "T-002: JWT Token Generation"
    └── Story: "US-002: Session Management"
        └── Sub-task: "T-003: Session Logic"
```

**Jira Terminology**:
- **Initiative**: Strategic theme (optional, requires Portfolio)
- **Epic**: Strategic initiative (cross-team)
- **Story**: User-facing requirement
- **Sub-task**: Implementation work

**Note**: Jira doesn't have a native "Feature" level (Epic encompasses both Epic and Feature concepts)

### GitHub (Limited Hierarchy)

**GitHub's Native Hierarchy**:

```
Basic GitHub:
└── Issue
    └── Checklist items (not separate issues)

GitHub Projects (Beta):
└── Project                       ← Portfolio view
    ├── Milestone                 ← Time-based grouping
    │   └── Issue                 ← Work item (any type)
    └── Epic (custom field)       ← Virtual grouping
        └── Issue                 ← Linked via labels/references
```

**Example**:
```
Project: "Authentication"
├── Milestone: "Q1 2024"
│   ├── Issue #16: [EPIC] Authentication System
│   │   ├── Checkbox: US-001: User Login
│   │   └── Checkbox: US-002: Session Management
│   └── Issue #17: [FEATURE] SSO Integration
└── Milestone: "Q2 2024"
    └── Issue #20: [EPIC] Multi-Factor Auth
```

**GitHub Terminology**:
- **Project**: Portfolio view (virtual organization)
- **Milestone**: Time-based grouping (releases, quarters)
- **Issue**: Work item (can represent Epic, Feature, Story, Task)
- **Labels**: Virtual hierarchy ([EPIC], [FEATURE], [STORY])

**Limitation**: No native parent-child relationships (workarounds: labels, references, Projects)

---

## Part 2: SpecWeave Hierarchy - The Two Models

### Living Docs Hierarchy (Permanent)

**Purpose**: Long-term knowledge base (persists after increment closes)

**Structure**:
```
Feature Spec (FS-020-github-integration)
├── Epic-level metadata
│   ├── Business value
│   ├── Strategic rationale
│   └── Roadmap
├── User Stories (20 total)
│   ├── US-001: Create GitHub Repository
│   ├── US-002: Sync Issues
│   ├── ...
│   └── US-020: Webhook Management
└── NFRs
    ├── NFR-001: Sync latency < 1s
    └── NFR-002: 99.9% availability
```

**Characteristics**:
- ✅ Permanent (lives in `.specweave/docs/internal/specs/`)
- ✅ Complete (all user stories for a feature)
- ✅ Strategic (business value, roadmap)
- ✅ Living (updated across increments)

**Location**: `.specweave/docs/internal/specs/FS-020-github-integration/`

### Increment Hierarchy (Temporary)

**Purpose**: Execution unit (temporary, archived after completion)

**Structure**:
```
Increment 0020-github-phase-1
├── Scope: Subset of Feature Spec (US-001 to US-005)
├── spec.md: User stories to implement
├── plan.md: Technical design
└── tasks.md: Implementation tasks
    ├── T-001: Create GitHub API Client (implements US-001)
    ├── T-002: Repository Creation Endpoint (implements US-001)
    ├── T-003: Issue Sync Logic (implements US-002)
    └── ...
```

**Characteristics**:
- ✅ Temporary (lives in `.specweave/increments/0020-github-phase-1/`)
- ✅ Focused (3-5 user stories, 2-3 weeks)
- ✅ Tactical (tasks, implementation)
- ✅ Archived (moved after completion)

**Location**: `.specweave/increments/0020-github-phase-1/`

### The Relationship

```
Feature Spec FS-020 (Permanent, 20 user stories)
├── Increment 0020 (Temporary, US-001 to US-005)
├── Increment 0025 (Temporary, US-006 to US-010)
└── Increment 0030 (Temporary, US-011 to US-015)
```

**Key Insight**: Feature Spec is the **strategic view** (what we're building), Increment is the **tactical view** (how we're building it)

---

## Part 3: Mapping SpecWeave to ADO Portfolio

### Scenario 1: Full Portfolio Hierarchy (Enterprise)

**When to Use**: Large organization with portfolio management, strategic planning

**SpecWeave Hierarchy**:
```
Domain: Authentication (Implicit grouping in SpecWeave)
└── Feature Spec: FS-016-authentication-platform
    ├── 20 User Stories
    ├── Increment 0016: OAuth Implementation (US-001 to US-005)
    ├── Increment 0021: SSO Integration (US-006 to US-010)
    └── Increment 0027: MFA (US-011 to US-015)
```

**Maps to ADO**:
```
Epic: "Authentication Platform" (from Feature Spec FS-016)
├── Feature: "OAuth 2.0 Implementation" (from Increment 0016)
│   ├── User Story: "US-001: User Login"
│   │   ├── Task: "T-001: Create Login Endpoint"
│   │   └── Task: "T-002: JWT Token Generation"
│   └── User Story: "US-002: Session Management"
│       └── Task: "T-003: Session Logic"
├── Feature: "SSO Integration" (from Increment 0021)
│   └── User Story: "US-006: SAML Integration"
│       └── Task: "T-015: SAML Config"
└── Feature: "Multi-Factor Authentication" (from Increment 0027)
    └── User Story: "US-011: SMS MFA"
        └── Task: "T-030: SMS Gateway Integration"
```

**Mapping Rules**:
- **Feature Spec** → ADO **Epic** (strategic, long-term)
- **Increment** → ADO **Feature** (deliverable, 1-3 months)
- **User Story** → ADO **User Story** (1-2 weeks)
- **Task** (from tasks.md) → ADO **Task** (1-3 days)

**Configuration** (`.specweave/config.json`):
```json
{
  "sync": {
    "profiles": {
      "ado-enterprise": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "project": "MyProject",
          "syncStrategy": "full-hierarchy",
          "mapping": {
            "featureSpec": "epic",        // FS-016 → Epic
            "increment": "feature",       // 0016 → Feature
            "userStory": "user-story",    // US-001 → User Story
            "task": "task"                // T-001 → Task
          }
        }
      }
    }
  }
}
```

### Scenario 2: Simplified Hierarchy (Small-Medium Team)

**When to Use**: Small team, no portfolio management, just need Feature → Story → Task

**SpecWeave Hierarchy**:
```
Increment 0016: Authentication System
├── US-001: User Login
├── US-002: Session Management
└── tasks.md (T-001, T-002, T-003)
```

**Maps to ADO**:
```
Feature: "Authentication System" (from Increment 0016)
├── User Story: "US-001: User Login"
│   ├── Task: "T-001: Create Login Endpoint"
│   └── Task: "T-002: JWT Token Generation"
└── User Story: "US-002: Session Management"
    └── Task: "T-003: Session Logic"
```

**Mapping Rules**:
- **Increment** → ADO **Feature** (skip Epic level)
- **User Story** → ADO **User Story**
- **Task** → ADO **Task**

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "ado-simple": {
        "provider": "ado",
        "config": {
          "syncStrategy": "simple-hierarchy",
          "mapping": {
            "increment": "feature",       // 0016 → Feature (no Epic)
            "userStory": "user-story",
            "task": "task"
          }
        }
      }
    }
  }
}
```

### Scenario 3: Capability Mapping (Enterprise Portfolio)

**When to Use**: Large enterprise with Capability-based planning

**ADO Capability Concept**: A capability is a high-level business capability (e.g., "Authentication", "Payment Processing", "Reporting")

**SpecWeave Hierarchy** (with Domain organization):
```
Domain: "User Management" (Group of Feature Specs)
├── Feature Spec: FS-016-authentication
│   ├── Increment 0016: OAuth (US-001 to US-005)
│   └── Increment 0021: SSO (US-006 to US-010)
├── Feature Spec: FS-018-user-profiles
│   └── Increment 0018: Profile Management (US-001 to US-008)
└── Feature Spec: FS-022-permissions
    └── Increment 0022: RBAC (US-001 to US-012)
```

**Maps to ADO**:
```
Epic: "User Management Capability" (from Domain)
├── Feature: "Authentication Platform" (from FS-016)
│   ├── User Story: "US-001: User Login" (from Increment 0016)
│   └── User Story: "US-006: SAML SSO" (from Increment 0021)
├── Feature: "User Profiles" (from FS-018)
│   └── User Story: "US-001: Profile Creation" (from Increment 0018)
└── Feature: "Permissions System" (from FS-022)
    └── User Story: "US-001: Role Definition" (from Increment 0022)
```

**Mapping Rules**:
- **Domain** (implicit) → ADO **Epic** (capability level)
- **Feature Spec** → ADO **Feature** (strategic deliverable)
- **Increment** → NOT synced separately (just tracks implementation)
- **User Story** → ADO **User Story**
- **Task** → ADO **Task**

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "ado-capability": {
        "provider": "ado",
        "config": {
          "syncStrategy": "capability-hierarchy",
          "mapping": {
            "domain": "epic",             // "User Management" → Epic
            "featureSpec": "feature",     // FS-016 → Feature
            "userStory": "user-story",
            "task": "task"
          },
          "domainMapping": {
            "authentication": "User Management",
            "user-profiles": "User Management",
            "permissions": "User Management"
          }
        }
      }
    }
  }
}
```

---

## Part 4: Mapping SpecWeave to Jira Portfolio

### Scenario 1: Initiative → Epic → Story (Full Hierarchy)

**SpecWeave Hierarchy**:
```
Domain: "Platform Modernization"
└── Feature Spec: FS-016-authentication
    ├── Increment 0016: OAuth (US-001 to US-005)
    └── Increment 0021: SSO (US-006 to US-010)
```

**Maps to Jira**:
```
Initiative: "Platform Modernization" (from Domain)
└── Epic: "SPEC-016: Authentication Platform" (from Feature Spec)
    ├── Story: "US-001: User Login" (from Increment 0016)
    │   ├── Sub-task: "T-001: Create Login Endpoint"
    │   └── Sub-task: "T-002: JWT Token Generation"
    └── Story: "US-006: SAML SSO" (from Increment 0021)
        └── Sub-task: "T-015: SAML Config"
```

**Mapping Rules**:
- **Domain** → Jira **Initiative** (requires Portfolio/Advanced Roadmaps)
- **Feature Spec** → Jira **Epic**
- **User Story** → Jira **Story**
- **Task** → Jira **Sub-task**

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "jira-portfolio": {
        "provider": "jira",
        "config": {
          "baseUrl": "https://myorg.atlassian.net",
          "syncStrategy": "full-hierarchy",
          "mapping": {
            "domain": "initiative",       // Domain → Initiative
            "featureSpec": "epic",        // FS-016 → Epic
            "userStory": "story",
            "task": "sub-task"
          }
        }
      }
    }
  }
}
```

### Scenario 2: Epic → Story (Simplified)

**SpecWeave Hierarchy**:
```
Increment 0016: Authentication System
├── US-001: User Login
└── US-002: Session Management
```

**Maps to Jira**:
```
Epic: "SPEC-016: Authentication System" (from Increment)
├── Story: "US-001: User Login"
│   ├── Sub-task: "T-001: Create Login Endpoint"
│   └── Sub-task: "T-002: JWT Token Generation"
└── Story: "US-002: Session Management"
    └── Sub-task: "T-003: Session Logic"
```

**Mapping Rules**:
- **Increment** → Jira **Epic**
- **User Story** → Jira **Story**
- **Task** → Jira **Sub-task**

---

## Part 5: Mapping SpecWeave to GitHub Projects

### Scenario 1: Project → Epic Issue → Story Sections (Best Effort)

**GitHub Limitation**: No native hierarchy, use Projects + Labels

**SpecWeave Hierarchy**:
```
Feature Spec: FS-016-authentication
├── Increment 0016: OAuth (US-001 to US-005)
└── Increment 0021: SSO (US-006 to US-010)
```

**Maps to GitHub**:
```
Project: "Authentication Platform"
├── Issue #16: [EPIC] OAuth 2.0 Implementation
│   Labels: ["epic", "authentication", "P1"]
│   Description:
│   ├── ## User Stories
│   │   ├── ### US-001: User Login
│   │   │   <details>...</details>
│   │   └── ### US-002: Session Management
│   │       <details>...</details>
│   └── ## Tasks
│       ├── ☐ T-001: Create Login Endpoint (US-001)
│       └── ☐ T-002: JWT Token Generation (US-001)
└── Issue #21: [EPIC] SSO Integration
    Labels: ["epic", "authentication", "P1"]
    Description: [Similar structure]
```

**Mapping Rules**:
- **Feature Spec** → GitHub **Project** (virtual grouping)
- **Increment** → GitHub **Issue** with [EPIC] label
- **User Story** → GitHub **Section** in issue description (collapsible)
- **Task** → GitHub **Checkbox** in issue

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "github-projects": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "myrepo",
          "syncStrategy": "rich-description",
          "mapping": {
            "featureSpec": "project",     // FS-016 → Project
            "increment": "epic-issue",    // 0016 → Issue with [EPIC] label
            "userStory": "description-section",  // US-001 → Collapsible section
            "task": "checkbox"            // T-001 → Checkbox
          }
        }
      }
    }
  }
}
```

### Scenario 2: Multiple Repos with Mono-Project (Advanced)

**Use Case**: Microservices with central project board

**GitHub Structure**:
```
Organization: myorg
├── Repo: backend
│   ├── Issue #5: [FEATURE] OAuth Backend
│   └── Issue #8: [FEATURE] Session Management
├── Repo: frontend
│   ├── Issue #12: [FEATURE] Login UI
│   └── Issue #15: [FEATURE] Session UI
└── Project: "Authentication Platform" (Organization-level)
    ├── backend#5 (linked)
    ├── backend#8 (linked)
    ├── frontend#12 (linked)
    └── frontend#15 (linked)
```

**SpecWeave Sync Strategy**:
- Increment 0016 → Multiple issues (one per repo)
- Central Project board aggregates all issues
- Labels provide virtual hierarchy

---

## Part 6: Complete Mapping Table

### Full Comparison

| SpecWeave | ADO (Full) | ADO (Simple) | Jira (Portfolio) | Jira (Simple) | GitHub |
|-----------|------------|--------------|------------------|---------------|--------|
| **Domain** | Epic (capability) | - | Initiative | - | Project |
| **Feature Spec** | Epic | - | Epic | - | Project |
| **Increment** | Feature | Feature | Epic | Epic | Issue [EPIC] |
| **User Story** | User Story | User Story | Story | Story | Section |
| **Task** | Task | Task | Sub-task | Sub-task | Checkbox |
| **Acceptance Criteria** | Description | Description | Description | Description | Description |

### Recommended Mappings by Org Size

**Small Team** (1-10 developers):
- ✅ GitHub: Project → Epic Issue → Sections → Checkboxes
- ✅ ADO: Feature → User Story → Task (no Epic)
- ✅ Jira: Epic → Story → Sub-task (no Initiative)

**Medium Team** (10-50 developers):
- ✅ ADO: Epic → Feature → User Story → Task (full hierarchy)
- ✅ Jira: Epic → Story → Sub-task (Initiative if needed)
- ⚠️ GitHub: Use Projects + Labels (limited hierarchy)

**Large Enterprise** (50+ developers):
- ✅ ADO: Initiative → Epic → Feature → User Story → Task (full portfolio)
- ✅ Jira: Initiative → Epic → Story → Sub-task (with Portfolio)
- ❌ GitHub: Not recommended (lacks portfolio features)

---

## Part 7: Implementation Examples

### Example 1: ADO Full Hierarchy Sync

**SpecWeave Setup**:

**File**: `.specweave/docs/internal/specs/FS-016-authentication/spec.md`
```yaml
---
id: FS-016-authentication
title: "Authentication Platform"
domain: "User Management"
type: feature-spec
---

# Feature Spec: Authentication Platform

## User Stories (20 total)
- US-001: User Login
- US-002: Session Management
- ...
- US-020: Audit Logging

## Implementation Roadmap
- Increment 0016: OAuth (US-001 to US-005)
- Increment 0021: SSO (US-006 to US-010)
- Increment 0027: MFA (US-011 to US-015)
```

**File**: `.specweave/increments/0016-oauth-implementation/spec.md`
```yaml
---
id: 0016-oauth-implementation
title: "OAuth 2.0 Implementation"
implements: FS-016-authentication
scope: US-001 to US-005
---

# Increment 0016: OAuth 2.0 Implementation

## User Stories
#### US-001: User Login
...
```

**Sync Result in ADO**:
```
Epic: "Authentication Platform" (WI-500)
├── Area Path: User Management
├── Iteration: Q1 2024
├── Description: [From Feature Spec]
├── Feature: "OAuth 2.0 Implementation" (WI-501)
│   ├── Parent: WI-500
│   ├── Description: [From Increment 0016]
│   ├── User Story: "US-001: User Login" (WI-502)
│   │   ├── Parent: WI-501
│   │   ├── Task: "T-001: Create Login Endpoint" (WI-503)
│   │   │   └── Parent: WI-502
│   │   └── Task: "T-002: JWT Token Generation" (WI-504)
│   │       └── Parent: WI-502
│   └── User Story: "US-002: Session Management" (WI-505)
│       └── Task: "T-003: Session Logic" (WI-506)
└── Feature: "SSO Integration" (WI-520) [Future]
```

**Code**:
```typescript
// Sync to ADO with full hierarchy
await ADOSyncEngine.syncFeatureSpec({
  featureSpec: 'FS-016-authentication',
  syncStrategy: 'full-hierarchy',
  mapping: {
    domain: 'epic',
    increment: 'feature',
    userStory: 'user-story',
    task: 'task',
  },
});

// Creates:
// 1. Epic "Authentication Platform" (if doesn't exist)
// 2. Feature "OAuth 2.0 Implementation" (child of Epic)
// 3. User Stories (children of Feature)
// 4. Tasks (children of User Stories)
```

### Example 2: Capability-Based ADO Sync

**SpecWeave Setup**:

**File**: `.specweave/config.json`
```json
{
  "sync": {
    "profiles": {
      "ado-capability": {
        "provider": "ado",
        "config": {
          "syncStrategy": "capability-hierarchy",
          "capabilityMapping": {
            "FS-016-authentication": {
              "capability": "User Management",
              "capabilityId": "WI-100"
            },
            "FS-018-user-profiles": {
              "capability": "User Management",
              "capabilityId": "WI-100"
            },
            "FS-020-github-integration": {
              "capability": "Developer Experience",
              "capabilityId": "WI-200"
            }
          }
        }
      }
    }
  }
}
```

**Sync Result**:
```
Epic: "User Management" (WI-100) [Capability]
├── Feature: "Authentication Platform" (WI-500)
│   └── User Story: "US-001: User Login" (WI-502)
├── Feature: "User Profiles" (WI-600)
│   └── User Story: "US-001: Profile Creation" (WI-602)
└── Feature: "Permissions System" (WI-700)
    └── User Story: "US-001: Role Definition" (WI-702)

Epic: "Developer Experience" (WI-200) [Capability]
└── Feature: "GitHub Integration" (WI-800)
    └── User Story: "US-001: Repository Creation" (WI-802)
```

**Code**:
```typescript
// Sync with capability grouping
await ADOSyncEngine.syncWithCapabilities({
  featureSpecs: ['FS-016', 'FS-018', 'FS-020'],
  syncStrategy: 'capability-hierarchy',
  createCapabilitiesIfMissing: true,
});
```

---

## Part 8: Configuration Reference

### Complete Config Schema

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "ado-enterprise",
    "profiles": {
      "ado-enterprise": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "project": "MyProject",
          "personalAccessToken": "${ADO_PAT}",

          "syncStrategy": "full-hierarchy",
          // Options: "full-hierarchy" | "simple-hierarchy" | "capability-hierarchy"

          "mapping": {
            "domain": "epic",           // Domain → Epic (capability)
            "featureSpec": "feature",   // Feature Spec → Feature
            "increment": null,          // Increment not synced (tracked internally)
            "userStory": "user-story",  // User Story → User Story
            "task": "task",             // Task → Task
            "nfr": "user-story"         // NFR → User Story (with [NFR] tag)
          },

          "capabilityMapping": {
            "FS-016-authentication": {
              "capability": "User Management",
              "capabilityId": "WI-100"
            }
          },

          "areaPath": "MyProject\\User Management",
          "iterationPath": "MyProject\\Sprint 1",

          "customFields": {
            "SpecWeaveIncrementId": "0016-oauth-implementation",
            "SpecWeaveFeatureSpec": "FS-016-authentication"
          },

          "autoCreateHierarchy": true,
          "syncBidirectional": true,
          "conflictResolution": "external-wins"
        }
      },

      "jira-portfolio": {
        "provider": "jira",
        "config": {
          "baseUrl": "https://myorg.atlassian.net",
          "email": "user@example.com",
          "apiToken": "${JIRA_API_TOKEN}",

          "syncStrategy": "full-hierarchy",

          "mapping": {
            "domain": "initiative",     // Domain → Initiative (requires Portfolio)
            "featureSpec": "epic",      // Feature Spec → Epic
            "increment": null,          // Increment not synced
            "userStory": "story",       // User Story → Story
            "task": "sub-task",         // Task → Sub-task
            "nfr": "story"              // NFR → Story (with [NFR] label)
          },

          "project": "MYPROJECT",
          "customFields": {
            "SpecWeaveIncrementId": "customfield_10050",
            "SpecWeaveFeatureSpec": "customfield_10051"
          }
        }
      },

      "github-projects": {
        "provider": "github",
        "config": {
          "owner": "myorg",
          "repo": "myrepo",
          "personalAccessToken": "${GITHUB_TOKEN}",

          "syncStrategy": "rich-description",
          // Options: "rich-description" | "multi-issue"

          "mapping": {
            "featureSpec": "project",           // Feature Spec → Project
            "increment": "epic-issue",          // Increment → Issue with [EPIC] label
            "userStory": "description-section", // User Story → Collapsible section
            "task": "checkbox"                  // Task → Checkbox
          },

          "labels": {
            "epic": "epic",
            "feature": "feature",
            "userStory": "user-story",
            "nfr": "nfr"
          }
        }
      }
    }
  }
}
```

---

## Part 9: Best Practices

### Do's ✅

1. **Choose the Right Hierarchy**
   - Small team → Simple hierarchy (Feature → Story → Task)
   - Large team → Full hierarchy (Epic → Feature → Story → Task)
   - Enterprise → Capability hierarchy (Capability → Epic → Feature → Story → Task)

2. **Map Consistently**
   - Always map same SpecWeave level to same external level
   - Document mapping in config (makes it explicit)
   - Use custom fields to track SpecWeave IDs

3. **Preserve Traceability**
   - Store SpecWeave Increment ID in external tool (custom field)
   - Store SpecWeave Feature Spec ID in external tool
   - Bidirectional links (SpecWeave → External, External → SpecWeave)

4. **Sync Incrementally**
   - Sync Feature Spec → Epic/Capability (once)
   - Sync Increment → Feature (per increment)
   - Update User Stories → Stories (on spec changes)

### Don'ts ❌

1. **Don't Mix Hierarchies**
   - ❌ Don't map Increment to Epic in one sync, Feature in another
   - ❌ Don't change mapping mid-project (breaks traceability)

2. **Don't Over-Sync**
   - ❌ Don't sync every spec change (batch updates)
   - ❌ Don't sync implementation details (keep in SpecWeave)

3. **Don't Lose Context**
   - ❌ Don't sync without linking back to SpecWeave
   - ❌ Don't remove SpecWeave IDs from external tool

---

## Part 10: Summary

### Key Insights

1. **SpecWeave Has Two Hierarchies**:
   - Living Docs: Feature Spec → User Stories (permanent)
   - Increments: Increment → Tasks (temporary)

2. **External Tools Have Three+ Levels**:
   - ADO: Epic → Feature → User Story → Task (+ Initiative)
   - Jira: Initiative → Epic → Story → Sub-task
   - GitHub: Project → Issue → Section → Checkbox (virtual)

3. **Mapping Depends on Org Size**:
   - Small: Simple hierarchy (skip Epic/Capability)
   - Large: Full hierarchy (all levels)
   - Enterprise: Capability hierarchy (group by capability)

4. **Capability ≈ Domain**:
   - SpecWeave Domains (implicit grouping) → ADO Epic (capability)
   - Feature Specs → ADO Features
   - Increments → NOT synced (internal tracking)

### Recommended Approach

**For Most Teams**:
```
SpecWeave                  ADO
----------------          ----------------
Increment 0016      →     Feature "OAuth"
├── US-001          →     ├── User Story "US-001"
│   ├── T-001       →     │   ├── Task "T-001"
│   └── T-002       →     │   └── Task "T-002"
└── US-002          →     └── User Story "US-002"
    └── T-003       →         └── Task "T-003"
```

**For Enterprise**:
```
SpecWeave                       ADO
-------------------------      -------------------------
Domain: User Management   →     Epic "User Management" (capability)
└── FS-016-authentication →     └── Feature "Authentication"
    └── Inc 0016: OAuth   →         └── User Story "US-001"
        └── US-001        →             └── Task "T-001"
```

---

**Status**: ✅ Complete Portfolio Mapping Guide
**Next Steps**:
1. Review mapping strategy for your org size
2. Configure sync profile in `.specweave/config.json`
3. Test sync with one Feature Spec
4. Roll out to all Feature Specs

---

**Approvers**: SpecWeave Core Team
**Date**: 2025-11-13
