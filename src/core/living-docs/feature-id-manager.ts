/**
 * Feature ID Manager - Manages FS-XXX ID assignment based on creation date
 * Ensures no duplicate IDs and maintains consistent ordering
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export interface FeatureInfo {
  originalId: string;           // Original ID like FS-25-11-12-external-tool-sync
  assignedId: string;           // New ID like FS-001
  title: string;
  created: Date;
  incrementId?: string;
  projects?: string[];
}

export interface FeatureRegistry {
  features: Map<string, FeatureInfo>;
  nextId: number;
}

export class FeatureIDManager {
  private registry: FeatureRegistry;
  private specsBaseDir: string;
  private incrementsDir: string;

  constructor(projectRoot: string) {
    this.specsBaseDir = path.join(projectRoot, '.specweave/docs/internal/specs');
    this.incrementsDir = path.join(projectRoot, '.specweave/increments');
    this.registry = {
      features: new Map(),
      nextId: 1
    };
  }

  /**
   * Build registry by scanning all increments and existing features
   */
  public async buildRegistry(): Promise<void> {
    console.log('🔍 Building feature registry...');

    // Step 1: Scan all increments to find features
    const incrementFeatures = await this.scanIncrements();

    // Step 2: Scan existing _features folder (if any)
    const existingFeatures = await this.scanExistingFeatures();

    // Step 3: Merge and sort by creation date
    const allFeatures = this.mergeFeatures(incrementFeatures, existingFeatures);

    // Step 4: Assign FS-XXX IDs based on creation date order
    this.assignFeatureIds(allFeatures);

    console.log(`✅ Registry built with ${this.registry.features.size} features`);
  }

  /**
   * Scan all increments to extract feature information
   */
  private async scanIncrements(): Promise<FeatureInfo[]> {
    const features: FeatureInfo[] = [];

    if (!await fs.pathExists(this.incrementsDir)) {
      return features;
    }

    const increments = await fs.readdir(this.incrementsDir);

    for (const incrementId of increments) {
      if (!incrementId.match(/^\d{4}-/)) continue;

      const specPath = path.join(this.incrementsDir, incrementId, 'spec.md');
      const metadataPath = path.join(this.incrementsDir, incrementId, 'metadata.json');

      if (!await fs.pathExists(specPath)) continue;

      try {
        const specContent = await fs.readFile(specPath, 'utf-8');
        const frontmatter = this.extractFrontmatter(specContent);

        // Get creation date from metadata or frontmatter
        let created = new Date();
        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJson(metadataPath);
          created = new Date(metadata.created || created);
        } else if (frontmatter.created) {
          created = new Date(frontmatter.created);
        } else {
          // Fallback: use file modification time
          const stats = await fs.stat(specPath);
          created = stats.birthtime || stats.mtime;
        }

        // Extract feature ID from various sources
        let featureId = frontmatter.feature || frontmatter.epic || '';

        // If no explicit feature, derive from increment name
        if (!featureId) {
          // Pattern: 0031-external-tool-status-sync -> FS-031-external-tool-status-sync
          const match = incrementId.match(/^(\d{4})-(.+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            featureId = `FS-${String(num).padStart(3, '0')}-${match[2]}`;
          }
        }

        if (featureId && !featureId.startsWith('EPIC')) {
          // Normalize feature ID format
          const normalizedId = this.normalizeFeatureId(featureId);

          features.push({
            originalId: normalizedId,
            assignedId: '', // Will be assigned later
            title: frontmatter.title || incrementId,
            created,
            incrementId,
            projects: frontmatter.projects || ['default']
          });
        }
      } catch (error) {
        console.warn(`  ⚠️ Error processing ${incrementId}: ${error}`);
      }
    }

    return features;
  }

  /**
   * Scan existing _features folder
   */
  private async scanExistingFeatures(): Promise<FeatureInfo[]> {
    const features: FeatureInfo[] = [];
    const featuresDir = path.join(this.specsBaseDir, '_features');

    if (!await fs.pathExists(featuresDir)) {
      return features;
    }

    const folders = await fs.readdir(featuresDir);

    for (const folder of folders) {
      const featurePath = path.join(featuresDir, folder, 'FEATURE.md');

      if (!await fs.pathExists(featurePath)) continue;

      try {
        const content = await fs.readFile(featurePath, 'utf-8');
        const frontmatter = this.extractFrontmatter(content);

        const created = frontmatter.created
          ? new Date(frontmatter.created)
          : new Date();

        features.push({
          originalId: folder,
          assignedId: '', // Will be assigned later
          title: frontmatter.title || folder,
          created,
          projects: frontmatter.projects || ['default']
        });
      } catch (error) {
        console.warn(`  ⚠️ Error processing feature ${folder}: ${error}`);
      }
    }

    return features;
  }

  /**
   * Merge features and remove duplicates
   */
  private mergeFeatures(
    incrementFeatures: FeatureInfo[],
    existingFeatures: FeatureInfo[]
  ): FeatureInfo[] {
    const merged = new Map<string, FeatureInfo>();

    // Add increment features first (they have more complete info)
    for (const feature of incrementFeatures) {
      const key = this.getFeatureKey(feature.originalId);
      if (!merged.has(key)) {
        merged.set(key, feature);
      }
    }

    // Add existing features if not already present
    for (const feature of existingFeatures) {
      const key = this.getFeatureKey(feature.originalId);
      if (!merged.has(key)) {
        merged.set(key, feature);
      }
    }

    // Sort by creation date
    return Array.from(merged.values()).sort(
      (a, b) => a.created.getTime() - b.created.getTime()
    );
  }

  /**
   * Assign FS-XXX IDs based on creation date order
   */
  private assignFeatureIds(features: FeatureInfo[]): void {
    let nextId = 1;

    for (const feature of features) {
      const assignedId = `FS-${String(nextId).padStart(3, '0')}`;
      feature.assignedId = assignedId;
      this.registry.features.set(feature.originalId, feature);
      nextId++;
    }

    this.registry.nextId = nextId;
  }

  /**
   * Get assigned ID for a feature
   */
  public getAssignedId(originalId: string): string {
    const normalized = this.normalizeFeatureId(originalId);
    const feature = this.registry.features.get(normalized);

    if (feature) {
      return feature.assignedId;
    }

    // Feature not in registry - assign new ID
    console.log(`  📝 Assigning new ID for feature: ${originalId}`);
    const assignedId = `FS-${String(this.registry.nextId).padStart(3, '0')}`;

    this.registry.features.set(normalized, {
      originalId: normalized,
      assignedId,
      title: originalId,
      created: new Date(),
      projects: ['default']
    });

    this.registry.nextId++;
    return assignedId;
  }

  /**
   * Check if a feature ID already exists
   */
  public hasFeature(originalId: string): boolean {
    const normalized = this.normalizeFeatureId(originalId);
    return this.registry.features.has(normalized);
  }

  /**
   * Get all registered features
   */
  public getAllFeatures(): FeatureInfo[] {
    return Array.from(this.registry.features.values());
  }

  /**
   * Normalize feature ID to consistent format
   */
  private normalizeFeatureId(id: string): string {
    // Remove any leading/trailing whitespace
    id = id.trim();

    // If it's already in date format (FS-YY-MM-DD-*), extract the full ID
    const dateMatch = id.match(/^FS-\d{2}-\d{2}-\d{2}-.+$/);
    if (dateMatch) {
      return id;
    }

    // If it's in old numeric format (FS-031-*), normalize
    const numMatch = id.match(/^FS-(\d+)(-.*)?$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const suffix = numMatch[2] || '';

      // Try to derive a date-based ID from the number
      // This is a heuristic - we'll use 2025-11 as base
      const day = String(num).padStart(2, '0');
      return `FS-25-11-${day}${suffix}`;
    }

    return id;
  }

  /**
   * Get a consistent key for feature deduplication
   */
  private getFeatureKey(id: string): string {
    // Extract the core part of the ID for comparison
    // FS-25-11-12-external-tool-sync -> external-tool-sync
    const parts = id.split('-');
    if (parts[0] === 'FS' && parts.length > 4) {
      return parts.slice(4).join('-');
    }
    return id;
  }

  /**
   * Extract frontmatter from markdown content
   */
  private extractFrontmatter(content: string): any {
    const lines = content.split('\n');
    if (lines[0] !== '---') return {};

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) return {};

    try {
      const yamlContent = lines.slice(1, endIndex).join('\n');
      return yaml.parse(yamlContent) || {};
    } catch {
      return {};
    }
  }

  /**
   * Save registry to disk for persistence
   */
  public async saveRegistry(): Promise<void> {
    const registryPath = path.join(this.specsBaseDir, '.feature-registry.json');

    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      nextId: this.registry.nextId,
      features: Array.from(this.registry.features.entries()).map(([key, value]) => ({
        key,
        ...value,
        created: value.created.toISOString()
      }))
    };

    await fs.ensureDir(path.dirname(registryPath));
    await fs.writeJson(registryPath, data, { spaces: 2 });

    console.log(`   💾 Registry saved to ${registryPath}`);
  }

  /**
   * Load registry from disk
   */
  public async loadRegistry(): Promise<void> {
    const registryPath = path.join(this.specsBaseDir, '.feature-registry.json');

    if (!await fs.pathExists(registryPath)) {
      await this.buildRegistry();
      return;
    }

    try {
      const data = await fs.readJson(registryPath);

      this.registry.nextId = data.nextId || 1;
      this.registry.features.clear();

      for (const feature of data.features || []) {
        this.registry.features.set(feature.key || feature.originalId, {
          originalId: feature.originalId,
          assignedId: feature.assignedId,
          title: feature.title,
          created: new Date(feature.created),
          incrementId: feature.incrementId,
          projects: feature.projects
        });
      }

      console.log(`   📂 Registry loaded with ${this.registry.features.size} features`);
    } catch (error) {
      console.warn('   ⚠️ Failed to load registry, rebuilding...');
      await this.buildRegistry();
    }
  }
}