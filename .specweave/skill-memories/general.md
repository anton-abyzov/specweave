# General Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-10**: Use subagents liberally for codebase analysis - up to 10+ concurrent for large-scale exploration
- **2026-02-10**: Prefer leaderboard-style reporting when analyzing usage patterns or identifying deletion candidates
- **2026-02-10**: Auto command must have explicit stop conditions (passing tests, increment completion, quality gates) and log/display output visibly to user in terminal
- **2026-02-10**: Call /sw:grill before completing features or increments to review and fix issues
- **2026-02-10**: Auto mode uses Claude Code's native Stop hook to create implicit loops - hook returns {"decision":"block", "systemMessage":"..."} to prevent stopping and inject work remaining, not actual while-loops in code
- **2026-02-10**: Stop hooks in v5 only check checkbox completion via grep (no tests/builds), following ADR-0225 principle that quality checks belong in /sw:done not in hooks
- **2026-02-10**: Add hook interception for `/sw:grill` in user-prompt-submit.sh - grill currently relies on LLM voluntary Skill invocation which is unreliable; should be deterministic like `/sw:progress`
- **2026-02-10**: Restore programmatic grill gate in completion-validator.ts - grill was removed in v1.0.232 and downgraded from hard gate to soft LLM-voluntary gate, causing unreliable execution
- **2026-02-10**: Change `/sw:grill` context from fork to shared - forked context loses conversation history needed for effective code review of recently changed files
