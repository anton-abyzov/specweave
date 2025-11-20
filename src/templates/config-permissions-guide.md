# SpecWeave Config.json - External Tool Permissions Guide

**Version**: 0.24.0+
**Location**: `.specweave/config.json`

---

## Three-Permission Architecture

SpecWeave uses **3 independent permission flags** to control what it can modify in external tools (GitHub, JIRA, Azure DevOps). All permissions default to **false** for safety (explicit opt-in required).

---

## The 3 Permission Settings

### Q1: `canUpsertInternalItems`

**Question**: Can SpecWeave CREATE and UPDATE work items it created?

**What it controls**:
- **UPSERT** = CREATE initially + UPDATE as work progresses
- Controls: Title, Description, Acceptance Criteria, Tasks
- Scope: INTERNAL items (created from SpecWeave increments)

**Flow**:
```
increment → living spec → CREATE external item → UPDATE on task completion
```

**If `false`** (default):
- Stops before external item creation
- Local-only workflow (no external tool integration)

**If `true`**:
- Creates external items (GitHub issues, JIRA stories, ADO work items)
- Updates them as work progresses
- Enforces format: `[FS-XXX][US-YYY] Title`

**Example config**:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true
    }
  }
}
```

---

### Q2: `canUpdateExternalItems`

**Question**: Can SpecWeave UPDATE work items created externally?

**What it controls**:
- **UPDATE** = Full content updates (title, description, ACs, tasks, comments)
- Controls: Content updates of EXTERNAL items
- Scope: Items created outside SpecWeave (imported from GitHub/JIRA/ADO)

**Flow**:
```
increment progress → living spec → UPDATE external tool (full sync)
```

**If `false`** (default):
- External items remain read-only snapshots
- No sync back to external tool

**If `true`**:
- Updates title (enforces `[FS-XXX][US-YYY]` format)
- Updates description (syncs from living spec)
- Updates acceptance criteria
- Updates tasks/subtasks
- Adds progress comments

**Example config**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true
    }
  }
}
```

---

### Q3: `canUpdateStatus`

**Question**: Can SpecWeave UPDATE status of work items?

**What it controls**:
- **STATUS** = Status field ONLY
- Controls: Status updates after all ACs/tasks complete
- Scope: BOTH internal AND external items

**Flow**:
```
Both flows (status updates for all items)
```

**If `false`** (default):
- No status updates regardless of item origin
- Manual status management in external tool

**If `true`**:
- Updates status automatically when:
  - All acceptance criteria are checked
  - All tasks are completed
  - Increment is marked "done"

**Example config**:
```json
{
  "sync": {
    "settings": {
      "canUpdateStatus": true
    }
  }
}
```

---

## Common Scenarios

### Scenario 1: Solo Dev, Local Only

**Use case**: Work locally, no external tool integration

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false,
      "canUpdateExternalItems": false,
      "canUpdateStatus": false
    }
  }
}
```

**Result**:
- Everything stays in SpecWeave
- No external items created
- No sync
- Pure local workflow

---

### Scenario 2: Solo Dev, Want Visibility

**Use case**: Create GitHub issues for visibility, but manage status manually

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false,
      "canUpdateStatus": false
    }
  }
}
```

**Result**:
- Internal items → GitHub issues created + updated as work progresses
- Task completed in SpecWeave → issue updated with new content + comment posted
- External items (imported) → read-only snapshots (no sync back)
- Status updates → manual in GitHub

---

### Scenario 3: Team Collaboration (Full Sync)

**Use case**: Full bidirectional sync with external team

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "canUpdateStatus": true
    }
  }
}
```

**Result**:
- Internal items → GitHub issues created + updated continuously
- External items → SpecWeave can update via full content sync
- Status updates → synced to external tool automatically (both internal & external)

---

### Scenario 4: Read-Only External, Create Internal

**Use case**: Import external items for context, create new items for internal work

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": false,
      "canUpdateStatus": true
    }
  }
}
```

**Result**:
- Internal items → GitHub issues created + status updated automatically
- External items → read-only snapshots (no updates)
- Status updates → only for internal items

---

## Permission Matrix

| Origin | Q1: UPSERT | Q2: UPDATE | Q3: STATUS | External Created? | Title Update | Description Update | Status Update | Comment Updates |
|--------|-----------|------------|------------|-------------------|--------------|-------------------|---------------|-----------------|
| **Internal** | ✅ true | - | ✅ true | ✅ Created + Updated | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update with ACs/Tasks | ✅ Yes | ✅ Yes |
| **Internal** | ✅ true | - | ❌ false | ✅ Created + Updated | ✅ Enforce format | ✅ Update with ACs/Tasks | ❌ No | ✅ Yes |
| **Internal** | ❌ false | - | - | ❌ **NO external item** | N/A (local only) | N/A (local only) | N/A | N/A |
| **External** | - | ✅ true | ✅ true | 📥 Pre-existing | ✅ Update (enforce format) | ✅ Update with ACs/Tasks | ✅ Yes | ✅ Yes |
| **External** | - | ✅ true | ❌ false | 📥 Pre-existing | ✅ Update (enforce format) | ✅ Update with ACs/Tasks | ❌ No | ✅ Yes |
| **External** | - | ❌ false | ✅ true | 📥 Pre-existing | ❌ NO sync | ❌ NO sync | ✅ Yes (via comment) | ✅ Yes (status comment) |
| **External** | - | ❌ false | ❌ false | 📥 Pre-existing | ❌ NO sync | ❌ NO sync | ❌ No | ❌ No |

---

## Changing Permissions

### During `specweave init`

Permissions are configured during project initialization:

```bash
specweave init .
```

You'll be prompted:
```
⚙️  External Tool Sync Permissions
Control what SpecWeave can modify in external tools (GitHub, JIRA, ADO)

? Q1: Can SpecWeave CREATE and UPDATE work items it created? (UPSERT = CREATE initially + UPDATE on progress) (y/N)
? Q2: Can SpecWeave UPDATE work items created externally? (Full content: title, description, ACs, tasks) (y/N)
? Q3: Can SpecWeave UPDATE status of work items? (Both internal & external items) (y/N)
```

### Manually in config.json

Edit `.specweave/config.json`:

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "canUpdateStatus": true
    }
  }
}
```

Changes take effect immediately (no restart required).

---

## Migration from Old Format

### Old Format (v0.23.0 and earlier)

```json
{
  "sync": {
    "settings": {
      "syncDirection": "bidirectional"
    }
  }
}
```

### New Format (v0.24.0+)

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "canUpdateStatus": true
    }
  }
}
```

### Automatic Migration

If `syncDirection: "bidirectional"` is found:
- All 3 permissions set to `true`
- Old field removed
- Warning logged to review permissions

If `syncDirection: "one-way"` or missing:
- All 3 permissions set to `false` (safer default)

---

## Troubleshooting

### "Permission denied: canUpsertInternalItems=false"

**Solution**: Enable in `.specweave/config.json`:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true
    }
  }
}
```

### External items not updating

**Check**: `canUpdateExternalItems` permission
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true
    }
  }
}
```

### Status not syncing

**Check**: `canUpdateStatus` permission
```json
{
  "sync": {
    "settings": {
      "canUpdateStatus": true
    }
  }
}
```

---

## Security Considerations

1. **Least Privilege**: Start with all permissions `false`, enable only what you need
2. **Team Alignment**: Discuss with team before enabling `canUpdateExternalItems`
3. **Review Changes**: Monitor external tool changes when first enabling permissions
4. **Version Control**: config.json is version-controlled, team sees permission changes

---

## Related Documentation

- **Architecture**: `.specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md`
- **Specification**: `.specweave/increments/0047-us-task-linkage/spec.md`
- **Implementation Plan**: `.specweave/increments/0047-us-task-linkage/plan.md`
- **User Guide**: `.specweave/docs/public/guides/external-tools.md`

---

## FAQ

### Q: What's the difference between `canUpsertInternalItems` and `canUpdateExternalItems`?

**A**:
- `canUpsertInternalItems`: Controls items SpecWeave creates (full control)
- `canUpdateExternalItems`: Controls items created externally (preserves origin, but allows updates)

### Q: Can I enable only status updates?

**A**: Yes! Set only `canUpdateStatus: true`, others `false`:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": false,
      "canUpdateExternalItems": false,
      "canUpdateStatus": true
    }
  }
}
```

### Q: What happens if I change permissions mid-project?

**A**: Changes take effect immediately. Existing items unaffected. Future operations respect new permissions.

---

## Changelog

**v0.24.0** (2025-11-20):
- Introduced three-permission architecture
- Replaced `syncDirection` with `canUpsertInternalItems`, `canUpdateExternalItems`, `canUpdateStatus`
- All permissions default to `false` (explicit opt-in)
- Automatic migration from old format
