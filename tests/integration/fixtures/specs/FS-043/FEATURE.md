---
title: "Task/Epic Synchronization via Syncing Hooks"
feature_id: FS-043
status: completed
priority: P0
---

# FS-043: Task/Epic Synchronization via Syncing Hooks

Implement automatic synchronization between SpecWeave increments and external tools (GitHub, JIRA, Azure DevOps) using post-task-completion hooks.

## User Stories

- [US-001: Sync Increment Metadata](./us-001-sync-metadata.md)
- [US-002: Hook Integration](./us-002-hook-integration.md)
- [US-003: Status Propagation](./us-003-status-propagation.md)

## Overview

This feature enables bidirectional synchronization where:
- **Content** (title, description, user stories) flows from SpecWeave → External Tools
- **Status** (workflow state) flows from External Tools → SpecWeave
