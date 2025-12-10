# Core Platform Team

Owns the foundational infrastructure of SpecWeave including the CLI, configuration management, and core orchestration logic. This team is responsible for the primary user-facing interface and the architectural backbone that all other modules depend on.

## Responsibilities

- Maintain CLI command structure and user interaction flows
- Manage configuration persistence and validation schemas
- Own increment lifecycle state machine and workflow orchestration
- Ensure cross-platform compatibility (Windows/macOS/Linux)
- Define and enforce coding standards and hook system architecture

## Domain Expertise

- TypeScript CLI development
- Commander.js framework
- Zod schema validation
- Cross-platform process management
- State machine design

## Technology Stack

- TypeScript
- Node.js
- Commander.js
- Zod
- ESM modules
- Vitest

## Repositories

- [core](../../../modules/core.md)
- [cli](../../../modules/cli.md)
- [config](../../../modules/config.md)
- [hooks](../../../modules/hooks.md)
- [init](../../../modules/init.md)

## Integration Boundaries

Upstream: None (foundation layer). Downstream: All other modules depend on core/cli/config for configuration, logging, and lifecycle management.

---
*Clustering reasoning: These repos form the foundational layer - core provides orchestration, cli handles user interaction, config manages persistence, hooks enables extensibility, and init handles project bootstrapping. They share tight coupling and similar patterns (Commander.js, Zod validation, cross-platform concerns).*
*Generated on 2025-12-10*