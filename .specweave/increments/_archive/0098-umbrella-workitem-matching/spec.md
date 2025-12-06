---
increment: 0098-umbrella-workitem-matching
title: Umbrella Work Item Matching & Job Integration
type: feature
priority: high
status: active
created: 2024-12-03
depends_on: 0097-umbrella-module-detection
---

# Umbrella Work Item Matching & Job Integration

## Problem Statement

With increment 0097, SpecWeave can now detect umbrella projects and identify child repositories as modules. However, the work item matching system still fails for umbrella projects because:

1. Work items from ADO/JIRA/GitHub map to team/area paths, not module names
2. The matcher uses keyword-based matching which doesn't work for enterprise naming
3. Module-workitem-map.json remains empty despite having imported features
4. Foundation docs don't reflect umbrella structure accurately

## User Stories

### US-001: ADO Area Path to Repo Mapping
**As a** user with ADO-imported features organized by area paths (e.g., "Acme\Inventory")
**I want** SpecWeave to intelligently map area paths to cloned repositories
**So that** work items are correctly associated with their corresponding code modules

#### Acceptance Criteria
- [ ] **AC-US1-01**: Area path "Acme\Inventory" matches repos "inventory-fe", "inventory-be"
- [ ] **AC-US1-02**: Team folder structure in specs/ maps to repo prefixes
- [ ] **AC-US1-03**: Matching works for 200+ repos with minimal false positives
- [ ] **AC-US1-04**: Unmatched items are reported with suggested mappings

### US-002: Enhanced Work Item Matching
**As a** developer documenting an umbrella project
**I want** work items to match based on team, area path, and content
**So that** the module-workitem-map.json is populated correctly

#### Acceptance Criteria
- [ ] **AC-US2-01**: Matching score includes area path similarity
- [ ] **AC-US2-02**: Team name from work item matches repo prefix
- [ ] **AC-US2-03**: Keywords still contribute to scoring as fallback
- [ ] **AC-US2-04**: Match confidence is reported (high/medium/low)

### US-003: Foundation Docs for Umbrella
**As a** user viewing generated living docs
**I want** the overview and tech stack docs to reflect umbrella structure
**So that** I understand the multi-repo architecture at a glance

#### Acceptance Criteria
- [ ] **AC-US3-01**: Overview shows umbrella status and child repo count
- [ ] **AC-US3-02**: Tech stack shows frameworks grouped by module type
- [ ] **AC-US3-03**: Modules skeleton includes team groupings

### US-004: SUGGESTIONS.md Improvements
**As a** user completing living docs builder
**I want** SUGGESTIONS.md to show meaningful recommendations
**So that** I know which modules need documentation attention

#### Acceptance Criteria
- [ ] **AC-US4-01**: Unmatched work items listed with suggested modules
- [ ] **AC-US4-02**: Modules without work items flagged as potential tech debt
- [ ] **AC-US4-03**: Coverage percentage calculated correctly for umbrella

## Technical Requirements

- Backwards compatible with non-umbrella projects
- Performance: Handle 500+ work items × 200+ repos in under 60 seconds
- Configurable matching thresholds via config.json
