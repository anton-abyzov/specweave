---
increment: 0093-ado-permission-profile-fixes
---

# ADO Permission Enforcement and Increment-Level Profile Resolution

## Problem Statement

Two critical issues with ADO plugin sync behavior:

### Bug 1: ADO Commands Bypass Permission Checks

The `sync-coordinator.ts` properly checks `canUpdateExternalItems` permission before syncing:
```typescript
const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? false;
if (!canUpdateExternal) {
  result.syncMode = 'living-docs-only';
  return result;  // RETURNS EARLY - No external sync!
}
```

However, manual ADO commands (`/specweave-ado:create-workitem`, `/specweave-ado:sync`) do NOT check these permissions. They bypass the gate entirely.

**Expected**: All ADO write operations should respect `canUpdateExternalItems` setting.
**Actual**: Manual commands create work items regardless of setting.

### Bug 2: activeProfile Limits to ONE Project

Current design uses global `activeProfile` for ALL sync operations:
```json
{
  "sync": {
    "activeProfile": "ado-acme"  // Only ONE profile active
  }
}
```

This means:
- Sync my-project increment -> Uses acme profile (WRONG)
- Sync acme increment -> Uses acme profile (OK)
- Sync my-iot increment -> Uses acme profile (WRONG)

Each increment already stores its profile in `metadata.json`:
```json
{
  "external_sync": {
    "ado": {
      "profile": "ado-my-project"
    }
  }
}
```

**Expected**: Sync should use increment's stored profile.
**Actual**: Sync uses global `activeProfile`, ignoring increment's profile.

## Solution

### Fix 1: Permission Check Library

Create `plugins/specweave-ado/lib/ado-permission-gate.ts`:
- Reads `config.sync.settings.canUpdateExternalItems`
- Returns `{ allowed: boolean, reason: string }`
- All ADO write commands call this FIRST

Update all ADO command markdown files to:
1. Check permission gate before any write operation
2. Display clear error if permission denied

### Fix 2: Increment-Level Profile Resolution

Create `plugins/specweave-ado/lib/ado-profile-resolver.ts`:
1. Load increment's `metadata.json`
2. Check `external_sync.ado.profile`
3. If present: use increment's profile
4. If absent: fall back to global `activeProfile`
5. Return resolved profile config

Update sync commands to use `resolveProfile(incrementId)` instead of reading `activeProfile` directly.

## User Stories

### US-001: Permission Enforcement
**As a** project admin
**I want** ADO commands to respect permission settings
**So that** I can control when external tool writes are allowed

**Acceptance Criteria**:
- [x] **AC-US1-01**: `/specweave-ado:create-workitem` checks `canUpdateExternalItems` before creating
- [x] **AC-US1-02**: `/specweave-ado:sync` checks permissions before writing to ADO
- [x] **AC-US1-03**: Permission denied shows clear error message with how to enable
- [x] **AC-US1-04**: Read-only operations (status check) always allowed

### US-002: Increment-Level Profile
**As a** developer with multiple ADO projects
**I want** each increment to sync to its configured project
**So that** I don't manually switch `activeProfile` constantly

**Acceptance Criteria**:
- [x] **AC-US2-01**: Profile resolver reads increment's `metadata.json` first
- [x] **AC-US2-02**: Falls back to `activeProfile` if increment has no profile
- [x] **AC-US2-03**: Sync commands use resolved profile for API calls
- [x] **AC-US2-04**: Error message if profile not found in config

## Out of Scope

- Automatic profile assignment during increment creation
- Multi-profile parallel sync
- Profile inheritance from features/epics
