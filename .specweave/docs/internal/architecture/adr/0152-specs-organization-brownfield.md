# Revised Specs Organization Strategy (Brownfield-First)

**Last Updated**: 2025-11-12
**Status**: Implemented

## Critical Insight: Don't Duplicate!

**Problem with domain-based approach**: Proposed putting NFRs, overviews, user stories in specs/ → **DUPLICATES** existing internal/ folders!

**Existing internal/ folders** (source of truth):
- `strategy/` - Business rationale (PRDs, business requirements)
- `architecture/` - System-wide technical design (HLDs, ADRs, diagrams)
- `delivery/` - Build & release (test strategies, release plans)
- `operations/` - Production ops (runbooks, SLOs, NFRs)
- `governance/` - Policies (security, compliance)

**What specs/ should contain**: **ONLY living docs specs** - permanent feature-level knowledge base that REFERENCES the above folders.

## Two Organization Strategies

### Strategy 1: Brownfield (JIRA/ADO/GitHub-Driven) ✅ RECOMMENDED

**For projects with existing external tools**

**Principle**: The structure of JIRA/ADO/GitHub DEFINES the folder organization!

**Example - JIRA with 3 projects**:
```
JIRA:
- Project: BACKEND (key: BE, board: Backend Development)
- Project: FRONTEND (key: FE, board: Frontend Team)
- Project: MOBILE (key: MOB, board: Mobile Apps)

SpecWeave structure (mirrors JIRA):
.specweave/docs/internal/specs/
├── BE/                  # Backend project (from JIRA key)
│   ├── FS-001-api-v2.md
│   ├── FS-002-auth.md
│   └── README.md
├── FE/                  # Frontend project (from JIRA key)
│   ├── FS-001-dashboard.md
│   ├── FS-002-dark-mode.md
│   └── README.md
└── MOB/                 # Mobile project (from JIRA key)
    ├── FS-001-offline-mode.md
    └── README.md
```

**Example - Azure DevOps with area paths**:
```
Azure DevOps:
- Project: MyCompany
  - Area Path: Core Platform
  - Area Path: Customer Portal
  - Area Path: Admin Tools

SpecWeave structure (mirrors ADO area paths):
.specweave/docs/internal/specs/
├── core-platform/       # From ADO area path
│   ├── FS-001-plugin-system.md
│   └── README.md
├── customer-portal/     # From ADO area path
│   ├── FS-001-login.md
│   └── README.md
└── admin-tools/         # From ADO area path
    ├── FS-001-user-management.md
    └── README.md
```

**Example - GitHub with multiple repos**:
```
GitHub:
- Repo: backend-api
- Repo: frontend-app
- Repo: mobile-ios

SpecWeave structure (mirrors GitHub repos):
.specweave/docs/internal/specs/
├── backend-api/         # From GitHub repo name
│   ├── FS-001-rest-api.md
│   └── README.md
├── frontend-app/        # From GitHub repo name
│   ├── FS-001-ui-components.md
│   └── README.md
└── mobile-ios/          # From GitHub repo name
    ├── FS-001-push-notifications.md
    └── README.md
```

### Strategy 2: Greenfield (Domain-Driven)

**For new projects without external tools (yet)**

**Principle**: Organize by feature domain until external tools are added

**Structure**:
```
.specweave/docs/internal/specs/default/
├── core-framework/
│   ├── FS-001-plugin-architecture.md
│   └── README.md
├── developer-experience/
│   ├── FS-001-onboarding.md
│   └── README.md
└── integrations/
    ├── FS-001-github-sync.md
    └── README.md
```

**Transition to brownfield**: When JIRA/ADO/GitHub added, restructure to match!

## 2-Letter Spec Codes

**Only ONE type of spec** in specs/ folder: **Feature Specs (FS)**

| Code | Type | Description | Example |
|------|------|-------------|---------|
| **FS** | Feature Spec | Living docs spec (permanent, feature-level) | `FS-001-user-auth.md` |

**Other document types** (NOT in specs/):
- **PRD-** → `strategy/prd-*.md` (business requirements)
- **HLD-** → `architecture/hld-*.md` (high-level design)
- **ADR-** → `architecture/adr/NNNN-*.md` (architecture decisions)
- **RUN-** → `operations/runbook-*.md` (runbooks)
- **SLO-** → `operations/slo-*.md` (service level objectives)
- **NFR-** → `operations/nfr-*.md` (non-functional requirements)
- **TST-** → `delivery/test-strategy-*.md` (test strategies)

**Result**: No duplication! Each document type has ONE home.

## Living Docs Spec Format (FS)

**Filename**: `FS-{NNN}-{slug}.md` (e.g., `FS-001-user-authentication.md`)

**Frontmatter** (minimal, no duplication):
```yaml
---
# Identity
id: FS-001-user-authentication
title: "User Authentication"
version: 2.0
status: active | planning | completed | archived

# Classification (brownfield: project/team, greenfield: domain)
project: BE                    # JIRA project key OR domain name
epic: BE-123                   # External epic/feature ID (optional)
external_url: https://...      # Link to JIRA/ADO/GitHub

# Ownership
team: Backend Team
owner: @john-doe
created: 2025-01-15
last_updated: 2025-11-10
target_release: 1.0.0

# References (to other internal/ folders)
strategy_docs: [PRD-001-authentication]
architecture_docs: [HLD-001-auth-flow, ADR-0012-oauth-vs-jwt]
operations_docs: [RUN-001-auth-service, SLO-001-auth-availability]
delivery_docs: [TST-001-auth-test-strategy]

# Relationships (to other specs)
increments: [0001, 0002, 0005]
depends_on: [FS-002]
blocks: [FS-010]
related: [FS-015]

# Metrics
estimated_effort: 120h
actual_effort: 95h
user_stories: 12
completion: 100%
---
```

**Body**: User stories, acceptance criteria, implementation history

**Key principle**: Spec REFERENCES other docs, doesn't duplicate them!

## Auto-Detection Strategy (Brownfield)

**Step 1: Detect External Tool**

```typescript
// Auto-detect JIRA/ADO/GitHub structure
const detectExternalStructure = async (): Promise<'jira' | 'ado' | 'github' | 'greenfield'> => {
  // Check .env for external tool credentials
  if (process.env.JIRA_API_TOKEN) return 'jira';
  if (process.env.AZURE_DEVOPS_PAT) return 'ado';
  if (process.env.GITHUB_TOKEN) return 'github';
  return 'greenfield';
};
```

**Step 2: Fetch External Structure**

```typescript
// JIRA: Fetch projects
const jiraProjects = await jiraClient.getProjects();
// Result: [{ key: 'BE', name: 'Backend' }, { key: 'FE', name: 'Frontend' }]

// ADO: Fetch area paths
const adoAreaPaths = await adoClient.getAreaPaths();
// Result: ['Core Platform', 'Customer Portal', 'Admin Tools']

// GitHub: Fetch repos
const githubRepos = await githubClient.getRepos();
// Result: ['backend-api', 'frontend-app', 'mobile-ios']
```

**Step 3: Create Folder Structure**

```typescript
// JIRA example
for (const project of jiraProjects) {
  fs.mkdirSync(`.specweave/docs/internal/specs/${project.key}`);
  // Create: specs/BE/, specs/FE/, specs/MOB/
}

// ADO example
for (const areaPath of adoAreaPaths) {
  const slug = slugify(areaPath);
  fs.mkdirSync(`.specweave/docs/internal/specs/${slug}`);
  // Create: specs/core-platform/, specs/customer-portal/
}
```

**Step 4: Map Specs to Projects**

```typescript
// When creating spec, ask user to select project
const project = await selectProject(jiraProjects);
// User selects: BE (Backend)

const specPath = `.specweave/docs/internal/specs/${project.key}/FS-001-api-v2.md`;
// Creates: specs/BE/FS-001-api-v2.md
```

## Migration from domain-based approach (Domain-Based)

**If you already implemented domain-based structure**, migrate to brownfield:

```bash
# Step 1: Detect external tool
npx ts-node scripts/detect-external-structure.ts
# Output: Detected JIRA with 3 projects: BE, FE, MOB

# Step 2: Map domains to projects
npx ts-node scripts/map-domains-to-projects.ts
# Asks:
#   core-framework/ → Which project? [BE, FE, MOB]
#   developer-experience/ → Which project? [BE, FE, MOB]
#   integrations/ → Which project? [BE, FE, MOB]

# Step 3: Restructure
npx ts-node scripts/restructure-to-brownfield.ts
# Moves:
#   core-framework/spec-001-*.md → BE/FS-001-*.md
#   developer-experience/spec-003-*.md → FE/FS-003-*.md
```

## Updated PM Agent Workflow

### Brownfield (JIRA/ADO/GitHub)

```typescript
// Step 1: Detect external tool
const tool = await detectExternalStructure();
// Result: 'jira'

// Step 2: Fetch projects
const projects = await jiraClient.getProjects();
// Result: [{ key: 'BE', name: 'Backend' }, { key: 'FE', name: 'Frontend' }]

// Step 3: Ask user to select project
const project = await inquirer.prompt({
  type: 'list',
  name: 'project',
  message: 'Which project is this spec for?',
  choices: projects.map(p => ({ name: p.name, value: p.key }))
});
// User selects: BE (Backend)

// Step 4: Generate spec path
const specNumber = await getNextSpecNumber(project.key);
// Result: 1

const specPath = `.specweave/docs/internal/specs/${project.key}/FS-${String(specNumber).padStart(3, '0')}-api-v2.md`;
// Result: specs/BE/FS-001-api-v2.md

// Step 5: Add frontmatter with project reference
const frontmatter = {
  id: `FS-${specNumber}-api-v2`,
  title: 'API v2',
  project: project.key,
  epic: null,  // Will be created in JIRA
  external_url: null,
  team: project.name,
  // ... other fields
};

// Step 6: Create spec
writeSpec(specPath, frontmatter, content);

// Step 7: Create JIRA epic (optional)
const epic = await jiraClient.createEpic({
  project: project.key,
  summary: frontmatter.title,
  description: generateDescription(content)
});

// Step 8: Update spec with epic link
frontmatter.epic = epic.key;
frontmatter.external_url = epic.url;
writeSpec(specPath, frontmatter, content);
```

### Greenfield (Domain-Based)

```typescript
// Step 1: Classify domain (fallback)
const domain = classifyDomain(spec.title, spec.content);
// Result: "core-framework"

// Step 2: Generate spec path
const specPath = `.specweave/docs/internal/specs/default/${domain}/FS-001-plugin-architecture.md`;

// Step 3: Add frontmatter
const frontmatter = {
  id: 'FS-001-plugin-architecture',
  title: 'Plugin Architecture',
  project: domain,  // Use domain as project
  // ... other fields
};

// Step 4: Create spec
writeSpec(specPath, frontmatter, content);
```

## Navigation Indices (Updated)

**For Brownfield** (project-based):
- `by-project.md` - All projects (BE, FE, MOB)
- `by-status.md` - Active, planning, completed, archived
- `by-release.md` - 1.0.0, 1.1.0, 2.0.0
- `by-team.md` - Backend Team, Frontend Team, Mobile Team

**For Greenfield** (domain-based):
- `by-domain.md` - All domains
- `by-status.md` - Active, planning, completed, archived
- `by-release.md` - 1.0.0, 1.1.0, 2.0.0
- `by-team.md` - Core Team, Platform Team, DX Team

## Example Structure (Brownfield JIRA)

```
.specweave/docs/internal/
├── strategy/                    # Business rationale
│   ├── PRD-001-authentication.md
│   └── PRD-002-dashboard.md
│
├── architecture/                # System-wide design
│   ├── HLD-001-auth-flow.md
│   ├── adr/
│   │   └── 0012-oauth-vs-jwt.md
│   └── diagrams/
│       └── auth-sequence.md
│
├── operations/                  # Production ops
│   ├── RUN-001-auth-service.md  # Runbook
│   ├── SLO-001-auth-availability.md  # SLO
│   └── NFR-001-auth-performance.md   # NFR
│
├── delivery/                    # Build & release
│   └── TST-001-auth-test-strategy.md
│
├── specs/                       # ✨ LIVING DOCS SPECS ONLY
│   ├── BE/                      # Backend project (from JIRA)
│   │   ├── FS-001-api-v2.md     # ✅ References PRD-001, HLD-001, ADR-0012, RUN-001, SLO-001, TST-001
│   │   ├── FS-002-auth.md       # ✅ References strategy/, architecture/, operations/, delivery/
│   │   └── README.md
│   ├── FE/                      # Frontend project (from JIRA)
│   │   ├── FS-001-dashboard.md  # ✅ References PRD-002, etc.
│   │   └── README.md
│   └── _index/
│       ├── by-project.md        # BE (2 specs), FE (1 spec)
│       ├── by-status.md
│       └── by-release.md
│
└── ... (modules/, team/, etc.)
```

**Key principle**: specs/ contains ONLY feature specs (FS-*). Everything else lives in strategy/, architecture/, operations/, delivery/!

## Configuration

```json
{
  "specs": {
    "organization": {
      "strategy": "brownfield" | "greenfield",
      "externalTool": "jira" | "ado" | "github" | null,
      "autoDetectStructure": true,
      "specPrefix": "FS",
      "metadata": {
        "required": ["id", "title", "status", "project", "team", "owner"],
        "optional": ["epic", "external_url", "increments"]
      }
    }
  }
}
```

## Benefits of Brownfield-First Approach

✅ **No duplication** - specs/ contains ONLY feature specs
✅ **Mirrors external tools** - JIRA/ADO/GitHub structure reflected in folders
✅ **Team alignment** - Folder names match team organization
✅ **Easy sync** - External tool structure = SpecWeave structure
✅ **Clear references** - Specs reference strategy/, architecture/, operations/, delivery/
✅ **Scalable** - Works for 1 project or 100 projects

## Migration Scripts (Updated)

1. **detect-external-structure.ts** - Auto-detect JIRA/ADO/GitHub
2. **fetch-external-projects.ts** - Fetch projects/area paths/repos
3. **restructure-to-brownfield.ts** - Migrate from domain-based to project-based
4. **generate-spec-indices.ts** - Generate by-project.md, by-status.md, etc.

## Summary

**domain-based approach Problem**: Duplicated content (NFRs, overviews, user stories in specs/)

**brownfield-first Solution**:
- specs/ = ONLY feature specs (FS-*)
- Other docs → strategy/, architecture/, operations/, delivery/
- Brownfield: structure mirrors JIRA/ADO/GitHub
- Greenfield: domain-based until external tools added
- No duplication, clear references

**Result**: Clean, brownfield-first, no duplication! ✅
