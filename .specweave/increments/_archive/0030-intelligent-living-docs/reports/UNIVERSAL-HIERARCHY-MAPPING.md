# Universal Hierarchy Mapping - For ANY Project Using SpecWeave

**Status**: Universal Guide (For ALL SpecWeave Users)
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**This guide is for ANY project using SpecWeave**, from solo developers to Fortune 500 enterprises.

**Key Principle**: **Progressive Complexity** - Start simple, scale up when needed.

**Three Levels**:
1. **Simple** (Solo/Small Team): Just Features → Stories → Tasks
2. **Standard** (Medium Team): Epics → Features → Stories → Tasks
3. **Enterprise** (Large Org): Capabilities → Epics → Features → Stories → Tasks

**SpecWeave adapts to YOUR needs** - no forced complexity!

---

## Part 1: How to Choose Your Level

### Quick Decision Matrix

```
How many developers?
├─ 1-5 → Simple (Level 1)
├─ 6-20 → Standard (Level 2)
└─ 21+ → Enterprise (Level 3)

How many repos/services?
├─ 1 (monolith) → Simple (Level 1)
├─ 2-5 (microservices) → Standard (Level 2)
└─ 6+ (many services) → Enterprise (Level 3)

Do you have portfolio management?
├─ No → Simple or Standard
└─ Yes (ADO Portfolio, Jira Advanced) → Enterprise (Level 3)

How long are your projects?
├─ <3 months → Simple (Level 1)
├─ 3-12 months → Standard (Level 2)
└─ >12 months → Enterprise (Level 3)
```

### The Three Levels Explained

**Level 1: Simple** (90% of projects start here)
- **What**: Just track features and tasks
- **Who**: Solo devs, startups, small teams (1-5 people)
- **Tools**: GitHub Issues, Jira Basic, ADO Basic
- **Complexity**: Minimal (1-2 hierarchy levels)

**Level 2: Standard** (Growth phase)
- **What**: Track epics, features, and tasks
- **Who**: Growing teams, scale-ups (6-20 people)
- **Tools**: GitHub Projects, Jira Standard, ADO Standard
- **Complexity**: Moderate (2-3 hierarchy levels)

**Level 3: Enterprise** (Large organizations)
- **What**: Full portfolio with capabilities, epics, features
- **Who**: Enterprises, large products (21+ people)
- **Tools**: Jira Advanced Roadmaps, ADO Portfolio
- **Complexity**: Full (4-5 hierarchy levels)

**Key Insight**: **Start at Level 1, upgrade when you outgrow it!**

---

## Part 2: Level 1 - Simple Mapping (Solo/Small Team)

### When to Use

✅ **Perfect for**:
- Solo developers
- Startups (1-5 people)
- Single repository projects
- Short projects (<3 months)
- MVPs and prototypes

❌ **Not suitable for**:
- Multiple teams
- Long-term roadmaps (>6 months)
- Complex portfolio management

### SpecWeave Structure (Simple)

```
my-saas-app/
└── .specweave/
    ├── increments/
    │   ├── 0001-user-auth/
    │   │   ├── spec.md          ← 3-5 user stories
    │   │   └── tasks.md         ← Implementation tasks
    │   └── 0002-payment-flow/
    │       ├── spec.md
    │       └── tasks.md
    └── docs/
        └── internal/
            └── specs/           ← Living docs (optional at this level)
```

**Key Point**: Increments are self-contained (no complex hierarchy)

### Mapping to External Tools

#### GitHub (Simple)

**SpecWeave Increment** → **GitHub Issue**

```
Increment 0001-user-auth
├── US-001: User Login
├── US-002: Password Reset
└── tasks.md (T-001, T-002, T-003)

↓ Maps to ↓

GitHub Issue #1: "User Authentication"
├── Labels: ["feature"]
├── Description:
│   ├── ## User Stories
│   │   ├── **US-001**: User Login
│   │   │   - As a user, I want to log in...
│   │   └── **US-002**: Password Reset
│   │       - As a user, I want to reset password...
│   └── ## Implementation
│       ├── ☐ T-001: Create Login API
│       ├── ☐ T-002: JWT Token Logic
│       └── ☐ T-003: Password Reset Flow
```

**Config** (`.specweave/config.json`):
```json
{
  "sync": {
    "level": "simple",
    "activeProfile": "github-simple",
    "profiles": {
      "github-simple": {
        "provider": "github",
        "config": {
          "owner": "myusername",
          "repo": "my-saas-app",
          "mapping": {
            "increment": "issue"
          }
        }
      }
    }
  }
}
```

#### Jira (Simple)

**SpecWeave Increment** → **Jira Epic** (yes, skip Story level!)

```
Increment 0001-user-auth

↓ Maps to ↓

Jira Epic: "USER-1: User Authentication"
├── Description: [User Stories US-001, US-002]
├── Sub-task: "T-001: Create Login API"
├── Sub-task: "T-002: JWT Token Logic"
└── Sub-task: "T-003: Password Reset Flow"
```

**Why Skip Story?** For simple projects, Epic with Sub-tasks is cleaner than Epic → Story → Sub-task.

**Config**:
```json
{
  "sync": {
    "level": "simple",
    "activeProfile": "jira-simple",
    "profiles": {
      "jira-simple": {
        "provider": "jira",
        "config": {
          "baseUrl": "https://myteam.atlassian.net",
          "project": "USER",
          "mapping": {
            "increment": "epic",
            "task": "sub-task"
          }
        }
      }
    }
  }
}
```

#### Azure DevOps (Simple)

**SpecWeave Increment** → **ADO Feature**

```
Increment 0001-user-auth

↓ Maps to ↓

ADO Feature: "User Authentication"
├── Description: [User Stories US-001, US-002]
├── Task: "T-001: Create Login API"
├── Task: "T-002: JWT Token Logic"
└── Task: "T-003: Password Reset Flow"
```

**Config**:
```json
{
  "sync": {
    "level": "simple",
    "activeProfile": "ado-simple",
    "profiles": {
      "ado-simple": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "project": "MySaaSApp",
          "mapping": {
            "increment": "feature",
            "task": "task"
          }
        }
      }
    }
  }
}
```

### Summary: Level 1 Simple

| SpecWeave | GitHub | Jira | ADO |
|-----------|--------|------|-----|
| **Increment** | Issue | Epic | Feature |
| **User Story** | Section in description | Section in description | Description |
| **Task** | Checkbox | Sub-task | Task |

**Hierarchy**: **1 level** (Increment/Epic/Feature → Tasks)

---

## Part 3: Level 2 - Standard Mapping (Medium Team)

### When to Use

✅ **Perfect for**:
- Growing teams (6-20 people)
- Multiple features in parallel
- Medium projects (3-12 months)
- 2-5 microservices
- Need roadmap visibility

❌ **Not suitable for**:
- Solo devs (over-engineering)
- Enterprise portfolio (need more levels)

### SpecWeave Structure (Standard)

```
my-product/
└── .specweave/
    ├── docs/
    │   └── internal/
    │       └── specs/
    │           ├── FS-001-authentication/
    │           │   ├── spec.md        ← Feature Spec (strategic)
    │           │   ├── us-001-user-login.md
    │           │   └── us-002-password-reset.md
    │           └── FS-002-payment-processing/
    │               └── spec.md
    └── increments/
        ├── 0001-auth-phase-1/
        │   ├── spec.md               ← Implements FS-001 (US-001, US-002)
        │   └── tasks.md
        └── 0002-auth-phase-2/
            ├── spec.md               ← Implements FS-001 (US-003, US-004)
            └── tasks.md
```

**Key Difference**: Feature Specs (permanent) separate from Increments (temporary)

### Mapping to External Tools

#### GitHub (Standard)

**SpecWeave Feature Spec** → **GitHub Project**
**SpecWeave Increment** → **GitHub Issue** (with project)

```
Feature Spec: FS-001-authentication (20 user stories)
├── Increment 0001 (US-001, US-002)
└── Increment 0002 (US-003, US-004)

↓ Maps to ↓

GitHub Project: "Authentication"
├── Issue #1: "Phase 1: Basic Auth"
│   ├── Labels: ["phase-1", "authentication"]
│   ├── Description: [US-001, US-002]
│   └── Checkboxes: [T-001, T-002, T-003]
└── Issue #2: "Phase 2: Social Login"
    ├── Labels: ["phase-2", "authentication"]
    ├── Description: [US-003, US-004]
    └── Checkboxes: [T-004, T-005, T-006]
```

**Config**:
```json
{
  "sync": {
    "level": "standard",
    "activeProfile": "github-standard",
    "profiles": {
      "github-standard": {
        "provider": "github",
        "config": {
          "owner": "mycompany",
          "repo": "my-product",
          "mapping": {
            "featureSpec": "project",
            "increment": "issue"
          }
        }
      }
    }
  }
}
```

#### Jira (Standard)

**SpecWeave Feature Spec** → **Jira Epic**
**SpecWeave User Story** → **Jira Story**

```
Feature Spec: FS-001-authentication

↓ Maps to ↓

Jira Epic: "AUTH-1: Authentication System"
├── Story: "AUTH-2: US-001 User Login"
│   ├── Sub-task: "AUTH-3: T-001 Create Login API"
│   └── Sub-task: "AUTH-4: T-002 JWT Token Logic"
└── Story: "AUTH-5: US-002 Password Reset"
    └── Sub-task: "AUTH-6: T-003 Reset Flow"
```

**Config**:
```json
{
  "sync": {
    "level": "standard",
    "activeProfile": "jira-standard",
    "profiles": {
      "jira-standard": {
        "provider": "jira",
        "config": {
          "baseUrl": "https://mycompany.atlassian.net",
          "project": "AUTH",
          "mapping": {
            "featureSpec": "epic",
            "userStory": "story",
            "task": "sub-task"
          }
        }
      }
    }
  }
}
```

#### Azure DevOps (Standard)

**SpecWeave Feature Spec** → **ADO Epic**
**SpecWeave Increment** → **ADO Feature**

```
Feature Spec: FS-001-authentication

↓ Maps to ↓

ADO Epic: "Authentication System"
├── Feature: "Phase 1: Basic Auth" (from Increment 0001)
│   ├── User Story: "US-001: User Login"
│   │   ├── Task: "T-001: Create Login API"
│   │   └── Task: "T-002: JWT Token Logic"
│   └── User Story: "US-002: Password Reset"
│       └── Task: "T-003: Reset Flow"
└── Feature: "Phase 2: Social Login" (from Increment 0002)
    └── User Story: "US-003: OAuth Integration"
        └── Task: "T-004: OAuth Config"
```

**Config**:
```json
{
  "sync": {
    "level": "standard",
    "activeProfile": "ado-standard",
    "profiles": {
      "ado-standard": {
        "provider": "ado",
        "config": {
          "organization": "mycompany",
          "project": "MyProduct",
          "mapping": {
            "featureSpec": "epic",
            "increment": "feature",
            "userStory": "user-story",
            "task": "task"
          }
        }
      }
    }
  }
}
```

### Summary: Level 2 Standard

| SpecWeave | GitHub | Jira | ADO |
|-----------|--------|------|-----|
| **Feature Spec** | Project | Epic | Epic |
| **Increment** | Issue | - | Feature |
| **User Story** | Section | Story | User Story |
| **Task** | Checkbox | Sub-task | Task |

**Hierarchy**: **2-3 levels** (Feature Spec → Increment → Stories → Tasks)

---

## Part 4: Level 3 - Enterprise Mapping (Large Organization)

### When to Use

✅ **Perfect for**:
- Large organizations (21+ people)
- Multiple teams/departments
- Long-term projects (>12 months)
- 6+ microservices
- Portfolio management tools
- Strategic planning (capabilities, roadmaps)

❌ **Not suitable for**:
- Small teams (unnecessary complexity)
- Short projects (over-engineering)

### SpecWeave Structure (Enterprise)

```
my-enterprise-product/
└── .specweave/
    ├── docs/
    │   └── internal/
    │       ├── domains/
    │       │   ├── user-management.md    ← Domain definition
    │       │   └── payment-processing.md
    │       └── specs/
    │           ├── user-management/
    │           │   ├── FS-001-authentication/
    │           │   │   ├── spec.md
    │           │   │   ├── us-001-user-login.md
    │           │   │   └── us-002-password-reset.md
    │           │   └── FS-002-user-profiles/
    │           │       └── spec.md
    │           └── payment-processing/
    │               └── FS-010-payment-gateway/
    │                   └── spec.md
    └── increments/
        ├── 0001-auth-oauth/
        └── 0002-profiles-basic/
```

**Key Addition**: Domains (capabilities) organize Feature Specs

### Mapping to External Tools

#### Azure DevOps (Enterprise - Full Hierarchy)

**SpecWeave Domain** → **ADO Epic** (capability level)
**SpecWeave Feature Spec** → **ADO Feature**
**SpecWeave User Story** → **ADO User Story**

```
Domain: User Management
├── FS-001-authentication
│   ├── US-001: User Login
│   └── US-002: Password Reset
└── FS-002-user-profiles
    └── US-001: Profile Creation

↓ Maps to ↓

ADO Epic: "User Management" (WI-100) [Capability]
├── Feature: "Authentication System" (WI-200)
│   ├── User Story: "US-001: User Login" (WI-201)
│   │   ├── Task: "T-001: Create Login API" (WI-202)
│   │   └── Task: "T-002: JWT Token Logic" (WI-203)
│   └── User Story: "US-002: Password Reset" (WI-204)
│       └── Task: "T-003: Reset Flow" (WI-205)
└── Feature: "User Profiles" (WI-300)
    └── User Story: "US-001: Profile Creation" (WI-301)
        └── Task: "T-010: Profile API" (WI-302)
```

**Config**:
```json
{
  "sync": {
    "level": "enterprise",
    "activeProfile": "ado-enterprise",
    "profiles": {
      "ado-enterprise": {
        "provider": "ado",
        "config": {
          "organization": "myenterprise",
          "project": "EnterpriseProduct",
          "mapping": {
            "domain": "epic",
            "featureSpec": "feature",
            "userStory": "user-story",
            "task": "task"
          },
          "domainMapping": {
            "user-management": {
              "name": "User Management",
              "epicId": "WI-100"
            },
            "payment-processing": {
              "name": "Payment Processing",
              "epicId": "WI-500"
            }
          }
        }
      }
    }
  }
}
```

#### Jira (Enterprise - with Portfolio)

**SpecWeave Domain** → **Jira Initiative**
**SpecWeave Feature Spec** → **Jira Epic**

```
Domain: User Management
└── FS-001-authentication
    └── US-001: User Login

↓ Maps to ↓

Jira Initiative: "User Management Capability"
└── Epic: "AUTH-1: Authentication System"
    └── Story: "AUTH-2: US-001 User Login"
        └── Sub-task: "AUTH-3: T-001 Create Login API"
```

**Config**:
```json
{
  "sync": {
    "level": "enterprise",
    "activeProfile": "jira-enterprise",
    "profiles": {
      "jira-enterprise": {
        "provider": "jira",
        "config": {
          "baseUrl": "https://myenterprise.atlassian.net",
          "project": "ENTERPRISE",
          "mapping": {
            "domain": "initiative",
            "featureSpec": "epic",
            "userStory": "story",
            "task": "sub-task"
          },
          "portfolioEnabled": true
        }
      }
    }
  }
}
```

#### GitHub (Enterprise - Limited)

**Note**: GitHub lacks native portfolio hierarchy. Use Projects + Labels.

```
Domain: User Management

↓ Maps to (best effort) ↓

GitHub Organization Project: "User Management"
├── Label: "domain:user-management"
├── Issue #1: "[FEATURE] Authentication System"
│   ├── Label: "feature-spec:FS-001"
│   └── Description: [All user stories]
└── Issue #2: "[FEATURE] User Profiles"
    └── Label: "feature-spec:FS-002"
```

**Config**:
```json
{
  "sync": {
    "level": "enterprise",
    "activeProfile": "github-enterprise",
    "profiles": {
      "github-enterprise": {
        "provider": "github",
        "config": {
          "owner": "myenterprise",
          "repo": "product",
          "mapping": {
            "domain": "org-project",
            "featureSpec": "epic-issue"
          },
          "useLabels": true
        }
      }
    }
  }
}
```

### Summary: Level 3 Enterprise

| SpecWeave | ADO (Full) | Jira (Portfolio) | GitHub (Limited) |
|-----------|------------|------------------|------------------|
| **Domain** | Epic (capability) | Initiative | Org Project |
| **Feature Spec** | Feature | Epic | Issue [FEATURE] |
| **User Story** | User Story | Story | Section |
| **Task** | Task | Sub-task | Checkbox |

**Hierarchy**: **3-4 levels** (Domain → Feature Spec → User Stories → Tasks)

---

## Part 5: Auto-Detection and Progressive Upgrade

### Auto-Detection (Recommended)

**SpecWeave can detect your project complexity automatically!**

**Detection Logic**:
```typescript
function detectComplexityLevel(project: SpecWeaveProject): Level {
  // Count indicators
  const featureSpecCount = countFeatureSpecs(project);
  const incrementCount = countIncrements(project);
  const hasDomains = checkForDomains(project);
  const repoCount = countRepositories(project);

  // Enterprise indicators
  if (hasDomains || featureSpecCount > 10 || repoCount > 5) {
    return 'enterprise';
  }

  // Standard indicators
  if (featureSpecCount > 3 || incrementCount > 10) {
    return 'standard';
  }

  // Simple (default)
  return 'simple';
}
```

**Config** (auto-detect):
```json
{
  "sync": {
    "level": "auto",  // ← Let SpecWeave decide!
    "activeProfile": "auto-detect"
  }
}
```

### Progressive Upgrade Path

**Start Simple → Grow to Standard → Scale to Enterprise**

```
Month 1-3: Simple
├── Just increments
├── GitHub Issues
└── 1 repository

↓ Growing (5+ developers) ↓

Month 4-12: Standard
├── Feature Specs introduced
├── GitHub Projects
└── 2-3 repositories

↓ Scaling (20+ developers) ↓

Month 13+: Enterprise
├── Domains introduced
├── ADO Portfolio
└── 6+ repositories
```

**No Migration Pain**: SpecWeave automatically adapts sync strategy!

---

## Part 6: Complete Configuration Templates

### Template 1: Starter (Simple)

**Use Case**: Solo developer, MVP, single repo

```json
{
  "sync": {
    "level": "simple",
    "activeProfile": "github-starter",
    "profiles": {
      "github-starter": {
        "provider": "github",
        "config": {
          "owner": "myusername",
          "repo": "my-app",
          "mapping": {
            "increment": "issue"
          }
        }
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": false  // Not needed for simple projects
    }
  }
}
```

### Template 2: Growth (Standard)

**Use Case**: Growing team (6-20), multiple features

```json
{
  "sync": {
    "level": "standard",
    "activeProfile": "ado-growth",
    "profiles": {
      "ado-growth": {
        "provider": "ado",
        "config": {
          "organization": "mycompany",
          "project": "MyProduct",
          "mapping": {
            "featureSpec": "epic",
            "increment": "feature",
            "userStory": "user-story",
            "task": "task"
          }
        }
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "atomicSync": true,
      "extractEpic": true
    }
  },
  "multiProject": {
    "enabled": false  // Single project for now
  }
}
```

### Template 3: Enterprise (Full)

**Use Case**: Large org (21+), portfolio management

```json
{
  "sync": {
    "level": "enterprise",
    "activeProfile": "ado-enterprise",
    "profiles": {
      "ado-enterprise": {
        "provider": "ado",
        "config": {
          "organization": "myenterprise",
          "project": "EnterpriseProduct",
          "mapping": {
            "domain": "epic",
            "featureSpec": "feature",
            "userStory": "user-story",
            "task": "task"
          },
          "domainMapping": {
            "user-management": {
              "name": "User Management",
              "epicId": "WI-100"
            },
            "payment-processing": {
              "name": "Payment Processing",
              "epicId": "WI-500"
            },
            "reporting": {
              "name": "Reporting & Analytics",
              "epicId": "WI-700"
            }
          },
          "areaPath": "EnterpriseProduct",
          "iterationPath": "EnterpriseProduct\\Sprint 1"
        }
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "atomicSync": true,
      "extractEpic": true,
      "splitByCategory": true,
      "generateCrossLinks": true
    }
  },
  "multiProject": {
    "enabled": true,
    "projects": {
      "backend": {
        "name": "Backend Services",
        "keywords": ["api", "backend", "service"]
      },
      "frontend": {
        "name": "Frontend App",
        "keywords": ["ui", "frontend", "react"]
      },
      "mobile": {
        "name": "Mobile App",
        "keywords": ["mobile", "ios", "android"]
      }
    }
  }
}
```

---

## Part 7: Migration Paths

### From Simple → Standard

**Trigger**: Team grows from 5 to 10+ people

**Steps**:
1. Introduce Feature Specs (permanent docs)
2. Map existing increments to Feature Specs
3. Update sync config (`level: "standard"`)
4. Sync Feature Specs to Epics/Projects

**Config Change**:
```json
{
  "sync": {
    "level": "standard",  // Changed from "simple"
    "mapping": {
      "featureSpec": "epic",  // NEW
      "increment": "feature"
    }
  }
}
```

**No Data Loss**: Existing increments remain valid!

### From Standard → Enterprise

**Trigger**: Multiple teams, portfolio management needed

**Steps**:
1. Introduce Domains (capability grouping)
2. Group Feature Specs by Domain
3. Update sync config (`level: "enterprise"`)
4. Map Domains to Epic/Capability level

**Config Change**:
```json
{
  "sync": {
    "level": "enterprise",  // Changed from "standard"
    "mapping": {
      "domain": "epic",         // NEW
      "featureSpec": "feature"  // Changed from "epic"
    }
  }
}
```

**Backward Compatible**: Standard structure still works!

---

## Part 8: Best Practices by Level

### Level 1: Simple - Best Practices

✅ **Do**:
- Keep increments small (1-2 weeks)
- Use descriptive increment names
- Put all docs in increment folder
- Sync frequently (every few days)

❌ **Don't**:
- Create Feature Specs (over-engineering)
- Use complex hierarchy (unnecessary)
- Worry about long-term roadmap (not needed yet)

### Level 2: Standard - Best Practices

✅ **Do**:
- Create Feature Specs for strategic features
- Plan increments across Feature Spec roadmap
- Use living docs for permanent knowledge
- Track progress across increments

❌ **Don't**:
- Create Domains yet (wait for complexity)
- Over-plan (keep some flexibility)
- Mix permanent/temporary docs

### Level 3: Enterprise - Best Practices

✅ **Do**:
- Define Domains (capabilities) upfront
- Align Feature Specs to business capabilities
- Use portfolio management tools
- Track metrics across domains
- Plan 6-12 months ahead

❌ **Don't**:
- Over-bureaucratize (keep agile)
- Ignore team feedback (complexity must add value)
- Forget to sunset old domains

---

## Part 9: Comparison Table (All Levels)

### By Complexity

| Aspect | Simple | Standard | Enterprise |
|--------|--------|----------|------------|
| **Team Size** | 1-5 | 6-20 | 21+ |
| **Hierarchy Levels** | 1-2 | 2-3 | 3-4 |
| **Planning Horizon** | 1-3 months | 3-12 months | 12+ months |
| **Repos** | 1 | 2-5 | 6+ |
| **Feature Specs** | No | Yes | Yes |
| **Domains** | No | No | Yes |
| **Living Docs** | Optional | Recommended | Required |
| **Portfolio Tools** | No | Optional | Required |

### By External Tool

| SpecWeave | GitHub (Simple) | GitHub (Standard) | ADO (Simple) | ADO (Enterprise) | Jira (Standard) | Jira (Enterprise) |
|-----------|-----------------|-------------------|--------------|------------------|-----------------|-------------------|
| **Domain** | - | - | - | Epic | - | Initiative |
| **Feature Spec** | - | Project | - | Epic | Epic | Epic |
| **Increment** | Issue | Issue | Feature | Feature | Epic | - |
| **User Story** | Section | Section | Description | User Story | Story | Story |
| **Task** | Checkbox | Checkbox | Task | Task | Sub-task | Sub-task |

---

## Part 10: Summary & Recommendations

### Quick Decision Guide

```
Starting a new project?
└─ Use Level 1 (Simple)
   Config: "level": "simple"
   Sync: Increment → Issue/Epic/Feature

Growing past 5 developers?
└─ Upgrade to Level 2 (Standard)
   Config: "level": "standard"
   Add: Feature Specs
   Sync: Feature Spec → Epic, Increment → Feature

Need portfolio management?
└─ Upgrade to Level 3 (Enterprise)
   Config: "level": "enterprise"
   Add: Domains
   Sync: Domain → Epic (capability)
```

### Universal Principles

**For ALL projects** (regardless of level):
1. ✅ **Start simple**: Don't over-engineer
2. ✅ **Upgrade progressively**: Add complexity when needed
3. ✅ **Use auto-detection**: Let SpecWeave decide
4. ✅ **Keep flexibility**: Easy to change levels
5. ✅ **Focus on value**: Hierarchy should help, not hinder

### Recommended Defaults

**Solo Developer / Startup**:
```json
{ "sync": { "level": "simple" } }
```

**Growing Team / Scale-up**:
```json
{ "sync": { "level": "standard" } }
```

**Enterprise / Large Org**:
```json
{ "sync": { "level": "enterprise" } }
```

**Not Sure?**:
```json
{ "sync": { "level": "auto" } }  ← Let SpecWeave decide!
```

---

## Conclusion

**SpecWeave adapts to YOUR needs**:
- Small projects: Simple mapping (no complexity)
- Medium projects: Standard mapping (strategic planning)
- Large projects: Enterprise mapping (full portfolio)

**Progressive complexity**: Start simple, scale when needed, no migration pain!

**This guide works for ANY project using SpecWeave** - from solo developers to Fortune 500 enterprises.

---

**Status**: ✅ Universal Guide (For All SpecWeave Users)
**Next Steps**:
1. Choose your level (simple/standard/enterprise or auto)
2. Copy appropriate config template
3. Run sync!

---

**Date**: 2025-11-13
**Author**: SpecWeave Team
