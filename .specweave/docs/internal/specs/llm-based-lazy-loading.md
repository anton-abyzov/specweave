# LLM-Based Plugin Lazy Loading

**Status**: Implemented (v1.0.139)
**Author**: SpecWeave Team
**Last Updated**: 2026-01-21

## Executive Summary

SpecWeave solves the **#1 pain point** in Claude Code plugin ecosystem: **context bloat from loading all plugins at startup**.

While the Claude Code community has requested this feature since early 2025 ([7+ GitHub issues](https://github.com/anthropics/claude-code/issues?q=lazy+loading), 100+ reactions), no official solution exists. SpecWeave implements a production-ready solution using Claude Code's hook system combined with LLM-based intent detection.

## The Problem

### Context Budget Crisis

With Claude's 200k token context window, users face a critical problem:

| Component | Tokens Consumed |
|-----------|-----------------|
| MCP Tools | ~14k tokens |
| Custom Agents | ~6.5k tokens |
| Skills | ~20k+ tokens |
| **Total Overhead** | **40-50k tokens (20-25% of context)** |

**Before any conversation begins, 25% of context is gone.**

### Real-World Impact

From [Issue #7336](https://github.com/anthropics/claude-code/issues/7336) (63+ reactions):
> "The current 54% context consumption at startup makes many advanced use cases impossible."

From [Issue #11364](https://github.com/anthropics/claude-code/issues/11364):
> "With 7 MCP servers active, tool definitions consume 67,300 tokens (33.7% of 200k context budget) before any conversation begins."

### Current Workarounds (Inadequate)

1. **Manual plugin disabling** - All-or-nothing, requires restart
2. **CLI flags with JSON overrides** - Cumbersome, requires shell aliases
3. **Avoiding plugins entirely** - Loses functionality

## SpecWeave's Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Session                       │
├─────────────────────────────────────────────────────────────┤
│  user-prompt-submit hook (BEFORE prompt processing)          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Extract user prompt                              │    │
│  │  2. Call Claude CLI: claude -p "..." --model haiku  │    │
│  │  3. LLM analyzes INTENT (not just keywords!)        │    │
│  │  4. Returns: ["specweave-frontend", "specweave-k8s"]│    │
│  │  5. Install only needed plugins                      │    │
│  │  6. Continue to main conversation                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Innovation: LLM-Based Intent Detection

**Old approach (grep-based)**: Match keywords → False positives

```
User: "Don't use React, just a CLI tool"
Grep: Matches "React" → Loads specweave-frontend ❌ WRONG
```

**SpecWeave approach (LLM-based)**: Understand intent → Accurate detection

```
User: "Don't use React, just a CLI tool"
LLM: User wants backend/CLI only → Loads specweave-backend ✅ CORRECT
```

### Implementation Details

**File**: `src/core/lazy-loading/llm-plugin-detector.ts`

```typescript
// 1. Detect Claude CLI (handles binary, shell functions, aliases, nvm)
const cliStatus = isClaudeCliAvailable();

// 2. Build intent-aware prompt
const prompt = buildDetectionPrompt(); // Includes nuanced rules

// 3. Call LLM (Haiku for speed, ~6s response time)
const result = spawnSync('claude', ['-p', fullPrompt, '--model', 'haiku']);

// 4. Parse and validate plugins
const plugins = parseResponse(result.stdout);

// 5. Install via CLI (proper registration)
for (const plugin of plugins) {
  await installPluginViaCli(plugin);
}
```

### Nuanced Intent Rules

The LLM prompt includes sophisticated intent parsing:

```
CRITICAL RULES - UNDERSTAND INTENT:
1. Focus on WHAT THE USER WANTS TO BUILD, not what they mention negatively
2. When user says "don't use X" or "not X", determine what they WANT instead:
   - "Don't use React, use Vue instead" → Still frontend! Include specweave-frontend
   - "Don't use React, make it a mobile app" → Include specweave-mobile
   - "Don't use React, just a CLI tool" → Include specweave-backend only
3. Negative mentions don't automatically exclude the domain:
   - "I hate React but need a web dashboard" → Include specweave-frontend
```

### Cross-Platform Support

The implementation handles all platforms and installation methods:

| Platform | Binary in PATH | Shell Function | Shell Alias | nvm Versions |
|----------|---------------|----------------|-------------|--------------|
| Windows | ✅ | N/A | N/A | ✅ |
| macOS | ✅ | ✅ | ✅ | ✅ |
| Linux | ✅ | ✅ | ✅ | ✅ |

**File**: `src/utils/claude-cli-detector.ts`

Handles detection via:
1. `which`/`where` command
2. Direct npm global path checking
3. Interactive shell execution (`zsh -ic` / `bash -ic`)

## Results

### Token Savings

| Mode | Tokens at Startup | Savings |
|------|-------------------|---------|
| All 24 plugins loaded | ~60k tokens | 0% |
| SpecWeave lazy loading | ~3-5k tokens | **92-95%** |

### Performance

| Operation | Time |
|-----------|------|
| LLM detection (Haiku) | ~6 seconds |
| Plugin installation | ~2 seconds |
| **Total overhead** | **~8 seconds (first prompt only)** |

### Test Coverage

41 integration tests covering:
- Intent detection (React, Vue, K8s, Terraform, Stripe, TDD, ML, Mobile)
- Nuanced negative context ("don't use X" scenarios)
- Cross-platform execution
- Cache management
- Error handling

## Usage

### Automatic (Default)

Just use SpecWeave normally. The `user-prompt-submit` hook detects your intent and loads appropriate plugins.

### Manual Fallback

```bash
# Load specific plugin
specweave load-plugins github

# Load all plugins (if needed)
specweave load-plugins all

# Check what's loaded
specweave plugin-status
```

### Disable Auto-Loading

```bash
export SPECWEAVE_DISABLE_AUTO_LOAD=1
```

## Future: Per-Project Plugin Lists

**Coming Soon**: Local per-project plugin configuration

```json
// .specweave/config.json
{
  "plugins": {
    "enabled": ["specweave-frontend", "specweave-testing"],
    "disabled": ["specweave-ml", "specweave-kafka"],
    "autoDetect": true  // LLM detection for unlisted plugins
  }
}
```

This addresses [Issue #16458's Option 3](https://github.com/anthropics/claude-code/issues/16458): per-project plugin configs.

## Why This Matters

### For Users
- **95% context savings** → More room for actual work
- **No manual management** → Just describe what you want
- **Smart detection** → Understands intent, not just keywords

### For the Ecosystem
- **Proves the pattern works** → Claude CLI as inner LLM for pre-processing
- **Open source reference** → Others can adopt similar approaches
- **Community contribution** → Addresses 7+ open issues with 100+ reactions

## Related GitHub Issues

- [#7336](https://github.com/anthropics/claude-code/issues/7336) - Lazy Loading for MCP Servers (63+ reactions)
- [#16458](https://github.com/anthropics/claude-code/issues/16458) - Lazy loading for plugins
- [#11364](https://github.com/anthropics/claude-code/issues/11364) - Lazy-load MCP tool definitions
- [#13700](https://github.com/anthropics/claude-code/issues/13700) - Lazy-load MCP servers for agents
- [#8997](https://github.com/anthropics/claude-code/issues/8997) - Dynamic/Lazy Agent Loading
- [#15964](https://github.com/anthropics/claude-code/issues/15964) - Lazy-Loading for Plugins and Skills

## Technical Files

| File | Purpose |
|------|---------|
| `src/core/lazy-loading/llm-plugin-detector.ts` | Core LLM detection logic |
| `src/core/lazy-loading/cache-manager.ts` | Plugin installation management |
| `src/utils/claude-cli-detector.ts` | Cross-platform CLI detection |
| `tests/integration/lazy-loading/llm-plugin-detection.test.ts` | 41 integration tests |
| `plugins/specweave/hooks/user-prompt-submit.sh` | Hook entry point |
