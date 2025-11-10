/**
 * Reflection Configuration Loader
 *
 * Loads and validates reflection configuration from .specweave/config.json
 * Merges user config with defaults, validates against schema
 *
 * @module reflection-config-loader
 */
import { ReflectionConfig } from './types/reflection-types';
/**
 * Find .specweave directory by traversing up from current directory
 * @param startDir Starting directory (defaults to cwd)
 * @returns Path to .specweave directory or null if not found
 */
export declare function findSpecweaveRoot(startDir?: string): string | null;
/**
 * Load reflection configuration from .specweave/config.json
 * Falls back to defaults if config file doesn't exist or reflection section is missing
 *
 * @param projectRoot Path to project root (optional, auto-detected if not provided)
 * @returns Merged reflection configuration
 * @throws Error if config file exists but has invalid JSON
 */
export declare function loadReflectionConfig(projectRoot?: string): ReflectionConfig;
/**
 * Validate reflection configuration against constraints
 * Checks for logical inconsistencies (e.g., all categories disabled)
 *
 * @param config Reflection configuration to validate
 * @returns Validation result with errors array
 */
export declare function validateReflectionConfig(config: ReflectionConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Load and validate reflection configuration
 * Throws error if configuration is invalid
 *
 * @param projectRoot Path to project root (optional, auto-detected if not provided)
 * @returns Valid reflection configuration
 * @throws Error if configuration is invalid
 */
export declare function loadAndValidateReflectionConfig(projectRoot?: string): ReflectionConfig;
//# sourceMappingURL=reflection-config-loader.d.ts.map