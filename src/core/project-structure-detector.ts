/**
 * Project Structure Detector
 *
 * Automatically detects project management structure from:
 * - Existing increments and work items
 * - Source system metadata (Jira, ADO, GitHub)
 * - Configuration files
 *
 * Supports various hierarchies:
 * - Jira: Epic → Story → Sub-task
 * - ADO: Epic → Feature → User Story → Task
 * - GitHub: Milestone → Issue (or flat Issues)
 * - Custom: Configurable levels
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Hierarchy levels:
 * - FLAT: No hierarchy (GitHub issues, flat ADO)
 * - SINGLE_PARENT: Milestone/Feature → Items
 * - TWO_LEVEL: Epic → Stories → Tasks
 * - THREE_LEVEL: Initiative → Epic → Feature → Stories
 */
export type HierarchyLevel = 'flat' | 'single_parent' | 'two_level' | 'three_level';

/**
 * Work item types vary by system
 */
export interface WorkItemTypes {
  topLevel?: string;       // Initiative, Program (Level 3)
  parentLevel?: string;    // Epic, Feature, Milestone (Level 2)
  itemLevel: string;       // Story, Issue, Requirement (Level 1)
  subItemLevel?: string;   // Sub-task, Task (Level 0)
}

/**
 * Grouping strategy for RFC organization
 */
export type GroupingStrategy =
  | 'by_type'          // Group by type (story, bug, task)
  | 'by_parent'        // Group by parent (epic, feature, milestone)
  | 'by_priority'      // Group by priority (P1, P2, P3)
  | 'by_label'         // Group by label/tag
  | 'flat'             // No grouping, flat list
  | 'custom';          // Custom grouping function

/**
 * Project structure configuration
 */
export interface ProjectStructure {
  source: 'jira' | 'ado' | 'github' | 'manual';
  hierarchyLevel: HierarchyLevel;
  workItemTypes: WorkItemTypes;
  groupingStrategy: GroupingStrategy;
  customGrouping?: (items: any[]) => Record<string, any[]>;

  // Optional metadata
  epicFieldName?: string;      // Custom field for epic link
  featureFieldName?: string;   // Custom field for feature link
  milestoneFieldName?: string; // Custom field for milestone
}

/**
 * Detected structure from analysis
 */
export interface DetectedStructure {
  structure: ProjectStructure;
  confidence: number;  // 0-1, how confident we are
  evidence: string[];  // What led to this detection
  sampleIncrements: string[];  // Which increments were analyzed
}

export class ProjectStructureDetector {
  private projectRoot: string;
  private configPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.yaml');
  }

  /**
   * Detect project structure with auto-detection and config override
   */
  public async detectStructure(): Promise<ProjectStructure> {
    // 1. Check for explicit configuration
    const configStructure = this.loadConfigStructure();
    if (configStructure) {
      return configStructure;
    }

    // 2. Auto-detect from existing increments
    const detected = await this.autoDetectStructure();

    // 3. Save detected structure for future use
    await this.saveDetectedStructure(detected.structure);

    return detected.structure;
  }

  /**
   * Load structure from configuration file
   */
  private loadConfigStructure(): ProjectStructure | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const config: any = yaml.load(fs.readFileSync(this.configPath, 'utf-8'));

      if (!config.project_structure) {
        return null;
      }

      return this.parseConfigStructure(config.project_structure);
    } catch (error) {
      console.warn('Failed to load config structure:', error);
      return null;
    }
  }

  /**
   * Auto-detect structure from existing increments
   */
  private async autoDetectStructure(): Promise<DetectedStructure> {
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    if (!fs.existsSync(incrementsDir)) {
      // No increments yet, use defaults based on source
      return this.getDefaultStructure();
    }

    const increments = fs.readdirSync(incrementsDir)
      .filter(name => /^\d{4}/.test(name))
      .slice(0, 5);  // Analyze first 5 increments

    if (increments.length === 0) {
      return this.getDefaultStructure();
    }

    // Analyze increments for patterns
    const analysis = await this.analyzeIncrements(increments);

    return {
      structure: analysis.structure,
      confidence: analysis.confidence,
      evidence: analysis.evidence,
      sampleIncrements: increments
    };
  }

  /**
   * Analyze increments to detect structure
   */
  private async analyzeIncrements(increments: string[]): Promise<DetectedStructure> {
    const evidence: string[] = [];
    let hasEpics = false;
    let hasFeatures = false;
    let hasMilestones = false;
    let hasInitiatives = false;
    let source: 'jira' | 'ado' | 'github' | 'manual' = 'manual';
    const workItemTypesSeen = new Set<string>();

    for (const increment of increments) {
      const specPath = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        increment,
        'spec.md'
      );

      if (!fs.existsSync(specPath)) continue;

      const content = fs.readFileSync(specPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) continue;

      const frontmatter: any = yaml.load(frontmatterMatch[1]);

      // Detect source
      if (frontmatter.jira) {
        source = 'jira';
        evidence.push(`Found Jira metadata in ${increment}`);

        if (frontmatter.jira.epic_key) {
          hasEpics = true;
          evidence.push(`Found Epic link: ${frontmatter.jira.epic_key}`);
        }
      }

      if (frontmatter.ado) {
        source = 'ado';
        evidence.push(`Found ADO metadata in ${increment}`);

        if (frontmatter.ado.feature_id) {
          hasFeatures = true;
          evidence.push(`Found Feature link: ${frontmatter.ado.feature_id}`);
        }
        if (frontmatter.ado.epic_id) {
          hasEpics = true;
          evidence.push(`Found Epic link in ADO`);
        }
      }

      if (frontmatter.github) {
        source = 'github';
        evidence.push(`Found GitHub metadata in ${increment}`);

        if (frontmatter.github.milestone) {
          hasMilestones = true;
          evidence.push(`Found Milestone: ${frontmatter.github.milestone}`);
        }
      }

      // Analyze work items
      if (frontmatter.work_items && Array.isArray(frontmatter.work_items)) {
        frontmatter.work_items.forEach((item: any) => {
          if (item.type) {
            workItemTypesSeen.add(item.type);
          }
        });
      }
    }

    // Determine hierarchy level
    let hierarchyLevel: HierarchyLevel;
    if (hasInitiatives && hasEpics && hasFeatures) {
      hierarchyLevel = 'three_level';
      evidence.push('Detected 3-level hierarchy (Initiative → Epic → Feature → Stories)');
    } else if (hasEpics || hasFeatures || hasMilestones) {
      hierarchyLevel = 'two_level';
      evidence.push(`Detected 2-level hierarchy with ${hasEpics ? 'Epics' : hasFeatures ? 'Features' : 'Milestones'}`);
    } else if (workItemTypesSeen.size > 0) {
      hierarchyLevel = 'single_parent';
      evidence.push('Detected single-level grouping by type');
    } else {
      hierarchyLevel = 'flat';
      evidence.push('Detected flat structure (no hierarchy)');
    }

    // Determine work item types
    const workItemTypes = this.inferWorkItemTypes(source, hierarchyLevel, workItemTypesSeen);

    // Determine grouping strategy
    const groupingStrategy = this.inferGroupingStrategy(source, hierarchyLevel, workItemTypesSeen);

    return {
      structure: {
        source,
        hierarchyLevel,
        workItemTypes,
        groupingStrategy
      },
      confidence: Math.min(increments.length / 5, 1),  // More samples = higher confidence
      evidence,
      sampleIncrements: increments
    };
  }

  /**
   * Infer work item types from source and hierarchy
   */
  private inferWorkItemTypes(
    source: 'jira' | 'ado' | 'github' | 'manual',
    hierarchyLevel: HierarchyLevel,
    typesSeen: Set<string>
  ): WorkItemTypes {
    switch (source) {
      case 'jira':
        return hierarchyLevel === 'three_level'
          ? { topLevel: 'Initiative', parentLevel: 'Epic', itemLevel: 'Story', subItemLevel: 'Sub-task' }
          : { parentLevel: 'Epic', itemLevel: 'Story', subItemLevel: 'Sub-task' };

      case 'ado':
        if (hierarchyLevel === 'three_level') {
          return { topLevel: 'Epic', parentLevel: 'Feature', itemLevel: 'User Story', subItemLevel: 'Task' };
        } else if (hierarchyLevel === 'two_level') {
          return { parentLevel: 'Feature', itemLevel: 'User Story', subItemLevel: 'Task' };
        } else {
          return { itemLevel: 'User Story', subItemLevel: 'Task' };
        }

      case 'github':
        return hierarchyLevel === 'two_level'
          ? { parentLevel: 'Milestone', itemLevel: 'Issue' }
          : { itemLevel: 'Issue' };

      default:
        // Infer from types seen
        if (typesSeen.has('story')) {
          return { parentLevel: 'Epic', itemLevel: 'Story', subItemLevel: 'Task' };
        } else if (typesSeen.has('issue')) {
          return { itemLevel: 'Issue' };
        } else {
          return { itemLevel: 'Item' };
        }
    }
  }

  /**
   * Infer grouping strategy from source and hierarchy
   */
  private inferGroupingStrategy(
    source: 'jira' | 'ado' | 'github' | 'manual',
    hierarchyLevel: HierarchyLevel,
    typesSeen: Set<string>
  ): GroupingStrategy {
    // If we see story/bug/task types, group by type
    if (typesSeen.has('story') || typesSeen.has('bug') || typesSeen.has('task')) {
      return 'by_type';
    }

    // If we have parent level (epic, feature, milestone), group by parent
    if (hierarchyLevel === 'two_level' || hierarchyLevel === 'three_level') {
      return 'by_parent';
    }

    // GitHub typically uses flat or by_label
    if (source === 'github') {
      return 'by_label';
    }

    // Default to by_type
    return 'by_type';
  }

  /**
   * Get default structure when no increments exist
   */
  private getDefaultStructure(): DetectedStructure {
    // Try to infer from environment or use sensible defaults
    const envSource = (process.env.JIRA_DOMAIN ? 'jira' :
                      process.env.AZURE_DEVOPS_ORG ? 'ado' :
                      process.env.GITHUB_REPOSITORY ? 'github' : 'manual') as any;

    const defaultStructures: Record<string, ProjectStructure> = {
      jira: {
        source: 'jira',
        hierarchyLevel: 'two_level',
        workItemTypes: {
          parentLevel: 'Epic',
          itemLevel: 'Story',
          subItemLevel: 'Sub-task'
        },
        groupingStrategy: 'by_type'
      },
      ado: {
        source: 'ado',
        hierarchyLevel: 'two_level',
        workItemTypes: {
          parentLevel: 'Feature',
          itemLevel: 'User Story',
          subItemLevel: 'Task'
        },
        groupingStrategy: 'by_type'
      },
      github: {
        source: 'github',
        hierarchyLevel: 'two_level',
        workItemTypes: {
          parentLevel: 'Milestone',
          itemLevel: 'Issue'
        },
        groupingStrategy: 'by_label'
      },
      manual: {
        source: 'manual',
        hierarchyLevel: 'two_level',
        workItemTypes: {
          parentLevel: 'Feature',
          itemLevel: 'Story',
          subItemLevel: 'Task'
        },
        groupingStrategy: 'by_type'
      }
    };

    return {
      structure: defaultStructures[envSource],
      confidence: 0.5,
      evidence: ['Using default structure based on environment'],
      sampleIncrements: []
    };
  }

  /**
   * Parse structure from config
   */
  private parseConfigStructure(config: any): ProjectStructure {
    return {
      source: config.source || 'manual',
      hierarchyLevel: config.hierarchy_level || 'two_level',
      workItemTypes: {
        topLevel: config.work_item_types?.top_level,
        parentLevel: config.work_item_types?.parent_level,
        itemLevel: config.work_item_types?.item_level || 'Story',
        subItemLevel: config.work_item_types?.sub_item_level
      },
      groupingStrategy: config.grouping_strategy || 'by_type',
      epicFieldName: config.epic_field_name,
      featureFieldName: config.feature_field_name,
      milestoneFieldName: config.milestone_field_name
    };
  }

  /**
   * Save detected structure to config
   */
  private async saveDetectedStructure(structure: ProjectStructure): Promise<void> {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};
    if (fs.existsSync(this.configPath)) {
      config = yaml.load(fs.readFileSync(this.configPath, 'utf-8')) || {};
    }

    config.project_structure = {
      source: structure.source,
      hierarchy_level: structure.hierarchyLevel,
      work_item_types: {
        top_level: structure.workItemTypes.topLevel,
        parent_level: structure.workItemTypes.parentLevel,
        item_level: structure.workItemTypes.itemLevel,
        sub_item_level: structure.workItemTypes.subItemLevel
      },
      grouping_strategy: structure.groupingStrategy,
      epic_field_name: structure.epicFieldName,
      feature_field_name: structure.featureFieldName,
      milestone_field_name: structure.milestoneFieldName,
      detected_at: new Date().toISOString()
    };

    fs.writeFileSync(this.configPath, yaml.dump(config), 'utf-8');
  }

  /**
   * Get structure summary for display
   */
  public getStructureSummary(structure: ProjectStructure): string {
    const hierarchy = this.getHierarchyDescription(structure);
    const grouping = this.getGroupingDescription(structure.groupingStrategy);

    return `Source: ${structure.source.toUpperCase()}\nHierarchy: ${hierarchy}\nGrouping: ${grouping}`;
  }

  private getHierarchyDescription(structure: ProjectStructure): string {
    const types = structure.workItemTypes;
    const parts: string[] = [];

    if (types.topLevel) parts.push(types.topLevel);
    if (types.parentLevel) parts.push(types.parentLevel);
    parts.push(types.itemLevel);
    if (types.subItemLevel) parts.push(types.subItemLevel);

    return parts.join(' → ');
  }

  private getGroupingDescription(strategy: GroupingStrategy): string {
    const descriptions: Record<GroupingStrategy, string> = {
      by_type: 'Group by Type (Story, Bug, Task)',
      by_parent: 'Group by Parent (Epic, Feature, Milestone)',
      by_priority: 'Group by Priority (P1, P2, P3)',
      by_label: 'Group by Label/Tag',
      flat: 'Flat List (No Grouping)',
      custom: 'Custom Grouping'
    };

    return descriptions[strategy];
  }
}
