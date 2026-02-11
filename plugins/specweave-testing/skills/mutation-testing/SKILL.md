---
description: Mutation testing expert using Stryker Mutator for TypeScript/JavaScript. Analyzes test suite effectiveness by injecting code mutations and measuring kill rates. Use for mutation testing setup, score analysis, survived mutant triage, CI integration, and improving test quality beyond code coverage.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# Mutation Testing Expert - Stryker Mutator

## When to Use

Trigger this skill when the user mentions: "mutation testing", "Stryker", "test quality",
"mutation score", "survived mutants", "mutant", "test effectiveness", "kill rate",
"are my tests good enough", "test suite quality", "weak tests".

## What Is Mutation Testing

Mutation testing measures the **effectiveness** of your test suite, not just what code it
executes. Code coverage tells you which lines ran; mutation testing tells you whether your
tests actually **detect bugs**.

The process:
1. A tool (Stryker) injects small faults ("mutants") into your source code
2. Your test suite runs against each mutant
3. If a test fails, the mutant is **killed** (good -- your tests caught it)
4. If all tests pass, the mutant **survived** (bad -- your tests missed a real bug)

**Mutation score** = killed mutants / total mutants x 100

### Why It Matters

- **80% code coverage can miss 50% of bugs** -- coverage is necessary but not sufficient
- Mutation testing reveals **weak assertions**, missing edge cases, and untested branches
- It answers: "If a bug were introduced here, would my tests catch it?"

## Stryker Mutator (Primary Tool)

### Installation

```bash
# Install Stryker for a TypeScript/JavaScript project
npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker @stryker-mutator/vitest-runner

# For Jest projects
npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker @stryker-mutator/jest-runner

# Initialize configuration (interactive)
npx stryker init
```

### Configuration: stryker.config.mjs

**Minimal configuration for a Vitest project:**

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  testRunner: 'vitest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  coverageAnalysis: 'perTest',
  timeoutMS: 60000,
  thresholds: {
    high: 80,
    low: 60,
    break: null,  // Set to a number to fail CI below this score
  },
};
```

**Jest configuration:**

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.ts',
  },
  checkers: ['typescript'],
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
};
```

**Targeted configuration for critical modules only:**

```javascript
// stryker.config.mjs
export default {
  mutate: [
    // Only mutate business-critical code
    'src/services/payment/**/*.ts',
    'src/services/auth/**/*.ts',
    'src/utils/validators/**/*.ts',
    'src/core/parser/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  testRunner: 'vitest',
  checkers: ['typescript'],
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  timeoutMS: 120000,
  concurrency: 4,  // Limit parallel workers
};
```

### Running Stryker

```bash
# Full mutation testing run
npx stryker run

# Target specific files
npx stryker run --mutate 'src/services/auth/**/*.ts'

# Incremental mode (only re-test changed code)
npx stryker run --incremental

# With specific log level for debugging
npx stryker run --logLevel debug
```

### Incremental Mode

Incremental mode is essential for fast feedback. It caches previous results and only
re-mutates files that changed since the last run.

```javascript
// stryker.config.mjs
export default {
  // ... other config
  incremental: true,
  incrementalFile: '.stryker-cache/incremental.json',
};
```

```bash
# First run: full analysis (slow)
npx stryker run

# Subsequent runs: only changed files (fast)
npx stryker run --incremental
```

Add `.stryker-cache/` and `.stryker-tmp/` to `.gitignore`.

## Mutation Operators

Stryker applies these mutation operators to your source code:

### Arithmetic Mutations
| Original | Mutant |
|----------|--------|
| `a + b` | `a - b` |
| `a - b` | `a + b` |
| `a * b` | `a / b` |
| `a / b` | `a * b` |
| `a % b` | `a * b` |

### Conditional Mutations
| Original | Mutant |
|----------|--------|
| `a > b` | `a >= b`, `a < b` |
| `a < b` | `a <= b`, `a > b` |
| `a >= b` | `a > b`, `a <= b` |
| `a <= b` | `a < b`, `a >= b` |
| `a === b` | `a !== b` |
| `a !== b` | `a === b` |

### Logical Mutations
| Original | Mutant |
|----------|--------|
| `a && b` | `a \|\| b` |
| `a \|\| b` | `a && b` |
| `!a` | `a` |

### String Mutations
| Original | Mutant |
|----------|--------|
| `"foo"` | `""` |
| `""` | `"Stryker was here!"` |
| `` `template ${x}` `` | `` `template` `` |

### Array Mutations
| Original | Mutant |
|----------|--------|
| `[].push(x)` | removed |
| `[].pop()` | removed |
| `[].sort()` | removed |
| `[].filter(fn)` | `[]` |
| `[].map(fn)` | `[]` |

### Unary Mutations
| Original | Mutant |
|----------|--------|
| `+a` | `-a` |
| `-a` | `+a` |
| `~a` | `a` |

### Block Statement Mutations
| Original | Mutant |
|----------|--------|
| `if (cond) { block }` | `if (cond) { }` |
| `function() { body }` | `function() { }` |

### Boolean Mutations
| Original | Mutant |
|----------|--------|
| `true` | `false` |
| `false` | `true` |

### Optional Chaining
| Original | Mutant |
|----------|--------|
| `a?.b` | `a.b` |
| `a?.[b]` | `a[b]` |
| `a?.()` | `a()` |

## Mutation Score Analysis

### Understanding the Report

After running Stryker, examine the HTML report at `reports/mutation/html/index.html`.

**Score interpretation:**
- **80%+**: Strong test suite -- tests catch most injected faults
- **60-79%**: Adequate but has gaps -- review survived mutants
- **Below 60%**: Significant weaknesses -- tests give false confidence

**Mutant statuses:**
- **Killed**: A test failed when this mutant was active (good)
- **Survived**: All tests passed despite the mutation (bad -- add/fix tests)
- **No coverage**: No test executes this code at all (worst -- add tests)
- **Timeout**: Mutant caused an infinite loop (usually counts as killed)
- **Compile error**: Mutant produced invalid code (ignored)

### Triaging Survived Mutants

When a mutant survives, ask these questions in order:

**1. Is it an equivalent mutant?**
An equivalent mutant changes the code but produces identical behavior. It cannot be
killed because no observable difference exists.

```typescript
// Original
function getIndex(arr: string[], item: string): number {
  return arr.indexOf(item);
}

// Equivalent mutant: changing >= 0 to > 0 in a caller
// If indexOf never returns 0 in practice, these are equivalent
if (getIndex(items, 'x') >= 0) { ... }
if (getIndex(items, 'x') > 0) { ... }  // equivalent if 'x' is never first
```

Mark equivalent mutants in Stryker config to exclude them from the score:

```javascript
// stryker.config.mjs
export default {
  mutate: [
    'src/**/*.ts',
    // Exclude known equivalent mutant locations
    '!src/utils/constants.ts',
  ],
};
```

**2. Is the assertion weak?**
The most common cause of survived mutants. The test runs the code but does not assert
on the affected value.

```typescript
// Survived mutant: `price * quantity` -> `price / quantity`
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// WEAK test -- does not catch arithmetic mutation
it('should calculate total', () => {
  const result = calculateTotal(10, 1);  // 10 * 1 === 10 / 1
  expect(result).toBe(10);
});

// STRONG test -- catches the mutation
it('should calculate total', () => {
  const result = calculateTotal(10, 3);  // 10 * 3 = 30, 10 / 3 = 3.33
  expect(result).toBe(30);
});
```

**3. Is the boundary untested?**

```typescript
// Survived mutant: `age >= 18` -> `age > 18`
function canVote(age: number): boolean {
  return age >= 18;
}

// Missing boundary test
it('should allow voting at 18', () => {
  expect(canVote(18)).toBe(true);   // Kills >= -> > mutant
  expect(canVote(17)).toBe(false);  // Kills >= -> <= mutant
});
```

**4. Is the code actually untestable or dead?**
If no test can reach the mutated code, you have dead code. Remove it.

### Score Improvement Strategies

**Priority 1: Fix "No coverage" mutants**
These indicate completely untested code. Write tests that at minimum execute these paths.

**Priority 2: Strengthen weak assertions**
Look for tests that execute the code but use loose assertions:
```typescript
// Weak: only checks truthiness
expect(result).toBeTruthy();

// Strong: checks exact value
expect(result).toEqual({ total: 30, tax: 2.70 });
```

**Priority 3: Add boundary tests**
For every comparison operator, test the exact boundary value:
```typescript
describe('isAdult', () => {
  it('should return true at exactly 18', () => expect(isAdult(18)).toBe(true));
  it('should return false at 17', () => expect(isAdult(17)).toBe(false));
  it('should return true above 18', () => expect(isAdult(25)).toBe(true));
});
```

**Priority 4: Test negation and logical paths**
Ensure both branches of every `if/else` and `&&/||` are tested.

## Integration Patterns

### GitHub Actions Workflow

```yaml
# .github/workflows/mutation-testing.yml
name: Mutation Testing

on:
  pull_request:
    branches: [main, develop]
  # Optional: scheduled full run
  schedule:
    - cron: '0 3 * * 1'  # Weekly Monday 3am

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed for incremental mode

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Restore Stryker cache
        uses: actions/cache@v4
        with:
          path: .stryker-cache
          key: stryker-${{ runner.os }}-${{ hashFiles('src/**/*.ts') }}
          restore-keys: |
            stryker-${{ runner.os }}-

      - name: Run mutation testing (incremental)
        run: npx stryker run --incremental

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
          retention-days: 14
```

### Incremental PR-Only Testing

For faster CI, only mutate files changed in the PR:

```yaml
      - name: Get changed files
        id: changed
        run: |
          FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD \
            -- 'src/**/*.ts' \
            | grep -v '\.test\.' \
            | grep -v '\.spec\.' \
            | grep -v '\.d\.ts' \
            | tr '\n' ',' | sed 's/,$//')
          echo "files=$FILES" >> $GITHUB_OUTPUT

      - name: Run mutation testing on changed files
        if: steps.changed.outputs.files != ''
        run: |
          npx stryker run --mutate "${{ steps.changed.outputs.files }}"
```

### Report Formats

Configure multiple reporters in `stryker.config.mjs`:

```javascript
export default {
  reporters: [
    'html',           // Detailed HTML report in reports/mutation/html/
    'clear-text',     // Terminal summary
    'progress',       // Progress bar during execution
    'json',           // Machine-readable JSON in reports/mutation/mutation.json
    'dashboard',      // Stryker dashboard (stryker-mutator.io/dashboard)
  ],
  htmlReporter: {
    fileName: 'reports/mutation/html/index.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  // Dashboard reporter config (requires STRYKER_DASHBOARD_API_KEY)
  dashboard: {
    project: 'github.com/your-org/your-repo',
    version: 'main',
    module: 'core',
  },
};
```

### Setting a CI Quality Gate

Fail the build if mutation score drops below a threshold:

```javascript
// stryker.config.mjs
export default {
  thresholds: {
    high: 80,     // Green in report
    low: 60,      // Yellow in report
    break: 60,    // FAIL CI if score drops below this
  },
};
```

### Integration with Existing Test Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:mutation": "stryker run",
    "test:mutation:incremental": "stryker run --incremental",
    "test:mutation:changed": "stryker run --incremental --since main",
    "test:all": "npm run test && npm run test:mutation:incremental"
  }
}
```

## Strategy and Best Practices

### When Mutation Testing Is Valuable

**High value -- always mutate:**
- Payment/billing logic
- Authentication and authorization
- Data validation and sanitization
- Parsers and serializers
- State machines and workflow engines
- Cryptographic operations
- Rate limiters and throttlers
- Business rule engines

**Medium value -- mutate selectively:**
- API route handlers (focus on error handling)
- Database query builders (focus on WHERE clauses)
- Middleware chains (focus on short-circuit logic)

**Low value -- skip or defer:**
- UI components (visual testing is more effective)
- Configuration files and constants
- Auto-generated code (OpenAPI clients, Prisma, GraphQL codegen)
- Thin wrappers around third-party libraries
- Logging and telemetry code
- Migration scripts

### Balancing Quality vs Execution Time

Mutation testing is CPU-intensive. A full run on a large codebase can take 30+ minutes.

**Strategies for speed:**

1. **Incremental mode** (always use in development):
   ```bash
   npx stryker run --incremental
   ```

2. **Target critical modules only** -- do not mutate everything:
   ```javascript
   mutate: [
     'src/core/**/*.ts',
     'src/services/payment/**/*.ts',
     '!src/**/*.test.ts',
   ],
   ```

3. **Limit concurrency** to avoid OOM on CI:
   ```javascript
   concurrency: Math.max(1, require('os').cpus().length - 1),
   ```

4. **Use `perTest` coverage analysis** -- Stryker only runs tests that cover each mutant:
   ```javascript
   coverageAnalysis: 'perTest',
   ```

5. **Increase timeout for slow test suites**:
   ```javascript
   timeoutMS: 120000,
   timeoutFactor: 2.5,
   ```

6. **Schedule full runs nightly, use incremental on PRs.**

### Prioritizing Which Modules to Mutate

Use this decision matrix:

| Factor | Weight | Assessment |
|--------|--------|------------|
| Business criticality | High | Payment, auth, data integrity |
| Bug history | High | Files with frequent bug fixes |
| Complexity (cyclomatic) | Medium | High-complexity functions |
| Change frequency | Medium | Frequently modified files |
| Coverage gap | Medium | High line coverage but untested logic |
| User-facing impact | High | Features affecting end users directly |

Start with the intersection of "high business criticality" and "high code coverage" --
these are the modules where mutation testing adds the most value (you think they are
well-tested but may not be).

### Common Pitfalls

1. **Trying to reach 100% mutation score** -- diminishing returns past 80%. Some mutants
   are equivalent or test trivial code.

2. **Running mutation testing on the entire codebase at once** -- start with critical
   modules and expand gradually.

3. **Ignoring survived mutants without analysis** -- each survived mutant is a potential
   bug your tests would miss. Triage them.

4. **Not using incremental mode** -- full runs on every commit waste CI minutes.

5. **Mutating generated code** -- exclude auto-generated files, they inflate the
   denominator without adding value.

## Disabling Specific Mutators

If certain mutation operators produce too many equivalent mutants for your codebase:

```javascript
// stryker.config.mjs
export default {
  // Disable specific mutators
  mutator: {
    excludedMutations: [
      'StringLiteral',     // Skip string mutations if you have many display strings
      'ObjectLiteral',     // Skip object literal removal
    ],
  },
};
```

Available mutator group names:
- `ArithmeticOperator`, `ArrayDeclaration`, `AssignmentOperator`
- `BlockStatement`, `BooleanLiteral`, `ConditionalExpression`
- `EqualityOperator`, `LogicalOperator`, `MethodExpression`
- `ObjectLiteral`, `OptionalChaining`, `Regex`
- `StringLiteral`, `UnaryOperator`, `UpdateOperator`

## Interpreting Results: Worked Example

Given this source file:

```typescript
// src/services/discount.ts
export function applyDiscount(price: number, discountPct: number): number {
  if (discountPct < 0 || discountPct > 100) {
    throw new Error('Invalid discount percentage');
  }
  if (discountPct === 0) {
    return price;
  }
  return price - (price * discountPct) / 100;
}
```

And this test:

```typescript
it('should apply 20% discount', () => {
  expect(applyDiscount(100, 20)).toBe(80);
});

it('should reject negative discount', () => {
  expect(() => applyDiscount(100, -5)).toThrow();
});
```

**Stryker results:**
- `discountPct < 0` -> `discountPct <= 0`: **SURVIVED** (no test for `discountPct === 0` boundary)
- `discountPct > 100` -> `discountPct >= 100`: **SURVIVED** (no test for `discountPct === 100`)
- `price * discountPct` -> `price / discountPct`: **KILLED** by the 20% test
- `price - (...)` -> `price + (...)`: **KILLED** by the 20% test
- `discountPct === 0` -> `discountPct !== 0`: **SURVIVED** (no test for zero discount)

**Tests to add:**

```typescript
it('should return full price for 0% discount', () => {
  expect(applyDiscount(100, 0)).toBe(100);
});

it('should apply 100% discount', () => {
  expect(applyDiscount(100, 100)).toBe(0);
});

it('should reject discount over 100', () => {
  expect(() => applyDiscount(100, 101)).toThrow();
});

it('should reject exactly 0 boundary correctly', () => {
  // This is valid -- 0% discount should NOT throw
  expect(applyDiscount(50, 0)).toBe(50);
});
```

## Beyond Stryker: Other Ecosystems

### Java: PIT (pitest)

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.15.0</version>
  <configuration>
    <targetClasses>
      <param>com.example.service.*</param>
    </targetClasses>
    <mutationThreshold>70</mutationThreshold>
  </configuration>
</plugin>
```

```bash
mvn org.pitest:pitest-maven:mutationCoverage
```

### Python: mutmut

```bash
pip install mutmut

# Run mutation testing
mutmut run --paths-to-mutate=src/

# View results
mutmut results
mutmut html  # Generate HTML report
```

### Rust: cargo-mutants

```bash
cargo install cargo-mutants

# Run mutation testing
cargo mutants

# Target specific modules
cargo mutants -- --package my-crate -f src/parser.rs

# Skip slow tests
cargo mutants --timeout 60
```

### When to Use Framework-Specific Tools

| Language | Tool | Best For |
|----------|------|----------|
| TypeScript/JavaScript | Stryker | Full ecosystem, Vitest/Jest/Mocha support |
| Java/Kotlin | PIT (pitest) | Maven/Gradle integration, fast bytecode mutation |
| Python | mutmut | Simple setup, good defaults |
| Rust | cargo-mutants | Cargo integration, type-system-aware mutations |
| C# | Stryker.NET | .NET ecosystem, NUnit/xUnit/MSTest |
| Scala | Stryker4s | sbt integration |

**General rule**: Use the tool native to your build ecosystem. Stryker covers JS/TS/.NET/Scala.
PIT dominates Java. mutmut and cargo-mutants are the pragmatic choices for Python and Rust.

## Quick Reference

### Setup Checklist

- [ ] Install Stryker and test-runner plugin
- [ ] Create `stryker.config.mjs` with targeted `mutate` globs
- [ ] Enable `coverageAnalysis: 'perTest'`
- [ ] Enable `incremental: true` for development
- [ ] Add `.stryker-cache/` and `.stryker-tmp/` to `.gitignore`
- [ ] Add `test:mutation` script to package.json
- [ ] Configure CI workflow (incremental on PRs, full weekly)
- [ ] Set `thresholds.break` for CI quality gate

### Commands Cheat Sheet

```bash
npx stryker init                           # Interactive setup
npx stryker run                            # Full run
npx stryker run --incremental              # Incremental (fast)
npx stryker run --mutate 'src/core/**'     # Target specific files
npx stryker run --logLevel debug           # Debug output
npx stryker run --concurrency 2            # Limit parallelism
```

### Score Targets

| Context | Target Score |
|---------|-------------|
| Payment/auth/security code | 80%+ |
| Core business logic | 70%+ |
| Utility libraries | 60%+ |
| General application code | 50%+ |
| Initial adoption (baseline) | Any improvement |

## Related Skills

- `unit-testing` - Write and improve the unit tests that mutation testing evaluates
- `qa-engineer` - Overall test strategy and quality metrics
- `e2e-testing` - E2E and visual regression tests
