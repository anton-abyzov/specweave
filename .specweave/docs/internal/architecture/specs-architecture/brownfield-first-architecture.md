# brownfield-first: Brownfield-First (No Duplication)

## 🎯 Key Principle: Don't Duplicate!

**domain-based Problem**: Proposed putting NFRs, overviews, user stories in specs/ → **DUPLICATES internal/ folders!**

**brownfield-first Solution**: specs/ contains **ONLY feature specs (FS-*)**, everything else lives in its proper folder.

## Visual Comparison

### ❌ domain-based (Domain-Based with Duplication)

```
.specweave/docs/internal/
├── strategy/
│   └── PRD-001-authentication.md        ← Business requirements
├── architecture/
│   ├── HLD-001-auth-flow.md             ← High-level design
│   └── adr/0012-oauth-vs-jwt.md         ← Architecture decision
├── operations/
│   ├── RUN-001-auth-service.md          ← Runbook
│   ├── SLO-001-auth-availability.md     ← SLO
│   └── NFR-001-auth-performance.md      ← NFR
├── delivery/
│   └── TST-001-auth-test-strategy.md    ← Test strategy
│
└── specs/default/
    ├── core-framework/
    │   ├── spec-001-authentication.md   ❌ DUPLICATES above!
    │   ├── nfrs/                        ❌ DUPLICATES operations/nfr-*.md
    │   │   └── nfr-performance.md
    │   ├── overviews/                   ❌ DUPLICATES architecture/hld-*.md
    │   │   └── overview-auth.md
    │   └── user-stories/                ❌ DUPLICATES strategy/prd-*.md
    │       └── us-001-login.md
```

**Problems**:
- ❌ NFRs duplicated (operations/ AND specs/*/nfrs/)
- ❌ Overviews duplicated (architecture/ AND specs/*/overviews/)
- ❌ User stories duplicated (strategy/ AND specs/*/user-stories/)
- ❌ 4x maintenance (update 4 places for one change!)
- ❌ Sync issues (which is source of truth?)

### ✅ brownfield-first (Brownfield-First, No Duplication)

```
.specweave/docs/internal/
├── strategy/                            ✅ Source of truth for PRDs
│   ├── PRD-001-authentication.md
│   └── PRD-002-dashboard.md
│
├── architecture/                        ✅ Source of truth for design
│   ├── HLD-001-auth-flow.md
│   ├── adr/0012-oauth-vs-jwt.md
│   └── diagrams/auth-sequence.md
│
├── operations/                          ✅ Source of truth for ops
│   ├── RUN-001-auth-service.md
│   ├── SLO-001-auth-availability.md
│   └── NFR-001-auth-performance.md
│
├── delivery/                            ✅ Source of truth for testing
│   └── TST-001-auth-test-strategy.md
│
└── specs/                               ✅ ONLY feature specs (FS-*)
    ├── BE/                              ← From JIRA project key
    │   ├── FS-001-api-v2.md             ✅ REFERENCES: PRD-001, HLD-001, ADR-0012, RUN-001, SLO-001, TST-001
    │   └── FS-002-auth.md               ✅ REFERENCES (not duplicates!)
    ├── FE/                              ← From JIRA project key
    │   └── FS-001-dashboard.md          ✅ REFERENCES: PRD-002, etc.
    └── _index/
        └── by-project.md
```

**Benefits**:
- ✅ No duplication (each doc has ONE home)
- ✅ Clear references (specs LINK to other docs)
- ✅ Single source of truth (update in ONE place)
- ✅ Brownfield-first (mirrors JIRA/ADO/GitHub)

## Spec Format with References

### ❌ domain-based (Duplicates content)

```yaml
---
id: spec-001-authentication
domain: core-framework
---

# SPEC-001: Authentication

## Business Requirements
User authentication with OAuth 2.0...    ❌ Duplicates PRD-001

## Architecture
High-level design...                     ❌ Duplicates HLD-001

## NFRs
- Performance: &lt;100ms login...           ❌ Duplicates NFR-001
- Availability: 99.9% uptime...          ❌ Duplicates SLO-001

## Test Strategy
Unit tests, integration tests...         ❌ Duplicates TST-001

## User Stories
US-001: As a user, I want to login...    ❌ Duplicates PRD-001
```

### ✅ brownfield-first (References, not duplicates)

```yaml
---
id: FS-001-authentication
project: BE                              ← JIRA project key
epic: BE-123                             ← JIRA epic
external_url: https://jira.../BE-123

# References (to other internal/ folders)
strategy_docs: [PRD-001-authentication]
architecture_docs: [HLD-001-auth-flow, ADR-0012-oauth-vs-jwt]
operations_docs: [RUN-001-auth-service, SLO-001-auth-availability, NFR-001-auth-performance]
delivery_docs: [TST-001-auth-test-strategy]
---

# FS-001: Authentication

## Quick Overview
OAuth 2.0 authentication for backend services. See **PRD-001** for business requirements.

## Implementation History
- 0001-core-auth: Basic login (Complete) - See **HLD-001** for architecture
- 0002-oauth-integration: OAuth flow (Complete) - See **ADR-0012** for decision rationale
- 0005-production-hardening: SLOs (Complete) - See **SLO-001** for targets

## User Stories (from PRD-001)
- ✅ US-001: User login (Complete)
- ✅ US-002: Password reset (Complete)
- ⏳ US-003: Social login (Planned) - See **PRD-001** for details

## Operations
- Runbook: See **RUN-001** for incident response
- SLOs: See **SLO-001** for availability targets (99.9%)
- NFRs: See **NFR-001** for performance requirements (&lt;100ms)

## Testing
- Test Strategy: See **TST-001** for complete test plan
- Coverage: 95% unit, 90% integration, 100% E2E critical paths

## Increments
- 0001-core-auth (Complete)
- 0002-oauth-integration (Complete)
- 0005-production-hardening (Complete)

## External Links
- JIRA Epic: https://jira.mycompany.com/browse/BE-123
- GitHub Project: https://github.com/mycompany/backend/projects/1
```

**Key differences**:
- ✅ **REFERENCES** other docs (PRD-001, HLD-001, ADR-0012, RUN-001, SLO-001, TST-001)
- ✅ **DOESN'T DUPLICATE** content from those docs
- ✅ **ADDS** implementation history, increments, user story status
- ✅ **LINKS** to external tools (JIRA epic, GitHub project)

## Brownfield Structure Examples

### Example 1: JIRA with 3 Projects

**JIRA Structure**:
```
Projects:
- BE (Backend) → Board: Backend Development
- FE (Frontend) → Board: Frontend Team
- MOB (Mobile) → Board: Mobile Apps
```

**SpecWeave mirrors JIRA**:
```
.specweave/docs/internal/specs/
├── BE/                  ← JIRA project key
│   ├── FS-001-api-v2.md
│   ├── FS-002-auth.md
│   └── README.md        (Backend: 2 specs, 100% complete)
├── FE/                  ← JIRA project key
│   ├── FS-001-dashboard.md
│   ├── FS-002-dark-mode.md
│   └── README.md        (Frontend: 2 specs, 50% complete)
└── MOB/                 ← JIRA project key
    ├── FS-001-offline-mode.md
    └── README.md        (Mobile: 1 spec, 0% complete)
```

### Example 2: Azure DevOps with Area Paths

**ADO Structure**:
```
Project: MyCompany
Area Paths:
- Core Platform
- Customer Portal
- Admin Tools
```

**SpecWeave mirrors ADO**:
```
.specweave/docs/internal/specs/
├── core-platform/       ← ADO area path (slugified)
│   ├── FS-001-plugin-system.md
│   └── README.md
├── customer-portal/     ← ADO area path (slugified)
│   ├── FS-001-login.md
│   └── README.md
└── admin-tools/         ← ADO area path (slugified)
    ├── FS-001-user-management.md
    └── README.md
```

### Example 3: GitHub with Multiple Repos

**GitHub Structure**:
```
Organization: mycompany
Repositories:
- backend-api
- frontend-app
- mobile-ios
```

**SpecWeave mirrors GitHub**:
```
.specweave/docs/internal/specs/
├── backend-api/         ← GitHub repo name
│   ├── FS-001-rest-api.md
│   └── README.md
├── frontend-app/        ← GitHub repo name
│   ├── FS-001-ui-components.md
│   └── README.md
└── mobile-ios/          ← GitHub repo name
    ├── FS-001-push-notifications.md
    └── README.md
```

## 2-Letter Codes (No Duplication)

| Code | Type | Location | Example |
|------|------|----------|---------|
| **FS** | Feature Spec | `specs/\{project\}/` | `FS-001-authentication.md` |
| **PRD** | Product Req Doc | `strategy/` | `PRD-001-authentication.md` |
| **HLD** | High-Level Design | `architecture/` | `HLD-001-auth-flow.md` |
| **ADR** | Arch Decision Record | `architecture/adr/` | `ADR-0012-oauth-vs-jwt.md` |
| **RUN** | Runbook | `operations/` | `RUN-001-auth-service.md` |
| **SLO** | Service Level Obj | `operations/` | `SLO-001-auth-availability.md` |
| **NFR** | Non-Functional Req | `operations/` | `NFR-001-auth-performance.md` |
| **TST** | Test Strategy | `delivery/` | `TST-001-auth-test-strategy.md` |

**Result**: Each document type has ONE home, no overlap!

## Auto-Detection Workflow

```typescript
// Step 1: Detect external tool
const tool = await detectExternalStructure();
// Checks .env for JIRA_API_TOKEN, AZURE_DEVOPS_PAT, GITHUB_TOKEN
// Result: 'jira'

// Step 2: Fetch JIRA projects
const jiraProjects = await jiraClient.getProjects();
// Result: [
//   { key: 'BE', name: 'Backend' },
//   { key: 'FE', name: 'Frontend' },
//   { key: 'MOB', name: 'Mobile' }
// ]

// Step 3: Create folder structure
for (const project of jiraProjects) {
  fs.mkdirSync(`.specweave/docs/internal/specs/${project.key}`);
  // Creates: specs/BE/, specs/FE/, specs/MOB/
}

// Step 4: When creating spec, ask user
const project = await inquirer.prompt({
  type: 'list',
  name: 'project',
  message: 'Which JIRA project?',
  choices: jiraProjects.map(p => ({ name: p.name, value: p.key }))
});
// User selects: BE (Backend)

// Step 5: Create spec in correct folder
const specPath = `.specweave/docs/internal/specs/${project.key}/FS-001-api-v2.md`;
// Result: specs/BE/FS-001-api-v2.md

// Step 6: Create JIRA epic
const epic = await jiraClient.createEpic({
  project: project.key,
  summary: 'API v2',
  description: '...'
});
// Result: epic.key = 'BE-123'

// Step 7: Add epic link to spec frontmatter
frontmatter.epic = epic.key;
frontmatter.external_url = epic.url;
```

## Benefits Summary

| Aspect | domain-based (Domain-Based) | brownfield-first (Brownfield-First) |
|--------|-------------------|------------------------|
| **Duplication** | ❌ 4x (NFRs, overviews, user stories, specs) | ✅ 1x (specs only) |
| **Maintenance** | ❌ Update 4 places | ✅ Update 1 place |
| **Source of Truth** | ❌ Unclear (which is correct?) | ✅ Clear (each doc has ONE home) |
| **External Tool Sync** | ❌ Domain names ≠ JIRA projects | ✅ Folder names = JIRA projects |
| **Team Alignment** | ❌ Domains don't match teams | ✅ Folders match teams |
| **Brownfield** | ❌ Requires restructuring | ✅ Native support |
| **Greenfield** | ✅ Works | ✅ Works (transitions to brownfield) |

## Migration from domain-based to brownfield-first

```bash
# Step 1: Detect external tool
npx ts-node scripts/detect-external-structure.ts
# Output: Detected JIRA with 3 projects: BE, FE, MOB

# Step 2: Map existing domain specs to JIRA projects
npx ts-node scripts/map-domains-to-projects.ts
# Prompts:
#   core-framework/ → Which project? [BE, FE, MOB]
#   User selects: BE
#   developer-experience/ → Which project? [BE, FE, MOB]
#   User selects: FE

# Step 3: Restructure (with backup)
npx ts-node scripts/restructure-to-brownfield.ts
# Actions:
#   1. Creates specs/BE/, specs/FE/, specs/MOB/
#   2. Moves core-framework/spec-001-*.md → BE/FS-001-*.md
#   3. Moves developer-experience/spec-003-*.md → FE/FS-003-*.md
#   4. Deletes nfrs/, user-stories/, overviews/ (duplicates)
#   5. Generates by-project.md index

# Step 4: Verify
tree .specweave/docs/internal/specs/
# Output:
#   specs/
#   ├── BE/
#   │   ├── FS-001-api-v2.md
#   │   └── README.md
#   ├── FE/
#   │   ├── FS-003-dashboard.md
#   │   └── README.md
#   └── _index/
#       └── by-project.md
```

## Summary

**domain-based**: Domain-based with duplication (NFRs, overviews, user stories in specs/)

**brownfield-first**: Brownfield-first without duplication
- specs/ = ONLY feature specs (FS-*)
- Other docs → strategy/, architecture/, operations/, delivery/
- Structure mirrors JIRA/ADO/GitHub
- Clear references (not duplication)

**Result**: Clean, maintainable, brownfield-native! ✅

---

**Status**: ✅ Revised | 🚀 Ready for Review
**Version**: 2.0 (Brownfield-First)
**Key Change**: No duplication, brownfield-first, clear references
