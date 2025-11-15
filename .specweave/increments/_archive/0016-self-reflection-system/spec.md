---
increment: 0016-self-reflection-system
title: "AI Self-Reflection System"
priority: P1
status: abandoned
created: 2025-11-10
target_version: "0.12.0-beta"

structure: user-stories
estimated_weeks: 2 (beta), 6 (full)
estimated_cost: "$30-40 (beta AI costs), $100-150 (full)"

dependencies: []

beta_scope: "Phase 1 - Core Engine (Critical Path MVP)"
full_scope: "Phases 1-4 - Complete implementation"

tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "specweave-cli"
  runtime: "nodejs"
  integration_point: "post-task-completion-hook"
---

# Increment 0016: AI Self-Reflection System

**Complete Specification**: See [SPEC-016-self-reflection-system](../../docs/internal/projects/default/specs/spec-016-self-reflection-system.md) for full requirements.

---

## Quick Overview

Add AI self-reflection capabilities inspired by Kimi model. After each task completion, automatically analyze code for quality/security issues and provide actionable feedback.

**Core Value**: Catch issues earlier, reduce code review burden, improve code quality through continuous learning.

---

## Key Features (Summary)

1. **Automatic Execution**: Runs after each task completion via post-task-completion hook
2. **Security Analysis**: Detects OWASP Top 10 vulnerabilities (SQL injection, XSS, secrets)
3. **Quality Checks**: Code duplication, complexity, error handling, naming conventions
4. **Testing Gaps**: Edge cases, error paths, integration/E2E coverage
5. **Actionable Feedback**: Specific file/line references with concrete fixes
6. **Learning**: Stores reflections in logs for pattern detection
7. **Cost-Effective**: ~$0.01 per task (Haiku model), <$0.10 per increment

---

## User Stories (Summary)

**See [SPEC-016](../../docs/internal/projects/default/specs/spec-016-self-reflection-system.md#user-stories) for complete user stories with AC-IDs**

- **US-016-001**: Automatic reflection execution (4 AC-IDs)
- **US-016-002**: Security vulnerability detection (5 AC-IDs)
- **US-016-003**: Code quality analysis (5 AC-IDs)
- **US-016-004**: Testing gap detection (5 AC-IDs)
- **US-016-005**: Actionable feedback generation (5 AC-IDs)
- **US-016-006**: Reflection storage & learning (5 AC-IDs)
- **US-016-007**: Critical issue warnings (5 AC-IDs)
- **US-016-008**: Configuration & customization (5 AC-IDs)
- **US-016-009**: Performance issue detection (5 AC-IDs)
- **US-016-010**: Technical debt detection (5 AC-IDs)
- **US-016-011**: Cost optimization (5 AC-IDs)
- **US-016-012**: Error handling & edge cases (5 AC-IDs)

**Total**: 12 user stories, 63 acceptance criteria

---

## Implementation Scope (This Increment)

### 0.12.0-beta Scope (Critical Path MVP)

**✅ Included in Beta Release (Phase 1 - Core Engine)**:
- ✅ Reflection engine (`src/hooks/lib/run-self-reflection.ts`)
- ✅ Reflective-reviewer agent (`plugins/specweave/agents/reflective-reviewer/AGENT.md`)
- ✅ Hook integration (enhance `post-task-completion.sh`)
- ✅ Configuration system (schema + config loader)
- ✅ Reflection storage (markdown log files)
- ✅ Basic security analysis (SQL injection, XSS, secrets detection)
- ✅ Basic quality analysis (code duplication, complexity, error handling)
- ✅ Basic testing gap detection (missing edge cases, error paths)
- ✅ Unit tests (85% coverage)
- ✅ Integration tests (end-to-end workflow)

**Estimated**: 2 weeks, ~$30-40 AI costs

### Future Releases (Post-Beta)

**❌ Deferred to 0.12.1+ (Phase 2 - Enhanced Analysis)**:
- Advanced security patterns (CSRF, rate limiting, input validation)
- Advanced quality metrics (naming conventions, magic numbers)
- Advanced testing analysis (integration/E2E coverage)
- Performance issue detection (N+1 queries, algorithmic complexity)

**❌ Deferred to 0.13.0+ (Phase 3 - UX Enhancements)**:
- Warning system (CLI colors + sound notifications)
- Summary commands (/specweave:reflection-summary)
- Reflection aggregation (pattern detection across tasks)

**❌ Deferred to 0.14.0+ (Phase 4 - Advanced Features)**:
- Cost tracking dashboard
- Auto-create follow-up tasks from issues
- Third-party analyzer integration

---

## Out of Scope (Future Increments)

- ❌ GitHub issue commenting (use existing `/specweave-github:sync`)
- ❌ Jira/ADO integration (separate feature)
- ❌ Local-only mode (offline reflection)
- ❌ Third-party analyzer plugins
- ❌ Auto-create follow-up tasks from issues

---

## Success Criteria (This Increment)

**Effectiveness**:
- ✅ Reflection runs automatically after task completion
- ✅ Detects SQL injection, XSS, hardcoded secrets
- ✅ Identifies code duplication, high complexity
- ✅ Finds missing tests for edge cases
- ✅ Provides specific file/line references with fixes
- ✅ Warns user for CRITICAL issues in terminal

**Performance**:
- ✅ Reflection completes in <30s (95% of cases)
- ✅ Cost <$0.01 per task (Haiku mode)
- ✅ Non-blocking execution (workflow continues)

**Quality**:
- ✅ Test coverage: 85% unit, 80% integration
- ✅ Documentation updated (CLAUDE.md, README.md)
- ✅ E2E tests for critical paths

---

## Components to Create

### 1. Reflective Reviewer Agent
**File**: `plugins/specweave/agents/reflective-reviewer/AGENT.md`
**Purpose**: AI agent specialized in code review and quality analysis
**Features**:
- Security checklist (OWASP Top 10)
- Quality checklist (best practices)
- Testing checklist (coverage)
- Structured output format

### 2. Reflection Engine
**File**: `src/hooks/lib/run-self-reflection.ts`
**Purpose**: Core reflection orchestrator
**Features**:
- Load modified files (git diff)
- Build reflection prompt
- Invoke reflective-reviewer agent
- Parse response
- Store reflection

### 3. Hook Integration
**File**: `plugins/specweave/hooks/post-task-completion.sh`
**Purpose**: Trigger reflection after task completion
**Changes**:
- Add reflection step after living docs sync
- Pass increment ID and task context
- Handle async execution

### 4. Configuration Schema
**File**: `src/core/schemas/specweave-config.schema.json`
**Purpose**: Validation schema for reflection config
**New Section**:
```json
{
  "reflection": {
    "enabled": true,
    "mode": "auto",
    "depth": "standard",
    "model": "haiku",
    "categories": {...},
    "criticalThreshold": "MEDIUM"
  }
}
```

### 5. Integration Tests
**Files**:
- `tests/integration/reflection/end-to-end.test.ts`
- `tests/integration/reflection/hook-integration.test.ts`
- `tests/integration/reflection/storage.test.ts`

---

## Configuration Example

```json
{
  "reflection": {
    "enabled": true,
    "mode": "auto",
    "depth": "standard",
    "model": "haiku",
    "categories": {
      "security": true,
      "quality": true,
      "testing": true,
      "performance": true,
      "technicalDebt": true
    },
    "criticalThreshold": "MEDIUM",
    "storeReflections": true,
    "autoCreateFollowUpTasks": false
  }
}
```

---

## Example Reflection Output

**Location**: `.specweave/increments/0016-self-reflection-system/logs/reflections/task-005-reflection.md`

```markdown
# Self-Reflection: Task T-005 - Implement Reflection Engine

**Completed**: 2025-11-10 14:30 UTC
**Duration**: 45 minutes
**Files Modified**: 3 files, +287 lines

---

## ✅ What Was Accomplished

- Implemented run-self-reflection.ts with agent invocation
- Added configuration loading
- Created reflection prompt builder
- Integrated with post-task-completion hook

---

## 🎯 Quality Assessment

### ✅ Strengths
- ✅ Clean separation of concerns (engine vs agent)
- ✅ Type-safe configuration loading
- ✅ Comprehensive error handling

### ⚠️ Issues Identified

**SECURITY (MEDIUM Risk)**
- ❌ API key exposed in debug logs (line 45)
  - **Impact**: Credential leakage in logs
  - **Recommendation**: Redact API keys before logging
  - **File**: `src/hooks/lib/run-self-reflection.ts:45`

**TESTING (LOW Risk)**
- ⚠️ Missing edge case tests for API failures
  - **Impact**: Unhandled error scenarios
  - **Recommendation**: Add tests for rate limits, timeouts
  - **File**: `tests/integration/reflection/end-to-end.test.ts`

---

## 🔧 Recommended Follow-Up Actions

**Priority 1 (MUST FIX)**:
1. Redact API keys in debug logging

**Priority 2 (SHOULD FIX)**:
2. Add edge case tests for API failures

---

## 📚 Lessons Learned

**What went well**:
- TypeScript types caught configuration errors early
- Clean architecture makes testing easier

**What could improve**:
- Should have added API failure tests from start
- Debug logging needs security review

**For next time**:
- Review security implications before implementing
- Write edge case tests alongside happy path
```

---

## Estimated Effort

- **Phase 1 (Core Engine)**: 2 weeks
- **Phase 2 (Analysis)**: 2 weeks
- **Phase 3 (UX)**: 1 week
- **Phase 4 (Advanced)**: 1 week

**Total**: 6 weeks

---

## Cost Estimate

- **Development**: ~80 hours @ $150/hr = $12,000 (in-house)
- **AI Usage** (testing/dogfooding): ~$100-150
- **Total**: $12,100-12,150

**ROI**: Pays for itself in ~40 hours of saved code review time

---

## Dependencies

### External
- Anthropic API (Claude models)
- Git (file diff)
- Node.js 18+

### Internal
- Post-task-completion hook (existing)
- TodoWrite tool (existing)
- Agent system (existing)
- Configuration system (existing)

---

## Risks

1. **Cost escalation**: Mitigated by Haiku default, token optimization
2. **False positives**: Mitigated by severity levels, user feedback
3. **Workflow slowdown**: Mitigated by async execution, quick mode
4. **API reliability**: Mitigated by graceful degradation, retry logic

---

## References

- **Complete Spec**: [SPEC-016-self-reflection-system](../../docs/internal/projects/default/specs/spec-016-self-reflection-system.md)
- **Increment Lifecycle**: [Guide](../../docs/internal/delivery/guides/increment-lifecycle.md)
- **Hook System**: [Architecture](../../docs/internal/architecture/hooks-system.md)

---

**Next Steps**:
1. Architect creates `plan.md` with technical design
2. test-aware-planner generates `tasks.md` with embedded tests
3. Review and approve before `/specweave:do`
