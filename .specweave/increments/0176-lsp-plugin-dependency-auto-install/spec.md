---
increment: 0176-lsp-plugin-dependency-auto-install
title: "LSP Plugin Dependency Auto-Install"
type: feature
priority: P1
status: completed
created: 2026-01-28
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: LSP Plugin Dependency Auto-Install

## Problem Statement

Users install LSP plugins (csharp-lsp, typescript-lsp, etc.) which show as "enabled" in `/plugin list`, but the underlying language server binaries may not be installed. This creates confusion where plugins appear ready but don't work. Additionally, users who explicitly ask to "use LSP" for tasks like "find references" don't understand that Claude Code's LSP integration is background-only, not explicitly queryable.

## Goals

- Automatically detect missing LSP binaries when plugins are enabled
- Provide clear install commands or auto-install option
- Fix broken hook chain so lsp-check runs on session start
- Educate users when they explicitly request LSP features

## User Stories

### US-001: LSP Binary Detection on Plugin Install (P1)
**Project**: specweave

**As a** developer who just installed an LSP plugin,
**I want** SpecWeave to check if the required language server binary is installed,
**So that** I know immediately if additional setup is needed.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Given csharp-lsp plugin is enabled and csharp-ls binary is missing, when session starts, then user sees install command `dotnet tool install -g csharp-ls`
- [x] **AC-US1-02**: Given typescript-lsp plugin is enabled and typescript-language-server is missing, when session starts, then user sees install command `npm i -g typescript-language-server typescript`
- [x] **AC-US1-03**: Plugin-to-binary mapping exists for: csharp-lsp→csharp-ls, typescript-lsp→typescript-language-server, pyright-lsp→pyright-langserver, gopls-lsp→gopls, rust-analyzer-lsp→rust-analyzer
- [x] **AC-US1-04**: Warning is shown only once per session (uses `.specweave/state/lsp-check.json` warned flag)

### US-002: Fix Session Start Hook Chain (P1)
**Project**: specweave

**As a** SpecWeave maintainer,
**I want** the session-start dispatcher to call lsp-check.sh,
**So that** LSP dependency detection runs automatically on session start.

**Acceptance Criteria**:
- [x] **AC-US2-01**: hooks/v2/dispatchers/session-start.sh spawns lsp-check.sh in background
- [x] **AC-US2-02**: lsp-check.sh writes detection results to `.specweave/state/lsp-check.json`
- [x] **AC-US2-03**: user-prompt-submit.sh reads lsp-check.json and shows warning if missing servers detected

### US-003: Explicit LSP Request Detection (P2)
**Project**: specweave

**As a** developer who asks "find references with LSP",
**I want** SpecWeave to explain LSP capabilities and limitations,
**So that** I understand why it doesn't work as expected and know alternatives.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Detect phrases like "use LSP", "with LSP", "LSP findReferences", "LSP goToDefinition"
- [x] **AC-US3-02**: Show message explaining LSP provides background enhancement, not explicit tools
- [x] **AC-US3-03**: Suggest alternatives: Grep for text search, IDE F12/Ctrl+Click for real LSP features

## Technical Notes

- lsp-check.sh already exists at `plugins/specweave/scripts/lsp-check.sh`
- user-prompt-submit.sh already has code to read lsp-check.json (lines 250-284)
- Gap: dispatchers/session-start.sh doesn't spawn lsp-check.sh (source v2/session-start.sh does)

## Out of Scope

- Creating MCP wrappers for LSP operations (separate feature)
- Auto-installing binaries without user consent
- Supporting non-official LSP plugins

## Success Metrics

- Zero confusion reports about "enabled but not working" LSP plugins
- 100% of installed LSP plugins have binary dependency check
