# Tasks: Enterprise Dashboard - Real-time Observability

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[x]`: Completed
- `[ ]`: Not started
- Model hints: haiku (simple), opus (default)

## Phase 1: Server + Foundation

### T-001: Dashboard Server Core
**User Story**: US-011 | **Satisfies ACs**: AC-US11-01, AC-US11-02, AC-US11-03, AC-US11-04, AC-US11-06
**Status**: [x] completed

**Description**: Build the core dashboard server with native `http` module, custom micro-router, SSE manager, file watcher, and command runner. Register `specweave dashboard` CLI command.

**Files**:
- `src/cli/commands/dashboard.ts` (166 lines)
- `src/dashboard/server/dashboard-server.ts` (896 lines)
- `src/dashboard/server/router.ts` (124 lines)
- `src/dashboard/server/sse-manager.ts` (87 lines)
- `src/dashboard/server/file-watcher.ts` (118 lines)
- `src/dashboard/server/command-runner.ts` (114 lines)
- `src/dashboard/types.ts` (211 lines)

**Test**: Given the CLI command `specweave dashboard` is run → When the server starts → Then it binds to a local port, opens browser, creates a lock file, and serves the React app with CORS restricted to localhost

---

### T-002: React Client Scaffold
**User Story**: US-011 | **Satisfies ACs**: AC-US11-05
**Status**: [x] completed

**Description**: Set up React 18 + Vite + TailwindCSS v4 client with dark theme, router, layout (sidebar + header), and core hooks.

**Files**:
- `src/dashboard/client/index.html`
- `src/dashboard/client/vite.config.ts`
- `src/dashboard/client/tsconfig.json`
- `src/dashboard/client/src/main.tsx`
- `src/dashboard/client/src/App.tsx` (55 lines)
- `src/dashboard/client/src/styles/globals.css`
- `src/dashboard/client/src/components/layout/Sidebar.tsx` (127 lines)
- `src/dashboard/client/src/components/layout/Header.tsx` (39 lines)
- `src/dashboard/client/src/hooks/useApi.ts` (44 lines)
- `src/dashboard/client/src/hooks/useSSE.ts` (83 lines)
- `src/dashboard/client/src/hooks/useProject.ts` (59 lines)
- `src/dashboard/client/src/hooks/useProjectApi.ts` (10 lines)
- `src/dashboard/client/src/hooks/useCommand.ts` (39 lines)

**Test**: Given the client is built with Vite → When loaded in browser → Then sidebar navigation, header with project selector, and router all render correctly

---

### T-003: UI Component Library
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**: Build reusable UI components: KpiCard, Badge, Spinner, EmptyState, StatusDonut chart, BarChart.

**Files**:
- `src/dashboard/client/src/components/ui/KpiCard.tsx` (33 lines)
- `src/dashboard/client/src/components/ui/Badge.tsx` (30 lines)
- `src/dashboard/client/src/components/ui/Spinner.tsx` (17 lines)
- `src/dashboard/client/src/components/ui/EmptyState.tsx` (18 lines)
- `src/dashboard/client/src/components/charts/StatusDonut.tsx` (86 lines)
- `src/dashboard/client/src/components/charts/BarChart.tsx` (37 lines)

**Test**: Given chart data → When StatusDonut renders → Then SVG arcs represent correct proportions of each status

---

## Phase 2: Core Pages (P1 Stories)

### T-004: Overview Page
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed

**Description**: Build overview page with KPI cards (total/active/completed/blocked increments), status donut chart, type and priority bar charts, analytics summary, and cost summary.

**File**: `src/dashboard/client/src/pages/OverviewPage.tsx` (233 lines)

**Test**: Given project data exists → When OverviewPage loads → Then KPI cards show correct counts and charts render with real data

---

### T-005: Increments List and Detail Pages
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**: Build increments list page with status filtering and detail page with task completion, AC checklist, and cost data.

**Files**:
- `src/dashboard/client/src/pages/IncrementsPage.tsx` (180 lines)
- `src/dashboard/client/src/pages/IncrementDetailPage.tsx` (217 lines)

**Test**: Given increments exist → When list page loads → Then all increments shown with status badges, clicking one navigates to detail view

---

### T-006: Analytics Page
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Description**: Build analytics page with event aggregation from events.jsonl. Show top commands/skills/agents leaderboards, daily trends, and success rate.

**File**: `src/dashboard/client/src/pages/AnalyticsPage.tsx` (211 lines)

**Test**: Given events.jsonl contains 352 events → When AnalyticsPage loads → Then leaderboards and success rate display with real aggregated data

---

### T-007: Costs Page
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed

**Description**: Build costs page with Claude Code session log parsing. Per-session token breakdown, model pricing, incremental caching, and Max plan detection.

**Files**:
- `src/dashboard/client/src/pages/CostsPage.tsx` (228 lines)
- `src/dashboard/server/data/claude-log-parser.ts` (229 lines)

**Test**: Given Claude Code session logs exist → When CostsPage loads → Then per-session token costs displayed with model pricing applied

---

### T-008: Errors Page
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

**Description**: Build New Relic-style error tracing page. Parse Claude Code session logs for errors, classify by type, show timeline and detail drilldown.

**File**: `src/dashboard/client/src/pages/ErrorsPage.tsx` (323 lines)

**Test**: Given session logs contain errors → When ErrorsPage loads → Then errors classified by type with timeline and expandable details

---

## Phase 3: Operational Pages (P2 Stories)

### T-009: Sync Page
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed

**Description**: Build sync page with per-platform status cards, audit log, push/pull actions, and proper "never synced" vs "failed" messaging.

**Files**:
- `src/dashboard/client/src/pages/SyncPage.tsx` (258 lines)
- `src/dashboard/server/data/sync-audit-reader.ts` (118 lines)

**Test**: Given sync-metadata.json exists → When SyncPage loads → Then platform status cards show correct sync state and audit entries listed

---

### T-010: Activity Page
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Status**: [x] completed

**Description**: Build real-time activity stream page with SSE-powered event feed. Events categorized and severity-colored.

**Files**:
- `src/dashboard/client/src/pages/ActivityPage.tsx` (204 lines)
- `src/dashboard/server/data/activity-stream.ts` (151 lines)

**Test**: Given SSE connection is active → When events occur → Then activity stream updates in real-time with categorized entries

---

### T-011: Config Page
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03
**Status**: [x] completed

**Description**: Build visual configuration editor for config.json with section-based UI, validation before save, and nested object support.

**File**: `src/dashboard/client/src/pages/ConfigPage.tsx` (290 lines)

**Test**: Given config.json exists → When ConfigPage loads → Then all sections rendered with input controls, validation errors shown on save

---

### T-012: Plugins Page
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-03
**Status**: [x] completed

**Description**: Build plugins page showing installed plugins with skill counts, marketplace refresh action, and command output feedback.

**Files**:
- `src/dashboard/client/src/pages/PluginsPage.tsx` (217 lines)
- `src/dashboard/server/data/plugin-scanner.ts` (111 lines)

**Test**: Given plugins are installed → When PluginsPage loads → Then plugin cards show skill counts and marketplace actions execute with feedback

---

### T-013: Services Page
**User Story**: US-009 | **Satisfies ACs**: AC-US9-02
**Status**: [x] completed

**Description**: Build services page showing LSP status, running services with port assignments, and docs preview control.

**File**: `src/dashboard/client/src/pages/ServicesPage.tsx` (158 lines)

**Test**: Given services are registered → When ServicesPage loads → Then service cards show status and port numbers

---

### T-014: Repos Page
**User Story**: US-009 | **Satisfies ACs**: AC-US9-04
**Status**: [x] completed

**Description**: Build repos page with multi-repo listing and single-project fallback (detect current git repo).

**File**: `src/dashboard/client/src/pages/ReposPage.tsx` (139 lines)

**Test**: Given current directory is a git repo → When ReposPage loads → Then current project shown with branch and remote URL

---

### T-015: Notifications Page
**User Story**: US-010 | **Satisfies ACs**: AC-US10-01, AC-US10-02
**Status**: [x] completed

**Description**: Build notifications page with pending/critical counts and severity categorization.

**File**: `src/dashboard/client/src/pages/NotificationsPage.tsx` (202 lines)

**Test**: Given notifications exist → When NotificationsPage loads → Then notifications displayed grouped by severity

---

## Phase 4: Data Pipeline + Server Data Modules

### T-016: Data Aggregator
**User Story**: US-001, US-002, US-003 | **Satisfies ACs**: AC-US1-01, AC-US3-01
**Status**: [x] completed

**Description**: Build dashboard data aggregator that reads increment metadata, config, state files, and analytics events.

**File**: `src/dashboard/server/data/dashboard-data-aggregator.ts` (249 lines)

**Test**: Given .specweave/ directory exists → When aggregator runs → Then correct increment counts, analytics totals, and config data returned

---

## Phase 5: UX Polish and Data Pipeline Fixes

### T-017: Fix analytics data pipeline
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Analytics page shows all 0s because it reads non-existent `cache.json`. Fix to aggregate from `events.jsonl` directly. Replace `getAnalyticsSummary()` in data aggregator.

---

### T-018: Fix cost extraction pipeline
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01
**Status**: [x] completed

**Description**: Costs page shows $0 because it reads non-existent `costs.json`. Fix to parse Claude Code session JSONL logs with streaming readline. Add incremental cost cache, model pricing table, and Max plan detection.

---

### T-019: Fix sync page UX
**User Story**: US-006 | **Satisfies ACs**: AC-US6-04
**Status**: [x] completed

**Description**: Sync page shows "failed" (red) when `lastImportCount === 0`. Should show "Not synced yet" (neutral gray). Add remediation links.

---

### T-020: Fix repos page single-repo fallback
**User Story**: US-009 | **Satisfies ACs**: AC-US9-04
**Status**: [x] completed

**Description**: Repos page is empty because `scanRepositories()` only checks `repositories/` dir. Add single-repo fallback: detect current project as git repo.

---

### T-021: Activity expandable rows
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01
**Status**: [x] completed

**Description**: Activity rows are flat with truncated text. Add expandable detail rows showing full metadata as formatted JSON.

---

### T-022: Plugin command feedback
**User Story**: US-009 | **Satisfies ACs**: AC-US9-03
**Status**: [x] completed

**Description**: Plugin page buttons are silent — no error/result rendering. Add command output display, error banners, and spinner states.

---

### T-023: Config validation before save
**User Story**: US-008 | **Satisfies ACs**: AC-US8-02
**Status**: [x] completed

**Description**: Config page saves without validation. Add pre-save validation call to `POST /api/config/validate` with inline error display.

---

### T-024: Costs pagination
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02
**Status**: [x] completed

**Description**: Add client-side pagination for sessions table (30 per page) and server-side `?limit=` param support.
