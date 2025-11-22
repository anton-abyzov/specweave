---
increment: 0050-external-tool-import-phase-1b-7
title: "Enhanced External Tool Import - Phase 1b-7"
feature_id: FS-048
status: in-progress
priority: P1
user_stories:
  - US-001
  - US-002
  - US-004
  - US-005
  - US-006
  - US-007
  - US-008
created: 2025-11-21
started: 2025-11-21
dependencies:
  - 0048-external-tool-import-enhancement
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  testing: "vitest"
platform: "npm-global"
---

# Specification: Enhanced External Tool Import - Phase 1b-7

**Increment**: 0050-external-tool-import-phase-1b-7
**Feature**: [FS-048 - Enhanced External Tool Import](../../docs/internal/specs/_features/FS-048/FEATURE.md)
**Status**: In-Progress
**Priority**: P1 (High)
**Dependencies**: Increment 0048 (Phase 1a - ConfigManager & Jira Auto-Discovery) ✅ Complete

---

## Living Documentation (Source of Truth)

**Complete specifications are maintained in living documentation**:

### Feature Overview
- `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md` (master overview, 679 lines)

### User Stories (7 in This Increment)
- **US-001**: Smart Pagination During Init (P0) - 5 ACs
- **US-002**: CLI-First Defaults (P1) - 4 ACs
- **US-004**: Smart Caching with TTL (P1) - 5 ACs
- **US-005**: Dedicated Import Commands (P2) - 4 ACs
- **US-006**: ADO Area Path Mapping (P2) - 5 ACs
- **US-007**: Progress Tracking (P1) - 5 ACs
- **US-008**: Smart Filtering (P2) - 4 ACs

See individual user story files in `.specweave/docs/internal/specs/specweave/FS-048/` for complete details.

---

## Implementation Summary

**Phase 1a (0048)** ✅ Complete: ConfigManager, Jira auto-discovery, secrets separation

**Phase 1b-7 (THIS INCREMENT)** ⏳ Planned:
- Smart pagination (50-project limit, <30s init)
- CLI-first defaults (select all by default)
- Three-tier dependency loading (Tiers 2-3)
- Smart caching (24-hour TTL)
- Progress tracking (ETA, cancel/resume)
- ADO area path mapping
- Dedicated import commands
- Smart filtering

**Performance Targets**:
- Init time: < 30 seconds (100+ projects)
- API reduction: 90% (200-350 → 1 call during init)
- Cache hit rate: > 90%
- Zero timeout errors

**See**: [plan.md](./plan.md) for complete technical implementation, [tasks.md](./tasks.md) for 72 implementation tasks with embedded tests.
