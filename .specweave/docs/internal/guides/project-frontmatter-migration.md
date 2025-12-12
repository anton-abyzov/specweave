# Migration Guide: Frontmatter Project Field Removal

**Version**: v0.35.0+
**Date**: 2025-12-10
**Related ADR**: ADR-0195

## Overview

Starting from SpecWeave v0.35.0, the frontmatter `project:` and `board:` fields in spec.md files are **OPTIONAL**. Per-US `**Project**:` fields are now the PRIMARY source of truth.

This guide helps you migrate existing specs to the new architecture.

## What Changed?

### Before (v0.34.x and earlier)

```yaml
---
increment: 0001-feature-name
project: my-app          # ← Was in frontmatter
board: digital-ops       # ← Was in frontmatter (2-level)
---

### US-001: Login Form
# Note: **Project**: was often missing in old specs!
**As a** user, I want...
```

### After (v0.35.0+)

```yaml
---
increment: 0001-feature-name
# NOTE: project: and board: fields REMOVED from frontmatter
---

### US-001: Login Form
**Project**: my-app       # ← MANDATORY! Now the ONLY source of truth
**As a** user, I want...
```

**⛔ CRITICAL**: Every User Story MUST have `**Project**:` field in v0.35.0+!

## Do I Need to Migrate?

| Scenario | Migration Needed? |
|----------|-------------------|
| New specs created after v0.35.0 | No - templates already updated |
| Existing specs with frontmatter project | Optional but recommended |
| Single-project mode users | No - auto-resolves from config |
| Multi-project mode users | Recommended - ensures per-US fields are correct |

## Migration Options

### Option 1: Automatic Migration (Recommended)

Use the provided migration script:

```bash
# Preview changes (dry-run)
npx tsx scripts/migrate-project-frontmatter.ts --dry-run

# Execute migration
npx tsx scripts/migrate-project-frontmatter.ts
```

The script will:
1. Scan all spec.md files in `.specweave/increments/`
2. Check if frontmatter has `project:` field
3. Verify per-US `**Project**:` fields exist
4. Create backup of original file
5. Remove `project:` (and `board:`) from frontmatter
6. Generate migration report

### Option 2: Manual Migration

For each spec.md file:

1. **Ensure per-US fields exist**:
   ```markdown
   ### US-001: Feature Name
   **Project**: my-app       # ← Add this if missing
   **Priority**: P1
   ```

2. **Remove frontmatter fields**:
   ```yaml
   ---
   increment: 0001-feature-name
   # Remove these lines:
   # project: my-app
   # board: digital-ops
   ---
   ```

### Option 3: Do Nothing

Old specs with frontmatter project will continue to work. The system falls back to frontmatter if per-US fields are missing.

## Project Resolution Priority

When SpecWeave needs to determine the project for a spec, it uses this priority chain:

1. **Per-US `**Project**:` fields** (highest priority)
2. **`config.json` → `project.name`** (single-project mode)
3. **Intelligent detection** (keywords, tech stack)
4. **Ultimate fallback**: "default"

## Migration Report

After running the migration script, check `.specweave/migration-report.json`:

```json
{
  "timestamp": "2025-12-10T12:00:00.000Z",
  "dryRun": false,
  "summary": {
    "total": 137,
    "migrated": 8,
    "skipped": 49,
    "noChange": 80,
    "errors": 0
  }
}
```

### Understanding Results

- **migrated**: Files where frontmatter project was removed
- **skipped**: Files with frontmatter but no per-US fields (unsafe to migrate)
- **noChange**: Files already migrated or never had frontmatter project
- **errors**: Files that couldn't be processed (check logs)

## Skipped Files

Files are skipped when they have frontmatter `project:` but NO per-US `**Project**:` fields. These require manual intervention:

1. Open the spec.md file
2. Add `**Project**: <project-name>` to each User Story
3. Re-run migration or manually remove frontmatter

## FAQ

### Why was this change made?

To eliminate redundant project specification and establish a clear, single source of truth. See ADR-0195 for full rationale.

### Will my old specs still work?

Yes. Backward compatibility is maintained. Specs with frontmatter project will continue to function, but the per-US fields take priority if present.

### How do I create specs without frontmatter project?

New templates (v0.35.0+) already exclude frontmatter project. Just use `/specweave:increment` as normal.

### What if I have cross-project increments?

Per-US fields handle this perfectly:

```markdown
### US-001: Frontend Feature
**Project**: frontend-app

### US-002: Backend API
**Project**: backend-api
```

### What if something breaks?

1. Restore from backup: `cp spec.md.backup.* spec.md`
2. Or revert git changes: `git checkout -- .specweave/increments/*/spec.md`
3. Report issues to SpecWeave team

## Rollback

If migration causes issues:

### Restore from Backup

```bash
# Find backups
ls .specweave/increments/*/spec.md.backup.*

# Restore a specific file
cp .specweave/increments/0001-feature/spec.md.backup.1733875200000 \
   .specweave/increments/0001-feature/spec.md
```

### Revert Git Changes

```bash
git checkout -- .specweave/increments/*/spec.md
```

## Support

- **Documentation**: CLAUDE.md section 2c
- **ADR**: ADR-0195 (Remove Frontmatter Project Field)
- **Issues**: https://github.com/anthropics/specweave/issues
