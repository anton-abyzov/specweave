/**
 * TDD Spec Contract Tests
 *
 * Verifies that when testMode is "TDD", the spec.md includes
 * a TDD Contract section explaining the workflow.
 *
 * @see spec.md AC-US2-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Determines if TDD contract should be included in spec based on testMode.
 *
 * @param config - Configuration object with testing settings
 * @returns true if TDD contract should be included
 */
export function shouldIncludeTDDContract(config: { testing?: { defaultTestMode?: string } }): boolean {
  const testMode = config?.testing?.defaultTestMode ?? 'test-after';
  return testMode === 'TDD';
}

/**
 * Loads TDD contract template content.
 *
 * @param templatesDir - Path to templates directory
 * @returns TDD contract content or null if not found
 */
export function loadTDDContractTemplate(templatesDir: string): string | null {
  const contractPath = path.join(templatesDir, 'spec-tdd-contract.md');
  if (!fs.existsSync(contractPath)) {
    return null;
  }
  return fs.readFileSync(contractPath, 'utf-8');
}

/**
 * Injects TDD contract into spec content.
 *
 * @param specContent - Original spec content
 * @param contractContent - TDD contract content to inject
 * @returns Spec content with TDD contract injected after frontmatter
 */
export function injectTDDContract(specContent: string, contractContent: string): string {
  // Find end of frontmatter (---)
  const frontmatterEnd = specContent.indexOf('---', specContent.indexOf('---') + 3);
  if (frontmatterEnd === -1) {
    // No frontmatter, prepend contract
    return contractContent + '\n\n' + specContent;
  }

  // Insert after frontmatter
  const beforeContract = specContent.slice(0, frontmatterEnd + 3);
  const afterContract = specContent.slice(frontmatterEnd + 3);

  return beforeContract + '\n\n' + contractContent + afterContract;
}

describe('TDD Spec Contract', () => {
  let tempDir: string;
  let templatesDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-contract-test-'));
    templatesDir = path.join(tempDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('shouldIncludeTDDContract', () => {
    it('should return true when testMode is TDD', () => {
      const config = { testing: { defaultTestMode: 'TDD' } };
      expect(shouldIncludeTDDContract(config)).toBe(true);
    });

    it('should return false when testMode is test-after', () => {
      const config = { testing: { defaultTestMode: 'test-after' } };
      expect(shouldIncludeTDDContract(config)).toBe(false);
    });

    it('should return false when testMode is not specified', () => {
      expect(shouldIncludeTDDContract({})).toBe(false);
      expect(shouldIncludeTDDContract({ testing: {} })).toBe(false);
    });

    it('should return false for manual and none modes', () => {
      expect(shouldIncludeTDDContract({ testing: { defaultTestMode: 'manual' } })).toBe(false);
      expect(shouldIncludeTDDContract({ testing: { defaultTestMode: 'none' } })).toBe(false);
    });
  });

  describe('TDD contract template content', () => {
    it('should contain "TDD Contract" section heading', () => {
      // Create mock TDD contract template
      const contractContent = `## TDD Contract

**This increment uses Test-Driven Development (TDD).**

For EVERY feature you implement:
1. **RED**: Write failing test FIRST
2. **GREEN**: Minimal code to pass test
3. **REFACTOR**: Improve code, keep tests green

**FORBIDDEN in TDD mode:**
- Writing implementation before test
- Skipping tests for "simple" features
`;
      fs.writeFileSync(path.join(templatesDir, 'spec-tdd-contract.md'), contractContent);

      const content = loadTDDContractTemplate(templatesDir);

      expect(content).not.toBeNull();
      expect(content).toContain('## TDD Contract');
    });

    it('should explain RED-GREEN-REFACTOR workflow', () => {
      const contractContent = `## TDD Contract

1. **RED**: Write failing test FIRST
2. **GREEN**: Minimal code to pass test
3. **REFACTOR**: Improve code, keep tests green
`;
      fs.writeFileSync(path.join(templatesDir, 'spec-tdd-contract.md'), contractContent);

      const content = loadTDDContractTemplate(templatesDir);

      expect(content).toContain('RED');
      expect(content).toContain('GREEN');
      expect(content).toContain('REFACTOR');
    });
  });

  describe('injectTDDContract', () => {
    it('should inject contract after frontmatter', () => {
      const specContent = `---
increment: 0001-feature
title: "Feature"
---

# Feature: Test Feature

## User Stories
`;
      const contractContent = `## TDD Contract

Follow RED-GREEN-REFACTOR.
`;

      const result = injectTDDContract(specContent, contractContent);

      // Contract should appear after frontmatter
      expect(result).toContain('---\n\n## TDD Contract');
      // Original content should still exist
      expect(result).toContain('# Feature: Test Feature');
      expect(result).toContain('## User Stories');
    });

    it('should prepend contract if no frontmatter', () => {
      const specContent = `# Feature: No Frontmatter

## Description
`;
      const contractContent = `## TDD Contract

Follow TDD.
`;

      const result = injectTDDContract(specContent, contractContent);

      // Contract should be at the beginning
      expect(result.startsWith('## TDD Contract')).toBe(true);
      expect(result).toContain('# Feature: No Frontmatter');
    });
  });

  describe('Real templates directory', () => {
    const realTemplatesDir = path.join(
      process.cwd(),
      'plugins/specweave/skills/increment-planner/templates'
    );

    it('should have TDD contract template when it exists', () => {
      // This test will FAIL until we create spec-tdd-contract.md
      // This is the RED phase
      const content = loadTDDContractTemplate(realTemplatesDir);

      if (content === null) {
        expect.fail(
          'TDD contract template spec-tdd-contract.md does not exist yet. ' +
            'Create it in plugins/specweave/skills/increment-planner/templates/'
        );
      }

      expect(content).toContain('## TDD Contract');
      expect(content).toContain('RED');
      expect(content).toContain('GREEN');
      expect(content).toContain('REFACTOR');
    });
  });
});
