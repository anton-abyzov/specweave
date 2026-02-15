# Implementation Plan: Enterprise Dashboard - Real-time Observability

## Overview

Full-stack web dashboard providing New Relic-style observability for SpecWeave projects. Built as a local CLI tool (`specweave dashboard`) with React frontend and zero-dependency Node.js server. Reads `.specweave/` state files and Claude Code session logs to provide real-time monitoring across 13 pages.

## Architecture

### Components
- **CLI Entry** (`src/cli/commands/dashboard.ts`): Registers `specweave dashboard` command, manages server lifecycle
- **Dashboard Server** (`src/dashboard/server/dashboard-server.ts`): Native `http` server with custom router, SSE, file watching
- **Micro-Router** (`src/dashboard/server/router.ts`): Express-style path params, CORS, body parsing
- **SSE Manager** (`src/dashboard/server/sse-manager.ts`): Server-Sent Events for real-time push to clients
- **File Watcher** (`src/dashboard/server/file-watcher.ts`): Monitors `.specweave/` for changes, triggers SSE events
- **Command Runner** (`src/dashboard/server/command-runner.ts`): Executes specweave CLI commands from dashboard UI
- **Data Aggregator** (`src/dashboard/server/data/dashboard-data-aggregator.ts`): Reads increment/config/state data
- **Claude Log Parser** (`src/dashboard/server/data/claude-log-parser.ts`): Parses session JSONL for tokens/errors
- **Plugin Scanner** (`src/dashboard/server/data/plugin-scanner.ts`): Reads plugin cache and marketplace
- **Sync Audit Reader** (`src/dashboard/server/data/sync-audit-reader.ts`): Reads sync metadata and audit logs
- **Activity Stream** (`src/dashboard/server/data/activity-stream.ts`): Unified event feed from all sources
- **React Client** (`src/dashboard/client/`): 13 pages, custom hooks, Tailwind dark theme

### Data Model
- **OverviewPayload**: Project stats, analytics summary, costs summary, notification counts
- **IncrementSummary/Detail**: Metadata, task status, AC status, costs per increment
- **SessionTokenSummary**: Per-session token breakdown (input, output, cache write/read) with cost
- **SessionError**: Classified errors (prompt_too_long, api_error, tool_failure, hook_error, rate_limit)
- **ActivityEvent**: Timestamped events with category, severity, source, metadata
- **SSEMessage**: 13 event types for real-time client updates
- **DashboardLockFile**: Singleton instance tracking (port, pid, projects)

### API Contracts (30+ endpoints)

**Overview & Increments**:
- `GET /api/overview` — KPIs, charts, summaries
- `GET /api/increments` — List with status filtering
- `GET /api/increments/:id` — Detail with tasks/ACs/costs

**Analytics**:
- `GET /api/analytics/summary` — Aggregated event stats from events.jsonl
- `GET /api/analytics/skills` — Per-skill usage leaderboard

**Costs**:
- `GET /api/costs/summary` — Token usage from Claude Code session logs

**Sync**:
- `GET /api/sync/status` — Per-platform sync status
- `GET /api/sync/audit` — Sync audit log entries

**Errors**:
- `GET /api/errors/summary` — Error counts by type
- `GET /api/errors/sessions` — Sessions with errors

**Activity**:
- `GET /api/activity` — Historical activity events
- `GET /api/sse` — SSE stream endpoint

**Config**:
- `GET /api/config` — Current config.json
- `PUT /api/config` — Update config
- `POST /api/config/validate` — Validate before save

**Plugins & Services**:
- `GET /api/plugins` — Installed plugins with skills
- `GET /api/services` — LSP status, running services
- `POST /api/commands/:name` — Execute specweave CLI commands

**Notifications**:
- `GET /api/notifications` — Pending notifications

**Projects**:
- `GET /api/projects` — Available SpecWeave projects
- `GET /api/repos` — Connected repositories

**Health**:
- `GET /api/health` — Server health check

## Technology Stack

- **Server**: Node.js native `http` module (zero runtime deps)
- **Client**: React 18, Vite, TailwindCSS v4, react-router-dom
- **Charts**: Hand-rolled SVG (StatusDonut ~86 LOC, BarChart ~37 LOC)
- **Real-time**: SSE + `fs.watch` with debouncing
- **Build**: Vite for client, TypeScript for server

**Architecture Decisions**:
- **Native http over Express**: Zero runtime dependencies, follows existing SpecWeave patterns
- **SVG charts over recharts/d3**: Minimal bundle size, sufficient for KPI visualization
- **SSE over WebSockets**: Unidirectional push is sufficient, simpler to implement, auto-reconnect built into EventSource API
- **Filesystem-only data**: No database — reads .specweave/ and Claude Code logs directly

## Implementation Phases

### Phase 1: Server + Foundation
- Dashboard server with router, SSE manager, file watcher
- CLI command registration (`specweave dashboard`)
- OverviewPage with KPI cards and status charts
- IncrementsPage with list and detail views
- Client build integration (Vite config, Tailwind setup)

### Phase 2: Error Tracing + Analytics + Costs
- Claude log parser for session error extraction
- ErrorsPage with error classification and drilldown
- AnalyticsPage with events.jsonl aggregation
- CostsPage with token extraction and pricing calculation

### Phase 3: Sync Audit + Activity Stream
- Sync audit reader for metadata and audit logs
- SyncPage with platform status and audit trail
- ActivityPage with real-time SSE event stream
- NotificationsPage

### Phase 4: Config Editor + Services
- ConfigPage with visual editor and validation
- PluginsPage with marketplace actions
- ServicesPage with LSP status and port info
- ReposPage with multi-repo/single-repo detection

### Phase 5: Data Pipeline Fixes
- Fix analytics aggregation (read events.jsonl directly vs missing cache.json)
- Fix cost extraction (parse Claude Code session logs for real token data)
- Fix sync UX ("never synced" vs "failed")
- Fix repos page (single-repo fallback)
- Expandable activity rows, plugin command feedback, config validation

## Testing Strategy

- Unit tests for data modules (aggregator, log parser, sync reader)
- Integration tests for API endpoints
- Manual verification of all 13 pages with real data

## Technical Challenges

### Challenge 1: Large Session Log Parsing
**Solution**: Streaming readline parser for JSONL files (up to 91MB). Incremental cost cache prevents re-parsing. Limit to most recent 200 sessions.
**Risk**: First-run latency ~10-30s. Mitigated by caching and async non-blocking writes.

### Challenge 2: Multi-Project File Watching
**Solution**: Per-project file watchers with debouncing. Project context switching in UI.
**Risk**: File descriptor limits on macOS. Mitigated by watching directories, not individual files.

### Challenge 3: Real-time SSE Reliability
**Solution**: Heartbeat events every 30s, client-side auto-reconnect via EventSource API.
**Risk**: Connection drops. Mitigated by reconnect with exponential backoff.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/cli/commands/dashboard.ts` | 166 | CLI command entry point |
| `src/dashboard/types.ts` | 211 | Shared TypeScript types |
| `src/dashboard/server/dashboard-server.ts` | 896 | Main server (routes + handlers) |
| `src/dashboard/server/router.ts` | 124 | Micro-router with path params |
| `src/dashboard/server/sse-manager.ts` | 87 | SSE connection manager |
| `src/dashboard/server/file-watcher.ts` | 118 | Filesystem change detection |
| `src/dashboard/server/command-runner.ts` | 114 | CLI command execution |
| `src/dashboard/server/data/dashboard-data-aggregator.ts` | 249 | Increment/config/state data |
| `src/dashboard/server/data/claude-log-parser.ts` | 229 | Session log parsing |
| `src/dashboard/server/data/plugin-scanner.ts` | 111 | Plugin inventory |
| `src/dashboard/server/data/sync-audit-reader.ts` | 118 | Sync metadata reader |
| `src/dashboard/server/data/activity-stream.ts` | 151 | Event stream aggregation |
| `src/dashboard/client/src/App.tsx` | 55 | React router + layout |
| `src/dashboard/client/src/pages/*.tsx` | ~2860 | 13 page components |
| `src/dashboard/client/src/hooks/*.ts` | ~235 | API, SSE, project, command hooks |
| `src/dashboard/client/src/components/**/*.tsx` | ~387 | Layout, charts, UI components |
| **Total** | **~5,244** | **42 files** |
