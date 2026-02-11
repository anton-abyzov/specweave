---
increment: 0199-smart-interview-gate
title: "Smart Interview Gate: LLM-Driven First-Prompt Assessment"
type: feature
priority: P1
status: planned
created: 2026-02-11
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Smart Interview Gate: LLM-Driven First-Prompt Assessment

## Overview

Replace the binary "always interview / never interview" deep interview mode with an intelligent gate that fires on every user prompt (when `deepInterview.enabled: true` and no active increment exists). The LLM assesses whether the user's prompt contains sufficient detail to proceed directly to increment creation, or whether targeted clarifying questions are needed.

**Key principle**: The LLM must NOT overwhelm the user. If a comprehensive description is given (tech stack, integrations, deployment, users, flows), proceed straight to increment creation. If gaps exist, ask only about what's missing — not a full 40-question interrogation.

**Context accumulation**: The gate fires on every prompt, building understanding across multiple messages. Prompt 2 builds on the context from prompt 1.

## User Stories

### US-001: Smart Assessment on Every Prompt (P1)
**Project**: specweave

**As a** developer using SpecWeave with Deep Interview Mode enabled
**I want** the system to intelligently assess my prompts for completeness on every message
**So that** I only get asked questions when details are genuinely missing

**Acceptance Criteria**:
- [ ] **AC-US1-01**: When `deepInterview.enabled: true` and no active increment exists (checked via `active-increment.json`), the hook injects LLM assessment instructions on every user prompt
- [ ] **AC-US1-02**: LLM evaluates prompt for both technical signals (tech stack, integrations, deployment, auth, API keys) AND product signals (target users, business model, timeline)
- [ ] **AC-US1-03**: If the LLM determines all necessary details are present, it proceeds directly to increment creation (chains into `sw:increment-planner`)
- [ ] **AC-US1-04**: If the LLM detects gaps, it asks targeted questions about only the missing areas — NOT a full category-by-category interview
- [ ] **AC-US1-05**: Assessment accumulates context across multiple prompts in the same session (each prompt builds on prior context)

---

### US-002: Complexity-Aware Completeness Threshold (P1)
**Project**: specweave

**As a** developer describing a project of any complexity level
**I want** the LLM to adjust its completeness threshold based on the detected complexity
**So that** simple features proceed quickly while complex platforms get properly vetted

**Acceptance Criteria**:
- [ ] **AC-US2-01**: LLM identifies complexity level (trivial/small/medium/large) from the prompt content before assessing completeness
- [ ] **AC-US2-02**: Trivial/small features require fewer signals to be "complete" (tech stack + basic flow may suffice)
- [ ] **AC-US2-03**: Large/complex features (multi-service, payments, auth, multi-tenant) require more signals (architecture, security, edge cases, deployment, monitoring)
- [ ] **AC-US2-04**: The assessment is fully LLM-decided with no configurable threshold — the model uses judgment based on project type and complexity

---

### US-003: Hook Integration Without Breaking Existing Flow (P1)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** the smart gate to integrate cleanly with the existing `user-prompt-submit.sh` hook
**So that** it doesn't break incrementAssist, plugin autoload, or LSP detection

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Smart gate only activates when `deepInterview.enabled: true` — existing behavior is completely unchanged when disabled
- [ ] **AC-US3-02**: Gate checks for active increment via `.specweave/state/active-increment.json` — stops injecting once an increment exists
- [ ] **AC-US3-03**: Assessment instructions are injected as a separate clearly-labeled block in the hook output, coexisting with plugin/LSP sections
- [ ] **AC-US3-04**: When the gate determines "proceed to increment", it chains into the existing `SKILL FIRST` / `sw:increment-planner` flow seamlessly
- [ ] **AC-US3-05**: The existing static `DEEP_INTERVIEW_MSG` block in the `SKILL FIRST` section is replaced by the smart gate's dynamic output

---

### US-004: Signal Detection Framework (P2)
**Project**: specweave

**As a** developer
**I want** the LLM to check for well-defined completeness signals
**So that** the assessment is thorough and consistent (not arbitrary)

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Technical signals: tech stack, frameworks, database choice, authentication method, API integrations, deployment target, infrastructure needs
- [ ] **AC-US4-02**: Product signals: target users/personas, core user flows, business model/monetization, timeline/MVP scope
- [ ] **AC-US4-03**: Operational signals: environment variables/keys mentioned, CI/CD requirements, monitoring/observability needs
- [ ] **AC-US4-04**: LLM weighs signal importance based on project type (API keys matter more for SaaS; UI flows matter more for consumer apps; security matters more for fintech)

## Functional Requirements

### FR-001: Hook Assessment Injection
The `user-prompt-submit.sh` hook must inject a `SMART_INTERVIEW_GATE` block into the hook output when conditions are met (`deepInterview.enabled && !activeIncrement`). This block instructs the LLM to assess the user's prompt and either ask targeted questions or proceed to increment creation.

### FR-002: Context Accumulation
The injected instructions must tell the LLM to consider ALL prior messages in the session, not just the current prompt. The gate fires on every prompt, so the LLM sees the full conversation and can determine when enough context has been gathered.

### FR-003: Seamless Transition to Increment Creation
When the LLM decides the prompt is complete, it must call `Skill({ skill: "sw:increment-planner", args: "<full context>" })` — the same flow as the current mandatory increment path, but triggered by assessment rather than keyword detection.

## Success Criteria

- Users with comprehensive initial prompts skip interview entirely and go straight to increment creation
- Users with incomplete prompts get 2-5 targeted questions (not 20+)
- No regression in existing incrementAssist or plugin autoload behavior
- Hook output stays under 500 additional tokens for the gate block

## Out of Scope

- New config fields or thresholds (fully LLM-decided)
- Changes to `specweave init` wizard (flag already set there)
- Changes to `interview-enforcement-guard.sh` (strict mode unchanged)
- Per-session toggle changes (already exists via `--skip-interview`)
- New CLI commands
- New state files for tracking assessment progress (LLM uses conversation context)

## Dependencies

- Existing `planning.deepInterview.enabled` config flag (set during `specweave init`)
- Existing `active-increment.json` state file
- Existing `user-prompt-submit.sh` hook infrastructure
- Existing `sw:increment-planner` skill for chaining
