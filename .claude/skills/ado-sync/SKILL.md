---
name: ado-sync
description: Sync SpecWeave increments with Azure DevOps Epics/Features/User Stories. Activates for ADO sync, Azure DevOps sync, create ADO work item, import from ADO. Coordinates with specweave-ado-mapper agent.
allowed-tools: Read, Write, Edit, Task, Bash
---

# ADO Sync Skill

Coordinates Azure DevOps synchronization by delegating to `specweave-ado-mapper` agent.

## Responsibilities

1. Detect sync requests (export, import, bidirectional)
2. Validate prerequisites (ADO PAT, Area Path, Iteration)
3. Invoke `specweave-ado-mapper` agent
4. Handle errors gracefully

## Usage

**Export**: `/sync-ado export 0001`
**Import**: `/sync-ado import 12345`
**Sync**: `/sync-ado sync 0001`

All conversion logic is handled by the `specweave-ado-mapper` agent.
