# ADR-0002-002: Skills as Coordinators for Tool Agents

**Status**: Accepted
**Date**: 2025-10-26
**Increment**: [0002-core-enhancements](../../../../increments/0002-core-enhancements/)

---

## Context

- Skills are lightweight capabilities that extend Claude's functionality
- Skills share main conversation context
- Some skills already coordinate with role agents (role-orchestrator)

Tool agents need to be invoked from user requests. Direct invocation requires user to know agent names. Better UX: user describes intent, skill detects and coordinates.

---

## Decision

We will use **SKILLS AS COORDINATORS** for tool agents.

### Pattern

```
User Request
    ↓
Skill (Auto-detect & Validate)
    ↓
Tool Agent (Generate Artifact)
    ↓
Skill (Save & Confirm)
    ↓
User Confirmation
```

### Example

```
User: "Create C4 context diagram for authentication"
    ↓
diagrams-generator skill (activates via description keywords)
    ↓
diagrams-architect agent (generates Mermaid diagram)
    ↓
diagrams-generator skill (saves to correct location)
    ↓
"✅ Diagram saved to .specweave/docs/internal/architecture/diagrams/auth.c4-context.mmd"
```

---

## Consequences

### Positive
- ✅ Better UX (natural language requests)
- ✅ Skills handle file I/O (agents focus on generation)
- ✅ Skills can validate inputs/outputs

### Neutral
- ⚠️ Each tool agent should have a coordinator skill

### Negative
- ❌ Adds complexity (two components instead of one)

---

## Why Not a Single Agent?

- Skills activate automatically (better UX)
- Skills handle file operations (separation of concerns)
- Agents focus on artifact generation (cleaner prompts)
- Pattern scales (one skill can coordinate multiple tool agents)

---

## Implementation

- Create `diagrams-generator` skill as coordinator
- Skill detects diagram requests (keywords: "create diagram", "C4", "sequence", etc.)
- Skill validates request, invokes agent, saves output
- Document pattern in CLAUDE.md

---

## Related

- **ADR**: [Agent Types](0002-001-agent-types-roles-vs-tools.md) - ROLE vs TOOL distinction
- **Increment**: [0002-core-enhancements](../../../../increments/0002-core-enhancements/)
