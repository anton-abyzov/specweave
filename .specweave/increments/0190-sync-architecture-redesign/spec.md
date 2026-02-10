---
increment: 0190-sync-architecture-redesign
title: Sync Architecture Redesign
type: feature
priority: P0
status: completed
created: 2026-02-06T00:00:00.000Z
structure: user-stories
test_mode: TDD
coverage_target: 90
---

# Feature: Sync Architecture Redesign

## Problem Statement

SpecWeave's external sync system (GitHub, JIRA, Azure DevOps) is over-engineered but under-tested. The project's own sync-metadata.json shows all three platforms failing with zero imports. Key issues:

1. **Brittle ID convention**: The `E` suffix (`FS-042E`) is single-char sentinel with collision detection overhead across dual namespaces
2. **Noisy issue titles**: `[FS-172][US-010] Title` wastes 32 chars of GitHub Issue title space
3. **Rigid hierarchy**: 4-level model (Feature/US/AC/Task) doesn't adapt to flat JIRA teams or SAFe orgs
4. **Broken on own project**: All providers fail, labels are wrong (all "critical"), redundant labels
5. **Over-engineered**: 17+ sync files for a feature that doesn't work end-to-end
6. **No GitHub Projects v2**: Only Issues+Labels+Milestones, missing modern board support
7. **Complex permissions**: 8+ independent booleans instead of simple presets
8. **No setup wizard**: 7+ manual steps to configure sync

## Goals

- Replace E suffix with platform-specific suffixes (G/J/A) using independent namespaces
- Clean issue titles (`US-010: Title`) with FS-ID in milestone only
- Adaptive hierarchy that collapses gracefully (flat tasks = User Stories)
- Fix all broken sync on SpecWeave's own project (green sync-metadata.json)
- Consolidate 17+ files into ~5 provider-based modules
- Full GitHub Projects v2 board sync
- Permission presets with custom override
- Interactive `/sw:sync-setup` skill

## User Stories

### US-001: Platform Suffix ID Convention (P0)
**Project**: specweave

**As a** SpecWeave developer
**I want** external items identified by platform-specific suffixes (G/J/A) instead of generic E
**So that** I can see at a glance where an item originated and eliminate cross-namespace collision complexity

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given an item imported from GitHub, when assigned an ID, then it uses the `G` suffix (e.g., `FS-042G`, `US-004G`, `T-010G`)
- [x] **AC-US1-02**: Given an item imported from JIRA, when assigned an ID, then it uses the `J` suffix (e.g., `FS-042J`)
- [x] **AC-US1-03**: Given an item imported from ADO, when assigned an ID, then it uses the `A` suffix (e.g., `FS-042A`)
- [x] **AC-US1-04**: Given `FS-042` (internal) and `FS-042G` (external), when both exist, then they coexist without collision because namespaces are independent
- [x] **AC-US1-05**: Given the `isExternalId()` function, when called with `FS-042G`, `FS-042J`, or `FS-042A`, then it returns `true` and identifies the platform via `getPlatformFromSuffix()`

---

### US-002: Increment Folder Platform Suffix (P0)
**Project**: specweave

**As a** SpecWeave user
**I want** increment folders to carry the platform suffix (e.g., `0042G-auth-flow`)
**So that** the origin is visible in the filesystem and VSCode explorer with proper sorting

**Acceptance Criteria**:
- [x] **AC-US2-01**: Given an external increment from GitHub, when created, then the folder is named `####G-name` (e.g., `0042G-auth-flow`)
- [x] **AC-US2-02**: Given an external increment from JIRA, when created, then the folder is named `####J-name`
- [x] **AC-US2-03**: Given an external increment from ADO, when created, then the folder is named `####A-name`
- [x] **AC-US2-04**: Given `deriveFeatureId()`, when called on `0042G-auth-flow`, then it returns `FS-042G`
- [x] **AC-US2-05**: Given folders `0042-internal` and `0042G-from-github`, when listed in VSCode, then they sort adjacently by numeric prefix

---

### US-003: E-to-Platform Suffix Migration (P1)
**Project**: specweave

**As a** SpecWeave user with existing E-suffix items
**I want** automatic migration from E suffix to the correct platform suffix
**So that** my existing data transitions cleanly to the new convention

**Acceptance Criteria**:
- [x] **AC-US3-01**: Given existing `FS-042E` items with `origin-metadata.source: "github"`, when migration runs, then they are renamed to `FS-042G`
- [x] **AC-US3-02**: Given existing `FS-042E` items with `origin-metadata.source: "jira"`, when migration runs, then they are renamed to `FS-042J`
- [x] **AC-US3-03**: Given an E-suffix item with `source: "unknown"`, when migration runs, then it remains `E` suffix with a warning logged
- [x] **AC-US3-04**: Given migration, when renaming folders and files, then all internal references (spec.md, tasks.md, metadata.json, living docs) are updated atomically
- [x] **AC-US3-05**: Given both old E-suffix and new platform-suffix code paths, when `isExternalId()` is called, then it recognizes both formats during the deprecation period

---

### US-004: Clean Issue Title Format (P0)
**Project**: specweave

**As a** developer viewing GitHub/JIRA/ADO issues
**I want** clean issue titles without redundant prefixes
**So that** I can read what the issue is about at a glance

**Acceptance Criteria**:
- [x] **AC-US4-01**: Given a synced GitHub issue for a user story, when created, then the title format is `US-010: Documentation Update` (no FS prefix)
- [x] **AC-US4-02**: Given a feature milestone in GitHub, when created, then it carries the full FS-ID and title: `FS-172: True Autonomous Mode`
- [x] **AC-US4-03**: Given a synced JIRA story, when created, then the summary follows the same `US-XXX: Title` format
- [x] **AC-US4-04**: Given reverse lookup from an issue, when parsing, then `US-XXX` is extracted from title AND a structured metadata block in the issue body serves as authoritative fallback
- [x] **AC-US4-05**: Given existing issues with `[FS-XXX][US-YYY]` format, when the reconciler runs, then it recognizes both old and new title formats

---

### US-005: Flexible Hierarchy Mapping (P0)
**Project**: specweave

**As a** SpecWeave user integrating with diverse JIRA/ADO setups
**I want** the hierarchy to auto-detect and adapt to the external tool's structure
**So that** flat-task teams, standard Scrum teams, and SAFe orgs can all sync correctly

**Acceptance Criteria**:
- [x] **AC-US5-01**: Given a JIRA project using only Tasks (no Epic/Story), when syncing, then each Task maps to a SpecWeave User Story
- [x] **AC-US5-02**: Given a flat JIRA Task mapped to a User Story, when AC extraction runs, then acceptance criteria are auto-extracted from the task description bullet points/checklists
- [x] **AC-US5-03**: Given a standard JIRA project (Epic/Story/Sub-task), when syncing, then Epic maps to Feature, Story maps to US, Sub-task maps to Task
- [x] **AC-US5-04**: Given a SAFe JIRA project (Initiative/Epic/Feature/Story), when syncing, then the hierarchy mapping config supports 5-level depth with configurable level types
- [x] **AC-US5-05**: Given the setup wizard, when configuring hierarchy, then auto-detection scans the project's work item types and proposes a mapping for user confirmation

---

### US-006: Provider-Based Module Consolidation (P1)
**Project**: specweave

**As a** SpecWeave contributor
**I want** the 17+ sync files consolidated into ~5 provider-based modules
**So that** the codebase is maintainable and new contributors can understand the sync system

**Acceptance Criteria**:
- [x] **AC-US6-01**: Given the sync directory, when listing files, then there are no more than 7 top-level modules: `engine.ts`, `config.ts`, `providers/github.ts`, `providers/jira.ts`, `providers/ado.ts`, `projects-v2.ts`, `migration.ts`
- [x] **AC-US6-02**: Given the sync engine, when performing a push sync, then it routes through a unified `SyncEngine.push()` method (replaces SyncCoordinator, FormatPreservationSyncService, ExternalItemSyncService)
- [x] **AC-US6-03**: Given the sync engine, when performing a pull sync, then it routes through a unified `SyncEngine.pull()` method (replaces ExternalChangePuller, spec-to-living-docs-sync)
- [x] **AC-US6-04**: Given the reconciler pattern, when checking for drift, then each provider adapter implements a `reconcile()` method (replaces 3 separate reconciler files)
- [x] **AC-US6-05**: Given all existing sync tests, when the consolidation is complete, then all existing tests pass or are migrated to test the new module structure

---

### US-007: Permission Presets (P1)
**Project**: specweave

**As a** SpecWeave user configuring sync
**I want** to choose from named permission presets instead of configuring 8+ booleans
**So that** I can set up sync correctly without understanding every flag

**Acceptance Criteria**:
- [x] **AC-US7-01**: Given the config schema, when setting `sync.preset: "read-only"`, then only pull/read operations are enabled (all write flags false)
- [x] **AC-US7-02**: Given the preset `push-only`, when applied, then SpecWeave can create/update external items but does not pull changes back
- [x] **AC-US7-03**: Given the preset `bidirectional`, when applied, then both push and pull are enabled with status sync
- [x] **AC-US7-04**: Given the preset `full-control`, when applied, then all operations including delete are enabled
- [x] **AC-US7-05**: Given a preset is active, when the user overrides a specific flag (e.g., `sync.overrides.canDelete: false`), then the override takes precedence over the preset value

---

### US-008: Fix Broken Label Generation (P0)
**Project**: specweave

**As a** SpecWeave user syncing to GitHub
**I want** labels to correctly reflect item priority and avoid redundancy
**So that** GitHub Issues are properly categorized and filterable

**Acceptance Criteria**:
- [x] **AC-US8-01**: Given a user story with priority P1, when synced to GitHub, then the issue gets a `priority:P1` label (not `critical` unless actually P0)
- [x] **AC-US8-02**: Given label generation, when creating labels, then only ONE project label format is used: `project:specweave` (not both `project:specweave` and `specweave`)
- [x] **AC-US8-03**: Given a user story with type `user-story`, when synced, then a `type:user-story` label is applied
- [x] **AC-US8-04**: Given the `autoApplyLabels` config, when set to true, then labels are created in the repo if they don't exist (with appropriate colors)
- [x] **AC-US8-05**: Given existing issues with wrong labels, when reconciliation runs, then labels are corrected to match the new scheme

---

### US-009: GitHub Projects v2 Integration (P1)
**Project**: specweave

**As a** SpecWeave user managing work in GitHub Projects v2
**I want** synced issues to be added to a GitHub Project board with custom fields
**So that** I can track SpecWeave increments on a modern kanban/board view

**Acceptance Criteria**:
- [x] **AC-US9-01**: Given a configured GitHub Project ID, when issues are created, then they are automatically added to the project
- [x] **AC-US9-02**: Given a project with a Status field, when an increment's status changes, then the corresponding project item's Status field is updated
- [x] **AC-US9-03**: Given a project with custom fields (Priority, Sprint, etc.), when syncing, then SpecWeave maps its fields to the project's custom fields
- [x] **AC-US9-04**: Given a bidirectional setup, when a project item's status changes in GitHub, then SpecWeave detects and applies the change on next pull
- [x] **AC-US9-05**: Given the setup wizard, when configuring GitHub sync, then the user can optionally select a GitHub Project to sync with

---

### US-010: Sync Setup Skill (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** an interactive `/sw:sync-setup` skill that configures sync in one guided flow
**So that** I don't need to manually edit config.json and .env with 7+ steps

**Acceptance Criteria**:
- [x] **AC-US10-01**: Given the user invokes `/sw:sync-setup`, when the skill starts, then it asks which providers to enable (GitHub, JIRA, ADO) via AskUserQuestion
- [x] **AC-US10-02**: Given a provider is selected, when credentials are provided, then the skill validates them with a test API call before saving
- [x] **AC-US10-03**: Given hierarchy configuration, when the user's JIRA/ADO project is accessible, then the skill auto-detects the hierarchy and asks for confirmation
- [x] **AC-US10-04**: Given all configuration is complete, when the wizard finishes, then it writes the correct config.json sync section and .env credentials
- [x] **AC-US10-05**: Given the setup is complete, when the skill finishes, then it runs a test sync (dry run) to verify the configuration works

---

### US-011: Config Consistency and Self-Healing (P0)
**Project**: specweave

**As a** SpecWeave user
**I want** sync config to be internally consistent and self-healing
**So that** contradictory settings (like `sync.enabled: false` with `canUpdateExternalItems: true`) are detected and fixed

**Acceptance Criteria**:
- [x] **AC-US11-01**: Given `sync.enabled: false` with `canUpdateExternalItems: true`, when config is loaded, then a warning is emitted and the effective behavior is `disabled` (enabled=false wins)
- [x] **AC-US11-02**: Given config validation, when contradictory settings are detected, then the validator lists all contradictions with suggested fixes
- [x] **AC-US11-03**: Given the `sync-metadata.json` showing `lastSyncResult: "failed"`, when SpecWeave starts, then it logs the failure and suggests `/sw:sync-setup` to reconfigure
- [x] **AC-US11-04**: Given the SpecWeave project itself, when sync is configured, then all three platforms show successful sync results (green sync-metadata.json)

---

### US-012: Full E2E Test Suite Per Provider (P1)
**Project**: specweave

**As a** SpecWeave contributor
**I want** real E2E tests that exercise actual GitHub/JIRA/ADO APIs
**So that** sync changes are validated against real platforms before release

**Acceptance Criteria**:
- [x] **AC-US12-01**: Given the GitHub E2E test suite, when run against the specweave repo, then it creates an issue, updates it, syncs status, and cleans up
- [x] **AC-US12-02**: Given the JIRA E2E test suite, when run against a test project, then it creates a story, transitions status, and verifies sync
- [x] **AC-US12-03**: Given the ADO E2E test suite, when run against a test organization, then it creates a work item, updates state, and verifies sync
- [x] **AC-US12-04**: Given CI pipeline, when E2E tests are configured, then they run on a schedule (not on every PR) to avoid rate limits
- [x] **AC-US12-05**: Given E2E test credentials, when stored, then they use CI secrets (not committed to repo)

## Out of Scope

- **Webhook listeners**: Real-time push notifications from external tools (requires server infrastructure, deferred to v2.0+)
- **Comment sync**: Syncing comments/discussions between SpecWeave and external tools
- **Attachment sync**: Binary file sync between platforms
- **Cross-platform direct sync**: GitHub->JIRA direct sync without SpecWeave as hub
- **JIRA project creation**: Creating new JIRA projects via API (JIRA limitation)
- **GitLab/Bitbucket**: Only GitHub, JIRA, and ADO are in scope for this increment

## Technical Notes

### ID Suffix Mapping
| Platform | Suffix | Example ID | Example Folder |
|----------|--------|------------|----------------|
| Internal | (none) | `FS-042` | `0042-auth-flow` |
| GitHub | `G` | `FS-042G` | `0042G-auth-flow` |
| JIRA | `J` | `FS-042J` | `0042J-auth-flow` |
| ADO | `A` | `FS-042A` | `0042A-auth-flow` |

### Module Consolidation Target
```
src/sync/
├── engine.ts           # Core push/pull/reconcile logic
├── config.ts           # Unified config, presets, validation
├── migration.ts        # E→G/J/A migration
├── projects-v2.ts      # GitHub Projects v2 integration
└── providers/
    ├── github.ts       # GitHub adapter (Issues + Projects)
    ├── jira.ts         # JIRA adapter
    └── ado.ts          # ADO adapter
```

### Permission Presets
| Preset | canRead | canUpdateStatus | canUpsert | canDelete |
|--------|---------|-----------------|-----------|-----------|
| `read-only` | true | false | false | false |
| `push-only` | false | true | true | false |
| `bidirectional` | true | true | true | false |
| `full-control` | true | true | true | true |

## Success Metrics

- All 3 providers show `lastSyncResult: "success"` on SpecWeave's own project
- Module count reduced from 17+ to 7 or fewer
- Setup wizard completes in under 2 minutes for new users
- E2E tests pass for all 3 providers in CI
- Zero duplicate/redundant labels on synced GitHub Issues

## Dependencies

- GitHub GraphQL API (for Projects v2)
- JIRA REST API v3
- Azure DevOps REST API v7.1
- Existing `origin-metadata.ts` type system
- Existing `fs-id-allocator.ts` allocation logic
