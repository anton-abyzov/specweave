---
id: US-002
feature: FS-189
title: "100% Coverage Option in Init Wizard"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** team lead setting up a project with strict quality standards
**I want** a 100% coverage option in the init wizard
**So that** I don't have to type a custom value for full coverage."
project: specweave
---

# US-002: 100% Coverage Option in Init Wizard

**Feature**: [FS-189](./FEATURE.md)

**As a** team lead setting up a project with strict quality standards
**I want** a 100% coverage option in the init wizard
**So that** I don't have to type a custom value for full coverage

---

## Acceptance Criteria

- [x] **AC-US2-01**: Coverage picker includes `100%` option labeled "Full coverage (strict)" after the 90% option
- [x] **AC-US2-02**: 100% option is available in all 9 languages (en, ru, es, zh, de, fr, ja, ko, pt)
- [x] **AC-US2-03**: When 100% is selected, `coverageTargets` is `{ unit: 100, integration: 100, e2e: 100 }`

---

## Implementation

**Increment**: [0189-tdd-coverage-defaults](../../../../increments/0189-tdd-coverage-defaults/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: [RED] Write tests for 100% coverage option and mode-aware defaults
- [x] **T-004**: [GREEN] Add 100% option and mode-aware defaults to testing-config.ts
