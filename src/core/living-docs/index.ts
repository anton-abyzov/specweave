/**
 * Living Docs Distribution Module
 *
 * Exports:
 * - SpecDistributor: Distributes increment specs into hierarchical living docs
 * - HierarchyMapper: Maps increments to FS-* epic folders (Universal Hierarchy)
 * - Content* classes: Individual components for parsing, classifying, and distributing
 * - Types: TypeScript interfaces for living docs structure
 *
 * @author SpecWeave Team
 * @version 3.0.0
 */

// Old SpecDistributor temporarily disabled due to missing types
// TODO: Fix spec-distributor.ts type dependencies
// export { SpecDistributor } from './spec-distributor.js';

// New copy-based distributor (primary for increment 0037)
export { SpecDistributor } from './SpecDistributor.js';

export { HierarchyMapper } from './hierarchy-mapper.js';
export { ContentParser } from './content-parser.js';
export { ContentClassifier } from './content-classifier.js';
export { ProjectDetector } from './project-detector.js';
export { ContentDistributor } from './content-distributor.js';
export { CrossLinker } from './cross-linker.js';
export * from './types.js';
