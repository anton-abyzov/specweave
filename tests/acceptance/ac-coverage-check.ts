/**
 * Acceptance Criteria Coverage Validation
 *
 * Validates that all acceptance criteria from spec.md are covered by tests
 *
 * Usage: ts-node tests/acceptance/ac-coverage-check.ts [increment-id]
 */

import * as fs from 'fs';
import * as path from 'path';

interface ACMapping {
  acId: string;
  description: string;
  covered: boolean;
  testFiles: string[];
}

interface ValidationResult {
  incrementId: string;
  totalAcs: number;
  coveredAcs: number;
  coveragePercent: number;
  missingAcs: string[];
  mappings: ACMapping[];
}

/**
 * Extract ACs from spec.md
 */
function extractAcsFromSpec(specPath: string): Map<string, string> {
  const acs = new Map<string, string>();

  if (!fs.existsSync(specPath)) {
    console.error(`❌ spec.md not found: ${specPath}`);
    return acs;
  }

  const content = fs.readFileSync(specPath, 'utf-8');

  // Match AC checkboxes: - [ ] **AC-US1-01**: Description
  const acPattern = /^-\s+\[[ x]\]\s+\*\*([A-Z]{2}-[A-Z0-9]+-\d+)\*\*:\s*(.+)$/gm;

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    const acId = match[1];
    const description = match[2].trim();
    acs.set(acId, description);
  }

  return acs;
}

/**
 * Find test files that reference AC IDs
 */
function findTestCoverageForAc(acId: string, testDir: string): string[] {
  const testFiles: string[] = [];

  if (!fs.existsSync(testDir)) {
    return testFiles;
  }

  // Search in e2e tests
  const e2eDir = path.join(testDir, 'e2e');
  if (fs.existsSync(e2eDir)) {
    const files = fs.readdirSync(e2eDir).filter(f => f.endsWith('.e2e.ts'));

    for (const file of files) {
      const filePath = path.join(e2eDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if AC ID is referenced in comments or test descriptions
      if (content.includes(acId)) {
        testFiles.push(`tests/e2e/${file}`);
      }
    }
  }

  // Search in integration tests
  const integrationDir = path.join(testDir, 'integration');
  if (fs.existsSync(integrationDir)) {
    const files = fs.readdirSync(integrationDir).filter(f => f.endsWith('.test.ts'));

    for (const file of files) {
      const filePath = path.join(integrationDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes(acId)) {
        testFiles.push(`tests/integration/${file}`);
      }
    }
  }

  // Search in unit tests
  const unitDir = path.join(testDir, 'unit');
  if (fs.existsSync(unitDir)) {
    const files = fs.readdirSync(unitDir).filter(f => f.endsWith('.test.ts'));

    for (const file of files) {
      const filePath = path.join(unitDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes(acId)) {
        testFiles.push(`tests/unit/${file}`);
      }
    }
  }

  return testFiles;
}

/**
 * Validate AC coverage for an increment
 */
function validateAcCoverage(incrementId: string, projectRoot: string = process.cwd()): ValidationResult {
  const specPath = path.join(projectRoot, '.specweave/increments', incrementId, 'spec.md');
  const testDir = path.join(projectRoot, 'tests');

  // Extract ACs from spec
  const acs = extractAcsFromSpec(specPath);

  if (acs.size === 0) {
    console.warn(`⚠️  No ACs found in spec.md for increment ${incrementId}`);
  }

  const mappings: ACMapping[] = [];
  let coveredCount = 0;
  const missingAcs: string[] = [];

  // Check coverage for each AC
  for (const [acId, description] of acs.entries()) {
    const testFiles = findTestCoverageForAc(acId, testDir);
    const covered = testFiles.length > 0;

    if (covered) {
      coveredCount++;
    } else {
      missingAcs.push(acId);
    }

    mappings.push({
      acId,
      description,
      covered,
      testFiles
    });
  }

  const coveragePercent = acs.size > 0 ? (coveredCount / acs.size) * 100 : 0;

  return {
    incrementId,
    totalAcs: acs.size,
    coveredAcs: coveredCount,
    coveragePercent,
    missingAcs,
    mappings
  };
}

/**
 * Print coverage report
 */
function printCoverageReport(result: ValidationResult): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Acceptance Criteria Coverage Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Increment: ${result.incrementId}`);
  console.log(`Total ACs: ${result.totalAcs}`);
  console.log(`Covered ACs: ${result.coveredAcs}`);
  console.log(`Coverage: ${result.coveragePercent.toFixed(1)}%\n`);

  if (result.missingAcs.length > 0) {
    console.log('❌ Missing Coverage:\n');
    for (const acId of result.missingAcs) {
      const mapping = result.mappings.find(m => m.acId === acId);
      console.log(`  • ${acId}: ${mapping?.description || 'N/A'}`);
    }
    console.log('');
  }

  console.log('Detailed Coverage:\n');
  for (const mapping of result.mappings) {
    const status = mapping.covered ? '✅' : '❌';
    console.log(`${status} ${mapping.acId}: ${mapping.description}`);

    if (mapping.testFiles.length > 0) {
      for (const file of mapping.testFiles) {
        console.log(`     → ${file}`);
      }
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Exit with error if coverage is below target
  const TARGET_COVERAGE = 80;
  if (result.coveragePercent < TARGET_COVERAGE) {
    console.log(`❌ Coverage ${result.coveragePercent.toFixed(1)}% is below target ${TARGET_COVERAGE}%`);
    process.exit(1);
  } else {
    console.log(`✅ Coverage ${result.coveragePercent.toFixed(1)}% meets target ${TARGET_COVERAGE}%`);
  }
}

/**
 * Main execution
 */
function main() {
  const incrementId = process.argv[2] || '0136-process-lifecycle-test-suite';
  const projectRoot = process.cwd();

  console.log(`Validating AC coverage for increment: ${incrementId}\n`);

  const result = validateAcCoverage(incrementId, projectRoot);
  printCoverageReport(result);
}

main();
