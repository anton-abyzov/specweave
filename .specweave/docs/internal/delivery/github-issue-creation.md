# GitHub Issue Creation - Correct Workflow (v0.24.0+)

**Last Updated**: 2025-11-22
**Status**: ACTIVE - Enforced by pre-commit hooks

---

## Quick Reference

**ONLY Correct Method**:
```bash
# Sync ALL user stories for a feature to GitHub
/specweave-github:sync FS-048
```

**ONLY Correct Format**:
```
[FS-XXX][US-YYY] User Story Title
```

**NEVER Use These** (deprecated/wrong):
- ❌ `GitHubEpicSync` class
- ❌ `GitHubSpecSync` class
- ❌ `/specweave-github:sync 0048` (syncs increments, not user stories)
- ❌ Manual `gh issue create` (no validation)

---

## Universal Hierarchy Architecture (ADR-0032)

```
SpecWeave Living Docs          →    GitHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature FS-048                 →    Milestone: "FS-048: Feature Title"
  ├─ User Story US-001         →      ├─ Issue #XXX: [FS-048][US-001] US Title
  │   ├─ AC-US1-01            →      │   └─ Checkbox in body
  │   ├─ AC-US1-02            →      │   └─ Checkbox in body
  │   └─ Tasks: T-001, T-002  →      │   └─ Checkbox in body
  │
  ├─ User Story US-002         →      ├─ Issue #YYY: [FS-048][US-002] US Title
  │   ├─ AC-US2-01            →      │   └─ Checkbox in body
  │   └─ Tasks: T-003, T-004  →      │   └─ Checkbox in body
  │
  └─ User Story US-003         →      └─ Issue #ZZZ: [FS-048][US-003] US Title
      └─ Tasks: T-005         →          └─ Checkbox in body
```

**Key Principles**:
1. **Features** → GitHub **Milestones** (containers)
2. **User Stories** → GitHub **Issues** (trackable items)
3. **Tasks** → **Checkboxes** in issue body (sub-items)

---

## Step-by-Step Workflow

### 1. Create Feature and User Stories in Living Docs

**Files to create**:
```
.specweave/docs/internal/specs/_features/FS-048/
├─ FEATURE.md              # Feature overview
├─ us-001-pagination.md    # User Story 1
├─ us-002-cli-defaults.md  # User Story 2
└─ us-003-caching.md       # User Story 3
```

**User Story Format** (us-001-pagination.md):
```yaml
---
id: US-001
feature: FS-048
title: Smart Pagination During Init
status: active
priority: P0
---

## User Story

**As a** developer initializing SpecWeave with 100+ GitHub projects
**I want** automatic pagination with a 50-project default limit
**So that** I can avoid rate limit exhaustion and complete init in `<2 minutes`

## Acceptance Criteria

- [ ] **AC-US1-01**: Init prompts for project limit (default: 50)
- [ ] **AC-US1-02**: API calls estimated and displayed
- [ ] **AC-US1-03**: Rate limit checked before proceeding

## Tasks

- [ ] **T-001**: Add pagination prompt to CLI
- [ ] **T-002**: Implement rate limit estimation
- [ ] **T-003**: Add pre-sync validation
```

### 2. Sync to GitHub

**Command**:
```bash
# Sync ALL user stories for FS-048
/specweave-github:sync FS-048
```

**What it does**:
1. ✅ Creates GitHub Milestone: `FS-048: Enhanced External Tool Import`
2. ✅ Creates 3 GitHub Issues:
   - #703: `[FS-048][US-001] Smart Pagination During Init`
   - #704: `[FS-048][US-002] CLI-First Defaults`
   - #705: `[FS-048][US-003] Smart Caching with TTL`
3. ✅ Adds labels: `user-story`, `specweave`, `p0`
4. ✅ Links issues to milestone
5. ✅ Adds task checkboxes to issue body

### 3. Verify Correct Format

**Check issue titles**:
```bash
gh issue list --milestone "FS-048" --json number,title
```

**Expected output**:
```json
[
  {"number": 703, "title": "[FS-048][US-001] Smart Pagination During Init"},
  {"number": 704, "title": "[FS-048][US-002] CLI-First Defaults"},
  {"number": 705, "title": "[FS-048][US-003] Smart Caching with TTL"}
]
```

**❌ WRONG formats** (if you see these, close immediately):
```json
[
  {"number": 703, "title": "[SP-US-001] Smart Pagination During Init"},     // ❌ SP- prefix
  {"number": 704, "title": "[FS-048] CLI-First Defaults"},                 // ❌ Feature-only
  {"number": 705, "title": "[FS-048-specweave] Smart Caching with TTL"}    // ❌ Project suffix
]
```

---

## Title Format Rules

### ✅ ONLY CORRECT Format

```
[FS-XXX][US-YYY] User Story Title
```

**Pattern**: `^[FS-\d{3}][US-\d{3}] .+$`

**Examples**:
- ✅ `[FS-048][US-001] Smart Pagination During Init`
- ✅ `[FS-048][US-002] CLI-First Defaults`
- ✅ `[FS-033][US-015] Task Completion Tracking`

### ❌ PROHIBITED Formats

**Pre-commit hook BLOCKS these**:

1. **Deprecated SP- prefix** (removed v0.24.0):
   ```
   ❌ [SP-US-001] Smart Pagination During Init
   ❌ [SP-FS-048] Enhanced External Tool Import
   ❌ [SP-FS-048-specweave] Enhanced External Tool Import
   ```

2. **Feature-only format** (missing US-ID):
   ```
   ❌ [FS-048] Enhanced External Tool Import
   ```
   **Why wrong**: Features use **Milestones**, not Issues!

3. **Project suffix in GitHub** (internal only):
   ```
   ❌ [FS-048-specweave] Enhanced External Tool Import
   ```
   **Why wrong**: Project suffix is for `README.md` only, NOT GitHub issues!

4. **Missing Feature ID**:
   ```
   ❌ [undefined][US-001] Smart Pagination
   ❌ [US-001] Smart Pagination
   ```
   **Why wrong**: Validation error, featureId required!

---

## Enforcement Layers

### 1. Pre-Commit Hook (NEW - v0.24.0+)

**File**: `scripts/pre-commit-hooks/validate-github-issue-format.sh`

**What it checks**:
- ❌ Blocks commits with `"[SP-US-"` or `"[SP-FS-"` in code
- ❌ Blocks commits with `"[FS-XXX] "` (Feature-only format)
- ✅ Allows `"[FS-XXX][US-YYY]"` (correct format)

**Bypass** (emergency only):
```bash
git commit --no-verify
```

### 2. Runtime Validation (UserStoryIssueBuilder)

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts`

**Validation stages**:

**Stage 1 - Constructor** (lines 69-75):
```typescript
if (!/^FS-\d{3}$/.test(featureId)) {
  throw new Error(`Invalid featureId format "${featureId}"`);
}
```

**Stage 2 - Title Generation** (line 115):
```typescript
const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;
```

**Stage 3 - Pattern Check** (lines 118-127):
```typescript
const titlePattern = /^\[FS-\d{3}\]\[US-\d{3}\] .+$/;
if (!titlePattern.test(title)) {
  throw new Error(`Generated issue title has incorrect format: "${title}"`);
}
```

### 3. Manual Review

**If you see wrong-format issues**:

1. **Close immediately**:
   ```bash
   gh issue close 703 --comment "WRONG FORMAT: Violates ADR-0032. Use [FS-XXX][US-YYY] format."
   ```

2. **Create correct issues**:
   ```bash
   /specweave-github:sync FS-048
   ```

3. **Report bug** (shouldn't happen with validation!):
   - File issue: `[BUG] Wrong GitHub issue format created`
   - Include: Which command was run, when, issue numbers

---

## Common Mistakes

### Mistake 1: Using `/specweave-github:sync 0048`

**Problem**: Syncs INCREMENTS to GitHub, not User Stories!

```bash
❌ WRONG: /specweave-github:sync 0048
✅ CORRECT: /specweave-github:sync FS-048
```

**What happens**:
- ❌ Creates increment-level issues (wrong architecture)
- ❌ May use deprecated code paths
- ✅ Should use Feature ID, not increment ID

### Mistake 2: Manual `gh issue create`

**Problem**: Bypasses validation, easy to get format wrong!

```bash
❌ WRONG: gh issue create --title "[SP-US-001] Title" --body "..."
✅ CORRECT: /specweave-github:sync FS-048
```

**Why wrong**:
- No featureId validation
- No title pattern check
- Easy to use deprecated SP- prefix

### Mistake 3: Using GitHubEpicSync Class

**Problem**: Creates Feature-level issues (violates ADR-0032)!

```typescript
❌ WRONG: new GitHubEpicSync(client, specsDir).syncEpicToGitHub('FS-048')
✅ CORRECT: new GitHubFeatureSync(client, specsDir, projectRoot).syncFeatureToGitHub('FS-048')
```

**GitHubEpicSync** generates:
```
[FS-048] Feature Title  ❌ WRONG! (Feature-only format)
```

**GitHubFeatureSync** generates:
```
[FS-048][US-001] User Story Title  ✅ CORRECT!
```

---

## Recovery Procedures

### If Wrong-Format Issues Exist

**Scenario**: Found 8 issues with `[SP-US-XXX]` format

**Recovery steps**:

1. **List all wrong-format issues**:
   ```bash
   gh issue list --state all --search "[SP-" --json number,title
   ```

2. **Close each one** with explanation:
   ```bash
   for NUM in 703 704 705 706 707 708 709 710; do
     gh issue close $NUM --comment "WRONG FORMAT: [SP-US-XXX] deprecated. Use [FS-XXX][US-YYY] per ADR-0032."
   done
   ```

3. **Create correct issues**:
   ```bash
   /specweave-github:sync FS-048
   ```

4. **Verify**:
   ```bash
   gh issue list --milestone "FS-048" --json number,title
   ```

   **Expected**: All titles match `[FS-048][US-XXX]` pattern

### If Duplicates Created

**Scenario**: Same User Story has multiple GitHub issues

**Use cleanup script**:
```bash
bash scripts/cleanup-duplicate-github-issues.sh --patterns "[FS-048][US-001]" --dry-run
```

**What it does**:
1. Finds all issues matching pattern
2. Keeps OLDEST issue
3. Closes duplicates with link to original

---

## References

### Documentation
- **CLAUDE.md Section 10**: GitHub Issue Format Policy (PROHIBITED formats)
- **ADR-0032**: Universal Hierarchy Mapping (architecture)
- **ADR-0061**: No Increment-to-Increment References

### Code
- **Correct**: `plugins/specweave-github/lib/github-feature-sync.ts`
- **Correct**: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- **Deprecated**: `plugins/specweave-github/lib/github-epic-sync.ts` (will be removed v0.25.0)
- **Deprecated**: `plugins/specweave-github/lib/github-spec-sync.ts` (wrong architecture)

### Reports
- `.specweave/increments/_archive/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md`
- `.specweave/increments/_archive/0050-*/reports/GITHUB-ISSUE-BUG-ANALYSIS-2025-11-22.md`
- `.specweave/increments/_archive/0050-*/reports/SP-PREFIX-BUG-ROOT-CAUSE-2025-11-22.md`

### Scripts
- `scripts/pre-commit-hooks/validate-github-issue-format.sh` (validation)
- `scripts/cleanup-duplicate-github-issues.sh` (cleanup)

---

## FAQ

### Q: Why can't I create Feature-level issues?

**A**: Features use GitHub **Milestones**, not Issues. This provides the correct hierarchy:
- Milestone (container) → Issues (trackable items) → Checkboxes (sub-items)

### Q: Why was the SP- prefix removed?

**A**: It was a legacy format from an older architecture. The new Universal Hierarchy (ADR-0032) uses `[FS-XXX][US-YYY]` for clear Feature → User Story linkage.

### Q: Can I bypass the pre-commit hook?

**A**: Yes, with `git commit --no-verify`, but **NOT RECOMMENDED**. The hook prevents format violations that would need manual cleanup.

### Q: What if I need to sync to multiple GitHub repos?

**A**: Use multi-project profiles:
```bash
# Feature FS-048 → Repo A (frontend)
/specweave-github:sync FS-048 --profile frontend-repo

# Feature FS-049 → Repo B (backend)
/specweave-github:sync FS-049 --profile backend-repo
```

### Q: How do I update existing issues?

**A**: Re-run the sync command:
```bash
/specweave-github:sync FS-048
```

It will **update** existing issues (not create duplicates) if:
- Issue number is stored in user story frontmatter
- Title pattern matches correctly

---

**Last Updated**: 2025-11-22
**Enforced**: Pre-commit hooks (v0.24.0+)
**Next Review**: v0.25.0 (remove deprecated classes)
