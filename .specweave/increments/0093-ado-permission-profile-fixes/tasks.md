# Tasks for 0093-ado-permission-profile-fixes

## Summary
| Status | Count |
|--------|-------|
| Completed | 6 |
| In Progress | 0 |
| Pending | 0 |
| **Total** | **6** |

---

### T-001: Create ADO Permission Gate Library
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

Created `plugins/specweave-ado/lib/ado-permission-gate.ts`:
- Loads config from `.specweave/config.json`
- Checks `sync.settings.canUpdateExternalItems` and `canUpdateStatus`
- Returns `{ allowed, reason, suggestedAction }`
- Factory function `createAdoPermissionGate()` for easy instantiation
- Convenience functions `canWriteToAdo()` and `canUpdateAdoStatus()`

**Tests**:
- [x] Returns allowed:true when canUpdateExternalItems is true
- [x] Returns allowed:false with clear reason when permission disabled
- [x] Handles missing config gracefully (default: denied)

---

### T-002: Create ADO Profile Resolver Library
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04
**Status**: [x] completed

Created `plugins/specweave-ado/lib/ado-profile-resolver.ts`:
- Loads increment metadata
- Checks `external_sync.ado.profile` first (increment-level)
- Falls back to `config.sync.activeProfile` (global)
- Resolves profile config from `config.sync.profiles[profileName]`
- Returns `{ success, profile, source, error }`

**Tests**:
- [x] Uses increment profile when present
- [x] Falls back to activeProfile when increment has no profile
- [x] Returns error if profile not found in config

---

### T-003: Update specweave-ado-create-workitem Command
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [x] completed

Updated `plugins/specweave-ado/commands/specweave-ado-create-workitem.md`:
- Added permission check as step 1 (MANDATORY FIRST STEP)
- Added profile resolution as step 2
- Clear error messages with how to enable permissions
- Shows which profile is being used

---

### T-004: Update specweave-ado-sync Command
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-02, AC-US2-03
**Status**: [x] completed

Updated `plugins/specweave-ado/commands/specweave-ado-sync.md`:
- Added permission check for write operations (to-ado, two-way)
- Read-only operations (from-ado) skip permission check
- Uses profile resolver instead of activeProfile
- Displays which profile is being used in output
- Added permission check matrix documentation

---

### T-005: Update specweave-ado-close-workitem Command
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

Updated `plugins/specweave-ado/commands/specweave-ado-close-workitem.md`:
- Added permission check requiring BOTH canUpdateExternalItems AND canUpdateStatus
- Uses profile resolver for API calls
- Added increment completion validation
- Clear error messages for permission denials

---

### T-006: Update ADO Manager Agent
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US2-03
**Status**: [x] completed

Updated `plugins/specweave-ado/agents/ado-manager/AGENT.md`:
- Added "Permission and Profile Requirements" section
- Added permission gate check to each workflow step
- Added profile resolution step with code examples
- Documented permission-to-operation mapping
- Updated all core responsibilities with pre-flight checks
