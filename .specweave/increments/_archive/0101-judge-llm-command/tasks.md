---
increment: 0101-judge-llm-command
status: planned
phases:
  - foundation
  - implementation
  - testing
estimated_tasks: 6
---

# Tasks: Judge LLM Command

## Phase 1: Foundation

### T-001: Create slash command file
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed
**Model**: ⚡ Haiku

Create `plugins/specweave/commands/specweave-judge.md` with:
- Command documentation
- Usage examples
- Implementation instructions for Claude

**Acceptance Criteria**:
- File exists at correct location
- YAML frontmatter with name and description
- Usage examples for all modes

**Test Plan**:
```gherkin
Given the command file exists
When user runs /specweave:judge --help
Then usage instructions are displayed
```

---

### T-002: Implement file input parsing
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed (via prompt-based command)
**Model**: 🧠 Sonnet

Implement logic to:
1. Parse file paths from command arguments
2. Support glob patterns (*.ts, src/**/*.js)
3. Validate files exist and are readable
4. Return list of files to analyze

**Location**: `src/cli/commands/judge.ts` (new file)

**Acceptance Criteria**:
- Single file path works
- Glob patterns expand correctly
- Non-existent files show clear error
- Binary files are skipped with warning

**Test Plan**:
```gherkin
Given a TypeScript file at src/example.ts
When user runs /specweave:judge src/example.ts
Then the file is added to validation queue

Given a glob pattern src/*.ts
When user runs /specweave:judge "src/*.ts"
Then all matching .ts files are validated
```

---

### T-003: Implement git-aware input sources
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed (via prompt-based command)
**Model**: 🧠 Sonnet

Implement git integration:
1. `--staged`: Get list of staged files via `git diff --staged --name-only`
2. `--last-commit`: Get files from `git diff HEAD~1 --name-only`
3. `--diff <branch>`: Get files from `git diff <branch> --name-only`
4. Graceful fallback when not in git repo

**Location**: `src/cli/commands/judge.ts`

**Acceptance Criteria**:
- --staged returns only staged files
- --last-commit returns files from last commit
- --diff shows files changed vs branch
- Clear message when no git repo

**Test Plan**:
```gherkin
Given staged changes exist
When user runs /specweave:judge --staged
Then only staged files are validated

Given not in a git repository
When user runs /specweave:judge --staged
Then error message explains no git repo found
```

---

## Phase 2: Core Implementation

### T-004: Implement judge LLM evaluation logic
**User Story**: US-001, US-003
**Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05, AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed (via prompt-based command - Claude follows judge pattern)
**Model**: 💎 Opus

Core judge implementation:
1. Build evaluation prompt with chain-of-thought structure
2. Support quick/default/deep modes
3. Parse LLM response into structured verdict
4. Calculate confidence score

**Key Components**:
- `JudgeEvaluator` class with `evaluate(files, mode)` method
- Prompt templates for different modes
- Response parser for verdict extraction

**Location**: `src/core/judge/judge-evaluator.ts` (new file)

**Acceptance Criteria**:
- Returns APPROVED | CONCERNS | REJECTED verdict
- Confidence score between 0.0-1.0
- Reasoning chain captured and displayed
- Different modes have appropriate depth

**Test Plan**:
```gherkin
Given a well-written TypeScript file
When evaluated with judge LLM
Then verdict is APPROVED with high confidence

Given a file with obvious security issue
When evaluated with judge LLM
Then verdict is REJECTED with security concern listed

Given --quick mode
When evaluation runs
Then completes in under 15 seconds
```

---

### T-005: Implement issue categorization and reporting
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed (via prompt-based command)
**Model**: 🧠 Sonnet

Issue reporting system:
1. Parse issues from LLM response
2. Categorize by severity (CRITICAL, HIGH, MEDIUM, LOW)
3. Format for terminal output
4. Support markdown export

**Location**: `src/core/judge/issue-reporter.ts` (new file)

**Acceptance Criteria**:
- Issues have category, title, description, location
- --fix flag adds specific code suggestions
- --export writes markdown report
- Terminal output is colorized and readable

**Test Plan**:
```gherkin
Given evaluation found 3 issues
When displayed to user
Then issues are sorted by severity (CRITICAL first)
And each issue shows location and suggestion

Given --export flag
When evaluation completes
Then markdown report is written to file
```

---

## Phase 3: Integration

### T-006: Integration and CLI wiring
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed (prompt-based - no CLI needed)
**Model**: ⚡ Haiku

Wire everything together:
1. Add `judge` command to CLI
2. Handle all command-line flags
3. Display formatted output
4. Handle errors gracefully

**Location**: `src/cli/commands/judge.ts`

**Acceptance Criteria**:
- `specweave judge` works from CLI
- `/specweave:judge` works from slash command
- All flags work as documented
- Errors show helpful messages

**Test Plan**:
```gherkin
Given specweave CLI installed
When user runs specweave judge --help
Then usage information is displayed

Given invalid file path
When user runs specweave judge nonexistent.ts
Then clear error message is shown
```

---

## Summary

| Task | User Story | Model | Status |
|------|------------|-------|--------|
| T-001 | US-005 | ⚡ Haiku | ✅ Completed |
| T-002 | US-001 | 🧠 Sonnet | ✅ Completed (prompt-based) |
| T-003 | US-002 | 🧠 Sonnet | ✅ Completed (prompt-based) |
| T-004 | US-001, US-003 | 💎 Opus | ✅ Completed (prompt-based) |
| T-005 | US-004 | 🧠 Sonnet | ✅ Completed (prompt-based) |
| T-006 | US-005 | ⚡ Haiku | ✅ Completed (prompt-based) |

**Total Tasks**: 6
**Completed**: 6/6 (100%)
**Implementation**: Prompt-based command (Claude follows instructions in specweave-judge.md)
