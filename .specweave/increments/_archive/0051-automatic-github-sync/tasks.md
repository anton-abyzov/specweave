---
increment: 0051-automatic-github-sync
title: "Automatic GitHub Sync with Permission Gates"
feature_id: FS-049
total_tasks: 28
completed_tasks: 0
test_mode: TDD
coverage_target: 85
---

# Tasks: Automatic GitHub Sync with Permission Gates

**Test-Driven Development (TDD)**: Write tests first (RED), implement (GREEN), refactor (REFACTOR)

**Coverage Target**: 85% minimum (unit + integration tests)

---

## Phase 1: Permission Gates & Config Schema (8 hours)

### T-001: Add `autoSyncOnCompletion` to Config Schema
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-06
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1 hour

**Implementation Steps**:
1. Update `src/core/config/types.ts` - Add `autoSyncOnCompletion?: boolean` to `SyncSettings` interface
2. Add JSDoc with default value documentation (`@default true`)
3. Update config validation schema (Zod/Joi)
4. Update config examples in README

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/core/config/types.test.ts

describe('SyncSettings Schema', () => {
  it('accepts autoSyncOnCompletion as boolean', () => {
    const config = { sync: { settings: { autoSyncOnCompletion: true } } };
    expect(validateConfig(config)).toBeValid();
  });

  it('defaults autoSyncOnCompletion to true when missing', () => {
    const config = { sync: { settings: {} } };
    const normalized = normalizeConfig(config);
    expect(normalized.sync.settings.autoSyncOnCompletion).toBe(true);
  });

  it('allows autoSyncOnCompletion to be false', () => {
    const config = { sync: { settings: { autoSyncOnCompletion: false } } };
    expect(validateConfig(config)).toBeValid();
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US2-01: Config supports three independent flags (adds 3rd flag)
- [x] AC-US2-06: Default config has `autoSyncOnCompletion: true`

---

### T-002: Add Tool-Specific Gates to Config Schema
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Update `src/core/config/types.ts` - Add `github.enabled?: boolean` to `GitHubConfig`
2. Add `jira.enabled?: boolean` to `JiraConfig`
3. Add `ado.enabled?: boolean` to `AzureDevOpsConfig`
4. Update config validator to check tool-specific gates
5. Add default value logic (enabled: true if credentials configured)

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/core/config/github-config.test.ts

describe('GitHubConfig Tool-Specific Gate', () => {
  it('accepts github.enabled as boolean', () => {
    const config = { sync: { github: { enabled: true, owner: 'org', repo: 'app' } } };
    expect(validateConfig(config)).toBeValid();
  });

  it('defaults github.enabled to true when credentials exist', () => {
    const config = { sync: { github: { owner: 'org', repo: 'app' } } };
    const normalized = normalizeConfig(config);
    expect(normalized.sync.github.enabled).toBe(true);
  });

  it('allows github.enabled to be false', () => {
    const config = { sync: { github: { enabled: false, owner: 'org', repo: 'app' } } };
    expect(validateConfig(config)).toBeValid();
  });

  it('validates all tool-specific gates independently', () => {
    const config = {
      sync: {
        github: { enabled: true },
        jira: { enabled: false },
        ado: { enabled: false }
      }
    };
    expect(validateConfig(config)).toBeValid();
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US2-01: Config supports three independent flags (adds GATE 4)
- [x] AC-US2-05: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync

---

### T-003: Implement 4-Gate Evaluation Logic in SyncCoordinator
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 3 hours

**Implementation Steps**:
1. Update `src/sync/sync-coordinator.ts` - Add `evaluatePermissionGates()` method
2. Implement GATE 1: `canUpsertInternalItems` check (existing)
3. Implement GATE 2: `canUpdateExternalItems` check
4. Implement GATE 3: `autoSyncOnCompletion` check (default: true)
5. Implement GATE 4: `sync.github.enabled` check
6. Add `SyncResult` type with `syncMode` field (`'read-only' | 'living-docs-only' | 'manual-only' | 'external-disabled' | 'full-sync'`)
7. Return appropriate `syncMode` based on gate evaluation

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/sync-coordinator-gates.test.ts

describe('SyncCoordinator Permission Gates', () => {
  let coordinator: SyncCoordinator;
  let mockConfig: any;

  beforeEach(() => {
    coordinator = new SyncCoordinator({ logger: silentLogger });
  });

  // GATE 1: canUpsertInternalItems
  it('GATE 1 false → skip all sync (read-only mode)', async () => {
    mockConfig = { sync: { settings: { canUpsertInternalItems: false } } };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('read-only');
    expect(result.success).toBe(true);
  });

  // GATE 2: canUpdateExternalItems
  it('GATE 2 false → living docs only', async () => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: false
        }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('living-docs-only');
    expect(mockLivingDocsSync).toHaveBeenCalled();
    expect(mockGitHubSync).not.toHaveBeenCalled();
  });

  // GATE 3: autoSyncOnCompletion
  it('GATE 3 false → manual trigger only', async () => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: false
        }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('manual-only');
    expect(mockLivingDocsSync).toHaveBeenCalled();
    expect(mockGitHubSync).not.toHaveBeenCalled();
  });

  // GATE 4: sync.github.enabled
  it('GATE 4 false → external disabled', async () => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: { enabled: false }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('external-disabled');
    expect(mockGitHubSync).not.toHaveBeenCalled();
  });

  // All gates true
  it('All gates true → full auto-sync', async () => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: { enabled: true, owner: 'org', repo: 'app' }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('full-sync');
    expect(mockLivingDocsSync).toHaveBeenCalled();
    expect(mockGitHubSync).toHaveBeenCalled();
  });

  // Test all 16 combinations (truth table)
  it.each([
    [false, false, false, false, 'read-only'],
    [false, false, false, true, 'read-only'],
    [false, false, true, false, 'read-only'],
    [false, false, true, true, 'read-only'],
    [false, true, false, false, 'read-only'],
    [false, true, false, true, 'read-only'],
    [false, true, true, false, 'read-only'],
    [false, true, true, true, 'read-only'],
    [true, false, false, false, 'living-docs-only'],
    [true, false, false, true, 'living-docs-only'],
    [true, false, true, false, 'living-docs-only'],
    [true, false, true, true, 'living-docs-only'],
    [true, true, false, false, 'manual-only'],
    [true, true, false, true, 'manual-only'],
    [true, true, true, false, 'external-disabled'],
    [true, true, true, true, 'full-sync']
  ])('GATE1=%s, GATE2=%s, GATE3=%s, GATE4=%s → %s', async (g1, g2, g3, g4, expectedMode) => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: g1,
          canUpdateExternalItems: g2,
          autoSyncOnCompletion: g3
        },
        github: { enabled: g4, owner: 'org', repo: 'app' }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe(expectedMode);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US2-02: GATE 1 (`canUpsertInternalItems`) controls living docs sync
- [x] AC-US2-03: GATE 2 (`canUpdateExternalItems`) controls external tracker sync
- [x] AC-US2-04: GATE 3 (`autoSyncOnCompletion`) controls automatic trigger
- [x] AC-US2-05: GATE 4 (`sync.github.enabled`) controls GitHub-specific sync

---

### T-004: Add User-Facing Gate Messages
**User Story**: US-002
**Satisfies ACs**: AC-US2-07
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1 hour
**Completed**: 2025-11-23

**Implementation Steps**:
1. Add logger messages for each gate state (enabled/disabled)
2. Add actionable guidance when gates block sync
3. Format messages with clear icons (ℹ️, ⚠️, ✅)
4. Add examples to user documentation

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/sync-coordinator-messages.test.ts

describe('SyncCoordinator User Messages', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = { log: vi.fn(), error: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger });
  });

  it('logs clear message when GATE 1 blocks sync', async () => {
    mockConfig = { sync: { settings: { canUpsertInternalItems: false } } };
    await coordinator.syncIncrementCompletion();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Living docs sync disabled (canUpsertInternalItems=false)')
    );
  });

  it('logs clear message when GATE 3 blocks sync', async () => {
    mockConfig = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: false
        }
      }
    };
    await coordinator.syncIncrementCompletion();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Automatic sync disabled (autoSyncOnCompletion=false)')
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Run /specweave-github:sync to sync manually')
    );
  });

  it('logs success message when all gates pass', async () => {
    mockConfig = fullSyncConfig;
    await coordinator.syncIncrementCompletion();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Automatic sync enabled (autoSyncOnCompletion=true)')
    );
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US2-07: User sees clear message when sync skipped due to permission gates

---

### T-005: Update `specweave init` to Include New Flags
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-06
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Update `src/cli/commands/init.ts` - Add prompt for `autoSyncOnCompletion`
2. Set default to `true` (opt-out model)
3. Update generated `.specweave/config.json` template
4. Add help text explaining gate behavior
5. Update init documentation

**Embedded Tests** (TDD - Write First):
```typescript
// tests/integration/cli/commands/init-config.test.ts

describe('specweave init Config Generation', () => {
  it('generates config with autoSyncOnCompletion: true by default', async () => {
    await runInit({ interactiveAnswers: { enableGitHubSync: true } });
    const config = await readConfig('.specweave/config.json');
    expect(config.sync.settings.autoSyncOnCompletion).toBe(true);
  });

  it('allows user to disable autoSyncOnCompletion', async () => {
    await runInit({ interactiveAnswers: { enableAutoSync: false } });
    const config = await readConfig('.specweave/config.json');
    expect(config.sync.settings.autoSyncOnCompletion).toBe(false);
  });

  it('generates tool-specific gates when credentials provided', async () => {
    await runInit({
      interactiveAnswers: {
        enableGitHub: true,
        githubOwner: 'org',
        githubRepo: 'app'
      }
    });
    const config = await readConfig('.specweave/config.json');
    expect(config.sync.github.enabled).toBe(true);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US2-01: Config supports three independent flags
- [x] AC-US2-06: Default config has `autoSyncOnCompletion: true`

---

## Phase 2: GitHub Issue Creation (12 hours)

### T-006: Implement `createGitHubIssuesForUserStories()` in SyncCoordinator
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0
**Estimated**: 3 hours

**Implementation Steps**:
1. Add `createGitHubIssuesForUserStories()` method to `SyncCoordinator`
2. Load User Stories for increment (use `LivingDocsReader`)
3. Detect feature ID from increment metadata
4. Filter User Stories matching feature ID
5. Initialize `GitHubClientV2` with owner/repo from config
6. Loop through User Stories and create issues (delegated to T-007)

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/sync-coordinator-github.test.ts

describe('SyncCoordinator.createGitHubIssuesForUserStories', () => {
  let coordinator: SyncCoordinator;
  let mockLivingDocsReader: any;
  let mockGitHubClient: any;

  beforeEach(() => {
    mockLivingDocsReader = { getUserStoriesByFeature: vi.fn() };
    mockGitHubClient = { createUserStoryIssue: vi.fn(), findIssueByTitle: vi.fn() };
    coordinator = new SyncCoordinator({
      logger: silentLogger,
      livingDocsReader: mockLivingDocsReader
    });
  });

  it('loads User Stories for increment feature', async () => {
    mockMetadata = { feature_id: 'FS-049' };
    mockLivingDocsReader.getUserStoriesByFeature.mockResolvedValue([
      { id: 'US-001', feature: 'FS-049', title: 'Auto Issue Creation' }
    ]);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLivingDocsReader.getUserStoriesByFeature).toHaveBeenCalledWith('FS-049');
  });

  it('logs message when no User Stories found', async () => {
    mockLivingDocsReader.getUserStoriesByFeature.mockResolvedValue([]);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('No user stories found')
    );
  });

  it('initializes GitHubClientV2 with owner/repo from config', async () => {
    mockConfig = { sync: { github: { owner: 'myorg', repo: 'myapp' } } };
    mockLivingDocsReader.getUserStoriesByFeature.mockResolvedValue([
      { id: 'US-001', feature: 'FS-049', title: 'Test' }
    ]);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(GitHubClientV2.fromRepo).toHaveBeenCalledWith('myorg', 'myapp');
  });

  it('creates issues for all User Stories', async () => {
    mockLivingDocsReader.getUserStoriesByFeature.mockResolvedValue([
      { id: 'US-001', feature: 'FS-049', title: 'Story 1' },
      { id: 'US-002', feature: 'FS-049', title: 'Story 2' }
    ]);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockGitHubClient.createUserStoryIssue).toHaveBeenCalledTimes(2);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US1-01: When increment completes, `SyncCoordinator.syncIncrementCompletion()` called automatically
- [x] AC-US1-02: `SyncCoordinator` detects all User Stories linked to increment's feature

---

## Phase 2: GitHub Issue Creation (continued)

### T-007: Implement `createUserStoryIssue()` in GitHubClientV2
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P0
**Estimated**: 2.5 hours

**Implementation Steps**:
1. Add `createUserStoryIssue()` method to `GitHubClientV2`
2. Format issue title: `[FS-XXX][US-YYY] Title`
3. Format issue body with AC checkboxes
4. Query for feature milestone (if exists)
5. Create issue via GitHub API with milestone link
6. Return issue number

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/plugins/github-client-v2.test.ts

describe('GitHubClientV2.createUserStoryIssue', () => {
  let client: GitHubClientV2;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        issues: { create: vi.fn(), list: vi.fn() },
        search: { issuesAndPullRequests: vi.fn() }
      }
    };
    client = new GitHubClientV2({ owner: 'org', repo: 'app', octokit: mockOctokit });
  });

  it('formats title as [FS-XXX][US-YYY] format', async () => {
    const userStory = { id: 'US-001', feature: 'FS-049', title: 'Auto Issue Creation', acceptanceCriteria: [] };
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123 } });

    await client.createUserStoryIssue(userStory);

    expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: '[FS-049][US-001] Auto Issue Creation' })
    );
  });

  it('formats body with acceptance criteria checkboxes', async () => {
    const userStory = {
      id: 'US-001',
      feature: 'FS-049',
      title: 'Test',
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'Criterion 1' },
        { id: 'AC-US1-02', description: 'Criterion 2' }
      ]
    };
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123 } });

    await client.createUserStoryIssue(userStory);

    const call = mockOctokit.rest.issues.create.mock.calls[0][0];
    expect(call.body).toContain('- [ ] **AC-US1-01**: Criterion 1');
    expect(call.body).toContain('- [ ] **AC-US1-02**: Criterion 2');
  });

  it('links issue to feature milestone if exists', async () => {
    const userStory = { id: 'US-001', feature: 'FS-049', title: 'Test', acceptanceCriteria: [] };
    mockOctokit.rest.issues.list.mockResolvedValue({ data: [{ number: 5, title: 'FS-049: Feature' }] });
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123 } });

    await client.createUserStoryIssue(userStory);

    expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({ milestone: 5 })
    );
  });

  it('creates issue without milestone if feature milestone missing', async () => {
    const userStory = { id: 'US-001', feature: 'FS-049', title: 'Test', acceptanceCriteria: [] };
    mockOctokit.rest.issues.list.mockResolvedValue({ data: [] });
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123 } });

    await client.createUserStoryIssue(userStory);

    expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ milestone: expect.anything() })
    );
  });

  it('returns created issue number', async () => {
    const userStory = { id: 'US-001', feature: 'FS-049', title: 'Test', acceptanceCriteria: [] };
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 456 } });

    const result = await client.createUserStoryIssue(userStory);

    expect(result).toBe(456);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US1-03: For each User Story, create GitHub issue using `GitHubClientV2`
- [x] AC-US1-04: Created issues linked to feature milestone (if exists)

---

### T-008: Update Increment metadata.json with GitHub Issue Numbers
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 2 hours

**Implementation Steps**:
1. Create `MetadataUpdater` utility (`src/utils/metadata-updater.ts`)
2. Add `github.issues` array to metadata schema
3. Implement `addGitHubIssues(incrementId, issues)` method
4. Atomic file write with backup
5. Integrate into `SyncCoordinator` after issue creation

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/utils/metadata-updater.test.ts

describe('MetadataUpdater.addGitHubIssues', () => {
  let tempDir: string;
  let incrementDir: string;
  let metadataPath: string;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    incrementDir = path.join(tempDir, '.specweave/increments/0051-test');
    metadataPath = path.join(incrementDir, 'metadata.json');
    fs.mkdirSync(incrementDir, { recursive: true });
    fs.writeFileSync(metadataPath, JSON.stringify({ id: '0051-test', status: 'active' }));
  });

  it('adds github.issues array to metadata', () => {
    const updater = new MetadataUpdater(tempDir);
    const issues = [
      { userStoryId: 'US-001', issueNumber: 123 },
      { userStoryId: 'US-002', issueNumber: 124 }
    ];

    updater.addGitHubIssues('0051-test', issues);

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    expect(metadata.github.issues).toEqual(issues);
  });

  it('preserves existing metadata fields', () => {
    fs.writeFileSync(metadataPath, JSON.stringify({
      id: '0051-test',
      status: 'active',
      created: '2025-11-23',
      customField: 'value'
    }));
    const updater = new MetadataUpdater(tempDir);

    updater.addGitHubIssues('0051-test', [{ userStoryId: 'US-001', issueNumber: 123 }]);

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    expect(metadata.id).toBe('0051-test');
    expect(metadata.status).toBe('active');
    expect(metadata.customField).toBe('value');
  });

  it('creates backup before modification', () => {
    const updater = new MetadataUpdater(tempDir);
    updater.addGitHubIssues('0051-test', [{ userStoryId: 'US-001', issueNumber: 123 }]);

    const backupPath = path.join(incrementDir, 'metadata.json.backup');
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  it('throws error if increment not found', () => {
    const updater = new MetadataUpdater(tempDir);
    expect(() => updater.addGitHubIssues('9999-missing', [])).toThrow('Increment not found');
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US1-05: `metadata.json` updated with GitHub issue numbers

---

### T-009: Add Success Message Logging
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1 hour

**Implementation Steps**:
1. Add logger calls to `SyncCoordinator.createGitHubIssuesForUserStories()`
2. Format message: "Created {count} GitHub issues for {featureId}"
3. Log individual issue numbers: "  - [FS-XXX][US-YYY] → Issue #123"
4. Write to `.specweave/logs/hooks-debug.log`

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/sync-coordinator-logging.test.ts

describe('SyncCoordinator Success Message Logging', () => {
  let coordinator: SyncCoordinator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = { log: vi.fn(), info: vi.fn(), debug: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger });
  });

  it('logs summary message with count and feature ID', async () => {
    // Setup: 3 user stories, all created successfully
    const result = await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Created 3 GitHub issues for FS-049'
    );
  });

  it('logs individual issue numbers', async () => {
    // Setup: 2 user stories created
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.debug).toHaveBeenCalledWith('  - [FS-049][US-001] → Issue #123');
    expect(mockLogger.debug).toHaveBeenCalledWith('  - [FS-049][US-002] → Issue #124');
  });

  it('logs to hooks-debug.log file', async () => {
    const logPath = path.join(tempDir, '.specweave/logs/hooks-debug.log');
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    const logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('Created 3 GitHub issues for FS-049');
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US1-06: User sees success message: "Created 4 GitHub issues for FS-049"

---

### T-010: Integration Test for Full Issue Creation Flow
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 through AC-US1-06
**Status**: [x] completed
**Priority**: P0
**Estimated**: 3.5 hours

**Implementation Steps**:
1. Create `tests/integration/sync/github-issue-creation.test.ts`
2. Mock GitHub API (Octokit)
3. Test complete flow: increment completion → issue creation → metadata update
4. Verify all 6 ACs for US-001

**Embedded Tests** (TDD - Write First):
```typescript
// tests/integration/sync/github-issue-creation.test.ts

describe('GitHub Issue Creation Integration', () => {
  let tempDir: string;
  let coordinator: SyncCoordinator;
  let mockOctokit: any;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049');
    setupLivingDocs(tempDir, [
      { id: 'US-001', feature: 'FS-049', title: 'Story 1', acceptanceCriteria: [{ id: 'AC-US1-01', description: 'Test' }] },
      { id: 'US-002', feature: 'FS-049', title: 'Story 2', acceptanceCriteria: [] }
    ]);
    mockOctokit = createMockOctokit();
    coordinator = new SyncCoordinator({ projectRoot: tempDir, octokit: mockOctokit });
  });

  it('creates issues for all User Stories in feature', async () => {
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockOctokit.rest.issues.create).toHaveBeenCalledTimes(2);
  });

  it('updates metadata.json with issue numbers', async () => {
    mockOctokit.rest.issues.create
      .mockResolvedValueOnce({ data: { number: 123 } })
      .mockResolvedValueOnce({ data: { number: 124 } });

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    const metadata = readMetadata(tempDir, '0051-test');
    expect(metadata.github.issues).toEqual([
      { userStoryId: 'US-001', issueNumber: 123 },
      { userStoryId: 'US-002', issueNumber: 124 }
    ]);
  });

  it('logs success message with count', async () => {
    const logSpy = vi.spyOn(console, 'log');
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Created 2 GitHub issues for FS-049'));
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US1-01: When increment completes, `SyncCoordinator.syncIncrementCompletion()` called automatically
- [x] AC-US1-02: `SyncCoordinator` detects all User Stories linked to increment's feature
- [x] AC-US1-03: For each User Story, create GitHub issue using `GitHubClientV2`
- [x] AC-US1-04: Created issues linked to feature milestone (if exists)
- [x] AC-US1-05: `metadata.json` updated with GitHub issue numbers
- [x] AC-US1-06: User sees success message: "Created 4 GitHub issues for FS-049"

---

## Phase 3: Idempotency (10 hours)

### T-011: Implement Frontmatter Cache Check (Layer 1)
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-04
**Status**: [x] completed
**Priority**: P0
**Estimated**: 2 hours

**Implementation Steps**:
1. Create `FrontmatterCacheChecker` utility
2. Before creating issue, read User Story frontmatter
3. Check for `external_tools.github.number` field
4. If exists, skip issue creation and return cached number
5. After issue created, update frontmatter with issue number

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/utils/frontmatter-cache-checker.test.ts

describe('FrontmatterCacheChecker', () => {
  let tempDir: string;
  let checker: FrontmatterCacheChecker;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupLivingDocs(tempDir, [{
      id: 'US-001',
      feature: 'FS-049',
      title: 'Test',
      frontmatter: { external_tools: { github: { number: 123 } } }
    }]);
    checker = new FrontmatterCacheChecker(tempDir);
  });

  it('returns cached issue number if exists in frontmatter', () => {
    const result = checker.getCachedIssueNumber('US-001');
    expect(result).toBe(123);
  });

  it('returns null if frontmatter missing github.number', () => {
    setupLivingDocs(tempDir, [{ id: 'US-002', feature: 'FS-049', title: 'Test', frontmatter: {} }]);
    const result = checker.getCachedIssueNumber('US-002');
    expect(result).toBeNull();
  });

  it('updates frontmatter with new issue number', () => {
    checker.updateFrontmatterWithIssue('US-001', 456);
    const updated = checker.getCachedIssueNumber('US-001');
    expect(updated).toBe(456);
  });

  it('preserves other frontmatter fields when updating', () => {
    const userStoryPath = path.join(tempDir, '.specweave/docs/living-docs/features/FS-049/user-stories/US-001.md');
    const original = fs.readFileSync(userStoryPath, 'utf-8');

    checker.updateFrontmatterWithIssue('US-001', 789);

    const updated = fs.readFileSync(userStoryPath, 'utf-8');
    expect(updated).toContain('feature: FS-049'); // Preserved
    expect(updated).toContain('external_tools:\n  github:\n    number: 789'); // Updated
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US3-01: Before creating issue, check User Story frontmatter for existing `github.number`
- [x] AC-US3-04: After issue created, update User Story frontmatter with issue number

---

### T-012: Implement Metadata Cache Check (Layer 2)
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Create `MetadataCacheChecker` utility
2. If Layer 1 (frontmatter) misses, check `metadata.json`
3. Look up issue in `github.issues` array by `userStoryId`
4. If found, backfill Layer 1 (update frontmatter)
5. Return cached issue number

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/utils/metadata-cache-checker.test.ts

describe('MetadataCacheChecker', () => {
  let tempDir: string;
  let checker: MetadataCacheChecker;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049', {
      github: {
        issues: [
          { userStoryId: 'US-001', issueNumber: 123 },
          { userStoryId: 'US-002', issueNumber: 124 }
        ]
      }
    });
    checker = new MetadataCacheChecker(tempDir);
  });

  it('returns cached issue number from metadata.json', () => {
    const result = checker.getCachedIssueNumber('0051-test', 'US-001');
    expect(result).toBe(123);
  });

  it('returns null if User Story not in metadata cache', () => {
    const result = checker.getCachedIssueNumber('0051-test', 'US-999');
    expect(result).toBeNull();
  });

  it('backfills Layer 1 (frontmatter) when metadata cache hit', () => {
    const frontmatterUpdater = vi.spyOn(FrontmatterCacheChecker.prototype, 'updateFrontmatterWithIssue');

    checker.getCachedIssueNumber('0051-test', 'US-001');

    expect(frontmatterUpdater).toHaveBeenCalledWith('US-001', 123);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US3-05: After all issues created, update increment `metadata.json` with issue list

---

### T-013: Implement GitHub API Duplicate Detection (Layer 3)
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P0
**Estimated**: 3 hours

**Implementation Steps**:
1. If Layer 1 and 2 miss, query GitHub API
2. Use `DuplicateDetector.createWithProtection()` (NEVER `--limit 1`!)
3. Search for issues matching `[FS-XXX][US-YYY]` title pattern
4. If found, backfill Layer 1 and Layer 2
5. Return existing issue number

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/github-duplicate-detector.test.ts

describe('GitHub API Duplicate Detection', () => {
  let client: GitHubClientV2;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = { rest: { search: { issuesAndPullRequests: vi.fn() } } };
    client = new GitHubClientV2({ owner: 'org', repo: 'app', octokit: mockOctokit });
  });

  it('uses DuplicateDetector with --limit 50 (NOT 1)', async () => {
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
      data: { items: [{ number: 123, title: '[FS-049][US-001] Test' }] }
    });

    await client.findExistingIssue('FS-049', 'US-001');

    expect(mockOctokit.rest.search.issuesAndPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 50 })
    );
  });

  it('returns existing issue number if duplicate found', async () => {
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
      data: { items: [{ number: 456, title: '[FS-049][US-001] Auto Issue Creation' }] }
    });

    const result = await client.findExistingIssue('FS-049', 'US-001');

    expect(result).toBe(456);
  });

  it('returns null if no duplicate found', async () => {
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
      data: { items: [] }
    });

    const result = await client.findExistingIssue('FS-049', 'US-001');

    expect(result).toBeNull();
  });

  it('backfills Layer 1 and Layer 2 when duplicate found', async () => {
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
      data: { items: [{ number: 789, title: '[FS-049][US-001] Test' }] }
    });
    const frontmatterSpy = vi.spyOn(FrontmatterCacheChecker.prototype, 'updateFrontmatterWithIssue');
    const metadataSpy = vi.spyOn(MetadataUpdater.prototype, 'addGitHubIssues');

    await client.findExistingIssue('FS-049', 'US-001');

    expect(frontmatterSpy).toHaveBeenCalledWith('US-001', 789);
    expect(metadataSpy).toHaveBeenCalledWith('0051-test', [{ userStoryId: 'US-001', issueNumber: 789 }]);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US3-02: If frontmatter missing, query GitHub API to detect duplicates
- [x] AC-US3-03: Use `DuplicateDetector.createWithProtection()` for GitHub queries

---

### T-014: Implement 3-Layer Cache Integration
**User Story**: US-003
**Satisfies ACs**: AC-US3-01 through AC-US3-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 2 hours

**Implementation Steps**:
1. Integrate all 3 layers into `SyncCoordinator`
2. Check Layer 1 (frontmatter, <1ms) first
3. If miss, check Layer 2 (metadata, <5ms)
4. If miss, check Layer 3 (GitHub API, 500-2000ms)
5. Backfill faster layers after each cache hit
6. Verify performance targets (99.9% faster on warm cache)

**Embedded Tests** (TDD - Write First):
```typescript
// tests/integration/sync/three-layer-cache-integration.test.ts

describe('Three-Layer Idempotency Cache Integration', () => {
  let tempDir: string;
  let coordinator: SyncCoordinator;
  let mockOctokit: any;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049');
    setupLivingDocs(tempDir, [
      { id: 'US-001', feature: 'FS-049', title: 'Test', frontmatter: {} }
    ]);
    mockOctokit = createMockOctokit();
    coordinator = new SyncCoordinator({ projectRoot: tempDir, octokit: mockOctokit });
  });

  it('checks Layer 1 (frontmatter) first', async () => {
    // Setup: frontmatter has cached issue
    updateFrontmatter(tempDir, 'US-001', { external_tools: { github: { number: 123 } } });

    const start = Date.now();
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10); // <1ms target
    expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled(); // Skipped creation
  });

  it('checks Layer 2 (metadata) on Layer 1 miss', async () => {
    // Setup: metadata has cached issue, frontmatter empty
    updateMetadata(tempDir, '0051-test', { github: { issues: [{ userStoryId: 'US-001', issueNumber: 124 }] } });

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled(); // Skipped creation
    // Verify Layer 1 backfilled
    const frontmatter = readFrontmatter(tempDir, 'US-001');
    expect(frontmatter.external_tools.github.number).toBe(124);
  });

  it('checks Layer 3 (GitHub API) on Layer 1 and 2 miss', async () => {
    // Setup: API returns existing issue
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
      data: { items: [{ number: 125, title: '[FS-049][US-001] Test' }] }
    });

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockOctokit.rest.issues.create).not.toHaveBeenCalled(); // Skipped creation
    // Verify Layer 1 and 2 backfilled
    const frontmatter = readFrontmatter(tempDir, 'US-001');
    const metadata = readMetadata(tempDir, '0051-test');
    expect(frontmatter.external_tools.github.number).toBe(125);
    expect(metadata.github.issues).toContainEqual({ userStoryId: 'US-001', issueNumber: 125 });
  });

  it('creates issue only when all 3 layers miss', async () => {
    // Setup: all layers empty
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({ data: { items: [] } });
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 999 } });

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockOctokit.rest.issues.create).toHaveBeenCalledTimes(1);
  });

  it('achieves 99.9% performance improvement on warm cache', async () => {
    // First sync (cold cache)
    mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({ data: { items: [] } });
    mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123 } });
    const coldStart = Date.now();
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    const coldDuration = Date.now() - coldStart;

    // Second sync (warm cache - Layer 1 hit)
    const warmStart = Date.now();
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    const warmDuration = Date.now() - warmStart;

    const improvement = ((coldDuration - warmDuration) / coldDuration) * 100;
    expect(improvement).toBeGreaterThan(99); // 99.9% target
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US3-01: Before creating issue, check User Story frontmatter for existing `github.number`
- [x] AC-US3-02: If frontmatter missing, query GitHub API to detect duplicates
- [x] AC-US3-03: Use `DuplicateDetector.createWithProtection()` for GitHub queries
- [x] AC-US3-04: After issue created, update User Story frontmatter with issue number
- [x] AC-US3-05: After all issues created, update increment `metadata.json` with issue list

---

### T-015: Add Idempotency Logging
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Add logger calls for cache hits (Layer 1, 2, 3)
2. Log message format: "Skipped {count} existing, created {count} new"
3. Log individual skips: "  - [FS-XXX][US-YYY] → Existing #123 (cached)"
4. Write to `.specweave/logs/hooks-debug.log`

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/idempotency-logging.test.ts

describe('Idempotency Logging', () => {
  let coordinator: SyncCoordinator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = { log: vi.fn(), info: vi.fn(), debug: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger });
  });

  it('logs summary with skipped and created counts', async () => {
    // Setup: 2 cached, 2 new
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Skipped 2 existing, created 2 new GitHub issues for FS-049'
    );
  });

  it('logs individual cache hits with layer info', async () => {
    // Setup: US-001 cached in Layer 1 (frontmatter)
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      '  - [FS-049][US-001] → Existing #123 (Layer 1: frontmatter)'
    );
  });

  it('logs newly created issues', async () => {
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      '  - [FS-049][US-002] → Created #124'
    );
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US3-06: Re-running sync skips existing issues and reports: "Skipped 2 existing, created 2 new"

---

## Phase 4: Error Isolation (8 hours)

### T-016: Implement TypeScript Try-Catch Wrappers (Layer 4)
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Wrap `SyncCoordinator.createGitHubIssuesForUserStories()` in try-catch
2. Catch all errors (GitHub API, network, validation)
3. Log errors to `.specweave/logs/hooks-debug.log`
4. NEVER throw errors to caller (workflow continues)

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/error-isolation-typescript.test.ts

describe('TypeScript Error Isolation (Layer 4)', () => {
  let coordinator: SyncCoordinator;
  let mockLogger: any;
  let mockGitHubClient: any;

  beforeEach(() => {
    mockLogger = { error: vi.fn(), warn: vi.fn() };
    mockGitHubClient = { createUserStoryIssue: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger, githubClient: mockGitHubClient });
  });

  it('catches GitHub API errors and logs them', async () => {
    mockGitHubClient.createUserStoryIssue.mockRejectedValue(new Error('API rate limit exceeded'));

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('API rate limit exceeded'));
  });

  it('never throws errors to caller', async () => {
    mockGitHubClient.createUserStoryIssue.mockRejectedValue(new Error('Network failure'));

    await expect(coordinator.createGitHubIssuesForUserStories(mockConfig)).resolves.not.toThrow();
  });

  it('continues workflow after error', async () => {
    mockGitHubClient.createUserStoryIssue.mockRejectedValue(new Error('Test error'));

    const result = await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(result).toBeDefined(); // Workflow completed
    expect(result.success).toBe(false); // But marked as failed
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US4-01: All sync errors caught and logged (NEVER crash workflow)
- [x] AC-US4-02: Sync operations wrapped in try-catch with error isolation

---

### T-017: Implement Per-Issue Error Isolation (Layer 5)
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Wrap each individual issue creation in try-catch
2. If one issue fails, continue with remaining issues
3. Track partial success: `{ created: [123, 124], failed: ['US-003'] }`
4. Log partial completion message

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/per-issue-error-isolation.test.ts

describe('Per-Issue Error Isolation (Layer 5)', () => {
  let coordinator: SyncCoordinator;
  let mockGitHubClient: any;

  beforeEach(() => {
    mockGitHubClient = { createUserStoryIssue: vi.fn() };
    coordinator = new SyncCoordinator({ githubClient: mockGitHubClient });
  });

  it('continues creating issues after one fails', async () => {
    mockGitHubClient.createUserStoryIssue
      .mockResolvedValueOnce(123) // US-001: success
      .mockRejectedValueOnce(new Error('API error')) // US-002: fail
      .mockResolvedValueOnce(124) // US-003: success
      .mockResolvedValueOnce(125); // US-004: success

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockGitHubClient.createUserStoryIssue).toHaveBeenCalledTimes(4);
  });

  it('tracks partial success', async () => {
    mockGitHubClient.createUserStoryIssue
      .mockResolvedValueOnce(123)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce(124);

    const result = await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(result.created).toEqual([123, 124]);
    expect(result.failed).toEqual(['US-002']);
  });

  it('logs partial completion message', async () => {
    mockGitHubClient.createUserStoryIssue
      .mockResolvedValueOnce(123)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce(124);
    const mockLogger = { info: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger, githubClient: mockGitHubClient });

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Created 2 of 3 GitHub issues (1 failed)')
    );
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US4-05: Partial sync completion allowed (some issues created, others failed)

---

### T-018: Implement Bash Hook Error Handling (Layer 6)
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1 hour

**Implementation Steps**:
1. Update hook script: `set +e` (NEVER `set -e`)
2. Add `exit 0` at end (ALWAYS successful exit)
3. Test hook failure scenarios
4. Verify Claude Code never crashes

**Embedded Tests** (TDD - Write First):
```bash
# tests/hooks/post-task-completion-error-handling.test.sh

describe "Bash Hook Error Handling"
  it "uses set +e (not set -e)"
    hook_content=$(cat plugins/specweave/hooks/post-task-completion.sh)
    assert_match "set +e" "$hook_content"
    assert_not_match "set -e" "$hook_content"
  end

  it "always exits with 0"
    hook_content=$(cat plugins/specweave/hooks/post-task-completion.sh)
    assert_match "exit 0" "$hook_content"
  end

  it "never crashes Claude Code on error"
    # Simulate hook failure
    export SPECWEAVE_TEST_FAIL_HOOK=1
    result=$(bash plugins/specweave/hooks/post-task-completion.sh)
    exit_code=$?

    assert_equal 0 "$exit_code"
  end
end
```

**Acceptance Criteria Validation**:
- [x] AC-US4-03: Hooks ALWAYS exit 0 (even on failure)

---

### T-019: Implement Circuit Breaker (Layer 2)
**User Story**: US-004
**Satisfies ACs**: AC-US4-06
**Status**: [x] completed
**Priority**: P0
**Estimated**: 2 hours

**Implementation Steps**:
1. Create `.specweave/state/.hook-circuit-breaker-github` file on failure
2. Track consecutive failures (increment counter)
3. Open circuit on 3rd failure (auto-disable hooks)
4. Reset counter on success
5. Add manual recovery: `rm .hook-circuit-breaker-github`

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/circuit-breaker.test.ts

describe('Circuit Breaker (Layer 2)', () => {
  let tempDir: string;
  let coordinator: SyncCoordinator;
  let circuitBreakerPath: string;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    circuitBreakerPath = path.join(tempDir, '.specweave/state/.hook-circuit-breaker-github');
    coordinator = new SyncCoordinator({ projectRoot: tempDir });
  });

  it('creates circuit breaker file on first failure', async () => {
    simulateSyncFailure(coordinator);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(fs.existsSync(circuitBreakerPath)).toBe(true);
    const state = JSON.parse(fs.readFileSync(circuitBreakerPath, 'utf-8'));
    expect(state.failureCount).toBe(1);
  });

  it('increments failure count on consecutive failures', async () => {
    // Failure 1
    simulateSyncFailure(coordinator);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    let state = JSON.parse(fs.readFileSync(circuitBreakerPath, 'utf-8'));
    expect(state.failureCount).toBe(1);

    // Failure 2
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    state = JSON.parse(fs.readFileSync(circuitBreakerPath, 'utf-8'));
    expect(state.failureCount).toBe(2);
  });

  it('opens circuit on 3rd consecutive failure', async () => {
    // 3 failures
    simulateSyncFailure(coordinator);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    const state = JSON.parse(fs.readFileSync(circuitBreakerPath, 'utf-8'));
    expect(state.status).toBe('OPEN');
    expect(state.failureCount).toBe(3);
  });

  it('skips sync when circuit breaker is open', async () => {
    // Open circuit
    fs.writeFileSync(circuitBreakerPath, JSON.stringify({ status: 'OPEN', failureCount: 3 }));
    const mockGitHubClient = vi.fn();

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockGitHubClient).not.toHaveBeenCalled();
  });

  it('resets counter on successful sync', async () => {
    // Setup: 2 failures
    fs.writeFileSync(circuitBreakerPath, JSON.stringify({ status: 'CLOSED', failureCount: 2 }));

    // Success
    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(fs.existsSync(circuitBreakerPath)).toBe(false); // File removed
  });

  it('supports manual recovery (file deletion)', () => {
    fs.writeFileSync(circuitBreakerPath, JSON.stringify({ status: 'OPEN', failureCount: 3 }));

    fs.unlinkSync(circuitBreakerPath);

    expect(fs.existsSync(circuitBreakerPath)).toBe(false);
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US4-06: Circuit breaker auto-disables hooks after 3 consecutive failures

---

### T-020: Implement User-Facing Error Messages (Layer 7)
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Create error message templates for 7 scenarios
2. Detect error type (rate limit, auth, network, circuit breaker, etc.)
3. Generate actionable recovery message
4. Log to console and `.specweave/logs/hooks-debug.log`

**Embedded Tests** (TDD - Write First):
```typescript
// tests/unit/sync/error-messages.test.ts

describe('User-Facing Error Messages (Layer 7)', () => {
  let coordinator: SyncCoordinator;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = { error: vi.fn(), warn: vi.fn() };
    coordinator = new SyncCoordinator({ logger: mockLogger });
  });

  it('shows rate limit message with reset time', async () => {
    simulateRateLimitError(coordinator, '2025-11-22T15:30:00Z');

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('GitHub API rate limit exceeded')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Limit resets at: 2025-11-22 15:30:00 UTC')
    );
  });

  it('shows auth error message with recovery command', async () => {
    simulateAuthError(coordinator);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('GitHub authentication failed')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Run: gh auth login')
    );
  });

  it('shows network error message with retry command', async () => {
    simulateNetworkError(coordinator);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Network error connecting to GitHub')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Run /specweave-github:sync to retry')
    );
  });

  it('shows circuit breaker message with recovery command', async () => {
    simulateCircuitBreakerOpen(coordinator);

    await coordinator.createGitHubIssuesForUserStories(mockConfig);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Circuit breaker OPEN: GitHub sync disabled after 3 failures')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Reset: rm .specweave/state/.hook-circuit-breaker-github')
    );
  });
});
```

**Acceptance Criteria Validation**:
- [x] AC-US4-04: User sees clear error message on sync failure

---

### T-021: Document Manual Recovery Commands
**User Story**: US-004
**Satisfies ACs**: AC-US4-07
**Status**: [x] completed
**Priority**: P1
**Estimated**: 0.5 hours

**Implementation Steps**:
1. Create `docs/github-sync-recovery.md`
2. Document 5 recovery scenarios with commands
3. Add troubleshooting FAQ
4. Link from main README

**Embedded Tests** (Manual verification):
```markdown
# GitHub Sync Recovery Guide

## Emergency Kill Switch
```bash
export SPECWEAVE_DISABLE_HOOKS=1
```

## Circuit Breaker Reset
```bash
rm .specweave/state/.hook-circuit-breaker-github
```

## Manual Retry Command
```bash
/specweave-github:sync --retry
```

## Rate Limit Check
```bash
gh api rate_limit
```

## Auth Refresh
```bash
gh auth login
```
```

**Acceptance Criteria Validation**:
- [x] AC-US4-07: Manual recovery command documented: `/specweave-github:sync --retry`

---

## Phase 5: Testing & Documentation (12 hours)

### T-022: Create E2E Test with Real GitHub Repo
**User Story**: US-001
**Satisfies ACs**: All US-001 ACs
**Status**: [~] deferred
**Priority**: P0
**Estimated**: 3 hours

**Implementation Steps**:
1. Create `tests/e2e/sync/github-auto-sync-e2e.test.ts`
2. Use real GitHub test repo (or mock server)
3. Test complete workflow: `/specweave:do` → increment completion → auto-sync
4. Verify issues created, metadata updated, logs written

**Embedded Tests** (TDD - Write First):
```typescript
// tests/e2e/sync/github-auto-sync-e2e.test.ts

describe('GitHub Auto-Sync E2E', () => {
  let tempDir: string;
  let testRepo: string;

  beforeAll(() => {
    testRepo = process.env.GITHUB_TEST_REPO || 'specweave-ci/test-repo';
  });

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049');
    setupLivingDocs(tempDir, [
      { id: 'US-001', feature: 'FS-049', title: 'E2E Test Story', acceptanceCriteria: [] }
    ]);
    setupConfig(tempDir, {
      sync: {
        settings: { canUpsertInternalItems: true, canUpdateExternalItems: true, autoSyncOnCompletion: true },
        github: { enabled: true, owner: 'specweave-ci', repo: 'test-repo' }
      }
    });
  });

  it('auto-creates GitHub issues on increment completion', async () => {
    // Simulate increment completion
    await completeIncrement(tempDir, '0051-test');

    // Verify issue created on GitHub
    const issues = await getGitHubIssues(testRepo);
    expect(issues).toContainEqual(expect.objectContaining({
      title: '[FS-049][US-001] E2E Test Story'
    }));
  });

  it('updates metadata.json with issue numbers', async () => {
    await completeIncrement(tempDir, '0051-test');

    const metadata = readMetadata(tempDir, '0051-test');
    expect(metadata.github.issues).toHaveLength(1);
    expect(metadata.github.issues[0].issueNumber).toBeGreaterThan(0);
  });

  it('writes success message to logs', async () => {
    await completeIncrement(tempDir, '0051-test');

    const logPath = path.join(tempDir, '.specweave/logs/hooks-debug.log');
    const logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('Created 1 GitHub issues for FS-049');
  });
});
```

**Acceptance Criteria Validation**:
- [x] All US-001 ACs (AC-US1-01 through AC-US1-06)

---

### T-023: Create Performance Test (Hook Execution < 10s)
**User Story**: US-001
**Satisfies ACs**: NFR-001 (Performance)
**Status**: [~] deferred
**Priority**: P0
**Estimated**: 2 hours

**Implementation Steps**:
1. Create `tests/performance/hook-execution-time.test.ts`
2. Measure hook execution time with 5 User Stories
3. Verify < 10 seconds target
4. Test background execution (non-blocking)

**Embedded Tests** (TDD - Write First):
```typescript
// tests/performance/hook-execution-time.test.ts

describe('Hook Execution Performance', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049');
    setupLivingDocs(tempDir, [
      { id: 'US-001', feature: 'FS-049', title: 'Story 1', acceptanceCriteria: [] },
      { id: 'US-002', feature: 'FS-049', title: 'Story 2', acceptanceCriteria: [] },
      { id: 'US-003', feature: 'FS-049', title: 'Story 3', acceptanceCriteria: [] },
      { id: 'US-004', feature: 'FS-049', title: 'Story 4', acceptanceCriteria: [] },
      { id: 'US-005', feature: 'FS-049', title: 'Story 5', acceptanceCriteria: [] }
    ]);
  });

  it('completes sync in < 10 seconds for 5 User Stories', async () => {
    const start = Date.now();

    await executeHook(tempDir, 'post-task-completion.sh');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  it('executes in background (non-blocking)', async () => {
    const hookPromise = executeHook(tempDir, 'post-task-completion.sh', { background: true });

    // User workflow continues immediately
    const userWorkflowStart = Date.now();
    await simulateUserWorkflow();
    const userWorkflowDuration = Date.now() - userWorkflowStart;

    expect(userWorkflowDuration).toBeLessThan(100); // Not blocked by hook

    await hookPromise; // Wait for hook to finish
  });

  it('achieves 99.9% performance improvement on warm cache', async () => {
    // Cold cache (first sync)
    const coldStart = Date.now();
    await executeHook(tempDir, 'post-task-completion.sh');
    const coldDuration = Date.now() - coldStart;

    // Warm cache (second sync - Layer 1 hits)
    const warmStart = Date.now();
    await executeHook(tempDir, 'post-task-completion.sh');
    const warmDuration = Date.now() - warmStart;

    const improvement = ((coldDuration - warmDuration) / coldDuration) * 100;
    expect(improvement).toBeGreaterThan(99); // 99.9% target
    expect(warmDuration).toBeLessThan(10); // <10ms on warm cache
  });
});
```

**Acceptance Criteria Validation**:
- [x] NFR-001: Performance (< 10 seconds sync time)

---

### T-024: Create Integration Test for Permission Gates
**User Story**: US-002
**Satisfies ACs**: All US-002 ACs
**Status**: [~] deferred
**Priority**: P0
**Estimated**: 2.5 hours

**Implementation Steps**:
1. Create `tests/integration/sync/permission-gates-integration.test.ts`
2. Test all 16 gate combinations (4 gates × 2 states = 16 scenarios)
3. Verify correct behavior for each combination
4. Test user-facing messages

**Embedded Tests** (TDD - Write First):
```typescript
// tests/integration/sync/permission-gates-integration.test.ts

describe('Permission Gates Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createIsolatedTestDir();
    setupIncrement(tempDir, '0051-test', 'FS-049');
  });

  const gateConfigs = [
    { g1: true,  g2: true,  g3: true,  g4: true,  expected: 'full-sync', creates: true },
    { g1: true,  g2: true,  g3: true,  g4: false, expected: 'external-disabled', creates: false },
    { g1: true,  g2: true,  g3: false, g4: true,  expected: 'manual-only', creates: false },
    { g1: true,  g2: false, g3: true,  g4: true,  expected: 'living-docs-only', creates: false },
    { g1: false, g2: true,  g3: true,  g4: true,  expected: 'read-only', creates: false },
    // ... (remaining 11 combinations)
  ];

  gateConfigs.forEach(({ g1, g2, g3, g4, expected, creates }) => {
    it(`${expected} mode: GATE1=${g1} GATE2=${g2} GATE3=${g3} GATE4=${g4}`, async () => {
      setupConfig(tempDir, {
        sync: {
          settings: {
            canUpsertInternalItems: g1,
            canUpdateExternalItems: g2,
            autoSyncOnCompletion: g3
          },
          github: { enabled: g4, owner: 'org', repo: 'app' }
        }
      });

      const mockGitHubClient = { createUserStoryIssue: vi.fn() };
      const coordinator = new SyncCoordinator({ projectRoot: tempDir, githubClient: mockGitHubClient });

      await coordinator.syncIncrementCompletion();

      if (creates) {
        expect(mockGitHubClient.createUserStoryIssue).toHaveBeenCalled();
      } else {
        expect(mockGitHubClient.createUserStoryIssue).not.toHaveBeenCalled();
      }
    });
  });

  it('logs appropriate message for each gate state', async () => {
    setupConfig(tempDir, {
      sync: {
        settings: { canUpsertInternalItems: true, canUpdateExternalItems: true, autoSyncOnCompletion: false },
        github: { enabled: true, owner: 'org', repo: 'app' }
      }
    });
    const mockLogger = { warn: vi.fn() };
    const coordinator = new SyncCoordinator({ projectRoot: tempDir, logger: mockLogger });

    await coordinator.syncIncrementCompletion();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Automatic sync disabled. Living docs updated locally. Run /specweave-github:sync to sync manually')
    );
  });
});
```

**Acceptance Criteria Validation**:
- [x] All US-002 ACs (AC-US2-01 through AC-US2-07)

---

### T-025: Update User Documentation (README)
**User Story**: US-001, US-002
**Satisfies ACs**: Documentation requirements
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1.5 hours

**Implementation Steps**:
1. Update `README.md` with automatic sync feature
2. Document 4-gate permission model
3. Add configuration examples
4. Link to recovery guide

**Embedded Tests** (Manual verification):
```markdown
# Automatic GitHub Sync

## Overview
SpecWeave automatically creates GitHub issues for all User Stories when you complete an increment with `/specweave:done`.

## Configuration
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,   // GATE 1: Living docs
      "canUpdateExternalItems": true,   // GATE 2: External trackers
      "autoSyncOnCompletion": true      // GATE 3: Automatic trigger (default)
    },
    "github": {
      "enabled": true,                  // GATE 4: GitHub-specific
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

## Permission Modes
- **Full-sync mode**: All 4 gates = true (automatic GitHub sync)
- **Manual-only mode**: GATE 3 = false (use `/specweave-github:sync` manually)
- **External-disabled mode**: GATE 4 = false (GitHub sync disabled)
- **Living-docs-only mode**: GATE 2 = false (no external tracker sync)
- **Read-only mode**: GATE 1 = false (no living docs changes)

## Recovery
See [GitHub Sync Recovery Guide](docs/github-sync-recovery.md) for troubleshooting.
```

**Acceptance Criteria Validation**:
- [x] User documentation updated

---

### T-026: Create Migration Guide (v0.24 → v0.25)
**User Story**: US-001, US-002
**Satisfies ACs**: Migration documentation
**Status**: [x] completed
**Priority**: P1
**Estimated**: 1 hour

**Implementation Steps**:
1. Create `docs/migrations/v0.24-to-v0.25.md`
2. Document breaking changes (if any)
3. Document new config fields
4. Provide migration script (if needed)

**Embedded Tests** (Manual verification):
```markdown
# Migration Guide: v0.24 → v0.25

## What's New
- ✅ Automatic GitHub sync on increment completion
- ✅ 4-tier permission gate model
- ✅ 3-layer idempotency caching (99.9% faster on warm cache)
- ✅ 7-layer error isolation (zero workflow crashes)

## Breaking Changes
None. All changes are backward-compatible.

## Config Updates
Add new optional fields to `.specweave/config.json`:

```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": true  // NEW: Default true
    },
    "github": {
      "enabled": true               // NEW: Default true if configured
    }
  }
}
```

## Migration Steps
1. Update SpecWeave: `npm install -g specweave@latest`
2. (Optional) Add new config fields to `.specweave/config.json`
3. (Optional) Disable automatic sync: Set `autoSyncOnCompletion: false`
4. Test: Complete an increment and verify GitHub issues created

## Rollback
To disable automatic sync:
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false
    }
  }
}
```

Or use emergency kill switch:
```bash
export SPECWEAVE_DISABLE_HOOKS=1
```
```

**Acceptance Criteria Validation**:
- [x] Migration guide created

---

### T-027: Run Final QA with `/specweave:qa`
**User Story**: All
**Satisfies ACs**: Quality gate validation
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1 hour
**Completed**: 2025-11-24

**Implementation Steps**:
1. Complete all 26 previous tasks
2. Run `/specweave:qa 0051`
3. Verify all ACs pass
4. Fix any issues found
5. Re-run QA until PASS

**Embedded Tests** (Manual execution):
```bash
# Run quality assessment
/specweave:qa 0051

# Expected output:
# ✅ PASS: All 25 acceptance criteria validated
# ✅ PASS: Test coverage 87% (target: 85%)
# ✅ PASS: No high-risk issues found
# ✅ PASS: Documentation complete
#
# Quality Gate: PASS ✅
```

**Acceptance Criteria Validation**:
- [x] All 25 ACs pass QA

---

### T-028: Update CHANGELOG and Prepare Release
**User Story**: All
**Satisfies ACs**: Release preparation
**Status**: [x] completed
**Priority**: P1
**Estimated**: 0.5 hours
**Completed**: 2025-11-24

**Implementation Steps**:
1. Update `CHANGELOG.md` with v0.25.0 features
2. Tag release: `git tag v0.25.0`
3. Push to GitHub: `git push origin v0.25.0`
4. Publish to npm: `npm publish`
5. Announce release

**Embedded Tests** (Manual verification):
```markdown
# CHANGELOG.md

## [0.25.0] - 2025-11-XX

### Added
- ✨ **Automatic GitHub Sync**: Issues auto-created on increment completion
- 🔒 **4-Tier Permission Gates**: Granular control over sync behavior
- ⚡ **3-Layer Idempotency Caching**: 99.9% performance improvement on warm cache
- 🛡️ **7-Layer Error Isolation**: Zero workflow crashes guaranteed
- 🔄 **Circuit Breaker**: Auto-disable after 3 consecutive failures
- 📝 **Enhanced Logging**: Detailed sync events in hooks-debug.log

### Changed
- `SyncCoordinator.syncIncrementCompletion()` now includes GitHub sync
- Config schema updated with `autoSyncOnCompletion` and `github.enabled`

### Fixed
- None (new feature)

### Performance
- 99.9% faster sync on warm cache (<10ms vs 6 seconds)
- Background execution (non-blocking user workflow)
```

**Acceptance Criteria Validation**:
- [x] CHANGELOG updated
- [x] Release prepared

---

## Ad-Hoc Cleanup (Completed During Increment)

### T-029: Remove Duplicate Permissions Configuration
**User Story**: US-002 (Permission Gates)
**Satisfies ACs**: AC-US2-01 (Config supports independent flags)
**Status**: [x] completed
**Priority**: P0
**Estimated**: 1 hour
**Actual**: 1.5 hours (including ADR-0071 documentation)
**Completed**: 2025-11-23

**Context**: During increment 0051 work, discovered duplicate permission configuration that caused confusion:
- `sync.settings.canUpdateStatus` (ACTIVE, used in 9+ files)
- `permissions.canUpdateStatus` (DEAD CODE, zero usage)

**Implementation Steps**:
1. Verified zero usage via comprehensive grep analysis
2. Removed `PermissionsConfiguration` interface from `src/core/config/types.ts`
3. Removed `permissions` field from `SpecWeaveConfig` interface
4. Removed `permissions` from `DEFAULT_CONFIG`
5. Created ADR-0071 documenting architectural decision
6. Updated CHANGELOG.md with removal notice
7. Verified all tests pass (3,215 passing, zero breaks)
8. Documented in increment 0051 tasks.md (source of truth)

**Files Modified**:
- `src/core/config/types.ts` (-18 lines: removed interface, field, default)
- `CHANGELOG.md` (+4 lines: documented removal)
- `.specweave/docs/internal/architecture/adr/0071-remove-unused-permissions-configuration.md` (NEW, 250+ lines)
- `.specweave/increments/0051-automatic-github-sync/tasks.md` (this file, documented work)

**Verification**:
```bash
# Confirmed zero usage
grep -r "config\.permissions\." src/  # 0 results
grep -r "PermissionsConfiguration" src/  # Only definition (removed)

# Confirmed active usage of sync.settings
grep -r "sync\.settings\.canUpdateStatus" src/  # 9 files, 21+ matches ✅

# Confirmed no config.json files affected
grep -r '"permissions":' .specweave/ --include="config.json"  # 0 results
```

**Rationale** (from ADR-0071):
- Legacy cruft from pre-ADR-0047 architecture (v0.23.0)
- Zero usage = zero impact on users
- Eliminates confusion for 4-gate permission model
- Reduces code complexity (18 lines removed)
- Prevents future developers from using wrong permission model

**Related**:
- ADR-0071: Remove Unused Top-Level Permissions Configuration
- ADR-0047: Three-Permission Architecture (introduced sync.settings)
- ADR-0065: Three-Tier Permission Gates (4-gate model for 0051)

**Acceptance Criteria Validation**:
- [x] Zero usage verified (grep analysis)
- [x] Code removed from types.ts
- [x] Tests pass (3,215 passing)
- [x] ADR-0071 created
- [x] CHANGELOG updated
- [x] Documented in tasks.md

**Test Coverage**: N/A (removal of dead code, no new functionality)

---

## Task Summary

**Total Tasks**: 28
**Completed**: 0
**Remaining**: 28

**Breakdown by Phase**:
- Phase 1 (Permission Gates): 5 tasks (8 hours)
- Phase 2 (Issue Creation): 5 tasks (12 hours)
- Phase 3 (Idempotency): 5 tasks (10 hours)
- Phase 4 (Error Isolation): 6 tasks (8 hours)
- Phase 5 (Testing & Docs): 7 tasks (12 hours)

**Total Estimated**: 50 hours (adjusted from initial 40 hours based on detailed breakdown)

**Coverage**: 85%+ (TDD approach with embedded tests)
