/**
 * Standards Generator Tests
 *
 * Tests for the StandardsGenerator class, generateUnifiedSummary, and
 * generateStandardsMarkdown convenience function.
 *
 * All functions under test are pure markdown generators - no FS mocking needed.
 *
 * @see src/core/living-docs/governance/standards-generator.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StandardsGenerator,
  generateUnifiedSummary,
  generateStandardsMarkdown,
} from '../../../../../src/core/living-docs/governance/standards-generator.js';
import type {
  GeneratedFile,
  StandardsGeneratorOptions,
} from '../../../../../src/core/living-docs/governance/standards-generator.js';
import type { PythonStandards } from '../../../../../src/core/living-docs/governance/python-standards-parser.js';
import type { GoStandards } from '../../../../../src/core/living-docs/governance/go-standards-parser.js';
import type { JavaStandards } from '../../../../../src/core/living-docs/governance/java-standards-parser.js';
import type { FrontendStandards } from '../../../../../src/core/living-docs/governance/frontend-standards-parser.js';
import type { DetectedEcosystem } from '../../../../../src/core/living-docs/governance/ecosystem-detector.js';
import type { Logger } from '../../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers - minimal valid objects for each standards type
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

function makePythonStandards(overrides?: Partial<PythonStandards>): PythonStandards {
  return {
    namingConventions: {
      variables: 'snake_case',
      functions: 'snake_case',
      classes: 'PascalCase',
      constants: 'UPPER_SNAKE_CASE',
      modules: 'snake_case',
      privatePrefix: '_',
    },
    warnings: [],
    ...overrides,
  };
}

function makeGoStandards(overrides?: Partial<GoStandards>): GoStandards {
  return {
    goVersion: '1.22',
    modulePath: 'github.com/example/project',
    namingConventions: {
      packages: 'lowercase',
      exported: 'PascalCase',
      unexported: 'camelCase',
      interfaces: 'PascalCase (-er suffix)',
      receiverNames: 'short (1-2 chars)',
      acronyms: 'ALL_CAPS',
    },
    errorHandling: {
      errcheckEnabled: true,
      sentinelErrors: true,
    },
    formatting: {
      gofmt: true,
      goimports: true,
      gofumpt: false,
    },
    warnings: [],
    ...overrides,
  };
}

function makeJavaStandards(overrides?: Partial<JavaStandards>): JavaStandards {
  return {
    buildTool: 'gradle',
    namingConventions: {
      classes: 'PascalCase',
      methods: 'camelCase',
      constants: 'UPPER_SNAKE_CASE',
      packages: 'lowercase.dot.separated',
      interfaces: 'PascalCase',
      typeParameters: 'Single uppercase letter',
    },
    formatting: {
      indentation: 'spaces',
      indentSize: 4,
      maxLineLength: 120,
      braceStyle: 'same_line',
    },
    warnings: [],
    ...overrides,
  };
}

function makeFrontendStandards(overrides?: Partial<FrontendStandards>): FrontendStandards {
  return {
    framework: 'react',
    testing: {
      frameworks: [],
    },
    eslintPlugins: [],
    componentNaming: {
      convention: 'PascalCase',
      fileExtension: '.tsx',
    },
    warnings: [],
    ...overrides,
  };
}

function makeEcosystem(overrides?: Partial<DetectedEcosystem>): DetectedEcosystem {
  return {
    name: 'python',
    confidence: 'high',
    detectedFrom: 'pyproject.toml',
    configFiles: ['pyproject.toml'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// StandardsGenerator class
// ---------------------------------------------------------------------------

describe('StandardsGenerator', () => {
  let generator: StandardsGenerator;

  beforeEach(() => {
    generator = new StandardsGenerator();
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create instance with default logger', () => {
      const gen = new StandardsGenerator();
      expect(gen).toBeInstanceOf(StandardsGenerator);
    });

    it('should accept custom logger', () => {
      const logger = makeLogger();
      const gen = new StandardsGenerator({ logger });
      expect(gen).toBeInstanceOf(StandardsGenerator);
    });
  });

  // -------------------------------------------------------------------------
  // generatePythonMarkdown
  // -------------------------------------------------------------------------

  describe('generatePythonMarkdown', () => {
    it('should generate header with title and auto-generated date', () => {
      const result = generator.generatePythonMarkdown(makePythonStandards());
      expect(result).toContain('# Python Coding Standards');
      expect(result).toMatch(/\*\*Auto-Generated\*\*: \d{4}-\d{2}-\d{2}/);
    });

    it('should include naming conventions table', () => {
      const result = generator.generatePythonMarkdown(makePythonStandards());
      expect(result).toContain('## Naming Conventions');
      expect(result).toContain('| Variables | `snake_case` |');
      expect(result).toContain('| Functions | `snake_case` |');
      expect(result).toContain('| Classes | `PascalCase` |');
      expect(result).toContain('| Constants | `UPPER_SNAKE_CASE` |');
      expect(result).toContain('| Modules | `snake_case` |');
      expect(result).toContain('| Private | `_` prefix |');
    });

    it('should include python version when present', () => {
      const standards = makePythonStandards({ pythonVersion: '3.12' });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Python Version');
      expect(result).toContain('**Required**: 3.12');
    });

    it('should omit python version section when absent', () => {
      const result = generator.generatePythonMarkdown(makePythonStandards());
      expect(result).not.toContain('## Python Version');
    });

    it('should include formatter with all fields', () => {
      const standards = makePythonStandards({
        formatter: {
          name: 'black',
          lineLength: 88,
          targetVersion: ['py310', 'py311'],
          skipStringNormalization: true,
          config: {},
        },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Code Formatter');
      expect(result).toContain('**Tool**: black');
      expect(result).toContain('**Line Length**: 88 characters');
      expect(result).toContain('**Target Versions**: py310, py311');
      expect(result).toContain('**String Normalization**: Disabled');
    });

    it('should include formatter with minimal fields', () => {
      const standards = makePythonStandards({
        formatter: { name: 'autopep8', config: {} },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('**Tool**: autopep8');
      expect(result).not.toContain('**Line Length**');
      expect(result).not.toContain('**Target Versions**');
      expect(result).not.toContain('**String Normalization**');
    });

    it('should include linter with enabled and disabled rules', () => {
      const standards = makePythonStandards({
        linter: {
          name: 'ruff',
          enabledRules: ['E501', 'F401'],
          disabledRules: ['D100'],
          lineLength: 100,
          config: {},
        },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Linter');
      expect(result).toContain('**Tool**: ruff');
      expect(result).toContain('**Max Line Length**: 100');
      expect(result).toContain('**Enabled Rules**: `E501`, `F401`');
      expect(result).toContain('**Disabled Rules**: `D100`');
    });

    it('should omit linter rules lines when arrays are empty', () => {
      const standards = makePythonStandards({
        linter: {
          name: 'pylint',
          enabledRules: [],
          disabledRules: [],
          config: {},
        },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('**Tool**: pylint');
      expect(result).not.toContain('**Enabled Rules**');
      expect(result).not.toContain('**Disabled Rules**');
    });

    it('should include type checker with strict mode on', () => {
      const standards = makePythonStandards({
        typeChecker: {
          name: 'mypy',
          strict: true,
          pythonVersion: '3.11',
          config: {},
        },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Type Checking');
      expect(result).toContain('**Tool**: mypy');
      expect(result).toContain('**Strict Mode**: Yes');
      expect(result).toContain('**Python Version**: 3.11');
    });

    it('should show strict mode No when disabled', () => {
      const standards = makePythonStandards({
        typeChecker: { name: 'pyright', strict: false, config: {} },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('**Strict Mode**: No');
    });

    it('should omit type checker python version when absent', () => {
      const standards = makePythonStandards({
        typeChecker: { name: 'mypy', strict: false, config: {} },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).not.toMatch(/\*\*Python Version\*\*.*\n.*Type Checking/);
      // Verify the section exists but without python version line
      expect(result).toContain('## Type Checking');
    });

    it('should include import sorter with profile and line length', () => {
      const standards = makePythonStandards({
        importSorter: {
          name: 'isort',
          profile: 'black',
          lineLength: 88,
          config: {},
        },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Import Sorting');
      expect(result).toContain('**Tool**: isort');
      expect(result).toContain('**Profile**: black');
      expect(result).toContain('**Line Length**: 88');
    });

    it('should include import sorter with minimal fields', () => {
      const standards = makePythonStandards({
        importSorter: { name: 'ruff-isort', config: {} },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('**Tool**: ruff-isort');
      expect(result).not.toContain('**Profile**');
    });

    it('should include docstrings section when present', () => {
      const standards = makePythonStandards({
        docstrings: { style: 'google', enforced: true },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Docstrings');
      expect(result).toContain('**Style**: google');
      expect(result).toContain('**Required**: Yes');
    });

    it('should show docstrings not enforced', () => {
      const standards = makePythonStandards({
        docstrings: { style: 'numpy', enforced: false },
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('**Required**: No');
    });

    it('should include line length section when present', () => {
      const standards = makePythonStandards({ lineLength: 120 });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Line Length');
      expect(result).toContain('**Maximum**: 120 characters');
    });

    it('should omit line length section when absent', () => {
      const result = generator.generatePythonMarkdown(makePythonStandards());
      expect(result).not.toContain('## Line Length');
    });

    it('should include warnings when present', () => {
      const standards = makePythonStandards({
        warnings: ['Config conflict detected', 'Deprecated option'],
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('## Warnings');
      expect(result).toContain('Config conflict detected');
      expect(result).toContain('Deprecated option');
    });

    it('should omit warnings section when empty', () => {
      const result = generator.generatePythonMarkdown(makePythonStandards());
      expect(result).not.toContain('## Warnings');
    });

    it('should generate complete python markdown with all sections populated', () => {
      const standards = makePythonStandards({
        pythonVersion: '3.12',
        formatter: {
          name: 'black',
          lineLength: 88,
          targetVersion: ['py312'],
          skipStringNormalization: false,
          config: {},
        },
        linter: {
          name: 'ruff',
          enabledRules: ['E501'],
          disabledRules: ['D100'],
          lineLength: 88,
          config: {},
        },
        typeChecker: { name: 'mypy', strict: true, pythonVersion: '3.12', config: {} },
        importSorter: { name: 'isort', profile: 'black', lineLength: 88, config: {} },
        docstrings: { style: 'google', enforced: true },
        lineLength: 88,
        warnings: ['Watch out'],
      });
      const result = generator.generatePythonMarkdown(standards);
      expect(result).toContain('# Python Coding Standards');
      expect(result).toContain('## Python Version');
      expect(result).toContain('## Code Formatter');
      expect(result).toContain('## Linter');
      expect(result).toContain('## Type Checking');
      expect(result).toContain('## Import Sorting');
      expect(result).toContain('## Naming Conventions');
      expect(result).toContain('## Docstrings');
      expect(result).toContain('## Line Length');
      expect(result).toContain('## Warnings');
    });
  });

  // -------------------------------------------------------------------------
  // generateGoMarkdown
  // -------------------------------------------------------------------------

  describe('generateGoMarkdown', () => {
    it('should generate header with title and date', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).toContain('# Go Coding Standards');
      expect(result).toMatch(/\*\*Auto-Generated\*\*: \d{4}-\d{2}-\d{2}/);
    });

    it('should include project info with go version and module', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).toContain('## Project Info');
      expect(result).toContain('**Go Version**: 1.22');
      expect(result).toContain('**Module**: `github.com/example/project`');
    });

    it('should omit module line when modulePath is empty', () => {
      const standards = makeGoStandards({ modulePath: '' });
      const result = generator.generateGoMarkdown(standards);
      expect(result).not.toContain('**Module**');
    });

    it('should include linter section with enabled linters', () => {
      const standards = makeGoStandards({
        linter: {
          name: 'golangci-lint',
          enabledLinters: ['errcheck', 'gosimple', 'govet'],
          disabledLinters: [],
          config: {},
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('## Linter (golangci-lint)');
      expect(result).toContain('### Enabled Linters');
      expect(result).toContain('`errcheck`');
      expect(result).toContain('`gosimple`');
      expect(result).toContain('`govet`');
    });

    it('should include disabled linters', () => {
      const standards = makeGoStandards({
        linter: {
          name: 'golangci-lint',
          enabledLinters: [],
          disabledLinters: ['deadcode', 'varcheck'],
          config: {},
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('### Disabled Linters');
      expect(result).toContain('`deadcode`');
      expect(result).toContain('`varcheck`');
    });

    it('should include presets when present', () => {
      const standards = makeGoStandards({
        linter: {
          name: 'golangci-lint',
          enabledLinters: [],
          disabledLinters: [],
          presets: ['bugs', 'performance'],
          config: {},
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('**Presets**: bugs, performance');
    });

    it('should omit presets when empty array', () => {
      const standards = makeGoStandards({
        linter: {
          name: 'golangci-lint',
          enabledLinters: [],
          disabledLinters: [],
          presets: [],
          config: {},
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).not.toContain('**Presets**');
    });

    it('should omit presets when undefined', () => {
      const standards = makeGoStandards({
        linter: {
          name: 'golangci-lint',
          enabledLinters: [],
          disabledLinters: [],
          config: {},
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).not.toContain('**Presets**');
    });

    it('should include staticcheck section with checks', () => {
      const standards = makeGoStandards({
        staticcheck: {
          enabled: true,
          checks: ['SA1000', 'SA1001', 'SA4006'],
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('## Staticcheck');
      expect(result).toContain('**Enabled**: Yes');
      expect(result).toContain('**Checks**: `SA1000`, `SA1001`, `SA4006`');
    });

    it('should include staticcheck without checks when array empty', () => {
      const standards = makeGoStandards({
        staticcheck: { enabled: true, checks: [] },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('## Staticcheck');
      expect(result).not.toContain('**Checks**');
    });

    it('should include formatting section', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).toContain('## Formatting');
      expect(result).toContain('**gofmt**: Yes');
      expect(result).toContain('**goimports**: Yes');
      expect(result).toContain('**gofumpt**: No');
    });

    it('should include error handling section', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).toContain('## Error Handling');
      expect(result).toContain('**errcheck Enabled**: Yes');
      expect(result).toContain('**Sentinel Errors**: Recommended');
    });

    it('should show sentinel errors not enforced', () => {
      const standards = makeGoStandards({
        errorHandling: {
          errcheckEnabled: false,
          sentinelErrors: false,
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('**errcheck Enabled**: No');
      expect(result).toContain('**Sentinel Errors**: Not enforced');
    });

    it('should include error wrapping pattern when present', () => {
      const standards = makeGoStandards({
        errorHandling: {
          errcheckEnabled: true,
          sentinelErrors: true,
          wrapperPattern: 'fmt.Errorf("%w", err)',
        },
      });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('**Error Wrapping**: `fmt.Errorf("%w", err)`');
    });

    it('should include naming conventions table', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).toContain('## Naming Conventions');
      expect(result).toContain('| Packages | lowercase |');
      expect(result).toContain('| Exported | PascalCase |');
      expect(result).toContain('| Unexported | camelCase |');
    });

    it('should include warnings when present', () => {
      const standards = makeGoStandards({ warnings: ['Outdated Go version'] });
      const result = generator.generateGoMarkdown(standards);
      expect(result).toContain('## Warnings');
      expect(result).toContain('Outdated Go version');
    });

    it('should omit warnings section when empty', () => {
      const result = generator.generateGoMarkdown(makeGoStandards());
      expect(result).not.toContain('## Warnings');
    });
  });

  // -------------------------------------------------------------------------
  // generateJavaMarkdown
  // -------------------------------------------------------------------------

  describe('generateJavaMarkdown', () => {
    it('should generate header with title and date', () => {
      const result = generator.generateJavaMarkdown(makeJavaStandards());
      expect(result).toContain('# Java Coding Standards');
      expect(result).toMatch(/\*\*Auto-Generated\*\*: \d{4}-\d{2}-\d{2}/);
    });

    it('should include project info with java version and build tool', () => {
      const standards = makeJavaStandards({ javaVersion: '21' });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Project Info');
      expect(result).toContain('**Java Version**: 21');
      expect(result).toContain('**Build Tool**: gradle');
    });

    it('should omit java version when absent', () => {
      const result = generator.generateJavaMarkdown(makeJavaStandards());
      expect(result).not.toContain('**Java Version**');
    });

    it('should include checkstyle section with rules and suppressions', () => {
      const standards = makeJavaStandards({
        checkstyle: {
          enabled: true,
          configStyle: 'google',
          rules: [
            { module: 'LineLength', properties: { max: '120' } },
            { module: 'Indentation', properties: {} },
          ],
          suppressions: ['AbbreviationAsWordInName'],
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Checkstyle');
      expect(result).toContain('**Enabled**: Yes');
      expect(result).toContain('**Style**: google');
      expect(result).toContain('### Active Rules');
      expect(result).toContain('`LineLength`');
      expect(result).toContain('`Indentation`');
      expect(result).toContain('### Suppressions');
      expect(result).toContain('`AbbreviationAsWordInName`');
    });

    it('should truncate checkstyle rules at 20 and show count', () => {
      const rules = Array.from({ length: 25 }, (_, i) => ({
        module: `Rule${i + 1}`,
        properties: {},
      }));
      const standards = makeJavaStandards({
        checkstyle: {
          enabled: true,
          configStyle: 'custom',
          rules,
          suppressions: [],
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('`Rule1`');
      expect(result).toContain('`Rule20`');
      expect(result).not.toContain('`Rule21`');
      expect(result).toContain('... and 5 more');
    });

    it('should not show "and N more" when rules are exactly 20', () => {
      const rules = Array.from({ length: 20 }, (_, i) => ({
        module: `Rule${i + 1}`,
        properties: {},
      }));
      const standards = makeJavaStandards({
        checkstyle: {
          enabled: true,
          configStyle: 'custom',
          rules,
          suppressions: [],
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('`Rule20`');
      expect(result).not.toContain('... and');
    });

    it('should omit checkstyle rules subsection when rules array is empty', () => {
      const standards = makeJavaStandards({
        checkstyle: {
          enabled: true,
          configStyle: 'sun',
          rules: [],
          suppressions: [],
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Checkstyle');
      expect(result).not.toContain('### Active Rules');
    });

    it('should include PMD section with rulesets and excluded rules', () => {
      const standards = makeJavaStandards({
        pmd: {
          enabled: true,
          rulesets: ['category/java/bestpractices.xml'],
          excludedRules: ['UnusedImports'],
          minimumPriority: 3,
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## PMD');
      expect(result).toContain('**Enabled**: Yes');
      expect(result).toContain('**Minimum Priority**: 3');
      expect(result).toContain('### Rulesets');
      expect(result).toContain('`category/java/bestpractices.xml`');
      expect(result).toContain('### Excluded Rules');
      expect(result).toContain('`UnusedImports`');
    });

    it('should omit PMD optional fields when absent', () => {
      const standards = makeJavaStandards({
        pmd: {
          enabled: true,
          rulesets: [],
          excludedRules: [],
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## PMD');
      expect(result).not.toContain('**Minimum Priority**');
      expect(result).not.toContain('### Rulesets');
      expect(result).not.toContain('### Excluded Rules');
    });

    it('should include SpotBugs section', () => {
      const standards = makeJavaStandards({
        spotbugs: {
          enabled: true,
          effort: 'max',
          reportLevel: 'low',
          excludeFilterFile: 'spotbugs-exclude.xml',
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## SpotBugs');
      expect(result).toContain('**Effort**: max');
      expect(result).toContain('**Report Level**: low');
      expect(result).toContain('**Exclude Filter**: spotbugs-exclude.xml');
    });

    it('should omit spotbugs exclude filter when absent', () => {
      const standards = makeJavaStandards({
        spotbugs: {
          enabled: true,
          effort: 'default',
          reportLevel: 'medium',
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## SpotBugs');
      expect(result).not.toContain('**Exclude Filter**');
    });

    it('should include Kotlin detekt section', () => {
      const standards = makeJavaStandards({
        kotlin: {
          enabled: true,
          detekt: {
            enabled: true,
            configFile: 'detekt.yml',
            rules: ['complexity', 'style'],
          },
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Kotlin');
      expect(result).toContain('### Detekt');
      expect(result).toContain('**Enabled**: Yes');
      expect(result).toContain('**Config**: detekt.yml');
      expect(result).toContain('**Rule Sets**: complexity, style');
    });

    it('should show detekt disabled', () => {
      const standards = makeJavaStandards({
        kotlin: {
          enabled: true,
          detekt: { enabled: false, rules: [] },
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('**Enabled**: No');
    });

    it('should omit detekt config and rules when absent/empty', () => {
      const standards = makeJavaStandards({
        kotlin: {
          enabled: true,
          detekt: { enabled: true, rules: [] },
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).not.toContain('**Config**:');
      expect(result).not.toContain('**Rule Sets**:');
    });

    it('should include Kotlin section without detekt when detekt is absent', () => {
      const standards = makeJavaStandards({
        kotlin: { enabled: true },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Kotlin');
      expect(result).not.toContain('### Detekt');
    });

    it('should include formatting section with spaces', () => {
      const result = generator.generateJavaMarkdown(makeJavaStandards());
      expect(result).toContain('## Formatting');
      expect(result).toContain('**Indentation**: spaces (4 spaces)');
      expect(result).toContain('**Max Line Length**: 120');
      expect(result).toContain('**Brace Style**: Same line');
    });

    it('should show formatting with tabs and next line brace', () => {
      const standards = makeJavaStandards({
        formatting: {
          indentation: 'tabs',
          indentSize: 1,
          maxLineLength: 80,
          braceStyle: 'next_line',
        },
      });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('**Indentation**: tabs (1 tab)');
      expect(result).toContain('**Brace Style**: Next line');
    });

    it('should include naming conventions table', () => {
      const result = generator.generateJavaMarkdown(makeJavaStandards());
      expect(result).toContain('## Naming Conventions');
      expect(result).toContain('| Classes | PascalCase |');
      expect(result).toContain('| Methods | camelCase |');
      expect(result).toContain('| Constants | UPPER_SNAKE_CASE |');
      expect(result).toContain('| Packages | lowercase.dot.separated |');
      expect(result).toContain('| Interfaces | PascalCase |');
      expect(result).toContain('| Type Parameters | Single uppercase letter |');
    });

    it('should include warnings when present', () => {
      const standards = makeJavaStandards({ warnings: ['Missing checkstyle'] });
      const result = generator.generateJavaMarkdown(standards);
      expect(result).toContain('## Warnings');
      expect(result).toContain('Missing checkstyle');
    });

    it('should omit warnings section when empty', () => {
      const result = generator.generateJavaMarkdown(makeJavaStandards());
      expect(result).not.toContain('## Warnings');
    });
  });

  // -------------------------------------------------------------------------
  // generateFrontendMarkdown
  // -------------------------------------------------------------------------

  describe('generateFrontendMarkdown', () => {
    it('should capitalize framework name in title', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).toContain('# React Coding Standards');
    });

    it('should capitalize other frameworks', () => {
      const angular = generator.generateFrontendMarkdown(
        makeFrontendStandards({ framework: 'angular' })
      );
      expect(angular).toContain('# Angular Coding Standards');

      const vue = generator.generateFrontendMarkdown(
        makeFrontendStandards({ framework: 'vue' })
      );
      expect(vue).toContain('# Vue Coding Standards');

      const svelte = generator.generateFrontendMarkdown(
        makeFrontendStandards({ framework: 'svelte' })
      );
      expect(svelte).toContain('# Svelte Coding Standards');
    });

    it('should include framework section with version', () => {
      const standards = makeFrontendStandards({ frameworkVersion: '18.2.0' });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Framework');
      expect(result).toContain('**Framework**: React');
      expect(result).toContain('**Version**: 18.2.0');
    });

    it('should omit framework version when absent', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).not.toContain('**Version**');
    });

    it('should include state management section', () => {
      const standards = makeFrontendStandards({
        stateManagement: { name: 'Redux Toolkit', version: '2.0.0' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## State Management');
      expect(result).toContain('**Library**: Redux Toolkit');
      expect(result).toContain('**Version**: 2.0.0');
    });

    it('should include state management without version', () => {
      const standards = makeFrontendStandards({
        stateManagement: { name: 'Zustand' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('**Library**: Zustand');
    });

    it('should include CSS methodology section', () => {
      const standards = makeFrontendStandards({
        cssMethodology: { name: 'Tailwind CSS', details: 'Utility-first CSS framework' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## CSS Methodology');
      expect(result).toContain('**Tool**: Tailwind CSS');
      expect(result).toContain('**Description**: Utility-first CSS framework');
    });

    it('should include CSS methodology without details', () => {
      const standards = makeFrontendStandards({
        cssMethodology: { name: 'CSS Modules' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('**Tool**: CSS Modules');
      expect(result).not.toContain('**Description**');
    });

    it('should include testing section with all fields', () => {
      const standards = makeFrontendStandards({
        testing: {
          frameworks: ['vitest', 'testing-library'],
          e2e: 'playwright',
          coverage: true,
        },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Testing');
      expect(result).toContain('**Unit/Integration**: vitest, testing-library');
      expect(result).toContain('**E2E**: playwright');
      expect(result).toContain('**Coverage Enabled**: Yes');
    });

    it('should include testing section with only e2e', () => {
      const standards = makeFrontendStandards({
        testing: { frameworks: [], e2e: 'cypress' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Testing');
      expect(result).toContain('**E2E**: cypress');
      expect(result).not.toContain('**Unit/Integration**');
    });

    it('should omit testing section when no frameworks and no e2e', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).not.toContain('## Testing');
    });

    it('should not show coverage line when coverage is falsy', () => {
      const standards = makeFrontendStandards({
        testing: { frameworks: ['jest'], coverage: false },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).not.toContain('**Coverage Enabled**');
    });

    it('should include bundler section', () => {
      const standards = makeFrontendStandards({
        bundler: { name: 'vite', version: '5.0.0' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Bundler');
      expect(result).toContain('**Tool**: vite');
      expect(result).toContain('**Version**: 5.0.0');
    });

    it('should include bundler without version', () => {
      const standards = makeFrontendStandards({
        bundler: { name: 'webpack' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('**Tool**: webpack');
    });

    it('should include routing section', () => {
      const standards = makeFrontendStandards({
        routing: { library: 'react-router', version: '6.0.0' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Routing');
      expect(result).toContain('**Library**: react-router');
      expect(result).toContain('**Version**: 6.0.0');
    });

    it('should include routing without version', () => {
      const standards = makeFrontendStandards({
        routing: { library: 'vue-router' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('**Library**: vue-router');
    });

    it('should include ESLint plugins list', () => {
      const standards = makeFrontendStandards({
        eslintPlugins: ['eslint-plugin-react', 'eslint-plugin-jsx-a11y'],
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## ESLint Plugins');
      expect(result).toContain('`eslint-plugin-react`');
      expect(result).toContain('`eslint-plugin-jsx-a11y`');
    });

    it('should omit ESLint plugins section when empty', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).not.toContain('## ESLint Plugins');
    });

    it('should include component conventions', () => {
      const standards = makeFrontendStandards({
        componentNaming: {
          convention: 'PascalCase',
          fileExtension: '.tsx',
          folderStructure: 'feature-based',
        },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Component Conventions');
      expect(result).toContain('**Naming**: PascalCase');
      expect(result).toContain('**File Extension**: .tsx');
      expect(result).toContain('**Structure**: `feature-based`');
    });

    it('should omit folder structure when absent', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).not.toContain('**Structure**');
    });

    it('should include hooks section', () => {
      const standards = makeFrontendStandards({
        hooks: { enabled: true, customHooksPattern: 'use*' },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Hooks / Composables');
      expect(result).toContain('**Enabled**: Yes');
      expect(result).toContain('**Custom Hook Pattern**: `use*`');
    });

    it('should show hooks disabled without pattern', () => {
      const standards = makeFrontendStandards({
        hooks: { enabled: false },
      });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('**Enabled**: No');
      expect(result).not.toContain('**Custom Hook Pattern**');
    });

    it('should include warnings when present', () => {
      const standards = makeFrontendStandards({ warnings: ['Missing ESLint config'] });
      const result = generator.generateFrontendMarkdown(standards);
      expect(result).toContain('## Warnings');
      expect(result).toContain('Missing ESLint config');
    });

    it('should omit warnings section when empty', () => {
      const result = generator.generateFrontendMarkdown(makeFrontendStandards());
      expect(result).not.toContain('## Warnings');
    });
  });

  // -------------------------------------------------------------------------
  // generateMarkdown (dispatch)
  // -------------------------------------------------------------------------

  describe('generateMarkdown', () => {
    it('should dispatch python ecosystem', () => {
      const result = generator.generateMarkdown('python', makePythonStandards());
      expect(result).toContain('# Python Coding Standards');
    });

    it('should dispatch go ecosystem', () => {
      const result = generator.generateMarkdown('go', makeGoStandards());
      expect(result).toContain('# Go Coding Standards');
    });

    it('should dispatch java ecosystem', () => {
      const result = generator.generateMarkdown('java', makeJavaStandards());
      expect(result).toContain('# Java Coding Standards');
    });

    it('should dispatch kotlin ecosystem to java generator', () => {
      const result = generator.generateMarkdown('kotlin', makeJavaStandards());
      expect(result).toContain('# Java Coding Standards');
    });

    it('should dispatch react ecosystem to frontend generator', () => {
      const result = generator.generateMarkdown('react', makeFrontendStandards());
      expect(result).toContain('# React Coding Standards');
    });

    it('should dispatch angular ecosystem to frontend generator', () => {
      const standards = makeFrontendStandards({ framework: 'angular' });
      const result = generator.generateMarkdown('angular', standards);
      expect(result).toContain('# Angular Coding Standards');
    });

    it('should dispatch vue ecosystem to frontend generator', () => {
      const standards = makeFrontendStandards({ framework: 'vue' });
      const result = generator.generateMarkdown('vue', standards);
      expect(result).toContain('# Vue Coding Standards');
    });

    it('should dispatch svelte ecosystem to frontend generator', () => {
      const standards = makeFrontendStandards({ framework: 'svelte' });
      const result = generator.generateMarkdown('svelte', standards);
      expect(result).toContain('# Svelte Coding Standards');
    });

    it('should return empty string for typescript ecosystem', () => {
      const result = generator.generateMarkdown('typescript', makePythonStandards());
      expect(result).toBe('');
    });

    it('should return empty string and log warning for unknown ecosystem', () => {
      const logger = makeLogger();
      const gen = new StandardsGenerator({ logger });
      const result = gen.generateMarkdown('rust', makePythonStandards());
      expect(result).toBe('');
      expect(logger.warn).toHaveBeenCalledWith('Unknown ecosystem: rust');
    });

    it('should return empty string for completely unknown ecosystem', () => {
      const logger = makeLogger();
      const gen = new StandardsGenerator({ logger });
      const result = gen.generateMarkdown('haskell', makePythonStandards());
      expect(result).toBe('');
      expect(logger.warn).toHaveBeenCalledWith('Unknown ecosystem: haskell');
    });
  });
});

// ---------------------------------------------------------------------------
// generateUnifiedSummary
// ---------------------------------------------------------------------------

describe('generateUnifiedSummary', () => {
  it('should generate header with title, date, and technology count', () => {
    const result = generateUnifiedSummary([], []);
    expect(result).toContain('# Coding Standards');
    expect(result).toMatch(/\*\*Auto-Generated\*\*: \d{4}-\d{2}-\d{2}/);
    expect(result).toContain('**Detected Technologies**: 0');
  });

  it('should include table header', () => {
    const result = generateUnifiedSummary([], []);
    expect(result).toContain('| Technology | Confidence | Detected From | Version | Standards Doc |');
    expect(result).toContain('|------------|------------|---------------|---------|---------------|');
  });

  it('should render ecosystem rows with matching doc links', () => {
    const ecosystems: DetectedEcosystem[] = [
      makeEcosystem({ name: 'python', version: '3.12' }),
    ];
    const files: GeneratedFile[] = [
      { path: './standards/python.md', content: '# Python' },
    ];
    const result = generateUnifiedSummary(ecosystems, files);
    expect(result).toContain('| python | high | pyproject.toml | 3.12 | [python.md](./standards/python.md) |');
  });

  it('should show N/A for version when absent', () => {
    const ecosystems: DetectedEcosystem[] = [
      makeEcosystem({ version: undefined }),
    ];
    const result = generateUnifiedSummary(ecosystems, []);
    expect(result).toContain('| N/A |');
  });

  it('should show N/A for doc link when no matching file', () => {
    const ecosystems: DetectedEcosystem[] = [makeEcosystem()];
    const result = generateUnifiedSummary(ecosystems, []);
    expect(result).toContain('| N/A |');
  });

  it('should handle multiple ecosystems', () => {
    const ecosystems: DetectedEcosystem[] = [
      makeEcosystem({ name: 'python', confidence: 'high', detectedFrom: 'pyproject.toml' }),
      makeEcosystem({ name: 'go', confidence: 'medium', detectedFrom: 'go.mod', version: '1.22' }),
    ];
    const files: GeneratedFile[] = [
      { path: './standards/python.md', content: '' },
      { path: './standards/go.md', content: '' },
    ];
    const result = generateUnifiedSummary(ecosystems, files);
    expect(result).toContain('**Detected Technologies**: 2');
    expect(result).toContain('| python |');
    expect(result).toContain('| go |');
  });

  it('should include quick links section for standards files', () => {
    const files: GeneratedFile[] = [
      { path: './standards/python.md', content: '' },
      { path: './standards/go.md', content: '' },
    ];
    const result = generateUnifiedSummary([], files);
    expect(result).toContain('## Quick Links');
    expect(result).toContain('[Python Standards](./standards/python.md)');
    expect(result).toContain('[Go Standards](./standards/go.md)');
  });

  it('should not include non-standards files in quick links', () => {
    const files: GeneratedFile[] = [
      { path: './other/readme.md', content: '' },
    ];
    const result = generateUnifiedSummary([], files);
    expect(result).toContain('## Quick Links');
    // The readme.md is not under standards/, so no link for it
    expect(result).not.toContain('[Readme Standards]');
  });

  it('should include shared conventions section', () => {
    const result = generateUnifiedSummary([], []);
    expect(result).toContain('## Shared Conventions');
    expect(result).toContain('**EditorConfig**');
    expect(result).toContain('**Git Hooks**');
    expect(result).toContain('**CI/CD**');
  });

  it('should include re-run instruction at the end', () => {
    const result = generateUnifiedSummary([], []);
    expect(result).toContain('`npx specweave analyze-standards`');
    expect(result).toContain('`/sw:analyze-standards`');
  });
});

// ---------------------------------------------------------------------------
// generateStandardsMarkdown (convenience function)
// ---------------------------------------------------------------------------

describe('generateStandardsMarkdown', () => {
  it('should generate python markdown via convenience function', () => {
    const result = generateStandardsMarkdown('python', makePythonStandards());
    expect(result).toContain('# Python Coding Standards');
  });

  it('should generate go markdown via convenience function', () => {
    const result = generateStandardsMarkdown('go', makeGoStandards());
    expect(result).toContain('# Go Coding Standards');
  });

  it('should generate java markdown via convenience function', () => {
    const result = generateStandardsMarkdown('java', makeJavaStandards());
    expect(result).toContain('# Java Coding Standards');
  });

  it('should generate frontend markdown via convenience function', () => {
    const result = generateStandardsMarkdown('react', makeFrontendStandards());
    expect(result).toContain('# React Coding Standards');
  });

  it('should accept custom logger option', () => {
    const logger = makeLogger();
    const result = generateStandardsMarkdown('unknown_eco', makePythonStandards(), { logger });
    expect(result).toBe('');
    expect(logger.warn).toHaveBeenCalledWith('Unknown ecosystem: unknown_eco');
  });

  it('should return empty string for typescript', () => {
    const result = generateStandardsMarkdown('typescript', makePythonStandards());
    expect(result).toBe('');
  });
});
