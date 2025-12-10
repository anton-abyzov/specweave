# id-generators

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

A TypeScript utility library for generating unique sequential IDs for User Stories (US-XXX) and Tasks (T-XXX) with support for distinguishing internal vs external origins via an 'E' suffix convention.

## Key Concepts

- Sequential ID generation
- Internal vs External origin tracking
- ID parsing and validation
- Collision detection
- Zero-padded numeric formatting

## Patterns

- **Factory Pattern for ID Generation** (architecture)
- **TypeScript Type Discrimination** (structure)
- **Regex-based Parsing** (structure)
- **Sequential ID with Gap-aware Generation** (architecture)
- **Defensive Programming with Validation** (structure)
- **Zero-padded Numeric Formatting** (structure)

## Observations

- Pure TypeScript with zero external dependencies - highly portable
- Duplicate type definition of Origin in both files could be extracted to shared types
- Both generators follow identical patterns - could be refactored to generic base
- E-suffix convention aligns with SpecWeave's external increment tracking (FS-XXXE pattern)
- No async operations - all functions are synchronous
- ID number extraction ignores suffix to maintain unified sequence across internal/external