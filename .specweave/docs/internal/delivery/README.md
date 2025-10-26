# Delivery Documentation - The "How We Build"

**Purpose**: Define how we plan, build, and release features.

## What Goes Here

- **Roadmap** - Feature timeline, priorities
- **Release Plans** - Version planning, release notes
- **Test Strategy** - Testing approach, coverage goals
- **CI/CD Documentation** - Build pipelines, deployment processes
- **Branching Strategy** - Git workflow, branch policies
- **Environment Setup** - Dev, staging, prod configurations

## Document Types

### Roadmap
**Purpose**: Long-term feature planning, priorities, dependencies

**Sections**:
- **Now** - Current quarter
- **Next** - Next quarter
- **Later** - Future quarters
- **Parked** - Deferred features

**File**: `roadmap.md`

### Release Plan
**Purpose**: Plan for specific release versions

**Sections**:
- **Version** - Release version number
- **Features** - What's included (link to PRDs)
- **Timeline** - Key dates (code freeze, QA, release)
- **Dependencies** - Blockers, external dependencies
- **Rollout Strategy** - Phased rollout, feature flags
- **Rollback Plan** - How to revert if needed

**Naming**: `release-v1.0.md`, `release-v2.0.md`

### Test Strategy
**Purpose**: Define testing approach for features or releases

**Sections**:
- **Scope** - What's being tested
- **Test Types** - Unit, integration, E2E, performance
- **Coverage Goals** - % coverage targets
- **Test Environments** - Where tests run
- **Automation** - CI/CD integration
- **Manual Testing** - Smoke tests, exploratory testing

**File**: `test-strategy.md` or `test-strategy-{feature}.md`

### CI/CD Runbooks
**Purpose**: Document build and deployment processes

**Sections**:
- **Pipeline Overview** - Build → Test → Deploy flow
- **Environments** - Dev, staging, prod
- **Deployment Steps** - How to deploy
- **Rollback Steps** - How to revert
- **Monitoring** - What to watch after deployment

**Naming**: `ci-cd-{system}.md`

## Creating New Delivery Documents

### Roadmap:
```bash
# Create or update roadmap
touch docs/internal/delivery/roadmap.md
```

### Release Plan:
```bash
cp templates/docs/release-plan-template.md docs/internal/delivery/release-v1.0.md
```

### Test Strategy:
```bash
cp templates/docs/test-strategy-template.md docs/internal/delivery/test-strategy-{feature}.md
```

## Index of Delivery Documents

### Roadmap
- (Create `roadmap.md`)

### Release Plans
- (None yet)

### Test Strategies
- (None yet)

### CI/CD Runbooks
- (None yet)

## Related Documentation

- [Strategy Documentation](../strategy/README.md) - Links roadmap to PRDs
- [Architecture Documentation](../architecture/README.md) - Links releases to ADRs/RFCs
- [Operations Documentation](../operations/README.md) - Links to operational runbooks
