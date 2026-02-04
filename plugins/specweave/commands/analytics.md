---
name: analytics
description: Show usage analytics dashboard - command invocations, skill activations, agent spawns. Supports --export json/csv and --since filtering. Activates for analytics, usage stats, command stats, what commands used, skill usage, agent usage.
---

# Analytics Command

**Show SpecWeave usage statistics and analytics.**

## Usage

```bash
/sw:analytics [OPTIONS]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--since DATE` | Start date (YYYY-MM-DD or ISO 8601) | 30 days ago |
| `--until DATE` | End date | Now |
| `--export FORMAT` | Export to json or csv | None |
| `--limit N` | Number of items in top lists | 10 |
| `--type TYPE` | Filter by type (command/skill/agent) | All |
| `--plugin NAME` | Filter by plugin | All |

## Examples

```bash
# Show dashboard (last 30 days)
/sw:analytics

# Last 7 days
/sw:analytics --since 2025-12-23

# Export to JSON
/sw:analytics --export json

# Export to CSV with date range
/sw:analytics --since 2025-12-01 --until 2025-12-31 --export csv

# Show only commands
/sw:analytics --type command

# Filter by plugin
/sw:analytics --plugin specweave-github
```

## Output Format

```
SpecWeave Usage Analytics

Period: 2025-12-01 to 2025-12-30
Total Events: 1,234 | Success Rate: 98.5%

TOP COMMANDS                          Count    Success   Avg(ms)
1. /sw:do ............................ 156      98%       2,340
2. /sw:increment ..................... 89       100%      4,520
3. /sw:progress ...................... 67       100%      180
4. /sw:done .......................... 34       97%       890
5. /sw:validate ...................... 28       96%       1,200

TOP SKILLS                            Count    Success   Plugin
1. increment-planner ................. 45       100%      specweave
2. spec-generator .................... 34       98%       specweave
3. qa-engineer ....................... 28       100%      specweave-testing

TOP AGENTS                            Count    Success   Plugin
1. architect ......................... 23       100%      specweave
2. frontend-architect ................ 18       100%      specweave-frontend
3. qa-engineer ....................... 15       100%      specweave-testing

ACTIVITY (last 7 days)
Mon: 34
Tue: 45
Wed: 28
Thu: 36
Fri: 21
Sat: 12
Sun: 15
```

## Execution

When this command is invoked, the agent should:

1. **Parse arguments**:
   ```bash
   # Extract options
   SINCE=$(echo "$ARGS" | grep -oP '(?<=--since\s)[^\s]+' || echo "")
   UNTIL=$(echo "$ARGS" | grep -oP '(?<=--until\s)[^\s]+' || echo "")
   EXPORT=$(echo "$ARGS" | grep -oP '(?<=--export\s)(json|csv)' || echo "")
   LIMIT=$(echo "$ARGS" | grep -oP '(?<=--limit\s)\d+' || echo "10")
   TYPE=$(echo "$ARGS" | grep -oP '(?<=--type\s)(command|skill|agent)' || echo "")
   PLUGIN=$(echo "$ARGS" | grep -oP '(?<=--plugin\s)[^\s]+' || echo "")
   ```

2. **Read analytics data**:
   - Read from `.specweave/state/analytics/events.jsonl`
   - Parse each line as JSON
   - Filter by date range and type

3. **Aggregate statistics**:
   - Count by name for commands, skills, agents
   - Calculate success rates
   - Compute average durations
   - Generate daily summaries

4. **Display or export**:
   - If `--export`: Write to `.specweave/state/analytics/exports/`
   - Otherwise: Display formatted dashboard

## Data Sources

| Source | Location |
|--------|----------|
| Events log | `.specweave/state/analytics/events.jsonl` |
| Daily summary | `.specweave/state/analytics/daily-summary.json` |
| Cache | `.specweave/state/analytics/cache.json` |
| Exports | `.specweave/state/analytics/exports/` |

## Event Schema

```typescript
interface AnalyticsEvent {
  timestamp: string;      // ISO 8601
  type: 'command' | 'skill' | 'agent';
  name: string;
  plugin?: string;
  increment?: string;
  duration?: number;      // milliseconds
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:status` | Show increment status |
| `/sw:progress` | Show task progress |
| `/sw:jobs` | Show background jobs |

## Notes

- Analytics data is stored locally only (no remote telemetry)
- Log rotation occurs automatically when events.jsonl > 10MB
- Cache is refreshed every 5 minutes
- Historical data is preserved in archive/ subdirectory
