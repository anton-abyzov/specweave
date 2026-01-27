---
name: release-coordinator
description: Multi-repo release coordination - dependency management, release order orchestration, cross-repo validation. Use for synchronized multi-service releases.
---

# Release Coordinator

**Expertise**: Multi-repository release orchestration, dependency management, release order planning, and cross-repo validation.

## Core Capabilities

### 1. Release Dependency Management

**Understands and manages release order**:

**Dependency Types**:
```yaml
# Build-time dependencies
shared-lib: v2.0.0
  └─ service-a: v3.1.0 (depends on shared-lib)
  └─ service-b: v2.5.0 (depends on shared-lib)

# Runtime dependencies
auth-service: v1.8.0
  └─ api-gateway: v2.0.0 (calls auth-service)
     └─ frontend: v3.2.0 (calls api-gateway)

# Data schema dependencies
database-migrations: v10
  └─ backend-services: v2.x (requires schema v10)
```

**Release Order Calculation**:
1. Build dependency graph
2. Topological sort for correct order
3. Identify circular dependencies (error)
4. Generate release waves:
   - Wave 1: No dependencies (shared-lib, database-migrations)
   - Wave 2: Depends on Wave 1 (service-a, service-b)
   - Wave 3: Depends on Wave 2 (api-gateway)
   - Wave 4: Depends on Wave 3 (frontend)

**Example Release Plan**:
```markdown
## Release Order for Product v3.0.0

### Wave 1 (Foundations)
- [ ] shared-lib: v2.0.0 → v3.0.0
- [ ] database-migrations: v9 → v10

### Wave 2 (Backend Services)
- [ ] auth-service: v1.8.0 → v2.0.0 (depends: shared-lib v3.0.0)
- [ ] user-service: v1.5.0 → v2.0.0 (depends: shared-lib v3.0.0, schema v10)
- [ ] order-service: v2.1.0 → v3.0.0 (depends: shared-lib v3.0.0, schema v10)

### Wave 3 (API Layer)
- [ ] api-gateway: v2.0.0 → v3.0.0 (depends: auth-service v2.0.0, user-service v2.0.0)

### Wave 4 (Frontend)
- [ ] web-app: v3.2.0 → v4.0.0 (depends: api-gateway v3.0.0)
- [ ] mobile-app: v2.5.0 → v3.0.0 (depends: api-gateway v3.0.0)

**Total Duration**: ~4 hours (waves run sequentially, repos in wave release in parallel)
```

### 2. Coordinated Release Strategies

**Lockstep Versioning** (all repos share version):
```yaml
Product: v3.0.0
Repositories:
  - frontend: v3.0.0
  - backend: v3.0.0
  - api: v3.0.0
  - shared: v3.0.0

Benefits:
  - Simple to understand (one version = one product state)
  - Clear API compatibility
  - Easier rollback (revert entire product)

Challenges:
  - Forces releases even if no changes
  - High coordination overhead
  - All teams must sync

Use When:
  - Tight coupling between repos
  - Small team (all work together)
  - Breaking changes affect all repos
```

**Independent Versioning** (each repo has own version):
```yaml
Product: N/A
Repositories:
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0
  - shared: v1.5.0

Benefits:
  - Autonomous teams
  - Release when ready
  - No forced releases

Challenges:
  - Complex compatibility matrix
  - Hard to understand product state
  - Testing combinations expensive

Use When:
  - Loose coupling between repos
  - Large team (independent squads)
  - Frequent releases (daily/weekly)
```

**Umbrella Versioning** (product version + service versions):
```yaml
Product: v5.0.0 (umbrella)
├─ frontend: v4.2.0
├─ backend: v2.8.0
├─ api: v3.1.0
└─ shared: v1.5.0

Benefits:
  - Clear product milestones (v5.0.0 = major release)
  - Internal flexibility (services version independently)
  - Best of both worlds

Challenges:
  - Version matrix tracking
  - Compatibility validation

Use When:
  - Medium/large team
  - Product-level milestones important
  - Services evolve at different rates
```

### 3. Release Increment Creation

**Creates release increments spanning repos**:

**Single-Repo Release Increment**:
```
.specweave/increments/0020-backend-v2-release/
├── spec.md           # What's being released
├── plan.md           # Release execution plan
├── tasks.md          # Release checklist
└── metadata.json     # Repository: backend, target: v2.0.0
```

**Multi-Repo Release Increment**:
```
.specweave/increments/0025-product-v3-release/
├── spec.md           # Product release overview
├── plan.md           # Cross-repo orchestration
├── tasks.md          # Multi-repo checklist
└── metadata.json     # Repositories: [frontend, backend, api], umbrella: v3.0.0
```

**spec.md Example**:
```markdown
# Product v3.0.0 Release

## Release Type
Umbrella (coordinated major version)

## Repositories
- frontend: v3.2.0 → v4.0.0
- backend: v2.5.0 → v3.0.0
- api-gateway: v2.8.0 → v3.0.0
- shared-lib: v1.8.0 → v2.0.0

## Key Changes
- **Breaking**: API v2 → v3 (remove legacy endpoints)
- **Feature**: Real-time notifications (WebSocket)
- **Performance**: 50% faster API response time

## Release Waves
See plan.md for detailed orchestration

## Success Criteria
- [ ] All repos tagged (v3.0.0 umbrella)
- [ ] GitHub releases published
- [ ] Changelogs updated
- [ ] Packages published (NPM/Docker)
- [ ] Deployed to production
- [ ] Smoke tests passing
- [ ] DORA metrics: Lead time <1 day
```

### 4. Pre-Release Validation

**Cross-Repo Validation Checks**:

**Before Release**:
```bash
# 1. Version Compatibility
✓ shared-lib v2.0.0 compatible with service-a v3.0.0
✓ API contracts match between gateway and services
✗ Database schema v10 required by backend, but only v9 deployed

# 2. CI/CD Status
✓ All tests passing in all repos
✓ No pending code review comments
✗ Staging deployment failed for frontend

# 3. Dependency Versions
✓ All repos use shared-lib v2.0.0
✓ No conflicting dependency versions
✗ service-b still using deprecated shared-lib v1.5.0

# 4. Documentation
✓ CHANGELOG.md updated in all repos
✓ API docs regenerated
✗ Migration guide missing for breaking changes

# 5. Release Notes
✓ All commits since last release analyzed
✓ Breaking changes documented
✗ Missing highlights section
```

**Blocking Issues Report**:
```markdown
## Pre-Release Validation: BLOCKED ❌

### Blockers (MUST FIX)
1. **Database schema mismatch**:
   - Backend requires schema v10
   - Current production: schema v9
   - Action: Deploy migration v9→v10 first

2. **Frontend staging failure**:
   - Build error: Module 'api-client' not found
   - Cause: API client v3.0.0 not published yet
   - Action: Publish api-client first (Wave 1)

3. **Outdated dependency**:
   - service-b using shared-lib v1.5.0 (deprecated)
   - Required: shared-lib v2.0.0
   - Action: Update service-b, test, then release

### Warnings (Should Fix)
1. Missing migration guide for API v2→v3
2. Incomplete release notes (missing highlights)

### Ready to Release
- auth-service v2.0.0 ✓
- user-service v2.0.0 ✓
- shared-lib v2.0.0 ✓
```

### 5. Release Execution Orchestration

**Automated Release Workflow**:

```bash
# Command
/sw-release:execute 0025-product-v3-release

# Executes:
1. Pre-flight checks (validation)
2. Wave 1: Release shared-lib, database-migrations
   - Wait for CI/CD success
   - Verify package published
3. Wave 2: Release backend services (parallel)
   - auth-service, user-service, order-service
   - Wait for CI/CD success
4. Wave 3: Release api-gateway
   - Wait for CI/CD success
5. Wave 4: Release frontend apps (parallel)
   - web-app, mobile-app
   - Wait for CI/CD success
6. Post-release validation
   - Smoke tests
   - Health checks
   - Monitor for 1 hour
7. Update living docs
   - Sync release-strategy.md
   - Update version matrix
8. Notify stakeholders
   - Slack/email: "Product v3.0.0 released"
   - DORA metrics: Deployment frequency +1
```

### 6. Rollback Coordination

**Multi-Repo Rollback**:

```markdown
## Rollback Plan: Product v3.0.0 → v2.5.0

### Trigger
- Critical bug in api-gateway v3.0.0
- Affected: 20% of API calls failing

### Strategy
Reverse wave order (rollback dependencies first)

### Wave 1 (Rollback Frontend First)
- [ ] web-app: v4.0.0 → v3.2.0
- [ ] mobile-app: v3.0.0 → v2.5.0

### Wave 2 (Rollback API Layer)
- [ ] api-gateway: v3.0.0 → v2.8.0

### Wave 3 (Rollback Backend - Optional)
- [ ] Keep backend services at v3.0.0 (backward compatible)
- [ ] If needed: auth-service v2.0.0 → v1.8.0

### Wave 4 (Rollback Shared - Optional)
- [ ] Keep shared-lib at v2.0.0 (no bugs reported)

**Duration**: ~30 minutes (frontend + gateway only)
**Impact**: Minimal (API compatible with older clients)
```

### 7. Integration with SpecWeave Workflows

**Release Increment Lifecycle**:

```bash
# 1. Plan release
/sw:increment "0025-product-v3-release"
# → Creates increment with multi-repo spec

# 2. Coordinate release (this skill activates)
# → Analyzes dependencies
# → Generates release waves
# → Creates validation checklist

# 3. Execute release
/sw:do
# → Runs pre-flight checks
# → Executes wave-by-wave
# → Monitors progress

# 4. Complete release
/sw:done 0025
# → Validates all repos released
# → Updates living docs
# → Syncs to GitHub/Jira/ADO
```

## When to Use This Skill

**Ask me to**:

1. **Coordinate multi-repo releases**:
   - "Plan release for 5 microservices"
   - "Coordinate backend and frontend release"
   - "Create release plan spanning repos"

2. **Manage release dependencies**:
   - "What order should we release repos?"
   - "Which services depend on shared-lib?"
   - "Calculate release waves"

3. **Validate pre-release**:
   - "Check if we're ready to release"
   - "Validate cross-repo compatibility"
   - "Run pre-flight checks"

4. **Execute coordinated releases**:
   - "Release product v3.0.0"
   - "Execute umbrella release"
   - "Orchestrate wave-by-wave deployment"

5. **Plan rollbacks**:
   - "Create rollback plan for v3.0.0"
   - "How to rollback if frontend fails?"
   - "Reverse release order"

## Best Practices

**Dependency Management**:
- Document dependencies in release-strategy.md
- Automate dependency detection (package.json, imports)
- Version lock shared libraries (avoid floating versions)

**Release Windows**:
- Schedule releases during low-traffic periods
- Reserve rollback window (2x release duration)
- Communicate blackout periods (holidays, weekends)

**Validation Gates**:
- Never skip pre-flight checks (catch issues early)
- Automate validation (CI/CD pipelines)
- Manual approval gates for production

**Communication**:
- Notify all teams before release (1 day notice)
- Real-time status updates during release
- Post-release summary (DORA metrics, issues)

## Integration Points

**Release Strategy Advisor**:
- Reads release-strategy.md for approach
- Adapts coordination to strategy type
- Suggests improvements based on issues

**Version Aligner**:
- Uses version alignment rules
- Ensures compatibility across repos
- Validates semver constraints

**RC Manager**:
- Coordinates RC releases (pre-production)
- Validates RC before production
- Promotes RC to final release

**Living Docs**:
- Documents release history
- Updates version matrix
- Links to GitHub releases

## Example Workflows

### Microservices Coordinated Release

```bash
# 1. User initiates release
/sw:increment "0030-product-v4-release"

# 2. Coordinator analyzes
# - 8 microservices detected
# - Dependency graph: shared-lib → services → gateway → frontend
# - Release strategy: Umbrella versioning

# 3. Generates plan
# - Wave 1: shared-lib v3.0.0, database-migrations v15
# - Wave 2: 6 backend services (parallel)
# - Wave 3: api-gateway v4.0.0
# - Wave 4: web + mobile apps (parallel)

# 4. Pre-flight validation
# - All tests passing ✓
# - No blocking dependencies ✓
# - Changelogs updated ✓
# - Ready to release ✓

# 5. Execute release
/sw:do
# - Wave 1 released (15 min)
# - Wave 2 released (20 min, parallel)
# - Wave 3 released (10 min)
# - Wave 4 released (25 min, parallel)
# Total: 70 minutes

# 6. Post-release
# - All smoke tests passing ✓
# - DORA metrics updated ✓
# - Stakeholders notified ✓
# - Living docs synced ✓
```

### Monorepo Release (Lerna)

```bash
# 1. User initiates release
/sw:increment "0035-monorepo-v2-release"

# 2. Coordinator analyzes
# - Lerna monorepo (12 packages)
# - Independent versioning
# - Changes detected in 4 packages

# 3. Generates plan
# - @myapp/shared: v1.5.0 → v1.6.0 (patch)
# - @myapp/api-client: v2.0.0 → v2.1.0 (minor)
# - @myapp/web: v3.2.0 → v3.3.0 (minor)
# - @myapp/mobile: v2.8.0 → v2.8.1 (patch)

# 4. Dependency order
# - shared → api-client → (web, mobile)

# 5. Execute release
npx lerna publish --conventional-commits
# - Shared released first
# - API client released second
# - Web and mobile released in parallel
```

## Commands Integration

Works with release commands:

- `/sw-release:coordinate <increment>` - Plan multi-repo release
- `/sw-release:validate <increment>` - Run pre-flight checks
- `/sw-release:execute <increment>` - Execute coordinated release
- `/sw-release:rollback <increment>` - Rollback coordinated release

## Dependencies

**Required**:
- Git (version tags)
- SpecWeave core (increment lifecycle)
- Release strategy documentation

**Optional**:
- GitHub CLI (`gh`) - GitHub releases
- NPM (`npm`) - NPM package detection
- Docker (`docker`) - Container image detection
- Kubernetes (`kubectl`) - Deployment verification

## Output

**Creates/Updates**:
- Release increment (spec.md, plan.md, tasks.md)
- Release waves documentation
- Pre-flight validation report
- Rollback plan
- Release history in living docs

**Provides**:
- Dependency graph visualization
- Release order (topological sort)
- Pre-flight validation status
- Real-time release progress
- Post-release metrics

---

**Remember**: Release coordination is critical for multi-repo architectures. Always:
- Understand dependencies before releasing
- Validate cross-repo compatibility
- Execute wave-by-wave (never "big bang" all at once)
- Have rollback plan ready
- Monitor for 1+ hour post-release

**Goal**: Safe, predictable, repeatable coordinated releases across multiple repositories.
