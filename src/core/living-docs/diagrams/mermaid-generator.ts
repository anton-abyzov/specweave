/**
 * Mermaid Diagram Generator
 *
 * Generates various Mermaid diagrams for enterprise documentation:
 * - System architecture (C4 context)
 * - Feature hierarchy
 * - Team org charts
 * - Module dependencies
 * - Timeline/Gantt charts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { EnhancedFeatureSpec, SpecsCatalog } from '../enterprise/spec-loader.js';
import type { ProjectTimeline, TimelineEvent } from '../enterprise/history-analyzer.js';
import type { RelationshipMap } from '../enterprise/relationship-mapper.js';
import type { RepoAnalysis } from '../intelligent-analyzer/types.js';

export interface MermaidGeneratorOptions {
  projectPath: string;
  projectName: string;
  features?: EnhancedFeatureSpec[];
  timeline?: ProjectTimeline;
  relationships?: RelationshipMap;
  repoAnalyses?: Map<string, RepoAnalysis>;
  teams?: Array<{ name: string; repos: string[]; members?: string[] }>;
}

export interface MermaidGenerationResult {
  diagrams: MermaidDiagram[];
  savedFiles: string[];
}

export interface MermaidDiagram {
  name: string;
  type: DiagramType;
  content: string;
  description: string;
  /** Actual filename (without path) - used for consistent link generation */
  filename?: string;
}

export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'c4Context';

export class MermaidGenerator {
  private options: MermaidGeneratorOptions;

  constructor(options: MermaidGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate all diagrams
   *
   * CRITICAL FIX (v1.0.12): Consolidated to single diagrams folder at
   * /internal/architecture/diagrams/ instead of creating duplicate /internal/diagrams/
   * This prevents confusion and ensures all diagrams are in one location.
   */
  async generate(): Promise<MermaidGenerationResult> {
    const diagrams: MermaidDiagram[] = [];
    const savedFiles: string[] = [];

    // FIXED: Use architecture/diagrams to consolidate with Phase D output
    const diagramsPath = path.join(this.options.projectPath, '.specweave/docs/internal/architecture/diagrams');
    fs.mkdirSync(diagramsPath, { recursive: true });

    // Generate feature hierarchy diagram
    if (this.options.features && this.options.features.length > 0) {
      const featureHierarchy = this.generateFeatureHierarchy();
      featureHierarchy.filename = 'feature-hierarchy.md';
      diagrams.push(featureHierarchy);
      const featurePath = path.join(diagramsPath, featureHierarchy.filename);
      fs.writeFileSync(featurePath, this.wrapDiagram(featureHierarchy));
      savedFiles.push(featurePath);
    }

    // Generate team org chart
    // FIX (v1.0.48): Ensure filename matches what's used in index generation
    if (this.options.teams && this.options.teams.length > 0) {
      const orgChart = this.generateTeamOrgChart();
      orgChart.filename = 'team-organization.md'; // Match display name for consistent links
      diagrams.push(orgChart);
      const orgPath = path.join(diagramsPath, orgChart.filename);
      fs.writeFileSync(orgPath, this.wrapDiagram(orgChart));
      savedFiles.push(orgPath);
    }

    // Generate module dependencies
    if (this.options.relationships) {
      const moduleDeps = this.generateModuleDependencies();
      moduleDeps.filename = 'module-dependencies.md';
      diagrams.push(moduleDeps);
      const modulePath = path.join(diagramsPath, moduleDeps.filename);
      fs.writeFileSync(modulePath, this.wrapDiagram(moduleDeps));
      savedFiles.push(modulePath);
    }

    // Generate project timeline
    if (this.options.timeline) {
      const timelineChart = this.generateProjectTimeline();
      timelineChart.filename = 'project-timeline.md';
      diagrams.push(timelineChart);
      const timelinePath = path.join(diagramsPath, timelineChart.filename);
      fs.writeFileSync(timelinePath, this.wrapDiagram(timelineChart));
      savedFiles.push(timelinePath);
    }

    // Generate system architecture (C4)
    if (this.options.repoAnalyses && this.options.repoAnalyses.size > 0) {
      const systemArch = this.generateSystemArchitecture();
      systemArch.filename = 'system-architecture.md';
      diagrams.push(systemArch);
      const archPath = path.join(diagramsPath, systemArch.filename);
      fs.writeFileSync(archPath, this.wrapDiagram(systemArch));
      savedFiles.push(archPath);
    }

    // Generate feature status pie chart
    if (this.options.features && this.options.features.length > 0) {
      const statusPie = this.generateFeatureStatusPie();
      statusPie.filename = 'feature-status.md';
      diagrams.push(statusPie);
      const piePath = path.join(diagramsPath, statusPie.filename);
      fs.writeFileSync(piePath, this.wrapDiagram(statusPie));
      savedFiles.push(piePath);
    }

    // Generate team-to-feature ownership diagram
    if (this.options.relationships && this.options.teams) {
      const teamFeatures = this.generateTeamFeatureOwnership();
      teamFeatures.filename = 'team-feature-ownership.md';
      diagrams.push(teamFeatures);
      const teamFeatPath = path.join(diagramsPath, teamFeatures.filename);
      fs.writeFileSync(teamFeatPath, this.wrapDiagram(teamFeatures));
      savedFiles.push(teamFeatPath);
    }

    // Generate index file
    const indexPath = path.join(diagramsPath, 'index.md');
    fs.writeFileSync(indexPath, this.generateIndex(diagrams));
    savedFiles.push(indexPath);

    return { diagrams, savedFiles };
  }

  /**
   * Generate feature hierarchy flowchart
   */
  private generateFeatureHierarchy(): MermaidDiagram {
    const features = this.options.features || [];
    const lines: string[] = ['flowchart TB'];

    // Group features by project
    const byProject = new Map<string, EnhancedFeatureSpec[]>();
    for (const f of features) {
      const proj = f.project || 'default';
      if (!byProject.has(proj)) byProject.set(proj, []);
      byProject.get(proj)!.push(f);
    }

    // Create subgraphs for each project
    for (const [project, projectFeatures] of byProject) {
      const safeProject = this.sanitizeId(project);
      lines.push(`    subgraph ${safeProject}["${project}"]`);

      for (const feature of projectFeatures.slice(0, 20)) { // Limit for readability
        const safeId = this.sanitizeId(feature.featureId);
        const statusIcon = this.getStatusIcon(feature.status);
        lines.push(`        ${safeId}["${statusIcon} ${feature.featureId}: ${this.truncate(feature.featureName, 30)}"]`);

        // Add user stories as children
        for (const us of feature.userStories.slice(0, 5)) { // Limit
          const safeUsId = this.sanitizeId(us.id);
          const usIcon = this.getStatusIcon(us.status);
          lines.push(`        ${safeUsId}["${usIcon} ${us.id}"]`);
          lines.push(`        ${safeId} --> ${safeUsId}`);
        }

        if (feature.userStories.length > 5) {
          lines.push(`        ${safeId}_more["... +${feature.userStories.length - 5} more"]`);
          lines.push(`        ${safeId} --> ${safeId}_more`);
        }
      }

      lines.push('    end');
    }

    // Add styling
    lines.push('');
    lines.push('    classDef completed fill:#90EE90,stroke:#333');
    lines.push('    classDef active fill:#87CEEB,stroke:#333');
    lines.push('    classDef archived fill:#D3D3D3,stroke:#333');

    return {
      name: 'Feature Hierarchy',
      type: 'flowchart',
      content: lines.join('\n'),
      description: 'Hierarchical view of all features and user stories',
    };
  }

  /**
   * Generate team org chart
   */
  private generateTeamOrgChart(): MermaidDiagram {
    const teams = this.options.teams || [];
    const lines: string[] = ['flowchart TB'];

    // Root node
    lines.push(`    org["${this.options.projectName}"]`);

    for (const team of teams) {
      const safeId = this.sanitizeId(team.name);
      lines.push(`    ${safeId}["${team.name}<br/>${team.repos.length} repos"]`);
      lines.push(`    org --> ${safeId}`);

      // Add repos under team
      for (const repo of team.repos.slice(0, 5)) {
        const safeRepoId = this.sanitizeId(team.name + '_' + repo);
        lines.push(`    ${safeRepoId}[("${repo}")]`);
        lines.push(`    ${safeId} --> ${safeRepoId}`);
      }

      if (team.repos.length > 5) {
        const moreId = this.sanitizeId(team.name + '_more');
        lines.push(`    ${moreId}["... +${team.repos.length - 5} more"]`);
        lines.push(`    ${safeId} --> ${moreId}`);
      }
    }

    return {
      name: 'Team Organization',
      type: 'flowchart',
      content: lines.join('\n'),
      description: 'Team structure with repository ownership',
    };
  }

  /**
   * Generate module dependencies graph
   */
  private generateModuleDependencies(): MermaidDiagram {
    const relationships = this.options.relationships;
    const lines: string[] = ['flowchart LR'];

    if (!relationships) {
      lines.push('    empty["No module dependencies detected"]');
      return {
        name: 'Module Dependencies',
        type: 'flowchart',
        content: lines.join('\n'),
        description: 'Module-to-module dependency graph',
      };
    }

    const moduleDeps = relationships.moduleDependencies;
    const addedModules = new Set<string>();

    // Add all modules and their dependencies
    for (const [module, deps] of moduleDeps.entries()) {
      const safeModule = this.sanitizeId(module);
      if (!addedModules.has(module)) {
        lines.push(`    ${safeModule}["${module}"]`);
        addedModules.add(module);
      }

      for (const dep of deps.slice(0, 10)) { // Limit edges
        const safeDep = this.sanitizeId(dep);
        if (!addedModules.has(dep)) {
          lines.push(`    ${safeDep}["${dep}"]`);
          addedModules.add(dep);
        }
        lines.push(`    ${safeModule} --> ${safeDep}`);
      }
    }

    if (addedModules.size === 0) {
      lines.push('    empty["No module dependencies detected"]');
    }

    return {
      name: 'Module Dependencies',
      type: 'flowchart',
      content: lines.join('\n'),
      description: 'Module-to-module dependency graph',
    };
  }

  /**
   * Generate project timeline Gantt chart
   */
  private generateProjectTimeline(): MermaidDiagram {
    const timeline = this.options.timeline;
    const lines: string[] = [
      'gantt',
      `    title ${this.options.projectName} Timeline`,
      '    dateFormat YYYY-MM-DD',
    ];

    if (!timeline || timeline.events.length === 0) {
      return {
        name: 'Project Timeline',
        type: 'gantt',
        content: lines.join('\n') + '\n    section Empty\n    No events :2024-01-01, 1d',
        description: 'Project history and milestones',
      };
    }

    // Group events by year/quarter
    const bySection = new Map<string, TimelineEvent[]>();
    for (const event of timeline.events) {
      const date = new Date(event.date);
      const section = `${date.getFullYear()} Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section)!.push(event);
    }

    // Sort sections chronologically
    const sortedSections = Array.from(bySection.keys()).sort();

    for (const section of sortedSections.slice(-8)) { // Last 8 quarters
      lines.push(`    section ${section}`);
      const events = bySection.get(section)!;

      for (const event of events.slice(0, 5)) { // Limit events per section
        const safeTitle = this.truncate(event.title, 40).replace(/:/g, ' ');
        const date = event.date.split('T')[0];
        const icon = this.getEventIcon(event.type);
        lines.push(`    ${icon} ${safeTitle} :${date}, 1d`);
      }
    }

    return {
      name: 'Project Timeline',
      type: 'gantt',
      content: lines.join('\n'),
      description: 'Project history and milestones',
    };
  }

  /**
   * Generate system architecture C4 context diagram
   */
  private generateSystemArchitecture(): MermaidDiagram {
    const analyses = this.options.repoAnalyses;
    const lines: string[] = ['flowchart TB'];

    if (!analyses || analyses.size === 0) {
      lines.push('    empty["No system components detected"]');
      return {
        name: 'System Architecture',
        type: 'flowchart',
        content: lines.join('\n'),
        description: 'C4-style system context diagram',
      };
    }

    // External actors
    lines.push('    subgraph external["External Actors"]');
    lines.push('        user["👤 User"]');
    lines.push('        admin["👤 Admin"]');
    lines.push('    end');
    lines.push('');

    // System boundary
    lines.push(`    subgraph system["${this.options.projectName}"]`);

    // Categorize repos by type
    const frontends: string[] = [];
    const backends: string[] = [];
    const databases: string[] = [];
    const services: string[] = [];

    for (const [name, analysis] of analyses) {
      const purpose = analysis.purpose.toLowerCase();
      const concepts = analysis.keyConcepts.join(' ').toLowerCase();

      if (purpose.includes('frontend') || purpose.includes('ui') || concepts.includes('react') || concepts.includes('vue')) {
        frontends.push(name);
      } else if (purpose.includes('database') || purpose.includes('storage') || concepts.includes('postgres') || concepts.includes('mongo')) {
        databases.push(name);
      } else if (purpose.includes('api') || purpose.includes('backend') || purpose.includes('service')) {
        backends.push(name);
      } else {
        services.push(name);
      }
    }

    // Add frontend layer
    if (frontends.length > 0) {
      lines.push('        subgraph frontend["Frontend Layer"]');
      for (const f of frontends.slice(0, 5)) {
        lines.push(`            ${this.sanitizeId(f)}["📱 ${f}"]`);
      }
      lines.push('        end');
    }

    // Add backend layer
    if (backends.length > 0) {
      lines.push('        subgraph backend["Backend Layer"]');
      for (const b of backends.slice(0, 5)) {
        lines.push(`            ${this.sanitizeId(b)}["⚙️ ${b}"]`);
      }
      lines.push('        end');
    }

    // Add services layer
    if (services.length > 0) {
      lines.push('        subgraph services["Services"]');
      for (const s of services.slice(0, 5)) {
        lines.push(`            ${this.sanitizeId(s)}["🔧 ${s}"]`);
      }
      lines.push('        end');
    }

    // Add data layer
    if (databases.length > 0) {
      lines.push('        subgraph data["Data Layer"]');
      for (const d of databases.slice(0, 3)) {
        lines.push(`            ${this.sanitizeId(d)}[("💾 ${d}")]`);
      }
      lines.push('        end');
    }

    lines.push('    end');

    // Add connections
    lines.push('');
    lines.push('    user --> frontend');
    lines.push('    admin --> frontend');
    if (frontends.length > 0 && backends.length > 0) {
      lines.push('    frontend --> backend');
    }
    if (backends.length > 0 && databases.length > 0) {
      lines.push('    backend --> data');
    }
    if (backends.length > 0 && services.length > 0) {
      lines.push('    backend <--> services');
    }

    return {
      name: 'System Architecture',
      type: 'flowchart',
      content: lines.join('\n'),
      description: 'C4-style system context diagram',
    };
  }

  /**
   * Generate feature status pie chart
   */
  private generateFeatureStatusPie(): MermaidDiagram {
    const features = this.options.features || [];

    const completed = features.filter(f => f.status === 'completed').length;
    const active = features.filter(f => f.status === 'active').length;
    const archived = features.filter(f => f.status === 'archived').length;

    const lines = [
      'pie showData',
      `    title Feature Status Distribution`,
      `    "Completed" : ${completed}`,
      `    "Active" : ${active}`,
      `    "Archived" : ${archived}`,
    ];

    return {
      name: 'Feature Status',
      type: 'pie',
      content: lines.join('\n'),
      description: 'Distribution of feature statuses',
    };
  }

  /**
   * Generate team-to-feature ownership diagram
   */
  private generateTeamFeatureOwnership(): MermaidDiagram {
    const relationships = this.options.relationships;
    const teams = this.options.teams || [];
    const lines: string[] = ['flowchart LR'];

    if (!relationships) {
      lines.push('    empty["No team ownership data"]');
      return {
        name: 'Team Feature Ownership',
        type: 'flowchart',
        content: lines.join('\n'),
        description: 'Which team owns which features',
      };
    }

    // Add teams
    lines.push('    subgraph teams["Teams"]');
    for (const team of teams) {
      const safeId = this.sanitizeId('team_' + team.name);
      lines.push(`        ${safeId}["👥 ${team.name}"]`);
    }
    lines.push('    end');

    // Add features
    lines.push('    subgraph features["Features"]');
    const addedFeatures = new Set<string>();
    for (const features of relationships.teamToFeatures.values()) {
      for (const featureId of features.slice(0, 10)) {
        if (!addedFeatures.has(featureId)) {
          const safeId = this.sanitizeId('feature_' + featureId);
          lines.push(`        ${safeId}["📋 ${featureId}"]`);
          addedFeatures.add(featureId);
        }
      }
    }
    lines.push('    end');

    // Add connections
    for (const [team, features] of relationships.teamToFeatures) {
      const safeTeamId = this.sanitizeId('team_' + team);
      for (const featureId of features.slice(0, 5)) {
        const safeFeatureId = this.sanitizeId('feature_' + featureId);
        lines.push(`    ${safeTeamId} --> ${safeFeatureId}`);
      }
    }

    return {
      name: 'Team Feature Ownership',
      type: 'flowchart',
      content: lines.join('\n'),
      description: 'Which team owns which features',
    };
  }

  /**
   * Generate index file for all diagrams
   *
   * FIX (v1.0.48): Use explicit filename from diagram when available to ensure
   * links match actual saved files. Previously derived filename from display name
   * causing 404s (e.g., "Team Organization" → "team-organization.md" but file was "team-org-chart.md")
   */
  private generateIndex(diagrams: MermaidDiagram[]): string {
    const lines = [
      '# Diagrams',
      '',
      `*Auto-generated for ${this.options.projectName}*`,
      '',
      '## Available Diagrams',
      '',
      '| Diagram | Type | Description |',
      '|---------|------|-------------|',
    ];

    for (const diagram of diagrams) {
      // Use explicit filename if set, otherwise derive from name (backward compatible)
      const filename = diagram.filename || (diagram.name.toLowerCase().replace(/\s+/g, '-') + '.md');
      lines.push(`| [${diagram.name}](./${filename}) | ${diagram.type} | ${diagram.description} |`);
    }

    lines.push('');
    lines.push('## Viewing Diagrams');
    lines.push('');
    lines.push('These diagrams use [Mermaid](https://mermaid.js.org/) syntax and can be viewed:');
    lines.push('');
    lines.push('1. **GitHub/GitLab**: Rendered automatically in markdown files');
    lines.push('2. **VS Code**: Install "Mermaid Preview" extension');
    lines.push('3. **Docusaurus**: Built-in mermaid support');
    lines.push('4. **Online**: Copy to [mermaid.live](https://mermaid.live)');

    return lines.join('\n');
  }

  /**
   * Wrap diagram in markdown document
   */
  private wrapDiagram(diagram: MermaidDiagram): string {
    return [
      `# ${diagram.name}`,
      '',
      `*${diagram.description}*`,
      '',
      '```mermaid',
      diagram.content,
      '```',
      '',
    ].join('\n');
  }

  /**
   * Sanitize ID for Mermaid (remove special characters)
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + '...';
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'active': return '🔵';
      case 'archived': return '📦';
      default: return '⬜';
    }
  }

  /**
   * Get event icon
   */
  private getEventIcon(type: string): string {
    switch (type) {
      case 'feature_started': return '🚀';
      case 'feature_completed': return '✅';
      case 'release': return '📦';
      case 'milestone': return '🎯';
      case 'incident': return '⚠️';
      default: return '📌';
    }
  }
}

/**
 * Standalone function for quick diagram generation
 */
export async function generateMermaidDiagrams(
  options: MermaidGeneratorOptions
): Promise<MermaidGenerationResult> {
  const generator = new MermaidGenerator(options);
  return generator.generate();
}
