# Tasks for Increment 0015: Hierarchical External Sync

---
increment: 0015-hierarchical-external-sync
total_tasks: 12
test_mode: TDD
coverage_target: 88%
---

## T-001: Update Sync Profile Types with Hierarchical Support
**User Story**: [US-001: Multi-Project Jira Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-001-multi-project-jira-sync-p1-testable.md)


**AC**: AC-US1-01, AC-US2-01, AC-US3-01

**Test Plan** (BDD format):
- **Given** existing SyncProfile type → **When** add SyncStrategy and SyncContainer → **Then** TypeScript compiles without errors
- **Given** config with strategy='filtered' and containers array → **When** parse config → **Then** returns valid SyncProfile object

**Test Cases**:
- Unit (`tests/unit/sync/sync-profile-types.test.ts`): parseSimpleStrategy, parseFilteredStrategy, parseCustomStrategy, validateMutualExclusion, backwardCompatibility → 92% coverage
- **Overall: 92% coverage**

**Implementation**:
- `src/core/types/sync-profile.ts`: Add SyncStrategy, SyncContainer, SyncContainerFilters types
- Update SyncProfile interface with strategy field and hierarchical config
- Add type guards (isSimpleStrategy, isFilteredStrategy, isCustomStrategy)

**Dependencies**: None

**Estimated Time**: 4 hours

---

## T-002: Update JSON Schema Validation
**User Story**: [US-001: Multi-Project Jira Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-001-multi-project-jira-sync-p1-testable.md)


**AC**: AC-US1-01, AC-US4-05

**Test Plan** (BDD format):
- **Given** sync profile JSON → **When** validate against schema → **Then** accepts valid profiles, rejects invalid ones
- **Given** profile with both 'container' and 'containers' → **When** validate → **Then** rejects (mutual exclusion)

**Test Cases**:
- Unit (`tests/unit/sync/sync-profile-schema.test.ts`): validateSimple, validateFiltered, validateCustom, rejectInvalidStrategy, rejectMutualExclusion, rejectMissingRequired → 90% coverage
- **Overall: 90% coverage**

**Implementation**:
- `src/core/schemas/sync-profile.schema.json`: Add strategy enum, containers array schema, customQuery string schema
- Add mutual exclusion validation (oneOf: container XOR containers XOR customQuery)
- Update schema version to 2.0

**Dependencies**: T-001

**Estimated Time**: 3 hours

---

## T-003: Implement Jira Board Resolution
**User Story**: [US-001: Multi-Project Jira Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-001-multi-project-jira-sync-p1-testable.md)


**AC**: AC-US1-02

**Test Plan** (BDD format):
- **Given** Jira project key → **When** fetch boards → **Then** returns list of boards with id, name, type
- **Given** board name → **When** resolve to board ID → **Then** returns correct board ID

**Test Cases**:
- Unit (`tests/unit/jira/board-resolution.test.ts`): fetchBoardsForProject, resolveBoardNameToId, handleNonExistentBoard → 88% coverage
- Integration (`tests/integration/jira/board-api.test.ts`): mockJiraAPI, fetchMultipleBoards, handleAPIError → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- `plugins/specweave-jira/lib/jira-board-resolver.ts` (NEW):
  - `fetchBoardsForProject(client, projectKey)` → calls `/rest/agile/1.0/board?projectKeyOrId={key}`
  - `resolveBoardNames(client, projectKey, boardNames)` → maps names to IDs

**Dependencies**: T-001, T-002

**Estimated Time**: 5 hours

---

## T-004: Implement Jira Hierarchical JQL Builder
**User Story**: [US-001: Multi-Project Jira Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-001-multi-project-jira-sync-p1-testable.md)


**AC**: AC-US1-01, AC-US1-03

**Test Plan** (BDD format):
- **Given** containers with projects and boards → **When** build JQL → **Then** generates correct hierarchical query
- **Given** containers with filters → **When** build JQL → **Then** includes filter clauses (labels, assignees)

**Test Cases**:
- Unit (`tests/unit/jira/jql-builder.test.ts`): buildSingleContainer, buildMultipleContainers, buildWithFilters, buildWithBoardFiltering, handleEmptySubOrgs → 94% coverage
- **Overall: 94% coverage**

**Implementation**:
- `plugins/specweave-jira/lib/jira-hierarchical-sync.ts` (NEW):
  - `buildHierarchicalJQL(containers)` → generates `(project=A AND board IN (...)) OR (project=B AND ...)`
  - `buildFilterClauses(filters)` → generates label, assignee, component filters
  - `combineWithTimeRange(jql, timeRange)` → adds time constraints

**Dependencies**: T-003

**Estimated Time**: 6 hours

---

## T-005: Implement Jira Hierarchical Sync
**User Story**: [US-001: Multi-Project Jira Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-001-multi-project-jira-sync-p1-testable.md)


**AC**: AC-US1-04

**Test Plan** (BDD format):
- **Given** profile with strategy='filtered' and 2 projects → **When** fetch issues → **Then** returns issues from both projects
- **Given** profile with board filtering → **When** fetch issues → **Then** returns only issues from specified boards

**Test Cases**:
- Unit (`tests/unit/jira/hierarchical-fetch.test.ts`): fetchSimple, fetchFiltered, fetchCustom, applyTimeRange → 90% coverage
- Integration (`tests/integration/jira/hierarchical-sync.test.ts`): mockMultiProject, mockBoardFiltering, mockLabelFiltering, verify50Issues → 88% coverage
- **Overall: 89% coverage**

**Implementation**:
- `plugins/specweave-jira/lib/jira-hierarchical-sync.ts`:
  - `fetchIssuesHierarchical(client, profile, timeRange)` → main entry point
  - Delegates to fetchSimple/fetchFiltered/fetchCustom based on strategy
  - Calls `buildHierarchicalJQL()` for filtered strategy

**Dependencies**: T-004

**Estimated Time**: 6 hours

---

## T-006: Implement GitHub Project Board Resolution
**User Story**: [US-002: Multi-Repo GitHub Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-002-multi-repo-github-sync-p1-testable.md)


**AC**: AC-US2-02

**Test Plan** (BDD format):
- **Given** GitHub repo (owner/repo) → **When** fetch project boards → **Then** returns list of project boards with id, title, url
- **Given** board title → **When** resolve to board ID → **Then** returns correct board ID

**Test Cases**:
- Unit (`tests/unit/github/board-resolution.test.ts`): fetchProjectBoardsForRepo, resolveBoardTitleToId, handleNonExistent → 88% coverage
- Integration (`tests/integration/github/board-api.test.ts`): mockGitHubGraphQL, fetchMultipleBoards → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- `plugins/specweave-github/lib/github-board-resolver.ts` (NEW):
  - `fetchProjectBoardsForRepo(client, owner, repo)` → GraphQL query: `repository.projectsV2.nodes`
  - `resolveBoardTitles(client, owner, repo, titles)` → maps titles to IDs

**Dependencies**: T-001, T-002

**Estimated Time**: 5 hours

---

## T-007: Implement GitHub Hierarchical Query Builder
**User Story**: [US-002: Multi-Repo GitHub Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-002-multi-repo-github-sync-p1-testable.md)


**AC**: AC-US2-01, AC-US2-03

**Test Plan** (BDD format):
- **Given** containers with repos → **When** build query → **Then** generates correct GitHub search query
- **Given** containers with label filters → **When** build query → **Then** includes label: clauses

**Test Cases**:
- Unit (`tests/unit/github/query-builder.test.ts`): buildSingleRepo, buildMultipleRepos, buildWithFilters, buildWithMilestones → 92% coverage
- **Overall: 92% coverage**

**Implementation**:
- `plugins/specweave-github/lib/github-hierarchical-sync.ts` (NEW):
  - `buildHierarchicalQuery(containers)` → generates `repo:owner/repo-a repo:owner/repo-b label:frontend`
  - `buildFilterClauses(filters)` → adds label, milestone, assignee filters
  - `combineWithTimeRange(query, timeRange)` → adds created/updated constraints

**Dependencies**: T-006

**Estimated Time**: 5 hours

---

## T-008: Implement GitHub Hierarchical Sync
**User Story**: [US-002: Multi-Repo GitHub Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-002-multi-repo-github-sync-p1-testable.md)


**AC**: AC-US2-04

**Test Plan** (BDD format):
- **Given** profile with strategy='filtered' and 2 repos → **When** fetch issues → **Then** returns issues from both repos
- **Given** profile with label filtering → **When** fetch issues → **Then** returns only issues with specified labels

**Test Cases**:
- Unit (`tests/unit/github/hierarchical-fetch.test.ts`): fetchSimple, fetchFiltered, fetchCustom → 90% coverage
- Integration (`tests/integration/github/hierarchical-sync.test.ts`): mockMultiRepo, mockLabelFiltering, verify30Issues → 88% coverage
- **Overall: 89% coverage**

**Implementation**:
- `plugins/specweave-github/lib/github-hierarchical-sync.ts`:
  - `fetchIssuesHierarchical(client, profile, timeRange)` → main entry point
  - Delegates based on strategy
  - Calls `buildHierarchicalQuery()` for filtered strategy

**Dependencies**: T-007

**Estimated Time**: 5 hours

---

## T-009: Implement ADO Area Path Resolution
**User Story**: [US-003: Multi-Project ADO Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-003-multi-project-ado-sync-p1-testable.md)


**AC**: AC-US3-02

**Test Plan** (BDD format):
- **Given** ADO project → **When** fetch area paths → **Then** returns hierarchical list (e.g., ["Platform", "Platform\\Core"])
- **Given** area path string → **When** validate → **Then** confirms existence

**Test Cases**:
- Unit (`tests/unit/ado/area-path-resolution.test.ts`): fetchAreaPaths, validateAreaPath, handleNonExistent → 88% coverage
- Integration (`tests/integration/ado/area-path-api.test.ts`): mockADOAPI, fetchHierarchy → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- `plugins/specweave-ado/lib/ado-area-path-resolver.ts` (NEW):
  - `fetchAreaPathsForProject(client, project)` → calls `/_apis/wit/classificationnodes/Areas?$depth=2`
  - `resolveAreaPaths(client, project, paths)` → validates paths exist

**Dependencies**: T-001, T-002

**Estimated Time**: 5 hours

---

## T-010: Implement ADO Hierarchical WIQL Builder
**User Story**: [US-003: Multi-Project ADO Sync (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-003-multi-project-ado-sync-p1-testable.md)


**AC**: AC-US3-01, AC-US3-03

**Test Plan** (BDD format):
- **Given** containers with projects and area paths → **When** build WIQL → **Then** generates correct hierarchical query
- **Given** containers with work item type filters → **When** build WIQL → **Then** includes type constraints

**Test Cases**:
- Unit (`tests/unit/ado/wiql-builder.test.ts`): buildSingleProject, buildMultipleProjects, buildWithAreaPaths, buildWithFilters → 92% coverage
- **Overall: 92% coverage**

**Implementation**:
- `plugins/specweave-ado/lib/ado-hierarchical-sync.ts` (NEW):
  - `buildHierarchicalWIQL(containers)` → generates `SELECT * FROM WorkItems WHERE ([System.TeamProject] = 'A' AND [System.AreaPath] UNDER 'A\\Platform') OR ...`
  - `buildFilterClauses(filters)` → adds work item type, iteration path filters
  - `combineWithTimeRange(wiql, timeRange)` → adds time constraints

**Dependencies**: T-009

**Estimated Time**: 6 hours

---

## T-011: Implement Init Wizard Enhancement
**User Story**: [US-004: Init Wizard Enhancement (P1, testable)](../../docs/internal/specs/default/hierarchical-external-sync/us-004-init-wizard-enhancement-p1-testable.md)


**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05

**Test Plan** (BDD format):
- **Given** user runs `specweave init` → **When** selects Filtered strategy → **Then** shows container multi-select
- **Given** user selects 2 containers → **When** proceeds → **Then** shows sub-org multi-select for each container
- **Given** user completes wizard → **When** config generated → **Then** config.json has correct structure

**Test Cases**:
- Unit (`tests/unit/cli/init-wizard.test.ts`): selectStrategy, selectContainers, selectSubOrgs, configureFilters, generateConfig → 90% coverage
- E2E (`tests/e2e/init-wizard-hierarchical.spec.ts`): simpleStrategy, filteredStrategy, customStrategy, verifyConfigJSON → 100% coverage (critical path)
- **Overall: 92% coverage**

**Implementation**:
- `src/cli/commands/init-hierarchical.ts` (NEW):
  - `selectSyncStrategy()` → 3 choices: Simple, Filtered, Custom
  - `selectContainers(provider, client)` → multi-select for projects/repos
  - `selectSubOrganizations(provider, client, containerId)` → multi-select for boards/area paths
  - `configureFilters(provider)` → optional filter configuration
  - `generateHierarchicalConfig(provider, strategy, client)` → generates SyncProfile
- `src/cli/commands/init.ts` (UPDATE):
  - Call `generateHierarchicalConfig()` instead of simple flow
  - Detect provider and delegate to hierarchical wizard

**Dependencies**: T-005, T-008, T-010

**Estimated Time**: 8 hours

---

## T-012: Create Public Documentation
**User Story**: [US-005: Public Documentation (P1, manual validation)](../../docs/internal/specs/default/hierarchical-external-sync/us-005-public-documentation-p1-manual-validation.md)


**AC**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05

**Test Plan** (Manual validation):
- **Given** user visits spec-weave.com/guides/external-sync → **When** reads overview → **Then** understands 3 strategies
- **Given** user needs Jira setup → **When** follows jira/hierarchical.md → **Then** successfully configures multi-project sync
- **Given** user has questions → **When** checks troubleshooting → **Then** finds answers

**Validation**:
- Manual review: All docs readable, examples correct, links work → 100% manual validation
- Build check: `cd docs-site && npm run build` → 100% success (no broken links)
- Link checker: Verify all internal links resolve

**Implementation**:
- `docs-site/docs/guides/external-sync/overview.md`: 3 strategies explained, decision tree
- `docs-site/docs/guides/external-sync/sync-strategies.md`: When to use each strategy
- `docs-site/docs/guides/external-sync/jira/setup.md`: Init wizard walkthrough
- `docs-site/docs/guides/external-sync/jira/hierarchical.md`: Multi-project + board examples (generic terms)
- `docs-site/docs/guides/external-sync/jira/jql-examples.md`: Custom JQL patterns
- `docs-site/docs/guides/external-sync/jira/troubleshooting.md`: Common issues
- `docs-site/docs/guides/external-sync/github/setup.md`: Init wizard walkthrough
- `docs-site/docs/guides/external-sync/github/multi-repo.md`: Multiple repos + boards examples
- `docs-site/docs/guides/external-sync/github/graphql-examples.md`: Custom query patterns
- `docs-site/docs/guides/external-sync/ado/setup.md`: Init wizard walkthrough
- `docs-site/docs/guides/external-sync/ado/area-paths.md`: Area path filtering examples
- `docs-site/docs/guides/external-sync/ado/wiql-examples.md`: Custom WIQL patterns
- Update `docs-site/sidebars.js`: Add external-sync category

**Dependencies**: T-011

**Estimated Time**: 12 hours

---

## Summary

**Total Tasks**: 12
**Total Estimated Time**: 70 hours (~2 weeks with 1 developer)
**Coverage Target**: 88% overall
- Unit tests: 90%+
- Integration tests: 86%+
- E2E tests: 100% (critical path)

**Task Dependencies**:
```
T-001 (Types) → T-002 (Schema)
  ↓
T-003 (Jira Board Resolve) → T-004 (Jira JQL) → T-005 (Jira Sync)
T-006 (GitHub Board Resolve) → T-007 (GitHub Query) → T-008 (GitHub Sync)
T-009 (ADO Area Paths) → T-010 (ADO WIQL) → [ADO Sync implicit in T-010]
  ↓
T-011 (Init Wizard) → T-012 (Docs)
```

**Critical Path**: T-001 → T-002 → T-011 → T-012 (core wizard + docs)
**Parallel Work**: Jira (T-003→T-005), GitHub (T-006→T-008), ADO (T-009→T-010) can be done concurrently
