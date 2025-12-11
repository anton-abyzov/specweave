---
name: specweave-release:init
description: Initialize or analyze release strategy for the project. For new projects, recommends optimal release approach based on architecture, team size, and deployment frequency. For brownfield projects, detects existing release patterns from git history, CI/CD configs, and package managers, then documents the strategy. Creates release-strategy.md in living docs with comprehensive release process documentation.
---

# /specweave-release:init - Initialize Release Strategy

Initialize or analyze the release strategy for your project.

## What This Command Does

**For New Projects (Greenfield)**:
1. Analyzes project architecture (single-repo, multi-repo, monorepo)
2. Asks about team size, deployment frequency, coupling between services
3. Recommends optimal release strategy (lockstep, independent, umbrella)
4. Creates `.specweave/docs/internal/delivery/release-strategy.md`
5. Suggests CI/CD automation opportunities

**For Existing Projects (Brownfield)**:
1. Scans git history for version tags and patterns
2. Analyzes CI/CD configurations (.github/workflows/, .gitlab-ci.yml, etc.)
3. Checks package manager files (package.json, setup.py, pom.xml, etc.)
4. Detects monorepo tools (Lerna, Nx, Turborepo, Changesets)
5. Documents existing strategy in living docs
6. Suggests improvements and best practices

## Usage

```bash
# Interactive analysis and recommendation
/specweave-release:init

# Force re-analysis (overwrite existing strategy)
/specweave-release:init --force

# Quick analysis (no interactive prompts, use defaults)
/specweave-release:init --quick
```

## Workflow

### Greenfield Projects

```markdown
1. Project Structure Analysis
   → Detect repositories (scan for .git/)
   → Count services/packages
   → Identify architecture pattern

2. Interactive Questionnaire
   ? How many repositories? [1 / 2-5 / 5+]
   ? Team structure? [One team / Per-service teams / Mixed]
   ? Deployment frequency? [Daily / Weekly / Monthly / Ad-hoc]
   ? Coupling between services? [Tight / Moderate / Loose]
   ? Planning to use RC workflow? [Yes / No / For major versions only]

3. Strategy Recommendation
   Based on your answers:
   → Recommended: Umbrella Versioning
   → Rationale: Medium-sized team, weekly releases, moderate coupling
   → RC workflow: For major versions (breaking changes)

4. Documentation Creation
   → Create: .specweave/docs/internal/delivery/release-strategy.md
   → Include: Versioning approach, RC workflow, CI/CD integration
   → Add: Release checklist, rollback procedures

5. Next Steps Guidance
   → Set up CI/CD automation (GitHub Actions template provided)
   → Configure semantic-release or Changesets
   → Define release waves (dependency order)
   → Create first release increment: /specweave:increment "0001-v1-release"
```

### Brownfield Projects

```markdown
1. Git History Scan
   → Analyzing tags: git tag --list
   → Found: 45 tags (v1.0.0, v1.1.0, ..., v3.2.0)
   → Pattern: Semantic versioning ✓
   → RC usage: Detected for major versions (v2.0.0-rc.1, v3.0.0-rc.1)
   → Cadence: ~1 release per week

2. CI/CD Detection
   → Found: .github/workflows/release.yml
   → Tool: semantic-release ✓
   → Triggers: Push to main with version tags
   → Actions: Build → Test → Publish to NPM → Create GitHub Release

3. Package Manager Analysis
   → Found: package.json (NPM project)
   → Current version: 3.2.0 (matches git tag ✓)
   → Scripts: npm version, npm publish ✓
   → Dependencies: 25 packages

4. Monorepo Detection (if applicable)
   → Found: lerna.json
   → Mode: independent (packages version separately)
   → Packages: 12
   → Tool: Lerna v7.4.0

5. Strategy Classification
   Current Strategy:
   → Type: Monorepo with independent versioning
   → Tool: Lerna + semantic-release
   → RC: For major versions only
   → Frequency: Weekly
   → Automation: High (GitHub Actions)

6. Documentation Creation
   → Create: .specweave/docs/internal/delivery/release-strategy.md
   → Document: Existing process, tools, patterns
   → Add: Version matrix (for umbrella releases if applicable)

7. Improvement Suggestions
   Recommendations:
   ✓ Current strategy is solid
   → Consider: Changesets for better changelog management
   → Consider: Umbrella versioning for product milestones
   → Add: Version matrix documentation (.specweave/docs/internal/delivery/version-matrix.md)
   → Enhance: RC workflow with canary deployments
```

## What Gets Created

**File**: `.specweave/docs/internal/delivery/release-strategy.md`

**Structure**:
```markdown
# Release Strategy: {Project Name}

## Overview
- Repository Type: Single-repo / Multi-repo / Monorepo
- Versioning Strategy: Lockstep / Independent / Umbrella
- RC Workflow: Yes / No / Major versions only
- Release Frequency: Daily / Weekly / Monthly
- Automation Level: Manual / Semi-automated / Fully automated

## Repositories
| Repo | Purpose | Current Version | Frequency |
|------|---------|----------------|-----------|
| frontend | User interface | v5.2.0 | Weekly |
| backend | API server | v3.8.0 | Bi-weekly |
| shared-lib | Shared utilities | v2.1.0 | Monthly |

## Version Alignment
- **Major versions**: Coordinated (breaking changes affect all)
- **Minor versions**: Independent (services evolve separately)
- **Patch versions**: Independent (bug fixes as needed)

## Release Candidate Workflow
1. Create RC tag: v{major}.{minor}.{patch}-rc.1
2. Deploy to staging environment
3. Run validation tests (unit + integration + E2E + performance)
4. Testing phase: 1-2 weeks
5. Bug fixes → Iterate to rc.2, rc.3, ...
6. All tests pass → Promote to production: v{major}.{minor}.{patch}
7. Gradual rollout: 10% → 25% → 50% → 100%

## CI/CD Integration
- **Tool**: GitHub Actions / GitLab CI / Jenkins / CircleCI
- **Trigger**: Push tags matching v*.*.* pattern
- **Workflow**:
  1. Build: Compile, bundle, create artifacts
  2. Test: Run all automated tests
  3. Publish: NPM / PyPI / Docker Registry / Maven Central
  4. Release: Create GitHub/GitLab release with changelog
  5. Deploy: Push to staging/production (Kubernetes/AWS/etc.)

## Changelog Management
- **Tool**: Conventional Changelog / Keep a Changelog / semantic-release
- **Format**: CHANGELOG.md (root or per-package)
- **Automation**: Generate from conventional commits
- **Manual curation**: For major releases (highlight key features)

## Hotfix Strategy
- **Branch**: hotfix/* from production tag
- **Version**: Patch bump (v1.0.1)
- **Process**:
  1. Branch from production tag (v1.0.0)
  2. Fix bug
  3. Fast-track testing (critical tests only)
  4. Tag hotfix version (v1.0.1)
  5. Deploy immediately
  6. Merge back to main branch

## Release Checklist
### Pre-Release
- [ ] All tests passing (unit + integration + E2E)
- [ ] Changelog updated
- [ ] Version bumped (package.json, etc.)
- [ ] Breaking changes documented
- [ ] Migration guide written (if applicable)
- [ ] Performance benchmarks met
- [ ] Security scan clean

### Release Execution
- [ ] Git tag created
- [ ] CI/CD pipeline triggered
- [ ] Build successful
- [ ] Tests passed
- [ ] Package published (NPM/PyPI/Docker)
- [ ] GitHub release created
- [ ] Deployment successful

### Post-Release
- [ ] Smoke tests passed
- [ ] Monitoring for 1+ hour
- [ ] No increase in error rate
- [ ] Performance stable
- [ ] Documentation updated
- [ ] Living docs synced
- [ ] Stakeholders notified

## Rollback Procedures
- **Detection**: Error rate > 5%, latency > 2x baseline, critical bugs
- **Execution**:
  1. Kubernetes: kubectl rollout undo
  2. Docker: Deploy previous image tag
  3. Verify: Health checks passing
  4. Monitor: Error rate back to baseline
- **Communication**: Notify team, update incident channel
- **Follow-up**: Root cause analysis, postmortem

## DORA Metrics
- **Deployment Frequency**: {weekly / daily / monthly}
- **Lead Time for Changes**: {target: <1 day}
- **Mean Time to Recovery (MTTR)**: {target: <1 hour}
- **Change Failure Rate**: {target: <5%}

## Decision History
- 2025-01-15: Adopted umbrella versioning (ADR-023)
- 2025-02-01: Introduced RC workflow for majors (ADR-025)
- 2025-03-10: Migrated to semantic-release (ADR-028)

## Related Documentation
- Version Matrix: .specweave/docs/internal/delivery/version-matrix.md
- ADRs: .specweave/docs/internal/architecture/adr/
- CI/CD Configs: .github/workflows/release.yml
```

## Multi-Project Support

**For multi-project setups**, the strategy can be project-specific:

```
.specweave/docs/internal/projects/frontend/delivery/release-strategy.md
.specweave/docs/internal/projects/backend/delivery/release-strategy.md
.specweave/docs/internal/projects/mobile/delivery/release-strategy.md
```

Or cross-project if all projects share the same strategy:

```
.specweave/docs/internal/delivery/release-strategy.md
```

## Integration with SpecWeave

**After initialization**:

1. **Create first release increment**:
   ```bash
   /specweave:increment "0001-v1-0-0-release"
   ```

2. **Align versions** (for multi-repo):
   ```bash
   /specweave-release:align
   ```

3. **Create RC** (for major versions):
   ```bash
   /specweave-release:rc create 1.0.0
   ```

4. **Execute release**:
   ```bash
   /specweave:do
   ```

5. **Complete release**:
   ```bash
   /specweave:done 0001
   ```

## Brownfield Integration

**This command integrates with brownfield-analyzer skill**:

```bash
# If brownfield-analyzer already ran:
# → Uses detected patterns
# → Validates findings
# → Enhances documentation

# If not yet analyzed:
# → Triggers brownfield-analyzer
# → Detects release patterns
# → Documents strategy
```

## Best Practices

**Documentation**:
- Keep release-strategy.md up-to-date
- Document lessons learned after each release
- Link to ADRs for major decisions
- Update when process changes

**Versioning**:
- Always follow semantic versioning
- Use RC for major versions
- Document breaking changes clearly
- Maintain version matrix for umbrella releases

**Automation**:
- Automate as much as possible (CI/CD)
- Use conventional commits (enables automated changelogs)
- Validate releases in CI/CD pipeline
- Monitor releases automatically

**Communication**:
- Notify team before releases
- Document rollback procedures
- Track DORA metrics
- Share postmortems

## Example Interactions

### Greenfield Project

```bash
User: /specweave-release:init

Release Manager: I'll help you set up your release strategy.

1. Analyzing project structure...
   ✓ Detected: Single repository
   ✓ Package: myapp (NPM)
   ✓ No monorepo tools detected

2. Let me ask a few questions:

   ? Deployment frequency? [Weekly]
   ? Planning to use RC workflow? [For major versions only]
   ? CI/CD platform? [GitHub Actions]

3. Recommendation:
   → Strategy: Simple Semantic Versioning
   → RC: For major versions (breaking changes)
   → Automation: GitHub Actions + semantic-release

4. Creating documentation...
   ✓ Created: .specweave/docs/internal/delivery/release-strategy.md

5. Next steps:
   - Set up GitHub Actions workflow
   - Configure semantic-release
   - Create first release: /specweave:increment "0001-v1-0-0-release"

Would you like me to create a GitHub Actions workflow template?
```

### Brownfield Project

```bash
User: /specweave-release:init

Release Manager: I'll analyze your existing release process.

1. Scanning git history...
   ✓ Found 45 tags (v1.0.0 to v3.2.0)
   ✓ Pattern: Semantic versioning
   ✓ RC usage: For major versions (v2.0.0-rc.1, v3.0.0-rc.1)

2. Analyzing CI/CD...
   ✓ Found: .github/workflows/release.yml
   ✓ Tool: semantic-release
   ✓ Automation: High

3. Checking package managers...
   ✓ Found: lerna.json (12 packages)
   ✓ Mode: independent versioning
   ✓ Tool: Lerna v7.4.0

4. Current Strategy Classification:
   → Type: Monorepo with independent versioning
   → RC: For major versions
   → Frequency: Weekly
   → Automation: High

5. Creating documentation...
   ✓ Created: .specweave/docs/internal/delivery/release-strategy.md
   ✓ Documented: Existing process
   ✓ Added: Improvement recommendations

6. Recommendations:
   ✓ Current strategy is solid
   → Consider: Umbrella versioning for product milestones
   → Add: Version matrix documentation
   → Enhance: RC workflow with canary deployments

Would you like me to create version matrix documentation?
```

## Related Commands

- `/specweave-release:align` - Align versions across repos
- `/specweave-release:rc` - Manage release candidates
- `/specweave-release:coordinate` - Plan multi-repo releases
- `/specweave-release:publish` - Execute releases
- `/specweave:increment` - Create release increment

## Dependencies

**Required**:
- Git (version control)
- SpecWeave core (living docs)

**Optional**:
- GitHub CLI (`gh`) - GitHub integration
- NPM (`npm`) - NPM projects
- Lerna (`lerna`) - Monorepo detection
- Semantic Release - Automation detection

---

**Use this command** as the first step in establishing a clear, documented, repeatable release process for your project.
