# adapters

*Analyzed: 2025-12-10 | Confidence: high**

## Purpose

SpecWeave Adapters is an adapter system that enables the SpecWeave spec-driven development framework to work with ANY AI coding tool (Claude Code, Cursor, Gemini CLI, OpenAI Codex, GitHub Copilot, ChatGPT, etc.). It provides tool-specific enhancements while maintaining a tool-agnostic core, with Claude Code as the native/baseline experience and other tools using adapters to approximate its capabilities.

## Key Concepts

- Multi-tool AI adapter pattern
- AGENTS.md universal instruction format
- Automation levels (full/semi/basic/manual)
- Plugin compilation for different AI tools
- Tool detection and auto-selection
- Progressive degradation from full automation to manual workflow
- Skill/Agent/Command extraction and documentation generation
- Context manifest for token efficiency
- Internationalization with system prompt injection

## Patterns

- **Adapter Pattern for Multi-Tool Support** (architecture)
- **Registry Pattern with YAML Configuration** (structure)
- **Template Method Pattern** (architecture)
- **Strategy Pattern for Tool Detection** (architecture)
- **Plugin Compilation System** (integration)
- **YAML Frontmatter Parsing** (data)
- **Internationalization (i18n) with System Prompts** (integration)
- **Cross-Platform Command Detection** (deployment)
- **Package Root Detection** (structure)
- **Markdown Documentation Generation** (integration)

## External Dependencies

- yaml (YAML parsing for registry and frontmatter)
- child_process (execSync for CLI detection)
- path (cross-platform path handling)
- Claude Code CLI (native experience detection)
- Cursor editor (adapter target)
- Gemini CLI (adapter target)
- OpenAI Codex CLI (adapter target)
- GitHub Copilot (reads AGENTS.md)
- ChatGPT/Gemini web (manual AGENTS.md usage)

## Observations

- Claude Code is explicitly NOT an adapter - it's the baseline/native experience that others approximate
- AGENTS.md follows the agents.md universal standard (https://agents.md/) for maximum compatibility
- Automation levels degrade gracefully: full (Claude) -> semi (Cursor/Gemini/Codex) -> manual (Generic)
- Generic adapter always returns true for detect() as universal fallback
- Plugin compilation differs by adapter: Claude uses native plugins, others compile to AGENTS.md
- Context manifests enable 70%+ token savings across all tools
- Each adapter must have minimum 3 test cases in test-cases/ directory
- The system supports both 1-level and 2-level project structures (project only vs project+board)
- README files are duplicated (README.md and readme.md) - likely case sensitivity issue
- Gemini CLI has 1M token context window (5x Claude's 200k)
- Codex provides task-based isolated environments with real-time progress monitoring