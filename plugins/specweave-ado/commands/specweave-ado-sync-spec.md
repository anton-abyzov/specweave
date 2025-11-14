---
name: specweave-ado:sync-spec
description: Sync SpecWeave spec to Azure DevOps Feature (bidirectional). Use when syncing .specweave/docs/internal/specs/spec-*.md files with ADO Features for permanent feature tracking.
---

# Sync Spec to Azure DevOps Feature

**CORRECT ARCHITECTURE**: This command syncs `.specweave/docs/internal/specs/spec-*.md` files (PERMANENT living docs) to Azure DevOps Features, NOT increments to work items.

## Usage

```bash
/specweave-ado:sync-spec <spec-id> [--direction <to-ado|from-ado|bidirectional>]
```

## What It Does

**Architecture**:
- **Spec → ADO Feature** (not increment → work item!)
- **User Story → ADO User Story** (child of feature)
- **Acceptance Criteria → Checklist** (in user story description)

**Sync Process**:

1. **Load spec** from `.specweave/docs/internal/specs/spec-{id}.md`
2. **Load ADO configuration** from `.env` (organization, project, PAT)
3. **Create or update ADO Feature**:
   - Title: `[SPEC-001] Feature Title`
   - Description: Spec overview + progress (HTML)
   - State: Matches spec status
4. **Sync user stories as ADO User Stories**:
   - Create user stories for new user stories
   - Update existing user stories
   - Update state based on user story status
5. **Link spec to feature** (update frontmatter)

## Examples

### Sync spec to ADO (create or update)

```bash
/specweave-ado:sync-spec spec-001
```

**Output**:
```
🔄 Syncing spec spec-001 to ADO Feature...
   Creating new ADO Feature...
   ✅ Created ADO Feature #456: https://dev.azure.com/org/project/_workitems/edit/456
   Syncing 35 user stories...
   ✅ Created US-001 → User Story #457
   ✅ Created US-002 → User Story #458
   ...
✅ Sync complete!
   Created: 35 user stories
   ADO Feature: https://dev.azure.com/org/project/_workitems/edit/456
```

### Sync FROM ADO to spec (bidirectional)

```bash
/specweave-ado:sync-spec spec-001 --direction from-ado
```

**Output**:
```
🔄 Syncing FROM ADO to spec spec-001...
   Fetching ADO Feature #456...
   ⚠️  Detected 3 conflict(s)
   🔄 Resolving: US-002 marked Closed in ADO (ADO wins)
   🔄 Resolving: US-005 marked Active in ADO (ADO wins)
✅ Sync FROM ADO complete!
   Updated: 3 user stories
```

## Arguments

- `<spec-id>` - Spec ID (e.g., `spec-001` or just `001`)
- `--direction <mode>` - Sync direction (default: `to-ado`)
  - `to-ado` - Push local spec to ADO
  - `from-ado` - Pull ADO state to spec
  - `bidirectional` - Sync both ways (conflict resolution)

## Configuration

**Required `.env` variables**:

```bash
# Azure DevOps Configuration
ADO_ORGANIZATION=mycompany
ADO_PROJECT=MyProject
ADO_PERSONAL_ACCESS_TOKEN=your_pat_token_here
```

**How to get Personal Access Token (PAT)**:
1. Go to https://dev.azure.com/{organization}/_usersSettings/tokens
2. Click "New Token"
3. Set scopes:
   - Work Items: Read, Write, & Manage
   - Project: Read
4. Copy token to `.env`

## Conflict Resolution

When syncing FROM ADO, conflicts are resolved as follows:

**ADO wins** (default):
- User story state changes → update spec
- Acceptance criteria status → update spec
- Work item closure → mark user story done

**Local wins** (future):
- Spec changes take precedence
- Push to ADO

## Requirements

1. **Azure DevOps account** with project access
2. **Personal Access Token** (with Work Items: Read, Write, & Manage)
3. **Project permissions** (create features, create user stories)
4. **Spec file exists** at `.specweave/docs/internal/specs/spec-{id}.md`

## What Gets Synced

### Spec → ADO Feature

- ✅ Title: `[SPEC-001] Feature Area Title`
- ✅ Description: Overview + progress stats (HTML)
- ✅ Tags: `spec:spec-001`, `priority:P1`
- ✅ State: New/Active/Resolved/Closed based on spec

### User Story → ADO User Story

- ✅ Title: `[US-001] As a user, I want...`
- ✅ Description: User story + acceptance criteria checklist (HTML)
- ✅ Tags: `user-story`, `spec:spec-001`, `priority:P1`
- ✅ Parent: Links to feature work item
- ✅ State: New (todo) / Active (in-progress) / Closed (done)

### Acceptance Criteria → Checklist

```html
<h2>Acceptance Criteria</h2>
<ul>
  <li>☑ User can log in with email/password</li>
  <li>☐ Invalid credentials show error message</li>
  <li>☐ Account locks after 5 failed attempts</li>
</ul>
```

*Note*: ADO uses HTML in descriptions, with ☑/☐ for checkboxes.

## Architecture

**Why This Architecture?**

✅ **Permanent tracking**: Specs never deleted, ADO links remain valid
✅ **Feature-level granularity**: One ADO Feature per feature (not per increment)
✅ **PM-friendly**: Stakeholders see progress in ADO board
✅ **Brownfield-ready**: Existing ADO features map to specs

**What's WRONG?**

❌ Increment → ADO Work Item (increments are temporary!)
❌ Tasks → ADO Tasks (too granular, implementation details)
❌ Multiple features per feature (split across increments)

## Metadata

After sync, spec frontmatter is updated:

```yaml
---
id: spec-001
title: Core Framework Architecture
status: in-progress
priority: P0
externalLinks:
  ado:
    featureId: 456
    featureUrl: https://dev.azure.com/org/project/_workitems/edit/456
    syncedAt: "2025-11-10T12:00:00Z"
    organization: mycompany
    project: MyProject
---
```

## Troubleshooting

**"ADO API authentication failed"**:
- Check `.env` has correct `ADO_ORGANIZATION`, `ADO_PROJECT`, `ADO_PERSONAL_ACCESS_TOKEN`
- Verify PAT is valid (not expired)
- Test authentication: `curl -u :{PAT} https://dev.azure.com/{org}/_apis/projects?api-version=7.0`

**"Spec not found"**:
- Check spec exists: `ls .specweave/docs/internal/specs/`
- Use correct ID: `spec-001` or `001`

**"Cannot create feature"**:
- Ensure you have permissions to create features in the project
- Check project name is correct in `.env`

**"Parent link failed"**:
- Ensure feature exists before creating user stories
- Check feature ID is correct

**"No user stories to sync"**:
- Add user stories to spec.md:
  ```markdown
  **US-001**: As a user, I want...
  - [ ] **AC-001-01**: Acceptance criteria 1
  ```

## Related

- `/specweave-github:sync-spec` - Sync to GitHub Project
- `/specweave-jira:sync-spec` - Sync to Jira Epic
- `/specweave:sync-docs` - Sync living docs from increments to specs

## Implementation

**File**: `plugins/specweave-ado/lib/ado-spec-sync.ts`

**Core Class**: `AdoSpecSync`

**Methods**:
- `syncSpecToAdo(specId)` - Push to ADO
- `syncFromAdo(specId)` - Pull from ADO
- `detectConflicts(spec, feature)` - Compare states
- `resolveConflicts(spec, conflicts)` - Apply resolution strategy

## Azure DevOps API Reference

**Endpoints used**:
- `POST /wit/workitems/$Feature` - Create feature
- `PATCH /wit/workitems/{id}` - Update work item
- `GET /wit/workitems/{id}` - Fetch work item
- `POST /wit/wiql` - Search for work items (WIQL query)

**Authentication**: Basic auth with empty username + Personal Access Token

**API Version**: 7.0

## Work Item States

**Feature States**:
- New → Spec status: draft
- Active → Spec status: in-progress
- Resolved → Spec status: complete
- Closed → Spec status: archived

**User Story States**:
- New → User story status: todo
- Active → User story status: in-progress
- Closed → User story status: done
