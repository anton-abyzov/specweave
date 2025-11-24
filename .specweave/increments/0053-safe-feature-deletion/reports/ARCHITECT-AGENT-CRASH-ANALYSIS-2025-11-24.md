# Architect Agent Crash Analysis - 2025-11-24

## Incident Summary

**Time**: 2025-11-24 ~03:38 UTC
**Increment**: 0052-safe-feature-deletion
**Agent**: specweave:architect:architect
**Symptom**: Claude Code crashed during architect agent execution (14m 19s into "Bootstrapping" phase)
**Impact**: Agent did not complete plan.md/tasks.md generation, leaving increment in incomplete state

---

## Root Cause Analysis

### PRIMARY CAUSE: Massive Monolithic Response (Chunking Violation)

The architect agent **created 4 massive ADR files (1,730+ lines total) in a SINGLE response**, violating its own chunking rules:

**Files Created**:
```
ADR-0118: 400+ lines (Command Interface Pattern)
ADR-0119: 469 lines (Git Integration Strategy)
ADR-0120: 469 lines (GitHub Integration Approach)
ADR-0121: 400 lines (Validation Engine Design)
ADR-0122: 288 lines (Audit Log Format)
ADR-0123: 379 lines (Deletion Orchestration Pattern)
system-design.md: +194 lines

Total: ~2,600 lines in ONE response
Estimated tokens: 8,000-10,000 tokens
```

**Configured Limit**: `max_response_tokens: 2000` (in AGENT.md)
**Actual Output**: ~8,000-10,000 tokens (4-5x over limit!)

### Violation of Agent's Own Rules

The architect agent's AGENT.md explicitly states:

```markdown
## 🧩 Working in Chunks (NOT Monolithic Responses!)

**CRITICAL**: For large architecture tasks, I work in **phases**, not all-at-once.

**Phase-Based Workflow**:

1. **Phase 1: Analysis** (< 500 tokens)
   - Read requirements
   - Identify key architectural decisions needed
   - List ADRs to create
   - Ask clarifying questions

2. **Phase 2: Decision Making** (< 500 tokens per ADR)
   - Create one ADR at a time
   - Each ADR is focused and self-contained
   - Wait for user confirmation before next ADR

**Response Guidelines**:
- ✅ Keep each response < 2000 tokens (enforced by max_response_tokens)
- ✅ Work in phases for large tasks
- ✅ Show phase plan upfront, let user choose direction
```

**What the agent SHOULD have done**:
```
Phase 1 Response:
  "I've analyzed your requirements. We need 6 ADRs:
   - ADR-0118: Command Interface Pattern
   - ADR-0119: Git Integration Strategy
   - ADR-0120: GitHub Integration Approach
   - ADR-0121: Validation Engine Design
   - ADR-0122: Audit Log Format
   - ADR-0123: Deletion Orchestration Pattern

   Which ADR should I create first?"

Phase 2 Response (user chooses ADR-0118):
  [Create ONLY ADR-0118, ~400 tokens]
  "ADR-0118 complete. Next: ADR-0119?"

Phase 3 Response (user confirms):
  [Create ONLY ADR-0119, ~400 tokens]
  "ADR-0119 complete. Next: ADR-0120?"

... and so on ...
```

**What the agent ACTUALLY did**:
```
SINGLE MASSIVE Response:
  [Create ADR-0118: 400+ lines]
  [Create ADR-0119: 469 lines]
  [Create ADR-0120: 469 lines]
  [Create ADR-0121: 400 lines]
  [Create ADR-0122: 288 lines]
  [Create ADR-0123: 379 lines]
  [Update system-design.md: +194 lines]

Total: 17+ tool uses, 2,600 lines, 8,000-10,000 tokens
```

---

## Contributing Factors

### 1. Hook Overhead (Secondary Factor)

Each Write operation triggered `post-edit-write-consolidated.sh`:
- **7+ Write operations** in rapid succession
- **Even with 5s debouncing**, this many operations caused overhead
- **Background Node.js processes** spawned for each hook execution

### 2. Token Limit Enforcement Failure

The `max_response_tokens: 2000` setting in AGENT.md was **ignored or not enforced**:
- Agent generated 4-5x the configured limit
- No mechanism to interrupt agent mid-response
- No warning when approaching token limit

### 3. No Rate Limiting for Burst Writes

The hooks have debouncing (5s) but no **burst detection**:
- If 10 Write operations happen in 1 second, hooks run 10 times
- Debouncing only prevents redundant updates within 5s window
- No protection against "write storms"

---

## Why Claude Code Crashed

### Hypothesis 1: Token Limit Exceeded (Most Likely)

**Evidence**:
- Agent configured for 2000 tokens max
- Actual output: 8,000-10,000 tokens
- No plan.md or tasks.md created (agent didn't finish)

**Mechanism**:
```
Agent generates 2,600 lines → 8,000 tokens
→ Exceeds max_response_tokens: 2000
→ Claude API returns error
→ Claude Code crashes (no graceful handling)
```

### Hypothesis 2: Hook Process Exhaustion (Less Likely)

**Evidence**:
- Circuit breaker file shows "0" failures (NOT open)
- Only 15 processes running (reasonable)
- Hooks have 5s debouncing

**Mechanism**:
```
7+ Write operations → 7 hook invocations
→ Each hook spawns background Node.js process
→ Hook overhead accumulates
→ Claude Code slows down → eventual crash
```

**Counter-evidence**:
- Hooks have been optimized (v0.25.0 consolidation)
- Emergency fixes (circuit breaker, file locking, debouncing) in place
- Previous crashes were at 300 processes/min, not 7 processes/14 minutes

---

## Impact

### Files Created (Incomplete State)

```
✅ Created:
- .specweave/docs/internal/architecture/adr/0118-command-interface-pattern.md
- .specweave/docs/internal/architecture/adr/0119-git-integration-strategy.md
- .specweave/docs/internal/architecture/adr/0120-github-integration-approach.md
- .specweave/docs/internal/architecture/adr/0121-validation-engine-design.md
- .specweave/docs/internal/architecture/adr/0122-audit-log-format.md
- .specweave/docs/internal/architecture/adr/0123-deletion-orchestration-pattern.md
- .specweave/docs/internal/architecture/system-design.md (updated)
- .specweave/increments/0052-safe-feature-deletion/spec.md

❌ Missing (not created before crash):
- .specweave/increments/0052-safe-feature-deletion/plan.md
- .specweave/increments/0052-safe-feature-deletion/tasks.md
```

### User Experience

- User requested architect agent to design feature deletion
- Agent started generating architecture docs
- **14 minutes in**, Claude Code crashed
- User lost all progress (no plan.md, no tasks.md)
- ADRs were created but not linked from plan.md
- Increment is in incomplete state (status: "planned" but no plan!)

---

## Recommended Fixes

### FIX 1: Strict Chunking Enforcement (CRITICAL - P0)

**Problem**: Agent's `max_response_tokens: 2000` is not enforced by Claude Code

**Solution**: Add explicit chunking instructions to AGENT.md prompt

```markdown
## 🚨 CRITICAL CHUNKING RULE (NEVER VIOLATE!)

**YOU MUST STOP AFTER CREATING 1 ADR!**

**MANDATORY Pattern**:
1. Create Phase 1 response: List ADRs needed (< 500 tokens)
2. Wait for user confirmation
3. Create Phase 2 response: ONE ADR only (< 500 tokens)
4. Stop and ask: "Which ADR next?"
5. Repeat Step 3-4 until all ADRs done

**Example**:
```
Assistant: I've identified 3 ADRs needed:
- ADR-001: Database choice
- ADR-002: API design
- ADR-003: Deployment platform

Which ADR should I create first?

[User: "ADR-001"]