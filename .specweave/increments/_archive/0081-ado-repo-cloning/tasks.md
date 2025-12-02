# 0081: ADO Repository Cloning - Tasks

## Tasks

### T-001: Add listRepositories to AzureDevOpsProvider
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P1

Add method to fetch repository list from ADO REST API.

**Implementation**:
- Add `listRepositories(org, project, token)` method
- Call `GET /_apis/git/repositories?api-version=7.0`
- Return array of `{ id, name, remoteUrl, sshUrl }`
- Handle 401/403 with actionable error messages

**Tests**:
```gherkin
Given valid ADO credentials
When listRepositories is called
Then returns array of repositories with name and URLs

Given invalid PAT
When listRepositories is called
Then throws error with "Check PAT permissions" message
```

---

### T-002: Add pattern matching filter utility
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed
**Priority**: P1

Create utility to filter repositories by glob/regex pattern.

**Implementation**:
- Add `filterRepositoriesByPattern()` to `selection-strategy.ts`
- Support `*` (all), glob patterns, `regex:` prefix
- Use existing `parsePatternShortcut()` for shortcuts
- Use `minimatch` for glob matching

**Tests**:
```gherkin
Given repos ["sw-fe", "sw-be", "other-repo"]
When filtered with pattern "sw-*"
Then returns ["sw-fe", "sw-be"]

Given repos ["api-v1", "api-v2", "web"]
When filtered with pattern "regex:^api-v\\d+$"
Then returns ["api-v1", "api-v2"]

Given any repos
When filtered with pattern "*"
Then returns all repos
```

---

### T-003: Wire ADO cloning into init flow
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Priority**: P1

Create `ado-repo-cloning.ts` and integrate into init.

**Implementation**:
1. Create `src/cli/helpers/init/ado-repo-cloning.ts`:
   - `triggerAdoRepoCloning(projectPath, adoProjectSelection, clonePattern)`
   - Fetch repos from each selected project
   - Filter by pattern
   - Create background job via `getJobManager()`
   - Clone repos asynchronously (don't await)
   - Print "Cloning X repos in background. Check /specweave:jobs"

2. Update `init.ts` (~line 486):
   ```typescript
   if (repoResult.adoProjectSelection && repoResult.adoClonePatternResult?.strategy !== 'skip') {
     await triggerAdoRepoCloning(targetDir, repoResult.adoProjectSelection, repoResult.adoClonePatternResult);
   }
   ```

**Tests**:
```gherkin
Given ADO project selection with 3 projects
And clone pattern "sw-*"
When init completes
Then background job is created
And repos matching pattern are queued for cloning
And init does not block on clone completion
```

---

### T-004: Create /specweave-ado:clone-repos command
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P2

Slash command for post-init repo cloning.

**Implementation**:
- Create `plugins/specweave-ado/commands/specweave-ado-clone-repos.md`
- Prompt for org/PAT if not in .env
- Prompt for project selection
- Prompt for clone pattern
- Start background clone job
- Show progress instructions

**Tests**:
```gherkin
Given user skipped cloning during init
When /specweave-ado:clone-repos is run
Then prompts for ADO organization
And prompts for project selection
And starts cloning in background
And shows job ID for progress tracking
```

---

## Summary

| Task | Priority | ACs Covered | Status |
|------|----------|-------------|--------|
| T-001 | P1 | AC-US1-01, AC-US1-02, AC-US1-03 | completed |
| T-002 | P1 | AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | completed |
| T-003 | P1 | AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 | completed |
| T-004 | P2 | AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04 | completed |
