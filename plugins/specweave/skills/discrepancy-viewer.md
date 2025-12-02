# Discrepancy Viewer Skill

View and manage brownfield documentation discrepancies.

**Activates for**: discrepancies, documentation gaps, missing docs, stale docs, knowledge gaps, brownfield analysis results, DISC-0001, view discrepancy, list discrepancies

## Context

Brownfield discrepancies are documentation gaps detected during brownfield analysis:

| Type | Description |
|------|-------------|
| `missing-docs` | Code exists but has no documentation |
| `stale-docs` | Code changed but docs weren't updated |
| `knowledge-gap` | Module only one person has committed to |
| `orphan-doc` | Documentation for deleted code |
| `missing-adr` | Significant pattern without ADR |

## How to View Discrepancies

### List All Pending

```typescript
import { BrownfieldDiscrepancyManager } from 'specweave/core/discrepancy';

const manager = new BrownfieldDiscrepancyManager(projectPath);
const discrepancies = await manager.listDiscrepancies();

// Display in table format
console.log('📋 BROWNFIELD DISCREPANCIES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ID          Type            Priority    Module           Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const disc of discrepancies) {
  const priorityIcon = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  }[disc.priority];

  console.log(`${disc.id}   ${disc.type.padEnd(15)} ${priorityIcon} ${disc.priority.padEnd(8)} ${disc.module.padEnd(16)} ${disc.summary.slice(0, 30)}...`);
}
```

### Filter by Module

```typescript
const discrepancies = await manager.listDiscrepancies({
  module: 'payment-service'
});
```

### Filter by Type

```typescript
const discrepancies = await manager.listDiscrepancies({
  type: 'missing-docs'
});
```

### Filter by Priority

```typescript
const discrepancies = await manager.listDiscrepancies({
  priority: 'critical'
});
```

### View Single Discrepancy

```typescript
const disc = await manager.getDiscrepancy('DISC-0001');

console.log(`
🔍 DISCREPANCY DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID:          ${disc.id}
Type:        ${disc.type}
Priority:    ${disc.priority}
Module:      ${disc.module}
Status:      ${disc.status}
Confidence:  ${disc.confidence}%

Summary:     ${disc.summary}
Details:     ${disc.details}

Code Location: ${disc.codeLocation || 'N/A'}
Doc Location:  ${disc.docLocation || 'N/A'}

Detected:    ${disc.detectedAt}
Last Check:  ${disc.lastChecked}
`);
```

### Ignore a Discrepancy

```typescript
await manager.ignoreDiscrepancy('DISC-0001', 'False positive - test code');
```

## Output Format

### Table Format (Default)

```
📋 BROWNFIELD DISCREPANCIES (15 pending)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID          Type            Priority    Module              Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISC-0001   missing-docs    🔴 critical  payment-service     12 undocumented exports
DISC-0002   stale-docs      🟠 high      auth                Login flow docs outdated
DISC-0003   knowledge-gap   🟡 medium    legacy-adapter      Single contributor module
DISC-0004   missing-adr     🟢 low       cache               No ADR for caching strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use '/specweave:discrepancies show <ID>' for details
Use '/specweave:discrepancy-to-increment <ID> <ID>...' to create an increment
```

### Statistics

```
📊 DISCREPANCY STATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total:       47
Pending:     15
In Progress: 5
Resolved:    25
Ignored:     2

By Type:
  missing-docs:    22 (47%)
  stale-docs:       8 (17%)
  knowledge-gap:    7 (15%)
  orphan-doc:       5 (11%)
  missing-adr:      5 (11%)

By Priority:
  Critical:   3
  High:       8
  Medium:    12
  Low:       24
```

## Related

- `/specweave:discrepancy-to-increment` - Convert discrepancies to increments
- `/specweave:jobs` - Monitor brownfield analysis jobs
- `brownfield-analyzer` skill - Run new analysis
