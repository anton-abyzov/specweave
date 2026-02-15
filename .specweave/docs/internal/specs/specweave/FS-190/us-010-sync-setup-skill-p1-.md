---
id: US-010
feature: FS-190
title: "Sync Setup Skill (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave user
**I want** an interactive `/sw:sync-setup` skill that configures sync in one guided flow
**So that** I don't need to manually edit config."
project: specweave
---

# US-010: Sync Setup Skill (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave user
**I want** an interactive `/sw:sync-setup` skill that configures sync in one guided flow
**So that** I don't need to manually edit config.json and .env with 7+ steps

---

## Acceptance Criteria

- [x] **AC-US10-01**: Given the user invokes `/sw:sync-setup`, when the skill starts, then it asks which providers to enable (GitHub, JIRA, ADO) via AskUserQuestion
- [x] **AC-US10-02**: Given a provider is selected, when credentials are provided, then the skill validates them with a test API call before saving
- [x] **AC-US10-03**: Given hierarchy configuration, when the user's JIRA/ADO project is accessible, then the skill auto-detects the hierarchy and asks for confirmation
- [x] **AC-US10-04**: Given all configuration is complete, when the wizard finishes, then it writes the correct config.json sync section and .env credentials
- [x] **AC-US10-05**: Given the setup is complete, when the skill finishes, then it runs a test sync (dry run) to verify the configuration works

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
