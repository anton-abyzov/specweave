# Tasks: Plugin/LSP Activation E2E Tests

## Phase 1: Skill Trigger Index (P0)

### T-001: Create skill trigger extractor script
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Model**: opus

**Description**: Create TypeScript module that scans all SKILL.md files and extracts trigger keywords from descriptions.

**Test**: Given 119 SKILL.md files → When extracting → Then returns keyword map for each skill

**Acceptance**:
- [x] Scans all `plugins/*/skills/*/SKILL.md` files
- [x] Parses YAML frontmatter for name and description
- [x] Extracts keywords from "Activates for:" sections in descriptions
- [x] Handles multiple keyword formats (comma-separated, "or" separated)
- [x] Returns structured SkillTriggerMap

---

### T-002: Generate skill-triggers-index.json
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed
**Model**: opus

**Description**: Generate the index file that maps keywords to skills.

**Test**: Given extracted triggers → When generating index → Then .specweave/state/skill-triggers-index.json is created

**Acceptance**:
- [x] Creates inverted index (keyword → skills[])
- [x] Includes skill metadata (plugin, description snippet)
- [x] Handles keyword normalization (lowercase, trim)
- [x] Writes to .specweave/state/skill-triggers-index.json
- [x] Includes generation timestamp

---

### T-003: Hook index refresh on plugin installation
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Model**: opus

**Description**: Refresh the trigger index when plugins are installed/updated.

**Test**: Given plugin install → When completed → Then index is refreshed

**Acceptance**:
- [x] Hook into refresh-marketplace.sh completion
- [x] Call index generator after plugin installation
- [x] Log refresh action and skill count
- [x] Handle errors gracefully

---

### T-004: Unit tests for trigger extraction
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Model**: opus

**Description**: Create comprehensive unit tests for the trigger extractor.

**Test**: Given sample SKILL.md content → When extracting → Then correct triggers returned

**Acceptance**:
- [x] Test parsing of standard "Activates for:" format
- [x] Test parsing of comma-separated keywords
- [x] Test handling of missing description
- [x] Test keyword normalization
- [x] Test index generation from map

---

## Phase 2: Plugin Activation E2E Tests (P0)

### T-005: Create E2E test infrastructure
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Model**: opus

**Description**: Set up E2E test infrastructure for testing skill activation.

**Test**: Given test infrastructure → When running tests → Then results are captured

**Acceptance**:
- [x] Create tests/e2e/plugin-activation/ directory
- [x] Set up test fixtures with sample prompts
- [x] Create helper to match prompts against trigger index
- [x] Set up Vitest E2E config if needed

---

### T-006: E2E test for Kubernetes plugin activation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
**Model**: opus

**Description**: Test that kubernetes-related prompts match K8s skills.

**Test**: Given "deploy to EKS with GitOps" → When matching → Then kubernetes-architect matched

**Acceptance**:
- [x] Test matches kubernetes-architect for "EKS" prompt
- [x] Test matches for "Kubernetes manifest" prompt
- [x] Test matches for "Helm chart" prompt
- [x] Test matches for "GitOps ArgoCD" prompt
- [x] All tests pass

---

### T-007: E2E test for Mobile plugin activation
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed
**Model**: opus

**Description**: Test that mobile-related prompts match mobile skills.

**Test**: Given "React Native auth flow" → When matching → Then mobile-architect matched

**Acceptance**:
- [x] Test matches mobile-architect for "React Native" prompt
- [x] Test matches for "iOS app" prompt
- [x] Test matches for "Android navigation" prompt
- [x] Test matches for "Expo SDK" prompt
- [x] All tests pass

---

### T-008: E2E test for Backend plugin activation
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Model**: opus

**Description**: Test that backend-related prompts match backend skills.

**Test**: Given "NestJS API with Prisma" → When matching → Then nodejs-backend matched

**Acceptance**:
- [x] Test matches nodejs-backend for "NestJS" prompt
- [x] Test matches for "Express API" prompt
- [x] Test matches for "Prisma database" prompt
- [x] Test matches for "REST API authentication" prompt
- [x] All tests pass

---

### T-009: E2E test for Frontend plugin activation
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Model**: opus

**Description**: Test that frontend-related prompts match frontend skills.

**Test**: Given "Next.js dashboard" → When matching → Then frontend-architect matched

**Acceptance**:
- [x] Test matches frontend-architect for "Next.js" prompt
- [x] Test matches for "React components" prompt
- [x] Test matches for "Vue.js SPA" prompt
- [x] Test matches for "state management" prompt
- [x] All tests pass

---

### T-010: E2E test for additional domains
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Model**: opus

**Description**: Test activation for security, infrastructure, ML, and other domains.

**Test**: Given domain-specific prompts → When matching → Then correct skills matched

**Acceptance**:
- [x] Test security skill for "OWASP vulnerabilities" prompt
- [x] Test devops skill for "Terraform AWS" prompt
- [x] Test ml-engineer skill for "train ML model" prompt
- [x] Test database-optimizer for "PostgreSQL performance" prompt
- [x] All tests pass

---

## Phase 3: LSP Integration (P1)

### T-011: Create LSP client wrapper
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Model**: opus

**Description**: Create TypeScript wrapper for LSP operations.

**Test**: Given TypeScript file → When calling goToDefinition → Then returns definition location

**Acceptance**:
- [x] Create src/core/lsp/lsp-client.ts
- [x] Implement initialize() method
- [x] Implement goToDefinition() method
- [x] Implement findReferences() method
- [x] Handle server lifecycle (start/stop)

---

### T-012: TypeScript/JavaScript LSP integration
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Model**: opus

**Description**: Integrate with typescript-language-server for TS/JS projects.

**Test**: Given TS project → When finding references → Then accurate results returned

**Acceptance**:
- [x] Auto-detect TypeScript projects (tsconfig.json)
- [x] Initialize typescript-language-server
- [x] Map file URIs correctly
- [x] Parse LSP responses
- [x] Return structured results

---

### T-013: Python LSP integration
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Model**: opus

**Description**: Integrate with python-lsp-server for Python projects.

**Test**: Given Python project → When finding definition → Then accurate result returned

**Acceptance**:
- [x] Auto-detect Python projects (pyproject.toml, setup.py, *.py)
- [x] Initialize python-lsp-server (or pyright)
- [x] Handle Python-specific URI schemes
- [x] Parse Python LSP responses
- [x] Return structured results

---

### T-014: Integrate LSP into living-docs
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Model**: opus

**Description**: Use LSP in living-docs command for semantic analysis.

**Test**: Given /sw:living-docs → When analyzing → Then LSP is invoked

**Acceptance**:
- [x] Check for LSP availability before use
- [x] Use LSP for export/symbol extraction
- [x] Use LSP for cross-file reference resolution
- [x] Log LSP usage for debugging
- [x] Track performance improvement

---

### T-015: Grep fallback when LSP unavailable
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Model**: opus

**Description**: Gracefully fallback to grep-based analysis when LSP is unavailable.

**Test**: Given no LSP → When analyzing → Then grep is used with warning

**Acceptance**:
- [x] Detect when LSP server not installed
- [x] Log warning about degraded analysis
- [x] Use existing grep-based parsing
- [x] Continue without error
- [x] Track which method was used

---

### T-016: E2E test for LSP vs grep performance
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Model**: opus

**Description**: Prove LSP is faster than grep for symbol resolution.

**Test**: Given large codebase → When comparing LSP vs grep → Then LSP is significantly faster

**Acceptance**:
- [x] Set up test with real TypeScript codebase
- [x] Measure grep-based symbol search time
- [x] Measure LSP-based symbol resolution time
- [x] Assert LSP is at least 10x faster
- [x] Log performance comparison

---

## Phase 4: Plugin Debugging Tools (P2)

### T-017: Create /sw:plugin-status command
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Model**: opus

**Description**: Create command to show loaded plugins and activation status.

**Test**: Given /sw:plugin-status → When executing → Then shows plugin status table

**Acceptance**:
- [x] List all installed plugins
- [x] Show skill count per plugin
- [x] Show last activation timestamp
- [x] Show trigger keyword sample
- [x] Format as readable table

---

### T-018: Create /sw:skill-match command
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed
**Model**: opus

**Description**: Test a prompt against skill triggers to see what would match.

**Test**: Given /sw:skill-match "deploy to EKS" → When executing → Then shows matched skills

**Acceptance**:
- [x] Accept prompt as argument
- [x] Load skill trigger index
- [x] Match prompt keywords against triggers
- [x] Show matched skills ranked by relevance
- [x] Include match explanation

---

### T-019: Add activation debug logging
**User Story**: US-004
**Satisfies ACs**: AC-US4-03, AC-US4-04
**Status**: [x] completed
**Model**: opus

**Description**: Log skill matching decisions for debugging.

**Test**: Given DEBUG=skills → When matching → Then decisions logged

**Acceptance**:
- [x] Add SPECWEAVE_DEBUG_SKILLS env var
- [x] Log when skill matching occurs
- [x] Log matched and rejected skills
- [x] Log reasons for rejection
- [x] Write to .specweave/logs/skill-activation.log

---

## Summary

| Phase | Tasks | Priority | Status |
|-------|-------|----------|--------|
| 1. Skill Trigger Index | T-001 to T-004 | P0 | Pending |
| 2. Plugin Activation E2E | T-005 to T-010 | P0 | Pending |
| 3. LSP Integration | T-011 to T-016 | P1 | Pending |
| 4. Plugin Debugging | T-017 to T-019 | P2 | Pending |

**Total Tasks**: 19
**P0 (Critical)**: 10
**P1 (High)**: 6
**P2 (Medium)**: 3
