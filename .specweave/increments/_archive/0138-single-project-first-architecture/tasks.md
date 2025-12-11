---
increment: 0138-single-project-first-architecture
status: planned
test_mode: test-after
coverage_target: 80
phases:
  - core-migration
  - commands
  - hooks
  - living-docs
  - documentation
  - testing
---

# Implementation Tasks

**Strategy**: Implement in phases - Core migration first, then commands, then hooks, then docs.

---

## Phase 1: Core Migration Logic

### T-001: Create SingleProjectMigrator utility
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Create `src/core/config/single-project-migrator.ts`
2. Implement `detectAndMigrateSingleProject()` function
3. Add migration result interface
4. Add logging to `.specweave/logs/migration.log`

**Acceptance Criteria**:
- Detects repos with exactly 1 project in multiProject.projects
- Sets multiProject.enabled=false when migrating
- Moves project data to top-level project field
- Preserves all metadata (techStack, externalTools, etc.)
- Logs migration with timestamp

**Test Plan**:
```typescript
describe('SingleProjectMigrator', () => {
  describe('detectAndMigrateSingleProject', () => {
    it('migrates single project with enabled=true', () => {
      // Given a config with one project and enabled=true
      const config = {
        multiProject: {
          enabled: true,
          projects: {
            'specweave': {
              id: 'specweave',
              name: 'SpecWeave',
              techStack: ['TypeScript']
            }
          }
        }
      };

      // When migration runs
      const result = detectAndMigrateSingleProject(config);

      // Then config is migrated to single-project
      expect(result.config.multiProject.enabled).toBe(false);
      expect(result.config.project).toEqual({
        id: 'specweave',
        name: 'SpecWeave',
        techStack: ['TypeScript']
      });
      expect(result.migrated).toBe(true);
    });

    it('skips multi-project repos (2+ projects)', () => {
      // Given a config with multiple projects
      const config = {
        multiProject: {
          enabled: true,
          projects: {
            'proj1': {...},
            'proj2': {...}
          }
        }
      };

      // When migration runs
      const result = detectAndMigrateSingleProject(config);

      // Then no migration occurs
      expect(result.config).toEqual(config);
      expect(result.migrated).toBe(false);
      expect(result.reason).toBe('multiple projects detected');
    });

    it('skips already single-project configs', () => {
      // Given already single-project config
      const config = {
        project: {...},
        multiProject: { enabled: false }
      };

      // When migration runs
      const result = detectAndMigrateSingleProject(config);

      // Then no changes
      expect(result.config).toEqual(config);
      expect(result.migrated).toBe(false);
    });
  });
});
```

---

### T-002: Integrate migrator into ConfigManager
**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 1 hour

**Implementation**:
1. Update `src/core/config/config-manager.ts`
2. Add migration call in `load()` method
3. Cache migration result in memory (avoid re-running)
4. Handle migration errors gracefully

**Acceptance Criteria**:
- Migration runs automatically on first config load
- Result cached for session (no redundant migrations)
- Errors logged but don't block normal operation
- Config saved after successful migration

**Test Plan**:
```typescript
describe('ConfigManager with migration', () => {
  it('runs migration on first load', async () => {
    // Given config with single project + enabled=true
    await setupConfig({
      multiProject: {
        enabled: true,
        projects: { 'app': {...} }
      }
    });

    // When loading config
    const config = await ConfigManager.load();

    // Then migration executed
    expect(config.multiProject.enabled).toBe(false);
    expect(config.project).toBeDefined();
  });

  it('caches migration result (no re-run)', async () => {
    const migrateSpy = vi.spyOn(migrator, 'detectAndMigrateSingleProject');

    // When loading multiple times
    await ConfigManager.load();
    await ConfigManager.load();
    await ConfigManager.load();

    // Then migration only runs once
    expect(migrateSpy).toHaveBeenCalledTimes(1);
  });

  it('handles migration errors gracefully', async () => {
    vi.spyOn(migrator, 'detectAndMigrateSingleProject')
      .mockImplementation(() => { throw new Error('Migration failed'); });

    // When loading config with migration error
    const config = await ConfigManager.load();

    // Then returns original config (no crash)
    expect(config).toBeDefined();
  });
});
```

---

### T-003: Update init.ts to create single-project config
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 1 hour

**Implementation**:
1. Update `src/cli/commands/init.ts`
2. Change default config template
3. Set `multiProject.enabled = false`
4. Remove `multiProject.projects` structure by default

**Acceptance Criteria**:
- New repos get `multiProject.enabled=false`
- Only `project` field created (no `multiProject.projects`)
- activeProject not set in single-project mode
- Existing multi-project init flows unchanged

**Test Plan**:
```typescript
describe('specweave init (single-project)', () => {
  it('creates single-project config by default', async () => {
    // When running init
    await runInit({ projectName: 'my-app' });

    // Then config is single-project
    const config = await readConfig();
    expect(config.multiProject.enabled).toBe(false);
    expect(config.project.name).toBe('my-app');
    expect(config.multiProject.projects).toBeUndefined();
  });

  it('does not create multiProject.projects structure', async () => {
    await runInit({ projectName: 'test-app' });

    const config = await readConfig();
    expect(config.multiProject).toEqual({ enabled: false });
  });
});
```

---

## Phase 2: Commands

### T-004: Create /specweave:enable-multiproject command
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 3 hours

**Implementation**:
1. Create `src/cli/commands/enable-multiproject.ts`
2. Add confirmation prompt with explanation
3. Migrate `project` to `multiProject.projects`
4. Set `multiProject.enabled = true`
5. Set `multiProject.activeProject`

**Acceptance Criteria**:
- Command shows clear explanation of changes
- Requires explicit user confirmation
- Migrates project data to multiProject.projects
- Creates activeProject field
- Fails gracefully if already multi-project

**Test Plan**:
```typescript
describe('/specweave:enable-multiproject', () => {
  it('prompts for confirmation', async () => {
    const promptSpy = vi.spyOn(prompts, 'confirm');

    await runCommand('enable-multiproject');

    expect(promptSpy).toHaveBeenCalledWith(
      expect.stringContaining('Multi-Project Mode')
    );
  });

  it('migrates single-project to multi-project', async () => {
    await setupSingleProjectRepo({ projectName: 'my-app' });

    await runCommand('enable-multiproject', { confirm: true });

    const config = await readConfig();
    expect(config.multiProject.enabled).toBe(true);
    expect(config.multiProject.projects['my-app']).toBeDefined();
    expect(config.multiProject.activeProject).toBe('my-app');
  });

  it('fails if already multi-project', async () => {
    await setupMultiProjectRepo();

    const result = await runCommand('enable-multiproject');

    expect(result.error).toContain('already enabled');
  });

  it('cancels if user declines', async () => {
    await setupSingleProjectRepo();

    await runCommand('enable-multiproject', { confirm: false });

    const config = await readConfig();
    expect(config.multiProject.enabled).toBe(false);
  });
});
```

---

### T-005: Create project folders during migration
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Model**: ⚡ Haiku
**Estimated Effort**: 1 hour

**Implementation**:
1. Update enable-multiproject command
2. Create `.specweave/docs/internal/specs/{project}/` folders
3. Handle folder creation errors

**Acceptance Criteria**:
- Creates project folder after enabling multi-project
- Skips if folder already exists
- Logs folder creation

**Test Plan**:
```typescript
describe('enable-multiproject folder creation', () => {
  it('creates project folder', async () => {
    await setupSingleProjectRepo({ projectName: 'app' });

    await runCommand('enable-multiproject', { confirm: true });

    const folderExists = fs.existsSync('.specweave/docs/internal/specs/app');
    expect(folderExists).toBe(true);
  });

  it('skips existing folders', async () => {
    await setupSingleProjectRepo({ projectName: 'app' });
    fs.mkdirSync('.specweave/docs/internal/specs/app', { recursive: true });

    await runCommand('enable-multiproject', { confirm: true });

    // No error thrown
    expect(true).toBe(true);
  });
});
```

---

### T-006: Update existing increments with project field
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Scan all increments in `.specweave/increments/`
2. Read spec.md frontmatter
3. Add `project:` field if missing
4. Preserve existing frontmatter structure

**Acceptance Criteria**:
- All existing increments get `project:` field
- Uses migrated project name as value
- Preserves other frontmatter fields
- Logs updates

**Test Plan**:
```typescript
describe('update existing increments', () => {
  it('adds project field to increments', async () => {
    await setupSingleProjectRepo({ projectName: 'my-app' });
    await createTestIncrement('0001-feature', { projectField: false });

    await runCommand('enable-multiproject', { confirm: true });

    const spec = await readSpec('0001-feature');
    expect(spec.frontmatter.project).toBe('my-app');
  });

  it('preserves existing frontmatter', async () => {
    await createTestIncrement('0002-test', {
      frontmatter: { priority: 'P1', type: 'feature' }
    });

    await runCommand('enable-multiproject', { confirm: true });

    const spec = await readSpec('0002-test');
    expect(spec.frontmatter.priority).toBe('P1');
    expect(spec.frontmatter.type).toBe('feature');
  });

  it('skips increments with project field', async () => {
    await createTestIncrement('0003-existing', {
      frontmatter: { project: 'custom' }
    });

    await runCommand('enable-multiproject', { confirm: true });

    const spec = await readSpec('0003-existing');
    expect(spec.frontmatter.project).toBe('custom'); // Unchanged
  });
});
```

---

### T-007: Create /specweave:switch-project command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Create `src/cli/commands/switch-project.ts`
2. Check if multi-project enabled
3. List available projects from config
4. Prompt for selection
5. Update `multiProject.activeProject`

**Acceptance Criteria**:
- Only works if multiProject.enabled=true
- Lists all projects from config
- Shows current active project
- Validates selection before updating
- Confirms switch

**Test Plan**:
```typescript
describe('/specweave:switch-project', () => {
  it('fails in single-project mode', async () => {
    await setupSingleProjectRepo();

    const result = await runCommand('switch-project');

    expect(result.error).toContain('multi-project mode');
    expect(result.error).toContain('/specweave:enable-multiproject');
  });

  it('lists available projects', async () => {
    await setupMultiProjectRepo({ projects: ['proj-a', 'proj-b'] });
    const promptSpy = vi.spyOn(prompts, 'select');

    await runCommand('switch-project');

    expect(promptSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'proj-a' }),
          expect.objectContaining({ value: 'proj-b' })
        ])
      })
    );
  });

  it('updates activeProject', async () => {
    await setupMultiProjectRepo({
      projects: ['proj-a', 'proj-b'],
      active: 'proj-a'
    });

    await runCommand('switch-project', { select: 'proj-b' });

    const config = await readConfig();
    expect(config.multiProject.activeProject).toBe('proj-b');
  });

  it('validates project exists', async () => {
    await setupMultiProjectRepo({ projects: ['proj-a'] });

    const result = await runCommand('switch-project', { select: 'invalid' });

    expect(result.error).toContain('not found');
  });
});
```

---

## Phase 3: Hook Updates

### T-008: Update project-folder-guard.sh hook
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Update `plugins/specweave/hooks/project-folder-guard.sh`
2. Add check for `multiProject.enabled` flag FIRST
3. Single-project mode: only allow `project.name` folder
4. Multi-project mode: existing validation logic

**Acceptance Criteria**:
- Checks multiProject.enabled before other validation
- Single-project mode: only allows project.name folder
- Multi-project mode: validates against multiProject.projects
- Clear error messages guide users to correct action

**Test Plan**:
```bash
describe('project-folder-guard hook', () => {
  describe('single-project mode', () => {
    it('blocks non-project folders', async () => {
      await setupSingleProjectRepo({ projectName: 'my-app' });

      const result = await testHook('project-folder-guard', {
        tool: 'Write',
        args: {
          file_path: '.specweave/docs/internal/specs/other-app/FS-001/FEATURE.md'
        }
      });

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('Single-project mode');
      expect(result.message).toContain('Only folder allowed: my-app');
      expect(result.message).toContain('/specweave:enable-multiproject');
    });

    it('allows project.name folder', async () => {
      await setupSingleProjectRepo({ projectName: 'my-app' });

      const result = await testHook('project-folder-guard', {
        tool: 'Write',
        args: {
          file_path: '.specweave/docs/internal/specs/my-app/FS-001/FEATURE.md'
        }
      });

      expect(result.blocked).toBe(false);
    });
  });

  describe('multi-project mode', () => {
    it('validates against configured projects', async () => {
      await setupMultiProjectRepo({ projects: ['proj-a', 'proj-b'] });

      const result = await testHook('project-folder-guard', {
        tool: 'Write',
        args: {
          file_path: '.specweave/docs/internal/specs/proj-c/FS-001/FEATURE.md'
        }
      });

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('NOT configured');
      expect(result.message).toContain('Valid projects: proj-a, proj-b');
    });
  });
});
```

---

### T-009: Update spec-project-validator.sh hook
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-03, AC-US4-05
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Update `plugins/specweave/hooks/spec-project-validator.sh`
2. Check multiProject.enabled flag first
3. Single-project: project field optional, board forbidden
4. Multi-project: existing strict validation

**Acceptance Criteria**:
- Single-project mode: project field is optional
- Single-project mode: board field is forbidden
- Multi-project mode: project field is required
- Clear error messages

**Test Plan**:
```bash
describe('spec-project-validator hook', () => {
  describe('single-project mode', () => {
    it('allows spec without project field', async () => {
      await setupSingleProjectRepo();

      const result = await testHook('spec-project-validator', {
        tool: 'Write',
        args: {
          file_path: '.specweave/increments/0001-test/spec.md',
          content: '---\nincrement: 0001-test\n---'
        }
      });

      expect(result.blocked).toBe(false);
    });

    it('validates project field if present', async () => {
      await setupSingleProjectRepo({ projectName: 'my-app' });

      const result = await testHook('spec-project-validator', {
        tool: 'Write',
        args: {
          file_path: '.specweave/increments/0001-test/spec.md',
          content: '---\nproject: wrong-app\n---'
        }
      });

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('project: field mismatch');
    });

    it('blocks board field', async () => {
      await setupSingleProjectRepo();

      const result = await testHook('spec-project-validator', {
        tool: 'Write',
        args: {
          file_path: '.specweave/increments/0001-test/spec.md',
          content: '---\nboard: some-board\n---'
        }
      });

      expect(result.blocked).toBe(true);
      expect(result.message).toContain('board: field not allowed');
    });
  });
});
```

---

## Phase 4: Living Docs Integration

### T-010: Update living-docs-sync.ts resolveProjectPath()
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-04, AC-US8-05
**Status**: [x] completed
**Model**: 💎 Opus
**Estimated Effort**: 2 hours

**Implementation**:
1. Update `src/core/living-docs/living-docs-sync.ts`
2. Add mode check in `resolveProjectPath()`
3. Single-project: return `project.name` directly
4. Multi-project: existing complex logic

**Acceptance Criteria**:
- Single-project mode: always uses project.name
- No need for spec.md project: field in single-project
- Multi-project mode: uses existing resolution logic
- Logs mode and resolved path

**Test Plan**:
```typescript
describe('LivingDocsSync.resolveProjectPath', () => {
  it('uses project.name in single-project mode', async () => {
    await setupSingleProjectRepo({ projectName: 'my-app' });
    const sync = new LivingDocsSync(projectRoot);

    const path = await sync.resolveProjectPath('0001-test');

    expect(path).toBe('my-app');
  });

  it('ignores spec.md project field in single-project', async () => {
    await setupSingleProjectRepo({ projectName: 'correct-app' });
    await createIncrement('0001-test', {
      frontmatter: { project: 'wrong-app' }
    });

    const sync = new LivingDocsSync(projectRoot);
    const path = await sync.resolveProjectPath('0001-test');

    expect(path).toBe('correct-app'); // Uses config, not spec
  });

  it('uses spec.md project in multi-project mode', async () => {
    await setupMultiProjectRepo({ projects: ['proj-a', 'proj-b'] });
    await createIncrement('0001-test', {
      frontmatter: { project: 'proj-b' }
    });

    const sync = new LivingDocsSync(projectRoot);
    const path = await sync.resolveProjectPath('0001-test');

    expect(path).toBe('proj-b');
  });
});
```

---

## Phase 5: Documentation

### T-011: Add CLAUDE.md section 2h
**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [x] completed
**Model**: ⚡ Haiku
**Estimated Effort**: 1 hour

**Implementation**:
1. Update `CLAUDE.md`
2. Add section 2h after section 2g
3. Document single-project-first principle
4. Document when to use multi-project mode

**Acceptance Criteria**:
- Clear explanation of default single-project mode
- Examples of when to use each mode
- Links to migration command
- Troubleshooting section

**Test Plan**: Manual review of documentation clarity

---

### T-012: Create multi-project migration guide
**User Story**: US-007
**Satisfies ACs**: AC-US7-02
**Status**: [x] completed
**Model**: ⚡ Haiku
**Estimated Effort**: 1 hour

**Implementation**:
1. Create `.specweave/docs/internal/guides/multi-project-migration.md`
2. Step-by-step migration guide
3. Before/after config examples
4. Troubleshooting common issues

**Acceptance Criteria**:
- Clear step-by-step instructions
- Config examples for both modes
- Common issues and solutions
- Links to relevant commands

**Test Plan**: Manual review

---

### T-013: Update README.md and init docs
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [x] completed
**Model**: ⚡ Haiku
**Estimated Effort**: 30 minutes

**Implementation**:
1. Update README.md to mention single-project default
2. Update init command documentation
3. Add note about multi-project mode

**Acceptance Criteria**:
- README clearly states single-project default
- Init docs explain default behavior
- Link to multi-project migration guide

**Test Plan**: Manual review

---

## Phase 6: Testing & Validation

### T-014: Write unit tests for migrator
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [ ] pending
**Model**: ⚡ Haiku
**Estimated Effort**: 2 hours

**Implementation**:
1. Create `tests/unit/config/single-project-migrator.test.ts`
2. Test all migration scenarios
3. Test edge cases (empty config, corrupted data)
4. Test metadata preservation

**Acceptance Criteria**:
- 100% code coverage for migrator
- All edge cases tested
- Clear test descriptions

**Test Plan**: Already defined in T-001

---

### T-015: Write integration tests for commands
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01 through AC-US2-06, AC-US3-01 through AC-US3-04
**Status**: [ ] pending
**Model**: ⚡ Haiku
**Estimated Effort**: 3 hours

**Implementation**:
1. Create `tests/integration/commands/enable-multiproject.test.ts`
2. Create `tests/integration/commands/switch-project.test.ts`
3. Test full user workflows
4. Test error cases

**Acceptance Criteria**:
- All command paths tested
- Error cases covered
- User workflows validated

**Test Plan**: Already defined in T-004 and T-007

---

### T-016: Write hook integration tests
**User Story**: US-006
**Satisfies ACs**: AC-US6-01 through AC-US6-05
**Status**: [ ] pending
**Model**: ⚡ Haiku
**Estimated Effort**: 2 hours

**Implementation**:
1. Create `tests/integration/hooks/project-folder-guard.test.ts`
2. Create `tests/integration/hooks/spec-project-validator.test.ts`
3. Test both single and multi-project modes
4. Test error messages

**Acceptance Criteria**:
- Hooks tested in both modes
- Error messages validated
- Edge cases covered

**Test Plan**: Already defined in T-008 and T-009

---

### T-017: Manual QA on real repository
**User Story**: All
**Satisfies ACs**: All
**Status**: [ ] pending
**Model**: N/A (manual)
**Estimated Effort**: 2 hours

**Manual Testing Checklist**:
- [ ] Fresh `specweave init` creates single-project config
- [ ] Existing single-project repo auto-migrates
- [ ] `/specweave:enable-multiproject` works correctly
- [ ] Project folders created properly
- [ ] `/specweave:switch-project` works in multi-project mode
- [ ] Hooks block invalid operations
- [ ] Living docs sync respects mode
- [ ] No project folders created for examples

---

## Summary

**Total Tasks**: 17
**Estimated Effort**: 28 hours (~3.5 days)

**Critical Path**:
1. Core migration (T-001, T-002, T-003) - 4 hours
2. Commands (T-004, T-005, T-006, T-007) - 8 hours
3. Hooks (T-008, T-009) - 4 hours
4. Living docs (T-010) - 2 hours
5. Tests (T-014, T-015, T-016) - 7 hours
6. Docs (T-011, T-012, T-013) - 2.5 hours
7. Manual QA (T-017) - 2 hours

**Phase Dependencies**:
- Phase 2 (Commands) depends on Phase 1 (Core)
- Phase 3 (Hooks) depends on Phase 1 (Core)
- Phase 4 (Living Docs) depends on Phase 1 (Core)
- Phase 6 (Testing) depends on all implementation phases
