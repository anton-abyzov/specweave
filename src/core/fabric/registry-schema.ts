/**
 * Skill Fabric Registry Schema
 * Defines the structure for the curated skill registry.
 */

/** Trust tier for a registry entry */
export type FabricTier = 'official' | 'verified' | 'community';

/** A single skill within a plugin */
export interface FabricSkillEntry {
  /** Skill name (e.g., "component-generate") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Tags for search/filtering */
  tags: string[];
}

/** A plugin entry in the Fabric registry */
export interface FabricRegistryEntry {
  /** Plugin name (e.g., "sw-frontend") */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Plugin description */
  description: string;
  /** Author name or org */
  author: string;
  /** Trust tier */
  tier: FabricTier;
  /** Current version */
  version: string;
  /** Search tags */
  tags: string[];
  /** Individual skills provided by this plugin */
  skills: FabricSkillEntry[];
  /** Whether compatible with Agent Skills standard */
  agentSkillsCompat: boolean;
  /** Repository URL (optional) */
  repository?: string;
  /** Homepage URL (optional) */
  homepage?: string;
  /** Minimum SpecWeave version required */
  minSpecweaveVersion?: string;
}

/** The complete Fabric registry */
export interface FabricRegistry {
  /** Registry schema version */
  version: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** All registry entries */
  entries: FabricRegistryEntry[];
}

/** Search filters for registry queries */
export interface FabricSearchFilters {
  /** Filter by trust tier */
  tier?: FabricTier;
  /** Filter by tag */
  tag?: string;
  /** Filter by author */
  author?: string;
}

/** Result from security scan */
export interface FabricSecurityScanResult {
  /** Whether the scan passed */
  passed: boolean;
  /** Individual findings */
  findings: FabricSecurityFinding[];
}

/** A single security finding */
export interface FabricSecurityFinding {
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Finding category */
  category: string;
  /** Human-readable description */
  message: string;
  /** Line number in the file (if applicable) */
  line?: number;
}
