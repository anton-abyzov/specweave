---
id: FS-25-11-14-prevent-increment-number-gaps
title: "Prevent Increment Number Gaps When Increments Are Abandoned or Paused"
type: feature
status: planned
priority: P1
created: 2025-11-14
lastUpdated: 2025-11-14T20:51:22.265Z
projects: ["default"]

---

# Prevent Increment Number Gaps When Increments Are Abandoned or Paused

## Overview

Fix critical bug where increment ID generation (`getNextIncrementId()` / `getNextFeatureNumber()`) only scans the main `.specweave/increments/` directory, ignoring `_abandoned/` and `_paused/` subdirectories. This causes number reuse when increments are moved to these subdirectories (e.g., increment 0029 was abandoned, next increment tried to use 0029 again).

**Impact**: Data integrity issue - duplicate increment numbers break living docs sync, status line tracking, and external tool integration.

**Solution**: Update all three affected functions to scan ALL increment locations (main directory + `_abandoned/` + `_paused/`) to maintain sequential numbering and complete audit trail.

## Business Value

See overview above

## Projects

This feature spans the following projects:
- default

## User Stories by Project

### default

- [US-001: Scan All Increment Directories (P1 - Critical)](../../default/FS-25-11-14-prevent-increment-number-gaps/us-001-scan-all-increment-directories-p1-critical.md) - complete
- [US-002: Preserve Audit Trail for Abandoned Increments (P1 - Critical)](../../default/FS-25-11-14-prevent-increment-number-gaps/us-002-preserve-audit-trail-for-abandoned-increments-p1-critical.md) - complete
- [US-003: Prevent Duplicate Increment Numbers (P1 - Critical)](../../default/FS-25-11-14-prevent-increment-number-gaps/us-003-prevent-duplicate-increment-numbers-p1-critical.md) - complete

## Progress

- **Total Stories**: 3
- **Completed**: 3
- **Progress**: 100%
