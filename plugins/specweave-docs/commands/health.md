---
description: Documentation health report - analyzes docs for freshness, coverage, naming violations, duplicates, and provides recommendations.
---

# Documentation Health Report

Analyze your documentation for health issues including freshness, coverage, naming violations, duplicates, and spec-code mismatches.

## Usage

```bash
# Full health report
/sw-docs:health

# Include archived documents
/sw-docs:health --include-archived

# Output as JSON
/sw-docs:health --format json

# Save report to file
/sw-docs:health --output health-report.md
```

## Your Task

Execute the enterprise documentation analyzer:

```typescript
import { EnterpriseDocAnalyzer, generateEnterpriseReport } from '../../src/living-docs/enterprise-analyzer.js';
import * as fs from 'fs';
import * as path from 'path';

const projectPath = process.cwd();

// Create analyzer
const analyzer = new EnterpriseDocAnalyzer({
  projectPath,
  includeArchived: false, // Set true to include archived docs
});

// Run analysis
console.log('\nAnalyzing Documentation Health...\n');
const report = await analyzer.analyze();

// Generate markdown report
const markdownReport = generateEnterpriseReport(report);

// Display summary
console.log(`
DOCUMENTATION HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: ${report.healthScore.overall}% (Grade: ${report.healthScore.grade})

Metrics:
  Freshness: ${report.healthScore.freshness}%
  Coverage:  ${report.healthScore.coverage}%
  Accuracy:  ${report.healthScore.accuracy}%

Categories: ${report.categories.length}
Total Documents: ${report.totalDocuments}

Issues Found:
  Spec-Code Mismatches: ${report.mismatches.length}
  Naming Violations: ${report.namingViolations.length}
  Duplicates: ${report.duplicates.length}
  Discrepancies: ${report.discrepancies.length}

Recommendations: ${report.recommendations.length}
`);

// Show recommendations
if (report.recommendations.length > 0) {
  console.log('RECOMMENDATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  for (const rec of report.recommendations) {
    console.log(`• ${rec}`);
  }
}

// Optionally save full report
const outputPath = path.join(projectPath, '.specweave/docs/ENTERPRISE-HEALTH.md');
fs.writeFileSync(outputPath, markdownReport);
console.log(`\nFull report saved to: ${outputPath}`);
```

## Health Metrics

### Overall Score (0-100%)

Weighted combination of:
- **Freshness** (20%): Documents updated in last 30 days
- **Coverage** (30%): Documents with acceptance criteria
- **Accuracy** (50%): ACs without spec-code mismatches + naming compliance

### Grade Scale

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| A | 90-100% | Excellent documentation health |
| B | 80-89% | Good, minor improvements needed |
| C | 70-79% | Acceptable, several issues |
| D | 60-69% | Below standard, action required |
| F | <60% | Critical issues, immediate attention |

## Issue Types

### Spec-Code Mismatches

| Type | Description |
|------|-------------|
| `ghost_completion` | AC marked complete but no code evidence found |
| `partial_implementation` | Very little code evidence (<10 lines) |
| `undocumented_code` | Code exists without corresponding spec |
| `spec_drift` | Spec and code have diverged |

### Naming Violations

| Type | Severity | Example |
|------|----------|---------|
| `all_caps` | Warning | `CIRCUIT-BREAKER.md` |
| `mixed_case` | Warning | `CircuitBreaker.md` |
| `date_suffix` | Info | `feature-2025-11-24.md` |
| `no_extension` | Error | `readme` (missing .md) |

### Duplicates

| Type | Description |
|------|-------------|
| `exact` | Identical content |
| `near_duplicate` | Very similar content (>90%) |
| `same_title` | Same normalized title |

### Discrepancies

| Type | Description |
|------|-------------|
| `broken_link` | Link to non-existent file |
| `orphaned_reference` | Reference to deleted increment |
| `outdated_version` | Old version numbers (v0.x) |
| `conflicting_info` | Contradictory information |

## Report Sections

### 1. Health Score Summary

```
| Metric | Score | Grade |
|--------|-------|-------|
| Overall | 85% | B |
| Freshness | 72% | - |
| Coverage | 65% | - |
| Accuracy | 92% | - |
```

### 2. Documentation Categories

```
| Category | Documents | Last Updated |
|----------|-----------|--------------|
| Feature Specs | 45 | 12/3/2025 |
| Architecture | 148 | 12/3/2025 |
| ADRs | 147 | 12/3/2025 |
```

### 3. Spec-Code Mismatches

```
| AC ID | Type | Confidence | File |
|-------|------|------------|------|
| AC-US1-01 | ghost_completion | 70% | spec-0045.md |
```

### 4. Naming Violations

```
| File | Type | Severity | Expected |
|------|------|----------|----------|
| CIRCUIT-BREAKER.md | all_caps | Warning | lowercase-kebab.md |
```

### 5. Recommendations

Actionable suggestions based on analysis:
- Update stale documentation
- Add acceptance criteria
- Fix naming conventions
- Consolidate duplicates
- Run `/sw-docs:organize` for large folders

## Output Example

```
DOCUMENTATION HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 78% (Grade: C)

Metrics:
  Freshness: 65%
  Coverage:  42%
  Accuracy:  89%

Categories: 6
Total Documents: 708

Issues Found:
  Spec-Code Mismatches: 12
  Naming Violations: 8
  Duplicates: 3
  Discrepancies: 15

Recommendations: 5

RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Documentation freshness is low. Consider reviewing docs over 30 days old.
• Documentation coverage is limited. Add acceptance criteria to more documents.
• 8 files use ALL CAPS naming. Rename to lowercase-kebab-case.
• 3 sets of duplicate documents detected. Consider consolidating.
• "ADRs" has 147 files. Run /sw-docs:organize to generate themed indexes.

Full report saved to: .specweave/docs/ENTERPRISE-HEALTH.md
```

## Integrations

### CI/CD Health Check

```yaml
# .github/workflows/docs-health.yml
name: Documentation Health

on:
  push:
    paths:
      - '.specweave/docs/**'

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check Documentation Health
        run: |
          npx specweave docs:health --format json > health.json
          SCORE=$(jq '.healthScore.overall' health.json)
          if [ $SCORE -lt 70 ]; then
            echo "Documentation health below threshold: $SCORE%"
            exit 1
          fi
```

### Scheduled Reports

```bash
# Run weekly health check
0 9 * * 1 cd /project && npx specweave docs:health --output weekly-health.md
```

## See Also

- `/sw-docs:organize` - Organize large folders with themed indexes
- `/sw-docs:view` - View documentation with Docusaurus
- `/sw-docs:generate` - Generate docs from code
