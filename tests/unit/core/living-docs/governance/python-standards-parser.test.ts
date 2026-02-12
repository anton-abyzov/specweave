/**
 * Python Standards Parser Tests
 *
 * Tests for PythonStandardsParser class and parsePythonStandards convenience function.
 * Mocks fs operations to test parsing logic for pyproject.toml, .pylintrc, .flake8,
 * ruff.toml, mypy.ini, setup.cfg, and .python-version files.
 *
 * @see src/core/living-docs/governance/python-standards-parser.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '../../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockReadFile, mockStat } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockStat: vi.fn(),
}));

vi.mock('fs', () => ({
  readFile: (_path: string, _enc: string, cb: Function) => {
    mockReadFile(_path, _enc).then(
      (val: string) => cb(null, val),
      (err: Error) => cb(err)
    );
  },
  stat: (_path: string, cb: Function) => {
    mockStat(_path).then(
      (val: unknown) => cb(null, val),
      (err: Error) => cb(err)
    );
  },
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  PythonStandardsParser,
  parsePythonStandards,
} from '../../../../../src/core/living-docs/governance/python-standards-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/** Make mockStat succeed for listed filenames, fail for everything else */
function allowFiles(projectPath: string, filenames: string[]) {
  mockStat.mockImplementation(async (filePath: string) => {
    for (const f of filenames) {
      if (filePath === `${projectPath}/${f}`) return { isFile: () => true };
    }
    throw new Error('ENOENT');
  });
}

/** Configure mockReadFile to return content by filename */
function setFileContents(projectPath: string, files: Record<string, string>) {
  mockReadFile.mockImplementation(async (filePath: string) => {
    for (const [name, content] of Object.entries(files)) {
      if (filePath === `${projectPath}/${name}`) return content;
    }
    throw new Error(`ENOENT: ${filePath}`);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PythonStandardsParser', () => {
  let parser: PythonStandardsParser;
  const PROJECT = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    parser = new PythonStandardsParser({ logger: makeLogger() });
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create instance with default logger', () => {
      const p = new PythonStandardsParser();
      expect(p).toBeInstanceOf(PythonStandardsParser);
    });

    it('should accept custom logger', () => {
      const logger = makeLogger();
      const p = new PythonStandardsParser({ logger });
      expect(p).toBeInstanceOf(PythonStandardsParser);
    });
  });

  // -------------------------------------------------------------------------
  // Default values
  // -------------------------------------------------------------------------

  describe('parse - defaults', () => {
    it('should return default naming conventions for empty config', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.namingConventions).toEqual({
        variables: 'snake_case',
        classes: 'PascalCase',
        constants: 'UPPER_SNAKE_CASE',
        functions: 'snake_case',
        modules: 'snake_case',
        privatePrefix: '_',
      });
    });

    it('should default lineLength to 88 when no config sets it', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.lineLength).toBe(88);
    });

    it('should return empty warnings for successful parse', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.warnings).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // pyproject.toml parsing
  // -------------------------------------------------------------------------

  describe('parse - pyproject.toml', () => {
    it('should detect python version from requires-python', async () => {
      const toml = `
[project]
python = ">=3.11"
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.pythonVersion).toBe('>=3.11');
    });

    it('should parse [tool.black] section', async () => {
      const toml = `
[tool.black]
line-length = 100
target-version = ["py310", "py311"]
skip-string-normalization = true
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.formatter).toBeDefined();
      expect(result.formatter!.name).toBe('black');
      expect(result.formatter!.lineLength).toBe(100);
      expect(result.formatter!.targetVersion).toEqual(['py310', 'py311']);
      expect(result.formatter!.skipStringNormalization).toBe(true);
      expect(result.lineLength).toBe(100);
    });

    it('should parse [tool.ruff] section with select and ignore', async () => {
      const toml = `
[tool.ruff]
line-length = 120
select = ["E501", "F401", "W291"]
ignore = ["D100", "D101"]
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.linter).toBeDefined();
      expect(result.linter!.name).toBe('ruff');
      expect(result.linter!.enabledRules).toEqual(['E501', 'F401', 'W291']);
      expect(result.linter!.disabledRules).toEqual(['D100', 'D101']);
      expect(result.linter!.lineLength).toBe(120);
    });

    it('should parse [tool.ruff.format] and set ruff-format formatter when no other formatter present', async () => {
      const toml = `
[tool.ruff]
line-length = 88

[tool.ruff.format]
quote-style = "double"
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.formatter).toBeDefined();
      expect(result.formatter!.name).toBe('ruff-format');
      expect(result.formatter!.lineLength).toBe(88);
    });

    it('should NOT override existing formatter with ruff-format', async () => {
      const toml = `
[tool.black]
line-length = 100

[tool.ruff]
line-length = 88

[tool.ruff.format]
quote-style = "double"
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.formatter!.name).toBe('black');
    });

    it('should parse [tool.pylint] when no other linter exists', async () => {
      const toml = `
[tool.pylint]
disable = ["C0114", "C0115"]
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.linter).toBeDefined();
      expect(result.linter!.name).toBe('pylint');
      expect(result.linter!.disabledRules).toEqual(['C0114', 'C0115']);
    });

    it('should NOT override ruff linter with pylint from pyproject.toml', async () => {
      const toml = `
[tool.ruff]
line-length = 88
select = ["E501"]

[tool.pylint]
disable = ["C0114"]
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.linter!.name).toBe('ruff');
    });

    it('should parse [tool.isort] section', async () => {
      const toml = `
[tool.isort]
profile = "black"
line_length = 88
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.importSorter).toBeDefined();
      expect(result.importSorter!.name).toBe('isort');
      expect(result.importSorter!.profile).toBe('black');
      expect(result.importSorter!.lineLength).toBe(88);
    });

    it('should parse [tool.mypy] section with strict mode', async () => {
      const toml = `
[tool.mypy]
strict = true
python_version = "3.11"
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.typeChecker).toBeDefined();
      expect(result.typeChecker!.name).toBe('mypy');
      expect(result.typeChecker!.strict).toBe(true);
      expect(result.typeChecker!.pythonVersion).toBe('3.11');
    });

    it('should parse [tool.mypy] with strict false', async () => {
      const toml = `
[tool.mypy]
strict = false
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.typeChecker!.strict).toBe(false);
    });

    it('should add warning when pyproject.toml parsing fails', async () => {
      allowFiles(PROJECT, ['pyproject.toml']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Failed to parse pyproject.toml');
    });
  });

  // -------------------------------------------------------------------------
  // .pylintrc parsing
  // -------------------------------------------------------------------------

  describe('parse - .pylintrc', () => {
    it('should parse disabled messages into new linter config', async () => {
      const content = `[MESSAGES CONTROL]
disable=missing-docstring,too-many-arguments,line-too-long
`;
      allowFiles(PROJECT, ['.pylintrc']);
      setFileContents(PROJECT, { '.pylintrc': content });
      const result = await parser.parse(PROJECT, ['.pylintrc']);
      expect(result.linter).toBeDefined();
      expect(result.linter!.name).toBe('pylint');
      expect(result.linter!.disabledRules).toEqual([
        'missing-docstring',
        'too-many-arguments',
        'line-too-long',
      ]);
    });

    it('should append disabled rules to existing pylint linter', async () => {
      const toml = `
[tool.pylint]
disable = ["C0114"]
`;
      const pylintrc = `disable=W0611,W0612`;
      allowFiles(PROJECT, ['pyproject.toml', '.pylintrc']);
      setFileContents(PROJECT, { 'pyproject.toml': toml, '.pylintrc': pylintrc });
      const result = await parser.parse(PROJECT, ['pyproject.toml', '.pylintrc']);
      expect(result.linter!.name).toBe('pylint');
      expect(result.linter!.disabledRules).toContain('C0114');
      expect(result.linter!.disabledRules).toContain('W0611');
      expect(result.linter!.disabledRules).toContain('W0612');
    });

    it('should parse max-line-length from .pylintrc', async () => {
      const content = `[FORMAT]
max-line-length = 120
`;
      allowFiles(PROJECT, ['.pylintrc']);
      setFileContents(PROJECT, { '.pylintrc': content });
      const result = await parser.parse(PROJECT, ['.pylintrc']);
      expect(result.lineLength).toBe(120);
    });

    it('should add warning when .pylintrc parsing fails', async () => {
      allowFiles(PROJECT, ['.pylintrc']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['.pylintrc']);
      expect(result.warnings.some((w) => w.includes('Failed to parse .pylintrc'))).toBe(true);
    });

    it('should also support pylintrc (without dot)', async () => {
      const content = `disable=C0114`;
      allowFiles(PROJECT, ['pylintrc']);
      setFileContents(PROJECT, { 'pylintrc': content });
      const result = await parser.parse(PROJECT, ['pylintrc']);
      expect(result.linter!.name).toBe('pylint');
      expect(result.linter!.disabledRules).toContain('C0114');
    });
  });

  // -------------------------------------------------------------------------
  // .flake8 parsing
  // -------------------------------------------------------------------------

  describe('parse - .flake8', () => {
    it('should parse ignore, select, and max-line-length', async () => {
      const content = `[flake8]
ignore = E501,W503
select = E,W,F
max-line-length = 100
`;
      allowFiles(PROJECT, ['.flake8']);
      setFileContents(PROJECT, { '.flake8': content });
      const result = await parser.parse(PROJECT, ['.flake8']);
      expect(result.linter!.name).toBe('flake8');
      expect(result.linter!.disabledRules).toEqual(['E501', 'W503']);
      expect(result.linter!.enabledRules).toEqual(['E', 'W', 'F']);
      expect(result.linter!.lineLength).toBe(100);
      expect(result.lineLength).toBe(100);
    });

    it('should NOT override ruff linter with flake8', async () => {
      const toml = `
[tool.ruff]
line-length = 88
select = ["E501"]
`;
      const flake8 = `[flake8]
max-line-length = 100
`;
      allowFiles(PROJECT, ['pyproject.toml', '.flake8']);
      setFileContents(PROJECT, { 'pyproject.toml': toml, '.flake8': flake8 });
      const result = await parser.parse(PROJECT, ['pyproject.toml', '.flake8']);
      expect(result.linter!.name).toBe('ruff');
    });

    it('should handle .flake8 with no select or ignore', async () => {
      const content = `[flake8]
max-line-length = 79
`;
      allowFiles(PROJECT, ['.flake8']);
      setFileContents(PROJECT, { '.flake8': content });
      const result = await parser.parse(PROJECT, ['.flake8']);
      expect(result.linter!.enabledRules).toEqual([]);
      expect(result.linter!.disabledRules).toEqual([]);
      expect(result.linter!.lineLength).toBe(79);
    });

    it('should add warning when .flake8 parsing fails', async () => {
      allowFiles(PROJECT, ['.flake8']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['.flake8']);
      expect(result.warnings.some((w) => w.includes('Failed to parse .flake8'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ruff.toml parsing
  // -------------------------------------------------------------------------

  describe('parse - ruff.toml', () => {
    it('should parse ruff.toml with line-length, select, and ignore', async () => {
      const content = `
line-length = 120
select = ["E501", "F401"]
ignore = ["D100"]
`;
      allowFiles(PROJECT, ['ruff.toml']);
      setFileContents(PROJECT, { 'ruff.toml': content });
      const result = await parser.parse(PROJECT, ['ruff.toml']);
      expect(result.linter!.name).toBe('ruff');
      expect(result.linter!.lineLength).toBe(120);
      expect(result.linter!.enabledRules).toEqual(['E501', 'F401']);
      expect(result.linter!.disabledRules).toEqual(['D100']);
      expect(result.lineLength).toBe(120);
    });

    it('should also support .ruff.toml (with dot prefix)', async () => {
      const content = `line-length = 99`;
      allowFiles(PROJECT, ['.ruff.toml']);
      setFileContents(PROJECT, { '.ruff.toml': content });
      const result = await parser.parse(PROJECT, ['.ruff.toml']);
      expect(result.linter!.name).toBe('ruff');
      expect(result.linter!.lineLength).toBe(99);
    });

    it('should add warning when ruff.toml parsing fails', async () => {
      allowFiles(PROJECT, ['ruff.toml']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['ruff.toml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse ruff.toml'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // mypy.ini parsing
  // -------------------------------------------------------------------------

  describe('parse - mypy.ini', () => {
    it('should parse strict mode and python_version', async () => {
      const content = `[mypy]
strict = True
python_version = 3.12
`;
      allowFiles(PROJECT, ['mypy.ini']);
      setFileContents(PROJECT, { 'mypy.ini': content });
      const result = await parser.parse(PROJECT, ['mypy.ini']);
      expect(result.typeChecker).toBeDefined();
      expect(result.typeChecker!.name).toBe('mypy');
      expect(result.typeChecker!.strict).toBe(true);
      expect(result.typeChecker!.pythonVersion).toBe('3.12');
    });

    it('should detect non-strict mode', async () => {
      const content = `[mypy]
python_version = 3.10
`;
      allowFiles(PROJECT, ['mypy.ini']);
      setFileContents(PROJECT, { 'mypy.ini': content });
      const result = await parser.parse(PROJECT, ['mypy.ini']);
      expect(result.typeChecker!.strict).toBe(false);
    });

    it('should also support .mypy.ini (with dot prefix)', async () => {
      const content = `[mypy]
strict = true
`;
      allowFiles(PROJECT, ['.mypy.ini']);
      setFileContents(PROJECT, { '.mypy.ini': content });
      const result = await parser.parse(PROJECT, ['.mypy.ini']);
      expect(result.typeChecker!.strict).toBe(true);
    });

    it('should add warning when mypy.ini parsing fails', async () => {
      allowFiles(PROJECT, ['mypy.ini']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['mypy.ini']);
      expect(result.warnings.some((w) => w.includes('Failed to parse mypy.ini'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // setup.cfg parsing
  // -------------------------------------------------------------------------

  describe('parse - setup.cfg', () => {
    it('should parse [flake8] section with ignore and max-line-length', async () => {
      const content = `
[flake8]
ignore = E501,W503
max-line-length = 100

[isort]
profile = black
line_length = 88
`;
      allowFiles(PROJECT, ['setup.cfg']);
      setFileContents(PROJECT, { 'setup.cfg': content });
      const result = await parser.parse(PROJECT, ['setup.cfg']);
      expect(result.linter).toBeDefined();
      expect(result.linter!.name).toBe('flake8');
      expect(result.linter!.disabledRules).toEqual(['E501', 'W503']);
      expect(result.linter!.lineLength).toBe(100);
    });

    it('should parse [isort] section', async () => {
      const content = `
[isort]
profile = google
line_length = 79
`;
      allowFiles(PROJECT, ['setup.cfg']);
      setFileContents(PROJECT, { 'setup.cfg': content });
      const result = await parser.parse(PROJECT, ['setup.cfg']);
      expect(result.importSorter).toBeDefined();
      expect(result.importSorter!.name).toBe('isort');
      expect(result.importSorter!.profile).toBe('google');
      expect(result.importSorter!.lineLength).toBe(79);
    });

    it('should not override existing linter when setup.cfg has flake8', async () => {
      const toml = `
[tool.ruff]
line-length = 88
`;
      const cfg = `
[flake8]
max-line-length = 100
`;
      allowFiles(PROJECT, ['pyproject.toml', 'setup.cfg']);
      setFileContents(PROJECT, { 'pyproject.toml': toml, 'setup.cfg': cfg });
      const result = await parser.parse(PROJECT, ['pyproject.toml', 'setup.cfg']);
      expect(result.linter!.name).toBe('ruff');
    });

    it('should not override existing importSorter from pyproject.toml', async () => {
      const toml = `
[tool.isort]
profile = "black"
line_length = 88
`;
      const cfg = `
[isort]
profile = google
line_length = 79
`;
      allowFiles(PROJECT, ['pyproject.toml', 'setup.cfg']);
      setFileContents(PROJECT, { 'pyproject.toml': toml, 'setup.cfg': cfg });
      const result = await parser.parse(PROJECT, ['pyproject.toml', 'setup.cfg']);
      expect(result.importSorter!.profile).toBe('black');
    });

    it('should add warning when setup.cfg parsing fails', async () => {
      allowFiles(PROJECT, ['setup.cfg']);
      mockReadFile.mockRejectedValue(new Error('read error'));
      const result = await parser.parse(PROJECT, ['setup.cfg']);
      expect(result.warnings.some((w) => w.includes('Failed to parse setup.cfg'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // .python-version parsing
  // -------------------------------------------------------------------------

  describe('parse - .python-version', () => {
    it('should read python version from .python-version file', async () => {
      allowFiles(PROJECT, ['.python-version']);
      setFileContents(PROJECT, { '.python-version': '3.12.1\n' });
      const result = await parser.parse(PROJECT, ['.python-version']);
      expect(result.pythonVersion).toBe('3.12.1');
    });
  });

  // -------------------------------------------------------------------------
  // File existence checks
  // -------------------------------------------------------------------------

  describe('parse - file existence', () => {
    it('should skip config files that do not exist', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, ['.pylintrc', '.flake8', 'ruff.toml']);
      expect(result.linter).toBeUndefined();
      expect(result.warnings).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Line length inference
  // -------------------------------------------------------------------------

  describe('parse - lineLength inference', () => {
    it('should use formatter lineLength when available', async () => {
      const toml = `
[tool.black]
line-length = 100
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.lineLength).toBe(100);
    });

    it('should use linter lineLength when formatter is absent', async () => {
      const content = `
line-length = 110
`;
      allowFiles(PROJECT, ['ruff.toml']);
      setFileContents(PROJECT, { 'ruff.toml': content });
      const result = await parser.parse(PROJECT, ['ruff.toml']);
      expect(result.lineLength).toBe(110);
    });

    it('should fallback to 88 when no lineLength is configured', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.lineLength).toBe(88);
    });
  });

  // -------------------------------------------------------------------------
  // Combined configs
  // -------------------------------------------------------------------------

  describe('parse - combined config files', () => {
    it('should parse multiple config files together', async () => {
      const toml = `
[tool.black]
line-length = 88

[tool.isort]
profile = "black"
`;
      const mypy = `[mypy]
strict = True
python_version = 3.12
`;
      allowFiles(PROJECT, ['pyproject.toml', 'mypy.ini']);
      setFileContents(PROJECT, { 'pyproject.toml': toml, 'mypy.ini': mypy });
      const result = await parser.parse(PROJECT, ['pyproject.toml', 'mypy.ini']);
      expect(result.formatter!.name).toBe('black');
      expect(result.importSorter!.name).toBe('isort');
      expect(result.typeChecker!.name).toBe('mypy');
      expect(result.typeChecker!.strict).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // TOML parsing helpers (indirectly tested through parse)
  // -------------------------------------------------------------------------

  describe('TOML helpers (via pyproject.toml parsing)', () => {
    it('should handle boolean values (true/false)', async () => {
      const toml = `
[tool.black]
skip-string-normalization = false
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.formatter!.skipStringNormalization).toBe(false);
    });

    it('should parse key-value pairs with hyphen-to-underscore normalization', async () => {
      const toml = `
[tool.black]
line-length = 79
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.formatter!.config).toHaveProperty('line_length', 79);
    });

    it('should parse string values in config', async () => {
      const toml = `
[tool.isort]
profile = "black"
`;
      allowFiles(PROJECT, ['pyproject.toml']);
      setFileContents(PROJECT, { 'pyproject.toml': toml });
      const result = await parser.parse(PROJECT, ['pyproject.toml']);
      expect(result.importSorter!.config).toHaveProperty('profile', 'black');
    });
  });
});

// ---------------------------------------------------------------------------
// parsePythonStandards convenience function
// ---------------------------------------------------------------------------

describe('parsePythonStandards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PythonStandards via convenience function', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'));
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const result = await parsePythonStandards('/test/project', []);
    expect(result.namingConventions.variables).toBe('snake_case');
    expect(result.lineLength).toBe(88);
  });

  it('should accept custom logger option', async () => {
    const logger = makeLogger();
    mockStat.mockRejectedValue(new Error('ENOENT'));
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const result = await parsePythonStandards('/test/project', [], { logger });
    expect(result).toBeDefined();
  });
});
