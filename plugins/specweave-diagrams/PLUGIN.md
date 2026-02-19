# Architecture Diagrams Plugin

**Version**: 1.0.0
**Author**: SpecWeave Contributors
**License**: MIT

## Description

Create and manage architecture diagrams following C4 Model conventions and SpecWeave standards. Generate Mermaid diagrams for system context, containers, components, sequences, entity relationships, and deployment architectures. Ensures diagrams are accurate, properly validated, and follow established naming and placement conventions.

## Skills

| Skill | Description |
|-------|-------------|
| diagrams-architect | Expert in creating Mermaid diagrams following C4 Model and SpecWeave conventions - system architecture, sequence, ER, deployment diagrams |
| diagrams-generator | Lightweight coordinator that detects diagram requests and delegates to diagrams-architect for generation |

## Commands

| Command | Description |
|---------|-------------|
| (Integrated skills - no separate commands) | Skills activate automatically when diagrams are requested |

## Installation

```bash
vskill add specweave --plugin sw-diagrams
```

## Requirements

- SpecWeave core plugin (sw@specweave)
- VS Code with Mermaid Preview extension (for validation)
