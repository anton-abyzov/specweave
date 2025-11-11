---
name: specweave-release-platform
description: "Coordinate multi-repo platform releases with synchronized versioning, RC workflow, and GitFlow integration. Usage: /specweave-release:platform create|promote|status"
---

# Platform Release Coordination

**Purpose**: Orchestrate releases across multiple repositories as a unified platform version.

**When to Use**: Multi-repo architectures where services must release together (umbrella versioning).

---

## Commands

### Create Platform RC

```bash
/specweave-release:platform create <platform-version>
```

**Example**:
```bash
/specweave-release:platform create v3.0.0
```

**What it does**:
1. Validates all repos have clean working directories
2. Creates `release/v*` branches in all repos (GitFlow)
3. Aligns versions across repos (using semantic versioning)
4. Tags RC.1 in all repos: `v5.0.0-rc.1`, `v2.9.0-rc.1`, etc.
5. Updates platform manifest: `.specweave/platform-releases.json`
6. Creates version matrix: `.specweave/docs/internal/delivery/version-matrix.md`

**Output**:
```
🚀 Creating Platform Release: v3.0.0

Step 1: Validating repositories...
   ✓ frontend: Clean (current: v4.2.0)
   ✓ backend: Clean (current: v2.8.0)
   ✓ api-gateway: Clean (current: v3.1.0)

Step 2: Analyzing changes...
   📊 frontend: 12 commits (3 breaking, 5 features, 4 fixes) → Suggest v5.0.0
   📊 backend: 8 commits (0 breaking, 7 features, 1 fix) → Suggest v2.9.0
   📊 api-gateway: 15 commits (2 breaking, 8 features, 5 fixes) → Suggest v4.0.0

Step 3: Creating release branches...
   ✓ frontend: release/v5.0.0
   ✓ backend: release/v2.9.0
   ✓ api-gateway: release/v4.0.0

Step 4: Tagging RC.1...
   ✓ frontend: v5.0.0-rc.1
   ✓ backend: v2.9.0-rc.1
   ✓ api-gateway: v4.0.0-rc.1

Step 5: Updating platform manifest...
   ✓ Created .specweave/platform-releases.json

Step 6: Updating version matrix...
   ✓ Created .specweave/docs/internal/delivery/version-matrix.md

✅ Platform v3.0.0-rc.1 created!

Next steps:
1. Deploy to staging
2. Run E2E tests
3. If tests pass: /specweave-release:platform promote v3.0.0-rc.1
4. If tests fail: /specweave-release:platform iterate v3.0.0-rc.1
```

---

### Iterate Platform RC

```bash
/specweave-release:platform iterate <platform-rc-version>
```

**Example**:
```bash
/specweave-release:platform iterate v3.0.0-rc.1
```

**What it does**:
1. Identifies which repos need fixes
2. Bumps RC number (rc.1 → rc.2)
3. Tags new RC in affected repos only
4. Updates platform manifest

**Output**:
```
🔄 Iterating Platform RC: v3.0.0-rc.1

Which repos need fixes?
[x] frontend
[ ] backend (no changes needed)
[x] api-gateway

Creating RC.2 for changed repos:
   ✓ frontend: v5.0.0-rc.2
   ✓ api-gateway: v4.0.0-rc.2
   ℹ️  backend: v2.9.0-rc.1 (unchanged)

✅ Platform v3.0.0-rc.2 created!
```

---

### Promote Platform RC to Production

```bash
/specweave-release:platform promote <platform-rc-version>
```

**Example**:
```bash
/specweave-release:platform promote v3.0.0-rc.3
```

**What it does**:
1. Validates all RCs passed tests
2. Merges release branches to main (GitFlow)
3. Tags final versions (removes -rc.N suffix)
4. Merges main back to develop (GitFlow)
5. Deletes release branches (optional)
6. Updates platform manifest with "released" status
7. Updates version matrix
8. Tracks DORA metrics

**Pre-Flight Checklist**:
- ✅ All E2E tests passing
- ✅ Performance benchmarks met
- ✅ Security scan clean
- ✅ Stakeholder approval received
- ✅ Canary deployment successful (if applicable)

**Output**:
```
🎉 Promoting Platform RC to Production: v3.0.0-rc.3

Pre-Flight Checks:
   ✓ All repos on latest RC
   ✓ Tests passing: frontend ✅, backend ✅, api-gateway ✅
   ✓ No blocking issues

Step 1: Merging to main...
   ✓ frontend: release/v5.0.0 → main
   ✓ backend: release/v2.9.0 → main
   ✓ api-gateway: release/v4.0.0 → main

Step 2: Tagging final versions...
   ✓ frontend: v5.0.0
   ✓ backend: v2.9.0
   ✓ api-gateway: v4.0.0

Step 3: Merging back to develop...
   ✓ frontend: main → develop
   ✓ backend: main → develop
   ✓ api-gateway: main → develop

Step 4: Cleaning up release branches...
   ✓ frontend: Deleted release/v5.0.0
   ✓ backend: Deleted release/v2.9.0
   ✓ api-gateway: Deleted release/v4.0.0

Step 5: Updating platform manifest...
   ✓ Status: released

Step 6: Tracking DORA metrics...
   ✓ Deployment frequency updated
   ✓ Lead time calculated
   ✓ Dashboard updated

✅ Platform v3.0.0 released to production!

Platform Version Matrix:
  Product: v3.0.0
  ├─ frontend: v5.0.0
  ├─ backend: v2.9.0
  └─ api-gateway: v4.0.0

Deployment URLs:
  - Production: https://app.example.com
  - Docs: .specweave/docs/internal/delivery/version-matrix.md
```

---

### Platform Release Status

```bash
/specweave-release:platform status [platform-version]
```

**Example**:
```bash
/specweave-release:platform status v3.0.0
```

**Output**:
```
📊 Platform Release Status: v3.0.0

Status: 🟡 In Progress (RC.2)

Service Versions:
  ✓ frontend: v5.0.0-rc.2 (from v4.2.0)
  ✓ backend: v2.9.0-rc.1 (from v2.8.0)
  ✓ api-gateway: v4.0.0-rc.2 (from v3.1.0)

RC History:
  - v3.0.0-rc.1: Created 2025-11-11 10:00 UTC
  - v3.0.0-rc.2: Created 2025-11-11 14:30 UTC (frontend, api-gateway fixed)

Tests:
  ✓ frontend: All passing
  ✓ backend: All passing
  🔴 api-gateway: 2 E2E tests failing

Blockers:
  - api-gateway: Auth flow broken (issue #145)

Next Steps:
  1. Fix api-gateway auth flow
  2. Create RC.3: /specweave-release:platform iterate v3.0.0-rc.2
  3. Re-test
  4. Promote: /specweave-release:platform promote v3.0.0-rc.3
```

---

## Platform Manifest Format

**Location**: `.specweave/platform-releases.json`

```json
{
  "v3.0.0": {
    "status": "rc",
    "currentRC": "rc.2",
    "created": "2025-11-11T10:00:00Z",
    "services": {
      "frontend": {
        "version": "v5.0.0-rc.2",
        "previousVersion": "v4.2.0",
        "changeType": "major",
        "releaseNotes": "Breaking changes: New auth API"
      },
      "backend": {
        "version": "v2.9.0-rc.1",
        "previousVersion": "v2.8.0",
        "changeType": "minor",
        "releaseNotes": "Added dark mode support"
      },
      "api-gateway": {
        "version": "v4.0.0-rc.2",
        "previousVersion": "v3.1.0",
        "changeType": "major",
        "releaseNotes": "Breaking changes: Removed legacy endpoints"
      }
    },
    "rcHistory": [
      {
        "rc": "rc.1",
        "created": "2025-11-11T10:00:00Z",
        "services": {
          "frontend": "v5.0.0-rc.1",
          "backend": "v2.9.0-rc.1",
          "api-gateway": "v4.0.0-rc.1"
        }
      },
      {
        "rc": "rc.2",
        "created": "2025-11-11T14:30:00Z",
        "services": {
          "frontend": "v5.0.0-rc.2",
          "backend": "v2.9.0-rc.1",
          "api-gateway": "v4.0.0-rc.2"
        },
        "changes": ["frontend: Fixed auth bug", "api-gateway: Fixed CORS issue"]
      }
    ]
  }
}
```

---

## Version Matrix Document

**Location**: `.specweave/docs/internal/delivery/version-matrix.md`

**Content**:
```markdown
# Platform Version Matrix

**Last Updated**: 2025-11-11 15:00 UTC

## Current Production

**Platform Version**: v2.0.0
**Released**: 2025-10-15

| Service | Version | Changelog |
|---------|---------|-----------|
| frontend | v4.2.0 | Added user preferences |
| backend | v2.8.0 | Performance improvements |
| api-gateway | v3.1.0 | Rate limiting updates |

---

## In Progress

**Platform Version**: v3.0.0-rc.2
**Status**: Testing

| Service | RC Version | Change Type | Release Notes |
|---------|------------|-------------|---------------|
| frontend | v5.0.0-rc.2 | MAJOR | Breaking: New auth API |
| backend | v2.9.0-rc.1 | MINOR | Dark mode support |
| api-gateway | v4.0.0-rc.2 | MAJOR | Breaking: Removed legacy endpoints |

**Blockers**: api-gateway auth flow (issue #145)

---

## Release History

### v2.0.0 (2025-10-15)
- frontend: v4.2.0
- backend: v2.8.0
- api-gateway: v3.1.0

### v1.5.0 (2025-09-01)
- frontend: v4.0.0
- backend: v2.7.0
- api-gateway: v3.0.0

(Complete history...)
```

---

## Configuration

**In `.specweave/config.json`**:

```json
{
  "release": {
    "platformMode": true,
    "repositories": [
      {
        "name": "frontend",
        "path": "../frontend",
        "git": "https://github.com/org/frontend.git"
      },
      {
        "name": "backend",
        "path": "../backend",
        "git": "https://github.com/org/backend.git"
      },
      {
        "name": "api-gateway",
        "path": "../api-gateway",
        "git": "https://github.com/org/api-gateway.git"
      }
    ],
    "gitflow": {
      "enabled": true,
      "releaseBranchPrefix": "release/",
      "deleteAfterMerge": true
    }
  }
}
```

---

## Best Practices

**When to Use Platform Releases**:
- ✅ Services have tight coupling (breaking changes affect multiple repos)
- ✅ Product milestones important (v3.0.0 marketing launch)
- ✅ Need coordinated testing (E2E tests span services)
- ✅ Compliance requirements (audit trail for version combinations)

**When NOT to Use**:
- ❌ Services are fully independent (no coupling)
- ❌ Different release cadences (frontend weekly, backend monthly)
- ❌ Large number of services (>10 repos - use independent versioning)

**RC Best Practices**:
- Create RC.1 early (at least 1 week before planned release)
- Limit RC iterations (ideally ≤3, if >5 something is wrong)
- Test cross-service integration thoroughly
- Document all changes between RCs

---

## Troubleshooting

**Issue**: Git conflicts during merge
```bash
# Solution: Resolve conflicts manually, then resume
git add .
git commit -m "Resolved conflicts"
/specweave-release:platform promote v3.0.0-rc.3 --resume
```

**Issue**: One service fails tests
```bash
# Solution: Fix the service, create new RC
# (Don't bump other services that passed)
/specweave-release:platform iterate v3.0.0-rc.2
```

**Issue**: Need to rollback
```bash
# Solution: Revert main to previous tag, create hotfix
git revert <commit>
/specweave-release:platform create v3.0.1
```

---

## Related Documentation

- [Release Strategy](../../docs/internal/delivery/release-strategy.md)
- [Version Matrix](../../docs/internal/delivery/version-matrix.md)
- [GitFlow Guide](../../docs/internal/delivery/guides/gitflow.md)
- [DORA Metrics](../../docs/internal/delivery/dora-dashboard.md)

---

**Note**: This command integrates with existing SpecWeave increment workflow. Each platform release should have its own increment (e.g., `0050-platform-v3-release`).
