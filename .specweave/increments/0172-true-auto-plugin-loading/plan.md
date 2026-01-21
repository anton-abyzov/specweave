---
increment: 0172-true-auto-plugin-loading
title: "Implementation Plan - True Auto Plugin Loading"
---

# Implementation Plan: True Auto Plugin Loading

## Executive Summary

This increment fixes the critical gap in 0171 where auto-loading was promised but never implemented. The solution uses Claude Code's hook system to intercept user prompts and session starts, automatically installing plugins based on detected keywords and project types.

## Architecture Decision

### Why Hooks?

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **MCP Server** | Dynamic tool loading | Complex, needs MCP setup | ❌ Deferred |
| **Router Skill** | Already exists | Passive, unreliable activation | ❌ Not sufficient |
| **Hooks** | Deterministic, runs every time | Adds hook latency | ✅ **Selected** |
| **CLAUDE.md Instructions** | Always read | Depends on Claude following | ✅ **Fallback** |

Hooks are deterministic - they run on every event, regardless of Claude's attention. This makes them reliable for auto-loading.

## Implementation Phases

### Phase 1: CLI Commands (Day 1)

Create CLI commands that hooks will call:

```bash
# Detect intent from prompt
specweave detect-intent "release npm version" --json
# → {"detected": true, "plugins": ["release"]}

# Detect project type
specweave detect-project . --json
# → {"types": ["react", "github"], "plugins": ["frontend", "github"]}

# With auto-install
specweave detect-intent "deploy k8s" --install --silent
# → Installs sw-k8s silently, returns JSON
```

**Files to create:**
- `src/cli/commands/detect-intent.ts`
- `src/cli/commands/detect-project.ts`
- `src/core/lazy-loading/project-detector.ts`

### Phase 2: Hook Implementation (Day 2)

**Modify existing** hooks to add auto-loading (NOT create new files):

**user-prompt-submit hook** (modify existing `plugins/specweave/hooks/v2/dispatchers/user-prompt-submit.sh`):

Per [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code/hooks), `UserPromptSubmit` receives JSON on stdin:
```json
{"session_id": "abc", "prompt": "release npm version"}
```

Implementation:
```bash
#!/bin/bash
# plugins/specweave/hooks/v2/dispatchers/user-prompt-submit.sh

# Read JSON from stdin (Claude Code provides this)
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# === AUTO-LOADING LOGIC ===
if [ -n "$PROMPT" ]; then
  timeout 0.5s specweave detect-intent "$PROMPT" --install --silent 2>/dev/null || true
fi
# === END AUTO-LOADING ===

# Existing hook logic continues...
# ...
echo '{"decision":"approve"}'
```

**session-start hook** (modify existing `plugins/specweave/hooks/v2/dispatchers/session-start.sh`):
```bash
#!/bin/bash
# At end of existing session-start.sh

# === AUTO-LOADING: Pre-install based on project type ===
timeout 3s specweave detect-project --install --silent 2>/dev/null || true
```

**Key design decisions:**
- **Modify existing hooks** (don't create new dispatcher files)
- Prompt comes via **stdin JSON**, not command args
- Timeout ensures Claude isn't blocked
- `|| true` ensures errors don't fail the hook
- Silent mode prevents output disruption

### Phase 3: Performance (Day 2-3)

Optimize for speed:

1. **Caching**: Store detection results to avoid re-running
2. **Parallel install**: Install multiple plugins simultaneously
3. **Fast path**: Skip detection if all plugins already loaded
4. **Timeout**: Hard limit on hook execution

**Target metrics:**
- user-prompt-submit: <500ms
- session-start: <3s

### Phase 4: CLAUDE.md Fallback (Day 3)

Add deterministic fallback to CLAUDE.md template:

```markdown
## Auto-Loading Fallback

If hooks haven't loaded a needed plugin, you can install it:

| Keywords | Plugin | Command After Install |
|----------|--------|----------------------|
| release, npm publish, version | release | `/sw-release:npm` |
| react, vue, frontend, UI | frontend | Use sw-frontend agent |
| kubernetes, k8s, deploy | k8s | Use sw-k8s agent |
| github, PR, issue | github | `/sw-github:sync` |

**To install**: `specweave load-plugins <group> --silent`

Example: User asks "release npm" but plugin not loaded:
1. Run: `specweave load-plugins release --silent`
2. Then: `/sw-release:npm`
```

### Phase 5: Testing (Day 4)

E2E tests for complete flow:

1. Fresh session + React project → sw-frontend auto-installed
2. User types "npm release" → sw-release auto-installed
3. Multiple keywords → multiple plugins installed
4. Plugin already loaded → no re-installation
5. Hook failure → Claude still responds

### Phase 6: Documentation (Day 4)

Update all docs to reflect actual behavior:

- README: Add "How Auto-Loading Works" section
- CLAUDE.md template: Fix misleading "router detects" language
- Troubleshooting: Add auto-loading debugging guide

## File Changes Summary

### New Files
```
src/cli/commands/detect-intent.ts         # CLI command for hook to call
src/cli/commands/detect-project.ts        # CLI command for project analysis
src/core/lazy-loading/project-detector.ts # Project type detection logic
```

### Modified Files
```
bin/specweave.js                                            # Register new commands
src/cli/commands/load-plugins.ts                            # Add --silent flag
src/core/lazy-loading/cache-manager.ts                      # Add silent install method
src/core/lazy-loading/keyword-detector.ts                   # Expand keyword→plugin mappings
src/templates/CLAUDE.md.template                            # Add auto-loading fallback section
plugins/specweave/hooks/user-prompt-submit.sh               # ADD auto-load call (line ~45)
plugins/specweave/hooks/v2/dispatchers/session-start.sh     # ADD project detection (end)
```

**Integration Points** (exact locations in existing hooks):

**user-prompt-submit.sh** - Add after the early exit check (line ~48):
```bash
# === AUTO-LOADING (after line 48, before line 50) ===
# Detect keywords and install plugins BEFORE any other processing
if [ -n "$PROMPT" ]; then
  timeout 0.5s specweave detect-intent "$PROMPT" --install --silent 2>/dev/null || true
fi
```

**session-start.sh** - Add before `exit 0` (line ~124):
```bash
# === AUTO-LOADING: Pre-install based on project type ===
if command -v specweave >/dev/null 2>&1; then
  timeout 3s specweave detect-project "$PROJECT_ROOT" --install --silent 2>/dev/null || true
fi
```

**Note**: We modify EXISTING hook files - no new dispatcher files needed.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hook adds latency | Strict timeout (<500ms), async where possible |
| False positives | Tune keywords, add negative patterns, high confidence threshold |
| Hook errors block Claude | `|| true` ensures errors don't propagate |
| Double installation | Cache + idempotency checks |

## Success Criteria

After this increment:

1. ✅ User types "npm release" → sw-release available in same response
2. ✅ React project opened → sw-frontend available on first prompt
3. ✅ No manual `specweave load-plugins` needed for common workflows
4. ✅ Hook execution invisible to user (silent, fast)
5. ✅ Documentation accurately describes behavior

## Rollback Plan

If issues arise:
1. Set `SPECWEAVE_DISABLE_AUTO_LOAD=1` to disable
2. Fall back to manual `specweave load-plugins`
3. Hooks can be individually disabled in settings

## Timeline

| Day | Focus |
|-----|-------|
| Day 1 | CLI commands (detect-intent, detect-project) |
| Day 2 | Hook implementation + dispatcher integration |
| Day 3 | Performance optimization + CLAUDE.md fallback |
| Day 4 | Testing + Documentation |
| Day 5 | Buffer for edge cases and polish |

**Total: ~5 days estimated**
