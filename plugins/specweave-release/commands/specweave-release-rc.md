---
name: specweave-release:rc
description: Manage Release Candidate (RC) lifecycle including creation, testing, validation, and promotion to production. Handles RC iteration (rc.1, rc.2, rc.3), tracks testing status, coordinates RC across multiple repositories, manages canary deployments, and promotes RC to final release when validation passes.
---

# /specweave-release:rc - Manage Release Candidates

Manage the complete Release Candidate (RC) lifecycle from creation to production promotion.

## What This Command Does

**RC Creation**:
- Creates pre-release tags (v1.0.0-rc.1)
- Deploys to staging environment
- Initializes RC testing checklist

**RC Testing**:
- Tracks validation status
- Runs automated tests
- Manages manual testing
- Documents issues found

**RC Iteration**:
- Fixes bugs → creates rc.2, rc.3, ...
- Never modifies existing RC tags (immutable)
- Maintains iteration history

**RC Promotion**:
- Validates all checks passed
- Promotes to production release (v1.0.0)
- Gradual rollout (canary → 100%)
- Updates living docs

## Usage

```bash
# Create new RC
/specweave-release:rc create <version>
/specweave-release:rc create 1.0.0

# Create RC iteration (bug fixes)
/specweave-release:rc iterate <rc-version>
/specweave-release:rc iterate 1.0.0-rc.2

# Show RC status
/specweave-release:rc status <rc-version>
/specweave-release:rc status 1.0.0-rc.3

# Run RC validation tests
/specweave-release:rc test <rc-version>
/specweave-release:rc test 1.0.0-rc.3

# Promote RC to production
/specweave-release:rc promote <rc-version>
/specweave-release:rc promote 1.0.0-rc.3

# Rollback failed RC
/specweave-release:rc rollback <rc-version>
/specweave-release:rc rollback 1.0.0-rc.2

# Multi-repo RC (creates RC for all repos)
/specweave-release:rc create-multi <product-version>
/specweave-release:rc create-multi product-v3.0.0
```

## Workflow: Single-Repo RC

### Step 1: Create Initial RC

```bash
/specweave-release:rc create 1.0.0
```

```markdown
Creating Release Candidate for v1.0.0...

Step 1: Analyzing changes since v0.9.0
  - Commits: 45
  - Breaking changes: 2
  - Features: 8
  - Bug fixes: 12
  → Major version bump confirmed ✓

Step 2: Creating RC tag
  ✓ Tagged: v1.0.0-rc.1
  ✓ Pushed to origin

Step 3: Triggering CI/CD
  ✓ GitHub Actions workflow started
  ✓ Build: #542 (running)
  ✓ Estimated time: 15 minutes

Step 4: Creating RC tracking document
  ✓ Created: .specweave/increments/0090-v1-release/reports/RC-STATUS-v1.0.0-rc.1.md

RC created successfully! ✓

Next steps:
  1. Wait for CI/CD to complete
  2. Deploy to staging: (automated via CI/CD)
  3. Run validation: /specweave-release:rc test 1.0.0-rc.1
  4. Review status: /specweave-release:rc status 1.0.0-rc.1
  5. If issues: Fix and iterate to rc.2
  6. If pass: Promote to v1.0.0

Monitor build: https://github.com/myorg/myapp/actions/runs/542
```

### Step 2: Monitor RC Testing

```bash
/specweave-release:rc status 1.0.0-rc.1
```

```markdown
# RC Status: v1.0.0-rc.1

## Timeline
- Created: 2025-01-15 10:00 UTC
- Deployed to staging: 2025-01-15 10:15 UTC
- Testing phase: In progress (Day 2 of 7)

## Build Status
- CI/CD: ✓ Passed (Build #542)
- Build time: 14m 23s
- Artifacts: Published

## Deployment Status
- Staging: ✓ Deployed (10:15 UTC)
- Pods: 3/3 healthy
- Health check: ✓ Passing

## Testing Progress

### Automated Tests
- [x] Unit tests: 2,345 tests passed
- [x] Integration tests: 456 tests passed
- [x] E2E tests: 123 tests passed
- [x] Performance tests: p95 latency 185ms ✓ (<200ms target)
- [x] Load tests: 12K req/s sustained ✓ (10K target)
- [x] Security scan: No critical/high vulnerabilities ✓

### Manual Testing
- [x] Smoke tests: All critical paths working
- [ ] Exploratory testing: In progress (QA team)
- [x] Cross-browser testing: Chrome ✓, Firefox ✓, Safari ✓
- [ ] Mobile testing: iOS (pending), Android (pending)

### Performance Benchmarks
- API latency p50: 45ms (baseline: 42ms) ✓
- API latency p95: 185ms (baseline: 180ms) ✓
- API latency p99: 320ms (baseline: 310ms) ✓
- Database queries: 1.2ms avg (baseline: 1.1ms) ✓
- Memory usage: 512MB (baseline: 500MB) ✓

## Issues Found
None yet ✓

## Next Actions
- [ ] Complete mobile testing (iOS, Android)
- [ ] Exploratory testing (2 days remaining)
- [ ] Stakeholder approval
- [ ] Promote to canary (5% traffic)

## Decision
Status: NOT READY (testing in progress)
Blocking: Mobile testing, exploratory testing incomplete
```

### Step 3: Found Bug → Iterate to rc.2

```bash
/specweave-release:rc iterate 1.0.0-rc.1
```

```markdown
Iterating Release Candidate v1.0.0-rc.1...

Issues found in rc.1:
  1. Authentication fails for SSO users
     - Impact: Critical (blocks SSO users from logging in)
     - Fix: Add SSO provider check in auth flow
     - Commit: abc123

Please fix the issue and commit changes.

? Ready to create rc.2? [Yes / No]

[User fixes bug and confirms]

Creating rc.2...

Step 1: Creating new RC tag
  ✓ Tagged: v1.0.0-rc.2
  ✓ Pushed to origin

Step 2: Triggering CI/CD
  ✓ GitHub Actions workflow started (Build #548)

Step 3: Updating RC tracking
  ✓ Updated: RC-STATUS-v1.0.0.md
  ✓ Added iteration history: rc.1 → rc.2

RC iteration complete! ✓

The testing process restarts for rc.2.
Monitor: https://github.com/myorg/myapp/actions/runs/548
```

### Step 4: All Tests Pass → Promote to Production

```bash
/specweave-release:rc promote 1.0.0-rc.3
```

```markdown
Promoting Release Candidate v1.0.0-rc.3 to production...

Step 1: Pre-promotion validation
  ✓ All automated tests passing
  ✓ Manual testing complete
  ✓ No blocking issues
  ✓ Stakeholder approval received
  ✓ Release notes drafted

Step 2: Creating production tag
  ✓ Tagged: v1.0.0
  ✓ Pushed to origin

Step 3: Deployment strategy
  Plan: Gradual rollout
  - Canary: 5% traffic (1 hour)
  - Wave 1: 10% traffic (1 hour)
  - Wave 2: 25% traffic (2 hours)
  - Wave 3: 50% traffic (4 hours)
  - Wave 4: 100% traffic (8 hours)

  Total duration: ~16 hours

Step 4: Starting canary deployment
  ✓ Deployed v1.0.0 to canary namespace
  ✓ Traffic: 5% routed to canary
  ✓ Monitoring: Active

  Metrics to watch:
  - Error rate (target: <1%)
  - Latency p95 (target: <200ms)
  - Throughput (target: >10K req/s)

  Next check: In 1 hour (11:00 UTC)

Canary deployment started! ✓

I'll monitor the metrics and notify you when ready for next wave.

Monitor dashboard: https://grafana.example.com/d/prod-release
Rollback command: /specweave-release:rc rollback 1.0.0-rc.3
```

## Workflow: Multi-Repo RC

### Create Coordinated RC

```bash
/specweave-release:rc create-multi product-v3.0.0
```

```markdown
Creating coordinated Release Candidate for Product v3.0.0...

Step 1: Analyzing repositories
  Detected: 4 repos (frontend, backend, api-gateway, shared-lib)

Step 2: Analyzing changes per repo
  frontend (v4.2.0 → v5.0.0):
    - Breaking: React 18 upgrade
    - RC: v5.0.0-rc.1

  backend (v2.8.0 → v3.0.0):
    - Breaking: Remove legacy API
    - RC: v3.0.0-rc.1

  api-gateway (v3.1.0 → v4.0.0):
    - Breaking: Remove /v2 endpoints
    - RC: v4.0.0-rc.1

  shared-lib (v1.5.0 → v1.5.1):
    - Patch: Bug fixes only
    - RC: v1.5.1-rc.1

Step 3: Creating RC tags for all repos
  ✓ frontend: v5.0.0-rc.1
  ✓ backend: v3.0.0-rc.1
  ✓ api-gateway: v4.0.0-rc.1
  ✓ shared-lib: v1.5.1-rc.1

Step 4: Triggering coordinated CI/CD
  ✓ All workflows started
  ✓ Estimated time: ~20 minutes

Step 5: Creating coordinated RC tracking
  ✓ Created: .specweave/increments/0095-product-v3-release/reports/RC-STATUS-product-v3.0.0-rc.1.md

Multi-repo RC created! ✓

Next steps:
  1. Wait for all builds to complete
  2. Deploy to staging (coordinated)
  3. Run cross-service E2E tests
  4. Validate: /specweave-release:rc status product-v3.0.0-rc.1
  5. Iterate if needed: Fix issues → rc.2
  6. Promote: /specweave-release:rc promote product-v3.0.0-rc.3
```

## RC Testing Checklist

**Automatically created for each RC**:

```markdown
# RC Validation Checklist: v1.0.0-rc.3

## Automated Tests
- [x] Unit tests: 2,345 tests (100% pass)
- [x] Integration tests: 456 tests (100% pass)
- [x] E2E tests: 123 tests (100% pass)
- [x] Performance tests: All benchmarks met
- [x] Load tests: 10K req/s sustained
- [x] Security scan: No critical/high issues

## Manual Tests
- [x] Smoke tests: All critical paths work
- [x] Exploratory testing: No major issues
- [x] Cross-browser: Chrome, Firefox, Safari
- [x] Mobile: iOS, Android

## Infrastructure
- [x] Database migrations: Tested (forward + rollback)
- [x] Canary deployment: 5% traffic, 24 hours
- [x] No error rate increase
- [x] No performance degradation
- [x] Rollback plan validated

## Documentation
- [x] CHANGELOG.md updated
- [x] API documentation updated
- [x] Migration guide (breaking changes)
- [x] Release notes drafted

## Approvals
- [x] Product Manager: @jane ✓
- [x] Engineering Lead: @john ✓
- [x] Security Team: @alice ✓
- [x] QA Lead: @bob ✓

## Monitoring
- [x] Alerts configured
- [x] Dashboards updated
- [x] On-call schedule confirmed

## Final Decision
Status: APPROVED ✅
Ready for production: Yes
Promote to: v1.0.0
Scheduled: 2025-01-16 10:00 UTC
```

## RC Rollback

**If issues detected during canary**:

```bash
/specweave-release:rc rollback 1.0.0-rc.3
```

```markdown
Rolling back v1.0.0-rc.3...

Reason: Error rate increased to 8% in canary

Step 1: Stopping new traffic to canary
  ✓ Kubernetes: kubectl rollout pause

Step 2: Routing traffic back to previous version
  ✓ 100% traffic → v0.9.0 (previous stable)
  ✓ 0% traffic → v1.0.0-rc.3 (canary)

Step 3: Verifying rollback
  ✓ Error rate back to 0.5% (normal)
  ✓ Latency back to baseline
  ✓ All health checks passing

Step 4: Documenting rollback
  ✓ Updated: RC-STATUS-v1.0.0.md
  ✓ Incident logged: INC-456

Step 5: Root cause analysis
  Issue: Database connection pool exhausted
  Fix required: Increase pool size + add connection retry logic

Rollback complete! ✓

Next steps:
  1. Fix identified issue
  2. Create rc.4 with fix
  3. Re-test in staging
  4. Retry canary deployment
```

## RC Status Tracking

**Creates detailed status document**:

```
.specweave/increments/0090-v1-release/reports/RC-STATUS-v1.0.0.md
```

**Tracks**:
- RC iteration history (rc.1, rc.2, rc.3, ...)
- Testing status per iteration
- Issues found and fixes applied
- Deployment history
- Promotion decision

## Integration with SpecWeave

**RC Command Integration**:

```bash
# 1. Create release increment
/specweave:increment "0090-v1-0-0-release"

# 2. Create RC
/specweave-release:rc create 1.0.0
# → Creates v1.0.0-rc.1

# 3. Testing phase
/specweave-release:rc test 1.0.0-rc.1
# → Runs automated tests

# 4. Iterate if needed
/specweave-release:rc iterate 1.0.0-rc.1
# → Creates v1.0.0-rc.2

# 5. Promote when ready
/specweave-release:rc promote 1.0.0-rc.3
# → Creates v1.0.0, deploys to production

# 6. Mark increment complete
/specweave:done 0090
# → Updates living docs
```

## Best Practices

**RC Creation**:
- Always start with rc.1
- Never modify existing RC tags
- Create new iteration for fixes

**RC Testing**:
- Run ALL tests for each iteration
- Never skip validation steps
- Use production-like staging data

**RC Promotion**:
- Gradual rollout (canary → waves)
- Monitor 1+ hour at each stage
- Have rollback plan ready

**RC Documentation**:
- Track all iterations
- Document bugs and fixes
- Record promotion rationale

## Related Commands

- `/specweave-release:init` - Initialize release strategy
- `/specweave-release:align` - Align versions before RC
- `/specweave-release:coordinate` - Coordinate multi-repo RC
- `/specweave:done` - Complete release increment

## Dependencies

**Required**:
- Git (version control)
- Release strategy document

**Optional**:
- Kubernetes (`kubectl`) - Deployment management
- Docker (`docker`) - Container testing
- GitHub CLI (`gh`) - Release notes

---

**Use this command** to safely validate changes before production release through comprehensive RC testing and gradual rollout.
