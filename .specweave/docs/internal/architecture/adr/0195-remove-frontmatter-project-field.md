# ADR-0195: Remove Frontmatter Project Field

**Status**: Accepted
**Date**: 2025-12-10
**Decision Makers**: SpecWeave Core Team
**Related Increments**: 0140, 0141, 0142

## Context

SpecWeave historically required spec.md files to have a `project:` field in YAML frontmatter:

```yaml
---
increment: 0001-feature-name
project: my-app          # ← Required frontmatter field
board: digital-ops       # ← Required for 2-level structures
---
```

Additionally, each User Story could optionally have per-US `**Project**:` fields:

```markdown
### US-001: Login Form
**Project**: my-app
```

This created **redundant project specification** with two sources of truth, causing:

1. **Confusion**: Which field is authoritative?
2. **Sync Errors**: Frontmatter vs per-US field mismatches
3. **Validation Complexity**: Multiple checks for the same information
4. **Template Bloat**: Placeholders like `{{PROJECT_ID}}` needed resolution

## Decision

**Remove frontmatter `project:` and `board:` fields as requirements**. Make them optional (deprecated but supported for backward compatibility).

**Per-US `**Project**:` fields become the PRIMARY source of truth.**

### New Resolution Priority Chain

```
1. Per-US **Project**: fields (highest priority)
2. config.json → project.name (single-project mode)
3. Intelligent detection (keywords, tech stack)
4. Ultimate fallback: "default"
```

### Implementation: ProjectResolutionService

```typescript
class ProjectResolutionService {
  async resolveProject(specPath: string): Promise<ResolutionResult> {
    // 1. Try per-US fields first
    const perUsProject = this.extractPerUsProject(specContent);
    if (perUsProject) return { project: perUsProject, source: 'per-us', confidence: 'high' };

    // 2. Fall back to config.project.name (single-project mode)
    if (!config.multiProject.enabled && config.project?.name) {
      return { project: config.project.name, source: 'config', confidence: 'high' };
    }

    // 3. Intelligent detection
    const detected = await this.detectFromKeywords(specContent);
    if (detected) return { project: detected, source: 'detection', confidence: 'medium' };

    // 4. Ultimate fallback
    return { project: 'default', source: 'fallback', confidence: 'low' };
  }
}
```

## Consequences

### Positive

1. **Single Source of Truth**: Per-US fields are unambiguous
2. **Simpler Templates**: No need for `{{PROJECT_ID}}` placeholders
3. **Cross-Project Support**: Each US can target different project
4. **Backward Compatible**: Old specs with frontmatter still work

### Negative

1. **Migration Required**: Existing specs need per-US fields added (migration script provided)
2. **Documentation Updates**: CLAUDE.md, skills, guides need updating

### Neutral

1. **Validation Changes**: Hooks updated to allow missing frontmatter
2. **Template Changes**: Templates no longer include frontmatter project/board

## Alternatives Considered

### Alternative 1: Keep Both, Prefer Per-US

**Problem**: Still have two sources, validation complexity remains.

### Alternative 2: Keep Frontmatter Only

**Problem**: Doesn't support cross-project increments, no per-US granularity.

### Alternative 3: Require Both (Current State Before This ADR)

**Problem**: Redundant data, sync issues, confusion.

## Migration Path

1. **Phase 1 (0141)**: Update code to make frontmatter optional
2. **Phase 2 (0142)**: Migration script to remove frontmatter from existing specs
3. **Monitoring**: 48-hour post-migration validation

### Migration Script

```bash
# Dry-run to preview changes
npx tsx scripts/migrate-project-frontmatter.ts --dry-run

# Execute migration
npx tsx scripts/migrate-project-frontmatter.ts
```

## v1.0.0 Deprecation Plan

**Target**: SpecWeave v1.0.0 release
**Status**: Planned
**Date**: TBD (post-v0.35.0 stabilization)

### Removal Strategy

After sufficient monitoring period (6-12 months) and user migration, completely remove backward-compat fallbacks:

#### Code Removal Targets

1. **ProjectResolutionService** (`src/core/project/project-resolution.ts`):
   ```typescript
   // REMOVE in v1.0.0:
   - Frontmatter project/board field reading
   - Backward-compat warnings
   - Fallback to frontmatter when per-US missing
   ```

2. **Validation Hooks**:
   - Remove `SPECWEAVE_LEGACY_SPEC=1` bypass option
   - Make per-US `**Project**:` fields MANDATORY (no fallback)
   - Remove frontmatter project/board validation entirely

3. **Templates**:
   - Remove all frontmatter project/board references
   - Templates generate ONLY per-US fields

4. **Documentation**:
   - Remove all mentions of frontmatter project/board
   - Update migration guide to "v0.x → v1.0 breaking changes"

#### Breaking Changes (v1.0.0)

```yaml
# ❌ WILL NOT WORK in v1.0.0
---
increment: 0001-feature
project: my-app      # ← No longer supported!
---

# ✅ REQUIRED in v1.0.0
### US-001: Feature Name
**Project**: my-app  # ← MANDATORY
```

#### Pre-v1.0.0 Migration Window

1. **v0.35.0 - v0.40.0**: Deprecation warnings when frontmatter used
2. **v0.40.0 - v0.50.0**: Stricter warnings, suggest migration
3. **v1.0.0**: Complete removal, hard requirement for per-US fields

**Note**: Since SpecWeave has no external users yet (all GitHub releases will be removed), the v1.0.0 transition can happen immediately once internal migration is complete. No external communication or waiting period required.

## References

- Increment 0140: Remove Frontmatter Project Field (parent)
- Increment 0143: Part 1 - Core Implementation
- Increment 0144: Part 2 - Migration & Rollout
- ADR-0190: spec-project-board-requirement (superseded by this ADR)
