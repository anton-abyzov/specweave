/**
 * Directory structure creation and template copying
 *
 * Enhanced with smart scaffolding for living docs (v0.35.0+)
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import type { TestMode } from './types.js';
import { findPackageRoot } from './path-utils.js';
import { applyInstructionTemplate, type InstructionFileName } from './instruction-file-writer.js';
import { detectStackCommands } from './stack-detector.js';
import { generateSmartGitignore } from './gitignore-generator.js';
// ensureClaudeSettingsWithLsp removed (v1.0.210) - LSP is opt-in only
import {
  scanExistingDocs,
  findSimilarFolders,
  type DetectedDoc,
} from '../../../core/living-docs/scaffolding/index.js';
import { consoleLogger } from '../../../utils/logger.js';

/** The committed project memory index `init` creates (see the AGENTS.md template). */
export const MEMORY_INDEX_STUB =
  '# Project memory index\n' +
  'Committed and read by every tool and account: one file per durable fact in this folder, one line per file here (see AGENTS.md).\n';

/**
 * Create the .specweave directory structure: increments/, state/ and the
 * committed memory index. No living-docs scaffold (3.0).
 *
 * @param targetDir - Target directory
 * @param _adapterName - Adapter name (unused, kept for API compatibility)
 * @param _options - Unused, kept for API compatibility
 */
export async function createDirectoryStructure(
  targetDir: string,
  _adapterName: string,
  _options?: { projectName?: string; scanExistingDocs?: boolean }
): Promise<void> {
  // Guard: Prevent creating .specweave inside an existing .specweave/increments/ path
  const resolvedTarget = path.resolve(targetDir);
  const incrementsSegment = path.join('.specweave', 'increments');
  if (resolvedTarget.includes(incrementsSegment)) {
    throw new Error(
      'Cannot initialize SpecWeave inside .specweave/increments/. ' +
      'This would create a nested .specweave folder. ' +
      'Run specweave init from your project root directory.'
    );
  }

  for (const dir of ['.specweave/increments', '.specweave/state', '.specweave/memory']) {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  }
  ensureMemoryIndex(targetDir);
}

/** Create `.specweave/memory/MEMORY.md` unless one exists. */
export function ensureMemoryIndex(targetDir: string): void {
  const index = path.join(targetDir, '.specweave', 'memory', 'MEMORY.md');
  if (fs.existsSync(index)) return;
  fs.mkdirSync(path.dirname(index), { recursive: true });
  fs.writeFileSync(index, MEMORY_INDEX_STUB, 'utf-8');
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
  language: SupportedLanguage = 'en',
  _adapter: string = 'claude'
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

  // README.md only for a project that has none: never replace the user's own.
  const readmeTemplate = path.join(templatesDir, 'README.md.template');
  if (fs.existsSync(readmeTemplate) && !fs.existsSync(path.join(targetDir, 'README.md'))) {
    let readme = fs.readFileSync(readmeTemplate, 'utf-8');
    readme = readme.replace(/{{PROJECT_NAME}}/g, projectName);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
  }

  // Generate/Merge CLAUDE.md (Claude Code) and AGENTS.md (every other tool)
  // through the same merger. User content outside SW markers is preserved.
  const commands = detectStackCommands(targetDir);
  const instructionFiles: InstructionFileName[] = ['CLAUDE.md', 'AGENTS.md'];
  for (const filename of instructionFiles) {
    const result = applyInstructionTemplate({
      projectPath: targetDir,
      templatesDir,
      filename,
      projectName,
      commands,
    });

    if (result.action === 'created') {
      console.log(chalk.green(`   ✓ ${filename} created`));
    } else if (result.action === 'merged') {
      console.log(chalk.blue(`   ✓ ${filename} merged (preserved ${result.preserved} user section(s))`));
      if (result.updated.length > 0) console.log(chalk.gray('     Updated: ' + result.updated.join(', ')));
      if (result.removed.length > 0) console.log(chalk.gray('     Removed: ' + result.removed.join(', ')));
    } else if (result.action === 'unchanged') {
      console.log(chalk.gray(`   ⊘ ${filename} already up to date`));
    }
    result.warnings.forEach(w => console.log(chalk.yellow('     ⚠ ' + w)));
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

  // .gitattributes: create from template, or append only what is missing.
  ensureGitattributes(targetDir, path.join(templatesDir, '.gitattributes.template'));

  // LSP is OPT-IN only (v1.0.210+)
  // Users who want LSP should run: specweave lsp enable
  // See: specweave lsp status
}

// Required so concurrent agents never lose ledger lines on a merge.
export const LEDGER_MERGE_ATTRIBUTE = '**/ledger.jsonl merge=union';

/**
 * Create `.gitattributes` from the template, or (when the user already has one)
 * append only the lines SpecWeave needs. Idempotent: re-running init never
 * duplicates a line and never clobbers user content.
 */
export function ensureGitattributes(targetDir: string, templatePath: string): void {
  const target = path.join(targetDir, '.gitattributes');
  if (!fs.existsSync(target)) {
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, target);
      return;
    }
    fs.writeFileSync(target, `${LEDGER_MERGE_ATTRIBUTE}\n`, 'utf-8');
    return;
  }
  const existing = fs.readFileSync(target, 'utf-8');
  if (existing.split(/\r?\n/).some((l) => l.trim() === LEDGER_MERGE_ATTRIBUTE)) return;
  const prefix = existing.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(
    target,
    `${existing}${prefix}\n# Append-only task ledger: keep every line from both sides on a merge\n${LEDGER_MERGE_ATTRIBUTE}\n`,
    'utf-8',
  );
}

/**
 * Write a minimal .specweave/config.json so that findProjectRoot() can
 * resolve this directory as a SpecWeave project BEFORE createDirectoryStructure()
 * creates the increments/ folder.  Without this, next-id may resolve to a
 * sibling project during the init window (AD-3).
 *
 * If config.json already exists (e.g. re-init), this is a no-op.
 */
export function createMinimalConfig(targetDir: string, projectName: string): void {
  const specweaveDir = path.join(targetDir, '.specweave');
  const configPath = path.join(specweaveDir, 'config.json');

  if (fs.existsSync(configPath)) return; // Don't overwrite existing config

  fs.mkdirSync(specweaveDir, { recursive: true });
  fs.writeJsonSync(configPath, {
    version: '2.0',
    project: { name: projectName },
  }, { spaces: 2 });
}

/**
 * Create .specweave/config.json with project settings
 *
 * If a minimal config already exists (from createMinimalConfig), this
 * overwrites it with the full configuration.
 */
export function createConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
  testMode?: TestMode,
  coverageTarget?: number,
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
      provider: 'local' as const,
    },
    testing: {
      // `specweave verify` falls back to stack auto-detection while this is empty.
      commands: [],
      // A test mode or coverage target is written only when the caller asks for one.
      ...(testMode ? { mode: testMode } : {}),
      ...(coverageTarget
        ? {
            coverage: {
              unit: Math.min(coverageTarget + 5, 95),
              integration: coverageTarget,
              e2e: Math.min(coverageTarget + 10, 100),
            },
          }
        : {}),
    },
    // Advisory WIP note only — nothing blocks on it.
    limits: {
      activeIncrements: 3,
    },
    planning: {
      deepInterview: 'off',
    },
    // Auto mode: only the keys something reads. The Stop hook stops the loop
    // after maxTurns turns or a session older than maxSessionAge seconds;
    // `specweave auto` reads requireTests.
    auto: {
      maxTurns: 20,
      maxSessionAge: 7200,
      requireTests: false,
    },
    // Living docs are opt-in: set to 'onDone' to regenerate them at closure.
    livingDocs: false,
    // LSP configuration — language server integration for code intelligence
    lsp: {
      enabled: true,
    },
  };

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
