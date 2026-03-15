/**
 * npm Registry Constants
 *
 * Single source of truth for the public npm registry URL.
 * Used by production code (doctor, update, package-installer, npm-provider)
 * and test mocks to prevent command string drift.
 */

export const NPM_REGISTRY_URL = 'https://registry.npmjs.org' as const;

export function npmRegistryFlag(): string {
  return `--registry ${NPM_REGISTRY_URL}`;
}
