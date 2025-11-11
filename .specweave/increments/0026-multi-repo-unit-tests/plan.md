---
increment: 0026-multi-repo-unit-tests
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
---

# Implementation Plan: Multi-Repo Unit Test Coverage

## Overview

Create 4 missing unit test files with 48 test cases to close the coverage gap from increment 0022. This is a pure testing increment - no architecture changes, no new features, just test coverage for existing modules.

**Target Modules**:
- `github-validator.ts` (18 tests)
- `prompt-consolidator.ts` (10 tests)
- `setup-summary.ts` (8 tests)
- `env-file-generator.ts` (12 tests)

**Total**: 48 test cases, 85-90% coverage per module

---

## Test Strategy

**Format**: BDD (Given/When/Then) for clarity
**Framework**: Jest with TypeScript
**Mocking**: Mock external dependencies (GitHub API, file system)
**Coverage**: 85-90% per module (realistic, not 100%)

**Test Levels**:
1. **Happy paths** - Normal operation
2. **Edge cases** - Empty inputs, special characters, limits
3. **Error handling** - API failures, network errors, invalid data
4. **Integration** - Multi-function workflows

---

## Test Files

### 1. github-validator.test.ts (18 test cases)

**Location**: `tests/unit/repo-structure/github-validator.test.ts`

**Target**: `src/core/repo-structure/github-validator.ts` (229 lines, 4 exported functions)

**Test Cases** (BDD format):

**validateRepository() - 7 tests**:
- Given valid owner and repo → When repository doesn't exist → Then returns {exists: false, valid: true}
- Given valid owner and repo → When repository exists → Then returns {exists: true, valid: true, url}
- Given valid token → When API returns 404 → Then returns exists: false
- Given valid token → When API returns 200 → Then returns exists: true with URL
- Given invalid token → When API returns 401 → Then returns error: 'Invalid GitHub token'
- Given valid token → When API returns 403 → Then returns error: 'Forbidden - check token permissions or rate limit'
- Given network failure → When fetch throws error → Then returns error with network message

**validateOwner() - 6 tests**:
- Given valid user → When user endpoint returns 200 → Then returns {valid: true, type: 'user'}
- Given valid org → When user endpoint returns 200 with type=Organization → Then returns {valid: true, type: 'org'}
- Given valid org → When org endpoint returns 200 → Then returns {valid: true, type: 'org'}
- Given nonexistent owner → When both endpoints return 404 → Then returns {valid: false, error: 'Owner not found'}
- Given network failure → When fetch throws error → Then returns error with network message
- Given no token → When API returns 200 → Then validates without auth header

**validateWithRetry() - 3 tests**:
- Given failing function → When retries succeed on 2nd attempt → Then returns success
- Given failing function → When all 3 attempts fail → Then throws last error
- Given exponential backoff config → When retrying → Then waits 1s, 2s, 4s between attempts

**checkRateLimit() - 2 tests**:
- Given valid token → When rate_limit endpoint returns data → Then returns {remaining, resetAt}
- Given API failure → When endpoint throws error → Then throws error with message

**Coverage Target**: 90% (high due to critical validation logic)

---

### 2. prompt-consolidator.test.ts (10 test cases)

**Location**: `tests/unit/repo-structure/prompt-consolidator.test.ts`

**Target**: `src/core/repo-structure/prompt-consolidator.ts` (209 lines, 5 exported functions)

**Test Cases** (BDD format):

**getArchitecturePrompt() - 2 tests**:
- Given no input → When called → Then returns question + 4 options (single, multi-with-parent, multi-without-parent, monorepo)
- Given no input → When called → Then each option has value, label, description, example

**getParentRepoBenefits() - 1 test**:
- Given no input → When called → Then returns markdown with 5 benefits (central .specweave, cross-cutting, ADRs, onboarding, compliance)

**getRepoCountClarification() - 3 tests**:
- Given parentCount=1, implCount=2 → When called → Then returns "Total: 3... 1 parent + 2 implementation repositories"
- Given parentCount=1, implCount=1 → When called → Then returns singular "repository" (not "repositories")
- Given parentCount=0, implCount=3 → When called → Then returns "Total: 3"

**getVisibilityPrompt() - 2 tests**:
- Given repoName="my-project" → When called → Then returns question with repo name + private/public options
- Given any repoName → When called → Then default is 'private'

**formatArchitectureChoice() - 2 tests**:
- Given each ArchitectureChoice → When formatted → Then returns human-readable string
- Given unknown choice → When formatted → Then returns original choice as string

**Coverage Target**: 85% (string formatting, simple logic)

---

### 3. setup-summary.test.ts (8 test cases)

**Location**: `tests/unit/repo-structure/setup-summary.test.ts`

**Target**: `src/core/repo-structure/setup-summary.ts` (247 lines, 2 exported functions)

**Test Cases** (BDD format):

**generateSetupSummary() - 6 tests**:
- Given state with parent repo + 2 impl repos → When generated → Then includes "Created Repositories (3 total)"
- Given state with parent repo → When generated → Then includes "Parent:" with URL and visibility
- Given state with impl repos → When generated → Then includes numbered list with URLs and local paths
- Given state with envCreated=true → When generated → Then shows "GitHub token: Configured"
- Given state with envCreated=false → When generated → Then shows "Not configured (add to .env)"
- Given state with 3 repos → When generated → Then includes time saved "~13 minutes" (3*5 - 2)

**generateSetupSummary() - Sections - 1 test**:
- Given complete state → When generated → Then includes all sections: header, repos, folder structure, config, next steps, tips, time saved

**formatRepo() - 1 test**:
- Given RepoConfig → When formatted → Then returns "displayName (owner/repo)"

**Coverage Target**: 85% (primarily string formatting)

---

### 4. env-file-generator.test.ts (12 test cases)

**Location**: `tests/unit/utils/env-file-generator.test.ts`

**Target**: `src/utils/env-file-generator.ts` (253 lines, 4 exported functions)

**Test Cases** (BDD format):

**generateEnvFile() - 5 tests**:
- Given valid config → When generated → Then creates .env with GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPOS
- Given config with token → When generated → Then .env contains actual token value
- Given config without token → When generated → Then .env contains placeholder "ghp_xxxxxxxxxxxxxxxxxxxx"
- Given valid config → When generated → Then creates .env.example with placeholders
- Given Unix platform → When generated → Then .env has 0o600 permissions (owner read/write only)

**updateGitignore() - 3 tests**:
- Given no .gitignore → When updated → Then creates .gitignore with .env and .env.local patterns
- Given .gitignore without .env → When updated → Then adds SpecWeave section with .env patterns
- Given .gitignore with .env → When updated → Then does not duplicate patterns

**envFileExists() - 2 tests**:
- Given .env file exists → When checked → Then returns true
- Given .env file missing → When checked → Then returns false

**loadEnvConfig() - 2 tests**:
- Given valid .env file → When loaded → Then returns EnvConfig with githubToken, githubOwner, repos array
- Given .env file missing → When loaded → Then returns null

**Coverage Target**: 85% (file I/O, parsing logic)

---

## Implementation Approach

**Phase 1: Setup** (5 minutes)
1. Create test file structure:
   ```bash
   mkdir -p tests/unit/repo-structure
   mkdir -p tests/unit/utils
   ```
2. Install dependencies (already installed):
   - jest
   - ts-jest
   - @types/jest

**Phase 2: Write Tests** (per file)
1. Create test file with describe blocks
2. Add BDD test cases (Given/When/Then comments)
3. Mock external dependencies (GitHub API, fs-extra)
4. Write assertions
5. Run `npm test` - verify tests pass
6. Check coverage: `npm test -- --coverage`

**Phase 3: Validation** (10 minutes)
1. All 48 tests passing
2. Coverage report shows 85-90% per module
3. No false positives (tests fail when code breaks)
4. BDD format consistent across all tests

---

## Mocking Strategy

**External Dependencies to Mock**:

1. **GitHub API** (github-validator.test.ts):
   ```typescript
   global.fetch = jest.fn();
   // Mock responses: 200, 404, 401, 403
   ```

2. **File System** (env-file-generator.test.ts, setup-summary.test.ts):
   ```typescript
   jest.mock('fs-extra');
   // Mock: writeFile, readFile, pathExists, chmod
   ```

3. **No mocks needed** (prompt-consolidator.test.ts):
   - Pure functions, no external dependencies

---

## Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| github-validator | 90% | Critical validation logic, external API |
| prompt-consolidator | 85% | String formatting, simple logic |
| setup-summary | 85% | String generation, simple conditions |
| env-file-generator | 85% | File I/O, parsing, security |

**Overall Target**: 85-90% per module (realistic, not aspirational)

---

## Success Criteria

✅ All 4 test files created
✅ 48 test cases total (18+10+8+12)
✅ All tests passing (`npm test`)
✅ 85-90% coverage per module
✅ BDD format (Given/When/Then comments)
✅ Zero false positives (tests tell the truth)

---

## Notes

- This is a **testing increment** - no architecture changes needed
- Focus on **completeness**, not perfection
- **Mocking** is essential for external dependencies
- **BDD format** makes tests readable and maintainable
- **Coverage gaps** are acceptable if code is unreachable/trivial
