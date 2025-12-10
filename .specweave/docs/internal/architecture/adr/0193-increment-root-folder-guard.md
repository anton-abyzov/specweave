# ADR-0193: Increment Root Folder Structure Guard

**Status**: Accepted
**Date**: 2025-12-09
**Context**: v0.33.0+

## Context

During increment 0134 and 0135 implementation, LLM agents created `COMPLETION_REPORT.md` and `COMPLETION_SUMMARY.md` files at the increment root instead of placing them in the `reports/` subfolder, violating CLAUDE.md folder structure rules.

**Bug Pattern**:
```
❌ .specweave/increments/0134-living-docs-core-engine/COMPLETION_REPORT.md
❌ .specweave/increments/0135-living-docs-visualization/COMPLETION_SUMMARY.md
```

**Expected Structure**:
```
✅ .specweave/increments/0134-living-docs-core-engine/reports/COMPLETION_REPORT.md
✅ .specweave/increments/0135-living-docs-visualization/reports/COMPLETION_SUMMARY.md
```

## Decision

Implement a PreToolUse guard hook (`increment-root-guard.sh`) that enforces folder structure discipline by blocking Write operations to increment root for non-standard files.

### Allowed at Increment Root
Only these 4 files are permitted at increment root:
- `metadata.json`
- `spec.md`
- `plan.md`
- `tasks.md`

### Required Subfolders
All other files MUST be placed in appropriate subfolders:
- `reports/` - completion reports, validation reports, analysis docs
- `scripts/` - helper scripts, automation
- `logs/` - execution logs, debug output
- `backups/` - backup files
- `docs/` - additional documentation

## Implementation

### Guard Hook
**Location**: `plugins/specweave/hooks/v2/guards/increment-root-guard.sh`

**Pattern Detection**:
```bash
# Match: .specweave/increments/####-name/FILE.md (at root, not in subfolder)
if [[ "$FILE_PATH" =~ \.specweave/increments/[0-9]{3,4}E?-[^/]+/([^/]+)$ ]]; then
  FILENAME="${BASH_REMATCH[1]}"

  # Allow standard increment files at root
  if [[ "$FILENAME" =~ ^(metadata\.json|spec\.md|plan\.md|tasks\.md)$ ]]; then
    allow
  else
    block with error message
  fi
fi
```

### Hook Registration
**Location**: `plugins/specweave/hooks/hooks.json`

```json
{
  "matcher": "Write",
  "matcher_content": "\\.specweave/increments/\\d{3,4}E?-[^/]+/[^/]+$",
  "hooks": [{
    "command": "increment-root-guard.sh"
  }]
}
```

**Matcher Explanation**:
- `\\.specweave/increments/` - target increment folder
- `\\d{3,4}E?-[^/]+/` - increment ID pattern (supports E suffix)
- `[^/]+$` - file at root (no additional `/` = not in subfolder)

### Error Message
Provides clear guidance:
```
🚫 BLOCKED: File 'COMPLETION_REPORT.md' should be in a subfolder

⚠️ CLAUDE.md Rule:
  Inside increment folders - ONLY at root: spec.md, plan.md, tasks.md, metadata.json
  Everything else → subfolders: reports/, scripts/, logs/, backups/, docs/

🔧 To fix: Write({ file_path: ".specweave/increments/####-name/reports/COMPLETION_REPORT.md", ... })
```

## Consequences

### Positive
- **Enforces folder structure discipline** at tool execution time (before file is created)
- **Prevents clutter** at increment root
- **Clear error messages** guide LLM agents to correct structure
- **Consistent organization** across all increments
- **No manual cleanup** required

### Negative
- **Additional hook execution** adds ~10-20ms to Write operations (negligible)
- **Blocks valid edge cases** if non-standard files legitimately needed at root
  - Mitigation: Disable hooks via `SPECWEAVE_DISABLE_HOOKS=1` if needed

### Migration
Existing increments with files at root were migrated:
```bash
# 0134-living-docs-core-engine
mv COMPLETION_REPORT.md reports/

# 0135-living-docs-visualization
mv COMPLETION_REPORT.md reports/

# 0132-process-lifecycle-integration
mv COMPLETION_SUMMARY.md reports/
```

## Testing

### Test Cases
```bash
# Should BLOCK:
echo '{"file_path":".specweave/increments/0135-test/COMPLETION_REPORT.md"}' | increment-root-guard.sh
# → {"decision":"block"}, exit 2

# Should ALLOW:
echo '{"file_path":".specweave/increments/0135-test/spec.md"}' | increment-root-guard.sh
# → {"decision":"allow"}, exit 0

echo '{"file_path":".specweave/increments/0135-test/reports/COMPLETION_REPORT.md"}' | increment-root-guard.sh
# → {"decision":"allow"}, exit 0
```

## Related

- **ADR-0191**: Unified Crash Prevention Architecture (guard hooks pattern)
- **ADR-0190**: Spec Project/Board Requirement (similar validation hook)
- **CLAUDE.md Section 3**: Protected Directories
- **CLAUDE.md Section 2e**: Folder Structure Rules

## References

- Bug instances: increments 0134, 0135, 0132 (2025-12-09)
- Hook implementation: `plugins/specweave/hooks/v2/guards/increment-root-guard.sh`
- Documentation: `CLAUDE.md` section "2e. NEVER Create Files at Increment Root"
