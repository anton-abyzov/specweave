/**
 * ESM Helpers
 *
 * Provides __dirname and __filename equivalents for ES modules.
 * In ESM, these CommonJS globals are not available, so we need to derive them
 * from import.meta.url.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get __dirname equivalent in ESM
 *
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns The directory path of the calling module
 *
 * @example
 * ```ts
 * import { getDirname } from './utils/esm-helpers.js';
 * const __dirname = getDirname(import.meta.url);
 * ```
 */
export function getDirname(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get __filename equivalent in ESM
 *
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns The file path of the calling module
 *
 * @example
 * ```ts
 * import { getFilename } from './utils/esm-helpers.js';
 * const __filename = getFilename(import.meta.url);
 * ```
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * Get both __dirname and __filename at once
 *
 * @param importMetaUrl - Pass import.meta.url from the calling module
 * @returns Object with __dirname and __filename
 *
 * @example
 * ```ts
 * import { getFilePaths } from './utils/esm-helpers.js';
 * const { __dirname, __filename } = getFilePaths(import.meta.url);
 * ```
 */
export function getFilePaths(importMetaUrl: string): {
  __dirname: string;
  __filename: string;
} {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = dirname(__filename);
  return { __dirname, __filename };
}
