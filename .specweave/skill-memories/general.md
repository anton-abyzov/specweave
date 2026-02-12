# General Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-11**: Use subagents liberally for codebase analysis - up to 10+ concurrent for large-scale exploration
- **2026-02-11**: Prefer leaderboard-style reporting when analyzing usage patterns or identifying deletion candidates
- **2026-02-11**: Auto command must have explicit stop conditions (passing tests, increment completion, quality gates) and log/display output visibly to user in terminal
- **2026-02-11**: Auto mode uses Claude Code's native Stop hook (stop-auto-v5.sh) to create implicit loops - hook returns {"decision":"block", "systemMessage":"..."} to prevent stopping and inject work remaining
- **2026-02-11**: Stop hooks in v5 only check checkbox completion via grep (no tests/builds) - quality checks belong in /sw:done, not in hooks
- **2026-02-11**: Hook decision 'block' erases user prompt from context and prevents Claude from seeing instructions - use hookSpecificOutput.additionalContext instead to inject context that Claude can act on
- **2026-02-11**: Skills should avoid shelling out to CLI as unnecessary intermediary - if skill has direct file I/O tools (Read/Write/Edit/Glob), implement logic directly rather than delegating to CLI. Reserve CLI delegation for complex transformations (sync-progress), subprocess requirements (lsp), or shared logic needed by terminal users. Avoid option drift where skill documents flags CLI doesn't support.
