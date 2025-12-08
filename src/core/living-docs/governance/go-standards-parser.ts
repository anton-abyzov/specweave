/**
 * Go Standards Parser - Parse Go config files for coding standards
 *
 * Supports: go.mod, .golangci.yml/.golangci.yaml, staticcheck.conf
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger, consoleLogger } from '../../../utils/logger.js';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface GoStandards {
  goVersion: string;
  modulePath: string;
  linter?: GolangciLintConfig;
  staticcheck?: StaticcheckConfig;
  namingConventions: GoNamingConventions;
  errorHandling: ErrorHandlingConfig;
  formatting: FormattingConfig;
  warnings: string[];
}

export interface GolangciLintConfig {
  name: 'golangci-lint';
  enabledLinters: string[];
  disabledLinters: string[];
  presets?: string[];
  config: Record<string, unknown>;
}

export interface StaticcheckConfig {
  enabled: boolean;
  checks: string[];
}

export interface GoNamingConventions {
  packages: string;
  exported: string;
  unexported: string;
  interfaces: string;
  receiverNames: string;
  acronyms: string;
}

export interface ErrorHandlingConfig {
  errcheckEnabled: boolean;
  wrapperPattern?: string;
  sentinelErrors: boolean;
}

export interface FormattingConfig {
  gofmt: boolean;
  goimports: boolean;
  gofumpt: boolean;
}

export interface GoStandardsParserOptions {
  logger?: Logger;
}

export class GoStandardsParser {
  private logger: Logger;

  constructor(options: GoStandardsParserOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  async parse(projectPath: string, configFiles: string[]): Promise<GoStandards> {
    const warnings: string[] = [];
    const result: GoStandards = {
      goVersion: '1.21', // Default
      modulePath: '',
      namingConventions: {
        packages: 'lowercase (single word, no underscores)',
        exported: 'PascalCase (MixedCaps)',
        unexported: 'camelCase (mixedCaps)',
        interfaces: 'PascalCase (single method: -er suffix)',
        receiverNames: '1-2 letter abbreviation',
        acronyms: 'Uppercase (HTTP, URL, ID)',
      },
      errorHandling: {
        errcheckEnabled: false,
        sentinelErrors: true,
      },
      formatting: {
        gofmt: true,
        goimports: false,
        gofumpt: false,
      },
      warnings,
    };

    // Parse go.mod first
    if (configFiles.includes('go.mod')) {
      const goModPath = path.join(projectPath, 'go.mod');
      await this.parseGoMod(goModPath, result);
    }

    // Parse golangci-lint config
    const golangciConfig = configFiles.find(
      (f) => f === '.golangci.yml' || f === '.golangci.yaml'
    );
    if (golangciConfig) {
      const configPath = path.join(projectPath, golangciConfig);
      await this.parseGolangciLint(configPath, result);
    }

    // Parse staticcheck config
    if (configFiles.includes('staticcheck.conf')) {
      const staticcheckPath = path.join(projectPath, 'staticcheck.conf');
      await this.parseStaticcheck(staticcheckPath, result);
    }

    return result;
  }

  private async parseGoMod(filePath: string, result: GoStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse module path
      const moduleMatch = content.match(/^module\s+(.+)$/m);
      if (moduleMatch) {
        result.modulePath = moduleMatch[1].trim();
      }

      // Parse Go version
      const versionMatch = content.match(/^go\s+(\d+\.\d+(?:\.\d+)?)$/m);
      if (versionMatch) {
        result.goVersion = versionMatch[1];
      }

      this.logger.debug(`Parsed go.mod: module=${result.modulePath}, go=${result.goVersion}`);
    } catch (error) {
      result.warnings.push(`Failed to parse go.mod: ${error}`);
    }
  }

  private async parseGolangciLint(filePath: string, result: GoStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const enabledLinters: string[] = [];
      const disabledLinters: string[] = [];
      const presets: string[] = [];

      // Parse linters-settings section for enabled linters
      // This is a simplified YAML parser - in production, use a proper YAML lib

      // Check for linters.enable section
      const enableSection = this.extractYamlList(content, 'enable');
      if (enableSection.length > 0) {
        enabledLinters.push(...enableSection);
      }

      // Check for linters.disable section
      const disableSection = this.extractYamlList(content, 'disable');
      if (disableSection.length > 0) {
        disabledLinters.push(...disableSection);
      }

      // Check for presets
      const presetsSection = this.extractYamlList(content, 'presets');
      if (presetsSection.length > 0) {
        presets.push(...presetsSection);
      }

      // Check for disable-all
      if (content.includes('disable-all: true')) {
        disabledLinters.push('all');
      }

      // Check for enable-all
      if (content.includes('enable-all: true')) {
        enabledLinters.push('all');
      }

      // Detect common linters from linters-settings
      const lintersSettings = this.extractYamlSection(content, 'linters-settings');
      if (lintersSettings) {
        const detectedLinters = [
          'errcheck',
          'govet',
          'staticcheck',
          'gosimple',
          'unused',
          'ineffassign',
          'typecheck',
          'gofmt',
          'goimports',
          'gofumpt',
          'goconst',
          'gosec',
          'misspell',
          'revive',
          'exhaustive',
          'nilerr',
          'wrapcheck',
        ];
        for (const linter of detectedLinters) {
          if (lintersSettings.includes(`${linter}:`)) {
            if (!enabledLinters.includes(linter)) {
              enabledLinters.push(linter);
            }
          }
        }
      }

      // Update error handling based on errcheck
      if (enabledLinters.includes('errcheck') || enabledLinters.includes('all')) {
        result.errorHandling.errcheckEnabled = true;
      }

      // Update formatting based on detected formatters
      if (enabledLinters.includes('gofmt') || enabledLinters.includes('all')) {
        result.formatting.gofmt = true;
      }
      if (enabledLinters.includes('goimports')) {
        result.formatting.goimports = true;
      }
      if (enabledLinters.includes('gofumpt')) {
        result.formatting.gofumpt = true;
      }

      // Check for wrapcheck (error wrapping)
      if (enabledLinters.includes('wrapcheck')) {
        result.errorHandling.wrapperPattern = 'fmt.Errorf("%w", err)';
      }

      result.linter = {
        name: 'golangci-lint',
        enabledLinters,
        disabledLinters,
        presets: presets.length > 0 ? presets : undefined,
        config: {},
      };

      this.logger.debug(`Parsed golangci-lint: ${enabledLinters.length} enabled, ${disabledLinters.length} disabled`);
    } catch (error) {
      result.warnings.push(`Failed to parse golangci-lint config: ${error}`);
    }
  }

  private async parseStaticcheck(filePath: string, result: GoStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const checks: string[] = [];

      // Parse checks list (TOML format)
      const checksMatch = content.match(/checks\s*=\s*\[([^\]]+)\]/);
      if (checksMatch) {
        const checksList = checksMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/["']/g, ''))
          .filter((s) => s.length > 0);
        checks.push(...checksList);
      }

      result.staticcheck = {
        enabled: true,
        checks,
      };

      this.logger.debug(`Parsed staticcheck: ${checks.length} checks configured`);
    } catch (error) {
      result.warnings.push(`Failed to parse staticcheck.conf: ${error}`);
    }
  }

  // Simple YAML helpers (no external dependency)
  private extractYamlList(content: string, key: string): string[] {
    const result: string[] = [];
    const regex = new RegExp(`${key}:\\s*\\n((?:\\s+-\\s+\\S+\\n?)+)`, 'g');
    const match = content.match(regex);

    if (match) {
      const listContent = match[0];
      const itemRegex = /-\s+(\S+)/g;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(listContent)) !== null) {
        result.push(itemMatch[1]);
      }
    }

    return result;
  }

  private extractYamlSection(content: string, sectionName: string): string | null {
    const sectionRegex = new RegExp(`^${sectionName}:([\\s\\S]*?)(?=^[a-z]|$)`, 'm');
    const match = content.match(sectionRegex);
    return match ? match[1] : null;
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
 * Convenience function for quick Go standards parsing
 */
export async function parseGoStandards(
  projectPath: string,
  configFiles: string[],
  options?: GoStandardsParserOptions
): Promise<GoStandards> {
  const parser = new GoStandardsParser(options);
  return parser.parse(projectPath, configFiles);
}
