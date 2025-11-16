---
id: FS-037
title: "Project-Specific Tasks Architecture"
type: feature
status: planning
priority: P1
created: 2025-11-15
lastUpdated: 2025-11-15T22:00:00.000Z
projects: ["specweave"]
sourceIncrement: 0037-project-specific-tasks
---

# Project-Specific Tasks Architecture

## Overview

Implement three-level task hierarchy (Increment → Project → User Story) with bidirectional completion tracking to address the critical gap where multi-project features have only generic increment tasks instead of project-specific implementation tasks. This enables backend and frontend teams to work independently with their own task lists while maintaining synchronization with high-level increment tasks.

## Source

This feature was created from increment: [`0037-project-specific-tasks`](../../../../../increments/0037-project-specific-tasks)

**Architecture Design**: Based on analysis in [PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md](../../../../../increments/0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)

## Business Value

- **Clear Ownership**: Backend and frontend teams have separate task lists (no confusion)
- **Granular Tracking**: Track backend progress independently from frontend (stakeholder visibility)
- **Realistic Task Breakdown**: Increment tasks = goals, project tasks = actual implementation steps
- **Bidirectional Sync**: Completing all project tasks auto-completes increment task (zero manual work)
- **Eliminate Mismatch**: No more generic tasks linking to multiple projects with different implementations

## Problem Statement

**User Feedback**: "instead of just links to Tasks, in fact we MUST have our own project tasks to complete, right? let's consider backend and frontend project. Increment tasks.md has only kind of high level tasks, but they MUST be splitted into tasks to be implemented for each specific project!!!"

**Current Architecture** (WRONG):
```
Increment: tasks.md → Generic tasks (T-001: Implement authentication)
Living Docs: specs/backend/FS-031/us-001-*.md → Links to SAME generic tasks
Living Docs: specs/frontend/FS-031/us-001-*.md → Links to SAME generic tasks
❌ Problem: Both projects link to same tasks, no project-specific breakdown
```

**Required Architecture** (CORRECT):
```
Increment: tasks.md → High-level tasks (T-001: Implement authentication)
                      ↓
Project: specs/backend/FS-031/TASKS.md → T-BE-001: JWT auth service (Node.js)
                                        → T-BE-002: Database schema
                                        → T-BE-003: API endpoint
                      ↓
Project: specs/frontend/FS-031/TASKS.md → T-FE-001: Login form (React)
                                         → T-FE-002: Auth state (Redux)
                                         → T-FE-003: Protected routes
```

## Projects

This feature applies to the SpecWeave framework:
- specweave (core framework changes)

## User Stories by Project

### specweave

- [US-001: Task Splitting Logic (spec-distributor.ts)](../../specweave/FS-037/us-001-task-splitting-logic.md) - planning
- [US-002: Bidirectional Completion Tracking](../../specweave/FS-037/us-002-bidirectional-completion-tracking.md) - planning
- [US-003: GitHub Sync Integration](../../specweave/FS-037/us-003-github-sync-integration.md) - planning
- [US-004: Testing & Migration Strategy](../../specweave/FS-037/us-004-testing-migration-strategy.md) - planning

## Progress

- **Total Stories**: 4
- **Completed**: 0
- **Progress**: 0%

## Success Metrics

- **Task Splitting Accuracy**: 95%+ tasks correctly classified by project (backend vs frontend)
- **Bidirectional Sync Correctness**: 100% completion state consistency (no orphaned tasks)
- **GitHub Issue Quality**: External stakeholders can see project-specific progress without repository access
- **Developer Experience**: Backend/frontend teams report clear task ownership (user survey)

## Implementation Phases

1. **Phase 1: Task Splitting** (spec-distributor.ts) - 4-6 hours
2. **Phase 2: Bidirectional Tracking** (completion-calculator.ts) - 4-6 hours
3. **Phase 3: GitHub Sync** (github-feature-sync.ts, user-story-issue-builder.ts) - 3-4 hours
4. **Phase 4: Testing & Migration** (unit, integration, E2E tests) - 4-6 hours

**Total Estimated Effort**: 15-20 hours
