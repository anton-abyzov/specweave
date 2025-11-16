# Multi-Project Sync Architecture - Complete Guide

**Version**: 0.21.0+
**Last Updated**: 2025-11-16
**Audience**: Users managing multiple repos, teams, or clients

Complete architectural guide to SpecWeave's profile-based multi-project synchronization system with real-world scenarios and Mermaid diagrams.

---

## Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [Scenario 1: Single Project → Multiple Repos](#scenario-1-single-project--multiple-repos)
- [Scenario 2: Multi-Project Mode](#scenario-2-multi-project-mode)
- [Scenario 3: Mixed External Tools](#scenario-3-mixed-external-tools)
- [Scenario 4: Team-Based Organization](#scenario-4-team-based-organization)
- [Scenario 5: Multi-Client Consulting](#scenario-5-multi-client-consulting)
- [Profile Selection Flow](#profile-selection-flow)
- [Data Flow Architecture](#data-flow-architecture)
- [Configuration Patterns](#configuration-patterns)
- [Best Practices](#best-practices)

---

## Overview

SpecWeave's **Profile-Based Sync Architecture** enables unlimited external repository connections while maintaining a single local source of truth. This architecture supports:

- ✅ **Multiple repositories per provider** (Frontend repo, Backend repo, Mobile repo)
- ✅ **Multiple providers simultaneously** (GitHub + Jira + Azure DevOps)
- ✅ **Multi-project organization** (Team A, Team B, Team C)
- ✅ **Smart auto-detection** (Automatically routes increments to correct repos)
- ✅ **Per-increment flexibility** (Each increment can use different profile)

**Key Principle**: `.specweave/` is the source of truth, external tools are mirrors.

---

## Core Architecture

### Three-Layer Design

SpecWeave uses a **layered architecture** to separate credentials, configuration, and per-increment tracking:

```mermaid
graph TB
    subgraph "Layer 1: Credentials (.env)"
        ENV[".env File<br/>(gitignored)"]
        GH_TOKEN["GITHUB_TOKEN"]
        JIRA_TOKEN["JIRA_API_TOKEN"]
        ADO_PAT["AZURE_DEVOPS_PAT"]

        ENV --> GH_TOKEN
        ENV --> JIRA_TOKEN
        ENV --> ADO_PAT
    end

    subgraph "Layer 2: Sync Profiles (config.json)"
        CONFIG["config.json<br/>(version controlled)"]
        PROFILE_A["Profile: frontend-repo<br/>GitHub: org/frontend"]
        PROFILE_B["Profile: backend-repo<br/>GitHub: org/backend"]
        PROFILE_C["Profile: internal-jira<br/>Jira: company/PROJ"]

        CONFIG --> PROFILE_A
        CONFIG --> PROFILE_B
        CONFIG --> PROFILE_C
    end

    subgraph "Layer 3: Per-Increment Metadata"
        META_1["Increment 0008<br/>Profile: frontend-repo<br/>Issue: #42"]
        META_2["Increment 0009<br/>Profile: backend-repo<br/>Issue: #55"]
        META_3["Increment 0010<br/>Profile: internal-jira<br/>Epic: PROJ-12"]
    end

    GH_TOKEN -.-> PROFILE_A
    GH_TOKEN -.-> PROFILE_B
    JIRA_TOKEN -.-> PROFILE_C

    PROFILE_A -.-> META_1
    PROFILE_B -.-> META_2
    PROFILE_C -.-> META_3

    style ENV fill:#ff6b6b,color:#fff
    style CONFIG fill:#ffd43b
    style META_1 fill:#51cf66
    style META_2 fill:#51cf66
    style META_3 fill:#51cf66
```

**Layer Responsibilities**:

| Layer | Purpose | Location | Version Control | Secrets |
|-------|---------|----------|-----------------|---------|
| **1. Credentials** | API tokens | `.env` | ❌ Gitignored | ✅ Yes |
| **2. Profiles** | Repo configs | `config.json` | ✅ Committed | ❌ No |
| **3. Metadata** | Per-increment tracking | `metadata.json` | ✅ Committed | ❌ No |

---

## Scenario 1: Single Project → Multiple Repos

**Common Use Case**: Monorepo development syncing to separate external repos

**Example**: E-commerce platform with separate Frontend, Backend, and Mobile repositories

### Architecture Diagram

```mermaid
graph TB
    subgraph "SpecWeave Local (.specweave/)"
        INC_1["Increment 0001<br/>Add product search<br/>(Frontend)"]
        INC_2["Increment 0002<br/>Payment API<br/>(Backend)"]
        INC_3["Increment 0003<br/>Push notifications<br/>(Mobile)"]
    end

    subgraph "Sync Profiles (config.json)"
        PROF_FE["Profile: frontend-repo<br/>provider: github<br/>repo: org/ecommerce-web"]
        PROF_BE["Profile: backend-repo<br/>provider: github<br/>repo: org/ecommerce-api"]
        PROF_MOB["Profile: mobile-repo<br/>provider: github<br/>repo: org/ecommerce-mobile"]
    end

    subgraph "External GitHub Repositories"
        REPO_FE["org/ecommerce-web<br/>Issue #12: Product search"]
        REPO_BE["org/ecommerce-api<br/>Issue #8: Payment API"]
        REPO_MOB["org/ecommerce-mobile<br/>Issue #5: Push notifications"]
    end

    INC_1 --> PROF_FE
    INC_2 --> PROF_BE
    INC_3 --> PROF_MOB

    PROF_FE --> REPO_FE
    PROF_BE --> REPO_BE
    PROF_MOB --> REPO_MOB

    style INC_1 fill:#339af0,color:#fff
    style INC_2 fill:#339af0,color:#fff
    style INC_3 fill:#339af0,color:#fff
    style PROF_FE fill:#ffd43b
    style PROF_BE fill:#ffd43b
    style PROF_MOB fill:#ffd43b
    style REPO_FE fill:#51cf66
    style REPO_BE fill:#51cf66
    style REPO_MOB fill:#51cf66
```

### Configuration

**File**: `.specweave/config.json`

```json
{
  "sync": {
    "profiles": {
      "frontend-repo": {
        "provider": "github",
        "displayName": "Frontend Web App",
        "config": {
          "owner": "acme-corp",
          "repo": "ecommerce-web"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      },
      "backend-repo": {
        "provider": "github",
        "displayName": "Backend API",
        "config": {
          "owner": "acme-corp",
          "repo": "ecommerce-api"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        }
      },
      "mobile-repo": {
        "provider": "github",
        "displayName": "Mobile App",
        "config": {
          "owner": "acme-corp",
          "repo": "ecommerce-mobile"
        },
        "timeRange": {
          "default": "1M",
          "max": "3M"
        }
      }
    }
  }
}
```

### Workflow

```bash
# 1. Create frontend increment
/specweave:increment "Add product search to web app"
# Increment 0001 created

# 2. Sync to frontend repo
/specweave-github:sync 0001
# ? Select profile: Frontend Web App (frontend-repo)
# ✓ Issue created: org/ecommerce-web#12

# 3. Create backend increment
/specweave:increment "Add payment processing API"
# Increment 0002 created

# 4. Sync to backend repo
/specweave-github:sync 0002
# ? Select profile: Backend API (backend-repo)
# ✓ Issue created: org/ecommerce-api#8

# 5. Create mobile increment
/specweave:increment "Add push notifications to mobile app"
# Increment 0003 created

# 6. Sync to mobile repo
/specweave-github:sync 0003
# ? Select profile: Mobile App (mobile-repo)
# ✓ Issue created: org/ecommerce-mobile#5
```

**Result**: Each increment syncs to its appropriate repository automatically.

---

## Scenario 2: Multi-Project Mode

**Common Use Case**: Enterprise teams managing completely separate projects

**Example**: Platform team managing Internal Tools, Customer Portal, and Admin Dashboard

### Architecture Diagram

```mermaid
graph TB
    subgraph "SpecWeave Multi-Project Structure"
        direction TB

        subgraph "Project: internal-tools"
            INC_A1["Increment 0001<br/>SSO Integration"]
            INC_A2["Increment 0002<br/>Audit Logging"]
        end

        subgraph "Project: customer-portal"
            INC_B1["Increment 0003<br/>Self-Service Dashboard"]
            INC_B2["Increment 0004<br/>Billing Portal"]
        end

        subgraph "Project: admin-dashboard"
            INC_C1["Increment 0005<br/>User Management"]
            INC_C2["Increment 0006<br/>Analytics View"]
        end
    end

    subgraph "Sync Profiles"
        PROF_A["Profile: tools-github<br/>repo: platform/internal-tools"]
        PROF_B["Profile: portal-github<br/>repo: platform/customer-portal"]
        PROF_C["Profile: admin-github<br/>repo: platform/admin-dashboard"]
    end

    subgraph "External Repositories"
        REPO_A["platform/internal-tools<br/>Issues: #10, #11"]
        REPO_B["platform/customer-portal<br/>Issues: #5, #6"]
        REPO_C["platform/admin-dashboard<br/>Issues: #8, #9"]
    end

    INC_A1 --> PROF_A
    INC_A2 --> PROF_A
    INC_B1 --> PROF_B
    INC_B2 --> PROF_B
    INC_C1 --> PROF_C
    INC_C2 --> PROF_C

    PROF_A --> REPO_A
    PROF_B --> REPO_B
    PROF_C --> REPO_C

    style INC_A1 fill:#339af0,color:#fff
    style INC_A2 fill:#339af0,color:#fff
    style INC_B1 fill:#339af0,color:#fff
    style INC_B2 fill:#339af0,color:#fff
    style INC_C1 fill:#339af0,color:#fff
    style INC_C2 fill:#339af0,color:#fff
```

### Configuration

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "internal-tools",
    "projects": [
      {
        "id": "internal-tools",
        "name": "Internal Tools",
        "description": "Employee-facing tools and utilities",
        "techStack": ["React", "Node.js", "PostgreSQL"],
        "team": "Platform Team",
        "syncProfiles": ["tools-github"]
      },
      {
        "id": "customer-portal",
        "name": "Customer Portal",
        "description": "Customer self-service portal",
        "techStack": ["Next.js", "GraphQL", "DynamoDB"],
        "team": "Customer Success Team",
        "syncProfiles": ["portal-github"]
      },
      {
        "id": "admin-dashboard",
        "name": "Admin Dashboard",
        "description": "Internal admin and analytics",
        "techStack": ["Vue.js", "Python", "Redis"],
        "team": "Operations Team",
        "syncProfiles": ["admin-github"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "tools-github": {
        "provider": "github",
        "displayName": "Internal Tools Repository",
        "config": {
          "owner": "platform",
          "repo": "internal-tools"
        }
      },
      "portal-github": {
        "provider": "github",
        "displayName": "Customer Portal Repository",
        "config": {
          "owner": "platform",
          "repo": "customer-portal"
        }
      },
      "admin-github": {
        "provider": "github",
        "displayName": "Admin Dashboard Repository",
        "config": {
          "owner": "platform",
          "repo": "admin-dashboard"
        }
      }
    }
  }
}
```

### Workflow

```bash
# Morning: Work on Internal Tools
/specweave:switch-project internal-tools
/specweave:increment "Add SSO integration"
# → Spec created in: .specweave/docs/internal/specs/internal-tools/
# → Auto-syncs to: platform/internal-tools

# Afternoon: Switch to Customer Portal
/specweave:switch-project customer-portal
/specweave:increment "Build self-service dashboard"
# → Spec created in: .specweave/docs/internal/specs/customer-portal/
# → Auto-syncs to: platform/customer-portal

# Evening: Admin Dashboard work
/specweave:switch-project admin-dashboard
/specweave:increment "Add user management UI"
# → Spec created in: .specweave/docs/internal/specs/admin-dashboard/
# → Auto-syncs to: platform/admin-dashboard
```

**Key Feature**: Each project automatically uses its designated sync profile(s).

---

## Scenario 3: Mixed External Tools

**Common Use Case**: Different teams using different project management tools

**Example**: Development uses GitHub, Product uses Jira, Ops uses Azure DevOps

### Architecture Diagram

```mermaid
graph TB
    subgraph "SpecWeave Local"
        INC_1["Increment 0001<br/>Add OAuth2 Support<br/>(Engineering)"]
        INC_2["Increment 0002<br/>Premium Features<br/>(Product)"]
        INC_3["Increment 0003<br/>K8s Upgrade<br/>(Infrastructure)"]
    end

    subgraph "Sync Profiles"
        PROF_GH["Profile: eng-github<br/>provider: github"]
        PROF_JIRA["Profile: product-jira<br/>provider: jira"]
        PROF_ADO["Profile: ops-ado<br/>provider: ado"]
    end

    subgraph "External Tools"
        GH["GitHub Issues<br/>org/platform<br/>Issue #42"]
        JIRA["Jira Epics<br/>company.atlassian.net<br/>Epic: PROD-15"]
        ADO["Azure DevOps<br/>myorg/infrastructure<br/>Work Item: 87"]
    end

    INC_1 --> PROF_GH
    INC_2 --> PROF_JIRA
    INC_3 --> PROF_ADO

    PROF_GH --> GH
    PROF_JIRA --> JIRA
    PROF_ADO --> ADO

    style INC_1 fill:#339af0,color:#fff
    style INC_2 fill:#339af0,color:#fff
    style INC_3 fill:#339af0,color:#fff
    style PROF_GH fill:#ffd43b
    style PROF_JIRA fill:#ffd43b
    style PROF_ADO fill:#ffd43b
    style GH fill:#51cf66
    style JIRA fill:#51cf66
    style ADO fill:#51cf66
```

### Configuration

**File**: `.specweave/config.json`

```json
{
  "sync": {
    "profiles": {
      "eng-github": {
        "provider": "github",
        "displayName": "Engineering - GitHub",
        "config": {
          "owner": "acme-corp",
          "repo": "platform"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        }
      },
      "product-jira": {
        "provider": "jira",
        "displayName": "Product - Jira",
        "config": {
          "domain": "acme.atlassian.net",
          "projectKey": "PROD"
        },
        "timeRange": {
          "default": "3M",
          "max": "12M"
        }
      },
      "ops-ado": {
        "provider": "ado",
        "displayName": "Operations - Azure DevOps",
        "config": {
          "organization": "acme-corp",
          "project": "Infrastructure"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        }
      }
    }
  }
}
```

**Credentials**: `.env`

```bash
# GitHub token (Engineering)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxx

# Jira token (Product)
JIRA_EMAIL=product@acme.com
JIRA_API_TOKEN=ATATTxxxxxxxxxxxxxxx

# Azure DevOps PAT (Operations)
AZURE_DEVOPS_PAT=xxxxxxxxxxxxxxxxxxx
```

### Workflow

```bash
# Engineering work → GitHub
/specweave:increment "Add OAuth2 authentication"
/specweave-github:sync 0001
# ? Select profile: Engineering - GitHub (eng-github)
# ✓ Issue created: acme-corp/platform#42

# Product work → Jira
/specweave:increment "Launch premium tier features"
/specweave-jira:sync 0002
# ? Select profile: Product - Jira (product-jira)
# ✓ Epic created: PROD-15

# Infrastructure work → Azure DevOps
/specweave:increment "Upgrade Kubernetes to v1.28"
/specweave-ado:sync 0003
# ? Select profile: Operations - Azure DevOps (ops-ado)
# ✓ Work item created: #87
```

**Result**: Same SpecWeave project syncs to three different external tools.

---

## Scenario 4: Team-Based Organization

**Common Use Case**: Multiple teams with automatic routing based on keywords

**Example**: Frontend Team, Backend Team, Mobile Team, Infrastructure Team

### Architecture with Auto-Detection

```mermaid
graph TB
    subgraph "Increment Creation"
        USER["Create Increment:<br/>'Add React Native<br/>dark mode toggle'"]
    end

    subgraph "Smart Detection Engine"
        DETECT["Keyword Analysis:<br/>✓ 'React Native' → Mobile<br/>✓ 'dark mode' → Mobile<br/>✓ Confidence: 0.95"]
    end

    subgraph "Project Contexts"
        PROJ_FE["Project: frontend<br/>Keywords: React, Vue, Angular<br/>Profile: frontend-github"]
        PROJ_BE["Project: backend<br/>Keywords: Node, Python, API<br/>Profile: backend-github"]
        PROJ_MOB["Project: mobile<br/>Keywords: React Native, iOS, Android<br/>Profile: mobile-github"]
        PROJ_INFRA["Project: infrastructure<br/>Keywords: Kubernetes, Terraform<br/>Profile: infra-github"]
    end

    subgraph "Auto-Selected Profile"
        SEL_PROF["Selected Profile:<br/>mobile-github"]
    end

    subgraph "External Repository"
        REPO["GitHub Repo:<br/>org/mobile-app<br/>Issue #23"]
    end

    USER --> DETECT
    DETECT --> PROJ_MOB
    PROJ_MOB --> SEL_PROF
    SEL_PROF --> REPO

    style USER fill:#339af0,color:#fff
    style DETECT fill:#ff6b6b,color:#fff
    style PROJ_MOB fill:#51cf66
    style SEL_PROF fill:#ffd43b
    style REPO fill:#51cf66
```

### Configuration

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": true,
    "autoDetect": true,
    "projects": [
      {
        "id": "frontend",
        "name": "Frontend Team",
        "keywords": ["react", "vue", "angular", "ui", "ux", "css", "web"],
        "team": "Frontend Team",
        "syncProfiles": ["frontend-github"]
      },
      {
        "id": "backend",
        "name": "Backend Team",
        "keywords": ["api", "node", "python", "database", "postgres", "redis"],
        "team": "Backend Team",
        "syncProfiles": ["backend-github"]
      },
      {
        "id": "mobile",
        "name": "Mobile Team",
        "keywords": ["react-native", "ios", "android", "mobile", "app"],
        "team": "Mobile Team",
        "syncProfiles": ["mobile-github"]
      },
      {
        "id": "infrastructure",
        "name": "Infrastructure Team",
        "keywords": ["kubernetes", "k8s", "terraform", "aws", "docker", "devops"],
        "team": "Infrastructure Team",
        "syncProfiles": ["infra-github"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "frontend-github": {
        "provider": "github",
        "config": { "owner": "org", "repo": "web-app" }
      },
      "backend-github": {
        "provider": "github",
        "config": { "owner": "org", "repo": "api-service" }
      },
      "mobile-github": {
        "provider": "github",
        "config": { "owner": "org", "repo": "mobile-app" }
      },
      "infra-github": {
        "provider": "github",
        "config": { "owner": "org", "repo": "infrastructure" }
      }
    }
  }
}
```

### Auto-Detection Algorithm

```mermaid
flowchart TD
    START["User creates increment:<br/>'Add React Native<br/>dark mode toggle'"]

    EXTRACT["Extract keywords:<br/>['React Native', 'dark mode', 'toggle']"]

    SCORE["Score each project:<br/>frontend: 0.2 (UI keyword)<br/>backend: 0.0<br/>mobile: 0.95 (React Native)<br/>infrastructure: 0.0"]

    THRESHOLD{Confidence > 0.7?}

    AUTO_SELECT["✓ Auto-select:<br/>mobile-github"]

    PROMPT["❓ Prompt user:<br/>Select profile manually"]

    SYNC["Sync to:<br/>org/mobile-app"]

    START --> EXTRACT
    EXTRACT --> SCORE
    SCORE --> THRESHOLD
    THRESHOLD -->|Yes| AUTO_SELECT
    THRESHOLD -->|No| PROMPT
    AUTO_SELECT --> SYNC
    PROMPT --> SYNC

    style START fill:#339af0,color:#fff
    style AUTO_SELECT fill:#51cf66
    style PROMPT fill:#ffd43b
    style SYNC fill:#51cf66
```

**Scoring Rules**:
- Project name match: +10 points
- Team name match: +5 points
- Keyword match: +3 points per keyword
- Normalize to 0.0-1.0 scale
- Auto-select if confidence > 0.7

---

## Scenario 5: Multi-Client Consulting

**Common Use Case**: Consulting firm managing multiple client projects

**Example**: Agency working with Client A, Client B, and Client C

### Architecture Diagram

```mermaid
graph TB
    subgraph "SpecWeave Local (.specweave/)"
        direction TB

        subgraph "Client A Work"
            INC_A1["Increment 0001<br/>Client A: E-commerce checkout"]
            INC_A2["Increment 0002<br/>Client A: Payment gateway"]
        end

        subgraph "Client B Work"
            INC_B1["Increment 0003<br/>Client B: Admin dashboard"]
            INC_B2["Increment 0004<br/>Client B: Analytics"]
        end

        subgraph "Client C Work"
            INC_C1["Increment 0005<br/>Client C: Mobile app"]
        end
    end

    subgraph "Sync Profiles (Isolated per Client)"
        PROF_A_GH["Profile: client-a-github"]
        PROF_A_JIRA["Profile: client-a-jira"]

        PROF_B_GH["Profile: client-b-github"]

        PROF_C_GH["Profile: client-c-github"]
        PROF_C_ADO["Profile: client-c-ado"]
    end

    subgraph "Client A External Tools"
        REPO_A_GH["GitHub: client-a/ecommerce"]
        REPO_A_JIRA["Jira: clienta.atlassian.net"]
    end

    subgraph "Client B External Tools"
        REPO_B_GH["GitHub: client-b/admin"]
    end

    subgraph "Client C External Tools"
        REPO_C_GH["GitHub: client-c/mobile"]
        REPO_C_ADO["ADO: client-c/platform"]
    end

    INC_A1 --> PROF_A_GH
    INC_A2 --> PROF_A_JIRA
    INC_B1 --> PROF_B_GH
    INC_B2 --> PROF_B_GH
    INC_C1 --> PROF_C_GH

    PROF_A_GH --> REPO_A_GH
    PROF_A_JIRA --> REPO_A_JIRA
    PROF_B_GH --> REPO_B_GH
    PROF_C_GH --> REPO_C_GH
    PROF_C_ADO --> REPO_C_ADO

    style INC_A1 fill:#339af0,color:#fff
    style INC_A2 fill:#339af0,color:#fff
    style INC_B1 fill:#339af0,color:#fff
    style INC_B2 fill:#339af0,color:#fff
    style INC_C1 fill:#339af0,color:#fff
```

### Configuration

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": true,
    "projects": [
      {
        "id": "client-a",
        "name": "Client A - E-commerce Platform",
        "client": "Client A Inc.",
        "contractEnd": "2026-12-31",
        "syncProfiles": ["client-a-github", "client-a-jira"]
      },
      {
        "id": "client-b",
        "name": "Client B - Admin Portal",
        "client": "Client B Corp.",
        "contractEnd": "2026-06-30",
        "syncProfiles": ["client-b-github"]
      },
      {
        "id": "client-c",
        "name": "Client C - Mobile App",
        "client": "Client C LLC",
        "contractEnd": "2027-03-31",
        "syncProfiles": ["client-c-github", "client-c-ado"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "client-a-github": {
        "provider": "github",
        "displayName": "Client A - GitHub",
        "config": {
          "owner": "client-a",
          "repo": "ecommerce"
        },
        "rateLimits": {
          "maxItemsPerSync": 200,
          "warnThreshold": 50
        }
      },
      "client-a-jira": {
        "provider": "jira",
        "displayName": "Client A - Jira",
        "config": {
          "domain": "clienta.atlassian.net",
          "projectKey": "ECOM"
        }
      },
      "client-b-github": {
        "provider": "github",
        "displayName": "Client B - GitHub",
        "config": {
          "owner": "client-b",
          "repo": "admin"
        },
        "rateLimits": {
          "maxItemsPerSync": 300,
          "warnThreshold": 100
        }
      },
      "client-c-github": {
        "provider": "github",
        "displayName": "Client C - GitHub",
        "config": {
          "owner": "client-c",
          "repo": "mobile"
        }
      },
      "client-c-ado": {
        "provider": "ado",
        "displayName": "Client C - Azure DevOps",
        "config": {
          "organization": "client-c",
          "project": "Platform"
        }
      }
    }
  }
}
```

### Workflow

```bash
# Morning: Client A work
/specweave:switch-project client-a
/specweave:increment "Add checkout flow to e-commerce"
# → Auto-syncs to: client-a/ecommerce (GitHub) AND clienta.atlassian.net (Jira)

# Afternoon: Client B work
/specweave:switch-project client-b
/specweave:increment "Build admin dashboard analytics"
# → Auto-syncs to: client-b/admin (GitHub only)

# Evening: Client C work
/specweave:switch-project client-c
/specweave:increment "Add offline mode to mobile app"
# → Prompt: Sync to GitHub or ADO? (or both)
```

**Key Features**:
- ✅ Complete isolation between client work
- ✅ Per-client rate limits (protect API quota)
- ✅ Contract tracking (expiration dates)
- ✅ Flexible sync (some clients use multiple tools)

---

## Profile Selection Flow

### Interactive Selection Process

```mermaid
flowchart TD
    START["User runs:<br/>/specweave-github:sync 0008"]

    CHECK_META{Increment metadata<br/>has profile?}

    USE_META["✓ Use existing profile<br/>from metadata.json"]

    LOAD_PROFILES["Load all GitHub profiles<br/>from config.json"]

    COUNT{How many<br/>profiles?}

    AUTO_ONE["✓ Auto-select<br/>(only one profile)"]

    DETECT{Auto-detect<br/>enabled?}

    ANALYZE["Analyze increment:<br/>- Title keywords<br/>- Spec content<br/>- Project context"]

    SCORE{Confidence<br/>> 0.7?}

    AUTO_MULTI["✓ Auto-select<br/>(high confidence)"]

    PROMPT["❓ Prompt user:<br/>Select profile manually"]

    SYNC["Execute sync with<br/>selected profile"]

    SAVE["Save profile to<br/>metadata.json"]

    START --> CHECK_META
    CHECK_META -->|Yes| USE_META
    CHECK_META -->|No| LOAD_PROFILES

    LOAD_PROFILES --> COUNT
    COUNT -->|1| AUTO_ONE
    COUNT -->|2+| DETECT

    DETECT -->|Yes| ANALYZE
    DETECT -->|No| PROMPT

    ANALYZE --> SCORE
    SCORE -->|Yes| AUTO_MULTI
    SCORE -->|No| PROMPT

    USE_META --> SYNC
    AUTO_ONE --> SYNC
    AUTO_MULTI --> SYNC
    PROMPT --> SYNC

    SYNC --> SAVE

    style START fill:#339af0,color:#fff
    style AUTO_ONE fill:#51cf66
    style AUTO_MULTI fill:#51cf66
    style PROMPT fill:#ffd43b
    style SYNC fill:#51cf66
```

### Selection Priority

1. **Existing Metadata** (Highest Priority)
   - If `metadata.json` has `sync.profile`, use it
   - Ensures consistency across re-syncs

2. **Single Profile** (Auto-select)
   - If only one profile exists for the provider, use it
   - No user input needed

3. **Auto-Detection** (If enabled)
   - Analyze increment title, spec content, project context
   - Calculate confidence score
   - Auto-select if confidence > 0.7

4. **Manual Selection** (Fallback)
   - Prompt user to select from available profiles
   - Show profile details (repo, team, description)

---

## Data Flow Architecture

### Complete Sync Lifecycle

```mermaid
sequenceDiagram
    autonumber

    participant User
    participant CLI as SpecWeave CLI
    participant Config as config.json
    participant Meta as metadata.json
    participant API as External API<br/>(GitHub/Jira/ADO)

    User->>CLI: /specweave-github:sync 0008

    CLI->>Meta: Check for existing profile
    alt Has profile
        Meta-->>CLI: profile: "frontend-repo"
    else No profile
        CLI->>Config: Load GitHub profiles
        Config-->>CLI: List of profiles
        CLI->>User: Prompt: Select profile
        User-->>CLI: Selected: "frontend-repo"
    end

    CLI->>Config: Get profile details
    Config-->>CLI: owner: "org", repo: "web"

    CLI->>Config: Get time range
    Config-->>CLI: default: "1M", max: "6M"

    CLI->>User: Prompt: Select time range
    User-->>CLI: Selected: "1M"

    CLI->>API: GET /rate_limit
    API-->>CLI: 4,850 remaining

    CLI->>CLI: Calculate impact (300 calls = LOW)

    CLI->>API: Create GitHub issue
    API-->>CLI: Issue #42 created

    CLI->>Meta: Save sync metadata
    Meta-->>CLI: Saved: profile, issueNumber, url

    CLI->>User: ✓ Synced to org/web#42
```

### Bidirectional Sync Flow

```mermaid
sequenceDiagram
    autonumber

    participant Dev as Developer
    participant SW as SpecWeave
    participant GH as GitHub Issue
    participant Team as Stakeholder

    rect rgb(200, 220, 255)
        Note over Dev,GH: Initial Sync (SpecWeave → GitHub)
        Dev->>SW: Create increment 0008
        SW->>SW: Generate spec, tasks
        SW->>GH: Create issue #42
        SW->>GH: Add checkable task list
    end

    rect rgb(255, 220, 200)
        Note over Team,GH: External Updates (GitHub → SpecWeave)
        Team->>GH: Tick checkbox: [x] T-001
        Team->>GH: Add comment: "Approved"
        Team->>GH: Change label: "priority:high"
    end

    rect rgb(220, 255, 220)
        Note over Dev,SW: Pull Updates (GitHub → SpecWeave)
        Dev->>SW: /specweave-github:sync 0008
        SW->>GH: Fetch issue #42
        GH-->>SW: Updated tasks, comments, labels
        SW->>SW: Merge external changes
        SW->>SW: Update tasks.md: [x] T-001
        SW->>Dev: ✓ Synced changes from GitHub
    end

    rect rgb(255, 255, 200)
        Note over Dev,GH: Local Updates (SpecWeave → GitHub)
        Dev->>SW: Mark task complete: [x] T-002
        Dev->>SW: Update spec: Add new AC
        SW->>GH: Update issue #42
        GH-->>SW: Updated
        SW->>Dev: ✓ Synced changes to GitHub
    end
```

---

## Configuration Patterns

### Pattern 1: Minimal Configuration

**Use Case**: Simple project with one external repo

```json
{
  "sync": {
    "profiles": {
      "default": {
        "provider": "github",
        "displayName": "My Project",
        "config": {
          "owner": "myorg",
          "repo": "myrepo"
        }
      }
    }
  }
}
```

**Benefits**:
- ✅ Quickest setup (< 1 minute)
- ✅ Auto-selects profile (no prompts)
- ✅ Good for solo developers

### Pattern 2: Multi-Repo Configuration

**Use Case**: Multiple repos for same project (FE, BE, Mobile)

```json
{
  "sync": {
    "profiles": {
      "frontend": {
        "provider": "github",
        "config": { "owner": "org", "repo": "web" }
      },
      "backend": {
        "provider": "github",
        "config": { "owner": "org", "repo": "api" }
      },
      "mobile": {
        "provider": "github",
        "config": { "owner": "org", "repo": "mobile" }
      }
    }
  }
}
```

**Benefits**:
- ✅ Clean separation by tech stack
- ✅ Independent issue tracking
- ✅ Team-specific repositories

### Pattern 3: Multi-Project + Multi-Repo

**Use Case**: Enterprise with multiple teams and projects

```json
{
  "multiProject": {
    "enabled": true,
    "projects": [
      {
        "id": "team-a",
        "syncProfiles": ["team-a-github", "team-a-jira"]
      },
      {
        "id": "team-b",
        "syncProfiles": ["team-b-github"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "team-a-github": { "provider": "github", "config": {...} },
      "team-a-jira": { "provider": "jira", "config": {...} },
      "team-b-github": { "provider": "github", "config": {...} }
    }
  }
}
```

**Benefits**:
- ✅ Complete team isolation
- ✅ Mixed external tools
- ✅ Scalable to 10+ teams

### Pattern 4: Client-Isolated Configuration

**Use Case**: Consulting/agency managing multiple clients

```json
{
  "multiProject": {
    "enabled": true,
    "projects": [
      {
        "id": "client-a",
        "client": "Client A Inc.",
        "contractEnd": "2026-12-31",
        "syncProfiles": ["client-a-github"],
        "rateLimits": {
          "maxItemsPerSync": 100
        }
      },
      {
        "id": "client-b",
        "client": "Client B Corp.",
        "syncProfiles": ["client-b-github"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "client-a-github": {
        "provider": "github",
        "config": { "owner": "client-a", "repo": "project" }
      },
      "client-b-github": {
        "provider": "github",
        "config": { "owner": "client-b", "repo": "app" }
      }
    }
  }
}
```

**Benefits**:
- ✅ Complete client isolation
- ✅ Per-client rate limits
- ✅ Contract tracking
- ✅ Easy handoff (export client folder)

---

## Best Practices

### 1. Profile Naming Conventions

**Good Names**:
- ✅ `frontend-github` - Describes tech stack + provider
- ✅ `client-a-jira` - Describes client + provider
- ✅ `team-alpha-ado` - Describes team + provider
- ✅ `mobile-app-github` - Describes product + provider

**Bad Names**:
- ❌ `profile1` - Meaningless
- ❌ `gh` - Too cryptic
- ❌ `prod` - Ambiguous (production? product?)

### 2. Time Range Recommendations

| Scenario | Recommended | Rationale |
|----------|-------------|-----------|
| **Active project** | 1M (1 month) | Recent work, fast sync |
| **Brownfield migration** | 3M (3 months) | Balance history + speed |
| **Long-term project** | 6M (6 months) | Comprehensive history |
| **Initial setup** | ALL (all time) | One-time full import |
| **Daily syncs** | 1W (1 week) | Minimal API calls |

### 3. Rate Limit Strategy

**Conservative Limits** (Recommended for shared accounts):
```json
{
  "rateLimits": {
    "maxItemsPerSync": 200,
    "warnThreshold": 50
  }
}
```

**Aggressive Limits** (For dedicated accounts):
```json
{
  "rateLimits": {
    "maxItemsPerSync": 1000,
    "warnThreshold": 500
  }
}
```

### 4. Multi-Project Organization

**Good Structure**:
```
projects/
├── frontend-team/       ✅ Team-based
├── backend-team/
└── mobile-team/

projects/
├── client-a/            ✅ Client-based
├── client-b/
└── client-c/
```

**Bad Structure**:
```
projects/
├── feature-auth/        ❌ Feature-based (too granular)
├── feature-payments/
└── bug-fixes/          ❌ Type-based (wrong abstraction)
```

### 5. Credential Management

**Correct**:
```bash
# .env (gitignored)
GITHUB_TOKEN=ghp_xxxxx
JIRA_API_TOKEN=ATATTxxxxx
```

**Incorrect**:
```json
// config.json (DON'T DO THIS!)
{
  "profiles": {
    "bad": {
      "config": {
        "token": "ghp_xxxxx"  // ❌ SECURITY RISK!
      }
    }
  }
}
```

---

## Summary

SpecWeave's **Profile-Based Multi-Project Sync Architecture** enables:

**✅ Unlimited Scale**:
- Multiple repositories per provider
- Multiple providers simultaneously
- Multiple projects/teams/clients

**✅ Smart Automation**:
- Auto-detection based on keywords
- Auto-selection with confidence scoring
- Per-increment flexibility

**✅ Safety & Performance**:
- Time range filtering (1W, 1M, 3M, 6M, ALL)
- Rate limit protection
- Pre-flight validation

**✅ Clean Architecture**:
- Layer 1: Credentials (.env, gitignored)
- Layer 2: Profiles (config.json, committed)
- Layer 3: Metadata (per-increment tracking)

**Key Commands**:
- `/specweave:switch-project <id>` - Switch active project
- `/specweave-github:sync <increment>` - Sync to GitHub
- `/specweave-jira:sync <increment>` - Sync to Jira
- `/specweave-ado:sync <increment>` - Sync to Azure DevOps

**Result**: Work seamlessly across unlimited repositories while maintaining a single local source of truth.

---

## Related Documentation

- [Multi-Project Setup Guide](/docs/guides/multi-project-setup) - Setup instructions
- [Profile-Based Sync](/docs/glossary/terms/profile-based-sync) - Glossary term
- [Sync Strategies](/docs/guides/sync-strategies) - Sync strategy patterns
- [GitHub Integration](/docs/guides/github-integration) - GitHub-specific setup

---

**Last Updated**: 2025-11-16
**Version**: 0.21.0+
**Feedback**: https://github.com/anton-abyzov/specweave/issues
