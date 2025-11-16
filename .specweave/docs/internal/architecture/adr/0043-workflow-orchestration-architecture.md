# ADR-0043: Workflow Orchestration Architecture

**Date**: 2025-11-16
**Status**: Accepted
**Epic**: FS-039 (Ultra-Smart Next Command)

---

## Context

SpecWeave currently requires users to manually execute multiple commands to navigate the development workflow:

**Current Manual Flow** (8+ commands):
```bash
/specweave:increment "feature name"  # Create increment
# (manual) Edit spec.md
/specweave:do                        # Plan (Architect + test-aware-planner)
/specweave:do                        # Execute first task
/specweave:do                        # Execute second task
# ... (repeat for each task)
/specweave:validate                  # Rule-based validation
/specweave:qa                        # AI quality assessment
/specweave:done                      # Close increment
/specweave:next                      # Find next work
```

**Problems**:
1. **Cognitive Load**: Users must remember command sequence and current phase
2. **Flow Disruption**: Context switching between "what to do next?" and "implement feature"
3. **Friction**: 4 minutes overhead per increment (8 commands × 30s average)
4. **Learning Curve**: New users don't know the workflow sequence
5. **Error-Prone**: Easy to skip validation, QA, or documentation steps

**User Needs**:
- **Beginners**: "Just tell me what to do next"
- **Power Users**: "Automate the entire workflow (planning → execution → closure)"
- **Teams**: "Ensure consistent workflow discipline across all developers"

**Business Goals**:
- Reduce time-to-completion by 40% (4 min → 30 sec overhead)
- Improve user satisfaction (85%+ report "easier workflow")
- Enable autonomous mode (ship features while you sleep)

---

## Decision

Implement **Workflow Orchestration Architecture** for `/specweave:next` command that:

1. **Auto-Detects Workflow Phase** using multi-signal heuristic (95% accuracy)
2. **Auto-Calls Commands** based on detected phase (plan → do → validate → qa → done)
3. **Provides Transparency** with confidence scores and user control
4. **Enables Autonomous Mode** for zero-prompt execution (--autonomous flag)

**Architecture Components**:

```
┌─────────────────────────────────────────────────────────────────┐
│                  /specweave:next (Entry Point)                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          WorkflowOrchestrator (Core Orchestration Logic)         │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ PhaseDetector      │  │ CommandInvoker     │                 │
│  │ (detect phase)     │  │ (invoke commands)  │                 │
│  └────────────────────┘  └────────────────────┘                 │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ ConfidenceScorer   │  │ StateManager       │                 │
│  │ (score confidence) │  │ (track workflow)   │                 │
│  └────────────────────┘  └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Existing Commands (Programmatic Invocation)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /specweave:  │  │ /specweave:  │  │ /specweave:  │          │
│  │ plan         │  │ do           │  │ validate     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ /specweave:  │  │ /specweave:  │                            │
│  │ qa           │  │ done         │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

**Workflow State Machine**:

```
┌─────────────┐
│ No Increment│
│   Exists    │
└──────┬──────┘
       │ Suggest: /specweave:increment or backlog item
       ▼
┌─────────────┐
│  Spec.md    │
│   Created   │
└──────┬──────┘
       │ Auto-Call: /specweave:plan
       ▼
┌─────────────┐
│  Planning   │
│  Complete   │
└──────┬──────┘
       │ Auto-Call: /specweave:do (repeatedly)
       ▼
┌─────────────┐
│ Tasks Done  │
│ (P1 only)   │
└──────┬──────┘
       │ Suggest: /specweave:validate
       ▼
┌─────────────┐
│ Validation  │
│   Passed    │
└──────┬──────┘
       │ Suggest: /specweave:qa
       ▼
┌─────────────┐
│ QA Passed   │
│             │
└──────┬──────┘
       │ Auto-Call: /specweave:done
       ▼
┌─────────────┐
│  Increment  │
│   Closed    │
└──────┬──────┘
       │ Find next increment or suggest backlog
       ▼
┌─────────────┐
│  Next Work  │
└─────────────┘
```

**Key Design Principles**:

1. **Extend, Don't Replace**: Enhance existing phase detection (ADR-0003-009), don't rewrite
2. **Transparency**: Always show confidence scores, never hide automation
3. **User Control**: Provide --dry-run, --skip-*, --force flags for override
4. **Safety**: Prevent infinite loops, validate preconditions, fail gracefully
5. **Modularity**: WorkflowOrchestrator is independent module (reusable)

---

## Alternatives Considered

### Alternative 1: Monolithic /specweave:next (Current State)

**Description**: Keep existing implementation (basic phase detection, no auto-call).

**Pros**:
- Simple implementation (no new components)
- No risk of automation bugs

**Cons**:
- ❌ Doesn't solve user pain (still manual commands)
- ❌ High cognitive load (users must remember sequence)
- ❌ Can't achieve 40% time reduction goal

**Why Not Chosen**: Doesn't address business goals or user needs.

---

### Alternative 2: AI Agent Decides Everything

**Description**: Use AI agent to analyze context and decide next action (no deterministic logic).

**Pros**:
- Maximum flexibility (handles edge cases)
- No hardcoded workflow (adapts to user patterns)

**Cons**:
- ❌ Unpredictable behavior (AI hallucinations, inconsistent decisions)
- ❌ Expensive (LLM call for every decision, ~$0.01 per call)
- ❌ Slow (500-2000ms latency per decision)
- ❌ No transparency (users don't understand why)
- ❌ Testability nightmare (how to unit test AI decisions?)

**Why Not Chosen**: Violates reliability, performance, and cost requirements.

---

### Alternative 3: Hardcoded Workflow (No Phase Detection)

**Description**: Force users through fixed workflow (no skip, no variation).

**Pros**:
- 100% predictable (no detection needed)
- Simple implementation (state machine only)

**Cons**:
- ❌ Inflexible (can't skip steps, can't customize workflow)
- ❌ Doesn't handle edge cases (corrupt plan.md, partial state)
- ❌ Poor UX (users want control, not railroading)

**Why Not Chosen**: Violates user control and flexibility requirements.

---

### Alternative 4: Event-Driven Workflow (Hooks + State Machine)

**Description**: Use lifecycle hooks to trigger state transitions (post-task-completion → check if all done → auto-validate).

**Pros**:
- Reactive (triggers on actual events, not polling)
- Decoupled (hooks are independent)

**Cons**:
- ❌ Complex debugging (hook execution order, async timing)
- ❌ Doesn't solve "what's next?" problem (only reacts to events)
- ❌ No confidence scoring (hooks fire unconditionally)

**Why Not Chosen**: Doesn't provide proactive guidance ("what's next?").

---

## Consequences

### Positive ✅

1. **Massive UX Improvement**:
   - 40% time reduction (4 min → 30 sec overhead)
   - One command to navigate entire workflow
   - Onboarding time reduced (no memorization)

2. **Power User Enablement**:
   - Autonomous mode (`--autonomous`) for zero-touch workflow
   - Ship features while you sleep (plan → build → test → deploy)

3. **Consistency**:
   - All developers follow same workflow discipline
   - No skipped steps (validation, QA always suggested)

4. **Transparency**:
   - Confidence scores build trust
   - Users understand why automation chose this action

5. **Extensibility**:
   - WorkflowOrchestrator is pluggable (future custom workflows)
   - PhaseDetector can be replaced with ML model (future)

### Negative ❌

1. **Implementation Complexity**:
   - New components (WorkflowOrchestrator, PhaseDetector, ConfidenceScorer, StateManager)
   - 5 weeks implementation time (Phase 1-5)

2. **Testing Overhead**:
   - 100+ test cases for phase detection
   - Integration tests for command orchestration
   - E2E tests for autonomous mode

3. **Maintenance Burden**:
   - Phase detection heuristics may need tuning
   - Edge cases will be discovered over time

4. **Risk of Over-Automation**:
   - Users may rely too much on automation (forget underlying workflow)
   - Autonomous mode may fail unexpectedly (handle errors gracefully)

### Neutral ⚖️

1. **Backward Compatibility**:
   - Existing `/specweave:next` behavior enhanced (not broken)
   - Manual commands still work (`/specweave:plan`, `/do`, etc.)

2. **Learning Curve**:
   - New flags (`--autonomous`, `--dry-run`, `--skip-*`)
   - Users must learn confidence scoring

3. **Performance**:
   - Phase detection < 500ms (acceptable)
   - Command orchestration overhead < 1s (acceptable)

---

## Implementation Strategy

### Phase 1: Foundation (Week 1) ✅

- Implement `/specweave:plan` command (new command, extracted from /do)
- Enhance PhaseDetector with confidence scoring
- Unit tests (phase detection, confidence calculation)

**Deliverables**:
- `src/core/workflow/phase-detector.ts` (95%+ accuracy, 0.0-1.0 confidence)
- `plugins/specweave/commands/specweave-plan.md` (new command)
- `tests/unit/phase-detector.test.ts` (100 test cases)

### Phase 2: Orchestration (Week 2) ✅

- Implement WorkflowOrchestrator (core logic)
- Implement CommandInvoker (programmatic command execution)
- Integration tests (auto-call plan/do/validate)

**Deliverables**:
- `src/core/workflow/workflow-orchestrator.ts`
- `src/core/workflow/command-invoker.ts`
- `tests/integration/workflow-orchestration.test.ts`

### Phase 3: Intelligence (Week 3) ✅

- Backlog scanning and ranking (priority, dependencies)
- Increment transition logic (WIP limits, lastActivity sorting)
- Intelligent suggestions (rationale, top 3 recommendations)

**Deliverables**:
- `src/core/workflow/backlog-scanner.ts`
- `src/core/workflow/increment-transition.ts`
- `tests/unit/backlog-ranking.test.ts`

### Phase 4: Autonomy (Week 4) ✅

- Autonomous mode (`--autonomous` flag)
- Safety guardrails (infinite loop prevention, error handling)
- E2E tests (full workflow automation)

**Deliverables**:
- `src/core/workflow/autonomous-executor.ts`
- `tests/e2e/autonomous-workflow.spec.ts`
- Performance optimization (< 500ms phase detection)

### Phase 5: Polish (Week 5) ✅

- UX refinement (clear prompts, human-readable confidence scores)
- Error message clarity (actionable suggestions)
- Documentation (user guide, command reference, examples)

**Deliverables**:
- Updated `/specweave:next` command docs
- User guide: "Autonomous Workflow with /specweave:next"
- Blog post + video demo

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Phase Detection Latency** | < 500ms | Fast enough for real-time UI, no perceived delay |
| **Command Orchestration Overhead** | < 1s | Minimal delay before command execution |
| **Backlog Scanning** | < 2s | Handle 1000+ items without user frustration |
| **Confidence Calculation** | < 100ms | Lightweight heuristic, no LLM calls |
| **Autonomous Mode Full Workflow** | < 10 min | Reasonable for unattended execution |

---

## Security Considerations

1. **No Privilege Escalation**:
   - Autonomous mode uses same permissions as manual commands
   - No auto-approval of user-gated actions (e.g., GitHub PR merge)

2. **Infinite Loop Prevention**:
   - Track state transitions (detect loops)
   - Max iterations per session (default: 50)
   - User can abort at any time (Ctrl+C)

3. **Input Validation**:
   - Validate all flags (`--autonomous`, `--dry-run`, etc.)
   - Sanitize increment IDs (prevent path traversal)

4. **Audit Trail**:
   - Log all auto-invoked commands to increment logs/
   - Autonomous mode generates detailed execution report

---

## Integration Points

### Existing Phase Detection (ADR-0003-009) ✅

**Status**: Reuse existing heuristic-based detection
**Enhancement**: Add confidence scoring (0.0-1.0)
**Location**: Extend existing PhaseDetector class (if exists) or create new

**Integration**:
```typescript
// Existing (hypothetical)
const phase = PhaseDetector.detectPhase(increment);

// Enhanced
const result = PhaseDetector.detectPhaseWithConfidence(increment);
// { phase: 'needs-planning', confidence: 0.95, signals: [...] }
```

### PM Agent Validation Gates ✅

**Status**: Invoke existing 3-gate check before auto-closure
**Location**: Existing PM validation logic
**Integration**: Call PM validation before `/specweave:done` in autonomous mode

### Increment Lifecycle State Machine ✅

**Status**: Detect state transitions (backlog → planned → active → completed → closed)
**Location**: Existing metadata.json status field
**Enhancement**: Track lastActivity timestamps for intelligent sorting

### Multi-Project Support (v0.16.11+) ✅

**Status**: Project-aware phase detection
**Location**: config.json multiProject configuration
**Integration**: Filter increments by activeProject, apply project keyword detection

---

## Metrics & Success Criteria

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Time-to-Completion Reduction** | 4 min overhead | 30 sec overhead (87.5% reduction) | Command execution logs |
| **Phase Detection Accuracy** | N/A | >= 95% | Unit tests, user error reports |
| **User Satisfaction** | N/A | 85%+ report "easier workflow" | Post-implementation survey |
| **Autonomous Mode Adoption** | 0% | 30%+ of power users | Usage analytics (telemetry) |
| **Error Rate** | N/A | < 5% of executions | Error logs, user reports |
| **Command Reduction** | 8+ commands | 1-2 commands (80%+ reduction) | Command usage analytics |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Phase Detection Accuracy < 95%** | Medium | High | Extensive unit tests, user feedback loop, fallback to manual prompts |
| **Autonomous Mode Fails Mid-Workflow** | Medium | Medium | Checkpointing (save state after each step), detailed error logs, graceful recovery |
| **Users Over-Rely on Automation** | Low | Medium | Show confidence scores, prompt on low confidence, preserve manual commands |
| **Performance < Targets** | Low | Low | Benchmark tests, optimize hot paths, cache file reads |
| **Breaking Changes** | Low | High | Backward compatibility tests, feature flags for gradual rollout |

---

## Future Enhancements (Post-MVP)

### v2 Improvements

- **ML-Based Phase Detection**: Train supervised learning model on user feedback (accuracy > 98%)
- **Custom Workflow Phases**: User-defined phases (design → prototype → test → ship)
- **Team Coordination**: Multi-user workflow (handoff detection, parallel work)
- **Predictive Suggestions**: "You usually work on feature X after closing feature Y"

### v3 Vision

- **Voice Commands**: "Claude, what's next?" → auto-execute workflow
- **Slack/Discord Bot**: `/next` in team chat → auto-post progress updates
- **CI/CD Integration**: Auto-deploy when increment closes with --autonomous

---

## Related Decisions

- **ADR-0044**: Phase Detection Enhancement (upgrade from ADR-0003-009)
- **ADR-0045**: Autonomous Mode Safety (guardrails, infinite loop prevention)
- **ADR-0003-009**: Multi-Signal Phase Detection (original heuristic)

---

## References

- **Living Spec**: [SPEC-0039: Ultra-Smart Next Command](../../specs/specweave/spec-0039-ultra-smart-next-command.md)
- **Increment**: [0039-ultra-smart-next-command](../../../increments/0039-ultra-smart-next-command/)
- **Existing Command**: [/specweave:next](../../../../plugins/specweave/commands/specweave-next.md)
- **PM Agent**: [PM Agent](../../../../plugins/specweave/agents/pm/)

---

**Decision Rationale Summary**:

We chose **Workflow Orchestration Architecture** because it:
- ✅ Achieves 40% time reduction (business goal)
- ✅ Enables autonomous mode (power user need)
- ✅ Maintains transparency (confidence scores)
- ✅ Preserves user control (flags, manual commands)
- ✅ Extends existing system (no rewrite)
- ✅ Scales to future enhancements (ML models, custom workflows)

This architecture transforms SpecWeave from a powerful but manual system into an intelligent autonomous workflow orchestrator.
