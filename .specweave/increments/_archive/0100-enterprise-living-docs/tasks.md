---
increment: 0100-enterprise-living-docs
total_tasks: 4
completed_tasks: 4
---

# Tasks: Enterprise Living Documentation

## User Story: US-001 - Full Documentation Coverage Scanner

### T-001: Implement Documentation Folder Scanner
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Priority**: P1
**Status**: [x] completed

Implement scanner to discover and analyze all `.specweave/docs/internal/` subdirectories including specs/, architecture/adr/, governance/, and modules/. Generate document counts per category in report output.

---

## User Story: US-002 - Spec-Code Mismatch Detection

### T-002: Implement Spec-Code Validation
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Priority**: P1
**Status**: [x] completed

Parse spec.md acceptance criteria (AC-XXX-YY patterns), extract claimed functionality, search codebase for implementation evidence, and flag mismatches with confidence scores.

---

## User Story: US-003 - Documentation Health Scoring

### T-003: Implement Health Scoring System
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Priority**: P1
**Status**: [x] completed

Calculate freshness, coverage, and accuracy scores. Apply weighted formula (Freshness × 0.2 + Coverage × 0.3 + Accuracy × 0.5) and generate A-F grade. Trend indicators return 'stable' (historical tracking deferred to future increment).

---

## User Story: US-004 - Claude Availability Messaging

### T-004: Implement Claude Availability Detection
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Priority**: P1
**Status**: [x] completed

Detect Claude CLI availability, show platform-specific installation instructions when missing, offer fallback to standard analysis, and list alternative LLM provider options.
