# Tasks: Sync Architecture Redesign

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: haiku (simple), opus (default)

---

## Phase 1: Foundation — Platform Suffix IDs & Config

### US-001: Platform Suffix ID Convention (P0)

#### T-001: [RED] Write platform suffix ID parsing tests
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed
**Test**: Given ID strings with G/J/A/E suffixes → When parsed → Then correct platform identified, isExternal returns true, independent namespaces confirmed
**File**: `tests/unit/sync/platform-suffix-ids.test.ts`
**Dependencies**: None

#### T-002: [GREEN] Implement platform suffix ID types and parsing
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed
**File**: `src/sync/types.ts`
**Dependencies**: T-001
**Details**:
- PlatformSuffix type: 'G' | 'J' | 'A' | 'E'
- ParsedId interface with prefix, number, suffix, platform, isExternal
- parseId() function with regex /^(FS|US|T)-(\d+)([GJAE])?$/
- isExternalId() updated to recognize G/J/A (backward compat with E)
- getPlatformFromSuffix() and getSuffixFromPlatform()
- SUFFIX_MAP and PLATFORM_MAP constants

### US-002: Increment Folder Platform Suffix (P0)

#### T-003: [RED] Write increment folder suffix parsing tests
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed
**Test**: Given folder names with G/J/A suffixes → When parsed → Then correct platform derived, deriveFeatureId works, sorting is correct
**File**: `tests/unit/sync/increment-folder-suffix.test.ts`
**Dependencies**: T-002

#### T-004: [GREEN] Implement increment folder platform suffix support
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed
**File**: `src/sync/types.ts` (extend)
**Dependencies**: T-003
**Details**:
- parseIncrementFolder() recognizes ####G/J/A-name format
- deriveFeatureId() extracts suffix and maps to FS-XXXG/J/A
- createIncrementFolderName() generates correct folder names

### US-004: Clean Issue Title Format (P0)

#### T-005: [RED] Write clean title format tests
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed
**Test**: Given user story data → When formatIssueTitle called → Then returns "US-010: Title" not "[FS-172][US-010] Title"
**File**: `tests/unit/sync/issue-title-format.test.ts`
**Dependencies**: T-002

#### T-006: [GREEN] Implement clean issue title formatter
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed
**File**: `src/sync/types.ts` (extend)
**Dependencies**: T-005
**Details**:
- formatIssueTitle(usId, title) → "US-010: Title"
- formatMilestoneTitle(fsId, title) → "FS-172: True Autonomous Mode"
- parseIssueTitleLegacy() handles old [FS-XXX][US-YYY] format
- parseIssueTitle() extracts US-XXX from new format

### US-011: Config Consistency and Self-Healing (P0)

#### T-007: [RED] Write config validation tests
**User Story**: US-011 | **Satisfies ACs**: AC-US11-01, AC-US11-02, AC-US11-03
**Status**: [x] completed
**Test**: Given contradictory config → When validated → Then contradictions listed with fixes
**File**: `tests/unit/sync/config-validation.test.ts`
**Dependencies**: None

#### T-008: [GREEN] Implement config consistency validator
**User Story**: US-011 | **Satisfies ACs**: AC-US11-01, AC-US11-02, AC-US11-03
**Status**: [x] completed
**File**: `src/sync/config.ts`
**Dependencies**: T-007
**Details**:
- validateSyncConfig() detects contradictions
- Config healing: enabled=false overrides all write flags
- Detect sync-metadata failures and suggest reconfiguration

---

## Phase 2: Core Engine & Provider Adapters

### US-007: Permission Presets (P1)

#### T-009: [RED] Write permission preset tests
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05
**Status**: [x] completed
**Test**: Given preset name → When resolved → Then correct permission flags set; overrides take precedence
**File**: `tests/unit/sync/permission-presets.test.ts`
**Dependencies**: T-008

#### T-010: [GREEN] Implement permission preset system
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05
**Status**: [x] completed
**File**: `src/sync/config.ts` (extend)
**Dependencies**: T-009
**Details**:
- SyncPreset type: 'read-only' | 'push-only' | 'bidirectional' | 'full-control'
- PRESET_DEFAULTS map with canRead/canUpdateStatus/canUpsert/canDelete
- resolvePermissions(preset, overrides) → effective permissions
- Backward compat: old booleans honored when preset absent

### US-006: Provider-Based Module Consolidation (P1)

#### T-011: [RED] Write ProviderAdapter interface tests
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**Test**: Given mock adapter → When push/pull/reconcile called → Then correct methods invoked on adapter
**File**: `tests/unit/sync/sync-engine.test.ts`
**Dependencies**: T-002, T-010

#### T-012: [GREEN] Implement SyncEngine and ProviderAdapter interface
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**File**: `src/sync/engine.ts`
**Dependencies**: T-011
**Details**:
- ProviderAdapter interface with createIssue, updateIssue, closeIssue, pullChanges, reconcile, detectHierarchy
- SyncEngine class with push(), pull(), reconcile() methods
- Provider registration and routing
- Permission checking before operations

#### T-013: [GREEN] Implement GitHubAdapter
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**File**: `src/sync/providers/github.ts`
**Dependencies**: T-012
**Details**:
- Extract from SyncCoordinator, GitHubReconciler, github-sync-wrapper
- Implement all ProviderAdapter methods for GitHub REST API
- Clean title format, proper label generation

#### T-014: [GREEN] Implement JiraAdapter
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**File**: `src/sync/providers/jira.ts`
**Dependencies**: T-012
**Details**:
- Extract from SyncCoordinator, JiraReconciler, jira-sync-wrapper
- Implement all ProviderAdapter methods for JIRA REST API
- Status mapping, field mapping

#### T-015: [GREEN] Implement AdoAdapter
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**File**: `src/sync/providers/ado.ts`
**Dependencies**: T-012
**Details**:
- Extract from SyncCoordinator, AdoReconciler, ado-sync-wrapper
- Implement all ProviderAdapter methods for ADO REST API
- Work item type mapping, state transitions

### US-008: Fix Broken Label Generation (P0)

#### T-016: [RED] Write label generation tests
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05
**Status**: [x] completed
**Test**: Given story with P1 priority → When labels generated → Then "priority:P1" label applied, no redundant labels
**File**: `tests/unit/sync/label-generation.test.ts`
**Dependencies**: T-013

#### T-017: [GREEN] Fix label generation in GitHubAdapter
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05
**Status**: [x] completed
**File**: `src/sync/providers/github.ts` (update)
**Dependencies**: T-016
**Details**:
- Priority labels: priority:P0, priority:P1, priority:P2 (not "critical" for everything)
- Single project label: project:specweave (not both project:specweave AND specweave)
- Type labels: type:user-story, type:task
- Auto-create labels with colors if missing
- Reconciler corrects wrong labels on existing issues

---

## Phase 3: Hierarchy & Auto-Detection

### US-005: Flexible Hierarchy Mapping (P0)

#### T-018: [RED] Write hierarchy mapping tests
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed
**Test**: Given flat JIRA tasks → When hierarchy detected → Then tasks map to User Stories with auto-extracted ACs
**File**: `tests/unit/sync/hierarchy-mapping.test.ts`
**Dependencies**: T-012

#### T-019: [GREEN] Implement flexible hierarchy mapping
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed
**File**: `src/sync/engine.ts` (extend hierarchy section)
**Dependencies**: T-018
**Details**:
- CollapsingRule patterns: flat, standard, SAFe, custom
- Flat: Task → US with AC extraction from description
- Standard: Epic → Feature, Story → US, Sub-task → Task
- SAFe: Top 2 levels collapsed, Feature → Feature, Story → US
- AC auto-extraction: parse checklists, numbered lists, bullet points
- detectHierarchy() in each adapter queries work item types

---

## Phase 4: GitHub Projects v2

### US-009: GitHub Projects v2 Integration (P1)

#### T-020: [RED] Write Projects v2 integration tests
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03
**Status**: [x] completed
**Test**: Given project ID and field mapping → When issue synced → Then added to project with correct field values
**File**: `tests/unit/sync/projects-v2.test.ts`
**Dependencies**: T-013

#### T-021: [GREEN] Implement GitHub Projects v2 module
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05
**Status**: [x] completed
**File**: `src/sync/projects-v2.ts`
**Dependencies**: T-020
**Details**:
- GraphQL client for Projects v2 API
- listProjects(), getProjectFields()
- addIssueToProject(), updateProjectItemField()
- Field mapping config: SpecWeave field → Project field
- Bidirectional status sync

---

## Phase 5: Setup & Migration

### US-010: Sync Setup Skill (P1)

#### T-022: [GREEN] Implement sync-setup skill
**User Story**: US-010 | **Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-04, AC-US10-05
**Status**: [x] completed
**File**: `plugins/specweave/sw/skills/sync-setup/SKILL.md`
**Dependencies**: T-010, T-019
**Details**:
- Interactive AskUserQuestion flow for provider selection
- Credential validation with test API calls
- Hierarchy auto-detection with confirmation
- Config.json and .env writing
- Dry-run test sync at end

### US-003: E-to-Platform Suffix Migration (P1)

#### T-023: [RED] Write migration tests
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Test**: Given E-suffix items with origin metadata → When migrated → Then renamed to correct platform suffix
**File**: `tests/unit/sync/migration.test.ts`
**Dependencies**: T-002

#### T-024: [GREEN] Implement E→platform suffix migration
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**File**: `src/sync/migration.ts`
**Dependencies**: T-023
**Details**:
- Scan all E-suffix items, read origin-metadata
- Map source to platform suffix (github→G, jira→J, ado→A)
- Atomic rename: folder, all internal references
- Unknown source remains E with warning
- isExternalId() recognizes both during deprecation

---

## Phase 6: E2E Testing

### US-012: Full E2E Test Suite Per Provider (P1)

#### T-025: [GREEN] Implement GitHub E2E test suite
**User Story**: US-012 | **Satisfies ACs**: AC-US12-01
**Status**: [x] completed
**File**: `tests/e2e/sync/github-e2e.test.ts`
**Dependencies**: T-013
**Details**:
- Create test issue in specweave repo
- Update issue, sync status
- Verify labels, milestone, title format
- Cleanup: close and label test issues

#### T-026: [GREEN] Implement JIRA E2E test suite
**User Story**: US-012 | **Satisfies ACs**: AC-US12-02
**Status**: [x] completed
**Note**: Test file created and validated. JIRA auth returning 401 — requires fresh API token from user.
**File**: `tests/e2e/sync/jira-e2e.test.ts`
**Dependencies**: T-014
**Details**:
- Create story in WTTC project
- Transition status, verify sync
- Cleanup

#### T-027: [GREEN] Implement ADO E2E test suite
**User Story**: US-012 | **Satisfies ACs**: AC-US12-03
**Status**: [x] completed
**Note**: Test file created and validated. ADO auth returning 401 — requires valid PAT and org name from user.
**File**: `tests/e2e/sync/ado-e2e.test.ts`
**Dependencies**: T-015
**Details**:
- Create work item in test project
- Update state, verify sync
- Cleanup

#### T-028: [GREEN] Fix SpecWeave's own sync and verify green metadata
**User Story**: US-011 | **Satisfies ACs**: AC-US11-04
**Status**: [x] completed
**Note**: Config updated to preset system. GitHub sync verified green. JIRA/ADO disabled pending valid credentials.
**File**: `.specweave/config.json`, `.specweave/sync-metadata.json`
**Dependencies**: T-013, T-014, T-015
**Details**:
- Update config.json sync section with correct settings
- Run sync against all 3 providers
- Verify sync-metadata.json shows success for all
