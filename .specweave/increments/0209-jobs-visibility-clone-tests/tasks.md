# Tasks: 0209 Jobs Visibility + Clone Tests

### T-001: Create /sw:jobs skill definition
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given skill file at `plugins/specweave/skills/jobs/SKILL.md` → When frontmatter parsed → Then has description and argument-hint but NO name field

### T-002: Write job-dependency.test.ts
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given job with dependencies → When checkDependencies called → Then status reflects completed/failed/waiting deps

### T-003: Write clone-worker.test.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Test**: Given repo already exists → When clone attempted → Then repo skipped and job continues

### T-004: Write github-repo-cloning.test.ts
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given GitHub org and PAT → When fetchGitHubRepos called → Then repos fetched with auth headers

### T-005: Write ado-repo-cloning.test.ts
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02 | **Status**: [x] completed
**Test**: Given ADO project with spaces → When sanitizeProjectNameForPath called → Then filesystem-safe name returned

### T-006: Write jobs-hook.test.ts (integration)
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02 | **Status**: [x] completed
**Test**: Given `/sw:jobs` prompt → When hook executes → Then read-jobs.sh called and output returned via additionalContext
