---
name: specweave-archive-increments
description: Archive completed increments to keep workspace clean
---

# Archive Increments Command

Archives completed increments to `_archive/` folder, keeping only the most recent N increments in the main folder.

## Usage

```bash
# Interactive mode - prompts for options
/specweave:archive-increments

# Keep last 5 increments, archive the rest
/specweave:archive-increments --keep-last 5

# Archive specific increments
/specweave:archive-increments --increments 0001,0002,0003

# Dry run - see what would be archived without moving
/specweave:archive-increments --dry-run

# Archive all completed increments older than 30 days
/specweave:archive-increments --older-than 30d

# Keep only active/paused, archive all completed
/specweave:archive-increments --archive-completed
```

## Default Behavior

- Keeps last 10 increments by default
- Preserves all active/paused increments
- Never archives abandoned increments (they stay in `_abandoned/`)
- Creates `_archive/` folder if it doesn't exist
- Preserves increment structure and all contents

## Smart Detection

The command intelligently:
- Checks increment status from metadata.json
- Preserves increments with active GitHub/JIRA/ADO issues
- Warns before archiving increments with uncommitted changes
- Groups related increments (e.g., all v0.8.0 stabilization increments)

## Configuration

Set defaults in `.specweave/config.json`:

```json
{
  "archiving": {
    "keepLast": 10,
    "autoArchive": true,
    "archiveAfterDays": 60,
    "preserveActive": true,
    "archiveCompleted": true
  }
}
```

## Examples

### Keep workspace clean
```bash
# Archive all but last 5 increments
/specweave:archive-increments --keep-last 5
```

### Prepare for release
```bash
# Archive all v0.7.x increments after v0.8.0 release
/specweave:archive-increments --pattern "v0.7"
```

### Clean old work
```bash
# Archive increments older than 2 months
/specweave:archive-increments --older-than 60d
```