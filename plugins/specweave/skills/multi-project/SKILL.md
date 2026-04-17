---
name: sw/multi-project
description: Unified multi-project management skill for GitHub, Azure DevOps, and Jira. Organizes specs and splits tasks across multiple repositories or projects for monorepo, polyrepo, project-per-team, and area-path architectures. Use `--tool github|ado|jira` to select the target integration.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob
---

# Multi-Project Management Skill

Unified skill for organizing SpecWeave specs and increments across multiple projects or repositories. Supersedes the tool-specific `sw:github-multi-project` and `sw:ado-multi-project` skills, and adds Jira multi-project support.

## `--tool` Flag

Select the target integration via the `--tool` flag:

| Value | Backend | Use When |
|-------|---------|----------|
| `--tool github` | GitHub repositories | Multi-repo and monorepo GitHub projects |
| `--tool ado` | Azure DevOps projects / area paths | Project-per-team, area-path-based, or team-based ADO organizations |
| `--tool jira` | Jira projects / components | Multi-project Jira instances with Epics/Stories |

Example invocations:

```bash
sw:multi-project --tool github
sw:multi-project --tool ado
sw:multi-project --tool jira
```

If `--tool` is omitted, the skill reads `integrations.primary` from `.specweave/config.json` and falls back to `github` when unset.

## Core Capabilities (All Tools)

1. **Spec Organization** — organizes specs in `.specweave/docs/internal/projects/{project-id}/`
2. **Task Splitting** — analyzes `tasks.md` and splits work into project-specific tasks
3. **Cross-project Coordination** — tracks dependencies between projects
4. **Bidirectional Sync** — keeps local specs and remote work items in sync

## Architectures

### Single Repository / Single Project

```
my-app/
├── .specweave/
│   └── docs/internal/projects/default/
└── src/
```

### Multi-Repository (Polyrepo — GitHub)

```
my-app-frontend/   my-app-backend/   my-app-shared/
├── .git             ├── .git           ├── .git
└── src/             └── src/           └── src/
```

### Parent Repository (Recommended for GitHub multi-repo)

```
my-app-parent/              # Parent repo holds .specweave
├── .specweave/
│   └── docs/internal/projects/
│       ├── frontend/
│       ├── backend/
│       └── shared/
└── services/
    ├── frontend/
    ├── backend/
    └── shared/
```

### Monorepo (GitHub / Jira / ADO)

```
my-app/
├── .specweave/
│   └── docs/internal/projects/
│       ├── frontend/
│       ├── backend/
│       └── shared/
└── packages/
```

### Project-per-team (ADO / Jira recommended)

```
Organization: mycompany
├── AuthService
├── UserService
├── PaymentService
└── NotificationService

.specweave/docs/internal/specs/
├── AuthService/
├── UserService/
├── PaymentService/
└── NotificationService/
```

### Area-path-based (ADO) / Component-based (Jira)

```
Organization: enterprise
└── ERP (Project)
    ├── Finance
    ├── HR
    ├── Inventory
    └── Sales

.specweave/docs/internal/specs/ERP/
├── Finance/
├── HR/
├── Inventory/
└── Sales/
```

---

## GitHub (`--tool github`)

Merges the logic of the deprecated `sw:github-multi-project` skill.

### Task Splitting Example

**Increment**: Add shopping cart functionality

| Repository | Tasks |
|------------|-------|
| `my-app-frontend` | T-001 CartItem component, T-002 cart state, T-003 cart UI |
| `my-app-backend` | T-004 schema, T-005 API endpoints, T-006 validation |
| `my-app-shared` | T-007 types, T-008 utilities |

### Creating Repo-Specific Issues

```typescript
async function createRepoSpecificIssues(
  increment: Increment,
  distribution: Map<string, Task[]>
) {
  for (const [repo, tasks] of distribution) {
    const issue = await createGitHubIssue({
      repo,
      title: `[${increment.id}] ${increment.name} - ${repo}`,
      body: formatTasksAsChecklist(tasks),
      labels: ['specweave', 'increment', repo],
    });
  }
}
```

### GitHub Projects Integration

- Org-level Project spanning multiple repos (preferred)
- Or per-repo Projects (Frontend / Backend / Shared)

### GitHub Actions Sync

```yaml
name: SpecWeave Multi-Repo Sync
on:
  workflow_dispatch:
  schedule: [{ cron: '0 */6 * * *' }]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync to repositories
        run: |
          gh issue create --repo myorg/frontend ...
          gh issue create --repo myorg/backend ...
```

---

## Azure DevOps (`--tool ado`)

Merges the logic of the deprecated `sw:ado-multi-project` skill.

### Intelligent Project Detection

```typescript
const projectPatterns = {
  AuthService: {
    keywords: ['authentication', 'login', 'oauth', 'jwt', 'session'],
    filePatterns: ['auth/', 'login/', 'security/'],
  },
  UserService: {
    keywords: ['user', 'profile', 'account', 'registration'],
    filePatterns: ['users/', 'profiles/'],
  },
  PaymentService: {
    keywords: ['payment', 'stripe', 'billing', 'invoice'],
    filePatterns: ['payment/', 'billing/', 'checkout/'],
  },
};
```

**Confidence scoring**: keyword +0.2, file pattern +0.3, explicit mention +1.0, team mention +0.5. Threshold > 0.7 auto-assigns; otherwise prompts the user.

### Area-path Strategy

```bash
AZURE_DEVOPS_STRATEGY=area-path-based
AZURE_DEVOPS_PROJECT=ERP
AZURE_DEVOPS_AREA_PATHS=Finance,HR,Inventory
```

Creates `.specweave/docs/internal/specs/ERP/{AreaPath}/` folders and maps increments to `ERP\{AreaPath}`.

### Multi-project Work Items

A single increment spanning three ADO projects:

```
PaymentService  → Epic "Checkout Payment Processing" (primary)
UserService     → Feature "User Cart Management"     (linked)
NotificationService → Feature "Order Notifications"  (linked)
```

### metadata.yml example

```yaml
projects:
  primary: PaymentService
  dependencies:
    - UserService: [T-001, T-004]
    - NotificationService: [T-003]

ado_mappings:
  PaymentService:
    epic: 12345
    work_items: [12346, 12347]
  UserService:
    feature: 12348
    work_items: [12349, 12350]
```

### Sync Commands

```bash
sw:multi-project --tool ado sync-increment 0014
sw:multi-project --tool ado sync-spec AuthService/spec-001
sw:multi-project --tool ado sync-all
```

---

## Jira (`--tool jira`)

New in v1.2. Provides Jira-specific multi-project support using the `sw-jira` plugin.

### Jira Project Topologies

| Topology | Structure | Mapping |
|----------|-----------|---------|
| **Project-per-team** | Each team owns a Jira project | Increment → Epic in owning project |
| **Shared project + components** | One Jira project, many components | Increment → Epic tagged with component(s) |
| **Board-per-squad** | Multiple Scrum boards in one project | Increment → Epic linked to squad board |

### Creating Jira Epics and Stories

Use the `sw-jira` plugin. The skill coordinates which project/component the Epic lands in:

```bash
# Epic for an increment (primary project)
sw:jira-create --type epic --project PAY --summary "Checkout payment processing"

# Stories for each user story in the increment
sw:jira-create --type story --project PAY --epic-link PAY-101 --summary "US-001 Shopping cart API"
sw:jira-create --type story --project USR --epic-link PAY-101 --summary "US-002 User cart state"
sw:jira-create --type story --project NOT --epic-link PAY-101 --summary "US-003 Order notification email"
```

Each Story becomes a Jira issue in the right project; `--epic-link` preserves the cross-project relationship.

### metadata.yml example

```yaml
projects:
  primary: PAY
  dependencies:
    - USR: [T-001, T-004]
    - NOT: [T-003]

jira_mappings:
  PAY:
    epic: PAY-101
    stories: [PAY-102, PAY-103]
  USR:
    stories: [USR-045, USR-046]
  NOT:
    stories: [NOT-012]
```

### Component vs Project Decision

- **Separate projects** when teams have distinct workflows, permissions, or release cadence
- **Components in a single project** when teams share a board and backlog but need filtering

### Cross-project Epic Linking

Jira supports cross-project Epic links when the instance has the "Advanced Roadmaps" / "Jira Portfolio" add-on enabled. The skill detects availability and falls back to "related to" issue links when not present.

### Sync Commands

```bash
sw:multi-project --tool jira sync-increment 0014
sw:multi-project --tool jira sync-spec PaymentService/spec-001
sw:multi-project --tool jira sync-all
```

---

## Configuration

### `.specweave/config.json`

```json
{
  "integrations": {
    "primary": "github",
    "github": {
      "repositories": ["myorg/frontend", "myorg/backend", "myorg/shared"]
    },
    "ado": {
      "strategy": "project-per-team",
      "projects": ["AuthService", "UserService", "PaymentService"]
    },
    "jira": {
      "strategy": "project-per-team",
      "projects": ["PAY", "USR", "NOT"]
    }
  }
}
```

## Cross-project Queries

```typescript
async function getIncrementWorkItems(incrementId: string, tool: 'github' | 'ado' | 'jira') {
  const metadata = await readMetadata(incrementId);
  const key = `${tool}_mappings`;
  const workItems: unknown[] = [];
  for (const mapping of Object.values(metadata[key] ?? {})) {
    workItems.push(...(await fetchWorkItems(tool, mapping)));
  }
  return workItems;
}
```

## Best Practices

1. **Consistent naming** — `spec-001-oauth-authentication.md` across all tools
2. **Clear project boundaries** — document what each project owns and does not own
3. **Link related specs** — when an increment spans projects, include cross-links
4. **Use project prefixes** — `sw:increment "payment-stripe-integration"`

## Related Skills

- `sw:github-sync`, `sw:ado-sync`, `sw:jira-sync` — per-tool sync engines
- `sw:github-issue-standard` — GitHub issue formatting
- `sw:ado-mapper`, `sw:jira-mapper` — ID mapping utilities

---

**Skill Version**: 2.0.0 — unified multi-project skill (replaces `sw:github-multi-project` and `sw:ado-multi-project`)
**Introduced**: SpecWeave v1.2.0 (0669 Wave 4)
