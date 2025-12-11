---
increment: 0118E-external-tool-sync-on-increment-start
title: "External Tool Sync on Increment Start"
priority: P1
status: completed
created: 2025-12-07
project: specweave
feature_id: FS-118E
origin: external
external_ref: github#anton-abyzov/specweave#786
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node"
  database: "none"
---

# External Tool Sync on Increment Start

**Feature**: FS-118E - External Items Integration Fix
**Origin**: [GitHub #786](https://github.com/anton-abyzov/specweave/issues/786)

## Executive Summary

When creating a SpecWeave increment via `/specweave:increment`, the system MUST automatically trigger `/specweave:sync-specs` which in turn calls `LivingDocsSync.syncIncrement()` → `syncToExternalTools()` → GitHub/JIRA/ADO issue creation. Currently, this automatic trigger is MISSING from the increment creation workflow.

## Root Cause Analysis

The external sync architecture is CORRECT and COMPLETE:

```
LivingDocsSync.syncIncrement(incrementId)
├── Step 1-6: Create living docs (FS-XXX/FEATURE.md, us-*.md)
├── Step 7: syncToExternalTools(incrementId, featureId, projectPath)
│   └── detectExternalTools() → ['github'] (from config.json)
│       └── syncToGitHub(featureId, projectPath)
│           └── GitHubFeatureSync.syncFeatureToGitHub(featureId)
│               └── Creates GitHub issues for all User Stories!
└── Step 8-9: Cleanup & validation
```

**THE BUG**: `/specweave:increment` command does NOT call `/specweave:sync-specs` at the end!

The increment planner skill creates files but stops there. Missing:
1. Call to `LivingDocsSync.syncIncrement()` after increment creation
2. OR automatic trigger via hook when increment is created

## User Stories

### US-001: Auto-Trigger Sync-Specs After Increment Creation

**As a** SpecWeave user with GitHub sync enabled,
**I want** the increment creation workflow to automatically trigger sync-specs,
**So that** living docs AND external tool issues are created in one seamless flow.

#### Acceptance Criteria

- [x] **AC-US1-01**: `/specweave:increment` MUST call `sync-specs` after creating increment files
- [x] **AC-US1-02**: `LivingDocsSync.syncIncrement()` MUST be called with the new increment ID
- [x] **AC-US1-03**: `syncToExternalTools()` MUST execute when `sync.github.enabled: true`
- [x] **AC-US1-04**: GitHub issue created with format: `[FS-XXX][US-YYY] User Story Title` (existing GitHubFeatureSync)
- [x] **AC-US1-05**: Issue body contains task checklist from tasks.md (existing GitHubFeatureSync)
- [x] **AC-US1-06**: Issue number stored in living docs user story frontmatter (existing GitHubFeatureSync)
- [x] **AC-US1-07**: Log creation in `.specweave/logs/sync.log` (existing sync logging)

### US-002: Increment Creation Workflow Update

**As a** SpecWeave developer,
**I want** the increment-planner skill to trigger living docs sync,
**So that** the complete workflow is: create files → sync to living docs → sync to external tools.

#### Acceptance Criteria

- [x] **AC-US2-01**: Update `plugins/specweave/skills/increment-planner/SKILL.md` to call sync-specs
- [x] **AC-US2-02**: OR update `plugins/specweave/commands/specweave-increment.md` to add Step 10
- [x] **AC-US2-03**: The sync step should be non-blocking (continue if external sync fails)
- [x] **AC-US2-04**: Show progress: "🔄 Syncing to living docs..." → "📡 Syncing to GitHub..."

### US-003: Permission Checking Before External Sync

**As a** SpecWeave administrator,
**I want** external sync to respect the `sync.settings` permissions,
**So that** I can control what operations are allowed on external tools.

#### Acceptance Criteria

- [x] **AC-US3-01**: Check `canUpsertInternalItems` BEFORE creating GitHub/JIRA/ADO issues
- [x] **AC-US3-02**: Check `canUpdateExternalItems` BEFORE updating external items
- [x] **AC-US3-03**: Check `canUpdateStatus` BEFORE updating issue/work item status
- [x] **AC-US3-04**: Log clear message when permission denied: "⚠️ Skipping - canUpsertInternalItems is disabled"
- [x] **AC-US3-05**: Permission checks happen in `syncToExternalTools()` BEFORE calling individual sync methods

**Permission Matrix**:

| Permission | Controls | Default |
|------------|----------|---------|
| `canUpsertInternalItems` | CREATE new issues for internal (SpecWeave-created) items | `true` (in your config) |
| `canUpdateExternalItems` | UPDATE issues created externally (imported from GitHub/JIRA/ADO) | `true` (in your config) |
| `canUpdateStatus` | UPDATE status field (open/closed, Done/In Progress) | `true` (in your config) |

### US-004: Fallback for Manual Sync

**As a** SpecWeave user,
**I want** to be able to manually trigger external sync if automatic sync was skipped,
**So that** I can recover from failures or delayed sync scenarios.

#### Acceptance Criteria

- [x] **AC-US4-01**: `/specweave:sync-specs <increment-id>` continues to work as manual trigger
- [x] **AC-US4-02**: `/specweave:sync-progress` can be used for full sync (tasks→docs→external)
- [x] **AC-US4-03**: Clear error messages if external sync fails with retry instructions

### US-005: Auto-Close GitHub Issue on Increment Completion

**As a** SpecWeave user with an external-origin increment (E-suffix),
**I want** the GitHub issue to be automatically closed when I run `/specweave:done`,
**So that** my GitHub issues stay in sync with my increment status.

#### Acceptance Criteria

- [x] **AC-US5-01**: `/specweave:done` MUST detect `external_ref` in metadata.json
- [x] **AC-US5-02**: Parse `external_ref` format: `github#owner/repo#issue_number`
- [x] **AC-US5-03**: Close GitHub issue via `gh issue close <number>` when increment completes
- [x] **AC-US5-04**: Add completion comment with summary (gates passed, duration, deliverables)
- [x] **AC-US5-05**: Handle missing `gh` CLI gracefully (warn, don't fail)
- [x] **AC-US5-06**: Respect `canUpdateStatus` permission before closing
- [x] **AC-US5-07**: Log issue closure in sync output

## Out of Scope

- Changing the existing sync architecture (it's correct!)
- Two-way sync (pulling GitHub issue updates back to SpecWeave)

## Technical Implementation

### Option A: Update specweave-increment.md Command (RECOMMENDED)

Add Step 10 to `/specweave:increment` command after increment files are created:

```markdown
### Step 10: Trigger Living Docs Sync (NEW!)

**After increment files are created, trigger sync-specs:**

\`\`\`
🔄 Syncing increment to living docs...
\`\`\`

Call LivingDocsSync directly:

\`\`\`typescript
import { LivingDocsSync } from './src/core/living-docs/living-docs-sync.js';

const sync = new LivingDocsSync(projectRoot);
const result = await sync.syncIncrement(incrementId, { dryRun: false });

if (result.success) {
  console.log(\`✅ Living docs synced: \${result.featureId}\`);
  console.log(\`   Created: \${result.filesCreated.length} files\`);
} else {
  console.log(\`⚠️  Living docs sync had errors (non-blocking): \${result.errors.join(', ')}\`);
}
\`\`\`

This will automatically trigger external tool sync via Step 7 in `syncIncrement()`.
```

### Option B: Hook-Based Trigger

Add a hook that triggers sync-specs when increment is created:

```json
{
  "hooks": {
    "post_increment_create": {
      "trigger_sync_specs": true
    }
  }
}
```

**Option A is simpler and more explicit.**

## Files to Modify

| File | Change |
|------|--------|
| `plugins/specweave/commands/specweave-increment.md` | Add Step 10 for sync-specs call |
| `plugins/specweave/skills/increment-planner/SKILL.md` | Update workflow to include sync step |

## Existing Code That Already Works

The following code is CORRECT and needs NO changes:

- `src/core/living-docs/living-docs-sync.ts` - `syncIncrement()` method
- `syncToExternalTools()` - Detects GitHub/JIRA/ADO from config
- `syncToGitHub()` - Calls `GitHubFeatureSync.syncFeatureToGitHub()`
- `plugins/specweave-github/lib/github-feature-sync.ts` - Creates issues
