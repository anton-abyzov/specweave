---
name: specweave:switch-project
description: Switch active project (multi-project mode only)
usage: /specweave:switch-project [project-id]
---

# Switch Project Command

**Usage**: `/specweave:switch-project [project-id]`

---

## Purpose

Switch the active project context in multi-project mode. New increments will target the selected project.

**Prerequisites**:
- Multi-project mode must be enabled (`/specweave:enable-multiproject`)
- At least 2 projects configured in `config.json`

---

## Behavior

### Interactive Mode (No Arguments)

1. **Shows** current active project
2. **Lists** all available projects
3. **Prompts** for selection
4. **Updates** `multiProject.activeProject` in config
5. **Confirms** switch

### Non-Interactive Mode (With Project ID)

1. **Validates** project exists
2. **Updates** active project directly
3. **Confirms** switch

---

## Examples

### Interactive Selection

```bash
/specweave:switch-project

📂 Switch Project

Current project: frontend-app

Available projects:
  1. frontend-app (current)
     React TypeScript frontend
  2. backend-api
     Node.js Express API
  3. mobile-app
     React Native mobile app

Select project: 2

✅ Switched to: backend-api

New increments will now target this project.
Existing increments remain in their original projects.
```

### Direct Switch (Non-Interactive)

```bash
/specweave:switch-project backend-api

✅ Switched to: backend-api
```

---

## Error Cases

### Multi-Project Mode Not Enabled

```bash
/specweave:switch-project

⚠️  Multi-project mode is not enabled.

This repository is in single-project mode.
To enable multi-project mode, run:

  /specweave:enable-multiproject
```

### Project Not Found

```bash
/specweave:switch-project invalid-project

❌ Project "invalid-project" not found.

Available projects:
  • frontend-app
  • backend-api
  • mobile-app
```

### Already Using Selected Project

```bash
/specweave:switch-project frontend-app

Already using this project.
```

---

## What Gets Updated

When you switch projects:

✅ **Updated**:
- `config.json`: `multiProject.activeProject` field
- New increments will use new project
- Living docs sync targets new project folder

❌ **NOT Updated**:
- Existing increments stay in original project
- Living docs structure unchanged
- Previous increment project assignments preserved

---

## After Switching

### Check Current Project

```bash
specweave context projects

{
  "level": 2,
  "projects": [
    {"id": "frontend-app", "name": "Frontend App"},
    {"id": "backend-api", "name": "Backend API"}
  ],
  "activeProject": "backend-api"
}
```

### Create New Increment

New increments automatically use the active project:

```yaml
---
increment: 0042-new-feature
project: backend-api  # ← Uses active project
---
```

---

## Configuration Impact

### Before Switch

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "frontend-app",
    "projects": {
      "frontend-app": {...},
      "backend-api": {...}
    }
  }
}
```

### After Switch

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "backend-api",  // ← Changed
    "projects": {
      "frontend-app": {...},
      "backend-api": {...}
    }
  }
}
```

---

## Use Cases

### Working on Different Projects

```bash
# Morning: Work on frontend
/specweave:switch-project frontend-app
/specweave:increment "User dashboard"

# Afternoon: Switch to backend
/specweave:switch-project backend-api
/specweave:increment "API endpoints"
```

### Team-Based Projects

```bash
# UI team work
/specweave:switch-project ui-team

# API team work
/specweave:switch-project api-team
```

### Module-Based Projects

```bash
# Auth module
/specweave:switch-project auth-service

# Payment module
/specweave:switch-project payment-service
```

---

## Related Commands

- `/specweave:enable-multiproject` - Enable multi-project mode first
- `specweave context projects` - List available projects
- `specweave config get multiProject.activeProject` - Check active project

---

## Technical Details

**Updates**: `config.json` only
**Scope**: Future increments (existing increments unaffected)
**Validation**: Checks project exists before switching
**Rollback**: Switch back to previous project anytime

---

## Notes

- **Switching is instant** - no migration or file moves
- **Non-destructive** - existing increments stay in place
- **Reversible** - switch back anytime
- **No side effects** - only updates config.json
