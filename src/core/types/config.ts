/**
 * SpecWeave Configuration Types
 *
 * @deprecated Import from '../config/types.js' instead.
 * This file is a re-export shim for backward compatibility (0188).
 */

// Re-export everything from the canonical location
export * from '../config/types.js';

// Re-export IncrementType for consumers that used it transitively
export { IncrementType } from './increment-metadata.js';
