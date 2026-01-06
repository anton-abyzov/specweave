# Increment Structure Fixes

## Issues Found

### 1. Empty Increment Folder
**Path**: `.specweave/increments/0156-skill-specific-reflection-memory/`
**Issue**: Completely empty - no metadata.json, spec.md, or tasks.md
**Root Cause**: Failed increment creation (orphaned directory)

### 2. Reports Folder Pollution
**Path**: `.specweave/increments/reports/`
**Issue**: Pseudo-increment folder with metadata.json at wrong level
**Root Cause**: Mistakenly created during auto mode with id="reports"
**Contains**:
- auto-mode-remote-plugin-issue.md
- judge-llm-auto-mode-validation.md
- documentation-update-summary.md
- cancel-auto-fix-summary.md
- option-1-implementation-complete.md

## Recommended Actions

### Fix 1: Remove Empty 0156 Folder
```bash
rm -rf .specweave/increments/0156-skill-specific-reflection-memory/
```

### Fix 2: Move Reports to Appropriate Increments
Based on file names and timestamps, distribute reports:

**Auto mode reports** → Move to `0148-autonomous-execution-auto/reports/`:
- auto-mode-remote-plugin-issue.md (Jan 4 15:57)
- judge-llm-auto-mode-validation.md (Jan 4 16:12)
- option-1-implementation-complete.md (Jan 4 16:07)

**Documentation reports** → Move to `0153-documentation-site-seo-enhancements/reports/`:
- documentation-update-summary.md (Jan 4 21:01)

**Cancel auto reports** → Move to `0154-auto-completion-flags/reports/`:
- cancel-auto-fix-summary.md (Jan 5 01:35)

```bash
# Move auto mode reports
mv .specweave/increments/reports/auto-mode-remote-plugin-issue.md \
   .specweave/increments/0148-autonomous-execution-auto/reports/

mv .specweave/increments/reports/judge-llm-auto-mode-validation.md \
   .specweave/increments/0148-autonomous-execution-auto/reports/

mv .specweave/increments/reports/option-1-implementation-complete.md \
   .specweave/increments/0148-autonomous-execution-auto/reports/

# Move documentation reports
mv .specweave/increments/reports/documentation-update-summary.md \
   .specweave/increments/0153-documentation-site-seo-enhancements/reports/

# Move cancel auto reports
mv .specweave/increments/reports/cancel-auto-fix-summary.md \
   .specweave/increments/0154-auto-completion-flags/reports/

# Remove the polluted reports folder
rm -rf .specweave/increments/reports/
```

## Prevention

**Update increment creation validation** to reject invalid increment IDs:
- Must match `^[0-9]{4}-[a-z0-9-]+$` pattern
- Prevent creation of directories like "reports", "backup", "temp"
- Add to `IncrementNumberManager.generateIncrementId()` validation

**Code change needed** in `src/core/increments/IncrementNumberManager.ts`:
```typescript
// Add validation to reject invalid increment names
const INVALID_INCREMENT_NAMES = ['reports', 'backup', 'temp', 'logs', 'scripts'];

if (INVALID_INCREMENT_NAMES.includes(name)) {
  throw new Error(`Invalid increment name "${name}" - reserved for internal use`);
}
```
