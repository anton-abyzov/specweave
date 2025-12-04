# ADR-0190: Mandatory Project/Board Fields in spec.md

## Status

**Accepted** (2025-12-04)

## Context

When users create increments with vague descriptions (e.g., "show last git commits"), the system couldn't determine where the increment should sync to in living docs. This caused several problems:

1. **Sync failures**: `sync-specs` would fail or ask user interactively during sync
2. **Wrong folder placement**: Specs would land in wrong project/board folders
3. **2-level structure violations**: For ADO area paths or JIRA boards, specs would land in `{project}/FS-XXX/` instead of `{project}/{board}/FS-XXX/`

The root cause was that project/board context was determined at sync time (reactive) rather than at increment creation time (proactive).

## Decision

### 1. Structure Level Detection

Introduce `src/utils/structure-level-detector.ts` that detects whether the project uses:

- **1-Level Structure**: `internal/specs/{project}/FS-XXX/`
  - Single-project mode
  - multiProject.enabled with projects

- **2-Level Structure**: `internal/specs/{project}/{board}/FS-XXX/`
  - ADO with areaPathMapping
  - ADO with areaPaths
  - JIRA with boardMapping
  - Umbrella with multiple teams

### 2. Mandatory YAML Frontmatter Fields

**For 1-level structures**, spec.md MUST have:
```yaml
---
increment: 0001-feature-name
project: my-project          # REQUIRED
---
```

**For 2-level structures**, spec.md MUST have:
```yaml
---
increment: 0001-feature-name
project: acme-corp           # REQUIRED
board: digital-operations    # REQUIRED
---
```

### 3. Validation at Multiple Points

1. **Increment Planner Skill (STEP 0B)**: Detects structure level and asks user to select project/board BEFORE generating spec.md
2. **Pre-tool-use Hook**: `spec-project-validator.sh` blocks spec.md writes with unresolved placeholders
3. **sync-specs Command**: Throws error if 2-level structure spec.md is missing required fields

### 4. Backward Compatibility

- Legacy `**Project**:` field in spec.md body is still accepted (with warning)
- 1-level structures warn but don't fail if project is missing (grace period)
- 2-level structures REQUIRE both fields (hard enforcement)

## Consequences

### Positive

- **No more vague increments**: Every increment knows its sync target at creation time
- **Deterministic sync**: Living docs sync uses explicit fields instead of auto-detection
- **Better UX**: Users understand where their specs will land before creating them
- **Fewer sync errors**: 2-level structures always have correct paths

### Negative

- **Migration burden**: Existing increments may need `project:` field added
- **More prompts**: Users must answer project/board questions during increment creation
- **Template changes**: All spec templates updated with new placeholders

### Neutral

- Auto-detection still available as fallback for 1-level structures
- Structure detection runs on every sync (could be cached in future)

## Implementation

### Files Created/Modified

| File | Change |
|------|--------|
| `src/utils/structure-level-detector.ts` | NEW - Detection and validation utilities |
| `plugins/specweave/hooks/spec-project-validator.sh` | NEW - Pre-tool-use validation hook |
| `plugins/specweave/skills/increment-planner/templates/spec-single-project.md` | Added `project:` field |
| `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md` | Added `project:` and `board:` fields |
| `plugins/specweave/skills/increment-planner/SKILL.md` | Added STEP 0B |
| `src/core/living-docs/living-docs-sync.ts` | Updated `resolveProjectPath()` to require fields |
| `plugins/specweave/hooks/hooks.json` | Registered new hook |
| `CLAUDE.md` | Added Rule 2c |

### Detection Priority

```
1. ADO areaPathMapping → 2-level
2. ADO areaPaths → 2-level
3. JIRA boardMapping (multiple boards) → 2-level
4. Umbrella (multiple teams) → 2-level
5. multiProject.projects → 1-level
6. Existing folder structure → detect from folders
7. Default → 1-level (single-project)
```

## Related ADRs

- [ADR-0054: ADO Area Path Mapping](./0054-ado-area-path-mapping.md)
- [ADR-0030: Intelligent Living Docs Sync](./0030-intelligent-living-docs-sync.md)
- [ADR-0178: Intelligent Board/Area Path Matching](./0178-intelligent-board-matching.md)
- [ADR-0185: Unified Living Docs Sync Architecture](./0185-unified-living-docs-sync-architecture.md)
