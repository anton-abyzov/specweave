---
increment: 0227-prompt-too-long-prevention
title: "Prompt-Too-Long Prevention & Dashboard Visibility"
type: feature
priority: P1
status: active
created: 2026-02-16
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Prompt-Too-Long Prevention & Dashboard Visibility

## Overview

Users on different machines encounter "Prompt is too long" API errors when the total prompt (system prompt + CLAUDE.md + MEMORY.md + skill descriptions + hook output + conversation history) exceeds Claude's context window. This increment adds proactive baseline health checks at session start, emergency budget escalation under context pressure, and real-time error broadcasting to the dashboard.

## User Stories

### US-001: Proactive Prompt Health Check (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** to see a warning at session start when my baseline prompt size is dangerously high
**So that** I can take action before encountering "Prompt is too long" errors

**Acceptance Criteria**:
- [x] **AC-US1-01**: Session-start hook calculates baseline prompt size (CLAUDE.md + MEMORY.md + skill budget + system estimate + hook/turn)
- [x] **AC-US1-02**: Health check writes `prompt-health.json` to `.specweave/state/` with breakdown
- [x] **AC-US1-03**: Warning emitted via systemMessage when baseline > 80K chars
- [x] **AC-US1-04**: Critical alert emitted when baseline > 120K chars with remediation advice

---

### US-002: Emergency Context Budget Escalation (P1)
**Project**: specweave

**As a** SpecWeave user in a long session
**I want** the system to automatically strip all context injection when context pressure is extreme
**So that** my session doesn't crash with "Prompt is too long" errors

**Acceptance Criteria**:
- [x] **AC-US2-01**: PreCompact hook sets level to "emergency" on 3+ compactions
- [x] **AC-US2-02**: PreCompact writes `prompt-health-alert.json` with remediation advice
- [x] **AC-US2-03**: UserPromptSubmit handles "emergency" pressure level by setting budget to "off"
- [x] **AC-US2-04**: One-time remediation message injected when budget auto-reduces to minimal/off

---

### US-003: Real-Time Error Broadcasting in Dashboard (P2)
**Project**: specweave

**As a** SpecWeave dashboard user
**I want** errors (especially prompt_too_long) to appear in real-time without manual page refresh
**So that** I can diagnose issues immediately

**Acceptance Criteria**:
- [x] **AC-US3-01**: FileWatcher watches `prompt-health.json` and `prompt-health-alert.json`, emits `error-detected` SSE events
- [x] **AC-US3-02**: ErrorsPage subscribes to `error-detected` SSE events and auto-refreshes data
- [x] **AC-US3-03**: Dashboard API exposes `/api/prompt-health` endpoint with health + alert data
- [x] **AC-US3-04**: OverviewPage shows a PromptHealthCard with baseline size and pressure level

## Out of Scope

- Controlling Claude Code's internal system prompt size
- Modifying conversation history management (compaction is Claude Code's responsibility)
- Reducing CLAUDE.md template further (already trimmed to ~9KB in v1.0.260)

## Dependencies

- Existing context budget system (v1.0.262)
- Dashboard SSE infrastructure (sse-manager.ts, file-watcher.ts)
- useSSE hook (already used by OverviewPage, Sidebar)
