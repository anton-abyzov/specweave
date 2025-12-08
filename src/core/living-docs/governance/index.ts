/**
 * Governance Module - Multi-Technology Coding Standards Detection
 *
 * This module provides comprehensive coding standards detection for polyglot codebases.
 * It detects and documents standards for TypeScript, Python, Go, Java, Kotlin, .NET,
 * Rust, React, Angular, Vue, and Svelte.
 *
 * Usage:
 * ```typescript
 * import {
 *   detectEcosystems,
 *   parsePythonStandards,
 *   parseGoStandards,
 *   parseJavaStandards,
 *   parseFrontendStandards,
 *   generateStandardsMarkdown,
 *   generateUnifiedSummary
 * } from './governance/index.js';
 *
 * // 1. Detect all ecosystems in the project
 * const ecosystems = await detectEcosystems('/path/to/project');
 *
 * // 2. Parse standards for each ecosystem
 * const files: GeneratedFile[] = [];
 * for (const eco of ecosystems) {
 *   let standards;
 *   switch (eco.name) {
 *     case 'python':
 *       standards = await parsePythonStandards(projectPath, eco.configFiles);
 *       break;
 *     case 'go':
 *       standards = await parseGoStandards(projectPath, eco.configFiles);
 *       break;
 *     // ... etc
 *   }
 *   const markdown = generateStandardsMarkdown(eco.name, standards);
 *   files.push({ path: `governance/standards/${eco.name}.md`, content: markdown });
 * }
 *
 * // 3. Generate unified summary
 * const summary = generateUnifiedSummary(ecosystems, files);
 * ```
 */

// Ecosystem Detection
export {
  EcosystemDetector,
  detectEcosystems,
  type DetectedEcosystem,
  type EcosystemName,
  type ConfidenceLevel,
  type EcosystemDetectorOptions,
} from './ecosystem-detector.js';

// Python Standards
export {
  PythonStandardsParser,
  parsePythonStandards,
  type PythonStandards,
  type FormatterConfig,
  type LinterConfig,
  type TypeCheckerConfig,
  type ImportSorterConfig,
  type NamingConventions,
  type DocstringConfig,
  type PythonStandardsParserOptions,
} from './python-standards-parser.js';

// Go Standards
export {
  GoStandardsParser,
  parseGoStandards,
  type GoStandards,
  type GolangciLintConfig,
  type StaticcheckConfig,
  type GoNamingConventions,
  type ErrorHandlingConfig,
  type FormattingConfig as GoFormattingConfig,
  type GoStandardsParserOptions,
} from './go-standards-parser.js';

// Java Standards
export {
  JavaStandardsParser,
  parseJavaStandards,
  type JavaStandards,
  type CheckstyleConfig,
  type CheckstyleRule,
  type PmdConfig,
  type SpotbugsConfig,
  type KotlinConfig,
  type DetektConfig,
  type KtlintConfig,
  type JavaNamingConventions,
  type JavaFormattingConfig,
  type JavaStandardsParserOptions,
} from './java-standards-parser.js';

// Frontend Standards (React, Angular, Vue, Svelte)
export {
  FrontendStandardsParser,
  parseFrontendStandards,
  type FrontendStandards,
  type FrontendFramework,
  type StateManagementConfig,
  type CssMethodologyConfig,
  type TestingConfig,
  type BundlerConfig,
  type ComponentNamingConfig,
  type HooksConfig,
  type RoutingConfig,
  type FrontendStandardsParserOptions,
} from './frontend-standards-parser.js';

// Markdown Generation
export {
  StandardsGenerator,
  generateStandardsMarkdown,
  generateUnifiedSummary,
  type GeneratedFile,
  type StandardsGeneratorOptions,
} from './standards-generator.js';
