---
increment: 0138-single-project-first-architecture
title: "Single-Project-First Architecture - Implementation Plan"
created: 2025-12-10
---

# Technical Implementation Plan

## Overview

This plan details the implementation of single-project-first architecture to fix the auto-enable multi-project bug that causes accidental project folder creation.

---

## Architecture Decisions

### AD-001: Default to Single-Project Mode

**Decision**: `multiProject.enabled` defaults to `false` for all new installations.

**Rationale**:
- 99% of SpecWeave users have single projects
- Multi-project mode adds unnecessary complexity for simple use cases
- Explicit opt-in prevents accidental misconfiguration

**Implementation**:
- Update `init.ts` to create single-project config
- Update default config templates
- Add migration for existing single-project repos

---

### AD-002: Auto-Migration for Existing Repos

**Decision**: Automatically detect and migrate repos with exactly 1 project to single-project mode.

**Rationale**:
- User shouldn't manually fix configuration
- Safe to migrate: preserves all metadata
- Runs on ANY specweave command (non-blocking)

**Implementation**:
```typescript
// Runs before every CLI command
const config = await ConfigManager.load();
const migrated = await detectAndMigrateSingleProject(config);
if (migrated !== config) {
  await ConfigManager.save(migrated);
  console.log('✅ Auto-migrated to single-project mode');
}
```

---

### AD-003: Two-Phase Hook Validation

**Decision**: Hooks check `multiProject.enabled` FIRST before validating project fields.

**Rationale**:
- Single-project mode: simpler validation (just check project.name)
- Multi-project mode: complex validation (check multiProject.projects)
- Prevents confusing error messages

**Implementation**:
```bash
# project-folder-guard.sh
if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project validation
  ALLOWED_PROJECT=$(jq -r '.project.name' "$CONFIG_FILE")
  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
    echo "❌ Single-project mode: only $ALLOWED_PROJECT allowed"
    echo "💡 To enable multi-project: /specweave:enable-multiproject"
    exit 1
  fi
else
  # Multi-project validation (existing logic)
  ...
fi
```

---

## Component Architecture

### Component 1: Single-Project Migrator

**Location**: `src/core/config/single-project-migrator.ts`

**Responsibilities**:
- Detect single-project repos with `enabled=true`
- Migrate config structure
- Preserve all metadata
- Log migration

**API**:
```typescript
export interface MigrationResult {
  migrated: boolean;
  reason?: string;
  preservedFields: string[];
}

export async function detectAndMigrateSingleProject(
  config: Config
): Promise<{ config: Config; result: MigrationResult }>;
```

**Algorithm**:
```typescript
1. Check if multiProject.enabled === true
2. Count projects in multiProject.projects
3. If exactly 1 project:
   a. Extract project data
   b. Move to top-level project field
   c. Set multiProject.enabled = false
   d. Log migration
4. Return updated config
```

---

### Component 2: Enable Multi-Project Command

**Location**: `src/cli/commands/enable-multiproject.ts`

**Responsibilities**:
- Prompt user for confirmation
- Migrate single-project config to multi-project
- Create project folders
- Update existing increments

**Flow**:
```
1. Check current mode
   → If already multi-project: exit with message

2. Show confirmation prompt
   → Explain changes
   → Require explicit "yes"

3. Migrate config structure
   → Move project to multiProject.projects
   → Set enabled = true
   → Create activeProject field

4. Create folder structure
   → mkdir .specweave/docs/internal/specs/{project}/

5. Update existing increments
   → Add project: field to all spec.md files

6. Success message
   → Guide user on next steps
```

---

### Component 3: Switch Project Command

**Location**: `src/cli/commands/switch-project.ts`

**Responsibilities**:
- List available projects
- Validate project exists
- Update activeProject
- Only works in multi-project mode

**Flow**:
```
1. Check if multi-project enabled
   → If not: error "Run /specweave:enable-multiproject first"

2. List projects from config
   → Show current active project
   → Show all available projects

3. Prompt for selection
   → Validate selection

4. Update config
   → Set multiProject.activeProject

5. Confirm
   → "✅ Switched to {project}"
```

---

### Component 4: Updated Hooks

#### Hook 1: project-folder-guard.sh

**Changes**:
```bash
# NEW: Check mode first
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode validation
  ALLOWED_PROJECT=$(jq -r '.project.name // "specweave"' "$CONFIG_FILE")

  if [ "$PROJECT_NAME" != "$ALLOWED_PROJECT" ]; then
    echo "❌ BLOCKED: Single-project mode"
    echo "   Only folder allowed: $ALLOWED_PROJECT"
    echo "   Current attempt: $PROJECT_NAME"
    echo ""
    echo "💡 To enable multi-project mode:"
    echo "   /specweave:enable-multiproject"
    exit 1
  fi

  # Single project validated - allow
  exit 0
fi

# Multi-project mode - existing validation logic
...
```

#### Hook 2: spec-project-validator.sh

**Changes**:
```bash
# NEW: In single-project mode, project: field is OPTIONAL
MULTI_PROJECT_ENABLED=$(jq -r '.multiProject.enabled // false' "$CONFIG_FILE")

if [ "$MULTI_PROJECT_ENABLED" != "true" ]; then
  # Single-project mode: project: field not required
  # But if present, must match project.name

  if [ -n "$PROJECT_VALUE" ]; then
    # User specified project: field - validate it
    EXPECTED_PROJECT=$(jq -r '.project.name' "$CONFIG_FILE")

    if [ "$PROJECT_VALUE" != "$EXPECTED_PROJECT" ]; then
      echo "❌ BLOCKED: project: field mismatch"
      echo "   Expected: $EXPECTED_PROJECT"
      echo "   Got: $PROJECT_VALUE"
      exit 1
    fi
  fi

  # Single-project mode - no board: field allowed
  if [ -n "$BOARD_VALUE" ]; then
    echo "❌ BLOCKED: board: field not allowed in single-project mode"
    echo "   Remove board: field or run /specweave:enable-multiproject"
    exit 1
  fi

  exit 0
fi

# Multi-project mode - existing strict validation
...
```

---

### Component 5: Living Docs Sync Update

**Location**: `src/core/living-docs/living-docs-sync.ts`

**Changes**:
```typescript
private async resolveProjectPath(incrementId: string): Promise<string> {
  const config = await this.configManager.read();
  const isSingleProject = config.multiProject?.enabled !== true;

  if (isSingleProject) {
    // Single-project mode: ALWAYS use project.name
    const projectName = config.project?.name || 'specweave';
    this.logger.log(`📁 Single-project mode: ${projectName} (auto-resolved)`);
    return projectName;
  }

  // Multi-project mode: existing complex logic
  // Extract project and board from spec.md
  const { project, board } = await this.extractProjectBoardFromSpec(incrementId);
  ...
}
```

**Benefits**:
- Simpler logic in single-project mode
- No need for `specweave context projects` call
- Auto-resolution prevents user errors

---

## Data Migration

### Migration Flow

```
1. User runs ANY specweave command
   ↓
2. ConfigManager.load() called
   ↓
3. detectAndMigrateSingleProject() runs
   ↓
4. Check: multiProject.enabled === true?
   ├─ No → Skip migration
   └─ Yes → Check project count
       ├─ Multiple projects → Skip migration
       └─ Single project → MIGRATE!
           ↓
       4a. Extract project data
       4b. Create new config structure
       4c. Set multiProject.enabled = false
       4d. Move project to top-level
       4e. Save config
       4f. Log to .specweave/logs/migration.log
```

### Migration Safety

**Preserved Fields**:
- Project name, description, tech stack
- All external tool configurations
- All project metadata
- Existing increments unchanged

**Rollback**:
- Original config backed up to `.specweave/config.json.backup`
- Manual rollback: `cp .specweave/config.json.backup .specweave/config.json`

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/config/single-project-migrator.test.ts`

```typescript
describe('Single-Project Migrator', () => {
  it('migrates single project with enabled=true to enabled=false', () => {
    const before = {
      multiProject: {
        enabled: true,
        projects: { specweave: {...} }
      }
    };

    const after = detectAndMigrateSingleProject(before);

    expect(after.multiProject.enabled).toBe(false);
    expect(after.project).toEqual(before.multiProject.projects.specweave);
  });

  it('preserves multi-project setups with 2+ projects', () => {
    const before = {
      multiProject: {
        enabled: true,
        projects: { proj1: {...}, proj2: {...} }
      }
    };

    const after = detectAndMigrateSingleProject(before);

    expect(after).toEqual(before); // No migration
  });

  it('skips already single-project configs', () => {
    const before = {
      project: {...},
      multiProject: { enabled: false }
    };

    const after = detectAndMigrateSingleProject(before);

    expect(after).toEqual(before); // No changes
  });
});
```

### Integration Tests

**File**: `tests/integration/commands/enable-multiproject.test.ts`

```typescript
describe('/specweave:enable-multiproject', () => {
  it('migrates single-project to multi-project', async () => {
    // Setup single-project repo
    await setupTestRepo({ singleProject: true });

    // Run command
    await runCommand('enable-multiproject', { confirm: true });

    // Verify
    const config = await ConfigManager.load();
    expect(config.multiProject.enabled).toBe(true);
    expect(config.multiProject.projects).toHaveProperty('specweave');
  });

  it('creates project folders', async () => {
    await setupTestRepo({ singleProject: true });
    await runCommand('enable-multiproject', { confirm: true });

    const folderExists = fs.existsSync('.specweave/docs/internal/specs/specweave');
    expect(folderExists).toBe(true);
  });

  it('updates existing increment specs', async () => {
    await setupTestRepo({ singleProject: true });
    await createTestIncrement('0001-test');

    await runCommand('enable-multiproject', { confirm: true });

    const spec = await readFile('.specweave/increments/0001-test/spec.md');
    expect(spec).toContain('project: specweave');
  });
});
```

**File**: `tests/integration/hooks/project-folder-guard.test.ts`

```typescript
describe('project-folder-guard hook', () => {
  it('blocks non-project folders in single-project mode', async () => {
    await setupSingleProjectRepo();

    const result = await Write({
      file_path: '.specweave/docs/internal/specs/frontend-app/FS-001/FEATURE.md',
      content: '# Test'
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Single-project mode');
    expect(result.reason).toContain('/specweave:enable-multiproject');
  });

  it('allows project.name folder in single-project mode', async () => {
    await setupSingleProjectRepo({ projectName: 'my-app' });

    const result = await Write({
      file_path: '.specweave/docs/internal/specs/my-app/FS-001/FEATURE.md',
      content: '# Test'
    });

    expect(result.blocked).toBe(false);
  });

  it('validates multiple projects in multi-project mode', async () => {
    await setupMultiProjectRepo();

    const result = await Write({
      file_path: '.specweave/docs/internal/specs/invalid-project/FS-001/FEATURE.md',
      content: '# Test'
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('NOT configured');
  });
});
```

---

## Rollout Plan

### Phase 1: Core Implementation (P0)
- [ ] Implement single-project-migrator.ts
- [ ] Update init.ts to default to single-project
- [ ] Update living-docs-sync.ts to check mode
- [ ] Update project-folder-guard.sh hook

### Phase 2: Commands (P0)
- [ ] Implement /specweave:enable-multiproject
- [ ] Implement /specweave:switch-project (P1)
- [ ] Add command tests

### Phase 3: Documentation (P1)
- [ ] Add CLAUDE.md section 2h
- [ ] Create migration guide
- [ ] Update README.md

### Phase 4: Testing & Validation (P0)
- [ ] Unit tests for migrator
- [ ] Integration tests for commands
- [ ] Hook tests
- [ ] Manual QA on real repos

---

## Performance Considerations

**Migration Performance**:
- Runs on every command (overhead)
- Solution: Cache migration result in memory
- Only run once per session

**Hook Performance**:
- Two-phase check adds jq call
- Solution: Minimal - jq is fast (<10ms)

---

## Security Considerations

**Config Validation**:
- Validate project names (no path traversal)
- Sanitize folder names
- Prevent overwriting existing folders

**Hook Security**:
- No shell injection risks (jq handles escaping)
- File paths validated before creation

---

## Monitoring & Logging

**Migration Logs**:
```
.specweave/logs/migration.log

2025-12-10T12:00:00Z [INFO] Auto-migration started
2025-12-10T12:00:00Z [INFO] Detected: single project (specweave)
2025-12-10T12:00:00Z [INFO] Config updated: multiProject.enabled=false
2025-12-10T12:00:00Z [INFO] Backup created: config.json.backup
2025-12-10T12:00:00Z [SUCCESS] Migration complete
```

**Command Logs**:
```
.specweave/logs/commands.log

2025-12-10T12:05:00Z [INFO] /specweave:enable-multiproject started
2025-12-10T12:05:15Z [INFO] User confirmed migration
2025-12-10T12:05:16Z [INFO] Created project folder: specweave
2025-12-10T12:05:17Z [SUCCESS] Multi-project mode enabled
```

---

## Success Metrics

- [ ] 0 project folders created for example User Stories
- [ ] 100% of single-project repos migrated automatically
- [ ] <50ms overhead for migration check
- [ ] 80%+ test coverage
- [ ] 0 data loss during migration
- [ ] Clear error messages guide users to solutions

---

## Future Enhancements

1. **Project Templates**: Pre-configured project structures
2. **Auto-Detection**: Detect multi-project from codebase structure
3. **Cross-Project Deps**: Dependency graph between projects
4. **Project Scoping**: Scope commands to specific projects

---

## Implementation Checklist

### Core Changes
- [ ] Create single-project-migrator.ts
- [ ] Update ConfigManager to run migration on load
- [ ] Update init.ts to create single-project config
- [ ] Update living-docs-sync.ts resolveProjectPath()

### Commands
- [ ] Create enable-multiproject.ts
- [ ] Create switch-project.ts
- [ ] Register commands in CLI

### Hooks
- [ ] Update project-folder-guard.sh
- [ ] Update spec-project-validator.sh
- [ ] Test hooks in both modes

### Tests
- [ ] Unit tests for migrator
- [ ] Integration tests for enable-multiproject
- [ ] Integration tests for switch-project
- [ ] Hook integration tests

### Documentation
- [ ] CLAUDE.md section 2h
- [ ] Multi-project migration guide
- [ ] Update README.md
- [ ] Update init command docs

---

## References

- Spec: [0138-single-project-first-architecture/spec.md](./spec.md)
- Bug Report: MyApp/frontend-app folders created from examples
- Root Cause: living-docs-sync.ts line 684
