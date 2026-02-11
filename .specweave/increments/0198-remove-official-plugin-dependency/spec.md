# 0198: Remove Official Plugin Dependency (Context7 & Playwright MCP)

## Problem

SpecWeave treats Context7 and Playwright MCP as "essential" plugins — auto-detecting, auto-installing, and hardcoding them into initialization. This adds:
- ~8K tokens per session (tool registrations)
- ~500ms LLM call in user-prompt-submit hook for external plugin detection
- Complexity in plugin detection, installation, and routing logic
- Forced dependency on third-party MCP plugins users may not want

The custom `@playwright/cli` integration (0195) already handles 80%+ of browser automation at 98% token savings. Context7's doc lookup is replaceable by WebSearch.

## Solution

Remove Context7 and Playwright MCP from required/auto-installed plugins. Keep documentation-only mentions for users who want them. Simplify the LLM plugin detector to focus on SpecWeave plugins only.

## User Stories

### US-001: Remove from auto-install pipeline
As a SpecWeave maintainer, I want official plugins removed from auto-detection and auto-installation so the hook pipeline is simpler and faster.

**Acceptance Criteria**:
- [x] AC-US1-01: `OFFICIAL_PLUGINS` array in llm-plugin-detector.ts no longer contains context7/playwright
- [x] AC-US1-02: LLM detection prompt no longer recommends external official plugins
- [x] AC-US1-03: refresh-marketplace.ts no longer hardcodes context7/playwright installation
- [x] AC-US1-04: user-prompt-submit.sh no longer auto-installs external plugins
- [x] AC-US1-05: Plugin installer comments referencing "essential" context7/playwright are removed

### US-002: Simplify Playwright routing to CLI-only
As a SpecWeave user, I want browser automation to default to CLI-only mode without MCP fallback, simplifying the routing logic.

**Acceptance Criteria**:
- [x] AC-US2-01: Playwright routing returns 'cli' mode only (no MCP fallback)
- [x] AC-US2-02: MCP-preferred task types (ui-inspect, page-exploration, self-healing-test) route to CLI
- [x] AC-US2-03: `preferCli` config option is deprecated (CLI is now the only mode)
- [x] AC-US2-04: Documentation updated to mention MCP as optional manual install

### US-003: Update documentation
As a user reading SpecWeave docs, I want to know that Context7 and Playwright MCP are optional enhancements I can install manually if needed.

**Acceptance Criteria**:
- [x] AC-US3-01: CLAUDE.md browser automation section updated (CLI-only default, MCP as optional)
- [x] AC-US3-02: Plugin management docs mention both as optional, with install commands
- [x] AC-US3-03: Mobile skill docs remove Context7 MCP call examples
