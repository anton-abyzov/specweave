# ADR-0003-008: Cost Tracking System Design

**Status**: Accepted
**Date**: 2025-10-30
**Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)

---

## Context

Users need visibility into AI costs per increment. Without transparent cost tracking, users can't validate savings from intelligent model selection.

---

## Decision

Implement JSON-based cost tracking with async logging and per-increment reports.

---

## Storage Options Evaluated

### 1. SQLite Database
**Rejected**: Overkill for simple cost logging, adds dependency, harder to git-track

### 2. JSON Files
**✅ Selected**: Simple, human-readable, git-friendly, easy to export

### 3. Cloud API
**Deferred**: Future feature for team analytics

---

## Data Model

### CostSession

```typescript
interface CostSession {
  sessionId: string;
  timestamp: string;
  incrementId?: string;
  agent?: string;
  model: 'sonnet' | 'haiku' | 'opus';
  phase: 'planning' | 'execution' | 'review';

  tokens: {
    input: number;
    output: number;
    cached?: number;
  };

  cost: {
    input: number;   // $ cost for input tokens
    output: number;  // $ cost for output tokens
    total: number;   // sum
  };

  duration: number; // milliseconds
  success: boolean;
  errorType?: string;
}
```

### IncrementCostReport

```typescript
interface IncrementCostReport {
  incrementId: string;
  startTime: string;
  endTime: string;

  sessions: CostSession[];

  totals: {
    sonnetCost: number;
    haikuCost: number;
    opusCost: number;
    totalCost: number;
  };

  breakdown: {
    byAgent: Record<string, number>;
    byPhase: Record<string, number>;
    byModel: Record<string, number>;
  };

  savings: {
    baselineCost: number;  // if all Sonnet
    actualCost: number;
    savedAmount: number;
    savedPercent: number;
  };
}
```

---

## Storage Locations

1. **Real-time**: In-memory during execution
2. **Per-increment**: `.specweave/increments/####/reports/cost-analysis.json`
3. **Historical**: `.specweave/logs/cost-history.jsonl` (append-only log)

---

## Performance

- **Async writes**: Non-blocking, batched every 10 operations or 30 seconds
- **Overhead target**: &lt;10ms per operation

---

## Consequences

### Positive
- ✅ Simple implementation (no database)
- ✅ Human-readable (JSON format)
- ✅ Git-friendly (track cost changes over time)
- ✅ Easy export (JSON → CSV, charts)

### Neutral
- ⚠️ Manual aggregation for project-wide stats (acceptable for v1)

---

## Pricing Constants (as of 2025-10-30)

```typescript
const PRICING = {
  sonnet: {
    input: 0.000003,   // $3 per 1M tokens
    output: 0.000015,  // $15 per 1M tokens
  },
  haiku: {
    input: 0.000001,   // $1 per 1M tokens
    output: 0.000005,  // $5 per 1M tokens
  },
  opus: {
    input: 0.000015,   // $15 per 1M tokens
    output: 0.000075,  // $75 per 1M tokens
  }
};
```

---

## Related

- **ADR**: [Intelligent Model Selection](0003-007-intelligent-model-selection.md) - Why we need cost tracking
- **Increment**: [0003-intelligent-model-selection](../../../../increments/0003-intelligent-model-selection/)
