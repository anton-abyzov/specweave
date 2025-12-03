/**
 * SpecWeave Hierarchy Mapper (v5.1.0 - Per-Project Epics)
 *
 * Maps increments to unified hierarchy:
 * - Epic (EP-XXX) -> {project}/_epics/EP-XXX/EPIC.md (PER-PROJECT, not root level!)
 * - Feature (FS-XXX) -> {project}/{board}/FS-XXX/FEATURE.md (+ user stories)
 * - User Story (us-{id}) -> {project}/{board}/FS-XXX/us-{id}.md
 * - Task (T-{id}) -> Checkboxes in User Story description
 *
 * CRITICAL (v0.30.3): Epics are PER-PROJECT, not at root level.
 * Each project has its own _epics/ folder: {project}/_epics/
 *
 * All features live under board folders within projects.
 * Archive: {project}/{board}/_archive/FS-XXX/
 *
 * Key Principles:
 * - NO HARDCODED PROJECT NAMES (backend, frontend are examples)
 * - Projects are DYNAMIC from config.json -> multiProject.projects
 * - Single-project mode: one project folder (e.g., 'specweave')
 * - Multi-project mode: multiple project folders
 * - Feature IDs assigned by creation date (FS-001, FS-002, etc.)
 * - NO DUPLICATE FEATURE IDS (enforced by FeatureIDManager)
 * - EPICS ARE PER-PROJECT (v0.30.3+)
 *
 * @author SpecWeave Team
 * @version 5.1.0 (Per-Project Epics)
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import { ConfigManager } from '../config-manager.js';
import { SpecweaveConfig, MultiProjectConfig, ProjectConfig } from '../types/config.js';
import { EpicMapping, FeatureMapping, ProjectContext } from './types.js';
import { FeatureIDManager } from './feature-id-manager.js';
import { findNextAvailableInternalIdSync } from '../../utils/feature-id-collision.js';

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
 * HierarchyMapper - Maps increments to unified project structure
 *
 * Structure (v5.1.0 - Per-Project Epics):
 * 1. Epic (EP-XXX) -> {project}/_epics/EP-XXX/EPIC.md (PER-PROJECT!)
 * 2. Feature (FS-XXX) -> {project}/{board}/FS-XXX/FEATURE.md
 * 3. User Story (us-NNN-{name}) -> {project}/{board}/FS-XXX/us-{id}.md
 * 4. Task (T-NNN) -> Checkboxes in User Story description
 *
 * CRITICAL (v0.30.3): Epics are now stored per-project in {project}/_epics/
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
      const projects = Object.keys(config.multiProject.projects);
      // If projects object is empty, fallback to default
      if (projects.length > 0) {
        return projects;
      }
    }

    // Default: single-project mode
    return ['default'];
  }

  /**
   * Check if a feature is archived
   *
   * Archive location: specs/{project}/_archive/FS-XXX/
   */
  async isFeatureArchived(featureId: string): Promise<boolean> {
    // Check project-specific archives (the only location now)
    const projects = await this.getConfiguredProjects();
    for (const project of projects) {
      const archivePath = path.join(this.config.specsBaseDir, project, '_archive', featureId);
      if (await fs.pathExists(archivePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an epic is archived
   *
   * CRITICAL (v0.30.3): Epics are per-project in {project}/_epics/_archive/
   *
   * @param epicId - Epic ID (e.g., "EP-086E")
   * @param projectId - Optional project ID. If not provided, checks all projects.
   */
  async isEpicArchived(epicId: string, projectId?: string): Promise<boolean> {
    // If projectId provided, check only that project
    if (projectId) {
      const archivePath = path.join(this.config.specsBaseDir, projectId, '_epics', '_archive', epicId);
      return await fs.pathExists(archivePath);
    }

    // Otherwise, check all projects
    const projects = await this.getConfiguredProjects();
    for (const project of projects) {
      const archivePath = path.join(this.config.specsBaseDir, project, '_epics', '_archive', epicId);
      if (await fs.pathExists(archivePath)) {
        return true;
      }
    }

    return false;
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
      // Fallback to configured projects when spec missing
      return await this.getConfiguredProjects();
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

    // Fallback: Use configured projects (single-project mode uses repo name, not 'default')
    return configuredProjects;
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

        // Detect projects FIRST for collision checking
        const projects = await this.detectProjects(incrementId);

        if (!isBrownfield) {
          // Greenfield: ALWAYS use increment number, ignore frontmatter's date-based ID
          const numMatch = incrementId.match(/^(\d{4})-/);
          if (numMatch) {
            const baseNum = parseInt(numMatch[1], 10);
            // CRITICAL FIX (2025-11-26): Check for FS-XXXE collision before using FS-XXX
            const primaryProject = projects[0] || 'default';
            const safeNum = findNextAvailableInternalIdSync(baseNum, this.config.specsBaseDir, primaryProject);
            featureId = `FS-${String(safeNum).padStart(3, '0')}`;
          }
        }
        // For brownfield, keep the date-based ID from frontmatter
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

    const baseNum = parseInt(numMatch[1], 10);

    // Detect projects FIRST for collision checking
    const projects = await this.detectProjects(incrementId);

    // CRITICAL FIX (2025-11-26): Check for FS-XXXE collision before using FS-XXX
    const primaryProject = projects[0] || 'default';
    const safeNum = findNextAvailableInternalIdSync(baseNum, this.config.specsBaseDir, primaryProject);

    // Build feature ID: FS-XXX (using safe number that doesn't collide with FS-XXXE)
    const featureId = `FS-${String(safeNum).padStart(3, '0')}`;

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

    const baseNum = parseInt(numMatch[1], 10);

    // Detect projects FIRST for collision checking
    const projects = await this.detectProjects(incrementId);

    // CRITICAL FIX (2025-11-26): Check for FS-XXXE collision before using FS-XXX
    const primaryProject = projects[0] || 'default';
    const safeNum = findNextAvailableInternalIdSync(baseNum, this.config.specsBaseDir, primaryProject);

    // Build feature ID: FS-XXX (using safe number that doesn't collide with FS-XXXE)
    const featureId = `FS-${String(safeNum).padStart(3, '0')}`;

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
    // Check if this is greenfield (FS-XXX, 3+ digits) or brownfield (FS-YY-MM-DD-name)
    const isGreenfield = /^FS-\d{3,}$/.test(featureId);

    // For greenfield, use the feature ID directly (no registry lookup)
    // For brownfield, get assigned ID from registry (for deduplication)
    const finalFeatureId = isGreenfield
      ? featureId
      : this.featureIdManager.getAssignedId(featureId);

    // Use final ID for folders
    const featureFolder = finalFeatureId;

    // Build project paths map using final ID
    // Feature path is the primary project's feature folder
    const projectPaths = new Map<string, string>();
    for (const project of projects) {
      projectPaths.set(project, path.join(this.config.specsBaseDir, project, finalFeatureId));
    }

    // Feature path is the first project's feature folder
    const primaryProject = projects[0] || 'default';
    const featurePath = path.join(this.config.specsBaseDir, primaryProject, featureFolder);

    return {
      featureId: finalFeatureId,
      featureFolder,
      featurePath,
      projects,
      projectPaths: Object.fromEntries(projectPaths),  // Convert Map to Record
      epic,
      confidence,
      detectionMethod,
      userStories: [],  // Initialize empty, populated later
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
   * Searches in: {project}/FS-XXX/
   *
   * CRITICAL: For greenfield (FS-XXX), only exact match.
   * For brownfield (FS-YY-MM-DD-name), fuzzy match allowed.
   */
  private async findExistingFeatureFolder(featureId: string): Promise<string | null> {
    // Search in all project folders
    const projects = await this.getConfiguredProjects();

    for (const project of projects) {
      const projectDir = path.join(this.config.specsBaseDir, project);

      if (!fs.existsSync(projectDir)) {
        continue;
      }

      try {
        const folders = await fs.readdir(projectDir);

        // Exact match (always try this first)
        if (folders.includes(featureId)) {
          return featureId;
        }

        // Fuzzy match ONLY for brownfield (date-based) IDs
        // Greenfield IDs (FS-XXX, 3+ digits) should NEVER fuzzy match
        const isGreenfield = /^FS-\d{3,}E?$/.test(featureId);
        if (isGreenfield) {
          continue; // No fuzzy match for greenfield
        }

        // Fuzzy match for brownfield (feature name is substring)
        const featureNamePart = featureId.split('-').slice(3).join('-');
        if (!featureNamePart) {
          continue;
        }

        for (const folder of folders) {
          if (folder.includes(featureNamePart)) {
            const folderPath = path.join(projectDir, folder);
            const stats = await fs.stat(folderPath);
            if (stats.isDirectory()) {
              return folder;
            }
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to find feature folder in ${project}: ${error}`);
      }
    }

    return null;
  }

  /**
   * Get all feature folders from all project folders
   *
   * Scans: {project}/FS-XXX/
   */
  async getAllFeatureFolders(): Promise<string[]> {
    const featureFolders = new Set<string>();
    const projects = await this.getConfiguredProjects();

    for (const project of projects) {
      const projectDir = path.join(this.config.specsBaseDir, project);

      if (!fs.existsSync(projectDir)) {
        continue;
      }

      try {
        const folders = await fs.readdir(projectDir);

        for (const folder of folders) {
          // Only include FS-XXX folders (feature folders)
          if (folder.startsWith('.') || folder.startsWith('_')) {
            continue;
          }

          // Match FS-XXX or FS-XXXE pattern (3+ digits)
          if (!/^FS-\d{3,}E?$/.test(folder)) {
            continue;
          }

          const folderPath = path.join(projectDir, folder);
          const stats = await fs.stat(folderPath);

          if (stats.isDirectory()) {
            featureFolders.add(folder);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to get feature folders from ${project}: ${error}`);
      }
    }

    return Array.from(featureFolders).sort();
  }

  /**
   * Get all epic folders across all projects
   *
   * CRITICAL (v0.30.3): Epics are per-project in {project}/_epics/
   *
   * @param projectId - Optional project ID. If provided, only returns epics from that project.
   * @returns Array of epic folder names (e.g., ["EP-086E", "EP-087E"])
   */
  async getAllEpicFolders(projectId?: string): Promise<string[]> {
    const epicFolders = new Set<string>();
    const projects = projectId ? [projectId] : await this.getConfiguredProjects();

    for (const project of projects) {
      const epicsDir = path.join(this.config.specsBaseDir, project, '_epics');

      if (!fs.existsSync(epicsDir)) {
        continue;
      }

      try {
        const folders = await fs.readdir(epicsDir);

        for (const folder of folders) {
          // Skip special files/folders
          if (folder.startsWith('.') || folder.startsWith('_')) {
            continue;
          }

          // Match EP-XXX or EP-XXXE pattern
          if (!/^EP-\d{3,}E?$/.test(folder)) {
            continue;
          }

          const folderPath = path.join(epicsDir, folder);
          const stats = await fs.stat(folderPath);

          if (stats.isDirectory()) {
            epicFolders.add(folder);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to get epic folders from ${project}: ${error}`);
      }
    }

    return Array.from(epicFolders).sort();
  }

  /**
   * Get the epics path for a specific project
   *
   * @param projectId - Project ID
   * @returns Path to {project}/_epics/
   */
  getEpicsPathForProject(projectId: string): string {
    return path.join(this.config.specsBaseDir, projectId, '_epics');
  }

  /**
   * LEGACY: Backward compatibility alias for detectFeatureMapping
   */
  async detectEpicMapping_LEGACY(incrementId: string): Promise<FeatureMapping> {
    return this.detectFeatureMapping(incrementId);
  }
}
