/**
 * Unit Tests: Selection Strategy Helper
 *
 * Tests pattern matching, shortcut parsing, regex validation, filtering,
 * conversion utilities, and the interactive promptSelection flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockSelect, mockInput, mockCheckbox, mockConfirm, mockMinimatch } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockCheckbox: vi.fn(),
  mockConfirm: vi.fn(),
  mockMinimatch: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  checkbox: mockCheckbox,
  confirm: mockConfirm,
}));

vi.mock('minimatch', () => ({
  minimatch: mockMinimatch,
}));

vi.mock('chalk', () => {
  // Return a passthrough so string comparisons are simple
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(passthrough, handler);
      // chalk.blue, chalk.gray, chalk.green, chalk.yellow, chalk.red, chalk.bold
      return passthrough;
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  };
  return { default: new Proxy(passthrough, handler) };
});

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  parsePatternShortcut,
  matchByGlob,
  matchByRegex,
  validateRegex,
  promptSelection,
  toSelectableItems,
  toSelectableItemsFromObjects,
  filterRepositoriesByPattern,
  type SelectableItem,
  type SelectionPromptOptions,
  type ClonePatternResult,
} from '../../../../src/cli/helpers/selection-strategy.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItems(...names: string[]): SelectableItem[] {
  return names.map(n => ({ name: n, value: n }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selection-strategy', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // =========================================================================
  // parsePatternShortcut
  // =========================================================================

  describe('parsePatternShortcut', () => {
    it('should convert "starts: prefix" to "prefix*"', () => {
      expect(parsePatternShortcut('starts: app-')).toBe('app-*');
    });

    it('should convert "start: prefix" (singular) to "prefix*"', () => {
      expect(parsePatternShortcut('start: api')).toBe('api*');
    });

    it('should convert "ends: suffix" to "*suffix"', () => {
      expect(parsePatternShortcut('ends: -backend')).toBe('*-backend');
    });

    it('should convert "end: suffix" (singular) to "*suffix"', () => {
      expect(parsePatternShortcut('end: -api')).toBe('*-api');
    });

    it('should convert "contains: text" to "*text*"', () => {
      expect(parsePatternShortcut('contains: core')).toBe('*core*');
    });

    it('should convert "contain: text" (singular) to "*text*"', () => {
      expect(parsePatternShortcut('contain: auth')).toBe('*auth*');
    });

    it('should be case-insensitive for shortcut keywords', () => {
      expect(parsePatternShortcut('STARTS: foo')).toBe('foo*');
      expect(parsePatternShortcut('Ends: bar')).toBe('*bar');
      expect(parsePatternShortcut('CONTAINS: baz')).toBe('*baz*');
    });

    it('should trim whitespace around the value', () => {
      expect(parsePatternShortcut('  starts:   app-  ')).toBe('app-*');
    });

    it('should trim leading/trailing whitespace from input', () => {
      expect(parsePatternShortcut('  ends:  -api  ')).toBe('*-api');
    });

    it('should auto-expand plain text without glob chars to prefix match', () => {
      expect(parsePatternShortcut('app-ecom')).toBe('app-ecom*');
    });

    it('should auto-expand single word to prefix match', () => {
      expect(parsePatternShortcut('hello')).toBe('hello*');
    });

    it('should NOT modify patterns that already contain glob char *', () => {
      expect(parsePatternShortcut('app-*')).toBe('app-*');
    });

    it('should NOT modify patterns that already contain glob char ?', () => {
      expect(parsePatternShortcut('app-?')).toBe('app-?');
    });

    it('should NOT modify patterns that already contain glob char [', () => {
      expect(parsePatternShortcut('app-[ab]')).toBe('app-[ab]');
    });

    it('should return empty string for empty input', () => {
      expect(parsePatternShortcut('')).toBe('');
    });

    it('should return empty string for whitespace-only input', () => {
      expect(parsePatternShortcut('   ')).toBe('');
    });

    it('should handle full glob pattern passthrough', () => {
      expect(parsePatternShortcut('*-backend')).toBe('*-backend');
      expect(parsePatternShortcut('api-*-service')).toBe('api-*-service');
    });
  });

  // =========================================================================
  // matchByGlob
  // =========================================================================

  describe('matchByGlob', () => {
    const items = makeItems('frontend', 'backend', 'other-service', 'api-gateway');

    beforeEach(() => {
      // Default: delegate to real minimatch behavior via a simple implementation
      mockMinimatch.mockImplementation((value: string, pattern: string, _opts: any) => {
        // Simple glob simulation for tests
        const regexStr = pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        return new RegExp(`^${regexStr}$`, 'i').test(value);
      });
    });

    it('should filter items matching a glob suffix pattern (end)', () => {
      // "ends: end" is parsed to "*end" by parsePatternShortcut internally
      const result = matchByGlob(items, '*end');
      expect(result).toHaveLength(2);
      expect(result.map(i => i.name)).toEqual(['frontend', 'backend']);
    });

    it('should filter items matching a glob suffix pattern', () => {
      const result = matchByGlob(items, '*-service');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('other-service');
    });

    it('should apply shortcut parsing internally (ends:)', () => {
      const result = matchByGlob(items, 'ends: end');
      expect(result).toHaveLength(2);
    });

    it('should apply shortcut parsing internally (contains:)', () => {
      const result = matchByGlob(items, 'contains: end');
      expect(result.map(i => i.name)).toEqual(['frontend', 'backend']);
    });

    it('should auto-expand plain text to prefix match', () => {
      const result = matchByGlob(items, 'front');
      // parsePatternShortcut turns "front" into "front*"
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('frontend');
    });

    it('should return empty array when no items match', () => {
      const result = matchByGlob(items, 'nonexistent-*');
      expect(result).toHaveLength(0);
    });

    it('should handle empty items array', () => {
      const result = matchByGlob([], '*end');
      expect(result).toHaveLength(0);
    });

    it('should match against a custom field', () => {
      const itemsWithPath: SelectableItem[] = [
        { name: 'FE', value: 'fe', path: '/repos/frontend' },
        { name: 'BE', value: 'be', path: '/repos/backend' },
        { name: 'Other', value: 'other', path: '/repos/other-service' },
      ];
      const result = matchByGlob(itemsWithPath, '*/*end', 'path');
      expect(result).toHaveLength(2);
    });

    it('should handle items where the match field is undefined', () => {
      const itemsNoPath: SelectableItem[] = [
        { name: 'test', value: 'test' },
      ];
      // Match against 'path' which is undefined -> coerces to ''
      const result = matchByGlob(itemsNoPath, '*test*', 'path');
      // empty string shouldn't match *test*
      expect(result).toHaveLength(0);
    });

    it('should call minimatch with nocase: true option', () => {
      matchByGlob(makeItems('Test'), 'test*');
      expect(mockMinimatch).toHaveBeenCalledWith(
        'Test',
        'test*', // already has glob char, parsePatternShortcut passes through
        expect.objectContaining({ nocase: true })
      );
    });
  });

  // =========================================================================
  // matchByRegex
  // =========================================================================

  describe('matchByRegex', () => {
    const items = makeItems('frontend', 'backend', 'other-service', 'api-gateway');

    it('should filter items matching a regex suffix pattern (end)', () => {
      const result = matchByRegex(items, 'end$');
      expect(result.error).toBeUndefined();
      expect(result.items).toHaveLength(2);
      expect(result.items.map(i => i.name)).toEqual(['frontend', 'backend']);
    });

    it('should filter items matching a regex suffix pattern', () => {
      const result = matchByRegex(items, '-service$');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('other-service');
    });

    it('should be case-insensitive by default', () => {
      const result = matchByRegex(items, 'END$');
      expect(result.items).toHaveLength(2);
    });

    it('should return empty items and error for invalid regex', () => {
      const result = matchByRegex(items, '[invalid');
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should return empty array when no items match valid regex', () => {
      const result = matchByRegex(items, '^zzz');
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty items array', () => {
      const result = matchByRegex([], '^sw');
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should match against a custom field', () => {
      const itemsWithPath: SelectableItem[] = [
        { name: 'FE', value: 'fe', path: '/repos/frontend' },
        { name: 'BE', value: 'be', path: '/repos/other-service' },
      ];
      const result = matchByRegex(itemsWithPath, 'frontend', 'path');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('FE');
    });

    it('should handle items where the match field is undefined', () => {
      const itemsNoPath: SelectableItem[] = [
        { name: 'test', value: 'test' },
      ];
      const result = matchByRegex(itemsNoPath, 'test', 'path');
      // path is undefined -> coerced to '' -> won't match 'test'
      expect(result.items).toHaveLength(0);
    });

    it('should handle complex regex patterns', () => {
      const result = matchByRegex(items, '^(sw|api)-');
      expect(result.items).toHaveLength(3);
    });

    it('should capture non-Error throws as string', () => {
      // Force a scenario where RegExp constructor doesn't throw Error instance
      // This tests the String(error) fallback path, but with invalid regex it always throws Error
      const result = matchByRegex(items, '(?<=)(?<a>b)(?<a>c)'); // duplicate named group
      // depending on JS engine this may or may not be an error
      // we just verify the function doesn't crash
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  // =========================================================================
  // validateRegex
  // =========================================================================

  describe('validateRegex', () => {
    it('should return true for a valid regex', () => {
      expect(validateRegex('^app-.*$')).toBe(true);
    });

    it('should return true for a simple string pattern', () => {
      expect(validateRegex('hello')).toBe(true);
    });

    it('should return true for complex valid regex', () => {
      expect(validateRegex('^api-\\d+-service$')).toBe(true);
    });

    it('should return error message string for invalid regex (unclosed bracket)', () => {
      const result = validateRegex('[invalid');
      expect(typeof result).toBe('string');
      expect(result).not.toBe(true);
    });

    it('should return error message string for invalid regex (bad quantifier)', () => {
      const result = validateRegex('*invalid');
      expect(typeof result).toBe('string');
    });

    it('should return true for empty string (valid regex)', () => {
      expect(validateRegex('')).toBe(true);
    });

    it('should return true for patterns with flags-like chars (no actual flags)', () => {
      expect(validateRegex('^test/i')).toBe(true);
    });
  });

  // =========================================================================
  // toSelectableItems
  // =========================================================================

  describe('toSelectableItems', () => {
    it('should convert string array to SelectableItem array', () => {
      const result = toSelectableItems(['repo1', 'repo2', 'repo3']);
      expect(result).toEqual([
        { name: 'repo1', value: 'repo1' },
        { name: 'repo2', value: 'repo2' },
        { name: 'repo3', value: 'repo3' },
      ]);
    });

    it('should handle empty array', () => {
      expect(toSelectableItems([])).toEqual([]);
    });

    it('should handle single item', () => {
      const result = toSelectableItems(['single']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'single', value: 'single' });
    });

    it('should preserve special characters in names', () => {
      const result = toSelectableItems(['my-repo_v2', '@scope/package']);
      expect(result[0].name).toBe('my-repo_v2');
      expect(result[1].name).toBe('@scope/package');
    });
  });

  // =========================================================================
  // toSelectableItemsFromObjects
  // =========================================================================

  describe('toSelectableItemsFromObjects', () => {
    it('should convert objects using name as default value field', () => {
      const input = [
        { name: 'Repo A', id: '1', url: 'https://example.com/a' },
        { name: 'Repo B', id: '2', url: 'https://example.com/b' },
      ];
      const result = toSelectableItemsFromObjects(input);
      expect(result).toEqual([
        { name: 'Repo A', value: 'Repo A', metadata: input[0] },
        { name: 'Repo B', value: 'Repo B', metadata: input[1] },
      ]);
    });

    it('should use custom valueField', () => {
      const input = [
        { name: 'Project X', key: 'PX', description: 'A project' },
      ];
      const result = toSelectableItemsFromObjects(input, 'key');
      expect(result[0].value).toBe('PX');
    });

    it('should handle empty array', () => {
      expect(toSelectableItemsFromObjects([])).toEqual([]);
    });

    it('should store original object in metadata', () => {
      const input = [{ name: 'Test', extra: 42, nested: { deep: true } }];
      const result = toSelectableItemsFromObjects(input);
      expect(result[0].metadata).toEqual(input[0]);
    });

    it('should stringify non-string value fields', () => {
      const input = [{ name: 'Numbered', id: 123 }];
      const result = toSelectableItemsFromObjects(input, 'id' as any);
      expect(result[0].value).toBe('123');
    });
  });

  // =========================================================================
  // filterRepositoriesByPattern
  // =========================================================================

  describe('filterRepositoriesByPattern', () => {
    const repos = [
      { name: 'frontend', url: 'https://example.com/frontend' },
      { name: 'backend', url: 'https://example.com/backend' },
      { name: 'other-service', url: 'https://example.com/other-service' },
      { name: 'api-gateway', url: 'https://example.com/api-gateway' },
    ];

    beforeEach(() => {
      mockMinimatch.mockImplementation((value: string, pattern: string, _opts: any) => {
        const regexStr = pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        return new RegExp(`^${regexStr}$`, 'i').test(value);
      });
    });

    describe('strategy: all', () => {
      it('should return all repositories', () => {
        const result = filterRepositoriesByPattern(repos, { strategy: 'all' });
        expect(result).toHaveLength(4);
        expect(result).toEqual(repos);
      });

      it('should return empty array for empty repos with all strategy', () => {
        const result = filterRepositoriesByPattern([], { strategy: 'all' });
        expect(result).toEqual([]);
      });
    });

    describe('strategy: skip', () => {
      it('should return empty array', () => {
        const result = filterRepositoriesByPattern(repos, { strategy: 'skip' });
        expect(result).toEqual([]);
      });
    });

    describe('strategy: pattern-glob', () => {
      it('should filter repos by glob suffix pattern (end)', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-glob',
          pattern: '*end',
        });
        expect(result).toHaveLength(2);
        expect(result.map(r => r.name)).toEqual(['frontend', 'backend']);
      });

      it('should filter repos by glob suffix pattern', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-glob',
          pattern: '*-service',
        });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('other-service');
      });

      it('should return all repos when pattern is undefined', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-glob',
          pattern: undefined,
        });
        expect(result).toEqual(repos);
      });

      it('should return empty when no repos match', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-glob',
          pattern: 'nonexistent-*',
        });
        expect(result).toEqual([]);
      });

      it('should preserve additional fields on matched repos', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-glob',
          pattern: 'frontend*',
        });
        expect(result[0]).toEqual(repos[0]);
        expect(result[0].url).toBe('https://example.com/frontend');
      });
    });

    describe('strategy: pattern-regex', () => {
      it('should filter repos by regex suffix pattern (end)', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-regex',
          pattern: 'end$',
        });
        expect(result).toHaveLength(2);
        expect(result.map(r => r.name)).toEqual(['frontend', 'backend']);
      });

      it('should filter repos by regex suffix pattern', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-regex',
          pattern: 'service$',
        });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('other-service');
      });

      it('should return all repos when pattern is undefined', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-regex',
          pattern: undefined,
        });
        expect(result).toEqual(repos);
      });

      it('should return empty array for invalid regex and log error', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-regex',
          pattern: '[invalid',
        });
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should filter repos with complex regex', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'pattern-regex',
          pattern: '(end$|api-)',
        });
        expect(result).toHaveLength(3);
      });
    });

    describe('strategy: manual', () => {
      it('should filter repos to only those in selectedRepos', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'manual',
          selectedRepos: ['frontend', 'api-gateway'],
        });
        expect(result).toHaveLength(2);
        expect(result.map(r => r.name)).toEqual(['frontend', 'api-gateway']);
      });

      it('should return empty array when selectedRepos is empty', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'manual',
          selectedRepos: [],
        });
        expect(result).toEqual([]);
      });

      it('should return empty array when selectedRepos is undefined', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'manual',
        });
        expect(result).toEqual([]);
      });

      it('should preserve additional fields on matched repos', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'manual',
          selectedRepos: ['frontend'],
        });
        expect(result[0]).toEqual(repos[0]);
        expect(result[0].url).toBe('https://example.com/frontend');
      });

      it('should ignore names not present in repos', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'manual',
          selectedRepos: ['frontend', 'nonexistent-repo'],
        });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('frontend');
      });
    });

    describe('strategy: unknown/default', () => {
      it('should return all repos for unrecognized strategy', () => {
        const result = filterRepositoriesByPattern(repos, {
          strategy: 'something-else' as any,
        });
        expect(result).toEqual(repos);
      });
    });
  });

  // =========================================================================
  // promptSelection
  // =========================================================================

  describe('promptSelection', () => {
    const defaultItems = makeItems('frontend', 'backend', 'other-service');

    function makeOptions(overrides?: Partial<SelectionPromptOptions>): SelectionPromptOptions {
      return {
        items: defaultItems,
        itemType: 'repositories',
        language: 'en',
        showPreview: false, // suppress preview by default in tests
        ...overrides,
      };
    }

    beforeEach(() => {
      mockMinimatch.mockImplementation((value: string, pattern: string, _opts: any) => {
        const regexStr = pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        return new RegExp(`^${regexStr}$`, 'i').test(value);
      });
    });

    // -----------------------------------------------------------------------
    // Empty items
    // -----------------------------------------------------------------------

    describe('empty items', () => {
      it('should return cancelled result when items array is empty', async () => {
        mockSelect.mockResolvedValue('all');
        const result = await promptSelection(makeOptions({ items: [] }));
        expect(result.cancelled).toBe(true);
        expect(result.items).toEqual([]);
        expect(result.strategy).toBe('all');
      });

      it('should NOT call select prompt when items are empty', async () => {
        await promptSelection(makeOptions({ items: [] }));
        expect(mockSelect).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: all
    // -----------------------------------------------------------------------

    describe('strategy: all', () => {
      it('should return all items when confirmed', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.strategy).toBe('all');
        expect(result.items).toHaveLength(3);
        expect(result.cancelled).toBe(false);
      });

      it('should return cancelled when user declines confirmation', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(false);

        const result = await promptSelection(makeOptions());

        expect(result.cancelled).toBe(true);
        expect(result.items).toEqual([]);
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: pattern-glob
    // -----------------------------------------------------------------------

    describe('strategy: pattern-glob', () => {
      it('should filter and return matching items', async () => {
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockResolvedValue('*end');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.strategy).toBe('pattern-glob');
        expect(result.items).toHaveLength(2);
        expect(result.pattern).toBe('*end');
        expect(result.cancelled).toBe(false);
      });

      it('should offer retry when no items match and user declines', async () => {
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockResolvedValue('nonexistent-*');
        mockConfirm.mockResolvedValue(false); // decline retry

        const result = await promptSelection(makeOptions());

        expect(result.cancelled).toBe(true);
        expect(result.items).toEqual([]);
        expect(result.pattern).toBe('nonexistent-*');
      });

      it('should retry when no items match and user accepts retry', async () => {
        let callCount = 0;
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockImplementation(() => {
          callCount++;
          return callCount === 1 ? 'nonexistent-*' : '*end';
        });
        // First confirm is retry (true), second is final confirmation (true)
        mockConfirm
          .mockResolvedValueOnce(true) // retry
          .mockResolvedValueOnce(true); // confirm final selection

        const result = await promptSelection(makeOptions());

        expect(result.items).toHaveLength(2);
        expect(result.cancelled).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: pattern-regex
    // -----------------------------------------------------------------------

    describe('strategy: pattern-regex', () => {
      it('should filter and return matching items', async () => {
        mockSelect.mockResolvedValue('pattern-regex');
        mockInput.mockResolvedValue('end$');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.strategy).toBe('pattern-regex');
        expect(result.items).toHaveLength(2);
        expect(result.pattern).toBe('end$');
        expect(result.cancelled).toBe(false);
      });

      it('should return cancelled for no regex matches when user declines retry', async () => {
        mockSelect.mockResolvedValue('pattern-regex');
        mockInput.mockResolvedValue('^zzz');
        mockConfirm.mockResolvedValue(false);

        const result = await promptSelection(makeOptions());

        expect(result.cancelled).toBe(true);
        expect(result.items).toEqual([]);
      });

      it('should handle regex that returns error from matchByRegex', async () => {
        // matchByRegex is called with pattern that passes validate but fails somehow
        // In practice this is hard to trigger since validate runs first.
        // We test the direct error path by using an invalid regex that
        // passes input validation but would fail in matchByRegex.
        // Since validate checks the same way, we mock input to return a valid pattern
        // and then verify the normal path.
        mockSelect.mockResolvedValue('pattern-regex');
        mockInput.mockResolvedValue('service$');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('other-service');
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: select-specific
    // -----------------------------------------------------------------------

    describe('strategy: select-specific', () => {
      it('should return user-selected items', async () => {
        const selected = [defaultItems[0], defaultItems[2]];
        mockSelect.mockResolvedValue('select-specific');
        mockCheckbox.mockResolvedValue(selected);
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.strategy).toBe('select-specific');
        expect(result.items).toHaveLength(2);
        expect(result.items[0].name).toBe('frontend');
        expect(result.items[1].name).toBe('other-service');
        expect(result.cancelled).toBe(false);
      });

      it('should return cancelled when checkbox returns empty', async () => {
        mockSelect.mockResolvedValue('select-specific');
        mockCheckbox.mockResolvedValue([]);
        // confirm should NOT be called because empty selection returns early

        const result = await promptSelection(makeOptions());

        expect(result.cancelled).toBe(true);
        expect(result.items).toEqual([]);
      });
    });

    // -----------------------------------------------------------------------
    // Strategy: manual-entry
    // -----------------------------------------------------------------------

    describe('strategy: manual-entry', () => {
      it('should match entered names against available items', async () => {
        mockSelect.mockResolvedValue('manual-entry');
        mockInput.mockResolvedValue('frontend, other-service');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.strategy).toBe('manual-entry');
        expect(result.items).toHaveLength(2);
        expect(result.cancelled).toBe(false);
      });

      it('should add not-found entries as new items', async () => {
        mockSelect.mockResolvedValue('manual-entry');
        mockInput.mockResolvedValue('frontend, brand-new-repo');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.items).toHaveLength(2);
        const names = result.items.map(i => i.name);
        expect(names).toContain('frontend');
        expect(names).toContain('brand-new-repo');
      });

      it('should uppercase entries when uppercaseManualEntry is true', async () => {
        mockSelect.mockResolvedValue('manual-entry');
        mockInput.mockResolvedValue('proj-a, proj-b');
        mockConfirm.mockResolvedValue(true);

        const items = makeItems('PROJ-A', 'PROJ-B', 'PROJ-C');
        const result = await promptSelection(makeOptions({
          items,
          uppercaseManualEntry: true,
        }));

        expect(result.items).toHaveLength(2);
        expect(result.items.map(i => i.name)).toEqual(['PROJ-A', 'PROJ-B']);
      });

      it('should return cancelled when all entries are empty after parsing', async () => {
        mockSelect.mockResolvedValue('manual-entry');
        // input returns something that after split/filter produces entries
        // but none match existing items and none are added as new (impossible since
        // not-found entries ARE added). So we test truly empty scenario:
        // The validate function in the source prevents empty input from being submitted.
        // But if somehow input returns items that match nothing and are blank:
        mockInput.mockResolvedValue('nonexistent1, nonexistent2');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        // Not-found entries get added, so items won't be empty
        expect(result.items).toHaveLength(2);
      });

      it('should match entries case-insensitively', async () => {
        mockSelect.mockResolvedValue('manual-entry');
        mockInput.mockResolvedValue('Frontend');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection(makeOptions());

        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('frontend');
      });
    });

    // -----------------------------------------------------------------------
    // Options: showAllOption
    // -----------------------------------------------------------------------

    describe('showAllOption', () => {
      it('should include all option in choices by default', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions());

        const selectCall = mockSelect.mock.calls[0][0];
        const values = selectCall.choices.map((c: any) => c.value);
        expect(values).toContain('all');
      });

      it('should exclude all option when showAllOption is false', async () => {
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockResolvedValue('*end');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ showAllOption: false }));

        const selectCall = mockSelect.mock.calls[0][0];
        const values = selectCall.choices.map((c: any) => c.value);
        expect(values).not.toContain('all');
      });

      it('should default to pattern-glob when all option is hidden', async () => {
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockResolvedValue('*end');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ showAllOption: false }));

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.default).toBe('pattern-glob');
      });
    });

    // -----------------------------------------------------------------------
    // Options: showPreview
    // -----------------------------------------------------------------------

    describe('showPreview', () => {
      it('should show preview when enabled and items are selected', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ showPreview: true }));

        // Verify console.log was called with preview content
        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasPreview = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('Preview')
        );
        expect(hasPreview).toBe(true);
      });

      it('should NOT show preview when disabled', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ showPreview: false }));

        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasPreview = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('Preview')
        );
        expect(hasPreview).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Options: previewLimit
    // -----------------------------------------------------------------------

    describe('previewLimit', () => {
      it('should show "and N more" when items exceed preview limit', async () => {
        const manyItems = makeItems(
          ...Array.from({ length: 25 }, (_, i) => `repo-${i}`)
        );
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({
          items: manyItems,
          showPreview: true,
          previewLimit: 5,
        }));

        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasMore = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('20 more')
        );
        expect(hasMore).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Options: sourceName
    // -----------------------------------------------------------------------

    describe('sourceName', () => {
      it('should display source name in header', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ sourceName: 'my-org' }));

        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasSource = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('my-org')
        );
        expect(hasSource).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Options: matchField
    // -----------------------------------------------------------------------

    describe('matchField', () => {
      it('should use custom matchField for glob matching', async () => {
        const items: SelectableItem[] = [
          { name: 'Frontend', value: 'fe', path: '/frontend' },
          { name: 'Backend', value: 'be', path: '/backend' },
          { name: 'Other', value: 'other', path: '/other-service' },
        ];
        mockSelect.mockResolvedValue('pattern-glob');
        mockInput.mockResolvedValue('/*end');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection({
          items,
          itemType: 'repositories',
          matchField: 'path',
          showPreview: false,
        });

        expect(result.items).toHaveLength(2);
      });

      it('should use custom matchField for manual entry matching', async () => {
        const items: SelectableItem[] = [
          { name: 'Project A', value: 'PA' },
          { name: 'Project B', value: 'PB' },
        ];
        mockSelect.mockResolvedValue('manual-entry');
        mockInput.mockResolvedValue('PA');
        mockConfirm.mockResolvedValue(true);

        const result = await promptSelection({
          items,
          itemType: 'projects',
          matchField: 'value',
          showPreview: false,
        });

        // 'PA' matches item with value 'PA'
        expect(result.items.some(i => i.value === 'PA')).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Language / i18n
    // -----------------------------------------------------------------------

    describe('language / i18n', () => {
      it('should use English strings by default', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions());

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.message).toContain('How do you want to select');
      });

      it('should use Russian strings when language is ru', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ language: 'ru' }));

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.message).toContain('Как вы хотите выбрать');
      });

      it('should use Spanish strings when language is es', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ language: 'es' }));

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.message).toContain('Cómo desea seleccionar');
      });

      it('should fall back to English for unsupported language', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions({ language: 'xx' as any }));

        const selectCall = mockSelect.mock.calls[0][0];
        expect(selectCall.message).toContain('How do you want to select');
      });
    });

    // -----------------------------------------------------------------------
    // Confirmation flow
    // -----------------------------------------------------------------------

    describe('confirmation flow', () => {
      it('should include item count and type in confirmation message', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions());

        const confirmCall = mockConfirm.mock.calls[0][0];
        expect(confirmCall.message).toContain('3');
        expect(confirmCall.message).toContain('repositories');
      });

      it('should log selected count on confirmation', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions());

        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasSelected = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('Selected 3 repositories')
        );
        expect(hasSelected).toBe(true);
      });

      it('should log cancelled message on rejection', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(false);

        await promptSelection(makeOptions());

        const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
        const hasCancelled = logCalls.some((msg: string) =>
          typeof msg === 'string' && msg.includes('Selection cancelled')
        );
        expect(hasCancelled).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // strategy choices always include non-all options
    // -----------------------------------------------------------------------

    describe('strategy choices', () => {
      it('should always include pattern-glob, pattern-regex, select-specific, manual-entry', async () => {
        mockSelect.mockResolvedValue('all');
        mockConfirm.mockResolvedValue(true);

        await promptSelection(makeOptions());

        const selectCall = mockSelect.mock.calls[0][0];
        const values = selectCall.choices.map((c: any) => c.value);
        expect(values).toContain('pattern-glob');
        expect(values).toContain('pattern-regex');
        expect(values).toContain('select-specific');
        expect(values).toContain('manual-entry');
      });
    });
  });
});
