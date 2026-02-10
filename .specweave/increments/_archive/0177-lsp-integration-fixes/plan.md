# Technical Plan: LSP Integration Fixes

## Overview

Fix gaps in LSP plugin integration: add TypeScript mappings, investigate actual LSP tool availability, update documentation, and enhance plugin verification.

## Architecture

### Components Modified
- **OFFICIAL_PLUGIN_MAP**: Add TypeScript/JavaScript keyword mappings
- **lsp-check.sh**: Add plugin installation verification
- **Documentation**: Update to reflect actual capabilities

### Architecture Decision
- **ADR-0231**: LSP Integration Reality Check (documents findings)

## Technology Stack

- **Language**: TypeScript, Bash
- **Testing**: Vitest (TDD mode)
- **Documentation**: Markdown, Docusaurus

## Implementation Phases

### Phase 1: TypeScript LSP Mapping (US-001) - P1

**Goal**: Add TypeScript/JavaScript keywords to OFFICIAL_PLUGIN_MAP

**File**: `src/core/lazy-loading/official-plugin-manager.ts`

**Keywords to Add**:
```typescript
'typescript': 'typescript-lsp',
'ts': 'typescript-lsp',
'javascript': 'typescript-lsp',
'js': 'typescript-lsp',
'react': 'typescript-lsp',
'nextjs': 'typescript-lsp',
'next.js': 'typescript-lsp',
'vue': 'typescript-lsp',
'angular': 'typescript-lsp',
'node': 'typescript-lsp',
'nodejs': 'typescript-lsp',
'express': 'typescript-lsp',
'nestjs': 'typescript-lsp',
'svelte': 'typescript-lsp',
```

### Phase 2: LSP Investigation & ADR (US-002) - P1

**Goal**: Document actual Claude Code LSP behavior

**Investigation**:
1. Test ENABLE_LSP_TOOL environment variable
2. Verify Claude Code version requirements
3. Determine explicit vs implicit LSP capabilities

**Output**: ADR-0231 status → "Accepted"

### Phase 3: Documentation Update (US-003) - P2

**Files**:
- `docs-site/docs/guides/lsp-integration.md`
- `CLAUDE.md` (if needed)

**Changes**:
- Clarify background vs explicit capabilities
- Add troubleshooting section
- Remove claims about non-existent tools

### Phase 4: Plugin Verification (US-004) - P2

**File**: `plugins/specweave/scripts/lsp-check.sh`

**Logic**:
```bash
# For each language:
# 1. Check binary exists (current behavior)
# 2. Check plugin installed via ~/.claude/plugins/installed_plugins.json
# 3. Warn if binary exists but plugin missing
```

## Testing Strategy

| Component | Test File | Coverage |
|-----------|-----------|----------|
| TypeScript mapping | `tests/integration/lazy-loading/official-plugin-manager.test.ts` | 80% |
| lsp-check.sh | `tests/integration/hooks/lsp-binary-mapping.test.ts` | 80% |

## Technical Challenges

### Challenge 1: Plugin Registry Access
**Solution**: Read `~/.claude/plugins/installed_plugins.json` directly
**Risk**: File format may change; graceful fallback if unavailable

### Challenge 2: LSP Tool Documentation
**Solution**: Test empirically and document findings in ADR
**Risk**: Behavior may vary by Claude Code version
