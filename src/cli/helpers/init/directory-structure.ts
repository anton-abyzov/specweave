/**
 * Directory structure creation and template copying
 *
 * Enhanced with smart scaffolding for living docs (v0.35.0+)
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
import { mergeInstructionFile, parseTemplateSections, getPackageVersion } from './instruction-file-merger.js';
import { generateSmartGitignore } from './gitignore-generator.js';
// ensureClaudeSettingsWithLsp removed (v1.0.210) - LSP is opt-in only
import {
  LivingDocsScaffold,
  scanExistingDocs,
  findSimilarFolders,
  type ScaffoldResult,
  type DetectedDoc,
} from '../../../core/living-docs/scaffolding/index.js';
import { consoleLogger } from '../../../utils/logger.js';

/**
 * Create the .specweave directory structure
 *
 * Enhanced with smart living docs scaffolding:
 * - Creates full docs structure with README files
 * - Detects project ID from git remote
 * - Scans for existing documentation to merge
 *
 * @param targetDir - Target directory
 * @param _adapterName - Adapter name (unused, kept for API compatibility)
 * @param options - Optional scaffolding options
 * @returns Promise that resolves when scaffolding is complete
 */
export async function createDirectoryStructure(
  targetDir: string,
  _adapterName: string,
  options?: { projectName?: string; scanExistingDocs?: boolean }
): Promise<void> {
  // Core directories (created first for immediate availability)
  // NOTE: .specweave/memory/ is DEPRECATED (v2.0) - learnings now go to CLAUDE.md
  const coreDirectories = [
    '.specweave/increments',
    '.specweave/cache',
    '.specweave/state',
    '.specweave/logs/reflect',  // For reflection logs
  ];

  coreDirectories.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });

  // Create reflect-config.json with auto-reflect enabled by default (v1.0.96+)
  // This enables the self-improving AI feature where learnings are extracted
  // from user corrections and approvals during sessions
  const reflectConfigPath = path.join(targetDir, '.specweave', 'state', 'reflect-config.json');
  if (!fs.existsSync(reflectConfigPath)) {
    const reflectConfig = {
      enabled: true,
      autoReflect: true,
      enabledAt: new Date().toISOString(),
      confidenceThreshold: 'medium',
      maxLearningsPerSession: 10,
      gitCommit: false,  // Don't auto-commit by default, let user decide
      gitPush: false
    };
    fs.writeJsonSync(reflectConfigPath, reflectConfig, { spaces: 2 });
    console.log(chalk.green('   ✓ Auto-reflection enabled (self-improving AI)'));
  }

  // Use smart scaffolding for living docs structure
  const scaffold = new LivingDocsScaffold({
    projectPath: targetDir,
    projectName: options?.projectName,
    logger: consoleLogger,
    overwrite: false,
  });

  try {
    // Properly await scaffold completion
    const result: ScaffoldResult = await scaffold.scaffold();

    if (result.success) {
      console.log(chalk.green('   ✓ Living docs structure created'));
      if (result.dirsCreated.length > 0) {
        console.log(chalk.gray(`     ${result.dirsCreated.length} directories created`));
      }
    } else {
      console.log(chalk.yellow('   ⚠ Living docs scaffolding had errors:'));
      result.errors.forEach(err => console.log(chalk.gray('     ' + err)));
    }
  } catch {
    // Fallback to basic structure if scaffolding fails
    console.log(chalk.yellow('   ⚠ Smart scaffolding failed, using basic structure'));
    createBasicDocsStructure(targetDir);
  }
}

/**
 * Fallback: Create basic docs structure without scaffolding
 */
function createBasicDocsStructure(targetDir: string): void {
  const directories = [
    '.specweave/docs/internal/strategy',
    '.specweave/docs/internal/specs',
    '.specweave/docs/internal/architecture',
    '.specweave/docs/internal/architecture/adr',
    '.specweave/docs/internal/architecture/diagrams',
    '.specweave/docs/internal/delivery',
    '.specweave/docs/internal/operations',
    '.specweave/docs/internal/governance',
    '.specweave/docs/internal/modules',
    '.specweave/docs/internal/organization',
    '.specweave/docs/public',
    '.specweave/docs/public/overview',
    '.specweave/docs/public/api',
    '.specweave/docs/public/guides',
  ];

  directories.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });
}

/**
 * Scan for existing documentation and suggest merges
 *
 * Call this after createDirectoryStructure to detect existing docs
 * that could be imported into living docs.
 *
 * @param targetDir - Target directory
 * @returns Detected documentation files with merge suggestions
 */
export async function scanAndSuggestMerges(targetDir: string): Promise<{
  detected: DetectedDoc[];
  suggestions: Map<string, DetectedDoc[]>;
  similarFolders: Map<string, string[]>;
}> {
  const detected = await scanExistingDocs({
    projectPath: targetDir,
    recursive: true,
    maxDepth: 5,
    minConfidence: 0.3,
    logger: consoleLogger,
  });

  const similarFolders = findSimilarFolders(targetDir, detected);

  // Group by suggested target
  const suggestions = new Map<string, DetectedDoc[]>();
  for (const doc of detected) {
    const target = doc.suggestedTarget;
    if (!suggestions.has(target)) {
      suggestions.set(target, []);
    }
    suggestions.get(target)!.push(doc);
  }

  return { detected, suggestions, similarFolders };
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

  // Generate/Merge CLAUDE.md with smart preservation of user content
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const claudeMdTemplatePath = path.normalize(path.join(templatesDir, 'CLAUDE.md.template'));

  if (fs.existsSync(claudeMdTemplatePath)) {
    const templateContent = fs.readFileSync(claudeMdTemplatePath, 'utf-8');
    const sections = parseTemplateSections(templateContent);
    const existingContent = fs.existsSync(claudeMdPath)
      ? fs.readFileSync(claudeMdPath, 'utf-8')
      : null;

    const mergeResult = mergeInstructionFile(
      existingContent,
      sections,
      'claude',
      getPackageVersion(),
      projectName
    );

    fs.writeFileSync(claudeMdPath, mergeResult.content);

    // Log merge action for user visibility
    if (mergeResult.action === 'merged') {
      console.log(chalk.blue('   ✓ CLAUDE.md merged (preserved ' + mergeResult.preserved + ' user sections)'));
      if (mergeResult.updated.length > 0) {
        console.log(chalk.gray('     Updated: ' + mergeResult.updated.join(', ')));
      }
      if (mergeResult.warnings.length > 0) {
        mergeResult.warnings.forEach(w => console.log(chalk.yellow('     ⚠ ' + w)));
      }
    } else if (mergeResult.action === 'created') {
      console.log(chalk.green('   ✓ CLAUDE.md created'));
    }
  } else {
    // Fallback to old generator if template not found
    const skillsDir = findSourceDir('skills', templatesDir);
    const agentsDir = findSourceDir('agents', templatesDir);
    const commandsDir = findSourceDir('commands', templatesDir);
    const claudeGen = new ClaudeMdGenerator(skillsDir, agentsDir, commandsDir);
    const claudeMd = await claudeGen.generate({
      projectName,
      projectPath: targetDir,
      templatePath: undefined
    });
    fs.writeFileSync(claudeMdPath, claudeMd);
  }

  // Generate/Merge AGENTS.md with smart preservation of user content
  const agentsMdPath = path.join(targetDir, 'AGENTS.md');
  const agentsMdTemplatePath = path.normalize(path.join(templatesDir, 'AGENTS.md.template'));

  if (fs.existsSync(agentsMdTemplatePath)) {
    const templateContent = fs.readFileSync(agentsMdTemplatePath, 'utf-8');
    const sections = parseTemplateSections(templateContent);
    const existingContent = fs.existsSync(agentsMdPath)
      ? fs.readFileSync(agentsMdPath, 'utf-8')
      : null;

    const mergeResult = mergeInstructionFile(
      existingContent,
      sections,
      'agents',
      getPackageVersion(),
      projectName
    );

    fs.writeFileSync(agentsMdPath, mergeResult.content);

    if (mergeResult.action === 'merged') {
      console.log(chalk.blue('   ✓ AGENTS.md merged (preserved ' + mergeResult.preserved + ' user sections)'));
    } else if (mergeResult.action === 'created') {
      console.log(chalk.green('   ✓ AGENTS.md created'));
    }
  } else {
    // Fallback to old generator
    const skillsDir = findSourceDir('skills', templatesDir);
    const agentsDir = findSourceDir('agents', templatesDir);
    const commandsDir = findSourceDir('commands', templatesDir);
    const agentsGen = new AgentsMdGenerator(skillsDir, agentsDir, commandsDir);
    const agentsMd = await agentsGen.generate({
      projectName,
      projectPath: targetDir,
      templatePath: undefined
    });
    fs.writeFileSync(agentsMdPath, agentsMd);
  }

  // Generate smart .gitignore based on detected tech stack (v1.0.130+)
  // Falls back to template if detection fails
  try {
    const { detection, result } = await generateSmartGitignore(targetDir, undefined, {
      merge: true,
      backup: true,
      includeSpecweave: true,
      verbose: false,
    });

    if (result.action === 'created') {
      const techCount = detection.detected.length;
      if (techCount > 0) {
        console.log(chalk.green(`   ✓ .gitignore created (${techCount} tech patterns detected)`));
      } else {
        console.log(chalk.green('   ✓ .gitignore created'));
      }
    } else if (result.action === 'merged') {
      console.log(chalk.blue('   ✓ .gitignore updated with detected patterns'));
    }
  } catch {
    // Fallback to template copy if smart generation fails
    const gitignoreTemplate = path.join(templatesDir, '.gitignore.template');
    if (fs.existsSync(gitignoreTemplate)) {
      fs.copyFileSync(gitignoreTemplate, path.join(targetDir, '.gitignore'));
      console.log(chalk.green('   ✓ .gitignore created (from template)'));
    }
  }

  // Copy .gitattributes
  const gitattributesTemplate = path.join(templatesDir, '.gitattributes.template');
  if (fs.existsSync(gitattributesTemplate)) {
    fs.copyFileSync(gitattributesTemplate, path.join(targetDir, '.gitattributes'));
  }

  // LSP is OPT-IN only (v1.0.210+)
  // Users who want LSP should run: specweave lsp enable
  // See: specweave lsp status
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
    multiProject: {
      enabled: false,  // Single-project mode by default (v0.34.0+)
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
    // Auto mode configuration (stop hook behavior)
    auto: {
      enabled: true,
      maxRetries: 20,           // Circuit breaker after N retries
      requireTests: false,      // Require tests to pass before completion
      requireValidation: true,  // Require validation before completion
      requireJudgeLLM: false,   // Require LLM judge validation
      skipQualityGates: false,  // Skip quality gates (not recommended)
    },
    // LSP configuration (v1.0.193+)
    // Enables language server integration for code intelligence
    lsp: {
      enabled: true,
      autoInstallPlugins: true,
      marketplace: 'boostvolt/claude-code-lsps',  // Official plugins are broken (Issue #15148)
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
