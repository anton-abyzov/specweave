# Plan: Remove Official Plugin Dependency

## Approach

Surgical removal of Context7 and Playwright MCP from the auto-install pipeline, with documentation updates to mention them as optional. No new features — pure simplification.

## Phases

### Phase 1: Remove from LLM plugin detector
- Remove `OFFICIAL_PLUGINS` array entries for context7/playwright
- Remove external plugin detection from LLM prompt
- Simplify `detectPluginsViaLLM()` to return only SpecWeave plugins

### Phase 2: Remove from initialization
- Remove from `refresh-marketplace.ts` hardcoded install list
- Remove from `plugin-installer.ts` essential comments

### Phase 3: Remove from hook pipeline
- Remove external plugin auto-install block from `user-prompt-submit.sh`
- Remove playwright-cli suggestion block (no MCP to compare against)

### Phase 4: Simplify Playwright routing
- Make CLI the only mode in `playwright-routing.ts`
- Remove MCP fallback logic
- Deprecate `preferCli` config (always CLI)

### Phase 5: Update docs
- CLAUDE.md browser automation section
- Plugin management docs
- Mobile skill examples

## Out of Scope
- Removing the Playwright CLI integration itself (keep it)
- Removing any SpecWeave plugin auto-loading (keep that)
