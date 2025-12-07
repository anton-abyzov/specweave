# Plan - 0099: Claude Code Native Background Processing

## Implementation Approach

### Phase 1: Core Infrastructure (DONE)
- Created LLM provider abstraction layer
- Implemented ClaudeCodeProvider using `claude --print`
- Verified with POC script

### Phase 2: Integration (Current)
- Wire brownfield-worker to use ClaudeCodeProvider
- Add deep analysis logic for 'deep-native' mode
- Build and test

## Key Decisions

1. **Use Opus 4.5 by default** - Best quality for deep analysis
2. **Leverage cached auth** - No API key needed, uses `~/.claude/`
3. **Spawn subprocesses** - Each analysis request is isolated

## Risk Mitigation

- POC verified all 5 scenarios work
- Fallback to standard analysis if Claude Code unavailable
- Timeout handling (120s default)
