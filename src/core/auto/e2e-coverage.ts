/**
 * E2E Coverage Manifest
 *
 * Tracks which routes, actions, and viewports have E2E test coverage.
 * Auto-generates manifest from project routes (Next.js, React Router, etc.).
 *
 * @module e2e-coverage
 *
 * NOTE: This file is a facade that re-exports from the modular e2e-coverage/ directory.
 * For new code, prefer importing directly from 'core/auto/e2e-coverage/index.js'
 *
 * @since v1.0.115 - Refactored into modular structure
 */

// Re-export everything from the modular structure for backwards compatibility
export * from './e2e-coverage/index.js';
