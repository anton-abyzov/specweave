# Tasks - 0099: Claude Code Native Background Processing

## Completed Tasks (Previous Session)

### T-001: Create LLM Provider Types
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Created `src/core/llm/types.ts` with LLMProvider interface, AnalysisDepth type.

### T-002: Create Claude Code Provider
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-05
**Status**: [x] completed

Created `src/core/llm/providers/claude-code-provider.ts` that spawns `claude --print`.

### T-003: Update Default Model to Opus 4.5
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

Changed default from 'sonnet' to 'opus' in provider and factory.

### T-004: Create Proof of Concept
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-05
**Status**: [x] completed

Created and ran `scripts/poc-claude-code-background.sh` - all 5 tests passed.

---

## Remaining Tasks

### T-005: Wire Living Docs Worker to ClaudeCodeProvider
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

Wired `brownfield-worker.ts` to use ClaudeCodeProvider when `depth === 'deep-native'`.
Added `initLLMProvider()`, `runAIAnalysis()`, and `analyzeModuleWithAI()` methods.

### T-006: Build and Verify Compilation
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed

- Fixed `BrownfieldDiscrepancyEvidence` type to include `aiAnalyzed` flag
- Fixed `BrownfieldDiscrepancySource` type to allow `ai-${string}` pattern
- Created `optional-deps.d.ts` for optional SDK type stubs (openai, aws-sdk, google-cloud)
- Build passes successfully.

### T-007: Cross-Platform Support
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

- Windows: Uses `where claude` and `%USERPROFILE%\.claude\`
- Linux/macOS: Uses `which claude` or `command -v claude` and `~/.claude/`
- Added platform detection constants (IS_WINDOWS, IS_MACOS, IS_LINUX)
- Windows spawn uses `shell: true` for .cmd resolution

### T-008: Add --dangerously-skip-permissions Flag
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

- Added `skipPermissions` config option (default: true for background use)
- Flag is essential for non-interactive background processing
- Without it, Claude CLI may hang waiting for permission prompts

### T-009: Non-Claude Fallback Detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed

- `getClaudeCodeStatus()` returns detailed status (cliInstalled, authExists, error, platform)
- `getAvailableProviders()` detects all available LLM providers
- Living-docs preflight shows disabled reasons for unavailable options
- Users see actionable messages: "Claude CLI not installed (npm i -g @anthropic-ai/claude-code)"

### T-010: Fix Node.js Spawn stdin Handling
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed

- Fixed `stdio: ['pipe', 'pipe', 'pipe']` → `stdio: ['ignore', 'pipe', 'pipe']`
- Without this fix, Claude CLI waits indefinitely for stdin to close
- This was the root cause of "command timed out" errors
- Now availability check completes in ~3-4 seconds instead of timing out

### T-011: Integrate AI Analysis into Living Docs Worker
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed

- Implemented `runAIModuleAnalysis()` function in living-docs-worker.ts
- Sends module context to Claude Code Opus 4.5 for semantic analysis
- Returns structured insights: purpose, keyConcepts, dependencies, complexity, suggestedDocs
- Successfully tested: AI insights generated for modules like `core`, `utils`
- Falls back gracefully on JSON parse errors (minor prompt engineering improvement needed)
