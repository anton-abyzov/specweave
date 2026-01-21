import { describe, it, expect, vi } from 'vitest';
import {
  ERROR_MESSAGES,
  formatError,
  throwFormattedError,
  formatSimpleError,
  type FormattedError
} from '../../src/utils/error-formatter.js';

describe('error-formatter', () => {
  describe('ERROR_MESSAGES', () => {
    it('generates INCREMENT_NOT_FOUND error', () => {
      const error = ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042');

      expect(error.title).toContain('0042');
      expect(error.title).toContain('not found');
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions!.length).toBeGreaterThan(0);
      expect(error.relatedCommands).toContain('/sw:status');
    });

    it('generates SPEC_NOT_FOUND error', () => {
      const error = ERROR_MESSAGES.SPEC_NOT_FOUND('0042');

      expect(error.title).toContain('spec.md');
      expect(error.description).toContain('0042');
      expect(error.suggestions).toBeDefined();
      expect(error.relatedCommands).toContain('/sw:increment');
    });

    it('generates WRONG_COMMAND_FOR_NEW_INCREMENT error', () => {
      const error = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();

      expect(error.title).toContain('/sw:plan');
      expect(error.title).toContain('EXISTING');
      expect(error.description).toContain('/sw:increment');
      expect(error.example).toBeDefined();
      expect(error.example).toContain('/sw:increment');
    });

    it('generates WRONG_COMMAND_FOR_EXISTING_INCREMENT error', () => {
      const error = ERROR_MESSAGES.WRONG_COMMAND_FOR_EXISTING_INCREMENT('0042');

      expect(error.title).toContain('/sw:increment');
      expect(error.title).toContain('NEW');
      expect(error.description).toContain('0042');
      expect(error.relatedCommands).toContain('/sw:plan');
    });

    it('generates INTERNAL_SKILL_DIRECT_CALL error', () => {
      const error = ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL('increment-planner', [
        '/sw:increment',
        '/sw:plan'
      ]);

      expect(error.title).toContain('increment-planner');
      expect(error.title).toContain('internal');
      expect(error.suggestions).toBeDefined();
      expect(error.relatedCommands).toHaveLength(2);
      expect(error.relatedCommands).toContain('/sw:increment');
    });

    it('generates INVALID_INCREMENT_NUMBER error', () => {
      const error = ERROR_MESSAGES.INVALID_INCREMENT_NUMBER('42', '0042');

      expect(error.title).toContain('Invalid');
      expect(error.description).toContain('4 digits');
      expect(error.description).toContain('0042');
      expect(error.suggestions).toBeDefined();
    });

    it('generates DUPLICATE_INCREMENT error', () => {
      const error = ERROR_MESSAGES.DUPLICATE_INCREMENT('0042');

      expect(error.title).toContain('0042');
      expect(error.title).toContain('exists');
      expect(error.relatedCommands).toContain('/sw:status');
    });

    it('generates INVALID_STATUS_TRANSITION error', () => {
      const error = ERROR_MESSAGES.INVALID_STATUS_TRANSITION('backlog', 'completed');

      expect(error.title).toContain('backlog');
      expect(error.title).toContain('completed');
      expect(error.relatedCommands).toContain('/sw:workflow');
    });

    it('generates INCREMENT_NOT_READY error', () => {
      const error = ERROR_MESSAGES.INCREMENT_NOT_READY('0042', 'All tasks must be completed');

      expect(error.title).toContain('0042');
      expect(error.title).toContain('not ready');
      expect(error.description).toContain('All tasks must be completed');
      expect(error.relatedCommands).toContain('/sw:validate');
    });

    it('generates MISSING_REQUIRED_ARG error', () => {
      const error = ERROR_MESSAGES.MISSING_REQUIRED_ARG('increment-id', '/sw:done');

      expect(error.title).toContain('increment-id');
      expect(error.description).toContain('required');
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions![0]).toContain('/sw:done');
    });
  });

  describe('formatError', () => {
    it('formats error messages without throwing', () => {
      const error: FormattedError = {
        title: 'Test Error',
        description: 'This is a test',
        suggestions: ['Try this', 'Or this'],
        relatedCommands: ['/sw:test']
      };

      // Should not throw
      expect(() => formatError(error)).not.toThrow();
    });

    it('handles errors with minimal fields', () => {
      const error: FormattedError = {
        title: 'Simple Error',
        description: 'No extras'
      };

      expect(() => formatError(error)).not.toThrow();
    });

    it('handles different severity levels', () => {
      const error: FormattedError = {
        title: 'Test',
        description: 'Test description'
      };

      expect(() => formatError(error, 'error')).not.toThrow();
      expect(() => formatError(error, 'warning')).not.toThrow();
      expect(() => formatError(error, 'info')).not.toThrow();
    });
  });

  describe('throwFormattedError', () => {
    it('throws error with formatted message', () => {
      const error: FormattedError = {
        title: 'Fatal Error',
        description: 'This should throw'
      };

      expect(() => throwFormattedError(error)).toThrow('Fatal Error');
    });
  });

  describe('formatSimpleError', () => {
    it('formats simple error with suggestions', () => {
      expect(() =>
        formatSimpleError('Simple Title', 'Simple description', ['Suggestion 1', 'Suggestion 2'])
      ).not.toThrow();
    });

    it('formats simple error without suggestions', () => {
      expect(() => formatSimpleError('Simple Title', 'Simple description')).not.toThrow();
    });
  });

  describe('Error message quality', () => {
    it('all error messages have actionable suggestions', () => {
      const errors = [
        ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042'),
        ERROR_MESSAGES.SPEC_NOT_FOUND('0042'),
        ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT(),
        ERROR_MESSAGES.INVALID_INCREMENT_NUMBER('42', '0042')
      ];

      errors.forEach(error => {
        expect(error.suggestions).toBeDefined();
        expect(error.suggestions!.length).toBeGreaterThan(0);
      });
    });

    it('all error messages have clear titles', () => {
      const errors = [
        ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042'),
        ERROR_MESSAGES.SPEC_NOT_FOUND('0042'),
        ERROR_MESSAGES.DUPLICATE_INCREMENT('0042')
      ];

      errors.forEach(error => {
        expect(error.title.length).toBeGreaterThan(0);
        expect(error.title.length).toBeLessThan(100); // Not too long
      });
    });
  });
});
