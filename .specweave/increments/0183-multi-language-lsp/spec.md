---
increment: 0183-multi-language-lsp
title: Multi-Language LSP Warm-up & Configurable Timeouts
type: feature
priority: P1
status: completed
created: 2026-02-04T00:00:00.000Z
structure: user-stories
test_mode: test-after
coverage_target: 80
breaking_changes: true
---

# Feature: Multi-Language LSP Warm-up & Configurable Timeouts

## Problem Statement

The current SpecWeave LSP implementation has critical limitations for non-TypeScript projects:
1. **TypeScript-only warm-up**: Warm-up logic only searches for TypeScript files, causing "No files found" for C#/Go/Python projects
2. **Fixed 60s timeout**: Insufficient for C# (csharp-ls needs 30-90s for solution indexing on medium projects)
3. **No project file awareness**: C# LSP servers need .sln file path for proper multi-project loading
4. **No server recommendations**: Users must manually research and configure LSP servers

## Goals

- Support 5+ languages with language-aware warm-up strategies
- Make timeouts configurable globally and per-language
- Auto-detect project type and suggest appropriate LSP servers
- Provide diagnostic tools for LSP troubleshooting
- Refactor to modular architecture for maintainability

## User Stories

### US-001: Language-Aware Warm-up (P1)
**Project**: specweave

**As a** developer working on C#/Python/Go/Rust projects
**I want** LSP warm-up to detect my project's language and use appropriate strategy
**So that** semantic code intelligence works on first invocation without manual configuration

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Given a project with .sln/.csproj files, when warm-up runs, then C# strategy is used (detect solution, open .cs files)
- [ ] **AC-US1-02**: Given a project with go.mod, when warm-up runs, then Go strategy is used
- [ ] **AC-US1-03**: Given multiple .sln files at root, when warm-up runs, then user is prompted to choose (choice cached)
- [ ] **AC-US1-04**: Given warm-up with `--skip-warmup` flag, when command runs, then warm-up phase is skipped
- [ ] **AC-US1-05**: Given sequential warm-up, when files are opened, then they are opened one-by-one (not parallel)

---

### US-002: Configurable Timeouts (P1)
**Project**: specweave

**As a** developer with large projects
**I want** to configure LSP timeouts globally and per-language
**So that** I can accommodate slow-indexing language servers like csharp-ls

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Given `lsp.timeout: 120` in config, when LSP operation runs, then 120s timeout is used
- [ ] **AC-US2-02**: Given `lsp.warmupTimeout: 90` in config, when warm-up runs, then 90s timeout is used for warm-up phase
- [ ] **AC-US2-03**: Given `lsp.perLanguage.csharp.timeout: 180`, when C# LSP operation runs, then 180s is used (overrides global)
- [ ] **AC-US2-04**: Given timeout values in config, when parsed, then they are interpreted as seconds (not milliseconds)
- [ ] **AC-US2-05**: Given no config, when LSP runs, then default of 120s global and 90s warmup is used

---

### US-003: LSP Server Recommendations (P1)
**Project**: specweave

**As a** developer in a multi-language project
**I want** SpecWeave to analyze my project and suggest top 3 LSP servers
**So that** I don't need to manually research language server options

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Given a project with mixed files, when analysis runs, then languages are ranked by weighted file count
- [ ] **AC-US3-02**: Given ranking, when weights are applied, then project files (.sln, package.json) count more than individual source files
- [ ] **AC-US3-03**: Given top 3 suggestions, when presented, then user sees interactive prompt to confirm/modify
- [ ] **AC-US3-04**: Given a missing LSP server, when suggested, then install command is shown (e.g., `dotnet tool install -g csharp-ls`)
- [ ] **AC-US3-05**: Given user confirmation, when LSP servers are configured, then max 3 are enabled by default (others marked optional)

---

### US-004: Custom LSP Server Registration (P2)
**Project**: specweave

**As a** developer using uncommon languages
**I want** to register custom LSP servers via configuration
**So that** I can use SpecWeave with any language that has an LSP server

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Given `lsp.servers.myLang` config with command/args/filePatterns, when LSP initializes, then custom server is registered
- [ ] **AC-US4-02**: Given first use of custom server, when initialized, then security warning is shown requiring user confirmation
- [ ] **AC-US4-03**: Given custom server command, when pre-flight runs, then binary existence and executability is validated
- [ ] **AC-US4-04**: Given invalid custom server path, when validation fails, then clear error with fix suggestion is shown

---

### US-005: Progress Feedback & Diagnostics (P1)
**Project**: specweave

**As a** developer waiting for LSP indexing
**I want** progress feedback and diagnostic tools
**So that** I know what's happening and can troubleshoot issues

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Given LSP indexing in progress, when waiting, then progress bar with elapsed time is shown
- [ ] **AC-US5-02**: Given LSP warm-up complete, when reported, then detailed breakdown is shown (e.g., "847 symbols: 423 functions, 312 classes, 112 interfaces")
- [ ] **AC-US5-03**: Given `specweave lsp doctor` command, when run, then comprehensive diagnostics are output
- [ ] **AC-US5-04**: Given doctor command, when checking, then installed servers, connectivity, warm-up test, and suggestions are reported
- [ ] **AC-US5-05**: Given LSP operation, when complete, then structured logs are written to `.specweave/logs/lsp-*.log`

---

### US-006: Symbol Caching (P2)
**Project**: specweave

**As a** developer running multiple LSP commands
**I want** symbol locations cached between invocations
**So that** subsequent queries are faster without re-indexing

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Given LSP query result, when caching, then symbols are stored in `.specweave/cache/lsp/`
- [ ] **AC-US6-02**: Given cached symbols, when source file changes (mtime), then cache is invalidated for that file
- [ ] **AC-US6-03**: Given cache key, when generated, then it includes file path, symbol name, language, and server version

---

### US-007: Error Handling & Fallback (P1)
**Project**: specweave

**As a** developer when LSP fails
**I want** graceful fallback and clear error messages
**So that** I can still get results and troubleshoot

**Acceptance Criteria**:
- [ ] **AC-US7-01**: Given LSP error, when handling, then fail fast with clear error message (no silent retry)
- [ ] **AC-US7-02**: Given LSP crash mid-operation, when detected, then fallback to grep-based search with warning
- [ ] **AC-US7-03**: Given unknown project (no .sln/package.json/etc.), when analyzing, then suggest LSP based on file extension counts
- [ ] **AC-US7-04**: Given command run from subdirectory, when detecting project root, then search upward until project file found

---

### US-008: Modular Code Architecture (P2)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** the LSP code refactored to modular structure
**So that** it's easier to maintain, test, and extend with new languages

**Acceptance Criteria**:
- [ ] **AC-US8-01**: Given refactor, when complete, then code is organized in `src/core/lsp/{servers,warmup,config,cache,diagnostics}/`
- [ ] **AC-US8-02**: Given language-specific logic, when refactored, then each language is isolated in own server module
- [ ] **AC-US8-03**: Given warm-up strategies, when refactored, then they are decoupled from LSP client implementation
- [ ] **AC-US8-04**: Given config parsing, when refactored, then it's centralized in config module with validation

## Out of Scope

- **Daemon/persistent mode**: No LSP server kept alive between commands (cold start every time)
- **Auto-installation**: LSP servers not automatically installed (only install commands shown)
- **IDE integration**: No changes to VSCode extension or other IDE integrations
- **Real-time file watching**: Cache invalidation is mtime-based, not file watcher-based

## Success Criteria

1. **C# projects work on first run**: `specweave lsp refs File.cs Symbol` returns semantic references (not grep fallback)
2. **Timeout flexibility**: Users can configure per-language timeouts without code changes
3. **Discovery time reduced**: New project setup time reduced by 50% via LSP recommendations
4. **Diagnostic clarity**: `lsp doctor` command identifies 90%+ of common LSP setup issues

## Technical Notes

### Config Schema
```json
{
  "lsp": {
    "timeout": 120,
    "warmupTimeout": 90,
    "perLanguage": {
      "csharp": { "timeout": 180, "warmupTimeout": 120 },
      "typescript": { "timeout": 60 }
    },
    "servers": {
      "myLang": {
        "command": "my-lsp-server",
        "args": ["--stdio"],
        "filePatterns": ["*.xyz"],
        "languageId": "mylang"
      }
    }
  }
}
```

### File Structure After Refactor
```
src/core/lsp/
├── index.ts
├── config/
├── servers/
├── warmup/
├── cache/
├── diagnostics/
└── lsp-manager.ts
```

## Dependencies

- Existing LSP infrastructure in `src/core/lsp/`
- Config system (`src/core/config/`)
- CLI command framework (`src/cli/`)
