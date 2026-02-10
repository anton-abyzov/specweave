---
id: US-002
feature: FS-195
title: "Smart Routing Between CLI and MCP"
status: completed
priority: P1
created: 2026-02-10
tldr: "Smart Routing Between CLI and MCP"
project: specweave
---

# US-002: Smart Routing Between CLI and MCP

**Feature**: [FS-195](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Detection utility identifies whether `@playwright/cli` is installed
- [x] **AC-US2-02**: `sw-testing:ui-automate` routes to CLI for script generation tasks
- [x] **AC-US2-03**: `sw-testing:ui-inspect` routes to MCP for interactive element inspection
- [x] **AC-US2-04**: Fallback to MCP if CLI is not installed (graceful degradation)

---

## Implementation

**Increment**: [0195-playwright-cli-integration](../../../../increments/0195-playwright-cli-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
