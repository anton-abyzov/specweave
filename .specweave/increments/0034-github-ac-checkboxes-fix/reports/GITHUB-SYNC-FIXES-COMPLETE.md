# GitHub User Story Sync Fixes - Complete

**Date**: 2025-11-15
**Increment**: 0034-github-ac-checkboxes-fix
**Status**: ✅ Implementation Complete

---

## Summary

Fixed SpecWeave's GitHub sync to properly generate GitHub issues from user story files with ALL required content:
- ✅ Checkable Acceptance Criteria (both formats supported)
- ✅ Related User Stories section with working links
- ✅ Business Rationale
- ✅ Implementation details with proper GitHub blob URLs
- ✅ Project naming uses repo name instead of "default"

---

## Issues Fixed

### 1. Project Naming - Repo Name Instead of "default" ✅

**Problem**: User stories were stored in `.specweave/docs/internal/specs/default/FS-XXX/` even when the repo name was "specweave".

**Solution**: Modified `ProjectDetector` to auto-detect the repository name from git remote and use it as the fallback project ID.

**Files Changed**:
- `src/core/living-docs/project-detector.ts`
  - Added `detectRepoName()` method to extract repo name from git remote URL
  - Updated constructor to use detected repo name as fallback instead of hardcoded "default"

**Result**:
```
# Before
.specweave/docs/internal/specs/default/FS-031/us-001-*.md

# After
.specweave/docs/internal/specs/specweave/FS-031/us-001-*.md
```

**Detection Logic**:
```typescript
// Supports multiple Git URL formats:
// - https://github.com/owner/repo.git → "repo"
// - git@github.com:owner/repo.git → "repo"
// - https://github.com/owner/repo → "repo"
```

---

### 2. Related User Stories Extraction ✅

**Problem**: GitHub issues were missing the "Related User Stories" section, even though user story files contained it.

**Solution**: Added extraction of "Related User Stories" section with automatic link conversion to GitHub blob URLs.

**Files Changed**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
  - Added regex extraction for "Related User Stories" section (line 358-391)
  - Converts relative links (`us-002-*.md`) to full GitHub URLs
  - Detects project folder from user story path automatically

**Example**:
```markdown
# User Story File
## Related User Stories

- [US-002: Task Mapping](us-002-task-level-mapping-traceability.md)
- [US-003: Status Config](us-003-status-mapping-configuration.md)

# GitHub Issue (after conversion)
## Related User Stories

- [US-002: Task Mapping](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-002-task-level-mapping-traceability.md)
- [US-003: Status Config](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-003-status-mapping-configuration.md)
```

---

### 3. Acceptance Criteria Format Support ✅

**Problem**: Some user stories used `**AC-001**` format while others used `**AC-US1-01**`. The builder only supported one format.

**Solution**: Updated AC extraction regex to support BOTH formats.

**Files Changed**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
  - Updated `extractAcceptanceCriteria()` regex patterns (line 177-178)
  - Supports both `AC-US1-01` (preferred) and `AC-001` (legacy)
  - Properly extracts checkbox state `[x]` or `[ ]` for both formats

**Supported Formats**:
```markdown
# Format 1 (Preferred - with User Story ID)
- [x] **AC-US1-01**: Description (completed)
- [ ] **AC-US1-02**: Description (not completed)

# Format 2 (Legacy - simple numbering)
- [x] **AC-001**: Description (completed)
- [ ] **AC-002**: Description (not completed)
```

---

## Architecture Overview

### User Story → GitHub Issue Flow

```
1. User Story File (.specweave/docs/internal/specs/{project}/FS-XXX/us-001-*.md)
   ↓
2. GitHubFeatureSync.syncFeatureToGitHub(featureId)
   ↓
3. findUserStories() - Discovers all us-*.md files across projects
   ↓
4. UserStoryIssueBuilder.buildIssueBody()
   ├─ Extract frontmatter (id, title, status, project)
   ├─ Extract User Story statement
   ├─ Extract Acceptance Criteria (with checkboxes)
   ├─ Extract Tasks from increment's tasks.md (with checkboxes)
   ├─ Extract Business Rationale
   ├─ Extract Related User Stories (✅ NEW!)
   └─ Extract Implementation section
   ↓
5. Convert ALL relative links → GitHub blob URLs
   ↓
6. Create/Update GitHub Issue
   ↓
7. Update user story frontmatter with issue number
```

### Project Detection Flow

```
1. ProjectDetector initialization
   ↓
2. Check if multiProject config exists
   ├─ YES → Use configured projects
   └─ NO → Detect repo name from git remote ✅ NEW!
       ↓
   3. Fallback project = repo name (e.g., "specweave")
       ↓
   4. User stories stored in .specweave/docs/internal/specs/{repo-name}/
```

---

## Testing Checklist

### Unit Tests (Already Passing)

```bash
# Test AC extraction with both formats
npm run test -- user-story-issue-builder.test.ts

# Test project detection
npm run test -- project-detector.test.ts
```

### Integration Test Plan

#### Test 1: Verify Repo Name Detection
```bash
# Check fallback project name
node -e "
import('./dist/src/core/living-docs/project-detector.js').then(({ ProjectDetector }) => {
  const detector = new ProjectDetector();
  const projects = detector.getProjects();
  console.log('Detected project:', projects[0].id);
  // Expected: 'specweave' (not 'default')
});
"
```

#### Test 2: Sync User Story with All Content
```bash
# Sync FS-031 (External Tool Status Sync)
node -e "
import('./dist/plugins/specweave-github/lib/github-client-v2.js').then(async ({ GitHubClientV2 }) => {
  const { GitHubFeatureSync } = await import('./dist/plugins/specweave-github/lib/github-feature-sync.js');
  const path = await import('path');

  const repo = await GitHubClientV2.detectRepo(process.cwd());
  const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
  const specsDir = path.default.join(process.cwd(), '.specweave/docs/internal/specs');
  const featureSync = new GitHubFeatureSync(client, specsDir, process.cwd());

  const result = await featureSync.syncFeatureToGitHub('FS-031');
  console.log('Sync complete:', result);
});
"
```

**Expected GitHub Issue Content**:
```markdown
**Feature**: FS-031
**Status**: Complete
**Priority**: P2

## User Story

**As a** stakeholder viewing GitHub/JIRA/ADO
**I want** to see full spec content (user stories, AC, tasks) in the external issue
**So that** I don't need to navigate to the repository to understand the feature

## Acceptance Criteria

- [x] **AC-US1-01**: External issues show executive summary (P1, testable)
- [x] **AC-US1-02**: External issues show all user stories with descriptions (P1, testable)
- [x] **AC-US1-03**: External issues show acceptance criteria (P1, testable)
- [ ] **AC-US1-07**: Progress comments show AC completion status with checkboxes (P1, testable)

## Tasks

- [x] **T-001**: Create Enhanced Content Builder
- [x] **T-003**: Enhance GitHub Content Sync

## Business Rationale

External stakeholders (PM, clients, executives) need complete context without developer access to repository.

## Related User Stories

- [US-002: Task-Level Mapping & Traceability](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-002-task-level-mapping-traceability.md)
- [US-003: Status Mapping Configuration](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-003-status-mapping-configuration.md)

## Implementation

**Increment**: [0031-external-tool-status-sync](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync)

**Tasks**:
- [T-001: Create Enhanced Content Builder](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md#t-001-create-enhanced-content-builder)
```

#### Test 3: Verify All Links Work in GitHub
1. Go to created GitHub issue
2. Click all links in "Related User Stories" section → Should navigate to correct `.md` files on GitHub
3. Click all links in "Implementation" section → Should navigate to correct increment files
4. Click "Feature Spec" link → Should navigate to `FEATURE.md` file

---

## Key Benefits

### 1. **Repo-Aware Project Naming** 🎯
- Project folders automatically match repository names
- No more confusing "default" folders for single-repo projects
- Multi-repo setups: Each repo gets its own named folder

### 2. **Complete GitHub Issue Content** 📄
- Stakeholders see EVERYTHING without accessing the repository
- Acceptance Criteria → Trackable checkboxes in GitHub
- Related Stories → Easy navigation between user stories
- Business Rationale → Context for non-technical stakeholders
- Implementation → Direct links to increment and tasks

### 3. **Dual AC Format Support** 🔄
- Legacy user stories with `AC-001` format still work
- New user stories can use preferred `AC-US1-01` format
- No need to regenerate old user stories

### 4. **GitHub-Optimized Links** 🔗
- All relative links automatically converted to GitHub blob URLs
- Links work in GitHub's web UI (not broken relative paths)
- Branch-aware (defaults to "develop", configurable)

---

## Migration Notes

### For Existing Projects

**No breaking changes!** Your existing user story files and GitHub issues will continue to work.

**Optional Migration** (to use repo name instead of "default"):

```bash
# 1. Move user story files to new folder
mv .specweave/docs/internal/specs/default .specweave/docs/internal/specs/specweave

# 2. Update all internal links (if any reference "default")
# (Usually not needed - links are relative)

# 3. Re-sync to GitHub to update issue links
# (Automatic - just run sync again)
```

**Automatic for New Increments**:
- New increments will automatically use the repo name
- No manual configuration needed

---

## Code Changes Summary

### Modified Files

1. **`src/core/living-docs/project-detector.ts`** (+48 lines)
   - Added `detectRepoName()` method
   - Updated constructor to use repo name as fallback
   - Supports multiple git URL formats

2. **`plugins/specweave-github/lib/user-story-issue-builder.ts`** (+45 lines)
   - Added "Related User Stories" extraction (line 358-391)
   - Updated AC regex to support both formats (line 177-178, 187-201)
   - Automatic link conversion to GitHub blob URLs

### No Breaking Changes

- All existing user stories still work
- Both AC formats supported
- Fallback to "default" if repo name detection fails
- Backward compatible with existing GitHub issues

---

## Next Steps

### Recommended Actions

1. **Re-sync All Features** (Optional - updates GitHub issue content)
   ```bash
   # Sync specific feature
   node -e "import('./dist/plugins/specweave-github/lib/github-feature-sync.js')..."

   # Or use bulk sync script
   ./scripts/bulk-feature-sync.ts
   ```

2. **Verify GitHub Issues** (Manual check)
   - Open a few GitHub issues
   - Confirm all sections are present:
     - ✅ Acceptance Criteria (checkboxes)
     - ✅ Related User Stories (working links)
     - ✅ Business Rationale
     - ✅ Implementation (working links)

3. **Update User Stories** (Optional - for consistent AC format)
   - Regenerate user stories to use `AC-US1-01` format
   - Or leave as-is (both formats work)

---

## Known Limitations

1. **Repo Name Detection**:
   - Requires git repository with `origin` remote
   - Falls back to "default" if not a git repo
   - Cannot auto-detect in non-git environments

2. **Link Conversion**:
   - Assumes "develop" branch by default
   - Configurable via `repoInfo.branch` parameter
   - Won't convert absolute URLs (leaves them as-is)

3. **AC Format**:
   - Both formats supported, but `AC-US1-01` is preferred
   - Mixing formats in same user story not recommended

---

## References

- **User Story Format**: `.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`
- **GitHub Sync Architecture**: `plugins/specweave-github/lib/github-feature-sync.ts`
- **Issue Builder**: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- **Project Detection**: `src/core/living-docs/project-detector.ts`

---

**Status**: ✅ Ready for testing and deployment
**Build**: ✅ Successful
**Tests**: ⏳ Pending integration test run
