# Multi-Repo UX Refactoring Plan

## Current State Analysis

**File**: `src/core/repo-structure/repo-structure-manager.ts`
**Method**: `configureMultiRepo()` (lines 289-649)

### Current Flow Issues

1. **Repetitive "Create on GitHub?" question**
   - Asked for parent repo (line 408)
   - Asked for EACH implementation repo (line 548)
   - Total: N+1 times (1 parent + N repos)

2. **No existing repo detection**
   - Parent repo assumes always creating new
   - No option to connect to existing GitHub repo

3. **No batch configuration**
   - No option to specify same GitHub account for all repos
   - No naming pattern support (e.g., `sw-*`, `ec-*`)
   - Manual configuration for each repo

4. **Question order suboptimal**
   - "Create on GitHub?" appears 3rd (after name, description)
   - Should be asked earlier or globally

## Proposed Solution

### 1. Parent Repo Configuration

**New Flow**:

```
Step 1: GitHub owner/organization for ALL repos
  Input: anton-abyzov
  Validation: Check GitHub API if token available

Step 2: ✨ NEW - Existing Repo Detection
  Question: "Do you have an existing parent repository?"
  Type: confirm
  Default: false

  Branch A (YES - Existing):
    → Parent repository name: ___
    → Validation: Check if repo exists at {owner}/{name}
    → Auto-populate:
      - createOnGitHub = false
      - visibility = (detected from API)
      - description = (detected from API)
    → Skip create/visibility questions

  Branch B (NO - New):
    → Parent repository name: sw-markdown-editor-root
    → Parent repository description: "SpecWeave parent repository..."
    → Repository visibility: [Private/Public]
    → (Implicit: createOnGitHub = true, no need to ask)
```

**Code Changes**:
- Add `detectExistingRepo(owner: string, name: string): Promise<RepoInfo | null>`
- Modify `configureMultiRepo()` to ask existing repo question first
- Skip GitHub creation questions if existing repo detected

### 2. Implementation Repos Configuration

**New Flow**:

```
Step 3: Repository Count
  Question: "📦 How many IMPLEMENTATION repositories? (not counting parent)"
  Input: 3
  Validation: 1-10 repos

Step 4: ✨ NEW - GitHub Account Strategy
  Question: "Do all implementation repos belong to the same GitHub account?"
  Type: list
  Choices:
    - Same account (use "{owner}" for all)
    - Different accounts (specify per repository)
  Default: Same account

  If "Different accounts":
    → For each repo, ask: "GitHub owner for {repo-name}:"

Step 5: ✨ NEW - Naming Pattern
  Question: "Use a naming pattern for repository names?"
  Type: list
  Choices:
    - Yes - Pattern-based naming
    - No - Manual naming
  Default: Yes

  If "Yes":
    → Pattern prefix: sw-markdown-editor-___
      (Auto-detect from parent name or folder name)
    → Auto-suggestions shown:
      - sw-markdown-editor-frontend
      - sw-markdown-editor-backend
      - sw-markdown-editor-api
    → User can edit each suggestion in Step 7

Step 6: ✨ NEW - Global GitHub Creation Strategy
  Question: "Create repositories on GitHub?"
  Type: list
  Choices:
    - Yes - Create all repositories on GitHub
    - No - Local only (skip GitHub creation for all)
    - Custom - Choose per repository
  Default: Yes

  If "Custom":
    → For each repo in Step 7, ask: "Create {repo-name} on GitHub?"

Step 7: Repository Details (for each repo)
  Loop: i = 1 to repoCount

  7a. Repository Name
    If pattern enabled:
      → Default: {pattern-prefix}-{suffix[i]}
      → Message: "Repository name (editable):"
      → Allow editing
    Else:
      → Message: "Repository name:"
      → No default (manual entry)

  7b. Repository Description
    → Default: "{repo-name} service"
    → Allow editing

  7c. Repository ID
    → Auto-generate from repo name (smart algorithm)
    → Show: "✓ Repository ID: {id} (auto-generated)"
    → Only prompt if conflict detected

  7d. Repository Visibility
    → Question: "Repository visibility for {repo-name}?"
    → Choices: [Private, Public]
    → Default: Private

  7e. Create on GitHub (conditional)
    → If Step 6 = "Custom": Ask per repo
    → If Step 6 = "Yes": Skip (already decided)
    → If Step 6 = "No": Skip (already decided)
```

### 3. Code Structure Changes

**New Methods to Add**:

```typescript
// Detect existing GitHub repository
private async detectExistingRepo(
  owner: string,
  name: string
): Promise<{ exists: boolean; visibility?: 'private' | 'public'; description?: string }> {
  // Use GitHub API to check if repo exists
  // Return repo metadata if exists
}

// Get naming pattern from user
private async promptNamingPattern(
  projectName: string,
  repoCount: number
): Promise<{ usePattern: boolean; pattern?: string; suggestions?: string[] }> {
  // Ask if user wants pattern
  // Generate suggestions based on pattern
}

// Get GitHub account strategy
private async promptAccountStrategy(
  defaultOwner: string,
  repoCount: number
): Promise<{ sameAccount: boolean; owners?: Map<number, string> }> {
  // Ask if all repos use same account
  // If no, prompt per-repo owners
}

// Get global creation strategy
private async promptCreationStrategy(): Promise<{
  strategy: 'all' | 'none' | 'custom';
}> {
  // Ask: create all, none, or custom
}
```

**Modified Methods**:

```typescript
// Update configureMultiRepo to use new flow
private async configureMultiRepo(
  useParent: boolean = true,
  isLocalParent: boolean = false
): Promise<RepoStructureConfig> {
  // Step 1: Owner
  // Step 2: ✨ NEW - Existing parent repo?
  // Step 3: Repo count
  // Step 4: ✨ NEW - Account strategy
  // Step 5: ✨ NEW - Naming pattern
  // Step 6: ✨ NEW - Creation strategy
  // Step 7: Loop repos with pre-filled data
}
```

### 4. Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Questions for 3 repos** | ~30 | ~15 | 50% reduction |
| **"Create on GitHub?" asked** | 4 times | 1 time | 75% reduction |
| **Pattern support** | None | Yes | New feature |
| **Existing repo detection** | None | Yes | New feature |
| **Account flexibility** | Same only | Same or mixed | New feature |

### 5. Implementation Steps

1. **Add helper methods** (3 hours)
   - `detectExistingRepo()`
   - `promptNamingPattern()`
   - `promptAccountStrategy()`
   - `promptCreationStrategy()`

2. **Refactor parent repo flow** (2 hours)
   - Add existing repo detection
   - Remove redundant "Create on GitHub?" question
   - Update state saving

3. **Refactor implementation repos flow** (4 hours)
   - Add account strategy prompt
   - Add naming pattern prompt
   - Add global creation strategy prompt
   - Modify per-repo loop to use pre-filled data

4. **Update tests** (2 hours)
   - Unit tests for new helper methods
   - Integration tests for new flow
   - E2E tests for complete setup

5. **Documentation** (1 hour)
   - Update user guide
   - Update CLAUDE.md
   - Add migration notes

**Total Estimated Time**: 12 hours

### 6. Backward Compatibility

- All existing configurations continue to work
- New prompts have sensible defaults
- State manager handles both old and new formats
- No breaking changes to `RepoStructureConfig` interface

### 7. Testing Strategy

**Unit Tests**:
- `detectExistingRepo()` with mock GitHub API
- `promptNamingPattern()` with various inputs
- `generateRepoIdSmart()` with pattern-based names

**Integration Tests**:
- Complete parent repo flow (existing + new)
- Complete implementation repos flow (pattern + no pattern)
- Mixed account scenario
- Custom creation strategy scenario

**E2E Tests**:
- Full setup with pattern (3 repos, same account)
- Full setup without pattern (3 repos, mixed accounts)
- Resume setup after Ctrl+C

### 8. Edge Cases

1. **Existing repo with different visibility**: Warn user, allow override
2. **Pattern conflicts with existing repos**: Suggest alternatives
3. **GitHub API rate limiting**: Show warning, allow local-only setup
4. **Mixed public/private repos**: Support in custom visibility mode
5. **Empty pattern prefix**: Use folder name as fallback

### 9. User Experience Examples

**Example 1: New Project with Pattern**

```
🏗️  Repository Architecture Setup

✔ GitHub owner/organization for ALL repos: anton-abyzov
✔ Do you have an existing parent repository? No
✔ Parent repository name: sw-markdown-editor-root
✔ Parent repository description: SpecWeave parent repository...
✔ Repository visibility for "sw-markdown-editor-root"? Public

📦 How many IMPLEMENTATION repositories? 3

✔ Do all implementation repos belong to the same GitHub account?
  › Same account (use "anton-abyzov" for all)

✔ Use a naming pattern for repository names?
  › Yes - Pattern-based naming
✔ Pattern prefix: sw-markdown-editor

✔ Create repositories on GitHub?
  › Yes - Create all repositories on GitHub

📦 Configure Each Repository:

Repository 1 of 3:
✔ Repository name (editable): sw-markdown-editor-frontend
✔ Repository description: Frontend service
   ✓ Repository ID: frontend (auto-generated)
✔ Repository visibility: Public

Repository 2 of 3:
✔ Repository name (editable): sw-markdown-editor-backend
✔ Repository description: Backend service
   ✓ Repository ID: backend (auto-generated)
✔ Repository visibility: Public

[etc...]

✅ Setup complete!
```

**Example 2: Existing Parent Repo**

```
🏗️  Repository Architecture Setup

✔ GitHub owner/organization for ALL repos: anton-abyzov
✔ Do you have an existing parent repository? Yes
✔ Parent repository name: my-existing-parent
   ✓ Found existing repository: anton-abyzov/my-existing-parent (Private)

📦 How many IMPLEMENTATION repositories? 2
[etc...]
```

### 10. Files to Modify

1. **Core logic**:
   - `src/core/repo-structure/repo-structure-manager.ts`
   - `src/core/repo-structure/github-validator.ts` (add detection)

2. **Tests**:
   - `tests/integration/core/repo-structure-manager.test.ts`
   - `tests/e2e/multi-repo-setup.test.ts`

3. **Documentation**:
   - `CLAUDE.md` (update development setup)
   - `.specweave/docs/public/guides/multi-repo-setup.md`

### 11. Success Metrics

- ✅ Question count reduced by 50%
- ✅ Setup time reduced by 40%
- ✅ Pattern support for consistent naming
- ✅ Existing repo detection prevents duplicates
- ✅ User satisfaction improved (survey)

## Next Steps

1. Review and approve this plan
2. Create increment: `/specweave:increment "multi-repo-ux-refactor"`
3. Generate tasks.md from this plan
4. Implement changes
5. Test thoroughly
6. Update documentation
7. Release with changelog entry

---

**Status**: DRAFT - Awaiting Review
**Author**: Anton Abyzov
**Date**: 2025-11-20
