---
id: US-008
feature: FS-134
title: "LLM-Powered Deep Analysis"
status: in_progress
priority: P1
created: 2025-12-09
project: specweave
---

# US-008: LLM-Powered Deep Analysis

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user
**I want** the system to use LLM intelligence for complex analysis
**So that** documentation is insightful, not just mechanical

---

## Acceptance Criteria

- [x] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [x] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [x] **AC-US8-05**: LLM uses Haiku for speed (structure analysis) and Opus for depth (ADR synthesis)
- [x] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls (cost optimization)
- [x] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [x] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [x] **AC-US8-05**: LLM uses Haiku for speed and Opus for depth
- [x] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Create ADRSynthesizer with LLM Integration
- [x] **T-014**: Design ADR Synthesis Prompts
- [x] **T-015**: Implement ADR Caching
