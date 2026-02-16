# Tasks: External API Key Cost Consent Management

## Phase 1: Types & Schema

### T-001: Add consent types to types.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**AC**: AC-US1-01, AC-US1-02
Add `ConsentMode`, `ExternalModelsConfig` types to `src/core/llm/types.ts`.

### T-002: Add externalModels to JSON schema
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**AC**: AC-US1-03
Add `externalModels` property to `src/core/schemas/specweave-config.schema.json`.

## Phase 2: Core Consent Module (TDD)

### T-003: RED — Write consent.test.ts
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-01 through AC-US1-07, AC-US2-01 through AC-US2-03 | **Status**: [x] completed
**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US2-01, AC-US2-02, AC-US2-03
**Test**: Given consent tests → When run → Then all fail (module not implemented)
Write `tests/unit/core/llm/consent.test.ts` with all test cases.

### T-004: GREEN — Implement consent.ts
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-01 through AC-US1-07, AC-US2-01 through AC-US2-03 | **Status**: [x] completed
**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07, AC-US2-01, AC-US2-02, AC-US2-03
**Test**: Given consent.ts implemented → When tests run → Then all pass
Implement `src/core/llm/consent.ts`.

## Phase 3: Integration (TDD)

### T-005: RED+GREEN — Provider factory consent gate
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**AC**: AC-US3-01, AC-US3-02, AC-US3-03
**Test**: Given external provider → When consent denied → Then ExternalApiConsentDeniedError thrown
Add consent check to `src/core/llm/provider-factory.ts`.

### T-006: RED+GREEN — Skill judge consent check
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**AC**: AC-US4-01, AC-US4-02, AC-US4-03
**Test**: Given consent denied → When judge() called → Then basicEvaluation used
Add consent check to `src/core/skills/skill-judge.ts`.

## Phase 4: Behavioral Layer

### T-007: Update judge-llm SKILL.md
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [x] completed
**AC**: AC-US5-01
Add consent instructions to `plugins/specweave/skills/judge-llm/SKILL.md`.

### T-008: Update done SKILL.md
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [x] completed
**AC**: AC-US5-02
Add consent reference to `plugins/specweave/skills/done/SKILL.md`.

## Phase 5: Verification

### T-009: Build and run all tests
**Status**: [x] completed
**Test**: Given all changes → When npm run rebuild && npm test → Then all pass
