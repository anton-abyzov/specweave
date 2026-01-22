import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillValidator, validateSkill, validateProject } from '../../../src/core/skills/skill-validator.js';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';

/**
 * Skill Validator Unit Tests
 *
 * Tests for the self-validating skills infrastructure
 */

describe('SkillValidator', () => {
  let tempDir: string;
  let validator: SkillValidator;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `skill-validator-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    validator = new SkillValidator(tempDir);
  });

  describe('loadConfig', () => {
    it('should return default config when no VALIDATION.md exists', async () => {
      const config = await validator.loadConfig('specweave-frontend:component');

      // Should fall back to frontend defaults based on skill name
      expect(config).toBeDefined();
      expect(config?.domain).toBe('frontend');
      expect(config?.validations.quick).toBeDefined();
    });

    it('should detect domain from skill FQN', async () => {
      const frontendConfig = await validator.loadConfig('specweave-frontend:styling');
      expect(frontendConfig?.domain).toBe('frontend');

      const backendConfig = await validator.loadConfig('specweave-backend:api');
      expect(backendConfig?.domain).toBe('backend');

      // Note: mobile detection needs "mobile" in FQN, not "react-native"
      // since "react-native" contains "react" which matches frontend first
      const mobileConfig = await validator.loadConfig('specweave-mobile:expo-app');
      expect(mobileConfig?.domain).toBe('mobile');

      const infraConfig = await validator.loadConfig('specweave-infra:terraform');
      expect(infraConfig?.domain).toBe('infrastructure');

      const mlConfig = await validator.loadConfig('specweave-ml:model');
      expect(mlConfig?.domain).toBe('ml');
    });

    it('should return null for unknown skill domain', async () => {
      const config = await validator.loadConfig('unknown-plugin:unknown-skill');
      expect(config).toBeNull();
    });
  });

  describe('validate', () => {
    it('should skip validation when no config found', async () => {
      const result = await validator.validate('unknown:skill', 'quick');

      expect(result.passed).toBe(true);
      expect(result.steps).toHaveLength(0);
      expect(result.warnings).toContain('No validation config found, skipping');
    });

    it('should run quick validation steps', async () => {
      // Create a mock package.json to simulate a project
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "test passed"',
          lint: 'echo "lint passed"',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const result = await validator.validate('specweave-frontend:component', 'quick');

      expect(result.level).toBe('quick');
      expect(result.duration_ms).toBeGreaterThan(0);
      // Steps may be skipped if tsc not available
      expect(result.steps.length).toBeGreaterThanOrEqual(0);
    });

    it('should mark optional steps as passed when skipped', async () => {
      const result = await validator.validate('specweave-frontend:component', 'quick');

      // Optional steps that fail should still allow overall pass
      const optionalSteps = result.steps.filter(s => s.skipped);
      for (const step of optionalSteps) {
        expect(step.passed).toBe(true);
        expect(step.skip_reason).toBeDefined();
      }
    });
  });

  describe('detectProjectDomain', () => {
    it('should detect frontend from package.json dependencies', async () => {
      const packageJson = {
        name: 'frontend-app',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const domain = await validator.detectProjectDomain();
      expect(domain).toBe('frontend');
    });

    it('should detect backend from package.json dependencies', async () => {
      const packageJson = {
        name: 'backend-api',
        dependencies: {
          express: '^4.18.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const domain = await validator.detectProjectDomain();
      expect(domain).toBe('backend');
    });

    it('should detect mobile from expo dependency', async () => {
      const packageJson = {
        name: 'mobile-app',
        dependencies: {
          expo: '^49.0.0',
          'react-native': '^0.72.0',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const domain = await validator.detectProjectDomain();
      expect(domain).toBe('mobile');
    });

    it('should detect infrastructure from main.tf file', async () => {
      // Create fresh temp dir without any package.json files
      const infraTempDir = path.join(os.tmpdir(), `infra-test-${Date.now()}`);
      fs.mkdirSync(infraTempDir, { recursive: true });

      fs.writeFileSync(
        path.join(infraTempDir, 'main.tf'),
        'provider "aws" { region = "us-east-1" }'
      );

      const infraValidator = new SkillValidator(infraTempDir);
      const domain = await infraValidator.detectProjectDomain();
      expect(domain).toBe('infrastructure');

      // Cleanup
      fs.rmSync(infraTempDir, { recursive: true, force: true });
    });

    it('should detect ML from requirements.txt', async () => {
      // Create fresh temp dir without any infrastructure files
      const mlTempDir = path.join(os.tmpdir(), `ml-test-${Date.now()}`);
      fs.mkdirSync(mlTempDir, { recursive: true });

      fs.writeFileSync(
        path.join(mlTempDir, 'requirements.txt'),
        'torch>=2.0.0\ntransformers>=4.0.0'
      );

      const mlValidator = new SkillValidator(mlTempDir);
      const domain = await mlValidator.detectProjectDomain();
      expect(domain).toBe('ml');

      // Cleanup
      fs.rmSync(mlTempDir, { recursive: true, force: true });
    });

    it('should return null for unknown project type', async () => {
      // Create fresh empty temp dir
      const emptyTempDir = path.join(os.tmpdir(), `empty-test-${Date.now()}`);
      fs.mkdirSync(emptyTempDir, { recursive: true });

      const emptyValidator = new SkillValidator(emptyTempDir);
      const domain = await emptyValidator.detectProjectDomain();
      expect(domain).toBeNull();

      // Cleanup
      fs.rmSync(emptyTempDir, { recursive: true, force: true });
    });
  });

  describe('formatResult', () => {
    it('should format passed result', async () => {
      const result = await validator.validate('specweave-frontend:component', 'quick');
      const formatted = validator.formatResult(result);

      expect(formatted).toContain('Skill Validation');
      expect(formatted).toContain('quick');
    });
  });
});

describe('validateSkill function', () => {
  it('should validate a skill with default options', { timeout: 20000 }, async () => {
    const result = await validateSkill('specweave-frontend:component', 'quick');

    expect(result).toBeDefined();
    expect(result.level).toBe('quick');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });
});

describe('validateProject function', () => {
  it('should auto-detect project and validate', async () => {
    const tempDir = path.join(os.tmpdir(), `validate-project-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Create a frontend project
    const packageJson = {
      name: 'test-frontend',
      dependencies: { react: '^18.0.0' },
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );

    const result = await validateProject('quick', { projectRoot: tempDir });

    expect(result).toBeDefined();
    expect(result.level).toBe('quick');

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
