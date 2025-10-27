---
name: jira-sync
description: Sync SpecWeave increments with JIRA epics/stories. Activates for JIRA sync, create JIRA issue, import from JIRA, sync to JIRA. Coordinates with specweave-jira-mapper agent.
allowed-tools: Read, Write, Edit, Task, Bash
---

# JIRA Sync Skill

Coordinates JIRA synchronization by delegating to `specweave-jira-mapper` agent.

## Responsibilities

1. Detect sync requests (export, import, bidirectional)
2. Validate prerequisites (JIRA credentials, increment structure)
3. Invoke `specweave-jira-mapper` agent
4. Handle errors gracefully

## Usage

**Export**: `/sync-jira export 0001`
**Import**: `/sync-jira import PROJ-123`
**Sync**: `/sync-jira sync 0001`

All conversion logic is handled by the `specweave-jira-mapper` agent.
