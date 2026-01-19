/**
 * Skill Validator - Self-validating skills infrastructure
 *
 * Each skill can define validation strategies in VALIDATION.md or validation.yaml
 * Validation runs automatically after skill work completes.
 *
 * @since v1.0.130
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import yaml from 'js-yaml';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Validation step definition
 */
export interface ValidationStep {
  command: string;
  name: string;
  timeout: number;  // seconds
  optional?: boolean;
  platform?: 'ios' | 'android' | 'web' | 'all';
  workdir?: string;
}

/**
 * Preview/dev server configuration
 */
export interface PreviewConfig {
  command: string;
  port: number;
  wait_for?: string;
  browser_url?: string;
  timeout?: number;
}

/**
 * API endpoint test definition
 */
export interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body_file?: string;
  body?: Record<string, unknown>;
  expected_status: number;
  expected_shape?: Record<string, string>;  // field -> type
  headers?: Record<string, string>;
}

/**
 * API testing configuration
 */
export interface ApiTestConfig {
  base_url: string;
  health_check: string;
  auth_strategy: 'jwt' | 'api_key' | 'basic' | 'oauth2' | 'none';
  auth_env_var?: string;
  auth_header?: string;
  endpoints_to_test: EndpointTest[];
}

/**
 * Full validation configuration for a skill
 */
export interface ValidationConfig {
  domain: string;
  framework?: string;
  validation_type: 'automated' | 'manual' | 'hybrid';
  requires_auth: boolean;
  timeout_seconds: number;
  validations: {
    quick: ValidationStep[];
    standard: ValidationStep[];
    full: ValidationStep[];
  };
  preview?: PreviewConfig;
  api_testing?: ApiTestConfig;
  success_criteria?: {
    min_coverage?: number;
    max_warnings?: number;
    required_tests?: string[];
  };
}

/**
 * Result of a single validation step
 */
export interface StepResult {
  name: string;
  command: string;
  passed: boolean;
  duration_ms: number;
  output?: string;
  error?: string;
  skipped?: boolean;
  skip_reason?: string;
}

/**
 * Result of full validation run
 */
export interface ValidationResult {
  passed: boolean;
  level: 'quick' | 'standard' | 'full';
  steps: StepResult[];
  duration_ms: number;
  coverage?: number;
  warnings: string[];
  summary: string;
}

/**
 * Default validation configs by domain
 */
const DEFAULT_CONFIGS: Record<string, Partial<ValidationConfig>> = {
  frontend: {
    domain: 'frontend',
    validation_type: 'automated',
    requires_auth: false,
    timeout_seconds: 120,
    validations: {
      quick: [
        { command: 'npx tsc --noEmit', name: 'TypeScript check', timeout: 30 },
        { command: 'npm run lint -- --max-warnings 0', name: 'Lint check', timeout: 30, optional: true },
      ],
      standard: [
        { command: 'npm test -- --coverage --watchAll=false', name: 'Unit tests', timeout: 120 },
      ],
      full: [
        { command: 'npx playwright test', name: 'E2E tests', timeout: 300 },
      ],
    },
    preview: {
      command: 'npm run dev',
      port: 3000,
      wait_for: 'Ready',
    },
  },
  backend: {
    domain: 'backend',
    validation_type: 'automated',
    requires_auth: true,
    timeout_seconds: 180,
    validations: {
      quick: [
        { command: 'npx tsc --noEmit', name: 'TypeScript check', timeout: 30 },
      ],
      standard: [
        { command: 'npm test', name: 'Unit tests', timeout: 120 },
        { command: 'npm run test:integration', name: 'Integration tests', timeout: 180, optional: true },
      ],
      full: [
        { command: 'npm run postman:test', name: 'API tests', timeout: 300, optional: true },
      ],
    },
  },
  mobile: {
    domain: 'mobile',
    validation_type: 'automated',
    requires_auth: false,
    timeout_seconds: 300,
    validations: {
      quick: [
        { command: 'npx tsc --noEmit', name: 'TypeScript check', timeout: 30 },
        { command: 'npx expo doctor', name: 'Expo health check', timeout: 30, optional: true },
      ],
      standard: [
        { command: 'npm test -- --watchAll=false', name: 'Jest tests', timeout: 120 },
      ],
      full: [
        { command: 'npx maestro test .maestro/', name: 'Maestro E2E', timeout: 600, optional: true },
      ],
    },
    preview: {
      command: 'npx expo start --web',
      port: 8081,
      wait_for: 'Starting Metro',
      browser_url: 'http://localhost:8081',
    },
  },
  infrastructure: {
    domain: 'infrastructure',
    validation_type: 'automated',
    requires_auth: false,
    timeout_seconds: 120,
    validations: {
      quick: [
        { command: 'terraform fmt -check', name: 'Terraform format', timeout: 10, optional: true },
        { command: 'terraform validate', name: 'Terraform validate', timeout: 30 },
      ],
      standard: [
        { command: 'terraform plan -out=tfplan', name: 'Terraform plan', timeout: 120 },
      ],
      full: [
        { command: 'tflint', name: 'TFLint check', timeout: 60, optional: true },
        { command: 'checkov -d .', name: 'Security scan', timeout: 120, optional: true },
      ],
    },
  },
  ml: {
    domain: 'ml',
    validation_type: 'automated',
    requires_auth: false,
    timeout_seconds: 300,
    validations: {
      quick: [
        { command: 'ruff check .', name: 'Lint check', timeout: 30, optional: true },
      ],
      standard: [
        { command: 'pytest tests/ -v', name: 'Pytest', timeout: 180 },
      ],
      full: [
        { command: 'python scripts/validate_model.py', name: 'Model validation', timeout: 600, optional: true },
      ],
    },
  },
  testing: {
    domain: 'testing',
    validation_type: 'automated',
    requires_auth: false,
    timeout_seconds: 120,
    validations: {
      quick: [
        { command: 'npx tsc --noEmit', name: 'TypeScript check', timeout: 30 },
      ],
      standard: [
        { command: 'npm test -- --watchAll=false', name: 'Run tests', timeout: 120 },
      ],
      full: [
        { command: 'npm test -- --coverage --watchAll=false', name: 'Tests with coverage', timeout: 180 },
      ],
    },
  },
};

/**
 * Skill Validator
 *
 * Runs validation strategies defined in skill VALIDATION.md files
 */
export class SkillValidator {
  private projectRoot: string;
  private verbose: boolean;

  constructor(projectRoot: string, options?: { verbose?: boolean }) {
    this.projectRoot = projectRoot;
    this.verbose = options?.verbose ?? false;
  }

  /**
   * Load validation config from skill or use defaults
   */
  async loadConfig(skillFqn: string): Promise<ValidationConfig | null> {
    // Try to find skill's VALIDATION.md or validation.yaml
    const possiblePaths = [
      path.join(this.projectRoot, '.specweave/skills', skillFqn, 'VALIDATION.md'),
      path.join(this.projectRoot, '.specweave/skills', skillFqn, 'validation.yaml'),
      // Check in installed plugins
      path.join(process.env.HOME || '', '.claude/plugins/marketplaces/specweave/plugins', skillFqn.split(':')[0], 'skills', skillFqn.split(':')[1], 'VALIDATION.md'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return this.parseConfigFile(configPath);
      }
    }

    // Use default based on domain detection
    const domain = this.detectDomain(skillFqn);
    if (domain && DEFAULT_CONFIGS[domain]) {
      return DEFAULT_CONFIGS[domain] as ValidationConfig;
    }

    return null;
  }

  /**
   * Parse VALIDATION.md or validation.yaml file
   */
  private parseConfigFile(filePath: string): ValidationConfig | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        return yaml.load(content) as ValidationConfig;
      }

      // Parse VALIDATION.md with YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = yaml.load(frontmatterMatch[1]) as Partial<ValidationConfig>;
        // Merge with defaults if domain specified
        if (frontmatter.domain && DEFAULT_CONFIGS[frontmatter.domain]) {
          return { ...DEFAULT_CONFIGS[frontmatter.domain], ...frontmatter } as ValidationConfig;
        }
        return frontmatter as ValidationConfig;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect domain from skill FQN
   */
  private detectDomain(skillFqn: string): string | null {
    const fqnLower = skillFqn.toLowerCase();

    if (fqnLower.includes('frontend') || fqnLower.includes('react') || fqnLower.includes('vue')) {
      return 'frontend';
    }
    if (fqnLower.includes('backend') || fqnLower.includes('api') || fqnLower.includes('server')) {
      return 'backend';
    }
    if (fqnLower.includes('mobile') || fqnLower.includes('react-native') || fqnLower.includes('expo')) {
      return 'mobile';
    }
    if (fqnLower.includes('infra') || fqnLower.includes('terraform') || fqnLower.includes('k8s')) {
      return 'infrastructure';
    }
    if (fqnLower.includes('ml') || fqnLower.includes('ai') || fqnLower.includes('model')) {
      return 'ml';
    }
    if (fqnLower.includes('test') || fqnLower.includes('qa')) {
      return 'testing';
    }

    return null;
  }

  /**
   * Run validation at specified level
   */
  async validate(
    skillFqn: string,
    level: 'quick' | 'standard' | 'full' = 'quick'
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const config = await this.loadConfig(skillFqn);

    if (!config) {
      return {
        passed: true,
        level,
        steps: [],
        duration_ms: Date.now() - startTime,
        warnings: ['No validation config found, skipping'],
        summary: 'Skipped - no validation config',
      };
    }

    // Determine which steps to run
    const steps: ValidationStep[] = [];
    if (level === 'quick') {
      steps.push(...(config.validations.quick || []));
    } else if (level === 'standard') {
      steps.push(...(config.validations.quick || []));
      steps.push(...(config.validations.standard || []));
    } else {
      steps.push(...(config.validations.quick || []));
      steps.push(...(config.validations.standard || []));
      steps.push(...(config.validations.full || []));
    }

    // Run steps
    const results: StepResult[] = [];
    let allPassed = true;
    const warnings: string[] = [];

    for (const step of steps) {
      const result = await this.runStep(step);
      results.push(result);

      if (!result.passed && !step.optional) {
        allPassed = false;
      }

      if (!result.passed && step.optional) {
        warnings.push(`Optional step "${step.name}" failed: ${result.error}`);
      }
    }

    const duration_ms = Date.now() - startTime;

    return {
      passed: allPassed,
      level,
      steps: results,
      duration_ms,
      warnings,
      summary: this.generateSummary(results, allPassed, level),
    };
  }

  /**
   * Run a single validation step
   */
  private async runStep(step: ValidationStep): Promise<StepResult> {
    const startTime = Date.now();

    // Check if command exists
    const commandParts = step.command.split(' ');
    const baseCommand = commandParts[0];

    // Skip if command not found
    if (!this.commandExists(baseCommand)) {
      return {
        name: step.name,
        command: step.command,
        passed: true,
        duration_ms: Date.now() - startTime,
        skipped: true,
        skip_reason: `Command "${baseCommand}" not found`,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(step.command, {
        cwd: step.workdir || this.projectRoot,
        timeout: step.timeout * 1000,
        maxBuffer: 10 * 1024 * 1024,  // 10MB
      });

      return {
        name: step.name,
        command: step.command,
        passed: true,
        duration_ms: Date.now() - startTime,
        output: (stdout + stderr).slice(0, 5000),  // Truncate
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      return {
        name: step.name,
        command: step.command,
        passed: false,
        duration_ms: Date.now() - startTime,
        output: (err.stdout || '').slice(0, 2000),
        error: (err.stderr || err.message || 'Unknown error').slice(0, 2000),
      };
    }
  }

  /**
   * Check if a command exists on the system
   */
  private commandExists(command: string): boolean {
    try {
      // Handle npx commands
      if (command === 'npx') return true;
      if (command === 'npm') return true;
      if (command === 'node') return true;

      const { status } = require('child_process').spawnSync('which', [command], {
        stdio: 'pipe',
      });
      return status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(results: StepResult[], passed: boolean, level: string): string {
    const passedCount = results.filter(r => r.passed).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.filter(r => !r.passed && !r.skipped).length;

    const emoji = passed ? '✅' : '❌';
    const status = passed ? 'PASSED' : 'FAILED';

    return `${emoji} ${level.toUpperCase()} validation ${status}: ${passedCount}/${results.length} steps passed` +
      (skippedCount > 0 ? `, ${skippedCount} skipped` : '') +
      (failedCount > 0 ? `, ${failedCount} failed` : '');
  }

  /**
   * Run quick validation (fastest, minimal checks)
   */
  async runQuickValidation(domain?: string): Promise<ValidationResult> {
    const skillFqn = domain ? `specweave-${domain}:validator` : 'specweave:generic';
    return this.validate(skillFqn, 'quick');
  }

  /**
   * Run standard validation (unit tests, integration tests)
   */
  async runStandardValidation(domain?: string): Promise<ValidationResult> {
    const skillFqn = domain ? `specweave-${domain}:validator` : 'specweave:generic';
    return this.validate(skillFqn, 'standard');
  }

  /**
   * Run full validation (E2E, visual regression, API tests)
   */
  async runFullValidation(domain?: string): Promise<ValidationResult> {
    const skillFqn = domain ? `specweave-${domain}:validator` : 'specweave:generic';
    return this.validate(skillFqn, 'full');
  }

  /**
   * Detect project domain from package.json and file structure
   */
  async detectProjectDomain(): Promise<string | null> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Check for frameworks
        if (deps['next'] || deps['react']) return 'frontend';
        if (deps['express'] || deps['fastify'] || deps['@nestjs/core']) return 'backend';
        if (deps['expo'] || deps['react-native']) return 'mobile';
        if (deps['@playwright/test'] || deps['vitest'] || deps['jest']) return 'testing';
      } catch {
        // Ignore parse errors
      }
    }

    // Check for infrastructure files
    if (fs.existsSync(path.join(this.projectRoot, 'main.tf'))) return 'infrastructure';
    if (fs.existsSync(path.join(this.projectRoot, 'requirements.txt'))) return 'ml';

    return null;
  }

  /**
   * Format validation result for display
   */
  formatResult(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold(`Skill Validation (${result.level})`));
    lines.push('─'.repeat(40));

    for (const step of result.steps) {
      const icon = step.skipped ? '⏭️' : step.passed ? '✅' : '❌';
      const status = step.skipped ? chalk.gray('SKIPPED') : step.passed ? chalk.green('PASS') : chalk.red('FAIL');
      const duration = chalk.gray(`(${step.duration_ms}ms)`);

      lines.push(`${icon} ${step.name}: ${status} ${duration}`);

      if (step.skipped && step.skip_reason) {
        lines.push(chalk.gray(`   └─ ${step.skip_reason}`));
      }

      if (!step.passed && step.error && !step.skipped) {
        const errorLines = step.error.split('\n').slice(0, 3);
        for (const errLine of errorLines) {
          lines.push(chalk.red(`   └─ ${errLine}`));
        }
      }
    }

    lines.push('─'.repeat(40));
    lines.push(result.summary);

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push(chalk.yellow('Warnings:'));
      for (const warning of result.warnings) {
        lines.push(chalk.yellow(`  ⚠️ ${warning}`));
      }
    }

    return lines.join('\n');
  }
}

/**
 * Run validation from CLI or hook
 */
export async function validateSkill(
  skillFqn: string,
  level: 'quick' | 'standard' | 'full' = 'quick',
  options?: { projectRoot?: string; verbose?: boolean }
): Promise<ValidationResult> {
  const projectRoot = options?.projectRoot || process.cwd();
  const validator = new SkillValidator(projectRoot, { verbose: options?.verbose });
  return validator.validate(skillFqn, level);
}

/**
 * Auto-detect domain and run validation
 */
export async function validateProject(
  level: 'quick' | 'standard' | 'full' = 'quick',
  options?: { projectRoot?: string; verbose?: boolean }
): Promise<ValidationResult> {
  const projectRoot = options?.projectRoot || process.cwd();
  const validator = new SkillValidator(projectRoot, { verbose: options?.verbose });

  const domain = await validator.detectProjectDomain();
  if (!domain) {
    return {
      passed: true,
      level,
      steps: [],
      duration_ms: 0,
      warnings: ['Could not detect project domain'],
      summary: 'Skipped - unknown project type',
    };
  }

  return validator.validate(`specweave-${domain}:validator`, level);
}
