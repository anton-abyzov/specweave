#!/usr/bin/env ts-node
/**
 * Template Enhancements Validation Script
 *
 * Validates that template enhancements are correctly implemented:
 * - Anchor links are valid
 * - All required sections exist
 * - Search patterns work
 * - Quick reference cards present
 * - Troubleshooting complete
 *
 * Usage: ts-node scripts/validate-template-enhancements.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface TestCategory {
  name: string;
  tests: ValidationResult[];
}

class TemplateValidator {
  private claudeContent: string;
  private agentsContent: string;
  private results: TestCategory[] = [];

  constructor(private templateDir: string) {
    const claudePath = path.join(templateDir, 'CLAUDE.md.template');
    const agentsPath = path.join(templateDir, 'AGENTS.md.template');

    this.claudeContent = fs.readFileSync(claudePath, 'utf-8');
    this.agentsContent = fs.readFileSync(agentsPath, 'utf-8');
  }

  run(): void {
    console.log(`${colors.cyan}=== Template Enhancement Validation ===${colors.reset}\n`);

    this.validateClaudeTemplate();
    this.validateAgentsTemplate();
    this.validateAnchorLinks();
    this.validateSearchPatterns();
    this.printResults();
  }

  private validateClaudeTemplate(): void {
    const category: TestCategory = {
      name: 'CLAUDE.md.template',
      tests: [],
    };

    // Test 1: Quick Reference Cards
    category.tests.push(
      this.test(
        'Quick Reference Cards section exists',
        this.claudeContent.includes('## 📋 Quick Reference Cards')
      )
    );

    // Test 2: Troubleshooting section
    category.tests.push(
      this.test(
        'Troubleshooting section exists',
        this.claudeContent.includes('## 🆘 Troubleshooting')
      )
    );

    // Test 3: Daily Workflow table
    category.tests.push(
      this.test(
        'Daily Workflow table present',
        /TASK.*→.*COMMAND/.test(this.claudeContent)
      )
    );

    // Test 4: File Organization Rules
    category.tests.push(
      this.test(
        'File Organization Rules present',
        this.claudeContent.includes('File Organization Rules')
      )
    );

    // Test 5: Troubleshooting issues count
    const troubleshootSection = this.claudeContent.split('## 🆘 Troubleshooting')[1] || '';
    const issueCount = (troubleshootSection.match(/### /g) || []).length;
    category.tests.push(
      this.test(
        `At least 7 troubleshooting issues (found: ${issueCount})`,
        issueCount >= 7
      )
    );

    // Test 6: Critical rules
    category.tests.push(
      this.test(
        'Critical rules present (NEVER POLLUTE ROOT)',
        this.claudeContent.includes('NEVER POLLUTE PROJECT ROOT')
      )
    );

    this.results.push(category);
  }

  private validateAgentsTemplate(): void {
    const category: TestCategory = {
      name: 'AGENTS.md.template',
      tests: [],
    };

    // Test 1: File size (comprehensive)
    const lineCount = this.agentsContent.split('\n').length;
    category.tests.push(
      this.test(
        `Comprehensive file (2000+ lines) - found: ${lineCount}`,
        lineCount >= 2000
      )
    );

    // Test 2: "How to Use This File" section
    category.tests.push(
      this.test(
        '"How to Use This File" section exists',
        this.agentsContent.includes('## 🚨 CRITICAL: How to Use This File')
      )
    );

    // Test 3: Mentions non-Claude tools
    category.tests.push(
      this.test(
        'Mentions non-Claude tools (Cursor/Copilot)',
        /Cursor|Copilot|non-Claude/.test(this.agentsContent)
      )
    );

    // Test 4: Explains NO progressive disclosure
    category.tests.push(
      this.test(
        'Explains NO progressive disclosure',
        this.agentsContent.includes('DO NOT have progressive disclosure')
      )
    );

    // Test 5: Reference manual pattern
    category.tests.push(
      this.test(
        'Teaches reference manual pattern',
        this.agentsContent.includes('Think of This File as a REFERENCE MANUAL')
      )
    );

    // Test 6: Section Index
    category.tests.push(
      this.test(
        'Section Index exists',
        this.agentsContent.includes('## 📑 SECTION INDEX')
      )
    );

    // Test 7: Quick Reference Cards
    category.tests.push(
      this.test(
        'Quick Reference Cards section exists',
        this.agentsContent.includes('## 📋 Quick Reference Cards {#quick-reference-cards}')
      )
    );

    // Test 8: Essential Knowledge
    category.tests.push(
      this.test(
        'Essential Knowledge section exists',
        this.agentsContent.includes('### 🎯 Essential Knowledge {#essential-knowledge}')
      )
    );

    // Test 9: Critical Rules
    category.tests.push(
      this.test(
        'Critical Rules section exists',
        this.agentsContent.includes('#### Critical Rules {#critical-rules}')
      )
    );

    // Test 10: File Organization
    category.tests.push(
      this.test(
        'File Organization section exists',
        this.agentsContent.includes('#### File Organization {#file-organization}')
      )
    );

    // Test 11: Troubleshooting section
    category.tests.push(
      this.test(
        'Troubleshooting section exists',
        this.agentsContent.includes('## 🆘 Troubleshooting {#troubleshooting}')
      )
    );

    // Test 12: Troubleshooting issues count
    const troubleshootSection = this.agentsContent.split('## 🆘 Troubleshooting')[1] || '';
    const issueCount = (troubleshootSection.match(/### /g) || []).length;
    category.tests.push(
      this.test(
        `At least 14 troubleshooting issues (found: ${issueCount})`,
        issueCount >= 14
      )
    );

    // Test 13: Manual sync instructions
    category.tests.push(
      this.test(
        'Manual sync instructions present',
        this.agentsContent.includes('/specweave:sync-tasks') &&
          this.agentsContent.includes('/specweave:sync-docs update')
      )
    );

    this.results.push(category);
  }

  private validateAnchorLinks(): void {
    const category: TestCategory = {
      name: 'Anchor Links Validation',
      tests: [],
    };

    // Extract Section Index
    const indexMatch = this.agentsContent.match(/## 📑 SECTION INDEX[\s\S]*?---/);
    if (!indexMatch) {
      category.tests.push(
        this.test('Section Index found', false, 'Section Index not found in AGENTS.md')
      );
      this.results.push(category);
      return;
    }

    const sectionIndex = indexMatch[0];

    // Extract all anchor links from Section Index
    const linkRegex = /\]\(#([a-z0-9-]+)\)/g;
    const anchorLinks: string[] = [];
    let match;
    while ((match = linkRegex.exec(sectionIndex)) !== null) {
      anchorLinks.push(match[1]);
    }

    category.tests.push(
      this.test(
        `Section Index has links (found: ${anchorLinks.length})`,
        anchorLinks.length > 0
      )
    );

    // Check each anchor exists in content
    const missingAnchors: string[] = [];
    for (const anchor of anchorLinks) {
      const anchorPattern = new RegExp(`\\{#${anchor}\\}`, 'g');
      if (!anchorPattern.test(this.agentsContent)) {
        missingAnchors.push(anchor);
      }
    }

    category.tests.push(
      this.test(
        `All anchor links valid (checked: ${anchorLinks.length})`,
        missingAnchors.length === 0,
        missingAnchors.length > 0 ? `Missing: ${missingAnchors.join(', ')}` : undefined
      )
    );

    // Test specific critical anchors
    const criticalAnchors = [
      'essential-knowledge',
      'quick-reference-cards',
      'critical-rules',
      'file-organization',
      'troubleshooting',
      'troubleshoot-skills',
      'troubleshoot-commands',
      'troubleshoot-sync',
    ];

    for (const anchor of criticalAnchors) {
      const anchorPattern = new RegExp(`\\{#${anchor}\\}`, 'g');
      category.tests.push(
        this.test(`Anchor '${anchor}' exists`, anchorPattern.test(this.agentsContent))
      );
    }

    this.results.push(category);
  }

  private validateSearchPatterns(): void {
    const category: TestCategory = {
      name: 'Search Patterns',
      tests: [],
    };

    const patterns = [
      { name: 'command', pattern: '`#command-{name}`' },
      { name: 'skill', pattern: '`#skill-{name}`' },
      { name: 'agent', pattern: '`#agent-{name}`' },
      { name: 'workflow', pattern: '`#workflow-{name}`' },
      { name: 'troubleshoot', pattern: '`#troubleshoot-{topic}`' },
    ];

    for (const { name, pattern } of patterns) {
      category.tests.push(
        this.test(
          `Search pattern for ${name} documented`,
          this.agentsContent.includes(pattern)
        )
      );
    }

    // Test Search Patterns Reference table
    category.tests.push(
      this.test(
        'Search Patterns Reference table exists',
        this.agentsContent.includes('Search Patterns Reference') &&
          /What You Need.*Search For.*Example/.test(this.agentsContent)
      )
    );

    this.results.push(category);
  }

  private test(name: string, condition: boolean, details?: string): ValidationResult {
    return {
      passed: condition,
      message: name,
      details,
    };
  }

  private printResults(): void {
    let totalTests = 0;
    let passedTests = 0;

    console.log(); // Blank line

    for (const category of this.results) {
      console.log(`${colors.blue}📁 ${category.name}${colors.reset}`);

      for (const test of category.tests) {
        totalTests++;
        const icon = test.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        console.log(`  ${icon} ${test.message}`);

        if (!test.passed && test.details) {
          console.log(`    ${colors.yellow}→ ${test.details}${colors.reset}`);
        }

        if (test.passed) passedTests++;
      }

      console.log(); // Blank line between categories
    }

    // Summary
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    const summaryColor = passRate === '100.0' ? colors.green : passRate >= '80.0' ? colors.yellow : colors.red;

    console.log(`${colors.cyan}=== Summary ===${colors.reset}`);
    console.log(`${summaryColor}${passedTests}/${totalTests} tests passed (${passRate}%)${colors.reset}`);

    if (passedTests === totalTests) {
      console.log(`${colors.green}\n✨ All template enhancements validated successfully!${colors.reset}`);
    } else {
      console.log(`${colors.red}\n⚠️  Some validations failed. Please review the issues above.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run validation
const templateDir = path.join(__dirname, '../src/templates');
const validator = new TemplateValidator(templateDir);
validator.run();
