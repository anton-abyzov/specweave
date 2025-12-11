/**
 * History Analyzer
 *
 * Analyzes project history from multiple sources:
 * - Git commit history
 * - Increment metadata (completed, abandoned, archived)
 * - Feature creation/completion dates
 * - Release tags
 *
 * Produces a comprehensive timeline of project evolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import type { SpecsCatalog, EnhancedFeatureSpec } from './spec-loader.js';

export interface TimelineEvent {
  date: string;                    // ISO date string
  type: EventType;
  title: string;
  description: string;
  relatedEntities: string[];       // FS-XXX, US-XXX, increment IDs, etc.
  metadata?: Record<string, any>;
}

export type EventType =
  | 'feature_started'
  | 'feature_completed'
  | 'increment_started'
  | 'increment_completed'
  | 'increment_abandoned'
  | 'release'
  | 'milestone'
  | 'team_change'
  | 'config_change'
  | 'incident';

export interface ProjectTimeline {
  projectName: string;
  startDate: string;
  currentVersion: string;
  events: TimelineEvent[];
  milestones: Milestone[];
  releases: Release[];
}

export interface Milestone {
  name: string;
  date: string;
  description: string;
  features: string[];
}

export interface Release {
  version: string;
  date: string;
  changelog: string[];
  commits: number;
}

export interface HistoryAnalyzerOptions {
  projectPath: string;
  logger?: Logger;
}

/**
 * Analyzes project history to build a timeline
 */
export class HistoryAnalyzer {
  private projectPath: string;
  private logger: Logger;

  constructor(options: HistoryAnalyzerOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Analyze all history sources and build timeline
   */
  async analyze(specsCatalog: SpecsCatalog): Promise<ProjectTimeline> {
    const events: TimelineEvent[] = [];

    // 1. Analyze increment history
    const incrementEvents = await this.analyzeIncrements();
    events.push(...incrementEvents);

    // 2. Analyze feature history from specs
    const featureEvents = this.analyzeFeatureHistory(specsCatalog);
    events.push(...featureEvents);

    // 3. Analyze git releases/tags
    const releases = this.analyzeGitReleases();
    for (const release of releases) {
      events.push({
        date: release.date,
        type: 'release',
        title: `Release ${release.version}`,
        description: release.changelog.slice(0, 3).join('; '),
        relatedEntities: [release.version],
        metadata: { commits: release.commits },
      });
    }

    // 4. Analyze config changes
    const configEvents = await this.analyzeConfigHistory();
    events.push(...configEvents);

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Derive milestones
    const milestones = this.deriveMilestones(events, specsCatalog);

    return {
      projectName: this.getProjectName(),
      startDate: this.getProjectStartDate(events),
      currentVersion: this.getCurrentVersion(),
      events,
      milestones,
      releases,
    };
  }

  /**
   * Analyze all increment folders for history
   */
  private async analyzeIncrements(): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    const incrementsPath = path.join(this.projectPath, '.specweave/increments');

    if (!fs.existsSync(incrementsPath)) {
      return events;
    }

    // Check all subdirectories
    const subdirs = ['', '_archive', '_paused', '_abandoned'];

    for (const subdir of subdirs) {
      const checkPath = subdir ? path.join(incrementsPath, subdir) : incrementsPath;
      if (!fs.existsSync(checkPath)) continue;

      const entries = fs.readdirSync(checkPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_')) continue;

        const metadataPath = path.join(checkPath, entry.name, 'metadata.json');
        if (!fs.existsSync(metadataPath)) continue;

        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

          // Increment started event
          if (metadata.createdAt) {
            events.push({
              date: metadata.createdAt,
              type: 'increment_started',
              title: `Started: ${entry.name}`,
              description: metadata.title || entry.name,
              relatedEntities: [entry.name, metadata.feature_id].filter(Boolean),
              metadata: { status: metadata.status },
            });
          }

          // Increment completed event
          if (metadata.status === 'completed' && metadata.completedAt) {
            events.push({
              date: metadata.completedAt,
              type: 'increment_completed',
              title: `Completed: ${entry.name}`,
              description: metadata.title || entry.name,
              relatedEntities: [entry.name, metadata.feature_id].filter(Boolean),
            });
          }

          // Increment abandoned event
          if (metadata.status === 'abandoned' && metadata.abandonedAt) {
            events.push({
              date: metadata.abandonedAt,
              type: 'increment_abandoned',
              title: `Abandoned: ${entry.name}`,
              description: metadata.abandonReason || 'No reason provided',
              relatedEntities: [entry.name],
            });
          }
        } catch (err: any) {
          this.logger.debug(`Failed to parse metadata for ${entry.name}: ${err.message}`);
        }
      }
    }

    return events;
  }

  /**
   * Analyze feature history from specs catalog
   */
  private analyzeFeatureHistory(catalog: SpecsCatalog): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const feature of catalog.features) {
      // Feature created
      if (feature.createdAt) {
        events.push({
          date: feature.createdAt,
          type: 'feature_started',
          title: `Feature: ${feature.featureName}`,
          description: `${feature.featureId} created with ${feature.userStories.length} user stories`,
          relatedEntities: [feature.featureId, ...feature.userStories.map(us => us.id)],
        });
      }

      // Feature completed
      if (feature.status === 'completed' && feature.completedAt) {
        events.push({
          date: feature.completedAt,
          type: 'feature_completed',
          title: `Completed: ${feature.featureName}`,
          description: `${feature.featureId} - all ${feature.totalACs} acceptance criteria met`,
          relatedEntities: [feature.featureId],
        });
      }
    }

    return events;
  }

  /**
   * Analyze git tags for releases
   */
  private analyzeGitReleases(): Release[] {
    const releases: Release[] = [];

    try {
      // Get all tags with dates
      const tagOutput = execSync(
        'git tag -l --format="%(refname:short)|%(creatordate:iso8601)"',
        { cwd: this.projectPath, encoding: 'utf-8' }
      );

      const tags = tagOutput.trim().split('\n').filter(Boolean);

      for (const tagLine of tags) {
        const [version, date] = tagLine.split('|');
        if (!version || !date) continue;

        // Get changelog for this tag
        let changelog: string[] = [];
        let commits = 0;

        try {
          // Try to get commits since previous tag
          const prevTag = execSync(
            `git describe --tags --abbrev=0 ${version}^ 2>/dev/null || echo ""`,
            { cwd: this.projectPath, encoding: 'utf-8' }
          ).trim();

          const range = prevTag ? `${prevTag}..${version}` : version;
          const logOutput = execSync(
            `git log ${range} --oneline 2>/dev/null || echo ""`,
            { cwd: this.projectPath, encoding: 'utf-8' }
          );

          const commitLines = logOutput.trim().split('\n').filter(Boolean);
          commits = commitLines.length;
          changelog = commitLines.slice(0, 10).map(line => {
            const [, ...rest] = line.split(' ');
            return rest.join(' ');
          });
        } catch { /* ignore */ }

        releases.push({
          version,
          date: date.substring(0, 10), // Just date part
          changelog,
          commits,
        });
      }
    } catch (err: any) {
      this.logger.debug(`Failed to analyze git releases: ${err.message}`);
    }

    return releases.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Analyze config.json changes from git history
   */
  private async analyzeConfigHistory(): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    try {
      const logOutput = execSync(
        'git log --follow --format="%H|%ci|%s" -p .specweave/config.json 2>/dev/null | head -500',
        { cwd: this.projectPath, encoding: 'utf-8' }
      );

      // Parse commit info from log
      const commitPattern = /^([a-f0-9]+)\|([^|]+)\|(.+)$/gm;
      let match;

      while ((match = commitPattern.exec(logOutput)) !== null) {
        const [, hash, date, message] = match;

        // Check if it's a significant config change
        if (message.includes('config') ||
            message.includes('project') ||
            message.includes('sync') ||
            message.includes('multi')) {
          events.push({
            date: date.substring(0, 10),
            type: 'config_change',
            title: 'Configuration updated',
            description: message,
            relatedEntities: [hash.substring(0, 7)],
          });
        }
      }
    } catch { /* ignore */ }

    return events;
  }

  /**
   * Derive milestones from events
   */
  private deriveMilestones(
    events: TimelineEvent[],
    catalog: SpecsCatalog
  ): Milestone[] {
    const milestones: Milestone[] = [];

    // Major milestones: every 10 features completed
    const completedFeatures = catalog.features.filter(f => f.status === 'completed');
    const sortedCompleted = completedFeatures.sort((a, b) =>
      (a.completedAt || '').localeCompare(b.completedAt || '')
    );

    let milestone = 10;
    for (let i = 0; i < sortedCompleted.length; i++) {
      if ((i + 1) % 10 === 0) {
        const feature = sortedCompleted[i];
        milestones.push({
          name: `${milestone} Features Completed`,
          date: feature.completedAt || feature.createdAt,
          description: `Milestone: ${milestone} features delivered`,
          features: sortedCompleted.slice(i - 9, i + 1).map(f => f.featureId),
        });
        milestone += 10;
      }
    }

    // Version milestones
    const releases = events.filter(e => e.type === 'release');
    for (const release of releases) {
      if (release.title.includes('1.0') ||
          release.title.includes('2.0') ||
          release.title.match(/v?\d+\.0\.0/)) {
        milestones.push({
          name: release.title,
          date: release.date,
          description: 'Major version release',
          features: [],
        });
      }
    }

    return milestones.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get project name from config
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

  /**
   * Get project start date from earliest event
   */
  private getProjectStartDate(events: TimelineEvent[]): string {
    if (events.length === 0) {
      // Try git first commit
      try {
        const output = execSync(
          'git log --reverse --format="%ci" | head -1',
          { cwd: this.projectPath, encoding: 'utf-8' }
        );
        return output.trim().substring(0, 10);
      } catch { /* ignore */ }
      return new Date().toISOString().substring(0, 10);
    }
    return events[0].date.substring(0, 10);
  }

  /**
   * Get current version from package.json or git tag
   */
  private getCurrentVersion(): string {
    // Try package.json
    const packagePath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        if (pkg.version) return pkg.version;
      } catch { /* ignore */ }
    }

    // Try latest git tag
    try {
      const tag = execSync('git describe --tags --abbrev=0 2>/dev/null', {
        cwd: this.projectPath,
        encoding: 'utf-8',
      }).trim();
      return tag;
    } catch { /* ignore */ }

    return 'unknown';
  }
}
