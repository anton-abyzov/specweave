# ADR-0191: Unified Crash Prevention Architecture

**Status**: ACCEPTED
**Date**: 2025-12-06
**Supersedes**: ADR-0060, ADR-0068, ADR-0073, ADR-0128, ADR-0130, ADR-0157 (consolidates key patterns)

## Context

Claude Code sessions crash due to 9 distinct failure modes. Over time, we created 7+ ADRs addressing individual crash patterns, resulting in:

- **2,500+ lines** of ADR documentation spread across 7 files
- **1,900+ lines** of duplicated boilerplate across 19 hooks
- **834 lines** of deprecated hooks still in codebase
- Fragmented knowledge making crash prevention hard to understand

This ADR consolidates all crash prevention patterns into a single source of truth.

## Decision

Create a **Unified Crash Prevention Runtime** consisting of:

1. **`hooks/lib/common-setup.sh`** - Single library for all hook boilerplate
2. **`hooks/lib/crash-prevention.sh`** - Runtime crash detection and prevention
3. **`hooks/universal/fail-fast-wrapper.sh`** - Enhanced timeout wrapper with crash prevention integration

### The 9 Crash Categories

| # | Category | Root Cause | Detection | Prevention |
|---|----------|------------|-----------|------------|
| 1 | **Bash Heredoc Hang** | Shell waits forever for truncated EOF | Pattern match `<< EOF` | Claude instructions (don't use Bash for file ops) |
| 2 | **Context Explosion** | >280KB total context | Token estimation | Task limit (25 soft max) |
| 3 | **Hook Recursion** | Hooks trigger other hooks | File-based guard | `.hook-recursion-guard` |
| 4 | **Process Storms** | Bulk ops spawn 100+ processes | Process count | Bulk detection + skip |
| 5 | **Agent Chunking** | Skills spawn large agents | N/A (design rule) | CLAUDE.md rule |
| 6 | **Direct Completion** | Bypasses validation gates | Pattern match | `completion-guard.sh` |
| 7 | **Hook Duplicates** | 3x execution | N/A (cleanup) | Single hooks.json |
| 8 | **Compaction Deadlock** | Resource exhaustion | Compaction count | Session hygiene |
| 9 | **MCP Drops** | VSCode WebSocket timeout | Debug log scan | Session-start warning |

### Consolidated Library: `common-setup.sh`

Provides single-call setup for all hooks:

```bash
source "${CLAUDE_PLUGIN_ROOT}/hooks/lib/common-setup.sh"
setup_hook_environment "hook-name" || exit 0
```

**Functions consolidated:**
- `find_project_root()` - From 19 hooks
- `check_kill_switch()` - ADR-0068 Layer 1
- `check_circuit_breaker()` - ADR-0068 Layer 2
- `check_recursion_guard()` - ADR-0073
- `acquire_hook_lock()` - ADR-0068 Layer 3
- `check_debounce()` - ADR-0060, ADR-0130
- `is_bulk_operation()` - ADR-0130

**Savings**: ~1,800 lines (19 hooks × 100 lines boilerplate)

### Runtime: `crash-prevention.sh`

Provides active crash detection and recovery:

```bash
source "${CLAUDE_PLUGIN_ROOT}/hooks/lib/crash-prevention.sh"

# Check session health
check_session_health "$PROJECT_ROOT"

# Detect dangerous patterns
detect_bash_hang_pattern "$command"

# Emergency cleanup
emergency_cleanup "$PROJECT_ROOT"
```

### 7-Layer Error Isolation (from ADR-0068)

```
Layer 1: Kill switch      → SPECWEAVE_DISABLE_HOOKS=1
Layer 2: Circuit breaker  → 3 failures = trip
Layer 3: File locking     → Prevent concurrent execution
Layer 4: Try-catch        → TypeScript error handling
Layer 5: Per-issue        → Partial completion OK
Layer 6: Bash isolation   → set +e; exit 0
Layer 7: User messages    → Actionable error text
```

### Key Patterns Preserved

**File-Based Recursion Guard (ADR-0073)**:
```bash
# Environment variables DON'T work (background processes lose them)
# File-based guard works across ALL processes
GUARD_FILE=".specweave/state/.hook-recursion-guard"
[[ -f "$GUARD_FILE" ]] && exit 0  # Skip if guard exists
```

**Bulk Operation Detection (ADR-0130)**:
```bash
# 5+ operations in 10 seconds = bulk mode
# In bulk mode: skip individual hooks, run batch job after
BULK_THRESHOLD=5
BULK_WINDOW=10
```

**Process Storm Prevention**:
```bash
# >25 hook processes = storm, skip new hooks
detect_process_storm 25 || exit 0
```

## Files Changed

### Created
- `plugins/specweave/hooks/lib/common-setup.sh` (200 lines)
- `plugins/specweave/hooks/lib/crash-prevention.sh` (250 lines)

### Deleted (deprecated)
- `plugins/specweave/hooks/post-edit-spec.sh` (-265 lines)
- `plugins/specweave/hooks/post-write-spec.sh` (-267 lines)
- `plugins/specweave/hooks/pre-edit-spec.sh` (-151 lines)
- `plugins/specweave/hooks/pre-write-spec.sh` (-151 lines)

### Modified
- `plugins/specweave/hooks/universal/fail-fast-wrapper.sh` (+30 lines)

### Net Impact
- **-834 lines** from deleted deprecated hooks
- **+450 lines** from new consolidated libraries
- **-384 lines** net reduction
- **Future savings**: ~1,800 lines when hooks adopt common-setup.sh

## CLAUDE.md Integration

Key rules preserved in CLAUDE.md:

```markdown
### CRITICAL SAFETY RULES

1. **Max 25 tasks per increment** (soft limit for maintainability)
2. **NEVER use Bash heredoc/echo for file creation** (infinite hang)
3. **Pause increment before editing large files** (context explosion)
4. **Skills must NOT spawn large agents** (nested context explosion)
5. **Use Write/Edit tools for files** (token-safe, atomic)
```

## Testing

```bash
# Health check
bash plugins/specweave/hooks/lib/crash-prevention.sh health

# Emergency cleanup
bash plugins/specweave/hooks/lib/crash-prevention.sh cleanup

# Kill zombie processes
bash plugins/specweave/hooks/lib/crash-prevention.sh kill-zombies
```

## Recovery Cheat Sheet

```bash
# 1. Session stuck ("Marinating..." for hours)
pkill -f "cat.*EOF"
pkill -9 -f "bash.*specweave"
rm -f .specweave/state/*.lock

# 2. Hook crash loop
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache

# 3. Total reset
bash plugins/specweave/hooks/lib/crash-prevention.sh cleanup

# 4. MCP connection drops
# Cmd+Shift+P → "Developer: Restart Extension Host"
```

## Consequences

### Positive
- Single source of truth for crash prevention
- 834 lines removed immediately
- Future hook development simplified
- Easier onboarding (one document to read)
- Runtime detection catches new crash patterns

### Negative
- Existing hooks need gradual migration to use common-setup.sh
- Some ADRs become historical (but preserved for context)

## References

- ADR-0060: Hook Performance Optimization (Three-Tier)
- ADR-0068: Circuit Breaker Error Isolation Pattern
- ADR-0073: Hook Recursion Prevention (File-Based Guard)
- ADR-0128: Hierarchical Hook Early Exit
- ADR-0130: Hook Bulk Operation Detection
- ADR-0157: Comprehensive Crash Prevention Rules
- ADR-0189: Resilient Hook Execution Pattern
