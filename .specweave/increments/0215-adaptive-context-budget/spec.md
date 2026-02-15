# Adaptive Context Budget

## Problem
Users hit "Prompt is too long" errors faster when attaching images. Images consume tokens from the same 200K context window. The hook injects ~2500 chars every turn, accumulating in history (~50KB after 20 turns).

## User Stories

### US-001: Turn Deduplication
As a user, I want the hook to skip injecting identical context on consecutive turns, so my context window doesn't fill with redundant data.

**ACs:**
- [ ] AC-US1-01: Hook hashes output and skips injection when identical to previous turn
- [ ] AC-US1-02: First turn always injects context (no hash file exists)
- [ ] AC-US1-03: Hash file cleared on session start

### US-002: Context Pressure Detection
As a user, I want automatic budget reduction when context limits are approached, so I can work longer before hitting errors.

**ACs:**
- [ ] AC-US2-01: PreCompact hook creates pressure state file on compaction
- [ ] AC-US2-02: Pressure escalates: 1st compaction → elevated, 2nd+ → critical
- [ ] AC-US2-03: UserPromptSubmit reads pressure and steps down budget

### US-003: Configurable Budget
As a user, I want to configure context budget level in config.json, so I can reduce hook footprint for image-heavy workflows.

**ACs:**
- [ ] AC-US3-01: contextBudget.level config: full(2500) | compact(1000) | minimal(300) | off(0)
- [ ] AC-US3-02: contextBudget.autoAdapt defaults to true
- [ ] AC-US3-03: SPECWEAVE_CONTEXT_BUDGET env var overrides config
- [ ] AC-US3-04: Session start clears pressure state
