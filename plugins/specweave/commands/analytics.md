---
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
| `--since TIME` | Time filter (24h, 7d, 30d) | All time |
| `--export FORMAT` | Export to json or csv | None |
| `--limit N` | Number of items in top lists | 10 |
| `--type TYPE` | Filter by type (command/skill/agent) | All |
| `--json` | Output raw JSON for scripting | False |

## Examples

```bash
# Show dashboard (all time)
/sw:analytics

# Last 7 days
/sw:analytics --since 7d

# Last 24 hours
/sw:analytics --since 24h

# Export to JSON
/sw:analytics --export json

# Export to CSV
/sw:analytics --export csv

# Show only commands
/sw:analytics --type command

# Raw JSON output for scripting
/sw:analytics --json
```

## Execution

**Use the SpecWeave CLI command:**

```bash
specweave analytics [OPTIONS]
```

Examples:
```bash
# Show dashboard
specweave analytics

# Filter last 7 days
specweave analytics --since 7d

# Export JSON
specweave analytics --export json

# Export CSV with time filter
specweave analytics --since 30d --export csv

# JSON output for scripting
specweave analytics --json

# Filter by type
specweave analytics --type command
specweave analytics --type skill
specweave analytics --type agent
```

## Output Format

```
📊 SpecWeave Analytics Dashboard

Period: 2025-12-01 → 2025-12-30
Total Events: 1,234
Success Rate: 98.5%

🔧 Top Commands:
     156 │ /sw:do
      89 │ /sw:increment
      67 │ /sw:progress
      34 │ /sw:done
      28 │ /sw:validate

⚡ Top Skills:
      45 │ increment
      34 │ spec-generator
      28 │ qa-engineer

🤖 Top Agents:
      23 │ architect
      18 │ frontend-architect
      15 │ qa-engineer

📅 Daily Activity (last 7 days):
   2025-12-24 │ ████████ (34)
   2025-12-25 │ ██████████ (45)
   2025-12-26 │ ██████ (28)
   2025-12-27 │ ████████ (36)
   2025-12-28 │ █████ (21)
   2025-12-29 │ ███ (12)
   2025-12-30 │ ████ (15)
```

## Data Sources

| Source | Location |
|--------|----------|
| Events log | `.specweave/state/analytics/events.jsonl` |
| Daily summary | `.specweave/state/analytics/daily-summary.json` |
| Cache | `.specweave/state/analytics/cache.json` |

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
