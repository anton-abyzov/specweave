# ADR-0017: Self-Reflection System Architecture

**Date**: 2025-11-10
**Status**: Accepted

## Context

SpecWeave needs AI-powered self-reflection capabilities to automatically analyze code changes after each task completion, identifying quality issues, security vulnerabilities, and testing gaps. The key architectural questions:

1. **Where to place the reflection engine?** (`src/core/reflection/` vs `src/hooks/lib/`)
2. **How to integrate with existing hooks?** (Sync vs async execution)
3. **How to invoke the AI agent?** (Direct API call vs Task tool)
4. **How to handle failures?** (Block workflow vs graceful degradation)

### Requirements

- **Non-blocking**: Reflection must not delay developer workflow
- **Automatic**: Zero manual intervention (runs via post-task-completion hook)
- **Comprehensive**: Analyze security, quality, testing, performance, technical debt
- **Cost-effective**: Default to Haiku model (~$0.01 per task)
- **Fault-tolerant**: Workflow continues even if reflection fails
- **Extensible**: Easy to add new analysis categories

### Key Constraints

- Must work with existing post-task-completion hook (currently 426 lines)
- Must support configuration via `.specweave/config.json`
- Must store reflections persistently for historical analysis
- Must complete within 30 seconds (95% of cases)
- Must handle API rate limits and failures gracefully

## Decision

**Architecture: Modular Hook-Based System**

### Component Structure

```
plugins/specweave/hooks/post-task-completion.sh
├── [Existing steps: tasks.md sync, living docs sync, translation, external sync]
└── [NEW] Self-Reflection Step
    └── Calls: node dist/hooks/lib/run-self-reflection.js

src/hooks/lib/
├── run-self-reflection.ts        # Entry point (orchestrator)
│   ├── Load configuration
│   ├── Get modified files (git diff)
│   ├── Build reflection prompt
│   ├── Invoke reflective-reviewer agent
│   ├── Parse response
│   └── Store reflection log
├── reflection-prompt-builder.ts  # Build prompts for agent
├── reflection-parser.ts           # Parse agent responses
├── git-diff-analyzer.ts           # Extract modified files
└── reflection-storage.ts          # Save reflections to logs

plugins/specweave/agents/reflective-reviewer/
└── AGENT.md                       # AI agent specialized in code review
```

### Key Architectural Decisions

#### 1. Location: `src/hooks/lib/` (Not `src/core/reflection/`)

**Rationale**:
- Reflection is **hook-specific functionality** (only runs after task completion)
- Follows existing pattern: `update-tasks-md.ts`, `sync-living-docs.ts`, `translate-living-docs.ts`
- Keeps core framework lean (reflection is not universally needed)
- Easy to locate (all hook utilities in one place)

**Rejected Alternative**: `src/core/reflection/`
- Would imply reflection is a core framework feature (it's not)
- Would add unnecessary complexity to core
- Harder to maintain (spread across multiple directories)

#### 2. Execution: Async Non-Blocking

**Rationale**:
- Reflection runs in background (doesn't delay workflow)
- Hook returns immediately with `{"continue": true}`
- Node.js process continues running (handles API call asynchronously)
- User can proceed to next task while reflection completes

**Implementation**:
```typescript
// run-self-reflection.ts
export async function runReflection(incrementId: string): Promise<void> {
  // Async execution - doesn't block hook return
  try {
    const config = await loadConfig();
    const modifiedFiles = await getModifiedFiles(incrementId);
    const prompt = buildReflectionPrompt(modifiedFiles, config);
    const reflection = await invokeReflectiveReviewer(prompt);
    await storeReflection(incrementId, reflection);
    await displayCriticalIssues(reflection); // Show warnings if critical
  } catch (error) {
    // Log error but don't fail (graceful degradation)
    console.error('Reflection failed (non-blocking):', error);
  }
}
```

**Rejected Alternative**: Sync blocking execution
- Would delay workflow (unacceptable for developer experience)
- Would make reflection a bottleneck
- No benefit (user doesn't need reflection results immediately)

#### 3. Agent Invocation: Subagent via Task Tool

**Rationale**:
- Uses Claude Code's native agent isolation (clean context)
- Follows SpecWeave pattern (PM agent, Architect agent, etc.)
- Agent can use Read/Grep/Glob tools for comprehensive analysis
- Clear separation of concerns (orchestrator vs reviewer)

**Implementation**:
```typescript
async function invokeReflectiveReviewer(prompt: string): Promise<ReflectionResult> {
  // Invoke agent via CLI (spawns isolated context)
  const result = await spawnAgent('reflective-reviewer', {
    prompt,
    allowedTools: ['Read', 'Grep', 'Glob'],
    timeout: 30000 // 30 seconds
  });

  return parseAgentResponse(result);
}
```

**Rejected Alternative**: Direct Anthropic API call
- Would require managing API keys in hook (security concern)
- Would lose Claude Code's agent isolation
- Would duplicate agent management logic
- No access to Read/Grep/Glob tools

#### 4. Error Handling: Graceful Degradation

**Rationale**:
- Reflection is **supplementary** (not critical to workflow)
- Workflow MUST continue even if reflection fails
- Log errors for debugging but don't block user
- Retry transient failures (rate limits) but fail fast on permanent errors

**Implementation**:
```typescript
export async function runReflection(incrementId: string): Promise<void> {
  try {
    // Attempt reflection
    await executeReflection(incrementId);
  } catch (error) {
    if (isTransientError(error)) {
      // Retry once with exponential backoff
      await sleep(2000);
      await executeReflection(incrementId).catch(() => {
        // Second failure - log and continue
        logError(error);
      });
    } else {
      // Permanent error - log and continue
      logError(error);
    }
  }
  // Always return (never throw)
}
```

**Rejected Alternative**: Fail-fast with workflow block
- Would disrupt developer workflow (unacceptable)
- Would make reflection a point of failure
- No benefit (reflection is supplementary)

### Data Flow

```
1. User completes task
   ↓
2. TodoWrite triggers post-task-completion.sh
   ↓
3. Hook executes existing steps (sync, translation, etc.)
   ↓
4. Hook calls: node dist/hooks/lib/run-self-reflection.js <increment-id>
   ↓
5. run-self-reflection.ts:
   ├── Load config (.specweave/config.json)
   ├── Get modified files (git diff --name-only HEAD~1)
   ├── Build prompt (files + analysis checklist)
   ├── Invoke reflective-reviewer agent (Task tool)
   ├── Parse response (extract issues, categorize by severity)
   └── Store reflection (.specweave/increments/{id}/logs/reflections/task-{n}-reflection.md)
   ↓
6. Display critical issues in terminal (if any)
   ↓
7. Hook returns {"continue": true} (user can proceed)
```

### Performance Characteristics

**Target Metrics**:
- **Execution Time**: \&lt;15s (quick mode), \&lt;30s (standard mode), \&lt;60s (deep mode)
- **API Cost**: \&lt;$0.01 per task (Haiku), \&lt;$0.05 (Sonnet), \&lt;$0.15 (Opus)
- **Success Rate**: >99.5% (reflection completes successfully)
- **Failure Impact**: 0 seconds (non-blocking, graceful degradation)

**Token Optimization**:
- Send only modified files (not entire codebase)
- Limit file size (\&lt;100KB per file)
- Aggregate small changes (combine \&lt;10 line changes)
- Cache common patterns (reduce redundant analysis)

## Alternatives Considered

### Alternative 1: Separate CLI Command (`/specweave:reflect`)

**Description**: Manual command instead of automatic hook

**Pros**:
- User control (run reflection when needed)
- No surprise API costs
- Simpler implementation (no hook integration)

**Cons**:
- ❌ Requires manual intervention (friction)
- ❌ Developers forget to run it (low adoption)
- ❌ No real-time feedback (loses value)

**Why Not Chosen**: Violates "zero friction" requirement. Automatic execution is core value proposition.

---

### Alternative 2: Sync Blocking Execution

**Description**: Block hook return until reflection completes

**Pros**:
- Simpler error handling
- User sees reflection immediately

**Cons**:
- ❌ Delays workflow by 15-30 seconds per task
- ❌ Creates frustration (waiting for AI)
- ❌ Makes reflection a bottleneck

**Why Not Chosen**: Unacceptable developer experience. Async execution is mandatory.

---

### Alternative 3: Reflection in Core Framework (`src/core/reflection/`)

**Description**: Move reflection logic to core framework

**Pros**:
- More "proper" separation
- Could be used outside hooks (future)

**Cons**:
- ❌ Reflection is hook-specific (no other use cases)
- ❌ Bloats core framework unnecessarily
- ❌ Harder to maintain (split across directories)

**Why Not Chosen**: Doesn't justify complexity. `src/hooks/lib/` is correct location.

---

### Alternative 4: Direct Anthropic API Call (No Agent)

**Description**: Call Anthropic API directly instead of using agent

**Pros**:
- Simpler implementation (no agent management)
- Faster execution (no agent startup overhead)

**Cons**:
- ❌ Loses agent isolation (context pollution)
- ❌ Can't use Read/Grep/Glob tools (limited analysis)
- ❌ Would duplicate agent logic (violates DRY)
- ❌ Security concern (API key in hook)

**Why Not Chosen**: Agents are the right abstraction. Direct API calls lose too many benefits.

## Consequences

### Positive

- ✅ **Non-blocking**: User workflow never delayed by reflection
- ✅ **Automatic**: Zero manual intervention required
- ✅ **Maintainable**: Clear separation of concerns (orchestrator vs reviewer)
- ✅ **Extensible**: Easy to add new analysis categories (just update agent)
- ✅ **Consistent**: Follows existing SpecWeave patterns (`src/hooks/lib/`)
- ✅ **Fault-tolerant**: Graceful degradation on failures
- ✅ **Cost-effective**: Token optimization strategies keep costs low

### Negative

- ❌ **Complexity**: Adds 5+ new files to codebase
- ❌ **Agent overhead**: Agent invocation adds 2-3 seconds vs direct API call
- ❌ **Async debugging**: Harder to debug async execution issues
- ❌ **Hook dependency**: Tightly coupled to post-task-completion hook

### Neutral

- 🔄 **Configuration required**: Users must enable reflection in config
- 🔄 **Agent required**: Depends on reflective-reviewer agent existence
- 🔄 **Storage overhead**: Reflection logs accumulate over time

### Risks

#### Risk 1: Async Execution Failures Silent

**Mitigation**:
- Log all errors to `.specweave/logs/hooks-debug.log`
- Display critical issues in terminal (even on partial failure)
- Add `/specweave:reflection-status` command to check reflection history

#### Risk 2: Agent Startup Overhead

**Mitigation**:
- Profile agent invocation time (target \&lt;5 seconds)
- Consider caching agent context (if startup is slow)
- Fallback to direct API call if agent unavailable

#### Risk 3: Hook Becomes Too Complex

**Mitigation**:
- Keep hook modular (each step is separate function)
- Extract utilities to `src/hooks/lib/` (not in hook script)
- Document hook execution flow clearly

## Related Decisions

- [ADR-0018](0018-reflection-model-selection.md): Model selection strategy for reflection
- [ADR-0019](0019-reflection-storage-format.md): Storage format for reflection logs
- [ADR-0001](0001-spec-driven-development.md): Original spec-driven development architecture
- [ADR-0012](0012-post-task-completion-hook.md): Post-task-completion hook design (if exists)

## Implementation Notes

### Phase 1: Core Engine (Weeks 1-2)

**Files to Create**:
1. `src/hooks/lib/run-self-reflection.ts` (main orchestrator)
2. `src/hooks/lib/reflection-prompt-builder.ts` (prompt generation)
3. `src/hooks/lib/reflection-parser.ts` (response parsing)
4. `src/hooks/lib/git-diff-analyzer.ts` (file extraction)
5. `plugins/specweave/agents/reflective-reviewer/AGENT.md` (AI agent)

**Hook Integration**:
```bash
# Add to plugins/specweave/hooks/post-task-completion.sh (after line 365)

# ============================================================================
# SELF-REFLECTION (NEW in v0.12.0)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 🔍 Running self-reflection for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run self-reflection (non-blocking, best-effort)
    node dist/hooks/lib/run-self-reflection.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to run self-reflection (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  fi
fi
```

### Configuration Schema Extension

Add to `src/core/schemas/specweave-config.schema.json`:

```json
{
  "reflection": {
    "type": "object",
    "description": "Self-reflection configuration",
    "properties": {
      "enabled": {
        "type": "boolean",
        "description": "Enable/disable reflection system",
        "default": true
      },
      "mode": {
        "type": "string",
        "description": "Execution mode",
        "enum": ["auto", "manual", "disabled"],
        "default": "auto"
      },
      "depth": {
        "type": "string",
        "description": "Analysis depth",
        "enum": ["quick", "standard", "deep"],
        "default": "standard"
      },
      "model": {
        "type": "string",
        "description": "AI model to use",
        "enum": ["haiku", "sonnet", "opus"],
        "default": "haiku"
      },
      "categories": {
        "type": "object",
        "description": "Analysis categories",
        "properties": {
          "security": {"type": "boolean", "default": true},
          "quality": {"type": "boolean", "default": true},
          "testing": {"type": "boolean", "default": true},
          "performance": {"type": "boolean", "default": true},
          "technicalDebt": {"type": "boolean", "default": true}
        }
      },
      "criticalThreshold": {
        "type": "string",
        "description": "Minimum severity for terminal warnings",
        "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        "default": "MEDIUM"
      },
      "storeReflections": {
        "type": "boolean",
        "description": "Store reflections to logs",
        "default": true
      }
    }
  }
}
```

### Testing Strategy

**Unit Tests** (85% coverage):
- `tests/unit/hooks/run-self-reflection.test.ts`: Core orchestration logic
- `tests/unit/reflection/prompt-builder.test.ts`: Prompt generation
- `tests/unit/reflection/parser.test.ts`: Response parsing
- `tests/unit/reflection/git-diff-analyzer.test.ts`: File extraction
- `tests/unit/reflection/config-loader.test.ts`: Configuration loading

**Integration Tests** (80% coverage):
- `tests/integration/reflection/end-to-end.test.ts`: Full reflection workflow
- `tests/integration/reflection/hook-integration.test.ts`: Hook execution
- `tests/integration/reflection/agent-invocation.test.ts`: Agent communication
- `tests/integration/reflection/storage.test.ts`: File storage

**E2E Tests** (Critical paths):
- `tests/e2e/reflection/first-reflection.spec.ts`: First-time reflection
- `tests/e2e/reflection/critical-issue-warning.spec.ts`: Warning display

## Review Notes

**Approved By**: [To be filled during review]
**Review Date**: [To be filled during review]
**Concerns Raised**: [To be filled during review]

## Change History

- **2025-11-10**: Initial version (ADR-0017 created)
