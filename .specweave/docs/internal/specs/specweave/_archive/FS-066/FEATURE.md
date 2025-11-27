---
id: FS-066
title: "Multi-Project JIRA/ADO Import During Init"
type: feature
status: completed
priority: P1
created: 2025-11-26T14:00:00Z
lastUpdated: 2025-11-26
---

# Multi-Project JIRA/ADO Import During Init

## Overview

Currently `specweave init` only imports from a single JIRA project or ADO project. The infrastructure for multi-project support exists (2-level folder structure, board/area path selection helpers), but it's not wired into the init flow.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0066-multi-project-jira-ado-init](../../../../increments/0066-multi-project-jira-ado-init/spec.md) | ✅ completed | 2025-11-26T14:00:00Z |

## User Stories

- [US-001: Multi-Project JIRA Import](../../specweave/FS-066/us-001-multi-project-jira-import.md)
- [US-002: Multi-Area ADO Import](../../specweave/FS-066/us-002-multi-area-ado-import.md)
- [US-003: Smart Defaults Based on Structure](../../specweave/FS-066/us-003-smart-defaults-based-on-structure.md)
