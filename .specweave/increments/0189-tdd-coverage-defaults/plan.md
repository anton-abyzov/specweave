# 0189: Plan

## Architecture

No new modules needed. Changes are localized to:

1. **`src/core/config/types.ts`** - Update `DEFAULT_CONFIG.testing` values
2. **`src/cli/helpers/init/testing-config.ts`** - Add 100% option, mode-aware defaults
3. **`.specweave/config.json`** - Self-apply TDD+90%
4. **Existing tests** - Update expectations for new defaults

## Key Decisions

- **ADR**: No formal ADR needed (config value changes, no architecture change)
- **Backward compat**: Existing projects keep their config. Only new projects and DEFAULT_CONFIG affected.
- **Coverage formula**: 100% option bypasses the `unit: base+5, e2e: base+10` formula — all three set to 100.

## Risk

- **Low**: Only config defaults change. No breaking changes to any API.
- **Test impact**: Some existing tests reference `DEFAULT_CONFIG.testing.defaultTestMode === 'test-after'` — those need updating.
