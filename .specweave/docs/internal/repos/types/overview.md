# types

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

TypeScript type definitions library for the SpecWeave framework, providing strongly-typed interfaces for session management, AI model selection, living documentation, dashboard caching, and cost tracking systems.

## Key Concepts

- Session lifecycle management (Claude Code sessions, watchdogs, heartbeats)
- Intelligent AI model selection (Opus, Haiku, Sonnet routing)
- Living documentation with format preservation for external tools
- Dashboard caching for O(1) status queries
- Cost tracking and token usage optimization
- Increment-based work management (features, hotfixes, bugs)

## Patterns

- **TypeScript Interface-First Design** (architecture)
- **Factory Functions for Default Values** (architecture)
- **Versioned Schema for Data Migration** (data)
- **Event-Driven Session Management** (architecture)
- **Multi-Platform Integration (GitHub, JIRA, ADO)** (integration)
- **AI Model Cost Optimization Strategy** (architecture)
- **Priority-Based Work Management** (structure)
- **Cache Invalidation via mtime Tracking** (data)
- **ISO-8601 Timestamp Standard** (data)
- **Discriminated Union Types** (architecture)

## External Dependencies

- GitHub Issues API (external_tools.github)
- JIRA API (external_tools.jira)
- Azure DevOps API (external_tools.ado)
- Claude AI Models (Opus 4.5, Haiku 4.5, Sonnet 4)

## Observations

- Pure type definitions with no runtime dependencies - can be compiled to .d.ts files
- Format preservation feature (T-034A, v0.23.0) enables comment-only sync for external items
- Dashboard cache designed for O(1) reads with incremental updates on file changes
- Cost tracking calculates savings vs all-Sonnet baseline for model optimization
- Session registry supports parent-child relationships for process hierarchies
- External item IDs use 'E' suffix convention (US-001E, FS-XXXE) for external origin
- Three-layer external tool caching: frontmatter cache → Layer 1 idempotency (<1ms)
- Model selection supports fallback behaviors: 'strict' | 'flexible' | 'auto'