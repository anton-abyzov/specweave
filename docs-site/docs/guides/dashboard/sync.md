---
title: Sync
description: Monitor sync health, audit logs, and platform connections for GitHub, JIRA, and Azure DevOps
---

# Sync

The Sync page shows the health of your external platform connections and provides a full audit trail of every sync operation. It supports GitHub, JIRA, and Azure DevOps (ADO), and adapts its layout for both single-project and umbrella (multi-repo) workspaces.

## KPI Summary

Four cards summarize the current sync state:

- **Repos / Platforms** -- in umbrella mode, the number of child repositories; in single-project mode, the number of configured platforms. The subtitle shows how many are connected.
- **Audit Entries** -- total number of recorded sync operations.
- **Errors** -- count of operations that ended in error.
- **Conflicts** -- number of operations flagged as conflicting.

## Sync Now

A **Sync Now** button in the page header (or per-repo in umbrella mode) triggers an immediate sync push. In umbrella mode, each repository has its own Sync Now button that targets only that repo.

## Tabs

### Platform Health

The default tab. In **single-project mode**, platform cards are displayed in a grid. In **umbrella mode**, each child repository gets its own collapsible section with repo name, `.specweave` initialization status, repo path, and a grid of platform cards.

Each **Platform Card** shows:

- Platform icon and name (GitHub, JIRA, ADO).
- Connection status badge: Connected, Sync Failed, Ready, or Not Configured.
- Configuration detail (e.g. `owner/repo`).
- Diagnostic message when something is wrong.
- Action buttons: **Configure in Settings** (if not configured), **Verify Connection** (if ready but never synced), or **Retry Sync** (if the last sync failed).
- Import statistics: last import time, items imported, items skipped.
- Audit summary: total operations, successes, and errors for this platform.

When sync errors have occurred in the last 24 hours, a **Sync Errors** section appears below the platform cards. Each error row is expandable to reveal the full error message and a truncated stack trace.

### Audit Log

A table of every sync operation with the following columns:

| Column | Description |
|--------|-------------|
| Time | Relative timestamp (e.g. `2m ago`) |
| Platform | Icon and name of the platform |
| Operation | The sync operation type (e.g. `upsert`, `close`, `import`) |
| Item | The item ID involved, shown in monospace (truncated to 120px) |
| Direction | Badge showing `push` (blue) or `pull` (gray) |
| Result | Badge showing `success`, `error`, `denied`, or `skipped` with color coding |
| Duration | Execution time in milliseconds |

Clicking a row that has an attached message expands an inline detail panel at the bottom of the table showing the full operation message in a monospace, scrollable block.

### Conflicts

The same table format as the Audit Log, but filtered to only show operations where a conflict was detected. The tab label shows the conflict count in parentheses for quick reference.

## Sync Permissions

When permissions data is available, a **Sync Permissions** panel appears above the KPI cards. Four toggles control sync behavior:

| Permission | Description |
|-----------|-------------|
| Create/Update Internal | Can create or update items originally created by SpecWeave |
| Update External | Can modify items originally from external tools |
| Update Status | Can close or reopen issues on external platforms |
| Auto-Sync | Automatically sync when tasks are completed |

Changes are saved via the **Save** button that appears when any toggle differs from the current configuration.

## Real-Time Updates

The page subscribes to `sync-update` and `sync-error` SSE events. Any sync activity or failure automatically refreshes all data on the page.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Sync** page from the sidebar. The last-updated timestamp at the bottom shows when metadata was last refreshed.

## See Also

- [Config](./config.md) -- edit platform connection settings in the configuration editor
- [Notifications](./notifications.md) -- notifications triggered by sync failures and import completions
- [Activity](./activity.md) -- sync events also appear in the real-time activity stream
