# Multi-Project Migration Guide

**Purpose**: Step-by-step guide for migrating from single-project to multi-project mode in SpecWeave.

---

## When to Migrate

**Stay in single-project mode if:**
- You have ONE application/service in your repository
- All increments relate to the same project
- Team size < 5 developers

**Migrate to multi-project mode if:**
- You have 5+ services or applications
- Multiple teams work on different projects in same repository
- You need to sync different projects to different JIRA boards or ADO area paths

---

## Pre-Migration Checklist

Before running `/specweave:enable-multiproject`, verify:

- [ ] **All increments closed or paused** - Active work should be saved first
- [ ] **Git committed** - Backup current state before migration
- [ ] **Config backup** - Copy `.specweave/config.json` to safe location
- [ ] **Team notified** - If shared repository, inform team of mode change

**Backup command**:
```bash
cp .specweave/config.json .specweave/config.json.backup-$(date +%s)
git add . && git commit -m "chore: backup before multi-project migration"
```

---

## Migration Process

### Step 1: Verify Current State

Check your current configuration:

```bash
cat .specweave/config.json | jq '{
  projectName: .project.name,
  multiProjectEnabled: .multiProject.enabled,
  projectCount: (.multiProject.projects | length // 0)
}'
```

**Expected output (single-project)**:
```json
{
  "projectName": "my-app",
  "multiProjectEnabled": false,
  "projectCount": 0
}
```

### Step 2: Run Migration Command

```bash
claude  # Start Claude Code

# Then in Claude:
/specweave:enable-multiproject
```

**Confirmation prompt appears**:
```
⚠️  Multi-Project Mode

You are about to enable multi-project mode. This is a significant change:

Current setup (single-project):
  • One project: "my-app"
  • All increments go to same folder
  • Simple, focused workflow

After enabling (multi-project):
  • Multiple projects supported
  • Increments require project: field
  • More complex, but scales better

Continue? (y/N)
```

Type `y` and press Enter.

### Step 3: Verify Migration Result

**Check config structure**:
```bash
cat .specweave/config.json | jq '.multiProject'
```

**Expected output**:
```json
{
  "enabled": true,
  "activeProject": "my-app",
  "projects": {
    "my-app": {
      "id": "my-app",
      "name": "My App",
      "description": "...",
      "techStack": [...]
    }
  }
}
```

**Check project folder created**:
```bash
ls -la .specweave/docs/internal/specs/
# Should show: my-app/
```

**Check increments updated**:
```bash
grep -r "^project:" .specweave/increments/*/spec.md | head -3
# Output: .specweave/increments/0001-feature/spec.md:project: my-app
```

### Step 4: Test Basic Operations

**Create new increment** (should require project field):
```bash
/specweave:increment "Test multi-project feature"
```

**Switch active project** (should work):
```bash
/specweave:switch-project
```

---

## Post-Migration Configuration

### Adding Additional Projects

**Option 1: Manual (config.json)**

Edit `.specweave/config.json`:
```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "frontend-app",
    "projects": {
      "frontend-app": { ... },
      "backend-api": {
        "id": "backend-api",
        "name": "Backend API",
        "description": "REST API Service",
        "techStack": ["Node.js", "Express", "PostgreSQL"],
        "externalTools": {
          "github": {
            "repository": "my-org/backend-api"
          }
        }
      }
    }
  }
}
```

**Option 2: CLI Helper** (TODO: not yet implemented in v0.34.0):
```bash
specweave project add backend-api \
  --name "Backend API" \
  --tech-stack "Node.js,Express,PostgreSQL"
```

### Creating Project Folders

After adding projects to config, create folders manually:
```bash
mkdir -p .specweave/docs/internal/specs/backend-api
```

Or let living docs sync create them automatically on next `/specweave:sync-specs`.

### Mapping to External Tools

**GitHub** (multiple repos):
```json
{
  "projects": {
    "frontend-app": {
      "externalTools": {
        "github": {
          "repository": "my-org/frontend"
        }
      }
    },
    "backend-api": {
      "externalTools": {
        "github": {
          "repository": "my-org/backend"
        }
      }
    }
  }
}
```

**JIRA** (multiple boards):
```json
{
  "projects": {
    "frontend-app": {
      "externalTools": {
        "jira": {
          "boardId": "12345",
          "boardName": "Frontend Team"
        }
      }
    }
  }
}
```

**Azure DevOps** (area paths):
```json
{
  "projects": {
    "service-a": {
      "externalTools": {
        "ado": {
          "areaPath": "MyProject\\ServiceA"
        }
      }
    }
  }
}
```

---

## Common Migration Scenarios

### Scenario 1: Monorepo with 3 Services

**Before**:
```json
{
  "project": {
    "name": "monorepo"
  },
  "multiProject": { "enabled": false }
}
```

**After** (migration + manual config):
```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "frontend",
    "projects": {
      "frontend": {
        "name": "Frontend",
        "techStack": ["React", "TypeScript"]
      },
      "backend": {
        "name": "Backend API",
        "techStack": ["Node.js", "Express"]
      },
      "admin": {
        "name": "Admin Dashboard",
        "techStack": ["Vue", "TypeScript"]
      }
    }
  }
}
```

### Scenario 2: Migrating Existing Increments to Different Projects

If you have existing increments that should belong to different projects:

**Before migration**, manually update spec.md frontmatter:
```yaml
---
increment: 0050-admin-feature
project: admin  # Explicitly set BEFORE migration
---
```

**During migration**, the command respects existing `project:` fields.

---

## Troubleshooting

### Problem: "Already multi-project enabled"

**Cause**: Config already has `multiProject.enabled = true`

**Solution**: You're already in multi-project mode! No migration needed.

```bash
# Check current state:
cat .specweave/config.json | jq '.multiProject.enabled'
# Output: true
```

### Problem: "Project folders created for examples (MyApp, frontend-app)"

**Cause**: Old bug from v0.33.x and earlier where init created multi-project configs by default

**Solution**: Automatic migration already ran. Check migration log:
```bash
cat .specweave/logs/migration.log
# Look for: "Auto-migrated to single-project mode (found 1 project)"
```

**Cleanup unwanted folders**:
```bash
# Remove example project folders
rm -rf .specweave/docs/internal/specs/MyApp*
rm -rf .specweave/docs/internal/specs/frontend-app
rm -rf .specweave/docs/internal/specs/backend-api

# Keep only your actual project folder
ls .specweave/docs/internal/specs/
# Should show: my-app/  (or your project name)
```

### Problem: "Increments missing project: field after migration"

**Cause**: Migration only updates increments WITHOUT existing `project:` field

**Solution**: Run migration again OR manually add `project:` to spec.md:

```bash
# Find increments without project field:
grep -L "^project:" .specweave/increments/*/spec.md

# Manually add to each spec.md frontmatter:
---
increment: 0001-feature
project: my-app  # ← Add this line
---
```

### Problem: "Hook blocks spec.md with 'project: field required'"

**Cause**: Multi-project mode validation is now active

**Solution**: Every new increment MUST have `project:` field in spec.md:

```yaml
---
increment: 0099-new-feature
project: frontend-app  # ← REQUIRED in multi-project mode
---
```

**Bypass** (temporary, for migration cleanup only):
```bash
export SPECWEAVE_FORCE_PROJECT=1  # Disables project validation
```

### Problem: "Living docs sync creates files in wrong project folder"

**Cause**: Increment spec.md has incorrect `project:` value

**Solution**: Update spec.md frontmatter with correct project ID:

```yaml
# WRONG:
project: wrong-name

# CORRECT (must match config.json project key):
project: frontend-app
```

**Verify valid project IDs**:
```bash
cat .specweave/config.json | jq -r '.multiProject.projects | keys[]'
# Output:
# frontend-app
# backend-api
```

---

## Rollback Procedure

If migration causes issues, you can rollback:

### Step 1: Restore Config Backup

```bash
# Find your backup:
ls -lah .specweave/config.json.backup-*

# Restore (replace with your timestamp):
cp .specweave/config.json.backup-1734700000 .specweave/config.json
```

### Step 2: Remove Project Folders (Optional)

```bash
# If multi-project folders were created:
rm -rf .specweave/docs/internal/specs/*/
```

### Step 3: Revert Increment Updates (If Needed)

```bash
# Use git to restore increments:
git checkout .specweave/increments/
```

### Step 4: Verify Rollback

```bash
cat .specweave/config.json | jq '.multiProject.enabled'
# Should output: false
```

---

## Best Practices

### 1. Project Naming

**Use kebab-case** for project IDs:
```
✅ frontend-app
✅ backend-api
✅ mobile-ios
❌ Frontend App  (spaces)
❌ backend_API   (mixed case + underscore)
```

### 2. Project Structure

**Keep projects aligned with deployment units**:
```
Project = Independently deployable service/application
NOT Project = feature area or team
```

**Example** (Good):
```
projects:
  - web-app        (deployed to Vercel)
  - rest-api       (deployed to AWS Lambda)
  - mobile-app     (deployed to App Store)
```

**Example** (Bad):
```
projects:
  - frontend-team  ❌ (team, not deployment unit)
  - user-features  ❌ (feature area, not service)
```

### 3. Active Project Switching

**Switch project BEFORE starting new increment**:
```bash
/specweave:switch-project    # Select target project
/specweave:increment "new"   # Increment uses active project
```

### 4. External Tool Mapping

**Map BEFORE creating increments** for that project:
```json
{
  "projects": {
    "backend-api": {
      "externalTools": {
        "github": { "repository": "org/backend" }
      }
    }
  }
}
```

Then increments auto-sync to correct GitHub repo.

---

## Related Documentation

- [CLAUDE.md Section 2h](../../../CLAUDE.md#2h-single-project-first-architecture-v0340) - Architecture principles
- [spec-project-validator.sh](../../../../plugins/specweave/hooks/spec-project-validator.sh) - Validation hook
- [project-folder-guard.sh](../../../../plugins/specweave/hooks/project-folder-guard.sh) - Folder protection hook

---

## Summary

**Single-Project → Multi-Project Migration**:
1. Backup config (`config.json.backup`)
2. Run `/specweave:enable-multiproject`
3. Confirm migration
4. Verify config, folders, increments
5. Add additional projects (if needed)
6. Map to external tools (GitHub/JIRA/ADO)

**Key Points**:
- Migration is **one-way** (rollback requires git restore)
- All future increments **require `project:` field**
- Living docs automatically distribute by project
- External sync respects per-project mappings

**Need Help?** Check troubleshooting section or [join Discord](https://discord.gg/UYg4BGJ65V).
