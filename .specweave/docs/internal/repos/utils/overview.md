# utils

*Analyzed: 2025-12-10 | Confidence: high**

## Purpose

Utilities for the SpecWeave CLI tool providing skills indexing, documentation preview, translation, project/spec management, session tracking, and validation. This is a collection of helper modules supporting a spec-driven development framework.

## Key Concepts

- Skills progressive disclosure
- Docusaurus documentation preview
- LLM-native translation
- Multi-project spec splitting
- Session registry with atomic file operations
- Structure level detection (1-level vs 2-level)
- Project/board resolution for user stories
- Cross-cutting concern detection
- External resource validation (JIRA/ADO)

## Patterns

- **Dependency Injection via Logger interface** (architecture)
- **Atomic file operations with file locking** (data)
- **YAML frontmatter parsing** (data)
- **Progressive disclosure pattern** (architecture)
- **Repository pattern for session management** (data)
- **Strategy pattern for project resolution** (architecture)
- **Builder pattern for documentation** (structure)
- **Barrel exports for module organization** (structure)
- **ESM module helpers** (structure)
- **Token cost estimation** (integration)
- **External service validation** (integration)
- **Configuration-driven structure detection** (architecture)

## External Dependencies

- JIRA API
- Azure DevOps API
- Docusaurus (documentation framework)
- js-yaml (YAML parsing)
- chalk (terminal coloring)
- @inquirer/prompts (CLI prompts)
- Anthropic Claude API (for translation)

## Observations

- Heavy focus on AI tool integration - skills index enables GitHub Copilot, Cursor, and other AI tools to work with SpecWeave
- Session registry implements robust concurrency handling with file-based locking suitable for multi-process environments
- Translation module uses placeholder preservation pattern to protect code blocks during LLM translation
- Project resolver implements machine learning-like pattern by learning from existing specs
- Pricing constants include all Claude model tiers (Haiku, Sonnet, Opus) with cost calculation utilities
- Structure level detection supports both simple (1-level) and enterprise (2-level with area paths/boards) configurations
- Documentation preview system is self-contained with server management, package installation, and sidebar generation