# Testing Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-11**: For Playwright testing, enforce CLI-First Rule (MANDATORY): always use Playwright CLI via Bash for test execution, setup, and automation. MCP Playwright tools are explicitly prohibited except for ui-inspect command which uses MCP for interactive DOM introspection only. This prevents token waste, ensures reproducible config, and avoids path-of-least-resistance tool selection.
- **2026-02-11**: Playwright MCP tools should not be used - CLI-only mode via @playwright/cli is the standard, with MCP plugin as optional fallback only for ui-inspect, page-exploration, and self-healing-test if users explicitly install it
- **2026-02-11**: Enforce CLI-Only Rule for Playwright: always use Playwright CLI via Bash for test execution, setup, and automation. MCP Playwright tools are explicitly prohibited except for ui-inspect command which uses MCP for interactive DOM introspection only. This prevents token waste, ensures reproducible config, and avoids path-of-least-resistance tool selection.
