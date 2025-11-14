/**
 * SpecWeave Spec Distributor
 *
 * Distributes increment specs into hierarchical living docs structure:
 * - Epic (SPEC-###.md) - High-level summary
 * - User Stories (us-###.md) - Detailed requirements
 * - Tasks (tasks.md) - Implementation details (already exists)
 *
 * @author SpecWeave Team
 * @version 2.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import {
  DistributionResult,
  DistributionConfig,
  ParsedIncrementSpec,
  ClassifiedContent,
  EpicFile,
  UserStoryFile,
  UserStorySummary,
  UserStory,
  TaskReference,
  ImplementationHistoryEntry,
  EpicThemeFile,
  FeatureFile,
  FeatureMapping,
  ProjectContext,
  EpicMapping,
} from './types.js';
import { HierarchyMapper } from './hierarchy-mapper.js';
import { detectPrimaryGitHubRemote, GitRemote } from '../../utils/git-detector.js';

/**
 * SpecDistributor - Distributes increment specs into hierarchical living docs
 */
export class SpecDistributor {
  private config: DistributionConfig;
  private projectRoot: string;
  private hierarchyMapper: HierarchyMapper;
  private githubRemote: GitRemote | null = null;

  constructor(projectRoot: string, config?: Partial<DistributionConfig>) {
    this.projectRoot = projectRoot;

    // Detect project ID from config or use default
    const projectId = config?.specsDir?.includes('/specs/')
      ? config.specsDir.split('/specs/')[1]?.split('/')[0] || 'default'
      : 'default';

    this.config = {
      specsDir: path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', projectId),
      userStoriesSubdir: 'user-stories',
      epicFilePattern: 'SPEC-{id}-{name}.md',
      userStoryFilePattern: 'us-{id}-{name}.md',
      generateFrontmatter: true,
      generateCrossLinks: true,
      preserveOriginal: true,
      overwriteExisting: false,
      createBackups: true,
      ...config,
    };
    // Initialize HierarchyMapper
    this.hierarchyMapper = new HierarchyMapper(projectRoot);
  }

  /**
   * Distribute increment spec into universal hierarchy (epic + feature + user stories)
   */
  async distribute(incrementId: string): Promise<DistributionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Detect GitHub remote for generating GitHub URLs (if not already detected)
      if (!this.githubRemote) {
        this.githubRemote = await detectPrimaryGitHubRemote(this.projectRoot);
      }

      // Step 1: Parse increment spec (with epic and project detection)
      const parsed = await this.parseIncrementSpec(incrementId);

      // Step 2: Detect epic mapping (OPTIONAL - from frontmatter)
      const epicMapping = await this.hierarchyMapper.detectEpicMapping(incrementId);
      if (epicMapping) {
        console.log(`   🎯 Mapped to epic ${epicMapping.epicId} (confidence: ${epicMapping.confidence}%)`);
      }

      // Step 3: Detect feature mapping (REQUIRED)
      console.log(`   🔍 Detecting feature folder for ${incrementId}...`);
      const featureMapping = await this.hierarchyMapper.detectFeatureMapping(incrementId);
      console.log(`   📁 Mapped to feature ${featureMapping.featureId} (confidence: ${featureMapping.confidence}%, method: ${featureMapping.detectionMethod})`);
      console.log(`   📦 Projects: ${featureMapping.projects.join(', ')}`);

      // Step 4: Classify content by project (NEW)
      const storiesByProject = await this.classifyContentByProject(parsed, featureMapping);
      console.log(`   📊 Classified ${parsed.userStories.length} user stories across ${storiesByProject.size} project(s)`);

      // Step 5: Generate epic file (OPTIONAL)
      const epicFile = epicMapping ? await this.generateEpicFile(parsed, epicMapping, featureMapping) : null;

      // Step 6: Generate feature file (REQUIRED)
      const featureFile = await this.generateFeatureFile(parsed, featureMapping, storiesByProject);

      // Step 7: Generate project context files (REQUIRED)
      const projectContextFiles = await this.generateProjectContextFiles(featureMapping, parsed);

      // Step 8: Generate user story files by project (REQUIRED)
      const userStoryFilesByProject = await this.generateUserStoryFilesByProject(
        storiesByProject,
        featureMapping,
        incrementId
      );

      // Step 9: Write epic file (if exists)
      const epicPath = epicFile && epicMapping ? await this.writeEpicFile(epicFile, epicMapping) : null;

      // Step 10: Write feature file
      const featurePath = await this.writeFeatureFile(featureFile, featureMapping);

      // Step 11: Write project context files
      const contextPaths = await this.writeProjectContextFiles(projectContextFiles, featureMapping);

      // Step 12: Write user story files by project
      const storyPathsByProject = await this.writeUserStoryFilesByProject(
        userStoryFilesByProject,
        featureMapping,
        incrementId
      );

      // Step 13: Update tasks.md with bidirectional links (project-aware)
      await this.updateTasksWithUserStoryLinks(incrementId, userStoryFilesByProject, featureMapping);

      // Prepare legacy result (for backward compatibility)
      const allUserStories = Array.from(userStoryFilesByProject.values()).flat();
      const allStoryPaths = Array.from(storyPathsByProject.values()).flat();

      return {
        epic: featureFile as any, // Type compatibility hack
        userStories: allUserStories,
        incrementId,
        specId: featureFile.id,
        totalStories: allUserStories.length,
        totalFiles: 1 + (epicFile ? 1 : 0) + contextPaths.length + allStoryPaths.length,
        epicPath: featurePath, // Feature is the new "epic"
        userStoryPaths: allStoryPaths,
        success: true,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Distribution failed: ${error}`);
      throw new Error(`Failed to distribute increment ${incrementId}: ${error}`);
    }
  }

  /**
   * Parse increment spec into structured data
   */
  private async parseIncrementSpec(incrementId: string): Promise<ParsedIncrementSpec> {
    const specPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    if (!fs.existsSync(specPath)) {
      throw new Error(`Increment spec not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Load external links from metadata.json (NEW: source of truth for external integrations)
    const externalLinks = await this.loadExternalLinks(incrementId);

    // Extract YAML frontmatter if present
    let frontmatter: Record<string, any> = {};
    let bodyContent = content;
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const yaml = await import('yaml');
        frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;
        bodyContent = content.slice(frontmatterMatch[0].length).trim();
      } catch (error) {
        console.warn(`   ⚠️  Failed to parse frontmatter for ${incrementId}`);
      }
    }

    // Extract title (try multiple patterns)
    let title = frontmatter.title || '';

    if (!title) {
      // Pattern 1: # SPEC-####: Title
      const specTitleMatch = bodyContent.match(/^#\s+SPEC-\d+:\s+(.+)$/m);
      if (specTitleMatch) title = specTitleMatch[1].trim();
    }

    if (!title) {
      // Pattern 2: # Increment ####: Title
      const incTitleMatch = bodyContent.match(/^#\s+Increment\s+\d+:\s+(.+)$/m);
      if (incTitleMatch) title = incTitleMatch[1].trim();
    }

    if (!title) {
      // Pattern 3: First # heading
      const headingMatch = bodyContent.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1]
          .replace(/^SPEC-\d+:\s*/, '')
          .replace(/^Increment\s+\d+:\s*/, '')
          .trim();
      }
    }

    if (!title) {
      // Fallback: Use increment ID
      title = incrementId
        .replace(/^\d+-/, '')
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Extract overview (try multiple sections)
    let overview = '';

    // Try "Quick Overview" or "Executive Summary"
    let overviewMatch = bodyContent.match(/##\s+(?:Quick\s+)?(?:Overview|Executive\s+Summary)\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
    if (overviewMatch) overview = overviewMatch[1].trim();

    if (!overview) {
      // Try "Overview" section
      overviewMatch = bodyContent.match(/##\s+Overview\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
      if (overviewMatch) overview = overviewMatch[1].trim();
    }

    if (!overview) {
      // Try "Problem Statement" section
      const problemMatch = bodyContent.match(/##\s+Problem\s+Statement\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
      if (problemMatch) {
        // Take first paragraph only
        const firstPara = problemMatch[1].trim().split('\n\n')[0];
        overview = firstPara;
      }
    }

    if (!overview) {
      // Fallback: First paragraph after title
      const firstParaMatch = bodyContent.match(/^#[^\n]+\n+([^\n]+)/);
      if (firstParaMatch) overview = firstParaMatch[1].trim();
    }

    // Extract business value
    const businessValue: string[] = [];
    const businessValueMatch = content.match(/\*\*Business Value\*\*:\s*\n([\s\S]*?)(?=\n---|\n##|\Z)/i);
    if (businessValueMatch) {
      const lines = businessValueMatch[1].split('\n');
      for (const line of lines) {
        const bulletMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*:\s+(.+)$/);
        if (bulletMatch) {
          businessValue.push(`${bulletMatch[1]}: ${bulletMatch[2]}`);
        }
      }
    }

    // Extract user stories
    const userStories = await this.extractUserStories(content, incrementId);

    // Extract priority, status, and created date from frontmatter
    const priority = frontmatter.priority || 'P1';
    const status = frontmatter.status || 'planning';
    const created = frontmatter.created || new Date().toISOString();

    return {
      incrementId,
      title,
      overview,
      businessValue,
      epic: frontmatter.epic, // Epic ID from frontmatter (optional)
      project: frontmatter.project, // Project ID from frontmatter (if present)
      projects: frontmatter.projects || [], // Multiple projects (for cross-project features)
      priority,
      status,
      created,
      userStories,
      externalLinks, // External links from metadata.json
    };
  }

  /**
   * Load external links from metadata.json (source of truth)
   */
  private async loadExternalLinks(incrementId: string): Promise<Record<string, string>> {
    const metadataPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    const links: Record<string, string> = {};

    if (!fs.existsSync(metadataPath)) {
      return links;
    }

    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Extract GitHub link
      if (metadata.github?.url) {
        links.github = metadata.github.url;
      }

      // Extract JIRA link
      if (metadata.jira?.epicKey) {
        links.jira = metadata.jira.epicKey; // Store just the key, can be converted to URL in template
      }

      // Extract Azure DevOps link
      if (metadata.ado?.workItemUrl) {
        links.ado = metadata.ado.workItemUrl;
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse metadata.json for ${incrementId}: ${error}`);
    }

    return links;
  }

  /**
   * Extract user stories from increment spec
   */
  private async extractUserStories(content: string, incrementId: string): Promise<UserStory[]> {
    const userStories: UserStory[] = [];

    // Find all user story sections (supports both ### and #### patterns, with or without blank line)
    const userStoryPattern = /^###+\s+(US-\d+):\s+(.+?)\s*\n([\s\S]*?)(?=^###+\s+US-|\n---\n|$)/gm;

    let match;
    while ((match = userStoryPattern.exec(content)) !== null) {
      const id = match[1]; // US-001
      const title = match[2];
      const storyContent = match[3];

      // Extract description (As a... I want... So that...) - supports both inline and separate line formats
      const descMatch = storyContent.match(/\*\*As a\*\*\s+(.*?)\s*\n\*\*I want\*\*\s+(.*?)\s*\n\*\*So that\*\*\s+(.*?)(?=\n\n|\*\*Acceptance)/is);
      const description = descMatch
        ? `**As a** ${descMatch[1].trim()}\n**I want** ${descMatch[2].trim()}\n**So that** ${descMatch[3].trim()}`
        : '';

      // Extract acceptance criteria
      const acceptanceCriteria = this.extractAcceptanceCriteria(storyContent);

      // Extract business rationale
      const rationaleMatch = storyContent.match(/\*\*Business Rationale\*\*:\s+(.*?)(?=\n\n---|\n\n##|$)/is);
      const businessRationale = rationaleMatch ? rationaleMatch[1].trim() : undefined;

      // Extract phase
      const phaseMatch = content.substring(0, match.index).match(/###\s+(Phase\s+\d+:.*?)$/im);
      const phase = phaseMatch ? phaseMatch[1] : undefined;

      // Determine status (assume complete if in completed increment)
      const status = 'complete'; // Can be enhanced later

      userStories.push({
        id,
        title,
        description,
        acceptanceCriteria,
        tasks: [], // Will be populated later
        businessRationale,
        status,
        phase,
      });
    }

    return userStories;
  }

  /**
   * Extract acceptance criteria from user story content
   */
  private extractAcceptanceCriteria(content: string): any[] {
    const criteria: any[] = [];

    // Pattern: - [x] **AC-US1-01**: Description (P1, testable)
    const acPattern = /^[-*]\s+\[([ x])\]\s+\*\*(.+?)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const id = match[2]; // AC-US1-01
      const description = match[3];
      const metaString = match[4] || ''; // "P1, testable"

      const priority = metaString.match(/P\d/)?.[0];
      const testable = metaString.includes('testable');

      criteria.push({
        id,
        description,
        priority,
        testable,
        completed,
      });
    }

    return criteria;
  }



  /**
   * Generate user story files
   */
  private async generateUserStoryFiles(classified: ClassifiedContent, incrementId: string): Promise<UserStoryFile[]> {
    const userStoryFiles: UserStoryFile[] = [];

    // Load tasks from tasks.md to extract task references
    const taskMap = await this.loadTaskReferences(incrementId);

    for (const userStory of classified.userStories) {
      // Find tasks that implement this user story
      const tasks = this.findTasksForUserStory(userStory.id, taskMap);

      // Find related user stories (same phase)
      const relatedStories = classified.userStories
        .filter((us) => us.id !== userStory.id && us.phase === userStory.phase)
        .map((us) => ({
          id: us.id,
          title: us.title,
          status: us.status,
          phase: us.phase,
          filePath: this.generateUserStoryFilename(us.id, us.title),
        }));

      userStoryFiles.push({
        id: userStory.id,
        epic: classified.epic.id,
        title: userStory.title,
        status: userStory.status,
        priority: userStory.priority,
        created: new Date().toISOString().split('T')[0],
        completed: userStory.status === 'complete' ? new Date().toISOString().split('T')[0] : undefined,
        description: userStory.description,
        acceptanceCriteria: userStory.acceptanceCriteria,
        implementation: {
          increment: incrementId,
          tasks,
        },
        businessRationale: userStory.businessRationale,
        relatedStories,
        phase: userStory.phase,
      });
    }

    return userStoryFiles;
  }

  /**
   * Load task references from tasks.md (with AC-ID extraction)
   */
  private async loadTaskReferences(incrementId: string): Promise<Map<string, TaskReference>> {
    const tasksPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'tasks.md');
    const taskMap = new Map<string, TaskReference>();

    if (!fs.existsSync(tasksPath)) {
      return taskMap;
    }

    const content = await fs.readFile(tasksPath, 'utf-8');

    // Pattern: ### T-001: Task Title followed by **AC**: field
    // Supports both ## and ### headings
    const taskPattern = /^##+ (T-\d+):\s+(.+?)$[\s\S]*?\*\*AC\*\*:\s*([^\n]+)?/gm;

    let match;
    while ((match = taskPattern.exec(content)) !== null) {
      const taskId = match[1]; // T-001
      const taskTitle = match[2];
      const acList = match[3] || ''; // AC-US1-01, AC-US1-02
      const anchor = this.generateTaskAnchor(taskId, taskTitle);

      // Extract AC-IDs from the list
      const acIds: string[] = [];
      const acPattern = /AC-US\d+-\d+/g;
      let acMatch;
      while ((acMatch = acPattern.exec(acList)) !== null) {
        acIds.push(acMatch[0]); // AC-US1-01
      }

      taskMap.set(taskId, {
        id: taskId,
        title: taskTitle,
        anchor,
        path: `../../../../../increments/${incrementId}/tasks.md${anchor}`,
        acIds,
      });
    }

    return taskMap;
  }

  /**
   * Find tasks that implement a user story (using AC-ID based filtering)
   */
  private findTasksForUserStory(userStoryId: string, taskMap: Map<string, TaskReference>): TaskReference[] {
    const tasks: TaskReference[] = [];

    // Extract US number from userStoryId (US-001 → "1")
    const usMatch = userStoryId.match(/US-(\d+)/);
    if (!usMatch) {
      return tasks;
    }

    const usNumber = parseInt(usMatch[1], 10); // 1

    // Find tasks that reference this user story's AC-IDs
    for (const task of taskMap.values()) {
      // Check if task has AC-IDs for this user story (AC-US1-01, AC-US1-02, etc.)
      const hasMatchingAC = task.acIds.some((acId) => {
        const acMatch = acId.match(/AC-US(\d+)-\d+/);
        return acMatch && parseInt(acMatch[1], 10) === usNumber;
      });

      if (hasMatchingAC) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Generate task anchor
   */
  private generateTaskAnchor(taskId: string, taskTitle: string): string {
    const slug = taskTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `#${taskId.toLowerCase()}-${slug}`;
  }

  /**
   * Generate user story filename
   */
  private generateUserStoryFilename(id: string, title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${id.toLowerCase()}-${slug}.md`;
  }



  /**
   * Format epic file as markdown
   */
  private formatEpicFile(epic: EpicFile): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${epic.id}`);
    lines.push(`title: "${epic.title}"`);
    lines.push(`type: epic`);
    lines.push(`status: ${epic.status}`);
    if (epic.priority) lines.push(`priority: ${epic.priority}`);
    lines.push(`created: ${epic.created}`);
    lines.push(`last_updated: ${epic.lastUpdated}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${epic.id}: ${epic.title}`);
    lines.push('');
    lines.push(epic.overview);
    lines.push('');

    // Business Value
    if (epic.businessValue.length > 0) {
      lines.push('**Business Value**:');
      lines.push('');
      for (const value of epic.businessValue) {
        lines.push(`- **${value.split(':')[0]}**: ${value.split(':').slice(1).join(':').trim()}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Implementation History
    if (epic.implementationHistory.length > 0) {
      lines.push('## Implementation History');
      lines.push('');
      lines.push('| Increment | User Stories | Status | Completion Date |');
      lines.push('|-----------|--------------|--------|----------------|');

      for (const entry of epic.implementationHistory) {
        const statusEmoji = entry.status === 'complete' ? '✅' : entry.status === 'in-progress' ? '⏳' : '📋';

        // Generate increment link (prefer GitHub URL for deployed version, fallback to relative path)
        let incrementLink: string;
        if (this.githubRemote && this.githubRemote.owner && this.githubRemote.repo) {
          // GitHub URL (works on deployed version)
          incrementLink = `[${entry.increment}](https://github.com/${this.githubRemote.owner}/${this.githubRemote.repo}/tree/develop/.specweave/increments/${entry.increment})`;
        } else {
          // Fallback to relative path (5 levels up, not 4!)
          incrementLink = `[${entry.increment}](../../../../../increments/${entry.increment}/tasks.md)`;
        }

        // Handle empty stories array (no user stories in spec)
        let storiesText: string;
        if (entry.stories.length === 0) {
          storiesText = 'Implementation only (no user stories)';
        } else if (entry.stories.length === 1) {
          storiesText = entry.stories[0];
        } else {
          const firstStory = entry.stories[0];
          const lastStory = entry.stories[entry.stories.length - 1];
          storiesText = `${firstStory} through ${lastStory} (all)`;
        }

        lines.push(`| ${incrementLink} | ${storiesText} | ${statusEmoji} ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)} | ${entry.date || '-'} |`);
      }

      lines.push('');

      // Handle division by zero (no user stories)
      const progressText = epic.totalStories === 0
        ? 'No user stories (implementation only)'
        : `${epic.completedStories}/${epic.totalStories} user stories complete (${epic.overallProgress}%)`;

      lines.push(`**Overall Progress**: ${progressText}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // User Stories
    lines.push('## User Stories');
    lines.push('');

    // Group by phase
    const phases = new Map<string, typeof epic.userStories>();
    for (const story of epic.userStories) {
      const phase = story.phase || 'General';
      if (!phases.has(phase)) {
        phases.set(phase, []);
      }
      phases.get(phase)!.push(story);
    }

    for (const [phase, stories] of phases) {
      if (phase !== 'General') {
        lines.push(`### ${phase}`);
        lines.push('');
      }

      for (const story of stories) {
        const statusEmoji = story.status === 'complete' ? '✅' : story.status === 'in-progress' ? '⏳' : '📋';
        lines.push(`- [${story.id}: ${story.title}](${story.filePath}) - ${statusEmoji} ${story.status.charAt(0).toUpperCase() + story.status.slice(1)}`);
      }

      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // External Tool Integration (only if there are actual links)
    const hasExternalLinks = epic.externalLinks.github || epic.externalLinks.jira || epic.externalLinks.ado;

    if (hasExternalLinks) {
      lines.push('## External Tool Integration');
      lines.push('');

      // Only show tools that have actual links
      if (epic.externalLinks.github) {
        lines.push(`**GitHub Project**: [${epic.externalLinks.github}](${epic.externalLinks.github})`);
      }
      if (epic.externalLinks.jira) {
        // Convert JIRA key to URL (if it's just a key like SCRUM-23)
        const jiraUrl = epic.externalLinks.jira.startsWith('http')
          ? epic.externalLinks.jira
          : `https://jira.atlassian.com/browse/${epic.externalLinks.jira}`;
        lines.push(`**JIRA Epic**: [${epic.externalLinks.jira}](${jiraUrl})`);
      }
      if (epic.externalLinks.ado) {
        lines.push(`**Azure DevOps**: [${epic.externalLinks.ado}](${epic.externalLinks.ado})`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format user story file as markdown
   */
  private formatUserStoryFile(userStory: UserStoryFile): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${userStory.id}`);
    lines.push(`epic: ${userStory.epic}`);
    lines.push(`title: "${userStory.title}"`);
    lines.push(`status: ${userStory.status}`);
    if (userStory.priority) lines.push(`priority: ${userStory.priority}`);
    lines.push(`created: ${userStory.created}`);
    if (userStory.completed) lines.push(`completed: ${userStory.completed}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${userStory.id}: ${userStory.title}`);
    lines.push('');

    // Feature link (FEATURE.md in same folder)
    lines.push(`**Feature**: [${userStory.epic}](./FEATURE.md)`);
    lines.push('');

    // Description
    lines.push(userStory.description);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Acceptance Criteria
    lines.push('## Acceptance Criteria');
    lines.push('');
    for (const ac of userStory.acceptanceCriteria) {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      const priorityText = ac.priority ? ` (${ac.priority}, testable)` : '';
      lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}${priorityText}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Implementation
    lines.push('## Implementation');
    lines.push('');
    lines.push(`**Increment**: [${userStory.implementation.increment}](${userStory.implementation.tasks[0]?.path.replace(/#.*$/, '')})`);
    lines.push('');
    lines.push('**Tasks**:');
    for (const task of userStory.implementation.tasks) {
      lines.push(`- [${task.id}: ${task.title}](${task.path})`);
    }
    lines.push('');

    // Business Rationale
    if (userStory.businessRationale) {
      lines.push('---');
      lines.push('');
      lines.push('## Business Rationale');
      lines.push('');
      lines.push(userStory.businessRationale);
      lines.push('');
    }

    // Related User Stories
    if (userStory.relatedStories.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Related User Stories');
      lines.push('');
      for (const related of userStory.relatedStories) {
        lines.push(`- [${related.id}: ${related.title}](${related.filePath})`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`**Status**: ${userStory.status === 'complete' ? '✅' : '⏳'} ${userStory.status.charAt(0).toUpperCase() + userStory.status.slice(1)}`);
    if (userStory.completed) {
      lines.push(`**Completed**: ${userStory.completed}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Update tasks.md with bidirectional links to user stories (CRITICAL!)
   *
   * This creates bidirectional traceability:

  /**
   * Classify content by project (NEW for universal hierarchy)
   * Split user stories across projects based on keywords and frontmatter
   */
  private async classifyContentByProject(
    parsed: ParsedIncrementSpec,
    featureMapping: FeatureMapping
  ): Promise<Map<string, UserStory[]>> {
    const storiesByProject = new Map<string, UserStory[]>();

    for (const story of parsed.userStories) {
      // Detect which project(s) this story belongs to
      const storyProjects = await this.detectUserStoryProjects(story, featureMapping.projects);

      for (const project of storyProjects) {
        if (!storiesByProject.has(project)) {
          storiesByProject.set(project, []);
        }
        storiesByProject.get(project)!.push(story);
      }
    }

    // If no stories were classified to any project, add all to default/first project
    if (storiesByProject.size === 0 && parsed.userStories.length > 0) {
      const defaultProject = featureMapping.projects[0] || 'default';
      storiesByProject.set(defaultProject, parsed.userStories);
    }

    return storiesByProject;
  }

  /**
   * Detect which projects a user story belongs to
   */
  private async detectUserStoryProjects(
    story: UserStory,
    availableProjects: string[]
  ): Promise<string[]> {
    // If only one project available, return it
    if (availableProjects.length === 1) {
      return availableProjects;
    }

    const projects: string[] = [];
    const config = await this.hierarchyMapper.getSpecweaveConfig();

    // Method 1: Check if story has explicit project field
    if (story.project) {
      if (availableProjects.includes(story.project)) {
        return [story.project];
      }
    }

    // Method 2: Keyword detection in title and description
    const text = `${story.title} ${story.description}`.toLowerCase();

    for (const projectId of availableProjects) {
      if (projectId === 'default') {
        continue; // Skip default for keyword matching
      }

      // Get project config for keywords
      const projectConfig = config.multiProject?.projects?.[projectId];
      if (projectConfig?.keywords) {
        const hasKeyword = projectConfig.keywords.some(keyword =>
          text.includes(keyword.toLowerCase())
        );
        if (hasKeyword) {
          projects.push(projectId);
        }
      }

      // Also check if project name is mentioned
      if (text.includes(projectId.toLowerCase())) {
        if (!projects.includes(projectId)) {
          projects.push(projectId);
        }
      }
    }

    // Method 3: Fallback - if no projects detected, assign to all
    if (projects.length === 0) {
      return availableProjects;
    }

    return projects;
  }

  /**
   * Generate epic file (OPTIONAL - for strategic themes)
   */
  private async generateEpicFile(
    parsed: ParsedIncrementSpec,
    epicMapping: EpicMapping,
    featureMapping: FeatureMapping
  ): Promise<EpicThemeFile | null> {
    if (!epicMapping) return null;

    return {
      id: epicMapping.epicId,
      title: parsed.title,
      type: 'epic',
      status: (parsed.status as 'planned' | 'in-progress' | 'complete' | 'archived') || 'in-progress',
      created: parsed.created || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      strategicOverview: parsed.overview,
      features: [featureMapping.featureId],
      successMetrics: [],
      timeline: {
        start: parsed.created || new Date().toISOString(),
        targetCompletion: 'TBD',
        currentPhase: 'Phase 1',
      },
      stakeholders: {},
      externalLinks: parsed.externalLinks || {},
    };
  }

  /**
   * Generate feature file (REQUIRED - cross-project overview)
   */
  private async generateFeatureFile(
    parsed: ParsedIncrementSpec,
    featureMapping: FeatureMapping,
    storiesByProject: Map<string, UserStory[]>
  ): Promise<FeatureFile> {
    // Convert stories to summaries grouped by project
    const userStoriesByProject = new Map<string, UserStorySummary[]>();

    for (const [project, stories] of storiesByProject.entries()) {
      const summaries = stories.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        phase: s.phase,
        filePath: `../../${project}/${featureMapping.featureFolder}/${this.generateUserStoryFilename(s.id, s.title)}`,
      }));
      userStoriesByProject.set(project, summaries);
    }

    // Count completed stories
    let completedStories = 0;
    for (const stories of storiesByProject.values()) {
      completedStories += stories.filter(s => s.status === 'complete').length;
    }

    return {
      id: featureMapping.featureId,
      title: parsed.title,
      type: 'feature',
      status: (parsed.status as 'planned' | 'in-progress' | 'complete' | 'archived') || 'in-progress',
      priority: parsed.priority || 'P1',
      created: parsed.created || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      epic: featureMapping.epic,
      projects: featureMapping.projects,
      overview: parsed.overview,
      businessValue: parsed.businessValue || [],
      implementationHistory: [],
      userStoriesByProject,
      externalLinks: parsed.externalLinks || {},
      totalStories: parsed.userStories.length,
      completedStories,
      overallProgress: parsed.userStories.length > 0
        ? Math.round((completedStories / parsed.userStories.length) * 100)
        : 0,
    };
  }

  /**
   * Generate project context files (README.md for each project)
   */
  private async generateProjectContextFiles(
    featureMapping: FeatureMapping,
    parsed: ParsedIncrementSpec
  ): Promise<Map<string, string>> {
    const contextFiles = new Map<string, string>();

    for (const project of featureMapping.projects) {
      const projectContext = await this.hierarchyMapper.getProjectContext(project);
      if (!projectContext) continue;

      const content = this.formatProjectContextFile(
        featureMapping,
        projectContext,
        parsed
      );

      contextFiles.set(project, content);
    }

    return contextFiles;
  }

  /**
   * Format project context file (README.md)
   */
  private formatProjectContextFile(
    featureMapping: FeatureMapping,
    projectContext: ProjectContext,
    parsed: ParsedIncrementSpec
  ): string {
    const featurePathUp = featureMapping.projects.length > 1 ? '../../../' : '../../';

    return `---
id: ${featureMapping.featureId}-${projectContext.projectId}
title: "${parsed.title} - ${projectContext.projectName} Implementation"
feature: ${featureMapping.featureId}
project: ${projectContext.projectId}
type: feature-context
status: in-progress
---

# ${projectContext.projectName} Implementation: ${parsed.title}

**Feature**: [${featureMapping.featureId}](${featurePathUp}_features/${featureMapping.featureFolder}/FEATURE.md)

## ${projectContext.projectName}-Specific Context

This document contains the ${projectContext.projectName} implementation details for the ${parsed.title} feature.

## Tech Stack

${projectContext.techStack.map(t => `- ${t}`).join('\n')}

## User Stories (${projectContext.projectName})

User stories for this project are listed below.

## Dependencies

[Project-specific dependencies will be documented here]

## Architecture Considerations

[${projectContext.projectName}-specific architecture notes]
`;
  }

  /**
   * Generate user story files by project
   */
  private async generateUserStoryFilesByProject(
    storiesByProject: Map<string, UserStory[]>,
    featureMapping: FeatureMapping,
    incrementId: string
  ): Promise<Map<string, UserStoryFile[]>> {
    const filesByProject = new Map<string, UserStoryFile[]>();

    // Load tasks for linking
    const taskMap = await this.loadTaskReferences(incrementId);

    for (const [project, stories] of storiesByProject.entries()) {
      const userStoryFiles: UserStoryFile[] = [];

      for (const userStory of stories) {
        // Find tasks that implement this user story
        const tasks = this.findTasksForUserStory(userStory.id, taskMap);

        // Find related user stories (same project, same phase)
        const relatedStories = stories
          .filter((us) => us.id !== userStory.id && us.phase === userStory.phase)
          .map((us) => ({
            id: us.id,
            title: us.title,
            status: us.status,
            phase: us.phase,
            filePath: this.generateUserStoryFilename(us.id, us.title),
          }));

        userStoryFiles.push({
          id: userStory.id,
          epic: featureMapping.featureId, // Feature is the parent
          title: userStory.title,
          status: userStory.status,
          priority: userStory.priority,
          created: new Date().toISOString().split('T')[0],
          completed: userStory.status === 'complete' ? new Date().toISOString().split('T')[0] : undefined,
          description: userStory.description,
          acceptanceCriteria: userStory.acceptanceCriteria,
          implementation: {
            increment: incrementId,
            tasks,
          },
          businessRationale: userStory.businessRationale,
          relatedStories,
          phase: userStory.phase,
          project, // Add project field
        });
      }

      filesByProject.set(project, userStoryFiles);
    }

    return filesByProject;
  }

  /**
   * Write epic file to _epics/ folder
   */
  private async writeEpicFile(
    epic: EpicThemeFile | null,
    epicMapping: EpicMapping | null
  ): Promise<string | null> {
    if (!epic || !epicMapping) return null;

    const epicPath = path.join(epicMapping.epicPath, 'EPIC.md');
    const content = this.formatEpicThemeFile(epic);

    await fs.ensureDir(path.dirname(epicPath));
    await fs.writeFile(epicPath, content, 'utf-8');

    console.log(`   ✅ Written epic overview to _epics/${epicMapping.epicFolder}/EPIC.md`);
    return epicPath;
  }

  /**
   * Format epic theme file content
   */
  private formatEpicThemeFile(epic: EpicThemeFile): string {
    const yaml = `---
id: ${epic.id}
title: "${epic.title}"
type: ${epic.type}
status: ${epic.status}
---`;

    return `${yaml}

# ${epic.title}

## Strategic Overview

${epic.strategicOverview}

## Features

${epic.features.map(f => `- ${f}`).join('\n')}

## Timeline

- **Start**: ${epic.timeline.start}
- **Target Completion**: ${epic.timeline.targetCompletion}
- **Current Phase**: ${epic.timeline.currentPhase}
`;
  }

  /**
   * Write feature file to _features/ folder
   */
  private async writeFeatureFile(
    feature: FeatureFile,
    featureMapping: FeatureMapping
  ): Promise<string> {
    const featurePath = path.join(featureMapping.featurePath, 'FEATURE.md');
    const content = this.formatFeatureFile(feature);

    await fs.ensureDir(path.dirname(featurePath));
    await fs.writeFile(featurePath, content, 'utf-8');

    console.log(`   ✅ Written feature overview to _features/${featureMapping.featureFolder}/FEATURE.md`);
    return featurePath;
  }

  /**
   * Format feature file content
   */
  private formatFeatureFile(feature: FeatureFile): string {
    const yaml = `---
id: ${feature.id}
title: "${feature.title}"
type: ${feature.type}
status: ${feature.status}
priority: ${feature.priority}
created: ${feature.created}
lastUpdated: ${feature.lastUpdated}
projects: [${feature.projects.map(p => `"${p}"`).join(', ')}]
${feature.epic ? `epic: ${feature.epic}` : ''}
---`;

    const storiesByProjectSection = Array.from(feature.userStoriesByProject.entries())
      .map(([project, stories]) => `
### ${project}

${stories.map(s => `- [${s.id}: ${s.title}](${s.filePath}) - ${s.status}`).join('\n')}`)
      .join('\n');

    return `${yaml}

# ${feature.title}

## Overview

${feature.overview}

## Business Value

${feature.businessValue.map(v => `- ${v}`).join('\n') || 'See overview above'}

## Projects

This feature spans the following projects:
${feature.projects.map(p => `- ${p}`).join('\n')}

## User Stories by Project
${storiesByProjectSection}

## Progress

- **Total Stories**: ${feature.totalStories}
- **Completed**: ${feature.completedStories}
- **Progress**: ${feature.overallProgress}%
`;
  }

  /**
   * Write project context files
   * NOTE: We NO LONGER create README.md in project feature folders
   * User stories go directly in the folder without README
   */
  private async writeProjectContextFiles(
    contextFiles: Map<string, string>,
    featureMapping: FeatureMapping
  ): Promise<string[]> {
    // Skip writing README.md files in project folders
    // Only user story files should exist there
    console.log(`   ℹ️  Skipping project README creation (user stories only in project folders)`);
    return [];
  }

  /**
   * Write user story files by project
   */
  private async writeUserStoryFilesByProject(
    userStoryFilesByProject: Map<string, UserStoryFile[]>,
    featureMapping: FeatureMapping,
    incrementId: string
  ): Promise<Map<string, string[]>> {
    const pathsByProject = new Map<string, string[]>();

    for (const [project, stories] of userStoryFilesByProject.entries()) {
      const projectPath = featureMapping.projectPaths.get(project);
      if (!projectPath) continue;

      await fs.ensureDir(projectPath);

      const paths: string[] = [];

      for (const story of stories) {
        const filename = this.generateUserStoryFilename(story.id, story.title);
        const filePath = path.join(projectPath, filename);

        const content = this.formatUserStoryFile(story);

        await fs.writeFile(filePath, content, 'utf-8');
        paths.push(filePath);
      }

      pathsByProject.set(project, paths);
    }

    const totalStories = Array.from(userStoryFilesByProject.values())
      .reduce((sum, stories) => sum + stories.length, 0);
    console.log(`   ✅ Written ${totalStories} user stories to ${featureMapping.projects.length} project(s)`);

    return pathsByProject;
  }

  /**
   * Update tasks.md with bidirectional links (project-aware)
   */
  private async updateTasksWithUserStoryLinks(
    incrementId: string,
    userStoryFilesByProject: Map<string, UserStoryFile[]>,
    featureMapping: FeatureMapping
  ): Promise<void> {
    const tasksPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'tasks.md');

    if (!fs.existsSync(tasksPath)) {
      console.warn(`   ⚠️  tasks.md not found for ${incrementId}, skipping bidirectional linking`);
      return;
    }

    let content = await fs.readFile(tasksPath, 'utf-8');

    // Build a map of all user stories across all projects
    const allUserStories = new Map<string, { story: UserStoryFile; project: string }>();
    for (const [project, stories] of userStoryFilesByProject.entries()) {
      for (const story of stories) {
        allUserStories.set(story.id, { story, project });
      }
    }

    // Pattern to find task headings and their AC fields
    const taskSections = content.split(/(?=^##+ T-\d+:)/m);
    const updatedSections: string[] = [];

    for (const section of taskSections) {
      if (!section.trim()) {
        updatedSections.push(section);
        continue;
      }

      // Extract task ID and AC list
      const taskMatch = section.match(/^(##+ T-\d+:.+?)$/m);
      const acMatch = section.match(/\*\*AC\*\*:\s*([^\n]+)/);

      if (!taskMatch || !acMatch) {
        updatedSections.push(section);
        continue;
      }

      const taskHeading = taskMatch[1];
      const acList = acMatch[1];

      // Find which user story this task belongs to based on AC-IDs
      let linkedStory: { story: UserStoryFile; project: string } | null = null;
      const acPattern = /AC-US(\d+)-\d+/g;
      let acIdMatch;

      while ((acIdMatch = acPattern.exec(acList)) !== null) {
        const usNumber = acIdMatch[1];
        const usId = `US-${usNumber.padStart(3, '0')}`;

        if (allUserStories.has(usId)) {
          linkedStory = allUserStories.get(usId)!;
          break;
        }
      }

      if (linkedStory) {
        // Check if link already exists
        const userStoryLinkPattern = /\n\*\*User Story\*\*:/;
        if (!userStoryLinkPattern.test(section)) {
          // Add the user story link right after the heading
          const { story, project } = linkedStory;
          const relativePath = `../../docs/internal/specs/${project}/${featureMapping.featureFolder}/${this.generateUserStoryFilename(story.id, story.title)}`;
          const linkLine = `\n\n**User Story**: [${story.id}: ${story.title}](${relativePath})`;

          // Insert after the heading line
          const lines = section.split('\n');
          const headingIndex = lines.findIndex(line => line.match(/^##+ T-\d+:/));
          if (headingIndex >= 0) {
            lines.splice(headingIndex + 1, 0, linkLine);
            updatedSections.push(lines.join('\n'));
          } else {
            updatedSections.push(section);
          }
        } else {
          updatedSections.push(section);
        }
      } else {
        updatedSections.push(section);
      }
    }

    const updatedContent = updatedSections.join('');
    if (content !== updatedContent) {
      await fs.writeFile(tasksPath, updatedContent, 'utf-8');
      console.log(`   ✅ Updated tasks.md with bidirectional user story links`);
    }
  }
}
