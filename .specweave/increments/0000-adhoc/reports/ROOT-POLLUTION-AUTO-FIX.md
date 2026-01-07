# Root Folder Pollution - Auto-Fix Guide

**Date**: 2026-01-07
**Status**: ✅ Production Ready

## Problem

SpecWeave enforces clean root directories - analysis files, reports, and logs should be in increment folders, not the project root. Previously, when the pre-commit hook detected violations, users had to manually move files.

## Solution

**Smart auto-fix script** that:
1. Detects polluting files automatically
2. Determines the best target location (active increment or adhoc)
3. Moves files and updates git staging
4. Interactive with color-coded output

## Usage

### When You See the Violation

```bash
🚨 ERROR: Root Folder Pollution Detected!

The following files violate CLAUDE.md Rule #5:
  - my-analysis.md
  - session-report.md

🤖 AUTO-FIX AVAILABLE:
   bash scripts/fix-root-pollution.sh
```

### Run the Auto-Fix

```bash
bash scripts/fix-root-pollution.sh
```

The script will:
- Show you which files are violating
- Detect your active increment (or use `0000-adhoc`)
- Ask for confirmation
- Move files to `.specweave/increments/####/reports/`
- Update git staging automatically

### Example Output

```
🔍 Scanning for root pollution...
⚠️  Found 2 polluting file(s):
  - my-analysis.md
  - session-report.md

📁 Detected active increment: 0159-vscode-instant-commands-fix
🎯 Target directory: .specweave/increments/0159-vscode-instant-commands-fix/reports

Move these files to .specweave/increments/0159-vscode-instant-commands-fix/reports? [Y/n] Y

Moving: my-analysis.md → .specweave/increments/0159-vscode-instant-commands-fix/reports/my-analysis.md
Moving: session-report.md → .specweave/increments/0159-vscode-instant-commands-fix/reports/session-report.md

✅ Successfully moved 2 file(s)
📝 Files are now staged in: .specweave/increments/0159-vscode-instant-commands-fix/reports

Next steps:
  1. Review the changes: git status
  2. Commit: git commit
```

## How It Works

1. **Detection**: Scans staged files for `.md` and `.log` files in root
2. **Smart targeting**:
   - Finds the most recent increment number
   - Uses that increment's `reports/` folder
   - Falls back to `0000-adhoc/reports/` if no increments exist
3. **Git integration**:
   - Unstages files from root: `git reset HEAD file.md`
   - Moves physical files: `mv file.md target/`
   - Re-stages in new location: `git add target/file.md`

## Files Modified

- **Pre-commit hook**: `.git/hooks/pre-commit` (step 13)
  - Enhanced to suggest auto-fix command
  - Shows both auto-fix and manual options

- **Auto-fix script**: `scripts/fix-root-pollution.sh`
  - Interactive confirmation
  - Smart increment detection
  - Color-coded output
  - Git staging management

- **Pollution check**: `scripts/pre-commit-root-pollution-check.sh`
  - Enhanced to check both added AND modified files
  - Added `.log` file detection
  - Improved error messages

## Allowed Root Files

Only these files are allowed in root:
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `LICENSE.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `IMPLEMENTATION-SUMMARY.md` (legacy)
- `IMPLEMENTATION-COMPLETE.md` (legacy)

Everything else must go in increment folders!

## GitIgnore Protection

Additional protection via `.gitignore` patterns:
```
/*-SUMMARY*.md
/*-REPORT*.md
/*-ANALYSIS*.md
/*-COMPLETE*.md
/*-GUIDE*.md
/*-FIX*.md
/*-CLEANUP*.md
/*-VALIDATION*.md
```

These patterns prevent common pollution files from being staged at all.

## For Claude Code

When Claude creates analysis or report files, it should:

1. **Never create in root** - always use increment folders
2. **If violation detected** - the pre-commit hook will catch it
3. **User runs auto-fix** - `bash scripts/fix-root-pollution.sh`
4. **Commit succeeds** - files are in correct location

This provides a safety net without blocking workflow!

## Related

- CLAUDE.md Rule #5: "Root clean: NEVER create .md/reports/scripts in project root"
- ADR-0061: Increment folder structure
- `.git/hooks/pre-commit` (step 13)
