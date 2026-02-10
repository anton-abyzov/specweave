---
increment: 0177-lsp-integration-fixes
title: "LSP Integration Fixes"
type: feature
priority: P1
status: completed
created: 2026-01-29
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: LSP Integration Fixes

## Problem Statement

Multiple gaps in LSP plugin integration create confusion and broken developer experiences:

1. **TypeScript LSP not auto-detected** - The most common language lacks keyword mappings in `OFFICIAL_PLUGIN_MAP`
2. **LSP tools not accessible** - Documentation claims LSP operations exist but Claude can't use them
3. **Binary vs Plugin gap** - System checks binaries but not plugin installation status
4. **Misleading documentation** - Claims capabilities that don't exist in practice

## Goals

- Add TypeScript/JavaScript mappings to auto-detection
- Investigate and document actual Claude Code LSP capabilities
- Update documentation to reflect reality
- Improve detection of incomplete LSP setups

## User Stories

### US-001: TypeScript LSP Auto-Detection (P1)
**Project**: specweave

**As a** developer working on TypeScript/JavaScript projects,
**I want** SpecWeave to auto-suggest typescript-lsp plugin installation,
**So that** I get LSP support without manual configuration.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given prompt contains "typescript", when plugin detection runs, then typescript-lsp is suggested
- [x] **AC-US1-02**: Given prompt contains "react" or "nextjs" or "vue", when plugin detection runs, then typescript-lsp is suggested
- [x] **AC-US1-03**: Given prompt contains "node" or "javascript" or "js", when plugin detection runs, then typescript-lsp is suggested
- [x] **AC-US1-04**: OFFICIAL_PLUGIN_MAP in official-plugin-manager.ts contains all TypeScript-related keywords

---

### US-002: LSP Tool Availability Investigation (P1)
**Project**: specweave

**As a** SpecWeave maintainer,
**I want** to understand how Claude Code LSP tools actually work,
**So that** documentation and user guidance are accurate.

**Acceptance Criteria**:
- [x] **AC-US2-01**: Document whether ENABLE_LSP_TOOL env var is required for LSP functionality
- [x] **AC-US2-02**: Document which Claude Code versions support LSP and how it manifests
- [x] **AC-US2-03**: Document whether LSP provides explicit tools (callable) or implicit enhancement (background)
- [x] **AC-US2-04**: Create ADR documenting LSP integration findings

---

### US-003: Documentation Accuracy Update (P2)
**Project**: specweave

**As a** SpecWeave user,
**I want** accurate documentation about LSP capabilities,
**So that** I know what's actually possible and don't waste time on non-existent features.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Update docs-site/docs/guides/lsp-integration.md to reflect actual capabilities
- [x] **AC-US3-02**: Remove or correct references to non-existent explicit LSP commands
- [x] **AC-US3-03**: Add troubleshooting section for "LSP enabled but not working" scenarios
- [x] **AC-US3-04**: Update CLAUDE.md LSP section if findings require changes

---

### US-004: Plugin Installation Verification (P2)
**Project**: specweave

**As a** developer with LSP binary installed but plugin missing,
**I want** SpecWeave to detect this configuration gap,
**So that** I get guidance to complete the setup.

**Acceptance Criteria**:
- [x] **AC-US4-01**: lsp-check.sh verifies plugin installation status in addition to binary presence
- [x] **AC-US4-02**: Warning shown when binary exists but corresponding plugin is not installed
- [x] **AC-US4-03**: Warning includes exact install command: `claude plugin install X@claude-plugins-official`

## Technical Notes

- Key file: `src/core/lazy-loading/official-plugin-manager.ts` (OFFICIAL_PLUGIN_MAP constant)
- Key file: `plugins/specweave/scripts/lsp-check.sh` (binary detection)
- Key doc: `docs-site/docs/guides/lsp-integration.md`
- ADR location: `.specweave/docs/internal/architecture/adr/`
- Claude Code LSP: Added in v2.0.74 per existing documentation

## Out of Scope

- Creating MCP wrappers for LSP operations
- Building LSP-to-MCP protocol bridge
- Supporting non-official LSP plugins
- Automatic binary installation

## Success Metrics

- TypeScript projects get typescript-lsp suggestions automatically
- Documentation accurately reflects real capabilities
- Zero user confusion about "enabled but not working" LSP scenarios
- ADR provides definitive reference for LSP integration behavior
