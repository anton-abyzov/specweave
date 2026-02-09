# Plan: 0195 - Playwright CLI Integration

## Phase 1: Research & Benchmarking (Current)
1. Install `@playwright/cli` locally and explore its command set
2. Benchmark token usage: CLI vs MCP for identical tasks (navigate, click, screenshot)
3. Document capability gaps between CLI and MCP
4. Validate daemon lifecycle management (start, stop, session persistence)
5. Test headless/headed mode switching

## Phase 2: Detection & Installation Infrastructure
1. Add CLI detection utility (`playwright-cli-detector.ts`)
   - Check if `@playwright/cli` is globally installed
   - Cache result in session state
   - Version validation (minimum compatible version)
2. Update `user-prompt-submit.sh` hook
   - Add `@playwright/cli` as optional suggestion alongside MCP plugin
   - Respect `pluginAutoLoad` settings
3. Add configuration option in `.specweave/config.json`
   - `testing.playwright.preferCli: true|false`
   - `testing.playwright.cliFlags: ["--headless"]`

## Phase 3: Skill Layer Integration
1. Create CLI wrapper utility (`playwright-cli-runner.ts`)
   - Abstracts CLI commands into typed functions
   - Handles daemon lifecycle
   - Parses element references from CLI output
2. Update `sw-testing:ui-automate` skill
   - Route to CLI for script generation when available
   - Generate reusable Playwright TypeScript code
3. Update `sw-testing:ui-inspect` skill
   - Keep MCP as primary (needs full DOM introspection)
   - CLI fallback for basic element queries
4. Add routing logic to skill layer
   - Task type detection → CLI or MCP

## Phase 4: CI/CD & Documentation
1. CI environment detection and headless defaults
2. Output directory configuration for screenshots/traces
3. Update ADR-0226 with CLI integration decision
4. Update testing guides with CLI vs MCP guidance

## Architecture Decision

**Approach**: Complementary dual-mode (not replacement)

```
User Request
    │
    ├── Test execution / automation → @playwright/cli (token-efficient)
    │     └── Fallback → @playwright/mcp
    │
    └── Interactive exploration / inspection → @playwright/mcp (rich introspection)
          └── Fallback → @playwright/cli snapshot
```

## Dependencies
- `@playwright/cli` v0.1.0+ (npm global)
- Existing `playwright@claude-plugins-official` MCP plugin
- `user-prompt-submit.sh` hook infrastructure
