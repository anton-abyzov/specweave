# cli

*Analyzed: 2025-12-10 | Confidence: high**

## Purpose

SpecWeave is a spec-driven development framework and CLI tool that integrates with Claude Code AI to enable living documentation, increment-based workflow management, and bidirectional synchronization with external issue trackers (GitHub, JIRA, Azure DevOps). It provides multilingual support across 9 languages and implements enterprise-grade traceability through permanent specifications and temporary increments.

## Key Concepts

- Increment-based development workflow
- Living documentation generation
- Bidirectional sync with GitHub/JIRA/ADO
- LLM-powered analysis (Claude Code, Anthropic, OpenAI)
- Background job management with checkpoint/resume
- Session registry for zombie process detection
- Multi-project and multi-repository support
- Internationalization (9 languages)
- DORA metrics calculation
- Plugin architecture with specialized agents

## Patterns

- **REST API Client with Pagination and Rate Limiting** (api)
- **Adapter Pattern for Multi-Platform Support** (architecture)
- **Background Job Worker Pattern** (architecture)
- **File-based Locking for Concurrency** (data)
- **Configuration Management with JSON Schema Validation** (structure)
- **Plugin Architecture** (architecture)
- **Session Registry for Process Management** (architecture)
- **Internationalization (i18n)** (integration)
- **DORA Metrics Calculation** (integration)
- **Bidirectional Sync with External Tools** (integration)
- **Increment Lifecycle State Machine** (architecture)
- **Intelligent Codebase Analysis Pipeline** (architecture)
- **Interactive CLI Wizard** (structure)
- **Credential Management Pattern** (security)
- **Hook System for Event-Driven Actions** (architecture)
- **Direct Function Invocation Pattern** (architecture) - Avoids Commander.js double-parsing antipattern
- **Unit Testing with Vitest** (testing)
- **E2E Testing with Playwright** (testing)

## External Dependencies

- GitHub API (via Octokit)
- JIRA REST API v3
- Azure DevOps REST API
- Claude Code CLI
- Anthropic API
- OpenAI API
- Azure OpenAI
- AWS Bedrock
- Google Vertex AI
- Ollama (local LLM)

## Observations

- Sophisticated multi-platform CLI tool for AI-assisted development workflows
- Heavy emphasis on preventing data loss through validation hooks and guards
- Comprehensive session management to handle zombie/orphan processes
- Production-grade patterns: file locking, checkpoint/resume, rate limiting
- Plugin system enables extensibility for different issue trackers and cloud providers
- Strong separation of concerns: CLI → Core → Integrations → Utils
- Background workers for long-running operations (import, clone, living-docs generation)
- Multilingual support built into core architecture
- DORA metrics integration for DevOps performance measurement
- Docusaurus integration for documentation site preview
- **Direct Function Invocation Pattern** (v1.0.91+): CLI commands export executable functions that are called directly from `bin/specweave.js`, avoiding Commander.js double-parsing antipattern that caused "too many arguments" errors
- **Instant Commands**: jobs, status, progress, workflow, costs, analytics use hook-based execution in CLI (<100ms) and command file fallback in VSCode