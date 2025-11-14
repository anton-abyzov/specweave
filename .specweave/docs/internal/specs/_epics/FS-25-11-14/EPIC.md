---
id: FS-25-11-14
title: "Prevent Increment Number Gaps When Increments Are Abandoned or Paused"
type: epic
status: planned
---

# Prevent Increment Number Gaps When Increments Are Abandoned or Paused

## Strategic Overview

Fix critical bug where increment ID generation (`getNextIncrementId()` / `getNextFeatureNumber()`) only scans the main `.specweave/increments/` directory, ignoring `_abandoned/` and `_paused/` subdirectories. This causes number reuse when increments are moved to these subdirectories (e.g., increment 0029 was abandoned, next increment tried to use 0029 again).

**Impact**: Data integrity issue - duplicate increment numbers break living docs sync, status line tracking, and external tool integration.

**Solution**: Update all three affected functions to scan ALL increment locations (main directory + `_abandoned/` + `_paused/`) to maintain sequential numbering and complete audit trail.

## Features

- FS-25-11-14-prevent-increment-number-gaps

## Timeline

- **Start**: 2025-11-14
- **Target Completion**: TBD
- **Current Phase**: Phase 1
