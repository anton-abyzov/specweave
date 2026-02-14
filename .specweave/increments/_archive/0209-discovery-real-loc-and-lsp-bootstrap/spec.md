# 0209: Discovery Real LOC and LSP Bootstrap

## Problem

The Living Docs Builder discovery phase uses `stat.size / 40` to estimate lines of code, producing errors of 50-85%. All downstream metrics (module ranking, health scoring, enterprise reports) that depend on LOC are unreliable.

Additionally, the LSP Manager (10-language support) exists but is never called from living docs code. Module analysis uses regex-only extraction.

## Solution

1. Replace the LOC heuristic with real line counting
2. Add language detection to DiscoveryResult
3. Create an LspBootstrapper that activates LSP clients only for detected languages
4. Wire LSP context through the pipeline for subsequent increments

## User Stories

### US-001: Accurate LOC Counting

As a developer using living docs, I want accurate line-of-code counts so that module complexity metrics and health scores reflect reality.

**Acceptance Criteria:**
- [x] AC-US1-01: Replace `stat.size / 40` in discovery.ts with actual line counting (`\n` counting)
- [ ] ~AC-US1-02: For large codebases (>10,000 files), use statistical sampling (10% of files) with extrapolation~ *(Deferred — requires integration testing with large codebases)*
- [x] AC-US1-03: LOC counts exclude blank lines and comment-only lines for code files
- [x] AC-US1-04: Existing tests continue to pass with updated LOC values

### US-002: Language Detection

As a living docs builder, I want to know which programming languages are present so I can activate only relevant LSP servers.

**Acceptance Criteria:**
- [x] AC-US2-01: `DiscoveryResult` includes `languagesDetected: string[]` derived from file extension frequency
- [x] AC-US2-02: Only languages with 5+ files are included (filters noise from config/data files)
- [x] AC-US2-03: Extension-to-language mapping covers TS/JS, Python, Go, Rust, Java, C#, Kotlin, Swift, PHP, Ruby

### US-003: Smart LSP Bootstrap

As a living docs system, I want to initialize LSP clients only for languages present in the project, not all 10, to avoid resource waste and installation requirements.

**Acceptance Criteria:**
- [x] AC-US3-01: `LspBootstrapper` takes `languagesDetected` and initializes only matching LSP clients
- [x] AC-US3-02: Before initializing, checks if language server binary exists (e.g., `which tsserver`)
- [x] AC-US3-03: Skips gracefully if server not installed (logs warning, continues without LSP for that language)
- [x] AC-US3-04: Returns `LspContext` object with initialized clients, available to downstream phases
- [x] AC-US3-05: If zero LSP servers available, falls back cleanly (no errors, just no LSP data)

### Known Limitations

- **LSPManager ignores `enabledLanguages`**: The bootstrapper passes `enabledLanguages` to `LSPManager`, but the current `LSPManager.initialize()` unconditionally runs `detectLSPServers()` for all languages. The bootstrapper's binary check prevents unnecessary initialization attempts, but the underlying `LSPManager` filtering will be addressed in increment 0210 (LSP-Powered Module Analysis).
