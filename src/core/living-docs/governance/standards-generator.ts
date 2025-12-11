/**
 * Standards Generator - Generate markdown documentation from parsed standards
 *
 * Generates per-technology standards documents and a unified summary
 */

import { Logger, consoleLogger } from '../../../utils/logger.js';
import { DetectedEcosystem } from './ecosystem-detector.js';
import { PythonStandards } from './python-standards-parser.js';
import { GoStandards } from './go-standards-parser.js';
import { JavaStandards } from './java-standards-parser.js';
import { FrontendStandards } from './frontend-standards-parser.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface StandardsGeneratorOptions {
  logger?: Logger;
}

type AnyStandards = PythonStandards | GoStandards | JavaStandards | FrontendStandards;

export class StandardsGenerator {
  private logger: Logger;

  constructor(options: StandardsGeneratorOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  generatePythonMarkdown(standards: PythonStandards): string {
    const lines: string[] = [
      '# Python Coding Standards',
      '',
      `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
      '',
    ];

    // Python version
    if (standards.pythonVersion) {
      lines.push(`## Python Version`, '', `- **Required**: ${standards.pythonVersion}`, '');
    }

    // Formatter
    if (standards.formatter) {
      lines.push('## Code Formatter', '');
      lines.push(`- **Tool**: ${standards.formatter.name}`);
      if (standards.formatter.lineLength) {
        lines.push(`- **Line Length**: ${standards.formatter.lineLength} characters`);
      }
      if (standards.formatter.targetVersion) {
        lines.push(`- **Target Versions**: ${standards.formatter.targetVersion.join(', ')}`);
      }
      if (standards.formatter.skipStringNormalization) {
        lines.push(`- **String Normalization**: Disabled`);
      }
      lines.push('');
    }

    // Linter
    if (standards.linter) {
      lines.push('## Linter', '');
      lines.push(`- **Tool**: ${standards.linter.name}`);
      if (standards.linter.lineLength) {
        lines.push(`- **Max Line Length**: ${standards.linter.lineLength}`);
      }
      if (standards.linter.enabledRules.length > 0) {
        lines.push(`- **Enabled Rules**: \`${standards.linter.enabledRules.join('`, `')}\``);
      }
      if (standards.linter.disabledRules.length > 0) {
        lines.push(`- **Disabled Rules**: \`${standards.linter.disabledRules.join('`, `')}\``);
      }
      lines.push('');
    }

    // Type Checker
    if (standards.typeChecker) {
      lines.push('## Type Checking', '');
      lines.push(`- **Tool**: ${standards.typeChecker.name}`);
      lines.push(`- **Strict Mode**: ${standards.typeChecker.strict ? 'Yes' : 'No'}`);
      if (standards.typeChecker.pythonVersion) {
        lines.push(`- **Python Version**: ${standards.typeChecker.pythonVersion}`);
      }
      lines.push('');
    }

    // Import Sorter
    if (standards.importSorter) {
      lines.push('## Import Sorting', '');
      lines.push(`- **Tool**: ${standards.importSorter.name}`);
      if (standards.importSorter.profile) {
        lines.push(`- **Profile**: ${standards.importSorter.profile}`);
      }
      if (standards.importSorter.lineLength) {
        lines.push(`- **Line Length**: ${standards.importSorter.lineLength}`);
      }
      lines.push('');
    }

    // Naming Conventions
    lines.push('## Naming Conventions', '');
    lines.push('| Element | Convention |');
    lines.push('|---------|------------|');
    lines.push(`| Variables | \`${standards.namingConventions.variables}\` |`);
    lines.push(`| Functions | \`${standards.namingConventions.functions}\` |`);
    lines.push(`| Classes | \`${standards.namingConventions.classes}\` |`);
    lines.push(`| Constants | \`${standards.namingConventions.constants}\` |`);
    lines.push(`| Modules | \`${standards.namingConventions.modules}\` |`);
    lines.push(`| Private | \`${standards.namingConventions.privatePrefix}\` prefix |`);
    lines.push('');

    // Docstrings
    if (standards.docstrings) {
      lines.push('## Docstrings', '');
      lines.push(`- **Style**: ${standards.docstrings.style}`);
      lines.push(`- **Required**: ${standards.docstrings.enforced ? 'Yes' : 'No'}`);
      lines.push('');
    }

    // Line Length
    if (standards.lineLength) {
      lines.push('## Line Length', '');
      lines.push(`- **Maximum**: ${standards.lineLength} characters`);
      lines.push('');
    }

    // Warnings
    if (standards.warnings.length > 0) {
      lines.push('## Warnings', '');
      for (const warning of standards.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  generateGoMarkdown(standards: GoStandards): string {
    const lines: string[] = [
      '# Go Coding Standards',
      '',
      `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
      '',
    ];

    // Go version and module
    lines.push('## Project Info', '');
    lines.push(`- **Go Version**: ${standards.goVersion}`);
    if (standards.modulePath) {
      lines.push(`- **Module**: \`${standards.modulePath}\``);
    }
    lines.push('');

    // Linter
    if (standards.linter) {
      lines.push('## Linter (golangci-lint)', '');
      if (standards.linter.enabledLinters.length > 0) {
        lines.push('### Enabled Linters', '');
        for (const linter of standards.linter.enabledLinters) {
          lines.push(`- \`${linter}\``);
        }
        lines.push('');
      }
      if (standards.linter.disabledLinters.length > 0) {
        lines.push('### Disabled Linters', '');
        for (const linter of standards.linter.disabledLinters) {
          lines.push(`- \`${linter}\``);
        }
        lines.push('');
      }
      if (standards.linter.presets && standards.linter.presets.length > 0) {
        lines.push(`- **Presets**: ${standards.linter.presets.join(', ')}`);
        lines.push('');
      }
    }

    // Staticcheck
    if (standards.staticcheck) {
      lines.push('## Staticcheck', '');
      lines.push(`- **Enabled**: Yes`);
      if (standards.staticcheck.checks.length > 0) {
        lines.push(`- **Checks**: \`${standards.staticcheck.checks.join('`, `')}\``);
      }
      lines.push('');
    }

    // Formatting
    lines.push('## Formatting', '');
    lines.push(`- **gofmt**: ${standards.formatting.gofmt ? 'Yes' : 'No'}`);
    lines.push(`- **goimports**: ${standards.formatting.goimports ? 'Yes' : 'No'}`);
    lines.push(`- **gofumpt**: ${standards.formatting.gofumpt ? 'Yes' : 'No'}`);
    lines.push('');

    // Error Handling
    lines.push('## Error Handling', '');
    lines.push(`- **errcheck Enabled**: ${standards.errorHandling.errcheckEnabled ? 'Yes' : 'No'}`);
    lines.push(`- **Sentinel Errors**: ${standards.errorHandling.sentinelErrors ? 'Recommended' : 'Not enforced'}`);
    if (standards.errorHandling.wrapperPattern) {
      lines.push(`- **Error Wrapping**: \`${standards.errorHandling.wrapperPattern}\``);
    }
    lines.push('');

    // Naming Conventions
    lines.push('## Naming Conventions', '');
    lines.push('| Element | Convention |');
    lines.push('|---------|------------|');
    lines.push(`| Packages | ${standards.namingConventions.packages} |`);
    lines.push(`| Exported | ${standards.namingConventions.exported} |`);
    lines.push(`| Unexported | ${standards.namingConventions.unexported} |`);
    lines.push(`| Interfaces | ${standards.namingConventions.interfaces} |`);
    lines.push(`| Receivers | ${standards.namingConventions.receiverNames} |`);
    lines.push(`| Acronyms | ${standards.namingConventions.acronyms} |`);
    lines.push('');

    // Warnings
    if (standards.warnings.length > 0) {
      lines.push('## Warnings', '');
      for (const warning of standards.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  generateJavaMarkdown(standards: JavaStandards): string {
    const lines: string[] = [
      '# Java Coding Standards',
      '',
      `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
      '',
    ];

    // Project Info
    lines.push('## Project Info', '');
    if (standards.javaVersion) {
      lines.push(`- **Java Version**: ${standards.javaVersion}`);
    }
    lines.push(`- **Build Tool**: ${standards.buildTool}`);
    lines.push('');

    // Checkstyle
    if (standards.checkstyle) {
      lines.push('## Checkstyle', '');
      lines.push(`- **Enabled**: Yes`);
      lines.push(`- **Style**: ${standards.checkstyle.configStyle}`);
      if (standards.checkstyle.rules.length > 0) {
        lines.push('');
        lines.push('### Active Rules', '');
        const topRules = standards.checkstyle.rules.slice(0, 20);
        for (const rule of topRules) {
          lines.push(`- \`${rule.module}\``);
        }
        if (standards.checkstyle.rules.length > 20) {
          lines.push(`- ... and ${standards.checkstyle.rules.length - 20} more`);
        }
      }
      if (standards.checkstyle.suppressions.length > 0) {
        lines.push('');
        lines.push('### Suppressions', '');
        for (const suppression of standards.checkstyle.suppressions) {
          lines.push(`- \`${suppression}\``);
        }
      }
      lines.push('');
    }

    // PMD
    if (standards.pmd) {
      lines.push('## PMD', '');
      lines.push(`- **Enabled**: Yes`);
      if (standards.pmd.minimumPriority) {
        lines.push(`- **Minimum Priority**: ${standards.pmd.minimumPriority}`);
      }
      if (standards.pmd.rulesets.length > 0) {
        lines.push('');
        lines.push('### Rulesets', '');
        for (const ruleset of standards.pmd.rulesets) {
          lines.push(`- \`${ruleset}\``);
        }
      }
      if (standards.pmd.excludedRules.length > 0) {
        lines.push('');
        lines.push('### Excluded Rules', '');
        for (const rule of standards.pmd.excludedRules) {
          lines.push(`- \`${rule}\``);
        }
      }
      lines.push('');
    }

    // SpotBugs
    if (standards.spotbugs) {
      lines.push('## SpotBugs', '');
      lines.push(`- **Enabled**: Yes`);
      lines.push(`- **Effort**: ${standards.spotbugs.effort}`);
      lines.push(`- **Report Level**: ${standards.spotbugs.reportLevel}`);
      if (standards.spotbugs.excludeFilterFile) {
        lines.push(`- **Exclude Filter**: ${standards.spotbugs.excludeFilterFile}`);
      }
      lines.push('');
    }

    // Kotlin
    if (standards.kotlin) {
      lines.push('## Kotlin', '');
      if (standards.kotlin.detekt) {
        lines.push('### Detekt', '');
        lines.push(`- **Enabled**: ${standards.kotlin.detekt.enabled ? 'Yes' : 'No'}`);
        if (standards.kotlin.detekt.configFile) {
          lines.push(`- **Config**: ${standards.kotlin.detekt.configFile}`);
        }
        if (standards.kotlin.detekt.rules.length > 0) {
          lines.push(`- **Rule Sets**: ${standards.kotlin.detekt.rules.join(', ')}`);
        }
      }
      lines.push('');
    }

    // Formatting
    lines.push('## Formatting', '');
    lines.push(`- **Indentation**: ${standards.formatting.indentation} (${standards.formatting.indentSize} ${standards.formatting.indentation === 'spaces' ? 'spaces' : 'tab'})`);
    lines.push(`- **Max Line Length**: ${standards.formatting.maxLineLength}`);
    lines.push(`- **Brace Style**: ${standards.formatting.braceStyle === 'same_line' ? 'Same line' : 'Next line'}`);
    lines.push('');

    // Naming Conventions
    lines.push('## Naming Conventions', '');
    lines.push('| Element | Convention |');
    lines.push('|---------|------------|');
    lines.push(`| Classes | ${standards.namingConventions.classes} |`);
    lines.push(`| Methods | ${standards.namingConventions.methods} |`);
    lines.push(`| Constants | ${standards.namingConventions.constants} |`);
    lines.push(`| Packages | ${standards.namingConventions.packages} |`);
    lines.push(`| Interfaces | ${standards.namingConventions.interfaces} |`);
    lines.push(`| Type Parameters | ${standards.namingConventions.typeParameters} |`);
    lines.push('');

    // Warnings
    if (standards.warnings.length > 0) {
      lines.push('## Warnings', '');
      for (const warning of standards.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  generateFrontendMarkdown(standards: FrontendStandards): string {
    const frameworkName = standards.framework.charAt(0).toUpperCase() + standards.framework.slice(1);
    const lines: string[] = [
      `# ${frameworkName} Coding Standards`,
      '',
      `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
      '',
    ];

    // Framework Info
    lines.push('## Framework', '');
    lines.push(`- **Framework**: ${frameworkName}`);
    if (standards.frameworkVersion) {
      lines.push(`- **Version**: ${standards.frameworkVersion}`);
    }
    lines.push('');

    // State Management
    if (standards.stateManagement) {
      lines.push('## State Management', '');
      lines.push(`- **Library**: ${standards.stateManagement.name}`);
      if (standards.stateManagement.version) {
        lines.push(`- **Version**: ${standards.stateManagement.version}`);
      }
      lines.push('');
    }

    // CSS Methodology
    if (standards.cssMethodology) {
      lines.push('## CSS Methodology', '');
      lines.push(`- **Tool**: ${standards.cssMethodology.name}`);
      if (standards.cssMethodology.details) {
        lines.push(`- **Description**: ${standards.cssMethodology.details}`);
      }
      lines.push('');
    }

    // Testing
    if (standards.testing.frameworks.length > 0 || standards.testing.e2e) {
      lines.push('## Testing', '');
      if (standards.testing.frameworks.length > 0) {
        lines.push(`- **Unit/Integration**: ${standards.testing.frameworks.join(', ')}`);
      }
      if (standards.testing.e2e) {
        lines.push(`- **E2E**: ${standards.testing.e2e}`);
      }
      if (standards.testing.coverage) {
        lines.push(`- **Coverage Enabled**: Yes`);
      }
      lines.push('');
    }

    // Bundler
    if (standards.bundler) {
      lines.push('## Bundler', '');
      lines.push(`- **Tool**: ${standards.bundler.name}`);
      if (standards.bundler.version) {
        lines.push(`- **Version**: ${standards.bundler.version}`);
      }
      lines.push('');
    }

    // Routing
    if (standards.routing) {
      lines.push('## Routing', '');
      lines.push(`- **Library**: ${standards.routing.library}`);
      if (standards.routing.version) {
        lines.push(`- **Version**: ${standards.routing.version}`);
      }
      lines.push('');
    }

    // ESLint Plugins
    if (standards.eslintPlugins.length > 0) {
      lines.push('## ESLint Plugins', '');
      for (const plugin of standards.eslintPlugins) {
        lines.push(`- \`${plugin}\``);
      }
      lines.push('');
    }

    // Component Naming
    lines.push('## Component Conventions', '');
    lines.push(`- **Naming**: ${standards.componentNaming.convention}`);
    lines.push(`- **File Extension**: ${standards.componentNaming.fileExtension}`);
    if (standards.componentNaming.folderStructure) {
      lines.push(`- **Structure**: \`${standards.componentNaming.folderStructure}\``);
    }
    lines.push('');

    // Hooks (React/Vue Composition)
    if (standards.hooks) {
      lines.push('## Hooks / Composables', '');
      lines.push(`- **Enabled**: ${standards.hooks.enabled ? 'Yes' : 'No'}`);
      if (standards.hooks.customHooksPattern) {
        lines.push(`- **Custom Hook Pattern**: \`${standards.hooks.customHooksPattern}\``);
      }
      lines.push('');
    }

    // Warnings
    if (standards.warnings.length > 0) {
      lines.push('## Warnings', '');
      for (const warning of standards.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  generateMarkdown(
    ecosystem: string,
    standards: AnyStandards
  ): string {
    switch (ecosystem) {
      case 'python':
        return this.generatePythonMarkdown(standards as PythonStandards);
      case 'go':
        return this.generateGoMarkdown(standards as GoStandards);
      case 'java':
      case 'kotlin':
        return this.generateJavaMarkdown(standards as JavaStandards);
      case 'react':
      case 'angular':
      case 'vue':
      case 'svelte':
        return this.generateFrontendMarkdown(standards as FrontendStandards);
      case 'typescript':
        // TypeScript handled by existing code-standards-detective
        return '';
      default:
        this.logger.warn(`Unknown ecosystem: ${ecosystem}`);
        return '';
    }
  }
}

/**
 * Generate unified summary of all detected technologies
 */
export function generateUnifiedSummary(
  ecosystems: DetectedEcosystem[],
  generatedFiles: GeneratedFile[]
): string {
  const lines: string[] = [
    '# Coding Standards',
    '',
    `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
    `**Detected Technologies**: ${ecosystems.length}`,
    '',
    '## Detected Technology Stacks',
    '',
    '| Technology | Confidence | Detected From | Version | Standards Doc |',
    '|------------|------------|---------------|---------|---------------|',
  ];

  for (const eco of ecosystems) {
    const docPath = generatedFiles.find((f) => f.path.includes(`/${eco.name}.md`));
    const docLink = docPath ? `[${eco.name}.md](./standards/${eco.name}.md)` : 'N/A';
    lines.push(
      `| ${eco.name} | ${eco.confidence} | ${eco.detectedFrom} | ${eco.version ?? 'N/A'} | ${docLink} |`
    );
  }

  lines.push('');
  lines.push('## Quick Links');
  lines.push('');

  for (const file of generatedFiles) {
    if (file.path.includes('standards/')) {
      const techName = file.path.split('/').pop()?.replace('.md', '') ?? 'Unknown';
      lines.push(`- [${techName.charAt(0).toUpperCase() + techName.slice(1)} Standards](${file.path})`);
    }
  }

  lines.push('');
  lines.push('## Shared Conventions');
  lines.push('');
  lines.push('These conventions apply across all technologies:');
  lines.push('');
  lines.push('- **EditorConfig**: Check `.editorconfig` for shared formatting rules');
  lines.push('- **Git Hooks**: Check `.husky/` or `.git/hooks/` for pre-commit hooks');
  lines.push('- **CI/CD**: Check `.github/workflows/` or CI config for automated checks');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Re-run: `npx specweave analyze-standards` or `/sw:analyze-standards` to update*');

  return lines.join('\n');
}

/**
 * Convenience function to generate markdown from standards
 */
export function generateStandardsMarkdown(
  ecosystem: string,
  standards: AnyStandards,
  options?: StandardsGeneratorOptions
): string {
  const generator = new StandardsGenerator(options);
  return generator.generateMarkdown(ecosystem, standards);
}
