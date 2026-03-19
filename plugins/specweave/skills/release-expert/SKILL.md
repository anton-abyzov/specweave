---
description: Multi-repo release expert - version alignment, semantic versioning, release coordination, dependency management, release waves, RC lifecycle (alpha/beta/rc), brownfield detection, rollback planning. Use for synchronized releases, version alignment, or release strategy.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
context: fork
---

# Release Expert

Multi-repo release orchestration, version alignment, RC lifecycle management, and release strategy.

## Core Capabilities

1. **Semantic versioning** enforcement and version bump suggestions
2. **Multi-repo version alignment** (lockstep/independent/umbrella strategies)
3. **Version conflict detection** and compatibility validation
4. **Release dependency management** and wave-based coordination
5. **RC lifecycle management** (alpha/beta/rc/final)
6. **Brownfield strategy detection** from existing projects
7. **Rollback planning** with reverse wave ordering
8. **Version matrix management** for umbrella releases

---

## Semantic Versioning (Semver)

**Format**: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

**Version Bump Rules**:
```yaml
MAJOR (1.0.0 -> 2.0.0):
  - Breaking changes (incompatible API)
  - Remove features
  - Change behavior of existing features
  Examples:
    - Remove deprecated endpoints
    - Change function signatures
    - Modify data formats

MINOR (1.0.0 -> 1.1.0):
  - New features (backward compatible)
  - Add endpoints/functions
  - Deprecate (but don't remove) features
  Examples:
    - Add new API endpoints
    - Add optional parameters
    - New module exports

PATCH (1.0.0 -> 1.0.1):
  - Bug fixes (no API changes)
  - Performance improvements
  - Documentation updates
  Examples:
    - Fix null pointer error
    - Optimize database query
    - Update README
```

**Pre-Release Tags**:
```yaml
Alpha: 1.0.0-alpha.1  # Early development (unstable)
Beta:  1.0.0-beta.1   # Feature complete (testing)
RC:    1.0.0-rc.1     # Release candidate (near production)
Final: 1.0.0          # Production release
```

---

## Version Alignment Strategies

### Lockstep Versioning (all repos share version)

```yaml
Strategy: Lockstep
When to Use: Tight coupling, small team, shared breaking changes

Current State:
  - frontend: v2.5.0
  - backend: v2.5.0
  - api: v2.5.0

Rules:
  - ALL repos MUST bump together
  - Use highest bump type (if any repo needs MAJOR, all bump MAJOR)
  - Version always stays in sync
```

### Independent Versioning (each repo has own version)

```yaml
Strategy: Independent
When to Use: Loose coupling, autonomous teams, frequent releases

Current State:
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0

Rules:
  - Each repo versions independently
  - Only bump repos with changes
  - Validate compatibility constraints
```

### Umbrella Versioning (product version + service versions)

```yaml
Strategy: Umbrella
When to Use: Product milestones, services evolve at different rates

Product: v5.0.0 (umbrella)
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0

Rules:
  - Product version bumps for milestones
  - Services version independently
  - Track matrix in release-strategy.md
```

---

## Conventional Commits Analysis

**Analyzes commits to suggest version bumps**:

```bash
# MAJOR (breaking change)
feat!: remove legacy authentication
BREAKING CHANGE: Old auth endpoints removed

# MINOR (new feature)
feat: add real-time notifications
feat(api): add WebSocket support

# PATCH (bug fix)
fix: prevent null pointer in user service
fix(ui): correct button alignment
perf: optimize database queries

# No version bump
docs: update README
chore: upgrade dependencies
style: format code
refactor: extract helper function
test: add unit tests
```

**Version Bump Calculation**:
```bash
# Example commit history
git log v2.5.0..HEAD --oneline

feat!: remove deprecated endpoints       # BREAKING
feat: add dark mode toggle               # FEATURE
fix: prevent crash on logout             # BUGFIX
docs: update API documentation           # NO BUMP

# Analysis: Breaking changes detected -> MAJOR bump
# Suggested: v2.5.0 -> v3.0.0
```

---

## Version Conflict Detection

### Dependency Version Conflicts

```yaml
# Scenario: Two services depend on different versions of shared-lib

service-a:
  package.json: "shared-lib": "^2.0.0"
  Currently using: v2.0.0

service-b:
  package.json: "shared-lib": "^1.5.0"
  Currently using: v1.8.0

Conflict:
  - service-a requires shared-lib v2.x (breaking changes)
  - service-b still on shared-lib v1.x (outdated)
  - Cannot release until service-b upgrades

Resolution:
  1. Update service-b to "shared-lib": "^2.0.0"
  2. Test service-b with shared-lib v2.0.0
  3. Release service-b
  4. Then proceed with coordinated release
```

### API Contract Version Conflicts

```yaml
# Scenario: Frontend expects API v3, but backend provides v2

frontend:
  api-client: v3.0.0
  Expects: POST /api/v3/users

backend:
  Current version: v2.8.0
  Provides: POST /api/v2/users

Conflict:
  - Frontend expects v3 API
  - Backend hasn't released v3 yet

Resolution:
  1. Release backend v3.0.0 first (Wave 1)
  2. Verify API v3 endpoints work
  3. Then release frontend v5.0.0 (Wave 2)
```

---

## Release Dependency Management

```yaml
# Build-time dependencies
shared-lib: v2.0.0
  - service-a: v3.1.0 (depends on shared-lib)
  - service-b: v2.5.0 (depends on shared-lib)

# Runtime dependencies
auth-service: v1.8.0
  - api-gateway: v2.0.0 (calls auth-service)
    - frontend: v3.2.0 (calls api-gateway)
```

**Release Order Calculation**:
1. Build dependency graph
2. Topological sort for correct order
3. Identify circular dependencies (error)
4. Generate release waves

---

## Release Waves

```markdown
### Wave 1 (Foundations)
- [ ] shared-lib: v2.0.0 -> v3.0.0
- [ ] database-migrations: v9 -> v10

### Wave 2 (Backend Services)
- [ ] auth-service: v1.8.0 -> v2.0.0 (depends: shared-lib v3.0.0)
- [ ] user-service: v1.5.0 -> v2.0.0 (depends: schema v10)

### Wave 3 (API Layer)
- [ ] api-gateway: v2.0.0 -> v3.0.0 (depends: auth-service v2.0.0)

### Wave 4 (Frontend)
- [ ] web-app: v3.2.0 -> v4.0.0 (depends: api-gateway v3.0.0)
```

---

## Release Candidate (RC) Lifecycle

### RC Workflow

```bash
# 1. Create RC
git tag -a v2.0.0-rc.1 -m "Release candidate 1"
npm version 2.0.0-rc.1

# 2. Deploy to staging
gh release create v2.0.0-rc.1 --prerelease

# 3. Testing phase (1-2 weeks)
# Bug found -> create v2.0.0-rc.2

# 4. Promote to final
git tag -a v2.0.0 -m "Production release"
npm version 2.0.0
gh release create v2.0.0  # NOT prerelease
```

### RC State Machine

```
DRAFT -> TESTING -> VALIDATED -> PROMOTED
           |            |
        FAILED       HOTFIX -> back to TESTING
```

### Tag Cleanup

```bash
# List RC tags
git tag -l "*-rc.*" | sort -V

# Delete old RC after promotion
git tag -d v2.0.0-rc.1 v2.0.0-rc.2
git push origin --delete v2.0.0-rc.1 v2.0.0-rc.2
```

---

## Pre-Release Validation

```bash
# 1. Version Compatibility
shared-lib v2.0.0 compatible with service-a v3.0.0
Database schema v10 required but only v9 deployed

# 2. CI/CD Status
All tests passing
Staging deployment status

# 3. Documentation
CHANGELOG.md updated
Migration guide present
```

---

## Rollback Coordination

```markdown
## Rollback: v3.0.0 -> v2.5.0 (Reverse wave order)

### Wave 1 (Rollback Frontend First)
- [ ] web-app: v4.0.0 -> v3.2.0
- [ ] mobile-app: v3.0.0 -> v2.5.0

### Wave 2 (Rollback API Layer)
- [ ] api-gateway: v3.0.0 -> v2.8.0

### Wave 3 (Backend - Optional)
- [ ] Keep backend if backward compatible
```

---

## Compatibility Validation

### Semver Range Checking

```typescript
// service-a/package.json
{
  "dependencies": {
    "shared-lib": "^2.0.0"  // Allows 2.0.0 to <3.0.0
  }
}

// Validation
shared-lib v2.0.0 -> Compatible
shared-lib v2.5.0 -> Compatible
shared-lib v2.9.9 -> Compatible
shared-lib v3.0.0 -> Incompatible (MAJOR change)
```

---

## Version Matrix Management

**Tracks versions for umbrella releases**:

```markdown
# Product Version Matrix

## v6.0.0 (Latest)
- frontend: v5.0.0
- backend: v2.9.0
- api-gateway: v4.0.0
- auth-service: v2.1.0
- shared-lib: v2.0.0
- database-schema: v12

## Compatibility Matrix

| Product | Frontend | Backend | API Gateway | Shared Lib | Schema |
|---------|----------|---------|-------------|------------|--------|
| v6.0.0  | v5.0.0   | v2.9.0  | v4.0.0      | v2.0.0     | v12    |
| v5.0.0  | v4.2.0   | v2.8.0  | v3.1.0      | v1.5.0     | v11    |

## Breaking Changes

### v6.0.0
- API Gateway v3 -> v4: Removed legacy /v2 endpoints
- Shared Lib v1 -> v2: Changed authentication interface
- Schema v11 -> v12: Added user_metadata table
```

---

## Brownfield Strategy Detection

**Analyzes existing projects to detect release patterns**:

- **Git**: Version tags, release branches
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Package Managers**: NPM, Python, Go
- **Monorepo Tools**: Lerna, Nx, Turborepo
- **Release Automation**: semantic-release, standard-version

---

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

---

## Integration with SpecWeave

```bash
# 1. Plan release increment
sw:increment "0025-product-v3-release"

# 2. Execute wave-by-wave
sw:do

# 3. Complete release
sw:done 0025
```

## Commands

- `sw-release:release-expert` - Full release orchestration and version alignment
- `sw-release:validate-versions` - Check compatibility
- `sw-release:bump <repo> <type>` - Bump specific repo
- `sw-release:matrix` - Show version matrix

---

## Best Practices

**Semver Discipline**:
- Never skip versions (v1.0.0 -> v1.1.0, not v1.0.0 -> v1.2.0)
- Use pre-release tags for testing (v1.0.0-rc.1)
- Document breaking changes clearly

**Dependency Management**:
- Pin major versions ("^2.0.0" not "*")
- Update dependencies regularly (avoid drift)
- Test compatibility before bumping

**Release Coordination**:
- Understand dependencies before releasing
- Execute wave-by-wave (never "big bang")
- Always use RC for major versions
- Have rollback plan ready
- Monitor 1+ hour post-release
- Clean up RC tags after promotion

**Version Matrix**:
- Update after every product release
- Link to ADRs for breaking changes
- Track deprecation timelines

**Automation**:
- Use conventional commits (enables automated analysis)
- Automate changelog generation
- Validate versions in CI/CD

---

## Output

**Creates/Updates**:
- `package.json` (version field)
- Git tags (v1.0.0, v2.0.0, etc.)
- `CHANGELOG.md` (release notes)
- `.specweave/docs/internal/delivery/version-matrix.md`
- Release strategy documentation

**Provides**:
- Version bump suggestions from commit analysis
- Compatibility validation reports
- Version conflict detection
- Release wave plans with dependency ordering
- Rollback coordination plans
- Version history and matrices

---

**Goal**: Consistent, predictable versioning and coordinated releases across all repositories with clear compatibility guarantees.
