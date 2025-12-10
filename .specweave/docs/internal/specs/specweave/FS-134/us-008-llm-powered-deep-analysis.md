---
id: US-008
feature: FS-134
title: "LLM-Powered Deep Analysis"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-008: LLM-Powered Deep Analysis

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user
**I want** the system to use LLM intelligence for complex analysis
**So that** documentation is insightful, not just mechanical

---

## Acceptance Criteria

- [ ] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [ ] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [ ] **AC-US8-05**: LLM uses Haiku for speed (structure analysis) and Opus for depth (ADR synthesis)
- [ ] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls (cost optimization)

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-013**: Create ADRSynthesizer with LLM Integration
- [ ] **T-014**: Design ADR Synthesis Prompts
- [ ] **T-015**: Implement ADR Caching
