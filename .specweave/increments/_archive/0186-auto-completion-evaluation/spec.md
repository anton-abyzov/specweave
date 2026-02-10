---
increment: 0186-auto-completion-evaluation
title: "LLM-Based Auto Completion Evaluation"
---

# Feature: LLM-Based Auto Completion Evaluation

## Overview

Extend auto mode to use LLM-based evaluation for determining when work is complete. This reuses the Claude CLI spawn pattern from the plugin detection system and integrates with the stop hook.

## User Stories

### US-001: Success Criteria Definition
**Project**: specweave
**As a** developer using auto mode, I want the system to define and log success criteria at session start so that I know what conditions will end the session.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Auto command captures success criteria from config and project state
- [x] **AC-US1-02**: Success criteria are stored in auto-mode.json
- [x] **AC-US1-03**: Success criteria summary is logged to console at session start
- [x] **AC-US1-04**: Default criteria include: tasks_complete, acs_satisfied

### US-002: LLM Completion Evaluation
**Project**: specweave
**As a** developer, I want the stop hook to use LLM evaluation for complex completion checks so that it can semantically understand if the work meets requirements.

**Acceptance Criteria**:
- [x] **AC-US2-01**: New CLI command `specweave evaluate-completion` evaluates increment completion
- [x] **AC-US2-02**: Uses opus model for semantic evaluation (configurable)
- [x] **AC-US2-03**: Reuses Claude CLI spawn pattern from llm-plugin-detector.ts
- [x] **AC-US2-04**: Returns structured JSON result with complete, reason, confidence, nextSteps
- [x] **AC-US2-05**: Timeout handling (45s default) with graceful degradation

### US-003: Stop Hook Integration
**Project**: specweave
**As a** developer, I want the stop hook to call LLM evaluation when configured so that auto mode only ends when work truly meets requirements.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Stop hook reads requireLLMEval from config
- [x] **AC-US3-02**: When enabled, calls `specweave evaluate-completion` before approving
- [x] **AC-US3-03**: LLM evaluation failure adds to VALIDATION_ERRORS
- [x] **AC-US3-04**: Graceful fallback if CLI unavailable (skip LLM eval, use grep-based)

## Technical Notes

- Model selection: Opus for semantic evaluation (ultrathink for deep understanding)
- Haiku for simple criteria parsing at session start
- Reuse `executeClaudeCli` and `getCleanEnv` from llm-plugin-detector.ts
- Timeout: 45s for evaluation (longer than 30s plugin detection)
