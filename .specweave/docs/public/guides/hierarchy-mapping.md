# Universal Hierarchy Mapping

**Document Type**: Guide
**Audience**: Developers, Project Managers, DevOps Engineers
**Last Updated**: 2025-11-14

---

## Overview

SpecWeave implements a **Universal Hierarchy** that maps consistently across all external tools (GitHub, JIRA, Azure DevOps). This guide documents the canonical mapping and explains how SpecWeave represents work items in each tool.

---

## Canonical Hierarchy

| Level | SpecWeave | Description | Typical Size |
|-------|-----------|-------------|--------------|
| **Epic/Feature** | FS-* (Feature Spec) | Strategic feature folder containing 10-30 user stories | 2-6 months |
| **User Story** | US-* (User Story) | Detailed requirement with 3-10 acceptance criteria | 1-2 weeks |
| **Task** | T-* (Task) | Implementation unit (single developer, single day) | 1-4 hours |

---

## External Tool Mapping

### GitHub

| SpecWeave | GitHub | Notes |
|-----------|--------|-------|
| **FS-* (Epic)** | **Milestone** (hierarchical) OR **Issue (Type: Feature)** (flat) | GitHub doesn't have "Epic" as an issue type. Use Milestone for hierarchical tracking, or Issue with Type=Feature for flat tracking. |
| **US-* (User Story)** | **Issue** | Standard GitHub Issue |
| **T-* (Task)** | **Checkbox** in issue body | Tasks are temporary (in increments), not synced to GitHub as separate issues |

**Key Insight**: GitHub Epics = Milestones, NOT Issue Type "Epic"!

**When to use each approach**:
- **Milestone approach**: Use `/specweave-github:sync-epic` to create Milestone + Issues (hierarchical)
- **Issue approach**: Use `bulk-spec-sync.ts` to create Issues for permanent specs (flat)

### JIRA

| SpecWeave | JIRA | Notes |
|-----------|------|-------|
| **FS-* (Epic)** | **Epic** | JIRA has native "Epic" issue type |
| **US-* (User Story)** | **Story** | Linked to Epic via "Epic Link" field |
| **T-* (Task)** | **Sub-task** | Linked to Story as child |

**Key Insight**: JIRA has all three levels as native work item types!

### Azure DevOps (ADO)

| SpecWeave | Azure DevOps | Notes |
|-----------|--------------|-------|
| **FS-* (Epic)** | **Feature** | ADO's highest work item type (above User Story) |
| **US-* (User Story)** | **User Story** | Linked to Feature via "Parent" field |
| **T-* (Task)** | **Task** | Linked to User Story as child |

**Key Insight**: ADO calls Epics "Features" and User Stories "User Stories"!

---

## Type Field Mapping

**CRITICAL**: The `type` field in FEATURE.md frontmatter must be mapped correctly when syncing to external tools.

### SpecWeave Internal Types

```yaml
---
id: FS-25-11-12-multi-project-github-sync
title: "Multi-Project GitHub Sync"
type: epic  # ← Internal SpecWeave type
---
```

### External Tool Type Mapping

| SpecWeave Type | GitHub | JIRA | ADO | Explanation |
|----------------|--------|------|-----|-------------|
| `type: epic` | **Type: Feature** | **Issue Type: Epic** | **Work Item Type: Feature** | GitHub doesn't have "Epic" as issue type, use "Feature" |
| `type: feature` | **Type: Feature** | **Issue Type: Epic** | **Work Item Type: Feature** | Same as epic (synonyms) |

**Implementation**: See `scripts/create-feature-github-issue.ts:mapTypeToGitHub()` for type conversion logic.

---

## Link Format

**Local paths** (in SpecWeave) must be converted to **GitHub URLs** when creating issues.

### Incorrect (Local Path)

```markdown
**Full spec**: `.specweave/docs/internal/specs/default/FS-25-11-12-multi-project-github-sync/FEATURE.md`
```

❌ **Problem**: This is a local file path. Clicking it on GitHub won't work!

### Correct (GitHub URL)

```markdown
**Full spec**: [FEATURE.md](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/FS-25-11-12-multi-project-github-sync/FEATURE.md)
```

✅ **Solution**: Convert to GitHub URL with repository, branch, and full path.

**Implementation**: See `scripts/create-feature-github-issue.ts:toGitHubUrl()` for path conversion logic.

---

## Sync Workflows

### 1. Hierarchical Sync (GitHub Milestones)

**Use Case**: Epic-level tracking with hierarchical structure (Epic → Increments)

**Command**: `/specweave-github:sync-epic FS-001`

**Creates**:
- GitHub Milestone (Epic level)
- GitHub Issues (Increment level, linked to Milestone)

**Benefits**:
- Visual hierarchy in GitHub
- Milestone progress tracking
- Group related increments

### 2. Flat Sync (GitHub Issues)

**Use Case**: Permanent feature tracking without hierarchy

**Script**: `npx tsx scripts/bulk-spec-sync.ts`

**Creates**:
- GitHub Issues (Feature level)
- User stories as checkboxes in issue body
- Tasks from increments as checkboxes

**Benefits**:
- Simple flat structure
- Good for permanent specs
- Auto-close when complete

### 3. JIRA Sync

**Command**: `/specweave-jira:sync-epic FS-001`

**Creates**:
- JIRA Epic
- JIRA Stories (linked to Epic)
- JIRA Sub-tasks (linked to Stories)

### 4. ADO Sync

**Command**: `/specweave-ado:sync-epic FS-001`

**Creates**:
- ADO Feature
- ADO User Stories (linked to Feature)
- ADO Tasks (linked to User Stories)

---

## Best Practices

### 1. Use Correct Type Mapping

✅ **DO**: Map `type: epic` → `Type: Feature` for GitHub
❌ **DON'T**: Use `Type: Epic` for GitHub (not a valid issue type)

### 2. Always Use GitHub URLs

✅ **DO**: Convert local paths to GitHub URLs
❌ **DON'T**: Use local file paths in GitHub issue bodies

### 3. One Sync Strategy Per Project

✅ **DO**: Choose either hierarchical (Milestones) OR flat (Issues), not both
❌ **DON'T**: Mix sync strategies (creates duplicate issues)

### 4. Sync Living Docs to GitHub

✅ **DO**: Sync permanent FS-* specs to GitHub
❌ **DON'T**: Sync temporary increments as permanent issues

---

## Troubleshooting

### "Type: Epic" appears in GitHub Issue

**Problem**: GitHub issue shows `**Type**: Epic`

**Solution**: Run fix script:
```bash
npx tsx scripts/fix-feature-github-issues.ts <issue-number>
```

This converts `Type: Epic` → `Type: Feature` automatically.

### Local file paths in GitHub Issue

**Problem**: Links like `.specweave/docs/...` don't work on GitHub

**Solution**: Run fix script:
```bash
npx tsx scripts/fix-feature-github-issues.ts <issue-number>
```

This converts local paths to GitHub URLs automatically.

### Missing Feature Issues

**Problem**: Only 4 [FS-*] issues exist, should be 29

**Solution**: Run bulk sync:
```bash
npx tsx scripts/bulk-spec-sync.ts
```

This creates issues for all 29 FS-* folders.

---

## Related Documentation

- [Living Docs Sync Guide](./intelligent-living-docs-sync.md) - How living docs sync works
- [Multi-Project Sync Architecture](../integrations/multi-project-sync.md) - Multi-repo sync patterns
- [CLAUDE.md](../../CLAUDE.md) - Contributor guide with hierarchy mapping

---

**Next Steps**:
- Read [Intelligent Living Docs Sync Guide](./intelligent-living-docs-sync.md)
- Understand [Multi-Project Sync Architecture](../integrations/multi-project-sync.md)
- Explore [External Tool Integration](../integrations/)
