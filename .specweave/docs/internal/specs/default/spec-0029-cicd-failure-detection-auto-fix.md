# SPEC-029: Automated CI/CD Failure Detection & Claude Auto-Fix System

**Living Documentation Specification** - Permanent Source of Truth

---

## Metadata

- **Spec ID**: SPEC-029
- **Title**: Automated CI/CD Failure Detection & Claude Auto-Fix System
- **Status**: Approved
- **Priority**: P1 (Critical)
- **Created**: 2025-11-12
- **Owner**: SpecWeave Core Team
- **Increment**: 0029-cicd-failure-detection-auto-fix
- **External Links**: TBD (GitHub Project/Issue)

---

## Quick Overview

Implement an intelligent CI/CD monitoring and auto-fix system that:
1. **Monitors** GitHub Actions workflows in real-time
2. **Detects** failures automatically (DORA metrics, tests, builds, deployments)
3. **Analyzes** error logs using Claude Code to identify root causes
4. **Proposes** intelligent fixes with code changes and explanations
5. **Applies** fixes automatically (with approval) or via PR
6. **Learns** from patterns to improve future failure detection

This builds on existing GitHub integration (ADRs 0022, 0026) and extends it with AI-powered automation.

---

## User Stories

### Epic 1: Workflow Monitoring & Failure Detection

#### US-001: Monitor GitHub Actions Workflows (P1)
**As a** developer
**I want** SpecWeave to monitor my GitHub Actions workflows in real-time
**So that** I'm immediately notified when workflows fail

**Acceptance Criteria**:
- **AC-US1-01**: System polls GitHub Actions API every 60 seconds for workflow status (P1, testable)
- **AC-US1-02**: Failed workflow runs are detected within 2 minutes of failure (P1, testable)
- **AC-US1-03**: System stores workflow run metadata (ID, name, commit, timestamp) in local state (P1, testable)
- **AC-US1-04**: Duplicate failure notifications are prevented within 10-minute window (P2, testable)

**Technical Details**:
- Use GitHub REST API: `GET /repos/{owner}/{repo}/actions/runs`
- Filter for status: `completed` with conclusion: `failure`
- Store state in `.specweave/state/workflow-monitor.json`

---

#### US-002: Detect DORA Metrics Workflow Failures (P1)
**As a** SpecWeave maintainer
**I want** to automatically detect when DORA Metrics workflow fails
**So that** I can fix it immediately

**Acceptance Criteria**:
- **AC-US2-01**: DORA Metrics workflow failures trigger high-priority alert (P1, testable)
- **AC-US2-02**: Failure context includes: workflow file path, job name, step that failed (P1, testable)
- **AC-US2-03**: Last 500 lines of failure logs are extracted automatically (P1, testable)

---

#### US-003: Detect Version Bump Workflow Failures (P1)
**As a** SpecWeave maintainer
**I want** to detect version bump workflow failures
**So that** releases aren't blocked

**Acceptance Criteria**:
- **AC-US3-01**: chore(deps) bump workflow failures are detected (P1, testable)
- **AC-US3-02**: Failure type is classified (dependency conflict, network issue, auth failure) (P2, testable)
- **AC-US3-03**: Related PR number is extracted from workflow context (P1, testable)

---

#### US-004: Detect Test Failure Workflows (P1)
**As a** developer
**I want** test failures to be automatically detected
**So that** I can fix them quickly

**Acceptance Criteria**:
- **AC-US4-01**: Failed unit tests are detected and reported (P1, testable)
- **AC-US4-02**: Failed integration tests are detected and reported (P1, testable)
- **AC-US4-03**: Failed E2E tests are detected and reported (P1, testable)
- **AC-US4-04**: Test failure count and names are extracted from logs (P1, testable)

---

### Epic 2: Log Analysis & Root Cause Detection

#### US-005: Extract Relevant Error Logs (P1)
**As a** system
**I want** to extract only relevant error logs
**So that** Claude analysis is focused and cost-effective

**Acceptance Criteria**:
- **AC-US5-01**: Last 500 lines of failed job logs are extracted (P1, testable)
- **AC-US5-02**: Error stack traces are identified and highlighted (P1, testable)
- **AC-US5-03**: ANSI color codes are stripped from logs (P1, testable)
- **AC-US5-04**: Sensitive data (tokens, secrets) is redacted before sending to Claude (P1, testable, security)

---

#### US-006: Invoke Claude for Root Cause Analysis (P1)
**As a** system
**I want** to send failure logs to Claude Code for analysis
**So that** root causes are identified intelligently

**Acceptance Criteria**:
- **AC-US6-01**: Claude receives: workflow name, job name, step name, error logs, file paths (P1, testable)
- **AC-US6-02**: Claude analysis completes within 30 seconds (P1, testable, NFR)
- **AC-US6-03**: Analysis includes: root cause, affected files, suggested fix approach (P1, testable)
- **AC-US6-04**: Cost per analysis is < $0.05 (use Haiku for log analysis) (P1, testable, NFR)

**Model Selection**:
- Use **Haiku** for log parsing and error extraction (fast, cheap)
- Use **Sonnet** for root cause analysis and fix generation (intelligent)

---

#### US-007: Classify Failure Types (P2)
**As a** system
**I want** to classify failure types automatically
**So that** fixes can be prioritized

**Acceptance Criteria**:
- **AC-US7-01**: Failures classified as: build, test, deploy, dependency, security, network (P2, testable)
- **AC-US7-02**: Classification confidence score is provided (0.0-1.0) (P2, testable)
- **AC-US7-03**: Unknown failure types are flagged for manual review (P2, testable)

---

### Epic 3: Fix Generation & Proposal

#### US-008: Generate Code Fixes for Failures (P1)
**As a** developer
**I want** Claude to generate proposed fixes
**So that** I can review and apply them

**Acceptance Criteria**:
- **AC-US8-01**: Fix includes: file paths, line numbers, old code, new code (P1, testable)
- **AC-US8-02**: Fix explanation describes WHY the change fixes the issue (P1, testable)
- **AC-US8-03**: Multiple fix options are provided when ambiguous (P2, testable)
- **AC-US8-04**: Fixes follow SpecWeave coding standards (TypeScript, ESLint) (P1, testable)

**Fix Format**:
```typescript
interface FixProposal {
  id: string;
  description: string;
  files: Array<{
    path: string;
    changes: Array<{
      lineNumber: number;
      oldCode: string;
      newCode: string;
      explanation: string;
    }>;
  }>;
  confidence: number; // 0.0-1.0
  testPlan: string;
}
```

---

#### US-009: Handle Dependency Update Failures (P1)
**As a** developer
**I want** dependency conflict fixes to be proposed
**So that** chore(deps) PRs can be fixed automatically

**Acceptance Criteria**:
- **AC-US9-01**: Package.json version conflicts are detected (P1, testable)
- **AC-US9-02**: Compatible version ranges are proposed (P1, testable)
- **AC-US9-03**: Breaking changes are identified and migration steps provided (P2, testable)

---

#### US-010: Handle Test Failures (P1)
**As a** developer
**I want** test failure fixes to be proposed
**So that** failing tests can be fixed quickly

**Acceptance Criteria**:
- **AC-US10-01**: Test assertion failures are analyzed (expected vs actual) (P1, testable)
- **AC-US10-02**: Code changes that broke tests are identified (git diff analysis) (P2, testable)
- **AC-US10-03**: Test code fixes OR implementation code fixes are proposed (P1, testable)

---

#### US-011: Handle Build Failures (P1)
**As a** developer
**I want** build failure fixes to be proposed
**So that** CI pipelines can be unblocked

**Acceptance Criteria**:
- **AC-US11-01**: TypeScript compilation errors are fixed (type errors, missing imports) (P1, testable)
- **AC-US11-02**: ESLint errors are fixed (formatting, unused vars) (P1, testable)
- **AC-US11-03**: Missing dependencies are added to package.json (P1, testable)

---

### Epic 4: Fix Application

#### US-012: Preview Fix Before Applying (P1)
**As a** developer
**I want** to preview proposed fixes
**So that** I can verify they're correct before applying

**Acceptance Criteria**:
- **AC-US12-01**: Side-by-side diff is shown (old code vs new code) (P1, testable)
- **AC-US12-02**: Affected files list is shown (P1, testable)
- **AC-US12-03**: Fix confidence score is displayed (P2, testable)
- **AC-US12-04**: User can approve/reject each file change independently (P2, testable)

---

#### US-013: Auto-Apply Fixes with Approval (P1)
**As a** developer
**I want** to apply fixes with one command
**So that** I don't have to manually edit files

**Acceptance Criteria**:
- **AC-US13-01**: `specweave cicd fix apply <fix-id>` command applies all changes (P1, testable)
- **AC-US13-02**: Files are backed up before applying changes (P1, testable)
- **AC-US13-03**: Rollback command is available if fix breaks more things (P1, testable)
- **AC-US13-04**: Git commit is created with fix description (P2, testable)

---

#### US-014: Create PR for Proposed Fix (P2)
**As a** developer
**I want** fixes to be submitted as PRs
**So that** they go through code review

**Acceptance Criteria**:
- **AC-US14-01**: PR is created with fix changes (P2, testable)
- **AC-US14-02**: PR description includes: failure analysis, root cause, fix explanation (P2, testable)
- **AC-US14-03**: PR is linked to original failing workflow run (P2, testable)
- **AC-US14-04**: PR title follows format: "fix(ci): <description> (auto-fix by Claude)" (P2, testable)

---

#### US-015: Verify Fix Effectiveness (P1)
**As a** system
**I want** to verify that fixes actually resolve failures
**So that** broken fixes aren't applied

**Acceptance Criteria**:
- **AC-US15-01**: After fix applied, workflow is re-run automatically (P1, testable)
- **AC-US15-02**: If workflow still fails, fix is marked as ineffective (P1, testable)
- **AC-US15-03**: Success/failure rate is tracked per fix type (P2, testable)

---

### Epic 5: Pattern Learning & Intelligence

#### US-016: Learn from Recurring Failures (P2)
**As a** system
**I want** to learn from recurring failure patterns
**So that** similar failures are fixed faster

**Acceptance Criteria**:
- **AC-US16-01**: Failure patterns are stored (failure type, root cause, fix applied) (P2, testable)
- **AC-US16-02**: Similar failures are detected using pattern matching (P2, testable)
- **AC-US16-03**: Previously successful fixes are suggested first for similar failures (P2, testable)

---

#### US-017: Detect Flaky Tests (P2)
**As a** developer
**I want** flaky tests to be identified
**So that** I can fix them proactively

**Acceptance Criteria**:
- **AC-US17-01**: Tests that fail intermittently are flagged (>3 failures in 10 runs) (P2, testable)
- **AC-US17-02**: Flakiness score is calculated (failure rate) (P2, testable)
- **AC-US17-03**: Root causes of flakiness are suggested (timing issues, network dependency) (P3, testable)

---

### Epic 6: Notifications & Reporting

#### US-018: Send Failure Notifications (P2)
**As a** developer
**I want** to be notified when workflows fail
**So that** I can take action immediately

**Acceptance Criteria**:
- **AC-US18-01**: Desktop notification is shown (macOS/Linux/Windows) (P2, testable)
- **AC-US18-02**: Notification includes: workflow name, failure reason, fix status (P2, testable)
- **AC-US18-03**: Notification links to fix preview command (P2, testable)

---

#### US-019: Generate Failure Reports (P2)
**As a** team lead
**I want** weekly failure reports
**So that** I can track CI/CD health

**Acceptance Criteria**:
- **AC-US19-01**: Report includes: total failures, fix success rate, common failure types (P2, testable)
- **AC-US19-02**: Report is generated as markdown (P2, testable)
- **AC-US19-03**: Report can be sent via email or Slack (P3, manual)

---

### Epic 7: Configuration & Settings

#### US-020: Configure Monitored Workflows (P1)
**As a** developer
**I want** to configure which workflows to monitor
**So that** I only get alerts for important workflows

**Acceptance Criteria**:
- **AC-US20-01**: `.specweave/config.json` has `cicd.monitoredWorkflows` array (P1, testable)
- **AC-US20-02**: Workflow names can be specified (exact match or glob pattern) (P1, testable)
- **AC-US20-03**: Default is to monitor ALL workflows (P1, testable)

---

#### US-021: Configure Auto-Apply Rules (P2)
**As a** developer
**I want** to configure when fixes are auto-applied
**So that** I have control over automation

**Acceptance Criteria**:
- **AC-US21-01**: Auto-apply can be enabled/disabled globally (P1, testable)
- **AC-US21-02**: Auto-apply rules by failure type (always, never, ask) (P2, testable)
- **AC-US21-03**: Auto-apply only for high-confidence fixes (confidence > 0.8) (P2, testable)

---

## Functional Requirements

### FR-001: GitHub Actions Integration
**Description**: Integrate with GitHub Actions API to monitor workflow runs
**Priority**: P1
**Dependencies**: Existing GitHub integration (ADR-0022)

**Implementation**:
- Use GitHub REST API (v3)
- Authenticate with `GITHUB_TOKEN` from config
- Poll `/repos/{owner}/{repo}/actions/runs` every 60 seconds
- Handle rate limiting (5000 requests/hour)

---

### FR-002: Log Extraction & Parsing
**Description**: Extract and parse workflow logs from failed runs
**Priority**: P1

**Implementation**:
- Use GitHub API: `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
- Parse logs to extract:
  - Error messages (lines with "Error:", "Failed:", etc.)
  - Stack traces
  - Failed test names
  - Exit codes

---

### FR-003: Claude Code Integration
**Description**: Invoke Claude Code for log analysis and fix generation
**Priority**: P1

**Implementation**:
- Use Anthropic API (same as other SpecWeave features)
- Create specialized prompt template for CI/CD failure analysis
- Include:
  - Workflow context (name, job, step)
  - Error logs (last 500 lines)
  - File contents (if relevant)
  - Git diff (if commit triggered failure)

---

### FR-004: Fix Application Engine
**Description**: Apply proposed fixes to local files
**Priority**: P1

**Implementation**:
- Parse fix proposals (file path, line numbers, changes)
- Create backups of original files
- Apply changes using fs-extra
- Create git commit with fix description

---

### FR-005: State Management
**Description**: Track workflow status, failures, fixes applied
**Priority**: P1

**Implementation**:
- Store state in `.specweave/state/cicd-monitor.json`
- Schema:
```typescript
interface CICDState {
  lastPoll: Date;
  workflows: {
    [workflowId: string]: {
      status: 'success' | 'failure';
      lastRun: Date;
      failureCount: number;
      lastFailure?: {
        runId: number;
        logs: string;
        analysis?: string;
        fixProposed?: FixProposal;
        fixApplied?: boolean;
      };
    };
  };
}
```

---

### FR-006: Failure Pattern Database
**Description**: Store and learn from failure patterns
**Priority**: P2

**Implementation**:
- SQLite database: `.specweave/state/cicd-patterns.db`
- Tables:
  - `failures` (id, workflow_name, failure_type, root_cause, timestamp)
  - `fixes` (id, failure_id, fix_code, success, timestamp)
  - `patterns` (id, pattern_hash, failure_type, fix_template, success_rate)

---

### FR-007: Notification System
**Description**: Send desktop notifications for failures
**Priority**: P2

**Implementation**:
- Use `node-notifier` package
- Show notification when:
  - Workflow fails
  - Fix is proposed
  - Fix is applied
  - Fix verification succeeds/fails

---

### FR-008: CLI Commands
**Description**: Provide CLI interface for CI/CD monitoring
**Priority**: P1

**Commands**:
- `specweave cicd start` - Start monitoring workflows
- `specweave cicd stop` - Stop monitoring
- `specweave cicd status` - Show current status
- `specweave cicd list-failures` - List recent failures
- `specweave cicd fix propose <run-id>` - Propose fix for specific run
- `specweave cicd fix apply <fix-id>` - Apply proposed fix
- `specweave cicd fix rollback <fix-id>` - Rollback applied fix
- `specweave cicd report [--days 7]` - Generate failure report

---

### FR-009: Webhook Support (Future)
**Description**: Support GitHub webhook for real-time failure detection
**Priority**: P3

**Implementation**:
- HTTP server listening on localhost
- Receives webhook payloads from GitHub
- Immediate failure detection (no polling delay)

---

### FR-010: Multi-Repository Support
**Description**: Monitor workflows across multiple repositories
**Priority**: P3

**Implementation**:
- Config supports array of repositories
- Separate state tracking per repository
- Aggregate reports across repositories

---

## Non-Functional Requirements

### NFR-001: Performance
- **AC-NFR1-01**: Workflow polling completes in < 5 seconds (P1, testable)
- **AC-NFR1-02**: Claude analysis completes in < 30 seconds (P1, testable)
- **AC-NFR1-03**: Fix application completes in < 2 seconds (P1, testable)
- **AC-NFR1-04**: Memory usage < 100MB during monitoring (P2, testable)

---

### NFR-002: Cost Efficiency
- **AC-NFR2-01**: Claude API cost < $0.10 per failure analysis (P1, testable)
- **AC-NFR2-02**: GitHub API calls stay within rate limits (P1, testable)
- **AC-NFR2-03**: Use Haiku for log parsing (3x faster, 20x cheaper) (P1, testable)
- **AC-NFR2-04**: Use Sonnet only for complex root cause analysis (P1, testable)

---

### NFR-003: Reliability
- **AC-NFR3-01**: Service uptime 99%+ (P1, testable)
- **AC-NFR3-02**: Graceful handling of GitHub API failures (P1, testable)
- **AC-NFR3-03**: Graceful handling of Claude API failures (P1, testable)
- **AC-NFR3-04**: State persistence across restarts (P1, testable)

---

### NFR-004: Security
- **AC-NFR4-01**: GitHub tokens are stored securely (encrypted at rest) (P1, testable)
- **AC-NFR4-02**: Sensitive data is redacted from logs before Claude analysis (P1, testable)
- **AC-NFR4-03**: Fix proposals are sandboxed (no execution before approval) (P1, testable)

---

### NFR-005: Usability
- **AC-NFR5-01**: CLI commands follow SpecWeave conventions (P1, testable)
- **AC-NFR5-02**: Error messages are clear and actionable (P2, manual)
- **AC-NFR5-03**: Fix previews are human-readable (P2, manual)

---

## Success Criteria

### Metrics
1. **Fix Success Rate**: >70% of proposed fixes resolve failures
2. **Time to Resolution**: Reduce average failure resolution time by 50%
3. **Cost Efficiency**: <$0.10 per failure analysis
4. **Developer Satisfaction**: >80% satisfaction in user surveys

### KPIs
- Number of failures auto-fixed per week
- Average time from failure to fix proposal
- Percentage of fixes applied automatically vs manually
- Claude analysis cost per failure

---

## Implementation Phases

### Phase 1: Core Monitoring (Week 1-2)
- Implement workflow polling
- Extract failure logs
- Store state locally

### Phase 2: Analysis & Fix Generation (Week 3-4)
- Integrate Claude for root cause analysis
- Generate fix proposals
- Preview fixes in CLI

### Phase 3: Fix Application (Week 5)
- Implement fix application engine
- Add rollback support
- Create git commits

### Phase 4: Intelligence & Learning (Week 6-7)
- Pattern learning system
- Flaky test detection
- Weekly reports

---

## Test Strategy

### Unit Tests (80% coverage target)
- `tests/unit/cicd/workflow-monitor.test.ts` - Polling logic
- `tests/unit/cicd/log-parser.test.ts` - Log extraction
- `tests/unit/cicd/fix-applicator.test.ts` - Fix application
- `tests/unit/cicd/state-manager.test.ts` - State persistence

### Integration Tests (90% coverage target)
- `tests/integration/cicd/github-api.test.ts` - GitHub API integration
- `tests/integration/cicd/claude-analysis.test.ts` - Claude integration
- `tests/integration/cicd/end-to-end.test.ts` - Complete workflow

### E2E Tests (100% critical path coverage)
- Simulate workflow failure
- Verify Claude analysis
- Apply fix
- Verify fix resolves failure

---

## Risk Analysis

### Risk 1: Claude Analysis Quality (Medium)
**Impact**: Poor fixes proposed, wasted developer time
**Mitigation**:
- Use confidence scores
- Require manual approval for low-confidence fixes
- Learn from fix success/failure rates

### Risk 2: GitHub Rate Limiting (Low)
**Impact**: Polling interrupted, delayed failure detection
**Mitigation**:
- Use conditional requests (If-Modified-Since)
- Implement exponential backoff
- Consider webhook approach

### Risk 3: False Positives (Medium)
**Impact**: Incorrect fixes applied, breaking more things
**Mitigation**:
- Always create backups before applying fixes
- Rollback command available
- Verify fixes by re-running workflows

---

## Dependencies

- Existing GitHub integration (ADR-0022, ADR-0026)
- Anthropic API access (existing)
- `octokit` package for GitHub API
- `node-notifier` for desktop notifications

---

## Out of Scope (This Increment)

- Webhook support (future enhancement)
- Multi-repository monitoring (future enhancement)
- Slack/email notifications (future enhancement)
- Machine learning-based failure prediction (future research)
- Integration with other CI/CD platforms (GitLab, CircleCI, etc.)

---

## References

- **Architecture**: See `.specweave/increments/0029-cicd-failure-detection-auto-fix/plan.md`
- **Tasks**: See `.specweave/increments/0029-cicd-failure-detection-auto-fix/tasks.md`
- **ADRs**:
  - ADR-0022: GitHub Sync Architecture
  - ADR-0026: GitHub API Validation
  - ADR-0007: Testing Strategy

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-12 | PM Agent | Initial specification created |

---

**This is a living document** - Will be updated as requirements evolve and implementation proceeds.
