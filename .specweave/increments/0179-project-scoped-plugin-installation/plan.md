# Implementation Plan: Project-Scoped Plugin Installation

## Phase 1: Configuration Schema (TDD)

### 1.1 Add Plugin Scope Config Types
- Add TypeScript types for plugin scope configuration
- Update config schema validation
- **Files**: `src/types/config.ts`, `src/core/config/schema.ts`

### 1.2 Config Parsing for Plugin Scopes
- Parse `plugins.defaultScope`, `plugins.lspScope`, `plugins.specweaveScope`
- Add `plugins.scopeOverrides` map for per-plugin overrides
- **Files**: `src/core/config/config-loader.ts`

## Phase 2: Hook Implementation

### 2.1 Update user-prompt-submit.sh
- Read scope configuration from `.specweave/config.json`
- Apply `--scope` flag to `claude plugin install` commands
- LSP plugins default to project scope
- SpecWeave plugins configurable (default user)
- **Files**: `plugins/specweave/hooks/user-prompt-submit.sh`

### 2.2 Scope Helper Functions
- `get_plugin_scope()` - Determine scope for a given plugin
- `install_plugin_with_scope()` - Install with correct scope flag
- **Files**: `plugins/specweave/hooks/user-prompt-submit.sh`

## Phase 3: Documentation

### 3.1 CLAUDE.md Update
- Add "Plugin Scopes" section explaining user/project/local
- Document configuration options
- **Files**: `CLAUDE.md`

### 3.2 README Update
- Add installation examples with scope flags
- Document when to use each scope
- **Files**: `README.md` (if applicable)

### 3.3 Config Schema Documentation
- Document new `plugins` configuration section
- **Files**: `.specweave/docs/internal/`

## Phase 4: Testing

### 4.1 Unit Tests (RED first)
- Test config parsing for plugin scopes
- Test scope resolution logic
- **Files**: `tests/unit/config/plugin-scope.test.ts`

### 4.2 Integration Tests
- Test hook applies correct scope flag
- Test config override precedence
- **Files**: `tests/integration/hooks/plugin-scope-installation.test.ts`

### 4.3 E2E Tests
- Verify plugin appears in correct settings file after installation
- **Files**: `tests/e2e/plugin-scope-e2e.test.ts`

## Risk Mitigation

1. **Claude Code version check**: Verify 2.1.3+ before using `--scope` flag
2. **Fallback behavior**: If scope flag fails, fall back to default (no scope)
3. **Backward compatibility**: Existing installs continue to work

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| 1 | Config schema | Low |
| 2 | Hook changes | Medium |
| 3 | Documentation | Low |
| 4 | Testing | Medium |

Total: ~2-3 hours
