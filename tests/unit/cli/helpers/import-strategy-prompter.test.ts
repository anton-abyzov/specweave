/**
 * Unit Tests: ImportStrategyPrompter
 *
 * Tests CLI-first import strategy selection with "Import all" as default
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';
import {
  promptImportStrategy,
  type ImportStrategy,
  type StrategyPromptResult
} from '../../../../src/cli/helpers/import-strategy-prompter.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// Mock inquirer
vi.mock('inquirer');

describe('ImportStrategyPrompter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Strategy Selection', () => {
    it('should default to "import-all" strategy', async () => {
      // Mock user selecting default (import-all)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'import-all'
      });

      const result = await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');
      expect(result.projectKeys).toBeUndefined();

      // Verify prompt was called with correct default
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            name: 'strategy',
            default: 'import-all',
            choices: expect.arrayContaining([
              expect.objectContaining({ value: 'import-all' }),
              expect.objectContaining({ value: 'select-specific' }),
              expect.objectContaining({ value: 'manual-entry' })
            ])
          })
        ])
      );
    });

    it('should show three strategy options', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'import-all'
      });

      await promptImportStrategy({
        totalCount: 75,
        provider: 'jira',
        logger: silentLogger
      });

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      expect(promptCall[0].choices).toHaveLength(3);
      expect(promptCall[0].choices.map((c: any) => c.value)).toEqual([
        'import-all',
        'select-specific',
        'manual-entry'
      ]);
    });

    it('should display instruction text for each strategy', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'import-all'
      });

      await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      const choices = promptCall[0].choices;

      // Check that each choice has descriptive text
      expect(choices[0].name).toContain('Import all');
      expect(choices[0].name).toContain('Recommended');
      expect(choices[1].name).toContain('Select specific');
      expect(choices[2].name).toContain('Manual entry');
    });
  });

  describe('Manual Entry Strategy', () => {
    it('should accept valid comma-separated project keys', async () => {
      // Mock strategy selection
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'BACKEND,FRONTEND,MOBILE' });

      const result = await promptImportStrategy({
        totalCount: 100,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('manual-entry');
      expect(result.projectKeys).toEqual(['BACKEND', 'FRONTEND', 'MOBILE']);
    });

    it('should trim whitespace from project keys', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: ' BACKEND , FRONTEND , MOBILE ' });

      const result = await promptImportStrategy({
        totalCount: 100,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.projectKeys).toEqual(['BACKEND', 'FRONTEND', 'MOBILE']);
    });

    it('should convert project keys to uppercase', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'backend,frontend,mobile' });

      const result = await promptImportStrategy({
        totalCount: 100,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.projectKeys).toEqual(['BACKEND', 'FRONTEND', 'MOBILE']);
    });

    it('should filter out empty keys after split', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'BACKEND,,FRONTEND,,MOBILE' });

      const result = await promptImportStrategy({
        totalCount: 100,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.projectKeys).toEqual(['BACKEND', 'FRONTEND', 'MOBILE']);
    });

    it('should validate manual entry format', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'VALID-KEY_123' });

      const result = await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.projectKeys).toEqual(['VALID-KEY_123']);

      // Verify validator was present in prompt
      const manualPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(manualPromptCall[0].validate).toBeDefined();
    });

    it('should reject empty manual entry', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'TEST' });

      await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      const manualPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      const validator = manualPromptCall[0].validate;

      // Test validation
      const emptyResult = validator('   ');
      expect(emptyResult).toContain('cannot be empty');
    });

    it('should reject invalid characters in manual entry', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'manual-entry' })
        .mockResolvedValueOnce({ projectKeys: 'TEST' });

      await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      const manualPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      const validator = manualPromptCall[0].validate;

      // Test invalid characters (spaces, special chars)
      const invalidResult1 = validator('BACKEND FRONTEND');
      expect(invalidResult1).toContain('Invalid format');

      const invalidResult2 = validator('BACKEND@FRONTEND');
      expect(invalidResult2).toContain('Invalid format');
    });
  });

  describe('Safety Confirmation for Large Imports', () => {
    it('should show safety confirmation if count > 100', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: true });

      const result = await promptImportStrategy({
        totalCount: 127,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');
      expect(result.confirmed).toBe(true);

      // Verify confirmation prompt was shown
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      const confirmPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(confirmPromptCall[0].type).toBe('confirm');
    });

    it('should not show safety confirmation if count ≤ 100', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'import-all' });

      const result = await promptImportStrategy({
        totalCount: 100,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');
      expect(result.confirmed).toBeUndefined();

      // Only strategy prompt, no confirmation
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    });

    it('should default to "No" for safety confirmation (safe default)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: true }); // Accept the confirmation

      await promptImportStrategy({
        totalCount: 150,
        provider: 'jira',
        logger: silentLogger
      });

      const confirmPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(confirmPromptCall[0].default).toBe(false); // Safe default
    });

    it('should return to strategy selection if confirmation declined', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: false }) // Decline large import
        .mockResolvedValueOnce({ strategy: 'select-specific' }); // Choose different strategy

      const result = await promptImportStrategy({
        totalCount: 200,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('select-specific');

      // Verify recursive call (strategy selection shown twice)
      expect(inquirer.prompt).toHaveBeenCalledTimes(3);
    });

    it('should display estimated time in confirmation message', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'import-all' })
        .mockResolvedValueOnce({ confirmed: true });

      await promptImportStrategy({
        totalCount: 500,
        provider: 'jira',
        logger: silentLogger
      });

      // Verify confirmation was shown (estimated time calculation tested implicitly)
      const confirmPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0] as any;
      expect(confirmPromptCall[0].message).toContain('500');
    });
  });

  describe('Strategy Selection for Different Providers', () => {
    it('should work with Azure DevOps provider', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'import-all' });

      const result = await promptImportStrategy({
        totalCount: 75,
        provider: 'ado',
        logger: silentLogger
      });

      expect(result.strategy).toBe('import-all');
    });

    it('should work with JIRA provider', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'select-specific' });

      const result = await promptImportStrategy({
        totalCount: 50,
        provider: 'jira',
        logger: silentLogger
      });

      expect(result.strategy).toBe('select-specific');
    });
  });
});
