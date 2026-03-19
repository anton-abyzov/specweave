import CommandTabs from '@site/src/components/CommandTabs';

# Key Features

SpecWeave provides a comprehensive suite of tools and workflows for building production-grade software with AI assistance.

## Three Ways to Work

SpecWeave understands what you want. Just describe it -- or use precise commands when you prefer control.

### Natural Language (Recommended)

**Perfect for:** Everyone, especially new users

Just describe what you want. SpecWeave detects your intent and activates the right skill:

<CommandTabs
  natural="Build a very simple web calculator app"
  claude='sw:increment "web calculator app"'
  other='increment "web calculator app"'
/>

SpecWeave guides you through approach selection, feature selection, tech stack choice, and review. 2 minutes from idea to working code.

### Slash Commands (Power Users)

**Perfect for:** Claude Code users who want precision

```bash
sw:increment "user authentication"
sw:do
sw:done
```

### Other AI Tools

**Perfect for:** Cursor, Copilot, Windsurf, and other AI coding tools

Use the same command names without the `sw:` prefix:
```
increment "user authentication"
do
done
```

**All three methods** trigger the same plugin system and multi-agent architecture under the hood.

---

## Specification-First Development

Maintain both historical audit trails and current documentation simultaneously. Increments are immutable snapshots (like Git commits for specs), while living docs auto-update to reflect the current state of your codebase.

[Learn more about Living Documentation](/docs/guides/core-concepts/living-documentation) | [What is an Increment?](/docs/guides/core-concepts/what-is-an-increment)

## Context Precision (70%+ Token Reduction)

Each increment declares exactly what context it needs via manifests with section anchors and glob patterns. Load only what's relevant -- save 70%+ on AI costs compared to loading entire files.

## AI Agents and Skills

11 specialized AI agents (PM, Architect, Tech Lead, QA, Security, Performance, Docs Writer, TDD Orchestrator, Test Planner, Translator, Code Reviewer) collaborate automatically. Skills detect your intent and route to the right agent -- no manual orchestration needed.

[See all 100+ skills](/docs/reference/skills) | [Agent Teams & Swarms](/docs/guides/agent-teams-and-swarms)

## Test-Validated Development

Every feature is proven through a 4-level testing pipeline: specification acceptance criteria (AC-IDs), embedded BDD test plans (Given/When/Then), YAML skill test cases, and automated code tests (Playwright E2E + Vitest unit). Tests must tell the truth -- no false positives, no masking failures.

[Validation workflow](/docs/workflows/validation) | [TDD cycle](/docs/reference/commands)

## Dashboard & Observability

A built-in web dashboard (`specweave dashboard`) provides real-time visibility into your development workflow: analytics, cost tracking, error tracing, sync audit, service management, notifications, and more -- all powered by SSE live updates.

[Dashboard Overview](/docs/guides/analytics-dashboard)

## Architecture Diagrams (C4 Model)

Auto-generate Mermaid diagrams following the C4 Model: Context, Container, Component, and Code-level views. Sequence diagrams and ER diagrams for data flows.

## Framework-Agnostic

Works with any tech stack -- TypeScript/JavaScript, Python, Go, Rust, Java, C#/.NET. Auto-detects your stack from `package.json`, `go.mod`, `Cargo.toml`, `pom.xml`, and others.

## External Integrations

Bidirectional sync with **GitHub** (Issues, Milestones), **JIRA** (Epics, Stories, Tasks), and **Azure DevOps** (4-level hierarchy). Increments map to external work items automatically.

[External Tools Overview](/docs/guides/integrations/external-tools-overview) | [Sync Deep Dives](/docs/guides/sync-strategies)

## Brownfield Excellence

The hardest challenge in software: existing codebases with zero documentation and tribal knowledge. SpecWeave handles intelligent documentation merging, retroactive architecture generation (HLDs, ADRs, C4 diagrams), regression prevention through baseline tests, and living docs that auto-update as code evolves.

[Brownfield workflow](/docs/workflows/brownfield)

## Claude Hooks (Auto-Update)

Post-task hooks automatically update CLAUDE.md, API references, and changelogs. Pre-implementation hooks check regression risk. Human-input-required hooks log when AI needs clarification.

## Commands

Every command works three ways: natural language, slash commands (Claude Code), or keywords (other AI tools).

[Command Overview](/docs/commands/overview) | [Decision Tree](/docs/reference/command-decision-tree) | [Commands by Priority](/docs/guides/command-reference-by-priority)

## Additional Capabilities

- **Multi-language support**: Work in 11 languages with free LLM-native translation (English, Russian, Spanish, Chinese, German, French, Japanese, Korean, Portuguese)
- **Cost optimization**: 75%+ context reduction through intelligent plugin architecture -- typical savings of $60-120/month per developer

---

**Ready to get started?**

- [Quickstart Guide](/docs/getting-started) - Get up and running in 5 minutes
- [Installation](/docs/getting-started/installation) - Detailed installation instructions

**Previous**: [What is SpecWeave?](/docs/overview/introduction) | **Next**: [Philosophy](/docs/overview/philosophy)
