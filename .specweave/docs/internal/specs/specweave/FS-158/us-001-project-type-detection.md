---
id: US-001
feature: FS-158
title: "Project Type Detection"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-001: Project Type Detection

**Feature**: [FS-158](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Detect web-frontend projects (playwright.config.ts, cypress.config.ts, next.config.js, vite.config.ts)
- [x] **AC-US1-02**: Detect web-fullstack projects (Next.js with API routes, SvelteKit)
- [x] **AC-US1-03**: Detect mobile-native projects (.detoxrc.js, maestro.yaml, ios/Podfile, android/app/)
- [x] **AC-US1-04**: Detect backend-API projects (openapi.yaml, express/fastapi/nestjs dependencies)
- [x] **AC-US1-05**: Detect library projects (package.json with main/exports, no pages/routes)
- [x] **AC-US1-06**: Detect desktop-app projects (electron, tauri config files)
- [x] **AC-US1-07**: Detect CLI-tool projects (commander.js, click, cobra dependencies)
- [x] **AC-US1-08**: Return confidence score (0.0-1.0) based on weighted indicators
- [x] **AC-US1-09**: Require ≥0.7 confidence for classification (fallback to 'generic')
- [x] **AC-US1-10**: Multi-factor detection (require 2+ indicators for high confidence)

---

## Implementation

**Increment**: [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
