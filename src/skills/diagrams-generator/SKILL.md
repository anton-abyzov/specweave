---
name: diagrams-generator
description: Generate Mermaid diagrams following C4 conventions. Activates for create diagram, system diagram, architecture diagram, C4 diagram, sequence diagram, ER diagram, data model. Coordinates with diagrams-architect agent.
allowed-tools: Read, Write, Edit, Task
---

# Diagrams Generator Skill

Coordinates diagram generation by delegating to `diagrams-architect` agent.

## Responsibilities

1. Detect diagram requests (C4, sequence, ER, deployment)
2. Load source documentation
3. Invoke `diagrams-architect` agent
4. Save diagrams to correct locations

## Usage

**C4 Context**: "Create C4 context diagram"
**C4 Component** (LLD): "Create component diagram for Auth Service"
**Sequence**: "Create login flow diagram"
**ER Diagram**: "Create data model for auth module"

All diagram logic is handled by the `diagrams-architect` agent.
