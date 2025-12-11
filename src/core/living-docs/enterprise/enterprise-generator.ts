/**
 * Enterprise Knowledge Base Generator
 *
 * Main orchestrator that generates comprehensive enterprise documentation:
 * - Company history and timeline
 * - Feature catalog with ownership
 * - Team directory with expertise
 * - Cross-references and relationships
 * - Mermaid diagrams for visualization
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { EnhancedSpecLoader, SpecsCatalog, EnhancedFeatureSpec } from './spec-loader.js';
import { HistoryAnalyzer, ProjectTimeline } from './history-analyzer.js';
import { RelationshipMapper, RelationshipMap } from './relationship-mapper.js';
import type { RepoAnalysis, LLMProvider, ProgressCallback, EnhancedTeam } from '../intelligent-analyzer/types.js';
import type { OrganizationSynthesisResult } from '../intelligent-analyzer/organization-synthesizer.js';

export interface EnterpriseGeneratorOptions {
  projectPath: string;
  projectName?: string;
  logger?: Logger;
  llmProvider?: LLMProvider;
  repoAnalyses?: Map<string, RepoAnalysis>;
  orgResult?: OrganizationSynthesisResult;
  teams?: Array<{ name: string; repos: string[]; members?: string[] }>;
}

export interface EnterpriseGenerationResult {
  filesCreated: string[];
  savedFiles: string[];  // Alias for backwards compatibility
  metrics: EnterpriseMetrics;
}

export interface EnterpriseMetrics {
  totalFeatures: number;
  activeFeatures: number;
  completedFeatures: number;
  totalUserStories: number;
  totalTeams: number;
  totalModules: number;
  overallCompletion: number;
  timelineEvents: number;
  relationships: number;
}

/**
 * Enterprise documentation generator
 */
export class EnterpriseGenerator {
  private projectPath: string;
  private logger: Logger;
  private llmProvider?: LLMProvider;
  private repoAnalyses?: Map<string, RepoAnalysis>;
  private orgResult?: OrganizationSynthesisResult;
  private enterprisePath: string;

  constructor(options: EnterpriseGeneratorOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.llmProvider = options.llmProvider;
    this.repoAnalyses = options.repoAnalyses;
    this.orgResult = options.orgResult;
    this.enterprisePath = path.join(this.projectPath, '.specweave/docs/internal/enterprise');
  }

  /**
   * Generate all enterprise documentation
   */
  async generate(
    onProgress?: ProgressCallback
  ): Promise<EnterpriseGenerationResult> {
    const progress = onProgress ?? (() => {});
    const filesCreated: string[] = [];

    this.logger.info('ENTERPRISE KNOWLEDGE BASE GENERATION');
    this.logger.info('═══════════════════════════════════════════════════════════');

    // Ensure enterprise directory exists
    fs.mkdirSync(this.enterprisePath, { recursive: true });

    // Phase 1: Load all specs
    progress('enterprise', 0, 100, 'Loading specifications');
    this.logger.info('');
    this.logger.info('📚 Loading all specifications...');

    const specLoader = new EnhancedSpecLoader({
      projectPath: this.projectPath,
      logger: this.logger,
      includeArchived: true,
    });
    const specsCatalog = await specLoader.loadAllSpecs();
    this.logger.info(`   Loaded ${specsCatalog.totalFeatures} features, ${specsCatalog.totalUserStories} user stories`);

    // Phase 2: Analyze history
    progress('enterprise', 20, 100, 'Analyzing project history');
    this.logger.info('');
    this.logger.info('📅 Analyzing project history...');

    const historyAnalyzer = new HistoryAnalyzer({
      projectPath: this.projectPath,
      logger: this.logger,
    });
    const timeline = await historyAnalyzer.analyze(specsCatalog);
    this.logger.info(`   Found ${timeline.events.length} timeline events`);

    // Phase 3: Map relationships
    progress('enterprise', 40, 100, 'Mapping relationships');
    this.logger.info('');
    this.logger.info('🔗 Mapping relationships...');

    const relationshipMapper = new RelationshipMapper({
      projectPath: this.projectPath,
      logger: this.logger,
      repoAnalyses: this.repoAnalyses,
    });
    const relationships = await relationshipMapper.map(specsCatalog, this.orgResult);
    this.logger.info(`   Mapped ${relationships.totalRelationships} relationships`);

    // Phase 4: Generate documentation files
    progress('enterprise', 60, 100, 'Generating documentation');
    this.logger.info('');
    this.logger.info('📝 Generating enterprise documentation...');

    // Generate COMPANY-HISTORY.md
    const historyFile = await this.generateHistory(timeline, specsCatalog);
    filesCreated.push(historyFile);
    this.logger.info('   ✓ COMPANY-HISTORY.md');

    // Generate FEATURE-CATALOG.md
    const catalogFile = await this.generateFeatureCatalog(specsCatalog, relationships);
    filesCreated.push(catalogFile);
    this.logger.info('   ✓ FEATURE-CATALOG.md');

    // Generate TEAM-DIRECTORY.md
    const teamFile = await this.generateTeamDirectory(specsCatalog, relationships);
    filesCreated.push(teamFile);
    this.logger.info('   ✓ TEAM-DIRECTORY.md');

    // Generate ARCHITECTURE-MAP.md with Mermaid
    const archFile = await this.generateArchitectureMap(specsCatalog, relationships);
    filesCreated.push(archFile);
    this.logger.info('   ✓ ARCHITECTURE-MAP.md');

    // Generate relationships folder
    progress('enterprise', 80, 100, 'Generating relationship docs');
    this.logger.info('');
    this.logger.info('🔗 Generating relationship documentation...');

    const relFiles = await this.generateRelationshipDocs(relationships, specsCatalog);
    filesCreated.push(...relFiles);
    this.logger.info(`   ✓ ${relFiles.length} relationship files`);

    progress('enterprise', 100, 100, 'Complete');

    const metrics: EnterpriseMetrics = {
      totalFeatures: specsCatalog.totalFeatures,
      activeFeatures: specsCatalog.activeFeatures,
      completedFeatures: specsCatalog.completedFeatures,
      totalUserStories: specsCatalog.totalUserStories,
      totalTeams: this.orgResult?.enhancedTeams.length ?? 0,
      totalModules: this.repoAnalyses?.size ?? 0,
      overallCompletion: specsCatalog.overallCompletion,
      timelineEvents: timeline.events.length,
      relationships: relationships.totalRelationships,
    };

    this.logger.info('');
    this.logger.info('═══════════════════════════════════════════════════════════');
    this.logger.info(`✅ Enterprise documentation complete: ${filesCreated.length} files`);

    return { filesCreated, savedFiles: filesCreated, metrics };
  }

  /**
   * Generate COMPANY-HISTORY.md with timeline
   */
  private async generateHistory(
    timeline: ProjectTimeline,
    catalog: SpecsCatalog
  ): Promise<string> {
    const lines: string[] = [
      '# Project History & Timeline',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Project: ${timeline.projectName}*`,
      '',
      '## Overview',
      '',
      `- **Started**: ${timeline.startDate}`,
      `- **Current Version**: ${timeline.currentVersion}`,
      `- **Total Features**: ${catalog.totalFeatures}`,
      `- **Completion Rate**: ${catalog.overallCompletion}%`,
      '',
      '## Timeline',
      '',
      '```mermaid',
      'timeline',
      `    title ${timeline.projectName} Evolution`,
    ];

    // Group events by month
    const eventsByMonth = new Map<string, typeof timeline.events>();
    for (const event of timeline.events.slice(-50)) { // Last 50 events
      const month = event.date.substring(0, 7); // YYYY-MM
      if (!eventsByMonth.has(month)) {
        eventsByMonth.set(month, []);
      }
      eventsByMonth.get(month)!.push(event);
    }

    for (const [month, events] of eventsByMonth) {
      const [year, monthNum] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' });
      lines.push(`    section ${monthName} ${year}`);
      for (const event of events.slice(0, 3)) { // Max 3 per month
        const escapedTitle = event.title.replace(/:/g, ' ').substring(0, 40);
        lines.push(`        ${escapedTitle}`);
      }
    }

    lines.push('```', '');

    // Detailed event list
    lines.push('## Detailed Events', '');
    lines.push('| Date | Type | Event | Related |');
    lines.push('|------|------|-------|---------|');

    for (const event of timeline.events.slice(-100)) { // Last 100
      const typeEmoji = this.getEventEmoji(event.type);
      const related = event.relatedEntities.slice(0, 2).join(', ');
      lines.push(`| ${event.date} | ${typeEmoji} ${event.type} | ${event.title} | ${related} |`);
    }

    lines.push('', '---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.enterprisePath, 'COMPANY-HISTORY.md');
    fs.writeFileSync(filePath, lines.join('\n'));
    return filePath;
  }

  /**
   * Generate FEATURE-CATALOG.md
   */
  private async generateFeatureCatalog(
    catalog: SpecsCatalog,
    relationships: RelationshipMap
  ): Promise<string> {
    const lines: string[] = [
      '# Feature Catalog',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Total: ${catalog.totalFeatures} features*`,
      '',
      '## Summary',
      '',
      '| Status | Count | Completion |',
      '|--------|-------|------------|',
      `| 🟢 Active | ${catalog.activeFeatures} | - |`,
      `| ✅ Completed | ${catalog.completedFeatures} | 100% |`,
      `| 📦 Archived | ${catalog.archivedFeatures} | - |`,
      '',
      `**Overall Completion**: ${catalog.overallCompletion}% (${catalog.completedACs}/${catalog.totalACs} ACs)`,
      '',
      '## Feature Status Diagram',
      '',
      '```mermaid',
      'pie showData',
      '    title Feature Status Distribution',
      `    "Active" : ${catalog.activeFeatures}`,
      `    "Completed" : ${catalog.completedFeatures}`,
      `    "Archived" : ${catalog.archivedFeatures}`,
      '```',
      '',
    ];

    // Features by project
    if (catalog.byProject.size > 1) {
      lines.push('## By Project', '');
      for (const [project, features] of catalog.byProject) {
        lines.push(`### ${project}`, '');
        lines.push('| Feature | Status | User Stories | Completion | Owner |');
        lines.push('|---------|--------|--------------|------------|-------|');
        for (const f of features.slice(0, 20)) {
          const owner = relationships.featureToTeam.get(f.featureId) || '-';
          const status = this.getStatusEmoji(f.status);
          lines.push(`| [${f.featureId}](#${f.featureId.toLowerCase()}) | ${status} | ${f.userStories.length} | ${f.completionPercentage}% | ${owner} |`);
        }
        if (features.length > 20) {
          lines.push(`| ... | | | | *${features.length - 20} more* |`);
        }
        lines.push('');
      }
    }

    // All features detail
    lines.push('## Feature Details', '');

    for (const feature of catalog.features.slice(0, 50)) { // Limit for file size
      lines.push(`### ${feature.featureId}: ${feature.featureName}`, '');
      lines.push(`**Status**: ${this.getStatusEmoji(feature.status)} ${feature.status}`);
      lines.push(`**Completion**: ${feature.completionPercentage}%`);

      if (feature.project) {
        lines.push(`**Project**: ${feature.project}`);
      }

      if (feature.relatedIncrements.length > 0) {
        lines.push(`**Related Increments**: ${feature.relatedIncrements.slice(0, 5).join(', ')}`);
      }

      lines.push('', '**User Stories**:', '');
      for (const us of feature.userStories.slice(0, 10)) {
        const usStatus = this.getStatusEmoji(us.status);
        const acComplete = us.acceptanceCriteria.filter(ac => ac.completed).length;
        lines.push(`- ${usStatus} **${us.id}**: ${us.title} (${acComplete}/${us.acceptanceCriteria.length} ACs)`);
      }
      if (feature.userStories.length > 10) {
        lines.push(`- *... ${feature.userStories.length - 10} more user stories*`);
      }

      lines.push('');
    }

    if (catalog.features.length > 50) {
      lines.push(`*Showing 50 of ${catalog.features.length} features. See individual project folders for complete list.*`);
    }

    lines.push('', '---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.enterprisePath, 'FEATURE-CATALOG.md');
    fs.writeFileSync(filePath, lines.join('\n'));
    return filePath;
  }

  /**
   * Generate TEAM-DIRECTORY.md
   */
  private async generateTeamDirectory(
    catalog: SpecsCatalog,
    relationships: RelationshipMap
  ): Promise<string> {
    const teams = this.orgResult?.enhancedTeams ?? [];

    const lines: string[] = [
      '# Team Directory',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Total: ${teams.length} teams*`,
      '',
      '## Organization Chart',
      '',
      '```mermaid',
      'graph TD',
    ];

    // Build org chart
    if (teams.length > 0) {
      lines.push('    org[Organization]');
      for (const team of teams) {
        const teamId = team.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        lines.push(`    org --> ${teamId}["${team.name}"]`);
      }
    } else {
      lines.push('    org[No teams detected]');
    }

    lines.push('```', '');

    // Team summary table
    lines.push('## Teams Overview', '');
    lines.push('| Team | Modules | Features | Tech Stack |');
    lines.push('|------|---------|----------|------------|');

    for (const team of teams) {
      const moduleCount = team.repos.length;
      const featureCount = relationships.teamToFeatures.get(team.name)?.length ?? 0;
      const techStack = team.techStack.slice(0, 3).join(', ');
      lines.push(`| [${team.name}](#${team.name.toLowerCase().replace(/\s+/g, '-')}) | ${moduleCount} | ${featureCount} | ${techStack} |`);
    }

    lines.push('');

    // Team details
    lines.push('## Team Details', '');

    for (const team of teams) {
      lines.push(`### ${team.name}`, '');
      lines.push(team.description, '');

      if (team.responsibilities.length > 0) {
        lines.push('**Responsibilities**:', '');
        for (const r of team.responsibilities) {
          lines.push(`- ${r}`);
        }
        lines.push('');
      }

      if (team.domainExpertise.length > 0) {
        lines.push('**Domain Expertise**:', '');
        for (const e of team.domainExpertise) {
          lines.push(`- ${e}`);
        }
        lines.push('');
      }

      if (team.techStack.length > 0) {
        lines.push(`**Tech Stack**: ${team.techStack.join(', ')}`, '');
      }

      if (team.repos.length > 0) {
        lines.push('**Owned Modules**:', '');
        for (const repo of team.repos) {
          lines.push(`- [${repo}](../modules/${repo}.md)`);
        }
        lines.push('');
      }

      const features = relationships.teamToFeatures.get(team.name) ?? [];
      if (features.length > 0) {
        lines.push('**Owned Features**:', '');
        for (const f of features.slice(0, 10)) {
          lines.push(`- ${f}`);
        }
        if (features.length > 10) {
          lines.push(`- *... ${features.length - 10} more*`);
        }
        lines.push('');
      }

      if (team.externalUrl) {
        lines.push(`**External Link**: [View in ${team.externalProvider}](${team.externalUrl})`, '');
      }

      lines.push('---', '');
    }

    lines.push(`*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.enterprisePath, 'TEAM-DIRECTORY.md');
    fs.writeFileSync(filePath, lines.join('\n'));
    return filePath;
  }

  /**
   * Generate ARCHITECTURE-MAP.md with C4 diagrams
   */
  private async generateArchitectureMap(
    catalog: SpecsCatalog,
    relationships: RelationshipMap
  ): Promise<string> {
    const lines: string[] = [
      '# Architecture Map',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## System Context',
      '',
      '```mermaid',
      'C4Context',
      '    title System Context Diagram',
      '',
    ];

    // Add main system
    const projectName = this.getProjectName();
    lines.push(`    System(main, "${projectName}", "Main application")`);

    // Add external systems from external refs
    const externalSystems = new Set<string>();
    for (const feature of catalog.features) {
      for (const ref of feature.externalRefs) {
        externalSystems.add(ref.provider);
      }
    }

    for (const ext of externalSystems) {
      const label = ext === 'github' ? 'GitHub' : ext === 'jira' ? 'JIRA' : 'Azure DevOps';
      lines.push(`    System_Ext(${ext}, "${label}", "External tracking")`);
    }

    // Add relationships
    for (const ext of externalSystems) {
      lines.push(`    Rel(main, ${ext}, "Syncs with")`);
    }

    lines.push('```', '');

    // Module dependency diagram
    lines.push('## Module Dependencies', '');
    lines.push('```mermaid', 'graph LR');

    if (this.repoAnalyses && this.repoAnalyses.size > 0) {
      const modules = Array.from(this.repoAnalyses.keys()).slice(0, 20);
      for (const mod of modules) {
        const deps = relationships.moduleDependencies.get(mod) ?? [];
        if (deps.length > 0) {
          for (const dep of deps.slice(0, 5)) {
            if (modules.includes(dep)) {
              lines.push(`    ${mod.replace(/[^a-zA-Z0-9]/g, '_')} --> ${dep.replace(/[^a-zA-Z0-9]/g, '_')}`);
            }
          }
        }
      }
    } else {
      lines.push('    no_modules[No modules analyzed]');
    }

    lines.push('```', '');

    // Feature hierarchy
    lines.push('## Feature Hierarchy', '');
    lines.push('```mermaid', 'graph TD');

    const activeFeatures = catalog.byStatus.get('active') ?? [];
    for (const feature of activeFeatures.slice(0, 15)) {
      const fId = feature.featureId.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`    ${fId}["${feature.featureId}<br/>${feature.completionPercentage}%"]`);

      for (const us of feature.userStories.slice(0, 3)) {
        const usId = us.id.replace(/[^a-zA-Z0-9]/g, '_');
        const acComplete = us.acceptanceCriteria.filter(ac => ac.completed).length;
        const acTotal = us.acceptanceCriteria.length;
        lines.push(`    ${fId} --> ${usId}["${us.id}<br/>${acComplete}/${acTotal}"]`);
      }
      if (feature.userStories.length > 3) {
        lines.push(`    ${fId} --> ${fId}_more["...${feature.userStories.length - 3} more"]`);
      }
    }

    lines.push('```', '');

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.enterprisePath, 'ARCHITECTURE-MAP.md');
    fs.writeFileSync(filePath, lines.join('\n'));
    return filePath;
  }

  /**
   * Generate relationship documentation files
   */
  private async generateRelationshipDocs(
    relationships: RelationshipMap,
    catalog: SpecsCatalog
  ): Promise<string[]> {
    const filesCreated: string[] = [];
    const relPath = path.join(this.projectPath, '.specweave/docs/internal/relationships');
    fs.mkdirSync(relPath, { recursive: true });

    // FEATURE-TO-CODE.md
    const ftcLines: string[] = [
      '# Feature to Code Mapping',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## Mappings',
      '',
      '| Feature | Files | Coverage |',
      '|---------|-------|----------|',
    ];

    for (const [featureId, files] of relationships.featureToCode) {
      const coverage = files.length > 0 ? '✅' : '❌';
      ftcLines.push(`| ${featureId} | ${files.length} | ${coverage} |`);
    }

    const ftcPath = path.join(relPath, 'FEATURE-TO-CODE.md');
    fs.writeFileSync(ftcPath, ftcLines.join('\n'));
    filesCreated.push(ftcPath);

    // TEAM-TO-FEATURES.md
    const ttfLines: string[] = [
      '# Team to Features Mapping',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
    ];

    for (const [team, features] of relationships.teamToFeatures) {
      ttfLines.push(`## ${team}`, '');
      for (const f of features) {
        ttfLines.push(`- ${f}`);
      }
      ttfLines.push('');
    }

    const ttfPath = path.join(relPath, 'TEAM-TO-FEATURES.md');
    fs.writeFileSync(ttfPath, ttfLines.join('\n'));
    filesCreated.push(ttfPath);

    // MODULE-DEPENDENCIES.md
    const mdLines: string[] = [
      '# Module Dependencies',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## Dependency Matrix',
      '',
    ];

    for (const [mod, deps] of relationships.moduleDependencies) {
      if (deps.length > 0) {
        mdLines.push(`### ${mod}`, '');
        mdLines.push('**Depends on**:', '');
        for (const dep of deps) {
          mdLines.push(`- ${dep}`);
        }
        mdLines.push('');
      }
    }

    const mdPath = path.join(relPath, 'MODULE-DEPENDENCIES.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'));
    filesCreated.push(mdPath);

    // EXTERNAL-REFS.md
    const erLines: string[] = [
      '# External References',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## GitHub Issues',
      '',
      '| Feature | Issue | Status |',
      '|---------|-------|--------|',
    ];

    for (const feature of catalog.features) {
      for (const ref of feature.externalRefs) {
        if (ref.provider === 'github') {
          erLines.push(`| ${feature.featureId} | #${ref.id} | ${ref.status || '-'} |`);
        }
      }
    }

    erLines.push('', '## JIRA Issues', '', '| Feature | Key | Status |', '|---------|-----|--------|');

    for (const feature of catalog.features) {
      for (const ref of feature.externalRefs) {
        if (ref.provider === 'jira') {
          erLines.push(`| ${feature.featureId} | ${ref.id} | ${ref.status || '-'} |`);
        }
      }
    }

    erLines.push('', '## Azure DevOps', '', '| Feature | Work Item | Status |', '|---------|-----------|--------|');

    for (const feature of catalog.features) {
      for (const ref of feature.externalRefs) {
        if (ref.provider === 'ado') {
          erLines.push(`| ${feature.featureId} | ${ref.id} | ${ref.status || '-'} |`);
        }
      }
    }

    const erPath = path.join(relPath, 'EXTERNAL-REFS.md');
    fs.writeFileSync(erPath, erLines.join('\n'));
    filesCreated.push(erPath);

    return filesCreated;
  }

  /**
   * Get project name from config or folder
   */
  private getProjectName(): string {
    const configPath = path.join(this.projectPath, '.specweave/config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.project?.name || config.name || path.basename(this.projectPath);
      } catch { /* ignore */ }
    }
    return path.basename(this.projectPath);
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'active': return '🟢';
      case 'completed': return '✅';
      case 'archived': return '📦';
      case 'in_progress': return '🔄';
      case 'draft': return '📝';
      case 'ready': return '🎯';
      default: return '⚪';
    }
  }

  private getEventEmoji(type: string): string {
    switch (type) {
      case 'feature_started': return '🚀';
      case 'feature_completed': return '✅';
      case 'release': return '📦';
      case 'team_change': return '👥';
      case 'incident': return '🚨';
      case 'increment_started': return '📋';
      case 'increment_completed': return '🎉';
      default: return '📌';
    }
  }
}
