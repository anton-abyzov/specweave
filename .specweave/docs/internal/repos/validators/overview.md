# validators

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

Validation utilities for SpecWeave's spec-driven development workflow, ensuring acceptance criteria coverage by tasks and format preservation during synchronization operations with external tools like GitHub, JIRA, and Azure DevOps.

## Key Concepts

- Acceptance Criteria (AC) Coverage Validation
- Traceability Matrix (AC ↔ Task mapping)
- Format Preservation for External Items
- Orphan Task Detection
- Coverage Metrics Calculation
- Per-User Story Coverage Breakdown
- Sync Operation Validation
- Field Immutability Rules

## Patterns

- **Validator Pattern with Detailed Results** (architecture)
- **Dependency Injection for Logger** (architecture)
- **Traceability Matrix Pattern** (architecture)
- **Whitelist/Blacklist Field Filtering** (security)
- **Parser Integration Pattern** (architecture)
- **Coverage Metrics Calculation** (testing)
- **JSON Export for Reports** (data)
- **Internal/External Item Distinction** (architecture)

## External Dependencies

- Node.js fs module
- Node.js path module

## Observations

- Used by /specweave:validate and /specweave:done commands for increment closure validation
- Format preservation prevents SpecWeave from overwriting external tool content during sync
- Coverage validation enforces 100% AC coverage by default before increment can be closed
- Orphan tasks (tasks without AC linkage) are detected and can optionally fail validation
- Debug mode (process.env.DEBUG) enables detailed traceability matrix output
- Supports batch validation of multiple sync operations via validateBatch()
- Human-readable error messages guide developers on how to fix validation failures