---
id: "FS-115"
title: "Ultra-Smart Project/Board Selection"
status: "completed"
owner: "specweave-team"
tags: ["ux", "project-selection", "automation"]
priority: "P1"
projects: ["specweave"]
created: "2025-12-06"
increment: "0115-ultra-smart-project-selection"
---

# FS-115: Ultra-Smart Project/Board Selection

## Overview

Intelligent project/board selection during increment creation with auto-detection and per-User-Story assignment.

## Problem Statement

Users shouldn't have to manually select projects/boards when the system can intelligently detect them based on:
- Number of available options (auto-select when only 1)
- Keywords in increment description
- Confidence scoring

## User Stories

| ID | Title | Status |
|----|-------|--------|
| [US-001](us-001-auto-select-when-only-one-option.md) | Auto-Select When Only One Option | Completed |
| [US-002](us-002-keyword-based-auto-detection.md) | Keyword-Based Auto-Detection | Completed |
| [US-003](us-003-confidence-based-decisions.md) | Confidence-Based Decisions | Completed |
| [US-004](us-004-per-us-assignment.md) | Per-US Assignment | Completed |

## Key Features

1. **Auto-Selection**: When only 1 project/board exists, auto-select silently
2. **Keyword Detection**: FE/BE/Mobile/Infra/Shared keywords trigger auto-detection
3. **Confidence Scoring**: >80% auto-selects, 50-80% suggests, <50% asks user
4. **Per-US Assignment**: Each user story can have different project/board

## References

- [Increment 0115](../../../../increments/0115-ultra-smart-project-selection/spec.md)
