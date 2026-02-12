/**
 * Unit Tests: error-formatter
 *
 * Tests for ERROR_MESSAGES factory functions, formatError, throwFormattedError,
 * and formatSimpleError. Verifies correct message structure, severity routing,
 * and console output formatting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions so vi.mock factory can reference them
const { mockError, mockWarn, mockInfo, mockLog } = vi.hoisted(() => ({
  mockError: vi.fn(),
  mockWarn: vi.fn(),
  mockInfo: vi.fn(),
  mockLog: vi.fn(),
}));

vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    error: mockError,
    warn: mockWarn,
    info: mockInfo,
    log: mockLog,
    debug: vi.fn(),
  },
}));

import {
  ERROR_MESSAGES,
  formatError,
  throwFormattedError,
  formatSimpleError,
  type FormattedError,
} from '../../../src/utils/error-formatter.js';

describe('error-formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── ERROR_MESSAGES factories ───────────────────────────────────

  describe('ERROR_MESSAGES', () => {
    describe('INCREMENT_NOT_FOUND', () => {
      it('should return a FormattedError with the id in the title', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042');
        expect(result.title).toContain('0042');
      });

      it('should have a description', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042');
        expect(result.description).toBeTruthy();
      });

      it('should have suggestions', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042');
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_FOUND('0042');
        expect(result.relatedCommands).toBeDefined();
        expect(result.relatedCommands!.length).toBeGreaterThan(0);
      });
    });

    describe('SPEC_NOT_FOUND', () => {
      it('should return a FormattedError with the incrementId in the description', () => {
        const result = ERROR_MESSAGES.SPEC_NOT_FOUND('0007');
        expect(result.description).toContain('0007');
      });

      it('should have title about spec.md', () => {
        const result = ERROR_MESSAGES.SPEC_NOT_FOUND('0007');
        expect(result.title).toContain('spec.md');
      });

      it('should have suggestions', () => {
        const result = ERROR_MESSAGES.SPEC_NOT_FOUND('0007');
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.SPEC_NOT_FOUND('0007');
        expect(result.relatedCommands).toBeDefined();
      });
    });

    describe('WRONG_COMMAND_FOR_NEW_INCREMENT', () => {
      it('should return a FormattedError with title referencing /sw:plan', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();
        expect(result.title).toContain('/sw:plan');
      });

      it('should have a description', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();
        expect(result.description).toBeTruthy();
      });

      it('should have suggestions', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should have an example', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();
        expect(result.example).toBeDefined();
        expect(result.example).toContain('/sw:increment');
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_NEW_INCREMENT();
        expect(result.relatedCommands).toBeDefined();
      });
    });

    describe('WRONG_COMMAND_FOR_EXISTING_INCREMENT', () => {
      it('should return a FormattedError with the incrementId in title/description', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_EXISTING_INCREMENT('0010');
        expect(result.description).toContain('0010');
      });

      it('should have title referencing /sw:increment', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_EXISTING_INCREMENT('0010');
        expect(result.title).toContain('/sw:increment');
      });

      it('should have suggestions referencing /sw:plan and /sw:do', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_EXISTING_INCREMENT('0010');
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('/sw:plan');
        expect(suggestionsJoined).toContain('/sw:do');
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.WRONG_COMMAND_FOR_EXISTING_INCREMENT('0010');
        expect(result.relatedCommands).toBeDefined();
      });
    });

    describe('INTERNAL_SKILL_DIRECT_CALL', () => {
      it('should return a FormattedError with the skillName in the title', () => {
        const result = ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL('_internal-plan', ['/sw:increment']);
        expect(result.title).toContain('_internal-plan');
      });

      it('should include allowed callers in suggestions', () => {
        const callers = ['/sw:increment', '/sw:plan'];
        const result = ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL('_internal-plan', callers);
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('/sw:increment');
        expect(suggestionsJoined).toContain('/sw:plan');
      });

      it('should set relatedCommands to the allowedCallers', () => {
        const callers = ['/sw:increment', '/sw:plan'];
        const result = ERROR_MESSAGES.INTERNAL_SKILL_DIRECT_CALL('_internal-plan', callers);
        expect(result.relatedCommands).toEqual(callers);
      });
    });

    describe('INVALID_INCREMENT_NUMBER', () => {
      it('should return a FormattedError with the expected format in the description', () => {
        const result = ERROR_MESSAGES.INVALID_INCREMENT_NUMBER('42', '0042');
        expect(result.description).toContain('0042');
      });

      it('should have suggestions referencing the expected number', () => {
        const result = ERROR_MESSAGES.INVALID_INCREMENT_NUMBER('42', '0042');
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('0042');
      });

      it('should not have relatedCommands', () => {
        const result = ERROR_MESSAGES.INVALID_INCREMENT_NUMBER('42', '0042');
        expect(result.relatedCommands).toBeUndefined();
      });
    });

    describe('DUPLICATE_INCREMENT', () => {
      it('should return a FormattedError with the id in the title', () => {
        const result = ERROR_MESSAGES.DUPLICATE_INCREMENT('0005');
        expect(result.title).toContain('0005');
      });

      it('should have suggestions', () => {
        const result = ERROR_MESSAGES.DUPLICATE_INCREMENT('0005');
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.DUPLICATE_INCREMENT('0005');
        expect(result.relatedCommands).toBeDefined();
        expect(result.relatedCommands).toContain('/sw:status');
      });
    });

    describe('INVALID_STATUS_TRANSITION', () => {
      it('should return a FormattedError with from and to in the title', () => {
        const result = ERROR_MESSAGES.INVALID_STATUS_TRANSITION('planning', 'archived');
        expect(result.title).toContain('planning');
        expect(result.title).toContain('archived');
      });

      it('should have suggestions referencing the from status', () => {
        const result = ERROR_MESSAGES.INVALID_STATUS_TRANSITION('planning', 'archived');
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('planning');
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.INVALID_STATUS_TRANSITION('planning', 'archived');
        expect(result.relatedCommands).toBeDefined();
      });
    });

    describe('INCREMENT_NOT_READY', () => {
      it('should return a FormattedError with the incrementId in the title', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_READY('0003', 'Tasks incomplete');
        expect(result.title).toContain('0003');
      });

      it('should use the reason as the description', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_READY('0003', 'Tasks incomplete');
        expect(result.description).toBe('Tasks incomplete');
      });

      it('should have suggestions referencing the incrementId', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_READY('0003', 'Tasks incomplete');
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('0003');
      });

      it('should have relatedCommands', () => {
        const result = ERROR_MESSAGES.INCREMENT_NOT_READY('0003', 'Tasks incomplete');
        expect(result.relatedCommands).toBeDefined();
      });
    });

    describe('MISSING_REQUIRED_ARG', () => {
      it('should return a FormattedError with the argName in the title', () => {
        const result = ERROR_MESSAGES.MISSING_REQUIRED_ARG('incrementId', '/sw:do');
        expect(result.title).toContain('incrementId');
      });

      it('should have suggestions referencing the command', () => {
        const result = ERROR_MESSAGES.MISSING_REQUIRED_ARG('incrementId', '/sw:do');
        expect(result.suggestions).toBeDefined();
        const suggestionsJoined = result.suggestions!.join(' ');
        expect(suggestionsJoined).toContain('/sw:do');
      });

      it('should not have relatedCommands', () => {
        const result = ERROR_MESSAGES.MISSING_REQUIRED_ARG('incrementId', '/sw:do');
        expect(result.relatedCommands).toBeUndefined();
      });
    });
  });

  // ─── formatError ────────────────────────────────────────────────

  describe('formatError', () => {
    const minimalError: FormattedError = {
      title: 'Something went wrong',
      description: 'A detailed explanation.',
    };

    const fullError: FormattedError = {
      title: 'Full error',
      description: 'Full description.',
      suggestions: ['Try this', 'Or that'],
      relatedCommands: ['/sw:status', '/sw:do'],
      example: '/sw:do 0001',
    };

    describe('severity routing', () => {
      it('should use consoleLogger.error for severity "error" (default)', () => {
        formatError(minimalError);
        expect(mockError).toHaveBeenCalled();
        expect(mockWarn).not.toHaveBeenCalled();
        expect(mockInfo).not.toHaveBeenCalled();
      });

      it('should use consoleLogger.error when severity is explicitly "error"', () => {
        formatError(minimalError, 'error');
        expect(mockError).toHaveBeenCalled();
      });

      it('should use consoleLogger.warn for severity "warning"', () => {
        formatError(minimalError, 'warning');
        expect(mockWarn).toHaveBeenCalled();
        expect(mockError).not.toHaveBeenCalled();
      });

      it('should use consoleLogger.info for severity "info"', () => {
        formatError(minimalError, 'info');
        expect(mockInfo).toHaveBeenCalled();
        expect(mockError).not.toHaveBeenCalled();
      });
    });

    describe('title output', () => {
      it('should log title with error icon for error severity', () => {
        formatError(minimalError, 'error');
        const firstCall = mockError.mock.calls[0][0] as string;
        expect(firstCall).toContain('Something went wrong');
      });

      it('should log title with warning icon for warning severity', () => {
        formatError(minimalError, 'warning');
        const firstCall = mockWarn.mock.calls[0][0] as string;
        expect(firstCall).toContain('Something went wrong');
      });

      it('should log title with info icon for info severity', () => {
        formatError(minimalError, 'info');
        const firstCall = mockInfo.mock.calls[0][0] as string;
        expect(firstCall).toContain('Something went wrong');
      });
    });

    describe('description output', () => {
      it('should log the description', () => {
        formatError(minimalError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        expect(allCalls).toContain('A detailed explanation.');
      });
    });

    describe('suggestions output', () => {
      it('should log suggestions header with light bulb emoji', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasSuggestionsHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Suggestions')
        );
        expect(hasSuggestionsHeader).toBe(true);
      });

      it('should log each suggestion', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const allText = allCalls.join('\n');
        expect(allText).toContain('Try this');
        expect(allText).toContain('Or that');
      });

      it('should not log suggestions section when suggestions are absent', () => {
        formatError(minimalError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasSuggestionsHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Suggestions')
        );
        expect(hasSuggestionsHeader).toBe(false);
      });
    });

    describe('relatedCommands output', () => {
      it('should log related commands header with book emoji', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasRelatedHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Related commands')
        );
        expect(hasRelatedHeader).toBe(true);
      });

      it('should log each related command', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const allText = allCalls.join('\n');
        expect(allText).toContain('/sw:status');
        expect(allText).toContain('/sw:do');
      });

      it('should not log relatedCommands section when absent', () => {
        formatError(minimalError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasRelatedHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Related commands')
        );
        expect(hasRelatedHeader).toBe(false);
      });
    });

    describe('example output', () => {
      it('should log example header with pencil emoji', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasExampleHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Example')
        );
        expect(hasExampleHeader).toBe(true);
      });

      it('should log the example text', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const allText = allCalls.join('\n');
        expect(allText).toContain('/sw:do 0001');
      });

      it('should not log example section when absent', () => {
        formatError(minimalError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const hasExampleHeader = allCalls.some(
          (call: string) => typeof call === 'string' && call.includes('Example')
        );
        expect(hasExampleHeader).toBe(false);
      });
    });

    describe('empty blank lines', () => {
      it('should log empty strings as separators between sections', () => {
        formatError(fullError, 'error');
        const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
        const emptyLines = allCalls.filter((call: string) => call === '');
        // After title, after description, after suggestions, after relatedCommands, after example
        expect(emptyLines.length).toBe(5);
      });
    });
  });

  // ─── throwFormattedError ────────────────────────────────────────

  describe('throwFormattedError', () => {
    it('should throw an Error with the title as the message', () => {
      const error: FormattedError = {
        title: 'Increment not found',
        description: 'Does not exist.',
      };

      expect(() => throwFormattedError(error)).toThrow('Increment not found');
    });

    it('should throw an instance of Error', () => {
      const error: FormattedError = {
        title: 'Some error',
        description: 'Details.',
      };

      expect(() => throwFormattedError(error)).toThrow(Error);
    });

    it('should call formatError before throwing', () => {
      const error: FormattedError = {
        title: 'Pre-throw check',
        description: 'Should format first.',
      };

      try {
        throwFormattedError(error);
      } catch {
        // expected
      }

      // formatError was called with severity 'error', so mockError should have been invoked
      expect(mockError).toHaveBeenCalled();
      const firstCall = mockError.mock.calls[0][0] as string;
      expect(firstCall).toContain('Pre-throw check');
    });

    it('should call formatError with error severity', () => {
      const error: FormattedError = {
        title: 'Severity check',
        description: 'Should use error severity.',
        suggestions: ['A suggestion'],
      };

      try {
        throwFormattedError(error);
      } catch {
        // expected
      }

      // error severity uses mockError, not mockWarn or mockInfo
      expect(mockError).toHaveBeenCalled();
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockInfo).not.toHaveBeenCalled();
    });
  });

  // ─── formatSimpleError ──────────────────────────────────────────

  describe('formatSimpleError', () => {
    it('should delegate to formatError with a constructed FormattedError', () => {
      formatSimpleError('Custom title', 'Custom description');

      expect(mockError).toHaveBeenCalled();
      const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
      const allText = allCalls.join('\n');
      expect(allText).toContain('Custom title');
      expect(allText).toContain('Custom description');
    });

    it('should pass suggestions when provided', () => {
      formatSimpleError('Title', 'Desc', ['Suggestion A', 'Suggestion B']);

      const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
      const allText = allCalls.join('\n');
      expect(allText).toContain('Suggestion A');
      expect(allText).toContain('Suggestion B');
    });

    it('should not log suggestions section when suggestions are omitted', () => {
      formatSimpleError('Title', 'Desc');

      const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
      const hasSuggestionsHeader = allCalls.some(
        (call: string) => typeof call === 'string' && call.includes('Suggestions')
      );
      expect(hasSuggestionsHeader).toBe(false);
    });

    it('should not log suggestions section when suggestions array is empty', () => {
      formatSimpleError('Title', 'Desc', []);

      const allCalls = mockError.mock.calls.map((c: any[]) => c[0]);
      const hasSuggestionsHeader = allCalls.some(
        (call: string) => typeof call === 'string' && call.includes('Suggestions')
      );
      expect(hasSuggestionsHeader).toBe(false);
    });

    it('should use error severity by default', () => {
      formatSimpleError('Title', 'Desc');

      expect(mockError).toHaveBeenCalled();
      expect(mockWarn).not.toHaveBeenCalled();
      expect(mockInfo).not.toHaveBeenCalled();
    });
  });
});
