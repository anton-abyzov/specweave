---
increment: 0210-enterprise-dashboard
title: "Enterprise Dashboard - Real-time Observability"
type: feature
priority: P1
status: active
created: 2026-02-14
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Enterprise Dashboard - Real-time Observability

## Overview

A full-stack web dashboard launched via `specweave dashboard` providing New Relic-style observability for SpecWeave projects. Displays real-time increment status, agent activity, token consumption, sync health, error tracing, and analytics in a sleek, modern UI. The dashboard reads `.specweave/` state and Claude Code session logs, providing a global observability tool for spec-driven development workflows.

**Key Decisions** (from PM interview):
- **Deployment**: Local CLI command (`specweave dashboard`) — zero config, reads filesystem directly
- **Tech Stack**: React 18 + Vite + TailwindCSS v4 (dark theme)
- **Real-time**: SSE + filesystem watching (unidirectional, auto-reconnect)
- **Scope**: Full analytics MVP — all pages, charts, token tracking, sync audit, error tracing

## User Stories

### US-001: Project Overview Dashboard (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** a single overview page showing KPI cards, increment status breakdown, and key metrics
**So that** I can instantly understand project health at a glance

**Acceptance Criteria**:
- [x] **AC-US1-01**: Overview page displays total/active/completed/blocked increment counts as KPI cards
- [x] **AC-US1-02**: Status donut chart shows distribution of increment statuses
- [x] **AC-US1-03**: Type and priority breakdowns displayed with bar charts
- [x] **AC-US1-04**: Analytics summary (event count, success rate, 24h events) visible on overview
- [x] **AC-US1-05**: Cost summary (total cost, savings, token count) visible on overview

---

### US-002: Increment Management (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** to browse, filter, and drill into individual increments
**So that** I can track progress and review task/AC completion for each increment

**Acceptance Criteria**:
- [x] **AC-US2-01**: Increments list page shows all increments with status badges and filtering
- [x] **AC-US2-02**: Increment detail page shows task completion status, AC checklist, and cost data
- [x] **AC-US2-03**: Clicking an increment navigates to its detail view

---

### US-003: Analytics and Event Tracking (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** to see event analytics including command usage, skill activations, and agent spawns
**So that** I can understand how the tool is being used and optimize my workflow

**Acceptance Criteria**:
- [x] **AC-US3-01**: Analytics page aggregates events from `events.jsonl` (commands, skills, agents)
- [x] **AC-US3-02**: Top commands, top skills, and top agents leaderboards displayed
- [x] **AC-US3-03**: Daily summary chart shows event trends over time
- [x] **AC-US3-04**: Success rate metric calculated and displayed

---

### US-004: Token Cost Tracking (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** to see token consumption and estimated costs from Claude Code sessions
**So that** I can monitor API spend and understand usage patterns

**Acceptance Criteria**:
- [x] **AC-US4-01**: Costs page parses Claude Code session JSONL logs for token usage
- [x] **AC-US4-02**: Per-session breakdown shows model, input/output/cache tokens, and calculated cost
- [x] **AC-US4-03**: Model pricing table applied (opus-4, sonnet-4.5, haiku-4.5 rates)
- [x] **AC-US4-04**: Incremental caching prevents re-parsing of already-analyzed sessions
- [x] **AC-US4-05**: Max plan detection (when all costs are $0, flag subscription usage)

---

### US-005: Error Tracing (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** New Relic-style error investigation from Claude Code session logs
**So that** I can diagnose prompt_too_long, api_error, tool_failure, and hook_error issues

**Acceptance Criteria**:
- [x] **AC-US5-01**: Errors page parses Claude Code JSONL session logs for error events
- [x] **AC-US5-02**: Errors classified by type (prompt_too_long, api_error, tool_failure, hook_error, rate_limit)
- [x] **AC-US5-03**: Error timeline and detail drilldown available
- [x] **AC-US5-04**: Session context shown alongside errors for investigation

---

### US-006: External Sync Audit (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** to see sync status for GitHub/JIRA/ADO integrations with audit trails
**So that** I can monitor integration health and troubleshoot sync failures

**Acceptance Criteria**:
- [x] **AC-US6-01**: Sync page shows per-platform status cards (GitHub, JIRA, ADO)
- [x] **AC-US6-02**: Sync audit log with timestamps and operation details displayed
- [x] **AC-US6-03**: Push/pull sync actions executable from the dashboard
- [x] **AC-US6-04**: Distinguishes "never synced" from "sync failed" states

---

### US-007: Real-time Activity Stream (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** a unified real-time feed of all events (commands, sync, hooks, errors, costs)
**So that** I can monitor what's happening across the system as it happens

**Acceptance Criteria**:
- [x] **AC-US7-01**: Activity page displays real-time event stream via SSE
- [x] **AC-US7-02**: Events categorized by type (command, sync, hook, error, cost, notification)
- [x] **AC-US7-03**: Events include severity levels and source attribution
- [x] **AC-US7-04**: 13 SSE event types supported (heartbeat, increment-update, analytics-event, cost-update, notification, sync-update, sync-audit, error-detected, config-changed, activity, command-output, command-complete, job-progress)

---

### US-008: Configuration Editor (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** a visual editor for `config.json` with validation
**So that** I can modify SpecWeave configuration without manually editing JSON

**Acceptance Criteria**:
- [x] **AC-US8-01**: Config page renders all config sections with appropriate input types
- [x] **AC-US8-02**: Validation runs before saving and errors shown inline
- [x] **AC-US8-03**: Nested config objects rendered with depth support

---

### US-009: Plugin and Service Management (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** to see installed plugins, skill usage stats, and running services
**So that** I can manage the plugin ecosystem and service ports

**Acceptance Criteria**:
- [x] **AC-US9-01**: Plugins page shows installed plugins with skill counts and marketplace actions
- [x] **AC-US9-02**: Services page shows LSP status, running services, and port assignments
- [x] **AC-US9-03**: Command execution from dashboard with output feedback
- [x] **AC-US9-04**: Repos page shows connected repositories (multi-repo or current project fallback)

---

### US-010: Notifications Center (P2)
**Project**: specweave

**As a** SpecWeave developer
**I want** a notifications page showing pending items, sync alerts, and critical warnings
**So that** I don't miss important system events

**Acceptance Criteria**:
- [x] **AC-US10-01**: Notifications page displays pending and critical notification counts
- [x] **AC-US10-02**: Notifications categorized by severity and source

---

### US-011: Dashboard Infrastructure (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** the dashboard to launch via `specweave dashboard` with zero configuration
**So that** I can start monitoring instantly

**Acceptance Criteria**:
- [x] **AC-US11-01**: CLI command `specweave dashboard` starts local HTTP server and opens browser
- [x] **AC-US11-02**: Server uses native `http` module with custom micro-router (zero runtime deps)
- [x] **AC-US11-03**: CORS restricted to localhost origins only
- [x] **AC-US11-04**: Singleton lock file prevents multiple instances
- [x] **AC-US11-05**: Multi-project support via project context switching
- [x] **AC-US11-06**: File watcher monitors `.specweave/` for real-time updates

## Functional Requirements

### FR-001: Zero-Dependency Server
Server uses native Node.js `http` module with a custom micro-router supporting path params, CORS, and body parsing. No Express or other runtime dependencies.

### FR-002: SSE Real-time Updates
Server-Sent Events push 13 event types to connected clients. File watcher triggers SSE events on `.specweave/` changes. Auto-reconnect on client side.

### FR-003: Claude Code Log Parsing
Streaming JSONL parser reads Claude Code session logs (~5000+ files, up to 91MB each) for token extraction and error tracing. Incremental cost caching for performance.

### FR-004: Multi-Project Awareness
Dashboard detects and switches between multiple SpecWeave projects. Per-project file watchers and data aggregation.

## Success Criteria

- Dashboard launches in <3 seconds via CLI command
- All 13 pages render with real data from filesystem
- SSE events arrive within 1 second of file changes
- Cost parsing of 200 sessions completes in <30 seconds (first run), <100ms (cached)
- Zero runtime dependencies added to production bundle

## Out of Scope

- Cloud/hosted deployment (local only for v1)
- User authentication (localhost-only access)
- Database storage (filesystem reads only)
- Mobile-responsive layout (desktop-first)
- Historical data beyond Claude Code session logs

## Dependencies

- Node.js 18+ (native `http` module, `fs.watch`)
- React 18, Vite, TailwindCSS v4 (devDependencies only)
- Existing `.specweave/` directory structure
- Claude Code session logs at `~/.claude/projects/<slug>/`
