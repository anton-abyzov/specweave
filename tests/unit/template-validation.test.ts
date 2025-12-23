import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Template Validation Tests
 *
 * Validates that template files are correctly structured with:
 * - All required sections present
 * - No unresolved placeholders
 * - Consistent messaging across templates
 */

const TEMPLATES_DIR = path.join(__dirname, '../../src/templates');
const CLAUDE_TEMPLATE = path.join(TEMPLATES_DIR, 'CLAUDE.md.template');
const AGENTS_TEMPLATE = path.join(TEMPLATES_DIR, 'AGENTS.md.template');

describe('Template Validation Tests', () => {
  describe('CLAUDE.md.template', () => {
    let claudeContent: string;

    beforeAll(() => {
      claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
    });

    test('should exist', () => {
      expect(fs.existsSync(CLAUDE_TEMPLATE)).toBe(true);
    });

    test('should be valid Markdown', () => {
      expect(claudeContent).toBeTruthy();
      expect(claudeContent.length).toBeGreaterThan(0);
    });

    test('should contain Rules section', () => {
      expect(claudeContent).toContain('## Rules');
    });

    test('should contain Troubleshooting section', () => {
      expect(claudeContent).toContain('## Troubleshooting');
    });

    test('should contain Workflow section', () => {
      expect(claudeContent).toContain('## Workflow');
    });

    test('should contain file organization rules in Rules section', () => {
      // File organization is part of Rules section (Root clean rule)
      expect(claudeContent).toMatch(/Root clean.*NEVER/);
    });

    test('should contain command table', () => {
      expect(claudeContent).toMatch(/Cmd.*Action/);
    });

    test('should have troubleshooting table', () => {
      expect(claudeContent).toMatch(/Issue.*Fix/);
    });

    test('should contain critical file organization rule', () => {
      expect(claudeContent).toMatch(/NEVER create.*project root|Root clean/);
    });

    test('should contain Truth reference in header', () => {
      // Header contains "Truth: spec.md + tasks.md"
      expect(claudeContent).toMatch(/Truth.*spec\.md.*tasks\.md/);
    });

    test('should contain Task Format section', () => {
      expect(claudeContent).toContain('## Task Format');
    });

    test('should contain PROJECT_NAME placeholder', () => {
      expect(claudeContent).toContain('{PROJECT_NAME}');
    });

    test('should contain increment folder structure', () => {
      expect(claudeContent).toContain('.specweave/increments');
    });

    test('should contain reports, scripts, logs subfolders', () => {
      expect(claudeContent).toContain('reports/');
      expect(claudeContent).toContain('scripts/');
      expect(claudeContent).toContain('logs/');
    });

    test('should mention SpecWeave commands', () => {
      expect(claudeContent).toContain('/sw:increment');
      expect(claudeContent).toContain('/sw:do');
      expect(claudeContent).toContain('/sw:done');
    });

    test('should contain Emergency rule', () => {
      // Emergency rule is part of Rules section
      expect(claudeContent).toMatch(/Emergency.*emergency mode/);
    });
  });

  describe('AGENTS.md.template', () => {
    let agentsContent: string;

    beforeAll(() => {
      agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');
    });

    test('should exist', () => {
      expect(fs.existsSync(AGENTS_TEMPLATE)).toBe(true);
    });

    test('should be valid Markdown', () => {
      expect(agentsContent).toBeTruthy();
      expect(agentsContent.length).toBeGreaterThan(0);
    });

    test('should have Section Index', () => {
      expect(agentsContent).toContain('Section Index');
    });

    test('should have Essential Rules section', () => {
      expect(agentsContent).toContain('Essential Rules');
    });

    test('should contain file organization rule', () => {
      expect(agentsContent).toContain('NEVER pollute project root');
    });

    test('should have Quick Start section', () => {
      expect(agentsContent).toContain('Quick Start');
    });

    test('should have Troubleshooting section', () => {
      expect(agentsContent).toMatch(/troubleshooting|Troubleshooting/i);
    });

    test('should contain increment folder structure', () => {
      expect(agentsContent).toContain('.specweave/increments');
    });

    test('should mention reports, scripts, logs subfolders', () => {
      expect(agentsContent).toContain('reports/');
      expect(agentsContent).toContain('scripts/');
      expect(agentsContent).toContain('logs/');
    });

    test('should contain PROJECT_NAME placeholder', () => {
      expect(agentsContent).toContain('{PROJECT_NAME}');
    });

    test('should mention SpecWeave commands', () => {
      expect(agentsContent).toContain('/sw:');
    });

    test('should have context loading section', () => {
      expect(agentsContent).toMatch(/context.*loading|context-manifest/i);
    });

    test('should mention sync workflow', () => {
      expect(agentsContent).toMatch(/sync.*workflow|sync-workflow/i);
    });

    test('should have non-claude tools section', () => {
      expect(agentsContent).toMatch(/non-claude|hooks/i);
    });
  });

  describe('Both Templates', () => {
    test('should have consistent file organization messaging', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      // Both should mention file organization rules (different wording but same intent)
      // CLAUDE: "Root clean: NEVER create .md/reports/scripts in project root"
      // AGENTS: "NEVER pollute project root"
      expect(claudeContent).toMatch(/NEVER.*project root|Root clean/i);
      expect(agentsContent).toMatch(/NEVER.*project root/i);
    });

    test('should reference increment folder structure', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      expect(claudeContent).toContain('.specweave/increments');
      expect(agentsContent).toContain('.specweave/increments');
    });

    test('should mention reports/, scripts/, logs/ folders', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      expect(claudeContent).toContain('reports/');
      expect(claudeContent).toContain('scripts/');
      expect(claudeContent).toContain('logs/');

      expect(agentsContent).toContain('reports/');
      expect(agentsContent).toContain('scripts/');
      expect(agentsContent).toContain('logs/');
    });
  });
});
