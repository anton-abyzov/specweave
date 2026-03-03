---
description: Living documentation updater that syncs implementation progress to product docs. Use when updating docs after task completion, changing DRAFT status to published, or ensuring documentation reflects current implementation state.
argument-hint: "[increment-id]"
---

# Documentation Updater

## Project Overrides

!`s="docs-updater"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

Updates living documentation (.specweave/docs/) based on implementation progress after task completion or increment closure.

## When to Use

- After closing an increment to ensure docs reflect reality (called by `/sw:done` Step 10b)
- Task specifies documentation updates in tasks.md
- Feature implementation is complete
- User says "update documentation" or "update docs links"

## Workflow

### Step 1: Detect Context

1. If increment ID is provided, load `spec.md`, `tasks.md`, and `metadata.json`
2. Detect project ID from config: `.specweave/config.json` → `project.name`
3. Locate living docs: `.specweave/docs/internal/`

### Step 2: Verify Feature Specs Exist

1. Check `.specweave/docs/internal/specs/{project}/` for FS-XXX folders
2. For each folder, verify `FEATURE.md` and `us-*.md` files exist
3. If NO feature specs found and increment exists:
   - Run: `specweave sync-living-docs <increment-id>` to create them
   - Verify again after sync
4. Report: "Found N feature specs in {project}/"

### Step 3: Update Cross-References in Existing Docs

Scan `.specweave/docs/internal/` for docs that should reference the feature specs:

1. **FEATURE-CATALOG.md** (in `enterprise/`): Add entries for spec-based features with links to `specs/{project}/FS-XXX/FEATURE.md`
2. **FEATURE-TO-CODE.md** (in `relationships/`): Add mappings from spec features to code features
3. **Module docs** (in `modules/`): Add "Related Specs" links where modules correspond to feature areas
4. **Project specs README** (`specs/{project}/README.md`): Update feature listing with links to each FS-XXX

For each doc update:
- Read existing content
- Add or update `## Related Specs` or `## Feature Specs` section
- Use relative markdown links: `[FS-001](../specs/{project}/FS-001/FEATURE.md)`
- Preserve existing content, only add/update the cross-reference sections

### Step 4: Update Status Markers

1. Scan docs for `[DRAFT]` markers on sections that correspond to completed ACs
2. Change `[DRAFT]` → `[COMPLETE]` for sections matching completed acceptance criteria
3. Report: "Updated N status markers from DRAFT to COMPLETE"

### Step 5: Verify Bidirectional Links

Validate that links work in both directions:

1. **Increment → Feature Spec**: spec.md references should resolve to `specs/{project}/FS-XXX/`
2. **Feature Spec → Living Docs**: FEATURE.md links to modules, architecture, etc.
3. **Living Docs → Feature Spec**: Module docs, catalogs link back to specs
4. Report broken links with suggested fixes

### Step 6: Summary Report

Display results:

```
Docs Update Summary:
- Feature specs verified: N
- Cross-references updated: M files
- Status markers updated: K (DRAFT → COMPLETE)
- Broken links found: L (see details above)
```

## Integration Points

- **Called by**: `/sw:done` (Step 10b), task completion hooks, spec-generator
- **Updates**: `.specweave/docs/**/*.md`
- **Reads**: `tasks.md`, `spec.md`, implementation code, feature specs
