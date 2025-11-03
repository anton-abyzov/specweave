---
name: specweave.costs
description: Display AI cost dashboard for current or specified increment with real-time savings tracking
---

# Cost Dashboard Command

You are being invoked via the `/specweave:costs [incrementId]` command.

## Your Task

Display a comprehensive cost dashboard showing:
1. Token usage breakdown
2. Cost by model (Sonnet vs Haiku)
3. Cost by agent
4. Savings vs baseline (all-Sonnet)
5. Recent sessions

**Optional**: Export data to JSON/CSV format

## Implementation Steps

### 1. Parse Arguments

```typescript
// Extract increment ID from command args
// If not provided, detect current increment from .specweave/increments/
// Look for increment with status 'in-progress' in metadata.json
```

### 2. Load Cost Data

```typescript
import { CostTracker } from '../core/cost-tracker';
import { CostReporter } from '../utils/cost-reporter';
import fs from 'fs-extra';
import path from 'path';

// Initialize cost tracker
const costTracker = new CostTracker({
  logPath: '.specweave/logs/costs.json',
  autoSave: true,
});

// Load persisted cost data
await costTracker.loadFromDisk();

// Create reporter
const reporter = new CostReporter(costTracker);
```

### 3. Determine Increment ID

```typescript
// If user provided increment ID
const userProvidedId = args[0]; // e.g., "0003"

// Otherwise, detect current increment
const currentIncrement = await detectCurrentIncrement();

const incrementId = userProvidedId || currentIncrement || 'all';
```

### 4. Generate Dashboard

```typescript
// Generate ASCII dashboard
const dashboard = reporter.generateDashboard(
  incrementId === 'all' ? undefined : incrementId
);

// Display to user
console.log(dashboard);
```

### 5. Offer Export Options

```typescript
// Ask user if they want to export
const wantsExport = await askUser('Would you like to export cost data?', {
  options: ['JSON', 'CSV', 'Both', 'No'],
});

if (wantsExport !== 'No') {
  const outputDir = incrementId === 'all'
    ? '.specweave/logs/reports'
    : `.specweave/increments/${incrementId}/reports`;

  await fs.ensureDir(outputDir);

  if (wantsExport === 'JSON' || wantsExport === 'Both') {
    const jsonPath = path.join(outputDir, 'cost-analysis.json');
    await reporter.exportToJSON(incrementId, jsonPath);
    console.log(`✅ Exported to ${jsonPath}`);
  }

  if (wantsExport === 'CSV' || wantsExport === 'Both') {
    const csvPath = path.join(outputDir, 'cost-history.csv');
    await reporter.exportToCSV(incrementId, csvPath);
    console.log(`✅ Exported to ${csvPath}`);
  }
}
```

## Helper Function: Detect Current Increment

```typescript
async function detectCurrentIncrement(): Promise<string | null> {
  const incrementsDir = '.specweave/increments';

  if (!await fs.pathExists(incrementsDir)) {
    return null;
  }

  const dirs = await fs.readdir(incrementsDir);

  // Filter out _backlog and other special folders
  const incrementDirs = dirs.filter(d => /^\d{4}-/.test(d));

  // Check each for in-progress status
  for (const dir of incrementDirs) {
    const metadataPath = path.join(incrementsDir, dir, 'metadata.json');

    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      if (metadata.status === 'in-progress') {
        return dir.split('-')[0]; // Extract "0003" from "0003-intelligent-model-selection"
      }
    }
  }

  // If no in-progress, return most recent
  return incrementDirs.length > 0
    ? incrementDirs[incrementDirs.length - 1].split('-')[0]
    : null;
}
```

## Output Examples

### Increment-Specific Dashboard

```
═══════════════════════════════════════════════════════════════
  Cost Report: Increment 0003
═══════════════════════════════════════════════════════════════

SUMMARY
───────────────────────────────────────────────────────────────
  Total Cost:       $    0.1234
  Total Savings:    $    0.3456
  Savings %:              73.7%
  Total Tokens:         125,432
  Sessions:                  15

COST BY MODEL
───────────────────────────────────────────────────────────────
  sonnet          $    0.0734  ( 59.4%)
  haiku           $    0.0500  ( 40.6%)

COST BY AGENT
───────────────────────────────────────────────────────────────
  pm                        $  0.0500  ( 40.5%)
  architect                 $  0.0300  ( 24.3%)
  frontend                  $  0.0234  ( 19.0%)
  devops                    $  0.0150  ( 12.2%)
  qa-lead                   $  0.0050  (  4.0%)

RECENT SESSIONS
───────────────────────────────────────────────────────────────
  2025-10-31 14:32:15
  Agent: pm                  Model: sonnet
  Cost: $ 0.0150    Savings: $ 0.0350

  2025-10-31 13:15:42
  Agent: frontend            Model: haiku
  Cost: $ 0.0034    Savings: $ 0.0166

═══════════════════════════════════════════════════════════════
```

### Overall Dashboard (All Increments)

```
═══════════════════════════════════════════════════════════════
  SpecWeave Cost Summary - All Increments
═══════════════════════════════════════════════════════════════

OVERALL SUMMARY
───────────────────────────────────────────────────────────────
  Total Cost:       $    1.2345
  Total Savings:    $    3.4567
  Savings %:              73.7%
  Total Sessions:             42

AGENT STATS
───────────────────────────────────────────────────────────────
  Most Expensive:    pm
  Least Expensive:   qa-lead

COST BY INCREMENT
───────────────────────────────────────────────────────────────
  0001                          $  0.5000  (12 sessions)
  0002                          $  0.4111  (15 sessions)
  0003                          $  0.3234  (15 sessions)

═══════════════════════════════════════════════════════════════

💡 Tip: Use "/specweave:costs 0003" to see detailed report for increment 0003
```

## Error Handling

### No Cost Data

```
No cost data available for increment 0003.

This could mean:
- The increment hasn't been started yet
- Cost tracking is not enabled
- The cost log file is missing

Run /specweave:do to start executing tasks with cost tracking enabled.
```

### Invalid Increment ID

```
Increment 0099 not found.

Available increments:
- 0001-core-framework
- 0002-core-enhancements
- 0003-intelligent-model-selection

Use /specweave:costs without arguments to see all increments.
```

## Important Notes

1. **Cost Data Persistence**: Costs are persisted to `.specweave/logs/costs.json`
2. **Baseline Calculation**: Savings are calculated vs an all-Sonnet baseline
3. **Real-Time Updates**: Costs update after each agent invocation
4. **Export Formats**: JSON for machine parsing, CSV for spreadsheet import
5. **Privacy**: Cost data is local only, never sent to external services

## Related Commands

- `/specweave:do` - Execute tasks with cost tracking
- `/specweave:progress` - View progress with cost summary
- `/specweave:validate` - Validate increment (includes cost checks)

## Success Criteria

After running this command, the user should:
1. ✅ See a clear cost breakdown
2. ✅ Understand their savings vs baseline
3. ✅ Identify most expensive agents/models
4. ✅ Have option to export data
5. ✅ Feel confident about cost optimization
