---
increment: 0100-enterprise-living-docs
status: completed
---

# 0100: Enterprise Living Documentation

## Overview

Enhance the Living Docs Builder to provide enterprise-grade documentation analysis covering ALL documentation folders, spec-code validation, and comprehensive health scoring.

## User Stories

### US-001: Full Documentation Coverage Scanner
**As a** developer
**I want** the living docs builder to scan all documentation folders (specs, architecture, ADRs, governance)
**So that** I get a complete picture of documentation health across the entire codebase

**Acceptance Criteria:**
- [x] **AC-US1-01**: Scanner discovers all `.specweave/docs/internal/` subdirectories
- [x] **AC-US1-02**: Scans `specs/` for feature specifications and user stories
- [x] **AC-US1-03**: Scans `architecture/adr/` for Architecture Decision Records
- [x] **AC-US1-04**: Scans `governance/` for coding standards and conventions
- [x] **AC-US1-05**: Report shows document counts per category

### US-002: Spec-Code Mismatch Detection
**As a** developer
**I want** to detect mismatches between spec.md files and actual code implementation
**So that** I can identify drift between documentation and reality

**Acceptance Criteria:**
- [x] **AC-US2-01**: Parse spec.md acceptance criteria (AC-XXX-YY patterns)
- [x] **AC-US2-02**: Extract claimed functionality from spec files
- [x] **AC-US2-03**: Search codebase for corresponding implementation
- [x] **AC-US2-04**: Flag specs marked complete but lacking code evidence
- [x] **AC-US2-05**: Report mismatches with confidence scores

### US-003: Documentation Health Scoring
**As a** project maintainer
**I want** a documentation health score
**So that** I can track and improve documentation quality over time

**Acceptance Criteria:**
- [x] **AC-US3-01**: Calculate freshness score (doc age vs code changes)
- [x] **AC-US3-02**: Calculate coverage score (% of code with docs)
- [x] **AC-US3-03**: Calculate accuracy score (spec vs implementation match)
- [x] **AC-US3-04**: Generate overall health grade (A-F)
- [x] **AC-US3-05**: Show trend indicators for improvement/regression *(Note: Returns 'stable' - historical tracking requires future increment)*

### US-004: Claude Availability Messaging
**As a** user without Claude installed
**I want** clear instructions when Claude is not available
**So that** I know how to install it or use alternatives

**Acceptance Criteria:**
- [x] **AC-US4-01**: Detect Claude CLI not in PATH with clear error message
- [x] **AC-US4-02**: Show platform-specific installation instructions
- [x] **AC-US4-03**: Offer fallback to "standard" analysis without AI
- [x] **AC-US4-04**: List alternative LLM provider options if available

## Technical Design

### Documentation Categories
```
.specweave/docs/internal/
├── specs/              # Feature specs (FS-XXX/FEATURE.md, us-XXX.md)
├── architecture/       # System architecture
│   └── adr/            # Architecture Decision Records
├── governance/         # Coding standards, conventions
└── modules/            # Module documentation
```

### Health Score Formula
```
Overall = (Freshness × 0.2) + (Coverage × 0.3) + (Accuracy × 0.5)

Freshness: Days since doc update vs days since related code change
Coverage:  Files with docs / Total files
Accuracy:  Specs matching code / Total specs
```

### Grade Mapping
| Score | Grade |
|-------|-------|
| 90-100 | A |
| 80-89 | B |
| 70-79 | C |
| 60-69 | D |
| 0-59 | F |
