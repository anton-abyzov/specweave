---
id: US-003
feature: FS-171
title: "Skill Cache Management"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-003: Skill Cache Management

**Feature**: [FS-171](./FEATURE.md)

**As a** SpecWeave user,
**I want** full plugins stored in a cache directory,
**So that** they can be quickly loaded when needed.

---

## Acceptance Criteria

- [x] **AC-US3-01**: Cache stored at `~/.specweave/skills-cache/`
- [x] **AC-US3-02**: Cache populated during `specweave refresh-marketplace`
- [x] **AC-US3-03**: Cache includes version metadata for update detection
- [x] **AC-US3-04**: Cache cleanup removes skills not in current marketplace
- [x] **AC-US3-05**: Cache size reported in `specweave status`

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-006**: Implement PluginCacheManager Class
- [x] **T-007**: Update refresh-marketplace to Populate Cache
- [x] **T-010**: Add Cache Size Reporting
- [x] **T-011**: Implement Cache Cleanup
- [x] **T-034**: Write Unit Tests for Cache Manager
