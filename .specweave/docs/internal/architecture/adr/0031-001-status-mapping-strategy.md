# ADR-0031-001: Status Mapping Strategy

**Status**: Accepted
**Date**: 2025-11-12
**Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)

---

## Context

External tools (GitHub, JIRA, Azure DevOps) have different status models:
- **GitHub**: Simple binary (open/closed)
- **JIRA**: Complex workflows (10+ custom statuses, transitions)
- **Azure DevOps**: Work item states (New, Active, Resolved, Closed, Removed)

SpecWeave has its own status model:
- `planning`, `active`, `paused`, `completed`, `abandoned`

We need a way to map SpecWeave statuses to external tool statuses and vice versa.

---

## Decision

Use **configurable status mappings** instead of hardcoded translations.

---

## Rationale

### Why Configurable?

1. **Different teams have different workflows**
   - Team A: JIRA with "To Do", "In Progress", "Done"
   - Team B: JIRA with "Backlog", "Dev", "QA", "UAT", "Production"
   - Hardcoded mappings can't support both

2. **Tool-specific states vary**
   - GitHub: Only 2 states (open/closed)
   - JIRA: 10+ custom states (team-defined)
   - ADO: 5 default states + custom states

3. **Future-proof for new external tools**
   - Adding Bitbucket, GitLab, Linear, etc.
   - Each has different status models
   - Configurable mappings enable easy extension

4. **Users can customize without code changes**
   - Update config file, no code deployment needed
   - Team-specific workflows supported

---

## Configuration Format

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "mappings": {
        "github": {
          "planning": "open",
          "active": "open",
          "completed": "closed",
          "paused": "open",
          "abandoned": "closed"
        },
        "jira": {
          "planning": "To Do",
          "active": "In Progress",
          "completed": "Done",
          "paused": "On Hold",
          "abandoned": "Won't Do"
        },
        "ado": {
          "planning": "New",
          "active": "Active",
          "completed": "Closed",
          "paused": "Active",
          "abandoned": "Removed"
        }
      }
    }
  }
}
```

---

## Consequences

### Positive
- ✅ Flexibility for diverse teams
- ✅ Extensible for future tools
- ✅ No code changes needed for customization
- ✅ Team-specific workflows supported

### Negative
- ❌ More configuration required (users must define mappings)
- ❌ Validation needed to prevent invalid mappings

### Mitigation
- Provide default mappings for common workflows
- Validate mappings against tool schema
- Clear error messages for invalid mappings

---

## Implementation

### StatusMapper Class

```typescript
class StatusMapper {
  private mappings: Map<string, Record<string, string>>;

  // Load mappings from config
  loadMappings(config: SyncConfig): void;

  // Map SpecWeave → External
  mapToExternal(status: string, tool: string): string;

  // Map External → SpecWeave
  mapFromExternal(externalStatus: string, tool: string): string;

  // Validate mapping
  validateMapping(mapping: Record<string, string>, tool: string): boolean;
}
```

---

## Related

- **ADR**: [Conflict Resolution Approach](0031-002-conflict-resolution-approach.md) - How conflicts are resolved
- **ADR**: [Bidirectional Sync Implementation](0031-003-bidirectional-sync-implementation.md) - Sync flow
- **Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)
