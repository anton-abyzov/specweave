---
name: specweave-jira-sync-spec
description: Sync SpecWeave spec to Jira Epic (bidirectional). Use when syncing .specweave/docs/internal/specs/spec-*.md files with Jira Epics for permanent feature tracking.
---

# Sync Spec to Jira Epic

**CORRECT ARCHITECTURE**: This command syncs `.specweave/docs/internal/specs/spec-*.md` files (PERMANENT living docs) to Jira Epics, NOT increments to issues.

## Usage

```bash
/specweave-jira:sync-spec <spec-id> [--direction <to-jira|from-jira|bidirectional>]
```

## What It Does

**Architecture**:
- **Spec → Jira Epic** (not increment → issue!)
- **User Story → Jira Story** (subtask of epic)
- **Acceptance Criteria → Checklist** (in story description)

**Sync Process**:

1. **Load spec** from `.specweave/docs/internal/specs/spec-{id}.md`
2. **Load Jira configuration** from `.env` (domain, email, API token, project key)
3. **Create or update Jira Epic**:
   - Summary: `[SPEC-001] Feature Title`
   - Description: Spec overview + progress
   - Status: Matches spec status
4. **Sync user stories as Jira Stories**:
   - Create stories for new user stories
   - Update existing stories
   - Transition stories based on user story status
5. **Link spec to epic** (update frontmatter)

## Examples

### Sync spec to Jira (create or update)

```bash
/specweave-jira:sync-spec spec-001
```

**Output**:
```
🔄 Syncing spec spec-001 to Jira Epic...
   Creating new Jira Epic...
   ✅ Created Jira Epic SPEC-1: https://company.atlassian.net/browse/SPEC-1
   Syncing 35 user stories...
   ✅ Created US-001 → Story SPEC-2
   ✅ Created US-002 → Story SPEC-3
   ...
✅ Sync complete!
   Created: 35 user stories
   Jira Epic: https://company.atlassian.net/browse/SPEC-1
```

### Sync FROM Jira to spec (bidirectional)

```bash
/specweave-jira:sync-spec spec-001 --direction from-jira
```

**Output**:
```
🔄 Syncing FROM Jira to spec spec-001...
   Fetching Jira Epic SPEC-1...
   ⚠️  Detected 3 conflict(s)
   🔄 Resolving: US-002 marked Done in Jira (Jira wins)
   🔄 Resolving: US-005 marked In Progress in Jira (Jira wins)
✅ Sync FROM Jira complete!
   Updated: 3 user stories
```

## Arguments

- `<spec-id>` - Spec ID (e.g., `spec-001` or just `001`)
- `--direction <mode>` - Sync direction (default: `to-jira`)
  - `to-jira` - Push local spec to Jira
  - `from-jira` - Pull Jira state to spec
  - `bidirectional` - Sync both ways (conflict resolution)

## Configuration

**Required `.env` variables**:

```bash
# Jira Configuration
JIRA_DOMAIN=company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token_here
JIRA_PROJECT_KEY=SPEC
```

**How to get API token**:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy token to `.env`

## Conflict Resolution

When syncing FROM Jira, conflicts are resolved as follows:

**Jira wins** (default):
- User story status changes → update spec
- Acceptance criteria status → update spec
- Story completion → mark user story done

**Local wins** (future):
- Spec changes take precedence
- Push to Jira

## Requirements

1. **Jira account** with API access
2. **Jira API token** (from https://id.atlassian.com/manage-profile/security/api-tokens)
3. **Project permissions** (create epics, create stories)
4. **Spec file exists** at `.specweave/docs/internal/specs/spec-{id}.md`

## What Gets Synced

### Spec → Jira Epic

- ✅ Summary: `[SPEC-001] Feature Area Title`
- ✅ Description: Overview + progress stats (Jira wiki markup)
- ✅ Labels: `spec:spec-001`, `priority:P1`
- ✅ Status: To Do/In Progress/Done based on spec

### User Story → Jira Story

- ✅ Summary: `[US-001] As a user, I want...`
- ✅ Description: User story + acceptance criteria checklist
- ✅ Labels: `user-story`, `spec:spec-001`, `priority:P1`
- ✅ Epic Link: Links story to epic
- ✅ Status: To Do (todo) / In Progress (in-progress) / Done (done)

### Acceptance Criteria → Checklist

```
h2. Acceptance Criteria

* (/) User can log in with email/password
* (x) Invalid credentials show error message
* (x) Account locks after 5 failed attempts
```

*Note*: Jira uses `(/)` for checked, `(x)` for unchecked.

## Architecture

**Why This Architecture?**

✅ **Permanent tracking**: Specs never deleted, Jira links remain valid
✅ **Feature-level granularity**: One Jira Epic per feature (not per increment)
✅ **PM-friendly**: Stakeholders see progress in Jira board
✅ **Brownfield-ready**: Existing Jira epics map to specs

**What's WRONG?**

❌ Increment → Jira Issue (increments are temporary!)
❌ Tasks → Jira Issues (too granular, implementation details)
❌ Multiple epics per feature (split across increments)

## Metadata

After sync, spec frontmatter is updated:

```yaml
---
id: spec-001
title: Core Framework Architecture
status: in-progress
priority: P0
externalLinks:
  jira:
    epicKey: SPEC-1
    epicUrl: https://company.atlassian.net/browse/SPEC-1
    syncedAt: "2025-11-10T12:00:00Z"
    projectKey: SPEC
    domain: company.atlassian.net
---
```

## Troubleshooting

**"Jira API authentication failed"**:
- Check `.env` has correct `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- Verify API token is valid (not expired)
- Test authentication: `curl -u email:token https://company.atlassian.net/rest/api/3/myself`

**"Spec not found"**:
- Check spec exists: `ls .specweave/docs/internal/specs/`
- Use correct ID: `spec-001` or `001`

**"Cannot create epic"**:
- Ensure you have permissions to create epics in the project
- Check project key is correct in `.env`

**"Epic Link field not found"**:
- Epic Link field ID varies by Jira configuration
- Default: `customfield_10014`
- Find your field: Go to Jira → Settings → Issues → Custom fields → Find "Epic Link"
- Update code if needed

**"No user stories to sync"**:
- Add user stories to spec.md:
  ```markdown
  **US-001**: As a user, I want...
  - [ ] **AC-001-01**: Acceptance criteria 1
  ```

## Related

- `/specweave-github:sync-spec` - Sync to GitHub Project
- `/specweave-ado:sync-spec` - Sync to Azure DevOps Feature
- `/specweave:sync-docs` - Sync living docs from increments to specs

## Implementation

**File**: `plugins/specweave-jira/lib/jira-spec-sync.ts`

**Core Class**: `JiraSpecSync`

**Methods**:
- `syncSpecToJira(specId)` - Push to Jira
- `syncFromJira(specId)` - Pull from Jira
- `detectConflicts(spec, epic)` - Compare states
- `resolveConflicts(spec, conflicts)` - Apply resolution strategy

## Jira API Reference

**Endpoints used**:
- `POST /rest/api/3/issue` - Create epic/story
- `PUT /rest/api/3/issue/{key}` - Update epic/story
- `GET /rest/api/3/issue/{key}` - Fetch epic/story
- `GET /rest/api/3/search?jql=...` - Search for stories
- `POST /rest/api/3/issue/{key}/transitions` - Transition story status

**Authentication**: Basic auth with email + API token
