# Implementation Tasks: GitHub and Bitbucket Multi-Repo Cloning

---
increment: 0127-github-bitbucket-clone-parity
status: completed
test_mode: test-after
coverage_target: 80
phases:
  - github-implementation
  - bitbucket-implementation
  - integration
  - testing
estimated_tasks: 16
estimated_effort: 6-8 hours
---

## Phase 1: GitHub Implementation

### T-001: Create GitHub repo cloning module

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Model Hint**: 💎 Opus (new module with API integration)

**Description**:
Create `src/cli/helpers/init/github-repo-cloning.ts` with the `triggerGitHubRepoCloning()` function following the ADO pattern.

**Implementation Steps**:
1. Create file: `src/cli/helpers/init/github-repo-cloning.ts`
2. Import dependencies: `chalk`, `launchCloneJob`, `filterRepositoriesByPattern`
3. Define `GitHubRepoSelection` interface
4. Implement `triggerGitHubRepoCloning()` function signature
5. Add JSDoc documentation

**Reference**: [ado-repo-cloning.ts:90](src/cli/helpers/init/ado-repo-cloning.ts#L90) for pattern

**Test Plan** (test-after):
- ✓ File created with correct structure
- ✓ Function exported with correct signature
- ✓ TypeScript compiles without errors

---

### T-002: Implement GitHub API repo fetching

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (standard API fetch with pagination)

**Description**:
Implement `fetchGitHubRepos()` function to fetch repositories from GitHub organization using REST API with pagination.

**Implementation Steps**:
1. Create `fetchGitHubRepos(org: string, pat: string)` function
2. Use GitHub API: `GET https://api.github.com/orgs/{org}/repos`
3. Add pagination support (100 repos/page, max 500 total)
4. Add PAT authentication via Bearer token
5. Handle API errors (401, 404, 403 rate limit)
6. Return array of `{ id, name, clone_url, html_url }`

**API Details**:
```typescript
headers: {
  'Authorization': `Bearer ${pat}`,
  'Accept': 'application/vnd.github+json'
}
```

**Test Plan** (test-after):
- ✓ Successfully fetches repos from test org
- ✓ Handles pagination (>100 repos)
- ✓ Returns correct repo structure
- ✓ Handles 401 (invalid PAT)
- ✓ Handles 404 (org not found)
- ✓ Handles 403 (rate limit)

---

### T-002b: Add rate limit detection and retry

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (standard retry logic)
**Priority**: P0 (risk mitigation - HIGH risk 5.6)

**Description**:
Add rate limit detection via GitHub API headers and exponential backoff retry to prevent init failures during large org fetches.

**Implementation Steps**:
1. Check `X-RateLimit-Remaining` header after each API call
2. Warn user when remaining <100 requests
3. If 403 rate limit error, implement exponential backoff:
   - Retry 1: Wait 2 seconds
   - Retry 2: Wait 4 seconds
   - Retry 3: Wait 8 seconds
4. After 3 retries, continue with partial results (graceful degradation)
5. Display message: "Rate limit reached, continuing with X repos fetched"

**Test Plan** (test-after):
- ✓ Detects low rate limit (<100) and warns user
- ✓ Retries 3 times with exponential backoff on 403
- ✓ Continues with partial results after retries exhausted
- ✓ Does not retry on other errors (401, 404)

---

### T-002c: Add progress indicator for large orgs

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (UI enhancement)
**Priority**: P1 (risk mitigation - MEDIUM risk 3.0)

**Description**:
Add progress indicator during repo fetching to improve UX for large organizations (>100 repos).

**Implementation Steps**:
1. Display org size warning: "Org has ~350 repos, fetching may take 2-3 minutes"
2. Show progress during fetch: "Fetching repos... 100/350"
3. Update progress every 100 repos fetched
4. Add Ctrl+C handler for safe cancellation

**Test Plan** (test-after):
- ✓ Shows org size warning for orgs >100 repos
- ✓ Progress updates every 100 repos
- ✓ Ctrl+C safely cancels without leaving corrupt state

---

### T-003: Implement GitHub repo filtering

**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (reuse existing utility)

**Description**:
Filter fetched GitHub repositories using the existing `filterRepositoriesByPattern()` utility from ADO implementation.

**Implementation Steps**:
1. Import `filterRepositoriesByPattern` from `../selection-strategy.js`
2. Map GitHub API response to expected format: `{ name: string }`
3. Call `filterRepositoriesByPattern(repos, clonePattern)`
4. Handle empty results gracefully

**Test Plan** (test-after):
- ✓ "All" pattern returns all repos
- ✓ Glob pattern filters correctly (e.g., "web-*")
- ✓ Regex pattern filters correctly
- ✓ Empty results handled with user message

---

### T-004: Build GitHub HTTPS clone URLs

**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (URL construction)

**Description**:
Implement `buildGitHubCloneUrl()` function to construct HTTPS clone URLs with embedded PAT authentication.

**Implementation Steps**:
1. Create `buildGitHubCloneUrl(owner: string, repo: string, pat: string)` function
2. Format: `https://{pat}@github.com/{owner}/{repo}.git`
3. URL-encode owner and repo names (handle spaces)
4. Never log PAT to console

**Test Plan** (test-after):
- ✓ Correct URL format with PAT
- ✓ URL-encoding works for special chars
- ✓ PAT not visible in logs

---

### T-004b: Add token security enhancements

**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (security hardening)
**Priority**: P0 (risk mitigation - HIGH risk 5.6)

**Description**:
Add security enhancements to minimize token exposure during clone operations.

**Implementation Steps**:
1. Add user warning during init: "⚠️ PAT will be visible in process list during clone (Git limitation)"
2. Recommend read-only PAT scope: "Use 'repo:read' scope for cloning (not 'repo:write')"
3. Clear sensitive environment variables after clone job starts
4. Suggest Git credential helpers in error messages if clone fails
5. Document HTTPS vs SSH trade-offs in error output

**Test Plan** (test-after):
- ✓ Warning displayed before starting clone
- ✓ Recommends minimal PAT scope
- ✓ Environment vars cleared after job launch
- ✓ Error messages mention credential helpers

---

### T-005: Launch GitHub background clone job

**User Story**: US-001
**Satisfies ACs**: AC-US1-04, AC-US1-05, AC-US1-07
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (reuse existing function)

**Description**:
Integrate with existing `launchCloneJob()` to create background job for GitHub repo cloning.

**Implementation Steps**:
1. Import `launchCloneJob` from `../../../core/background/job-launcher.js`
2. Map filtered repos to `{ owner, name, path, cloneUrl }` format
3. Call `launchCloneJob({ projectPath, repositories })`
4. Display progress: "Cloning N repositories in background..."
5. Return job ID from result

**Test Plan** (test-after):
- ✓ Background job created successfully
- ✓ Job ID returned
- ✓ Progress message displayed
- ✓ Job appears in `/specweave:jobs`

---

### T-005b: Add partial failure recovery

**User Story**: US-001
**Satisfies ACs**: AC-US1-04, AC-US1-05
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (error recovery)
**Priority**: P1 (risk mitigation - MEDIUM risk 2.4)

**Description**:
Add resume capability and cleanup for partial clone failures (network issues mid-clone).

**Implementation Steps**:
1. Track clone progress in job state (list of completed repos)
2. On resume, skip already-cloned repos (check `.git` folder exists)
3. On user cancel (Ctrl+C), save partial state
4. Report partial success: "✓ Cloned 75/100 repos, ⚠️ 25 failed"
5. Provide resume command in error message

**Test Plan** (test-after):
- ✓ Skips already-cloned repos on resume
- ✓ Reports partial success accurately
- ✓ Ctrl+C saves state safely
- ✓ Resume command displayed in error output

---

## Phase 2: Bitbucket Implementation

### T-006: Create Bitbucket repo cloning module

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Model Hint**: 💎 Opus (new module with different API)

**Description**:
Create `src/cli/helpers/init/bitbucket-repo-cloning.ts` with the `triggerBitbucketRepoCloning()` function.

**Implementation Steps**:
1. Create file: `src/cli/helpers/init/bitbucket-repo-cloning.ts`
2. Import dependencies (same as GitHub module)
3. Define `BitbucketRepoSelection` interface
4. Implement `triggerBitbucketRepoCloning()` function signature
5. Add JSDoc documentation

**Test Plan** (test-after):
- ✓ File created with correct structure
- ✓ Function exported correctly
- ✓ TypeScript compiles

---

### T-007: Implement Bitbucket API repo fetching

**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (API fetch with Basic Auth)

**Description**:
Implement `fetchBitbucketRepos()` function to fetch repositories from Bitbucket workspace using REST API v2.0.

**Implementation Steps**:
1. Create `fetchBitbucketRepos(workspace: string, username: string, appPassword: string)` function
2. Use Bitbucket API: `GET https://api.bitbucket.org/2.0/repositories/{workspace}`
3. Add pagination support (100 repos/page, max 500 total)
4. Add Basic Auth: `Buffer.from(\`${username}:${appPassword}\`).toString('base64')`
5. Handle API errors (401, 404)
6. Parse response: `values[]` array with repo objects

**API Details**:
```typescript
headers: {
  'Authorization': `Basic ${base64Credentials}`,
  'Accept': 'application/json'
}
```

**Test Plan** (test-after):
- ✓ Successfully fetches repos from workspace
- ✓ Handles pagination
- ✓ Returns correct repo structure
- ✓ Handles 401 (invalid credentials)
- ✓ Handles 404 (workspace not found)

---

### T-008: Implement Bitbucket repo filtering

**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (same as GitHub)

**Description**:
Filter Bitbucket repositories using `filterRepositoriesByPattern()`.

**Implementation Steps**:
1. Map Bitbucket API response to `{ name: string }` format
2. Extract repo name from `slug` field
3. Call `filterRepositoriesByPattern(repos, clonePattern)`

**Test Plan** (test-after):
- ✓ Filters work with Bitbucket repo structure
- ✓ All pattern types work (all/glob/regex)

---

### T-009: Build Bitbucket HTTPS clone URLs

**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (URL construction)

**Description**:
Implement `buildBitbucketCloneUrl()` to construct HTTPS clone URLs with app password authentication.

**Implementation Steps**:
1. Create `buildBitbucketCloneUrl(workspace: string, repo: string, username: string, appPassword: string)` function
2. Format: `https://{username}:{appPassword}@bitbucket.org/{workspace}/{repo}.git`
3. URL-encode all components
4. Never log credentials

**Test Plan** (test-after):
- ✓ Correct URL format
- ✓ Credentials embedded correctly
- ✓ URL-encoding works
- ✓ No credential logging

---

### T-010: Launch Bitbucket background clone job

**User Story**: US-002
**Satisfies ACs**: AC-US2-04, AC-US2-05, AC-US2-07
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (same as GitHub)

**Description**:
Integrate with `launchCloneJob()` for Bitbucket repos.

**Implementation Steps**:
1. Map repos to required format
2. Call `launchCloneJob()`
3. Display progress message
4. Return job ID

**Test Plan** (test-after):
- ✓ Background job created
- ✓ Job ID returned
- ✓ Progress displayed
- ✓ Job trackable via `/specweave:jobs`

---

## Phase 3: Init Flow Integration

### T-011: Integrate GitHub cloning into init.ts

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (simple integration)

**Description**:
Add GitHub cloning trigger to init.ts workflow after ADO cloning section.

**Implementation Steps**:
1. Import `triggerGitHubRepoCloning` from `../helpers/init/github-repo-cloning.js`
2. After line 517 in init.ts, add GitHub cloning block
3. Check: `if (repoResult.hosting === 'github-multirepo' && repoResult.adoClonePatternResult)`
4. Call `triggerGitHubRepoCloning()` with detected org and PAT
5. Add job ID to `pendingJobIds[]` array
6. Handle errors gracefully (non-blocking)

**Location**: [init.ts:517](src/cli/commands/init.ts#L517)

**Test Plan** (test-after):
- ✓ GitHub multi-repo init triggers cloning
- ✓ Job ID added to pendingJobIds
- ✓ Living docs receives pendingJobIds
- ✓ Errors don't block init flow

---

### T-012: Integrate Bitbucket cloning into init.ts

**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Model Hint**: ⚡ Haiku (same as GitHub)

**Description**:
Add Bitbucket cloning trigger to init.ts workflow.

**Implementation Steps**:
1. Import `triggerBitbucketRepoCloning` from `../helpers/init/bitbucket-repo-cloning.js`
2. After GitHub cloning block, add Bitbucket cloning block
3. Check: `if (repoResult.hosting === 'bitbucket-multirepo' && repoResult.adoClonePatternResult)`
4. Call `triggerBitbucketRepoCloning()` with workspace credentials
5. Add job ID to `pendingJobIds[]`
6. Handle errors gracefully

**Test Plan** (test-after):
- ✓ Bitbucket multi-repo init triggers cloning
- ✓ Job ID added to pendingJobIds
- ✓ Living docs dependency works
- ✓ Error handling matches pattern

---

## Phase 4: Testing & Documentation

### Post-Implementation Tests

**Integration Testing Checklist**:
- [ ] GitHub multi-repo init with test org (real API)
- [ ] Bitbucket multi-repo init with test workspace (real API)
- [ ] Job tracking via `/specweave:jobs` shows both providers
- [ ] Living docs waits for clone jobs to complete
- [ ] Pattern filtering works (all/glob/regex)
- [ ] Error handling for invalid tokens
- [ ] Error handling for nonexistent orgs/workspaces
- [ ] Clone URLs work (repos actually cloned)
- [ ] No token/password leaks in logs

**Manual Verification**:
```bash
# Test GitHub multi-repo
specweave init test-github-multi --language=en
# Select: multiple repos
# Select: GitHub
# Select: All / pattern
# Verify: /specweave:jobs shows clone job
# Verify: repos cloned to project directory

# Test Bitbucket multi-repo
specweave init test-bitbucket-multi --language=en
# Select: multiple repos
# Select: Bitbucket
# Select: All / pattern
# Verify: /specweave:jobs shows clone job
# Verify: repos cloned to project directory
```

---

## Dependencies Between Tasks

```
T-001 → T-002 → T-003 → T-004 → T-005 → T-011
T-006 → T-007 → T-008 → T-009 → T-010 → T-012
```

- GitHub tasks (T-001 to T-005) are independent of Bitbucket tasks (T-006 to T-010)
- T-011 (GitHub integration) depends on T-001 to T-005 complete
- T-012 (Bitbucket integration) depends on T-006 to T-010 complete

---

## Success Metrics

✅ **Functional Parity**:
- GitHub and Bitbucket cloning works exactly like ADO
- Same UX, same job tracking, same error handling

✅ **User Experience**:
- No manual cloning required after init
- Background jobs don't block init flow
- Progress visible in `/specweave:jobs`

✅ **Quality**:
- 80% test coverage (test-after)
- No token/password leaks
- Graceful error handling
- Works with large orgs (500+ repos)
