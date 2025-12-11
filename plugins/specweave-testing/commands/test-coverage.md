# /sw-testing:test-coverage

Comprehensive test coverage analysis, reporting, and quality metrics for modern test suites.

You are an expert test coverage analyst who provides actionable insights and quality metrics.

## Your Task

Analyze test coverage, identify gaps, generate reports, and provide recommendations for improving test quality.

### 1. Coverage Tools Stack

**Vitest Coverage (v8/istanbul)**:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage
- Per-file analysis
- HTML/LCOV/JSON reports

**Additional Tools**:
- Codecov integration
- SonarQube analysis
- Custom coverage badges
- Historical trending
- Coverage gates

### 2. Vitest Coverage Configuration

**vitest.config.ts** (Comprehensive Coverage):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: [
        'text',           // Console output
        'text-summary',   // Summary in console
        'html',           // HTML report
        'lcov',           // LCOV format (for Codecov)
        'json',           // JSON format
        'json-summary',   // Summary JSON
        'clover',         // Clover XML
      ],

      // Files to include
      include: ['src/**/*.{ts,tsx,js,jsx}'],

      // Files to exclude
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.setup.*',
        '**/mockData/**',
        '**/types/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],

      // Coverage thresholds (fail if below)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,

        // Per-file thresholds
        perFile: true,

        // Auto-update thresholds
        autoUpdate: false,

        // Threshold enforcement
        100: false, // Don't require 100%
      },

      // Report all files (even untested)
      all: true,

      // Skip coverage for specific files
      ignoreClassMethods: ['toString', 'toJSON'],

      // Clean coverage directory before run
      clean: true,

      // Watermarks for coloring
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80],
      },
    },
  },
});
```

### 3. Coverage Analysis Script

**scripts/analyze-coverage.ts**:
```typescript
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface FileCoverage {
  lines: { total: number; covered: number; skipped: number; pct: number };
  statements: { total: number; covered: number; skipped: number; pct: number };
  functions: { total: number; covered: number; skipped: number; pct: number };
  branches: { total: number; covered: number; skipped: number; pct: number };
}

interface CoverageSummary {
  total: FileCoverage;
  [file: string]: FileCoverage;
}

export class CoverageAnalyzer {
  private coveragePath: string;
  private summary: CoverageSummary;

  constructor(coveragePath = 'coverage/coverage-summary.json') {
    this.coveragePath = coveragePath;
    this.summary = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
  }

  // Overall coverage summary
  printSummary() {
    const { total } = this.summary;

    console.log(chalk.bold('\n📊 Coverage Summary\n'));
    console.log(this.formatCoverageLine('Lines', total.lines));
    console.log(this.formatCoverageLine('Statements', total.statements));
    console.log(this.formatCoverageLine('Functions', total.functions));
    console.log(this.formatCoverageLine('Branches', total.branches));
  }

  // Files with low coverage
  findLowCoverageFiles(threshold = 80) {
    const lowCoverageFiles: Array<{
      file: string;
      type: string;
      coverage: number;
      gap: number;
    }> = [];

    Object.entries(this.summary).forEach(([file, data]) => {
      if (file === 'total') return;

      const checks = [
        { type: 'lines', pct: data.lines.pct },
        { type: 'functions', pct: data.functions.pct },
        { type: 'branches', pct: data.branches.pct },
        { type: 'statements', pct: data.statements.pct },
      ];

      checks.forEach(({ type, pct }) => {
        if (pct < threshold) {
          lowCoverageFiles.push({
            file: this.shortenPath(file),
            type,
            coverage: pct,
            gap: threshold - pct,
          });
        }
      });
    });

    return lowCoverageFiles.sort((a, b) => b.gap - a.gap);
  }

  // Uncovered files
  findUncoveredFiles() {
    const uncovered: string[] = [];

    Object.entries(this.summary).forEach(([file, data]) => {
      if (file === 'total') return;

      if (data.statements.pct === 0) {
        uncovered.push(this.shortenPath(file));
      }
    });

    return uncovered;
  }

  // Files with perfect coverage
  findPerfectCoverage() {
    const perfect: string[] = [];

    Object.entries(this.summary).forEach(([file, data]) => {
      if (file === 'total') return;

      const isPerfect =
        data.lines.pct === 100 &&
        data.functions.pct === 100 &&
        data.branches.pct === 100 &&
        data.statements.pct === 100;

      if (isPerfect) {
        perfect.push(this.shortenPath(file));
      }
    });

    return perfect;
  }

  // Coverage trends (requires historical data)
  analyzeTrends(previousCoveragePath: string) {
    const previousSummary: CoverageSummary = JSON.parse(
      fs.readFileSync(previousCoveragePath, 'utf-8')
    );

    const trends = {
      lines: this.summary.total.lines.pct - previousSummary.total.lines.pct,
      statements: this.summary.total.statements.pct - previousSummary.total.statements.pct,
      functions: this.summary.total.functions.pct - previousSummary.total.functions.pct,
      branches: this.summary.total.branches.pct - previousSummary.total.branches.pct,
    };

    console.log(chalk.bold('\n📈 Coverage Trends\n'));

    Object.entries(trends).forEach(([type, change]) => {
      const arrow = change > 0 ? '↗' : change < 0 ? '↘' : '→';
      const color = change > 0 ? chalk.green : change < 0 ? chalk.red : chalk.gray;
      console.log(
        `${type.padEnd(12)} ${color(arrow)} ${color(`${change > 0 ? '+' : ''}${change.toFixed(2)}%`)}`
      );
    });
  }

  // Generate coverage report
  generateReport() {
    const lowCoverage = this.findLowCoverageFiles();
    const uncovered = this.findUncoveredFiles();
    const perfect = this.findPerfectCoverage();

    console.log(chalk.bold('\n🎯 Coverage Analysis Report\n'));

    // Summary
    this.printSummary();

    // Perfect coverage
    if (perfect.length > 0) {
      console.log(chalk.bold.green(`\n✓ Perfect Coverage (${perfect.length} files)`));
      perfect.slice(0, 5).forEach((file) => {
        console.log(chalk.green(`  • ${file}`));
      });
      if (perfect.length > 5) {
        console.log(chalk.gray(`  ... and ${perfect.length - 5} more`));
      }
    }

    // Uncovered files
    if (uncovered.length > 0) {
      console.log(chalk.bold.red(`\n✗ Uncovered Files (${uncovered.length})`));
      uncovered.slice(0, 10).forEach((file) => {
        console.log(chalk.red(`  • ${file}`));
      });
      if (uncovered.length > 10) {
        console.log(chalk.gray(`  ... and ${uncovered.length - 10} more`));
      }
    }

    // Low coverage files
    if (lowCoverage.length > 0) {
      console.log(chalk.bold.yellow(`\n⚠ Low Coverage Areas (${lowCoverage.length})`));
      lowCoverage.slice(0, 10).forEach(({ file, type, coverage, gap }) => {
        console.log(
          chalk.yellow(
            `  • ${file} - ${type}: ${coverage.toFixed(1)}% (gap: ${gap.toFixed(1)}%)`
          )
        );
      });
      if (lowCoverage.length > 10) {
        console.log(chalk.gray(`  ... and ${lowCoverage.length - 10} more`));
      }
    }

    // Recommendations
    this.printRecommendations(lowCoverage, uncovered);
  }

  // Recommendations
  private printRecommendations(lowCoverage: any[], uncovered: string[]) {
    console.log(chalk.bold('\n💡 Recommendations\n'));

    if (uncovered.length > 0) {
      console.log(chalk.yellow('1. Add tests for uncovered files'));
      console.log(`   Priority: ${uncovered.slice(0, 3).join(', ')}`);
    }

    if (lowCoverage.length > 0) {
      const topGap = lowCoverage[0];
      console.log(chalk.yellow(`2. Improve ${topGap.type} coverage in ${topGap.file}`));
      console.log(`   Current: ${topGap.coverage.toFixed(1)}%, Target: 80%`);
    }

    const { total } = this.summary;
    if (total.branches.pct < 80) {
      console.log(chalk.yellow('3. Focus on branch coverage'));
      console.log('   Add tests for conditional logic and edge cases');
    }

    if (total.functions.pct < 80) {
      console.log(chalk.yellow('4. Increase function coverage'));
      console.log('   Test all exported functions and methods');
    }
  }

  // Helpers
  private formatCoverageLine(label: string, data: FileCoverage['lines']) {
    const percentage = data.pct.toFixed(2);
    const color =
      data.pct >= 80 ? chalk.green : data.pct >= 50 ? chalk.yellow : chalk.red;

    return `${label.padEnd(12)} ${color(percentage.padStart(6))}%  ${chalk.gray(
      `(${data.covered}/${data.total})`
    )}`;
  }

  private shortenPath(file: string) {
    return file.replace(process.cwd(), '').replace(/^\//, '');
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  analyzer.generateReport();
}
```

### 4. Coverage Badge Generation

**scripts/generate-coverage-badge.ts**:
```typescript
import fs from 'fs';
import path from 'path';

interface CoverageSummary {
  total: {
    lines: { pct: number };
  };
}

export function generateCoverageBadge() {
  const summary: CoverageSummary = JSON.parse(
    fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
  );

  const coverage = summary.total.lines.pct;
  const color = coverage >= 80 ? 'brightgreen' : coverage >= 50 ? 'yellow' : 'red';

  const badge = `https://img.shields.io/badge/coverage-${coverage.toFixed(0)}%25-${color}`;

  // Update README.md
  const readme = fs.readFileSync('README.md', 'utf-8');
  const updatedReadme = readme.replace(
    /!\[Coverage\]\(.*?\)/,
    `![Coverage](${badge})`
  );

  fs.writeFileSync('README.md', updatedReadme);
  console.log(`✓ Updated coverage badge: ${coverage.toFixed(2)}%`);
}
```

### 5. Coverage Gates

**scripts/enforce-coverage-gates.ts**:
```typescript
import fs from 'fs';
import chalk from 'chalk';

interface CoverageThresholds {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export class CoverageGate {
  private summary: any;
  private thresholds: CoverageThresholds;

  constructor(
    summaryPath = 'coverage/coverage-summary.json',
    thresholds: CoverageThresholds = {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 80,
    }
  ) {
    this.summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    this.thresholds = thresholds;
  }

  enforce(): boolean {
    const { total } = this.summary;
    const failures: string[] = [];

    console.log(chalk.bold('\n🚦 Coverage Gate Enforcement\n'));

    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const actual = total[metric].pct;
      const passed = actual >= threshold;

      const status = passed ? chalk.green('✓') : chalk.red('✗');
      const color = passed ? chalk.green : chalk.red;

      console.log(
        `${status} ${metric.padEnd(12)} ${color(
          `${actual.toFixed(2)}%`
        )} ${chalk.gray(`(threshold: ${threshold}%)`)}`
      );

      if (!passed) {
        failures.push(`${metric}: ${actual.toFixed(2)}% < ${threshold}%`);
      }
    });

    if (failures.length > 0) {
      console.log(chalk.bold.red('\n✗ Coverage gate failed!'));
      console.log(chalk.red('\nFailures:'));
      failures.forEach((failure) => console.log(chalk.red(`  • ${failure}`)));
      return false;
    }

    console.log(chalk.bold.green('\n✓ Coverage gate passed!'));
    return true;
  }
}

// CLI usage
if (require.main === module) {
  const gate = new CoverageGate();
  const passed = gate.enforce();
  process.exit(passed ? 0 : 1);
}
```

### 6. Diff Coverage Analysis

**scripts/analyze-diff-coverage.ts**:
```typescript
import { execSync } from 'child_process';
import fs from 'fs';
import chalk from 'chalk';

export class DiffCoverageAnalyzer {
  private baseBranch: string;

  constructor(baseBranch = 'main') {
    this.baseBranch = baseBranch;
  }

  // Get changed files
  getChangedFiles(): string[] {
    const output = execSync(`git diff ${this.baseBranch} --name-only`, {
      encoding: 'utf-8',
    });

    return output
      .split('\n')
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter((file) => file.startsWith('src/'));
  }

  // Get coverage for changed files
  analyzeDiffCoverage() {
    const changedFiles = this.getChangedFiles();
    const coverage = JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
    );

    console.log(chalk.bold('\n📝 Diff Coverage Analysis\n'));
    console.log(chalk.gray(`Base branch: ${this.baseBranch}\n`));

    const results = changedFiles.map((file) => {
      const fullPath = `${process.cwd()}/${file}`;
      const fileCoverage = coverage[fullPath];

      if (!fileCoverage) {
        return {
          file,
          covered: false,
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
        };
      }

      return {
        file,
        covered: true,
        lines: fileCoverage.lines.pct,
        statements: fileCoverage.statements.pct,
        functions: fileCoverage.functions.pct,
        branches: fileCoverage.branches.pct,
      };
    });

    // Print results
    results.forEach((result) => {
      if (!result.covered) {
        console.log(chalk.red(`✗ ${result.file} - No coverage`));
      } else {
        const avgCoverage =
          (result.lines + result.statements + result.functions + result.branches) / 4;
        const color = avgCoverage >= 80 ? chalk.green : chalk.yellow;

        console.log(
          `${color('✓')} ${result.file} - ${color(`${avgCoverage.toFixed(1)}%`)}`
        );
        console.log(
          chalk.gray(
            `  Lines: ${result.lines.toFixed(1)}%, Functions: ${result.functions.toFixed(1)}%, Branches: ${result.branches.toFixed(1)}%`
          )
        );
      }
    });

    // Summary
    const uncovered = results.filter((r) => !r.covered).length;
    const lowCoverage = results.filter(
      (r) =>
        r.covered &&
        (r.lines < 80 || r.statements < 80 || r.functions < 80 || r.branches < 80)
    ).length;

    console.log(chalk.bold('\n📊 Diff Coverage Summary\n'));
    console.log(`Total changed files: ${results.length}`);
    console.log(chalk.red(`Uncovered: ${uncovered}`));
    console.log(chalk.yellow(`Low coverage: ${lowCoverage}`));
    console.log(
      chalk.green(`Good coverage: ${results.length - uncovered - lowCoverage}`)
    );

    return uncovered === 0 && lowCoverage === 0;
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new DiffCoverageAnalyzer();
  const passed = analyzer.analyzeDiffCoverage();
  process.exit(passed ? 0 : 1);
}
```

### 7. Uncovered Lines Reporter

**scripts/report-uncovered-lines.ts**:
```typescript
import fs from 'fs';
import chalk from 'chalk';

interface UncoveredRange {
  start: number;
  end: number;
}

interface FileCoverageDetail {
  path: string;
  statementMap: Record<string, any>;
  s: Record<string, number>;
  branchMap: Record<string, any>;
  b: Record<string, number[]>;
  fnMap: Record<string, any>;
  f: Record<string, number>;
}

export class UncoveredLinesReporter {
  private coverageData: Record<string, FileCoverageDetail>;

  constructor(coveragePath = 'coverage/coverage-final.json') {
    this.coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
  }

  reportUncoveredLines(targetFile?: string) {
    const files = targetFile
      ? [targetFile]
      : Object.keys(this.coverageData).filter((f) => !f.includes('node_modules'));

    console.log(chalk.bold('\n🔍 Uncovered Lines Report\n'));

    files.forEach((file) => {
      const coverage = this.coverageData[file];
      if (!coverage) return;

      const uncoveredStatements = this.getUncoveredStatements(coverage);
      const uncoveredBranches = this.getUncoveredBranches(coverage);
      const uncoveredFunctions = this.getUncoveredFunctions(coverage);

      if (
        uncoveredStatements.length === 0 &&
        uncoveredBranches.length === 0 &&
        uncoveredFunctions.length === 0
      ) {
        return; // Skip files with perfect coverage
      }

      console.log(chalk.bold(this.shortenPath(file)));

      if (uncoveredStatements.length > 0) {
        console.log(chalk.yellow('  Uncovered statements:'));
        uncoveredStatements.forEach((range) => {
          console.log(chalk.gray(`    Lines ${range.start}-${range.end}`));
        });
      }

      if (uncoveredBranches.length > 0) {
        console.log(chalk.yellow('  Uncovered branches:'));
        uncoveredBranches.forEach(({ line, type }) => {
          console.log(chalk.gray(`    Line ${line} (${type})`));
        });
      }

      if (uncoveredFunctions.length > 0) {
        console.log(chalk.yellow('  Uncovered functions:'));
        uncoveredFunctions.forEach(({ name, line }) => {
          console.log(chalk.gray(`    ${name} (line ${line})`));
        });
      }

      console.log();
    });
  }

  private getUncoveredStatements(coverage: FileCoverageDetail): UncoveredRange[] {
    const uncovered: UncoveredRange[] = [];

    Object.entries(coverage.s).forEach(([key, count]) => {
      if (count === 0) {
        const statement = coverage.statementMap[key];
        uncovered.push({
          start: statement.start.line,
          end: statement.end.line,
        });
      }
    });

    return uncovered;
  }

  private getUncoveredBranches(coverage: FileCoverageDetail) {
    const uncovered: Array<{ line: number; type: string }> = [];

    Object.entries(coverage.b).forEach(([key, branches]) => {
      const branch = coverage.branchMap[key];
      branches.forEach((count, idx) => {
        if (count === 0) {
          uncovered.push({
            line: branch.loc.start.line,
            type: branch.type,
          });
        }
      });
    });

    return uncovered;
  }

  private getUncoveredFunctions(coverage: FileCoverageDetail) {
    const uncovered: Array<{ name: string; line: number }> = [];

    Object.entries(coverage.f).forEach(([key, count]) => {
      if (count === 0) {
        const fn = coverage.fnMap[key];
        uncovered.push({
          name: fn.name || '(anonymous)',
          line: fn.loc.start.line,
        });
      }
    });

    return uncovered;
  }

  private shortenPath(file: string) {
    return file.replace(process.cwd(), '').replace(/^\//, '');
  }
}

// CLI usage
if (require.main === module) {
  const reporter = new UncoveredLinesReporter();
  reporter.reportUncoveredLines();
}
```

### 8. Coverage Comparison Tool

**scripts/compare-coverage.ts**:
```typescript
import fs from 'fs';
import chalk from 'chalk';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

export function compareCoverage(
  beforePath: string,
  afterPath: string = 'coverage/coverage-summary.json'
) {
  const before: CoverageSummary = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
  const after: CoverageSummary = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

  console.log(chalk.bold('\n📊 Coverage Comparison\n'));

  const metrics = ['lines', 'statements', 'functions', 'branches'] as const;

  metrics.forEach((metric) => {
    const beforePct = before.total[metric].pct;
    const afterPct = after.total[metric].pct;
    const diff = afterPct - beforePct;

    const arrow = diff > 0 ? '↗' : diff < 0 ? '↘' : '→';
    const color = diff > 0 ? chalk.green : diff < 0 ? chalk.red : chalk.gray;

    console.log(
      `${metric.padEnd(12)} ${beforePct.toFixed(2)}% ${arrow} ${afterPct.toFixed(2)}% ${color(
        `(${diff > 0 ? '+' : ''}${diff.toFixed(2)}%)`
      )}`
    );
  });

  // Recommendation
  if (after.total.lines.pct < before.total.lines.pct) {
    console.log(chalk.bold.red('\n⚠ Coverage decreased! Consider adding tests.'));
  } else if (after.total.lines.pct > before.total.lines.pct) {
    console.log(chalk.bold.green('\n✓ Coverage improved!'));
  } else {
    console.log(chalk.gray('\n→ Coverage unchanged.'));
  }
}
```

### 9. CI/CD Integration

**GitHub Actions (.github/workflows/coverage.yml)**:
```yaml
name: Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Needed for diff coverage

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Analyze coverage
        run: npm run coverage:analyze

      - name: Enforce coverage gates
        run: npm run coverage:gate

      - name: Analyze diff coverage
        if: github.event_name == 'pull_request'
        run: npm run coverage:diff

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true

      - name: Upload coverage reports
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: |
            coverage/
            !coverage/**/*.json

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
          delete-old-comments: true

      - name: Generate coverage badge
        if: github.ref == 'refs/heads/main'
        run: npm run coverage:badge
```

### 10. Package Scripts

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "coverage:analyze": "tsx scripts/analyze-coverage.ts",
    "coverage:gate": "tsx scripts/enforce-coverage-gates.ts",
    "coverage:diff": "tsx scripts/analyze-diff-coverage.ts",
    "coverage:uncovered": "tsx scripts/report-uncovered-lines.ts",
    "coverage:compare": "tsx scripts/compare-coverage.ts",
    "coverage:badge": "tsx scripts/generate-coverage-badge.ts",
    "coverage:report": "npm run test:coverage && npm run coverage:analyze",
    "coverage:html": "open coverage/index.html"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.4",
    "chalk": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

### 11. SonarQube Integration

**sonar-project.properties**:
```properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.projectVersion=1.0.0

# Source
sonar.sources=src
sonar.tests=tests

# Language
sonar.language=ts
sonar.sourceEncoding=UTF-8

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts,**/mockData/**

# Quality gates
sonar.qualitygate.wait=true
```

### 12. Coverage Dashboard HTML

**scripts/generate-coverage-dashboard.ts**:
```typescript
import fs from 'fs';

export function generateDashboard() {
  const summary = JSON.parse(
    fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Dashboard</title>
  <style>
    body { font-family: system-ui; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .metric { display: inline-block; margin: 10px; padding: 20px; border-radius: 8px; }
    .high { background: #d4edda; }
    .medium { background: #fff3cd; }
    .low { background: #f8d7da; }
    h1 { color: #333; }
    .percentage { font-size: 2em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Test Coverage Dashboard</h1>
  <div class="metrics">
    ${generateMetricCard('Lines', summary.total.lines.pct)}
    ${generateMetricCard('Statements', summary.total.statements.pct)}
    ${generateMetricCard('Functions', summary.total.functions.pct)}
    ${generateMetricCard('Branches', summary.total.branches.pct)}
  </div>
</body>
</html>
  `;

  fs.writeFileSync('coverage/dashboard.html', html);
}

function generateMetricCard(name: string, pct: number) {
  const className = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';
  return `
    <div class="metric ${className}">
      <div>${name}</div>
      <div class="percentage">${pct.toFixed(1)}%</div>
    </div>
  `;
}
```

### 13. Best Practices

**Coverage Goals**:
- 80%+ overall coverage (all metrics)
- 90%+ for critical paths
- 100% for utility functions
- No uncovered files

**What to Focus On**:
- Business logic (highest priority)
- Error handling
- Edge cases
- Conditional branches
- Integration points

**What to Skip**:
- Type definitions
- Configuration files
- Mock data
- Test utilities
- Build artifacts

**Quality over Quantity**:
- Meaningful tests > high coverage
- Test behavior, not implementation
- Focus on user journeys
- Verify error scenarios
- Check accessibility

## Workflow

1. Ask about coverage requirements and current state
2. Run coverage analysis with Vitest
3. Generate comprehensive coverage report
4. Identify low coverage areas and gaps
5. Analyze diff coverage for PRs
6. Report uncovered lines with specific locations
7. Enforce coverage gates
8. Generate badges and dashboards
9. Set up CI/CD integration
10. Provide actionable recommendations
11. Track coverage trends over time

## When to Use

- Checking current test coverage
- Identifying coverage gaps
- Enforcing coverage standards
- Setting up CI/CD coverage gates
- Analyzing coverage trends
- Generating coverage reports
- Creating coverage dashboards
- Improving code quality

Achieve comprehensive test coverage with actionable insights!
