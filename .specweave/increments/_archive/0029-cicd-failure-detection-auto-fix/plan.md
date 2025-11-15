# Implementation Plan: CI/CD Failure Detection & Claude Auto-Fix System

---

**Increment**: 0029-cicd-failure-detection-auto-fix
**Status**: Planning
**Priority**: P1 (Critical)

**Architecture Documentation**:
- [System Design](../../docs/internal/architecture/system-design.md) (updated with CI/CD components)
- [ADR-0031: GitHub Actions Polling vs Webhooks](../../docs/internal/architecture/adr/0031-github-actions-polling-vs-webhooks.md)
- [ADR-0032: Haiku vs Sonnet for Log Parsing](../../docs/internal/architecture/adr/0032-haiku-vs-sonnet-for-log-parsing.md)
- [ADR-0033: Auto-Apply vs Manual Review](../../docs/internal/architecture/adr/0033-auto-apply-vs-manual-review-for-fixes.md)

**Diagrams**:
- [Failure Detection Flow](../../docs/internal/architecture/diagrams/cicd/failure-detection-flow.mmd)
- [Auto-Fix Architecture](../../docs/internal/architecture/diagrams/cicd/auto-fix-architecture.mmd)

---

## Architecture Overview

**Complete architecture**: [See architecture ADRs and diagrams above]

### Key Decisions

**1. API Polling (ADR-0031)**
- Poll GitHub Actions API every 60 seconds
- Detection latency: <2 minutes
- API usage: 1-2% of rate limit (60-95 calls/hour)
- Why: Simpler than webhooks, works locally, no security risks

**2. Two-Phase AI Analysis (ADR-0032)**
- **Phase 1 (Haiku)**: Fast log extraction ($0.002 per failure)
- **Phase 2 (Sonnet)**: Intelligent root cause analysis ($0.03-0.08 per failure)
- Total cost: $0.015 per failure (6.7x under $0.10 budget)
- Why: Balanced speed/cost/accuracy

**3. Configurable Safety Gates (ADR-0033)**
- Three modes: never, high-confidence, always
- Safety gates: confidence threshold, critical files, multi-file changes
- Rollback mechanism: backup before apply, auto-rollback on verification failure
- Why: User control + automation

---

## Technology Stack Summary

**Existing SpecWeave Infrastructure** (reused):
- GitHub integration: `plugins/specweave-github/lib/github-client-v2.ts` (ADR-0022)
- Rate limiting: `src/core/sync/rate-limiter.ts` (ADR-0016)
- Secure execution: `src/utils/execFileNoThrow.ts`

**New Components** (this increment):
- TypeScript 5.x
- Node.js 18+
- GitHub Actions REST API
- Anthropic Claude API:
  - Haiku 3.5 ($0.25/MTok input, $1.25/MTok output)
  - Sonnet 4.0 ($3/MTok input, $15/MTok output)
- SQLite (optional, pattern learning)
- node-notifier (desktop notifications)

---

## Implementation Phases

### Phase 1: Core Monitoring (Week 1-2)

**Goal**: Detect GitHub Actions failures via polling

**Components**:
1. **Workflow Monitor** (`src/core/cicd/workflow-monitor.ts`)
   - Poll GitHub API every 60 seconds
   - Filter for failed workflow runs
   - Deduplicate processed runs
   - Store state locally

2. **State Manager** (`src/core/cicd/state-manager.ts`)
   - Persist workflow status
   - Track processed runs
   - Load/save to `.specweave/state/cicd-monitor.json`

3. **CLI Commands** (`src/cli/commands/cicd/`)
   - `specweave cicd start` - Start monitoring
   - `specweave cicd stop` - Stop monitoring
   - `specweave cicd status` - Show current status
   - `specweave cicd list-failures` - List recent failures

**Deliverables**:
- ✅ Polling loop working (60s interval)
- ✅ State persistence (JSON file)
- ✅ CLI commands functional
- ✅ Unit tests (80%+ coverage)
- ✅ Integration tests with GitHub API mocks

**Dependencies**: ADR-0031, existing GitHub client

---

### Phase 2: Analysis & Fix Generation (Week 3-4)

**Goal**: Analyze failure logs with Claude and generate fix proposals

**Components**:
1. **Haiku Log Extractor** (`src/core/cicd/haiku-extractor.ts`)
   - Extract error messages, stack traces, failed tests
   - Parse logs to identify error type
   - Output structured JSON (ErrorExtraction)
   - Cost target: <$0.003 per extraction

2. **Sonnet Root Cause Analyzer** (`src/core/cicd/sonnet-analyzer.ts`)
   - Analyze extracted errors
   - Load affected file contents
   - Get recent git diff
   - Generate fix proposals with confidence scores
   - Cost target: $0.03-0.08 per analysis

3. **Analysis Orchestrator** (`src/core/cicd/analysis-orchestrator.ts`)
   - Coordinate Haiku → Sonnet pipeline
   - Fallback to Sonnet-only if Haiku fails
   - Track costs per analysis

4. **Cost Tracker** (`src/core/cicd/cost-tracker.ts`)
   - Monitor Claude API usage
   - Alert if over budget ($0.10 per failure)
   - Weekly/monthly cost reports

**Deliverables**:
- ✅ Two-phase analysis working
- ✅ Fix proposals generated (JSON format)
- ✅ Cost tracking functional
- ✅ 70%+ fix success rate (tested with historical failures)
- ✅ Unit tests (85%+ coverage)

**Dependencies**: ADR-0032, Anthropic API access

---

### Phase 3: Fix Application (Week 5)

**Goal**: Apply fixes safely with rollback support

**Components**:
1. **Safety Validator** (`src/core/cicd/safety-validator.ts`)
   - Evaluate fix proposals (confidence, critical files, multi-file)
   - Return SafetyGate (autoApply, reason, warnings)
   - Configurable thresholds

2. **Rollback Manager** (`src/core/cicd/rollback-manager.ts`)
   - Create backups before applying fixes
   - Store original file contents
   - Rollback on verification failure
   - List available backups

3. **Fix Applicator** (`src/core/cicd/fix-applicator.ts`)
   - Apply code changes to files
   - Create git commits (optional)
   - Notify user (desktop notification)

4. **Verification Manager** (`src/core/cicd/verification-manager.ts`)
   - Re-run workflow after fix
   - Poll for completion (10-minute timeout)
   - Auto-rollback if workflow still fails

5. **CLI Commands** (extended)
   - `specweave cicd fix propose <run-id>` - Propose fix
   - `specweave cicd fix apply <fix-id>` - Apply fix
   - `specweave cicd fix preview <fix-id>` - Preview changes
   - `specweave cicd fix rollback <fix-id>` - Rollback fix

**Deliverables**:
- ✅ Safety gates working (3 modes: never, high-confidence, always)
- ✅ Rollback mechanism tested
- ✅ Verification re-runs workflow
- ✅ Desktop notifications functional
- ✅ Unit tests (90%+ coverage)
- ✅ E2E tests with real GitHub repository

**Dependencies**: ADR-0033, GitHub Actions Rerun API

---

### Phase 4: Intelligence & Learning (Week 6-7)

**Goal**: Learn from patterns and improve over time

**Components**:
1. **Pattern Database** (`.specweave/state/cicd-patterns.db`)
   - SQLite database
   - Tables: failures, fixes, patterns
   - Track fix success rates per failure type

2. **Pattern Learner** (`src/core/cicd/pattern-learner.ts`)
   - Detect recurring failure patterns
   - Suggest fixes based on historical success
   - Calculate flakiness scores for tests

3. **Reporting** (`src/core/cicd/report-generator.ts`)
   - Weekly failure reports
   - Fix success rate metrics
   - Cost dashboard
   - Common failure types

4. **CLI Commands** (extended)
   - `specweave cicd report [--days 7]` - Generate report
   - `specweave cicd costs` - Show cost dashboard
   - `specweave cicd patterns` - List learned patterns

**Deliverables**:
- ✅ Pattern database schema
- ✅ Pattern detection working
- ✅ Reports generated (markdown)
- ✅ Flaky test detection (>3 failures in 10 runs)
- ✅ Integration tests

**Dependencies**: Phase 1-3 complete

---

## Component Breakdown

### New Files Created

**Core Components** (`src/core/cicd/`):
- `workflow-monitor.ts` (polling, failure detection)
- `state-manager.ts` (persistence)
- `haiku-extractor.ts` (log parsing, Haiku)
- `sonnet-analyzer.ts` (root cause analysis, Sonnet)
- `analysis-orchestrator.ts` (coordinate phases)
- `cost-tracker.ts` (budget monitoring)
- `safety-validator.ts` (safety gates)
- `rollback-manager.ts` (backup/restore)
- `fix-applicator.ts` (apply code changes)
- `verification-manager.ts` (verify fixes)
- `pattern-learner.ts` (learn from patterns)
- `report-generator.ts` (metrics, reports)

**CLI Commands** (`src/cli/commands/cicd/`):
- `start.ts` - Start monitoring
- `stop.ts` - Stop monitoring
- `status.ts` - Show status
- `list-failures.ts` - List failures
- `fix-propose.ts` - Propose fix
- `fix-apply.ts` - Apply fix
- `fix-preview.ts` - Preview fix
- `fix-rollback.ts` - Rollback fix
- `report.ts` - Generate report
- `costs.ts` - Show costs

**Tests**:
- `tests/unit/cicd/` (unit tests)
- `tests/integration/cicd/` (integration tests with GitHub mocks)
- `tests/e2e/cicd/` (E2E tests with real GitHub repository)

**State Files** (`.specweave/state/`):
- `cicd-monitor.json` (current state)
- `backups/` (file backups before apply)
- `cicd-patterns.db` (pattern learning, SQLite)

**Config** (`.specweave/config.json`):
```jsonc
{
  "cicd": {
    "monitoredWorkflows": ["*"], // All workflows
    "pollingInterval": 60, // seconds
    "autoFix": {
      "mode": "high-confidence", // never | high-confidence | always
      "confidenceThreshold": 0.8,
      "maxFilesAutoApply": 3,
      "reviewTestChanges": true,
      "criticalFiles": [
        ".github/workflows/**",
        "package.json",
        "*.env"
      ],
      "verifyAfterApply": true,
      "rollbackOnFailure": true,
      "notifyOnAutoApply": true
    }
  }
}
```

---

## Integration Points

### Existing SpecWeave Code (Reused)

**GitHub Integration**:
- `plugins/specweave-github/lib/github-client-v2.ts` (GitHub CLI wrapper)
- Reuses authentication (`gh auth status`)
- Reuses repository detection (`git remote`)

**Rate Limiting**:
- `src/core/sync/rate-limiter.ts` (pre-flight validation)
- Prevents API quota exhaustion

**Secure Execution**:
- `src/utils/execFileNoThrow.ts` (shell command execution)
- No shell injection vulnerabilities

**Cost Tracking** (existing pattern):
- `src/core/costs/` (AI API usage tracking)
- Extend for CI/CD analysis costs

---

## Test Strategy

### Unit Tests (80% coverage target)

**Components to test**:
- Workflow Monitor (polling logic, deduplication)
- State Manager (load/save, concurrency)
- Haiku Extractor (error extraction, confidence scoring)
- Sonnet Analyzer (fix generation, file loading)
- Safety Validator (safety gates, critical files)
- Rollback Manager (backup/restore, corruption handling)
- Verification Manager (polling, timeout, rollback trigger)

**Example Test**:
```typescript
describe('WorkflowMonitor', () => {
  test('polls GitHub API every 60 seconds', async () => {
    const monitor = new WorkflowMonitor();
    await monitor.start();
    await sleep(120_000); // 2 minutes
    expect(mockGitHubAPI.callCount).toBeGreaterThanOrEqual(2);
  });

  test('processes failures only once', async () => {
    mockGitHubAPI.mockFailure({ runId: 123 });
    await monitor.poll();
    await monitor.poll(); // Second poll
    expect(mockProcessFailure).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests (90% coverage target)

**Scenarios**:
- GitHub API integration (with mocks)
- Claude API integration (with mocks)
- End-to-end failure analysis (mock failure → fix proposal)
- Rollback after verification failure

**Example Test**:
```typescript
describe('Failure Analysis Pipeline', () => {
  test('analyzes TypeScript build error', async () => {
    const logs = mockBuildErrorLogs();
    const extraction = await haikuExtractor.extract(logs);
    expect(extraction.errorType).toBe('build');

    const proposal = await sonnetAnalyzer.analyze(extraction);
    expect(proposal.fixes).toHaveLength(1);
    expect(proposal.confidence).toBeGreaterThan(0.8);
  });
});
```

### E2E Tests (100% critical path coverage)

**Critical Paths**:
1. Detect failure → Extract logs → Analyze → Propose fix → Preview → Apply → Verify success
2. Detect failure → Extract logs → Analyze → Auto-apply → Verify failure → Rollback
3. Detect failure → Extract logs → Analyze → Safety gate blocks → Manual review

**Example Test**:
```typescript
test('full auto-fix workflow', async () => {
  // 1. Trigger workflow failure
  await triggerTestWorkflow({ shouldFail: true, errorType: 'build' });

  // 2. Wait for detection (60s + processing)
  await sleep(90_000);

  // 3. Verify fix proposal generated
  const state = await loadState();
  expect(state.workflows['test-workflow'].lastFailure.analysis).toBeDefined();

  // 4. Verify auto-apply (high confidence)
  const backups = await listBackups();
  expect(backups).toHaveLength(1);

  // 5. Verify workflow re-run
  await sleep(120_000); // Wait for workflow
  const verificationRun = await getLatestWorkflowRun();
  expect(verificationRun.conclusion).toBe('success');
});
```

**Test Infrastructure**:
- Test repository: `anton-abyzov/specweave-test` (dedicated test repo)
- Test workflows: `.github/workflows/test-*.yml` (intentionally failing)
- Cleanup: Delete test branches after E2E tests

---

## Risk Analysis

### Risk 1: Claude Analysis Quality (Medium)

**Impact**: Poor fixes proposed, wasted developer time
**Probability**: 20-30% (based on 70-80% success rate)

**Mitigation**:
- ✅ Confidence scores guide auto-apply decisions
- ✅ Safety gates prevent dangerous fixes
- ✅ Rollback mechanism for failed fixes
- ✅ Manual review for low confidence
- ✅ Learn from patterns (improve over time)

### Risk 2: GitHub Rate Limiting (Low)

**Impact**: Polling interrupted, delayed failure detection
**Probability**: 5% (1-2% quota usage under normal load)

**Mitigation**:
- ✅ Use existing rate limiter from ADR-0016
- ✅ Conditional requests (If-Modified-Since) reduce bandwidth
- ✅ 304 responses don't count against limits
- ✅ Alert if >80% quota usage
- ✅ Exponential backoff on rate limit errors

### Risk 3: False Positives (Medium)

**Impact**: Incorrect fixes applied, breaking more things
**Probability**: 20-30% (inverse of success rate)

**Mitigation**:
- ✅ Always create backups before applying fixes
- ✅ Rollback command available (manual + auto)
- ✅ Verification re-runs workflow (confirms fix worked)
- ✅ Safety gates prevent high-risk auto-apply
- ✅ Audit trail (all actions logged)

### Risk 4: Cost Overruns (Low)

**Impact**: Exceed $0.10 per failure budget
**Probability**: 10% (only for complex multi-file failures)

**Mitigation**:
- ✅ Two-phase approach reduces cost (Haiku $0.002, Sonnet $0.03-0.08)
- ✅ Cost tracking alerts if >$0.10
- ✅ Fallback to Sonnet-only costs $0.02 (still under budget)
- ✅ Budget headroom: 6.7x ($0.015 vs $0.10)

### Risk 5: Workflow Verification Timeout (Low)

**Impact**: Can't verify fix effectiveness, rollback delayed
**Probability**: 5% (if workflow hangs)

**Mitigation**:
- ✅ 10-minute timeout (most workflows complete in <5 minutes)
- ✅ Retry logic (up to 3 attempts)
- ✅ Manual rollback always available
- ✅ User notification on timeout

---

## Success Criteria

### Metrics

1. **Fix Success Rate**: >70% of proposed fixes resolve failures
   - Measured: verified / autoApplied
   - Target: 70% week 1 → 80% week 8 (learning improves)

2. **Time to Resolution**: Reduce average failure resolution time by 50%
   - Baseline: 2 hours (manual investigation + fix)
   - Target: 1 hour (auto-fix + verification)

3. **Cost Efficiency**: <$0.10 per failure analysis
   - Measured: total cost / number of analyses
   - Target: $0.015 average (6.7x under budget)

4. **Developer Satisfaction**: >80% satisfaction in user surveys
   - Survey after 4 weeks of use
   - Questions: usefulness, accuracy, trust

### KPIs (Tracked in Reports)

- Number of failures auto-fixed per week
- Average time from failure to fix proposal
- Percentage of fixes applied automatically vs manually
- Claude analysis cost per failure
- Rollback rate (% of fixes that failed verification)
- Safety gate block reasons (low confidence, critical files, multi-file)

---

## Dependencies

**External**:
- GitHub Actions API (REST)
- Anthropic Claude API (Haiku + Sonnet)
- GitHub CLI (`gh` command)

**Internal SpecWeave**:
- ADR-0022: GitHub Sync Architecture (GitHub client)
- ADR-0026: GitHub API Validation (rate limiting)
- ADR-0016: Multi-Project External Sync (rate limiter)
- ADR-0007: Testing Strategy (coverage targets)

**NPM Packages** (new):
- `node-notifier` (desktop notifications)
- `better-sqlite3` (pattern database, optional)

---

## Out of Scope (This Increment)

**Deferred to Future Increments**:
- ❌ Webhook support (future enhancement, ADR-0031 allows for it)
- ❌ Multi-repository monitoring (future enhancement)
- ❌ Slack/email notifications (future enhancement, desktop only for now)
- ❌ Machine learning-based failure prediction (future research)
- ❌ Integration with other CI/CD platforms (GitLab, CircleCI)
- ❌ Parallel fix application (multiple failures at once)
- ❌ Fix templates (user-defined fix patterns)

---

## Timeline

**Week 1-2**: Phase 1 (Core Monitoring)
**Week 3-4**: Phase 2 (Analysis & Fix Generation)
**Week 5**: Phase 3 (Fix Application)
**Week 6-7**: Phase 4 (Intelligence & Learning)

**Total**: 7 weeks (1.75 months)

---

## References

**Living Documentation**:
- [Spec](../../docs/internal/specs/default/spec-0029-cicd-failure-detection-auto-fix.md)
- [ADR-0031: Polling vs Webhooks](../../docs/internal/architecture/adr/0031-github-actions-polling-vs-webhooks.md)
- [ADR-0032: Haiku vs Sonnet](../../docs/internal/architecture/adr/0032-haiku-vs-sonnet-for-log-parsing.md)
- [ADR-0033: Auto-Apply vs Manual Review](../../docs/internal/architecture/adr/0033-auto-apply-vs-manual-review-for-fixes.md)
- [Failure Detection Flow](../../docs/internal/architecture/diagrams/cicd/failure-detection-flow.mmd)
- [Auto-Fix Architecture](../../docs/internal/architecture/diagrams/cicd/auto-fix-architecture.mmd)

**External Resources**:
- GitHub Actions API: https://docs.github.com/en/rest/actions
- Anthropic Claude API: https://docs.anthropic.com/en/api
- GitHub CLI: https://cli.github.com/

---

## Next Steps

1. **Review architecture** with team (ADRs, diagrams)
2. **Validate cost estimates** (run small-scale test with Haiku + Sonnet)
3. **Create tasks.md** with embedded test plans (BDD format)
4. **Begin Phase 1 implementation** (core monitoring)

---

**This plan serves as a summary. For complete technical details, see the ADRs and diagrams linked above.**
