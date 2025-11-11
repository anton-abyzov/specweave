/**
 * Repository ID Generator
 *
 * Auto-generates clean, unique repository IDs from repository names.
 * Strips common suffixes and takes last segment for readable IDs.
 *
 * Examples:
 *   "my-saas-frontend-app" → "frontend"
 *   "acme-api-gateway-service" → "gateway"
 *   "backend-service" → "backend"
 *
 * @module repo-id-generator
 */

/**
 * Common repository name suffixes to strip
 */
const REPO_SUFFIXES = [
  '-app',
  '-service',
  '-api',
  '-frontend',
  '-backend',
  '-web',
  '-mobile'
] as const;

/**
 * Validation result for repository IDs
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Result of ensuring unique ID
 */
export interface UniqueIdResult {
  id: string;
  wasModified: boolean;
}

/**
 * Generate a clean repository ID from a repository name.
 *
 * Algorithm:
 * 1. Convert to lowercase
 * 2. Strip one common suffix from the end (if exists): -app, -service, etc.
 * 3. Split by hyphens
 * 4. Take the last segment
 *
 * @param repoName - Full repository name (e.g., "my-saas-frontend-app")
 * @returns Clean repository ID (e.g., "frontend")
 *
 * @example
 * generateRepoId("my-saas-frontend-app") // "frontend" (strips "-app", then takes "frontend")
 * generateRepoId("acme-api-gateway-service") // "gateway" (strips "-service", then takes "gateway")
 * generateRepoId("backend-service") // "backend" (strips "-service", then takes "backend")
 * generateRepoId("acme-saas-mobile") // "mobile" (no suffix to strip, takes "mobile")
 */
export function generateRepoId(repoName: string): string {
  if (!repoName) {
    return '';
  }

  let cleaned = repoName.toLowerCase();

  // Strip one suffix from the end (if exists)
  for (const suffix of REPO_SUFFIXES) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
      break; // Only strip one suffix
    }
  }

  // Split by hyphen and take last segment
  const segments = cleaned.split('-').filter(seg => seg.length > 0);

  if (segments.length === 0) {
    return '';
  }

  return segments[segments.length - 1];
}

/**
 * Ensure repository ID is unique by appending numeric suffix if needed.
 *
 * @param baseId - Base repository ID to make unique
 * @param existingIds - Set of already-used IDs
 * @returns Unique ID with modification flag
 *
 * @example
 * ensureUniqueId("frontend", new Set()) // { id: "frontend", wasModified: false }
 * ensureUniqueId("frontend", new Set(["frontend"])) // { id: "frontend-2", wasModified: true }
 * ensureUniqueId("frontend", new Set(["frontend", "frontend-2"])) // { id: "frontend-3", wasModified: true }
 */
export function ensureUniqueId(baseId: string, existingIds: Set<string>): UniqueIdResult {
  if (!existingIds.has(baseId)) {
    return { id: baseId, wasModified: false };
  }

  // Find first available suffix
  let counter = 2;
  while (existingIds.has(`${baseId}-${counter}`)) {
    counter++;
  }

  return { id: `${baseId}-${counter}`, wasModified: true };
}

/**
 * Validate a repository ID against naming rules.
 *
 * Rules:
 * - No commas (prevents "parent,fe,be" input error)
 * - Lowercase letters, numbers, and hyphens only
 * - Must start with a letter
 * - Length 1-50 characters
 * - No spaces or special characters
 *
 * @param id - Repository ID to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateRepoId("frontend-app") // { valid: true }
 * validateRepoId("parent,fe,be") // { valid: false, error: "..." }
 * validateRepoId("MyRepo") // { valid: false, error: "..." }
 */
export function validateRepoId(id: string): ValidationResult {
  // Check empty
  if (!id || id.trim().length === 0) {
    return { valid: false, error: 'Repository ID cannot be empty' };
  }

  // Check length
  if (id.length > 50) {
    return { valid: false, error: 'Repository ID exceeds maximum length (50 characters)' };
  }

  // Check for commas (prevents "parent,fe,be" error)
  if (id.includes(',')) {
    return { valid: false, error: 'Repository ID cannot contain commas' };
  }

  // Check for spaces
  if (id.includes(' ')) {
    return { valid: false, error: 'Repository ID cannot contain spaces' };
  }

  // Check for uppercase letters
  if (id !== id.toLowerCase()) {
    return { valid: false, error: 'Repository ID must be lowercase' };
  }

  // Check starts with letter
  if (!/^[a-z]/.test(id)) {
    return { valid: false, error: 'Repository ID must start with a letter' };
  }

  // Check alphanumeric + hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    return { valid: false, error: 'Repository ID must contain only lowercase letters, numbers, and hyphens (alphanumeric)' };
  }

  return { valid: true };
}
