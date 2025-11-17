/**
 * Three File Structure Validator
 *
 * Validates that spec.md, plan.md, and tasks.md follow
 * the canonical structure defined in ADR-0047.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 * Addresses architectural violation: ACs in tasks.md
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'ERROR',   // Breaks architecture, must fix
  WARNING = 'WARNING', // Suboptimal but acceptable
  INFO = 'INFO'      // Suggestion for improvement
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  // tasks.md violations
  TASKS_CONTAINS_AC = 'TASKS_CONTAINS_AC',
  TASKS_MISSING_IMPLEMENTATION = 'TASKS_MISSING_IMPLEMENTATION',
  TASKS_MISSING_TEST_PLAN = 'TASKS_MISSING_TEST_PLAN',
  TASKS_MISSING_AC_IDS = 'TASKS_MISSING_AC_IDS',
  TASKS_CONTAINS_USER_STORY = 'TASKS_CONTAINS_USER_STORY',

  // spec.md violations
  SPEC_CONTAINS_TASK_IDS = 'SPEC_CONTAINS_TASK_IDS',
  SPEC_CONTAINS_TECHNICAL_DETAILS = 'SPEC_CONTAINS_TECHNICAL_DETAILS',
  SPEC_MISSING_AC = 'SPEC_MISSING_AC',

  // plan.md violations
  PLAN_CONTAINS_AC = 'PLAN_CONTAINS_AC',
  PLAN_CONTAINS_TASK_CHECKBOXES = 'PLAN_CONTAINS_TASK_CHECKBOXES',

  // General violations
  FILE_NOT_FOUND = 'FILE_NOT_FOUND'
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  code: ValidationErrorCode;
  severity: ValidationSeverity;
  file: 'spec.md' | 'plan.md' | 'tasks.md';
  line?: number;
  message: string;
  fix?: string;
}

/**
 * Validation result
 */
export interface ThreeFileValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

/**
 * Three File Structure Validator
 */
export class ThreeFileValidator {
  /**
   * Validate an increment's three core files
   */
  validateIncrement(incrementDir: string): ThreeFileValidationResult {
    const issues: ValidationIssue[] = [];

    // Validate each file
    issues.push(...this.validateSpecFile(incrementDir));
    issues.push(...this.validatePlanFile(incrementDir));
    issues.push(...this.validateTasksFile(incrementDir));

    // Calculate summary
    const errors = issues.filter(i => i.severity === ValidationSeverity.ERROR).length;
    const warnings = issues.filter(i => i.severity === ValidationSeverity.WARNING).length;
    const infos = issues.filter(i => i.severity === ValidationSeverity.INFO).length;

    return {
      valid: errors === 0,
      issues,
      summary: { errors, warnings, infos }
    };
  }

  /**
   * Validate spec.md structure
   */
  private validateSpecFile(incrementDir: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const specPath = path.join(incrementDir, 'spec.md');

    if (!fs.existsSync(specPath)) {
      issues.push({
        code: ValidationErrorCode.FILE_NOT_FOUND,
        severity: ValidationSeverity.ERROR,
        file: 'spec.md',
        message: 'spec.md not found in increment directory',
        fix: 'Create spec.md with business requirements and acceptance criteria'
      });
      return issues;
    }

    const content = fs.readFileSync(specPath, 'utf-8');
    const lines = content.split('\n');

    // Rule 1: spec.md should NOT contain task IDs (T-001, T-002, etc.)
    lines.forEach((line, index) => {
      if (/T-\d{3}/.test(line)) {
        issues.push({
          code: ValidationErrorCode.SPEC_CONTAINS_TASK_IDS,
          severity: ValidationSeverity.ERROR,
          file: 'spec.md',
          line: index + 1,
          message: `spec.md contains task ID (${line.match(/T-\d{3}/)?.[0]}). Task IDs belong in tasks.md only.`,
          fix: 'Remove task references from spec.md. Link tasks to ACs instead.'
        });
      }
    });

    // Rule 2: spec.md should NOT contain technical class names
    const technicalPatterns = [
      /class\s+\w+/,
      /interface\s+\w+/,
      /function\s+\w+\(/,
      /\.ts\b/,
      /\.tsx\b/,
      /\.js\b/
    ];

    lines.forEach((line, index) => {
      for (const pattern of technicalPatterns) {
        if (pattern.test(line) && !line.includes('```')) { // Ignore code blocks
          issues.push({
            code: ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS,
            severity: ValidationSeverity.WARNING,
            file: 'spec.md',
            line: index + 1,
            message: 'spec.md contains technical implementation details. Keep business-focused.',
            fix: 'Move technical details to plan.md'
          });
          break;
        }
      }
    });

    // Rule 3: spec.md should contain Acceptance Criteria section
    if (!content.includes('## Acceptance Criteria') && !content.includes('### Acceptance Criteria')) {
      issues.push({
        code: ValidationErrorCode.SPEC_MISSING_AC,
        severity: ValidationSeverity.WARNING,
        file: 'spec.md',
        message: 'spec.md missing "Acceptance Criteria" section',
        fix: 'Add "## Acceptance Criteria" section with AC-XXX-YY criteria'
      });
    }

    return issues;
  }

  /**
   * Validate plan.md structure
   */
  private validatePlanFile(incrementDir: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const planPath = path.join(incrementDir, 'plan.md');

    if (!fs.existsSync(planPath)) {
      // plan.md is optional for simple increments
      return issues;
    }

    const content = fs.readFileSync(planPath, 'utf-8');
    const lines = content.split('\n');

    // Rule 1: plan.md should NOT contain "Acceptance Criteria" sections
    if (content.includes('## Acceptance Criteria') || content.includes('### Acceptance Criteria') || content.includes('**Acceptance Criteria**')) {
      const lineIndex = lines.findIndex(l =>
        l.includes('## Acceptance Criteria') ||
        l.includes('### Acceptance Criteria') ||
        l.includes('**Acceptance Criteria**')
      );

      issues.push({
        code: ValidationErrorCode.PLAN_CONTAINS_AC,
        severity: ValidationSeverity.ERROR,
        file: 'plan.md',
        line: lineIndex + 1,
        message: 'plan.md contains "Acceptance Criteria" section. ACs belong in spec.md only.',
        fix: 'Remove ACs from plan.md. Define them in spec.md instead.'
      });
    }

    // Rule 2: plan.md should NOT contain task checkboxes
    const taskCheckboxPattern = /^- \[ \]/;
    lines.forEach((line, index) => {
      if (taskCheckboxPattern.test(line.trim())) {
        issues.push({
          code: ValidationErrorCode.PLAN_CONTAINS_TASK_CHECKBOXES,
          severity: ValidationSeverity.WARNING,
          file: 'plan.md',
          line: index + 1,
          message: 'plan.md contains task checkboxes. Checkable tasks belong in tasks.md.',
          fix: 'Move task checkboxes to tasks.md. Keep plan.md at architecture level.'
        });
      }
    });

    return issues;
  }

  /**
   * Validate tasks.md structure (MOST IMPORTANT)
   */
  private validateTasksFile(incrementDir: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const tasksPath = path.join(incrementDir, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      // tasks.md is required for all increments
      issues.push({
        code: ValidationErrorCode.FILE_NOT_FOUND,
        severity: ValidationSeverity.ERROR,
        file: 'tasks.md',
        message: 'tasks.md not found in increment directory',
        fix: 'Create tasks.md with task breakdown and embedded tests'
      });
      return issues;
    }

    const content = fs.readFileSync(tasksPath, 'utf-8');
    const lines = content.split('\n');

    // Rule 1: tasks.md should NOT contain "Acceptance Criteria" sections
    // This is the CRITICAL violation we're fixing!
    if (content.includes('**Acceptance Criteria**:')) {
      const lineIndex = lines.findIndex(l => l.includes('**Acceptance Criteria**:'));

      issues.push({
        code: ValidationErrorCode.TASKS_CONTAINS_AC,
        severity: ValidationSeverity.ERROR,
        file: 'tasks.md',
        line: lineIndex + 1,
        message: '🚨 CRITICAL: tasks.md contains "**Acceptance Criteria**:" section. ACs belong in spec.md ONLY!',
        fix: 'Replace "**Acceptance Criteria**:" with "**Implementation**:" and add AC-ID references: "**AC-IDs**: AC-US7-01"'
      });
    }

    // Rule 2: Each task should have "Implementation" section
    const taskHeaders = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /^###\s+T-\d{3}/.test(line));

    taskHeaders.forEach(({ line: taskLine, index: taskIndex }) => {
      // Find next task or end of file
      const nextTaskIndex = taskHeaders.find(h => h.index > taskIndex)?.index ?? lines.length;

      // Extract task content
      const taskContent = lines.slice(taskIndex, nextTaskIndex).join('\n');

      // Check for Implementation section
      if (!taskContent.includes('**Implementation**:')) {
        issues.push({
          code: ValidationErrorCode.TASKS_MISSING_IMPLEMENTATION,
          severity: ValidationSeverity.WARNING,
          file: 'tasks.md',
          line: taskIndex + 1,
          message: `Task ${taskLine.match(/T-\d{3}/)?.[0]} missing "**Implementation**:" section`,
          fix: 'Add "**Implementation**:" section with checkable technical steps'
        });
      }

      // Check for Test Plan
      if (!taskContent.includes('**Test Plan**') && !taskContent.includes('**Tests**')) {
        issues.push({
          code: ValidationErrorCode.TASKS_MISSING_TEST_PLAN,
          severity: ValidationSeverity.WARNING,
          file: 'tasks.md',
          line: taskIndex + 1,
          message: `Task ${taskLine.match(/T-\d{3}/)?.[0]} missing embedded test plan (BDD format)`,
          fix: 'Add "**Test Plan** (BDD):" with Given-When-Then scenarios'
        });
      }

      // Check for AC-IDs references
      if (!taskContent.includes('**AC-IDs**:') && !taskContent.includes('**AC**:')) {
        issues.push({
          code: ValidationErrorCode.TASKS_MISSING_AC_IDS,
          severity: ValidationSeverity.INFO,
          file: 'tasks.md',
          line: taskIndex + 1,
          message: `Task ${taskLine.match(/T-\d{3}/)?.[0]} should reference which ACs it satisfies`,
          fix: 'Add "**AC-IDs**: AC-US7-01, AC-US7-02" to link task to business requirements'
        });
      }
    });

    // Rule 3: tasks.md should NOT contain "As a user" language
    lines.forEach((line, index) => {
      if (line.includes('As a ') && line.includes(' I want ')) {
        issues.push({
          code: ValidationErrorCode.TASKS_CONTAINS_USER_STORY,
          severity: ValidationSeverity.WARNING,
          file: 'tasks.md',
          line: index + 1,
          message: 'tasks.md contains user story language ("As a user..."). User stories belong in spec.md.',
          fix: 'Move user story to spec.md. Keep tasks.md technical.'
        });
      }
    });

    return issues;
  }

  /**
   * Generate a formatted report of validation issues
   */
  formatValidationReport(result: ThreeFileValidationResult): string {
    if (result.valid && result.issues.length === 0) {
      return '✅ All files pass validation! Perfect structure.';
    }

    const lines: string[] = [];

    lines.push('# Three File Structure Validation Report\n');
    lines.push(`**Status**: ${result.valid ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`**Errors**: ${result.summary.errors}`);
    lines.push(`**Warnings**: ${result.summary.warnings}`);
    lines.push(`**Infos**: ${result.summary.infos}\n`);

    if (result.issues.length > 0) {
      lines.push('## Issues Found\n');

      // Group by severity
      const errors = result.issues.filter(i => i.severity === ValidationSeverity.ERROR);
      const warnings = result.issues.filter(i => i.severity === ValidationSeverity.WARNING);
      const infos = result.issues.filter(i => i.severity === ValidationSeverity.INFO);

      if (errors.length > 0) {
        lines.push('### ❌ Errors (Must Fix)\n');
        errors.forEach(issue => {
          lines.push(`**${issue.file}:${issue.line ?? '?'}** - ${issue.code}`);
          lines.push(`- **Message**: ${issue.message}`);
          if (issue.fix) {
            lines.push(`- **Fix**: ${issue.fix}`);
          }
          lines.push('');
        });
      }

      if (warnings.length > 0) {
        lines.push('### ⚠️ Warnings (Should Fix)\n');
        warnings.forEach(issue => {
          lines.push(`**${issue.file}:${issue.line ?? '?'}** - ${issue.code}`);
          lines.push(`- **Message**: ${issue.message}`);
          if (issue.fix) {
            lines.push(`- **Fix**: ${issue.fix}`);
          }
          lines.push('');
        });
      }

      if (infos.length > 0) {
        lines.push('### ℹ️ Info (Nice to Have)\n');
        infos.forEach(issue => {
          lines.push(`**${issue.file}:${issue.line ?? '?'}** - ${issue.code}`);
          lines.push(`- **Message**: ${issue.message}`);
          if (issue.fix) {
            lines.push(`- **Fix**: ${issue.fix}`);
          }
          lines.push('');
        });
      }
    }

    return lines.join('\n');
  }
}
