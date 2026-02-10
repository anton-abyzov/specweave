---
id: FS-155
title: Native Claude Code Plugin/Skill Architecture
type: feature
status: completed
priority: P0
created: 2026-01-06
lastUpdated: 2026-01-14
external_tools:
  github:
    type: milestone
    id: 74
    url: https://github.com/anton-abyzov/specweave/milestone/74
---

# Native Claude Code Plugin/Skill Architecture

## Overview

SpecWeave's 24 plugins with ~40 agents are **NOT activating** in user projects because the architecture doesn't match Claude Code's native patterns:

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0155-native-plugin-skill-architecture](../../../../increments/0155-native-plugin-skill-architecture/spec.md) | ✅ completed | 2026-01-06 |

## User Stories

- [US-001: Convert PM Agent to Skill](./us-001-convert-pm-agent-to-skill.md)
- [US-002: Convert Architect Agent to Skill](./us-002-convert-architect-agent-to-skill.md)
- [US-003: Convert Tech-Lead Agent to Skill](./us-003-convert-tech-lead-agent-to-skill.md)
- [US-004: Flatten TRUE Agents](./us-004-flatten-true-agents.md)
- [US-005: Update CLAUDE.md Template](./us-005-update-claude-md-template.md)
- [US-006: Tests for Skill Activation](./us-006-tests-for-skill-activation.md)
