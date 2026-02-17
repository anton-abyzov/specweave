# General Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-17**: Use subagents liberally for codebase analysis - up to 10+ concurrent for large-scale exploration
- **2026-02-17**: Prefer leaderboard-style reporting when analyzing usage patterns or identifying deletion candidates
- **2026-02-17**: Auto command must have explicit stop conditions (passing tests, increment completion, quality gates) and log/display output visibly to user in terminal
- **2026-02-17**: Auto mode uses Claude Code's native Stop hook (stop-auto-v5.sh) to create implicit loops - hook returns {"decision":"block", "systemMessage":"..."} to prevent stopping and inject work remaining
- **2026-02-17**: Stop hooks in v5 only check checkbox completion via grep (no tests/builds) - quality checks belong in /sw:done, not in hooks
- **2026-02-17**: Hook decision 'block' erases user prompt from context and prevents Claude from seeing instructions - use hookSpecificOutput.additionalContext instead to inject context that Claude can act on
- **2026-02-17**: Skills should avoid shelling out to CLI as unnecessary intermediary - if skill has direct file I/O tools (Read/Write/Edit/Glob), implement logic directly rather than delegating to CLI. Reserve CLI delegation for complex transformations (sync-progress), subprocess requirements (lsp), or shared logic needed by terminal users. Avoid option drift where skill documents flags CLI doesn't support.
- **2026-02-17**: Task tool subagents do NOT inherit skills by default - skills must be listed explicitly or injected via prompt. Native Agent Teams (experimental) DO inherit skills automatically as full Claude Code sessions. Custom subagent definitions (.claude/agents/*.md) support native `skills` frontmatter field as alternative to prompt injection.
- **2026-02-17**: Use /sw:grill before completing features to validate quality and identify issues before shipping - grill output determines if increment is ready for /sw:done
- **2026-02-17**: User prompt can be duplicated in additionalContext when skill invocation is triggered, causing context bloat - always truncate user prompts in hook additionalContext to max 2000 chars and in detect-intent calls to max 3000 chars
