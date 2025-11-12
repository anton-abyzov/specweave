# Increment 0029: Automated CI/CD Failure Detection & Claude Auto-Fix System

**Implements**: SPEC-029 (CI/CD Failure Detection & Claude Auto-Fix)
**Complete Specification**: See `../../docs/internal/specs/default/spec-0029-cicd-failure-detection-auto-fix.md`

---

## Metadata

- **Increment ID**: 0029-cicd-failure-detection-auto-fix
- **Status**: In-Progress
- **Started**: 2025-11-12
- **Priority**: P1 (Critical)
- **Type**: Feature
- **Created**: 2025-11-12
- **Estimated Duration**: 7 weeks (280 hours)
- **Team**: SpecWeave Core Team

---

## Quick Overview

This increment implements an intelligent CI/CD monitoring and auto-fix system that monitors GitHub Actions workflows, detects failures automatically, analyzes error logs using Claude Code, and proposes/applies intelligent fixes.

**Key Capabilities**:
1. Real-time monitoring of GitHub Actions workflows (poll every 60s)
2. Automatic failure detection within 2 minutes
3. AI-powered log analysis using Claude Code (Haiku for parsing, Sonnet for root cause)
4. Intelligent fix proposals with code changes and explanations
5. Automated fix application (with approval) or via PR
6. Pattern learning to improve future failure detection

This builds on existing GitHub integration (ADRs 0022, 0026) and extends it with AI-powered automation.

---

## What We're Implementing (This Increment)

This increment implements **ALL 21 user stories** from SPEC-029 across 7 epics:

### Epic 1: Workflow Monitoring & Failure Detection (US-001 to US-003)
- ✅ **US-001**: Monitor GitHub Actions workflows in real-time (poll every 60s)
- ✅ **US-002**: Detect workflow failures automatically (within 2 minutes)
- ✅ **US-003**: Store failure history for analysis

### Epic 2: Log Retrieval & Pre-Processing (US-004 to US-005)
- ✅ **US-004**: Download workflow logs from GitHub API
- ✅ **US-005**: Parse and extract error messages from logs

### Epic 3: Claude-Powered Root Cause Analysis (US-006 to US-009)
- ✅ **US-006**: Invoke Claude for root cause analysis (Sonnet)
- ✅ **US-007**: Use Haiku for fast log parsing
- ✅ **US-008**: Intelligent model selection based on error complexity
- ✅ **US-009**: Structured RCA reports (5 Whys, impact, severity)

### Epic 4: Fix Generation (US-010 to US-013)
- ✅ **US-010**: Generate code fixes automatically
- ✅ **US-011**: Create explanatory fix proposals
- ✅ **US-012**: Validate fixes don't break existing functionality
- ✅ **US-013**: Support multiple fix strategies (quick patch vs comprehensive refactor)

### Epic 5: Fix Application (US-014 to US-016)
- ✅ **US-014**: Apply fixes directly to codebase (with approval)
- ✅ **US-015**: Create GitHub PRs for complex fixes
- ✅ **US-016**: Automatic rollback on test failures

### Epic 6: Pattern Learning (US-017 to US-019)
- ✅ **US-017**: Track fix success rate by error type
- ✅ **US-018**: Build knowledge base of common failures
- ✅ **US-019**: Improve detection accuracy over time

### Epic 7: User Experience & Operations (US-020 to US-021)
- ✅ **US-020**: CLI commands for monitoring and manual analysis
- ✅ **US-021**: Dashboard showing failure trends and fix success rate

---

## Scope Summary

| Category | Count | Details |
|----------|-------|---------|
| **User Stories** | 21 | All stories from SPEC-029 |
| **Acceptance Criteria** | 97 | Full AC-ID coverage (AC-US1-01 to AC-US21-03) |
| **Implementation Tasks** | 42 | Organized in 6 phases over 7 weeks |
| **Test Cases** | 150+ | Unit + Integration + E2E coverage |
| **ADRs** | 3 | Polling vs Webhooks, Haiku vs Sonnet, Auto-apply vs Manual |
| **Coverage Target** | 85% | Overall (90% for critical paths) |

---

## Technical Architecture

**Core Components**:
1. **CI/CD State Manager** - Track workflow states, prevent duplicate processing
2. **Workflow Monitor** - Poll GitHub Actions API every 60s, detect failures
3. **Log Downloader** - Fetch workflow logs via GitHub API
4. **Log Parser** - Extract error messages, stack traces, relevant context
5. **Claude Analyzer** - Root cause analysis using Sonnet (intelligent, reliable)
6. **Fix Generator** - Generate code fixes with explanations
7. **Fix Applicator** - Apply fixes directly or via PR
8. **Pattern Learner** - Track success rates, build knowledge base

**Tech Stack**:
- TypeScript/Node.js 18+ (async/await)
- GitHub REST API (workflow runs, logs, commits)
- Claude Code API (Haiku for parsing, Sonnet for analysis)
- File-based state (`.specweave/state/cicd-monitor.json`)

**Performance**:
- Detection latency: <2 minutes (60s poll + API call)
- Log parsing: <5 seconds (Haiku model)
- Root cause analysis: <15 seconds (Sonnet model)
- Fix generation: <20 seconds (Sonnet model)

**Cost**:
- Haiku for log parsing: ~$0.25/1M input tokens (cheap, fast)
- Sonnet for analysis: ~$3/1M input tokens (intelligent, worth it)
- Estimated monthly cost: $10-30 (100 failures/month)

---

## Implementation Phases

### Phase 1: Core Monitoring (Week 1-2)
**Tasks**: T-001 to T-012 (12 tasks, 80 hours)
- CI/CD state management
- GitHub Actions polling
- Failure detection
- Basic notifications

### Phase 2: Log Analysis (Week 2-3)
**Tasks**: T-013 to T-019 (7 tasks, 45 hours)
- Log downloading
- Log parsing
- Error extraction
- Context gathering

### Phase 3: Claude Integration (Week 3-4)
**Tasks**: T-020 to T-027 (8 tasks, 55 hours)
- Root cause analysis (Sonnet)
- Log parsing (Haiku)
- Model selection logic
- RCA report generation

### Phase 4: Fix Generation (Week 4-5)
**Tasks**: T-028 to T-033 (6 tasks, 40 hours)
- Code fix generation
- Fix validation
- Multi-strategy fixes
- Explanation generation

### Phase 5: Fix Application (Week 5-6)
**Tasks**: T-034 to T-037 (4 tasks, 30 hours)
- Auto-apply fixes
- GitHub PR creation
- Rollback on failure
- Approval workflow

### Phase 6: Polish & Ops (Week 6-7)
**Tasks**: T-038 to T-042 (5 tasks, 30 hours)
- CLI commands
- Dashboard
- Pattern learning
- Documentation
- E2E testing

---

## Success Criteria

### Functional Requirements (Must Have)
1. ✅ Detect workflow failures within 2 minutes (US-001, US-002)
2. ✅ Generate accurate root cause analysis 80%+ of time (US-006)
3. ✅ Generate working fixes 70%+ of time (US-010, US-012)
4. ✅ Apply fixes automatically with rollback (US-014, US-016)
5. ✅ Support all workflow types: build, test, deploy, DORA (US-003)

### Non-Functional Requirements (Must Have)
1. ✅ Performance: <2min detection, <15s analysis, <20s fix generation
2. ✅ Cost: <$30/month for 100 failures
3. ✅ Reliability: 99%+ uptime for monitoring, graceful degradation on API failures
4. ✅ Security: No secrets in logs, secure API token storage
5. ✅ Usability: CLI commands, dashboard, notifications

### Test Coverage
- Unit tests: 90%+ for core logic
- Integration tests: 85%+ for API interactions
- E2E tests: 100% for critical paths (monitor → detect → analyze → fix → apply)
- Overall: 85%+ coverage

---

## Out of Scope (For This Increment)

**Nothing deferred!** This increment implements all 21 user stories in one comprehensive release.

**Future Enhancements** (Post-1.0):
- Multi-repository monitoring (currently single repo)
- Slack/Teams notifications (currently CLI only)
- Custom workflow templates
- AI model fine-tuning on project-specific failures
- Advanced pattern recognition (ML-based clustering)

---

## External References

- **Living Spec**: `../../docs/internal/specs/default/spec-0029-cicd-failure-detection-auto-fix.md`
- **Architecture Plan**: `plan.md` (ADRs, system design, Mermaid diagrams)
- **Implementation Tasks**: `tasks.md` (42 tasks with embedded tests, BDD format)
- **GitHub Project**: TBD (create after increment planning complete)
- **Related ADRs**:
  - ADR-0022: GitHub Sync Architecture
  - ADR-0026: GitHub Validation
  - ADR-0031: Polling vs Webhooks (NEW)
  - ADR-0032: Haiku vs Sonnet for Log Parsing (NEW)
  - ADR-0033: Auto-Apply vs Manual Review (NEW)

---

## Dependencies & Blockers

**Dependencies**:
- ✅ GitHub REST API access (already have token)
- ✅ Claude Code API access (already integrated)
- ✅ Existing GitHub integration (ADRs 0022, 0026)

**No Blockers**: All prerequisites are met, ready to start implementation!

---

## Team & Approvals

**Team**:
- **PM**: SpecWeave Core Team
- **Architect**: SpecWeave Core Team
- **Developers**: TBD (implement tasks T-001 to T-042)
- **QA**: TBD (validate test coverage ≥85%)

**Approvals**:
- ✅ PM Approval: 2025-11-12 (user requested this increment)
- ✅ Architect Approval: 2025-11-12 (plan.md created)
- ⏳ QA Approval: Pending (after implementation)

---

## Notes

**Why This Increment Matters**:
- Addresses real pain point: GitHub Actions failures require manual investigation
- Saves 30-60 minutes per failure (manual debugging → automatic fix)
- Improves DORA metrics: Reduces MTTR (Mean Time To Recovery)
- Demonstrates SpecWeave's AI-powered automation capabilities

**Implementation Strategy**:
- TDD workflow (tests first, then implementation)
- Incremental deployment (Phase 1 → Phase 2 → ... → Phase 6)
- Continuous validation (run tests after each task)
- Regular reviews (every 2 phases)

**Cost-Benefit Analysis**:
- Development cost: 280 hours (~7 weeks)
- Monthly operational cost: $10-30 (Claude API)
- Time saved: 30-60 min per failure × 100 failures/month = 50-100 hours/month
- **ROI**: Positive within 1 month!

---

**Last Updated**: 2025-11-12
**Status**: Ready for implementation - Start with T-001!
