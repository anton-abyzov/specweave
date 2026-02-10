# Tasks: Multi-Language LSP Warm-up & Configurable Timeouts

## Task Legend

- `[ ]` Not started | `[x]` Completed
- TDD Phases: `[RED]` Write failing test | `[GREEN]` Minimal implementation | `[REFACTOR]` Code quality
- Model hints: haiku (simple), sonnet (default), opus (complex)

---

## Phase 1: Foundation (No Dependencies)

### T-001: [RED] Write failing tests for LspConfig schema

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/config/__tests__/lsp-config.test.ts`

**Tests to Write**:
```typescript
describe('LspConfig', () => {
  it('parses global timeout in seconds', () => {
    const config = parseLspConfig({ lsp: { timeout: 120 } });
    expect(config.timeout).toBe(120); // seconds, not ms
  });

  it('parses warmupTimeout separately', () => {
    const config = parseLspConfig({ lsp: { warmupTimeout: 90 } });
    expect(config.warmupTimeout).toBe(90);
  });

  it('uses defaults when config missing', () => {
    const config = parseLspConfig({});
    expect(config.timeout).toBe(120);
    expect(config.warmupTimeout).toBe(90);
  });
});
```

**Expected**: Tests FAIL (module doesn't exist yet)

**Dependencies**: None

---

### T-002: [GREEN] Implement LspConfig schema with Zod

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-001

**Implementation**:
1. Create `src/core/lsp/config/lsp-config.ts`
2. Define Zod schema for LspConfig interface
3. Add defaults: timeout=120, warmupTimeout=90
4. Export parseLspConfig() function

**Expected**: T-001 tests PASS

---

### T-003: [RED] Write failing tests for timeout resolution

**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-05
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/config/__tests__/timeout-resolver.test.ts`

**Tests to Write**:
```typescript
describe('TimeoutResolver', () => {
  it('uses perLanguage override when present', () => {
    const resolver = new TimeoutResolver({
      timeout: 120,
      perLanguage: { csharp: { timeout: 180 } }
    });
    expect(resolver.getTimeout('csharp')).toBe(180);
  });

  it('falls back to global when no perLanguage', () => {
    const resolver = new TimeoutResolver({ timeout: 120 });
    expect(resolver.getTimeout('go')).toBe(120);
  });

  it('resolves warmupTimeout separately', () => {
    const resolver = new TimeoutResolver({
      warmupTimeout: 90,
      perLanguage: { csharp: { warmupTimeout: 120 } }
    });
    expect(resolver.getWarmupTimeout('csharp')).toBe(120);
  });
});
```

**Expected**: Tests FAIL (TimeoutResolver doesn't exist)

**Dependencies**: T-002

---

### T-004: [GREEN] Implement TimeoutResolver with per-language overrides

**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-05
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-003

**Implementation**:
1. Create `src/core/lsp/config/timeout-resolver.ts`
2. Resolution order: perLanguage > global > default
3. Separate methods for timeout and warmupTimeout

**Expected**: T-003 tests PASS

---

### T-005: [RED] Write failing tests for WarmupStrategy interface

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/warmup/__tests__/strategy.test.ts`

**Tests to Write**:
```typescript
describe('WarmupExecutor', () => {
  it('opens files sequentially with delay', async () => {
    const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts']);
    const executor = new WarmupExecutor();
    const openTimes: number[] = [];

    await executor.warmup(strategy, {
      onFileOpen: () => openTimes.push(Date.now())
    });

    // Files should be opened ~100ms apart
    expect(openTimes[1] - openTimes[0]).toBeGreaterThanOrEqual(90);
  });

  it('respects openCount limit', async () => {
    const strategy = new MockStrategy(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']);
    const executor = new WarmupExecutor();
    const opened: string[] = [];

    await executor.warmup(strategy, { openCount: 3 });

    expect(opened.length).toBe(3);
  });
});
```

**Expected**: Tests FAIL (WarmupExecutor doesn't exist)

**Dependencies**: None

---

### T-006: [GREEN] Implement WarmupStrategy interface and executor

**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-005

**Implementation**:
1. Create `src/core/lsp/warmup/strategy.ts` with WarmupStrategy interface
2. Create `src/core/lsp/warmup/executor.ts` for sequential logic
3. Add 100ms delay between file opens

**Expected**: T-005 tests PASS

---

### T-007: [RED] Write failing tests for language analyzer

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/config/__tests__/language-analyzer.test.ts`

**Tests to Write**:
```typescript
describe('LanguageAnalyzer', () => {
  it('weights project files higher than source files', async () => {
    // Mock filesystem with 1 .sln and 100 .cs files
    const analyzer = new LanguageAnalyzer(mockFs);
    const results = await analyzer.analyze('/project');

    expect(results[0].language).toBe('csharp');
    expect(results[0].score).toBeGreaterThan(100); // .sln = 10, .cs = 1 each
  });

  it('returns max 3 languages', async () => {
    // Mock with 5 different languages
    const results = await analyzer.analyze('/polyglot');
    expect(results.length).toBe(3);
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: None

---

### T-008: [GREEN] Implement language analyzer with weighted scoring

**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-007

**Implementation**:
1. Create `src/core/lsp/config/language-analyzer.ts`
2. Weight: project file=10, source file=1
3. Return sorted top 3

**Expected**: T-007 tests PASS

---

## Phase 2: Multi-Language Warm-up Strategies

### T-009: [RED] Write failing tests for C# warm-up strategy

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/warmup/strategies/__tests__/csharp.test.ts`

**Tests to Write**:
```typescript
describe('CSharpStrategy', () => {
  it('detects .sln at project root', async () => {
    const strategy = new CSharpStrategy(mockFs);
    const root = await strategy.detectProjectRoot('/project');
    expect(root).toBe('/project');
    expect(strategy.solutionFile).toBe('MyApp.sln');
  });

  it('falls back to .csproj if no .sln', async () => {
    const strategy = new CSharpStrategy(mockFsNosln);
    const root = await strategy.detectProjectRoot('/project');
    expect(strategy.projectFile).toBe('MyApp.csproj');
  });

  it('prompts for choice when multiple .sln files', async () => {
    const promptMock = vi.fn().mockResolvedValue('App2.sln');
    const strategy = new CSharpStrategy(mockFsMultiSln, promptMock);
    await strategy.detectProjectRoot('/project');
    expect(promptMock).toHaveBeenCalled();
  });

  it('caches solution choice', async () => {
    const strategy = new CSharpStrategy(mockFs);
    await strategy.detectProjectRoot('/project');
    // Check .specweave/cache/lsp-choices.json was written
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-006

---

### T-010: [GREEN] Implement C# warm-up strategy

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-009

**Implementation**:
1. Create `src/core/lsp/warmup/strategies/csharp.ts`
2. Implement .sln detection with upward search
3. Add interactive prompt for multiple .sln files
4. Cache choice in `.specweave/cache/lsp-choices.json`

**Expected**: T-009 tests PASS

---

### T-011: [RED] Write failing tests for Go/TypeScript/Python/Rust strategies

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Model**: haiku

**Test Files**: `src/core/lsp/warmup/strategies/__tests__/{go,typescript,python,rust}.test.ts`

**Tests to Write**:
- Go: go.mod detection, opens .go files
- TypeScript: tsconfig.json detection, opens .ts/.tsx files
- Python: pyproject.toml/requirements.txt detection
- Rust: Cargo.toml detection

**Expected**: Tests FAIL

**Dependencies**: T-006

---

### T-012: [GREEN] Implement Go/TypeScript/Python/Rust strategies

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Model**: haiku
**Depends On**: T-011

**Implementation**:
1. Create `typescript.ts`, `python.ts`, `go.ts`, `rust.ts` in strategies/
2. Each follows WarmupStrategy interface

**Expected**: T-011 tests PASS

---

### T-013: [RED] Write failing test for --skip-warmup flag

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Model**: haiku

**Test File**: `src/cli/__tests__/lsp.test.ts`

**Test to Write**:
```typescript
it('skips warmup when --skip-warmup flag present', async () => {
  const warmupSpy = vi.spyOn(executor, 'warmup');
  await runLspCommand(['refs', '--skip-warmup', 'file.ts', 'Symbol']);
  expect(warmupSpy).not.toHaveBeenCalled();
});
```

**Expected**: Test FAILS

**Dependencies**: T-006

---

### T-014: [GREEN] Add --skip-warmup CLI flag

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Model**: haiku
**Depends On**: T-013

**Implementation**:
1. Add `--skip-warmup` option to lsp command
2. Skip `executor.warmup()` call when flag present

**Expected**: T-013 test PASSES

---

## Phase 3: Diagnostics & Error Handling

### T-015: Implement progress bar for LSP operations

**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [x] completed
**Model**: haiku

**Implementation** (no formal test needed - UI component):
1. Create `src/core/lsp/diagnostics/progress.ts`
2. Use ora for spinner with elapsed time
3. Show: "🔄 csharp-ls indexing (45s elapsed)..."

**Dependencies**: None

---

### T-016: Implement detailed symbol count reporting

**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [x] completed
**Model**: haiku
**Depends On**: T-015

**Implementation**:
1. Query workspace/symbol after warm-up
2. Group by symbolKind (Function, Class, Interface, etc.)
3. Format: "✅ LSP ready - 847 symbols (423 functions, 312 classes, 112 interfaces)"

---

### T-017: [RED] Write failing tests for lsp doctor command

**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/cli/__tests__/lsp-doctor.test.ts`

**Tests to Write**:
```typescript
describe('lsp doctor', () => {
  it('detects installed LSP servers', async () => {
    const result = await runLspDoctor();
    expect(result.installedServers).toContain('typescript-language-server');
  });

  it('tests server connectivity', async () => {
    const result = await runLspDoctor();
    expect(result.connectivity.typescript).toBe('ok');
  });

  it('suggests fixes for common issues', async () => {
    const result = await runLspDoctor({ mockMissingServer: 'csharp-ls' });
    expect(result.suggestions).toContain('dotnet tool install -g csharp-ls');
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-008

---

### T-018: [GREEN] Implement lsp doctor command

**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-017

**Implementation**:
1. Create `src/core/lsp/diagnostics/lsp-doctor.ts`
2. Add `doctor` subcommand to lsp CLI
3. Write logs to `.specweave/logs/lsp-doctor-*.log`

**Expected**: T-017 tests PASS

---

### T-019: [RED] Write failing tests for error handling

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/__tests__/error-handler.test.ts`

**Tests to Write**:
```typescript
describe('LspErrorHandler', () => {
  it('fails fast without retry', async () => {
    const handler = new LspErrorHandler();
    const result = await handler.handle(new Error('LSP timeout'));
    expect(result.retried).toBe(false);
  });

  it('falls back to grep on crash', async () => {
    const grepSpy = vi.spyOn(grepFallback, 'search');
    await handler.handle(new Error('LSP process crashed'));
    expect(grepSpy).toHaveBeenCalled();
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: None

---

### T-020: [GREEN] Implement fail-fast error handling with grep fallback

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-019

**Implementation**:
1. Create `src/core/lsp/error-handler.ts`
2. Remove existing retry logic from lsp-manager.ts
3. Add grep fallback
4. Format user-friendly error messages

**Expected**: T-019 tests PASS

---

### T-021: [RED] Write failing tests for project root detection

**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-04
**Status**: [x] completed
**Model**: haiku

**Test File**: `src/core/lsp/__tests__/project-detector.test.ts`

**Tests to Write**:
```typescript
describe('ProjectDetector', () => {
  it('searches upward for project file', async () => {
    // cwd = /project/src/utils, package.json at /project
    const detector = new ProjectDetector();
    const root = await detector.findRoot('/project/src/utils');
    expect(root).toBe('/project');
  });

  it('suggests LSP based on file extensions when no project file', async () => {
    const result = await detector.analyzeUnknownProject('/unknown');
    expect(result.suggestedLanguage).toBe('typescript'); // most .ts files
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-008

---

### T-022: [GREEN] Implement project root detection

**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-04
**Status**: [x] completed
**Model**: haiku
**Depends On**: T-021

**Implementation**:
1. Create `src/core/lsp/config/project-detector.ts`
2. Walk up from cwd until project file found
3. If none found, count extensions and suggest

**Expected**: T-021 tests PASS

---

## Phase 4: Advanced Features

### T-023: [RED] Write failing tests for custom server config

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Model**: haiku

**Test File**: `src/core/lsp/config/__tests__/server-registry.test.ts`

**Tests to Write**:
```typescript
describe('ServerRegistry', () => {
  it('parses custom server from config', () => {
    const registry = new ServerRegistry({
      servers: { myLang: { command: 'my-lsp', args: ['--stdio'] } }
    });
    expect(registry.get('myLang')).toBeDefined();
  });

  it('merges custom with built-in servers', () => {
    const registry = new ServerRegistry({ servers: { custom: {...} } });
    expect(registry.get('typescript')).toBeDefined(); // built-in
    expect(registry.get('custom')).toBeDefined(); // custom
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-002

---

### T-024: [GREEN] Implement custom server config parsing

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Model**: haiku
**Depends On**: T-023

**Implementation**:
1. Extend LspConfig schema for servers map
2. Create `src/core/lsp/config/server-registry.ts`
3. Merge custom with built-in servers

**Expected**: T-023 tests PASS

---

### T-025: [RED] Write failing tests for security validation

**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/config/__tests__/server-validator.test.ts`

**Tests to Write**:
```typescript
describe('ServerValidator', () => {
  it('shows security warning on first custom server use', async () => {
    const warnSpy = vi.spyOn(console, 'warn');
    await validator.validateCustomServer('myLang', '/path/to/lsp');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('security'));
  });

  it('validates binary exists and is executable', async () => {
    const result = await validator.validateBinary('/nonexistent');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-024

---

### T-026: [GREEN] Implement security warning and binary validation

**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-025

**Implementation**:
1. Create `src/core/lsp/config/server-validator.ts`
2. Check fs.access(path, fs.constants.X_OK)
3. Store trust confirmation in `.specweave/cache/lsp-trusted.json`

**Expected**: T-025 tests PASS

---

### T-027: [RED] Write failing tests for symbol cache

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/cache/__tests__/symbol-cache.test.ts`

**Tests to Write**:
```typescript
describe('SymbolCache', () => {
  it('writes symbols to disk', async () => {
    const cache = new SymbolCache('/cache');
    await cache.set('file.ts', 'MyClass', [/* locations */]);
    expect(fs.existsSync('/cache/abc123.json')).toBe(true);
  });

  it('reads cached result', async () => {
    await cache.set('file.ts', 'MyClass', locations);
    const result = await cache.get('file.ts', 'MyClass');
    expect(result).toEqual(locations);
  });

  it('invalidates on mtime change', async () => {
    await cache.set('file.ts', 'MyClass', locations);
    // Simulate file modification
    mockFs.setMtime('file.ts', Date.now());
    const result = await cache.get('file.ts', 'MyClass');
    expect(result).toBeNull();
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: None

---

### T-028: [GREEN] Implement symbol cache with mtime invalidation

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-027

**Implementation**:
1. Create `src/core/lsp/cache/symbol-cache.ts`
2. Use JSON files keyed by hash of (file+symbol+lang+version)
3. Store mtime in cache entry, compare on read

**Expected**: T-027 tests PASS

---

### T-029: [RED] Write failing tests for interactive LSP prompt

**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Model**: sonnet

**Test File**: `src/core/lsp/config/__tests__/lsp-prompt.test.ts`

**Tests to Write**:
```typescript
describe('LspPrompt', () => {
  it('shows suggestions from analyzer', async () => {
    const prompt = new LspPrompt(mockInquirer);
    await prompt.show(['typescript', 'csharp', 'python']);
    expect(mockInquirer.prompt).toHaveBeenCalled();
  });

  it('shows install command for missing servers', async () => {
    const output = await prompt.show(['csharp']);
    expect(output).toContain('dotnet tool install -g csharp-ls');
  });

  it('enforces max 3 servers', async () => {
    const result = await prompt.show(['ts', 'cs', 'py', 'go']);
    expect(result.enabled.length).toBeLessThanOrEqual(3);
  });
});
```

**Expected**: Tests FAIL

**Dependencies**: T-008

---

### T-030: [GREEN] Implement interactive LSP suggestion prompt

**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-029

**Implementation**:
1. Create `src/core/lsp/config/lsp-prompt.ts`
2. Show install commands (dotnet tool install, npm i -g, etc.)
3. Enforce max 3 active servers

**Expected**: T-029 tests PASS

---

## Phase 5: Integration & Refactoring

### T-031: Scaffold modular directory structure

**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed
**Model**: haiku

**Implementation** (no test needed - filesystem scaffolding):
1. Create directories: config/, servers/, warmup/, cache/, diagnostics/
2. Add index.ts in each with exports
3. Update main lsp/index.ts

**Dependencies**: None

---

### T-032: Integrate timeout config into LSP clients

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Model**: sonnet
**Depends On**: T-004, T-006

**Implementation**:
1. Inject TimeoutResolver into LspManager
2. Pass resolved timeout to request methods
3. Update existing hardcoded 60000ms to use resolver

---

### T-033: [REFACTOR] Migrate existing code to modular structure

**User Story**: US-008
**Satisfies ACs**: AC-US8-02, AC-US8-03, AC-US8-04
**Status**: [x] completed
**Model**: opus
**Depends On**: T-031, T-006, T-010, T-020

**Implementation**:
1. Move lsp-client.ts logic to servers/generic-lsp.ts
2. Move tsserver-client.ts to servers/tsserver.ts
3. Extract warm-up logic to warmup/executor.ts
4. Update all imports in lsp-manager.ts
5. Run tests after each move

**Expected**: All existing tests still PASS

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T-001 to T-008 | Foundation (config, interfaces) |
| 2 | T-009 to T-014 | Multi-language strategies |
| 3 | T-015 to T-022 | Diagnostics & error handling |
| 4 | T-023 to T-030 | Advanced features |
| 5 | T-031 to T-033 | Integration & refactor |

**Total**: 33 tasks (16 RED, 15 GREEN, 1 REFACTOR, 1 scaffold)
