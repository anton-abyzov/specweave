# Azure DevOps Multi-Project Migration Guide

## Overview

This guide helps you migrate from single-project to multi-project Azure DevOps integration in SpecWeave. Whether you're scaling your organization or restructuring teams, this migration path ensures smooth transition without losing data.

## Migration Scenarios

### Scenario 1: Single Project → Project-per-team

**When to use**: Your organization is growing and each team needs its own ADO project.

**Before** (Single Project):
```
ADO: MyProduct (one project)
├── All Features
├── All User Stories
└── All Tasks

.specweave/docs/internal/specs/
├── spec-001-auth.md
├── spec-002-user.md
└── spec-003-payment.md
```

**After** (Multiple Projects):
```
ADO:
├── AuthService (project)
├── UserService (project)
└── PaymentService (project)

.specweave/docs/internal/specs/
├── AuthService/
│   └── spec-001-auth.md
├── UserService/
│   └── spec-002-user.md
└── PaymentService/
    └── spec-003-payment.md
```

### Scenario 2: Single Project → Area-path-based

**When to use**: Keep one ADO project but organize by area paths.

**Before**:
```
ADO: Platform (flat structure)
├── All work items
```

**After**:
```
ADO: Platform
├── Platform\Frontend
├── Platform\Backend
└── Platform\Mobile
```

### Scenario 3: Single Project → Team-based

**When to use**: Keep one ADO project but assign work to different teams.

## Step-by-Step Migration

### Step 1: Backup Current Configuration

```bash
# Backup .env file
cp .env .env.backup

# Backup specs
cp -r .specweave/docs/internal/specs .specweave/docs/internal/specs.backup

# Export current ADO work items (optional)
gh api repos/{owner}/{repo}/issues > ado-backup.json
```

### Step 2: Choose Your Strategy

Run the migration wizard:

```bash
specweave migrate-ado-strategy
```

You'll be prompted to choose:
1. **project-per-team** - Separate projects (recommended for 5+ teams)
2. **area-path-based** - One project, area paths (recommended for 3-5 teams)
3. **team-based** - One project, multiple teams (recommended for 2-3 teams)

### Step 3: Configure New Structure

#### For Project-per-team:

```bash
# The wizard will ask:
? Enter your ADO projects (comma-separated): AuthService,UserService,PaymentService,NotificationService

# This updates .env:
AZURE_DEVOPS_STRATEGY=project-per-team
AZURE_DEVOPS_PROJECTS=AuthService,UserService,PaymentService,NotificationService
```

#### For Area-path-based:

```bash
# The wizard will ask:
? Enter your ADO project name: Platform
? Enter area paths (comma-separated): Frontend,Backend,Mobile,DevOps

# This updates .env:
AZURE_DEVOPS_STRATEGY=area-path-based
AZURE_DEVOPS_PROJECT=Platform
AZURE_DEVOPS_AREA_PATHS=Frontend,Backend,Mobile,DevOps
```

#### For Team-based:

```bash
# The wizard will ask:
? Enter your ADO project name: MyProduct
? Enter team names (comma-separated): Alpha,Beta,Gamma

# This updates .env:
AZURE_DEVOPS_STRATEGY=team-based
AZURE_DEVOPS_PROJECT=MyProduct
AZURE_DEVOPS_TEAMS=Alpha,Beta,Gamma
```

### Step 4: Migrate Spec Files

The migration tool will analyze your existing specs and suggest project mappings:

```bash
specweave migrate-ado-specs
```

**Interactive Process**:
```
Analyzing spec-001-auth.md...
  Keywords found: authentication, oauth, jwt
  Suggested project: AuthService
  Accept? (Y/n): Y

Analyzing spec-002-user.md...
  Keywords found: profile, account, settings
  Suggested project: UserService
  Accept? (Y/n): Y

Migration Summary:
  ✅ 3 specs migrated
  📁 New structure created
  🔗 ADO links preserved
```

### Step 5: Create ADO Projects (if needed)

For project-per-team strategy, create the ADO projects:

```bash
# Using Azure CLI
az devops project create --name AuthService --org https://dev.azure.com/yourorg
az devops project create --name UserService --org https://dev.azure.com/yourorg
az devops project create --name PaymentService --org https://dev.azure.com/yourorg
```

Or use the SpecWeave command:
```bash
/specweave-ado:create-projects
```

### Step 6: Re-sync Specs to New Structure

After migration, sync your specs to the new ADO structure:

```bash
# Sync all specs
/specweave-ado:sync-all

# Or sync individually
/specweave-ado:sync-spec AuthService/spec-001
/specweave-ado:sync-spec UserService/spec-002
```

### Step 7: Verify Migration

```bash
# Check folder structure
ls -la .specweave/docs/internal/specs/

# Verify ADO links
/specweave-ado:status

# Test sync
/specweave-ado:sync-spec AuthService/spec-001 --dry-run
```

## Migration Patterns

### Pattern 1: Gradual Migration

Migrate one team at a time:

```bash
Week 1: Migrate AuthService specs
Week 2: Migrate UserService specs
Week 3: Migrate PaymentService specs
```

### Pattern 2: Big Bang Migration

Migrate everything at once (recommended for &lt;20 specs):

```bash
# Run full migration
specweave migrate-ado-full

# This will:
# 1. Analyze all specs
# 2. Create project folders
# 3. Move specs to correct folders
# 4. Update ADO links
# 5. Create new ADO projects (if needed)
```

### Pattern 3: Hybrid Approach

Keep some specs in root, migrate others:

```bash
.specweave/docs/internal/specs/
├── shared/                    # Cross-cutting specs
│   └── spec-099-security.md
├── AuthService/               # Team-specific
│   └── spec-001-auth.md
└── UserService/
    └── spec-002-user.md
```

## Handling Special Cases

### Multi-Project Specs

Specs that span multiple projects:

```yaml
---
id: spec-010
title: Checkout Flow
projects:
  primary: PaymentService
  secondary:
    - UserService
    - NotificationService
---
```

These will:
1. Live in primary project folder
2. Create Epic in primary ADO project
3. Create linked Features in secondary projects

### Legacy Work Items

Existing ADO work items will be:
1. Preserved with original IDs
2. Moved to new projects (if project-per-team)
3. Tagged with migration metadata

## Rollback Plan

If migration fails:

```bash
# Restore .env
cp .env.backup .env

# Restore specs
rm -rf .specweave/docs/internal/specs
mv .specweave/docs/internal/specs.backup .specweave/docs/internal/specs

# Re-sync with original structure
/specweave-ado:sync-all
```

## Common Issues and Solutions

### Issue 1: Project Detection Confidence Low

**Problem**: Specs don't clearly belong to any project.

**Solution**: Add explicit project in frontmatter:
```yaml
---
project: AuthService
---
```

### Issue 2: Duplicate Specs After Migration

**Problem**: Same spec appears in multiple projects.

**Solution**: Use deduplication command:
```bash
specweave dedupe-specs --strategy newest
```

### Issue 3: ADO Links Broken

**Problem**: Work item IDs changed after migration.

**Solution**: Run link repair:
```bash
/specweave-ado:repair-links
```

### Issue 4: Rate Limiting During Migration

**Problem**: ADO API rate limits hit.

**Solution**: Use batch mode:
```bash
specweave migrate-ado-specs --batch-size 10 --delay 5000
```

## Best Practices

### 1. Plan Your Structure

Before migrating, document your target structure:

```markdown
# Target ADO Structure

## Projects
- AuthService: Authentication, SSO, OAuth
- UserService: Profiles, preferences, accounts
- PaymentService: Billing, subscriptions, payments

## Keyword Mappings
AuthService: auth, login, oauth, jwt, sso
UserService: user, profile, account, settings
PaymentService: payment, billing, stripe, subscription
```

### 2. Test with One Spec First

```bash
# Test migration with one spec
specweave migrate-ado-spec spec-001 --dry-run

# If successful, proceed with all
specweave migrate-ado-specs
```

### 3. Communicate Changes

Notify your team:
- New ADO project URLs
- New folder structure
- New sync commands

### 4. Update CI/CD

Update your pipelines:
```yaml
# Before
- run: /specweave-ado:sync-spec spec-001

# After
- run: /specweave-ado:sync-spec AuthService/spec-001
```

### 5. Monitor After Migration

```bash
# Daily health check
specweave ado-health-check

# Weekly sync audit
specweave ado-sync-audit --days 7
```

## Migration Checklist

Before migration:
- [ ] Backup .env and specs
- [ ] Document target structure
- [ ] Get ADO project creation permissions
- [ ] Notify team of downtime

During migration:
- [ ] Run migration wizard
- [ ] Configure new strategy
- [ ] Migrate spec files
- [ ] Create ADO projects
- [ ] Re-sync all specs

After migration:
- [ ] Verify folder structure
- [ ] Test bidirectional sync
- [ ] Update documentation
- [ ] Update CI/CD pipelines
- [ ] Train team on new structure

## Support

### Getting Help

```bash
# Built-in help
specweave migrate-ado-strategy --help

# Check migration status
specweave migration-status

# Generate migration report
specweave migration-report > migration.md
```

### Troubleshooting

Enable debug logging:
```bash
DEBUG=specweave:ado:* specweave migrate-ado-specs
```

Check logs:
```bash
tail -f .specweave/logs/migration.log
```

### Resources

- [ADO Multi-Project Architecture](./ado-multi-project-architecture.md)
- [Project Detection Algorithm](./ado-project-detection.md)
- [Sync Strategies Comparison](./ado-sync-strategies.md)

## Summary

Migrating to multi-project ADO structure provides:
- ✅ Better organization and ownership
- ✅ Clearer team boundaries
- ✅ Improved access control
- ✅ Scalability for growth
- ✅ Easier reporting per team

The migration process is:
1. Non-destructive (backups preserved)
2. Reversible (rollback available)
3. Incremental (migrate gradually)
4. Validated (dry-run mode)

Expected timeline:
- Small org (&lt;20 specs): 1-2 hours
- Medium org (20-100 specs): 1 day
- Large org (100+ specs): 1 week (gradual)

---

**Last Updated**: 2025-11-11
**Version**: 1.0.0
**Feedback**: [GitHub Issues](https://github.com/specweave/specweave/issues)