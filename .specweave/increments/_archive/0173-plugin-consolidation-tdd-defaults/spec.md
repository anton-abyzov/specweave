# Specification: Plugin Consolidation and TDD-First Defaults

**Increment**: 0173-plugin-consolidation-tdd-defaults
**Status**: completed
**Created**: 2026-01-19

## Overview

Consolidate plugins by merging sw-ui into sw-testing, update init wizard to recommend TDD-first development with 80% coverage, and enhance infrastructure hosting recommendations.

---

## User Stories

### US-001: TDD-First Init Wizard
**As a** new SpecWeave user,
**I want** TDD to be recommended as the default testing approach,
**So that** I start projects with quality-first practices from day one.

#### Acceptance Criteria
- [x] **AC-US1-01**: TDD option appears first in testing approach selection
- [x] **AC-US1-02**: TDD option includes "(Recommended)" label in all 9 supported languages
- [x] **AC-US1-03**: Default coverage target is 80% (not 50%)

---

### US-002: Plugin Consolidation
**As a** SpecWeave maintainer,
**I want** sw-ui capabilities merged into sw-testing,
**So that** users have fewer plugins to manage and related features are grouped logically.

#### Acceptance Criteria
- [x] **AC-US2-01**: sw-ui skills (browser-automation, visual-regression, ui-testing, image-generation) copied to sw-testing
- [x] **AC-US2-02**: sw-ui commands (ui-automate, ui-inspect, image) copied to sw-testing
- [x] **AC-US2-03**: sw-ui marked as deprecated with migration message
- [x] **AC-US2-04**: Keyword detector routes UI keywords to specweave-testing
- [x] **AC-US2-05**: PLUGINS-INDEX.md updated with deprecated section

---

### US-003: Enhanced Hosting Recommendations
**As a** developer choosing deployment platforms,
**I want** intelligent hosting recommendations that consider enterprise needs,
**So that** I can make informed decisions about Vercel vs Cloudflare vs Railway.

#### Acceptance Criteria
- [x] **AC-US3-01**: Enterprise tier triggers documented (when to upgrade from free)
- [x] **AC-US3-02**: Remix-specific guidance for Cloudflare vs Vercel adapters
- [x] **AC-US3-03**: Backend services comparison (Railway, Render, Fly.io for cron jobs)
- [x] **AC-US3-04**: Hybrid architecture patterns documented

---

### US-004: Plugin-Dev Test Coverage
**As a** plugin developer,
**I want** plugin-dev functionality to be well-tested,
**So that** I can trust the plugin system works correctly.

#### Acceptance Criteria
- [x] **AC-US4-01**: Plugin loader tests pass (12 tests)
- [x] **AC-US4-02**: Plugin installer tests pass (21 tests)
- [x] **AC-US4-03**: Plugin keywords validation tests pass (5 tests)
