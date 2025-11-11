---
name: specweave-release:align
description: Align versions across multiple repositories according to release strategy. Analyzes conventional commits to suggest version bumps, detects version conflicts, validates cross-repo compatibility, and executes version alignment (updates package.json, creates git tags, updates changelogs). Supports lockstep, independent, and umbrella versioning strategies.
---

# /specweave-release:align - Align Repository Versions

Align versions across multiple repositories according to your release strategy.

## What This Command Does

1. **Analyzes Current Versions**: Reads current version from each repository
2. **Analyzes Commits**: Uses conventional commits to suggest version bumps
3. **Detects Conflicts**: Identifies version incompatibilities across repos
4. **Suggests Bumps**: Recommends new versions based on changes
5. **Validates Compatibility**: Ensures new versions are compatible
6. **Executes Alignment**: Updates versions, creates tags, updates changelogs

## Usage

```bash
# Interactive alignment (prompts for confirmation)
/specweave-release:align

# Align specific repositories only
/specweave-release:align --repos frontend,backend

# Dry run (show what would change, don't execute)
/specweave-release:align --dry-run

# Force alignment (skip validation)
/specweave-release:align --force

# Align for specific strategy
/specweave-release:align --strategy lockstep
/specweave-release:align --strategy independent
/specweave-release:align --strategy umbrella
```

## Workflow

### Step 1: Analyze Current State

```markdown
Scanning repositories...

frontend:
  Current: v4.2.0
  Location: ~/projects/myapp/frontend
  Git status: Clean ✓

backend:
  Current: v2.8.0
  Location: ~/projects/myapp/backend
  Git status: Clean ✓

api-gateway:
  Current: v3.1.0
  Location: ~/projects/myapp/api-gateway
  Git status: Uncommitted changes ✗

shared-lib:
  Current: v1.5.0
  Location: ~/projects/myapp/shared-lib
  Git status: Clean ✓

Blockers:
❌ api-gateway has uncommitted changes
   Action: Commit or stash changes before aligning

[Abort alignment]
```

### Step 2: Analyze Commits

```markdown
Analyzing commits since last release...

frontend (v4.2.0):
  Commits since v4.2.0: 18
  - Breaking changes: 1 (feat!: upgrade to React 18)
  - Features: 4
  - Bug fixes: 10
  - Other: 3 (docs, chore)

  Suggested: v5.0.0 (MAJOR)
  Rationale: Breaking change detected

backend (v2.8.0):
  Commits since v2.8.0: 12
  - Breaking changes: 0
  - Features: 3 (feat: add real-time notifications)
  - Bug fixes: 7
  - Other: 2

  Suggested: v2.9.0 (MINOR)
  Rationale: New features added

api-gateway (v3.1.0):
  Commits since v3.1.0: 22
  - Breaking changes: 2 (feat!: remove /v2 endpoints)
  - Features: 5
  - Bug fixes: 12
  - Other: 3

  Suggested: v4.0.0 (MAJOR)
  Rationale: Breaking changes detected

shared-lib (v1.5.0):
  Commits since v1.5.0: 3
  - Breaking changes: 0
  - Features: 0
  - Bug fixes: 3
  - Other: 0

  Suggested: v1.5.1 (PATCH)
  Rationale: Bug fixes only
```

### Step 3: Check Alignment Strategy

```markdown
Reading release strategy...
Location: .specweave/docs/internal/delivery/release-strategy.md

Strategy: Independent Versioning
- Each repository versions separately
- Only bump repos with changes
- Validate compatibility constraints

Applying strategy rules...
✓ frontend: Independent bump (v5.0.0)
✓ backend: Independent bump (v2.9.0)
✓ api-gateway: Independent bump (v4.0.0)
✓ shared-lib: Independent bump (v1.5.1)
```

### Step 4: Validate Compatibility

```markdown
Validating cross-repo compatibility...

Dependency Check 1: shared-lib versions
  frontend package.json: "shared-lib": "^1.5.0"
  Current shared-lib: v1.5.0
  Proposed shared-lib: v1.5.1
  Compatible? ✓ (within ^1.5.0 range)

Dependency Check 2: API versions
  frontend API client: Expects /api/v3
  api-gateway: Provides /api/v3, /api/v4 (removing /api/v2)
  Compatible? ✓ (v3 still supported)

Dependency Check 3: Database schema
  backend requires: Schema v12
  Current production: Schema v12
  Compatible? ✓

Overall: All compatibility checks passed ✓
```

### Step 5: Review and Confirm

```markdown
Proposed version alignment:

┌──────────────┬──────────┬──────────┬───────────────────────┐
│ Repository   │ Current  │ Proposed │ Reason                │
├──────────────┼──────────┼──────────┼───────────────────────┤
│ frontend     │ v4.2.0   │ v5.0.0   │ Breaking: React 18    │
│ backend      │ v2.8.0   │ v2.9.0   │ Feature: Notifications│
│ api-gateway  │ v3.1.0   │ v4.0.0   │ Breaking: Remove v2   │
│ shared-lib   │ v1.5.0   │ v1.5.1   │ Bug fixes             │
└──────────────┴──────────┴──────────┴───────────────────────┘

Breaking Changes Summary:
- frontend: React 16 → 18 (requires Node.js 18+)
- api-gateway: Removed /api/v2 endpoints (use /api/v3)

Actions to perform:
1. Update package.json versions
2. Create git tags
3. Update CHANGELOG.md files
4. Push tags to origin

? Proceed with alignment? [Yes / No / Edit]
```

### Step 6: Execute Alignment

```markdown
Executing version alignment...

frontend (v4.2.0 → v5.0.0):
  ✓ Updated package.json
  ✓ Generated CHANGELOG.md
  ✓ Created git tag v5.0.0
  ✓ Committed changes
  ✓ Pushed tag to origin

backend (v2.8.0 → v2.9.0):
  ✓ Updated package.json
  ✓ Generated CHANGELOG.md
  ✓ Created git tag v2.9.0
  ✓ Committed changes
  ✓ Pushed tag to origin

api-gateway (v3.1.0 → v4.0.0):
  ✓ Updated package.json
  ✓ Generated CHANGELOG.md
  ✓ Created git tag v4.0.0
  ✓ Committed changes
  ✓ Pushed tag to origin

shared-lib (v1.5.0 → v1.5.1):
  ✓ Updated package.json
  ✓ Generated CHANGELOG.md
  ✓ Created git tag v1.5.1
  ✓ Committed changes
  ✓ Pushed tag to origin

Version alignment complete! ✓

Next steps:
1. Create release increment: /specweave:increment "0080-product-v5-release"
2. Or trigger CI/CD: Git tags will trigger automated releases
3. Monitor: Check CI/CD pipelines for build/test/publish
```

## Alignment Strategies

### Lockstep Versioning

**All repos share same version**:

```markdown
Strategy: Lockstep

Current State:
  - frontend: v2.5.0
  - backend: v2.5.0
  - api: v2.5.0

Analysis:
  - frontend: Breaking change detected
  - backend: Bug fix
  - api: No changes

Alignment Rule: Use highest bump type (MAJOR)

Proposed:
  - frontend: v3.0.0 (breaking)
  - backend: v3.0.0 (forced, no changes)
  - api: v3.0.0 (forced, no changes)

⚠️  Warning: backend and api have no changes but must bump for lockstep
```

### Independent Versioning

**Each repo versions separately**:

```markdown
Strategy: Independent

Current State:
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0

Analysis:
  - frontend: Breaking change
  - backend: New feature
  - api: Bug fix

Alignment Rule: Bump each independently

Proposed:
  - frontend: v5.0.0 (major)
  - backend: v2.9.0 (minor)
  - api: v3.1.1 (patch)

✓ Each repo versions at its own pace
```

### Umbrella Versioning

**Product version spans service versions**:

```markdown
Strategy: Umbrella

Current Product: v4.0.0
  - frontend: v4.2.0
  - backend: v2.8.0
  - api: v3.1.0

Analysis:
  - frontend: Breaking change (React 18)
  - backend: New feature (notifications)
  - api: Breaking change (remove v2)

Alignment Rule: Product major bump (any service has breaking)

Proposed Product: v5.0.0
  - frontend: v5.0.0
  - backend: v2.9.0
  - api: v4.0.0

Updated Version Matrix:
  Product v5.0.0 = {frontend: v5.0.0, backend: v2.9.0, api: v4.0.0}
```

## Version Conflict Detection

**Example: Dependency Version Mismatch**

```markdown
Validating compatibility...

❌ Conflict detected!

service-a:
  package.json: "shared-lib": "^2.0.0"
  Requires: shared-lib v2.x

service-b:
  package.json: "shared-lib": "^1.5.0"
  Requires: shared-lib v1.x

Current:
  shared-lib: v2.0.0

Problem:
  service-b is incompatible with shared-lib v2.0.0
  (requires v1.x, but v2.0.0 has breaking changes)

Resolution Options:
  1. Update service-b to use "shared-lib": "^2.0.0"
  2. Test service-b with shared-lib v2.0.0
  3. Fix any breaking changes
  4. Then retry alignment

[Abort alignment]
```

## Conventional Commits

**This command relies on conventional commits**:

```bash
# Breaking change (MAJOR bump)
feat!: upgrade to React 18
BREAKING CHANGE: Requires Node.js 18+

# Feature (MINOR bump)
feat: add real-time notifications
feat(api): add WebSocket support

# Bug fix (PATCH bump)
fix: prevent null pointer in user service
fix(ui): correct button alignment

# No version bump
docs: update README
chore: upgrade dependencies
style: format code
refactor: extract helper function
test: add unit tests
```

**Commit Analysis**:
- Scans commits: `git log <last-tag>..HEAD`
- Parses commit messages
- Categorizes: breaking / feature / fix / other
- Suggests bump: MAJOR / MINOR / PATCH

## Integration with Release Strategy

**Reads strategy from**:
```
.specweave/docs/internal/delivery/release-strategy.md
```

**Uses strategy to**:
- Determine alignment approach (lockstep/independent/umbrella)
- Apply version bump rules
- Validate compatibility constraints
- Generate appropriate documentation

## Multi-Project Support

**For multi-project setups**:

```bash
# Align versions within a specific project
/specweave-release:align --project frontend-team

# Align across all projects
/specweave-release:align --all-projects

# Align specific project's repos only
/specweave-release:align --project backend-team --repos api,database
```

## Best Practices

**Before Aligning**:
- Ensure all repos are clean (no uncommitted changes)
- Pull latest changes from origin
- Review conventional commits
- Check release strategy is up-to-date

**During Alignment**:
- Use dry-run first to preview changes
- Review version bumps carefully
- Validate compatibility thoroughly
- Document breaking changes

**After Alignment**:
- Monitor CI/CD pipelines
- Create release increment
- Update living docs
- Notify team of new versions

## Example Interactions

### Lockstep Alignment

```bash
User: /specweave-release:align --strategy lockstep

Release Manager: Analyzing repositories with lockstep strategy...

Current State:
  - service-a: v2.5.0
  - service-b: v2.5.0
  - service-c: v2.5.0

Commit Analysis:
  - service-a: Breaking change detected
  - service-b: Bug fix only
  - service-c: No changes

Lockstep Rule: All repos must bump together (use highest: MAJOR)

Proposed:
  - service-a: v3.0.0 (breaking change)
  - service-b: v3.0.0 (forced, for alignment)
  - service-c: v3.0.0 (forced, for alignment)

⚠️  Note: service-b and service-c have no changes but must bump for lockstep

? Proceed? [Yes / No]
```

### Independent Alignment with Conflict

```bash
User: /specweave-release:align

Release Manager: Analyzing repositories with independent strategy...

...

Validating compatibility...

❌ Conflict detected!

frontend requires: api-client v4.0.0
api-gateway provides: v3.1.0 (proposed bump to v3.1.1)

Problem: Frontend expects v4 API, but gateway hasn't released v4 yet

Resolution:
  Option 1: Release api-gateway v4.0.0 first (breaking changes)
  Option 2: Update frontend to use api-client v3.x (delay v4 features)
  Option 3: Coordinate release (release gateway v4 with frontend v5)

Recommendation: Option 3 (coordinated release)

Would you like me to create a coordinated release increment?
```

## Related Commands

- `/specweave-release:init` - Initialize release strategy
- `/specweave-release:rc` - Create release candidates for aligned versions
- `/specweave-release:coordinate` - Plan coordinated multi-repo release
- `/specweave-release:publish` - Execute release after alignment

## Dependencies

**Required**:
- Git (version control)
- Release strategy document

**Optional**:
- NPM (`npm version`) - Automated versioning
- Conventional Commits - Commit analysis
- Semantic Release - Automation integration

---

**Use this command** to ensure version consistency across repositories while following your project's release strategy.
