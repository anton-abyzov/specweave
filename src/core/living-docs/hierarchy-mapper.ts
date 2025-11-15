/**
 * SpecWeave Hierarchy Mapper (v4.0.0 - Universal Hierarchy with FS-XXX)
 *
 * Maps increments to universal hierarchy following work item type matrix:
 * - Epic (EPIC-{id}) -> Cross-project strategic themes (_epics/)
 * - Feature (FS-XXX) -> Cross-project features (_features/ + project folders)
 * - User Story (us-{id}) -> Project-specific requirements (project/FS-XXX/us-{id}.md)
 * - Task (T-{id}) -> Increment-specific implementation (increments/{id}/tasks.md)
 *
 * Key Principles:
 * - NO HARDCODED PROJECT NAMES (backend, frontend are examples)
 * - Projects are DYNAMIC from config.json -> multiProject.projects
 * - Single-project mode: ['default'] (always)
 * - Multi-project mode: User-configured project names
 * - Feature IDs assigned by creation date (FS-001, FS-002, etc.)
 * - NO DUPLICATE FEATURE IDS (enforced by FeatureIDManager)
 *
 * @author SpecWeave Team
 * @version 4.0.0 (Universal Hierarchy with FS-XXX)
 */

import fs from 'fs-extra';
import path from 'path';
import { ConfigManager } from '../config-manager.js';
import { SpecweaveConfig, MultiProjectConfig, ProjectConfig } from '../types/config.js';
import { EpicMapping, FeatureMapping, ProjectContext } from './types.js';
import { FeatureIDManager } from './feature-id-manager.js';

/**
 * Hierarchy Configuration
 */
export interface HierarchyConfig {
  level: 'simple' | 'standard' | 'enterprise' | 'auto';
  specsBaseDir: string;             // .specweave/docs/internal/specs/
  detectEpicFrom: ('frontmatter' | 'config')[];
  detectFeatureFrom: ('frontmatter' | 'increment-name' | 'config')[];
  detectProjectFrom: ('frontmatter' | 'increment-name' | 'config')[];
  fallbackEpic?: string;            // Optional default epic
}

/**
 * HierarchyMapper - Maps increments to universal hierarchy
 *
 * Universal Hierarchy (v4.0.0):
 * 1. Epic (EPIC-YYYY-QN-{name}) -> _epics/EPIC-{id}/EPIC.md
 * 2. Feature (FS-XXX) -> _features/FS-XXX/FEATURE.md + {project}/FS-XXX/
 * 3. User Story (us-NNN-{name}) -> {project}/FS-XXX/us-{id}.md
 * 4. Task (T-NNN) -> increments/{id}/tasks.md
 */
export class HierarchyMapper {
  private config: HierarchyConfig;
  private projectRoot: string;
  private featureIdManager: FeatureIDManager;
  private configManager: ConfigManager;
  private specweaveConfig: SpecweaveConfig | null = null;

  constructor(projectRoot: string, config?: Partial<HierarchyConfig>) {
    this.projectRoot = projectRoot;
    this.configManager = new ConfigManager(projectRoot);
    this.featureIdManager = new FeatureIDManager(projectRoot);

    this.config = {
      level: 'standard',
      specsBaseDir: path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs'),
      detectEpicFrom: ['frontmatter', 'config'],
      detectFeatureFrom: ['frontmatter', 'increment-name', 'config'],
      detectProjectFrom: ['frontmatter', 'increment-name', 'config'],
      ...config,
    };
  }

  /**
   * Load SpecWeave config (cached)
   */
  public async getSpecweaveConfig(): Promise<SpecweaveConfig> {
    if (!this.specweaveConfig) {
      this.specweaveConfig = await this.configManager.loadAsync();
    }
    return this.specweaveConfig;
  }

  /**
   * Get list of configured projects
   *
   * Returns:
   * - Single-project mode: ['default']
   * - Multi-project mode: User-configured project names (dynamic, no hardcodes)
   */
  async getConfiguredProjects(): Promise<string[]> {
    const config = await this.getSpecweaveConfig();

    // Check if multi-project mode is enabled
    if (config.multiProject?.enabled && config.multiProject.projects) {
      return Object.keys(config.multiProject.projects);
    }

    // Default: single-project mode
    return ['default'];
  }

  /**
   * Check if a feature is archived
   */
  async isFeatureArchived(featureId: string): Promise<boolean> {
    const archivePaths = [
      path.join(this.config.specsBaseDir, '_features', '_archive', featureId),
      // Check project-specific archives
      ...(await this.getConfiguredProjects()).map(project =>
        path.join(this.config.specsBaseDir, project, '_archive', featureId)
      )
    ];

    for (const archivePath of archivePaths) {
      if (await fs.pathExists(archivePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an epic is archived
   */
  async isEpicArchived(epicId: string): Promise<boolean> {
    const archivePath = path.join(this.config.specsBaseDir, '_epics', '_archive', epicId);
    return await fs.pathExists(archivePath);
  }

  /**
   * Filter out archived items from mappings
   */
  async filterArchivedItems<T extends { id: string }>(
    items: T[],
    type: 'feature' | 'epic'
  ): Promise<T[]> {
    const filtered: T[] = [];

    for (const item of items) {
      const isArchived = type === 'feature'
        ? await this.isFeatureArchived(item.id)
        : await this.isEpicArchived(item.id);

      if (!isArchived) {
        filtered.push(item);
      }
    }

    return filtered;
  }

  /**
   * Get project context for a specific project ID
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    const config = await this.getSpecweaveConfig();

    // Single-project mode
    if (projectId === 'default') {
      return {
        projectId: 'default',
        projectName: config.project?.name || 'Default Project',
        projectPath: path.join(this.config.specsBaseDir, 'default'),
        keywords: [],
        techStack: config.project?.techStack || [],
      };
    }

    // Multi-project mode
    const projectConfig = config.multiProject?.projects?.[projectId];
    if (!projectConfig) {
      return null;
    }

    return {
      projectId,
      projectName: projectConfig.name,
      projectPath: path.join(this.config.specsBaseDir, projectId),
      keywords: projectConfig.keywords || [],
      techStack: projectConfig.techStack || [],
    };
  }

  /**
   * Detect which epic this increment belongs to (OPTIONAL)
   *
   * Epic Format: EPIC-YYYY-QN-{name}
   * Example: EPIC-2025-Q4-platform
   *
   * Detection Methods:
   * 1. Frontmatter: epic: EPIC-2025-Q4-platform
   * 2. Config: livingDocs.hierarchyMapping.incrementToEpic
   * 3. Fallback: null (no epic required)
   */
  async detectEpicMapping(incrementId: string): Promise<EpicMapping | null> {
    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    if (!fs.existsSync(specPath)) {
      return null;
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Try each detection method
    for (const method of this.config.detectEpicFrom) {
      let mapping: EpicMapping | null = null;

      switch (method) {
        case 'frontmatter':
          mapping = await this.detectEpicFromFrontmatter(content, incrementId);
          break;
        case 'config':
          mapping = await this.detectEpicFromConfig(incrementId);
          break;
      }

      if (mapping && mapping.confidence >= 80) {
        return mapping;
      }
    }

    // No epic found (OK - epics are optional)
    return null;
  }

  /**
   * Detect which feature this increment belongs to (REQUIRED)
   *
   * Feature Format (Greenfield): FS-XXX (matches increment number)
   * Feature Format (Brownfield): FS-YY-MM-DD-{feature-name} (date-based)
   * Examples:
   * - Greenfield: 0031-external-tool-sync → FS-031
   * - Brownfield: Imported from JIRA → FS-25-11-14-external-tool-sync
   *
   * Detection Methods:
   * 1. Frontmatter: feature: FS-031 (greenfield) or feature: FS-25-11-14-name (brownfield)
   * 2. Increment Name: 0031-external-tool-status-sync → FS-031 (auto-extract number)
   * 3. Config: livingDocs.hierarchyMapping.incrementToFeature
   * 4. Fallback: Auto-create feature from increment number (FS-XXX format)
   */
  async detectFeatureMapping(incrementId: string): Promise<FeatureMapping> {
    // Load feature registry first
    await this.featureIdManager.loadRegistry();

    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    if (!fs.existsSync(specPath)) {
      throw new Error(`Increment spec not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Try each detection method
    for (const method of this.config.detectFeatureFrom) {
      let mapping: FeatureMapping | null = null;

      switch (method) {
        case 'frontmatter':
          mapping = await this.detectFeatureFromFrontmatter(content, incrementId);
          break;
        case 'increment-name':
          mapping = await this.detectFeatureFromIncrementName(incrementId);
          break;
        case 'config':
          mapping = await this.detectFeatureFromConfig(incrementId);
          break;
      }

      if (mapping && mapping.confidence >= 80) {
        return mapping;
      }
    }

    // Fallback: Create feature from increment name + date
    return await this.createFallbackFeatureMapping(incrementId);
  }

  /**
   * Detect which projects this increment/feature affects (REQUIRED)
   *
   * Returns array of project IDs (dynamic, from config)
   *
   * Detection Methods:
   * 1. Frontmatter: project: backend OR projects: [backend, frontend]
   * 2. Increment Name: Contains project keyword (0031-backend-api-sync)
   * 3. Config: livingDocs.hierarchyMapping.incrementToProjects
   * 4. Fallback: ['default'] (single-project mode)
   */
  async detectProjects(incrementId: string): Promise<string[]> {
    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    if (!fs.existsSync(specPath)) {
      return ['default'];
    }

    const content = await fs.readFile(specPath, 'utf-8');
    const config = await this.getSpecweaveConfig();
    const configuredProjects = await this.getConfiguredProjects();

    // Method 1: Frontmatter (explicit)
    const frontmatterProjects = await this.detectProjectsFromFrontmatter(content);
    if (frontmatterProjects.length > 0) {
      // Validate projects exist in config
      const validProjects = frontmatterProjects.filter(p => configuredProjects.includes(p));
      if (validProjects.length > 0) {
        return validProjects;
      }
    }

    // Method 2: Increment name (contains project keyword)
    const nameProjects = this.detectProjectsFromIncrementName(incrementId, configuredProjects, config);
    if (nameProjects.length > 0) {
      return nameProjects;
    }

    // Method 3: Config mapping
    const configProjects = await this.detectProjectsFromConfig(incrementId);
    if (configProjects.length > 0) {
      return configProjects;
    }

    // Fallback: Default project
    return ['default'];
  }

  /**
   * Detect epic from frontmatter
   */
  private async detectEpicFromFrontmatter(content: string, incrementId: string): Promise<EpicMapping | null> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    try {
      const yaml = await import('yaml');
      const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

      if (frontmatter.epic && typeof frontmatter.epic === 'string') {
        const epicId = frontmatter.epic; // EPIC-2025-Q4-platform
        const epicFolder = epicId;
        const epicPath = path.join(this.config.specsBaseDir, '_epics', epicFolder);

        // Try to detect which features belong to this epic (from existing EPIC.md)
        const epicFilePath = path.join(epicPath, 'EPIC.md');
        let features: string[] = [];

        if (fs.existsSync(epicFilePath)) {
          const epicContent = await fs.readFile(epicFilePath, 'utf-8');
          // Extract feature IDs from epic file (simple pattern matching)
          const featureMatches = epicContent.matchAll(/FS-\d{2}-\d{2}-\d{2}-[a-z0-9-]+/g);
          features = Array.from(featureMatches, m => m[0]);
        }

        return {
          epicId,
          epicFolder,
          epicPath,
          features,
          confidence: 100,
          detectionMethod: 'frontmatter',
        };
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse frontmatter for epic detection: ${error}`);
    }

    return null;
  }

  /**
   * Detect epic from config
   */
  private async detectEpicFromConfig(incrementId: string): Promise<EpicMapping | null> {
    const config = await this.getSpecweaveConfig();
    const epicMapping = (config as any).livingDocs?.hierarchyMapping?.incrementToEpic?.[incrementId];

    if (epicMapping && typeof epicMapping === 'string') {
      const epicId = epicMapping;
      const epicFolder = epicId;
      const epicPath = path.join(this.config.specsBaseDir, '_epics', epicFolder);

      return {
        epicId,
        epicFolder,
        epicPath,
        features: [],
        confidence: 100,
        detectionMethod: 'config',
      };
    }

    return null;
  }

  /**
   * Detect feature from frontmatter
   *
   * CRITICAL: For greenfield projects, ALWAYS use increment number (FS-XXX)
   * even if frontmatter says FS-YY-MM-DD-name (date-based format)
   */
  private async detectFeatureFromFrontmatter(content: string, incrementId: string): Promise<FeatureMapping | null> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    try {
      const yaml = await import('yaml');
      const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

      if (frontmatter.feature && typeof frontmatter.feature === 'string') {
        let featureId = frontmatter.feature;

        // Check if this is a brownfield project (imported from external tool)
        const isBrownfield = frontmatter.source === 'external' || frontmatter.imported === true;

        if (!isBrownfield) {
          // Greenfield: ALWAYS use increment number, ignore frontmatter's date-based ID
          const numMatch = incrementId.match(/^(\d{4})-/);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            featureId = `FS-${String(num).padStart(3, '0')}`;
          }
        }
        // For brownfield, keep the date-based ID from frontmatter

        const projects = await this.detectProjects(incrementId);
        const epic = frontmatter.epic || undefined;

        return this.buildFeatureMapping(featureId, projects, epic, 100, 'frontmatter');
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse frontmatter for feature detection: ${error}`);
    }

    return null;
  }

  /**
   * Detect feature from increment name
   *
   * Examples:
   * - 0031-external-tool-status-sync → FS-031
   * - 0032-user-authentication → FS-032
   * - 0001-core-framework → FS-001
   */
  private async detectFeatureFromIncrementName(incrementId: string): Promise<FeatureMapping | null> {
    // Extract increment number (first 4 digits)
    const numMatch = incrementId.match(/^(\d{4})-/);
    if (!numMatch) return null;

    const num = parseInt(numMatch[1], 10);

    // Build feature ID: FS-XXX (using last 3 digits, zero-padded)
    const featureId = `FS-${String(num).padStart(3, '0')}`;

    // Detect projects
    const projects = await this.detectProjects(incrementId);

    // Check if feature folder already exists
    const existingFeature = await this.findExistingFeatureFolder(featureId);
    if (existingFeature) {
      return this.buildFeatureMapping(existingFeature, projects, undefined, 90, 'increment-name');
    }

    return this.buildFeatureMapping(featureId, projects, undefined, 90, 'increment-name');
  }

  /**
   * Detect feature from config
   */
  private async detectFeatureFromConfig(incrementId: string): Promise<FeatureMapping | null> {
    const config = await this.getSpecweaveConfig();
    const featureMapping = (config as any).livingDocs?.hierarchyMapping?.incrementToFeature?.[incrementId];

    if (featureMapping && typeof featureMapping === 'string') {
      const featureId = featureMapping;
      const projects = await this.detectProjects(incrementId);

      return this.buildFeatureMapping(featureId, projects, undefined, 100, 'config');
    }

    return null;
  }

  /**
   * Create fallback feature mapping
   */
  private async createFallbackFeatureMapping(incrementId: string): Promise<FeatureMapping> {
    // Extract increment number (first 4 digits)
    const numMatch = incrementId.match(/^(\d{4})-/);
    if (!numMatch) {
      throw new Error(`Invalid increment ID format: ${incrementId}`);
    }

    const num = parseInt(numMatch[1], 10);

    // Build feature ID: FS-XXX (using last 3 digits, zero-padded)
    const featureId = `FS-${String(num).padStart(3, '0')}`;

    // Detect projects
    const projects = await this.detectProjects(incrementId);

    console.log(`   📁 Creating new feature: ${featureId}`);

    return this.buildFeatureMapping(featureId, projects, undefined, 80, 'fallback');
  }

  /**
   * Build FeatureMapping object
   *
   * CRITICAL: For greenfield (FS-XXX format), use the feature ID directly.
   * The feature ID manager is only used for brownfield (date-based) IDs.
   */
  private buildFeatureMapping(
    featureId: string,
    projects: string[],
    epic: string | undefined,
    confidence: number,
    detectionMethod: 'frontmatter' | 'increment-name' | 'config' | 'fallback'
  ): FeatureMapping {
    // Check if this is greenfield (FS-XXX) or brownfield (FS-YY-MM-DD-name)
    const isGreenfield = /^FS-\d{3}$/.test(featureId);

    // For greenfield, use the feature ID directly (no registry lookup)
    // For brownfield, get assigned ID from registry (for deduplication)
    const finalFeatureId = isGreenfield
      ? featureId
      : this.featureIdManager.getAssignedId(featureId);

    // Use final ID for folders
    const featureFolder = finalFeatureId;
    const featurePath = path.join(this.config.specsBaseDir, '_features', featureFolder);

    // Build project paths map using final ID
    const projectPaths = new Map<string, string>();
    for (const project of projects) {
      projectPaths.set(project, path.join(this.config.specsBaseDir, project, finalFeatureId));
    }

    return {
      featureId: finalFeatureId,
      featureFolder,
      featurePath,
      projects,
      projectPaths,
      epic,
      confidence,
      detectionMethod,
    };
  }

  /**
   * Detect projects from frontmatter
   */
  private async detectProjectsFromFrontmatter(content: string): Promise<string[]> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return [];

    try {
      const yaml = await import('yaml');
      const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

      // Single project: project: backend
      if (frontmatter.project && typeof frontmatter.project === 'string') {
        return [frontmatter.project];
      }

      // Multiple projects: projects: [backend, frontend]
      if (frontmatter.projects && Array.isArray(frontmatter.projects)) {
        return frontmatter.projects.filter((p: any) => typeof p === 'string');
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse frontmatter for project detection: ${error}`);
    }

    return [];
  }

  /**
   * Detect projects from increment name (keyword matching)
   */
  private detectProjectsFromIncrementName(
    incrementId: string,
    configuredProjects: string[],
    config: SpecweaveConfig
  ): string[] {
    const detectedProjects: string[] = [];

    for (const projectId of configuredProjects) {
      if (projectId === 'default') continue;

      const projectConfig = config.multiProject?.projects?.[projectId];
      if (!projectConfig) continue;

      // Check if increment name contains project keywords
      const keywords = projectConfig.keywords || [projectId];
      for (const keyword of keywords) {
        if (incrementId.toLowerCase().includes(keyword.toLowerCase())) {
          detectedProjects.push(projectId);
          break;
        }
      }
    }

    return detectedProjects;
  }

  /**
   * Detect projects from config
   */
  private async detectProjectsFromConfig(incrementId: string): Promise<string[]> {
    const config = await this.getSpecweaveConfig();
    const projectMapping = (config as any).livingDocs?.hierarchyMapping?.incrementToProjects?.[incrementId];

    if (projectMapping) {
      if (typeof projectMapping === 'string') {
        return [projectMapping];
      }
      if (Array.isArray(projectMapping)) {
        return projectMapping.filter((p: any) => typeof p === 'string');
      }
    }

    return [];
  }

  /**
   * Get increment creation date in YY-MM-DD format
   *
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
        // Fall through
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
        // Fall through
      }
    }

    // Fallback: current date
    return this.formatDateShort(new Date().toISOString());
  }

  /**
   * Format date as YY-MM-DD
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
   * Find existing feature folder (exact or fuzzy match)
   *
   * CRITICAL: For greenfield (FS-XXX), only exact match.
   * For brownfield (FS-YY-MM-DD-name), fuzzy match allowed.
   */
  private async findExistingFeatureFolder(featureId: string): Promise<string | null> {
    const featuresDir = path.join(this.config.specsBaseDir, '_features');

    if (!fs.existsSync(featuresDir)) {
      return null;
    }

    try {
      const folders = await fs.readdir(featuresDir);

      // Exact match (always try this first)
      if (folders.includes(featureId)) {
        return featureId;
      }

      // Fuzzy match ONLY for brownfield (date-based) IDs
      // Greenfield IDs (FS-XXX) should NEVER fuzzy match
      const isGreenfield = /^FS-\d{3}$/.test(featureId);
      if (isGreenfield) {
        return null; // No fuzzy match for greenfield
      }

      // Fuzzy match for brownfield (feature name is substring)
      // Example: FS-25-11-14-external-tool-sync matches FS-25-11-14-external-tool-status-sync
      const featureNamePart = featureId.split('-').slice(3).join('-'); // external-tool-sync
      if (!featureNamePart) {
        return null; // No feature name part, skip fuzzy match
      }

      for (const folder of folders) {
        if (folder.includes(featureNamePart)) {
          const folderPath = path.join(featuresDir, folder);
          const stats = await fs.stat(folderPath);
          if (stats.isDirectory()) {
            return folder;
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to find feature folder: ${error}`);
    }

    return null;
  }

  /**
   * Get all feature folders
   */
  async getAllFeatureFolders(): Promise<string[]> {
    const featuresDir = path.join(this.config.specsBaseDir, '_features');

    if (!fs.existsSync(featuresDir)) {
      return [];
    }

    try {
      const folders = await fs.readdir(featuresDir);
      const featureFolders: string[] = [];

      for (const folder of folders) {
        // Skip special files/folders
        if (folder.startsWith('.') || folder.startsWith('_')) {
          continue;
        }

        const folderPath = path.join(featuresDir, folder);
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
   * Get all epic folders
   */
  async getAllEpicFolders(): Promise<string[]> {
    const epicsDir = path.join(this.config.specsBaseDir, '_epics');

    if (!fs.existsSync(epicsDir)) {
      return [];
    }

    try {
      const folders = await fs.readdir(epicsDir);
      const epicFolders: string[] = [];

      for (const folder of folders) {
        // Skip special files/folders
        if (folder.startsWith('.') || folder.startsWith('_')) {
          continue;
        }

        const folderPath = path.join(epicsDir, folder);
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          epicFolders.push(folder);
        }
      }

      return epicFolders.sort();
    } catch (error) {
      console.warn(`   ⚠️  Failed to get epic folders: ${error}`);
      return [];
    }
  }

  /**
   * LEGACY: Backward compatibility alias for detectFeatureMapping
   */
  async detectEpicMapping_LEGACY(incrementId: string): Promise<FeatureMapping> {
    return this.detectFeatureMapping(incrementId);
  }
}
