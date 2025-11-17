/**
 * Types for Repository Selection System
 */

import { z } from 'zod';

/**
 * Repository selection rule types
 */
export type SelectionType =
  | 'all'        // All repos from user/org
  | 'prefix'     // Repos matching prefix pattern
  | 'owner'      // All repos from specific owner/org
  | 'keyword'    // Repos containing keyword
  | 'combined'   // Multiple filters combined
  | 'manual';    // Manual entry

/**
 * Repository selection rule
 */
export interface RepositorySelectionRule {
  /** Selection type */
  type: SelectionType;

  /** Pattern for prefix/keyword matching */
  pattern?: string;

  /** Owner/org name */
  owner?: string;

  /** Exclusion patterns */
  excludePatterns?: string[];
}

/**
 * Repository metadata from GitHub API
 */
export interface RepositoryMetadata {
  /** Repository name */
  name: string;

  /** Full repository URL */
  url: string;

  /** Owner/organization */
  owner: string;

  /** Repository description */
  description: string;

  /** Primary language */
  language: string;

  /** Star count */
  stars: number;

  /** Last updated timestamp */
  lastUpdated: Date;

  /** Is private */
  private?: boolean;

  /** Default branch */
  defaultBranch?: string;
}

/**
 * Zod schemas
 */
export const RepositorySelectionRuleSchema = z.object({
  type: z.enum(['all', 'prefix', 'owner', 'keyword', 'combined', 'manual']),
  pattern: z.string().optional(),
  owner: z.string().optional(),
  excludePatterns: z.array(z.string()).optional()
});

export const RepositoryMetadataSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  owner: z.string(),
  description: z.string(),
  language: z.string(),
  stars: z.number(),
  lastUpdated: z.date(),
  private: z.boolean().optional(),
  defaultBranch: z.string().optional()
});
