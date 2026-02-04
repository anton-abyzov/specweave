# Tasks: Multi-Language LSP Warm-up & Configurable Timeouts

## Task Legend

- `[ ]` Not started | `[x]` Completed
- Model hints: haiku (simple), sonnet (default), opus (complex)

---

## US-001: Language-Aware Warm-up (P1)

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Tasks**: 5 total, 0 completed

---

### T-001: Create WarmupStrategy interface and base implementation

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** a WarmupStrategy implementation
- **When** getFilesToOpen() is called with count=3
- **Then** returns array of max 3 file paths

**Test Cases** (`src/core/lsp/warmup/__tests__/strategy.test.ts`):
- `testSequentialExecution()`: Files opened one-by-one with delay
- `testOpenCountRespected()`: Never opens more than configured count
- **Coverage Target**: 90%

**Implementation**:
1. Create `src/core/lsp/warmup/strategy.ts` with interface
2. Create `src/core/lsp/warmup/executor.ts` for sequential logic
3. Add 100ms delay between file opens

**Dependencies**: None

---

### T-002: Implement C# warm-up strategy with .sln detection

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** a project with .sln file at root
- **When** detectProjectRoot() is called
- **Then** returns path containing .sln

- **Given** multiple .sln files at root
- **When** warm-up runs
- **Then** user is prompted to choose, choice is cached

**Test Cases** (`src/core/lsp/warmup/strategies/__tests__/csharp.test.ts`):
- `testSlnDetection()`: Finds .sln in project root
- `testCsprojFallback()`: Uses .csproj if no .sln
- `testMultiSlnPrompt()`: Shows interactive prompt
- `testChoiceCaching()`: Reads from `.specweave/cache/lsp-choices.json`
- **Coverage Target**: 90%

**Implementation**:
1. Create `src/core/lsp/warmup/strategies/csharp.ts`
2. Implement .sln detection with upward search
3. Add interactive prompt for multiple .sln files
4. Cache choice in `.specweave/cache/lsp-choices.json`

**Dependencies**: T-001

---

### T-003: Implement Go warm-up strategy

**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** a project with go.mod
- **When** detectProjectRoot() is called
- **Then** returns directory containing go.mod

**Test Cases** (`src/core/lsp/warmup/strategies/__tests__/go.test.ts`):
- `testGoModDetection()`: Finds go.mod
- `testGoFilesOpened()`: Opens *.go files for warm-up
- **Coverage Target**: 85%

**Implementation**:
1. Create `src/core/lsp/warmup/strategies/go.ts`
2. Detect go.mod, open 3 .go files

**Dependencies**: T-001

---

### T-004: Implement TypeScript/Python/Rust strategies

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** TypeScript project with tsconfig.json
- **When** strategy detects, **Then** opens .ts files

**Test Cases** (`src/core/lsp/warmup/strategies/__tests__/*.test.ts`):
- `testTypescriptStrategy()`: tsconfig.json detection
- `testPythonStrategy()`: pyproject.toml/requirements.txt detection
- `testRustStrategy()`: Cargo.toml detection
- **Coverage Target**: 85%

**Implementation**:
1. Create `typescript.ts`, `python.ts`, `rust.ts` in strategies/
2. Each follows WarmupStrategy interface

**Dependencies**: T-001

---

### T-005: Add --skip-warmup CLI flag

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** `specweave lsp refs --skip-warmup File.ts Symbol`
- **When** command runs
- **Then** warm-up phase is skipped entirely

**Test Cases** (`src/cli/__tests__/lsp.test.ts`):
- `testSkipWarmupFlag()`: Warm-up executor not called
- **Coverage Target**: 80%

**Implementation**:
1. Add `--skip-warmup` option to lsp command
2. Skip `executor.warmup()` call when flag present

**Dependencies**: T-001

---

## US-002: Configurable Timeouts (P1)

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Tasks**: 3 total, 0 completed

---

### T-006: Create LspConfig schema with Zod validation

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** config with `lsp.timeout: 120`
- **When** parsed
- **Then** returns timeout as 120 (seconds, not ms)

**Test Cases** (`src/core/lsp/config/__tests__/lsp-config.test.ts`):
- `testGlobalTimeoutParsed()`: lsp.timeout correctly parsed
- `testWarmupTimeoutParsed()`: lsp.warmupTimeout correctly parsed
- `testSecondsNotMilliseconds()`: Values interpreted as seconds
- `testDefaults()`: Missing config returns 120s global, 90s warmup
- **Coverage Target**: 95%

**Implementation**:
1. Create `src/core/lsp/config/lsp-config.ts`
2. Define Zod schema for LspConfig interface
3. Add defaults: timeout=120, warmupTimeout=90

**Dependencies**: None

---

### T-007: Implement timeout resolution with per-language overrides

**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-05
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** `lsp.perLanguage.csharp.timeout: 180`
- **When** resolveTimeout('csharp') called
- **Then** returns 180 (not global 120)

**Test Cases** (`src/core/lsp/config/__tests__/timeout-resolver.test.ts`):
- `testPerLanguageOverride()`: Language-specific wins
- `testGlobalFallback()`: Uses global when no per-language
- `testDefaultFallback()`: Uses 120s when no config
- `testWarmupTimeoutResolution()`: Separate warmup timeout resolved
- **Coverage Target**: 95%

**Implementation**:
1. Create `src/core/lsp/config/timeout-resolver.ts`
2. Resolution order: perLanguage > global > default
3. Separate methods for timeout and warmupTimeout

**Dependencies**: T-006

---

### T-008: Integrate timeout config into LSP clients

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** lsp-manager with custom timeout config
- **When** LSP request made
- **Then** request uses configured timeout

**Test Cases** (`src/core/lsp/__tests__/lsp-manager.test.ts`):
- `testTimeoutAppliedToRequests()`: Request timeout uses config
- `testWarmupUsesWarmupTimeout()`: Warm-up phase uses warmupTimeout
- **Coverage Target**: 85%

**Implementation**:
1. Inject TimeoutResolver into LspManager
2. Pass resolved timeout to request methods
3. Update existing hardcoded 60000ms to use resolver

**Dependencies**: T-007

---

## US-003: LSP Server Recommendations (P1)

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Tasks**: 2 total, 0 completed

---

### T-009: Implement language analyzer with weighted file counting

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** project with 100 .cs files and 1 .sln
- **When** analyzer runs
- **Then** .sln weighted higher, C# ranked top

**Test Cases** (`src/core/lsp/config/__tests__/language-analyzer.test.ts`):
- `testWeightedScoring()`: Project files score higher
- `testTop3Ranking()`: Returns max 3 languages
- **Coverage Target**: 90%

**Implementation**:
1. Create `src/core/lsp/config/language-analyzer.ts`
2. Weight: project file=10, source file=1
3. Return sorted top 3

**Dependencies**: None

---

### T-010: Create interactive LSP suggestion prompt

**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** analyzer suggests csharp, typescript
- **When** prompt shown
- **Then** user can confirm/modify selection

**Test Cases** (`src/core/lsp/config/__tests__/lsp-prompt.test.ts`):
- `testInteractivePrompt()`: Shows suggestions
- `testInstallCommandShown()`: Missing servers show install cmd
- `testMax3Enforced()`: Can't enable more than 3
- **Coverage Target**: 85%

**Implementation**:
1. Create `src/core/lsp/config/lsp-prompt.ts`
2. Show install commands (dotnet tool install, npm i -g, etc.)
3. Enforce max 3 active servers

**Dependencies**: T-009

---

## US-004: Custom LSP Server Registration (P2)

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Tasks**: 2 total, 0 completed

---

### T-011: Add custom server config parsing

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** `lsp.servers.myLang` in config
- **When** LSP initializes
- **Then** custom server is registered

**Test Cases** (`src/core/lsp/config/__tests__/server-registry.test.ts`):
- `testCustomServerParsed()`: Config correctly parsed
- `testBuiltInAndCustomMerged()`: Both available
- **Coverage Target**: 85%

**Implementation**:
1. Extend LspConfig schema for servers map
2. Merge custom with built-in in server-registry.ts

**Dependencies**: T-006

---

### T-012: Implement security warning and binary validation

**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** first use of custom server
- **When** initialized
- **Then** security warning shown, confirmation required

**Test Cases** (`src/core/lsp/config/__tests__/server-validator.test.ts`):
- `testSecurityWarning()`: Warning shown on first use
- `testBinaryExists()`: Check binary path exists
- `testBinaryExecutable()`: Check +x permission
- `testClearError()`: Invalid path shows fix suggestion
- **Coverage Target**: 90%

**Implementation**:
1. Create `src/core/lsp/config/server-validator.ts`
2. Check fs.access(path, fs.constants.X_OK)
3. Store confirmation in `.specweave/cache/lsp-trusted.json`

**Dependencies**: T-011

---

## US-005: Progress Feedback & Diagnostics (P1)

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Tasks**: 3 total, 0 completed

---

### T-013: Implement progress bar for LSP operations

**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** LSP indexing in progress
- **When** waiting
- **Then** progress bar with elapsed time shown

**Implementation**:
1. Create `src/core/lsp/diagnostics/progress.ts`
2. Use cli-progress or ora for terminal output
3. Show elapsed time in seconds

**Dependencies**: None

---

### T-014: Add detailed symbol count reporting

**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** warm-up complete
- **When** reported
- **Then** shows "847 symbols: 423 functions, 312 classes"

**Implementation**:
1. Query workspace/symbol after warm-up
2. Group by symbolKind
3. Format output

**Dependencies**: T-013

---

### T-015: Implement `specweave lsp doctor` command

**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** `specweave lsp doctor`
- **When** run
- **Then** shows installed servers, connectivity, suggestions

**Test Cases** (`src/cli/__tests__/lsp-doctor.test.ts`):
- `testServerDetection()`: Lists installed LSP servers
- `testConnectivityCheck()`: Tests server startup
- `testSuggestions()`: Recommends fixes
- **Coverage Target**: 85%

**Implementation**:
1. Create `src/core/lsp/diagnostics/lsp-doctor.ts`
2. Add `doctor` subcommand to lsp CLI
3. Write logs to `.specweave/logs/lsp-doctor-*.log`

**Dependencies**: T-009

---

## US-006: Symbol Caching (P2)

**Linked ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Tasks**: 2 total, 0 completed

---

### T-016: Implement disk-based symbol cache

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-03
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** LSP query result
- **When** cached
- **Then** stored in `.specweave/cache/lsp/`

**Test Cases** (`src/core/lsp/cache/__tests__/symbol-cache.test.ts`):
- `testCacheWrite()`: Symbols written to disk
- `testCacheRead()`: Cached result returned
- `testCacheKeyFormat()`: Key includes file, symbol, lang, version
- **Coverage Target**: 90%

**Implementation**:
1. Create `src/core/lsp/cache/symbol-cache.ts`
2. Use JSON files keyed by hash of (file+symbol+lang+version)

**Dependencies**: None

---

### T-017: Implement mtime-based cache invalidation

**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** cached symbol for file.ts
- **When** file.ts modified
- **Then** cache invalidated

**Test Cases** (`src/core/lsp/cache/__tests__/cache-invalidation.test.ts`):
- `testMtimeCheck()`: Changed mtime invalidates
- `testUnchangedReturnsCache()`: Same mtime uses cache
- **Coverage Target**: 90%

**Implementation**:
1. Store mtime in cache entry
2. Compare on cache read
3. Return null if stale

**Dependencies**: T-016

---

## US-007: Error Handling & Fallback (P1)

**Linked ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04
**Tasks**: 2 total, 0 completed

---

### T-018: Implement fail-fast error handling

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [ ] pending
**Model**: sonnet

**Test Plan**:
- **Given** LSP error
- **When** handling
- **Then** fail fast with clear message, fallback to grep

**Test Cases** (`src/core/lsp/__tests__/error-handler.test.ts`):
- `testFailFast()`: No silent retry
- `testGrepFallback()`: Crash triggers grep search
- `testClearMessage()`: Error includes fix suggestion
- **Coverage Target**: 85%

**Implementation**:
1. Remove existing retry logic
2. Add grep fallback in lsp-manager.ts
3. Format user-friendly error messages

**Dependencies**: None

---

### T-019: Implement project root detection with upward search

**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-04
**Status**: [ ] pending
**Model**: haiku

**Test Plan**:
- **Given** command run from src/utils/
- **When** detecting project root
- **Then** searches upward until package.json/.sln found

**Test Cases** (`src/core/lsp/__tests__/project-detector.test.ts`):
- `testUpwardSearch()`: Finds project file in parent
- `testUnknownProject()`: Suggests LSP based on file extensions
- **Coverage Target**: 85%

**Implementation**:
1. Create `src/core/lsp/config/project-detector.ts`
2. Walk up from cwd until project file found
3. If none found, count extensions and suggest

**Dependencies**: T-009

---

## US-008: Modular Code Architecture (P2)

**Linked ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04
**Tasks**: 2 total, 0 completed

---

### T-020: Scaffold modular directory structure

**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [ ] pending
**Model**: haiku

**Implementation**:
1. Create directories: config/, servers/, warmup/, cache/, diagnostics/
2. Add index.ts in each with exports
3. Update main lsp/index.ts

**Dependencies**: None

---

### T-021: Migrate existing code to modular structure

**User Story**: US-008
**Satisfies ACs**: AC-US8-02, AC-US8-03, AC-US8-04
**Status**: [ ] pending
**Model**: opus

**Implementation**:
1. Move lsp-client.ts logic to servers/generic-lsp.ts
2. Move tsserver-client.ts to servers/tsserver.ts
3. Extract warm-up logic to warmup/executor.ts
4. Update all imports in lsp-manager.ts
5. Run tests after each move

**Dependencies**: T-020, T-001, T-006
