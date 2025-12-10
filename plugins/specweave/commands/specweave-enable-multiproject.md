---
name: specweave:enable-multiproject
description: Enable multi-project mode (explicit opt-in from single-project)
usage: /specweave:enable-multiproject
---

# Enable Multi-Project Mode Command

**Usage**: `/specweave:enable-multiproject`

---

## Purpose

Enable multi-project mode when your codebase grows to include multiple projects (frontend, backend, mobile, etc.).

**Use Cases**:
- Managing multiple codebases in one repository
- Organizing by team (team-a, team-b)
- Separating frontend/backend/mobile projects
- Complex monorepo with distinct projects

---

## Behavior

1. **Validates** current mode is single-project
2. **Shows confirmation** prompt explaining the change
3. **Migrates** project data:
   - Moves `project` field → `multiProject.projects` structure
   - Sets `multiProject.enabled = true`
   - Sets `multiProject.activeProject` to current project
4. **Creates** project folder in `.specweave/docs/internal/specs/`
5. **Updates** existing increments with `project:` field if missing
6. **Displays** next steps and usage guide

---

## When NOT to Use

**Stay in single-project mode if**:
- You have ONE codebase/project
- All increments target the same system
- You want simplicity over flexibility

**Default behavior**: SpecWeave starts in single-project mode. This command is an explicit opt-in.

---

## Examples

### Standard Usage

```bash
/specweave:enable-multiproject

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

Continue? (y/N): y

✅ Multi-project mode enabled successfully!

Active project: my-app

Next steps:
  • Add more projects: specweave config set multiProject.projects.{project-id}
  • Switch projects: /specweave:switch-project
  • Create increments with project: field in spec.md
```

### Skip Confirmation (Non-Interactive)

```bash
# For automation/scripts
specweave enable-multiproject --yes
```

---

## Configuration Changes

### Before (Single-Project)

```json
{
  "project": {
    "name": "my-app",
    "description": "My application",
    "techStack": ["TypeScript", "React"]
  },
  "multiProject": {
    "enabled": false
  }
}
```

### After (Multi-Project)

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "my-app",
    "projects": {
      "my-app": {
        "id": "my-app",
        "name": "My Application",
        "description": "My application",
        "techStack": ["TypeScript", "React"]
      }
    }
  }
}
```

---

## Next Steps After Enabling

### 1. Add More Projects

```bash
specweave config set multiProject.projects.frontend-app '{
  "id": "frontend-app",
  "name": "Frontend App",
  "techStack": ["React", "TypeScript"]
}'

specweave config set multiProject.projects.backend-api '{
  "id": "backend-api",
  "name": "Backend API",
  "techStack": ["Node.js", "Express"]
}'
```

### 2. Switch Active Project

```bash
/specweave:switch-project

Current project: my-app

Available projects:
  1. my-app (current)
  2. frontend-app
  3. backend-api

Select project: 2

✅ Switched to: frontend-app
```

### 3. Create Increments with Project Field

```yaml
---
increment: 0042-login-flow
project: frontend-app  # ← REQUIRED in multi-project mode
---
```

---

## Error Cases

### Already in Multi-Project Mode

```bash
/specweave:enable-multiproject

❌ Multi-project mode is already enabled.

Use /specweave:switch-project to change active project.
```

### No Project in Config

```bash
/specweave:enable-multiproject

❌ No project found in config. Run specweave init first.
```

---

## Related Commands

- `/specweave:switch-project` - Change active project (multi-project mode only)
- `specweave context projects` - List available projects
- `specweave config get multiProject` - View multi-project configuration

---

## Technical Details

**Migration Process**:
1. Reads current `config.json`
2. Validates single-project mode
3. Creates `multiProject.projects` structure
4. Moves project data from top-level to projects map
5. Sets `multiProject.enabled = true`
6. Sets `multiProject.activeProject`
7. Creates project folder structure
8. Updates existing increments

**Rollback**: Manual - restore config.json from backup if needed.

---

## Notes

- **Single-project is default** - This command is an explicit opt-in
- **No automatic detection** - User must consciously choose multi-project mode
- **Preserves all data** - No metadata loss during migration
- **Creates folders** - Project folders created in living docs
- **Updates increments** - Adds `project:` field to existing increments
