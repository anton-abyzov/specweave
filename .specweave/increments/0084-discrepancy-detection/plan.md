# Implementation Plan: Discrepancy Detection

## Executive Summary

This increment implements code-to-spec discrepancy detection. It analyzes TypeScript code to extract signatures and routes, compares them against documented specs, classifies discrepancies by severity, and recommends appropriate actions.

## Implementation Approach

### Phase 3a: Code Analysis (T-001 to T-002)
1. TypeScript analyzer for functions/types
2. API route analyzer for Express/Next.js

### Phase 3b: Comparison Engine (T-003 to T-004)
1. Spec parser for living docs
2. Discrepancy detector with severity classification

### Phase 3c: Recommendations (T-005 to T-006)
1. Smart update recommender
2. Discrepancy reporting

### Phase 3d: Testing (T-007)
1. Comprehensive unit and integration tests

## Architecture Decisions

### ADR-0206: TypeScript Compiler API vs ts-morph

**Context**: Need to parse TypeScript files for signatures.

**Decision**: Use TypeScript Compiler API directly:
- Zero new dependencies
- Full control over parsing
- More performant for our use case

**Alternative Considered**: ts-morph
- More ergonomic API
- But adds 5MB+ dependency
- Overkill for our needs

### ADR-0207: Incremental Analysis with Hashing

**Context**: Full codebase analysis is slow.

**Decision**: Two-tier approach:
1. **Fast pass**: Hash file contents, skip unchanged files
2. **Deep pass**: Full AST parsing only for changed files

**Consequences**:
- First run slower (full analysis)
- Subsequent runs fast (hash comparison)
- Baseline stored in `.specweave/cache/discrepancy-baseline.json`

### ADR-0208: Conservative Severity Classification

**Context**: Auto-updates could cause issues if wrong.

**Decision**: Default to higher severity when uncertain:
- If unsure between minor and major → classify as major
- If unsure about breaking → flag for review
- Auto-update only for trivial changes (typos, whitespace)

**Consequences**:
- More false positives for review
- But zero incorrect auto-updates
- User can tune sensitivity in config

## Dependencies

### Internal
- From 0082: SyncOrchestrationConfig (discrepancy settings)
- From 0082: NotificationManager (for alerts)
- From 0083: SyncAuditLogger (for logging discrepancies)

### External
- TypeScript (already a dev dependency)
- No new dependencies

## File Locations

```
src/core/discrepancy/
├── index.ts
├── detector.ts
├── spec-parser.ts
├── severity-classifier.ts
├── update-recommender.ts
├── report-generator.ts
└── analyzers/
    ├── index.ts
    ├── typescript-analyzer.ts
    ├── api-route-analyzer.ts
    └── hash-cache.ts

tests/unit/core/discrepancy/
├── detector.test.ts
├── spec-parser.test.ts
├── severity-classifier.test.ts
└── analyzers/
    ├── typescript-analyzer.test.ts
    └── api-route-analyzer.test.ts

tests/fixtures/discrepancy/
├── sample-project/          # Sample TS project for testing
└── sample-specs/            # Sample specs for comparison
```

## Rollout Plan

1. Implement analyzers (no side effects)
2. Implement detector (comparison only)
3. Implement recommendations (read-only)
4. Enable in config (opt-in)
5. Add to scheduled jobs (background)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| False positives | Conservative classification, require review |
| Performance | Incremental analysis, caching |
| Complex TS | Start with basic patterns, expand |
| Missing routes | Support popular frameworks first |
