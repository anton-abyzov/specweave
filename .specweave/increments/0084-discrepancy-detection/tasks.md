# Tasks: Discrepancy Detection - Phase 3

**Phase Focus**: Code-to-spec discrepancy detection and recommendations

---

## Task Summary

| ID | Task | User Story | Status |
|----|------|------------|--------|
| T-001 | Implement TypeScript Analyzer | US-001 | [x] completed |
| T-002 | Implement API Route Analyzer | US-002 | [x] completed |
| T-003 | Implement Spec Parser | US-003 | [x] completed |
| T-004 | Implement Discrepancy Detector | US-003 | [x] completed |
| T-005 | Implement Severity Classifier | US-003, US-004 | [x] completed |
| T-006 | Implement Update Recommender | US-004 | [x] completed |
| T-007 | Add Unit & Integration Tests | US-001-US-004 | [x] completed |

---

### T-001: Implement TypeScript Analyzer
**User Story**: US-001
**Satisfies ACs**: AC-US1-01 to AC-US1-05
**Status**: [x] completed

#### Description
Create analyzer that extracts function signatures and types from TypeScript files.

#### Implementation
1. Create `src/core/discrepancy/analyzers/typescript-analyzer.ts`:
   ```typescript
   interface FunctionSignature {
     name: string;
     filePath: string;
     lineNumber: number;
     params: { name: string; type: string }[];
     returnType: string;
     exported: boolean;
     jsdoc?: string;
   }

   interface TypeDefinition {
     name: string;
     filePath: string;
     lineNumber: number;
     kind: 'interface' | 'type' | 'class';
     exported: boolean;
   }

   class TypeScriptAnalyzer {
     async analyze(files: string[]): Promise<{
       functions: FunctionSignature[];
       types: TypeDefinition[];
     }>;
   }
   ```

2. Use TypeScript Compiler API (not ts-morph):
   - Create program from files
   - Walk AST for exports
   - Extract signatures

3. Support configurable patterns:
   - include: ['src/**/*.ts']
   - exclude: ['**/*.test.ts', 'node_modules/**']

#### Acceptance Tests
```gherkin
Given a TypeScript file with exported function
When analyzer runs
Then function signature is extracted
And parameters include types
And return type is included

Given a TypeScript file with interface
When analyzer runs
Then interface is extracted
And exported flag is set
```

---

### T-002: Implement API Route Analyzer
**User Story**: US-002
**Satisfies ACs**: AC-US2-01 to AC-US2-05
**Status**: [x] completed

#### Description
Create analyzer that extracts API routes from Express/Fastify/Next.js projects.

#### Implementation
1. Create `src/core/discrepancy/analyzers/api-route-analyzer.ts`:
   ```typescript
   interface ApiRoute {
     method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
     path: string;
     filePath: string;
     lineNumber: number;
     params: string[];    // Dynamic params like :id
     framework: 'express' | 'fastify' | 'nextjs';
   }

   class ApiRouteAnalyzer {
     async analyze(projectRoot: string): Promise<ApiRoute[]>;
   }
   ```

2. Detection patterns:
   - Express: `app.get('/path', handler)`
   - Fastify: `fastify.route({ method: 'GET', url: '/path' })`
   - Next.js: `pages/api/**/*.ts` file structure

3. Extract dynamic params: `/users/:id` → params: ['id']

#### Acceptance Tests
```gherkin
Given Express app with route app.get('/users/:id')
When analyzer runs
Then route is extracted with method=GET, path=/users/:id
And params includes 'id'

Given Next.js API route at pages/api/users/[id].ts
When analyzer runs
Then route is extracted with path=/api/users/:id
```

---

### T-003: Implement Spec Parser
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed

#### Description
Parse living docs to extract documented API endpoints and function signatures.

#### Implementation
1. Create `src/core/discrepancy/spec-parser.ts`:
   ```typescript
   interface ParsedSpec {
     type: 'api' | 'function';
     source: string;         // File path
     lineNumber: number;
     identifier: string;     // Route path or function name
     description: string;
     metadata?: Record<string, unknown>;
   }

   class SpecParser {
     parseApiSpecs(docsPath: string): ParsedSpec[];
     parseFunctionSpecs(docsPath: string): ParsedSpec[];
   }
   ```

2. Parse markdown looking for:
   - API documentation: `## GET /users` patterns
   - Function docs: `### functionName(params): returnType`
   - OpenAPI YAML if present

3. Extract from living docs structure:
   - `.specweave/docs/internal/specs/*/api.md`
   - `.specweave/docs/internal/modules/*/interfaces.md`

#### Acceptance Tests
```gherkin
Given living doc with "## GET /users"
When parser runs
Then spec is extracted with type=api, identifier=/users

Given living doc with function documentation
When parser runs
Then spec is extracted with function details
```

---

### T-004: Implement Discrepancy Detector
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed

#### Description
Compare extracted code signatures against parsed specs to identify discrepancies.

#### Implementation
1. Create `src/core/discrepancy/detector.ts`:
   ```typescript
   interface Discrepancy {
     id: string;
     type: 'api-route' | 'function-signature' | 'type-definition';
     category: 'added' | 'removed' | 'modified';
     specPath: string;
     codePath: string;
     specValue: string;
     codeValue: string;
     severity: DiscrepancySeverity;
     recommendation: DiscrepancyRecommendation;
     detectedAt: string;
   }

   class DiscrepancyDetector {
     detect(specs: ParsedSpec[], code: CodeSignature[]): Discrepancy[];
   }
   ```

2. Comparison logic:
   - Match by identifier (route path or function name)
   - Identify added (in code but not spec)
   - Identify removed (in spec but not code)
   - Identify modified (exists in both but differs)

3. Generate comparison report:
   - `.specweave/logs/discrepancies/report-latest.json`

#### Acceptance Tests
```gherkin
Given spec documents GET /users
And code has GET /api/v2/users
When detector runs
Then discrepancy is identified as "modified"
And specValue=/users, codeValue=/api/v2/users

Given spec documents function foo()
And code has no function foo
When detector runs
Then discrepancy is identified as "removed"
```

---

### T-005: Implement Severity Classifier
**User Story**: US-003, US-004
**Satisfies ACs**: AC-US3-04, AC-US4-01 to AC-US4-04
**Status**: [x] completed

#### Description
Classify discrepancy severity to determine appropriate action.

#### Implementation
1. Create `src/core/discrepancy/severity-classifier.ts`:
   ```typescript
   type DiscrepancySeverity = 'trivial' | 'minor' | 'major' | 'breaking';

   class SeverityClassifier {
     classify(discrepancy: RawDiscrepancy): DiscrepancySeverity;
   }
   ```

2. Classification rules:
   | Change | Severity |
   |--------|----------|
   | Typo/whitespace | trivial |
   | Parameter rename | minor |
   | New endpoint/function | major |
   | Removed endpoint/function | breaking |
   | Changed return type | breaking |
   | Added required param | breaking |
   | Added optional param | minor |

3. Conservative default: When uncertain, classify higher

#### Acceptance Tests
```gherkin
Given discrepancy is typo in description
When classified
Then severity is 'trivial'

Given discrepancy is removed API endpoint
When classified
Then severity is 'breaking'
```

---

### T-006: Implement Update Recommender
**User Story**: US-004
**Satisfies ACs**: AC-US4-01 to AC-US4-05
**Status**: [x] completed

#### Description
Generate recommendations for handling each discrepancy.

#### Implementation
1. Create `src/core/discrepancy/update-recommender.ts`:
   ```typescript
   type DiscrepancyRecommendation =
     | 'auto-update'     // Safe to update automatically
     | 'review-required' // Needs human review
     | 'notify'          // Just notify, don't suggest update
     | 'alert';          // Critical, needs immediate attention

   class UpdateRecommender {
     recommend(discrepancy: Discrepancy): DiscrepancyRecommendation;
     generateUpdatePatch(discrepancy: Discrepancy): string | null;
   }
   ```

2. Recommendation mapping:
   | Severity | Recommendation |
   |----------|----------------|
   | trivial | auto-update |
   | minor | review-required |
   | major | notify |
   | breaking | alert |

3. For auto-update, generate patch:
   - Markdown patch for spec files
   - No code changes (code is source of truth)

4. Store recommendations in report

#### Acceptance Tests
```gherkin
Given trivial discrepancy
When recommender runs
Then recommendation is 'auto-update'
And patch is generated

Given breaking discrepancy
When recommender runs
Then recommendation is 'alert'
And notification is created
```

---

### T-007: Add Unit & Integration Tests
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All ACs
**Status**: [x] completed

#### Description
Comprehensive tests for all discrepancy detection components.

#### Implementation
1. Create test files:
   - `tests/unit/core/discrepancy/typescript-analyzer.test.ts`
   - `tests/unit/core/discrepancy/api-route-analyzer.test.ts`
   - `tests/unit/core/discrepancy/spec-parser.test.ts`
   - `tests/unit/core/discrepancy/detector.test.ts`
   - `tests/unit/core/discrepancy/severity-classifier.test.ts`
   - `tests/unit/core/discrepancy/update-recommender.test.ts`

2. Create test fixtures:
   - `tests/fixtures/discrepancy/sample-project/` - Sample TS code
   - `tests/fixtures/discrepancy/sample-specs/` - Sample living docs

3. Integration test:
   - Full pipeline: analyze → parse → detect → classify → recommend

#### Acceptance Tests
```gherkin
Given all test files created
When npm test runs
Then all discrepancy tests pass
And coverage > 80%
```

---

## Preview: Phase 4 (0085)

**Monitoring & Commands**:
- `/specweave:sync-monitor` dashboard
- `/specweave:notifications` command
- `/specweave:discrepancies` command
- Log aggregation and querying
