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

## References

- Increment 0140: Remove Frontmatter Project Field (parent)
- Increment 0141: Part 1 - Core Implementation
- Increment 0142: Part 2 - Migration & Rollout
- ADR-0190: spec-project-board-requirement (superseded by this ADR)
