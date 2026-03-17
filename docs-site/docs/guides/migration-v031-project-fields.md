# Migration Guide: spec.md Project/Board Fields (v0.31.0)

**Version**: 0.31.0
**Date**: 2025-12-04
**Related ADR**: [ADR-0190](/internal/architecture/adr/0190-spec-project-board-requirement.md)

---

## Overview

Starting with v0.31.0, SpecWeave requires explicit project (and board for 2-level structures) fields in spec.md YAML frontmatter. This ensures increments sync to the correct location in living docs.

## Who Needs to Migrate?

### Check Your Structure Level

Run this to detect your structure level:

```bash
# Check if you have ADO area path mapping (2-level)
jq '.sync.profiles | to_entries[] | select(.value.provider == "ado") | .value.config.areaPathMapping.mappings' .specweave/config.json

# Check if you have JIRA board mapping (2-level)
jq '.sync.profiles | to_entries[] | select(.value.provider == "jira") | .value.config.boardMapping.boards' .specweave/config.json

# Check if multiProject is enabled (1-level)
jq '.multiProject' .specweave/config.json
```

### Migration Requirements

| Structure | Required Fields | Migration Urgency |
|-----------|-----------------|-------------------|
| Single-project (default) | None (optional) | Low - warning only |
| multiProject enabled | `project:` | Medium - recommended |
| ADO area paths | `project:` + `board:` | **High - REQUIRED** |
| JIRA boards | `project:` + `board:` | **High - REQUIRED** |
| Umbrella with teams | `project:` + `board:` | **High - REQUIRED** |

---

## Migration Steps

### Step 1: Find Increments Without Project Field

```bash
# List all spec.md files without project field
for f in .specweave/increments/*/spec.md; do
  if ! grep -q "^project:" "$f"; then
    echo "Missing project: $f"
  fi
done
```

### Step 2: Identify Available Projects/Boards

```bash
# List available projects
ls -la .specweave/docs/internal/specs/ | grep -v "^total" | grep "^d"

# For 2-level, list available boards per project
for p in .specweave/docs/internal/specs/*/; do
  echo "Project: $(basename $p)"
  ls -la "$p" | grep -v "^total" | grep "^d" | grep -v "FS-"
done
```

### Step 3: Add Project Field to spec.md

**For 1-level structures:**

```yaml
---
increment: 0001-my-feature
project: my-project          # ADD THIS LINE
title: "My Feature"
status: active
---
```

**For 2-level structures:**

```yaml
---
increment: 0001-my-feature
project: acme-corp           # ADD THIS LINE
board: digital-operations    # ADD THIS LINE
title: "My Feature"
status: active
---
```

### Step 4: Verify Migration

```bash
# Re-run check to ensure all increments have project field
for f in .specweave/increments/*/spec.md; do
  if ! grep -q "^project:" "$f"; then
    echo "Still missing project: $f"
  fi
done

# For 2-level, also check board field
for f in .specweave/increments/*/spec.md; do
  if ! grep -q "^board:" "$f"; then
    echo "Missing board (may be needed): $f"
  fi
done
```

### Step 5: Test Sync

```bash
/sw:sync-specs
```

---

## Automated Migration Script

Save this as `migrate-project-fields.sh`:

```bash
#!/bin/bash
# Migration script for adding project/board fields to spec.md

PROJECT="${1:-default}"    # Default project name
BOARD="${2:-}"             # Optional board name (for 2-level)

for spec_file in .specweave/increments/*/spec.md; do
  if grep -q "^project:" "$spec_file"; then
    echo "SKIP: $spec_file (already has project)"
    continue
  fi

  # Find the line after 'increment:' to insert project
  if [ -n "$BOARD" ]; then
    # 2-level: add both project and board
    sed -i.bak '/^increment:/a\
project: '"$PROJECT"'\
board: '"$BOARD" "$spec_file"
  else
    # 1-level: add only project
    sed -i.bak '/^increment:/a\
project: '"$PROJECT" "$spec_file"
  fi

  echo "UPDATED: $spec_file"
done

echo ""
echo "Migration complete! Verify with:"
echo "  grep -l 'project:' .specweave/increments/*/spec.md | wc -l"
```

Usage:

```bash
# 1-level migration
./migrate-project-fields.sh my-project

# 2-level migration
./migrate-project-fields.sh acme-corp digital-operations
```

---

## Troubleshooting

### Error: "Missing 'project:' field in spec.md"

**Cause**: Your spec.md doesn't have the required `project:` field.

**Solution**: Add `project: <project_name>` to YAML frontmatter.

### Error: "Missing 'board:' field in spec.md (2-level structure)"

**Cause**: You have ADO area paths or JIRA boards configured, requiring both project and board.

**Solution**: Add both `project:` and `board:` to YAML frontmatter.

### Warning: "No 'project:' field in spec.md"

**Cause**: Your 1-level structure increment doesn't have explicit project field.

**Impact**: Sync will use auto-detection (deprecated). Add project field for deterministic behavior.

### Legacy **Project**: Field

If your spec.md has `**Project**: my-project` in the body (not frontmatter):

1. This is still supported but deprecated
2. You'll see a warning suggesting migration to YAML frontmatter
3. Migration is recommended for consistency

---

## New Increment Workflow

After v0.31.0, the increment planner automatically prompts for project/board:

```
🔍 Detected 2-level structure (ADO area path mapping)
   Available projects: acme-corp

   📁 Project: acme-corp
      Boards: clinical-insights, platform-engineering, digital-operations

Which board should this increment sync to?
> digital-operations

✅ Increment will sync to: internal/specs/acme-corp/digital-operations/FS-XXX/
```

The selected values are automatically added to spec.md frontmatter.

---

## Related Documentation

- [Multi-Project Setup Guide](/guides/multi-project-setup.md)
- [ADR-0190: Spec Project/Board Requirement](/internal/architecture/adr/0190-spec-project-board-requirement.md)
- [Intelligent Living Docs Sync](/guides/intelligent-living-docs-sync.md)
