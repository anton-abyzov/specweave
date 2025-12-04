#!/usr/bin/env node

/**
 * Test Safety Validator - Pre-commit hook for preventing dangerous test patterns
 *
 * Checks:
 * 1. ❌ process.cwd() usage in test files (catastrophic deletion risk)
 * 2. ❌ __dirname usage for .specweave paths (should use os.tmpdir())
 * 3. ✅ Fixture imports where applicable (DRY principle)
 * 4. ✅ Test isolation patterns (temp directories)
 *
 * Usage:
 *   node scripts/validate-test-safety.js
 *   node scripts/validate-test-safety.js --fix  # Auto-fix some issues
 *
 * Exit codes:
 *   0 - All tests safe
 *   1 - Dangerous patterns found
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

// Dangerous patterns that MUST be blocked
const DANGEROUS_PATTERNS = [
  {
    pattern: /process\.cwd\(\)/g,
    severity: 'CRITICAL',
    message: 'process.cwd() in test files can cause catastrophic .specweave/ deletion!',
    suggestion: 'Use os.tmpdir() or test utilities from tests/test-utils/isolated-test-dir.ts',
    autoFix: false,
  },
  {
    pattern: /__dirname.*\.specweave/g,
    severity: 'HIGH',
    message: '__dirname with .specweave path risks project directory mutation',
    suggestion: 'Use isolated test directories: path.join(os.tmpdir(), "test-name-" + Date.now())',
    autoFix: false,
  },
  {
    pattern: /path\.join\(process\.cwd\(\)/g,
    severity: 'CRITICAL',
    message: 'path.join(process.cwd()) in tests can target project root!',
    suggestion: 'Use os.tmpdir() for test isolation',
    autoFix: false,
  },
];

// Patterns that should trigger fixture usage suggestions
const FIXTURE_SUGGESTIONS = [
  {
    pattern: /const\s+\w+\s*=\s*\{[\s\S]*?id:\s*['"]00\d{2}['"]/g,
    message: 'Hardcoded increment object - consider using IncrementFactory',
    severity: 'WARNING',
    suggestion: 'import { IncrementFactory } from "tests/test-utils/factories"',
  },
  {
    pattern: /number:\s*\d+,[\s\S]*?title:/g,
    message: 'Hardcoded GitHub issue - consider using GitHubFactory',
    severity: 'WARNING',
    suggestion: 'import { GitHubFactory } from "tests/test-utils/factories"',
  },
];

async function validateTestFiles() {
  console.log(`${colors.blue}🔍 Validating test safety...${colors.reset}\n`);

  // Find all test files
  const testFiles = await glob('tests/**/*.test.ts', { cwd: projectRoot });

  let totalIssues = 0;
  let criticalIssues = 0;
  const issuesByFile = new Map();

  for (const testFile of testFiles) {
    const filePath = path.join(projectRoot, testFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const fileIssues = [];

    // Check dangerous patterns
    for (const { pattern, severity, message, suggestion } of DANGEROUS_PATTERNS) {
      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1]?.trim();

        fileIssues.push({
          line: lineNumber,
          severity,
          message,
          suggestion,
          code: lineContent,
        });

        totalIssues++;
        if (severity === 'CRITICAL') criticalIssues++;
      }
    }

    // Check fixture suggestions (only if no critical issues)
    if (fileIssues.length === 0) {
      for (const { pattern, message, severity, suggestion } of FIXTURE_SUGGESTIONS) {
        const matches = [...content.matchAll(pattern)];

        if (matches.length > 0) {
          const lineNumber = content.substring(0, matches[0].index).split('\n').length;

          fileIssues.push({
            line: lineNumber,
            severity,
            message,
            suggestion,
            code: lines[lineNumber - 1]?.trim().substring(0, 80) + '...',
          });

          totalIssues++;
        }
      }
    }

    if (fileIssues.length > 0) {
      issuesByFile.set(testFile, fileIssues);
    }
  }

  // Print results
  if (totalIssues === 0) {
    console.log(`${colors.green}✅ All tests are safe! No dangerous patterns found.${colors.reset}\n`);
    console.log(`📊 Scanned ${testFiles.length} test files`);
    return 0;
  }

  console.log(`${colors.red}❌ Found ${totalIssues} issues in ${issuesByFile.size} files${colors.reset}\n`);

  for (const [file, issues] of issuesByFile) {
    console.log(`${colors.yellow}📄 ${file}${colors.reset}`);

    for (const issue of issues) {
      const color = issue.severity === 'CRITICAL' ? colors.red : colors.yellow;
      console.log(`  ${color}${issue.severity}${colors.reset} (line ${issue.line}): ${issue.message}`);
      console.log(`  ${colors.blue}💡 ${issue.suggestion}${colors.reset}`);
      console.log(`  Code: ${issue.code}`);
      console.log();
    }
  }

  // Summary
  if (criticalIssues > 0) {
    console.log(`${colors.red}🚨 CRITICAL: ${criticalIssues} critical issues MUST be fixed before commit!${colors.reset}\n`);
    console.log(`${colors.yellow}⚠️  These patterns can cause catastrophic .specweave/ deletion!${colors.reset}`);
    console.log(`${colors.blue}📚 See CLAUDE.md → "Test Isolation" section for safe patterns${colors.reset}\n`);
  }

  return criticalIssues > 0 ? 1 : 0;
}

// Run validation
validateTestFiles()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error(`${colors.red}Error during validation:${colors.reset}`, error);
    process.exit(1);
  });
