# core

*Analyzed: 2025-12-10 | Confidence: high**

## Purpose

SpecWeave is a spec-driven development framework CLI tool that provides AI-native workflow orchestration with living documentation, intelligent agents for Claude Code integration, and multi-system synchronization with external tools (GitHub Issues, JIRA, Azure DevOps). It enables incremental development with permanent specifications and temporary work increments.

## Key Concepts

- Increments (temporary work units with tasks.md, spec.md, plan.md)
- Living Documentation (auto-synced hierarchical docs)
- External Tool Synchronization (GitHub/JIRA/ADO bidirectional sync)
- Workflow Orchestration (phase detection, autonomous execution)
- Multi-project Architecture (1-level and 2-level with boards/area paths)
- Sync Profiles (multi-provider configuration)
- Background Jobs (long-running imports, cloning)
- Hook System (pre/post tool-use, session lifecycle)
- LLM Provider Abstraction (multi-provider AI analysis)
- Feature-to-Increment Traceability

## Patterns

- **REST API Integration with Axios** (api)
- **Multi-Provider LLM Abstraction** (integration)
- **YAML/JSON Configuration Management** (structure)
- **Singleton Registry Pattern** (architecture)
- **Plugin Architecture** (architecture)
- **Background Job Processing** (architecture)
- **Event-Driven Hook System** (architecture)
- **State Machine for Increment Lifecycle** (architecture)
- **Repository Pattern for External Tools** (data)
- **Zod Schema Validation** (data)
- **Handlebars Template Engine for IaC** (cloud)
- **Multi-Platform Git Provider Abstraction** (integration)
- **Credential Management with Environment Variables** (security)
- **Circuit Breaker for Sync Operations** (architecture)
- **Vitest Unit Testing Framework** (testing)
- **Playwright E2E Testing** (testing)
- **TypeScript Strict Mode with ESM** (structure)
- **Commander.js CLI Framework** (structure)
- **Serverless Platform Intelligence** (cloud)
- **Internationalization (i18n)** (structure)
- **Living Documentation Hierarchy** (structure)
- **Discrepancy Detection (Code-to-Spec)** (architecture)

## External Dependencies

- GitHub API (via @octokit/rest)
- JIRA REST API v3
- Azure DevOps REST API
- Anthropic Claude API (via @anthropic-ai/sdk)
- OpenAI API (optional)
- Azure OpenAI (optional)
- AWS Bedrock (optional)
- Google Vertex AI (optional)
- Ollama (optional, local LLM)

## Observations

- Heavily architected for Claude Code integration with extensive hook system for AI tool-use events
- Enterprise-grade multi-project support with 1-level (project) and 2-level (project+board/area-path) hierarchies
- Comprehensive sync settings with granular permissions (canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus)
- Background job system for long-running operations (10K+ issue imports) with detached process spawning
- Strong emphasis on safety rules in CLAUDE.md including context management, file size limits, and crash prevention
- Living documentation pattern where specs are source-of-truth and auto-sync to external tools
- Feature-to-Increment traceability with FS-XXX → increment → US → task hierarchy
- Multi-LLM provider support with cost tracking and fallback configurations
- Extensive error hierarchy (SpecWeaveError → ConfigError/SyncError/ImportError/etc.)
- Brownfield project support with importer, analyzer, and discrepancy detection for existing codebases