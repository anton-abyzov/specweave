---
increment: 0138-single-project-first-architecture
title: "Single-Project-First Architecture - Fix Auto-Enable Multi-Project Bug"
type: feature
priority: P0
status: planned
created: 2025-12-10
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Single-Project-First Architecture

## Executive Summary

**Problem**: SpecWeave auto-enables multi-project mode even for single-project repositories! User specified ONE project (specweave) during init, but config.json has `multiProject.enabled=true`. This causes:

1. **Accidental Complexity**: Project folders created for EXAMPLE User Stories (MyApp, frontend-app, etc.)
2. **Wrong Default**: 99% of users have single projects but get multi-project complexity
3. **No Opt-In Flow**: No explicit command to enable multi-project features
4. **No Migration Path**: No way to switch between single/multi-project modes

**Solution**: Implement proper single-project-first architecture with explicit migration workflow.

## Core Principles

1. **Default: Single-Project Mode** - `multiProject.enabled=false` ALWAYS unless explicitly enabled
2. **Explicit Opt-In** - New `/specweave:enable-multiproject` command for migration
3. **Project Switching** - New `/specweave:switch-project` command (multi-project only)
4. **Validation Guards** - Prevent multi-project features unless explicitly enabled
5. **Auto-Migration** - Detect and fix existing single-project repos with `enabled=true`

---

## User Stories

### US-001: Fix Auto-Enable Bug During Init (P0)
**Project**: specweave

**As a** developer running specweave init
**I want** config to default to single-project mode
**So that** I don't get multi-project complexity unless I need it

**Acceptance Criteria**:
- [x] **AC-US1-01**: `specweave init` creates config with `multiProject.enabled=false`
- [x] **AC-US1-02**: Only ONE project in config (from `project.name` field)
- [x] **AC-US1-03**: No `multiProject.projects` structure unless explicitly migrated
- [x] **AC-US1-04**: Existing single-project repos auto-detect and migrate to `enabled=false`

**Notes**:
- This is the ROOT cause of the MyApp/frontend-app folder creation bug
- init.ts must create single-project config by default
- Migration script runs on ANY specweave command to fix existing repos

---

### US-002: /specweave:enable-multiproject Command (P0)
**Project**: specweave

**As a** developer with growing needs
**I want** explicit command to enable multi-project mode
**So that** I can upgrade when ready, not by accident

**Acceptance Criteria**:
- [x] **AC-US2-01**: Command prompts for confirmation with clear explanation
- [x] **AC-US2-02**: Migrates existing `project.name` to `multiProject.projects` structure
- [x] **AC-US2-03**: Sets `multiProject.enabled=true` only after user confirms
- [x] **AC-US2-04**: Creates project folders in `.specweave/docs/internal/specs/`
- [x] **AC-US2-05**: Validates no data loss during migration
- [x] **AC-US2-06**: Updates all existing increments with `project:` field if missing

**Example Flow**:
```bash
$ specweave enable-multiproject

⚠️  Multi-Project Mode

You are about to enable multi-project mode. This is a significant change:

Current setup (single-project):
  • One project: "specweave"
  • All increments go to same folder
  • Simple, focused workflow

After enabling (multi-project):
  • Multiple projects supported
  • Increments require project: field
  • More complex, but scales better

Continue? (y/N)
```

---

### US-003: /specweave:switch-project Command (P1)
**Project**: specweave

**As a** developer in multi-project mode
**I want** to switch active project context
**So that** new increments target correct project

**Acceptance Criteria**:
- [x] **AC-US3-01**: Lists available projects from config
- [x] **AC-US3-02**: Updates `multiProject.activeProject`
- [x] **AC-US3-03**: Only works if `multiProject.enabled=true`
- [x] **AC-US3-04**: Validates project exists before switching
- [x] **AC-US3-05**: Shows current active project in status

**Example Flow**:
```bash
$ specweave switch-project

Current project: specweave

Available projects:
  1. specweave (current)
  2. frontend-app
  3. backend-api

Select project: 2

✅ Switched to: frontend-app
```

---

### US-004: Single-Project Validation Guards (P0)
**Project**: specweave

**As a** developer in single-project mode
**I want** automatic prevention of multi-project features
**So that** I don't accidentally create complexity

**Acceptance Criteria**:
- [x] **AC-US4-01**: Block `project:` field in spec.md if `multiProject.enabled=false`
- [x] **AC-US4-02**: Auto-fill `project:` with `project.name` in single-project mode
- [x] **AC-US4-03**: Prevent `board:` field in single-project mode (always)
- [x] **AC-US4-04**: Clear error messages guiding to `/specweave:enable-multiproject`
- [x] **AC-US4-05**: Update `spec-project-validator.sh` hook to check mode first

**Validation Flow**:
```
User tries to create spec.md with project: field
→ Hook checks multiProject.enabled
→ If false: BLOCK with message "Run /specweave:enable-multiproject first"
→ If true: Allow and validate project exists in config
```

---

### US-005: Config Migration for Existing Repos (P0)
**Project**: specweave

**As an** existing SpecWeave user
**I want** automatic detection of single vs multi-project setup
**So that** my config is correct without manual fixes

**Acceptance Criteria**:
- [x] **AC-US5-01**: Detect single project (only one entry in `multiProject.projects`)
- [x] **AC-US5-02**: Auto-set `multiProject.enabled=false` if single project
- [x] **AC-US5-03**: Preserve all existing project metadata
- [x] **AC-US5-04**: Migration runs automatically on next specweave command
- [x] **AC-US5-05**: Log migration to `.specweave/logs/migration.log`

**Migration Algorithm**:
```typescript
if (config.multiProject.enabled === true) {
  const projectCount = Object.keys(config.multiProject.projects).length;

  if (projectCount === 1) {
    // Single project incorrectly in multi-project mode
    const singleProject = Object.values(config.multiProject.projects)[0];

    // Migrate to single-project mode
    config.multiProject.enabled = false;
    config.project = singleProject;  // Move to top-level

    console.log('✅ Migrated to single-project mode');
  }
}
```

---

### US-006: Update Project Folder Guard Hook (P1)
**Project**: specweave

**As a** developer
**I want** project-folder-guard to respect single-project mode
**So that** validation logic is consistent

**Acceptance Criteria**:
- [x] **AC-US6-01**: Check `multiProject.enabled` flag FIRST
- [x] **AC-US6-02**: If false, only allow `project.name` folder
- [x] **AC-US6-03**: If true, check `multiProject.projects` structure
- [x] **AC-US6-04**: Error messages guide to correct mode
- [x] **AC-US6-05**: Hook handles both modes correctly

**Hook Update** ([project-folder-guard.sh](../../../../../../plugins/specweave/hooks/project-folder-guard.sh)):
```bash
# NEW: Check multiProject.enabled FIRST
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode - only allow project.name folder
  ALLOWED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE")

  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
    echo "❌ BLOCKED: This is a SINGLE-PROJECT repository"
    echo "   Only folder allowed: $ALLOWED_PROJECT"
    echo "   To enable multi-project: /specweave:enable-multiproject"
    exit 1
  fi
else
  # Multi-project mode - check multiProject.projects
  # ... existing validation
fi
```

---

### US-007: Documentation Updates (P1)
**Project**: specweave

**As a** developer
**I want** clear docs on single vs multi-project workflows
**So that** I understand when/how to use each mode

**Acceptance Criteria**:
- [x] **AC-US7-01**: CLAUDE.md explains single-project-first principle
- [x] **AC-US7-02**: Document `/specweave:enable-multiproject` flow
- [x] **AC-US7-03**: Document `/specweave:switch-project` usage
- [x] **AC-US7-04**: Update init command docs with default behavior

**Documentation Sections to Add**:

1. **CLAUDE.md Section 2h**: "Single-Project-First Architecture"
2. **Migration Guide**: `.specweave/docs/internal/guides/multi-project-migration.md`
3. **FAQ**: When to use single vs multi-project mode

---

### US-008: Living Docs Sync Respects Mode (P1)
**Project**: specweave

**As a** developer
**I want** living docs sync to use correct folder structure
**So that** files go to right location based on mode

**Acceptance Criteria**:
- [x] **AC-US8-01**: Single-project: all features go to `{project.name}/` folder
- [x] **AC-US8-02**: Multi-project: features distributed by spec.md `project:` field
- [x] **AC-US8-03**: No `project:` field validation in single-project mode
- [x] **AC-US8-04**: Automatic project resolution in single-project mode
- [x] **AC-US8-05**: Update [living-docs-sync.ts:625](../../../../../../../src/core/living-docs/living-docs-sync.ts#L625) to check mode

**Code Update** (living-docs-sync.ts):
```typescript
private async resolveProjectPath(incrementId: string): Promise<string> {
  // NEW: Check if single-project mode
  const config = await this.configManager.read();
  const isSingleProject = config.multiProject?.enabled !== true;

  if (isSingleProject) {
    // Single-project mode: use project.name for ALL increments
    const projectName = config.project?.name || 'specweave';
    this.logger.log(`📁 Single-project mode: using ${projectName}`);
    return projectName;
  }

  // Multi-project mode: existing logic
  // ...
}
```

---

## Technical Architecture

### Config Schema Changes

**Before (Bug)**:
```json
{
  "project": {"name": "specweave"},
  "multiProject": {
    "enabled": true,  // ← WRONG for single project!
    "projects": {"specweave": {...}}
  }
}
```

**After (Single-Project Mode - DEFAULT)**:
```json
{
  "project": {
    "name": "specweave",
    "description": "...",
    "techStack": [...]
  },
  "multiProject": {
    "enabled": false  // ← CORRECT default!
  }
}
```

**After (Multi-Project Mode - EXPLICIT OPT-IN)**:
```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "specweave",
    "projects": {
      "specweave": {...},
      "frontend-app": {...}
    }
  }
}
```

### Validation Points

1. **init.ts** - Create single-project config by default
2. **spec validators** - Block `project:` in single-project mode
3. **living-docs-sync** - Auto-fill project from config
4. **project-folder-guard** - Check mode first, then validate

### Migration Detection

```typescript
// src/core/config/single-project-migrator.ts
export async function detectAndMigrateSingleProject(config: Config): Promise<Config> {
  if (config.multiProject?.enabled !== true) {
    return config; // Already in single-project mode
  }

  const projectCount = Object.keys(config.multiProject.projects || {}).length;

  if (projectCount === 1) {
    // Single project with multi-project enabled = BUG
    const [projectId, projectData] = Object.entries(config.multiProject.projects)[0];

    console.log(`🔧 Auto-migrating to single-project mode (found 1 project: ${projectId})`);

    return {
      ...config,
      project: projectData,
      multiProject: {
        enabled: false
      }
    };
  }

  return config; // Genuinely multi-project
}
```

---

## Files Changed

**Core Files**:
- `src/cli/commands/init.ts` - Default to single-project mode
- `src/cli/commands/enable-multiproject.ts` - NEW command
- `src/cli/commands/switch-project.ts` - NEW command
- `src/core/config/single-project-migrator.ts` - NEW migration logic
- `src/core/living-docs/living-docs-sync.ts` - Check mode before sync
- `plugins/specweave/hooks/project-folder-guard.sh` - Update validation
- `plugins/specweave/hooks/spec-project-validator.sh` - Update validation

**Documentation**:
- `CLAUDE.md` - Add section 2h
- `.specweave/docs/internal/guides/multi-project-migration.md` - NEW guide
- `README.md` - Update init command docs

**Tests**:
- `tests/unit/config/single-project-migrator.test.ts` - NEW
- `tests/integration/commands/enable-multiproject.test.ts` - NEW
- `tests/integration/commands/switch-project.test.ts` - NEW

---

## Success Criteria

- [ ] User with ONE project has `multiProject.enabled=false`
- [ ] No accidental project folder creation
- [ ] Clear migration path to multi-project when needed
- [ ] All existing functionality preserved
- [ ] Existing single-project repos auto-migrate on next command
- [ ] New installs default to single-project mode
- [ ] Comprehensive test coverage (80%+)

---

## Out of Scope

- Multi-level structures beyond 2 levels
- Automatic project detection from codebase
- Project templates or scaffolding
- Cross-project dependency management

---

## Dependencies

None - this is a foundational architecture fix.

---

## Risks & Mitigation

**Risk**: Breaking existing multi-project setups
**Mitigation**: Migration only affects repos with exactly 1 project

**Risk**: Users manually edited config
**Mitigation**: Preserve all existing metadata during migration

**Risk**: Hooks break during migration
**Mitigation**: Hooks check mode flag first, degrade gracefully

---

## Implementation Notes

1. **Migration runs automatically** - no user action needed for existing repos
2. **Backwards compatible** - genuinely multi-project setups unaffected
3. **Hook updates required** - spec-project-validator and project-folder-guard
4. **Documentation critical** - users need clear guidance on when to enable multi-project

---

## References

- Bug Report: Project folders created for examples (MyApp, frontend-app, etc.)
- Root Cause: [living-docs-sync.ts:684](../../../../../../../src/core/living-docs/living-docs-sync.ts#L684) trusts `project:` without validation
- Related: ADR-0194 (config/secrets separation)
