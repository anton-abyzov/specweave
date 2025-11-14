/**
 * SpecWeave Hierarchy Mapper
 *
 * Maps increments to Feature Spec (FS-*) folders following Universal Hierarchy architecture.
 *
 * Supports three complexity levels:
 * 1. Simple: Increment → Issue/Epic/Feature (flat)
 * 2. Standard: FS-* (Epic) → US-* (User Stories) → T-* (Tasks)
 * 3. Enterprise: Domain → FS-* (Epic) → US-* → T-*
 *
 * @author SpecWeave Team
 * @version 3.0.0
 */

import fs from 'fs-extra';
import path from 'path';

export interface HierarchyConfig {
  level: 'simple' | 'standard' | 'enterprise' | 'auto';
  specsBaseDir: string;
  projectId: string; // Project ID (default, backend, frontend, etc.)
  featureFolderPattern: '{name}'; // Feature-based naming (no FS- prefix)
  userStoriesSubdir: string; // Empty string = user stories directly in feature folder
  detectFeatureFrom: ('frontmatter' | 'increment-name' | 'config')[];
  fallbackFeature?: string;
}

export interface FeatureMapping {
  featureId: string; // release-management
  featureFolder: string; // release-management
  featurePath: string; // .specweave/docs/internal/specs/default/release-management
  userStoriesPath: string; // .specweave/docs/internal/specs/default/release-management (no subfolder)
  confidence: number; // 0-100
  detectionMethod: 'frontmatter' | 'increment-name' | 'config' | 'fallback';
}

// Legacy alias for backward compatibility
export type EpicMapping = FeatureMapping;

/**
 * HierarchyMapper - Maps increments to feature folders (named by concept, not increment number)
 *
 * NEW ARCHITECTURE (v0.18.0+):
 * - Features are PERMANENT (named by concept: "release-management", "external-tool-sync")
 * - Increments are TEMPORARY (named by execution: "0023-release-management-enhancements")
 * - Multiple increments can contribute to same feature
 * - No FS-### prefix (features aren't numbered)
 */
export class HierarchyMapper {
  private config: HierarchyConfig;
  private projectRoot: string;

  constructor(projectRoot: string, config?: Partial<HierarchyConfig>) {
    this.projectRoot = projectRoot;
    const projectId = config?.projectId || 'default';
    this.config = {
      level: 'standard', // SpecWeave uses Standard level by default
      specsBaseDir: path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', projectId),
      projectId,
      featureFolderPattern: '{name}', // Feature-based naming (no FS- prefix)
      userStoriesSubdir: '', // User stories go directly in feature folder, not subfolder
      detectFeatureFrom: ['frontmatter', 'increment-name', 'config'],
      fallbackFeature: undefined,
      ...config,
    };
  }

  /**
   * Detect which feature folder this increment belongs to
   *
   * NEW: Features are named by CONCEPT (release-management), not INCREMENT NUMBER (FS-023)
   */
  async detectFeatureMapping(incrementId: string): Promise<FeatureMapping> {
    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    if (!fs.existsSync(specPath)) {
      throw new Error(`Increment spec not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Try each detection method in order
    for (const method of this.config.detectFeatureFrom) {
      let mapping: FeatureMapping | null = null;

      switch (method) {
        case 'frontmatter':
          mapping = await this.detectFromFrontmatter(content, incrementId);
          break;
        case 'increment-name':
          mapping = await this.detectFromIncrementName(incrementId);
          break;
        case 'config':
          mapping = await this.detectFromConfig(incrementId);
          break;
      }

      if (mapping && mapping.confidence >= 80) {
        return mapping;
      }
    }

    // Fallback: Extract feature name from increment ID
    return await this.createFallbackMapping(incrementId);
  }

  /**
   * Legacy alias for backward compatibility
   */
  async detectEpicMapping(incrementId: string): Promise<EpicMapping> {
    return this.detectFeatureMapping(incrementId);
  }

  /**
   * Detect feature from frontmatter (epic: feature-name)
   *
   * FORMAT (v0.18.1+): Accepts simple feature names (external-tool-status-sync)
   * LEGACY: Also accepts old FS-### format (FS-001) - extracts from increment name instead
   */
  private async detectFromFrontmatter(content: string, incrementId: string): Promise<FeatureMapping | null> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    try {
      const yaml = await import('yaml');
      const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

      // Check for explicit epic field
      if (frontmatter.epic && typeof frontmatter.epic === 'string') {
        const epicValue = frontmatter.epic;

        // Handle LEGACY numeric format (FS-001, FS-031) → extract from increment name
        if (epicValue.match(/^FS-\d+$/)) {
          console.log(`   ⚠️  Legacy FS-### format detected (${epicValue}), extracting feature name from increment...`);
          return await this.detectFromIncrementName(incrementId);
        }

        // NEW FORMAT: FS-25-11-14-feature-name (date-based) OR plain feature-name
        const featureFolder = await this.findFeatureFolder(epicValue);

        if (featureFolder) {
          return {
            featureId: featureFolder, // ID = folder name
            featureFolder,
            featurePath: path.join(this.config.specsBaseDir, featureFolder),
            userStoriesPath: path.join(this.config.specsBaseDir, featureFolder, this.config.userStoriesSubdir),
            confidence: 100,
            detectionMethod: 'frontmatter',
          };
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse frontmatter: ${error}`);
    }

    return null;
  }

  /**
   * Detect feature from increment NAME
   *
   * FORMAT (v0.18.1+): Simple descriptive names (no date prefixes)
   *
   * Extracts the descriptive part of increment ID and normalizes it to feature name
   * Examples:
   *   0023-release-management-enhancements → release-management (new or existing)
   *   0031-external-tool-status-sync → external-tool-status-sync
   */
  private async detectFromIncrementName(incrementId: string): Promise<FeatureMapping | null> {
    // Extract name part (after number: 0023-release-management-enhancements → release-management-enhancements)
    const nameMatch = incrementId.match(/^\d+-(.+)/);
    if (!nameMatch) return null;

    const fullName = nameMatch[1]; // release-management-enhancements

    // Extract core feature name (remove suffixes like -enhancements, -improvements, -fixes)
    const suffixesToRemove = ['-enhancements', '-improvements', '-fixes', '-updates', '-v2', '-v3'];
    let featureName = fullName;

    for (const suffix of suffixesToRemove) {
      if (featureName.endsWith(suffix)) {
        featureName = featureName.slice(0, -suffix.length);
        break;
      }
    }

    // Try to find existing feature folder (legacy or new format)
    let featureFolder = await this.findFeatureFolder(featureName);

    // If not found, try with full name
    if (!featureFolder) {
      featureFolder = await this.findFeatureFolder(fullName);
    }

    // If not found, use simple feature name (no date prefix, no FS- prefix)
    if (!featureFolder) {
      featureFolder = featureName; // Simple: external-tool-status-sync
      console.log(`   ✨ Creating new feature folder: ${featureFolder}`);
    }

    return {
      featureId: featureFolder, // ID = folder name (for consistency)
      featureFolder,
      featurePath: path.join(this.config.specsBaseDir, featureFolder),
      userStoriesPath: path.join(this.config.specsBaseDir, featureFolder, this.config.userStoriesSubdir),
      confidence: 90,
      detectionMethod: 'increment-name',
    };
  }

  /**
   * Detect feature from config mapping (explicit increment → feature mapping)
   */
  private async detectFromConfig(incrementId: string): Promise<FeatureMapping | null> {
    // Load config to check for explicit mapping
    const configPath = path.join(this.projectRoot, '.specweave', 'config.json');

    if (!fs.existsSync(configPath)) return null;

    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      const featureMapping = config.livingDocs?.hierarchyMapping?.incrementToFeature?.[incrementId];

      if (featureMapping && typeof featureMapping === 'string') {
        const featureFolder = await this.findFeatureFolder(featureMapping);

        if (featureFolder) {
          return {
            featureId: featureMapping,
            featureFolder,
            featurePath: path.join(this.config.specsBaseDir, featureFolder),
            userStoriesPath: path.join(this.config.specsBaseDir, featureFolder, this.config.userStoriesSubdir),
            confidence: 100,
            detectionMethod: 'config',
          };
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to load config: ${error}`);
    }

    return null;
  }

  /**
   * Create fallback mapping (extract feature name from increment ID)
   *
   * FORMAT (v0.18.1+): Simple descriptive names (no prefixes)
   * - Uses core feature name extracted from increment ID
   * - No date prefixes (removed to prevent duplicates)
   * - No FS- prefixes (features are not numbered)
   *
   * Example: 0023-release-management-enhancements → release-management
   */
  private async createFallbackMapping(incrementId: string): Promise<FeatureMapping> {
    // Extract name from increment ID
    const nameMatch = incrementId.match(/^\d+-(.+)/);
    const fullName = nameMatch ? nameMatch[1] : 'unknown';

    // Remove common suffixes to get core feature name
    const suffixesToRemove = ['-enhancements', '-improvements', '-fixes', '-updates', '-v2', '-v3'];
    let featureName = fullName;

    for (const suffix of suffixesToRemove) {
      if (featureName.endsWith(suffix)) {
        featureName = featureName.slice(0, -suffix.length);
        break;
      }
    }

    // Use simple feature name (no date prefix, no FS- prefix)
    const featureFolder = featureName; // Simple: external-tool-status-sync
    const featurePath = path.join(this.config.specsBaseDir, featureFolder);
    const userStoriesPath = path.join(featurePath, this.config.userStoriesSubdir);

    // Create folder if it doesn't exist
    if (!fs.existsSync(featurePath)) {
      console.log(`   📁 Creating new feature folder: ${featureFolder}`);
      await fs.ensureDir(featurePath);
    }

    return {
      featureId: featureFolder, // ID = folder name (external-tool-status-sync)
      featureFolder,
      featurePath,
      userStoriesPath,
      confidence: 80,
      detectionMethod: 'fallback',
    };
  }

  /**
   * Get increment creation date in yy-mm-dd format
   * Tries: metadata.json → spec.md frontmatter → current date
   */
  private async getIncrementCreationDate(incrementId: string): Promise<string> {
    // Try metadata.json
    const metadataPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        if (metadata.created) {
          return this.formatDateShort(metadata.created);
        }
      } catch (error) {
        // Fall through to next method
      }
    }

    // Try spec.md frontmatter
    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');
    if (fs.existsSync(specPath)) {
      try {
        const content = await fs.readFile(specPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const yaml = await import('yaml');
          const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;
          if (frontmatter.created) {
            return this.formatDateShort(frontmatter.created);
          }
        }
      } catch (error) {
        // Fall through to current date
      }
    }

    // Fallback: current date
    return this.formatDateShort(new Date().toISOString());
  }

  /**
   * Format date as yy-mm-dd
   * Input: "2025-11-14" or "2025-11-14T12:00:00Z"
   * Output: "25-11-14"
   */
  private formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /**
   * NEW: Find feature folder by name (exact match or fuzzy match)
   *
   * Examples:
   *   release-management → release-management/
   *   external-tool-sync → external-tool-status-sync/ (fuzzy match)
   */
  private async findFeatureFolder(featureName: string): Promise<string | null> {
    try {
      const folders = await fs.readdir(this.config.specsBaseDir);

      // First: Try exact match
      if (folders.includes(featureName)) {
        const folderPath = path.join(this.config.specsBaseDir, featureName);
        const stats = await fs.stat(folderPath);
        if (stats.isDirectory()) {
          return featureName;
        }
      }

      // Second: Try fuzzy match (feature name is substring of folder name)
      for (const folder of folders) {
        if (folder.startsWith(featureName) || folder.includes(featureName)) {
          const folderPath = path.join(this.config.specsBaseDir, folder);
          const stats = await fs.stat(folderPath);
          if (stats.isDirectory() && folder !== 'README.md') {
            return folder;
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to find feature folder for ${featureName}: ${error}`);
    }

    return null;
  }

  /**
   * LEGACY: Find FS-* epic folder (for backward compatibility)
   */
  private async findEpicFolder(epicId: string): Promise<string | null> {
    return this.findFeatureFolder(epicId);
  }

  /**
   * Get all feature folders (NEW: no FS- prefix filtering)
   */
  async getAllFeatureFolders(): Promise<string[]> {
    try {
      const folders = await fs.readdir(this.config.specsBaseDir);
      const featureFolders: string[] = [];

      for (const folder of folders) {
        // Skip special files/folders
        if (folder === 'README.md' || folder.startsWith('.') || folder.startsWith('_')) {
          continue;
        }

        const folderPath = path.join(this.config.specsBaseDir, folder);
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          featureFolders.push(folder);
        }
      }

      return featureFolders.sort();
    } catch (error) {
      console.warn(`   ⚠️  Failed to get feature folders: ${error}`);
      return [];
    }
  }

  /**
   * LEGACY: Get all epic folders (for backward compatibility)
   */
  async getAllEpicFolders(): Promise<string[]> {
    return this.getAllFeatureFolders();
  }

  /**
   * Validate feature folder structure (NEW: checks for FEATURE.md)
   */
  async validateFeatureFolder(featureFolder: string): Promise<{ valid: boolean; missing: string[] }> {
    const featurePath = path.join(this.config.specsBaseDir, featureFolder);
    const missing: string[] = [];

    // Check FEATURE.md exists (feature overview)
    if (!fs.existsSync(path.join(featurePath, 'FEATURE.md'))) {
      missing.push('FEATURE.md');
    }

    // Note: User stories (us-*.md) go directly in feature folder, no validation needed here

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * LEGACY: Validate epic folder structure (for backward compatibility)
   */
  async validateEpicFolder(epicFolder: string): Promise<{ valid: boolean; missing: string[] }> {
    return this.validateFeatureFolder(epicFolder);
  }

  /**
   * Create feature folder structure if missing (NEW: creates FEATURE.md)
   */
  async createFeatureFolderStructure(featureFolder: string, title: string): Promise<void> {
    const featurePath = path.join(this.config.specsBaseDir, featureFolder);

    // Create feature directory (user stories go directly here, no subfolder)
    await fs.ensureDir(featurePath);

    // Create FEATURE.md if missing (feature overview - high-level summary)
    const featureFilePath = path.join(featurePath, 'FEATURE.md');
    if (!fs.existsSync(featureFilePath)) {
      // ID = folder name (e.g., FS-25-11-14-release-management)
      const featureContent = `---
id: ${featureFolder}
title: "${title}"
type: feature
status: in-progress
priority: P1
created: ${new Date().toISOString().split('T')[0]}
last_updated: ${new Date().toISOString().split('T')[0]}
# External Tool Mapping
external_tools:
  github:
    type: project
    id: null
    url: null
  jira:
    type: epic
    key: null
    url: null
  ado:
    type: epic
    id: null
    url: null
---

# ${featureFolder}: ${title}

## Overview

[High-level description of this feature - what it does and why it matters]

## Business Value

[Add business value and impact]

## User Stories

User stories are in this folder as \`us-*.md\` files:
- us-001-*.md
- us-002-*.md
- ...

## Implementation History

| Increment | Stories Implemented | Status | Completion Date |
|-----------|-------------------|--------|----------------|
| [TBD]() | TBD | 🚧 In Progress | TBD |

## External Tool Integration

**GitHub Project**: Not yet synced
**Jira Epic**: Not yet synced
**Azure DevOps Epic**: Not yet synced
`;

      await fs.writeFile(featureFilePath, featureContent, 'utf-8');
      console.log(`   ✅ Created FEATURE.md for ${featureFolder}`);
    }
  }

  /**
   * LEGACY: Create epic folder structure (for backward compatibility)
   */
  async createEpicFolderStructure(epicFolder: string, title: string): Promise<void> {
    return this.createFeatureFolderStructure(epicFolder, title);
  }
}
