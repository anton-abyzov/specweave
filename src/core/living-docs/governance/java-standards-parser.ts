/**
 * Java Standards Parser - Parse Java/Kotlin config files for coding standards
 *
 * Supports: checkstyle.xml, pmd.xml, spotbugs.xml, .editorconfig, detekt.yml
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger, consoleLogger } from '../../../utils/logger.js';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface JavaStandards {
  javaVersion?: string;
  buildTool: 'maven' | 'gradle' | 'unknown';
  checkstyle?: CheckstyleConfig;
  pmd?: PmdConfig;
  spotbugs?: SpotbugsConfig;
  kotlin?: KotlinConfig;
  namingConventions: JavaNamingConventions;
  formatting: JavaFormattingConfig;
  warnings: string[];
}

export interface CheckstyleConfig {
  enabled: boolean;
  configStyle: 'google' | 'sun' | 'custom';
  rules: CheckstyleRule[];
  suppressions: string[];
}

export interface CheckstyleRule {
  module: string;
  properties: Record<string, string>;
}

export interface PmdConfig {
  enabled: boolean;
  rulesets: string[];
  excludedRules: string[];
  minimumPriority?: number;
}

export interface SpotbugsConfig {
  enabled: boolean;
  effort: 'min' | 'default' | 'max';
  reportLevel: 'low' | 'medium' | 'high';
  excludeFilterFile?: string;
}

export interface KotlinConfig {
  enabled: boolean;
  detekt?: DetektConfig;
  ktlint?: KtlintConfig;
}

export interface DetektConfig {
  enabled: boolean;
  configFile?: string;
  rules: string[];
}

export interface KtlintConfig {
  enabled: boolean;
  androidMode: boolean;
}

export interface JavaNamingConventions {
  classes: string;
  methods: string;
  constants: string;
  packages: string;
  interfaces: string;
  typeParameters: string;
}

export interface JavaFormattingConfig {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  maxLineLength: number;
  braceStyle: 'same_line' | 'next_line';
}

export interface JavaStandardsParserOptions {
  logger?: Logger;
}

export class JavaStandardsParser {
  private logger: Logger;

  constructor(options: JavaStandardsParserOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  async parse(projectPath: string, configFiles: string[]): Promise<JavaStandards> {
    const warnings: string[] = [];
    const result: JavaStandards = {
      buildTool: 'unknown',
      namingConventions: {
        classes: 'PascalCase (UpperCamelCase)',
        methods: 'camelCase (lowerCamelCase)',
        constants: 'UPPER_SNAKE_CASE',
        packages: 'all.lowercase.dotted',
        interfaces: 'PascalCase (often prefixed with I)',
        typeParameters: 'Single uppercase letter (T, E, K, V)',
      },
      formatting: {
        indentation: 'spaces',
        indentSize: 4,
        maxLineLength: 120,
        braceStyle: 'same_line',
      },
      warnings,
    };

    // Detect build tool
    if (configFiles.includes('pom.xml')) {
      result.buildTool = 'maven';
      await this.parsePomXml(path.join(projectPath, 'pom.xml'), result);
    } else if (configFiles.includes('build.gradle') || configFiles.includes('build.gradle.kts')) {
      result.buildTool = 'gradle';
      const gradleFile = configFiles.includes('build.gradle.kts')
        ? 'build.gradle.kts'
        : 'build.gradle';
      await this.parseGradleBuild(path.join(projectPath, gradleFile), result);
    }

    // Parse checkstyle config
    const checkstyleFile = configFiles.find(
      (f) => f === 'checkstyle.xml' || f === 'checkstyle/checkstyle.xml'
    );
    if (checkstyleFile) {
      await this.parseCheckstyle(path.join(projectPath, checkstyleFile), result);
    }

    // Parse PMD config
    const pmdFile = configFiles.find((f) => f === 'pmd.xml' || f === 'pmd/pmd.xml');
    if (pmdFile) {
      await this.parsePmd(path.join(projectPath, pmdFile), result);
    }

    // Parse SpotBugs config
    if (configFiles.includes('spotbugs.xml') || configFiles.includes('spotbugs-exclude.xml')) {
      const spotbugsFile = configFiles.includes('spotbugs.xml')
        ? 'spotbugs.xml'
        : 'spotbugs-exclude.xml';
      await this.parseSpotbugs(path.join(projectPath, spotbugsFile), result);
    }

    // Parse .editorconfig for formatting preferences
    if (configFiles.includes('.editorconfig')) {
      await this.parseEditorconfig(path.join(projectPath, '.editorconfig'), result);
    }

    // Parse Kotlin config (detekt)
    if (configFiles.includes('detekt.yml')) {
      await this.parseDetekt(path.join(projectPath, 'detekt.yml'), result);
    }

    return result;
  }

  private async parsePomXml(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Extract Java version
      const javaVersionMatch = content.match(/<java\.version>([^<]+)<\/java\.version>/);
      const mavenCompilerSource = content.match(
        /<maven\.compiler\.source>([^<]+)<\/maven\.compiler\.source>/
      );
      result.javaVersion = javaVersionMatch?.[1] ?? mavenCompilerSource?.[1];

      // Check for checkstyle plugin
      if (content.includes('maven-checkstyle-plugin')) {
        result.checkstyle = result.checkstyle ?? {
          enabled: true,
          configStyle: 'custom',
          rules: [],
          suppressions: [],
        };
      }

      // Check for PMD plugin
      if (content.includes('maven-pmd-plugin')) {
        result.pmd = result.pmd ?? {
          enabled: true,
          rulesets: [],
          excludedRules: [],
        };
      }

      // Check for SpotBugs plugin
      if (content.includes('spotbugs-maven-plugin')) {
        result.spotbugs = result.spotbugs ?? {
          enabled: true,
          effort: 'default',
          reportLevel: 'medium',
        };
      }

      this.logger.debug(`Parsed pom.xml: Java ${result.javaVersion}`);
    } catch (error) {
      result.warnings.push(`Failed to parse pom.xml: ${error}`);
    }
  }

  private async parseGradleBuild(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Extract Java version
      const sourceCompatMatch = content.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/);
      const javaVersionMatch = content.match(/JavaVersion\.VERSION_(\d+)/);
      result.javaVersion = sourceCompatMatch?.[1] ?? javaVersionMatch?.[1];

      // Check for checkstyle plugin
      if (content.includes('checkstyle')) {
        result.checkstyle = result.checkstyle ?? {
          enabled: true,
          configStyle: 'custom',
          rules: [],
          suppressions: [],
        };
      }

      // Check for PMD plugin
      if (content.includes('pmd')) {
        result.pmd = result.pmd ?? {
          enabled: true,
          rulesets: [],
          excludedRules: [],
        };
      }

      // Check for SpotBugs plugin
      if (content.includes('spotbugs')) {
        result.spotbugs = result.spotbugs ?? {
          enabled: true,
          effort: 'default',
          reportLevel: 'medium',
        };
      }

      // Check for Kotlin
      if (filePath.endsWith('.kts') || content.includes('kotlin')) {
        result.kotlin = result.kotlin ?? {
          enabled: true,
        };
      }

      this.logger.debug(`Parsed Gradle build: Java ${result.javaVersion}`);
    } catch (error) {
      result.warnings.push(`Failed to parse Gradle build file: ${error}`);
    }
  }

  private async parseCheckstyle(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const rules: CheckstyleRule[] = [];
      const suppressions: string[] = [];
      let configStyle: 'google' | 'sun' | 'custom' = 'custom';

      // Detect style based on content
      if (content.includes('google_checks') || content.includes('GoogleStyle')) {
        configStyle = 'google';
      } else if (content.includes('sun_checks')) {
        configStyle = 'sun';
      }

      // Parse modules (simplified XML parsing)
      const moduleRegex = /<module\s+name="([^"]+)"([^>]*>[\s\S]*?<\/module>|[^>]*\/>)/g;
      let match;
      while ((match = moduleRegex.exec(content)) !== null) {
        const moduleName = match[1];
        const moduleContent = match[2];
        const properties: Record<string, string> = {};

        // Extract properties
        const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]+)"/g;
        let propMatch;
        while ((propMatch = propRegex.exec(moduleContent)) !== null) {
          properties[propMatch[1]] = propMatch[2];
        }

        // Skip Checker and TreeWalker modules (containers)
        if (moduleName !== 'Checker' && moduleName !== 'TreeWalker') {
          rules.push({ module: moduleName, properties });
        }
      }

      // Extract suppressions
      const suppressionRegex = /<suppress\s+files="([^"]+)"/g;
      while ((match = suppressionRegex.exec(content)) !== null) {
        suppressions.push(match[1]);
      }

      // Update formatting based on checkstyle rules
      const lineLength = rules.find((r) => r.module === 'LineLength');
      if (lineLength?.properties?.max) {
        result.formatting.maxLineLength = parseInt(lineLength.properties.max, 10);
      }

      const indentation = rules.find((r) => r.module === 'Indentation');
      if (indentation?.properties?.basicOffset) {
        result.formatting.indentSize = parseInt(indentation.properties.basicOffset, 10);
      }

      result.checkstyle = {
        enabled: true,
        configStyle,
        rules,
        suppressions,
      };

      this.logger.debug(`Parsed checkstyle.xml: ${configStyle} style, ${rules.length} rules`);
    } catch (error) {
      result.warnings.push(`Failed to parse checkstyle.xml: ${error}`);
    }
  }

  private async parsePmd(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const rulesets: string[] = [];
      const excludedRules: string[] = [];

      // Parse rulesets
      const rulesetRefRegex = /<ruleset-ref\s+ref="([^"]+)"/g;
      let match;
      while ((match = rulesetRefRegex.exec(content)) !== null) {
        rulesets.push(match[1]);
      }

      // Parse individual rules
      const ruleRegex = /<rule\s+ref="([^"]+)"/g;
      while ((match = ruleRegex.exec(content)) !== null) {
        const rulePath = match[1];
        const ruleName = rulePath.split('/').pop()?.replace('.xml', '') ?? rulePath;
        rulesets.push(ruleName);
      }

      // Parse exclusions
      const excludeRegex = /<exclude\s+name="([^"]+)"/g;
      while ((match = excludeRegex.exec(content)) !== null) {
        excludedRules.push(match[1]);
      }

      // Parse minimum priority
      const priorityMatch = content.match(/minimumPriority\s*=\s*["']?(\d)["']?/);

      result.pmd = {
        enabled: true,
        rulesets,
        excludedRules,
        minimumPriority: priorityMatch ? parseInt(priorityMatch[1], 10) : undefined,
      };

      this.logger.debug(`Parsed pmd.xml: ${rulesets.length} rulesets, ${excludedRules.length} excluded`);
    } catch (error) {
      result.warnings.push(`Failed to parse pmd.xml: ${error}`);
    }
  }

  private async parseSpotbugs(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // SpotBugs exclude filter is typically just exclusion patterns
      const isExcludeFilter = filePath.includes('exclude');

      result.spotbugs = {
        enabled: true,
        effort: 'default',
        reportLevel: 'medium',
        excludeFilterFile: isExcludeFilter ? path.basename(filePath) : undefined,
      };

      this.logger.debug('Parsed SpotBugs config');
    } catch (error) {
      result.warnings.push(`Failed to parse SpotBugs config: ${error}`);
    }
  }

  private async parseEditorconfig(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Look for Java-specific or general settings
      const javaSection = this.extractEditorconfigSection(content, '*.java');
      const generalSection = this.extractEditorconfigSection(content, '*');

      const section = javaSection || generalSection || content;

      // Parse indent style
      const indentStyleMatch = section.match(/indent_style\s*=\s*(spaces|tabs)/i);
      if (indentStyleMatch) {
        result.formatting.indentation = indentStyleMatch[1].toLowerCase() as 'spaces' | 'tabs';
      }

      // Parse indent size
      const indentSizeMatch = section.match(/indent_size\s*=\s*(\d+)/);
      if (indentSizeMatch) {
        result.formatting.indentSize = parseInt(indentSizeMatch[1], 10);
      }

      // Parse max line length
      const maxLineLengthMatch = section.match(/max_line_length\s*=\s*(\d+)/);
      if (maxLineLengthMatch) {
        result.formatting.maxLineLength = parseInt(maxLineLengthMatch[1], 10);
      }

      this.logger.debug('Parsed .editorconfig for Java formatting');
    } catch (error) {
      result.warnings.push(`Failed to parse .editorconfig: ${error}`);
    }
  }

  private async parseDetekt(filePath: string, result: JavaStandards): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');

      const rules: string[] = [];

      // Simple detection of enabled rule sets
      const ruleSets = [
        'complexity',
        'coroutines',
        'empty-blocks',
        'exceptions',
        'naming',
        'performance',
        'potential-bugs',
        'style',
      ];

      for (const ruleSet of ruleSets) {
        if (content.includes(`${ruleSet}:`)) {
          const activeMatch = content.match(new RegExp(`${ruleSet}:[\\s\\S]*?active:\\s*(true|false)`));
          if (!activeMatch || activeMatch[1] === 'true') {
            rules.push(ruleSet);
          }
        }
      }

      result.kotlin = {
        enabled: true,
        detekt: {
          enabled: true,
          configFile: 'detekt.yml',
          rules,
        },
      };

      this.logger.debug(`Parsed detekt.yml: ${rules.length} rule sets`);
    } catch (error) {
      result.warnings.push(`Failed to parse detekt.yml: ${error}`);
    }
  }

  private extractEditorconfigSection(content: string, pattern: string): string | null {
    const escapedPattern = pattern.replace(/\*/g, '\\*').replace(/\./g, '\\.');
    const sectionRegex = new RegExp(`\\[${escapedPattern}\\]([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
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
 * Convenience function for quick Java standards parsing
 */
export async function parseJavaStandards(
  projectPath: string,
  configFiles: string[],
  options?: JavaStandardsParserOptions
): Promise<JavaStandards> {
  const parser = new JavaStandardsParser(options);
  return parser.parse(projectPath, configFiles);
}
