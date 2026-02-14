/**
 * TDD Workflow Integration Tests
 *
 * End-to-end tests for the complete TDD workflow:
 * 1. Config with testMode: TDD
 * 2. Increment planning selects TDD template
 * 3. Tasks generated with RED-GREEN-REFACTOR triplets
 * 4. Enforcement guard validates task ordering
 *
 * @see spec.md - All User Stories (US-001 through US-005)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Import functions from unit tests for reuse
import { selectTaskTemplate } from '../../unit/tdd/template-selection.test.js';
import { shouldIncludeTDDContract, loadTDDContractTemplate } from '../../unit/tdd/spec-contract.test.js';

describe('TDD Workflow Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-workflow-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'logs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Full TDD Workflow', () => {
    it('should select TDD template based on config testMode', () => {
      const config = { testing: { defaultTestMode: 'TDD' } };

      const template = selectTaskTemplate(config);

      expect(template).toBe('tasks-tdd-single-project.md');
    });

    it('should include TDD contract when testMode is TDD', () => {
      const config = { testing: { defaultTestMode: 'TDD' } };

      expect(shouldIncludeTDDContract(config)).toBe(true);
    });

    it('should NOT include TDD contract when testMode is test-after', () => {
      const config = { testing: { defaultTestMode: 'test-after' } };

      expect(shouldIncludeTDDContract(config)).toBe(false);
    });

    // Templates moved/removed — increment-planner/templates directory no longer exists
    it.skip('should load TDD contract template with correct content (templates dir removed)', () => {
      const templatesDir = path.join(
        process.cwd(),
        'plugins/specweave/skills/increment-planner/templates'
      );

      const contract = loadTDDContractTemplate(templatesDir);

      expect(contract).not.toBeNull();
      expect(contract).toContain('TDD Contract');
      expect(contract).toContain('RED');
      expect(contract).toContain('GREEN');
      expect(contract).toContain('REFACTOR');
    });

    // Templates moved/removed — increment-planner/templates directory no longer exists
    it.skip('should have TDD task template with proper structure (templates dir removed)', () => {
      const templatePath = path.join(
        process.cwd(),
        'plugins/specweave/skills/increment-planner/templates/tasks-tdd-single-project.md'
      );

      expect(fs.existsSync(templatePath)).toBe(true);

      const content = fs.readFileSync(templatePath, 'utf-8');

      // Check for TDD markers
      expect(content).toContain('[RED]');
      expect(content).toContain('[GREEN]');
      expect(content).toContain('[REFACTOR]');

      // Check for dependency structure
      expect(content).toContain('Depends On');

      // Check for TDD Contract section
      expect(content).toContain('TDD Contract');
    });
  });

  describe('TDD Type System', () => {
    it('should have TDDEnforcement type defined', () => {
      // Import and verify the type exists (moved from src/core/types/config.ts to src/core/config/types.ts)
      const configPath = path.join(process.cwd(), 'src/core/config/types.ts');
      const configContent = fs.readFileSync(configPath, 'utf-8');

      expect(configContent).toContain("export type TDDEnforcement = 'strict' | 'warn' | 'off'");
      expect(configContent).toContain('tddEnforcement?: TDDEnforcement');
    });
  });

  describe('/sw:do TDD Awareness', () => {
    it('should have TDD mode check in do skill', () => {
      // do.md command moved to skills/do/SKILL.md
      const doPath = path.join(process.cwd(), 'plugins/specweave/skills/do/SKILL.md');
      const doContent = fs.readFileSync(doPath, 'utf-8');

      // Check for TDD mode detection
      expect(doContent).toContain('testMode');
      // Trimmed skill uses "TDD mode active" and "TDD Setup" instead of "TDD MODE"
      expect(doContent).toMatch(/TDD mode active|TDD Setup/);

      // Check for TDD phase references
      expect(doContent).toContain('TDD reminder banner');
      expect(doContent).toContain('RED');
      expect(doContent).toContain('GREEN');
      expect(doContent).toContain('REFACTOR');
    });
  });

  describe('Enforcement Hook', () => {
    it('should have enforcement level reading in guard hook', () => {
      const hookPath = path.join(
        process.cwd(),
        'plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh'
      );
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for enforcement level configuration
      expect(hookContent).toContain('TDD_ENFORCEMENT');
      expect(hookContent).toContain('tddEnforcement');

      // Check for enforcement modes
      expect(hookContent).toContain('strict');
      expect(hookContent).toContain('warn');
      expect(hookContent).toContain('off');

      // Check for blocking behavior
      expect(hookContent).toContain('exit 1');
      expect(hookContent).toContain('TDD ENFORCEMENT BLOCKED');
    });
  });

  describe('Complete Configuration Flow', () => {
    it('should properly cascade TDD configuration', () => {
      // Create a complete project structure
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-tdd-feature');
      fs.mkdirSync(incDir, { recursive: true });

      // 1. Set global config with TDD
      const globalConfig = {
        testing: {
          defaultTestMode: 'TDD',
          tddEnforcement: 'strict',
          defaultCoverageTarget: 80,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(globalConfig, null, 2));

      // 2. Create increment with TDD mode
      const metadata = {
        id: '0001-tdd-feature',
        testMode: 'TDD',
        status: 'in-progress',
      };
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // 3. Create tasks with TDD structure
      const tasks = `# Tasks: TDD Feature

## TDD Contract

This increment uses TDD mode.

### T-001: [RED] Write test
**Status**: [x] completed

### T-002: [GREEN] Implement feature
**Status**: [ ] pending
`;
      fs.writeFileSync(path.join(incDir, 'tasks.md'), tasks);

      // Verify files exist
      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(path.join(incDir, 'metadata.json'))).toBe(true);
      expect(fs.existsSync(path.join(incDir, 'tasks.md'))).toBe(true);

      // Verify config values
      const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(loadedConfig.testing.defaultTestMode).toBe('TDD');
      expect(loadedConfig.testing.tddEnforcement).toBe('strict');

      // Verify metadata
      const loadedMetadata = JSON.parse(
        fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8')
      );
      expect(loadedMetadata.testMode).toBe('TDD');
    });
  });
});
