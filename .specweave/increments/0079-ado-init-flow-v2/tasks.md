# Tasks: ADO Init Flow V2

## Task Summary
| ID | Task | Status | US |
|----|------|--------|-----|
| T-001 | Fix area path validation (GET-only, no create) | [x] completed | US-001 |
| T-002 | Fix double prefix bug (leaf names only) | [x] completed | US-002 |
| T-003 | Remove team selection from init | [x] completed | US-003 |
| T-004 | Fix ADO import to populate adoAreaPath | [x] completed | US-004 |
| T-005 | Change "parent" fallback to "_default" | [x] completed | US-004 |
| T-006 | Add multi-project selection | [x] completed | US-005 |

---

### T-001: Fix Area Path Validation (GET-only)
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed

**Description**:
Change `ado-validator.ts` to ONLY validate area path existence via GET request. Never attempt to create.

**Implementation**:
1. Add `checkAreaPathExists(projectName, areaPath)` method using GET API
2. Replace `createAreaPath()` calls with `checkAreaPathExists()` in validate()
3. Remove the create/update logic entirely
4. Remove `readOnly` flag - validation is always read-only now

**Files**:
- `src/utils/validators/ado-validator.ts`

**Tests**:
- [ ] Validator only makes GET requests
- [ ] No "Creating area path" logs appear
- [ ] Existing paths return success
- [ ] Missing paths return warning (not error)

---

### T-002: Fix Double Prefix Bug
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**:
Fix area path storage to use leaf names only, preventing double prefix issues.

**Implementation**:
1. In `selectAreaPaths()`, extract and store leaf name only
2. Update config.json writer to store `["Platform-Engineering"]` not `["Acme\\Platform-Engineering"]`
3. Ensure folder creation matches validation naming

**Files**:
- `src/cli/helpers/ado-area-selector.ts`
- `src/cli/helpers/issue-tracker/ado.ts`

**Tests**:
- [ ] Config.json contains leaf names only
- [ ] No double prefix in validation output
- [ ] Folder names match config values

---

### T-003: Remove Team Selection from Init
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Description**:
Remove team selection entirely from ADO init flow. Keep only Project + Area Path.

**Implementation**:
1. Remove team checkbox prompt (lines 230-242 in ado.ts)
2. Remove `teams` from return type
3. Remove team caching logic
4. Remove team fetching (or keep but don't prompt)

**Files**:
- `src/cli/helpers/issue-tracker/ado.ts`

**Tests**:
- [ ] No team selection prompt during init
- [ ] Teams not stored in config.json
- [ ] Init flow faster (no team fetch)

---

### T-004: Fix ADO Import to Populate adoAreaPath
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

**Description**:
Ensure ADO work item importer populates `adoAreaPath` field from `System.AreaPath`.

**Implementation**:
1. Find ADO item fetcher in plugins/specweave-ado
2. Ensure `System.AreaPath` field is requested in API call
3. Map to `adoAreaPath` property on returned items
4. Verify grouping function receives this field

**Files**:
- `plugins/specweave-ado/lib/ado-board-resolver.js`
- `plugins/specweave-ado/lib/ado-item-fetcher.js` (if exists)

**Tests**:
- [ ] Imported items have adoAreaPath set
- [ ] Items grouped correctly by area path

---

### T-005: Change "parent" Fallback to "_default"
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Status**: [x] completed

**Description**:
Change default folder from "parent" to "_default" for items without area path.

**Implementation**:
1. In `groupItemsByExternalContainer()`, change line 1176
2. `projectId = '_default'` instead of `'parent'`

**Files**:
- `src/cli/helpers/init/external-import.ts`

**Tests**:
- [ ] Items without area path go to _default folder
- [ ] No "parent" folders created

---

### T-006: Add Multi-Project Selection
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed

**Description**:
Allow selecting multiple ADO projects during init.

**Implementation**:
1. Added `AzureDevOpsProjectConfig` type in `types.ts` for per-project config
2. Updated `promptAzureDevOpsCredentials()` with project fetch and mode selection
3. Added `handleMultiProjectSelection()` for multi-select checkbox flow
4. For each project, prompts for area paths using existing pattern selector
5. Updated `writeSyncConfig()` to create profile per project
6. Updated `createAdoProjectFolders()` to create folders for all projects
7. Updated `validateAzureDevOpsConnection()` to handle multi-project credentials

**Files**:
- `src/cli/helpers/issue-tracker/types.ts` - Added `AzureDevOpsProjectConfig` interface
- `src/cli/helpers/issue-tracker/ado.ts` - Multi-project selection flow
- `src/cli/helpers/issue-tracker/index.ts` - Multi-project profile creation

**Tests**:
- [x] Multiple projects can be selected
- [x] Area paths prompted per project
- [x] Config has profile per project
- [x] Folders created for all projects
