---
id: US-003
feature: FS-156
title: Smart Marketplace Merge System
status: not_started
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 973
    url: https://github.com/anton-abyzov/specweave/issues/973
---

# US-003: Smart Marketplace Merge System

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave user
**I want** my learnings preserved when updating marketplace
**So that** I don't lose corrections and patterns I've taught

---

## Acceptance Criteria

- [ ] **AC-US3-01**: `bin/install-skills.sh` detects existing MEMORY.md files
- [ ] **AC-US3-02**: Backup created before merge (`.memory-backups/MEMORY-YYYY-MM-DD.md`)
- [ ] **AC-US3-03**: User learnings merged with new defaults (deduplicated)
- [ ] **AC-US3-04**: Merge script removes duplicate learnings (>50% content overlap)
- [ ] **AC-US3-05**: Merge preserves user learning timestamps and sources

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-004**: Implement confidence calculation
- [ ] **T-020**: Create signal detection patterns
- [ ] **T-021**: Create confidence calculator
- [ ] **T-022**: Create auto-reflect script
- [ ] **T-023**: Create learning queue
- [ ] **T-024**: Update stop-session hook
- [ ] **T-025**: Create /sw:reflect-on command
