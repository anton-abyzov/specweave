---
id: US-003
feature: FS-183
title: "LSP Server Recommendations (P1)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer in a multi-language project
**I want** SpecWeave to analyze my project and suggest top 3 LSP servers
**So that** I don't need to manually research language server options."
project: specweave
---

# US-003: LSP Server Recommendations (P1)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer in a multi-language project
**I want** SpecWeave to analyze my project and suggest top 3 LSP servers
**So that** I don't need to manually research language server options

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Given a project with mixed files, when analysis runs, then languages are ranked by weighted file count
- [ ] **AC-US3-02**: Given ranking, when weights are applied, then project files (.sln, package.json) count more than individual source files
- [ ] **AC-US3-03**: Given top 3 suggestions, when presented, then user sees interactive prompt to confirm/modify
- [ ] **AC-US3-04**: Given a missing LSP server, when suggested, then install command is shown (e.g., `dotnet tool install -g csharp-ls`)
- [ ] **AC-US3-05**: Given user confirmation, when LSP servers are configured, then max 3 are enabled by default (others marked optional)

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: [RED] Write failing tests for language analyzer
- [x] **T-008**: [GREEN] Implement language analyzer with weighted scoring
- [x] **T-029**: [RED] Write failing tests for interactive LSP prompt
- [x] **T-030**: [GREEN] Implement interactive LSP suggestion prompt
