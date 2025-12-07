---
id: FS-116
title: "LivingSpec Universal Standard"
status: in-progress
owner: specweave-core
epic: null
tags: ["standard", "documentation", "open-source", "e-suffix"]
created: 2025-12-06
increment: 0116-livingspec-universal-standard
---

# FS-116: LivingSpec Universal Standard

## Overview

Define and publish **LivingSpec** - an open, vendor-neutral standard for synchronized living documentation with comprehensive E-suffix support for external item tracking.

## Key Deliverables

1. **Specification Document** - Complete standard with E-suffix rules
2. **JSON Schemas** - Validation schemas for all entity types
3. **Architecture Diagrams** - C4 context, container, and flow diagrams
4. **Documentation** - Delivery, operations, strategy, governance

## E-Suffix Standard

This feature establishes the E-suffix convention for ALL external items:

| Entity | Internal | External |
|--------|----------|----------|
| Epic | EP-XXX | EP-XXXE |
| Feature | FS-XXX | FS-XXXE |
| User Story | US-XXX | US-XXXE |
| Acceptance Criteria | AC-USX-XX | AC-USXE-XXE |
| Task | T-XXX | T-XXXE |

## User Stories

- [US-001: Core Specification Document](./us-001-core-specification.md)
- [US-002: E-Suffix Standard Implementation](./us-002-esuffix-standard.md)
- [US-003: JSON Schema Development](./us-003-json-schemas.md)
- [US-004: CLI Validator](./us-004-cli-validator.md)
- [US-005: Documentation Platform Integration](./us-005-docusaurus.md)
- [US-006: Architecture & Diagrams](./us-006-architecture.md)
- [US-007: Delivery & Operations](./us-007-delivery-ops.md)
- [US-008: Strategy & Governance](./us-008-strategy-governance.md)

## Acceptance Criteria Summary

- [ ] **AC-001**: Specification document complete with E-suffix rules
- [ ] **AC-002**: JSON schemas for all document types
- [ ] **AC-003**: Quick-start guide (< 30 min adoption)
- [ ] **AC-004**: CLI validator for compliance
- [ ] **AC-005**: Published to dedicated repository
- [ ] **AC-006**: Migration guide from Confluence/Notion
- [ ] **AC-007**: E-suffix validation in all ID generators
- [ ] **AC-008**: Deduplication logic handles E-suffix correctly
- [ ] **AC-009**: Sync operations propagate E-suffix to children
- [ ] **AC-010**: Origin badge display in Docusaurus plugin
- [ ] **AC-011**: Docusaurus integration guide
- [ ] **AC-012**: MkDocs fallback guide
- [ ] **AC-013**: Architecture diagrams in Mermaid format
- [ ] **AC-014**: Delivery/deployment documentation

## Links

- **Increment**: [0116-livingspec-universal-standard](../../../../increments/0116-livingspec-universal-standard/)
- **Architecture Diagrams**: [livingspec/](../../../architecture/diagrams/livingspec/)
- **Delivery Docs**: [livingspec-release-process.md](../../../delivery/livingspec-release-process.md)
- **Strategy**: [livingspec-product-vision.md](../../../strategy/livingspec-product-vision.md)
