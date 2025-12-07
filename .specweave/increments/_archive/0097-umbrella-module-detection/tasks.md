# Tasks: Umbrella Module Detection

## Task List

### T-001: Create Umbrella Detector Module
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0

Create `src/core/living-docs/umbrella-detector.ts` with:
- `detectUmbrellaStructure()` - main detection entry point
- `scanForChildRepos()` - scan for .git directories as module boundaries
- `loadFromCloneJob()` - read repos from clone job config.json
- `loadFromUmbrellaConfig()` - read from config.json umbrella section

**Tests**:
- [ ] Test: Detects repos with .git directories
- [ ] Test: Loads repos from clone job config
- [ ] Test: Returns empty for non-umbrella projects

---

### T-002: Add Umbrella Config Types
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Priority**: P0

Add TypeScript types for umbrella configuration:
```typescript
interface UmbrellaConfig {
  enabled: boolean;
  childRepos: ChildRepoConfig[];
}

interface ChildRepoConfig {
  id: string;
  path: string;
  name: string;
  team?: string;
  areaPath?: string;
  clonedAt?: string;
}
```

**Tests**:
- [ ] Test: Types compile correctly
- [ ] Test: Config validation works

---

### T-003: Modify Discovery to Support Umbrella
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Priority**: P0

Modify `src/core/living-docs/discovery.ts`:
- Add `buildModulesFromUmbrella()` function
- Check for umbrella structure before standard detection
- Convert child repos to ModuleInfo format
- Preserve existing behavior for non-umbrella projects

**Tests**:
- [ ] Test: Umbrella repos become modules
- [ ] Test: Non-umbrella projects work unchanged
- [ ] Test: 200+ repos detected in <30s

---

### T-004: Implement Per-Module Tech Stack Detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed
**Priority**: P1

Modify `detectTechStack()` in discovery.ts:
- Accept modules parameter for umbrella mode
- Run detection per-module when umbrella detected
- Aggregate results into discovery.techStack
- Parse package.json/go.mod/etc per child repo

**Tests**:
- [ ] Test: Each module's tech stack detected
- [ ] Test: Aggregated stack includes all frameworks
- [ ] Test: Works with mixed tech stacks (React + .NET)

---

### T-005: Clone Worker Umbrella Config Persistence
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Priority**: P1

Modify `src/cli/workers/clone-worker.ts`:
- After successful clone, write umbrella config to config.json
- Include repo path, name, team from clone job config
- Preserve existing config.json content

**Tests**:
- [ ] Test: Config.json updated after clone job
- [ ] Test: Umbrella section contains all repos
- [ ] Test: Existing config preserved

---

### T-006: Living Docs Worker Clone Job Integration
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P1

Modify `src/cli/workers/living-docs-worker.ts`:
- Check for completed clone job in dependencies
- Load repo list from clone job config first
- Pass repos to discovery as pre-detected modules
- Fallback to umbrella detection if no clone job

**Tests**:
- [ ] Test: Uses clone job repos when available
- [ ] Test: Falls back to detection without clone job
- [ ] Test: Metadata preserved from clone job

---

### T-007: Unit Tests for Umbrella Detection
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All
**Status**: [x] completed
**Priority**: P1

Create `tests/unit/living-docs/umbrella-detector.test.ts`:
- Test .git directory scanning
- Test clone job config loading
- Test config.json umbrella loading
- Test mixed scenarios (partial data)
- Test performance with 200+ mock repos

**Tests**:
- [ ] Test: All detection paths covered
- [ ] Test: Edge cases handled
- [ ] Test: Performance acceptable

---

### T-008: Integration Test End-to-End
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-04, AC-US2-01
**Status**: [x] completed
**Priority**: P2

Create integration test simulating full flow:
1. Clone job creates repos
2. Living docs builder detects umbrella
3. Modules populated correctly
4. Tech stack detected per module

**Tests**:
- [ ] Test: Full pipeline works
- [ ] Test: Large repo count handled
