# Testing Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-10**: For Playwright testing, enforce CLI-First Rule (MANDATORY): always use Playwright CLI via Bash for test execution, setup, and automation. MCP Playwright tools are explicitly prohibited except for ui-inspect command which uses MCP for interactive DOM introspection only. This prevents token waste, ensures reproducible config, and avoids path-of-least-resistance tool selection.
