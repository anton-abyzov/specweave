/**
 * Azure DevOps Area Path Mapper
 *
 * Fetches, parses, and maps ADO area paths to SpecWeave project IDs.
 * Supports hierarchical area paths with granularity selection:
 * - Top-level only (e.g., Backend, Frontend)
 * - Two-level (e.g., Backend-API, Backend-Database)
 * - Full tree (all levels)
 *
 * NEW (v0.24.0): Enables multi-project organization in ADO
 *
 * @module integrations/ado/area-path-mapper
 */

import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';

export interface AreaPathNode {
  id: string;
  name: string;
  path: string;
  level: number;
  parentPath?: string;
  children?: AreaPathNode[];
  hasChildren: boolean;
}

export interface AdoCredentials {
  organization: string;
  pat: string; // Personal Access Token
}

export type AreaPathGranularity = 'top-level' | 'two-level' | 'full-tree';

export interface AreaPathMapperOptions {
  credentials: AdoCredentials;
  project: string;
  logger?: Logger;
}

/**
 * Area Path Mapper for Azure DevOps
 *
 * Fetches hierarchical area path structures and maps them to SpecWeave project IDs.
 */
export class AreaPathMapper {
  private credentials: AdoCredentials;
  private project: string;
  private logger: Logger;
  private apiVersion = '7.0'; // ADO API version

  constructor(options: AreaPathMapperOptions) {
    this.credentials = options.credentials;
    this.project = options.project;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Fetch area path tree from ADO
   *
   * Fetches the full hierarchical area path structure for the project.
   * Uses $depth=10 to get deep hierarchies.
   *
   * @returns Root area path node with children
   */
  async fetchAreaPaths(): Promise<AreaPathNode> {
    try {
      const url = `https://dev.azure.com/${this.credentials.organization}/${this.project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=${this.apiVersion}`;

      const auth = Buffer.from(`:${this.credentials.pat}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ADO API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Parse the tree structure
      return this.parseAreaPathTree(data, 0, '');

    } catch (error: any) {
      this.logger.error(`❌ Failed to fetch area paths: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse area path tree recursively
   *
   * Converts ADO API response to normalized AreaPathNode tree structure.
   *
   * @param node - Raw ADO API node
   * @param level - Current depth level (0 = root)
   * @param parentPath - Parent area path
   * @returns Parsed area path node
   */
  parseAreaPathTree(
    node: any,
    level: number,
    parentPath: string
  ): AreaPathNode {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;

    const parsed: AreaPathNode = {
      id: node.id?.toString() || '',
      name: node.name,
      path,
      level,
      parentPath: parentPath || undefined,
      hasChildren: node.hasChildren === true || (Array.isArray(node.children) && node.children.length > 0)
    };

    // Recursively parse children
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      parsed.children = node.children.map((child: any) =>
        this.parseAreaPathTree(child, level + 1, path)
      );
    }

    return parsed;
  }

  /**
   * Map area path to SpecWeave project ID
   *
   * Converts hierarchical area path to kebab-case project ID.
   * Excludes root project name.
   *
   * Examples:
   * - "Platform/Backend/API" → "backend-api"
   * - "Platform/Frontend" → "frontend"
   * - "Platform" → "platform"
   *
   * @param areaPath - Full area path (e.g., "Platform/Backend/API")
   * @returns Kebab-case project ID
   */
  mapToProjectId(areaPath: string): string {
    const parts = areaPath.split('/').filter(Boolean);

    // If root only, return root in kebab-case
    if (parts.length === 1) {
      return this.toKebabCase(parts[0]);
    }

    // Exclude root, join remaining parts with dash
    const relevantParts = parts.slice(1);
    return relevantParts.map(p => this.toKebabCase(p)).join('-');
  }

  /**
   * Convert string to kebab-case
   *
   * @param str - Input string
   * @returns Kebab-case string
   */
  private toKebabCase(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '');    // Trim leading/trailing dashes
  }

  /**
   * Flatten area paths with granularity selection
   *
   * Extracts nodes at specific level(s) from the tree.
   *
   * @param root - Root area path node
   * @param granularity - Desired granularity level
   * @returns Flattened array of nodes
   */
  flattenAreaPaths(
    root: AreaPathNode,
    granularity: AreaPathGranularity
  ): AreaPathNode[] {
    switch (granularity) {
      case 'top-level':
        return this.getNodesByLevel(root, 1);

      case 'two-level':
        return this.getNodesByLevel(root, 2);

      case 'full-tree':
        return this.getAllNodes(root);

      default:
        throw new Error(`Invalid granularity: ${granularity}`);
    }
  }

  /**
   * Get nodes at specific level
   *
   * Recursively collects nodes at the target depth level.
   * If a branch doesn't reach the target level, includes the deepest node in that branch.
   *
   * @param node - Current node
   * @param targetLevel - Target depth level
   * @returns Nodes at target level (or deepest available)
   */
  private getNodesByLevel(
    node: AreaPathNode,
    targetLevel: number
  ): AreaPathNode[] {
    const results: AreaPathNode[] = [];

    if (node.level === targetLevel) {
      results.push(node);
      return results;
    }

    // If node is at a level before target and has no children, include it
    // (handles branches that don't reach target depth)
    if (node.level < targetLevel && !node.children) {
      results.push(node);
      return results;
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.getNodesByLevel(child, targetLevel));
      }
    }

    return results;
  }

  /**
   * Get all nodes (flatten entire tree)
   *
   * @param node - Root node
   * @returns All nodes in tree
   */
  private getAllNodes(node: AreaPathNode): AreaPathNode[] {
    const results: AreaPathNode[] = [node];

    if (node.children) {
      for (const child of node.children) {
        results.push(...this.getAllNodes(child));
      }
    }

    return results;
  }

  /**
   * Prompt user for granularity selection
   *
   * Interactive CLI prompt to select area path granularity.
   *
   * @param areaPathTree - Area path tree for preview
   * @returns Selected granularity
   */
  async promptAreaPathGranularity(
    areaPathTree: AreaPathNode
  ): Promise<AreaPathGranularity> {
    const { select } = await import('@inquirer/prompts');

    // Calculate counts for each granularity
    const topLevelCount = this.getNodesByLevel(areaPathTree, 1).length;
    const twoLevelCount = this.getNodesByLevel(areaPathTree, 2).length;
    const fullTreeCount = this.getAllNodes(areaPathTree).length;

    const granularity = await select<AreaPathGranularity>({
      message: 'Select area path granularity for project organization:',
      choices: [
        {
          name: `Top-level only (${topLevelCount} projects) - e.g., Backend, Frontend`,
          value: 'top-level' as const
        },
        {
          name: `Two-level (${twoLevelCount} projects) - e.g., Backend-API, Backend-Database`,
          value: 'two-level' as const
        },
        {
          name: `Full tree (${fullTreeCount} projects) - All levels`,
          value: 'full-tree' as const
        }
      ],
      default: 'two-level' // Most common use case
    });

    return granularity;
  }

  /**
   * Get area path suggestions for project
   *
   * Analyzes area path tree and suggests best granularity based on structure.
   *
   * @param areaPathTree - Area path tree
   * @returns Suggested granularity with reasoning
   */
  suggestGranularity(areaPathTree: AreaPathNode): {
    suggested: AreaPathGranularity;
    reasoning: string;
  } {
    const topLevelCount = this.getNodesByLevel(areaPathTree, 1).length;
    const twoLevelCount = this.getNodesByLevel(areaPathTree, 2).length;
    const fullTreeCount = this.getAllNodes(areaPathTree).length;

    // Decision logic
    if (topLevelCount <= 5) {
      // Small tree: use top-level
      return {
        suggested: 'top-level',
        reasoning: `Small hierarchy (${topLevelCount} top-level areas). Top-level is sufficient.`
      };
    } else if (twoLevelCount <= 20) {
      // Medium tree: use two-level
      return {
        suggested: 'two-level',
        reasoning: `Balanced hierarchy (${twoLevelCount} two-level areas). Recommended granularity.`
      };
    } else {
      // Large/deep tree: might need two-level or top-level
      if (fullTreeCount > 50) {
        return {
          suggested: 'top-level',
          reasoning: `Large hierarchy (${fullTreeCount} total areas). Top-level keeps projects manageable.`
        };
      }

      return {
        suggested: 'two-level',
        reasoning: `Complex hierarchy (${twoLevelCount} two-level areas). Two-level balances detail and simplicity.`
      };
    }
  }
}
