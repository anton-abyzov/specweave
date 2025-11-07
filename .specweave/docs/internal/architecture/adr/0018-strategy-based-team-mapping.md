# ADR-0018: Strategy-Based Team Mapping for Issue Trackers

**Status**: ✅ Accepted
**Date**: 2025-11-07
**Deciders**: Anton Abyzov, SpecWeave Core Team
**Technical Story**: v0.9.0 - Jira and GitHub strategy support

---

## Context and Problem Statement

SpecWeave integrates with three issue trackers (Jira, GitHub, Azure DevOps), but organizations structure their teams differently across these platforms. A rigid "one-size-fits-all" approach fails to accommodate real-world organizational patterns.

**Key Challenges**:
1. GitHub: Teams use repository-per-team, monorepos, or complex multi-repo structures
2. Jira: Teams use separate projects, components, or board-based filtering
3. Azure DevOps: Fixed hierarchy (Org → Project → Teams) already implemented correctly
4. Need flexible folder mapping to `.specweave/docs/specs/` that adapts to each pattern

**Research Source**: 1350-line comparative analysis of ADO/Jira/GitHub team mapping patterns (provided by user).

---

## Decision Drivers

* **Flexibility**: Support diverse organizational structures
* **Clarity**: Explicit strategy selection prevents confusion
* **Scalability**: Handle enterprise-scale multi-team scenarios
* **Best Practices**: Align with industry-standard organizational patterns
* **Backward Compatibility**: Don't break existing projects
* **User Experience**: Interactive prompts guide users to correct strategy

---

## Considered Options

### Option 1: Single Fixed Structure (Status Quo - REJECTED)

**Approach**: Force all organizations into one pattern (e.g., one repo/project per team).

**Pros**:
- Simple implementation
- Easy to document

**Cons**:
- ❌ Doesn't match real-world usage
- ❌ Forces users to restructure their organizations
- ❌ Breaks for monorepos and platform teams
- ❌ Not enterprise-friendly

**Decision**: REJECTED - Too rigid for real-world scenarios.

---

### Option 2: Auto-Detection (REJECTED)

**Approach**: Automatically detect team structure by analyzing repositories/projects.

**Pros**:
- Zero configuration
- "Magic" user experience

**Cons**:
- ❌ Ambiguous in complex scenarios (is repo1 for team-A or shared?)
- ❌ Fails for edge cases (monorepo with multiple teams)
- ❌ No user control over mapping
- ❌ Difficult to debug when wrong

**Decision**: REJECTED - Too much ambiguity, lacks user control.

---

### Option 3: Strategy-Based Mapping (ACCEPTED ✅)

**Approach**: User explicitly selects organizational strategy during initialization, with interactive prompts guiding correct choice.

**Pros**:
- ✅ Explicit and unambiguous
- ✅ Supports all real-world patterns
- ✅ User maintains control
- ✅ Easy to understand and debug
- ✅ Aligns with best practices from research

**Cons**:
- Requires user to choose strategy (acceptable tradeoff for clarity)

**Decision**: **ACCEPTED** - Best balance of flexibility, clarity, and user control.

---

## Decision Outcome

Chosen option: **Strategy-Based Mapping** with 3 strategies for GitHub, 3 for Jira, and 1 for Azure DevOps (already correct).

---

## GitHub Strategies

### Strategy 1: Repository-per-Team (Default)

**Pattern**:
```
Organization
├── frontend-app (owned by Frontend Team)
├── backend-api (owned by Backend Team)
├── mobile-app (owned by Mobile Team)
└── qa-tools (owned by QA Team)
```

**Environment Variables**:
```bash
GITHUB_STRATEGY=repository-per-team
GITHUB_OWNER=myorg
GITHUB_REPOS=frontend-app,backend-api,mobile-app,qa-tools
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── frontend-app/
├── backend-api/
├── mobile-app/
└── qa-tools/
```

**Use Cases**:
- Microservices architecture
- Independent deployment cycles per team
- Clear ownership boundaries

**Real-World Examples**:
- Netflix (hundreds of microservices, team-per-service)
- Uber (service mesh with team ownership)
- Amazon (two-pizza teams with service ownership)

---

### Strategy 2: Team-Based (Monorepo)

**Pattern**:
```
Organization
└── main-product (shared repository)
    ├── /apps/web (Frontend Team)
    ├── /apps/api (Backend Team)
    ├── /apps/mobile (Mobile Team)
    └── /packages/shared (Platform Team)
```

**Environment Variables**:
```bash
GITHUB_STRATEGY=team-based
GITHUB_OWNER=myorg
GITHUB_REPO=main-product
GITHUB_TEAMS=frontend-team,backend-team,mobile-team,qa-team
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── frontend-team/
├── backend-team/
├── mobile-team/
└── qa-team/
```

**Use Cases**:
- Monorepo with Nx, Turborepo, Lerna
- Coordinated releases across teams
- Shared codebase with team boundaries

**Real-World Examples**:
- Google (massive monorepo with team ownership via OWNERS files)
- Microsoft (Windows codebase with team branches)
- Facebook/Meta (React monorepo with team boundaries)

---

### Strategy 3: Team-Multi-Repo (Platform Teams)

**Pattern**:
```
Organization
├── Platform Team:
│   ├── api-gateway
│   ├── auth-service
│   └── observability
└── Frontend Team:
    ├── web-app
    └── mobile-app
```

**Environment Variables**:
```bash
GITHUB_STRATEGY=team-multi-repo
GITHUB_OWNER=myorg
GITHUB_TEAM_REPO_MAPPING='{"platform-team":["api-gateway","auth-service","observability"],"frontend-team":["web-app","mobile-app"]}'
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── platform-team/
│   ├── api-gateway/
│   ├── auth-service/
│   └── observability/
└── frontend-team/
    ├── web-app/
    └── mobile-app/
```

**Use Cases**:
- Platform/infrastructure teams owning multiple services
- Cross-cutting concerns
- SRE teams with multiple tools

**Real-World Examples**:
- Spotify (platform squads owning infrastructure)
- Airbnb (infrastructure teams with multiple tools)

---

## Jira Strategies

### Strategy 1: Project-per-Team

**Pattern**:
```
Jira Instance
├── FRONTEND (project for Frontend Team)
├── BACKEND (project for Backend Team)
├── MOBILE (project for Mobile Team)
└── QA (project for QA Team)
```

**Environment Variables**:
```bash
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=FRONTEND,BACKEND,MOBILE,QA
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── FRONTEND/
├── BACKEND/
├── MOBILE/
└── QA/
```

**Use Cases**:
- Separate budgets per team
- Independent workflows per team
- Different permissions per team

**Real-World Examples**:
- Large enterprises with autonomous teams
- Agencies with client-based teams

---

### Strategy 2: Component-Based

**Pattern**:
```
Jira Instance
└── MAIN (single project)
    ├── Component: Frontend
    ├── Component: Backend
    ├── Component: Mobile
    └── Component: QA
```

**Environment Variables**:
```bash
JIRA_STRATEGY=component-based
JIRA_PROJECT=MAIN
JIRA_COMPONENTS=Frontend,Backend,Mobile,QA
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── Frontend/
├── Backend/
├── Mobile/
└── QA/
```

**Use Cases**:
- Unified reporting across teams
- Shared workflows
- Common project structure

**Real-World Examples**:
- Startups with cross-functional teams
- Product teams with shared backlogs

---

### Strategy 3: Board-Based

**Pattern**:
```
Jira Instance
└── MAIN (single project)
    ├── Board: Frontend (ID: 123, JQL filter)
    ├── Board: Backend (ID: 456, JQL filter)
    ├── Board: Mobile (ID: 789, JQL filter)
    └── Board: QA (ID: 101, JQL filter)
```

**Environment Variables**:
```bash
JIRA_STRATEGY=board-based
JIRA_PROJECT=MAIN
JIRA_BOARDS=123,456,789,101
```

**Folder Mapping** (derived from board names):
```
.specweave/docs/specs/
├── Frontend-Board/
├── Backend-Board/
├── Mobile-Board/
└── QA-Board/
```

**Use Cases**:
- Advanced JQL filtering
- Dynamic team membership
- Sprint-based workflows

**Real-World Examples**:
- Scrum teams with board-centric workflows
- Kanban teams with WIP limits

---

## Azure DevOps (No Strategy - Fixed Hierarchy)

**Pattern**:
```
Organization (e.g., "Contoso")
└── Project (e.g., "Product-A") ← ONE project per organization
    ├── Team: Frontend
    ├── Team: Backend
    ├── Team: Mobile
    └── Team: QA
```

**Environment Variables**:
```bash
AZURE_DEVOPS_PROJECT=Product-A
AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile,QA
```

**Folder Mapping**:
```
.specweave/docs/specs/
├── Frontend/
├── Backend/
├── Mobile/
└── QA/
```

**Key Insight**: Azure DevOps has a **fixed hierarchy** (Org → Project → Teams), so only one approach is valid. Teams are **first-class entities** in ADO, not simulated via projects/components/boards like Jira.

**Implementation**: Already correct in v0.8.21 (no changes needed).

---

## Implementation Details

### TypeScript Interfaces

```typescript
// Jira
export type JiraStrategy =
  | 'project-per-team'
  | 'component-based'
  | 'board-based';

export interface JiraCredentials {
  strategy?: JiraStrategy;
  projects?: string[];    // Strategy 1
  project?: string;       // Strategy 2 & 3
  components?: string[];  // Strategy 2
  boards?: string[];      // Strategy 3
}

// GitHub
export type GitHubStrategy =
  | 'repository-per-team'
  | 'team-based'
  | 'team-multi-repo';

export interface GitHubCredentials {
  strategy?: GitHubStrategy;
  owner?: string;
  repos?: string[];                    // Strategy 1
  repo?: string;                       // Strategy 2
  teams?: string[];                    // Strategy 2
  teamRepoMapping?: Record<string, string[]>;  // Strategy 3
}
```

### Environment Variable Parsing

**Jira**:
- `JIRA_STRATEGY` → Strategy type
- `JIRA_PROJECTS` → Comma-separated project keys (strategy 1)
- `JIRA_COMPONENTS` → Comma-separated component names (strategy 2)
- `JIRA_BOARDS` → Comma-separated board IDs (strategy 3)

**GitHub**:
- `GITHUB_STRATEGY` → Strategy type
- `GITHUB_REPOS` → Comma-separated repository names (strategy 1)
- `GITHUB_TEAMS` → Comma-separated team names (strategy 2)
- `GITHUB_TEAM_REPO_MAPPING` → JSON mapping (strategy 3)

**Azure DevOps** (no strategy):
- `AZURE_DEVOPS_PROJECT` → Single project name
- `AZURE_DEVOPS_TEAMS` → Comma-separated team names

### Interactive Prompts

```typescript
// Jira example
const { strategy } = await inquirer.prompt([{
  type: 'list',
  name: 'strategy',
  message: 'Select team mapping strategy:',
  choices: [
    { name: 'Project-per-team', value: 'project-per-team' },
    { name: 'Component-based', value: 'component-based' },
    { name: 'Board-based', value: 'board-based' }
  ]
}]);
```

---

## Consequences

### Positive

* ✅ **Flexibility**: Supports all real-world organizational patterns
* ✅ **Clarity**: Explicit strategy selection prevents misconfiguration
* ✅ **Scalability**: Handles enterprise-scale multi-team scenarios
* ✅ **Best Practices**: Aligns with industry-standard patterns
* ✅ **Backward Compatibility**: Legacy .env files still work
* ✅ **Enterprise-Ready**: Supports complex organizational structures

### Negative

* ⚠️ **User Choice Required**: Users must select strategy (acceptable tradeoff)
* ⚠️ **Documentation Burden**: Need comprehensive docs for all strategies
* ⚠️ **Validation Complexity**: Different validation per strategy

### Neutral

* ℹ️ **Migration Path**: Existing projects continue working without changes
* ℹ️ **Testing**: Each strategy requires separate integration tests

---

## Validation

### Acceptance Criteria

- [x] GitHub: 3 strategies implemented
- [x] Jira: 3 strategies implemented
- [x] Azure DevOps: Team-based structure verified (v0.8.21)
- [x] Interactive prompts guide users
- [x] Environment variables parsed correctly
- [x] Folder mapping works for all strategies
- [x] Backward compatibility maintained
- [x] TypeScript compilation succeeds
- [x] Smoke tests pass (19/19)
- [x] Documentation updated (Docusaurus, CHANGELOG, .env.example)

### Testing

**Unit Tests**:
- Credential parsing for all strategies
- Environment variable validation
- Folder mapping logic

**Integration Tests** (future):
- End-to-end init workflow for each strategy
- Sync increments with all strategies
- Cross-strategy migrations

**Manual Testing**:
- Interactive prompts for all strategies
- .env file generation
- Folder structure creation

---

## Related ADRs

- [ADR-0016: Multi-Project External Sync](0016-multi-project-external-sync.md) - Sync profiles architecture
- [ADR-0017: Multi-Project Internal Structure](0017-multi-project-internal-structure.md) - Internal folder organization

---

## References

* [1350-line ADO/Jira/GitHub Comparison](../../../increments/0012-multi-project-env-support/reports/ADO-Jira-GitHub-Team-Mapping-Comparison.md) (User-provided research)
* [Atlassian: Jira Components](https://support.atlassian.com/jira-software-cloud/docs/what-are-components/)
* [Microsoft: Azure DevOps Teams](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/about-teams-and-settings)
* [GitHub: Teams and Repositories](https://docs.github.com/en/organizations/organizing-members-into-teams)

---

## Notes

**Design Philosophy**: "Explicit is better than implicit" (Python Zen). Users should consciously choose their organizational pattern rather than having it inferred incorrectly.

**Future Enhancements**:
- Strategy migration tool (`specweave migrate-strategy`)
- Visual strategy selection with ASCII diagrams
- Strategy validation tool (`specweave validate-strategy`)
