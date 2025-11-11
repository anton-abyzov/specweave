---
increment: 0026-multi-repo-unit-tests
total_tasks: 4
completed_tasks: 0
test_mode: STANDARD
coverage_target: 85%
---

# Implementation Tasks: Multi-Repo Unit Test Coverage

## T-001: Create github-validator.test.ts

**User Story**: US-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US1-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** the github-validator module with 4 exported functions
- **When** testing repository validation, owner validation, retry logic, and rate limiting
- **Then** all 18 test cases should pass with 90% coverage

**Test Cases**:
1. **Unit**: `tests/unit/repo-structure/github-validator.test.ts`
   - **validateRepository()** (7 tests):
     - testRepositoryDoesNotExist(): Valid owner/repo → API 404 → returns {exists: false, valid: true}
     - testRepositoryExists(): Valid owner/repo → API 200 → returns {exists: true, valid: true, url}
     - testValidTokenWith404(): Valid token → API 404 → returns exists: false
     - testValidTokenWith200(): Valid token → API 200 → returns exists: true with URL
     - testInvalidToken(): Invalid token → API 401 → returns error: 'Invalid GitHub token'
     - testForbiddenAccess(): Valid token → API 403 → returns error: 'Forbidden - check token permissions or rate limit'
     - testNetworkFailure(): Network error → fetch throws → returns error with network message

   - **validateOwner()** (6 tests):
     - testValidUser(): User endpoint 200 → returns {valid: true, type: 'user'}
     - testValidOrgViaUser(): User endpoint 200 type=Organization → returns {valid: true, type: 'org'}
     - testValidOrgViaOrg(): Org endpoint 200 → returns {valid: true, type: 'org'}
     - testNonexistentOwner(): Both endpoints 404 → returns {valid: false, error: 'Owner not found'}
     - testOwnerNetworkFailure(): Fetch throws → returns error with network message
     - testNoTokenValidation(): No token → API 200 → validates without auth header

   - **validateWithRetry()** (3 tests):
     - testRetrySuccess(): Fails first attempt, succeeds on 2nd → returns success
     - testRetryExhausted(): All 3 attempts fail → throws last error
     - testExponentialBackoff(): Retry delays → waits 1s, 2s, 4s between attempts

   - **checkRateLimit()** (2 tests):
     - testRateLimitCheck(): Valid token → rate_limit endpoint → returns {remaining, resetAt}
     - testRateLimitFailure(): API error → throws error with message

   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create test file: `tests/unit/repo-structure/github-validator.test.ts`
2. Add describe blocks for each function (validateRepository, validateOwner, validateWithRetry, checkRateLimit)
3. Mock global.fetch for GitHub API responses (200, 404, 401, 403, network errors)
4. Write 18 test cases in BDD format (Given/When/Then comments)
5. Add assertions for expected behavior (return values, error messages, API calls)
6. Run tests: `npm test github-validator.test.ts` (should pass: 18/18)
7. Check coverage: `npm test -- --coverage github-validator.test.ts` (should be ≥90%)
8. Verify no false positives (break code, tests should fail)

---

## T-002: Create prompt-consolidator.test.ts

**User Story**: US-002
**Acceptance Criteria**: AC-US2-01, AC-US2-02, AC-US2-03
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** the prompt-consolidator module with 5 exported functions
- **When** testing prompt generation, benefit formatting, and clarifications
- **Then** all 10 test cases should pass with 85% coverage

**Test Cases**:
1. **Unit**: `tests/unit/repo-structure/prompt-consolidator.test.ts`
   - **getArchitecturePrompt()** (2 tests):
     - testPromptStructure(): No input → returns question + 4 options (single, multi-with-parent, multi-without-parent, monorepo)
     - testOptionFormat(): Each option has value, label, description, example

   - **getParentRepoBenefits()** (1 test):
     - testBenefitsList(): No input → returns markdown with 5 benefits (central .specweave, cross-cutting, ADRs, onboarding, compliance)

   - **getRepoCountClarification()** (3 tests):
     - testMultipleRepos(): parentCount=1, implCount=2 → "Total: 3... 1 parent + 2 implementation repositories"
     - testSingularForm(): parentCount=1, implCount=1 → uses singular "repository" (not "repositories")
     - testNoParent(): parentCount=0, implCount=3 → "Total: 3"

   - **getVisibilityPrompt()** (2 tests):
     - testVisibilityWithRepoName(): repoName="my-project" → question with repo name + private/public options
     - testDefaultVisibility(): Any repoName → default is 'private'

   - **formatArchitectureChoice()** (2 tests):
     - testKnownChoices(): Each ArchitectureChoice → returns human-readable string
     - testUnknownChoice(): Unknown choice → returns original choice as string

   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create test file: `tests/unit/repo-structure/prompt-consolidator.test.ts`
2. Add describe blocks for each function (5 functions)
3. No mocking needed (pure functions, no external dependencies)
4. Write 10 test cases in BDD format (Given/When/Then comments)
5. Add assertions for prompt structure, option formatting, string generation
6. Run tests: `npm test prompt-consolidator.test.ts` (should pass: 10/10)
7. Check coverage: `npm test -- --coverage prompt-consolidator.test.ts` (should be ≥85%)
8. Verify string output accuracy (check examples, labels, descriptions)

---

## T-003: Create setup-summary.test.ts

**User Story**: US-003
**Acceptance Criteria**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** the setup-summary module with 2 exported functions
- **When** testing summary generation and repo formatting
- **Then** all 8 test cases should pass with 85% coverage

**Test Cases**:
1. **Unit**: `tests/unit/repo-structure/setup-summary.test.ts`
   - **generateSetupSummary()** (6 tests):
     - testRepoCount(): Parent + 2 impl repos → "Created Repositories (3 total)"
     - testParentRepo(): State with parent repo → includes "Parent:" with URL and visibility
     - testImplRepos(): State with impl repos → numbered list with URLs and local paths
     - testEnvConfigured(): envCreated=true → "GitHub token: Configured"
     - testEnvNotConfigured(): envCreated=false → "Not configured (add to .env)"
     - testTimeSaved(): 3 repos → includes "~13 minutes" (3*5 - 2)

   - **generateSetupSummary() - Sections** (1 test):
     - testAllSections(): Complete state → includes header, repos, folder structure, config, next steps, tips, time saved

   - **formatRepo()** (1 test):
     - testRepoFormat(): RepoConfig → returns "displayName (owner/repo)"

   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create test file: `tests/unit/repo-structure/setup-summary.test.ts`
2. Add describe blocks for generateSetupSummary() and formatRepo()
3. Mock fs-extra if needed (optional, depends on implementation)
4. Create test fixtures for SetupState and RepoConfig
5. Write 8 test cases in BDD format (Given/When/Then comments)
6. Add assertions for summary sections, formatting, time calculations
7. Run tests: `npm test setup-summary.test.ts` (should pass: 8/8)
8. Check coverage: `npm test -- --coverage setup-summary.test.ts` (should be ≥85%)
9. Verify summary output matches expected format

---

## T-004: Create env-file-generator.test.ts

**User Story**: US-004
**Acceptance Criteria**: AC-US4-01, AC-US4-02, AC-US4-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** the env-file-generator module with 4 exported functions
- **When** testing .env generation, gitignore updates, and config loading
- **Then** all 12 test cases should pass with 85% coverage

**Test Cases**:
1. **Unit**: `tests/unit/utils/env-file-generator.test.ts`
   - **generateEnvFile()** (5 tests):
     - testEnvCreation(): Valid config → creates .env with GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPOS
     - testEnvWithToken(): Config with token → .env contains actual token value
     - testEnvWithoutToken(): Config without token → .env contains placeholder "ghp_xxxxxxxxxxxxxxxxxxxx"
     - testEnvExample(): Valid config → creates .env.example with placeholders
     - testEnvPermissions(): Unix platform → .env has 0o600 permissions (owner read/write only)

   - **updateGitignore()** (3 tests):
     - testGitignoreCreation(): No .gitignore → creates with .env and .env.local patterns
     - testGitignoreUpdate(): .gitignore without .env → adds SpecWeave section with patterns
     - testGitignoreNoDuplicates(): .gitignore with .env → does not duplicate patterns

   - **envFileExists()** (2 tests):
     - testEnvExists(): .env file exists → returns true
     - testEnvMissing(): .env file missing → returns false

   - **loadEnvConfig()** (2 tests):
     - testLoadValid(): Valid .env file → returns EnvConfig with githubToken, githubOwner, repos array
     - testLoadMissing(): .env file missing → returns null

   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create test file: `tests/unit/utils/env-file-generator.test.ts`
2. Add describe blocks for each function (4 functions)
3. Mock fs-extra (writeFile, readFile, pathExists, chmod, appendFile)
4. Create test fixtures for EnvConfig
5. Write 12 test cases in BDD format (Given/When/Then comments)
6. Add assertions for file creation, permissions, content, gitignore updates
7. Test multi-provider support (GitHub, Jira, ADO)
8. Run tests: `npm test env-file-generator.test.ts` (should pass: 12/12)
9. Check coverage: `npm test -- --coverage env-file-generator.test.ts` (should be ≥85%)
10. Verify security: .env permissions are 0o600 (owner only)
11. Verify gitignore patterns prevent accidental commits

---

## Summary

**Total Tasks**: 4
**Total Test Cases**: 48 (18 + 10 + 8 + 12)
**Average Coverage**: 86.25% ((90+85+85+85)/4)
**Estimated Time**: 10 hours total

**Test File Locations**:
- `tests/unit/repo-structure/github-validator.test.ts` (18 cases, 90% coverage)
- `tests/unit/repo-structure/prompt-consolidator.test.ts` (10 cases, 85% coverage)
- `tests/unit/repo-structure/setup-summary.test.ts` (8 cases, 85% coverage)
- `tests/unit/utils/env-file-generator.test.ts` (12 cases, 85% coverage)

**Success Criteria**:
- ✅ All 48 tests passing
- ✅ 85-90% coverage per module
- ✅ BDD format (Given/When/Then)
- ✅ Zero false positives
- ✅ Realistic mocking strategy
