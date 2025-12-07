---
id: "US-001"
feature: "FS-113"
title: "Deep Repo Understanding"
status: "completed"
priority: "P1"
---

# US-001: Deep Repo Understanding

## Description

As a **developer joining a large organization**, I want **each repo to have an LLM-generated overview explaining its purpose** so that **I can quickly understand what any repo does without reading all the code**.

## Acceptance Criteria

- [x] **AC-US1-01**: LLM reads actual source code (not just stats)
- [x] **AC-US1-02**: README is incorporated into understanding
- [x] **AC-US1-03**: Key domain concepts are extracted and explained
- [x] **AC-US1-04**: Main APIs/exports are documented
- [x] **AC-US1-05**: Each repo gets `repos/{name}/overview.md` with meaningful content
- [x] **AC-US1-06**: Analysis checkpoints after each repo (resume support)

---

**Related**:
- Feature: [FS-113](FEATURE.md)
- Increment: [0113-enhanced-living-docs-architecture](../../../../increments/0113-enhanced-living-docs-architecture/)
