---
name: specweave-github-sync-spec
description: Sync SpecWeave spec to GitHub Project (bidirectional). Use when syncing .specweave/docs/internal/specs/spec-*.md files with GitHub Projects for permanent feature tracking.
---

# Sync Spec to GitHub Project

**CORRECT ARCHITECTURE**: This command syncs `.specweave/docs/internal/specs/spec-*.md` files (PERMANENT living docs) to GitHub Projects, NOT increments to issues.

## Usage

```bash
/specweave-github:sync-spec <spec-id> [--direction <to-github|from-github|bidirectional>]
```

## What It Does

**Architecture**:
- **Spec → GitHub Project** (not increment → issue!)
- **User Story → GitHub Issue** (linked to project)
- **Acceptance Criteria → Checklist** (in issue body)

**Sync Process**:

1. **Load spec** from `.specweave/docs/internal/specs/spec-{id}.md`
2. **Detect repository** from git remote
3. **Create or update GitHub Project**:
   - Title: `[SPEC-001] Feature Title`
   - Description: Spec overview + progress
   - Status: Matches spec status
4. **Sync user stories as issues**:
   - Create issues for new user stories
   - Update existing issues
   - Close issues for completed user stories
5. **Link spec to project** (update frontmatter)

## Examples

### Sync spec to GitHub (create or update)

```bash
/specweave-github:sync-spec spec-001
```

**Output**:
```
🔄 Syncing spec spec-001 to GitHub Project...
   Creating new GitHub Project...
   ✅ Created GitHub Project #5: https://github.com/owner/repo/projects/5
   Syncing 35 user stories...
   ✅ Created US-001 → Issue #130
   ✅ Created US-002 → Issue #131
   ...
✅ Sync complete!
   Created: 35 user stories
   GitHub Project: https://github.com/owner/repo/projects/5
```

### Sync FROM GitHub to spec (bidirectional)

```bash
/specweave-github:sync-spec spec-001 --direction from-github
```

**Output**:
```
🔄 Syncing FROM GitHub to spec spec-001...
   Fetching GitHub Project #5...
   ⚠️  Detected 3 conflict(s)
   🔄 Resolving: US-002 marked done in GitHub (GitHub wins)
   🔄 Resolving: US-005 marked in-progress in GitHub (GitHub wins)
✅ Sync FROM GitHub complete!
   Updated: 3 user stories
```

### Bidirectional sync (default)

```bash
/specweave-github:sync-spec spec-001 --direction bidirectional
```

## Arguments

- `<spec-id>` - Spec ID (e.g., `spec-001` or just `001`)
- `--direction <mode>` - Sync direction (default: `to-github`)
  - `to-github` - Push local spec to GitHub
  - `from-github` - Pull GitHub state to spec
  - `bidirectional` - Sync both ways (conflict resolution)

## Conflict Resolution

When syncing FROM GitHub, conflicts are resolved as follows:

**GitHub wins** (default):
- User story status changes → update spec
- Acceptance criteria status → update spec
- Issue closure → mark user story done

**Local wins** (future):
- Spec changes take precedence
- Push to GitHub

## Requirements

1. **GitHub CLI** (`gh`) installed and authenticated
2. **Git repository** with GitHub remote
3. **Write access** to repository (for creating projects/issues)
4. **Spec file exists** at `.specweave/docs/internal/specs/spec-{id}.md`

## What Gets Synced

### Spec → GitHub Project

- ✅ Title: `[SPEC-001] Feature Area Title`
- ✅ Description: Overview + progress stats
- ✅ Status: Open/Closed based on spec completion

### User Story → GitHub Issue

- ✅ Title: `[US-001] As a user, I want...`
- ✅ Body: User story + acceptance criteria checklist
- ✅ Labels: `user-story`, `spec:spec-001`, `priority:P1`
- ✅ State: Open (todo/in-progress) or Closed (done)

### Acceptance Criteria → Checklist

```markdown
## Acceptance Criteria

- [x] User can log in with email/password
- [ ] Invalid credentials show error message
- [ ] Account locks after 5 failed attempts
```

## Architecture

**Why This Architecture?**

✅ **Permanent tracking**: Specs never deleted, GitHub links remain valid
✅ **Feature-level granularity**: One GitHub Project per feature (not per increment)
✅ **PM-friendly**: Stakeholders see progress in GitHub Projects
✅ **Brownfield-ready**: Existing GitHub Projects map to specs

**What's WRONG?**

❌ Increment → GitHub Issue (increments are temporary!)
❌ Tasks → GitHub Issues (too granular, implementation details)
❌ Multiple issues per feature (split across increments)

## Metadata

After sync, spec frontmatter is updated:

```yaml
---
id: spec-001
title: Core Framework Architecture
status: in-progress
priority: P0
externalLinks:
  github:
    projectId: 5
    projectUrl: https://github.com/owner/repo/projects/5
    syncedAt: "2025-11-10T12:00:00Z"
    owner: owner
    repo: repo
---
```

## Troubleshooting

**"Could not detect GitHub repository"**:
- Ensure you're in a git repo with GitHub remote
- Run: `git remote -v` to check

**"Spec not found"**:
- Check spec exists: `ls .specweave/docs/internal/specs/`
- Use correct ID: `spec-001` or `001`

**"GraphQL query failed"**:
- Check GitHub CLI auth: `gh auth status`
- Re-authenticate: `gh auth login`

**"No user stories to sync"**:
- Add user stories to spec.md:
  ```markdown
  **US-001**: As a user, I want...
  - [ ] **AC-001-01**: Acceptance criteria 1
  ```

## Related

- `/specweave-github:sync` - OLD command (increment-based, DEPRECATED)
- `/specweave-jira:sync-spec` - Sync to Jira Epic
- `/specweave-ado:sync-spec` - Sync to Azure DevOps Feature
- `/specweave:sync-docs` - Sync living docs from increments to specs

## Implementation

**File**: `plugins/specweave-github/lib/github-spec-sync.ts`

**Core Class**: `GitHubSpecSync`

**Methods**:
- `syncSpecToGitHub(specId)` - Push to GitHub
- `syncFromGitHub(specId)` - Pull from GitHub
- `detectConflicts(spec, project)` - Compare states
- `resolveConflicts(spec, conflicts)` - Apply resolution strategy
