---
status: completed
---
# 0195 - Playwright CLI Integration

## Problem Statement

SpecWeave currently uses the Playwright MCP plugin (`playwright@claude-plugins-official`) for browser automation. While functional, this approach has significant token overhead:

- **~5-8K tokens** just to load the MCP tools into context
- **Full accessibility tree** pushed into context on every `browser_snapshot` call
- **20+ MCP tools** registered regardless of whether browser automation is needed
- MCP's rich introspection is overkill for most test execution and automation tasks

Microsoft released `@playwright/cli` (v0.1.0, Feb 7 2026) — a standalone CLI purpose-built for AI coding agents. It keeps browser state external and returns only minimal element references (e.g., "e15"), achieving ~98% token reduction compared to MCP.

## Vision

Integrate `@playwright/cli` as a **token-efficient complement** to the existing MCP plugin, giving SpecWeave's testing infrastructure two modes:

| Mode | Tool | Best For |
|------|------|----------|
| **CLI mode** | `@playwright/cli` | Test execution, automation scripts, CI/CD, token-constrained sessions |
| **MCP mode** | `@playwright/mcp` | Interactive page exploration, self-healing tests, deep DOM inspection |

## User Stories

### US-001: Token-Efficient Browser Automation
As a SpecWeave user running E2E tests, I want browser automation that doesn't consume excessive context window space, so I can run tests alongside other complex tasks.

**Acceptance Criteria:**
- [x] AC-US1-01: `@playwright/cli` is installed and available via Bash tool calls
- [x] AC-US1-02: CLI commands (navigate, click, type, screenshot) work in headless mode by default
- [x] AC-US1-03: Headed mode can be toggled via configuration or flag
- [x] AC-US1-04: Token usage for a standard page interaction is <500 tokens (vs ~5K+ with MCP)

### US-002: Smart Routing Between CLI and MCP
As a SpecWeave testing skill, I want to automatically choose between CLI and MCP based on the task type, so users get the optimal tool without manual configuration.

**Acceptance Criteria:**
- [x] AC-US2-01: Detection utility identifies whether `@playwright/cli` is installed
- [x] AC-US2-02: `sw-testing:ui-automate` routes to CLI for script generation tasks
- [x] AC-US2-03: `sw-testing:ui-inspect` routes to MCP for interactive element inspection
- [x] AC-US2-04: Fallback to MCP if CLI is not installed (graceful degradation)

### US-003: Hook-Layer Installation Support
As a SpecWeave contributor, I want the CLI to be installable alongside the MCP plugin via the existing hook infrastructure.

**Acceptance Criteria:**
- [x] AC-US3-01: `user-prompt-submit.sh` can detect and suggest `@playwright/cli` installation
- [x] AC-US3-02: Installation is non-blocking and respects `pluginAutoLoad.suggestOnly` setting
- [x] AC-US3-03: CLI availability is cached in session to avoid repeated checks

### US-004: CI/CD Compatibility
As a developer running tests in CI, I want Playwright CLI integration to work in headless CI environments without additional configuration.

**Acceptance Criteria:**
- [x] AC-US4-01: CLI defaults to headless mode in CI environments (detected via `CI` env var)
- [x] AC-US4-02: Screenshots and traces are saved to configurable output directory
- [x] AC-US4-03: Exit codes properly propagate for CI pass/fail detection

## Technical Context

### Current Architecture
- **Hook**: `plugins/specweave/hooks/user-prompt-submit.sh` auto-installs `playwright@claude-plugins-official` with `--scope user`
- **Detection**: LLM-based in `src/core/lazy-loading/llm-plugin-detector.ts` (keywords: E2E, browser, playwright)
- **Skills**: `sw-testing:ui-automate`, `sw-testing:ui-inspect`, `sw-testing:e2e-setup`
- **ADR**: ADR-0226 documents the official plugin integration decision

### @playwright/cli Key Facts
- **Package**: `npm install -g @playwright/cli@latest`
- **Version**: v0.1.0 (Feb 7, 2026) — very new, rapid iteration
- **Architecture**: Daemon-based sessions, external browser state, minimal output
- **Commands**: `open`, `goto`, `click`, `type`, `fill`, `screenshot`, `snapshot`, `route` (network mocking), console/network monitoring
- **Sessions**: Named multi-browser sessions supported
- **Source**: https://github.com/microsoft/playwright-cli

### Risk Assessment
- **v0.1.0 maturity**: API may change rapidly; pin version and wrap in abstraction layer
- **Feature parity**: CLI may not cover all MCP capabilities (verify before routing)
- **Daemon management**: Need to handle CLI daemon lifecycle (start/stop/cleanup)

## Benchmark Results (Phase 1 - Completed)

| Operation | CLI Output | MCP Output | Savings |
|-----------|-----------|------------|---------|
| Snapshot (example.com) | ~180 chars (file ref) | ~500 chars (inline a11y tree) | 64% |
| Navigate + Snapshot | ~430 chars total | ~1000+ chars | 57% |
| Screenshot | ~285 chars (metadata) | ~400 chars | 29% |
| Tool Registration | 0 chars (Bash calls) | ~6000 chars (20+ tools) | 100% |

**Key insight**: CLI saves snapshot data to `.playwright-cli/*.yml` files instead of dumping inline. For complex real-world pages with hundreds of elements, CLI stays at ~250 chars while MCP could be 10-50K chars. The savings scale exponentially with page complexity.

**Capability parity**: 82% full parity (18/22 MCP tools have CLI equivalents). Only gaps: `browser_wait_for` (use eval polling), `browser_install` (pre-install required). CLI has 5 exclusive features (network mocking, auth state persistence, storage management, PDF export, data cleanup).

## User Stories (Extended Scope)

### US-005: Skill Layer CLI Guidance
As a SpecWeave skill author, I want testing skills to document when to use CLI vs MCP, so users get optimal tool selection.

**Acceptance Criteria:**
- [x] AC-US5-01: `sw-testing:e2e-testing` SKILL.md documents CLI vs MCP routing
- [x] AC-US5-02: `ui-automate.md` command routes to CLI by default when installed
- [x] AC-US5-03: `ui-inspect.md` command documents MCP preference for inspection
- [x] AC-US5-04: `e2e-setup.md` command includes CLI configuration section

### US-006: CLAUDE.md and Template Updates
As a SpecWeave user, I want generated CLAUDE.md files to include CLI guidance, so new projects automatically know about dual-mode browser automation.

**Acceptance Criteria:**
- [x] AC-US6-01: CLAUDE.md template includes browser automation mode section
- [x] AC-US6-02: Config schema supports `testing.playwright.preferCli` setting
- [x] AC-US6-03: ADR-0226 updated with CLI integration decision

### US-007: Public Documentation and Content
As a SpecWeave user reading docs, I want clear guidance on CLI vs MCP, so I can choose the right tool for my use case.

**Acceptance Criteria:**
- [x] AC-US7-01: Playwright glossary term updated with CLI mode section
- [x] AC-US7-02: YouTube tutorial script mentions dual-mode automation
- [x] AC-US7-03: E2E glossary cross-references Playwright CLI

## Out of Scope
- Replacing the MCP plugin entirely (keep as complement)
- Rewriting existing E2E test suites
- Custom Playwright test runner integration (use standard `npx playwright test`)
