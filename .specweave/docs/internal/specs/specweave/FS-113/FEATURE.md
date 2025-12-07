---
id: "FS-113"
title: "Enhanced Living Docs - Intelligent Codebase Understanding"
status: "ready_for_review"
owner: "specweave-team"
tags: ["living-docs", "llm", "architecture", "enterprise"]
priority: "P1"
projects: ["specweave"]
created: "2025-12-06"
increment: "0113-enhanced-living-docs-architecture"
---

# FS-113: Enhanced Living Docs - Intelligent Codebase Understanding

## Overview

A multi-phase intelligent analysis system that deeply understands each repo by reading actual code, synthesizes organization structure, generates architecture artifacts, and identifies questions for humans to address.

## Problem Statement

The current Living Docs Builder generates superficial module documentation (just stats) that provides no real value. We need meaningful understanding of:

- What does each repo DO?
- How does it fit into the organization?
- What are the key concepts and APIs?
- How does it relate to other repos?

## User Stories

| ID | Title | Status |
|----|-------|--------|
| [US-001](us-001-deep-repo-understanding.md) | Deep Repo Understanding | Completed |
| [US-002](us-002-organization-structure-synthesis.md) | Organization Structure Synthesis | Completed |
| [US-003](us-003-architecture-diagrams-from-understanding.md) | Architecture Diagrams from Understanding | Completed |
| [US-004](us-004-pattern-detection-adrs.md) | Pattern Detection & ADRs | Completed |
| [US-005](us-005-questions-inconsistencies-report.md) | Questions & Inconsistencies Report | Completed |
| [US-006](us-006-strategy-tech-debt-inventory.md) | Strategy & Tech Debt Inventory | Completed |
| [US-007](us-007-long-running-background-job-support.md) | Long-Running Background Job Support | Completed |

## Analysis Phases

| Phase | Name | Duration |
|-------|------|----------|
| A | Repo Discovery | Minutes |
| B | Deep Repo Analysis | Hours |
| C | Organization Clustering | 30min-2hrs |
| D | Architecture Synthesis | 1-2hrs |
| E | Inconsistency Detection | 30min-1hr |
| F | Strategy Population | 15min |

## References

- [Increment 0113](../../../../increments/0113-enhanced-living-docs-architecture/spec.md)
