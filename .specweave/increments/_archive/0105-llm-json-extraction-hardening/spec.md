---
increment: 0105-llm-json-extraction-hardening
type: hotfix
priority: high
status: completed
project: specweave
---

# LLM JSON Extraction Hardening

## Problem Statement

The Living Docs Builder AI-powered module analysis experienced ~50% failure rate due to LLMs returning prose-wrapped JSON ("Based on the analysis...") instead of pure JSON. Initial fix implemented robust extraction, but judge evaluation identified gaps.

## Root Cause Analysis

1. **LLM output variability**: Claude/GPT models naturally explain before providing structured output
2. **Weak parsing**: Original code only handled markdown code blocks, not prose + JSON
3. **No retry mechanism**: Single failure = immediate error
4. **No schema validation**: Partial responses could pass and cause downstream errors

## Solution Overview

### Phase 1: Core Fix (COMPLETED)
- [x] Created `src/utils/llm-json-extractor.ts` with 4-level extraction strategy
- [x] Updated `living-docs-worker.ts` with retry + validation
- [x] Updated all 7 LLM providers to use robust extraction
- [x] Added 31 comprehensive tests

### Phase 2: Hardening (THIS INCREMENT)
Address judge evaluation concerns:

1. **Schema-aware correction prompts** - Make `generateCorrectionPrompt()` accept dynamic schema
2. **Required fields from schema** - Auto-extract required fields in providers
3. **Retry in analyzeStructured** - Add retry wrapper to provider methods
4. **Input sanitization** - Handle trailing commas, BOM, edge cases

## User Stories

### US-001: Schema-Aware Correction Prompts
**As a** developer using analyzeStructured
**I want** correction prompts to show the actual expected schema
**So that** the LLM understands what format to produce on retry

**Acceptance Criteria:**
- [x] **AC-US1-01**: `generateCorrectionPrompt()` accepts optional schema parameter
- [x] **AC-US1-02**: Correction prompt displays the actual schema, not hardcoded living-docs fields
- [x] **AC-US1-03**: Backward compatible - works without schema parameter

### US-002: Automatic Required Fields Extraction
**As a** provider implementer
**I want** required fields to be auto-extracted from the schema
**So that** validation happens automatically without manual configuration

**Acceptance Criteria:**
- [x] **AC-US2-01**: New helper `extractRequiredFields(schema)` extracts field names
- [x] **AC-US2-02**: Providers pass extracted fields to `extractJson()`
- [x] **AC-US2-03**: Tests verify field validation works

### US-003: Retry Wrapper for Providers
**As a** caller of analyzeStructured
**I want** automatic retry on JSON parse failure
**So that** transient LLM format errors are handled gracefully

**Acceptance Criteria:**
- [x] **AC-US3-01**: New `analyzeStructuredWithRetry()` wrapper function
- [x] **AC-US3-02**: Configurable max retries (default: 2)
- [x] **AC-US3-03**: Uses correction prompt on retry
- [x] **AC-US3-04**: At least anthropic-provider uses new wrapper

### US-004: Input Sanitization
**As a** JSON extractor
**I want** to handle common LLM output quirks
**So that** edge cases don't cause failures

**Acceptance Criteria:**
- [x] **AC-US4-01**: Strip UTF-8 BOM character if present
- [x] **AC-US4-02**: Clean trailing commas in arrays/objects
- [x] **AC-US4-03**: Tests for BOM and trailing comma handling

## Technical Design

### Changes to llm-json-extractor.ts

```typescript
// Enhanced generateCorrectionPrompt with schema support
export function generateCorrectionPrompt(
  originalPrompt: string,
  failedResponse: string,
  schema?: Record<string, unknown>
): string;

// New helper for required fields
export function extractRequiredFieldsFromSchema(
  schema: Record<string, unknown>
): string[];

// Enhanced extractJson with sanitization
export function extractJson<T>(
  response: string,
  options?: ExtractionOptions
): ExtractionResult<T>;
// Now includes BOM stripping and trailing comma cleanup
```

### Changes to providers

```typescript
// In anthropic-provider.ts, claude-code-provider.ts, etc.
async analyzeStructured<T>(prompt, options) {
  const requiredFields = extractRequiredFieldsFromSchema(options.schema);

  // Retry loop with correction
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await this.analyze(currentPrompt, options);
    const extraction = extractJson<T>(result.content, { requiredFields });

    if (extraction.success) return extraction.data;

    currentPrompt = generateCorrectionPrompt(prompt, result.content, options.schema);
  }
}
```

## Out of Scope

- Single quote JSON handling (rare, non-standard)
- Unicode escape sequence edge cases (very rare)
- Performance optimization for >100KB JSON (future work)

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| JSON extraction success | ~95% (with Phase 1) | >99% |
| Providers with retry | 1 (living-docs) | All 7 |
| Schema validation | Manual | Automatic |

## Testing Strategy

- Unit tests for new sanitization functions
- Unit tests for schema extraction
- Integration test for retry flow
- Run existing 31 tests (should still pass)
