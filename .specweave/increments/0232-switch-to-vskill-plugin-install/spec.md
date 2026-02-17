---
increment: 0232-switch-to-vskill-plugin-install
title: "Switch Plugin Installation to vskill"
type: feature
priority: P1
status: active
created: 2026-02-16
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Switch Plugin Installation to vskill

## Overview

Replace all Claude Code marketplace plugin installations (`claude plugin install sw-X@specweave`) with vskill CLI, gaining mandatory security scanning on every install. Affects 11 source files, 34 plugin files, and documentation.

## User Stories

### US-001: New User Plugin Installation via vskill (P1)
**Project**: specweave

**As a** new SpecWeave user
**I want** plugins to be installed via vskill during `specweave init`
**So that** every plugin is security-scanned before installation

**Acceptance Criteria**:
- [ ] **AC-US1-01**: `specweave init` installs core `sw` plugin via vskill instead of `claude plugin install`
- [ ] **AC-US1-02**: Plugin is scanned by vskill Tier 1 scanner before installation
- [ ] **AC-US1-03**: Scan result (PASS/CONCERNS/FAIL) is displayed to the user
- [ ] **AC-US1-04**: `vskill.lock` file is created in project root tracking installed plugins
- [ ] **AC-US1-05**: Installed plugin is placed in `~/.claude/plugins/cache/specweave/sw/<version>/` preserving Claude Code's expected directory structure
- [ ] **AC-US1-06**: Plugin is enabled in `~/.claude/settings.json`

---

### US-002: Plugin Refresh/Update via vskill (P1)
**Project**: specweave

**As an** existing SpecWeave user
**I want** to refresh/update plugins via vskill
**So that** updates are security-scanned before being applied

**Acceptance Criteria**:
- [ ] **AC-US2-01**: `specweave refresh-plugins` delegates to vskill for installation/update
- [ ] **AC-US2-02**: `specweave refresh-marketplace` is a deprecated alias that prints a deprecation notice and calls `refresh-plugins`
- [ ] **AC-US2-03**: Content hash comparison detects changed plugins
- [ ] **AC-US2-04**: Changed plugins are re-scanned before update
- [ ] **AC-US2-05**: `vskill.lock` is updated with new scan dates and content hashes

---

### US-003: Lazy Loading via vskill (P1)
**Project**: specweave

**As a** user with lazy loading enabled
**I want** auto-detected plugins to be installed via vskill
**So that** even on-demand plugins are security-scanned

**Acceptance Criteria**:
- [ ] **AC-US3-01**: `user-prompt-submit.sh` hook calls vskill instead of `claude plugin install` for auto-detected plugins
- [ ] **AC-US3-02**: Installation latency remains under 5 seconds
- [ ] **AC-US3-03**: Already-installed plugins detected from `vskill.lock` are skipped (no re-scan)
- [ ] **AC-US3-04**: Hook output remains compatible with Claude Code's `additionalContext` format

---

### US-004: Migration from Claude Marketplace (P2)
**Project**: specweave

**As an** existing user with Claude marketplace plugins installed
**I want** a smooth migration to vskill
**So that** I don't lose my installed plugins or configuration

**Acceptance Criteria**:
- [ ] **AC-US4-01**: `specweave migrate-to-vskill` creates `vskill.lock` from currently installed plugins
- [ ] **AC-US4-02**: Existing plugin files in `~/.claude/plugins/cache/specweave/` are preserved
- [ ] **AC-US4-03**: Claude marketplace registration is optionally removed (with user confirmation)
- [ ] **AC-US4-04**: `specweave init` detects marketplace-based installation and offers migration

---

### US-005: Full Claude Code Plugin Directory Support in vskill (P1)
**Project**: specweave

**As a** developer
**I want** vskill `add` to support full Claude Code plugin directories
**So that** plugins with skills, hooks, commands, and agents install correctly

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `vskill add <owner/repo> --plugin <name>` installs a specific plugin from a multi-plugin repository
- [ ] **AC-US5-02**: Full plugin directory structure is preserved (skills/, hooks/, commands/, agents/, .claude-plugin/)
- [ ] **AC-US5-03**: Hook scripts get executable permissions fixed (chmod +x) after installation
- [ ] **AC-US5-04**: Security scanning covers all plugin files (hooks, scripts, commands), not just SKILL.md

## Out of Scope

- Publishing vskill to npm (deferred to increment 0225)
- Building the verified-skill.com web registry frontend
- Supporting non-Claude-Code agent installations (vskill already supports 39 agents, but this increment only targets Claude Code)
- Tier 2 LLM scanning (Tier 1 pattern-based scanning is sufficient for this phase)

## Dependencies

- vskill local codebase at `vskill/` (Turborepo monorepo, ~30% complete)
- Existing scanner package `@vskill/scanner` with 37 security patterns
- Existing marketplace.json at `.claude-plugin/marketplace.json`

## Success Criteria

- Zero references to `claude plugin install` in active code paths (deprecated alias is acceptable)
- All 21+ plugins installable via vskill
- Lazy loading latency stays under 5s for new installs, <100ms for already-installed
- Existing users can migrate with a single command
