# Test Strategy: Context Loader for Selective Specification Loading

## Test Philosophy

Follow SpecWeave Constitution Article III: Test-First Development

- Tests written before implementation (TDD workflow)
- Tests must fail initially (red-green-refactor)
- Integration tests with real spec files
- Performance tests to validate success criteria

## Test Categories

### Unit Tests (Component-Level)

Test individual components in isolation with mocked dependencies.

### Integration Tests (End-to-End)

Test complete flows from manifest → loaded context with real files.

### Performance Tests (Benchmarking)

Measure token reduction, cache hit rates, and load times.

### Regression Tests (Brownfield Support)

Validate existing behavior is preserved when modifying components.

---

## Test Cases

### TC-001: Parse Valid Context Manifest
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Component**: ContextManifestParser

**Scenario**:
- Given a valid context-manifest.yaml file
- When ContextManifestParser.parse(manifestPath) is called
- Then the manifest is parsed successfully
- And spec_sections, architecture, adrs, and max_context_tokens are extracted

**Test Data**:
```yaml
# test-fixtures/valid-manifest.yaml
spec_sections:
  - specs/modules/payments/stripe/spec.md
architecture:
  - architecture/system-design.md#context-loading
adrs:
  - adrs/004-context-loading-approach.md
max_context_tokens: 10000
priority: high
```

**Expected Results**:
- Parsed object matches input structure
- No errors or warnings
- File paths are resolved to absolute paths

---

### TC-002: Reject Invalid Manifest Schema
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Component**: ContextManifestParser

**Scenario**:
- Given an invalid context-manifest.yaml (missing required fields)
- When ContextManifestParser.parse(manifestPath) is called
- Then an error is thrown
- And error message clearly indicates missing field

**Test Data**:
```yaml
# test-fixtures/invalid-manifest.yaml
spec_sections:
  - specs/module/payments.md
# Missing max_context_tokens (required field)
```

**Expected Results**:
- Error thrown: `ManifestValidationError`
- Message: "Missing required field: max_context_tokens"

---

### TC-003: Resolve Glob Patterns
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Component**: ContextManifestParser

**Scenario**:
- Given a manifest with glob pattern `specs/modules/payments/**/*.md`
- When ContextManifestParser.resolveGlobs() is called
- Then all matching files are returned
- And files are sorted alphabetically

**Test Data**:
```
specs/modules/payments/
├── overview.md
├── stripe/
│   ├── spec.md
│   └── webhooks.md
└── paypal/
    └── spec.md
```

**Expected Results**:
- Returns 4 files: overview.md, stripe/spec.md, stripe/webhooks.md, paypal/spec.md
- Files are absolute paths
- Order is deterministic (alphabetical)

---

### TC-004: Load File Content
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Component**: SelectiveLoader

**Scenario**:
- Given a file path to a markdown spec
- When SelectiveLoader.loadFile(filePath) is called
- Then the file content is read and returned
- And markdown is preserved exactly

**Test Data**:
```markdown
# test-fixtures/sample-spec.md
# Sample Spec

## Overview
This is a sample specification.
```

**Expected Results**:
- Content matches file exactly
- No truncation or modification
- Preserves newlines and formatting

---

### TC-005: Extract Section by Anchor
**Type**: Unit
**Priority**: P1
**User Story**: US3
**Component**: SelectiveLoader

**Scenario**:
- Given a markdown file with multiple sections
- And a section anchor `#authentication-flow`
- When SelectiveLoader.extractSection(filePath, anchor) is called
- Then only the "Authentication Flow" section is returned
- And content extends to the next same-level header

**Test Data**:
```markdown
# test-fixtures/multi-section-spec.md
# API Specification

## Authentication Flow
Handles user authentication...

### OAuth 2.0
Implements OAuth...

## Payment Processing
Handles payments...
```

**Expected Results**:
- Returns content from "## Authentication Flow" to before "## Payment Processing"
- Includes nested "### OAuth 2.0" section
- Preserves markdown structure

---

### TC-006: Handle Nested Sections
**Type**: Unit
**Priority**: P1
**User Story**: US3
**Component**: SelectiveLoader

**Scenario**:
- Given a markdown file with nested headers (##, ###, ####)
- And an anchor to a nested section `#oauth-20`
- When SelectiveLoader.extractSection(filePath, anchor) is called
- Then only the "### OAuth 2.0" subsection is returned

**Test Data**:
See TC-005 markdown

**Expected Results**:
- Returns only "### OAuth 2.0" content
- Stops before next ### or higher-level header
- Preserves formatting

---

### TC-007: Count Tokens in Markdown
**Type**: Unit
**Priority**: P1
**User Story**: US4
**Component**: Token Counter

**Scenario**:
- Given markdown content of known token count
- When tokenCounter.count(content) is called
- Then accurate token count is returned

**Test Data**:
```markdown
# Hello World

This is a test document with approximately 20 tokens.
```

**Expected Results**:
- Token count matches js-tiktoken output
- Accuracy within ±2 tokens (due to markdown formatting)

---

### TC-008: Enforce Token Budget
**Type**: Unit
**Priority**: P1
**User Story**: US4
**Component**: TokenBudgetEnforcer

**Scenario**:
- Given loaded context with 12,000 tokens
- And a budget of 10,000 tokens
- When TokenBudgetEnforcer.validate(context, budget) is called
- Then an error is thrown indicating budget exceeded

**Expected Results**:
- Error: `TokenBudgetExceededError`
- Message includes actual (12,000) and budgeted (10,000) tokens
- Suggests optimization strategies

---

### TC-009: Warn When Approaching Budget
**Type**: Unit
**Priority**: P2
**User Story**: US4
**Component**: TokenBudgetEnforcer

**Scenario**:
- Given loaded context with 8,500 tokens
- And a budget of 10,000 tokens
- When TokenBudgetEnforcer.validate(context, budget) is called
- Then a warning is logged (85% of budget used)

**Expected Results**:
- No error thrown
- Warning logged: "Context at 85% of budget (8500/10000 tokens)"
- Validation passes

---

### TC-010: Save and Load Cache Entry
**Type**: Unit
**Priority**: P1
**User Story**: US2
**Component**: CacheManager

**Scenario**:
- Given a parsed spec with content and metadata
- When CacheManager.save(filePath, entry) is called
- Then the entry is saved to `.specweave/cache/`
- And CacheManager.load(filePath) retrieves it correctly

**Test Data**:
```json
{
  "file_path": "specs/payments/stripe/spec.md",
  "content": "# Stripe Integration...",
  "tokens": 2500,
  "headers": [...],
  "modified_time": 1737840000,
  "cached_time": 1737840123
}
```

**Expected Results**:
- Cache entry saved to `.specweave/cache/specs/payments/stripe/spec-md.json`
- Load() returns identical object
- JSON is formatted for readability

---

### TC-011: Invalidate Cache on File Modification
**Type**: Unit
**Priority**: P1
**User Story**: US2
**Component**: CacheManager

**Scenario**:
- Given a cached spec entry
- When the source file is modified (newer mtime)
- And CacheManager.load(filePath) is called
- Then the cache is invalidated
- And null is returned (indicating cache miss)

**Test Data**:
- Cache entry with `modified_time: 1737840000`
- File on disk with `mtime: 1737841000` (1000 seconds later)

**Expected Results**:
- load() returns null
- Cache entry is deleted
- Next load will trigger re-parsing

---

### TC-012: Cache Statistics
**Type**: Unit
**Priority**: P2
**User Story**: US2
**Component**: CacheManager

**Scenario**:
- Given multiple cache operations (hits and misses)
- When CacheManager.getStats() is called
- Then statistics are returned with hit rate, entry count, total size

**Test Data**:
- 10 loads: 7 hits, 3 misses

**Expected Results**:
```json
{
  "hits": 7,
  "misses": 3,
  "hit_rate": 0.70,
  "entry_count": 15,
  "total_size_bytes": 245000
}
```

---

### TC-013: Build Context Index
**Type**: Unit
**Priority**: P2
**User Story**: US5
**Component**: ContextIndexBuilder

**Scenario**:
- Given a specs directory with multiple markdown files
- When ContextIndexBuilder.buildIndex('specs/') is called
- Then an index is generated with all sections and metadata

**Test Data**:
```
specs/
├── constitution.md
└── modules/
    ├── payments/
    │   ├── overview.md
    │   └── stripe/
    │       └── spec.md
    └── auth/
        └── spec.md
```

**Expected Results**:
- Index includes 4 files
- All headers extracted with anchors
- Token counts calculated per section
- Index saved to `.specweave/cache/context-index.json`

---

### TC-014: Search Context Index by Keyword
**Type**: Unit
**Priority**: P2
**User Story**: US5
**Component**: ContextIndexBuilder

**Scenario**:
- Given a built context index
- When ContextIndexBuilder.search('stripe') is called
- Then all sections mentioning "stripe" are returned

**Expected Results**:
- Returns sections from `specs/modules/payments/stripe/spec.md`
- Ranked by relevance
- Includes section titles, anchors, and file paths

---

### TC-015: Integration - Load Context from Manifest
**Type**: Integration
**Priority**: P1
**User Story**: US1

**Scenario**:
- Given a complete context manifest
- When contextLoader.load(manifestPath) is called
- Then all declared specs are loaded
- And sections are extracted correctly
- And token budget is enforced
- And cache is used when available

**Test Data**:
```yaml
# test-fixtures/integration-manifest.yaml
spec_sections:
  - specs/modules/payments/**/*.md
  - specs/constitution.md#article-iv
architecture:
  - architecture/system-design.md
max_context_tokens: 15000
```

**Expected Results**:
- All payment specs loaded
- Constitution Article IV extracted
- System design loaded fully
- Total tokens < 15000
- Cache used on second run (faster)

---

### TC-016: Integration - Context Budget Exceeded
**Type**: Integration
**Priority**: P1
**User Story**: US4

**Scenario**:
- Given a manifest with too many specs
- And a low token budget (5000 tokens)
- When contextLoader.load(manifestPath) is called
- Then an error is thrown before sending to AI

**Expected Results**:
- Error: `TokenBudgetExceededError`
- Message: "Context requires 8500 tokens but budget is 5000"
- Suggestions: "Consider more specific section anchors or split into multiple manifests"

---

### TC-017: Performance - Token Reduction
**Type**: Performance
**Priority**: P1
**Success Criteria**: 70%+ reduction

**Scenario**:
- Given a large spec (500 pages, 100k tokens)
- When loaded via manifest with specific sections (30k tokens)
- Then token reduction is measured

**Expected Results**:
- Full spec: ~100,000 tokens
- Selective loading: ~30,000 tokens
- Reduction: 70%
- Success criteria met ✅

---

### TC-018: Performance - Cache Hit Rate
**Type**: Performance
**Priority**: P1
**Success Criteria**: >60% hit rate

**Scenario**:
- Given repeated context loading operations
- When cache is enabled
- Then cache hit rate is measured

**Test Data**:
- 100 context load operations
- 40 unique manifests (reused)

**Expected Results**:
- Cache hits: >60
- Cache misses: <40
- Hit rate: >60%
- Success criteria met ✅

---

### TC-019: Performance - Load Time (Cached)
**Type**: Performance
**Priority**: P1
**Success Criteria**: <500ms

**Scenario**:
- Given a cached spec
- When contextLoader.load() is called
- Then load completes in <500ms

**Expected Results**:
- Average load time: <500ms
- 95th percentile: <700ms
- Success criteria met ✅

---

### TC-020: Performance - Load Time (Uncached)
**Type**: Performance
**Priority**: P2
**Success Criteria**: <2s

**Scenario**:
- Given uncached specs
- When contextLoader.load() is called (cache miss)
- Then load completes in <2s

**Expected Results**:
- Average load time: <2000ms
- 95th percentile: <3000ms
- Success criteria met ✅

---

### TC-021: Regression - Missing File Handling
**Type**: Regression
**Priority**: P1
**User Story**: US1

**Scenario**:
- Given a manifest referencing a non-existent file
- When contextLoader.load() is called
- Then a warning is logged
- And loading continues with remaining files

**Expected Results**:
- Warning: "File not found: specs/missing.md (skipping)"
- Other files loaded successfully
- No error thrown (graceful degradation)

---

### TC-022: Regression - Malformed Markdown
**Type**: Regression
**Priority**: P1
**User Story**: US3

**Scenario**:
- Given a markdown file with syntax errors
- When SelectiveLoader.loadFile() is called
- Then content is still loaded (raw)
- And a warning is logged

**Expected Results**:
- Content loaded as-is
- Warning: "Markdown parsing issue in file (proceeding with raw content)"
- No crash or exception

---

## Test Coverage Targets

### Overall Coverage
- **Unit test coverage**: >80% (lines and branches)
- **Integration test coverage**: All critical paths (manifest → context)
- **E2E coverage**: All P1 user stories (US1, US2, US3)

### Component Coverage
- ContextManifestParser: 100% (core functionality)
- SelectiveLoader: 95% (many edge cases)
- CacheManager: 90% (file I/O can be mocked)
- TokenBudgetEnforcer: 100% (critical for preventing overflows)
- ContextIndexBuilder: 85% (complex directory scanning)

## Testing Tools

### Unit Testing
- **Framework**: Jest (JavaScript standard, built-in mocking)
- **Assertions**: Jest matchers
- **Mocking**: Jest mocks for file system (fs-extra)

### Integration Testing
- **Framework**: Jest with real fixtures
- **Fixtures**: Test spec files in `tests/fixtures/`
- **Setup/Teardown**: Create/clean test cache directories

### Performance Testing
- **Tool**: Custom benchmarking scripts
- **Metrics**: Token count, cache hit rate, load time
- **Reporting**: JSON reports in `ai-temp-files/reports/`

## Test Environments

### Local Development
- Run tests with `npm test`
- Watch mode: `npm test -- --watch`
- Coverage: `npm test -- --coverage`

### CI/CD Pipeline
- Run on every commit (GitHub Actions or similar)
- Fail build if coverage drops below 80%
- Run performance tests on main branch only

### Staging
- Test with real SpecWeave specs (dogfooding)
- Monitor cache hit rates in production-like usage
- Validate performance targets

## Regression Testing Strategy

For future modifications to context-loader:

1. **Document Current Behavior**
   - All tests serve as behavior documentation
   - Capture edge cases and error handling

2. **Run Full Test Suite Before Changes**
   - Ensure all tests pass (green)
   - Establish baseline performance

3. **Implement Changes with TDD**
   - Write new tests for new behavior
   - Verify old tests still pass (no regressions)

4. **Performance Benchmarking**
   - Compare before/after performance
   - Flag any degradation >10%

## Success Criteria Validation

Each success criterion from spec.md must have corresponding tests:

1. ✅ **70%+ token reduction** → TC-017
2. ✅ **100% declared sections loaded** → TC-015
3. ✅ **>60% cache hit rate** → TC-018
4. ✅ **0 unexpected context overflows** → TC-016
5. ✅ **Handle 500+ page specs** → TC-017, TC-020

All tests must pass for feature to be considered complete.

---

## Test Execution Plan

### Phase 1: Unit Tests (During Development)
- Write test, see it fail (red)
- Implement minimum code to pass (green)
- Refactor with tests passing (refactor)
- Repeat for each component

### Phase 2: Integration Tests (After Components Complete)
- Test end-to-end flows
- Use real spec files from SpecWeave itself
- Validate against success criteria

### Phase 3: Performance Tests (Before Deployment)
- Run benchmarks with large spec collections
- Measure token reduction, cache hit rate, load times
- Verify all performance targets met

### Phase 4: Regression Tests (Ongoing)
- Run full suite on every commit
- Monitor for degradation
- Update tests as behavior evolves

---

Total Test Cases: 22 (P1: 16, P2: 6)
Estimated Test Writing Time: 2 days
Execution Time: ~30 seconds (unit + integration), ~5 minutes (performance)
