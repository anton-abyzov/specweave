---
id: US-004
feature: FS-100
title: "Claude Availability Messaging"
status: completed
priority: P1
created: 2025-12-04
---

# US-004: Claude Availability Messaging

**Feature**: [FS-100](./FEATURE.md)

**As a** user without Claude installed
**I want** clear instructions when Claude is not available
**So that** I know how to install it or use alternatives

---

## Acceptance Criteria

- [x] **AC-US4-01**: Detect Claude CLI not in PATH with clear error message
- [x] **AC-US4-02**: Show platform-specific installation instructions
- [x] **AC-US4-03**: Offer fallback to "standard" analysis without AI
- [x] **AC-US4-04**: List alternative LLM provider options if available

---

## Implementation

**Increment**: [0100-enterprise-living-docs](../../../../increments/0100-enterprise-living-docs/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Implement Claude Availability Detection
