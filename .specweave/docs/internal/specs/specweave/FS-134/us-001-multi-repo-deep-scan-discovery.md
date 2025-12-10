---
id: US-001
feature: FS-134
title: "Multi-Repo Deep Scan & Discovery"
status: in_progress
priority: P1
created: 2025-12-09
project: specweave
---

# US-001: Multi-Repo Deep Scan & Discovery

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user with multiple repositories (umbrella setup)
**I want** the system to automatically discover and analyze all repos in my project
**So that** living docs reflect the complete architecture across all codebases

---

## Acceptance Criteria

- [x] **AC-US1-01**: System detects umbrella.childRepos from config.json
- [x] **AC-US1-02**: For each repo, system performs: git clone (if not present), structure scan, file inventory
- [x] **AC-US1-03**: System identifies repo type: frontend, backend, mobile, shared-lib, infrastructure
- [x] **AC-US1-04**: System extracts tech stack per repo: package.json, go.mod, requirements.txt, etc.
- [ ] **AC-US1-05**: System maps projects/boards to repos based on folder structure and config
- [ ] **AC-US1-06**: Scan results cached in `.specweave/cache/repo-scan-{repo}.json` (24h TTL)
- [x] **AC-US1-01**: System detects umbrella.childRepos from config.json
- [x] **AC-US1-02**: For each repo, system performs: git clone (if not present), structure scan, file inventory
- [x] **AC-US1-03**: System identifies repo type: frontend, backend, mobile, shared-lib, infrastructure
- [x] **AC-US1-04**: System extracts tech stack per repo: package.json, go.mod, requirements.txt, etc.
- [ ] **AC-US1-05**: System maps projects/boards to repos based on folder structure and config
- [ ] **AC-US1-06**: Scan results cached in `.specweave/cache/repo-scan-{repo}.json` (24h TTL)

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create LivingDocsOrchestrator
- [x] **T-002**: Implement RepoScanner with Multi-Repo Support
