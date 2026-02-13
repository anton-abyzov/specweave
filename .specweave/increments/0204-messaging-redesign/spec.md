# Messaging & Docs Redesign

## Overview
Redesign SpecWeave's public-facing messaging (README, landing page, docs navigation) to better communicate business value. Core differentiators are undersold: skills as "programs in English", agent swarms with iTerm/tmux, enterprise readiness, and abstraction of Claude Code complexity.

## User Stories

### US-001: Developer evaluating SpecWeave
As a developer discovering SpecWeave, I want to immediately understand what makes it different from other AI tools, so I can decide whether to try it.

**Acceptance Criteria:**
- [x] AC-US1-01: README opens with "programs in English" concept within first 20 lines
- [x] AC-US1-02: Quick demo shows 3 use cases (solo, team, brownfield)
- [x] AC-US1-03: "What Are Skills?" section explains the concept with before/after
- [x] AC-US1-04: Comparison table includes enterprise and agent team rows

### US-002: Team lead evaluating parallel development
As a team lead, I want to understand how agent swarms work with iTerm/tmux, so I can see the productivity gain.

**Acceptance Criteria:**
- [x] AC-US2-01: README has Agent Swarms section with iTerm/tmux visual
- [x] AC-US2-02: Landing page includes Autonomous Teams pillar
- [x] AC-US2-03: Link to full agent-teams-and-swarms guide is prominent

### US-003: Enterprise buyer evaluating compliance
As an enterprise buyer, I want to find compliance, brownfield, and multi-repo capabilities easily, so I can evaluate enterprise readiness.

**Acceptance Criteria:**
- [x] AC-US3-01: Enterprise content accessible from main navbar
- [x] AC-US3-02: Enterprise hub/overview page exists
- [x] AC-US3-03: README has Enterprise section with compliance highlights
- [x] AC-US3-04: Cross-links from getting-started and features to enterprise docs

### US-004: Developer who doesn't know Claude Code
As a developer unfamiliar with Claude Code, I want to know I don't need to learn it separately, so I feel confident installing SpecWeave.

**Acceptance Criteria:**
- [x] AC-US4-01: "No Claude Code Docs Needed" page exists in overview
- [x] AC-US4-02: Landing page has mini-section about abstraction
- [x] AC-US4-03: Message appears in README or quick start

### US-005: Developer wanting zero-friction build workflow
As a developer, I want to describe what I want to build, have AI ask me the right questions, then go to sleep while it builds — so I can review finished work in the morning.

**Acceptance Criteria:**
- [x] AC-US5-01: "Describe → Interview → Sleep → Review" workflow is prominently shown
- [x] AC-US5-02: Scenario appears in README Quick Demo or landing page
- [x] AC-US5-03: Explains what human review is needed (UI/UX, look-and-feel) vs what's automated (tests, quality gates)
