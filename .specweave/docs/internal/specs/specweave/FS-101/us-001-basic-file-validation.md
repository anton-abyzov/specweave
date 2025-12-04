---
id: US-001
feature: FS-101
title: "Basic File Validation"
status: completed
priority: P2
created: 2025-12-03
---

**Origin**: 🏠 **Internal**


# US-001: Basic File Validation

**Feature**: [FS-101](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Command accepts file paths: `/specweave:judge src/file.ts`
- [x] **AC-US1-02**: Command validates multiple files: `/specweave:judge src/*.ts`
- [x] **AC-US1-03**: Returns verdict: APPROVED | CONCERNS | REJECTED
- [x] **AC-US1-04**: Includes confidence score (0.0-1.0)
- [x] **AC-US1-05**: Provides detailed reasoning chain

---

## Implementation

**Increment**: [0101-judge-llm-command](../../../../increments/0101-judge-llm-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-002](../../../../increments/0101-judge-llm-command/tasks.md#T-002): Implement file input parsing
- [x] [T-004](../../../../increments/0101-judge-llm-command/tasks.md#T-004): Implement judge LLM evaluation logic