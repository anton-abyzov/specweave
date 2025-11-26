# ADR-0002-001: Agent Types - Roles vs Tools

**Status**: Accepted
**Date**: 2025-10-26
**Increment**: [0002-core-enhancements](../../../../increments/0002-core-enhancements/)

---

## Context

Originally, all agents were **ROLES** (PM, Architect, DevOps, QA Lead, etc.). Each role agent has domain expertise and performs complex, multi-step workflows. Example: PM agent creates PRDs, user stories, roadmaps.

Some capabilities are **TOOLS** rather than roles (diagram generation, code validation, formatting). Tools generate artifacts rather than perform analysis. Tools are invoked for specific outputs, not consultative work.

---

## Decision

We will introduce a new agent category: **TOOL AGENTS**.

### Agent Categories

| Category | Purpose | Examples | Context Window |
|----------|---------|----------|----------------|
| **ROLE** | Domain expertise, consultative | PM, Architect, QA Lead | Separate, large |
| **TOOL** | Artifact generation, specific output | diagrams-architect, code-formatter | Separate, focused |

---

## Consequences

### Positive
- ✅ Clear separation of concerns (roles vs tools)
- ✅ Enables future tool agents (code generators, validators, analyzers)
- ✅ Tool agents can be more focused (smaller context)

### Neutral
- ⚠️ Need to document this distinction in CLAUDE.md
- ⚠️ Skills that coordinate with tool agents become more important

---

## Implementation

- Add `diagrams-architect` as first TOOL agent
- Document distinction in CLAUDE.md#agents-vs-skills-architecture
- Update agent creation guidelines

---

## Related

- **ADR**: [Skills as Coordinators](0002-002-skills-as-coordinators.md) - How skills invoke tool agents
- **Increment**: [0002-core-enhancements](../../../../increments/0002-core-enhancements/)
