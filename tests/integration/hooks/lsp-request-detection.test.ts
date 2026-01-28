/**
 * Integration tests for explicit LSP request detection
 *
 * Tests that user-prompt-submit.sh detects when users explicitly ask to
 * "use LSP" for tasks like "find references" and explains the limitations.
 *
 * @increment 0176-lsp-plugin-dependency-auto-install
 * @task T-007 [RED]
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LSP explicit request detection', () => {
  const userPromptSubmitScript = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let scriptContent: string;

  beforeAll(() => {
    scriptContent = fs.readFileSync(userPromptSubmitScript, 'utf-8');
  });

  describe('LSP request pattern detection', () => {
    /**
     * Patterns that should trigger LSP explanation
     */
    const LSP_TRIGGER_PATTERNS = [
      'use LSP',
      'with LSP',
      'via LSP',
      'LSP findReferences',
      'LSP goToDefinition',
      'LSP hover',
      'find references with LSP',
      'find all usages with LSP',
    ];

    it('should have LSP request detection code', () => {
      // The script should contain logic to detect LSP requests
      expect(scriptContent).toMatch(/LSP/i);
      // Should have specific detection for "use LSP" patterns
      expect(scriptContent).toMatch(/(use|with|via)\s+(LSP|lsp)/i);
    });

    it('should detect "use LSP" pattern', () => {
      // Look for regex pattern that matches "use LSP"
      expect(scriptContent).toMatch(/use.*LSP|LSP.*use/i);
    });

    it('should detect "with LSP" pattern', () => {
      expect(scriptContent).toMatch(/with.*LSP|LSP.*with/i);
    });

    it('should detect LSP operation patterns (findReferences, goToDefinition)', () => {
      // Should detect patterns like "LSP findReferences" or "LSP goToDefinition"
      expect(scriptContent).toMatch(/LSP.*(find|goto|hover|definition|references)/i);
    });
  });

  describe('LSP explanation message', () => {
    it('should contain explanation about LSP limitations', () => {
      // The script should explain that LSP provides background enhancement
      expect(scriptContent).toMatch(/LSP.*background|background.*LSP/i);
    });

    it('should mention that LSP does not expose explicit tools', () => {
      // Should explain there are no explicit tools
      expect(scriptContent).toMatch(/not.*tool|no.*explicit|transparent|automatic/i);
    });

    it('should suggest alternatives', () => {
      // Should suggest Grep or IDE as alternatives
      expect(scriptContent).toMatch(/Grep|IDE|F12|Ctrl.*Click/i);
    });
  });

  describe('detection function structure', () => {
    it('should have a function or section for LSP detection', () => {
      // Should have identifiable section for LSP detection
      expect(scriptContent).toMatch(/LSP.*detect|detect.*LSP|explicit.*LSP/i);
    });

    it('should output explanation via output_approve_with_context function', () => {
      // The explanation should be output via output_approve_with_context function
      // Which internally uses additionalContext format
      // Pattern: The LSP_EXPLICIT_REQUEST_MSG variable feeds into FINAL_MESSAGE
      // which then gets passed to output_approve_with_context
      expect(scriptContent).toContain('LSP_EXPLICIT_REQUEST_MSG');
      expect(scriptContent).toMatch(/FINAL_MESSAGE.*LSP_EXPLICIT_REQUEST_MSG|LSP_EXPLICIT_REQUEST_MSG.*FINAL_MESSAGE/s);
    });
  });
});
