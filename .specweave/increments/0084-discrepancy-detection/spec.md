---
increment: 0084-discrepancy-detection
feature_id: FS-082
title: "Code-to-Spec Discrepancy Detection - Phase 3"
status: completed
started: 2025-12-01
priority: P1
type: feature
created: 2025-12-01
---

# 0084: Code-to-Spec Discrepancy Detection - Phase 3

## Overview

This increment implements intelligent code-to-spec discrepancy detection. The core principle: **CODE is source of truth**. When specs describe one thing but code does another, the code is correct (it's what runs in production), and specs need updating.

## Scope

**This Increment (0084) - Phase 3: Discrepancy Detection**
- US-001: TypeScript Code Analyzer
- US-002: API Route Analyzer
- US-003: Spec-to-Code Comparator
- US-004: Smart Update Recommender

**Dependencies**: Requires 0082 (SyncConfig), 0083 (SyncInterceptor for logging)

## Problem Statement

1. **Living Docs Drift**: Imported specs describe intended behavior, but code may have evolved
2. **No Visibility**: Developers don't know when code differs from specs
3. **Manual Comparison**: Tedious to compare spec descriptions to actual implementations
4. **Update Burden**: No guidance on which changes are safe to auto-update vs. review

## Core Principle: Code is Source of Truth

```
Spec says: "POST /users creates a user"
Code does:  "POST /api/v2/users creates a user"

→ CODE is CORRECT (it's running in production)
→ SPEC needs updating (describes outdated intent)
→ User should be NOTIFIED before auto-updating
```

## User Stories

### US-001: TypeScript Code Analyzer
**As a** developer,
**I want** automatic extraction of function signatures and types from code,
**So that** I can compare them against documented specs.

#### Acceptance Criteria
- [x] **AC-US1-01**: Parse TypeScript files to extract exported functions
- [x] **AC-US1-02**: Extract function parameters and return types
- [x] **AC-US1-03**: Extract exported interfaces and types
- [x] **AC-US1-04**: Handle JSDoc comments for documentation
- [x] **AC-US1-05**: Support configurable include/exclude patterns

### US-002: API Route Analyzer
**As a** developer,
**I want** automatic detection of API routes from code,
**So that** I can compare them against documented API specs.

#### Acceptance Criteria
- [x] **AC-US2-01**: Detect Express/Fastify route definitions
- [x] **AC-US2-02**: Extract HTTP method, path, and handler
- [x] **AC-US2-03**: Support Next.js API routes
- [x] **AC-US2-04**: Support dynamic route parameters
- [x] **AC-US2-05**: Build route map with method/path/file

### US-003: Spec-to-Code Comparator
**As a** developer,
**I want** automatic comparison between specs and code,
**So that** I can identify discrepancies.

#### Acceptance Criteria
- [x] **AC-US3-01**: Compare documented API routes to actual routes
- [x] **AC-US3-02**: Compare documented function signatures to actual signatures
- [x] **AC-US3-03**: Identify added/removed/modified items
- [x] **AC-US3-04**: Classify severity (trivial/minor/major/breaking)
- [x] **AC-US3-05**: Generate discrepancy report with file locations

### US-004: Smart Update Recommender
**As a** developer,
**I want** intelligent recommendations for handling discrepancies,
**So that** I know which changes are safe to auto-update.

#### Acceptance Criteria
- [x] **AC-US4-01**: Auto-update trivial changes (typos, formatting)
- [x] **AC-US4-02**: Flag minor changes for review (renames, reordering)
- [x] **AC-US4-03**: Notify for major changes (new/removed APIs)
- [x] **AC-US4-04**: Alert for breaking changes (signature changes)
- [x] **AC-US4-05**: Store recommendations in discrepancy report

## Technical Architecture

### 1. Code Analyzers (`src/core/discrepancy/analyzers/`)

```typescript
// Base interface
interface CodeAnalyzer {
  type: 'typescript' | 'api-routes';
  analyze(files: string[]): Promise<CodeSignature[]>;
}

// TypeScript analyzer
interface FunctionSignature {
  name: string;
  filePath: string;
  params: { name: string; type: string }[];
  returnType: string;
  exported: boolean;
  jsdoc?: string;
}

// API route analyzer
interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  filePath: string;
  lineNumber: number;
  params: string[];  // Dynamic path params
}
```

### 2. Spec Parser (`src/core/discrepancy/spec-parser.ts`)

```typescript
interface ParsedSpec {
  type: 'api' | 'function' | 'type';
  source: string;        // File path
  lineNumber: number;
  description: string;   // What spec says
  signature?: string;    // Expected signature
}

// Parse living docs for documented behavior
class SpecParser {
  parseApiDocs(specPath: string): ParsedSpec[];
  parseFunctionDocs(specPath: string): ParsedSpec[];
}
```

### 3. Discrepancy Detector (`src/core/discrepancy/detector.ts`)

```typescript
interface Discrepancy {
  id: string;
  type: 'api-route' | 'function-signature' | 'type-definition';
  severity: 'trivial' | 'minor' | 'major' | 'breaking';
  specPath: string;
  codePath: string;
  specValue: string;
  codeValue: string;
  recommendation: 'auto-update' | 'review-required' | 'alert';
  detectedAt: string;
}

class DiscrepancyDetector {
  detect(
    specs: ParsedSpec[],
    code: CodeSignature[]
  ): Discrepancy[];
}
```

### 4. Severity Classification

| Change Type | Severity | Recommendation |
|-------------|----------|----------------|
| Typo in description | trivial | auto-update |
| Parameter rename | minor | review |
| New API endpoint | major | notify |
| Removed API endpoint | breaking | alert |
| Changed return type | breaking | alert |
| Added optional param | minor | review |
| Added required param | breaking | alert |

## File Locations

```
src/core/discrepancy/
├── index.ts
├── detector.ts              # Main discrepancy detector
├── spec-parser.ts           # Parse living docs
├── severity-classifier.ts   # Classify severity
├── update-recommender.ts    # Generate recommendations
└── analyzers/
    ├── index.ts
    ├── typescript-analyzer.ts
    └── api-route-analyzer.ts

.specweave/logs/discrepancies/
├── 2025-12-01.jsonl         # Daily discrepancy logs
└── report-latest.json       # Latest comparison report
```

## Testing Strategy

- Unit tests for each analyzer
- Unit tests for spec parser
- Unit tests for severity classification
- Integration test with sample TypeScript project

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| False positives | Conservative detection, require review by default |
| Performance (large codebases) | Incremental analysis, cache baselines |
| Complex TypeScript | Start simple, expand support over time |
| Framework variations | Support popular frameworks first (Express, Next.js) |

## Out of Scope

- Non-TypeScript languages
- GraphQL schema comparison
- Database schema comparison
- Real-time watching (batch mode only)

## Success Metrics

- Detect 90%+ of API route discrepancies
- Zero false auto-updates (conservative by default)
- Discrepancy check completes in < 30 seconds for typical project
