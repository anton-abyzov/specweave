# Sync Logs Command

Query and export sync audit logs. Supports date range, platform, and result filtering.

## Usage

```bash
/specweave:sync-logs                       # Last 24 hours
/specweave:sync-logs --since "2025-12-01"  # Since specific date
/specweave:sync-logs --platform github     # Filter by platform
/specweave:sync-logs --result denied       # Filter by result
/specweave:sync-logs --export logs.json    # Export to file
```

## Arguments

- `--since <date>`: Start date (ISO 8601 or YYYY-MM-DD)
- `--until <date>`: End date (ISO 8601 or YYYY-MM-DD)
- `--platform <name>`: Filter by platform: `github`, `jira`, `ado`
- `--operation <type>`: Filter by operation type
- `--result <result>`: Filter by result: `success`, `denied`, `error`
- `--limit <n>`: Maximum entries to return (default: 100)
- `--export <path>`: Export to file (JSON, JSONL, or CSV based on extension)
- `--json`: Output as JSON to stdout

## Examples

### View Recent Logs

```bash
/specweave:sync-logs
```

Output:
```
📋 SYNC LOGS (last 24 hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-01 12:00:05  github  upsert-internal  FS-001     ✅ success   150ms
2025-12-01 12:00:04  jira    update-status    US-001     ✅ success   200ms
2025-12-01 12:00:03  github  upsert-external  EXT-001    🚫 denied    -
2025-12-01 12:00:02  ado     read             WI-001     ❌ error     -
2025-12-01 12:00:01  github  upsert-internal  FS-002     ✅ success   100ms

Showing 5 of 57 entries
Use --limit to show more, --export to save all
```

### Filter by Platform

```bash
/specweave:sync-logs --platform github
```

### Filter by Result

```bash
/specweave:sync-logs --result denied
```

Shows only denied operations (permission enforcement in action):
```
📋 SYNC LOGS (denied only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2025-12-01 12:00:03  github  upsert-external  EXT-001    🚫 denied
   Reason: External updates disabled in config

2025-12-01 11:45:00  jira    delete           JIRA-123   🚫 denied
   Reason: Delete operations not permitted
```

### Date Range Query

```bash
/specweave:sync-logs --since "2025-12-01" --until "2025-12-02"
```

### Export to File

```bash
# Export to JSON
/specweave:sync-logs --export logs.json

# Export to CSV (for spreadsheets)
/specweave:sync-logs --export logs.csv

# Export to JSONL (for processing)
/specweave:sync-logs --export logs.jsonl
```

## Output Formats

### Default (Human-readable)

Tabular format with timestamps, platforms, operations, items, results, and durations.

### JSON (`--json` or `.json` export)

```json
{
  "metadata": {
    "exportedAt": "2025-12-01T12:00:00Z",
    "total": 57,
    "hasMore": false,
    "query": { "limit": 100 }
  },
  "entries": [
    {
      "timestamp": "2025-12-01T12:00:05Z",
      "platform": "github",
      "operation": "upsert-internal",
      "itemId": "FS-001",
      "result": "success",
      "durationMs": 150
    }
  ]
}
```

### CSV (`.csv` export)

```csv
timestamp,platform,operation,itemId,result,reason,error,durationMs
2025-12-01T12:00:05Z,github,upsert-internal,FS-001,success,,,150
```

## Related

- `/specweave:sync-monitor`: Dashboard with activity summary
- `/specweave:notifications`: View sync failure notifications
