---
increment: 0109-external-items-dashboard
project: specweave
status: planning
created: 2025-12-05
---

# External Items Dashboard

## Problem Statement

When creating new increments or checking project status, users have no visibility into pending external work items (GitHub issues, JIRA tickets, ADO work items). This leads to:

1. Accumulated unaddressed external items (e.g., 4 "DORA Metrics Workflow Failed" GitHub issues)
2. No proactive notification during increment planning
3. Missing dashboard for external items overview
4. No indicators in status line or progress commands

## Solution Overview

Implement an External Items Dashboard that:
1. Aggregates open items from configured external tools (GitHub, JIRA, ADO)
2. Displays summary in `/specweave:status` and `/specweave:progress` commands
3. Shows notification during `/specweave:increment` planning
4. Provides brief indicator format for status line
5. Offers dedicated `/specweave:external` command for detailed view

---

## User Stories

### US-001: View External Items in Status Command

**As a** developer using SpecWeave
**I want to** see a summary of open external items when running `/specweave:status`
**So that** I'm aware of pending work in GitHub/JIRA/ADO without leaving the terminal

#### Acceptance Criteria

- [ ] **AC-US1-01**: Status command shows external items section after increment list
- [ ] **AC-US1-02**: Display format: `📋 External (open): GH:4 JI:0 ADO:0`
- [ ] **AC-US1-03**: Per-project breakdown shown when multiple projects configured
- [ ] **AC-US1-04**: Stale items (>7 days) indicated with warning: `GH:4 (2⚠️ stale)`
- [ ] **AC-US1-05**: Section hidden when no external tools configured

---

### US-002: Get Notified During Increment Planning

**As a** developer creating a new increment
**I want to** be notified about open external items before finalizing the increment
**So that** I can decide whether to address existing items or create new work

#### Acceptance Criteria

- [ ] **AC-US2-01**: Notification shown after increment planning completes
- [ ] **AC-US2-02**: Format: `⚠️ 4 unaddressed external items. View details? [y/n]`
- [ ] **AC-US2-03**: Selecting 'y' shows detailed list with titles and links
- [ ] **AC-US2-04**: Notification skipped when 0 open items

---

### US-003: View External Items in Dedicated Command

**As a** developer
**I want to** run `/specweave:external` to see a detailed dashboard of all external items
**So that** I can review and triage pending work from all providers

#### Acceptance Criteria

- [ ] **AC-US3-01**: Command shows items grouped by provider (GitHub, JIRA, ADO)
- [ ] **AC-US3-02**: Each item displays: number, title, age, labels, URL
- [ ] **AC-US3-03**: Items sorted by age (oldest first)
- [ ] **AC-US3-04**: Stale items (>7 days) highlighted with warning
- [ ] **AC-US3-05**: Summary line at bottom: `Total: 4 open (2 stale)`
- [ ] **AC-US3-06**: Option `--refresh` forces cache refresh

---

### US-004: See Brief Indicator in Progress Footer

**As a** developer running long operations
**I want to** see a brief external items indicator in progress output
**So that** I'm reminded of pending work without cluttering the display

#### Acceptance Criteria

- [ ] **AC-US4-01**: Footer line added to progress display: `📋 4 external items open`
- [ ] **AC-US4-02**: Footer hidden when 0 open items
- [ ] **AC-US4-03**: Uses cached data (no API calls during progress)

---

## Technical Requirements

### TR-001: Caching Strategy
- Cache TTL: 15 minutes (balance freshness vs API limits)
- Cache location: `.specweave/cache/external-items-summary.json`
- Stale cache fallback for rate limiting scenarios
- Force refresh option for commands

### TR-002: Provider Abstraction
- Unified interface for GitHub, JIRA, ADO
- Use existing client libraries (github-client-v2, ado-client-v2, jira clients)
- Graceful handling when provider not configured

### TR-003: Display Formatting
- Consistent with existing SpecWeave terminal output
- Use chalk.js for colors
- Support for both verbose and brief modes

---

## Out of Scope

- Automatic import of external items into increments
- Bidirectional sync (already exists in other commands)
- Filtering by label/assignee (future enhancement)
- Status line integration (deferred to separate increment)
