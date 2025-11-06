---
name: specweave:init-multiproject
description: Initialize multi-project mode for SpecWeave. Enables organizing specs, modules, and team docs by project/team. Auto-migrates existing specs/ to projects/default/.
---

# Initialize Multi-Project Mode

Enable multi-project mode to organize documentation by project or team.

## What This Does

1. **Auto-migrates** existing `specs/` to `projects/default/specs/` (transparent, no behavior change)
2. **Enables multi-project mode** in config (optional)
3. **Creates additional projects** (optional, interactive prompts)
4. **Sets up folder structure** for each project (specs/, modules/, team/, architecture/, legacy/)

## Usage

```bash
/specweave:init-multiproject
```

## Interactive Prompts

1. **Enable multi-project mode?** (yes/no)
   - No: Stay in single-project mode (uses `projects/default/` but `multiProject.enabled = false`)
   - Yes: Enable multi-project mode (allows multiple projects)

2. **Create additional projects?** (yes/no, only if multi-project enabled)
   - If yes, enter project details:
     - Project ID (kebab-case, e.g., `web-app`)
     - Project name (e.g., "Web Application")
     - Description
     - Tech stack (comma-separated)
     - Team name

## Examples

### Example 1: Single Project (Default)

```bash
/specweave:init-multiproject

# Prompts:
# - Enable multi-project mode? → No

# Result:
# ✅ Auto-migrated to projects/default/
# ℹ️  Still in single-project mode
# ℹ️  All operations use projects/default/ automatically
```

### Example 2: Multi-Project (Enterprise)

```bash
/specweave:init-multiproject

# Prompts:
# - Enable multi-project mode? → Yes
# - Create additional projects? → Yes
#   - Project ID: web-app
#   - Name: Web Application
#   - Description: Customer-facing web app
#   - Tech stack: React, TypeScript, Node.js
#   - Team: Frontend Team
#
#   Create another project? → Yes
#   - Project ID: platform-infra
#   - Name: Platform Infrastructure
#   - ...

# Result:
# ✅ Created projects/web-app/
# ✅ Created projects/platform-infra/
# ✅ Multi-project mode enabled
# ℹ️  Use /specweave:switch-project to change active project
```

## Folder Structure Created

For each project:

```
.specweave/docs/internal/projects/{project-id}/
├── README.md              # Project overview
├── specs/                 # Living docs specs (spec-001, spec-002, ...)
├── modules/               # Module-level docs (auth, payments, etc.)
├── team/                  # Team playbooks (onboarding, conventions)
├── architecture/          # Project-specific architecture (optional)
│   └── adr/               # Architecture Decision Records
└── legacy/                # Brownfield imported docs
```

## When to Use

### Single Project Mode
- Small projects or startups
- One team, one codebase
- Simple organizational structure

### Multi-Project Mode
- Multiple teams or repos
- Microservices architecture
- Platform engineering managing multiple projects
- Different tech stacks per team

## Integration with External Sync

Multi-project mode integrates with external sync (GitHub, JIRA, ADO):

```json
{
  "multiProject": {
    "projects": [{
      "id": "web-app",
      "syncProfiles": ["web-app-github", "web-app-jira"]
    }]
  }
}
```

Each project can link to specific sync profiles for external tracking.

## What Happens to Existing Specs?

**Automatic Migration**:
1. Existing `specs/` copied to `projects/default/specs/`
2. Old `specs/` renamed to `specs.old/` (backup)
3. Config updated with `multiProject` section
4. **No behavior change** - all operations still work

**Rollback** (if needed):
```bash
# Restore from backup
npm run specweave:rollback-migration
```

## See Also

- `/specweave:switch-project` - Change active project
- `/specweave:import-docs` - Import brownfield docs
- [Multi-Project Guide](https://docs.spec-weave.com/guides/multi-project-setup)

---

**Implementation**: `src/cli/commands/init-multiproject.ts`
