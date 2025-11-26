/**
 * Feature ID Collision Detection Utility
 *
 * CRITICAL (2025-11-26): Prevents FS-XXX vs FS-XXXE collisions
 *
 * Problem: Internal feature IDs (FS-001) were generated without checking
 * if external features (FS-001E) existed with the same numeric index.
 *
 * Solution: Before generating any internal feature ID, check if either
 * FS-XXX or FS-XXXE exists. If collision detected, increment to next available.
 *
 * Usage:
 * ```typescript
 * // Instead of: const featureId = `FS-${num.toString().padStart(3, '0')}`;
 * // Use:
 * const num = await findNextAvailableInternalId(incrementNum, specsPath, projectId);
 * const featureId = `FS-${num.toString().padStart(3, '0')}`;
 * ```
 */

import * as fs from './fs-native.js';
import path from 'path';
import { Logger, consoleLogger } from './logger.js';

/**
 * Options for collision detection
 */
export interface CollisionCheckOptions {
  /** Logger instance for warnings */
  logger?: Logger;

  /** Maximum iterations to prevent infinite loops (default: 1000) */
  maxIterations?: number;
}

/**
 * Find the next available internal feature ID number that doesn't collide
 * with existing internal OR external features.
 *
 * CRITICAL: This function prevents FS-001 vs FS-001E collision by checking
 * if either variant exists before returning a number.
 *
 * @param baseNumber - Starting number (typically from increment ID)
 * @param specsPath - Path to specs directory (e.g., .specweave/docs/internal/specs)
 * @param projectId - Project ID for multi-project mode (e.g., "sw-meeting-cost-be")
 * @param options - Optional configuration
 * @returns Next available number that doesn't conflict with existing features
 *
 * @example
 * ```typescript
 * // Increment 0001 would normally generate FS-001
 * // But if FS-001E exists, this returns 2 (for FS-002)
 * const num = await findNextAvailableInternalId(1, specsPath, 'my-project');
 * ```
 */
export async function findNextAvailableInternalId(
  baseNumber: number,
  specsPath: string,
  projectId: string,
  options: CollisionCheckOptions = {}
): Promise<number> {
  const logger = options.logger ?? consoleLogger;
  const maxIterations = options.maxIterations ?? 1000;

  // Build path to project's specs folder
  const projectSpecsPath = path.join(specsPath, projectId);

  // If project folder doesn't exist, no collision possible
  if (!fs.existsSync(projectSpecsPath)) {
    return baseNumber;
  }

  let currentNumber = baseNumber;
  let iterations = 0;

  while (iterations < maxIterations) {
    const internalId = `FS-${currentNumber.toString().padStart(3, '0')}`;
    const externalId = `FS-${currentNumber.toString().padStart(3, '0')}E`;

    const internalPath = path.join(projectSpecsPath, internalId);
    const externalPath = path.join(projectSpecsPath, externalId);

    const internalExists = fs.existsSync(internalPath);
    const externalExists = fs.existsSync(externalPath);

    if (!internalExists && !externalExists) {
      // Found available slot
      if (currentNumber !== baseNumber) {
        logger.warn(
          `⚠️ Feature ID collision avoided: ${projectId}/FS-${baseNumber.toString().padStart(3, '0')}E exists, ` +
          `using FS-${currentNumber.toString().padStart(3, '0')} instead`
        );
      }
      return currentNumber;
    }

    // Log what we found for debugging
    if (iterations === 0 && (internalExists || externalExists)) {
      const existingId = externalExists ? externalId : internalId;
      logger.log(`   📋 Checking for collision: ${projectId}/${existingId} exists`);
    }

    currentNumber++;
    iterations++;
  }

  // Safety: Should never reach here
  throw new Error(
    `Unable to find available feature ID after ${maxIterations} iterations. ` +
    `Started at ${baseNumber}, checked up to ${currentNumber - 1}. ` +
    `This indicates a serious problem with the specs folder.`
  );
}

/**
 * Synchronous version of findNextAvailableInternalId
 *
 * Use this in synchronous contexts where async isn't available.
 */
export function findNextAvailableInternalIdSync(
  baseNumber: number,
  specsPath: string,
  projectId: string,
  options: CollisionCheckOptions = {}
): number {
  const logger = options.logger ?? consoleLogger;
  const maxIterations = options.maxIterations ?? 1000;

  // Build path to project's specs folder
  const projectSpecsPath = path.join(specsPath, projectId);

  // If project folder doesn't exist, no collision possible
  if (!fs.existsSync(projectSpecsPath)) {
    return baseNumber;
  }

  let currentNumber = baseNumber;
  let iterations = 0;

  while (iterations < maxIterations) {
    const internalId = `FS-${currentNumber.toString().padStart(3, '0')}`;
    const externalId = `FS-${currentNumber.toString().padStart(3, '0')}E`;

    const internalPath = path.join(projectSpecsPath, internalId);
    const externalPath = path.join(projectSpecsPath, externalId);

    const internalExists = fs.existsSync(internalPath);
    const externalExists = fs.existsSync(externalPath);

    if (!internalExists && !externalExists) {
      // Found available slot
      if (currentNumber !== baseNumber) {
        logger.warn(
          `⚠️ Feature ID collision avoided: ${projectId}/FS-${baseNumber.toString().padStart(3, '0')}E exists, ` +
          `using FS-${currentNumber.toString().padStart(3, '0')} instead`
        );
      }
      return currentNumber;
    }

    currentNumber++;
    iterations++;
  }

  // Safety: Should never reach here
  throw new Error(
    `Unable to find available feature ID after ${maxIterations} iterations.`
  );
}

/**
 * Check if a specific numeric index has a collision (either FS-XXX or FS-XXXE exists)
 *
 * @param number - Numeric index to check
 * @param specsPath - Path to specs directory
 * @param projectId - Project ID
 * @returns Object indicating which variants exist
 */
export function checkFeatureIdCollision(
  number: number,
  specsPath: string,
  projectId: string
): { internalExists: boolean; externalExists: boolean; hasCollision: boolean } {
  const projectSpecsPath = path.join(specsPath, projectId);

  if (!fs.existsSync(projectSpecsPath)) {
    return { internalExists: false, externalExists: false, hasCollision: false };
  }

  const internalId = `FS-${number.toString().padStart(3, '0')}`;
  const externalId = `FS-${number.toString().padStart(3, '0')}E`;

  const internalExists = fs.existsSync(path.join(projectSpecsPath, internalId));
  const externalExists = fs.existsSync(path.join(projectSpecsPath, externalId));

  return {
    internalExists,
    externalExists,
    hasCollision: internalExists || externalExists
  };
}
