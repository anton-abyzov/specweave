# ADR-0243: Smart Interview Gate — LLM-Driven Prompt Assessment

**Date**: 2026-02-11
**Status**: Accepted
**Supersedes**: Extends ADR-0232 (Deep Interview Mode)

## Context

ADR-0232 introduced Deep Interview Mode as a binary flag: when enabled, it always injects a static "interview required" message into the SKILL FIRST block during increment creation. This works but has a key limitation — it treats every prompt equally regardless of how much context the user already provided. A user who writes a comprehensive description with tech stack, integrations, deployment details, and target users still gets interrogated with 5-40 questions.

## Decision

Replace the static `DEEP_INTERVIEW_MSG` block with a **smart interview gate** — a dynamic instruction block injected by `user-prompt-submit.sh` on every prompt when:
1. `deepInterview.enabled: true` in config
2. No active increment exists (checked via `active-increment.json`)

The gate instructs the LLM to:
- Assess the cumulative conversation context for completeness signals
- Determine complexity level (trivial → large)
- If sufficient detail exists → proceed directly to increment creation
- If gaps exist → ask only targeted questions about missing areas

**Key architectural decisions:**
1. **No new state files** — the LLM uses conversation context across prompts (Claude already sees full history)
2. **No new LLM calls in the hook** — assessment instructions are text injected into output, the LLM evaluates at inference time
3. **Replaces static DEEP_INTERVIEW_MSG** — the same location in the hook, but dynamic content
4. **Gate block injected alongside existing sections** — coexists with plugin autoload, LSP, and incrementAssist

### Integration Point

```
user-prompt-submit.sh
├── Plugin autoload section (unchanged)
├── LSP detection section (unchanged)
├── Increment assist section
│   ├── detect-intent LLM call (unchanged)
│   ├── SKILL FIRST block (when mandatory)
│   │   └── DEEP_INTERVIEW_MSG ← REPLACED by smart gate output
│   └── Suggestion block (when non-mandatory, unchanged)
└── NEW: Smart Interview Gate block
    └── Injected BEFORE increment assist when deepInterview + no active increment
    └── Instructs LLM to assess completeness and either ask or proceed
```

## Alternatives Considered

1. **New LLM call in hook for assessment**: Extra `specweave assess-completeness` call
   - Rejected: Adds 2-5s latency per prompt, hook already has one LLM call

2. **State file to track assessment progress**: `.specweave/state/interview-assessment.json`
   - Rejected: Unnecessary — LLM already sees full conversation, no state needed

3. **Config-based threshold**: `deepInterview.completenessThreshold: 0.8`
   - Rejected: LLM judgment is more nuanced than a number

## Consequences

**Positive**:
- Comprehensive prompts skip interview entirely (faster workflow)
- Targeted questions instead of full interrogation (better UX)
- Zero new infrastructure (just hook text changes)
- Backward compatible (disabled = unchanged behavior)

**Negative**:
- LLM assessment quality depends on model capability
- No deterministic guarantee of consistent assessment
- Slightly longer hook output (~300-500 tokens for gate block)
