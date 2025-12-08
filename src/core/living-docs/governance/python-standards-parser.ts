/**
 * Python Standards Parser - Parse Python config files for coding standards
 *
 * Supports: pyproject.toml (Black, Ruff, Pylint, isort), .pylintrc, setup.cfg,
 * .flake8, ruff.toml, mypy.ini
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger, consoleLogger } from '../../../utils/logger.js';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface PythonStandards {
  pythonVersion?: string;
  formatter?: FormatterConfig;
  linter?: LinterConfig;
  typeChecker?: TypeCheckerConfig;
  importSorter?: ImportSorterConfig;
  namingConventions: NamingConventions;
  docstrings?: DocstringConfig;
  lineLength?: number;
  warnings: string[];
}

export interface FormatterConfig {
  name: 'black' | 'autopep8' | 'yapf' | 'ruff-format';
  lineLength?: number;
  targetVersion?: string[];
  skipStringNormalization?: boolean;
  config: Record<string, unknown>;
}

export interface LinterConfig {
  name: 'ruff' | 'pylint' | 'flake8';
  enabledRules: string[];
  disabledRules: string[];
  lineLength?: number;
  config: Record<string, unknown>;
}

export interface TypeCheckerConfig {
  name: 'mypy' | 'pyright';
  strict: boolean;
  pythonVersion?: string;
  config: Record<string, unknown>;
}

export interface ImportSorterConfig {
  name: 'isort' | 'ruff-isort';
  profile?: string;
  lineLength?: number;
  config: Record<string, unknown>;
}

export interface NamingConventions {
  variables: string;
  classes: string;
  constants: string;
  functions: string;
  modules: string;
  privatePrefix: string;
}

export interface DocstringConfig {
  style: 'google' | 'numpy' | 'sphinx' | 'epytext';
  enforced: boolean;
}

export interface PythonStandardsParserOptions {
  logger?: Logger;
}

export class PythonStandardsParser {
  private logger: Logger;

  constructor(options: PythonStandardsParserOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  async parse(projectPath: string, configFiles: string[]): Promise<PythonStandards> {
    const warnings: string[] = [];
    const result: PythonStandards = {
      namingConventions: {
        variables: 'snake_case',
        classes: 'PascalCase',
        constants: 'UPPER_SNAKE_CASE',
        functions: 'snake_case',
        modules: 'snake_case',
        privatePrefix: '_',
      },
      warnings,
    };

    // Parse pyproject.toml first (most common modern config)
    if (configFiles.includes('pyproject.toml')) {
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      await this.parsePyprojectToml(pyprojectPath, result);
    }

    // Parse tool-specific configs (may override pyproject.toml)
    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (!(await this.fileExists(configPath))) continue;

      if (configFile === '.pylintrc' || configFile === 'pylintrc') {
        await this.parsePylintrc(configPath, result);
      } else if (configFile === '.flake8') {
        await this.parseFlake8(configPath, result);
      } else if (configFile === 'ruff.toml' || configFile === '.ruff.toml') {
        await this.parseRuffToml(configPath, result);
      } else if (configFile === 'mypy.ini' || configFile === '.mypy.ini') {
        await this.parseMypyIni(configPath, result);
      } else if (configFile === 'setup.cfg') {
        await this.parseSetupCfg(configPath, result);
      } else if (configFile === '.python-version') {
        const version = await readFile(configPath, 'utf-8');
        result.pythonVersion = version.trim();
      }
    }

    // Infer line length if not explicitly set
    if (!result.lineLength) {
      result.lineLength = result.formatter?.lineLength ?? result.linter?.lineLength ?? 88;
    }

    return result;
  }

  private async parsePyprojectToml(
    filePath: string,
    result: PythonStandards
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse Python version requirement
      const pythonMatch = content.match(/python\s*=\s*"([^"]+)"/);
      if (pythonMatch) {
        result.pythonVersion = pythonMatch[1];
      }

      // Parse [tool.black]
      const blackSection = this.extractTomlSection(content, 'tool.black');
      if (blackSection) {
        result.formatter = {
          name: 'black',
          lineLength: this.extractTomlNumber(blackSection, 'line-length'),
          targetVersion: this.extractTomlStringArray(blackSection, 'target-version'),
          skipStringNormalization: this.extractTomlBool(blackSection, 'skip-string-normalization'),
          config: this.parseTomlSection(blackSection),
        };
        result.lineLength = result.formatter.lineLength;
      }

      // Parse [tool.ruff]
      const ruffSection = this.extractTomlSection(content, 'tool.ruff');
      if (ruffSection) {
        const lineLength = this.extractTomlNumber(ruffSection, 'line-length');
        result.linter = {
          name: 'ruff',
          enabledRules: this.extractTomlStringArray(ruffSection, 'select') ?? [],
          disabledRules: this.extractTomlStringArray(ruffSection, 'ignore') ?? [],
          lineLength,
          config: this.parseTomlSection(ruffSection),
        };
        result.lineLength = result.lineLength ?? lineLength;

        // Check for ruff format
        const ruffFormatSection = this.extractTomlSection(content, 'tool.ruff.format');
        if (ruffFormatSection && !result.formatter) {
          result.formatter = {
            name: 'ruff-format',
            lineLength,
            config: this.parseTomlSection(ruffFormatSection),
          };
        }
      }

      // Parse [tool.pylint]
      const pylintSection = this.extractTomlSection(content, 'tool.pylint');
      if (pylintSection && !result.linter) {
        result.linter = {
          name: 'pylint',
          enabledRules: [],
          disabledRules: this.extractTomlStringArray(pylintSection, 'disable') ?? [],
          config: this.parseTomlSection(pylintSection),
        };
      }

      // Parse [tool.isort]
      const isortSection = this.extractTomlSection(content, 'tool.isort');
      if (isortSection) {
        result.importSorter = {
          name: 'isort',
          profile: this.extractTomlString(isortSection, 'profile'),
          lineLength: this.extractTomlNumber(isortSection, 'line_length'),
          config: this.parseTomlSection(isortSection),
        };
      }

      // Parse [tool.mypy]
      const mypySection = this.extractTomlSection(content, 'tool.mypy');
      if (mypySection) {
        result.typeChecker = {
          name: 'mypy',
          strict: this.extractTomlBool(mypySection, 'strict') ?? false,
          pythonVersion: this.extractTomlString(mypySection, 'python_version'),
          config: this.parseTomlSection(mypySection),
        };
      }

      this.logger.debug('Parsed pyproject.toml');
    } catch (error) {
      result.warnings.push(`Failed to parse pyproject.toml: ${error}`);
    }
  }

  private async parsePylintrc(filePath: string, result: PythonStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse disabled messages
      const disableMatch = content.match(/disable\s*=\s*([^\n]+)/);
      if (disableMatch) {
        const disabled = disableMatch[1].split(',').map((s) => s.trim());
        if (result.linter && result.linter.name === 'pylint') {
          result.linter.disabledRules.push(...disabled);
        } else if (!result.linter) {
          result.linter = {
            name: 'pylint',
            enabledRules: [],
            disabledRules: disabled,
            config: {},
          };
        }
      }

      // Parse max-line-length
      const lineLengthMatch = content.match(/max-line-length\s*=\s*(\d+)/);
      if (lineLengthMatch) {
        const lineLength = parseInt(lineLengthMatch[1], 10);
        if (result.linter) result.linter.lineLength = lineLength;
        result.lineLength = result.lineLength ?? lineLength;
      }

      this.logger.debug('Parsed .pylintrc');
    } catch (error) {
      result.warnings.push(`Failed to parse .pylintrc: ${error}`);
    }
  }

  private async parseFlake8(filePath: string, result: PythonStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      if (!result.linter || result.linter.name !== 'ruff') {
        const ignoreMatch = content.match(/ignore\s*=\s*([^\n]+)/);
        const selectMatch = content.match(/select\s*=\s*([^\n]+)/);
        const maxLineMatch = content.match(/max-line-length\s*=\s*(\d+)/);

        result.linter = {
          name: 'flake8',
          enabledRules: selectMatch ? selectMatch[1].split(',').map((s) => s.trim()) : [],
          disabledRules: ignoreMatch ? ignoreMatch[1].split(',').map((s) => s.trim()) : [],
          lineLength: maxLineMatch ? parseInt(maxLineMatch[1], 10) : undefined,
          config: {},
        };
        result.lineLength = result.lineLength ?? result.linter.lineLength;
      }

      this.logger.debug('Parsed .flake8');
    } catch (error) {
      result.warnings.push(`Failed to parse .flake8: ${error}`);
    }
  }

  private async parseRuffToml(filePath: string, result: PythonStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const lineLength = this.extractTomlNumber(content, 'line-length');
      const select = this.extractTomlStringArray(content, 'select');
      const ignore = this.extractTomlStringArray(content, 'ignore');

      result.linter = {
        name: 'ruff',
        enabledRules: select ?? [],
        disabledRules: ignore ?? [],
        lineLength,
        config: this.parseTomlSection(content),
      };
      result.lineLength = result.lineLength ?? lineLength;

      this.logger.debug('Parsed ruff.toml');
    } catch (error) {
      result.warnings.push(`Failed to parse ruff.toml: ${error}`);
    }
  }

  private async parseMypyIni(filePath: string, result: PythonStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const strictMatch = content.match(/strict\s*=\s*(True|true|1)/i);
      const pythonVersionMatch = content.match(/python_version\s*=\s*([^\n\s]+)/);

      result.typeChecker = {
        name: 'mypy',
        strict: !!strictMatch,
        pythonVersion: pythonVersionMatch?.[1],
        config: {},
      };

      this.logger.debug('Parsed mypy.ini');
    } catch (error) {
      result.warnings.push(`Failed to parse mypy.ini: ${error}`);
    }
  }

  private async parseSetupCfg(filePath: string, result: PythonStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse [flake8] section
      const flake8Section = this.extractIniSection(content, 'flake8');
      if (flake8Section && (!result.linter || result.linter.name === 'flake8')) {
        const ignoreMatch = flake8Section.match(/ignore\s*=\s*([^\n]+)/);
        const maxLineMatch = flake8Section.match(/max-line-length\s*=\s*(\d+)/);

        result.linter = {
          name: 'flake8',
          enabledRules: [],
          disabledRules: ignoreMatch ? ignoreMatch[1].split(',').map((s) => s.trim()) : [],
          lineLength: maxLineMatch ? parseInt(maxLineMatch[1], 10) : undefined,
          config: {},
        };
      }

      // Parse [isort] section
      const isortSection = this.extractIniSection(content, 'isort');
      if (isortSection && !result.importSorter) {
        const profileMatch = isortSection.match(/profile\s*=\s*([^\n]+)/);
        const lineLengthMatch = isortSection.match(/line_length\s*=\s*(\d+)/);

        result.importSorter = {
          name: 'isort',
          profile: profileMatch?.[1].trim(),
          lineLength: lineLengthMatch ? parseInt(lineLengthMatch[1], 10) : undefined,
          config: {},
        };
      }

      this.logger.debug('Parsed setup.cfg');
    } catch (error) {
      result.warnings.push(`Failed to parse setup.cfg: ${error}`);
    }
  }

  // TOML parsing helpers (basic, no external dependency)
  private extractTomlSection(content: string, sectionName: string): string | null {
    const sectionRegex = new RegExp(`\\[${sectionName.replace(/\./g, '\\.')}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
    const match = content.match(sectionRegex);
    return match ? match[1] : null;
  }

  private extractIniSection(content: string, sectionName: string): string | null {
    const sectionRegex = new RegExp(`\\[${sectionName}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
    const match = content.match(sectionRegex);
    return match ? match[1] : null;
  }

  private extractTomlNumber(content: string, key: string): number | undefined {
    const regex = new RegExp(`${key.replace(/-/g, '[-_]')}\\s*=\\s*(\\d+)`);
    const match = content.match(regex);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractTomlString(content: string, key: string): string | undefined {
    const regex = new RegExp(`${key.replace(/-/g, '[-_]')}\\s*=\\s*"([^"]+)"`);
    const match = content.match(regex);
    return match ? match[1] : undefined;
  }

  private extractTomlBool(content: string, key: string): boolean | undefined {
    const regex = new RegExp(`${key.replace(/-/g, '[-_]')}\\s*=\\s*(true|false)`, 'i');
    const match = content.match(regex);
    return match ? match[1].toLowerCase() === 'true' : undefined;
  }

  private extractTomlStringArray(content: string, key: string): string[] | undefined {
    const regex = new RegExp(`${key.replace(/-/g, '[-_]')}\\s*=\\s*\\[([^\\]]+)\\]`);
    const match = content.match(regex);
    if (!match) return undefined;
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/["']/g, ''))
      .filter((s) => s.length > 0);
  }

  private parseTomlSection(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const keyValueMatch = line.match(/^\s*([a-z_-]+)\s*=\s*(.+)$/i);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        const cleanKey = key.replace(/-/g, '_');
        if (value.startsWith('"') || value.startsWith("'")) {
          result[cleanKey] = value.slice(1, -1);
        } else if (value === 'true' || value === 'false') {
          result[cleanKey] = value === 'true';
        } else if (!isNaN(Number(value))) {
          result[cleanKey] = Number(value);
        } else {
          result[cleanKey] = value;
        }
      }
    }

    return result;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Convenience function for quick Python standards parsing
 */
export async function parsePythonStandards(
  projectPath: string,
  configFiles: string[],
  options?: PythonStandardsParserOptions
): Promise<PythonStandards> {
  const parser = new PythonStandardsParser(options);
  return parser.parse(projectPath, configFiles);
}
