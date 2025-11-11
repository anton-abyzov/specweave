# SPEC-016: AI Self-Reflection System

**Version**: 1.0.0
**Status**: Approved
**Created**: 2025-11-10
**Target Release**: v0.12.0

---

## Overview

Add AI self-reflection capabilities to SpecWeave, inspired by the Kimi model's self-reflective reasoning approach. After each task completion, automatically analyze code changes for quality issues, security vulnerabilities, testing gaps, and provide actionable feedback with specific file/line references.

**Core Value**: Catch issues earlier in development cycle, reduce code review burden, improve code quality through continuous learning.

---

## Business Case

### Problem Statement

Current development workflow has quality gaps:
- Issues discovered late in code review (costly fixes)
- Security vulnerabilities slip through manual reviews
- Test coverage gaps not detected until QA
- Code quality degradation without real-time feedback
- No systematic learning from past mistakes

### Proposed Solution

Automated self-reflection system that:
1. Runs automatically after task completion (zero friction)
2. Analyzes code changes using AI (comprehensive checks)
3. Provides actionable feedback (specific fixes, not just problems)
4. Stores lessons learned (continuous improvement)
5. Cost-effective implementation (~$0.01 per task with Haiku)

### Expected Benefits

- **Quality**: 50%+ issues caught before code review
- **Efficiency**: 30% reduction in code review time
- **Security**: Earlier detection of OWASP Top 10 vulnerabilities
- **Learning**: Institutional knowledge from reflection logs
- **Cost**: \<$0.10 per increment (negligible vs. bug fix costs)

---

## User Stories

### US-016-001: Automatic Reflection Execution (P1)

**As a** developer using SpecWeave
**I want** reflection to run automatically after each task completion
**So that** I get immediate feedback without manual intervention

**Acceptance Criteria**:
- **AC-US1-01**: Hook integration - reflection triggers automatically when TodoWrite marks task complete (P1, testable)
- **AC-US1-02**: Async execution - reflection runs non-blocking, doesn't delay next task (P1, testable)
- **AC-US1-03**: Performance - reflection completes in \<30 seconds for typical task (P1, testable)
- **AC-US1-04**: Error tolerance - reflection failures don't block workflow (P1, testable)

---

### US-016-002: Security Vulnerability Detection (P1)

**As a** developer
**I want** automatic security vulnerability detection
**So that** I catch OWASP Top 10 issues before code review

**Acceptance Criteria**:
- **AC-US2-01**: SQL injection - detects un-parameterized queries, string concatenation in SQL (P1, testable)
- **AC-US2-02**: XSS prevention - detects unescaped user input in HTML/templates (P1, testable)
- **AC-US2-03**: Secrets detection - warns about hardcoded API keys, passwords, tokens (P1, testable)
- **AC-US2-04**: Authentication - identifies missing auth checks on sensitive endpoints (P2, testable)
- **AC-US2-05**: HTTPS enforcement - warns about HTTP usage where HTTPS required (P2, testable)

---

### US-016-003: Code Quality Analysis (P1)

**As a** developer
**I want** automatic code quality analysis
**So that** I maintain best practices and readability

**Acceptance Criteria**:
- **AC-US3-01**: Code duplication - detects copy-paste code blocks >10 lines (P1, testable)
- **AC-US3-02**: Complexity - warns about functions >50 lines or cyclomatic complexity >10 (P1, testable)
- **AC-US3-03**: Error handling - identifies missing try-catch blocks in async operations (P1, testable)
- **AC-US3-04**: Naming conventions - flags unclear variable names (single letters, abbreviations) (P2, testable)
- **AC-US3-05**: Comments - suggests documentation for complex logic (P3, testable)

---

### US-016-004: Testing Gap Detection (P1)

**As a** developer
**I want** automatic test coverage analysis
**So that** I identify missing tests before QA

**Acceptance Criteria**:
- **AC-US4-01**: Edge cases - identifies untested edge cases (null, empty, max values) (P1, testable)
- **AC-US4-02**: Error paths - detects error handling code without corresponding tests (P1, testable)
- **AC-US4-03**: Integration coverage - warns if new API endpoints lack integration tests (P1, testable)
- **AC-US4-04**: E2E gaps - identifies user flows without E2E test coverage (P2, testable)
- **AC-US4-05**: Test quality - flags tests without assertions or with weak assertions (P2, testable)

---

### US-016-005: Actionable Feedback Generation (P1)

**As a** developer
**I want** specific, actionable feedback with fixes
**So that** I can quickly address issues

**Acceptance Criteria**:
- **AC-US5-01**: File paths - every issue references specific file path and line number (P1, testable)
- **AC-US5-02**: Code snippets - shows problematic code with context (3 lines before/after) (P1, testable)
- **AC-US5-03**: Concrete fixes - provides code example of correct implementation (P1, testable)
- **AC-US5-04**: Priority levels - categorizes issues as CRITICAL/HIGH/MEDIUM/LOW (P1, testable)
- **AC-US5-05**: Impact explanation - explains WHY issue matters (security risk, maintainability, etc.) (P2, testable)

---

### US-016-006: Reflection Storage & Learning (P1)

**As a** developer
**I want** reflections stored persistently
**So that** I can review past issues and learn from patterns

**Acceptance Criteria**:
- **AC-US6-01**: Log storage - reflections saved to `.specweave/increments/{id}/logs/reflections/task-{id}-reflection.md` (P1, testable)
- **AC-US6-02**: Searchable format - markdown format with structured sections (P1, testable)
- **AC-US6-03**: Lessons learned - each reflection includes "What went well" and "What to improve" (P1, testable)
- **AC-US6-04**: Pattern detection - aggregates common issues across tasks (P2, testable)
- **AC-US6-05**: Historical analysis - `/reflections summary` shows trends over time (P3, testable)

---

### US-016-007: Critical Issue Warnings (P1)

**As a** developer
**I want** immediate warnings for critical issues
**So that** I address them before continuing

**Acceptance Criteria**:
- **AC-US7-01**: CLI warning - critical issues displayed in terminal with ⚠️  prefix (P1, testable)
- **AC-US7-02**: Sound notification - plays alert sound for CRITICAL issues (configurable) (P2, testable)
- **AC-US7-03**: Blocking mode - optional mode that prevents next task until critical issues addressed (P2, testable)
- **AC-US7-04**: Threshold config - user can set minimum severity for warnings (P2, testable)
- **AC-US7-05**: Summary stats - shows count of issues by severity after reflection (P2, testable)

---

### US-016-008: Configuration & Customization (P1)

**As a** developer
**I want** flexible configuration options
**So that** I can customize reflection to my workflow

**Acceptance Criteria**:
- **AC-US8-01**: Enable/disable - config option to turn reflection on/off globally (P1, testable)
- **AC-US8-02**: Depth levels - quick/standard/deep analysis modes (P1, testable)
- **AC-US8-03**: Model selection - choose Haiku/Sonnet/Opus for reflection (P1, testable)
- **AC-US8-04**: Category filters - enable/disable specific check categories (security, quality, testing, etc.) (P2, testable)
- **AC-US8-05**: Per-increment override - allow different settings per increment (P3, testable)

---

### US-016-009: Performance Issue Detection (P2)

**As a** developer
**I want** automatic performance issue detection
**So that** I avoid common performance pitfalls

**Acceptance Criteria**:
- **AC-US9-01**: N+1 queries - detects database queries in loops (P2, testable)
- **AC-US9-02**: Algorithm complexity - warns about O(n²) or worse algorithms (P2, testable)
- **AC-US9-03**: Caching opportunities - suggests where caching would help (P2, testable)
- **AC-US9-04**: Memory leaks - identifies event listeners not cleaned up, circular references (P2, testable)
- **AC-US9-05**: Bundle size - warns if new dependencies significantly increase bundle size (P3, testable)

---

### US-016-010: Technical Debt Detection (P2)

**As a** developer
**I want** automatic technical debt detection
**So that** I track shortcuts and plan refactoring

**Acceptance Criteria**:
- **AC-US10-01**: TODO comments - extracts and categorizes TODO/FIXME/HACK comments (P2, testable)
- **AC-US10-02**: Deprecated APIs - detects use of deprecated functions/libraries (P2, testable)
- **AC-US10-03**: Copy-paste code - flags code blocks duplicated across files (P2, testable)
- **AC-US10-04**: Magic numbers - identifies hardcoded values that should be constants (P2, testable)
- **AC-US10-05**: Temporary hacks - detects common temporary solution patterns (P3, testable)

---

### US-016-011: Cost Optimization (P1)

**As a** developer
**I want** cost-effective reflection
**So that** it doesn't significantly increase AI costs

**Acceptance Criteria**:
- **AC-US11-01**: Haiku default - uses Haiku model by default (~$0.01/task) (P1, testable)
- **AC-US11-02**: Token optimization - sends only modified files, not entire codebase (P1, testable)
- **AC-US11-03**: Cost tracking - displays estimated cost after each reflection (P1, testable)
- **AC-US11-04**: Incremental cost - cumulative cost visible in `/reflections summary` (P2, testable)
- **AC-US11-05**: Budget alerts - warns if reflection cost >$1 in single increment (P3, testable)

---

### US-016-012: Error Handling & Edge Cases (P1)

**As a** developer
**I want** robust error handling
**So that** reflection failures don't disrupt my workflow

**Acceptance Criteria**:
- **AC-US12-01**: Rate limit handling - gracefully handles API rate limits with retry logic (P1, testable)
- **AC-US12-02**: Network failures - falls back gracefully if API unreachable (P1, testable)
- **AC-US12-03**: Large files - skips files >100KB to avoid token limits (P1, testable)
- **AC-US12-04**: Timeout handling - aborts reflection after 60s if stuck (P1, testable)
- **AC-US12-05**: Logging failures - records reflection errors to debug log (P2, testable)

---

## Functional Requirements

### FR-016-001: Reflection Engine

**Description**: Core reflection engine that analyzes code changes and generates feedback

**Implementation**:
- `src/hooks/lib/run-self-reflection.ts`: Main reflection orchestrator
- Loads modified files from git diff
- Builds reflection prompt with code context
- Invokes reflective-reviewer agent
- Parses agent response into structured format
- Stores reflection to log file

**Dependencies**: None
**Priority**: P1

---

### FR-016-002: Reflective Reviewer Agent

**Description**: AI agent specialized in code review and quality analysis

**Implementation**:
- `plugins/specweave/agents/reflective-reviewer/AGENT.md`: Agent definition
- Contains analysis checklists (security, quality, testing, performance)
- Provides structured output format (markdown with sections)
- Includes examples of good feedback

**Dependencies**: FR-016-001
**Priority**: P1

---

### FR-016-003: Hook Integration

**Description**: Integration point in post-task-completion hook

**Implementation**:
- `plugins/specweave/hooks/post-task-completion.sh`: Enhanced hook
- Calls `node dist/hooks/lib/run-self-reflection.js` after task completion
- Passes increment ID and task context
- Handles async execution (non-blocking)

**Dependencies**: FR-016-001, FR-016-002
**Priority**: P1

---

### FR-016-004: Configuration System

**Description**: Flexible configuration for reflection behavior

**Implementation**:
- `src/core/schemas/specweave-config.schema.json`: Schema extension
- New `reflection` section in config.json:
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
      "storeReflections": true
    }
  }
  ```

**Dependencies**: None
**Priority**: P1

---

### FR-016-005: Reflection Storage

**Description**: Persistent storage of reflection results

**Implementation**:
- Storage path: `.specweave/increments/{id}/logs/reflections/`
- File naming: `task-{task-id}-reflection.md`
- Markdown format with structured sections
- Searchable via grep/search tools

**Dependencies**: FR-016-001
**Priority**: P1

---

### FR-016-006: Security Analysis

**Description**: OWASP Top 10 security vulnerability detection

**Implementation**:
- SQL injection pattern matching (string concatenation in queries)
- XSS pattern matching (unescaped user input)
- Secrets detection (regex for API keys, passwords)
- Authentication bypass detection
- HTTPS enforcement checks

**Dependencies**: FR-016-002
**Priority**: P1

---

### FR-016-007: Code Quality Analysis

**Description**: Best practices and maintainability checks

**Implementation**:
- Code duplication detection (AST-based comparison)
- Complexity metrics (cyclomatic complexity, function length)
- Error handling analysis (try-catch coverage)
- Naming convention checks
- Documentation suggestions

**Dependencies**: FR-016-002
**Priority**: P1

---

### FR-016-008: Testing Gap Analysis

**Description**: Test coverage and quality analysis

**Implementation**:
- Edge case detection (null, empty, boundary values)
- Error path coverage (every throw needs test)
- Integration test gaps (new endpoints without tests)
- E2E coverage analysis (user flows)
- Test quality metrics (assertions, mocking)

**Dependencies**: FR-016-002
**Priority**: P1

---

### FR-016-009: Feedback Generation

**Description**: Actionable, specific feedback with fixes

**Implementation**:
- Issue extraction from agent response
- Priority categorization (CRITICAL/HIGH/MEDIUM/LOW)
- Code snippet generation (with context)
- Fix suggestion formatting
- Impact explanation

**Dependencies**: FR-016-001, FR-016-002
**Priority**: P1

---

### FR-016-010: Warning System

**Description**: User notification for critical issues

**Implementation**:
- Terminal output formatting (colored text, emojis)
- Sound notifications (cross-platform)
- Issue summary statistics
- Optional blocking mode

**Dependencies**: FR-016-009
**Priority**: P1

---

### FR-016-011: Performance Analysis

**Description**: Performance issue detection

**Implementation**:
- N+1 query detection (loop analysis)
- Algorithm complexity estimation
- Caching opportunity identification
- Memory leak pattern matching

**Dependencies**: FR-016-002
**Priority**: P2

---

### FR-016-012: Cost Tracking

**Description**: AI cost monitoring and optimization

**Implementation**:
- Token counting before API call
- Cost estimation display
- Cumulative cost tracking
- Budget alert thresholds

**Dependencies**: FR-016-001
**Priority**: P1

---

## Non-Functional Requirements

### NFR-016-001: Performance

**Requirement**: Reflection completes within acceptable time limits

**Metrics**:
- \<15s for quick mode
- \<30s for standard mode
- \<60s for deep mode
- Async execution (non-blocking)

**Acceptance**: 95% of reflections complete within target time

---

### NFR-016-002: Cost Efficiency

**Requirement**: Cost-effective AI usage

**Metrics**:
- \<$0.01 per task (Haiku mode)
- \<$0.05 per task (Sonnet mode)
- \<$0.15 per task (Opus mode)
- \<$0.10 per increment average

**Acceptance**: 90% of increments cost \<$0.10

---

### NFR-016-003: Reliability

**Requirement**: High availability and fault tolerance

**Metrics**:
- 99.5% success rate for reflections
- Graceful degradation on API failures
- No workflow blocking on errors
- Automatic retry on transient failures

**Acceptance**: \<0.5% failure rate, zero workflow blocks

---

### NFR-016-004: Usability

**Requirement**: Simple configuration and clear feedback

**Metrics**:
- \<5 minutes to configure for first time
- Clear, actionable feedback (not vague warnings)
- \<10% false positive rate
- Feedback includes fix suggestions

**Acceptance**: User survey >80% satisfaction

---

### NFR-016-005: Extensibility

**Requirement**: Pluggable analysis modules

**Design**:
- Category-based analysis (security, quality, testing, etc.)
- Easy to add new check categories
- Customizable severity thresholds
- Third-party analyzer plugins (future)

**Acceptance**: New category added in \<4 hours

---

### NFR-016-006: Security

**Requirement**: No sensitive data sent to API

**Implementation**:
- Strip credentials before analysis
- Redact API keys/passwords in code snippets
- No PII sent to reflection engine
- Local-only mode option (future)

**Acceptance**: Security audit passes

---

### NFR-016-007: Compatibility

**Requirement**: Cross-platform support

**Platforms**:
- macOS (tested on 13+)
- Linux (Ubuntu 20.04+, Arch, Fedora)
- Windows (WSL2 recommended)
- Node.js 18+, 20+

**Acceptance**: E2E tests pass on all platforms

---

### NFR-016-008: Observability

**Requirement**: Comprehensive logging for debugging

**Implementation**:
- Structured logging to `.specweave/logs/hooks-debug.log`
- Reflection execution timeline
- Error context capture
- Performance metrics

**Acceptance**: Issues debuggable from logs alone

---

## Success Criteria

### Effectiveness Metrics

- **Issue Detection Rate**: 50%+ of code review issues caught by reflection
- **False Positive Rate**: \<10% of flagged issues are invalid
- **Security Coverage**: 80%+ of OWASP Top 10 vulnerabilities detected
- **Test Coverage**: +10% average test coverage after reflection adoption

### Performance Metrics

- **Execution Time**: 95% of reflections complete in \<30s
- **Cost Efficiency**: \<$0.01 average cost per task (Haiku mode)
- **Availability**: 99.5% reflection success rate

### Adoption Metrics

- **User Retention**: >80% of users keep reflection enabled after 2 weeks
- **Satisfaction**: >80% user satisfaction (post-feature survey)
- **Usage**: >90% of increments use reflection

### Quality Metrics

- **Code Review Time**: 30% reduction in code review duration
- **Bug Reduction**: 50% reduction in security bugs reaching QA
- **Learning**: Reflection logs referenced in >50% of retrospectives

---

## Implementation Phases

### Phase 1: Core Engine (Weeks 1-2)

**Goal**: Basic reflection system working

**Deliverables**:
- FR-016-001: Reflection Engine (run-self-reflection.ts)
- FR-016-002: Reflective Reviewer Agent (AGENT.md)
- FR-016-003: Hook Integration (post-task-completion.sh)
- FR-016-004: Configuration System (schema + config)
- FR-016-005: Reflection Storage (log files)

**Success Criteria**:
- Reflection runs automatically after task completion
- Basic feedback generated and stored
- Configuration works

---

### Phase 2: Security & Quality Checks (Weeks 3-4)

**Goal**: Comprehensive analysis capabilities

**Deliverables**:
- FR-016-006: Security Analysis (OWASP Top 10)
- FR-016-007: Code Quality Analysis (best practices)
- FR-016-008: Testing Gap Analysis (coverage)
- FR-016-009: Feedback Generation (actionable output)

**Success Criteria**:
- Detects SQL injection, XSS, secrets
- Identifies code duplication, complexity
- Finds missing tests

---

### Phase 3: Storage & Feedback (Week 5)

**Goal**: User-friendly feedback and persistence

**Deliverables**:
- FR-016-010: Warning System (CLI + sound)
- Enhanced reflection logs (lessons learned)
- Summary commands (`/reflections summary`)

**Success Criteria**:
- Critical issues shown immediately
- Reflections searchable
- Patterns visible across tasks

---

### Phase 4: Advanced Features (Week 6)

**Goal**: Performance and cost optimization

**Deliverables**:
- FR-016-011: Performance Analysis (N+1, complexity)
- FR-016-012: Cost Tracking (budget management)
- Documentation updates (CLAUDE.md, README.md)

**Success Criteria**:
- Performance issues detected
- Cost tracking accurate
- Documentation complete

---

## Test Strategy

### Unit Tests (85% coverage target)

**Scope**: Core logic and utilities

**Test Files**:
- `tests/unit/hooks/run-self-reflection.test.ts`: Reflection engine logic
- `tests/unit/reflection/issue-parser.test.ts`: Parsing agent responses
- `tests/unit/reflection/config-loader.test.ts`: Configuration loading

**Key Tests**:
- Reflection prompt generation
- Issue categorization (CRITICAL/HIGH/MEDIUM/LOW)
- Cost calculation
- Error handling

---

### Integration Tests (80% coverage target)

**Scope**: Component interactions

**Test Files**:
- `tests/integration/reflection/end-to-end.test.ts`: Full reflection workflow
- `tests/integration/reflection/hook-integration.test.ts`: Hook execution
- `tests/integration/reflection/storage.test.ts`: File storage

**Key Tests**:
- Hook triggers reflection
- Agent invocation
- Reflection stored correctly
- Configuration applied

---

### E2E Tests (Critical paths only)

**Scope**: User workflows

**Test Files**:
- `tests/e2e/reflection/first-reflection.spec.ts`: First-time setup
- `tests/e2e/reflection/critical-issue-warning.spec.ts`: Warning display

**Key Tests**:
- Complete task → reflection runs → log created
- Critical issue → warning displayed
- Configuration changes apply

---

## Dependencies

### External Dependencies

- **Anthropic API**: Claude models (Haiku/Sonnet/Opus)
- **Git**: File diff detection
- **Node.js**: Runtime (18+)

### Internal Dependencies

- **Post-task-completion hook**: Existing hook infrastructure
- **TodoWrite tool**: Task completion detection
- **Agent system**: Reflective-reviewer agent invocation
- **Configuration system**: Config schema and loading

### Optional Dependencies

- **Sound libraries**: System sound notifications (platform-specific)
- **GitHub CLI**: GitHub issue commenting (future)

---

## Risks & Mitigations

### Risk 1: Cost Escalation

**Description**: High AI costs if reflection runs on every minor change

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Default to Haiku model (20x cheaper than Opus)
- Token optimization (only send modified files)
- Configurable per-increment (disable for trivial work)
- Cost tracking and budget alerts

---

### Risk 2: False Positives

**Description**: Too many invalid warnings reduce trust

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Clear severity levels (don't cry wolf)
- Feedback loop (learn from ignored warnings)
- Iterative prompt improvement
- User-configurable thresholds

---

### Risk 3: Workflow Slowdown

**Description**: Reflection delays next task

**Likelihood**: Low
**Impact**: High

**Mitigation**:
- Async execution (non-blocking)
- Quick mode for rapid iteration
- Timeout handling (abort after 60s)
- Skip reflection on simple tasks (configurable)

---

### Risk 4: API Reliability

**Description**: Anthropic API downtime blocks workflow

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Graceful degradation (workflow continues)
- Retry logic for transient failures
- Offline mode (skip reflection if API down)
- Clear error messages

---

## Open Questions

1. **Reflection vs `/specweave:qa`**: Should reflection be separate or unified with QA validation?
   - **Recommendation**: Keep separate. Reflection = real-time per-task, QA = batch pre-close

2. **Auto-create follow-up tasks**: Should critical issues create tasks automatically?
   - **Recommendation**: No for MVP (task list pollution). Show warnings only.

3. **Scope threshold**: When to skip reflection for trivial changes?
   - **Recommendation**: Skip if \<10 lines changed (configurable)

4. **Model selection**: Haiku default or let user choose?
   - **Recommendation**: Haiku default (cost-effective). User can override.

5. **Integration with external tools**: Should reflections sync to GitHub issues?
   - **Recommendation**: Future feature (v0.13.0). MVP is local-only.

---

## References

### Internal Documents

- [Increment Lifecycle Guide](../../delivery/guides/increment-lifecycle.md)
- [Hook System Architecture](../architecture/hooks-system.md)
- [Configuration Schema](../../architecture/configuration.md)

### External Resources

- [Kimi Model Documentation](https://kimi.moonshot.cn/) - Inspiration for self-reflection
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security vulnerabilities
- [GitHub Copilot Workspace](https://githubnext.com/projects/copilot-workspace) - Similar review approach

### Related Features

- `/specweave:qa`: Increment quality assessment (complementary)
- `/specweave:done`: Increment closure (uses reflection logs)
- Post-task-completion hook: Integration point

---

**Document Status**: APPROVED
**Next Steps**: Architect agent creates plan.md with technical design
