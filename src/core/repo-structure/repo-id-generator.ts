/**
 * Repository ID Generator
 *
 * Simple approach: Repository name IS the project ID (after normalization).
 *
 * Why?
 * - Repository names are already unique within an organization
 * - No complex suffix-stripping = no collisions
 * - Project folder matches repo name (predictable)
 *
 * @module repo-id-generator
 */

/**
 * Normalize a repository name to a valid project ID.
 *
 * Rules:
 * 1. Convert to lowercase
 * 2. Replace underscores and spaces with hyphens
 * 3. Remove invalid characters (keep only a-z, 0-9, hyphens)
 * 4. Collapse multiple hyphens
 * 5. Trim leading/trailing hyphens
 *
 * @example
 * normalizeRepoName('My-SaaS-Frontend')  // 'my-saas-frontend'
 * normalizeRepoName('sw_qr_menu_be')     // 'sw-qr-menu-be'
 */
export function normalizeRepoName(repoName: string): string {
  if (!repoName) return '';

  return repoName
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate a repository ID against naming rules.
 *
 * Rules:
 * - Lowercase letters, numbers, hyphens only
 * - Must start with a letter
 * - Length 1-50 characters
 * - No commas, spaces, or special characters
 */
export function validateRepoId(id: string): { valid: boolean; error?: string } {
  if (!id?.trim()) {
    return { valid: false, error: 'Repository ID cannot be empty' };
  }
  if (id.length > 50) {
    return { valid: false, error: 'Repository ID exceeds maximum length (50 characters)' };
  }
  if (id.includes(',')) {
    return { valid: false, error: 'Repository ID cannot contain commas' };
  }
  if (id.includes(' ')) {
    return { valid: false, error: 'Repository ID cannot contain spaces' };
  }
  if (id !== id.toLowerCase()) {
    return { valid: false, error: 'Repository ID must be lowercase' };
  }
  if (!/^[a-z]/.test(id)) {
    return { valid: false, error: 'Repository ID must start with a letter' };
  }
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    return { valid: false, error: 'Repository ID must contain only lowercase letters, numbers, and hyphens' };
  }
  return { valid: true };
}

/**
 * Suggest repository name for multi-repo setup.
 *
 * @example
 * suggestRepoName('my-saas', 0, 3)  // 'my-saas-frontend'
 * suggestRepoName('my-saas', 1, 3)  // 'my-saas-backend'
 */
export function suggestRepoName(projectName: string, repoIndex: number, _totalRepos: number): string {
  const patterns = ['frontend', 'backend', 'mobile', 'api', 'infra', 'shared', 'worker', 'admin', 'docs', 'analytics'];
  const repoType = repoIndex < patterns.length ? patterns[repoIndex] : `service-${repoIndex + 1}`;
  return `${projectName}-${repoType}`;
}
