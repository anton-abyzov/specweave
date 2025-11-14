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
} from './types.js';
import { HierarchyMapper, EpicMapping } from './hierarchy-mapper.js';
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
    // Initialize HierarchyMapper with same project config
    this.hierarchyMapper = new HierarchyMapper(projectRoot, {
      projectId: config?.specsDir?.includes('/specs/')
        ? config.specsDir.split('/specs/')[1]?.split('/')[0] || 'default'
        : 'default'
    });
  }

  /**
   * Distribute increment spec into epic + user story files
   */
  async distribute(incrementId: string): Promise<DistributionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Detect GitHub remote for generating GitHub URLs (if not already detected)
      if (!this.githubRemote) {
        this.githubRemote = await detectPrimaryGitHubRemote(this.projectRoot);
      }
      // Step 0a: Parse increment spec to detect project ID
      const parsed = await this.parseIncrementSpec(incrementId);

      // Step 0b: Update config if project ID is specified in frontmatter
      let projectId = this.config.specsDir.split('/specs/')[1]?.split('/')[0] || 'default';
      if (parsed.project) {
        projectId = parsed.project;
        // Update config paths for correct project
        this.config.specsDir = path.join(
          this.projectRoot,
          '.specweave',
          'docs',
          'internal',
          'specs',
          projectId
        );
        // Recreate hierarchy mapper with correct project ID
        this.hierarchyMapper = new HierarchyMapper(this.projectRoot, {
          projectId,
          specsBaseDir: this.config.specsDir,
        });
      }

      // Step 0c: Detect feature folder using HierarchyMapper (NEW: feature-based naming)
      console.log(`   🔍 Detecting feature folder for ${incrementId}...`);
      const epicMapping = await this.hierarchyMapper.detectFeatureMapping(incrementId);
      console.log(`   📁 Mapped to ${epicMapping.featureFolder} (confidence: ${epicMapping.confidence}%, method: ${epicMapping.detectionMethod})`);

      // Ensure specs base directory exists (for multi-project support)
      await fs.ensureDir(this.config.specsDir);

      // Step 2: Classify content (pass epicMapping to use feature folder as ID)
      const classified = await this.classifyContent(parsed, epicMapping);

      // Step 3: Generate epic file
      const epic = await this.generateEpicFile(classified, incrementId);

      // Step 4: Generate user story files
      const userStories = await this.generateUserStoryFiles(classified, incrementId);

      // Step 5: Write files (using epicMapping paths)
      const epicPath = await this.writeEpicFile(epic, epicMapping);
      const userStoryPaths = await this.writeUserStoryFiles(userStories, epicMapping);

      // Step 6: Update tasks.md with bidirectional links to user stories (CRITICAL!)
      await this.updateTasksWithUserStoryLinks(incrementId, userStories, epicMapping);

      return {
        epic,
        userStories,
        incrementId,
        specId: epic.id,
        totalStories: userStories.length,
        totalFiles: 1 + userStories.length,
        epicPath,
        userStoryPaths,
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

    return {
      incrementId,
      title,
      overview,
      businessValue,
      project: frontmatter.project, // Project ID from frontmatter (if present)
      userStories,
      externalLinks, // NEW: External links from metadata.json
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
   * Classify content into epic vs user-story level
   *
   * NEW (v0.18.0): Uses feature folder name as ID (e.g., FS-25-11-14-release-management)
   */
  private async classifyContent(parsed: ParsedIncrementSpec, epicMapping: EpicMapping): Promise<ClassifiedContent> {
    // Use feature folder name as ID (e.g., FS-25-11-14-release-management)
    // This ensures ID matches folder name
    const specId = epicMapping.featureFolder;

    return {
      epic: {
        id: specId,
        title: parsed.title,
        overview: parsed.overview,
        businessValue: parsed.businessValue,
        status: 'complete',
      },
      userStories: parsed.userStories,
      implementationHistory: [
        {
          increment: parsed.incrementId,
          stories: parsed.userStories.map((us) => us.id),
          status: 'complete',
          date: new Date().toISOString().split('T')[0],
        },
      ],
      externalLinks: parsed.externalLinks || {},
      relatedDocs: [],
    };
  }

  /**
   * Generate epic file
   */
  private async generateEpicFile(classified: ClassifiedContent, incrementId: string): Promise<EpicFile> {
    // Generate user story summaries
    const userStorySummaries: UserStorySummary[] = classified.userStories.map((us) => ({
      id: us.id,
      title: us.title,
      status: us.status,
      phase: us.phase,
      filePath: this.generateUserStoryFilename(us.id, us.title), // User stories are directly in FS folder
    }));

    const completedStories = classified.userStories.filter((us) => us.status === 'complete').length;

    return {
      id: classified.epic.id,
      title: classified.epic.title,
      type: 'epic',
      status: 'complete',
      priority: classified.epic.priority,
      created: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      overview: classified.epic.overview,
      businessValue: classified.epic.businessValue,
      implementationHistory: classified.implementationHistory,
      userStories: userStorySummaries,
      externalLinks: classified.externalLinks,
      relatedDocs: classified.relatedDocs,
      totalStories: classified.userStories.length,
      completedStories,
      overallProgress: Math.round((completedStories / classified.userStories.length) * 100),
    };
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
   * Write feature file to disk (NEW: writes to FEATURE.md instead of README.md)
   */
  private async writeEpicFile(epic: EpicFile, epicMapping: EpicMapping): Promise<string> {
    // Write to feature-folder/FEATURE.md (feature overview - high-level summary)
    const featurePath = path.join(epicMapping.featurePath, 'FEATURE.md');

    const content = this.formatEpicFile(epic);

    await fs.ensureDir(path.dirname(featurePath));
    await fs.writeFile(featurePath, content, 'utf-8');

    console.log(`   ✅ Written feature overview to ${epicMapping.featureFolder}/FEATURE.md`);
    return featurePath;
  }

  /**
   * Write user story files to disk (NEW: writes directly to feature folder)
   */
  private async writeUserStoryFiles(userStories: UserStoryFile[], epicMapping: EpicMapping): Promise<string[]> {
    // Write user stories directly to feature folder (not in subfolder)
    const featureDir = epicMapping.featurePath;
    await fs.ensureDir(featureDir);

    const paths: string[] = [];

    for (const userStory of userStories) {
      const filename = this.generateUserStoryFilename(userStory.id, userStory.title);
      const filePath = path.join(featureDir, filename);

      const content = this.formatUserStoryFile(userStory);

      await fs.writeFile(filePath, content, 'utf-8');
      paths.push(filePath);
    }

    console.log(`   ✅ Written ${userStories.length} user stories directly to ${epicMapping.featureFolder}/`);
    return paths;
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
   * - User Story → Tasks (already done in us-*.md files)
   * - Tasks → User Story (NEW - added here)
   *
   * When a task implements a user story, this adds a link in tasks.md:
   * **User Story**: [US-001: Title](../../docs/internal/specs/{project}/{feature}/us-001-*.md)
   */
  private async updateTasksWithUserStoryLinks(
    incrementId: string,
    userStories: UserStoryFile[],
    epicMapping: EpicMapping
  ): Promise<void> {
    const tasksPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'tasks.md');

    // Check if tasks.md exists
    if (!fs.existsSync(tasksPath)) {
      console.log(`   ⚠️  tasks.md not found for ${incrementId}, skipping bidirectional link update`);
      return;
    }

    try {
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      // Parse tasks to create task → user story mapping
      const taskToUSMapping = this.mapTasksToUserStories(tasksContent, userStories);

      if (Object.keys(taskToUSMapping).length === 0) {
        console.log(`   ℹ️  No AC-based task-to-US mapping found, skipping bidirectional links`);
        return;
      }

      // Update tasks.md content with user story links
      let updatedContent = tasksContent;
      let linksAdded = 0;

      for (const [taskId, userStory] of Object.entries(taskToUSMapping)) {
        // Generate relative path from tasks.md to user story file
        const projectId = epicMapping.featurePath.split('/specs/')[1]?.split('/')[0] || 'default';
        const featureFolder = epicMapping.featureFolder;
        const userStoryFile = this.generateUserStoryFilename(userStory.id, userStory.title);
        const relativePath = `../../docs/internal/specs/${projectId}/${featureFolder}/${userStoryFile}`;

        // Find task section and add link if not already present (supports both ## and ### headings)
        // CRITICAL: Remove 'g' flag to prevent multiple matches of the same task
        const taskPattern = new RegExp(`(^##+ ${taskId}:.*?$\\n)([\\s\\S]*?)(?=^##+ T-|^---$|$)`, 'm');

        // Only replace once per task
        let replaced = false;
        updatedContent = updatedContent.replace(taskPattern, (match, heading, body) => {
          // Prevent multiple replacements
          if (replaced) {
            return match;
          }

          // Check if link already exists
          if (body.includes('**User Story**:')) {
            return match; // Link already exists
          }

          // Insert link right after the heading (before any content)
          const linkLine = `**User Story**: [${userStory.id}: ${userStory.title}](${relativePath})\n\n`;

          replaced = true;
          linksAdded++;
          return heading + linkLine + body;
        });
      }

      // Write updated tasks.md
      if (linksAdded > 0) {
        await fs.writeFile(tasksPath, updatedContent, 'utf-8');
        console.log(`   🔗 Added ${linksAdded} bidirectional links to tasks.md`);
      } else {
        console.log(`   ℹ️  All tasks already have user story links`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to update tasks.md with bidirectional links: ${error}`);
    }
  }

  /**
   * Map tasks to user stories using AC-IDs
   *
   * Extracts AC-IDs from tasks (e.g., AC-US1-01) and maps them to user stories (e.g., US-001)
   */
  private mapTasksToUserStories(
    tasksContent: string,
    userStories: UserStoryFile[]
  ): Record<string, UserStoryFile> {
    const mapping: Record<string, UserStoryFile> = {};

    // Extract all tasks with their AC-IDs (supports both ## and ### headings)
    const taskPattern = /^##+ (T-\d+):.*?$\n[\s\S]*?\*\*AC\*\*:\s*([^\n]+)/gm;
    let match;

    while ((match = taskPattern.exec(tasksContent)) !== null) {
      const taskId = match[1]; // T-001
      const acList = match[2]; // AC-US1-01, AC-US1-02

      // Extract user story IDs from AC-IDs (AC-US1-01 → US-001)
      const acPattern = /AC-US(\d+)-\d+/g;
      let acMatch;

      while ((acMatch = acPattern.exec(acList)) !== null) {
        const usNumber = acMatch[1]; // "1"
        const usId = `US-${usNumber.padStart(3, '0')}`; // "US-001"

        // Find matching user story
        const userStory = userStories.find(us => us.id === usId);
        if (userStory) {
          mapping[taskId] = userStory;
          break; // One task can only map to one primary user story
        }
      }
    }

    return mapping;
  }
}
