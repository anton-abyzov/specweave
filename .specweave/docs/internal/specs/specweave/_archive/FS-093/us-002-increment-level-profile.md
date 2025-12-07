---
id: US-002
feature: FS-093
title: "Increment-Level Profile"
status: completed
priority: P1
created: 2025-12-02
---

**Origin**: 🏠 **Internal**


# US-002: Increment-Level Profile

**Feature**: [FS-093](./FEATURE.md)

**As a** developer with multiple ADO projects
**I want** each increment to sync to its configured project
**So that** I don't manually switch `activeProfile` constantly

---

## Acceptance Criteria

- [x] **AC-US2-01**: Profile resolver reads increment's `metadata.json` first
- [x] **AC-US2-02**: Falls back to `activeProfile` if increment has no profile
- [ ] **AC-US2-03**: Sync commands use resolved profile for API calls
- [x] **AC-US2-04**: Error message if profile not found in config

---

## Implementation

**Increment**: [0093-ado-permission-profile-fixes](../../../../../increments/0093-ado-permission-profile-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../../increments/0093-ado-permission-profile-fixes/tasks.md#T-002): Create ADO Profile Resolver Library