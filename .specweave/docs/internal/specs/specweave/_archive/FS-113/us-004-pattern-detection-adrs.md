---
id: "US-004"
feature: "FS-113"
title: "Pattern Detection & ADRs"
status: "completed"
priority: "P1"
---

# US-004: Pattern Detection & ADRs

## Description

As a **tech lead enforcing standards**, I want **architectural patterns auto-detected across repos** so that **I know what patterns are actually in use**.

## Acceptance Criteria

- [x] **AC-US4-01**: Auth patterns detected (JWT, OAuth, sessions)
- [x] **AC-US4-02**: API patterns detected (REST, GraphQL, gRPC)
- [x] **AC-US4-03**: Data storage patterns detected
- [x] **AC-US4-04**: Each detected pattern generates an ADR
- [x] **AC-US4-05**: ADRs include confidence level and evidence
- [x] **AC-US4-06**: Saved to `/architecture/adr/DETECTED-*.md`

---

**Related**:
- Feature: [FS-113](FEATURE.md)
- Increment: [0113-enhanced-living-docs-architecture](../../../../increments/0113-enhanced-living-docs-architecture/)
