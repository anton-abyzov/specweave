---
increment: 0103-list-last-commits
status: planned
phases:
  - implementation
  - testing
estimated_tasks: 3
---

# Tasks: List Last 2 Commits

## Phase 1: Implementation

### T-001: Create commits CLI command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Model**: haiku

**Description**:
Add `specweave commits` command that runs `git log -2 --format="%h %an: %s"` and displays output.

**Implementation**:
1. Create `src/cli/commands/commits.ts`
2. Register command in `src/cli/index.ts`
3. Use `child_process.execSync` to run git command
4. Format and display output

**Test Plan**:
```gherkin
Given I am in a git repository with commits
When I run "specweave commits"
Then I see the last 2 commits with hash, author, and message
```

---

### T-002: Add git repository validation
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Model**: haiku

**Description**:
Detect if current directory is within a git repository. Show friendly error if not.

**Implementation**:
1. Run `git rev-parse --git-dir` to check if in git repo
2. If command fails, display "Error: Not a git repository"
3. Works from any subdirectory (git handles this automatically)

**Test Plan**:
```gherkin
Given I am NOT in a git repository
When I run "specweave commits"
Then I see error "Not a git repository"

Given I am in a subdirectory of a git repository
When I run "specweave commits"
Then I see the last 2 commits successfully
```

---

## Phase 2: Testing

### T-003: Write unit tests
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Model**: haiku

**Description**:
Create unit tests for the commits command.

**Implementation**:
1. Create `tests/unit/cli/commands/commits.test.ts`
2. Mock `child_process.execSync`
3. Test successful output formatting
4. Test git error handling

**Test Plan**:
```gherkin
Given the commits command module
When tested with mocked git output
Then it formats commits correctly

Given the commits command module
When git command fails
Then it returns appropriate error
```

---

## AC Coverage Matrix

| AC-ID | Task(s) | Status |
|-------|---------|--------|
| AC-US1-01 | T-001, T-003 | completed |
| AC-US1-02 | T-001, T-003 | completed |
| AC-US1-03 | T-002, T-003 | completed |
| AC-US1-04 | T-002 | completed |
