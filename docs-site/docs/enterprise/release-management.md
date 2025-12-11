---
id: release-management
title: Enterprise Release Management & Versioning
sidebar_label: Release Management
sidebar_position: 5
---

# Enterprise Release Management & Versioning

:::tip Critical for Enterprises
Release management is the difference between chaos and control. This guide shows how SpecWeave tracks releases across environments, manages versioning, coordinates cross-team dependencies, and ensures compliance.
:::

---

## 🎯 Why Release Management Matters

### The Enterprise Reality

**Small Startups** (1-5 devs):
- Deploy to prod 10x/day
- No formal releases
- "Main branch is always deployable"

**Enterprises** (50-500+ devs):
- Deploy to prod 1x/week or 1x/month
- Formal release process (CAB, change windows, approvals)
- Coordinated across 5-15 teams
- Regulatory compliance (SOX, [HIPAA](/docs/glossary/terms/hipaa), PCI-DSS)
- Customer SLAs (99.9% uptime, scheduled maintenance)

**SpecWeave's Role**: Track increments → releases → deployments with full audit trail.

---

## 🏗️ Release Models

### Model 1: Sprint-Based Releases (Most Common)

**Cadence**: Every 2 weeks (sprint)

```
Sprint 24 (Nov 13 - Nov 27, 2025)
├── Increments: 0018, 0019, 0020, 0021
├── Release: v1.24.0
├── Deploy to: Dev (Nov 13) → QA (Nov 15) → Staging (Nov 18) → UAT (Nov 20) → Prod (Nov 27)
└── Stakeholders: Product team demos on Nov 26 (sprint review)
```

**SpecWeave Integration**:

```bash
# 1. Plan sprint
/sw:sprint create 24 --start "2025-11-13" --end "2025-11-27"

# 2. Link increments to sprint
/sw:sprint link 24 --increments 0018,0019,0020,0021

# 3. Track progress during sprint
/sw:sprint status 24

# Output:
📊 Sprint 24 Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dates: Nov 13 - Nov 27, 2025 (14 days)
Days Remaining: 8 days

Increments:
  ✅ 0018: OAuth Integration (100%, deployed to Staging)
  🔄 0019: User Profile Page (75%, in QA)
  🔄 0020: Email Notifications (50%, in Dev)
  ⏸️  0021: Admin Dashboard (10%, planning)

Overall Progress: 59% (47/80 tasks completed)
Velocity: On track (38 story points, target: 40)

Blockers:
  ⚠️ 0019: Waiting for design approval (jane.smith@company.com)
  ⚠️ 0020: SMTP server not configured in QA

Next Actions:
  1. Unblock 0019 (chase jane.smith)
  2. Configure SMTP in QA (DevOps team)
  3. Complete 0020 by Nov 20 (3 days)
  4. Reduce scope on 0021 OR roll to Sprint 25

# 4. Create release at sprint end
/sw:release create v1.24.0 --sprint 24

# 5. Deploy release to prod
/sw:release deploy v1.24.0 --environment prod
```

---

### Model 2: Time-Based Releases (Monthly/Quarterly)

**Cadence**: Every month (or quarter)

```
November 2025 Release
├── Sprints: Sprint 24, Sprint 25
├── Increments: 0018, 0019, 0020, 0021, 0022, 0023, 0024, 0025
├── Release: v1.11.0 (November release)
├── Deploy to: Prod (Nov 30, 2025)
└── Includes: 8 features, 15 bug fixes, 3 performance improvements
```

**SpecWeave Integration**:

```bash
# 1. Plan monthly release
/sw:release plan v1.11.0 --month November --year 2025

# 2. Track increments throughout month
/sw:release status v1.11.0

# Output:
📦 Release v1.11.0 Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target Date: Nov 30, 2025 (17 days away)

Features (8):
  ✅ 0018: OAuth Integration
  ✅ 0019: User Profile Page
  ✅ 0020: Email Notifications
  🔄 0021: Admin Dashboard (80%)
  🔄 0022: Dark Mode (60%)
  🔄 0023: Export Reports (40%)
  ⏸️ 0024: Advanced Search (20%)
  ⏸️ 0025: API Rate Limiting (10%)

Bug Fixes (15):
  ✅ 12 completed
  🔄 2 in progress
  ⏸️ 1 not started

Performance (3):
  ✅ Database indexing
  ✅ API response caching
  🔄 Frontend bundle size reduction (85%)

Release Readiness: 72% (58/80 increments completed)
Risk: MEDIUM (2 features may not complete)

Recommendations:
  ⚠️ Cut 0024, 0025 from release (roll to December)
  ✓ Focus on completing 0021, 0022, 0023
  ✓ Allocate extra QA time for 0022 (high complexity)

# 3. Finalize release scope (cut features if needed)
/sw:release scope v1.11.0 --cut 0024,0025

# 4. Deploy to prod
/sw:release deploy v1.11.0 --environment prod --date "2025-11-30 18:00:00 UTC"
```

---

### Model 3: Feature-Based Releases (Continuous)

**Cadence**: Whenever feature is ready (1-5x/week)

```
Week of Nov 13-19, 2025
├── Monday: Release v1.23.1 (Increment 0018: OAuth)
├── Wednesday: Release v1.23.2 (Increment 0019: User Profile)
└── Friday: Release v1.23.3 (Increment 0020: Email Notifications)
```

**SpecWeave Integration**:

```bash
# 1. Complete increment
/sw:done 0018

# 2. Create release immediately
/sw:release create v1.23.1 --increments 0018 --deploy-now

# Result:
✅ Release v1.23.1 created
   Increments: 0018
   Deployed to: Dev → QA → Staging → Prod (all green!)
   Duration: 2 hours (fast-track)
   Status: ✅ LIVE
```

---

## 📋 Semantic Versioning for Enterprises

### Version Format: MAJOR.MINOR.PATCH

```
v1.24.3
 │  │  │
 │  │  └─ PATCH: Bug fixes, hotfixes (backward compatible)
 │  └──── MINOR: New features (backward compatible)
 └─────── MAJOR: Breaking changes (NOT backward compatible)
```

### Examples

```
v1.23.0 → v1.24.0  (New sprint, new features)
v1.24.0 → v1.24.1  (Hotfix: Fix login bug)
v1.24.1 → v1.24.2  (Hotfix: Fix performance regression)
v1.24.2 → v1.25.0  (New sprint, new features)
v1.25.0 → v2.0.0   (MAJOR: API v2, breaking changes)
```

### SpecWeave Auto-Versioning

```bash
# Increment PATCH version (bug fix)
/sw:release bump patch

# Increment MINOR version (new feature)
/sw:release bump minor

# Increment MAJOR version (breaking change)
/sw:release bump major

# Auto-detect based on increments
/sw:release bump auto

# Auto-detect logic:
# - If any increment has "breaking: true" → MAJOR
# - If any increment has type "feature" → MINOR
# - If all increments are type "hotfix" or "bug" → PATCH
```

---

## 🔄 Release Lifecycle

### Phase 1: Planning (Week 1 of Sprint)

```bash
# 1. Create release
/sw:release create v1.24.0 --sprint 24

# 2. Add increments to release
/sw:release add-increment v1.24.0 0018
/sw:release add-increment v1.24.0 0019
/sw:release add-increment v1.24.0 0020

# 3. Review dependencies
/sw:release dependencies v1.24.0

# Output:
🔗 Release v1.24.0 Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increments:
  0018: OAuth Integration
    ├─ Depends on: Database migration (0017)
    ├─ Blocks: User profile page (0019)
    └─ External: OAuth provider approval (in progress)

  0019: User Profile Page
    ├─ Depends on: OAuth Integration (0018)
    ├─ Blocks: Email notifications (0020)
    └─ External: Design system v2.0 (not ready!)

  0020: Email Notifications
    ├─ Depends on: User profile page (0019)
    ├─ External: SMTP server (not configured in QA!)

⚠️ BLOCKERS:
  1. Design system v2.0 not ready (ETA: Nov 18)
     Impact: 0019 cannot start
     Action: Escalate to design team

  2. SMTP server not configured in QA
     Impact: 0020 cannot be tested
     Action: Ticket to DevOps team

Recommendations:
  ⚠️ Risk: 2 blockers may delay release
  ✓ Option 1: Resolve blockers by Nov 15
  ✓ Option 2: Cut 0019, 0020 from release
```

---

### Phase 2: Development (Week 1-2 of Sprint)

```bash
# Track progress daily
/sw:release status v1.24.0 --daily

# Output (Day 3):
📊 Release v1.24.0 Status (Day 3/14)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 35% (28/80 tasks completed)
Burn Rate: 9.3 tasks/day (target: 5.7 tasks/day) ✅ AHEAD!

Increments:
  ✅ 0018: OAuth Integration (100%, ready for QA)
  🔄 0019: User Profile Page (45%, in dev)
  🔄 0020: Email Notifications (10%, blocked)

Blockers Resolved:
  ✅ Design system v2.0 ready (Nov 14)
  🔄 SMTP server in QA (ETA: Nov 15)

Risks:
  ⚠️ 0020 still blocked (1 day delay)
  ✓ Burn rate ahead of schedule (buffer available)

Forecast: ✅ ON TRACK for Nov 27 release
```

---

### Phase 3: QA & Staging (Week 2 of Sprint)

```bash
# Promote release to QA
/sw:release promote v1.24.0 --to qa

# Run QA tests
/sw:release test v1.24.0 --environment qa

# Output:
🧪 Release v1.24.0 QA Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Suites:
  ✅ Unit Tests: 1,234/1,234 passed (100%)
  ✅ Integration Tests: 456/456 passed (100%)
  ✅ E2E Tests: 89/92 passed (96.7%)
      ❌ Test: User can reset password
         Error: Email not sent (SMTP issue)
      ❌ Test: User can export profile
         Error: Export button missing
      ❌ Test: Admin can view analytics
         Error: Chart library not loaded

  ✅ Performance Tests:
      Load: 1,000 req/s sustained (pass)
      Latency: p95=120ms (pass, target: <150ms)
      Memory: 1.2GB peak (pass, target: <2GB)

  ✅ Security Tests:
      OWASP Top 10: All passed
      Penetration Test: No critical vulnerabilities
      Dependency Scan: 2 medium-severity issues (acceptable)

Overall: ⚠️ 3 E2E tests failed

Next Actions:
  1. Fix SMTP issue (DevOps team)
  2. Fix export button bug (Frontend team)
  3. Fix chart library loading (Frontend team)
  4. Re-run E2E tests (ETA: Nov 20)
```

---

### Phase 4: UAT & Approval (Week 2 of Sprint)

```bash
# Promote to UAT
/sw:release promote v1.24.0 --to uat

# Request stakeholder approval
/sw:release request-approval v1.24.0 \
  --approvers jane.smith@company.com,john.doe@company.com

# Track approval status
/sw:release approval-status v1.24.0

# Output:
✅ Release v1.24.0 Approval Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Approvers:
  ✅ jane.smith@company.com (Product Manager)
     Approved: Nov 23, 2025 10:30 AM
     Notes: "Looks good, tested with 5 users"

  🔄 john.doe@company.com (Tech Lead)
     Status: Pending
     Requested: Nov 23, 2025 9:00 AM
     Last Reminder: Nov 23, 2025 2:00 PM

Approval Progress: 50% (1/2 approved)

Next Actions:
  ⏰ Remind john.doe@company.com (3rd reminder)
  ⏰ Escalate if not approved by Nov 24 5:00 PM
```

---

### Phase 5: Production Deployment

```bash
# Create change request (if required)
/sw:release change-request v1.24.0 \
  --title "Deploy Release v1.24.0" \
  --description "OAuth integration, user profiles, email notifications" \
  --change-window "2025-11-27 18:00-20:00 UTC" \
  --risk "Low" \
  --rollback-plan "Revert to v1.23.0 (blue-green swap)"

# Deploy to production
/sw:release deploy v1.24.0 \
  --environment prod \
  --change-request CHG-2024-11-001 \
  --health-check \
  --monitor-duration 30m

# Output:
🚀 Deploying Release v1.24.0 to Production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Change Request: CHG-2024-11-001
Change Window: Nov 27, 2025 18:00-20:00 UTC
Deployment Method: Blue-Green (zero downtime)

Pre-Deployment Checks:
  ✅ All tests passed
  ✅ All approvals received
  ✅ Change window active
  ✅ Rollback plan documented
  ✅ On-call engineers notified

Deployment Steps:
  ✅ 1. Deploy to green slot (18:05 UTC)
  ✅ 2. Health check green slot (18:10 UTC)
  ✅ 3. Run smoke tests (18:15 UTC)
  ✅ 4. Swap slots (blue ← green) (18:20 UTC)
  🔄 5. Monitor metrics (18:20-18:50 UTC)

Metrics (15 minutes post-deployment):
  Traffic: 5,234 req/s (normal)
  Errors: 0.01% (0.5 errors/min) ✅ NORMAL
  Latency: p50=45ms, p95=120ms ✅ NORMAL
  CPU: 35.2% ✅ NORMAL
  Memory: 62.8% ✅ NORMAL

Status: ✅ DEPLOYMENT SUCCESSFUL

Release Notes:
  https://myapp.com/releases/v1.24.0

Communication:
  ✅ Email sent to all users
  ✅ Status page updated
  ✅ Slack announcement posted
```

---

## 📊 Release Metrics & Reporting

### Command: Release Dashboard

```bash
/sw:release dashboard --period last-quarter

# Output:
📊 Release Dashboard (Q4 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Releases Deployed: 12 releases
  ✅ Successful: 11 (92%)
  ❌ Failed: 1 (8%) - v1.22.0 (rolled back)

Average Lead Time: 12.3 days
  Planning: 3.5 days
  Development: 6.2 days
  QA/Staging: 1.8 days
  UAT Approval: 0.8 days

Deployment Frequency: 0.9 deploys/week
  Target: 1 deploy/week
  Status: ⚠️ SLIGHTLY BELOW TARGET

Change Failure Rate: 8.3% (1/12)
  Target: <15%
  Status: ✅ WITHIN TARGET

Time to Restore Service: 1.2 hours (avg)
  Target: <4 hours
  Status: ✅ EXCELLENT

DORA Classification: HIGH PERFORMER

Release Size:
  Avg Increments per Release: 3.8
  Avg Story Points per Release: 42
  Avg Tasks per Release: 67

Top Contributors:
  1. john.doe@company.com: 45 increments
  2. jane.smith@company.com: 38 increments
  3. bob.wilson@company.com: 32 increments

Top Blockers:
  1. Design approvals: 8 delays (avg 2.3 days each)
  2. QA environment issues: 5 delays (avg 1.5 days each)
  3. Dependency on external teams: 3 delays (avg 4.2 days each)

Recommendations:
  1. Streamline design approval process
  2. Invest in QA environment stability
  3. Schedule cross-team planning sessions
```

---

## 🔒 Compliance & Audit Trails

### SOX Compliance Example

```bash
# Generate SOX audit report
/sw:release audit v1.24.0 --compliance sox

# Output:
📋 SOX Compliance Audit Report: Release v1.24.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Release ID: v1.24.0
Deploy Date: Nov 27, 2025 18:20:00 UTC
Environment: Production

1. SEGREGATION OF DUTIES:
   ✅ Developer: john.doe@company.com
   ✅ Reviewer: jane.smith@company.com
   ✅ Deployer: ops-team@company.com
   ✅ No overlap detected

2. CHANGE MANAGEMENT:
   ✅ Change Request: CHG-2024-11-001
   ✅ Approved By: CAB (Change Advisory Board)
   ✅ Approved At: Nov 26, 2025 15:00 UTC
   ✅ Change Window: Nov 27, 2025 18:00-20:00 UTC

3. TESTING EVIDENCE:
   ✅ Unit Tests: 1,234/1,234 passed
   ✅ Integration Tests: 456/456 passed
   ✅ E2E Tests: 92/92 passed
   ✅ UAT Approval: jane.smith@company.com (Nov 23, 2025)

4. ROLLBACK CAPABILITY:
   ✅ Rollback Plan: Documented
   ✅ Rollback Tested: Nov 26, 2025 (successful)
   ✅ Rollback Time: <5 minutes (blue-green swap)

5. ACCESS CONTROLS:
   ✅ Production Access: Restricted to ops-team
   ✅ Deployment: Automated (no manual SSH)
   ✅ Approval Chain: Product Manager → Tech Lead → CAB

6. AUDIT TRAIL:
   ✅ Git Commits: 47 commits (all reviewed)
   ✅ Code Reviews: 12 pull requests (all approved)
   ✅ Issue Tracking: GitHub Issues #123, #456, #789
   ✅ Deployment Logs: CloudWatch (retained 7 years)

COMPLIANCE STATUS: ✅ PASSED

Report Exported: /reports/sox-audit-v1.24.0.pdf
Report Hash: sha256:a1b2c3d4e5f6...
```

---

## 📚 Related Guides

- [GitHub Migration Guide](./github-migration.md)
- [JIRA Migration Guide](./jira-migration.md)
- [Azure DevOps Migration Guide](./azure-devops-migration.md)
- [Multi-Environment Deployment Strategy](./multi-environment-deployment.md)
- [CI/CD Integration Guide](./cicd-integration.md)

---

## 🆘 Getting Help

- **Documentation**: https://spec-weave.com
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Enterprise Support**: enterprise@spec-weave.com
