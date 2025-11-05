# Cost Tracking Reference

**Technical reference for SpecWeave cost tracking system**

---

## /specweave:costs Command

### Syntax

```bash
/specweave:costs [incrementId] [--export json|csv|both]
```

### Parameters

- `incrementId` (optional): Specific increment ID (e.g., "0003"). Defaults to current increment.
- `--export` (optional): Export format. Options: json, csv, both.

### Examples

```bash
# View all increments
/specweave:costs

# View specific increment
/specweave:costs 0003

# Export to JSON
/specweave:costs 0003 --export json

# Export to CSV
/specweave:costs 0003 --export csv

# Export both formats
/specweave:costs 0003 --export both
```

---

## Cost Data Storage

### Location

```
.specweave/logs/costs.json
```

### Format

```json
{
  "version": "1.0",
  "savedAt": "2025-10-31T14:32:15.123Z",
  "sessions": [
    {
      "sessionId": "session_1730386335123_abc123",
      "agent": "pm",
      "model": "sonnet",
      "increment": "0003",
      "command": "/specweave:do",
      "startedAt": "2025-10-31T14:30:00.000Z",
      "endedAt": "2025-10-31T14:32:00.000Z",
      "tokenUsage": {
        "inputTokens": 5000,
        "outputTokens": 2000,
        "totalTokens": 7000
      },
      "cost": 0.045,
      "savings": 0.105
    }
  ]
}
```

---

## Pricing Constants

### Current Rates (as of 2025-10-31)

```typescript
{
  sonnet: {
    input: $3 per 1M tokens,
    output: $15 per 1M tokens
  },
  haiku: {
    input: $1 per 1M tokens,
    output: $5 per 1M tokens
  },
  opus: {
    input: $15 per 1M tokens,
    output: $75 per 1M tokens
  }
}
```

### Cost Calculation

```typescript
cost = (inputTokens / 1_000_000) * inputRate +
       (outputTokens / 1_000_000) * outputRate
```

### Savings Calculation

```typescript
baselineCost = calculateCost('sonnet', inputTokens, outputTokens)
actualCost = calculateCost(usedModel, inputTokens, outputTokens)
savings = baselineCost - actualCost
```

---

## Export Formats

### JSON Export

**Location**: `.specweave/increments/{incrementId}/reports/cost-analysis.json`

**Structure**:
```json
{
  "incrementId": "0003",
  "totalCost": 22.50,
  "totalSavings": 22.50,
  "totalTokens": 1250000,
  "sessionCount": 42,
  "costByModel": {
    "sonnet": 12.00,
    "haiku": 10.50
  },
  "costByAgent": {
    "pm": 8.00,
    "frontend": 6.50,
    "backend": 5.00,
    "devops": 3.00
  }
}
```

### CSV Export

**Location**: `.specweave/increments/{incrementId}/reports/cost-history.csv`

**Columns**:
```csv
Session ID,Agent,Model,Command,Started At,Ended At,Input Tokens,Output Tokens,Total Tokens,Cost ($),Savings ($)
session_123,pm,sonnet,/specweave:inc,2025-10-31T14:00:00.000Z,2025-10-31T14:05:00.000Z,5000,2000,7000,0.045,0.105
```

---

## Privacy & Security

### Data Tracked

✅ **Safe data** (non-sensitive):
- Session IDs (random)
- Agent names (public)
- Model names (public)
- Token counts (integers)
- Costs (calculated)
- Timestamps

❌ **Never tracked**:
- User prompts
- Agent responses
- API keys
- File paths
- Personal information

### GDPR Compliance

- ✅ No PII stored
- ✅ Local-only data
- ✅ User-controlled
- ✅ Deletable anytime

---

## API (TypeScript)

### CostTracker

```typescript
import { CostTracker } from '@specweave/core';

const tracker = new CostTracker({
  logPath: '.specweave/logs/costs.json',
  autoSave: true
});

// Start session
const sessionId = tracker.startSession('pm', 'sonnet', '0003', '/specweave:inc');

// Record tokens
tracker.recordTokens(5000, 2000, sessionId);

// End session
tracker.endSession(sessionId);

// Get report
const report = tracker.getIncrementCost('0003');
console.log(report.totalCost, report.totalSavings);
```

### CostReporter

```typescript
import { CostReporter } from '@specweave/utils';

const reporter = new CostReporter(tracker);

// Generate dashboard
const dashboard = reporter.generateDashboard('0003');
console.log(dashboard);

// Export to JSON
await reporter.exportToJSON('0003', 'cost-analysis.json');

// Export to CSV
await reporter.exportToCSV('0003', 'cost-history.csv');
```

---

## Related Documents

- [Cost Optimization Guide](../guides/cost-optimization)
- [Model Selection Guide](../guides/model-selection)

---

*Last updated: 2025-10-31 | SpecWeave v0.4.0*
