---
description: Multi-repo release coordination - dependency management, release waves, RC lifecycle (alpha/beta/rc), brownfield detection, rollback planning. Use for synchronized releases or release strategy.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
context: fork
---

# Release Coordinator

Multi-repo release orchestration, RC lifecycle management, and release strategy.

## Release Dependency Management

```yaml
# Build-time dependencies
shared-lib: v2.0.0
  └─ service-a: v3.1.0 (depends on shared-lib)
  └─ service-b: v2.5.0 (depends on shared-lib)

# Runtime dependencies
auth-service: v1.8.0
  └─ api-gateway: v2.0.0 (calls auth-service)
     └─ frontend: v3.2.0 (calls api-gateway)
```

**Release Order Calculation**:
1. Build dependency graph
2. Topological sort for correct order
3. Identify circular dependencies (error)
4. Generate release waves

## Release Waves

```markdown
### Wave 1 (Foundations)
- [ ] shared-lib: v2.0.0 → v3.0.0
- [ ] database-migrations: v9 → v10

### Wave 2 (Backend Services)
- [ ] auth-service: v1.8.0 → v2.0.0 (depends: shared-lib v3.0.0)
- [ ] user-service: v1.5.0 → v2.0.0 (depends: schema v10)

### Wave 3 (API Layer)
- [ ] api-gateway: v2.0.0 → v3.0.0 (depends: auth-service v2.0.0)

### Wave 4 (Frontend)
- [ ] web-app: v3.2.0 → v4.0.0 (depends: api-gateway v3.0.0)
```

## Release Candidate (RC) Lifecycle

### Pre-Release Tags

```yaml
Alpha: 1.0.0-alpha.1  # Early development (unstable)
Beta:  1.0.0-beta.1   # Feature complete (testing)
RC:    1.0.0-rc.1     # Release candidate (near production)
Final: 1.0.0          # Production release
```

### RC Workflow

```bash
# 1. Create RC
git tag -a v2.0.0-rc.1 -m "Release candidate 1"
npm version 2.0.0-rc.1

# 2. Deploy to staging
gh release create v2.0.0-rc.1 --prerelease

# 3. Testing phase (1-2 weeks)
# Bug found → create v2.0.0-rc.2

# 4. Promote to final
git tag -a v2.0.0 -m "Production release"
npm version 2.0.0
gh release create v2.0.0  # NOT prerelease
```

### RC State Machine

```
DRAFT → TESTING → VALIDATED → PROMOTED
          ↓           ↓
       FAILED     HOTFIX → back to TESTING
```

### Tag Cleanup

```bash
# List RC tags
git tag -l "*-rc.*" | sort -V

# Delete old RC after promotion
git tag -d v2.0.0-rc.1 v2.0.0-rc.2
git push origin --delete v2.0.0-rc.1 v2.0.0-rc.2
```

## Coordinated Release Strategies

| Strategy | When to Use |
|----------|-------------|
| **Lockstep** | Tight coupling, small team, shared breaking changes |
| **Independent** | Loose coupling, autonomous teams, frequent releases |
| **Umbrella** | Product milestones, services evolve at different rates |

### Lockstep (all repos share version)

```yaml
Product: v3.0.0
Repositories:
  - frontend: v3.0.0
  - backend: v3.0.0
  - api: v3.0.0
```

### Independent (each repo own version)

```yaml
Repositories:
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0
```

### Umbrella (product + service versions)

```yaml
Product: v5.0.0 (umbrella)
├─ frontend: v4.2.0
├─ backend: v2.8.0
└─ api: v3.1.0
```

## Brownfield Strategy Detection

**Analyzes existing projects to detect release patterns**:

- **Git**: Version tags, release branches
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Package Managers**: NPM, Python, Go
- **Monorepo Tools**: Lerna, Nx, Turborepo
- **Release Automation**: semantic-release, standard-version

## Pre-Release Validation

```bash
# 1. Version Compatibility
✓ shared-lib v2.0.0 compatible with service-a v3.0.0
✗ Database schema v10 required but only v9 deployed

# 2. CI/CD Status
✓ All tests passing
✗ Staging deployment failed

# 3. Documentation
✓ CHANGELOG.md updated
✗ Migration guide missing
```

## Rollback Coordination

```markdown
## Rollback: v3.0.0 → v2.5.0 (Reverse wave order)

### Wave 1 (Rollback Frontend First)
- [ ] web-app: v4.0.0 → v3.2.0
- [ ] mobile-app: v3.0.0 → v2.5.0

### Wave 2 (Rollback API Layer)
- [ ] api-gateway: v3.0.0 → v2.8.0

### Wave 3 (Backend - Optional)
- [ ] Keep backend if backward compatible
```

## Living Documentation

**Creates release-strategy.md**:

```markdown
# Release Strategy: {Product Name}

## Current Strategy
- Type: Multi-repo / Monorepo / Microservices
- Versioning: Semantic / Date-based
- Alignment: Lockstep / Independent / Umbrella
- RC Process: Pre-release tags / Channels

## Release Checklist
- [ ] All tests passing
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Git tag created
- [ ] GitHub release published
- [ ] Package published
- [ ] Documentation updated
```

## Integration with SpecWeave

```bash
# 1. Plan release increment
/sw:increment "0025-product-v3-release"

# 2. Execute wave-by-wave
/sw:do

# 3. Complete release
/sw:done 0025
```

## Best Practices

1. **Understand dependencies** before releasing
2. **Execute wave-by-wave** (never "big bang")
3. **Always use RC** for major versions
4. **Have rollback plan** ready
5. **Monitor 1+ hour** post-release
6. **Clean up RC tags** after promotion

## Related Skills

- `version-aligner` - Semver constraints, version conflict detection
