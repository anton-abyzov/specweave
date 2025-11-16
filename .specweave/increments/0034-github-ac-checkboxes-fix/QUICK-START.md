# Quick Start - Fix GitHub Sync (Universal Hierarchy)

**Problem**: Feature-level issue #506 created instead of User Story issues.
**Solution**: Close #506 and create proper User Story issues.
**Time**: 5 minutes

---

## TL;DR (Just Fix It!)

```bash
# 1. Close broken issue
gh issue close 506 --comment "Migrating to User Story-based issues (Universal Hierarchy)"

# 2. Run migration (dry run first)
npx tsx scripts/migrate-feature-issues-to-user-stories.ts --dry-run

# 3. Execute migration
npx tsx scripts/migrate-feature-issues-to-user-stories.ts --feature FS-033

# 4. Verify
gh issue list --search "[FS-033]" --state open
```

**Expected Result**:
- ✅ Issue #506 closed
- ✅ Milestone `FS-033` created
- ✅ 4 User Story issues created:
  - `[FS-033][US-001] Prevent Duplicate Locations`
  - `[FS-033][US-002] Auto-Detect Conflicts`
  - `[FS-033][US-003] Manual Archive Control`
  - `[FS-033][US-004] Test Coverage`

---

## What's Wrong (Quick Summary)

**Before** ❌:
```
[FS-033] Duplicate Increment Prevention (GitHub Issue)
└─ All 4 User Stories as checkboxes
```

**After** ✅:
```
FS-033 (GitHub Milestone)
├─ [FS-033][US-001] Prevent Duplicates (Issue)
├─ [FS-033][US-002] Auto-Detect (Issue)
├─ [FS-033][US-003] Manual Archive (Issue)
└─ [FS-033][US-004] Test Coverage (Issue)
```

---

## Step-by-Step Fix

### Step 1: Close Broken Issue (#506)

```bash
gh issue close 506 --comment "Migrating to Universal Hierarchy (Features→Milestones, UserStories→Issues)"
```

**Why**: Issue #506 uses wrong architecture (Feature-level issue instead of Milestone).

### Step 2: Run Migration Script

**Dry run first** (see what will happen):
```bash
npx tsx scripts/migrate-feature-issues-to-user-stories.ts --dry-run
```

**Execute migration**:
```bash
npx tsx scripts/migrate-feature-issues-to-user-stories.ts --feature FS-033
```

**What it does**:
1. Confirms #506 is closed
2. Creates GitHub Milestone: `FS-033: Duplicate Increment Prevention`
3. Reads 4 `us-*.md` files from `.specweave/docs/internal/specs/default/FS-033/`
4. Creates 4 GitHub issues (one per User Story)
5. Updates frontmatter with GitHub issue links

### Step 3: Verify Results

**Check GitHub**:
```bash
gh issue list --search "[FS-033]" --state open
```

**Expected output**:
```
#507  [FS-033][US-001] Prevent Duplicate Locations     user-story, p1
#508  [FS-033][US-002] Auto-Detect Conflicts           user-story, p1
#509  [FS-033][US-003] Manual Archive Control          user-story, p2
#510  [FS-033][US-004] Test Coverage                   user-story, p1
```

**Check Milestone**:
```bash
gh api repos/:owner/:repo/milestones | jq '.[] | select(.title | contains("FS-033"))'
```

**Check Frontmatter**:
```bash
cat .specweave/docs/internal/specs/default/FS-033/us-001-prevent-duplicates.md | head -15
```

Should show:
```yaml
---
id: US-001
feature: FS-033
title: "Prevent Duplicate Locations"
status: planning
external:
  github:
    issue: 507
    url: https://github.com/anton-abyzov/specweave/issues/507
---
```

---

## Troubleshooting

### Migration Script Fails

**Error**: `Feature FS-033 not found`

**Fix**: Ensure `.specweave/docs/internal/specs/_features/FS-033/FEATURE.md` exists
```bash
ls .specweave/docs/internal/specs/_features/FS-033/
# Should show: FEATURE.md
```

### No User Story Files Found

**Error**: `Found 0 User Stories to sync`

**Fix**: Ensure `us-*.md` files exist in project folder
```bash
ls .specweave/docs/internal/specs/default/FS-033/
# Should show: us-001-*.md, us-002-*.md, etc.
```

### GitHub API Rate Limit

**Error**: `rate limit exceeded`

**Fix**: Wait 1 hour or authenticate with PAT
```bash
gh auth login --with-token < ~/.github/token
```

---

## For More Details

**Full implementation guide**:
- `.specweave/increments/0034-github-ac-checkboxes-fix/reports/UNIVERSAL-HIERARCHY-FIX-COMPLETE.md`

**Architecture analysis**:
- `.specweave/increments/0034-github-ac-checkboxes-fix/reports/ARCHITECTURE-CONTRADICTIONS-ANALYSIS.md`

**Updated documentation**:
- `CLAUDE.md` (lines 821-856)
- `src/templates/CLAUDE.md.template` (lines 130-149)

---

**Done!** 🎉

Your GitHub sync now follows Universal Hierarchy correctly.
