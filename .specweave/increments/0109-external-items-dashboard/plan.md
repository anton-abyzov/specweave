# Implementation Plan: External Items Dashboard

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Items Dashboard                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  ExternalItems   │───▶│   CacheManager   │                   │
│  │    Counter       │    │  (15min TTL)     │                   │
│  └────────┬─────────┘    └──────────────────┘                   │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────┐                   │
│  │         Provider Adapters                 │                   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐        │                   │
│  │  │ GitHub │ │  JIRA  │ │  ADO   │        │                   │
│  │  │Adapter │ │Adapter │ │Adapter │        │                   │
│  │  └────────┘ └────────┘ └────────┘        │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Integration Points:                                             │
│  • /specweave:status    → External items section                │
│  • /specweave:progress  → Footer indicator                      │
│  • /specweave:increment → Notification prompt                   │
│  • /specweave:external  → Dedicated command (NEW)               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. ExternalItemsCounter Service

**Location**: `src/core/external-tools/external-items-counter.ts`

```typescript
interface ExternalItemsSummary {
  github: ProviderSummary;
  jira: ProviderSummary;
  ado: ProviderSummary;
  byProject: Map<string, ProjectSummary>;
  total: { open: number; stale: number };
  lastUpdated: string;
}

interface ProviderSummary {
  configured: boolean;
  open: number;
  stale: number;  // >7 days old
  items: ExternalItem[];
}

interface ExternalItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  age: number;  // days
  labels: string[];
  provider: 'github' | 'jira' | 'ado';
  project?: string;
}
```

### 2. Provider Adapters

Each adapter implements:
```typescript
interface ExternalItemsProvider {
  isConfigured(): Promise<boolean>;
  getOpenItems(): Promise<ExternalItem[]>;
  getProviderName(): string;
}
```

**GitHub Adapter**: Uses `gh issue list --state open --json`
**JIRA Adapter**: Uses existing JIRA client with JQL `status != Done`
**ADO Adapter**: Uses WIQL query for non-closed states

### 3. Cache Structure

**Location**: `.specweave/cache/external-items-summary.json`

```json
{
  "data": {
    "github": { "configured": true, "open": 4, "stale": 2, "items": [...] },
    "jira": { "configured": false, "open": 0, "stale": 0, "items": [] },
    "ado": { "configured": false, "open": 0, "stale": 0, "items": [] },
    "total": { "open": 4, "stale": 2 },
    "lastUpdated": "2025-12-05T10:30:00Z"
  },
  "timestamp": 1733395800000,
  "ttl": 900000
}
```

### 4. Display Formats

**Brief (status line/progress footer)**:
```
📋 EXT: GH:4 JI:0 ADO:0
```

**Standard (status command)**:
```
📋 External Items (open):
   GitHub: 4 issues (2 stale >7d)
   JIRA: not configured
   ADO: not configured
```

**Detailed (external command)**:
```
═══════════════════════════════════════════════════════════════
                    External Items Dashboard
═══════════════════════════════════════════════════════════════

GitHub Issues (4 open, 2 stale)
───────────────────────────────────────────────────────────────
  #779  DORA Metrics Workflow Failed          10h ago
  #778  DORA Metrics Workflow Failed          1d ago
  #777  DORA Metrics Workflow Failed          1d ago   ⚠️ stale
  #776  DORA Metrics Workflow Failed          3d ago   ⚠️ stale

───────────────────────────────────────────────────────────────
Total: 4 open (2 stale >7d)
Last updated: 2 minutes ago (use --refresh to update)
```

## Implementation Phases

### Phase 1: Core Service (T-001, T-002)
1. Create ExternalItemsCounter with provider adapters
2. Implement caching with 15min TTL
3. Add stale detection (>7 days)

### Phase 2: Command Integration (T-003, T-004, T-005)
1. Add section to status command
2. Create /specweave:external command
3. Add footer to progress display

### Phase 3: Planning Integration (T-006)
1. Modify increment-planner skill
2. Add notification after planning completes
3. Implement interactive prompt for details

### Phase 4: Testing (T-007)
1. Unit tests for counter service
2. Integration tests for commands
3. Mock providers for offline testing

## File Changes Summary

### New Files
- `src/core/external-tools/external-items-counter.ts`
- `src/core/external-tools/external-items-display.ts`
- `plugins/specweave/commands/specweave-external.md`
- `tests/unit/external-tools/external-items-counter.test.ts`

### Modified Files
- `src/core/increment/status-commands.ts` - Add external items section
- `src/core/progress/progress-tracker.ts` - Add footer support
- `plugins/specweave/skills/increment-planner.md` - Add notification

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits | 15min cache, stale fallback |
| Provider not configured | Graceful skip, show "not configured" |
| Slow API responses | Async loading, timeout handling |
| Large item counts | Limit to 50 items per provider |
