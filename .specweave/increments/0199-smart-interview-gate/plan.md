# Implementation Plan: Smart Interview Gate

## Overview

This is a focused hook modification. The entire feature lives in `user-prompt-submit.sh` — no new files, no new state, no new CLI commands. We modify how the deep interview message is generated and add a new pre-increment gate block.

**Architecture Decision**: [ADR-0243](../../docs/internal/architecture/adr/0243-smart-interview-gate.md)

## Architecture

### Components Modified

1. **`plugins/specweave/hooks/user-prompt-submit.sh`**: Main hook — add smart gate block, replace static DEEP_INTERVIEW_MSG
2. **`plugins/specweave/skills/pm/phases/00-deep-interview.md`**: Update to reference smart gate behavior

### No New Components

- No new state files (LLM uses conversation context)
- No new LLM calls (instructions injected as text)
- No new config fields (fully LLM-decided)
- No new CLI commands

### Integration Flow

```
User Prompt → user-prompt-submit.sh
  │
  ├─ deepInterview.enabled? ── NO ──→ Normal flow (unchanged)
  │          │
  │         YES
  │          │
  ├─ Active increment exists? ── YES ──→ Normal flow (unchanged)
  │          │
  │         NO
  │          │
  ├─ Inject SMART_INTERVIEW_GATE block
  │   (instructs LLM to assess completeness)
  │          │
  │          ├─ LLM: prompt is complete ──→ Chain to sw:increment-planner
  │          │
  │          └─ LLM: gaps detected ──→ Ask targeted questions
  │                                    (next prompt re-triggers gate)
  │
  └─ Continue with plugin/LSP/incrementAssist sections (unchanged)
```

## Technology Stack

- **Shell (bash)**: Hook modifications in user-prompt-submit.sh
- **jq**: Config reading (existing pattern)
- **Markdown**: Injected instruction text for LLM

## Implementation Phases

### Phase 1: Smart Gate Block in Hook

Modify `user-prompt-submit.sh` to:
1. After reading `DEEP_INTERVIEW_ENABLED`, check `active-increment.json` for existing increment
2. If `deepInterview.enabled && !activeIncrement`, build a `SMART_INTERVIEW_GATE` instruction block
3. The block contains signal categories, complexity assessment guidance, and decision instructions
4. Inject this block early in the hook output (before or alongside incrementAssist)

### Phase 2: Replace Static DEEP_INTERVIEW_MSG

1. Remove the static `DEEP_INTERVIEW_MSG` block (lines ~1314-1333)
2. When incrementAssist triggers SKILL FIRST, use the smart gate's assessment instead
3. The smart gate output tells LLM: "You've assessed the context — if ready, call increment-planner; if not, ask questions first"

### Phase 3: Update PM Skill Phase Doc

1. Update `phases/00-deep-interview.md` to document the smart gate behavior
2. Add guidance: "If the hook's smart gate determined the prompt is complete, skip to spec creation. If not, the gate told you what's missing — ask about those gaps."

## Testing Strategy

- **Unit tests**: Test the gate activation conditions (deepInterview + no active increment)
- **Integration tests**: Verify hook output contains/excludes gate block based on config
- **Manual testing**: Test with comprehensive vs incomplete prompts to validate LLM behavior

## Technical Challenges

### Challenge 1: Gate Block Token Budget
**Problem**: Hook output is already large; adding 500 tokens could push context limits
**Solution**: Keep gate instructions concise and structured. Use bullet points, not prose. Target < 400 tokens.

### Challenge 2: Interaction with incrementAssist detect-intent
**Problem**: The detect-intent LLM call already categorizes prompts. Smart gate needs to work regardless of detect-intent result.
**Solution**: Smart gate is injected independently of incrementAssist. It fires on ALL prompts when conditions met, not just feature-detected ones. If incrementAssist also triggers SKILL FIRST, the gate's assessment is embedded there. If incrementAssist doesn't trigger (e.g., non-feature prompt like "tell me about my project"), the gate still injects to gather context.

### Challenge 3: Avoiding Double-Questioning
**Problem**: Gate asks questions → user answers → gate fires again → might ask same questions
**Solution**: Gate instructions explicitly tell LLM to "consider ALL prior messages in this conversation." The LLM naturally accumulates context across turns. No state file needed.
