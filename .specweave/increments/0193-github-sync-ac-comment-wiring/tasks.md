# Tasks: Wire AC Completion to GitHub Comments & Fix Bidirectional Multi-Repo Sync

## Task Notation

- `[T###]`: Task ID
- `[RED]`/`[GREEN]`/`[REFACTOR]`: TDD phase
- `[ ]`: Not started | `[x]`: Completed

## Phase 1: AC Comment Poster (US-001, US-005)

### T-001: [RED] Write failing tests for AC comment poster
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-05, AC-US5-06 | **Status**: [x] completed
**Test**: Given github-ac-comment-poster does not exist → When tests run → Then all tests FAIL (module not found)

**Description**: Write comprehensive failing tests for the comment poster module BEFORE implementation.

**Test Plan**:
- **File**: `tests/unit/plugins/github/github-ac-comment-poster.test.ts`
- **Tests**:
  - **TC-001**: Posts aggregated progress comment to correct GitHub issue
    - Given spec.md has US-001 with 3/5 ACs complete and linked issue #42
    - When `postACProgressComments('0193', ['US-001'], specPath, opts)` called
    - Then `gh issue comment 42 --body <progress-markdown> -R owner/repo` executed
  - **TC-002**: Handles multiple affected user stories
    - Given US-001 linked to #42 and US-002 linked to #43
    - When called with `['US-001', 'US-002']`
    - Then comments posted to both #42 and #43
  - **TC-003**: Skips US without GitHub issue link
    - Given US-003 has no issue link in sync profile
    - When called with `['US-003']`
    - Then returns empty posted array, no error
  - **TC-004**: GitHub API failure returns error, does not throw
    - Given `gh issue comment` returns exit code 1
    - When comment poster runs
    - Then result has error entry, no exception thrown
  - **TC-005**: Uses ProgressCommentBuilder format with percentage
    - Given spec.md with known AC states
    - When comment posted
    - Then body contains progress percentage and completed AC names
  - **TC-006**: Non-blocking failure mode — errors become warnings
    - Given GitHub is completely down
    - When comment poster runs
    - Then returns result with errors array, never throws

**Implementation Details**:
- Use `vi.hoisted()` + `vi.mock()` ESM pattern for `execFileNoThrow`, `ProgressCommentBuilder`, `readFile`
- Follow `github-push-sync.test.ts` structure with helpers (execSuccess, execFailure, makeOptions)
- Mock `fs/promises.readFile` to return test spec.md content with known AC states and frontmatter

**File**: `tests/unit/plugins/github/github-ac-comment-poster.test.ts`
**Dependencies**: None

---

### T-002: [GREEN] Implement github-ac-comment-poster module
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given T-001 tests exist → When module implemented → Then all T-001 tests PASS

**Description**: Create `plugins/specweave-github/lib/github-ac-comment-poster.ts` — minimal implementation to pass all T-001 tests.

**Implementation Details**:
- Export `postACProgressComments(incrementId: string, affectedUSIds: string[], specPath: string, options: {owner, repo, token?}): Promise<CommentPostResult>`
- Read spec.md to extract AC states for affected USs
- Use `ProgressCommentBuilder` to generate comment markdown
- Parse spec.md frontmatter for `github.userStoryLinks` to find issue numbers
- Post via `execFileNoThrow('gh', ['issue', 'comment', issueNumber, '--body', comment, '-R', repoSlug])`
- Return `{ posted: [{usId, issueNumber}], errors: [{usId, error}] }`
- Handle missing issue links gracefully (skip with warning)
- Never throw — all errors go to result.errors

**File**: `plugins/specweave-github/lib/github-ac-comment-poster.ts`
**Dependencies**: T-001

---

### T-003: [REFACTOR] Clean up AC comment poster code
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed (code already clean)
**Test**: Given T-001 tests pass → When code refactored → Then tests still pass

**Description**: Refactor comment poster for clarity and maintainability. Extract helpers, improve types, add JSDoc. All T-001 tests must remain green.

**File**: `plugins/specweave-github/lib/github-ac-comment-poster.ts`
**Dependencies**: T-002

---

## Phase 2: Background Handler + Dispatcher Wiring (US-001)

### T-004: Create github-ac-sync-handler shell script and wire into dispatcher
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05 | **Status**: [x] completed
**Test**: Given task-ac-sync-guard completes → When handler fires → Then 5s debounce + circuit breaker + file locking + calls comment poster

**Description**: Create `plugins/specweave-github/hooks/github-ac-sync-handler.sh` background handler AND wire it into `post-tool-use.sh`.

**Handler details**:
- Signal file debounce: `.specweave/state/.github-ac-pending-{INC_ID}` timestamp
  - If file < 5s old → exit (let next invocation handle)
  - If file >= 5s old or doesn't exist → create signal, wait 5s, process
- Circuit breaker: `.specweave/state/.hook-circuit-breaker-github-ac` (threshold=3)
- File locking: mkdir-based lock at `.specweave/state/.hook-github-ac-sync.lock` (15s stale recovery)
- After debounce: `node plugins/specweave-github/lib/github-ac-comment-poster.js --increment "$INC_ID"`
- Non-blocking: all errors become `exit 0` with logging
- Follow `post-task-completion.sh` patterns exactly

**Dispatcher wiring** — insert after line 312 in `post-tool-use.sh`:
```bash
# GITHUB AC SYNC (v1.0.236+): Post progress to GitHub after AC sync
GITHUB_AC_HANDLER="${HOOK_DIR}/../../../specweave-github/hooks/github-ac-sync-handler.sh"
if [[ -f "$GITHUB_AC_HANDLER" ]]; then
  safe_run_background "$GITHUB_AC_HANDLER" "github-ac-sync" "$INC_ID"
fi
```

**Files**:
- `plugins/specweave-github/hooks/github-ac-sync-handler.sh` (NEW)
- `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh` (MODIFY)
**Dependencies**: T-002

---

## Phase 3: Targeted Push-Sync (US-002)

### T-005: [RED] Write failing tests for targeted push-sync
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [x] completed
**Test**: Given targeted push-sync not yet implemented → When tests run → Then tests FAIL

**Test Plan**:
- **File**: `tests/unit/plugins/github/github-ac-comment-poster.test.ts` (extend existing)
- **Tests**:
  - **TC-007**: Targeted push-sync updates only affected US issue body
    - Given US-001 ACs changed, US-002 unchanged
    - When `postACProgressComments` called with targeted push enabled
    - Then `pushSyncUserStories` called with `[us001Only]`, not all USs
  - **TC-008**: Push-sync is idempotent — same AC state produces same body
    - Given same AC state
    - When push-sync runs twice
    - Then `generateIssueBody` called with identical args both times
  - **TC-009**: Push-sync updates syncedAt frontmatter after success
    - Given successful push-sync
    - When completed
    - Then spec frontmatter `syncedAt` updated

**Implementation Details**:
- Add test cases to existing `github-ac-comment-poster.test.ts`
- Mock `pushSyncUserStories` via `vi.hoisted()` + `vi.mock()`
- Verify single-element array passed to pushSync

**File**: `tests/unit/plugins/github/github-ac-comment-poster.test.ts`
**Dependencies**: T-001

---

### T-006: [GREEN] Add targeted push-sync for affected US
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Test**: Given T-005 tests exist → When targeted push-sync added → Then T-005 tests PASS

**Description**: Extend `github-ac-comment-poster.ts` to call `pushSyncUserStories([singleUS])` after posting comment.

**Implementation Details**:
- After posting comment, parse spec.md to extract UserStoryForSync for affected US
- Call `pushSyncUserStories([affectedUS], options)` — already loops per-US
- This regenerates issue body with `generateIssueBody()` and calls `gh issue edit`
- Update spec frontmatter `syncedAt` via existing frontmatter updater
- Keep idempotent: same AC state = identical body (generateIssueBody is deterministic)

**File**: `plugins/specweave-github/lib/github-ac-comment-poster.ts`
**Dependencies**: T-005

---

## Phase 4: Auto-Closer (US-003)

### T-007: [RED] Write failing tests for auto-closer
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [x] completed
**Test**: Given github-us-auto-closer does not exist → When tests run → Then all tests FAIL

**Test Plan**:
- **File**: `tests/unit/plugins/github/github-us-auto-closer.test.ts`
- **Tests**:
  - **TC-010**: Closes issue when all ACs complete
    - Given spec.md has US-001 with 5/5 ACs complete, linked to issue #42
    - When `autoCloseCompletedUserStories('0193', ['US-001'], specPath, opts)` called
    - Then `gh issue close 42 -R owner/repo` executed
  - **TC-011**: Posts completion comment before closing
    - Given US-001 all ACs complete
    - When auto-closer runs
    - Then `gh issue comment 42` called BEFORE `gh issue close 42`
  - **TC-012**: Skips already-closed issues (idempotent)
    - Given `gh issue view 42 --json state` returns `{"state":"CLOSED"}`
    - When auto-closer runs
    - Then no close or comment calls made, result has skipped entry
  - **TC-013**: Updates V2 Status to Done on close
    - Given Projects V2 config exists
    - When issue closed
    - Then `GitHubFieldSync.syncFields()` called with status "completed"
  - **TC-014**: Does NOT close when some ACs still incomplete
    - Given US-001 has 3/5 ACs complete
    - When auto-closer runs
    - Then no close call made, result has skipped entry with reason
  - **TC-015**: Handles GitHub failure gracefully
    - Given `gh issue close` returns exit code 1
    - When auto-closer runs
    - Then error recorded, no exception thrown

**Implementation Details**:
- Use `vi.hoisted()` + `vi.mock()` for `execFileNoThrow`, `GitHubFieldSync`
- Test call ordering via `mockExecFileNoThrow.mock.calls` index
- Mock `fs/promises.readFile` for spec.md with all/partial ACs complete

**File**: `tests/unit/plugins/github/github-us-auto-closer.test.ts`
**Dependencies**: None

---

### T-008: [GREEN] Implement github-us-auto-closer module
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given T-007 tests exist → When module implemented → Then all T-007 tests PASS

**Description**: Create `plugins/specweave-github/lib/github-us-auto-closer.ts`:
- Export `autoCloseCompletedUserStories(incrementId, affectedUSIds, specPath, options): Promise<AutoCloseResult>`
- For each US: check if ALL ACs are `[x]` complete in spec.md
- If all done:
  1. Check if issue already closed (`gh issue view --json state`)
  2. If open: post completion comment (final summary)
  3. Close via `gh issue close {number} -R {repo}`
  4. If Projects V2 enabled: update Status to "Done" via `GitHubFieldSync`
- Return `{ closed: [{usId, issueNumber}], skipped: [{usId, reason}], errors: [] }`

**File**: `plugins/specweave-github/lib/github-us-auto-closer.ts`
**Dependencies**: T-007

---

### T-009: [REFACTOR] Wire auto-closer into handler + clean up
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Test**: Given T-007 tests pass → When auto-closer wired → Then tests still pass

**Description**: Update `github-ac-sync-handler.sh` to call auto-closer after comment + push-sync.
- After comment post + push-sync: `node plugins/specweave-github/lib/github-us-auto-closer.js --increment "$INC_ID" --user-stories "$AFFECTED_US_IDS"`
- Only call if any US has all ACs complete (quick check before node invocation)
- Clean up auto-closer code, improve types, add JSDoc

**Files**:
- `plugins/specweave-github/hooks/github-ac-sync-handler.sh` (MODIFY)
- `plugins/specweave-github/lib/github-us-auto-closer.ts` (REFACTOR)
**Dependencies**: T-008

---

## Phase 5: Multi-Repo Pull Sync (US-004)

### T-010: [RED] Write failing tests for multi-repo pull sync
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04 | **Status**: [x] completed
**Test**: Given pullSyncMultiRepo does not exist → When tests run → Then all tests FAIL

**Test Plan**:
- **File**: `tests/unit/plugins/github/github-pull-sync-multi-repo.test.ts`
- **Tests**:
  - **TC-016**: Shared US — all repos agree AC done → AC marked done
    - Given US-003 in frontend-app (#10) and backend-api (#20), both have AC-US3-01 checked
    - When `pullSyncMultiRepo()` called
    - Then result has change: AC-US3-01 applied=true
  - **TC-017**: Shared US — repos disagree → AC stays unchecked
    - Given frontend-app has AC-US3-01 checked, backend-api does NOT
    - When pull sync runs
    - Then AC-US3-01 NOT in changes (consensus failed)
  - **TC-018**: Repo-specific US — standard single-repo logic applies
    - Given US-001 only in frontend-app
    - When pull sync runs
    - Then US-001 ACs use single-repo result directly, no consensus
  - **TC-019**: One repo unreachable — others still processed
    - Given backend-api returns 404
    - When pull sync runs
    - Then frontend-app changes processed, error recorded for backend-api
  - **TC-020**: All repos unreachable — no changes, all errors recorded
    - Given both repos return errors
    - When pull sync runs
    - Then result has no changes, 2 errors
  - **TC-021**: 3 repos, 2 agree, 1 disagrees → AC stays unchecked
    - Given 3 repos, 2 have AC checked, 1 does not
    - When pull sync runs
    - Then AC not marked done (all-repos-must-agree)

**Implementation Details**:
- Mock `execFileNoThrow` per-repo by checking args for repo slug
- Test consensus edge cases thoroughly
- Verify non-blocking: errors don't throw, recorded in result

**File**: `tests/unit/plugins/github/github-pull-sync-multi-repo.test.ts`
**Dependencies**: None

---

### T-011: [GREEN] Implement pullSyncMultiRepo
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05 | **Status**: [x] completed
**Test**: Given T-010 tests exist → When pullSyncMultiRepo implemented → Then all T-010 tests PASS

**Description**: Add `pullSyncMultiRepo()` to `github-pull-sync.ts`:
- For each repo: call existing `pullSyncFromGitHub()` to get per-repo results
- Build consensus map: for each AC, collect completion state from all repos
- All-repos-must-agree: AC done only if ALL repos agree
- Repo-specific USs (1 repo): use single-repo result directly
- Record per-repo errors non-blocking: skip erroring repo from consensus

**File**: `plugins/specweave-github/lib/github-pull-sync.ts`
**Dependencies**: T-010

---

### T-012: [REFACTOR] Clean up multi-repo pull sync
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed (code already clean)
**Test**: Given T-010 tests pass → When code refactored → Then tests still pass

**Description**: Clean up pullSyncMultiRepo — extract consensus logic into a pure function, improve types, add JSDoc.

**File**: `plugins/specweave-github/lib/github-pull-sync.ts`
**Dependencies**: T-011

---

## Phase 6: Integration Tests (US-005)

### T-013: [RED] Write integration tests for full chain
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [x] completed
**Test**: Given full chain wired → When integration tests run → Then all chain scenarios verified

**Test Plan**:
- **File**: `tests/unit/plugins/github/github-ac-sync-integration.test.ts`
- **Tests**:
  - **TC-022**: Full chain — AC completion posts comment + updates body
    - Given spec.md with US-001 (3/5 ACs done), issue #42 linked
    - When comment poster + push-sync chain runs
    - Then 2 gh calls: `gh issue comment 42` + `gh issue edit 42`
  - **TC-023**: Full chain — all ACs done triggers close
    - Given spec.md with US-001 (5/5 ACs done)
    - When full chain runs (comment + push + auto-close)
    - Then 3 gh calls: comment + edit + close (in order)
  - **TC-024**: GitHub down — errors recorded, no exceptions
    - Given all `gh` calls return exit code 1
    - When chain runs
    - Then no exceptions thrown, errors in result
  - **TC-025**: Debounce — multiple rapid calls produce single comment
    - Given 5 AC changes in 2 seconds
    - When handler invoked 5 times
    - Then only 1 aggregated comment posted (debounce at module level)

**Implementation Details**:
- Import both `postACProgressComments` and `autoCloseCompletedUserStories`
- Mock `execFileNoThrow` once, verify call sequence across modules
- This is the "full chain" test that proves the system works end-to-end

**File**: `tests/unit/plugins/github/github-ac-sync-integration.test.ts`
**Dependencies**: T-002, T-008, T-011

---

## Summary

| Phase | Tasks | TDD | User Stories | Priority |
|-------|-------|-----|-------------|----------|
| 1: Comment Poster | T-001..T-003 | RED→GREEN→REFACTOR | US-001, US-005 | P1 |
| 2: Handler + Wire | T-004 | (shell, no TDD) | US-001 | P1 |
| 3: Push-Sync | T-005..T-006 | RED→GREEN | US-002, US-005 | P1 |
| 4: Auto-Closer | T-007..T-009 | RED→GREEN→REFACTOR | US-003, US-005 | P2 |
| 5: Multi-Repo Pull | T-010..T-012 | RED→GREEN→REFACTOR | US-004, US-005 | P2 |
| 6: Integration | T-013 | RED | US-005 | P1 |

**Total**: 13 tasks | **Test files**: 4 | **New modules**: 3 | **Modified files**: 2
**TDD coverage**: 9/13 tasks have TDD markers (shell scripts excluded)
