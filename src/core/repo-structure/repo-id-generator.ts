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
 * Common word abbreviations for cleaner IDs
 */
const WORD_ABBREVIATIONS: Record<string, string> = {
  'frontend': 'fe',
  'backend': 'be',
  'service': 'svc',
  'database': 'db',
  'application': 'app',
  'interface': 'ui',
  'authentication': 'auth',
  'authorization': 'authz',
  'administration': 'admin',
  'configuration': 'config',
  'management': 'mgmt',
  'repository': 'repo',
  'documentation': 'docs'
} as const;

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
 * Algorithm (REVISED for correct service-type extraction):
 * 1. Convert to lowercase
 * 2. Strip common prefixes (sw-, app-, web-, mobile-, api-)
 * 3. Split by hyphens
 * 4. Take the last segment (this is usually the service type: frontend, backend, etc.)
 * 5. If that segment is a known suffix (-app, -service), take the SECOND-TO-LAST segment instead
 *
 * This correctly identifies the service type regardless of suffixes.
 *
 * Examples:
 * - "sw-web-calc-frontend" → remove "sw-" → "web-calc-frontend" → last segment "frontend" ✓
 * - "sw-web-calc-frontend-app" → remove "sw-" → "web-calc-frontend-app" → last "app" (suffix) → take "frontend" ✓
 * - "acme-api-gateway-service" → remove "api-" → "gateway-service" → last "service" (suffix) → take "gateway" ✓
 * - "backend-service" → no prefix → "backend-service" → last "service" (suffix) → take "backend" ✓
 *
 * @param repoName - Full repository name
 * @returns Clean repository ID
 */
export function generateRepoId(repoName: string): string {
  if (!repoName) {
    return '';
  }

  let cleaned = repoName.toLowerCase();

  // Step 1: Strip common prefixes
  const prefixes = [/^sw-/, /^app-/, /^web-/, /^mobile-/, /^api-/];
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  // Step 2: Split by hyphen
  const segments = cleaned.split('-').filter(seg => seg.length > 0);

  if (segments.length === 0) {
    return '';
  }

  // Step 3: Take last segment, but if it's a known suffix word, take second-to-last
  const lastSegment = segments[segments.length - 1];

  // Check if last segment is a suffix keyword (without the hyphen)
  const suffixKeywords = ['app', 'service', 'api', 'web', 'mobile'];

  if (suffixKeywords.includes(lastSegment) && segments.length >= 2) {
    return segments[segments.length - 2];
  }

  return lastSegment;
}

/**
 * Generate a context-aware repository ID with conflict detection.
 *
 * This is a smarter version that considers existing IDs and tries different strategies:
 * 1. Try last segment (e.g., "calc-frontend" → "frontend")
 * 2. If conflict, try abbreviated last segment (e.g., "frontend" → "fe")
 * 3. If still conflict, try last two segments (e.g., "calc-fe")
 * 4. If still conflict, use full cleaned name
 *
 * @param repoName - Full repository name
 * @param existingNames - Array of existing repository names (for conflict detection)
 * @returns Best available repository ID
 *
 * @example
 * generateRepoIdSmart("sw-web-calc-frontend", ["sw-mobile-calc-frontend"])
 * // Returns "calc-fe" (avoids "frontend" conflict)
 */
export function generateRepoIdSmart(repoName: string, existingNames: string[] = []): string {
  if (!repoName) {
    return '';
  }

  // Generate base ID using standard algorithm
  const baseId = generateRepoId(repoName);

  // If no existing names, return base ID
  if (existingNames.length === 0) {
    return baseId;
  }

  // Generate IDs from existing names to check for conflicts
  const existingIds = new Set(existingNames.map(name => generateRepoId(name)));

  // Strategy 1: Try base ID
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  // Strategy 2: Try abbreviated form (if available)
  const abbreviated = WORD_ABBREVIATIONS[baseId];
  if (abbreviated && !existingIds.has(abbreviated)) {
    return abbreviated;
  }

  // Strategy 3: Try last two segments
  let cleaned = repoName.toLowerCase();

  // Strip prefixes
  const prefixes = [/^sw-/, /^app-/, /^web-/, /^mobile-/, /^api-/];
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  const segments = cleaned.split('-').filter(seg => seg.length > 0);

  if (segments.length >= 2) {
    // Remove suffix keywords from end if present
    const suffixKeywords = ['app', 'service', 'api', 'web', 'mobile'];
    const cleanedSegments = suffixKeywords.includes(segments[segments.length - 1])
      ? segments.slice(0, -1)
      : segments;

    if (cleanedSegments.length >= 2) {
      const lastTwo = cleanedSegments.slice(-2).join('-');
      if (!existingIds.has(lastTwo)) {
        return lastTwo;
      }

      // Try abbreviated last segment with penultimate
      const abbrevLast = WORD_ABBREVIATIONS[cleanedSegments[cleanedSegments.length - 1]] || cleanedSegments[cleanedSegments.length - 1];
      const lastTwoAbbrev = `${cleanedSegments[cleanedSegments.length - 2]}-${abbrevLast}`;
      if (!existingIds.has(lastTwoAbbrev)) {
        return lastTwoAbbrev;
      }
    }
  }

  // Strategy 4: Fall back to full cleaned name
  const finalSegments = segments.filter(seg => !['app', 'service', 'api'].includes(seg));
  return finalSegments.join('-') || baseId;
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
