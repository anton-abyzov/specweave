# SpecWeave Migration Guide

## Overview

This guide documents migration strategies for SpecWeave framework upgrades, particularly focusing on ID preservation and backward compatibility.

---

## ID Preservation Strategy (v0.23.0+)

### Background

Starting with v0.23.0, SpecWeave introduced:
- **E suffix** for external items (imported from GitHub, JIRA, ADO)
- **Origin tracking** (internal vs external)
- **ID collision prevention** (mixed internal/external IDs)

### ID Format

- **Internal IDs**: `US-001`, `US-002`, `US-003` (no suffix)
- **External IDs**: `US-001E`, `US-002E`, `US-003E` (E suffix indicates external origin)
- **Mixed increments**: Can contain both internal and external IDs (e.g., `US-001`, `US-002E`, `US-003`, `US-004E`)

### ID Generation Algorithm

The ID generator (implemented in `src/id-generators/us-id-generator.ts`) follows this algorithm:

1. **Extract numeric parts** from all existing IDs (both internal and external)
   - `US-001` → 1
   - `US-002E` → 2
   - `US-003` → 3
   - `US-007E` → 7

2. **Find maximum number** across all IDs
   - Given: `[US-001, US-002E, US-003, US-007E]`
   - Max: 7

3. **Increment to get next sequential number**
   - Next: 8

4. **Add appropriate suffix**
   - Internal: `US-008` (no suffix)
   - External: `US-008E` (E suffix)

### Legacy ID Preservation

#### Principle

**NEVER renumber existing IDs** - all existing internal IDs from increments 0001-0046 are preserved exactly as-is.

#### Migration Flow

When external items are imported:

1. **Scan all existing increments** (0001-0046) and living docs
2. **Extract all US-IDs** (both internal and external)
3. **Find maximum ID number** (e.g., if highest existing ID is US-200, max = 200)
4. **First external import** starts at next available number with E suffix (e.g., `US-201E`)

#### Example

Given existing increments with IDs:
```
US-001, US-002, ..., US-200 (from increments 0001-0046)
```

When external import happens:
```
First external ID: US-201E
Second external ID: US-202E
Third external ID: US-203E
...
```

If new internal increment created after import:
```
Next internal ID: US-204 (no suffix, continues sequence)
```

### Why No Renumbering?

1. **Git history integrity**: Changing IDs would break git blame and history tracking
2. **External references**: Issues, PRs, and documentation may reference old IDs
3. **Team communication**: Developers familiar with existing IDs (e.g., "fix US-010 bug")
4. **Backward compatibility**: Old increments remain valid without regeneration

---

## Task Linkage Migration (Increment 0047)

### Background

Increment 0047 introduced explicit US-Task linkage:
- `**User Story**: US-001` field in tasks
- `**Satisfies ACs**: AC-US1-01, AC-US1-02` field in tasks
- Hierarchical tasks.md structure

### Migration Tool

**Script**: `scripts/migrate-task-linkage.ts`

**Usage**:
```bash
# Dry-run (preview changes)
npx tsx scripts/migrate-task-linkage.ts 0043 --dry-run

# Apply migration with default confidence threshold (75%)
npx tsx scripts/migrate-task-linkage.ts 0043

# Apply with custom confidence threshold
npx tsx scripts/migrate-task-linkage.ts 0043 --threshold=80

# Batch migration (all increments)
for i in {0001..0046}; do
  npx tsx scripts/migrate-task-linkage.ts $i --dry-run
done
```

### Inference Algorithm

The migration script uses three strategies to infer US linkage:

#### 1. AC-IDs in Description (95% confidence)
```
Task: "Implement AC-US1-01 and AC-US1-02 validation"
→ Inferred US: US-001
→ Inferred ACs: AC-US1-01, AC-US1-02
```

#### 2. Keyword Matching (75% confidence)
```
US-002 title: "AC-Task Mapping"
Task title: "Add AC mapping validator"
→ Keyword overlap: "ac", "mapping"
→ Inferred US: US-002
```

#### 3. File Path Overlap (60% confidence)
```
US-003 mentions: "sync-living-docs.js"
Task affects: "plugins/specweave/lib/hooks/sync-living-docs.js"
→ Inferred US: US-003
```

### Confidence Threshold

- **Auto-apply**: Tasks with confidence ≥ 75% (default threshold)
- **Manual review**: Tasks with confidence < 75%
- **Customizable**: Use `--threshold=N` flag to adjust

### Migration Report

After migration, review:
```bash
cat .specweave/increments/0047-us-task-linkage/reports/migration-report.md
```

Report includes:
- Total tasks migrated
- Auto-applied vs manual review breakdown
- Per-task confidence scores
- Suggested manual edits

---

## Backward Compatibility

### Increments 0001-0046

- **No forced migration**: Old increments work without US linkage
- **Graceful degradation**: Parsers handle both old and new formats
- **Optional upgrade**: Migrate incrementally using migration script

### Parser Behavior

**Old format** (no US linkage):
```markdown
### T-001: Task title
**Description**: Task description
```
→ Parsed with `task.userStory = undefined` (no error)

**New format** (with US linkage):
```markdown
### T-001: Task title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Description**: Task description
```
→ Parsed with `task.userStory = "US-001"`

---

## Rollback Strategy

### If Migration Fails

1. **Git restore** tasks.md changes:
   ```bash
   git restore .specweave/increments/0046-*/tasks.md
   ```

2. **Rollback living docs updates**:
   ```bash
   git restore .specweave/docs/internal/specs/
   ```

3. **Remove parser extensions** (if necessary):
   ```bash
   git revert <commit-hash>
   ```

4. **Document failure reasons** in increment reports

### If Performance Degrades

1. **Add caching layer** for US-Task mapping
2. **Optimize parser** (lazy evaluation)
3. **Reduce sync frequency** (debounce hooks)
4. If still slow, **revert and redesign**

---

## Testing Migration

### Validation Checklist

After migrating an increment:

1. **Parse tasks.md**: Ensure no parsing errors
   ```bash
   npx tsx -e "import { parseTasksWithUSLinks } from './dist/src/generators/spec/task-parser.js'; parseTasksWithUSLinks('.specweave/increments/0043-*/tasks.md').then(console.log)"
   ```

2. **Run validation**: Check AC coverage
   ```bash
   /specweave:validate 0043
   ```

3. **Sync living docs**: Verify task lists updated
   ```bash
   /specweave:sync-docs update
   ```

4. **Check living docs files**: Ensure no "No tasks defined" messages
   ```bash
   grep -r "No tasks defined" .specweave/docs/internal/specs/
   ```

5. **Verify AC checkboxes**: Ensure completed tasks update ACs
   ```bash
   grep -A 5 "Acceptance Criteria" .specweave/docs/internal/specs/FS-*/us-*.md
   ```

---

## Common Issues

### Issue 1: Low Confidence Linkage

**Symptom**: Many tasks flagged for manual review (< 75% confidence)

**Solution**:
1. Review task descriptions manually
2. Add AC-IDs to task descriptions (increases confidence to 95%)
3. Re-run migration with lower threshold if appropriate

### Issue 2: Missing AC-IDs

**Symptom**: Tasks inferred with US but no AC-IDs

**Solution**:
1. Check spec.md for AC-IDs
2. Manually add `**Satisfies ACs**` field
3. Run validation to ensure correctness

### Issue 3: Incorrect US Linkage

**Symptom**: Task linked to wrong User Story

**Solution**:
1. Manually edit tasks.md
2. Change `**User Story**` field to correct US-ID
3. Update `**Satisfies ACs**` field accordingly
4. Run validation

---

## Best Practices

### Before Migration

1. **Backup**: Commit all changes before running migration
2. **Dry-run**: Always test with `--dry-run` first
3. **Sample test**: Migrate 2-3 increments, validate, then proceed

### During Migration

1. **Incremental**: Migrate one increment at a time
2. **Review low-confidence**: Don't skip manual review
3. **Document issues**: Add notes to migration report

### After Migration

1. **Validate**: Run `/specweave:validate` on all migrated increments
2. **Sync docs**: Update living docs with `/specweave:sync-docs update`
3. **Test workflow**: Create new task, ensure sync works
4. **Update CLAUDE.md**: Document new task format for AI agent

---

## Future Migrations

### Versioning

- **v0.23.0**: US-Task linkage introduction
- **v0.24.0**: External item import (E suffix)
- **v0.25.0** (planned): Multi-project support

### Deprecation Policy

- **No breaking changes**: Old formats always supported
- **Gradual adoption**: New features optional for existing increments
- **Migration tools**: Provided for all major format changes

---

## Support

For migration issues or questions:
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Documentation**: `.specweave/docs/public/guides/migration.md`
- **Community**: SpecWeave Discord server

---

**Last Updated**: 2025-11-20 (Increment 0047)
**Applies To**: SpecWeave v0.23.0+
