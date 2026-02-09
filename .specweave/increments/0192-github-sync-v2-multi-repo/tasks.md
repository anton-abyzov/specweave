# Tasks: GitHub Sync V2

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: haiku (simple), opus (default)

## Phase 1: Foundation & Cleanup

### T-001: Delete deprecated files
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03 | **Status**: [x] completed
**Test**: Given deprecated files exist → When T-001 runs → Then task-sync.ts, task-parser.ts deleted AND github-issue-tracker skill directory deleted AND no imports reference deleted files AND build passes

**Implementation**:
- Delete `plugins/specweave-github/lib/task-sync.ts`
- Delete `plugins/specweave-github/lib/task-parser.ts`
- Delete `plugins/specweave-github/skills/github-issue-tracker/` directory
- Grep for imports of deleted files and remove them
- Verify `npm run rebuild` passes

**Dependencies**: None

---

### T-002: [P] Create GitHubGraphQLClient utility
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-06 | **Status**: [x] completed
**Test**: Given gh CLI is authenticated → When createProject is called → Then GraphQL mutation executes via `gh api graphql` AND returns project node ID

**Implementation**:
- Create `plugins/specweave-github/lib/github-graphql-client.ts`
- Methods: `getOwnerNodeId(login)`, `createProjectV2(ownerId, title)`, `addProjectV2Item(projectId, contentId)`, `updateItemFieldValue(projectId, itemId, fieldId, value)`, `getProjectFields(projectId)`
- All calls via `child_process.execFile('gh', ['api', 'graphql', ...])`
- GraphQL error parsing (extract `errors[].message`)
- Unit test: `github-graphql-client.test.ts` with mocked gh CLI

**Dependencies**: None

---

### T-003: [P] Extend GitHubConfig type with V2 fields
**User Story**: US-003 | **Satisfies ACs**: AC-US3-07 | **Status**: [x] completed
**Test**: Given config.json has projectV2Number field → When config is loaded → Then GitHubConfig.projectV2Number is populated

**Implementation**:
- Edit `src/core/types/sync-profile.ts`
- Add to GitHubConfig: `projectV2Number?: number`, `projectV2Id?: string`, `projectV2Enabled?: boolean`, `statusFieldMapping?: Record<string, string>`, `priorityFieldMapping?: Record<string, string>`
- Add `GitHubUserStoryLink` interface: `issueNumber`, `issueUrl`, `issueNodeId`, `syncedAt`, `lastConflict`
- Add `GitHubSyncMetadata` interface: `syncStatus`, `projectV2Number`, `projectV2Id`, `userStories: Record<string, GitHubUserStoryLink>`, `crossTeamRepos`

**Dependencies**: None

---

### T-004: [P] Update sync command with deprecation redirect
**User Story**: US-006 | **Satisfies ACs**: AC-US6-04 | **Status**: [x] completed
**Test**: Given old /sw-github:sync command → When invoked → Then shows deprecation warning AND redirects to /sw-github:sync-spec

**Implementation**:
- Edit `plugins/specweave-github/commands/sync.md`
- Add deprecation notice at top
- Point users to `/sw-github:sync-spec`

**Dependencies**: None

---

## Phase 2: Core Spec-to-Issue Sync

### T-005: [P] Implement issue body generator
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given User Story with 3 ACs → When generateIssueBody called → Then body has description + 3 checkbox items with AC-IDs + priority badge + specweave sync markers

**Implementation**:
- Create `plugins/specweave-github/lib/github-issue-body-generator.ts`
- Generate markdown: description, AC checkboxes between `<!-- specweave:ac-start -->` / `<!-- specweave:ac-end -->` markers
- Include footer: `<!-- specweave:sync spec=spec-001 us=US-001 -->`
- Unit test: `github-issue-body-generator.test.ts`

**Dependencies**: None

---

### T-006: Implement push sync (US → GitHub Issue)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04, AC-US1-05 | **Status**: [x] completed
**Test**: Given spec with US-001 and US-002 → When syncSpecToGitHub runs → Then 2 GitHub Issues created with `[US-001]` and `[US-002]` title prefixes AND labels applied AND idempotent re-run updates existing issues

**Implementation**:
- Extend `github-spec-sync.ts` `syncUserStories()` method
- For each US: search existing by `[US-XXX]` prefix via `gh issue list --search`
- If found: `gh issue edit` (update body, labels)
- If not found: `gh issue create` with title `[US-XXX] Title`, body from T-005, labels
- Return issue numbers and URLs
- Unit test with mocked gh CLI

**Dependencies**: T-005

---

### T-007: Update spec frontmatter after sync
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06 | **Status**: [x] completed
**Test**: Given push created issue #42 for US-001 → When frontmatter update runs → Then spec.md has `externalLinks.github.userStories.US-001.issueNumber: 42` AND `syncStatus: synced`

**Implementation**:
- After push sync, update spec.md YAML frontmatter
- Add/update `externalLinks.github.userStories` map
- Set `syncStatus: synced`, update `syncedAt` timestamp
- Follow existing frontmatter update pattern from Jira sync

**Dependencies**: T-006, T-003

---

### T-008: Implement batch sync-all mode
**User Story**: US-001 | **Satisfies ACs**: AC-US1-07 | **Status**: [x] completed
**Test**: Given 3 specs in workspace → When `--all` flag used → Then all 3 synced sequentially AND summary reported

**Implementation**:
- Add `--all` flag to sync-spec command
- Discover specs via `glob('.specweave/docs/internal/specs/**/spec-*.md')`
- Sync each sequentially
- Report summary: "Synced 3/3 specs, 8 issues created, 2 updated"

**Dependencies**: T-006

---

### T-009: [P] Implement issue body parser for pull
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Test**: Given issue body with `- [x] AC-US1-01: Login works` between markers → When parseIssueBody runs → Then returns `{AC-US1-01: {checked: true}}`

**Implementation**:
- Create `plugins/specweave-github/lib/github-issue-body-parser.ts`
- Parse AC checkboxes between `<!-- specweave:ac-start -->` markers
- Extract AC-ID, checked state
- Fallback regex if markers missing (user edited issue)
- Unit test: `github-issue-body-parser.test.ts`

**Dependencies**: None

---

### T-010: Implement pull sync (GitHub → spec)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given issue #42 closed AND AC-US1-01 toggled on GitHub → When pull runs → Then spec.md US-001 marked complete AND AC-US1-01 checked

**Implementation**:
- Add `pullFromGitHub(specId)` to `github-spec-sync.ts`
- For each linked US: `gh issue view NUMBER --json title,body,state,labels`
- Parse body checkboxes via T-009
- Compare with spec states, detect changes
- Apply non-conflicting changes, route conflicts to T-011

**Dependencies**: T-009, T-007

---

### T-011: Implement conflict detection and resolution
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04, AC-US2-05 | **Status**: [x] completed
**Test**: Given spec AC unchecked but GitHub checked AND spec title changed locally → When conflict detection runs → Then 2 conflicts detected AND resolution options shown

**Implementation**:
- Create `plugins/specweave-github/lib/github-conflict-resolver.ts`
- Field-level comparison: title, status, each AC checkbox
- Modes: `github-wins`, `spec-wins`, `prompt`
- Default: `github-wins` for status, `prompt` for content
- Wire two-way: push first, pull second, flag conflicts
- Log conflicts to metadata

**Dependencies**: T-010

---

## Phase 3: Projects V2 Integration

### T-012: Create Projects V2 board resolver
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given projectV2Enabled:true → When sync runs → Then Project V2 created (or existing found) AND issues added as items

**Implementation**:
- Create `plugins/specweave-github/lib/github-board-resolver-v2.ts`
- `findOrCreateProjectV2(config)`: query by number, create if missing
- `addIssuesToProject(projectId, issueNodeIds)`: batch add
- Delete old `github-board-resolver.ts` (AC-US6-01)

**Dependencies**: T-002

---

### T-013: Implement Status and Priority field sync
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given V2 project with Status field → When US-001 synced as "in-progress" → Then item Status set to "In Progress"

**Implementation**:
- Query project fields, cache field IDs and option IDs
- Map via configurable `statusFieldMapping` / `priorityFieldMapping`
- Defaults: `planned→Todo`, `in-progress→In Progress`, `completed→Done`
- Use `updateProjectV2ItemFieldValue` mutation
- Warn (don't fail) if field not found

**Dependencies**: T-012, T-002

---

### T-014: Wire Projects V2 into sync flow
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02, AC-US3-05, AC-US3-07 | **Status**: [x] completed
**Test**: Given push creates 3 issues AND projectV2Enabled → When sync completes → Then 3 items on Project V2 with correct Status/Priority

**Implementation**:
- After issue creation (T-006), check `projectV2Enabled`
- Get issue node IDs, add to project, set field values
- Cross-repo: issues from different repos → same org-level project
- Store `projectV2Id`/`projectV2Number` in spec frontmatter

**Dependencies**: T-006, T-012, T-013

---

## Phase 4: Multi-Repo Distributed Sync

### T-015: Implement cross-repo issue creation
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given US-FE-001 (frontend) and US-BE-001 (backend) with distributed strategy → When sync runs → Then issue in org/frontend-app AND issue in org/backend-api

**Implementation**:
- Extend distributed strategy in `github-spec-sync.ts`
- Resolve target repo per US via project detection or frontmatter tags
- Cross-team stories: detect `projects: [frontend, backend]`, create in all repos

**Dependencies**: T-006

---

### T-016: Implement cross-repo issue linking
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04, AC-US4-05 | **Status**: [x] completed
**Test**: Given cross-team US in 2 repos → When linking runs → Then each issue body has "Also tracked in: org/other-repo#XX"

**Implementation**:
- After multi-repo creation, add cross-reference section to issue bodies
- If projectV2Enabled: add all cross-repo issues to shared org-level Project V2
- Update issues via `gh issue edit`

**Dependencies**: T-015, T-014

---

### T-017: [P] Implement shared rate limiter
**User Story**: US-004 | **Satisfies ACs**: AC-US4-06 | **Status**: [x] completed
**Test**: Given rate limit at 90% → When multi-repo sync starts → Then syncs sequentially AND no 429 errors

**Implementation**:
- Create `plugins/specweave-github/lib/github-rate-limiter.ts`
- Token bucket: check `gh api rate_limit` for current usage
- Pre-flight estimation of API calls per spec
- Parallel if capacity, sequential if near limit
- Backoff on 429: exponential retry (max 3)

**Dependencies**: None

---

## Phase 5: Agent Teams Orchestration

### T-018: [P] Create team-orchestrate skill
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-06, AC-US5-07 | **Status**: [x] completed
**Test**: Given "build checkout across frontend and backend" → When skill activates → Then proposes 2 agents with increments, worktrees, sync profiles, and file ownership

**Implementation**:
- Create `plugins/specweave/skills/team-orchestrate/SKILL.md`
- No `name:` in frontmatter (strips plugin prefix)
- Skill instructs Claude to: analyze feature, create per-domain increments, spawn agents via Task tool, assign worktrees and sync profiles
- Detect Agent Teams via `$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var

**Dependencies**: None

---

### T-019: [P] Create team-status skill
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [x] completed
**Test**: Given 2 agents running → When /sw:team-status → Then table with agent, increment, tasks %, sync status

**Implementation**:
- Create `plugins/specweave/skills/team-status/SKILL.md`
- Read `.specweave/state/parallel/session.json` for agent states
- Read each increment's tasks.md for completion %
- Display table output

**Dependencies**: None

---

### T-020: Create team-merge skill
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04, AC-US5-05 | **Status**: [x] completed
**Test**: Given all agents completed → When merge runs → Then worktrees merged in order AND GitHub sync triggered per increment

**Implementation**:
- Create merge logic in `team-orchestrate/SKILL.md` or separate `team-merge/SKILL.md`
- Merge worktrees in dependency order
- Trigger `/sw-github:sync-spec` per merged increment

**Dependencies**: T-018, T-014

---

## Phase 6: Documentation & Tests

### T-021: Update architecture documentation
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05 | **Status**: [x] completed
**Test**: Given docs updated → Then single canonical sync path documented AND V2 integration documented

**Implementation**:
- Update `MULTI-PROJECT-SYNC-ARCHITECTURE.md`
- Document spec-based sync as canonical path
- Document Projects V2, distributed strategy, Agent Teams

**Dependencies**: T-015, T-014

---

### T-022: Update github-sync skill docs
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05 | **Status**: [x] completed
**Test**: Given skill docs → Then accurate guidance for V2 commands AND no deprecated references

**Implementation**:
- Update `plugins/specweave-github/skills/github-sync/SKILL.md`
- Document sync-spec as primary, Projects V2 config, distributed workflow

**Dependencies**: T-004

---

### T-023: Write unit and integration tests
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed
**Test**: Given test suite → When `npm test` → Then all new tests pass AND coverage > 80%

**Implementation**:
- `github-graphql-client.test.ts`
- `github-issue-body-generator.test.ts`
- `github-issue-body-parser.test.ts`
- `github-conflict-resolver.test.ts`
- `github-board-resolver-v2.test.ts`
- `github-rate-limiter.test.ts`
- `github-spec-sync.test.ts` (end-to-end with mocks)
- All use `vi.hoisted()` + `vi.mock()` pattern

**Dependencies**: T-006, T-010, T-012, T-017
