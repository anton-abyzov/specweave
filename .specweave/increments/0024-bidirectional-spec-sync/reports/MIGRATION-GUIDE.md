# Migration Guide: Flexible Multi-Spec Architecture

## Overview

This guide explains how to migrate from the old single-spec architecture to the new flexible multi-spec system.

## What Changed?

### Old Architecture (v0.15.x)
- ✅ One spec per increment
- ✅ Sequential IDs only (spec-001, spec-002)
- ✅ Single GitHub repo
- ✅ Specs in flat folder: `.specweave/docs/internal/specs/spec-001.md`

### New Architecture (v0.16.0+)
- ✅ Multiple specs per increment (backend + frontend + mobile)
- ✅ Flexible IDs (JIRA-AUTH-123, user-login-ui, spec-001)
- ✅ Per-project GitHub repos
- ✅ Specs organized by project: `.specweave/docs/internal/specs/{project}/{spec-id}.md`

## Migration Steps

### Step 1: Update Configuration

Add `specs` section to `.specweave/config.json`:

```json
{
  "specs": {
    "identifierStrategy": "auto",
    "preferTitleSlug": true,
    "minSlugLength": 5,
    "projects": {
      "backend": {
        "id": "backend",
        "displayName": "Backend API",
        "description": "Backend services and APIs",
        "github": {
          "owner": "myorg",
          "repo": "backend-api"
        },
        "defaultLabels": ["backend", "api"],
        "team": "Backend Team",
        "syncEnabled": true
      },
      "frontend": {
        "id": "frontend",
        "displayName": "Frontend Web App",
        "description": "React web application",
        "github": {
          "owner": "myorg",
          "repo": "frontend-web"
        },
        "defaultLabels": ["frontend", "ui"],
        "team": "Frontend Team",
        "syncEnabled": true
      },
      "_parent": {
        "id": "_parent",
        "displayName": "Parent (Coordination)",
        "description": "Cross-project coordination specs",
        "github": null,
        "syncEnabled": false
      }
    }
  }
}
```

### Step 2: Reorganize Existing Specs

**Option A: Automatic (Recommended)**

Run build and use the detection system:

```bash
npm run build
node dist/src/cli/commands/detect-specs.js
```

**Option B: Manual**

1. Create project folders:

```bash
mkdir -p .specweave/docs/internal/specs/backend
mkdir -p .specweave/docs/internal/specs/frontend
mkdir -p .specweave/docs/internal/specs/mobile
mkdir -p .specweave/docs/internal/specs/_parent
```

2. Move specs to correct project folders:

```bash
# Backend specs
mv .specweave/docs/internal/specs/spec-001-user-auth.md \
   .specweave/docs/internal/specs/backend/

# Frontend specs
mv .specweave/docs/internal/specs/spec-002-login-ui.md \
   .specweave/docs/internal/specs/frontend/
```

3. Update frontmatter in each spec (optional - adds external ID):

```yaml
---
title: User Authentication System
project: backend
externalLinks:
  github:
    issueNumber: 42
    url: https://github.com/myorg/backend-api/issues/42
---
```

### Step 3: Update Existing Increments

For each incomplete increment, update the increment references:

1. Open increment spec.md
2. Add project references:

```markdown
# Increment 0024: Bidirectional Spec Sync

**Implements**:
- backend/JIRA-AUTH-123 (User Authentication Backend)
- frontend/user-login-ui (Login UI Component)

**Projects Affected**: backend, frontend
```

### Step 4: Sync to GitHub

After migration, sync all specs to their respective GitHub repos:

```bash
npm run build

# Sync all specs (auto-detects project repos)
find .specweave/docs/internal/specs -name "*.md" | while read spec; do
  node dist/src/cli/commands/sync-spec-content.js --spec "$spec" --provider github
done
```

## Brownfield Projects (With Existing JIRA/ADO)

### Importing from JIRA

If you already have JIRA epics, add them to spec frontmatter:

```yaml
---
title: User Authentication System
project: backend
externalLinks:
  jira:
    issueKey: AUTH-123
    url: https://mycompany.atlassian.net/browse/AUTH-123
---
```

The system will auto-detect this as `JIRA-AUTH-123` identifier.

### Importing from Azure DevOps

```yaml
---
title: Payment Processing
project: backend
externalLinks:
  ado:
    workItemId: 12345
    url: https://dev.azure.com/myorg/myproject/_workitems/edit/12345
---
```

The system will auto-detect this as `ADO-12345` identifier.

### Importing from GitHub

```yaml
---
title: Dark Mode Toggle
project: frontend
externalLinks:
  github:
    issueNumber: 456
    url: https://github.com/myorg/frontend-web/issues/456
---
```

The system will auto-detect this as `GH-456` identifier.

## Testing Migration

### 1. Verify Spec Detection

```bash
# Test spec detection for current increment
node dist/src/cli/commands/detect-specs.js

# Expected output:
{
  "specs": [
    {
      "identifier": {
        "full": "backend/JIRA-AUTH-123",
        "display": "JIRA-AUTH-123",
        "source": "external-jira",
        "compact": "BE-JIRA-AUTH-123"
      },
      "project": "backend",
      "syncEnabled": true
    }
  ],
  "isMultiSpec": false,
  "projects": ["backend"]
}
```

### 2. Verify Project Detection

```bash
# Test project detection
node dist/src/cli/commands/detect-project.js "Add user authentication API"

# Expected output:
{
  "project": "backend",
  "projectName": "Backend API",
  "confidence": 0.5
}
```

### 3. Verify GitHub Sync

```bash
# Test sync to GitHub (dry run)
node dist/src/cli/commands/sync-spec-content.js \
  --spec .specweave/docs/internal/specs/backend/JIRA-AUTH-123.md \
  --provider github \
  --dry-run

# Expected output:
📄 Parsed spec: BE-JIRA-AUTH-123
   Project: backend
   Auto-detected repo: myorg/backend-api

🔍 Dry run - would create issue:
   Title: [BE-JIRA-AUTH-123] User Authentication System
   Body: ...
```

## Common Patterns

### Pattern 1: Title-Based Slugs (Greenfield)

For new projects with no external tool, use descriptive slugs:

```
frontend/user-login-ui.md        → FE-user-login-ui
backend/user-authentication.md   → BE-user-authentication
mobile/dark-mode-toggle.md       → MB-dark-mode-toggle
```

### Pattern 2: JIRA Integration (Brownfield)

For existing JIRA projects:

```
backend/JIRA-AUTH-123.md  → BE-JIRA-AUTH-123
frontend/JIRA-UI-456.md   → FE-JIRA-UI-456
```

### Pattern 3: Sequential (Legacy Compatibility)

For compatibility with old system:

```
backend/spec-001.md   → BE-spec-001
frontend/spec-002.md  → FE-spec-002
```

### Pattern 4: Multi-Project Features

For features spanning multiple projects:

```
.specweave/docs/internal/specs/
├── backend/
│   └── user-auth-api.md            (BE-user-auth-api)
├── frontend/
│   └── user-auth-ui.md             (FE-user-auth-ui)
├── mobile/
│   └── user-auth-mobile.md         (MB-user-auth-mobile)
└── _parent/
    └── user-auth-overview.md       (PA-user-auth-overview, NOT synced)
```

The `_parent` spec provides coordination but is NOT synced to GitHub.

## Troubleshooting

### Issue: Specs not detected in increment

**Solution**: Add explicit references in increment spec.md:

```markdown
**Implements**:
- backend/user-auth-api (User Authentication API)
- frontend/user-auth-ui (User Authentication UI)
```

### Issue: GitHub sync fails with "No repository configured"

**Solution**: Add `specs.projects.{project}.github` to config.json:

```json
{
  "specs": {
    "projects": {
      "backend": {
        "github": {
          "owner": "myorg",
          "repo": "backend-api"
        }
      }
    }
  }
}
```

### Issue: Wrong project detected

**Solution**: Add keywords to project config:

```json
{
  "specs": {
    "projects": {
      "backend": {
        "keywords": ["api", "server", "database", "auth", "backend"]
      }
    }
  }
}
```

## Rollback

If you need to rollback to the old system:

1. Move specs back to flat folder:

```bash
find .specweave/docs/internal/specs -name "*.md" -exec mv {} .specweave/docs/internal/specs/ \;
rm -rf .specweave/docs/internal/specs/*/
```

2. Remove `specs` section from config.json

3. Downgrade to v0.15.x:

```bash
npm install -g specweave@0.15
```

## Next Steps

After migration:

1. Test increment planning: `/specweave:increment "New feature"`
2. Test multi-spec detection: Complete tasks and verify hook fires
3. Verify GitHub sync: Check issues created in correct repos
4. Update team documentation with new workflow

## Support

For questions or issues during migration:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Documentation: https://spec-weave.com/docs/migration

---

**Migration Version**: v0.16.0
**Last Updated**: 2025-11-12
