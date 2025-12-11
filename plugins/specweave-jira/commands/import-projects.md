---
name: specweave-jira:import-projects
description: Import additional JIRA projects post-init with smart filtering, resume, and dry-run support
---

# JIRA Project Import Command

Import additional JIRA projects after initial setup with advanced filtering and merge capabilities.

## Usage

```bash
# Import all active projects
/sw-jira:import-projects --filter active

# Import with preset filter
/sw-jira:import-projects --preset production

# Import with custom JQL
/sw-jira:import-projects --jql "project NOT IN (TEST, SANDBOX)"

# Dry-run preview (no changes)
/sw-jira:import-projects --dry-run

# Resume interrupted import
/sw-jira:import-projects --resume
```

## Options

- `--filter <type>` - Filter by status (active, archived, all)
- `--type <types>` - Filter by project type (software, business, service_desk)
- `--lead <email>` - Filter by project lead
- `--jql <query>` - Custom JQL filter
- `--preset <name>` - Use saved filter preset
- `--dry-run` - Preview without making changes
- `--resume` - Resume interrupted import
- `--no-progress` - Disable progress tracking

## Examples

### Import Active Projects Only

```bash
/sw-jira:import-projects --filter active
```

Filters out archived projects, shows preview, prompts for confirmation, merges with existing.

### Import with Production Preset

```bash
/sw-jira:import-projects --preset production
```

Uses the "production" preset filter (active + software + excludes TEST/SANDBOX).

### Custom JQL Filter

```bash
/sw-jira:import-projects --jql "lead = currentUser() AND status != Archived"
```

Imports projects where you are the lead and not archived.

### Dry-Run Preview

```bash
/sw-jira:import-projects --filter active --dry-run
```

Shows which projects would be imported without making any changes.

## Features

- **Smart Filtering**: Filter by status, type, lead, or custom JQL
- **Merge with Existing**: Automatically merges with existing projects (no duplicates)
- **Progress Tracking**: Real-time progress with ETA and cancelation support
- **Resume Support**: Resume interrupted imports with `--resume`
- **Dry-Run Mode**: Preview changes before applying
- **Filter Presets**: Use saved filter combinations

## Implementation

This command:

1. Reads existing projects from `.env` (JIRA_PROJECTS)
2. Fetches available projects from JIRA API
3. Applies selected filters using FilterProcessor
4. Shows preview with project count and reduction percentage
5. Prompts for confirmation
6. Batch imports with AsyncProjectLoader (50-project limit)
7. Shows progress with ETA
8. Merges with existing projects (no duplicates)
9. Updates `.env` file atomically

Handles Ctrl+C gracefully with import state saving for resume.
