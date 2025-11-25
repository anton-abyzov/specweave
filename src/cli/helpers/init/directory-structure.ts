/**
 * Directory structure creation and template copying
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { ClaudeMdGenerator } from '../../../adapters/claude-md-generator.js';
import { AgentsMdGenerator } from '../../../adapters/agents-md-generator.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import type { TestMode } from './types.js';
import { findSourceDir, findPackageRoot } from './path-utils.js';

/**
 * Create the .specweave directory structure
 *
 * @param targetDir - Target directory
 * @param _adapterName - Adapter name (unused, kept for API compatibility)
 */
export function createDirectoryStructure(targetDir: string, _adapterName: string): void {
  const directories = [
    // Core increment structure
    '.specweave/increments',
    '.specweave/cache',                       // External tool cache (24-hour TTL)

    // 6-pillar documentation structure
    '.specweave/docs/internal/strategy',      // Business specs (WHAT, WHY)
    '.specweave/docs/internal/specs',         // Feature specifications (detailed requirements)
    '.specweave/docs/internal/architecture',  // Technical design (HOW)
    '.specweave/docs/internal/architecture/adr',      // Architecture Decision Records
    '.specweave/docs/internal/architecture/diagrams', // Architecture diagrams
    '.specweave/docs/internal/delivery',      // Roadmap, CI/CD, guides
    '.specweave/docs/internal/operations',    // Runbooks, SLOs
    '.specweave/docs/internal/governance',    // Security, compliance
    '.specweave/docs/public',                 // Published documentation
  ];

  directories.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });
}

/**
 * Copy templates and generate CLAUDE.md and AGENTS.md
 *
 * @param templatesDir - Source templates directory
 * @param targetDir - Target directory
 * @param projectName - Project name
 * @param language - Language for i18n
 */
export async function copyTemplates(
  templatesDir: string,
  targetDir: string,
  projectName: string,
  language: SupportedLanguage = 'en'
): Promise<void> {
  const locale = getLocaleManager(language);

  // Verify templates directory exists
  if (!fs.existsSync(templatesDir)) {
    console.error(chalk.red(`\n${locale.t('cli', 'init.errors.templatesNotFound', { path: templatesDir })}`));
    const packageRoot = findPackageRoot(templatesDir);
    if (packageRoot) {
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.packageRoot', { root: packageRoot })}`));
      console.error(chalk.red(`   ${locale.t('cli', 'init.errors.tryingAlternate')}`));

      // Try src/templates as fallback
      const altPath = path.join(packageRoot, 'src', 'templates');
      if (fs.existsSync(altPath)) {
        console.error(chalk.yellow(`   ${locale.t('cli', 'init.errors.foundTemplatesAt', { path: altPath })}`));
        templatesDir = altPath;
      } else {
        throw new Error('Failed to locate templates directory');
      }
    } else {
      throw new Error('Failed to locate templates directory and package root');
    }
  }

  // Copy README.md
  const readmeTemplate = path.join(templatesDir, 'README.md.template');
  if (fs.existsSync(readmeTemplate)) {
    let readme = fs.readFileSync(readmeTemplate, 'utf-8');
    readme = readme.replace(/{{PROJECT_NAME}}/g, projectName);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
  }

  // Generate CLAUDE.md
  const skillsDir = findSourceDir('skills', templatesDir);
  const agentsDir = findSourceDir('agents', templatesDir);
  const commandsDir = findSourceDir('commands', templatesDir);

  const claudeMdTemplatePath = path.normalize(path.join(templatesDir, 'CLAUDE.md.template'));
  const claudeGen = new ClaudeMdGenerator(skillsDir, agentsDir, commandsDir);
  const claudeMd = await claudeGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: fs.existsSync(claudeMdTemplatePath) ? claudeMdTemplatePath : undefined
  });

  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), claudeMd);

  // Generate AGENTS.md
  const agentsMdTemplatePath = path.normalize(path.join(templatesDir, 'AGENTS.md.template'));
  const agentsGen = new AgentsMdGenerator(skillsDir, agentsDir, commandsDir);
  const agentsMd = await agentsGen.generate({
    projectName,
    projectPath: targetDir,
    templatePath: fs.existsSync(agentsMdTemplatePath) ? agentsMdTemplatePath : undefined
  });

  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd);

  // Copy .gitignore
  const gitignoreTemplate = path.join(templatesDir, '.gitignore.template');
  if (fs.existsSync(gitignoreTemplate)) {
    fs.copyFileSync(gitignoreTemplate, path.join(targetDir, '.gitignore'));
  }

  // Copy .gitattributes
  const gitattributesTemplate = path.join(templatesDir, '.gitattributes.template');
  if (fs.existsSync(gitattributesTemplate)) {
    fs.copyFileSync(gitattributesTemplate, path.join(targetDir, '.gitattributes'));
  }
}

/**
 * Create .specweave/config.json with project settings
 */
export function createConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
  language: SupportedLanguage,
  enableDocsPreview: boolean = true,
  testMode?: TestMode,
  coverageTarget?: number
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  const config: Record<string, unknown> = {
    version: '2.0',
    project: {
      name: projectName,
      version: '0.1.0',
    },
    adapters: {
      default: adapter,
    },
    repository: {
      provider: 'local' as const
    },
    issueTracker: {
      provider: 'none' as const
    },
    sync: {
      enabled: false,
      direction: 'bidirectional' as const,
      autoSync: false,
      includeStatus: true,
      autoApplyLabels: true,
      settings: {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
        autoSyncOnCompletion: true
      }
    },
    hooks: {
      post_task_completion: {
        sync_living_docs: true,
        sync_tasks_md: true,
        external_tracker_sync: true
      },
      post_increment_planning: {
        auto_create_github_issue: false
      }
    },
  };

  // Add testing configuration if provided
  if (testMode && coverageTarget) {
    config.testing = {
      defaultTestMode: testMode,
      defaultCoverageTarget: coverageTarget,
      coverageTargets: {
        unit: Math.min(coverageTarget + 5, 95),
        integration: coverageTarget,
        e2e: Math.min(coverageTarget + 10, 100)
      }
    };
  }

  // Add documentation preview for Claude
  if (adapter === 'claude') {
    config.documentation = {
      preview: {
        enabled: enableDocsPreview,
        autoInstall: false,
        port: 3015,
        openBrowser: true,
        theme: 'default',
        excludeFolders: ['legacy', 'node_modules']
      }
    };
  }

  // Add language if non-English
  if (language !== 'en') {
    config.language = language;
    config.translation = {
      method: 'in-session',
      autoTranslateLivingDocs: false,
      keepFrameworkTerms: true,
      keepTechnicalTerms: true,
      translateCodeComments: true,
      translateVariableNames: false,
    };
  }

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
