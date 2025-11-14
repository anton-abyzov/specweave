<!-- ⚠️ AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

# Context Management Architecture

**Purpose**: Achieve efficient context usage through Claude's native progressive disclosure and sub-agent parallelization.

**Key Principle**: Leverage built-in Claude Code mechanisms instead of custom systems.

**Related Documentation**:
- [ADR-0002: Context Loading](./adr/0002-context-loading.md) - Architecture decision
- **Context Optimization** - Built into SpecWeave core plugin via progressive disclosure pattern
- [Claude Skills Documentation](https://support.claude.com/en/articles/12512176-what-are-skills) - How skills work
- [Agent Skills Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Anthropic's approach
- [Sub-Agents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents) - How sub-agents isolate context
