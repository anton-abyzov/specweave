---
increment: 0221-external-api-consent-management
title: "External API Key Cost Consent Management"
type: feature
priority: P1
status: planned
created: 2026-02-15
structure: user-stories
test_mode: TDD
coverage_target: 90
---

# Feature: External API Key Cost Consent Management

## Overview

Two-layer consent system (code guard + behavioral SKILL.md) requiring explicit user permission before using external LLM APIs (Anthropic, OpenAI, etc.) that cost extra credits beyond the Claude Code subscription.

## User Stories

### US-001: Consent Gate for External API Calls (P0)
**Project**: specweave

**As a** SpecWeave user
**I want** the system to ask my permission before making external API calls that cost money
**So that** I am never surprised by extra charges on my API accounts

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Free providers (claude-code, ollama) bypass consent — no prompt needed
- [ ] **AC-US1-02**: External providers (anthropic, openai, azure-openai, bedrock, vertex-ai) require consent check
- [ ] **AC-US1-03**: `checkConsent()` reads `.specweave/config.json` `externalModels` section
- [ ] **AC-US1-04**: When `consent: "always-allow"`, all external providers are granted
- [ ] **AC-US1-05**: When `consent: "never"`, all external providers are denied
- [ ] **AC-US1-06**: When `consent: "ask"` and provider in `allowedProviders`, consent is granted
- [ ] **AC-US1-07**: When `consent: "ask"` and provider NOT in `allowedProviders`, returns `'ask'` status

---

### US-002: Standing Permission Persistence (P0)
**Project**: specweave

**As a** SpecWeave user
**I want** to grant standing permission for specific providers so I'm not asked repeatedly
**So that** the consent flow doesn't interrupt my workflow after initial approval

**Acceptance Criteria**:
- [ ] **AC-US2-01**: `grantStandingConsent()` adds provider to `allowedProviders` in config.json
- [ ] **AC-US2-02**: Duplicate providers are not added
- [ ] **AC-US2-03**: Missing `externalModels` section is created with defaults

---

### US-003: Provider Factory Consent Gate (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** the provider factory to enforce consent before creating paid providers
**So that** no code path can bypass the consent mechanism

**Acceptance Criteria**:
- [ ] **AC-US3-01**: `createProvider()` checks consent for external providers
- [ ] **AC-US3-02**: Throws `ExternalApiConsentDeniedError` when consent denied
- [ ] **AC-US3-03**: Free providers (claude-code, ollama) created without consent check

---

### US-004: Skill Judge Consent Integration (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** judge-llm to check consent before calling the Anthropic API
**So that** I control when my API key is used for validation

**Acceptance Criteria**:
- [ ] **AC-US4-01**: `judge()` checks consent before API call
- [ ] **AC-US4-02**: Falls back to `basicEvaluation()` when consent denied
- [ ] **AC-US4-03**: Skips consent check when no API key (already falls back)

---

### US-005: Behavioral SKILL.md Instructions (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** Claude to ask me before invoking external APIs through skills
**So that** I have a conversational consent experience on top of the code guard

**Acceptance Criteria**:
- [ ] **AC-US5-01**: judge-llm SKILL.md includes consent check instructions
- [ ] **AC-US5-02**: done SKILL.md references consent before judge-llm step

## Out of Scope

- Cost estimation display (future enhancement)
- Per-session ephemeral consent (keep it simple — config only)
- UI for managing consent (CLI config editing is sufficient)
