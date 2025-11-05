---
name: specweave:switch-project
description: Switch active project for increment planning. Future increments will use the selected project's specs, modules, and team folders.
---

# Switch Active Project

Switch the active project. Future increments will use the selected project's specs folder.

## Usage

```bash
/specweave:switch-project <project-id>
```

## Examples

### Example 1: Switch to Specific Project

```bash
/specweave:switch-project web-app

# Result:
# ✅ Switched to project: Web Application (web-app)
# ℹ️  Future increments will use:
#    - projects/web-app/specs/
#    - projects/web-app/modules/
#    - projects/web-app/team/
```

### Example 2: List Available Projects

```bash
/specweave:switch-project

# If no project ID provided, shows list of projects:
#
# 📋 Available Projects:
#
#   default - Default Project
#     Team: Engineering Team
#
# → web-app - Web Application
#     Team: Frontend Team
#     Tech: React, TypeScript, Node.js
#
#   mobile-app - Mobile Application
#     Team: Mobile Team
#     Tech: React Native, Firebase
#
# Active project: web-app (→)
#
# Usage: /specweave:switch-project <project-id>
```

## What Happens

1. **Updates config** - Sets `multiProject.activeProject` in `.specweave/config.json`
2. **Clears cache** - Forces reload of project context
3. **Future operations** use new project:
   - `/specweave:increment` creates specs in new project's `specs/` folder
   - Module docs go to new project's `modules/` folder
   - Team docs go to new project's `team/` folder

## Requirements

- Multi-project mode must be enabled
- Project ID must exist in config

## Error Cases

### Multi-Project Not Enabled

```bash
/specweave:switch-project web-app

# Error:
# ❌ Multi-project mode not enabled
#    Run /specweave:init-multiproject first
```

### Project Not Found

```bash
/specweave:switch-project nonexistent

# Error:
# ❌ Project 'nonexistent' not found
#    Available projects: default, web-app, mobile-app
```

## Integration with Increments

When you create an increment, it uses the active project:

```bash
# Switch to web-app
/specweave:switch-project web-app

# Create increment
/specweave:increment "Add user authentication"

# Result:
# Spec created in: projects/web-app/specs/spec-001-user-auth.md
# Increment: .specweave/increments/0013-user-auth/
# Linked to project: web-app
```

## Integration with External Sync

Each project can have its own sync profiles:

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

When you switch projects, the relevant sync profiles become active.

## Checking Current Project

```bash
# List all projects (shows active with →)
/specweave:switch-project

# Or check config directly
cat .specweave/config.json | grep activeProject
```

## Use Cases

### Multi-Team Organization
```bash
# Morning: Work on web app
/specweave:switch-project web-app
/specweave:increment "Add payment integration"

# Afternoon: Work on mobile app
/specweave:switch-project mobile-app
/specweave:increment "Add push notifications"
```

### Platform Engineering
```bash
# Manage infrastructure project
/specweave:switch-project platform-infra
/specweave:increment "Upgrade Kubernetes cluster"

# Then switch to application project
/specweave:switch-project backend-api
/specweave:increment "Add rate limiting"
```

## See Also

- `/specweave:init-multiproject` - Enable multi-project mode
- `/specweave:increment` - Create increments (uses active project)
- [Multi-Project Guide](https://docs.spec-weave.com/guides/multi-project-setup)

---

**Implementation**: `src/cli/commands/switch-project.ts`
