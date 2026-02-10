---
id: FS-197
title: "0197: Native Agent Teams Integration"
type: feature
status: completed
priority: P1
created: 2026-02-10
lastUpdated: 2026-02-10
tldr: "SpecWeave has a mature parallel agent system (0170) using Claude Code's **Task tool** (subagents)."
complexity: high
stakeholder_relevant: true
---

# 0197: Native Agent Teams Integration

## TL;DR

**What**: SpecWeave has a mature parallel agent system (0170) using Claude Code's **Task tool** (subagents).
**Status**: completed | **Priority**: P1
**User Stories**: 7

![0197: Native Agent Teams Integration illustration](assets/feature-fs-197.jpg)

## Overview

SpecWeave has a mature parallel agent system (0170) using Claude Code's **Task tool** (subagents). However, subagents are isolated — no peer communication, no shared task lists, no real-time coordination. Claude Code's new **experimental Agent Teams** feature provides true collaboration: shared task lists, peer-to-peer messaging, terminal split panes, and full Claude Code instances per teammate.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md) | ✅ completed | 2026-02-10 |

## User Stories

- [US-001: Agent Team Formation with Domain Skills](./us-001-agent-team-formation-with-domain-skills.md)
- [US-002: Contract-First Spawning Protocol](./us-002-contract-first-spawning-protocol.md)
- [US-003: Agent Team Presets](./us-003-agent-team-presets.md)
- [US-004: Terminal Multiplexer Configuration](./us-004-terminal-multiplexer-configuration.md)
- [US-005: SpecWeave Workflow Integration](./us-005-specweave-workflow-integration.md)
- [US-006: Agent Communication Protocol](./us-006-agent-communication-protocol.md)
- [US-007: Documentation and Setup Guide](./us-007-documentation-and-setup-guide.md)
