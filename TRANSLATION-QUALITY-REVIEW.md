# Translation Implementation Quality Review

**Date**: 2025-11-06  
**Reviewer**: pr-review-toolkit:code-reviewer  
**Increments Reviewed**: 0006-llm-native-i18n, 0013-test-stabilization

---

## Executive Summary

The multilingual/translation implementation is **technically excellent** but has **one critical limitation**: it's locked to Claude models only, preventing users from using cheaper alternatives like GPT-4o-mini or Gemini Flash.

### Key Findings

| Aspect | Status | Score |
|--------|--------|-------|
| Language Preservation | ✅ Excellent | 100/100 |
| Cost Optimization (Claude) | ✅ Good | 85/100 |
| Model Flexibility | ❌ Blocked | 20/100 |
| Code Quality | ✅ Excellent | 95/100 |
| Test Coverage | ✅ Excellent | 98/100 |
| **Overall** | ⚠️ Needs Work | **75/100** |

---

## What Works Excellently ✅

### 1. Language Preservation (100/100)
- Living docs stay in user's native language by default
- `autoTranslateLivingDocs: false` prevents forced English
- Users can write PRDs, specs, ADRs in 11 languages
- Framework terms preserved in English (increment, spec.md, etc.)

### 2. Cost Optimization with Claude (85/100)
- Default: Haiku model (~$0.003 per increment)
- Translation only when needed (language detection)
- Zero-cost language detection (<1ms, heuristic-based)
- Actual cost per 3 files: ~$0.003 (2000 tokens × 3)

### 3. Code Quality (95/100)
- 67 unit tests, all passing
- Comprehensive error handling
- Code block/link/inline code preservation
- YAML frontmatter preservation
- Markdown structure validation

### 4. Test Coverage (98/100)
- All 11 languages tested (en, ru, es, zh, de, fr, ja, ko, pt, ar, he)
- E2E workflow tests (16 passing)
- Unit tests for edge cases
- Validation tests

---

## Critical Gap: Model Flexibility ❌

### The Problem

**Current Implementation**:
```json
// src/core/schemas/specweave-config.schema.json:213
"translationModel": {
  "type": "string",
  "enum": ["haiku", "sonnet", "opus"],  // ❌ Claude only!
  "default": "haiku"
}
```

**Impact**:
- ❌ Cannot use GPT-4o-mini ($0.15/1M tokens) - 40% cheaper
- ❌ Cannot use Gemini Flash ($0.075/1M tokens) - 75% cheaper
- ❌ Cannot use other providers' models

**Potential Savings**:
| Model | Cost/1M Tokens | Cost per Increment | vs Haiku |
|-------|----------------|-------------------|----------|
| **Haiku (current)** | $0.25 | $0.0030 | Baseline |
| **GPT-4o-mini** | $0.15 | $0.0018 | 40% cheaper |
| **Gemini Flash** | $0.075 | $0.0009 | **70% cheaper** |

**User Impact**: Could save $0.002/increment → 70% cost reduction!

---

## Root Cause Analysis

### 1. Hardcoded Provider Logic

`src/utils/translation.ts:314-315`:
```typescript
export function estimateTranslationCost(
  inputTokens: number,
  outputTokens?: number
): number {
  const HAIKU_INPUT_COST_PER_1M = 0.25;   // ❌ Hardcoded
  const HAIKU_OUTPUT_COST_PER_1M = 1.25;  // ❌ Hardcoded
```

### 2. No Provider Abstraction

Missing:
- `TranslationProvider` interface
- Provider-specific pricing config
- API abstraction layer
- Provider validation

### 3. Misleading Documentation

`plugins/specweave/skills/translator/SKILL.md:17`:
> Works with ANY LLM backend (Claude, GPT-4, Gemini, etc.)

This is **partially true** for in-session translation but **false** for automated hooks which use Haiku only.

---

## Recommended Solution

### Phase 1: Add Provider Abstraction (2-3 hours)

#### 1.1 Create Provider Interface
`src/utils/translation.ts:310`:
```typescript
export interface TranslationProvider {
  name: 'claude' | 'openai' | 'google' | 'anthropic';
  models: string[];
  pricing: {
    [model: string]: {
      inputPer1M: number;
      outputPer1M: number;
    }
  };
}
```

#### 1.2 Add Provider Pricing Config
`src/config/translation-providers.json` (new file):
```json
{
  "providers": {
    "claude": {
      "models": {
        "haiku": { "inputPer1M": 0.25, "outputPer1M": 1.25 },
        "sonnet": { "inputPer1M": 3.00, "outputPer1M": 15.00 }
      }
    },
    "openai": {
      "models": {
        "gpt-4o-mini": { "inputPer1M": 0.15, "outputPer1M": 0.60 },
        "gpt-3.5-turbo": { "inputPer1M": 0.50, "outputPer1M": 1.50 }
      }
    },
    "google": {
      "models": {
        "gemini-flash": { "inputPer1M": 0.075, "outputPer1M": 0.30 },
        "gemini-pro": { "inputPer1M": 0.50, "outputPer1M": 1.50 }
      }
    }
  }
}
```

#### 1.3 Update Schema
`src/core/schemas/specweave-config.schema.json:213`:
```json
"translationProvider": {
  "type": "string",
  "enum": ["claude", "openai", "google"],
  "default": "claude",
  "description": "LLM provider for translation"
},
"translationModel": {
  "type": "string",
  "description": "Provider-specific model name",
  "default": "haiku"
}
```

#### 1.4 Update Cost Function
`src/utils/translation.ts:314`:
```typescript
export function estimateTranslationCost(
  inputTokens: number,
  outputTokens?: number,
  provider: string = 'claude',
  model: string = 'haiku'
): number {
  const providers = loadProviderConfig();
  const pricing = providers[provider]?.pricing[model];
  
  if (!pricing) {
    console.warn(`Unknown provider/model: ${provider}/${model}, using Haiku pricing`);
    return calculateHaikuCost(inputTokens, outputTokens);
  }
  
  return calculateCost(inputTokens, outputTokens, pricing);
}
```

### Phase 2: Add Provider Validation (1 hour)

- Validate provider/model combination exists
- Warn if using unknown models
- Fallback to Haiku if invalid

---

## Files Requiring Changes

| File | Changes | Priority | Effort |
|------|---------|----------|--------|
| `src/utils/translation.ts` | Add provider interface + abstraction | High | 1 hour |
| `src/config/translation-providers.json` | New file with pricing | High | 30 min |
| `src/core/schemas/specweave-config.schema.json` | Add `translationProvider` option | High | 15 min |
| `plugins/specweave/skills/translator/SKILL.md` | Fix misleading docs | Medium | 15 min |
| `tests/unit/i18n/translation.test.ts` | Add provider tests | Medium | 1 hour |
| **Total** | | | **2-3 hours** |

---

## Production Readiness

### Current State: ⚠️ **NEEDS WORK**

**Pros**:
- ✅ Works perfectly for Claude users
- ✅ Language preservation is excellent
- ✅ Test coverage is comprehensive
- ✅ Code quality is production-grade

**Cons**:
- ❌ Cannot use cheaper models (locked to Claude)
- ❌ Misleading documentation about flexibility
- ❌ Missing ~70% potential cost savings

### After Fix: ✅ **PRODUCTION READY**

With provider abstraction:
- ✅ Users can choose cheapest available model
- ✅ 70% cost savings with Gemini Flash
- ✅ Full flexibility across providers
- ✅ Maintains all current quality

---

## Recommendations

### Immediate (This Sprint)
1. ✅ Test stabilization (increment 0013) - **DONE**
2. ⚠️ Document current limitation (this review) - **DONE**

### Next Sprint (Increment 0014)
3. ⚠️ Implement provider abstraction - **2-3 hours**
4. ⚠️ Add provider pricing config - **30 minutes**
5. ⚠️ Update schema and docs - **30 minutes**

### Optional Enhancements
- Add caching for translations
- Support custom model pricing overrides
- Add provider health checks

---

## Final Verdict

**Translation Implementation**: ⚠️ **75/100 - NEEDS WORK**

**Why Not Higher**:
- Model flexibility is a **stated requirement** but not met
- Users expecting "cheaper model" support will be disappointed
- 70% potential cost savings locked behind technical debt

**Why Not Lower**:
- Everything else is production-quality
- Quick fix (2-3 hours) to reach 100/100
- Current implementation works perfectly for intended use case

**Recommendation**: 
- ✅ Ship current version for Claude users
- ⚠️ Document limitation clearly
- 📋 Plan increment 0014 for provider abstraction

---

**Review Complete**  
Next Steps: User decides whether to fix now or document limitation
