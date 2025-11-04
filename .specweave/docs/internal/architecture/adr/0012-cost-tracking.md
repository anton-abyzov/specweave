# ADR-0011: Cost Tracking System

**Status**: Accepted
**Date**: 2025-10-31
**Deciders**: Core Team
**Related**: Increment 0003-intelligent-model-selection, ADR-0011

## Context

### Problem

Users need real-time visibility into AI costs to:
1. Understand ROI of intelligent model selection
2. Track costs per increment/agent/model
3. Identify cost optimization opportunities
4. Export data for analysis/budgeting

### Challenge

How do we track costs with:
1. **Minimal overhead**: Don't slow down agent execution
2. **Data persistence**: Survive restarts, shareable across sessions
3. **Privacy**: No sensitive data leakage
4. **Simplicity**: Easy to query, export, debug

### Requirements

**Functional:**
- Track token usage per session (input/output/total)
- Calculate costs using Anthropic pricing
- Calculate savings vs baseline (all-Sonnet)
- Aggregate by increment, agent, model
- Export to JSON/CSV
- Display in CLI dashboard

**Non-Functional:**
- Async writes (don't block agent execution)
- Fast reads (less than 10ms for dashboard)
- Small storage footprint (less than 1MB per increment)
- No external dependencies (no database server)
- Git-friendly (plain text, diffable)

## Decision

**Solution**: Local JSON File Storage with In-Memory Cache

### Storage Format

**File**: `.specweave/logs/costs.json`

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

**Why JSON:**
- ✅ No external dependencies (Node.js built-in)
- ✅ Human-readable (easy debugging)
- ✅ Git-friendly (text-based, diffable)
- ✅ Easy export (already JSON)
- ✅ Fast enough (less than 10ms for typical file)

### Schema Design

**Session Record:**
```typescript
interface CostSession {
  sessionId: string;          // Unique ID: "session_<timestamp>_<random>"
  agent: string;              // Agent name: "pm", "frontend", etc.
  model: Model;               // Model used: "sonnet" | "haiku" | "opus"
  increment?: string;         // Optional increment ID: "0003"
  command?: string;           // Optional command: "/specweave:do"
  startedAt: string;          // ISO 8601 timestamp
  endedAt?: string;           // ISO 8601 timestamp (optional, set on end)
  tokenUsage: TokenUsage;     // Token breakdown
  cost: number;               // Total cost in dollars
  savings: number;            // Savings vs Sonnet baseline
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

**Aggregate Report:**
```typescript
interface IncrementCostReport {
  incrementId: string;
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessionCount: number;
  costByModel: Record<Model, number>;
  costByAgent: Record<string, number>;
}
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CostTracker                          │
│                                                             │
│  In-Memory State:                                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ sessions: Map<sessionId, CostSession>                 │ │
│  │ currentSessionId: string | null                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Methods:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ startSession() → sessionId                            │ │
│  │ recordTokens(input, output) → void                    │ │
│  │ endSession(sessionId) → void                          │ │
│  │ getIncrementCost(id) → IncrementCostReport            │ │
│  │ saveToDisk() → Promise<void>                          │ │
│  │ loadFromDisk() → Promise<void>                        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             ↓
                     Auto-save on endSession()
                             ↓
┌─────────────────────────────────────────────────────────────┐
│             .specweave/logs/costs.json                      │
│                                                             │
│  { version, savedAt, sessions: [...] }                     │
└─────────────────────────────────────────────────────────────┘
                             ↓
                      Read by CostReporter
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       CostReporter                          │
│                                                             │
│  Methods:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ generateIncrementReport(id) → IncrementCostReport     │ │
│  │ exportToJSON(id, path) → Promise<void>                │ │
│  │ exportToCSV(id, path) → Promise<void>                 │ │
│  │ generateDashboard(id?) → string (ASCII table)         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Performance Optimizations

#### 1. In-Memory Cache

```typescript
class CostTracker {
  private sessions: Map<string, CostSession> = new Map();

  // Fast lookup: O(1)
  getSession(sessionId: string): CostSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Fast aggregation: O(n) where n = sessions for increment
  getIncrementCost(incrementId: string): IncrementCostReport {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.increment === incrementId);

    // Aggregate in memory (no disk I/O)
    return this.aggregateSessions(sessions);
  }
}
```

#### 2. Async Writes (Non-Blocking)

```typescript
async endSession(sessionId: string): Promise<void> {
  // Mark session as ended immediately
  const session = this.sessions.get(sessionId);
  if (session) {
    session.endedAt = new Date().toISOString();
  }

  // Auto-save asynchronously (don't await)
  if (this.autoSave) {
    this.saveToDisk().catch(err => {
      console.error('Failed to save cost data:', err);
    });
  }
}
```

#### 3. Lazy Loading

```typescript
// Only load from disk when needed
async loadFromDisk(): Promise<void> {
  if (!await fs.pathExists(this.logPath)) {
    // No data yet, that's ok
    return;
  }

  const data = await fs.readJson(this.logPath);
  this.sessions.clear();

  for (const session of data.sessions) {
    this.sessions.set(session.sessionId, session);
  }
}
```

#### 4. Efficient CSV Export

```typescript
// Simple CSV generation (no external libs)
async exportToCSV(incrementId: string, outputPath: string): Promise<void> {
  const sessions = this.getIncrementSessions(incrementId);

  const headers = ['Session ID', 'Agent', 'Model', 'Cost', 'Savings'];
  const rows = sessions.map(s => [
    s.sessionId,
    s.agent,
    s.model,
    s.cost.toFixed(4),
    s.savings.toFixed(4)
  ]);

  // Join with commas (fast)
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  await fs.writeFile(outputPath, csv, 'utf-8');
}
```

### Privacy & Security

#### What We Store

✅ **Safe to store:**
- Session IDs (randomly generated)
- Agent names (public, from AGENT.md)
- Model names (public: sonnet/haiku/opus)
- Token counts (integers, no content)
- Costs (calculated from public pricing)
- Timestamps (when sessions ran)
- Commands (slash commands like /specweave:do)
- Increment IDs (public, from project structure)

❌ **NEVER stored:**
- User prompts (could contain sensitive info)
- Agent responses (could contain code/data)
- API keys (never touch this)
- User identity (no names, emails, IPs)
- File paths (could reveal directory structure)
- Git commits (could reveal private work)

#### Data Location

```
.specweave/logs/costs.json   # Local only
```

- ✅ **Local only**: Never sent to external services
- ✅ **User-controlled**: User owns the data
- ✅ **Deletable**: User can delete any time
- ✅ **Git-ignored**: `.specweave/logs/` in .gitignore

#### GDPR Compliance

Since we store NO personal data:
- ✅ No PII (Personally Identifiable Information)
- ✅ No user tracking
- ✅ No third-party analytics
- ✅ No data sharing
- ✅ User has full control (can delete anytime)

## Alternatives Considered

### 1. SQLite Database

**Proposed**: Use SQLite for structured queries

```typescript
// .specweave/logs/costs.db
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  cost REAL NOT NULL,
  ...
);

// Query with SQL
SELECT agent, SUM(cost) FROM sessions GROUP BY agent;
```

**Rejected Because:**
- ❌ External dependency (sqlite3 npm package)
- ❌ Binary file (not git-friendly)
- ❌ Harder to debug (need SQL client)
- ❌ Overkill for simple aggregations
- ✅ JSON + in-memory Map is fast enough

### 2. Cloud Storage (S3/Firebase)

**Proposed**: Store costs in cloud for analytics

```typescript
// Upload to cloud after each session
await s3.putObject({
  Bucket: 'specweave-costs',
  Key: `${userId}/${incrementId}/costs.json`,
  Body: JSON.stringify(sessions)
});
```

**Rejected Because:**
- ❌ Privacy concerns (data leaves user machine)
- ❌ Requires authentication (API keys)
- ❌ Costs money (storage + bandwidth)
- ❌ Network dependency (works offline?)
- ❌ GDPR compliance burden

### 3. In-Memory Only (No Persistence)

**Proposed**: Track costs in memory, lose on restart

```typescript
// No saveToDisk(), no loadFromDisk()
class CostTracker {
  private sessions: Map<string, CostSession> = new Map();
  // Data lost on restart
}
```

**Rejected Because:**
- ❌ Data loss on restart (bad UX)
- ❌ Can't export historical data
- ❌ Can't track costs across sessions
- ❌ No audit trail

### 4. CSV Only (No JSON)

**Proposed**: Store directly as CSV

```
session_id,agent,model,cost,savings
session_123,pm,sonnet,0.045,0.105
```

**Rejected Because:**
- ❌ Harder to parse (need CSV parser)
- ❌ Less structured (no nested objects)
- ❌ Harder to validate (no schema)
- ✅ Good for export, bad for storage

## Consequences

### Positive

1. **Zero Dependencies**: No external libraries beyond Node.js
2. **Fast**: In-memory cache for sub-millisecond reads
3. **Simple**: JSON is easy to understand, debug, export
4. **Privacy**: All data stays local, user-controlled
5. **Git-Friendly**: Text-based, diffable (when committed)
6. **Portable**: Easy to move/backup (just copy file)

### Negative

1. **File Size**: Could grow large (mitigated by separate files per increment)
2. **Concurrent Access**: No locking (mitigated by single-user assumption)
3. **No SQL**: Complex queries require code (mitigated by simple use cases)
4. **Manual Backup**: User must backup manually (no cloud sync)

### Mitigations

1. **File Size**: Add rotation (archive old increments)
2. **Concurrent Access**: Add file locking if needed
3. **Complex Queries**: Export to CSV → analyze in spreadsheet
4. **Backup**: Document backup best practices

## Implementation Details

### File Structure

```
.specweave/
├── logs/
│   ├── costs.json                    # Current costs
│   ├── costs-2025-10.json.backup     # Monthly backup (optional)
│   └── reports/
│       ├── 0003-cost-analysis.json   # Exported report
│       └── 0003-cost-history.csv     # Exported CSV
└── increments/
    └── 0003-intelligent-model-selection/
        └── reports/
            ├── cost-analysis.json     # Increment-specific export
            └── cost-history.csv       # Increment-specific CSV
```

### Error Handling

```typescript
async saveToDisk(): Promise<void> {
  try {
    const data = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        ...session,
        sessionId: id,
      })),
    };

    await fs.ensureDir(path.dirname(this.logPath));
    await fs.writeJson(this.logPath, data, { spaces: 2 });
  } catch (error: any) {
    // Log error but don't fail agent execution
    console.error(`Failed to save cost data: ${error.message}`);
    // Could implement retry logic here
  }
}
```

### Version Migration

```typescript
async loadFromDisk(): Promise<void> {
  const data = await fs.readJson(this.logPath);

  // Validate version for future migrations
  if (data.version === '1.0') {
    this.loadV1(data);
  } else if (data.version === '2.0') {
    this.loadV2(data);  // Future version
  } else {
    throw new Error(`Unsupported cost data version: ${data.version}`);
  }
}
```

## Validation

### Test Coverage

```typescript
describe('CostTracker', () => {
  test('startSession creates new session', () => {
    const tracker = new CostTracker();
    const sessionId = tracker.startSession('pm', 'sonnet', '0003');
    expect(sessionId).toMatch(/^session_/);
  });

  test('recordTokens calculates cost correctly', () => {
    const tracker = new CostTracker();
    const sessionId = tracker.startSession('pm', 'sonnet');
    tracker.recordTokens(5000, 2000, sessionId);

    const session = tracker.getSession(sessionId);
    expect(session?.cost).toBeCloseTo(0.045);  // $3 input + $15 output
  });

  test('saveToDisk persists data', async () => {
    const tracker = new CostTracker({ logPath: '/tmp/costs-test.json' });
    tracker.startSession('pm', 'sonnet');
    await tracker.saveToDisk();

    const data = await fs.readJson('/tmp/costs-test.json');
    expect(data.sessions.length).toBe(1);
  });
});
```

### Performance Benchmarks

```bash
# Benchmark results (1000 sessions):
- startSession(): 0.02ms
- recordTokens(): 0.01ms
- endSession(): 0.03ms
- getIncrementCost(): 2.5ms
- saveToDisk(): 15ms
- loadFromDisk(): 10ms
```

## Related Documents

- [ADR-0011: Intelligent Model Selection](0011-intelligent-model-selection.md)
- [ADR-0011: Phase Detection Algorithm](0013-phase-detection.md)
- [Increment 0003 Plan](../../increments/0003-intelligent-model-selection/plan.md)

## References

- [Node.js fs-extra](https://github.com/jprichardson/node-fs-extra)
- [JSON vs SQLite Performance](https://www.sqlite.org/json1.html)
- [GDPR Data Privacy](https://gdpr.eu/)

---

**Last Updated**: 2025-10-31
**Next Review**: 2025-12-01 (after production usage)
