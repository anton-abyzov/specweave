/**
 * Tests for Auto Skill Self-Sufficiency
 *
 * The /sw:auto skill MUST be self-sufficient — it should NOT shell out
 * to the `specweave auto` CLI command. Instead, it should use Read/Write/Edit/Glob
 * tools directly to:
 * 1. Find and activate increments
 * 2. Create the session marker (auto-mode.json)
 * 3. Handle quality flags (--tests, --build, etc.)
 *
 * This test validates the skill's prompt content ensures this architecture.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/skills/auto/SKILL.md'
);

describe('Auto Skill Self-Sufficiency', () => {
  const content = fs.readFileSync(SKILL_PATH, 'utf-8');

  describe('no CLI delegation', () => {
    it('should NOT use allowed-tools restricted to specweave auto CLI', () => {
      // The skill must not restrict itself to only Bash(specweave auto *)
      expect(content).not.toContain('Bash(specweave auto');
    });

    it('should NOT instruct running specweave auto as primary execution path', () => {
      // The skill should not tell the LLM to run `specweave auto` as the main action.
      // It may reference the CLI for documentation/context but NOT as the execution method.
      const lines = content.split('\n');
      const executionLines = lines.filter(
        (l) =>
          l.includes('specweave auto') &&
          !l.startsWith('#') &&
          !l.includes('CLI users') &&
          !l.includes('terminal') &&
          !l.includes('legacy') &&
          !l.includes('note') &&
          !l.includes('Note')
      );

      // Find lines that are actual execution instructions (in code blocks or steps)
      const cliExecutionInstructions = executionLines.filter(
        (l) =>
          l.trim().startsWith('specweave auto') ||
          l.trim().startsWith('```') ||
          l.includes('Execute the command') ||
          l.includes('Run:')
      );

      expect(cliExecutionInstructions.length).toBe(0);
    });
  });

  describe('self-sufficient session setup', () => {
    it('should instruct writing auto-mode.json directly via Write tool', () => {
      // The skill must tell the LLM to create the session marker using Write
      expect(content).toContain('auto-mode.json');
      // Should reference the Write tool for creating the marker
      expect(content).toMatch(/[Ww]rite.*auto-mode\.json|auto-mode\.json.*[Ww]rite/s);
    });

    it('should document the session marker JSON schema', () => {
      // The skill must include the schema so the LLM knows what to write
      expect(content).toContain('"active"');
      expect(content).toContain('"incrementIds"');
      expect(content).toContain('"successCriteria"');
    });

    it('should instruct reading metadata.json for increment discovery', () => {
      expect(content).toContain('metadata.json');
    });

    it('should instruct activating increments via Edit tool', () => {
      // Should tell LLM to edit metadata.json to set status to "active"
      expect(content).toMatch(/[Ee]dit.*metadata|metadata.*status.*active/s);
    });
  });

  describe('quality flag handling', () => {
    it('should map --tests to tests_pass success criterion', () => {
      expect(content).toContain('tests_pass');
    });

    it('should map --build to build_succeeds success criterion', () => {
      expect(content).toContain('build_succeeds');
    });

    it('should document the flag-to-criterion mapping', () => {
      // The skill must include a mapping table or instructions
      // so quality flags get properly written to auto-mode.json
      expect(content).toContain('successCriteria');
    });
  });
});
