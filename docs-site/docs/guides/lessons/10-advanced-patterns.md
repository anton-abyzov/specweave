---
sidebar_position: 11
title: "Lesson 10: Advanced Patterns"
description: "Master advanced SpecWeave workflows and patterns"
---

# Lesson 10: Advanced Patterns

**Duration**: 45 minutes
**Prerequisites**: Lessons 1-9 completed
**Outcome**: Master advanced workflows for complex projects

---

## Pattern 1: Parallel Increment Development

### When to Use

- Large team (3+ developers)
- Independent features
- Tight deadline

### Setup

```
Developer A: 0001-authentication
Developer B: 0002-payment-processing
Developer C: 0003-notification-system
```

### Coordination

```bash
# Each developer works independently
/specweave:do  # In their increment

# Shared WIP visualization
/specweave:status --all

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEAM WIP STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0001-authentication (Dev A)    ████████░░░░  65%
0002-payment-processing (Dev B) ██████░░░░░░  50%
0003-notification-system (Dev C) ████░░░░░░░░  35%

Total WIP: 3/5 (2 slots available)
```

### Merge Strategy

```bash
# When increment completes
/specweave:done 0001

# Sync to shared living docs
/specweave:sync-docs

# Other developers pull updates
git pull
/specweave:sync-progress --from-external
```

---

## Pattern 2: Feature Flags Integration

### Incremental Rollout

```markdown
<!-- spec.md -->

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `FF_NEW_AUTH` | false | Enable new auth flow |
| `FF_NEW_AUTH_ADMIN` | false | Admin-only preview |

## Rollout Plan

1. Week 1: Internal testing (FF_NEW_AUTH_ADMIN=true)
2. Week 2: 10% users (FF_NEW_AUTH=10%)
3. Week 3: 50% users (FF_NEW_AUTH=50%)
4. Week 4: 100% (remove flag)
```

### Tasks with Flags

```markdown
### T-001: Implement auth behind flag
**Status**: [x] completed
**Flag**: FF_NEW_AUTH

### T-002: Add admin preview
**Status**: [x] completed
**Flag**: FF_NEW_AUTH_ADMIN
```

---

## Pattern 3: Microservices Coordination

### Multi-Repo Increments

```
my-app/
├── frontend/        → 0001-fe-user-auth
├── backend-auth/    → 0001-be-auth-service
├── backend-api/     → 0001-be-api-gateway
└── infrastructure/  → 0001-infra-auth
```

### Dependency Chain

```yaml
# spec.md for frontend increment
---
increment: 0001-fe-user-auth
dependencies:
  - repo: backend-auth
    increment: 0001-be-auth-service
    status: must-complete-first
  - repo: backend-api
    increment: 0001-be-api-gateway
    status: parallel
---
```

### Orchestration

```bash
# Start infrastructure first
cd infrastructure && /specweave:do

# Then backend (parallel)
cd backend-auth && /specweave:do &
cd backend-api && /specweave:do &

# Finally frontend (waits for deps)
cd frontend && /specweave:do
```

---

## Pattern 4: Hotfix Workflow

### Emergency Response

```bash
# 1. Create hotfix increment (bypasses WIP)
/specweave:increment "Critical: Fix CVE-2025-1234" --type hotfix

# 2. Auto-generates minimal structure
spec.md → Security issue description
tasks.md → Fix + test + deploy

# 3. Execute immediately
/specweave:do

# 4. Deploy with fast-track
/specweave:done 0001 --expedite
```

### Hotfix Template

```markdown
<!-- spec.md for hotfix -->
---
increment: 0050-hotfix-cve-2025
type: hotfix
priority: critical
bypass_gates: [docs]  # Skip doc gate for speed
---

# Hotfix: CVE-2025-1234

## Issue
SQL injection in search endpoint

## Impact
All users potentially affected

## Fix
Parameterize query in SearchService.ts

## Verification
- [ ] Exploit no longer works
- [ ] Existing tests pass
- [ ] No regression
```

---

## Pattern 5: Spike/Exploration Increment

### For Unknowns

```bash
/specweave:increment "Spike: Evaluate GraphQL migration" --type spike
```

### Spike Structure

```markdown
<!-- spec.md -->
---
increment: 0010-spike-graphql
type: spike
timebox: 8h
---

# Spike: GraphQL Migration Feasibility

## Questions to Answer

1. Can we migrate incrementally?
2. What's the performance impact?
3. How do we handle auth?

## Success Criteria

- [ ] Proof of concept working
- [ ] Performance benchmarks captured
- [ ] Migration plan documented

## Timebox

8 hours maximum. Stop and document findings regardless.
```

### Spike Outcome

```markdown
<!-- After spike completion -->

## Findings

1. **Incremental migration**: YES - can use Apollo Federation
2. **Performance**: 15% slower for simple queries, 40% faster for complex
3. **Auth**: Works with existing JWT

## Recommendation

Proceed with migration in 0011-graphql-phase-1

## Artifacts

- POC code: `spikes/graphql-poc/`
- Benchmarks: `spikes/graphql-poc/benchmarks.md`
```

---

## Pattern 6: Living Documentation Flow

### Continuous Documentation

```
Code Change → Hook Fires → Docs Update → External Sync
```

### Hook Configuration

```json
// hooks.json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "tools": ["Edit", "Write"],
      "match": "src/**/*.ts",
      "command": "specweave check-docs --auto-update"
    },
    {
      "event": "PostToolUse",
      "tools": ["Edit"],
      "match": "tasks.md",
      "command": "specweave sync-progress --silent"
    }
  ]
}
```

### Documentation Structure

```
.specweave/docs/
├── public/           # Customer-facing
│   ├── FEATURES.md   # Auto-updated feature list
│   ├── API.md        # API documentation
│   └── CHANGELOG.md  # Version history
├── internal/         # Team documentation
│   ├── architecture/ # ADRs and design docs
│   └── runbooks/     # Operational guides
└── _features/        # Per-feature deep dives
    ├── FS-001-auth/
    └── FS-002-payments/
```

---

## Pattern 7: Brownfield Integration

### Gradual Adoption

```bash
# Step 1: Initialize SpecWeave
specweave init . --brownfield

# Step 2: Import existing issues
/specweave-github:sync --import-only --since "2025-01-01"

# Step 3: Create increment for next feature
/specweave:increment "New feature X"

# Step 4: Link to existing issues
/specweave-github:create-issue 0001 --link-existing 42
```

### Brownfield Config

```json
// config.json
{
  "brownfield": {
    "preserveExisting": true,
    "importFrom": ["github", "jira"],
    "syncDirection": "bidirectional"
  }
}
```

---

## Pattern 8: Multi-Project Organization

### Project-per-Team

```bash
# Initialize multi-project mode
/specweave:init-multiproject

# Creates structure:
.specweave/
├── projects/
│   ├── frontend/
│   │   └── specs/
│   ├── backend/
│   │   └── specs/
│   └── mobile/
│       └── specs/
└── _shared/
    └── specs/  # Cross-team features
```

### Switching Projects

```bash
# Work on frontend
/specweave:switch-project frontend
/specweave:increment "New UI component"

# Work on backend
/specweave:switch-project backend
/specweave:increment "API endpoint"
```

---

## Pattern 9: Release Train

### Quarterly Planning

```
Q1 2025 Release Train:
├── 0001-authentication     ✅ Complete
├── 0002-payments           ✅ Complete
├── 0003-notifications      🔄 In Progress
├── 0004-analytics          📋 Backlog
└── 0005-performance        📋 Backlog
```

### Release Checklist

```markdown
<!-- .specweave/docs/internal/release-checklist.md -->

## Q1 2025 Release

### Pre-Release
- [ ] All increments completed
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Security scan clear
- [ ] Documentation updated

### Release
- [ ] Version bump
- [ ] Changelog generated
- [ ] Tags created
- [ ] Deploy to staging
- [ ] Deploy to production

### Post-Release
- [ ] Monitor metrics
- [ ] Customer communication
- [ ] Retrospective scheduled
```

### Automated Release

```bash
# Generate release
/specweave-release:npm

# Creates:
# - Version bump in package.json
# - Git tag
# - Changelog entry
# - Triggers CI/CD
```

---

## Pattern 10: AI-Assisted Code Review

### Pre-Commit Review

```bash
# Before committing
/specweave:qa 0001 --review-only

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODE REVIEW: 0001-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Changed: 12
Lines Added: 342
Lines Removed: 45

Security:
  ⚠️ src/auth.ts:45 - Potential SQL injection
  ✅ Password hashing using bcrypt

Performance:
  ⚠️ src/user-service.ts:120 - N+1 query detected
  ✅ Proper indexing on email field

Best Practices:
  ✅ Error handling consistent
  ⚠️ Missing input validation in 2 endpoints

Suggestions:
  1. Parameterize query at auth.ts:45
  2. Add eager loading at user-service.ts:120
  3. Add validation middleware
```

### Automated Fixes

```bash
# Apply suggested fixes
/specweave:qa 0001 --auto-fix

# Review and commit
git diff
git add . && git commit -m "fix: address code review findings"
```

---

## Summary: Pattern Selection Guide

| Scenario | Pattern |
|----------|---------|
| Multiple developers | Parallel Increments |
| Gradual rollout | Feature Flags |
| Multiple services | Microservices Coordination |
| Production emergency | Hotfix Workflow |
| Technical unknown | Spike/Exploration |
| Always-current docs | Living Documentation |
| Existing codebase | Brownfield Integration |
| Large organization | Multi-Project |
| Scheduled releases | Release Train |
| Quality assurance | AI-Assisted Review |

---

## What's Next?

Congratulations! You've completed the SpecWeave Academy.

### Continue Learning

- **Practice**: Apply these patterns to real projects
- **Customize**: Adapt patterns to your team's needs
- **Contribute**: Share your own patterns with the community

### Resources

- [Full Documentation](/)
- [API Reference](/api)
- [GitHub Repository](https://github.com/specweave/specweave)
- [Community Discussions](https://github.com/specweave/specweave/discussions)

### Stay Updated

SpecWeave evolves with the AI landscape. Follow releases for:
- New Claude model integrations
- Additional external tool support
- Community-contributed patterns

---

🎉 **You've completed the SpecWeave Academy!**

Remember the core philosophy:

> **Specification is the source of truth.**
> **AI is your implementation partner.**
> **Quality gates protect your codebase.**

Now go build something amazing with SpecWeave!
