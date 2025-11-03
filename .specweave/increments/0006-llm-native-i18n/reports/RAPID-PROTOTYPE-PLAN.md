# Rapid Prototype Plan: LLM-Native i18n

**Date**: 2025-11-02
**Strategy**: Working prototype first, then expand

---

## Phase 1: Minimal Viable Implementation (4 hours)

### What We Build
1. ✅ Core infrastructure (LanguageManager, types, config) - DONE
2. ⏳ Simple Russian translation via system prompt injection
3. ⏳ Basic CLI with `--language ru` support
4. ⏳ Test: `specweave init test-ru --language ru` creates Russian spec

### What We Skip (For Now)
- Spanish support (focus on one language)
- Living docs auto-translation (Phase 5)
- Comprehensive testing (Phase 6)
- Full adapter integration (just Claude for now)
- Translator plugin (use simple prompt for MVP)

---

## Phase 2: Judge Validation (1 hour)

Spawn judge LLM agent to review:
- Architecture soundness
- Type safety
- Russian translation quality
- End-to-end workflow

---

## Phase 3: Iterate & Expand (Based on Judge Feedback)

Fix issues, then expand:
- Add Spanish support
- Implement translator plugin properly
- Add full test coverage
- Integrate all adapters

---

## Success Criteria for MVP

✅ User can run: `specweave init my-project --language ru`
✅ System prompts injected into skills/agents
✅ Generated spec.md is in Russian (via Claude's native capability)
✅ Framework terms preserved (SpecWeave, Increment, etc.)
✅ Judge LLM confirms architecture is sound

---

**Time Estimate**: 5 hours to working prototype + judge validation
**Then**: Expand systematically based on feedback
