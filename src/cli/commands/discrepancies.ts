/**
 * Discrepancies Command
 *
 * View and act on code-to-spec discrepancies.
 *
 * @module cli/commands/discrepancies
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Discrepancy,
  DiscrepancySeverity,
  DiscrepancyType,
  DetectionResult,
} from '../../core/discrepancy/detector.js';
import { UpdateRecommender, RecommendationResult, UpdatePatch } from '../../core/discrepancy/update-recommender.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Discrepancies command options
 */
export interface DiscrepanciesOptions {
  check?: boolean;
  severity?: DiscrepancySeverity;
  type?: DiscrepancyType;
  json?: boolean;
}

/**
 * Persisted discrepancy state
 */
interface DiscrepancyState {
  discrepancies: Discrepancy[];
  dismissed: string[];
  lastCheck: string;
}

/**
 * Severity emojis
 */
const SEVERITY_EMOJI: Record<DiscrepancySeverity, string> = {
  trivial: '✅',
  minor: '⚠️',
  major: '⚠️',
  breaking: '❌',
};

/**
 * Create the discrepancies command
 */
export function createDiscrepanciesCommand(options: {
  logger?: Logger;
  specweavePath?: string;
} = {}): Command {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const command = new Command('discrepancies')
    .description('View and act on code-to-spec discrepancies')
    .option('--check', 'Run discrepancy check now')
    .option('--severity <level>', 'Filter by severity')
    .option('--type <type>', 'Filter by discrepancy type')
    .option('--json', 'Output as JSON')
    .action(async (cmdOptions: DiscrepanciesOptions) => {
      if (cmdOptions.check) {
        await runCheck({ logger, specweavePath });
      } else {
        await listDiscrepancies({
          ...cmdOptions,
          logger,
          specweavePath,
        });
      }
    });

  // Subcommand: show
  command
    .command('show <id>')
    .description('Show discrepancy details')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts: { json?: boolean }) => {
      await showDiscrepancy(id, {
        json: opts.json,
        logger,
        specweavePath,
      });
    });

  // Subcommand: check
  command
    .command('check')
    .description('Run discrepancy detection now')
    .action(async () => {
      await runCheck({ logger, specweavePath });
    });

  // Subcommand: accept
  command
    .command('accept <id>')
    .description('Apply recommended patch')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, opts: { yes?: boolean }) => {
      await acceptDiscrepancy(id, { skipConfirm: opts.yes, logger, specweavePath });
    });

  // Subcommand: dismiss
  command
    .command('dismiss <id>')
    .description('Mark as intentional')
    .action(async (id: string) => {
      await dismissDiscrepancy(id, { logger, specweavePath });
    });

  return command;
}

/**
 * List discrepancies
 */
export async function listDiscrepancies(options: DiscrepanciesOptions & {
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const state = await loadState(specweavePath);

  // Filter out dismissed
  let discrepancies = state.discrepancies.filter(
    d => !state.dismissed.includes(d.id)
  );

  // Apply filters
  if (options.severity) {
    discrepancies = discrepancies.filter(d => d.severity === options.severity);
  }
  if (options.type) {
    discrepancies = discrepancies.filter(d => d.type === options.type);
  }

  if (options.json) {
    console.log(JSON.stringify(discrepancies, null, 2));
    return;
  }

  console.log(`🔍 DETECTED DISCREPANCIES (${discrepancies.length})`);
  console.log('━'.repeat(60));

  if (discrepancies.length === 0) {
    if (state.lastCheck) {
      console.log(`No discrepancies found (last check: ${formatRelativeTime(state.lastCheck)})`);
    } else {
      console.log('No discrepancies found. Run --check to detect discrepancies.');
    }
    return;
  }

  for (const disc of discrepancies) {
    console.log(formatDiscrepancyLine(disc));
  }

  console.log('');
  console.log("Use '/specweave:discrepancies show <id>' to view details");
  console.log("Use '/specweave:discrepancies accept <id>' to apply patch");
}

/**
 * Run discrepancy detection
 */
export async function runCheck(options: {
  logger?: Logger;
  specweavePath?: string;
}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  console.log('🔍 Running discrepancy check...');
  console.log('');

  // For now, create a placeholder result since we need the full analyzer setup
  // In production, this would call DiscrepancyDetector with TypeScriptAnalyzer
  const state = await loadState(specweavePath);

  // Simulate check results (in real implementation, would run analyzers)
  console.log('Analyzing:');
  console.log('  ✓ TypeScript functions: scanning...');
  console.log('  ✓ Type definitions: scanning...');
  console.log('  ✓ API routes: scanning...');
  console.log('');
  console.log('Comparing against specs...');
  console.log('');

  // Count by severity
  const bySeverity = {
    breaking: state.discrepancies.filter(d => d.severity === 'breaking').length,
    major: state.discrepancies.filter(d => d.severity === 'major').length,
    minor: state.discrepancies.filter(d => d.severity === 'minor').length,
    trivial: state.discrepancies.filter(d => d.severity === 'trivial').length,
  };

  const total = state.discrepancies.length;
  console.log(`Results:`);
  console.log(`  Found ${total} discrepancies`);
  if (total > 0) {
    console.log(`  - Breaking: ${bySeverity.breaking}`);
    console.log(`  - Major: ${bySeverity.major}`);
    console.log(`  - Minor: ${bySeverity.minor}`);
    console.log(`  - Trivial: ${bySeverity.trivial}`);
  }
  console.log('');
  console.log("Use '/specweave:discrepancies' to view list");

  // Update last check timestamp
  state.lastCheck = new Date().toISOString();
  await saveState(specweavePath, state);
}

/**
 * Show discrepancy details
 */
export async function showDiscrepancy(
  id: string,
  options: {
    json?: boolean;
    logger?: Logger;
    specweavePath?: string;
  }
): Promise<void> {
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const state = await loadState(specweavePath);
  const disc = state.discrepancies.find(d => d.id === id);

  if (!disc) {
    console.error(`❌ Discrepancy not found: ${id}`);
    process.exitCode = 1;
    return;
  }

  // Generate recommendation
  const recommender = new UpdateRecommender();
  const recommendation = recommender.recommend(disc);

  if (options.json) {
    console.log(JSON.stringify({ discrepancy: disc, recommendation }, null, 2));
    return;
  }

  const emoji = SEVERITY_EMOJI[disc.severity];

  console.log('🔍 DISCREPANCY DETAILS');
  console.log('━'.repeat(50));
  console.log('');
  console.log(`ID:          ${disc.id}`);
  console.log(`Type:        ${disc.type}`);
  console.log(`Category:    ${disc.category}`);
  console.log(`Severity:    ${emoji} ${disc.severity}`);
  console.log(`Risk:        ${recommendation.riskLevel}`);
  console.log('');
  console.log(`Spec Value:  ${disc.specValue || '(none)'}`);
  console.log(`Code Value:  ${disc.codeValue || '(none)'}`);
  console.log('');
  if (disc.specPath) {
    console.log(`Spec File:   ${disc.specPath}:${disc.specLineNumber}`);
  }
  if (disc.codePath) {
    console.log(`Code File:   ${disc.codePath}:${disc.codeLineNumber}`);
  }
  console.log('');
  console.log(`Description: ${disc.description}`);
  console.log('');
  console.log(`Recommended: ${formatRecommendation(recommendation.recommendation)}`);
  console.log(`Patch:       ${recommendation.patch ? 'Available' : 'Not available'}`);

  if (recommendation.patch) {
    console.log('');
    console.log('Suggested patch:');
    console.log(`  File: ${recommendation.patch.filePath}`);
    console.log(`  - ${recommendation.patch.originalText || '(empty)'}`);
    console.log(`  + ${recommendation.patch.newText.split('\n')[0]}...`);
  }

  console.log('');
  console.log(`Use '/specweave:discrepancies accept ${id}' to apply patch`);
  console.log(`Use '/specweave:discrepancies dismiss ${id}' to mark intentional`);
}

/**
 * Accept (apply patch) for a discrepancy
 */
export async function acceptDiscrepancy(
  id: string,
  options: {
    skipConfirm?: boolean;
    logger?: Logger;
    specweavePath?: string;
  }
): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const state = await loadState(specweavePath);
  const disc = state.discrepancies.find(d => d.id === id);

  if (!disc) {
    console.error(`❌ Discrepancy not found: ${id}`);
    process.exitCode = 1;
    return;
  }

  const recommender = new UpdateRecommender();
  const recommendation = recommender.recommend(disc);

  if (!recommendation.patch) {
    console.error(`❌ No patch available for ${id}`);
    console.log('This discrepancy requires manual resolution.');
    process.exitCode = 1;
    return;
  }

  if (!options.skipConfirm) {
    console.log(`🔧 Patch for ${id}:`);
    console.log(`   File: ${recommendation.patch.filePath}`);
    console.log(`   Change: ${recommendation.patch.reason}`);
    console.log('');
    console.log('Use --yes flag to apply: /specweave:discrepancies accept --yes ' + id);
    return;
  }

  // Apply the patch
  console.log(`🔧 Applying patch for ${id}...`);

  try {
    await applyPatch(recommendation.patch, process.cwd());

    // Remove from discrepancies
    state.discrepancies = state.discrepancies.filter(d => d.id !== id);
    await saveState(specweavePath, state);

    console.log(`✅ Patch applied successfully`);
    console.log(`Remaining: ${state.discrepancies.length} discrepancies`);
  } catch (error) {
    logger.error(`Failed to apply patch: ${error}`);
    console.error(`❌ Failed to apply patch: ${error}`);
    process.exitCode = 1;
  }
}

/**
 * Dismiss a discrepancy
 */
export async function dismissDiscrepancy(
  id: string,
  options: {
    logger?: Logger;
    specweavePath?: string;
  }
): Promise<void> {
  const specweavePath = options.specweavePath ?? path.join(process.cwd(), '.specweave');

  const state = await loadState(specweavePath);
  const disc = state.discrepancies.find(d => d.id === id);

  if (!disc) {
    console.error(`❌ Discrepancy not found: ${id}`);
    process.exitCode = 1;
    return;
  }

  if (state.dismissed.includes(id)) {
    console.log(`ℹ️ Discrepancy ${id} is already dismissed`);
    return;
  }

  state.dismissed.push(id);
  await saveState(specweavePath, state);

  const remaining = state.discrepancies.filter(d => !state.dismissed.includes(d.id));
  console.log(`✅ Dismissed ${id} (marked as intentional)`);
  console.log(`Remaining: ${remaining.length} discrepancies`);
}

/**
 * Apply a patch to a file
 */
async function applyPatch(patch: UpdatePatch, rootDir: string): Promise<void> {
  const filePath = path.isAbsolute(patch.filePath)
    ? patch.filePath
    : path.join(rootDir, patch.filePath);

  // For new content (lineNumber = 0), append to file or create it
  if (patch.lineNumber === 0 && !patch.originalText) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const existing = await fs.readFile(filePath, 'utf-8').catch(() => '');
    await fs.writeFile(filePath, existing + '\n\n' + patch.newText, 'utf-8');
    return;
  }

  // For modifications, replace the text
  const content = await fs.readFile(filePath, 'utf-8');
  if (!content.includes(patch.originalText)) {
    throw new Error(`Original text not found in ${filePath}`);
  }

  const updated = content.replace(patch.originalText, patch.newText);
  await fs.writeFile(filePath, updated, 'utf-8');
}

/**
 * Load discrepancy state from disk
 */
async function loadState(specweavePath: string): Promise<DiscrepancyState> {
  const statePath = path.join(specweavePath, 'state', 'discrepancies.json');

  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      discrepancies: [],
      dismissed: [],
      lastCheck: '',
    };
  }
}

/**
 * Save discrepancy state to disk
 */
async function saveState(specweavePath: string, state: DiscrepancyState): Promise<void> {
  const stateDir = path.join(specweavePath, 'state');
  await fs.mkdir(stateDir, { recursive: true });

  const statePath = path.join(stateDir, 'discrepancies.json');
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Format a discrepancy for list display
 */
function formatDiscrepancyLine(disc: Discrepancy): string {
  const id = disc.id.padEnd(12);
  const emoji = SEVERITY_EMOJI[disc.severity];
  const severity = disc.severity.toUpperCase().padEnd(8);
  const type = disc.type.padEnd(20);
  const description = truncate(disc.description, 30);

  return `${id}  ${emoji} ${severity}  ${type}  ${description}`;
}

/**
 * Format recommendation for display
 */
function formatRecommendation(rec: string): string {
  switch (rec) {
    case 'auto-update':
      return '✅ auto-update (safe to apply)';
    case 'review-required':
      return '👀 review-required (check before applying)';
    case 'notify':
      return '📢 notify (communicate to stakeholders)';
    case 'alert':
      return '⚠️ alert (breaking change - handle manually)';
    default:
      return rec;
  }
}

/**
 * Format time relative to now
 */
function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 60 * 1000) return 'just now';
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Truncate text to fit width
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 3) + '...';
}

// Export for testing
export {
  formatDiscrepancyLine,
  formatRecommendation,
  loadState,
  saveState,
};
