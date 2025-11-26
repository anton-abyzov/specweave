---
name: specweave-jira:import-boards
description: Import JIRA boards from a project and map them to SpecWeave projects. Creates 2-level directory structure with board-based organization.
---

# Import JIRA Boards Command

You are a JIRA integration expert. Help the user import boards from a JIRA project and map them to SpecWeave projects.

## Command Usage

```bash
/specweave-jira:import-boards                      # Interactive mode (prompts for project)
/specweave-jira:import-boards --project CORE       # Specific JIRA project
/specweave-jira:import-boards --dry-run            # Preview without creating directories
```

## Your Task

When the user runs this command:

### Step 1: Validate Prerequisites

1. **Check JIRA credentials** exist in `.env`:
   - `JIRA_API_TOKEN`
   - `JIRA_EMAIL`
   - `JIRA_DOMAIN`

2. **Check config.json** for existing board mapping:
   - If `sync.profiles.*.config.boardMapping` exists, warn user

### Step 2: Get Project Key

**If `--project` flag provided:**
- Use the provided project key

**If no flag (interactive mode):**
```
📋 JIRA Board Import

Enter the JIRA project key to import boards from:
> CORE

Fetching boards from project CORE...
```

### Step 3: Fetch and Display Boards

```typescript
import { JiraClient } from '../../../src/integrations/jira/jira-client';
import { fetchBoardsForProject } from '../lib/jira-board-resolver';

const client = new JiraClient({
  domain: process.env.JIRA_DOMAIN,
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,
  instanceType: 'cloud'
});

const boards = await fetchBoardsForProject(client, 'CORE');
```

**Display boards:**
```
Found 5 boards in project CORE:

  1. ☑ Frontend Board (Scrum, 23 active items)
  2. ☑ Backend Board (Kanban, 45 active items)
  3. ☑ Mobile Board (Scrum, 12 active items)
  4. ☐ Platform Board (Kanban, 3 active items)
  5. ☐ Archive Board (Simple, 0 items) [deselected - archive]

Select boards to import (Space to toggle, Enter to confirm)
```

### Step 4: Map Boards to SpecWeave Projects

For each selected board, prompt for SpecWeave project ID:

```
🏷️  Mapping boards to SpecWeave projects:

Board "Frontend Board" → SpecWeave project ID: [fe]
  → Keywords for auto-classification (optional): frontend, ui, react, css

Board "Backend Board" → SpecWeave project ID: [be]
  → Keywords for auto-classification (optional): api, server, database

Board "Mobile Board" → SpecWeave project ID: [mobile]
  → Keywords for auto-classification (optional): ios, android, react-native
```

**Project ID validation:**
- Must be lowercase, alphanumeric with hyphens
- Must not collide with existing project IDs
- If collision detected, suggest prefixed version: `core-fe` instead of `fe`

### Step 5: Create Directory Structure

Create 2-level directory structure:

```
.specweave/docs/internal/specs/
└── JIRA-CORE/                  ← Level 1: JIRA project
    ├── fe/                     ← Level 2: SpecWeave project
    │   └── .gitkeep
    ├── be/
    │   └── .gitkeep
    └── mobile/
        └── .gitkeep
```

### Step 6: Update config.json

Add board mapping to config:

```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "config": {
          "domain": "example.atlassian.net",
          "boardMapping": {
            "projectKey": "CORE",
            "boards": [
              {
                "boardId": 123,
                "boardName": "Frontend Board",
                "specweaveProject": "fe",
                "boardType": "scrum",
                "keywords": ["frontend", "ui", "react", "css"]
              },
              {
                "boardId": 456,
                "boardName": "Backend Board",
                "specweaveProject": "be",
                "boardType": "kanban",
                "keywords": ["api", "server", "database"]
              },
              {
                "boardId": 789,
                "boardName": "Mobile Board",
                "specweaveProject": "mobile",
                "boardType": "scrum",
                "keywords": ["ios", "android", "react-native"]
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
          "jira": {
            "boardId": 123,
            "projectKey": "CORE"
          }
        }
      },
      "be": {
        "name": "Backend",
        "externalTools": {
          "jira": {
            "boardId": 456,
            "projectKey": "CORE"
          }
        }
      },
      "mobile": {
        "name": "Mobile",
        "externalTools": {
          "jira": {
            "boardId": 789,
            "projectKey": "CORE"
          }
        }
      }
    }
  }
}
```

### Step 7: Display Summary

```
✅ JIRA Boards Import Complete!

📋 JIRA Project: CORE
📁 Created: .specweave/docs/internal/specs/JIRA-CORE/

Boards imported:
  ✓ Frontend Board (scrum) → fe
    Keywords: frontend, ui, react, css
  ✓ Backend Board (kanban) → be
    Keywords: api, server, database
  ✓ Mobile Board (scrum) → mobile
    Keywords: ios, android, react-native

💡 Next steps:
  1. Use /specweave:switch-project fe to switch active project
  2. Create increment: /specweave:increment "feature name"
  3. User stories will auto-sync to the correct board based on keywords

📖 Documentation: .specweave/docs/internal/architecture/adr/0143-jira-ado-multi-level-project-mapping.md
```

## Examples

### Example 1: Interactive Import
```
User: /specweave-jira:import-boards

You:
📋 JIRA Board Import

Enter the JIRA project key: CORE
Fetching boards...

Found 3 boards:
  ☑ Frontend Board (scrum)
  ☑ Backend Board (kanban)
  ☐ Archive (simple) [deselected]

Mapping to SpecWeave projects:
  Frontend Board → fe
  Backend Board → be

✅ Import complete! 2 boards mapped.
```

### Example 2: Dry Run
```
User: /specweave-jira:import-boards --project CORE --dry-run

You:
📋 JIRA Board Import (DRY RUN)

Would import from project: CORE

Would create:
  .specweave/docs/internal/specs/JIRA-CORE/
  .specweave/docs/internal/specs/JIRA-CORE/fe/
  .specweave/docs/internal/specs/JIRA-CORE/be/

Would update config.json with board mapping.

No changes made (dry run).
```

### Example 3: Already Configured
```
User: /specweave-jira:import-boards

You:
⚠️  Board mapping already exists for project CORE

Current mappings:
  Frontend Board → fe
  Backend Board → be

Do you want to:
  1. Add more boards
  2. Replace existing mapping
  3. Cancel

> 1

Fetching additional boards...
  ☐ Frontend Board (already mapped)
  ☐ Backend Board (already mapped)
  ☑ Mobile Board (new)
  ☐ Archive (deselected)

Added Mobile Board → mobile

✅ Updated! Now 3 boards mapped.
```

## Error Handling

**Missing credentials:**
```
❌ JIRA credentials not found

Please add to .env:
  JIRA_API_TOKEN=your_token
  JIRA_EMAIL=your_email@example.com
  JIRA_DOMAIN=your-company.atlassian.net

Or run: specweave init . (to configure JIRA)
```

**Project not found:**
```
❌ JIRA project "INVALID" not found

Available projects you have access to:
  - CORE (Core Development)
  - INFRA (Infrastructure)
  - MOBILE (Mobile Team)

Tip: Use /specweave-jira:import-boards --project CORE
```

**No boards found:**
```
⚠️  No boards found in project CORE

This could mean:
  1. The project uses classic projects (no boards)
  2. You don't have access to boards in this project

Suggestions:
  - Use /specweave-jira:import-projects for project-based sync
  - Ask your JIRA admin about board access
```

## Related Commands

- `/specweave-jira:import-projects` - Import multiple JIRA projects (not boards)
- `/specweave-jira:sync` - Sync increments with JIRA
- `/specweave:switch-project` - Switch active SpecWeave project
- `/specweave:init-multiproject` - Initialize multi-project mode
