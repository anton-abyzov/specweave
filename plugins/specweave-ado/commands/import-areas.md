---
name: sw-ado:import-areas
description: Import Azure DevOps area paths from a project and map them to SpecWeave projects. Creates 2-level directory structure with area path-based organization.
---

# Import ADO Area Paths Command

You are an Azure DevOps integration expert. Help the user import area paths from an ADO project and map them to SpecWeave projects.

## Command Usage

```bash
/sw-ado:import-areas                         # Interactive mode (prompts for project)
/sw-ado:import-areas --project MyProduct     # Specific ADO project
/sw-ado:import-areas --dry-run               # Preview without creating directories
/sw-ado:import-areas --include-children      # Include child area paths
```

## Your Task

When the user runs this command:

### Step 1: Validate Prerequisites

1. **Check ADO credentials** exist in `.env`:
   - `AZURE_DEVOPS_PAT`
   - `AZURE_DEVOPS_ORG`
   - `AZURE_DEVOPS_PROJECT`

2. **Check config.json** for existing area path mapping:
   - If `sync.profiles.*.config.areaPathMapping` exists, warn user

### Step 2: Get Project Name

**If `--project` flag provided:**
- Use the provided project name

**If no flag (interactive mode):**
```
🔷 Azure DevOps Area Path Import

Enter the ADO project name to import area paths from:
> MyProduct

Fetching area paths from project MyProduct...
```

### Step 3: Fetch and Display Area Paths

```typescript
import { fetchAreaPathsForProject } from '../lib/ado-board-resolver';

const areaPaths = await fetchAreaPathsForProject(
  process.env.AZURE_DEVOPS_ORG,
  'MyProduct',
  process.env.AZURE_DEVOPS_PAT
);
```

**Display area paths:**
```
Found 6 area paths in project MyProduct:

  1. ☑ MyProduct\Frontend (45 active items)
  2. ☑ MyProduct\Backend (78 active items)
  3. ☑ MyProduct\Mobile (23 active items)
  4. ☑ MyProduct\DevOps (12 active items)
  5. ☐ MyProduct\Archive (0 items) [deselected - archive]
  6. ☐ MyProduct (root) [deselected - root level]

Select area paths to import (Space to toggle, Enter to confirm)
```

### Step 4: Map Area Paths to SpecWeave Projects

For each selected area path, prompt for SpecWeave project ID:

```
🏷️  Mapping area paths to SpecWeave projects:

Area path "MyProduct\Frontend" → SpecWeave project ID: [fe]
  → Include child area paths? [Y/n]: y
  → Keywords for auto-classification (optional): frontend, ui, angular, css

Area path "MyProduct\Backend" → SpecWeave project ID: [be]
  → Include child area paths? [Y/n]: y
  → Keywords for auto-classification (optional): api, server, database, c#

Area path "MyProduct\Mobile" → SpecWeave project ID: [mobile]
  → Include child area paths? [Y/n]: y
  → Keywords for auto-classification (optional): ios, android, xamarin

Area path "MyProduct\DevOps" → SpecWeave project ID: [devops]
  → Include child area paths? [Y/n]: y
  → Keywords for auto-classification (optional): infrastructure, ci, cd, terraform
```

**Project ID validation:**
- Must be lowercase, alphanumeric with hyphens
- Must not collide with existing project IDs
- If collision detected, suggest prefixed version: `myproduct-fe` instead of `fe`

### Step 5: Create Directory Structure

Create 2-level directory structure:

```
.specweave/docs/internal/specs/
└── ADO-myproduct/              ← Level 1: ADO project
    ├── fe/                     ← Level 2: SpecWeave project
    │   └── .gitkeep
    ├── be/
    │   └── .gitkeep
    ├── mobile/
    │   └── .gitkeep
    └── devops/
        └── .gitkeep
```

### Step 6: Update config.json

Add area path mapping to config:

```json
{
  "sync": {
    "profiles": {
      "ado-default": {
        "provider": "ado",
        "config": {
          "organization": "myorg",
          "areaPathMapping": {
            "project": "MyProduct",
            "mappings": [
              {
                "areaPath": "MyProduct\\Frontend",
                "specweaveProject": "fe",
                "includeChildren": true,
                "keywords": ["frontend", "ui", "angular", "css"]
              },
              {
                "areaPath": "MyProduct\\Backend",
                "specweaveProject": "be",
                "includeChildren": true,
                "keywords": ["api", "server", "database", "c#"]
              },
              {
                "areaPath": "MyProduct\\Mobile",
                "specweaveProject": "mobile",
                "includeChildren": true,
                "keywords": ["ios", "android", "xamarin"]
              },
              {
                "areaPath": "MyProduct\\DevOps",
                "specweaveProject": "devops",
                "includeChildren": true,
                "keywords": ["infrastructure", "ci", "cd", "terraform"]
              }
            ]
          }
        }
      }
    }
  },
  "multiProject": {
    "enabled": true,
    "activeProject": "fe",
    "projects": {
      "fe": {
        "name": "Frontend",
        "externalTools": {
          "ado": {
            "areaPath": "MyProduct\\Frontend",
            "project": "MyProduct"
          }
        }
      },
      "be": {
        "name": "Backend",
        "externalTools": {
          "ado": {
            "areaPath": "MyProduct\\Backend",
            "project": "MyProduct"
          }
        }
      },
      "mobile": {
        "name": "Mobile",
        "externalTools": {
          "ado": {
            "areaPath": "MyProduct\\Mobile",
            "project": "MyProduct"
          }
        }
      },
      "devops": {
        "name": "DevOps",
        "externalTools": {
          "ado": {
            "areaPath": "MyProduct\\DevOps",
            "project": "MyProduct"
          }
        }
      }
    }
  }
}
```

### Step 7: Display Summary

```
✅ Azure DevOps Area Paths Import Complete!

🔷 ADO Project: MyProduct
📁 Created: .specweave/docs/internal/specs/ADO-myproduct/

Area paths imported:
  ✓ MyProduct\Frontend → fe (includes children)
    Keywords: frontend, ui, angular, css
  ✓ MyProduct\Backend → be (includes children)
    Keywords: api, server, database, c#
  ✓ MyProduct\Mobile → mobile (includes children)
    Keywords: ios, android, xamarin
  ✓ MyProduct\DevOps → devops (includes children)
    Keywords: infrastructure, ci, cd, terraform

💡 Next steps:
  1. Use /sw:switch-project fe to switch active project
  2. Create increment: /sw:increment "feature name"
  3. User stories will auto-sync to the correct area path based on keywords

📖 Documentation: .specweave/docs/internal/architecture/adr/0143-jira-ado-multi-level-project-mapping.md
```

## Examples

### Example 1: Interactive Import
```
User: /sw-ado:import-areas

You:
🔷 Azure DevOps Area Path Import

Enter the ADO project name: MyProduct
Fetching area paths...

Found 4 area paths:
  ☑ MyProduct\Frontend
  ☑ MyProduct\Backend
  ☑ MyProduct\Mobile
  ☐ MyProduct (root) [deselected]

Mapping to SpecWeave projects:
  MyProduct\Frontend → fe
  MyProduct\Backend → be
  MyProduct\Mobile → mobile

✅ Import complete! 3 area paths mapped.
```

### Example 2: Dry Run
```
User: /sw-ado:import-areas --project MyProduct --dry-run

You:
🔷 Azure DevOps Area Path Import (DRY RUN)

Would import from project: MyProduct

Would create:
  .specweave/docs/internal/specs/ADO-myproduct/
  .specweave/docs/internal/specs/ADO-myproduct/fe/
  .specweave/docs/internal/specs/ADO-myproduct/be/
  .specweave/docs/internal/specs/ADO-myproduct/mobile/

Would update config.json with area path mapping.

No changes made (dry run).
```

### Example 3: Already Configured
```
User: /sw-ado:import-areas

You:
⚠️  Area path mapping already exists for project MyProduct

Current mappings:
  MyProduct\Frontend → fe
  MyProduct\Backend → be

Do you want to:
  1. Add more area paths
  2. Replace existing mapping
  3. Cancel

> 1

Fetching additional area paths...
  ☐ MyProduct\Frontend (already mapped)
  ☐ MyProduct\Backend (already mapped)
  ☑ MyProduct\Mobile (new)
  ☑ MyProduct\DevOps (new)

Added:
  MyProduct\Mobile → mobile
  MyProduct\DevOps → devops

✅ Updated! Now 4 area paths mapped.
```

## Error Handling

**Missing credentials:**
```
❌ Azure DevOps credentials not found

Please add to .env:
  AZURE_DEVOPS_PAT=your_personal_access_token
  AZURE_DEVOPS_ORG=your_organization
  AZURE_DEVOPS_PROJECT=your_project

Or run: specweave init . (to configure Azure DevOps)
```

**Project not found:**
```
❌ ADO project "INVALID" not found in organization "myorg"

Available projects you have access to:
  - MyProduct (My Product Development)
  - Infrastructure (DevOps & Infrastructure)
  - Legacy (Legacy Systems)

Tip: Use /sw-ado:import-areas --project MyProduct
```

**No area paths found:**
```
⚠️  No child area paths found in project MyProduct

The project only has the root area path. This means:
  1. Teams aren't using area paths for organization
  2. You can create area paths in ADO Project Settings

Suggestions:
  - Use single-project mode (no area path mapping)
  - Create area paths in ADO: Project Settings → Work → Areas
  - Run this command again after creating area paths
```

## Related Commands

- `/sw-ado:import-projects` - Import multiple ADO projects
- `/sw-ado:sync` - Sync increments with ADO
- `/sw:switch-project` - Switch active SpecWeave project
- `/sw:init-multiproject` - Initialize multi-project mode
