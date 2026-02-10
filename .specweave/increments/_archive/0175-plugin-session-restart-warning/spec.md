---
increment: 0175-plugin-session-restart-warning
title: "Plugin Session Restart Warning"
priority: P1
status: completed
created: 2026-01-25
dependencies: []
structure: user-stories
default_project: specweave
default_board: modules
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node-cli"
---

# Plugin Session Restart Warning

## Overview

When plugins are installed during a Claude Code session (e.g., via `specweave init` in a new project directory), those plugins are NOT loaded until a new session starts. Currently, Claude continues working without access to the newly installed skills, leading to manual coding instead of using specialized expertise.

This feature adds automatic detection of plugin installation during sessions and displays a clear warning with handoff context, halting execution until the user acknowledges and starts a new session.

## Problem Statement

**Current behavior:**
1. User asks Claude to create a project (e.g., "Create React dashboard with Stripe")
2. Claude runs `specweave init` which installs plugins (sw-frontend, sw-payments, etc.)
3. Claude continues coding manually with Write/Bash tools
4. Specialized skills (frontend-architect, payment-integration) are NOT available
5. User gets suboptimal results without expert skill knowledge

**Expected behavior:**
1. User asks Claude to create a project
2. Claude runs `specweave init` which installs plugins
3. System detects plugin installation and shows warning
4. Claude provides handoff context for new session
5. User starts new session with loaded plugins
6. Specialized skills are available and used correctly

## User Stories

### US-001: Detect Plugin Installation During Session
**Project**: specweave
**Board**: modules
**As a** Claude Code user, I want the system to detect when plugins are installed during my session, so that I'm aware the plugins won't be available until restart.

#### Acceptance Criteria
- [x] **AC-US1-01**: Detect when `specweave init` runs and installs plugins
- [x] **AC-US1-02**: Detect when `claude plugin install` commands run
- [x] **AC-US1-03**: Track plugin installation state in session context
- [x] **AC-US1-04**: Work in both CLI and IDE environments

---

### US-002: Display Session Restart Warning
**Project**: specweave
**Board**: modules
**As a** Claude Code user, I want to see a clear warning when plugins are installed, so that I understand why I need to restart.

#### Acceptance Criteria
- [x] **AC-US2-01**: Display prominent "⚠️ Session Restart Required" banner
- [x] **AC-US2-02**: List the plugins that were installed
- [x] **AC-US2-03**: Explain why restart is needed (plugins not loaded in current session)
- [x] **AC-US2-04**: Show warning immediately after plugin installation detected

---

### US-003: Provide Handoff Context
**Project**: specweave
**Board**: modules
**As a** Claude Code user, I want to receive context to continue in a new session, so that I don't lose progress or have to re-explain my request.

#### Acceptance Criteria
- [x] **AC-US3-01**: Generate summary of what was accomplished
- [x] **AC-US3-02**: Provide the new project directory path
- [x] **AC-US3-03**: Include the original user request/intent
- [x] **AC-US3-04**: List available skills in the new session
- [x] **AC-US3-05**: Provide copy-paste ready text for new session

---

### US-004: Halt Execution After Warning
**Project**: specweave
**Board**: modules
**As a** system, I want to halt further execution after displaying the warning, so that Claude doesn't continue with unavailable skills.

#### Acceptance Criteria
- [x] **AC-US4-01**: Stop processing after warning is shown
- [x] **AC-US4-02**: Prevent Claude from continuing to code manually
- [x] **AC-US4-03**: Allow user to acknowledge before proceeding (if override needed)
- [x] **AC-US4-04**: Log the halt event for debugging

---

## Functional Requirements

### FR-001: Detection Mechanism
- Hook into `user-prompt-submit.sh` or create new hook
- Monitor for plugin installation commands/events
- Track state across the session
- Support multiple detection triggers (init, plugin install, etc.)

### FR-002: Warning Display
- Use standardized warning format matching SpecWeave style
- Include visual indicators (⚠️ emoji, color coding)
- Be prominent but not disruptive
- Work in both terminal and IDE contexts

### FR-003: Context Generation
- Capture project path and name
- Summarize installed plugins
- Include original user intent if available
- Format for easy copy-paste

### FR-004: Execution Control
- Integrate with Claude's response generation
- Provide clear stop signal
- Allow emergency override if needed
- Don't break existing workflows

## Out of Scope

- Automatic session restart (requires Claude Code changes)
- Plugin hot-reloading (would require Claude Code core changes)
- Persisting context across sessions (beyond text handoff)
- IDE-specific restart mechanisms

## Success Criteria

1. Plugin installation during session is detected 100% of the time
2. Warning is displayed immediately after detection
3. Handoff context is accurate and actionable
4. User can successfully continue in new session
5. No false positives (don't warn when not needed)

## TDD Contract

This increment follows strict TDD discipline:
- All features must have failing tests written FIRST
- Implementation only after tests exist
- Refactoring with green tests only
- Coverage target: 90%
