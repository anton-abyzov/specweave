---
id: FS-192
title: "GitHub Sync V2: Spec-to-Issue, Projects V2, Multi-Repo & Agent Teams"
type: feature
status: completed
priority: P1
created: "2026-02-06T00:00:00.000Z"
lastUpdated: 2026-02-10
tldr: "Complete the GitHub sync implementation to support real-world multi-repository microservices teams."
complexity: high
stakeholder_relevant: true
---

# GitHub Sync V2: Spec-to-Issue, Projects V2, Multi-Repo & Agent Teams

## TL;DR

**What**: Complete the GitHub sync implementation to support real-world multi-repository microservices teams.
**Status**: completed | **Priority**: P1
**User Stories**: 6

![GitHub Sync V2: Spec-to-Issue, Projects V2, Multi-Repo & Agent Teams illustration](assets/feature-fs-192.jpg)

## Overview

Complete the GitHub sync implementation to support real-world multi-repository microservices teams. The old increment-based sync was correctly removed (v0.17.0), but the replacement spec-based sync was never fully built. This increment delivers: bidirectional spec-to-GitHub-Issue sync, GitHub Projects V2 board integration (replacing deprecated Classic Projects), distributed multi-repo sync for microservices, an Agent Teams orchestration skill, and cleanup of deprecated code.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md) | ✅ completed | 2026-02-06T00:00:00.000Z |

## User Stories

- [US-001: Spec-to-GitHub Issue Sync (Push Direction) (P1)](./us-001-spec-to-github-issue-sync-push-direction-p1-.md)
- [US-002: GitHub-to-Spec Pull Sync (P1)](./us-002-github-to-spec-pull-sync-p1-.md)
- [US-003: GitHub Projects V2 Board Integration (P1)](./us-003-github-projects-v2-board-integration-p1-.md)
- [US-004: Multi-Repo Distributed Sync (P2)](./us-004-multi-repo-distributed-sync-p2-.md)
- [US-005: Agent Teams Orchestration Skill (P2)](./us-005-agent-teams-orchestration-skill-p2-.md)
- [US-006: Deprecated Code Cleanup (P3)](./us-006-deprecated-code-cleanup-p3-.md)
