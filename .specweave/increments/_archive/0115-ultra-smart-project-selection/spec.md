---
increment: 0115-ultra-smart-project-selection
title: "Ultra-Smart Project/Board Selection"
type: feature
priority: P1
status: completed
created: 2025-12-06
default_project: specweave
---

# Feature: Ultra-Smart Project/Board Selection

## Overview

Intelligent project/board selection during increment creation with auto-detection and per-US assignment.

## User Stories

### US-001: Auto-Select When Only One Option (P1)
**Project**: specweave

**As a** developer
**I want** auto-selection when only one project/board exists
**So that** I avoid unnecessary questions

**Acceptance Criteria**:
- [x] **AC-US1-01**: 1-level + 1 project → auto-select silently
- [x] **AC-US1-02**: 2-level + 1 project + 1 board → auto-select silently

### US-002: Keyword-Based Auto-Detection (P1)
**Project**: specweave

**As a** developer
**I want** keyword-based project detection
**So that** obvious assignments happen automatically

**Acceptance Criteria**:
- [x] **AC-US2-01**: FE/BE/Mobile/Infra/Shared keywords detected
- [x] **AC-US2-02**: Board-level keywords for 2-level structures

### US-003: Confidence-Based Decisions (P1)
**Project**: specweave

**As a** developer
**I want** confidence-based decision making
**So that** high-confidence auto-selects, low-confidence asks

**Acceptance Criteria**:
- [x] **AC-US3-01**: >80% → auto-select, 50-80% → suggest, <50% → ask
- [x] **AC-US3-02**: Within 15% → auto-split across projects

### US-004: Per-US Assignment (P1)
**Project**: specweave

**As a** developer
**I want** per-User-Story project/board assignment
**So that** one increment can span multiple projects

**Acceptance Criteria**:
- [x] **AC-US4-01**: Each US has Project/Board fields
- [x] **AC-US4-02**: Templates updated with per-US fields
