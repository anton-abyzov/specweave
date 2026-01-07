import fs from 'node:fs';
import path from 'node:path';
import { consoleLogger } from './logger.js';

/**
 * Information about the current repository context
 */
export interface RepositoryInfo {
  /** Whether this is the SpecWeave framework repository itself */
  isSpecWeaveRepo: boolean;
  /** Signals used to detect the repository type */
  detectionSignals: string[];
  /** Confidence level of the detection */
  confidence: 'high' | 'medium' | 'low';
  /** Optional warnings for contributors */
  warnings?: string[];
}

/**
 * Detects if the current working directory is the SpecWeave repository itself.
 *
 * Uses multiple signals:
 * - package.json name === 'specweave'
 * - Presence of src/cli/commands directory
 * - Presence of plugins/specweave directory
 *
 * Requires at least 2 signals for positive detection.
 *
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Repository detection information
 *
 * @example
 * ```typescript
 * const repoInfo = detectSpecWeaveRepository();
 * if (repoInfo.isSpecWeaveRepo) {
 *   console.log('⚠️  You are working on SpecWeave itself!');
 *   console.log('Detection signals:', repoInfo.detectionSignals);
 * }
 * ```
 */
export function detectSpecWeaveRepository(cwd: string = process.cwd()): RepositoryInfo {
  const signals: string[] = [];

  try {
    // Signal 1: package.json name
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'specweave') {
          signals.push('package.json:name=specweave');
        }
      } catch (error) {
        consoleLogger.debug(`Failed to parse package.json for repository detection: ${error}`);
      }
    }

    // Signal 2: src/cli/commands directory (SpecWeave CLI structure)
    const cliCommandsPath = path.join(cwd, 'src/cli/commands');
    if (fs.existsSync(cliCommandsPath)) {
      signals.push('src/cli/commands exists');
    }

    // Signal 3: plugins/specweave directory (SpecWeave plugin system)
    const pluginsPath = path.join(cwd, 'plugins/specweave');
    if (fs.existsSync(pluginsPath)) {
      signals.push('plugins/specweave exists');
    }

    // Require at least 2 signals for positive detection
    const isSpecWeaveRepo = signals.length >= 2;

    // Calculate confidence based on signal count
    const confidence = signals.length >= 3 ? 'high' : signals.length === 2 ? 'medium' : 'low';

    // Add warnings for SpecWeave contributors
    const warnings = isSpecWeaveRepo
      ? [
          'You are working on SpecWeave itself.',
          'Ensure changes are tested thoroughly.',
          'Consider if this change affects user projects vs framework development.'
        ]
      : undefined;

    return {
      isSpecWeaveRepo,
      detectionSignals: signals,
      confidence,
      warnings
    };
  } catch (error) {
    consoleLogger.error(`Repository detection failed: ${error}`);
    return {
      isSpecWeaveRepo: false,
      detectionSignals: [],
      confidence: 'low'
    };
  }
}

/**
 * Logs repository detection warnings if running in SpecWeave repo.
 *
 * @param repoInfo - Repository detection result
 */
export function logRepositoryWarnings(repoInfo: RepositoryInfo): void {
  if (repoInfo.isSpecWeaveRepo && repoInfo.warnings) {
    consoleLogger.warn('⚠️  SpecWeave Repository Detected');
    consoleLogger.warn(`   Confidence: ${repoInfo.confidence}`);
    consoleLogger.warn(`   Signals: ${repoInfo.detectionSignals.join(', ')}`);
    consoleLogger.warn('');
    repoInfo.warnings.forEach(warning => {
      consoleLogger.warn(`   • ${warning}`);
    });
    consoleLogger.warn('');
  }
}
