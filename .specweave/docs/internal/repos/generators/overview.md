# generators

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

A TypeScript library for parsing SpecWeave increment specification files (spec.md and tasks.md), extracting user stories, acceptance criteria, and tasks with their linkages to enable traceability between requirements and implementation tasks.

## Key Concepts

- User Story parsing (US-XXX format)
- Acceptance Criteria extraction (AC-USXX-YY format)
- Task parsing with US linkage (T-XXX format)
- YAML frontmatter parsing for increment metadata
- Task status tracking (pending, in_progress, completed, transferred, canceled)
- AC-to-US validation and cross-referencing
- External ID support with E suffix (US-001E, T-001E)
- Task grouping by User Story

## Patterns

- **YAML Frontmatter Parsing with js-yaml** (data)
- **Regex-based Document Parsing** (architecture)
- **TypeScript Interface-driven Design** (architecture)
- **Line-by-line State Machine Parsing** (architecture)
- **Validation with Descriptive Error Messages** (testing)
- **File System I/O with Node.js fs** (data)
- **Traceability Matrix Pattern** (architecture)

## External Dependencies

- js-yaml (YAML parsing library)
- Node.js fs module (file system operations)
- Node.js path module (path utilities)

## Observations

- Supports scalable ID numbering with 3+ digits (Y2K-style future-proofing for US-1000+, T-1000+)
- External item support via E suffix enables integration with GitHub/JIRA/ADO imported items
- Task grouping by User Story enables per-US progress tracking and coverage analysis
- Comprehensive validation catches orphaned references and invalid linkages early
- Line number tracking in parsed entities enables precise error reporting
- Status enum supports full task lifecycle including transferred and canceled states
- Parser handles markdown checkbox syntax for status detection ([x] vs [ ])