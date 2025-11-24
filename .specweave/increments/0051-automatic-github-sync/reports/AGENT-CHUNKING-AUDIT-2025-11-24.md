# Agent Chunking Audit - 2025-11-24

**Status**: 🔍 Analysis Complete
**Related**: ADR-0127 (Agent Chunking Pattern)
**Scope**: All 41 SpecWeave agents
**Purpose**: Identify which agents need chunking to prevent crashes

---

## Executive Summary

**Finding**: Only 3 out of 41 agents (7%) have crash prevention via `max_response_tokens` limiting.

**Impact**: 38 agents (93%) are vulnerable to crashes when generating large content.

**Priority**: 6 agents identified as HIGH RISK requiring immediate chunking implementation.

---

## Audit Results

### Agents WITH Chunking Protection ✅ (3 total)

| Agent | Plugin | Token Limit | Chunking Docs | Status |
|-------|--------|-------------|---------------|--------|
| **architect** | specweave | 2000 | ✅ Comprehensive | ✅ Fixed (ADR-0070) |
| **pm** | specweave | 2000 | ⚠️  Partial | ⚠️  Needs enhancement |
| **test-aware-planner** | specweave | 2000 | ✅ Comprehensive | ✅ Fixed (ADR-0127) |

### Agents WITHOUT Chunking Protection ❌ (38 total)

**Distribution by risk level**:
- 🔴 HIGH RISK: 6 agents (immediate action required)
- 🟡 MEDIUM RISK: 12 agents (monitor, chunk if needed)
- 🟢 LOW RISK: 20 agents (unlikely to crash)

---

## Risk Assessment

### 🔴 HIGH RISK Agents (Immediate Action Required)

These agents regularly generate 1000+ lines and are likely to cause crashes:

#### 1. **docs-writer** (specweave)
**Risk Level**: 🔴 CRITICAL
**Why**: Generates large documentation files (README, user guides, API docs)
**Typical Output**: 1500-3000 lines for comprehensive docs
**Crash Pattern**: "Write complete API documentation for 20+ endpoints" → 4000+ lines
**Chunk Unit**: One documentation section at a time (e.g., Installation → Usage → API → Examples)
**Priority**: P0 - Immediate

#### 2. **tech-lead** (specweave)
**Risk Level**: 🔴 HIGH
**Why**: Large implementation files, multiple refactors, complex code reviews
**Typical Output**: 1000-2000 lines when implementing features
**Crash Pattern**: "Implement authentication system" → generates auth.ts (500 lines) + auth.test.ts (400 lines) + middleware.ts (300 lines)
**Chunk Unit**: One file at a time, ask "Ready for next file?"
**Priority**: P0 - Immediate

#### 3. **qa-lead** (specweave)
**Risk Level**: 🔴 HIGH
**Why**: Large test suites, test plans for multiple components
**Typical Output**: 1000-1500 lines for comprehensive test coverage
**Crash Pattern**: "Create test suite for API layer" → 15 test files × 100 lines each
**Chunk Unit**: One test file at a time
**Priority**: P0 - Immediate

#### 4. **devops** (specweave-infrastructure)
**Risk Level**: 🔴 HIGH
**Why**: Terraform configs, Kubernetes manifests, CI/CD pipelines
**Typical Output**: 1500-2500 lines for complete infrastructure
**Crash Pattern**: "Deploy EKS cluster with monitoring" → terraform/ (8 files), k8s/ (12 manifests), .github/workflows/ (3 files)
**Chunk Unit**: One infrastructure component at a time (VPC → EKS → RDS → Monitoring)
**Priority**: P1 - High

#### 5. **kubernetes-architect** (specweave-kubernetes)
**Risk Level**: 🔴 HIGH
**Why**: Multiple Kubernetes manifests, Helm charts, operators
**Typical Output**: 2000-3000 lines for complete K8s architecture
**Crash Pattern**: "Design microservices on K8s" → 10 services × 5 manifests each
**Chunk Unit**: One service at a time (frontend → backend → database → cache)
**Priority**: P1 - High

#### 6. **infrastructure** (specweave)
**Risk Level**: 🔴 HIGH
**Why**: Complete IaC setup (Terraform/Pulumi) for cloud deployments
**Typical Output**: 1500-2000 lines for production infrastructure
**Crash Pattern**: "Set up AWS production environment" → VPC, ALB, ECS, RDS, ElastiCache, CloudWatch
**Chunk Unit**: One infrastructure layer at a time
**Priority**: P1 - High

---

### 🟡 MEDIUM RISK Agents (Monitor & Chunk if Needed)

These agents occasionally generate 500-1000 lines:

#### Core Agents
| Agent | Plugin | Risk Factor | Chunk Unit |
|-------|--------|-------------|------------|
| **security** | specweave | Security audit reports (800+ lines) | One security domain at a time |
| **performance** | specweave | Performance optimization plans | One optimization area at a time |
| **tdd-orchestrator** | specweave | Complete TDD workflow | One test cycle at a time |
| **code-standards-detective** | specweave | Comprehensive coding standards | One category at a time (naming → imports → error handling) |

#### Infrastructure Agents
| Agent | Plugin | Risk Factor | Chunk Unit |
|-------|--------|-------------|------------|
| **sre** | specweave-infrastructure | Incident reports, runbooks | One incident/runbook at a time |
| **observability-engineer** | specweave-infrastructure | Monitoring setup (Prometheus + Grafana) | One monitoring stack at a time |
| **network-engineer** | specweave-infrastructure | Network architecture | One network layer at a time |
| **performance-engineer** | specweave-infrastructure | Performance analysis | One bottleneck at a time |

#### Domain-Specific Agents
| Agent | Plugin | Risk Factor | Chunk Unit |
|-------|--------|-------------|------------|
| **kafka-architect** | specweave-kafka | Multi-topic architecture | One topic at a time |
| **ml-engineer** | specweave-ml | ML pipeline code | One pipeline stage at a time |
| **mlops-engineer** | specweave-ml | MLOps infrastructure | One component at a time |
| **frontend-architect** | specweave-frontend | Component architecture | One component at a time |

---

### 🟢 LOW RISK Agents (Unlikely to Crash)

These agents generate < 500 lines typically:

**Integration/Management Agents** (focused, specific tasks):
- github-manager, jira-manager, ado-manager (external tool operations)
- github-task-splitter, user-story-updater (task-specific)
- ado-multi-project-mapper, ado-sync-judge (validation)

**Specialized Analysis Agents** (reports, not code generation):
- increment-quality-judge-v2 (validation reports)
- reflective-reviewer (code reviews)
- translator (localization)
- diagrams-architect (single diagrams)

**Domain-Specific Focused Agents**:
- release-manager (version management)
- payment-integration (single integration)
- database-optimizer (query optimization)
- mobile-architect (mobile-specific)
- qa-engineer (test strategy, not implementation)
- data-scientist (analysis, not massive codebases)
- kafka-devops, kafka-observability (operations)
- confluent-architect (Confluent Cloud config)

**Total LOW RISK**: 20 agents

---

## PM Agent Special Case ⚠️

The **pm** agent already has `max_response_tokens: 2000` and mentions chunking (line 184: "🔄 Chunked Execution Pattern"), but the chunking documentation is **NOT as comprehensive** as architect/test-aware-planner.

### Current PM Chunking (Partial)

```markdown
## 🔄 Chunked Execution Pattern

**Phase 1**: Research & Validation (< 500 tokens)
**Phase 2**: Specification Generation (< 500 tokens)
**Phase 3**: Architect Coordination (< 500 tokens)
**Phase 4**: Task Planning (< 500 tokens)
**Phase 5**: Final Validation (< 500 tokens)
```

### What's Missing

❌ No "🚨 CRITICAL SAFETY RULE" section at top
❌ No self-check checklist
❌ No explicit "ONE USER STORY AT A TIME" rule
❌ No incident references (why chunking matters)
❌ No crash prevention examples

### Recommendation

**Enhance PM agent chunking docs** to match architect/test-aware-planner standard:
1. Add "🚨 CRITICAL SAFETY RULE" section at top
2. Add self-check checklist
3. Add crash incident references
4. Specify chunking for large specs (6+ user stories)

**Priority**: P1 - High (PM is a critical path agent)

---

## Crash Risk Analysis

### What Causes Crashes?

**Token Limit Violations**:
- Claude has max response token limits (~8K-12K depending on model)
- Agents trying to generate 4000+ lines hit this limit
- Result: Frozen UI, process crash, lost work

**Memory Overflows**:
- Large string buffers (10K+ lines) cause memory issues
- Edit operations on massive files slow down dramatically
- Result: Claude Code becomes unresponsive

**User Experience Degradation**:
- No progress visibility (black box waiting)
- No ability to course-correct mid-generation
- All-or-nothing pattern (complete success or total failure)

### Historical Incidents

| Date | Agent | Incident | Lines | Tokens | Result |
|------|-------|----------|-------|--------|--------|
| 2025-11-24 | architect | 6 ADRs at once | 2,600 | 8,000+ | CRASH |
| 2025-11-24 | test-aware-planner | 40+ tasks for 6 US | 8,000 | 12,000+ | CRASH |
| 2025-11-23 | (hooks) | Process storm | N/A | N/A | CRASH |

**Pattern**: All crashes share common trait - trying to do too much at once.

---

## Implementation Plan

### Phase 1: Critical Fixes (Week 1) 🔴

**Priority**: P0 - Immediate

**Agents to Fix**:
1. ✅ test-aware-planner (DONE - ADR-0127)
2. ✅ architect (DONE - ADR-0070)
3. ⚠️  pm (enhance chunking docs)
4. ❌ docs-writer (add chunking)
5. ❌ tech-lead (add chunking)
6. ❌ qa-lead (add chunking)

**Actions**:
- Add `max_response_tokens: 2000` to YAML frontmatter
- Add "🚨 CRITICAL SAFETY RULE" section at top
- Define chunk units (what to generate per response)
- Add self-check checklist
- Add crash incident references
- Document progressive workflow pattern

**Time Estimate**: 1-2 hours per agent (6-12 hours total)

---

### Phase 2: Infrastructure Agents (Week 2) 🟡

**Priority**: P1 - High

**Agents to Fix**:
1. devops (specweave-infrastructure)
2. kubernetes-architect (specweave-kubernetes)
3. infrastructure (specweave)

**Actions**:
- Same as Phase 1
- Define infrastructure-specific chunk units (VPC → Compute → Database → Monitoring)
- Add Terraform/K8s manifest chunking examples

**Time Estimate**: 1-2 hours per agent (3-6 hours total)

---

### Phase 3: Medium Risk Agents (Week 3-4) 🟡

**Priority**: P2 - Medium

**Agents to Fix**: 12 medium-risk agents (see table above)

**Actions**:
- Lightweight chunking (may not need full "CRITICAL SAFETY RULE" section)
- Add `max_response_tokens: 2000` as safety net
- Document when to chunk (if output > 1000 lines)
- Add progress reporting pattern

**Time Estimate**: 30-60 min per agent (6-12 hours total)

---

### Phase 4: Monitoring & Validation (Ongoing) 📊

**Actions**:
1. Add telemetry for agent response sizes
2. Alert if any agent exceeds 2000 tokens without max_response_tokens
3. Track crash rate before/after chunking
4. User feedback on chunking UX

**Metrics to Track**:
- Agent response token counts (P50, P95, P99)
- Crash rate per agent
- User satisfaction with chunking UX
- Time to completion (chunked vs non-chunked)

---

## Chunking Pattern Reference

### Standard Pattern (from ADR-0127)

```markdown
---
name: my-agent
max_response_tokens: 2000  # ← MANDATORY
---

## ⚠️🚨 CRITICAL SAFETY RULE 🚨⚠️

**YOU MUST CHUNK YOUR OUTPUT - VIOLATION CAUSES CRASHES**

### THE ABSOLUTE RULE: ONE [UNIT] PER RESPONSE

1. **First Response (< 500 tokens)**: Analyze, list units, ASK which to start
2. **Second Response (< 800 tokens)**: Generate ONE unit, ASK "Ready for next?"
3. **Subsequent Responses (< 800 tokens each)**: Generate ONE unit each, ASK
4. **NEVER generate more than 1 unit per response!**

### Self-Check Before EVERY Response:
- [ ] Am I generating more than 1 unit? **→ STOP!**
- [ ] Is this response > 1500 tokens? **→ STOP!**
- [ ] Did I ask user which unit to do next? **→ REQUIRED!**
- [ ] Am I waiting for explicit confirmation? **→ YES!**
```

### Chunk Units by Agent Type

| Agent Type | Chunk Unit | Example |
|------------|------------|---------|
| **Architect** | One ADR | ADR-0118 → ADR-0119 → ADR-0120 |
| **Test-Aware Planner** | One User Story | US-001 (5 tasks) → US-002 (6 tasks) |
| **Docs Writer** | One Doc Section | Installation → Usage → API → Troubleshooting |
| **Tech Lead** | One File | auth.ts → auth.test.ts → middleware.ts |
| **DevOps** | One Infrastructure Layer | VPC → Compute → Database → Monitoring |
| **QA Lead** | One Test File | auth.test.ts → users.test.ts → api.test.ts |

---

## Testing Strategy

### Manual Testing

**Test 1: Large Output Scenario**
1. Invoke agent with task requiring 3+ chunks
2. Verify agent asks which chunk to start with
3. Confirm agent generates ONE chunk only
4. Verify agent asks before each subsequent chunk
5. Confirm no crashes occur

**Test 2: Token Monitoring**
1. Monitor agent response sizes during generation
2. Verify no response exceeds 2000 tokens
3. Verify chunking at appropriate boundaries

**Test 3: Error Recovery**
1. Interrupt agent mid-generation (after 2nd chunk)
2. Restart agent
3. Verify agent can resume from last completed chunk

### Automated Testing

```typescript
// Test: Agent respects max_response_tokens
test('agent chunks large generations', async () => {
  const agent = new MyAgent({ maxResponseTokens: 2000 });
  const task = createLargeTask(); // Requires 3+ chunks

  const responses = await agent.execute(task);

  // Should have multiple responses (one per chunk)
  expect(responses.length).toBeGreaterThan(1);

  // Each response should be < 2000 tokens
  responses.forEach(response => {
    expect(countTokens(response)).toBeLessThan(2000);
  });

  // Final output should be complete
  const finalOutput = combineResponses(responses);
  expect(finalOutput).toContain('chunk 1 content');
  expect(finalOutput).toContain('chunk 3 content');
});
```

---

## Benefits of Chunking

### 1. Crash Prevention ✅
- No more token limit violations
- No more memory overflows
- No more frozen Claude Code

### 2. Better User Experience ✅
- Real-time progress tracking ("5/36 tasks, 14%")
- Ability to pause/resume at any chunk
- Early course correction if agent goes off-track

### 3. Error Recovery ✅
- Partial work is saved (not lost on crash)
- Agent can resume from last chunk
- Easier debugging (smaller units to inspect)

### 4. Quality Maintained ✅
- Chunking does NOT reduce output quality
- Each chunk is still comprehensive
- Total output is the same, just delivered incrementally

### 5. Scalability ✅
- Works for arbitrarily large generations
- No practical limit on output size
- Agents can handle enterprise-scale tasks

---

## Risks & Mitigation

### Risk 1: More User Interactions Required

**Concern**: User must confirm each chunk (vs one-shot generation)

**Mitigation**:
- Allow "continue all" command to auto-confirm remaining chunks
- Provide progress indicators ("5/36 tasks, 14%")
- Show estimated remaining time
- Emphasize safety benefits (no crashes!)

### Risk 2: Perceived Slowness

**Concern**: Chunking feels slower due to multiple responses

**Mitigation**:
- Emphasize safety over speed
- Show progress bars during generation
- Allow parallel chunking for independent sections (future)
- Provide "fast mode" for advanced users (higher token limit, more risk)

### Risk 3: Agent Complexity

**Concern**: Every agent needs chunking logic

**Mitigation**:
- Provide reusable chunking patterns (ADR-0127)
- Create shared utilities for chunk management
- Document best practices clearly
- Add validation in agent tests

---

## Recommendations

### Immediate Actions (This Week)

1. ✅ **Fix test-aware-planner** (DONE)
2. ✅ **Document chunking pattern** (ADR-0127 DONE)
3. ⚠️  **Enhance PM agent chunking docs** (IN PROGRESS)
4. ❌ **Fix docs-writer** (P0 - Critical)
5. ❌ **Fix tech-lead** (P0 - Critical)
6. ❌ **Fix qa-lead** (P0 - Critical)

### Short-Term Actions (Next 2 Weeks)

1. Fix 3 infrastructure agents (devops, kubernetes-architect, infrastructure)
2. Add `max_response_tokens` to all 12 medium-risk agents
3. Create automated tests for chunking behavior
4. Add telemetry for agent response sizes

### Long-Term Actions (Next Month)

1. Audit all 20 low-risk agents (confirm they don't need chunking)
2. Create shared chunking utilities
3. Document chunking in CONTRIBUTING.md
4. Monitor crash rates and user feedback

---

## Conclusion

**Critical Finding**: 93% of SpecWeave agents (38/41) lack crash prevention via chunking.

**Immediate Action Required**: Fix 6 HIGH RISK agents that regularly generate 1000+ lines:
1. ✅ test-aware-planner (FIXED)
2. ✅ architect (FIXED)
3. ⚠️  pm (enhance docs)
4. ❌ docs-writer
5. ❌ tech-lead
6. ❌ qa-lead

**Impact**: Implementing chunking will prevent crashes, improve UX, enable error recovery, and maintain quality across all large-content generation tasks.

**Next Steps**:
1. Enhance PM agent chunking documentation (P0)
2. Implement chunking for docs-writer, tech-lead, qa-lead (P0)
3. Monitor crash rates and user feedback
4. Proceed with Phase 2 & 3 agents based on user demand

---

**Audit Completed By**: Claude Code (autonomous analysis)
**Date**: 2025-11-24
**Version**: v0.26.0
**Related**: ADR-0127, ADR-0070, TEST-AWARE-PLANNER-CHUNKING-FIX-2025-11-24.md
