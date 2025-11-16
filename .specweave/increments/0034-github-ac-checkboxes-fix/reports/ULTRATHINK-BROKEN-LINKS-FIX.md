# ULTRATHINK: Fix Broken GitHub Issue Links (404 Errors)

**Date**: 2025-11-15
**Issue**: Links in GitHub issues lead to 404 errors
**Example**: https://github.com/anton-abyzov/specweave/issues/571
**Broken Link**: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-007-multi-tool-workflow-support.md

---

## Root Cause Analysis

### What's Broken

**GitHub Issue #571 contains link**:
```
📁 User Story File: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-007-multi-tool-workflow-support.md
```

**Result**: 404 Not Found

### Why It's Broken

**File exists locally** ✅:
```bash
$ ls .specweave/docs/internal/specs/specweave/FS-031/us-007-multi-tool-workflow-support.md
✅ File exists locally
```

**File NOT in Git** ❌:
```bash
$ git ls-files .specweave/docs/internal/specs/specweave/FS-031/
(empty output - not committed!)
```

**Conclusion**: Living docs are generated locally but NOT committed to repository, causing 404s.

---

## Architecture Decision: Should Living Docs Be Committed?

### Current State

**What's Committed**:
- ✅ `.specweave/docs/internal/architecture/adr/` (ADRs)
- ✅ `.specweave/docs/internal/README.md` (documentation)
- ✅ `.specweave/increments/` (increments)

**What's NOT Committed**:
- ❌ `.specweave/docs/internal/specs/` (living docs specs)
- ❌ `.specweave/docs/internal/specs/_features/` (feature overviews)
- ❌ `.specweave/docs/internal/specs/{project}/` (user stories)

**Why Not Committed** (Historical Assumption):
- Assumption 1: Large diffs on every sync?
- Assumption 2: Merge conflicts if multiple people sync?
- Assumption 3: Generated content shouldn't be versioned?

### Three Solution Options

#### Option 1: Commit Living Docs ⭐ RECOMMENDED

**Architecture Rationale**: Living docs ARE the permanent knowledge base and should be versioned with code.

**Pros**:
- ✅ Links work immediately (no 404s)
- ✅ True "living documentation" (versioned with code)
- ✅ Team can review specs in PRs
- ✅ Full traceability (see spec evolution over time)
- ✅ Aligns with "documentation = code" philosophy
- ✅ GitHub markdown rendering works perfectly
- ✅ Searchable via GitHub search
- ✅ Can use GitHub blame to see who wrote which AC

**Cons**:
- ⚠️ Diffs on every sync (acceptable for permanent docs)
- ⚠️ Potential merge conflicts (mitigated by append-only pattern)

**Risk Mitigation**:
- Living docs are append-only (new files added, rarely modified)
- Sync typically happens from one machine (single developer or CI)
- Conflicts rare in practice (different features = different folders)

**Example Workflow**:
```bash
# After completing increment
/specweave:done 0031

# Living docs generated
.specweave/docs/internal/specs/specweave/FS-031/
├── us-001-rich-external-issue-content.md
├── us-002-task-level-mapping.md
└── ...

# Commit living docs
git add .specweave/docs/internal/specs/
git commit -m "docs: sync living docs for FS-031"
git push

# GitHub links now work! ✅
```

---

#### Option 2: Link to Increment Folder Instead

**Architecture**: Change GitHub issue links to point to increment folder (which IS committed).

**Pros**:
- ✅ No additional commits needed
- ✅ Increment folders already committed

**Cons**:
- ❌ Links break when increment is archived
- ❌ Doesn't reflect living docs architecture (increment → living docs flow)
- ❌ Can't see permanent spec (only temporary increment view)

**Example**:
```markdown
<!-- Current (broken): -->
📁 User Story: .specweave/docs/internal/specs/specweave/FS-031/us-007-*.md  ❌ 404

<!-- Option 2 (works but wrong architecture): -->
📁 Increment Spec: .specweave/increments/0031-external-tool-sync/spec.md  ⚠️ Temporary
```

**Verdict**: ❌ Wrong architecture (living docs are the source of truth, not increment)

---

#### Option 3: Use GitHub Wiki or GitHub Pages

**Architecture**: Deploy living docs to GitHub Wiki or Pages.

**Pros**:
- ✅ Separate from code (no diffs in main repo)
- ✅ Can have custom domain
- ✅ Full website experience

**Cons**:
- ❌ Extra infrastructure complexity
- ❌ Deployment pipeline needed
- ❌ Not versioned with code
- ❌ Harder to review in PRs
- ❌ Can't use GitHub blame
- ❌ Separate authentication

**Verdict**: ❌ Too complex for this use case

---

## Decision: Option 1 (Commit Living Docs)

**Rationale**: Living docs ARE the permanent knowledge base and should be treated as first-class documentation, not generated artifacts.

**Benefits**:
1. **Traceability**: See spec evolution over time via Git history
2. **Collaboration**: Team can review specs in PRs before merge
3. **Discoverability**: Searchable via GitHub search
4. **Reliability**: No broken links in GitHub issues
5. **Simplicity**: No deployment pipeline needed
6. **Alignment**: Follows "documentation = code" philosophy

**Trade-offs Accepted**:
- Larger diffs (acceptable for permanent docs)
- Potential merge conflicts (rare in practice, mitigated by append-only pattern)

---

## Implementation Plan

### Step 1: Commit Existing Living Docs

```bash
# Add all living docs to Git
git add .specweave/docs/internal/specs/

# Verify what's being added
git status

# Commit
git commit -m "docs: add living docs for FS-023, FS-028, FS-031, FS-033, FS-035

- Add feature overviews (_features/)
- Add user stories per project (specweave/)
- Links in GitHub issues now work
- Enables team collaboration on specs

Living docs are permanent knowledge base and should be versioned.
"

# Push to develop
git push origin develop
```

### Step 2: Verify Links Work

```bash
# Check issue #571
open https://github.com/anton-abyzov/specweave/issues/571

# Click "User Story File" link
# Should now resolve to:
# https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-007-multi-tool-workflow-support.md
# ✅ Should work!
```

### Step 3: Update Link Generation (Optional Fix)

**Current link builder** in `user-story-issue-builder.ts`:
```typescript
// Builds: /blob/develop/.specweave/docs/...
const branch = 'develop';  // ← Hardcoded
```

**Potential Issue**: If team uses different branch (main, master), links break.

**Enhanced Implementation**:
```typescript
// Auto-detect current branch
const branch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf-8',
  cwd: this.projectRoot
}).trim();

// Or use default branch from GitHub API
const branch = await this.client.getDefaultBranch();
```

**Decision**: Keep hardcoded 'develop' for now (SpecWeave uses develop as default). Can enhance later if needed.

---

## Testing Plan

### Manual Test (Immediate)

1. Commit living docs to Git
2. Push to develop
3. Open https://github.com/anton-abyzov/specweave/issues/571
4. Click "User Story File" link
5. Verify: File loads ✅ (not 404)

### Automated Test (Future)

```typescript
// tests/e2e/github-issue-links.spec.ts

test('GitHub issue links to living docs work', async () => {
  // Create feature and sync to GitHub
  await featureSync.syncFeatureToGitHub('FS-TEST');

  // Get issue body
  const issue = await githubClient.getIssue(issueNumber);

  // Extract link
  const linkMatch = issue.body.match(/https:\/\/github\.com\/.*?\.md/);
  expect(linkMatch).toBeTruthy();

  // Verify link is accessible (not 404)
  const response = await fetch(linkMatch[0]);
  expect(response.status).toBe(200);
});
```

---

## Migration Strategy

### Existing Features (FS-023, FS-028, FS-031, FS-033, FS-035)

**Current State**: 5 features with living docs locally, not committed

**Action**:
```bash
# Commit all existing living docs
git add .specweave/docs/internal/specs/_features/
git add .specweave/docs/internal/specs/specweave/
git commit -m "docs: add living docs for 5 features (FS-023, FS-028, FS-031, FS-033, FS-035)"
git push origin develop
```

**Result**: All 22 existing GitHub issues will have working links ✅

### Future Features

**Workflow**:
1. Complete increment: `/specweave:done 0036`
2. Living docs generated automatically
3. Commit living docs with code:
   ```bash
   git add .specweave/docs/internal/specs/
   git commit -m "docs: sync living docs for FS-036"
   ```
4. GitHub links work immediately ✅

**Automation** (Future Enhancement):
```bash
# Post-increment-done hook could auto-commit living docs
# .specweave/hooks/post-increment-done.sh

if [ "$AUTO_COMMIT_LIVING_DOCS" = "true" ]; then
  git add .specweave/docs/internal/specs/
  git commit -m "docs: sync living docs for $INCREMENT_ID"
fi
```

---

## Acceptance Criteria

- ✅ AC-LINK-01: All living docs committed to Git
- ✅ AC-LINK-02: GitHub issue links resolve (no 404s)
- ✅ AC-LINK-03: Links point to correct branch (develop)
- ✅ AC-LINK-04: Team can review specs in PRs
- ✅ AC-LINK-05: Git history shows spec evolution

---

## .gitignore Verification

**Check if living docs are excluded**:
```bash
$ grep -E "\.specweave/docs" .gitignore
.specweave/docs-site-internal/  # ← Different (internal site builder)
```

**Result**: Living docs NOT excluded ✅ (can commit safely)

---

## Files Affected

### Git Commits
- `.specweave/docs/internal/specs/_features/` (5 features)
- `.specweave/docs/internal/specs/specweave/` (22 user stories)

### Code Changes (Optional Enhancement)
- `plugins/specweave-github/lib/user-story-issue-builder.ts` (auto-detect branch)

---

## Success Metrics

### Before Fix
- ❌ 22 GitHub issues with broken links (404)
- ❌ Can't click through to see full spec
- ❌ Team can't review specs in GitHub UI

### After Fix
- ✅ 22 GitHub issues with working links
- ✅ Click through to see full spec
- ✅ Team can review specs in GitHub UI
- ✅ Git history shows spec evolution

---

## Conclusion

**Decision**: Commit living docs to Git (Option 1)

**Rationale**: Living docs are permanent knowledge base, should be versioned

**Action**: Commit `.specweave/docs/internal/specs/` to develop branch

**Result**: All GitHub issue links will work ✅

---

**Next Step**: Execute commit of living docs and verify links work
