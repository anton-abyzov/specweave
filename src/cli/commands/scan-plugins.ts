/**
 * CLI command: specweave scan-plugins [pluginsDir]
 * Batch-scans all plugins/{name}/skills/{name}/SKILL.md files for security issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { scanSkillMd } from '../../core/skill-security/scanner.js';
import { printScanReport, printBatchReport, toBatchJson } from '../../core/skill-security/reporter.js';
import type { BatchScanEntry } from '../../core/skill-security/reporter.js';

interface ScanPluginsOptions {
  json?: boolean;
  verbose?: boolean;
  dir?: string;
}

/**
 * Discover all SKILL.md files under pluginsDir (plugins/{name}/skills/{name}/SKILL.md).
 */
function discoverSkillFiles(pluginsDir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(pluginsDir)) return files;

  const plugins = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(pluginsDir, e.name));

  for (const pluginDir of plugins) {
    const skillsDir = path.join(pluginDir, 'skills');
    if (!fs.existsSync(skillsDir)) continue;

    const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(skillsDir, e.name));

    for (const skillDir of skills) {
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        files.push(skillFile);
      }
    }
  }

  return files.sort();
}

export async function scanPluginsCommand(options: ScanPluginsOptions = {}): Promise<void> {
  // Determine plugins directory
  const cwd = process.cwd();
  const pluginsDir = options.dir ?? path.join(cwd, 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.error(chalk.red(`Error: plugins directory not found: ${pluginsDir}`));
    console.error(chalk.dim('Run this command from the specweave project root, or use --dir <path>.'));
    process.exit(1);
    return;
  }

  const skillFiles = discoverSkillFiles(pluginsDir);

  if (skillFiles.length === 0) {
    console.error(chalk.yellow('No SKILL.md files found under: ' + pluginsDir));
    process.exit(0);
    return;
  }

  console.log(chalk.dim(`\n  Found ${skillFiles.length} SKILL.md files to scan...\n`));

  const entries: BatchScanEntry[] = [];

  for (const file of skillFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const result = scanSkillMd(content);
    entries.push({ file, result });

    if (options.verbose && result.findings.length > 0) {
      printScanReport(file, result);
    }
  }

  if (options.json) {
    console.log(toBatchJson(entries));
    const hasFailure = entries.some(e => e.result.exitCode === 2);
    if (hasFailure) process.exit(2);
    const hasWarnings = entries.some(e => e.result.exitCode === 1);
    if (hasWarnings) process.exit(1);
    return;
  }

  printBatchReport(entries);

  const hasFailure = entries.some(e => e.result.exitCode === 2);
  if (hasFailure) process.exit(2);

  const hasWarnings = entries.some(e => e.result.exitCode === 1);
  if (hasWarnings) process.exit(1);
}
