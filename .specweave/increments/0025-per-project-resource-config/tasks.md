---
increment: 0025-per-project-resource-config
total_tasks: 15
completed_tasks: 0
test_mode: standard
coverage_target: 87%
---

# Implementation Tasks

## T-001: Add per-project config parsing methods to AzureDevOpsResourceValidator

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** ADO project "Backend" with env var `AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache`
- **When** validator parses environment variables
- **Then** config map contains Backend → ["API", "Database", "Cache"]
- **And** fallback to global config if per-project var missing

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/config-parsing.test.ts`
   - testParsePerProjectAreaPathsValid(): Valid per-project area paths parsed correctly
   - testParsePerProjectAreaPathsEmpty(): Empty resource lists handled gracefully
   - testParsePerProjectAreaPathsMultiple(): Multiple projects with different area paths
   - testParsePerProjectTeamsValid(): Valid per-project teams parsed correctly
   - testResolveAreaPathsPerProject(): Per-project config takes precedence over global
   - testResolveAreaPathsGlobalFallback(): Falls back to global config when per-project missing
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Add `parsePerProjectAreaPaths()` private method to `AzureDevOpsResourceValidator` class
   - Use regex pattern `/^AZURE_DEVOPS_AREA_PATHS_(.+)$/` to match env vars
   - Parse comma-separated values, trim whitespace
   - Return `Map<string, string[]>`
3. Add `parsePerProjectTeams()` private method
   - Use regex pattern `/^AZURE_DEVOPS_TEAMS_(.+)$/`
   - Same parsing logic as area paths
4. Add `resolveAreaPathsForProject(projectName, perProjectConfig, globalConfig)` method
   - Check per-project config first
   - Fallback to global config if missing
   - Return string array
5. Add `resolveTeamsForProject()` method (same logic as area paths)
6. Create test file: `tests/unit/external-resource-validator/config-parsing.test.ts`
7. Write 6 unit tests covering parsing and resolution
8. Run tests: `npm test config-parsing.test` (should pass: 6/6)
9. Verify coverage: `npm run coverage -- --include=src/utils/external-resource-validator.ts` (should be ≥95%)

---

## T-002: Add per-project config parsing methods to JiraResourceValidator

**User Story**: US-003
**Acceptance Criteria**: AC-US3-01, AC-US3-02
**Priority**: P0
**Estimate**: 1.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** JIRA project "BACKEND" with env var `JIRA_BOARDS_BACKEND=123,456`
- **When** validator parses environment variables
- **Then** config map contains BACKEND → ["123", "456"]
- **And** supports both numeric IDs and board names

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/config-parsing.test.ts`
   - testParsePerProjectBoardsNumeric(): Board IDs parsed correctly
   - testParsePerProjectBoardsMixed(): Mixed IDs and names supported
   - testResolveBoardsPerProject(): Per-project boards take precedence
   - testResolveBoardsGlobalFallback(): Falls back to global boards
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Add `parsePerProjectBoards()` private method to `JiraResourceValidator` class
   - Use regex pattern `/^JIRA_BOARDS_(.+)$/`
   - Parse comma-separated values (can be IDs or names)
   - Return `Map<string, string[]>`
3. Add `resolveBoardsForProject(projectKey, perProjectConfig, globalConfig)` method
   - Check per-project config first
   - Fallback to global config if missing
4. Add tests to existing `config-parsing.test.ts`
5. Write 4 unit tests for JIRA board parsing
6. Run tests: `npm test config-parsing.test` (should pass: 10/10 total)
7. Verify coverage: `npm run coverage -- --include=src/utils/external-resource-validator.ts` (should be ≥95%)

---

## T-003: Add ADO area path validation and creation methods

**User Story**: US-001
**Acceptance Criteria**: AC-US1-03, AC-US1-04
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** ADO project "Backend" with area path "API" that doesn't exist
- **When** validator checks and creates area path
- **Then** API call made to check existence (404 = not found)
- **And** if not found, POST request creates area path
- **And** success message logged

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/ado-validation.test.ts`
   - testCheckAreaPathExists(): Returns true when area path exists
   - testCheckAreaPathNotFound(): Returns false when area path doesn't exist (404)
   - testCreateAreaPathSuccess(): Successfully creates area path via API
   - testCreateAreaPathError(): Handles API errors gracefully
   - testCheckTeamExists(): Returns true when team exists
   - testCheckTeamNotFound(): Returns false when team doesn't exist (404)
   - testCreateTeamSuccess(): Successfully creates team via API
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Add `checkAreaPath(projectName: string, areaPath: string): Promise<boolean>` method
   - Use Azure DevOps REST API v7.0
   - Endpoint: `{projectName}/_apis/wit/classificationnodes/areas/${areaPath}?api-version=7.0`
   - Return true if 200, false if 404, throw on other errors
3. Add `createAreaPath(projectName: string, areaPath: string): Promise<void>` method
   - POST to `{projectName}/_apis/wit/classificationnodes/areas?api-version=7.0`
   - Body: `{ "name": areaPath }`
   - Log success/error messages with chalk
4. Add `checkTeam(projectName: string, teamName: string): Promise<boolean>` method
   - Endpoint: `projects/${projectName}/teams/${teamName}?api-version=7.0`
   - Same logic as checkAreaPath
5. Add `createTeam(projectName: string, teamName: string): Promise<void>` method
   - POST to `projects/${projectName}/teams?api-version=7.0`
   - Body: `{ "name": teamName }`
6. Create test file: `tests/unit/external-resource-validator/ado-validation.test.ts`
7. Write 7 unit tests with mocked API responses
8. Run tests: `npm test ado-validation.test` (should pass: 7/7)
9. Verify coverage: `npm run coverage` (should be ≥90%)

---

## T-004: Enhance ADO validateMultipleProjects() with per-project logic

**User Story**: US-001, US-002
**Acceptance Criteria**: AC-US1-04, AC-US2-03
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-001, T-003

**Test Plan**:
- **Given** 2 projects: Backend (area paths: API,DB) and Frontend (area paths: Web)
- **When** validateMultipleProjects() runs
- **Then** each project validated with correct area paths
- **And** missing area paths auto-created
- **And** validation result contains all projects, area paths, teams

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/ado-validation.test.ts`
   - testValidateMultipleProjectsWithPerProjectAreaPaths(): Per-project area paths validated correctly
   - testValidateMultipleProjectsWithPerProjectTeams(): Per-project teams validated correctly
   - testValidateMultipleProjectsWithGlobalFallback(): Falls back to global config when needed
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/external-resource-validator/ado.test.ts`
   - testEndToEndADOValidation(): Full validation flow with real API (test org)
   - testMultiProjectAreaPathCreation(): Create area paths for multiple projects
   - testMultiProjectTeamCreation(): Create teams for multiple projects
   - **Coverage Target**: 80%

**Overall Coverage Target**: 87%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Locate `validateMultipleProjects()` in `AzureDevOpsResourceValidator`
3. Add per-project config parsing at the start:
   ```typescript
   const perProjectAreaPaths = this.parsePerProjectAreaPaths();
   const perProjectTeams = this.parsePerProjectTeams();
   const env = this.loadEnv();
   const globalAreaPaths = env.AZURE_DEVOPS_AREA_PATHS?.split(',').map(p => p.trim()) || [];
   const globalTeams = env.AZURE_DEVOPS_TEAMS?.split(',').map(t => t.trim()) || [];
   ```
4. For each project, add area path validation loop:
   - Resolve area paths: `this.resolveAreaPathsForProject(projectName, perProjectAreaPaths, globalAreaPaths)`
   - For each area path: check existence, create if missing
   - Collect results in `result.areaPaths`
5. Add team validation loop (same pattern)
6. Add logging with chalk (blue for info, green for success, yellow for warnings)
7. Add 3 unit tests to existing `ado-validation.test.ts`
8. Create `tests/integration/external-resource-validator/ado.test.ts`
9. Write 3 integration tests (requires ADO test org setup)
10. Run tests: `npm test ado-validation.test` (should pass: 10/10)
11. Run integration tests: `npm run test:integration -- ado.test` (should pass: 3/3)

---

## T-005: Add JIRA board validation and creation methods

**User Story**: US-003, US-004
**Acceptance Criteria**: AC-US3-02, AC-US4-01, AC-US4-02
**Priority**: P0
**Estimate**: 2.5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** JIRA project "BACKEND" with board "Sprint Board" that doesn't exist
- **When** validator checks board and prompts user to create
- **Then** board check API call made (by ID or name)
- **And** if not found, prompt user for board type (Scrum/Kanban)
- **And** create filter first, then create board
- **And** return created board object with ID

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/jira-validation.test.ts`
   - testCheckBoardByIdExists(): Returns board when ID exists
   - testCheckBoardByNameExists(): Returns board when name matches
   - testCheckBoardNotFound(): Returns null when board doesn't exist
   - testCreateBoardScrum(): Creates Scrum board successfully
   - testCreateBoardKanban(): Creates Kanban board successfully
   - testCreateBoardFilterSuccess(): Creates filter for board
   - testPromptSelectBoard(): Prompts user to select from existing boards
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Enhance `checkBoard(boardIdOrName: string): Promise<JiraBoard | null>` method
   - If numeric: GET `board/${boardId}`
   - If string: GET `board?name=${encodeURIComponent(boardName)}`
   - Return board object `{ id, name, type }` or null
3. Add `createBoardFilter(projectKey: string, boardName: string): Promise<any>` private method
   - POST to `filter`
   - Body: `{ name: "${boardName} Filter", jql: "project = ${projectKey} ORDER BY Rank ASC" }`
   - Return filter object with ID
4. Enhance `createBoard(projectKey: string, boardName: string): Promise<JiraBoard>` method
   - Prompt user for board type (Scrum/Kanban) using inquirer
   - Call `createBoardFilter()` first
   - POST to `board` with filter ID and project key
   - Return created board object
5. Add `promptSelectBoard(projectKey: string): Promise<JiraBoard>` method
   - GET boards for project
   - Prompt user to select from list using inquirer
   - Return selected board
6. Create test file: `tests/unit/external-resource-validator/jira-validation.test.ts`
7. Write 7 unit tests with mocked API responses and inquirer prompts
8. Run tests: `npm test jira-validation.test` (should pass: 7/7)
9. Verify coverage: `npm run coverage` (should be ≥90%)

---

## T-006: Enhance JIRA validateMultipleProjects() with per-project logic

**User Story**: US-003, US-004
**Acceptance Criteria**: AC-US3-03, AC-US4-03
**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending
**Dependencies**: T-002, T-005

**Test Plan**:
- **Given** 2 projects: BACKEND (boards: 123,456) and FRONTEND (boards: Sprint Board)
- **When** validateMultipleProjects() runs
- **Then** each project validated with correct boards
- **And** numeric IDs checked directly, names searched
- **And** missing boards trigger create/select prompt
- **And** .env updated with created board IDs

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/jira-validation.test.ts`
   - testValidateMultipleProjectsWithPerProjectBoards(): Per-project boards validated correctly
   - testValidateMultipleProjectsMixedBoardTypes(): Mixed numeric IDs and names handled
   - testValidateMultipleProjectsEnvUpdate(): .env updated with created board IDs
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/external-resource-validator/jira.test.ts`
   - testEndToEndJIRAValidation(): Full validation flow with real API (test instance)
   - testMultiProjectBoardCreation(): Create boards for multiple projects
   - testBoardCreationInteractive(): Interactive board creation flow
   - **Coverage Target**: 80%

**Overall Coverage Target**: 87%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Locate `validateMultipleProjects()` in `JiraResourceValidator`
3. Add per-project config parsing:
   ```typescript
   const perProjectBoards = this.parsePerProjectBoards();
   const env = this.loadEnv();
   const globalBoards = env.JIRA_BOARDS?.split(',').map(b => b.trim()) || [];
   ```
4. For each project, add board validation loop:
   - Resolve boards: `this.resolveBoardsForProject(projectKey, perProjectBoards, globalBoards)`
   - For each board: check existence (by ID or name)
   - If not found: prompt user (Create/Select/Skip)
   - If create: call `createBoard()`, update .env
   - If select: call `promptSelectBoard()`, update .env
   - Collect results in `result.boards.existing`, `result.boards.created`, `result.boards.missing`
5. Add .env update logic using helper method
6. Add 3 unit tests to existing `jira-validation.test.ts`
7. Create `tests/integration/external-resource-validator/jira.test.ts`
8. Write 3 integration tests (requires JIRA test instance setup)
9. Run tests: `npm test jira-validation.test` (should pass: 10/10)
10. Run integration tests: `npm run test:integration -- jira.test` (should pass: 3/3)

---

## T-007: Add comprehensive per-project config validation

**User Story**: US-006
**Acceptance Criteria**: AC-US6-01, AC-US6-02, AC-US6-03
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [ ] pending
**Dependencies**: T-001, T-002

**Test Plan**:
- **Given** env var `AZURE_DEVOPS_AREA_PATHS_InvalidProject=API` where "InvalidProject" not in PROJECTS list
- **When** validator runs validation
- **Then** error thrown with message: "Project InvalidProject not found in AZURE_DEVOPS_PROJECTS"
- **And** error shows current and expected values
- **And** empty resource lists detected and rejected

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/validation.test.ts`
   - testValidatePerProjectConfigValid(): Valid config passes validation
   - testValidatePerProjectConfigMissingProject(): Throws error when project not in list
   - testValidatePerProjectConfigEmptyResources(): Throws error when resource list empty
   - testValidateNamingConventionValidADO(): Valid ADO naming convention passes
   - testValidateNamingConventionValidJIRA(): Valid JIRA naming convention passes
   - testValidateNamingConventionInvalid(): Invalid naming convention rejected
   - testErrorMessageFormat(): Error messages are clear and actionable
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Add `validatePerProjectConfig(provider: 'azure-devops' | 'jira'): void` method to base class
   - Load env vars
   - Get projects list
   - For each per-project var matching pattern:
     - Extract project name from var name
     - Check if project exists in projects list
     - Check if resource list is non-empty
     - Throw descriptive error if validation fails
3. Add `validateNamingConvention(envKey: string): boolean` method
   - ADO pattern: `/^AZURE_DEVOPS_(AREA_PATHS|TEAMS)_[A-Za-z0-9_-]+$/`
   - JIRA pattern: `/^JIRA_BOARDS_[A-Z0-9]+$/`
   - Return true if matches, false otherwise
4. Add error message templates with clear problem/solution format
5. Create test file: `tests/unit/external-resource-validator/validation.test.ts`
6. Write 7 unit tests covering all validation scenarios
7. Run tests: `npm test validation.test` (should pass: 7/7)
8. Verify 100% coverage for validation logic

---

## T-008: Add backward compatibility validation tests

**User Story**: US-006
**Acceptance Criteria**: AC-US6-04
**Priority**: P0
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-001, T-002, T-004, T-006

**Test Plan**:
- **Given** simple multi-project config with NO per-project vars
- **When** validator runs
- **Then** validation succeeds using global fallback
- **And** projects validated with global area paths/boards (if any)
- **And** no breaking changes from previous behavior

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/backward-compat.test.ts`
   - testSimpleMultiProjectNoAreaPaths(): Multi-project with no area paths works
   - testSimpleMultiProjectGlobalAreaPaths(): Global area paths shared across projects
   - testSimpleMultiProjectGlobalBoards(): Global boards shared across projects
   - testMixedConfigPartialPerProject(): Some projects with per-project, some without
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Create test file: `tests/unit/external-resource-validator/backward-compat.test.ts`
2. Test Case 1: Simple multi-project (2 projects, no area paths/teams/boards)
   - Mock env: `AZURE_DEVOPS_PROJECTS=Backend,Frontend`
   - Run validation
   - Assert: Both projects validated, no area paths checked
3. Test Case 2: Global area paths (2 projects, shared area paths)
   - Mock env: `AZURE_DEVOPS_PROJECTS=Backend,Frontend` + `AZURE_DEVOPS_AREA_PATHS=API,Web`
   - Run validation
   - Assert: Both projects use same area paths
4. Test Case 3: Global boards (JIRA, 2 projects, shared board)
   - Mock env: `JIRA_PROJECTS=BACK,FRONT` + `JIRA_BOARDS=123`
   - Run validation
   - Assert: Both projects use board 123
5. Test Case 4: Mixed config (Backend has per-project, Frontend uses global)
   - Mock env: `AZURE_DEVOPS_PROJECTS=Backend,Frontend` + `AZURE_DEVOPS_AREA_PATHS_Backend=API` + `AZURE_DEVOPS_AREA_PATHS=Web`
   - Run validation
   - Assert: Backend uses "API", Frontend uses "Web"
6. Write 4 unit tests
7. Run tests: `npm test backward-compat.test` (should pass: 4/4)
8. Verify 100% coverage for fallback logic

---

## T-009: Update ADO skill documentation with per-project examples

**User Story**: US-005
**Acceptance Criteria**: AC-US5-01
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Documentation is clear, examples are correct
- Grammar check: No typos or grammatical errors
- Build check: Docusaurus builds without errors (if applicable)
- Example verification: All code snippets are valid and tested

**Implementation**:
1. Open `plugins/specweave-ado/skills/ado-resource-validator/SKILL.md`
2. Add new section: "Per-Project Configuration"
3. Add multi-project example with different organizational structures:
   - Backend: API, Database, Cache, Auth
   - Frontend: Web, Admin, Public, Shared
   - Mobile: iOS, Android, Shared, Common
4. Add backward compatibility note: "Simple configs still work!"
5. Add example of global area paths (shared across projects)
6. Review documentation for clarity
7. Check grammar and formatting
8. Commit changes

---

## T-010: Update JIRA skill documentation with per-project examples

**User Story**: US-005
**Acceptance Criteria**: AC-US5-01
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Documentation is clear, examples are correct
- Grammar check: No typos or grammatical errors
- Build check: Docusaurus builds without errors (if applicable)
- Example verification: All code snippets are valid and tested

**Implementation**:
1. Open `plugins/specweave-jira/skills/jira-resource-validator/SKILL.md`
2. Add new section: "Per-Project Board Configuration"
3. Add multi-project example with different boards:
   - BACKEND: Sprint Board (123), Kanban Board (456)
   - FRONTEND: Sprint Board (789), Bug Board (012)
   - MOBILE: iOS Board (345), Android Board (678), Release Board (901)
4. Add backward compatibility note: "Global boards still work!"
5. Add example of global board (shared across projects)
6. Review documentation for clarity
7. Check grammar and formatting
8. Commit changes

---

## T-011: Create migration guide from simple to rich config

**User Story**: US-005
**Acceptance Criteria**: AC-US5-03
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Migration steps are clear and complete
- Grammar check: No typos or grammatical errors
- Example verification: All examples are valid and tested
- Link checker: All internal links work

**Implementation**:
1. Create file: `.specweave/docs/public/guides/multi-project-migration.md`
2. Add "Migrating from Simple to Per-Project Configuration" title
3. Add Azure DevOps section:
   - Before: Simple config example
   - After: Rich per-project config example
   - Migration steps (add per-project vars, test validation)
4. Add JIRA section:
   - Before: Simple config example
   - After: Rich per-project config example
   - Migration steps
5. Add "Benefits" section:
   - Each project has own organizational structure
   - Clear separation between projects
   - Scales to unlimited projects
   - Backward compatible
6. Add "Testing" section:
   - How to test new config
   - Validation commands
7. Review for clarity and completeness
8. Check grammar and formatting
9. Test all examples manually
10. Commit changes

---

## T-012: Add clear error messages for misconfiguration

**User Story**: US-005, US-006
**Acceptance Criteria**: AC-US5-02, AC-US6-01, AC-US6-02, AC-US6-03
**Priority**: P2
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-007

**Test Plan**:
- **Given** misconfigured env var (e.g., unknown project, empty resources, invalid naming)
- **When** validation runs
- **Then** error message shows clear problem description
- **And** error shows current state and expected state
- **And** error suggests actionable solution

**Test Cases**:
1. **Unit**: `tests/unit/external-resource-validator/validation.test.ts` (already created in T-007)
   - testErrorMessageMissingProject(): Error shows project not found + solution
   - testErrorMessageEmptyResources(): Error shows empty list + example
   - testErrorMessageNamingConvention(): Error shows invalid pattern + correct format
   - **Coverage Target**: 100%

**Overall Coverage Target**: 100%

**Implementation**:
1. Open `src/utils/external-resource-validator.ts`
2. Review error messages in `validatePerProjectConfig()` method
3. Ensure error format follows pattern:
   ```
   ❌ Configuration Error

   Problem: [What's wrong]
   Solution: [How to fix]

   Current:
     [Current config]

   Expected:
     [Expected config]
   ```
4. Add examples to error messages where helpful
5. Update tests in `validation.test.ts` to verify error message format
6. Run tests: `npm test validation.test` (should pass: all tests)
7. Manual testing: Trigger each error scenario, verify message clarity
8. Commit changes

---

## T-013: Run full test suite and verify coverage

**User Story**: All
**Acceptance Criteria**: All ACs
**Priority**: P0
**Estimate**: 0.5 hours
**Status**: [ ] pending
**Dependencies**: T-001 through T-012

**Test Plan**: N/A (testing task)

**Validation**:
- Unit tests: All 36 tests pass (7 config parsing + 9 ADO + 9 JIRA + 7 validation + 4 backward compat)
- Integration tests: All 6 tests pass (3 ADO + 3 JIRA)
- Coverage: Overall 87%+ (unit 92%, integration 80%)
- Performance: Validation completes in <5 seconds (3 projects × 5 resources)

**Implementation**:
1. Run unit tests: `npm test`
   - Expected: 36/36 passing
   - If failures: Debug and fix failing tests
2. Run integration tests: `npm run test:integration`
   - Expected: 6/6 passing
   - Requires ADO test org and JIRA test instance setup
   - If failures: Check API credentials and test data
3. Run coverage report: `npm run coverage`
   - Expected: Overall 87%+, Unit 92%+, Integration 80%+
   - If below target: Add missing test cases
4. Performance test:
   - Create test config: 3 projects × 5 resources each
   - Run validation: `time npm run validate-ado` or `time npm run validate-jira`
   - Expected: <5 seconds total
   - If slower: Profile and optimize
5. Generate coverage report: `npm run coverage -- --reporter=html`
6. Review coverage report in browser
7. Document any gaps or known issues
8. Commit final test results

---

## T-014: Manual QA testing with real ADO org and JIRA instance

**User Story**: All
**Acceptance Criteria**: All ACs
**Priority**: P0
**Estimate**: 1 hour
**Status**: [ ] pending
**Dependencies**: T-013

**Test Plan**: N/A (manual QA task)

**Validation**:
- ADO: Create 2 projects with per-project area paths and teams
- JIRA: Create 2 projects with per-project boards
- Test backward compatibility: Simple config works
- Test error handling: Trigger each error scenario
- Test performance: <5 seconds for 3 projects × 5 resources

**Implementation**:
1. **Setup ADO Test Org**:
   - Create 2 test projects: "QABackend", "QAFrontend"
   - Configure .env with per-project vars:
     ```
     AZURE_DEVOPS_PROJECTS=QABackend,QAFrontend
     AZURE_DEVOPS_AREA_PATHS_QABackend=QAApi,QADatabase
     AZURE_DEVOPS_AREA_PATHS_QAFrontend=QAWeb,QAAdmin
     AZURE_DEVOPS_TEAMS_QABackend=QAAlpha
     ```
   - Run validation: `specweave init --validate-ado`
   - Verify: Area paths created, teams created, validation succeeds

2. **Setup JIRA Test Instance**:
   - Create 2 test projects: "QABACK", "QAFRONT"
   - Configure .env with per-project vars:
     ```
     JIRA_PROJECTS=QABACK,QAFRONT
     JIRA_BOARDS_QABACK=QA Sprint,QA Kanban
     JIRA_BOARDS_QAFRONT=QA Bug Board
     ```
   - Run validation: `specweave init --validate-jira`
   - Verify: Boards created (interactive prompt), validation succeeds

3. **Test Backward Compatibility**:
   - Create simple config (no per-project vars)
   - Run validation
   - Verify: No errors, projects validated with global fallback

4. **Test Error Scenarios**:
   - Invalid project: `AZURE_DEVOPS_AREA_PATHS_InvalidProject=API`
   - Empty resources: `JIRA_BOARDS_QABACK=`
   - Invalid naming: `ADO_BACKEND_PATHS=API`
   - Verify: Clear error messages for each

5. **Performance Test**:
   - Create config: 3 projects × 5 resources each
   - Run validation: `time specweave init --validate-ado`
   - Verify: <5 seconds total

6. **Document Results**:
   - Create test report: `.specweave/increments/0025-per-project-resource-config/reports/QA-TEST-REPORT.md`
   - Include screenshots, error messages, performance metrics
   - Note any issues or edge cases discovered

7. **Cleanup**:
   - Delete test projects (or mark as test data)
   - Remove test .env vars
   - Commit test report

---

## T-015: Final code review and documentation review

**User Story**: All
**Acceptance Criteria**: All ACs
**Priority**: P0
**Estimate**: 0.5 hours
**Status**: [ ] pending
**Dependencies**: T-014

**Test Plan**: N/A (review task)

**Validation**:
- Code review: All code follows TypeScript best practices
- Documentation review: All docs are clear and complete
- Test review: All tests are meaningful and comprehensive
- Performance review: No performance regressions
- Security review: No security issues (API credentials, env vars)

**Implementation**:
1. **Code Review**:
   - Open `src/utils/external-resource-validator.ts`
   - Review all new methods for:
     - TypeScript type safety (no `any` types without justification)
     - Error handling (all API calls wrapped in try/catch)
     - Logging (chalk colors used consistently)
     - Comments (complex logic documented)
   - Review test files for:
     - Test coverage completeness
     - Meaningful test names
     - Edge cases covered

2. **Documentation Review**:
   - Review `plugins/specweave-ado/skills/ado-resource-validator/SKILL.md`
   - Review `plugins/specweave-jira/skills/jira-resource-validator/SKILL.md`
   - Review `.specweave/docs/public/guides/multi-project-migration.md`
   - Check:
     - Examples are correct and tested
     - Grammar and formatting
     - Links work
     - Migration steps are clear

3. **Test Review**:
   - Review all 42 tests (36 unit + 6 integration)
   - Check:
     - Tests follow AAA pattern (Arrange, Act, Assert)
     - Test names clearly describe what's being tested
     - Edge cases covered
     - No flaky tests

4. **Performance Review**:
   - Review performance test results
   - Check: <5 seconds for 3 projects × 5 resources
   - No N+1 query issues
   - No unnecessary API calls

5. **Security Review**:
   - Review API credential handling
   - Check: No hardcoded credentials
   - Check: .env variables loaded securely
   - Check: API tokens not logged

6. **Create Review Checklist**:
   - Document findings
   - Note any issues or improvements
   - Create follow-up tasks if needed

7. **Final Sign-Off**:
   - All tasks complete (T-001 through T-015)
   - All tests passing (42/42)
   - Coverage ≥87%
   - Documentation complete
   - Ready for PR and release

---

## Summary

**Total Tasks**: 15
**Completed**: 0/15 (0%)
**Estimated Duration**: 11 hours (1.5 days)

**Coverage Breakdown**:
- Config Parsing: 95% (T-001, T-002)
- ADO Validation: 90% (T-003, T-004)
- JIRA Validation: 90% (T-005, T-006)
- Validation Logic: 100% (T-007, T-008)
- Overall Target: 87%

**Dependencies**:
- T-004 depends on T-001, T-003
- T-006 depends on T-002, T-005
- T-008 depends on T-001, T-002, T-004, T-006
- T-012 depends on T-007
- T-013 depends on T-001 through T-012
- T-014 depends on T-013
- T-015 depends on T-014

**Test Count**:
- Unit: 36 tests (7 + 9 + 9 + 7 + 4)
- Integration: 6 tests (3 + 3)
- **Total: 42 tests**

**Risk Assessment**:
- **Low Risk**: Isolated changes, comprehensive tests, 100% backward compatible
- **Medium Complexity**: Config parsing + API integration
- **High Impact**: Unblocks real-world multi-project/multi-team setups
