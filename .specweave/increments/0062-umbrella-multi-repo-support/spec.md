---
increment: 0062-umbrella-multi-repo-support
feature_id: FS-062
status: completed
created: 2025-11-25
completed: 2025-11-25
scope: foundation
scope_note: "Phase 1: Detection & Config foundation. Full init flow integration deferred to future increment."
---

# Umbrella Multi-Repo Support

## Problem Statement

When users describe multi-repo architectures (e.g., "3 repos: Frontend, Backend, Shared"), SpecWeave currently:

1. **Generates generic user stories** (`US-001`) instead of project-scoped (`US-FE-001`)
2. **Creates monorepo structure** with submodules instead of independent repos
3. **Uses single external tool config** instead of per-repo GitHub issues
4. **PM agent doesn't understand** that different features belong to different repos

**Real Example** (user's sw-qr-menu project):
- User prompt described: "Frontend repo, Backend API repo, Shared library repo"
- SpecWeave generated: `US-001: Restaurant Onboarding` (generic, not repo-specific)
- Expected: `US-FE-001: Menu Builder UI`, `US-BE-001: Restaurant CRUD API`, `US-SHARED-001: Schema Validators`

## Solution Overview

Enable **umbrella repo mode** where:
1. Each child repo has its own `.specweave/` configuration
2. Each repo syncs to its own GitHub issues
3. User stories are project-scoped with prefixes (US-FE-*, US-BE-*)
4. PM agent understands which features belong to which repo

---

## User Stories

### US-001: Multi-Repo Detection in Init

**As a** developer starting a multi-repo project
**I want** SpecWeave to detect when I describe multiple repos
**So that** it can set up appropriate project structure

**Acceptance Criteria:**
- [x] **AC-US1-01**: Init detects keywords like "3 repos", "frontend repo", "backend repo", "monorepo with services"
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: `src/utils/multi-repo-detector.ts` with 22 passing tests
- [x] **AC-US1-02**: Prompts "I detected a multi-repo architecture. How would you like to set it up?"
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: Skill provides guidance message via `umbrella-repo-detector`
- [ ] **AC-US1-03**: Offers options: "Clone from GitHub", "Create new repos", "Initialize each folder"
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Deferred**: Full init flow integration → future increment
- [ ] **AC-US1-04**: For "Clone from GitHub", accepts comma-separated URLs or interactive entry
  - Priority: P1 (High)
  - Testable: Yes
  - **Deferred**: Full init flow integration → future increment

### US-002: Independent Repo Initialization

**As a** developer with multiple repos
**I want** each repo to have its own SpecWeave configuration
**So that** each repo is independent and syncs to its own external tools

**Acceptance Criteria:**
- [ ] **AC-US2-01**: Each cloned/created repo gets its own `.specweave/` folder
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Deferred**: Full init flow integration → future increment
- [x] **AC-US2-02**: Each repo gets its own `config.json` with its GitHub/JIRA/ADO settings
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: `UmbrellaConfig` schema supports per-repo config in `src/core/config/types.ts`
- [x] **AC-US2-03**: Parent/umbrella repo (optional) only coordinates, no implementation specs
  - Priority: P1 (High)
  - Testable: Yes
  - **Completed**: Architecture documented in ADR-0142
- [ ] **AC-US2-04**: Running `specweave init` in child repo detects it's part of umbrella setup
  - Priority: P2 (Medium)
  - Testable: Yes
  - **Deferred**: Full init flow integration → future increment

### US-003: Project-Scoped User Stories

**As a** PM agent
**I want** to generate user stories with project prefixes
**So that** user stories are routed to the correct repo

**Acceptance Criteria:**
- [x] **AC-US3-01**: PM agent detects multi-repo context from user prompt
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: PM agent AGENT.md updated with multi-repo detection patterns
- [x] **AC-US3-02**: Generates prefixed IDs: `US-FE-001`, `US-BE-001`, `US-SHARED-001`
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: PM agent AGENT.md updated with prefixing rules
- [x] **AC-US3-03**: Maps user story to correct repo based on keywords (UI → FE, API → BE)
  - Priority: P0 (Critical)
  - Testable: Yes
  - **Completed**: PM agent AGENT.md updated with keyword-to-repo mapping table
- [ ] **AC-US3-04**: Cross-cutting concerns tagged with multiple projects
  - Priority: P1 (High)
  - Testable: Yes
  - **Deferred**: Needs full sync integration → future increment

### US-004: Per-Repo External Tool Sync (DEFERRED)

> **Note**: This user story is deferred to Phase 2 (future increment) as it requires full init flow integration.

**As a** developer with multiple repos
**I want** each repo to sync to its own GitHub issues
**So that** issues appear in the correct repository

**Acceptance Criteria:**
- [ ] **AC-US4-01**: GitHub sync uses repo's own config, not parent config
  - Priority: P0 (Critical)
  - **Deferred**: Phase 2
- [ ] **AC-US4-02**: Issues created in `sw-qr-menu-fe` repo for FE user stories
  - Priority: P0 (Critical)
  - **Deferred**: Phase 2
- [ ] **AC-US4-03**: Issues created in `sw-qr-menu-be` repo for BE user stories
  - Priority: P0 (Critical)
  - **Deferred**: Phase 2
- [ ] **AC-US4-04**: Cross-project issues created in all relevant repos with linking
  - Priority: P1 (High)
  - **Deferred**: Phase 2

### US-005: Spec Distribution to Child Repos (DEFERRED)

> **Note**: This user story is deferred to Phase 2 (future increment) as it requires full init flow integration.

**As a** PM
**I want** to plan a feature that spans multiple repos
**So that** each repo gets its relevant portion of the spec

**Acceptance Criteria:**
- [ ] **AC-US5-01**: Planning in parent repo creates distributed specs
  - Priority: P1 (High)
  - **Deferred**: Phase 2
- [ ] **AC-US5-02**: Each child repo's `.specweave/increments/` gets only its user stories
  - Priority: P1 (High)
  - **Deferred**: Phase 2
- [ ] **AC-US5-03**: Shared dependencies tracked in spec frontmatter
  - Priority: P2 (Medium)
  - **Deferred**: Phase 2
- [ ] **AC-US5-04**: `/specweave:distribute-spec` command for manual distribution
  - Priority: P2 (Medium)
  - **Deferred**: Phase 2

---

## Non-Functional Requirements

1. **Backward Compatibility**: Single-repo projects work unchanged
2. **Performance**: Detection adds <100ms to init flow
3. **UX**: Clear prompts explain multi-repo options without jargon

---

## Out of Scope

1. Git submodule management (handled externally)
2. Cross-repo dependency resolution
3. Monorepo build tools (Nx, Turborepo integration)
4. CI/CD pipeline generation

---

## Technical Approach

### Architecture

```
umbrella-repo/                    # Optional coordination repo
├── .specweave/
│   ├── config.json              # umbrella: { childRepos: [...] }
│   └── docs/                    # High-level PRD, roadmap
│
├── sw-qr-menu-fe/               # Cloned from GitHub
│   └── .specweave/
│       ├── config.json          # sync → sw-qr-menu-fe issues
│       └── increments/
│           └── 0001-menu-builder/
│               ├── spec.md      # Only US-FE-* stories
│               └── tasks.md
│
├── sw-qr-menu-be/               # Cloned from GitHub
│   └── .specweave/
│       └── ...                  # sync → sw-qr-menu-be issues
│
└── sw-qr-menu-shared/           # Cloned from GitHub
    └── .specweave/
        └── ...                  # sync → sw-qr-menu-shared issues
```

### Key Changes

1. **Init Flow** (`src/cli/commands/init.ts`):
   - Add `detectMultiRepoIntent()` function
   - Add `initializeUmbrellaMode()` flow
   - Support `--umbrella` flag

2. **PM Agent** (`plugins/specweave/agents/pm/AGENT.md`):
   - Add multi-repo context awareness
   - Project-prefixed user story generation
   - Story-to-repo mapping logic

3. **New Skill** (`plugins/specweave/skills/umbrella-repo-detector/SKILL.md`):
   - Activates on multi-repo keywords
   - Guides user through setup options

4. **Config Schema** (`src/core/types/config.ts`):
   - Add `umbrella.childRepos[]` configuration
   - Add `projectPrefix` per child repo

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PM agent generates wrong prefixes | Medium | High | Keyword-based routing with validation |
| User confusion with multiple configs | Medium | Medium | Clear setup wizard, docs |
| GitHub rate limits with multiple repos | Low | Medium | Batch operations, caching |
| Breaking existing single-repo flows | Low | High | Feature flag, comprehensive tests |

---

## Success Metrics

1. **Detection Accuracy**: 90%+ multi-repo intent detected from prompts
2. **Setup Success**: 95%+ umbrella setups complete without errors
3. **Story Routing**: 95%+ user stories routed to correct repo
4. **User Satisfaction**: No confusion-related support tickets

---

## References

- Previous increment: 0022-multi-repo-init-ux
- Existing: Multi-project sync architecture (v0.18.0)
- ADR-0024: Root-level repository structure
