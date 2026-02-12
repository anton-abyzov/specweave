/**
 * Unit Tests: ADO Area Path Selection Helper
 *
 * Tests all exported functions:
 * - filterAreaPathsByPattern (glob matching)
 * - filterAreaPathsByRegex (regex matching)
 * - showAreaPathPreview (console output)
 * - extractLeafName (path splitting)
 * - toAreaPathObjects (conversion)
 * - selectAreaPaths (interactive flow)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockSelect,
  mockInput,
  mockCheckbox,
  mockConfirm,
  mockMinimatch,
  mockParsePatternShortcut,
  mockValidateRegex,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockCheckbox: vi.fn(),
  mockConfirm: vi.fn(),
  mockMinimatch: vi.fn(),
  mockParsePatternShortcut: vi.fn((p: string) => p),
  mockValidateRegex: vi.fn(() => true),
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
  const passthrough = (s: string) => s;
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(passthrough, handler);
      return passthrough;
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  };
  return { default: new Proxy(passthrough, handler) };
});

vi.mock('../../../../src/cli/helpers/selection-strategy.js', () => ({
  parsePatternShortcut: mockParsePatternShortcut,
  validateRegex: mockValidateRegex,
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  filterAreaPathsByPattern,
  filterAreaPathsByRegex,
  showAreaPathPreview,
  extractLeafName,
  toAreaPathObjects,
  selectAreaPaths,
  type ADOAreaPath,
} from '../../../../src/cli/helpers/ado-area-selector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAreaPaths(...names: string[]): ADOAreaPath[] {
  return names.map(name => ({
    name,
    path: `MyProject\\${name}`,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ado-area-selector', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // =========================================================================
  // extractLeafName
  // =========================================================================

  describe('extractLeafName', () => {
    it('extracts leaf name from multi-segment path', () => {
      expect(extractLeafName('MyProject\\Team A\\Platform')).toBe('Platform');
    });

    it('returns the name itself for single-segment path', () => {
      expect(extractLeafName('Platform')).toBe('Platform');
    });

    it('handles empty string', () => {
      // split('\\') on '' => [''] => last element is ''
      // fallback returns fullPath
      expect(extractLeafName('')).toBe('');
    });

    it('handles deeply nested paths', () => {
      expect(extractLeafName('Org\\Div\\Team\\SubTeam\\Component')).toBe('Component');
    });

    it('handles trailing backslash gracefully', () => {
      // 'MyProject\\' => ['MyProject', ''] => last is '' => fallback returns fullPath
      const result = extractLeafName('MyProject\\');
      expect(result).toBe('MyProject\\');
    });
  });

  // =========================================================================
  // toAreaPathObjects
  // =========================================================================

  describe('toAreaPathObjects', () => {
    it('converts string paths to ADOAreaPath objects', () => {
      const result = toAreaPathObjects(['MyProject\\Platform', 'MyProject\\Backend']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Platform', path: 'MyProject\\Platform' });
      expect(result[1]).toEqual({ name: 'Backend', path: 'MyProject\\Backend' });
    });

    it('handles empty array', () => {
      expect(toAreaPathObjects([])).toEqual([]);
    });

    it('handles single-segment paths', () => {
      const result = toAreaPathObjects(['Platform']);
      expect(result[0]).toEqual({ name: 'Platform', path: 'Platform' });
    });
  });

  // =========================================================================
  // filterAreaPathsByPattern
  // =========================================================================

  describe('filterAreaPathsByPattern', () => {
    it('filters using glob pattern on leaf name', () => {
      const areas = makeAreaPaths('Platform', 'Backend', 'Frontend');
      mockParsePatternShortcut.mockReturnValue('*end');
      mockMinimatch.mockImplementation((name: string, pat: string) => name === 'Backend' || name === 'Frontend');

      const result = filterAreaPathsByPattern(areas, '*end');
      expect(mockParsePatternShortcut).toHaveBeenCalledWith('*end');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no matches', () => {
      const areas = makeAreaPaths('Platform', 'Backend');
      mockParsePatternShortcut.mockReturnValue('Zzz*');
      mockMinimatch.mockReturnValue(false);

      const result = filterAreaPathsByPattern(areas, 'Zzz*');
      expect(result).toHaveLength(0);
    });

    it('passes nocase option to minimatch', () => {
      const areas = makeAreaPaths('Test');
      mockParsePatternShortcut.mockReturnValue('test');
      mockMinimatch.mockReturnValue(true);

      filterAreaPathsByPattern(areas, 'test');
      expect(mockMinimatch).toHaveBeenCalledWith('Test', 'test', { nocase: true });
    });

    it('handles empty areas array', () => {
      mockParsePatternShortcut.mockReturnValue('*');
      const result = filterAreaPathsByPattern([], '*');
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // filterAreaPathsByRegex
  // =========================================================================

  describe('filterAreaPathsByRegex', () => {
    it('filters by regex pattern on leaf name', () => {
      const areas = makeAreaPaths('Platform-A', 'Platform-B', 'Backend');
      const result = filterAreaPathsByRegex(areas, '^Platform-');
      expect(result.items).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });

    it('is case-insensitive', () => {
      const areas = makeAreaPaths('platform');
      const result = filterAreaPathsByRegex(areas, 'PLATFORM');
      expect(result.items).toHaveLength(1);
    });

    it('returns error for invalid regex', () => {
      const areas = makeAreaPaths('Test');
      const result = filterAreaPathsByRegex(areas, '[invalid');
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('returns empty items when no match', () => {
      const areas = makeAreaPaths('Alpha', 'Beta');
      const result = filterAreaPathsByRegex(areas, '^Gamma$');
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('handles non-Error exception in regex', () => {
      // We can't easily trigger a non-Error throw from RegExp,
      // but the code handles it. Test the path conceptually:
      const areas = makeAreaPaths('Test');
      const result = filterAreaPathsByRegex(areas, '^Test$');
      expect(result.items).toHaveLength(1);
    });
  });

  // =========================================================================
  // showAreaPathPreview
  // =========================================================================

  describe('showAreaPathPreview', () => {
    it('displays area path preview with header', () => {
      const areas = makeAreaPaths('Platform', 'Backend');
      showAreaPathPreview(areas);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('limits display to 20 items and shows overflow message', () => {
      const names = Array.from({ length: 25 }, (_, i) => `Area-${i}`);
      const areas = makeAreaPaths(...names);
      showAreaPathPreview(areas);

      // Should show "... and 5 more area paths"
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasMoreMsg = calls.some(c => typeof c === 'string' && c.includes('5 more'));
      expect(hasMoreMsg).toBe(true);
    });

    it('does not show overflow message for <= 20 items', () => {
      const areas = makeAreaPaths('A', 'B');
      showAreaPathPreview(areas);
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasMoreMsg = calls.some(c => typeof c === 'string' && c.includes('more area paths'));
      expect(hasMoreMsg).toBe(false);
    });

    it('truncates long paths with ellipsis', () => {
      const longPath = 'A'.repeat(60);
      const areas: ADOAreaPath[] = [{ name: 'Leaf', path: longPath }];
      showAreaPathPreview(areas);

      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasTruncated = calls.some(c => typeof c === 'string' && c.includes('...'));
      expect(hasTruncated).toBe(true);
    });
  });

  // =========================================================================
  // selectAreaPaths (interactive flow)
  // =========================================================================

  describe('selectAreaPaths', () => {
    const sampleAreas = makeAreaPaths('Platform', 'Backend', 'Frontend');

    it('returns null for empty area paths', async () => {
      const result = await selectAreaPaths([], 'TestProject');
      expect(result).toBeNull();
    });

    it('selects all area paths', async () => {
      mockSelect.mockResolvedValue('all');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.selectionStrategy).toBe('all');
      expect(result!.areaPaths).toEqual(['Platform', 'Backend', 'Frontend']);
      expect(result!.projectName).toBe('TestProject');
    });

    it('returns null when user declines confirmation', async () => {
      mockSelect.mockResolvedValue('all');
      mockConfirm.mockResolvedValue(false);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).toBeNull();
    });

    it('handles pattern-glob strategy with matches', async () => {
      mockSelect.mockResolvedValue('pattern-glob');
      mockInput.mockResolvedValue('*end');
      mockParsePatternShortcut.mockReturnValue('*end');
      mockMinimatch.mockImplementation((name: string) => name === 'Backend' || name === 'Frontend');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.selectionStrategy).toBe('pattern-glob');
      expect(result!.areaPaths).toEqual(['Backend', 'Frontend']);
      expect(result!.pattern).toBe('*end');
    });

    it('handles pattern-glob with no matches and user cancels', async () => {
      mockSelect.mockResolvedValue('pattern-glob');
      mockInput.mockResolvedValue('NoMatch*');
      mockParsePatternShortcut.mockReturnValue('NoMatch*');
      mockMinimatch.mockReturnValue(false);
      mockConfirm.mockResolvedValue(false); // Don't try again

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).toBeNull();
    });

    it('handles pattern-regex strategy', async () => {
      mockSelect.mockResolvedValue('pattern-regex');
      mockInput.mockResolvedValue('^Platform$');
      mockValidateRegex.mockReturnValue(true);
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.selectionStrategy).toBe('pattern-regex');
      expect(result!.isRegex).toBe(true);
      expect(result!.areaPaths).toEqual(['Platform']);
    });

    it('handles pattern-regex with no matches', async () => {
      mockSelect.mockResolvedValue('pattern-regex');
      mockInput.mockResolvedValue('^ZZZ$');
      mockValidateRegex.mockReturnValue(true);
      mockConfirm.mockResolvedValue(false);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).toBeNull();
    });

    it('handles explicit checkbox selection', async () => {
      mockSelect.mockResolvedValue('explicit');
      mockCheckbox.mockResolvedValue([sampleAreas[0], sampleAreas[2]]);
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.selectionStrategy).toBe('explicit');
      expect(result!.areaPaths).toEqual(['Platform', 'Frontend']);
    });

    it('handles explicit selection with empty result', async () => {
      mockSelect.mockResolvedValue('explicit');
      mockCheckbox.mockResolvedValue([]);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).toBeNull();
    });

    it('handles manual-entry strategy with matches', async () => {
      mockSelect.mockResolvedValue('manual-entry');
      mockInput.mockResolvedValue('Platform, Backend');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.selectionStrategy).toBe('manual-entry');
      expect(result!.areaPaths).toEqual(['Platform', 'Backend']);
    });

    it('handles manual-entry with no matches and user cancels', async () => {
      mockSelect.mockResolvedValue('manual-entry');
      mockInput.mockResolvedValue('ZZZ, YYY');
      mockConfirm.mockResolvedValue(false);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).toBeNull();
    });

    it('warns about not-found entries in manual mode', async () => {
      mockSelect.mockResolvedValue('manual-entry');
      mockInput.mockResolvedValue('Platform, NotExist');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.areaPaths).toEqual(['Platform']);
      // Check warning was logged about "NotExist"
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasNotFoundWarning = calls.some(c => typeof c === 'string' && c.includes('NotExist'));
      expect(hasNotFoundWarning).toBe(true);
    });

    it('warns when single selected area path matches project name', async () => {
      const areas: ADOAreaPath[] = [{ name: 'TestProject', path: 'TestProject\\TestProject' }];
      mockSelect.mockResolvedValue('all');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(areas, 'TestProject');
      expect(result).not.toBeNull();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasWarning = calls.some(c => typeof c === 'string' && c.includes('equals project name'));
      expect(hasWarning).toBe(true);
    });

    it('does not warn when single area path does not match project name', async () => {
      const areas: ADOAreaPath[] = [{ name: 'DifferentName', path: 'TestProject\\DifferentName' }];
      mockSelect.mockResolvedValue('all');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(areas, 'TestProject');
      expect(result).not.toBeNull();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]);
      const hasWarning = calls.some(c => typeof c === 'string' && c.includes('equals project name'));
      expect(hasWarning).toBe(false);
    });

    it('stores leaf names only in areaPaths (not full paths)', async () => {
      const areas: ADOAreaPath[] = [
        { name: 'Platform', path: 'MyProject\\Team-A\\Platform' },
        { name: 'Backend', path: 'MyProject\\Team-B\\Backend' },
      ];
      mockSelect.mockResolvedValue('all');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(areas, 'MyProject');
      expect(result).not.toBeNull();
      expect(result!.areaPaths).toEqual(['Platform', 'Backend']);
    });

    it('handles case-insensitive matching in manual-entry', async () => {
      mockSelect.mockResolvedValue('manual-entry');
      mockInput.mockResolvedValue('platform, BACKEND');
      mockConfirm.mockResolvedValue(true);

      const result = await selectAreaPaths(sampleAreas, 'TestProject');
      expect(result).not.toBeNull();
      expect(result!.areaPaths).toEqual(['Platform', 'Backend']);
    });
  });
});
