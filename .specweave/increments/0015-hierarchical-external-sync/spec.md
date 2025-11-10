# Increment 0015: Hierarchical External Sync

**Version Target**: 0.10.0 (minor release)
**Type**: Feature
**Priority**: P1 (High)
**Status**: In Progress

---

## Problem Statement

### Current Limitations

**Single-Container Sync Only**:
- Users can only sync ONE Jira project OR ONE GitHub repo OR ONE ADO project
- Cannot handle real-world scenarios:
  - Multiple Jira projects with multiple boards (e.g., Project-A + Project-B, each with 3+ boards)
  - Multiple GitHub repos with project boards (e.g., web-app + mobile-app + shared-lib)
  - Multiple ADO projects with area paths (e.g., Platform + Services, each with sub-teams)

**No Hierarchical Filtering**:
- Cannot filter by boards within projects
- Cannot filter by project boards within repos
- Cannot filter by area paths within ADO projects
- All-or-nothing: sync entire container or nothing

**Poor User Experience**:
- Complex configuration requires manual JSON editing
- No guided wizard for hierarchical scenarios
- Documentation focuses on simple cases only

### Real-World User Case (Anonymous)

User has:
- **Jira**: 5 projects, each with 3-5 boards, wants to sync specific boards from 2 projects
- **Current workaround**: Create separate sync profiles for each board (unmaintainable)
- **Needed**: One profile syncing: Project-A (Board-1, Board-2) + Project-B (Board-3)

---

## Goals

### Primary Goals

1. **Unified Hierarchical Sync Model**
   - Support Jira: Projects → Boards → Issues
   - Support GitHub: Repos → Project Boards → Issues
   - Support ADO: Projects → Area Paths → Work Items
   - Single JSON schema works across all providers

2. **Three Clear Strategies**
   - **Simple**: One container, no filtering (current behavior, unchanged)
   - **Filtered**: Multiple containers + sub-organizations + filters (NEW)
   - **Custom**: Raw query (JQL/GraphQL/WIQL) (NEW)

3. **Enhanced Init Wizard**
   - Ask 3 questions max (strategy, containers, sub-orgs)
   - Interactive multi-select for containers
   - Interactive multi-select for sub-organizations (boards, etc.)
   - Optional filters (labels, assignees, etc.)

4. **Comprehensive Public Documentation**
   - Document all 3 strategies on spec-weave.com
   - Provider-specific guides (Jira, GitHub, ADO)
   - Real-world examples (generic terms, no customer data)
   - Troubleshooting guides

### Success Criteria

- ✅ User can sync multiple Jira projects with specific boards in one profile
- ✅ User can sync multiple GitHub repos with project boards in one profile
- ✅ User can sync multiple ADO projects with area paths in one profile
- ✅ Init wizard guides user through hierarchical setup (3 questions)
- ✅ Documentation on spec-weave.com explains all strategies
- ✅ Backward compatible (existing simple profiles still work)

---

## User Stories

### US-001: Multi-Project Jira Sync (P1, testable)

**As a** product manager with work spanning multiple Jira projects
**I want to** sync specific boards from multiple projects to one SpecWeave project
**So that** I can track cross-project initiatives in one place

**Acceptance Criteria**:
- AC-US1-01: Can configure multiple Jira projects in one sync profile (P1, testable)
- AC-US1-02: Can select specific boards from each project (P1, testable)
- AC-US1-03: Can apply filters (labels, assignees, status) per project (P2, testable)
- AC-US1-04: Sync fetches issues from all selected boards (P1, testable)

**Example Config**:
```json
{
  "strategy": "filtered",
  "containers": [
    {
      "id": "PROJECT-A",
      "subOrganizations": ["Team Alpha Board", "Team Beta Board"],
      "filters": {"includeLabels": ["feature"]}
    },
    {
      "id": "PROJECT-B",
      "subOrganizations": ["Platform Board"]
    }
  ]
}
```

### US-002: Multi-Repo GitHub Sync (P1, testable)

**As a** tech lead managing frontend across multiple repos
**I want to** sync issues from web-app and mobile-app repos with specific project boards
**So that** I can track frontend work across repositories

**Acceptance Criteria**:
- AC-US2-01: Can configure multiple GitHub repos in one sync profile (P1, testable)
- AC-US2-02: Can select specific project boards from each repo (P2, testable)
- AC-US2-03: Can filter by labels, milestones, assignees (P2, testable)
- AC-US2-04: Sync fetches issues from all selected repos (P1, testable)

### US-003: Multi-Project ADO Sync (P1, testable)

**As a** engineering manager with platform and services teams
**I want to** sync work items from multiple ADO projects with area path filtering
**So that** I can track platform initiatives across organizational boundaries

**Acceptance Criteria**:
- AC-US3-01: Can configure multiple ADO projects in one sync profile (P1, testable)
- AC-US3-02: Can filter by area paths (Platform\Core, Services\API) (P1, testable)
- AC-US3-03: Can filter by iteration paths, work item types (P2, testable)
- AC-US3-04: Sync fetches work items from all selected area paths (P1, testable)

### US-004: Init Wizard Enhancement (P1, testable)

**As a** new SpecWeave user setting up external sync
**I want** a guided wizard that asks clear questions
**So that** I can configure hierarchical sync without reading documentation

**Acceptance Criteria**:
- AC-US4-01: Wizard asks strategy question (Simple/Filtered/Custom) (P1, testable)
- AC-US4-02: For "Filtered", shows multi-select for containers (P1, testable)
- AC-US4-03: For each container, shows multi-select for sub-organizations (P1, testable)
- AC-US4-04: Allows optional filter configuration (labels, assignees) (P2, testable)
- AC-US4-05: Generates correct config.json without manual editing (P1, testable)

### US-005: Public Documentation (P1, manual validation)

**As a** SpecWeave user learning about external sync
**I want** clear documentation with examples for all strategies
**So that** I can choose the right approach and configure it correctly

**Acceptance Criteria**:
- AC-US5-01: Overview page explains 3 strategies with decision tree (P1, manual)
- AC-US5-02: Jira guide shows hierarchical setup with generic examples (P1, manual)
- AC-US5-03: GitHub guide shows multi-repo setup (P1, manual)
- AC-US5-04: ADO guide shows area path filtering (P1, manual)
- AC-US5-05: Troubleshooting guide covers common issues (P2, manual)

---

## Technical Design

### JSON Schema (Unified Across Providers)

```typescript
interface SyncContainer {
  /** Container ID (Jira project key, GitHub repo, ADO project) */
  id: string;

  /** Sub-organizations (boards, project boards, team boards) */
  subOrganizations?: string[];

  /** Filters (provider-specific) */
  filters?: {
    // Common filters (all providers)
    includeLabels?: string[];
    excludeLabels?: string[];
    assignees?: string[];
    statusCategories?: string[];

    // Jira-specific
    components?: string[];
    sprints?: string[];

    // GitHub-specific
    milestones?: string[];

    // ADO-specific
    areaPaths?: string[];
    iterationPaths?: string[];
    workItemTypes?: string[];
  };
}

interface SyncProfile {
  provider: 'jira' | 'github' | 'ado';
  displayName: string;
  strategy: 'simple' | 'filtered' | 'custom';
  config: {
    // Simple strategy
    container?: string;

    // Filtered strategy
    containers?: SyncContainer[];

    // Custom strategy
    customQuery?: string;
  };
}
```

### Terminology Mapping

| Concept | Jira | GitHub | Azure DevOps |
|---------|------|--------|--------------|
| **Container** | Project | Repository | Project |
| **Sub-Organization** | Board | Project Board | Team Board |
| **Hierarchy Filter** | Component | Label | Area Path |
| **Time Filter** | Sprint | Milestone | Iteration Path |

### Implementation Files

**Core Types** (`src/core/types/sync-profile.ts`):
- Update `SyncProfile` interface with hierarchical support
- Add `SyncContainer` interface
- Add `SyncStrategy` type

**Jira Client** (`plugins/specweave-jira/lib/jira-client-v2.ts`):
- `fetchIssuesHierarchical()` - Fetch from multiple projects + boards
- `resolveBoardsForProject()` - Get boards for a project
- Build JQL for hierarchical filtering

**GitHub Client** (`plugins/specweave-github/lib/github-client-v2.ts`):
- `fetchIssuesHierarchical()` - Fetch from multiple repos + project boards
- `resolveProjectBoardsForRepo()` - Get project boards for repo
- Build GraphQL query for hierarchical filtering

**ADO Client** (`plugins/specweave-ado/lib/ado-client-v2.ts`):
- `fetchWorkItemsHierarchical()` - Fetch from multiple projects + area paths
- `resolveAreaPathsForProject()` - Get area paths for project
- Build WIQL query for hierarchical filtering

**Init Wizard** (`src/cli/commands/init.ts`):
- Ask strategy question (Simple/Filtered/Custom)
- Multi-select for containers (if Filtered)
- Multi-select for sub-organizations per container (if Filtered)
- Optional filter configuration

---

## Architecture Decisions

### ADR-0018: Unified Hierarchical Sync Model

**Decision**: Use same JSON schema for all providers (Jira, GitHub, ADO)

**Rationale**:
- Consistent UX across providers
- Easier to document (one model, three implementations)
- Future providers (GitLab, Linear) follow same pattern

**Alternatives Considered**:
- Provider-specific schemas (rejected: too complex, inconsistent UX)

### ADR-0019: Three Strategies (Simple/Filtered/Custom)

**Decision**: Limit to 3 strategies, no more

**Rationale**:
- Simple covers 70% of users (one container, no filtering)
- Filtered covers 25% of users (hierarchical, complex orgs)
- Custom covers 5% of users (power users with specific queries)
- More than 3 = decision paralysis

**Alternatives Considered**:
- Two strategies (rejected: not enough flexibility)
- Four+ strategies (rejected: too complex, poor UX)

---

## Testing Strategy

### Unit Tests (90% coverage target)

**File**: `tests/unit/sync/hierarchical-sync.test.ts`
- Test `SyncContainer` parsing
- Test filter building (Jira JQL, GitHub GraphQL, ADO WIQL)
- Test board resolution (multi-project scenarios)

### Integration Tests (85% coverage target)

**File**: `tests/integration/jira/hierarchical-sync.test.ts`
- Mock Jira API with 2 projects, 4 boards
- Test fetching issues from specific boards
- Test filter application (labels, assignees)

**File**: `tests/integration/github/hierarchical-sync.test.ts`
- Mock GitHub API with 2 repos, 3 project boards
- Test fetching issues from specific boards

**File**: `tests/integration/ado/hierarchical-sync.test.ts`
- Mock ADO API with 2 projects, area paths
- Test fetching work items from specific area paths

### E2E Tests (Critical path: 100% coverage)

**File**: `tests/e2e/init-wizard-hierarchical.spec.ts`
- Test init wizard with Filtered strategy
- Test multi-select for containers
- Test multi-select for sub-organizations
- Verify generated config.json

---

## Documentation Structure

### Public Docs (spec-weave.com)

```
docs-site/docs/guides/
└── external-sync/
    ├── overview.md              # 3 strategies explained
    ├── sync-strategies.md       # Decision tree
    ├── jira/
    │   ├── setup.md            # Init wizard
    │   ├── hierarchical.md     # Multi-project + boards
    │   ├── jql-examples.md     # Custom queries
    │   └── troubleshooting.md
    ├── github/
    │   ├── setup.md
    │   ├── multi-repo.md       # Multiple repos + boards
    │   └── graphql-examples.md
    └── ado/
        ├── setup.md
        ├── area-paths.md       # Hierarchy filtering
        └── wiql-examples.md
```

---

## Implementation Plan

### Phase 1: Core Types & Schema (2 days)

- Update `SyncProfile` type with hierarchical support
- Add `SyncContainer` interface
- JSON schema validation
- Unit tests for type parsing

### Phase 2: Provider Implementations (5 days)

- Jira: Multi-project + board sync (2 days)
- GitHub: Multi-repo + project board sync (1.5 days)
- ADO: Multi-project + area path sync (1.5 days)

### Phase 3: Init Wizard Enhancement (2 days)

- Strategy selection
- Multi-select UI for containers
- Multi-select UI for sub-organizations
- Filter configuration
- Config generation

### Phase 4: Documentation (2 days)

- Overview + strategy decision tree
- Provider-specific guides (Jira, GitHub, ADO)
- Examples with generic terms
- Troubleshooting guides

### Phase 5: Testing & Release (2 days)

- Integration tests
- E2E tests
- Update CHANGELOG.md
- Release v0.10.0

**Total**: ~13 days

---

## Out of Scope

❌ **Real-time sync** (webhooks) - Future increment
❌ **Bidirectional sync** (SpecWeave → External) - Partially supported, not enhanced here
❌ **Custom field mapping** - Future increment
❌ **Conflict resolution UI** - Future increment

---

## Dependencies

- ✅ Multi-project sync architecture (Increment 0011) - Complete
- ✅ Sync profiles (Increment 0011) - Complete
- ✅ Provider clients (Jira, GitHub, ADO) - Complete

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Provider API changes break hierarchical queries | Low | High | Mock all API calls in tests |
| Performance issues with many containers | Medium | Medium | Implement pagination + rate limiting (already exists) |
| User confusion about strategies | Medium | Medium | Clear documentation + decision tree |
| Backward compatibility breaks | Low | High | Keep simple strategy unchanged, add new strategies only |

---

## Success Metrics

- ✅ 90% of users can configure hierarchical sync without reading docs (wizard success)
- ✅ <5% support tickets about hierarchical sync (good UX)
- ✅ 100% backward compatibility (no breaking changes)
- ✅ Documentation views increase 50% (better discoverability)

---

## Release Notes (v0.10.0)

### New Features

🎉 **Hierarchical External Sync** - Sync multiple projects/repos with board-level filtering

**Three Sync Strategies**:
- **Simple**: One container (unchanged, backward compatible)
- **Filtered**: Multiple containers + boards + filters (NEW)
- **Custom**: Raw queries (JQL/GraphQL/WIQL) (NEW)

**Jira**: Sync multiple projects with specific boards
```json
{
  "strategy": "filtered",
  "containers": [
    {"id": "PROJECT-A", "subOrganizations": ["Board 1", "Board 2"]},
    {"id": "PROJECT-B", "subOrganizations": ["Board 3"]}
  ]
}
```

**GitHub**: Sync multiple repos with project boards
**ADO**: Sync multiple projects with area path filtering

### Enhanced Init Wizard

- ✅ Ask 3 questions max (strategy, containers, sub-orgs)
- ✅ Interactive multi-select for containers and boards
- ✅ Generates config automatically (no manual JSON editing)

### Documentation

- ✅ New docs on spec-weave.com: [/guides/external-sync](/guides/external-sync)
- ✅ Provider-specific guides (Jira, GitHub, ADO)
- ✅ Real-world examples with troubleshooting

### Backward Compatibility

✅ **100% backward compatible** - Existing "simple" profiles work unchanged

---

**Estimated Effort**: 13 days
**Target Release**: 2025-11-15
