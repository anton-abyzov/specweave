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
  ExternalToolMapping,
  ProjectSpecificTask,
} from './types.js';
import { HierarchyMapper } from './hierarchy-mapper.js';
import { detectPrimaryGitHubRemote, GitRemote } from '../../utils/git-detector.js';
import { ACProjectSpecificGenerator } from './ac-project-specific-generator.js';
import { TaskProjectSpecificGenerator } from './task-project-specific-generator.js';

/**
 * SpecDistributor - Distributes increment specs into hierarchical living docs
 */
export class SpecDistributor {
  private config: DistributionConfig;
  private projectRoot: string;
  private hierarchyMapper: HierarchyMapper;
  private githubRemote: GitRemote | null = null;
  private acGenerator: ACProjectSpecificGenerator;
  private taskGenerator: TaskProjectSpecificGenerator; // ✅ NEW: Task generator

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
    // Initialize AC Generator
    this.acGenerator = new ACProjectSpecificGenerator();
    // ✅ NEW: Initialize Task Generator
    this.taskGenerator = new TaskProjectSpecificGenerator(projectRoot);
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

      // Step 1.5: Filter abandoned/archived increments (CRITICAL: prevent pollution)
      if (parsed.status === 'abandoned' || parsed.status === 'archived') {
        console.log(`   ⚠️  Skipping distribution for ${parsed.status} increment: ${incrementId}`);
        console.log(`   💡 Living docs are NOT updated for ${parsed.status} increments`);
        return {
          epic: {} as any,
          userStories: [],
          incrementId,
          specId: `${parsed.status.toUpperCase()}-${incrementId}`,
          totalStories: 0,
          totalFiles: 0,
          epicPath: '',
          userStoryPaths: [],
          success: false,
          errors: [`Increment ${incrementId} is ${parsed.status} - skipping living docs distribution`],
          warnings: [`To preserve history, archived content remains in the increment folder`],
        };
      }

      // Step 2: Check if we should create epics (skip for GitHub)
      const config = await this.hierarchyMapper.getSpecweaveConfig();
      const syncProvider = config.sync?.provider || config.sync?.activeProfile ?
        config.sync.profiles?.[config.sync.activeProfile]?.provider : undefined;
      const shouldCreateEpic = syncProvider !== 'github'; // GitHub doesn't have epics concept

      // Step 3: Detect epic mapping (OPTIONAL - skip for GitHub)
      let epicMapping: EpicMapping | null = null;
      if (shouldCreateEpic) {
        epicMapping = await this.hierarchyMapper.detectEpicMapping(incrementId);
        if (epicMapping) {
          console.log(`   🎯 Mapped to epic ${epicMapping.epicId} (confidence: ${epicMapping.confidence}%)`);
        }
      } else {
        console.log(`   ⚡ Skipping epic creation (GitHub integration)`);
      }

      // Step 4: Detect feature mapping (REQUIRED)
      console.log(`   🔍 Detecting feature folder for ${incrementId}...`);
      const featureMapping = await this.hierarchyMapper.detectFeatureMapping(incrementId);
      console.log(`   📁 Mapped to feature ${featureMapping.featureId} (confidence: ${featureMapping.confidence}%, method: ${featureMapping.detectionMethod})`);
      console.log(`   📦 Projects: ${featureMapping.projects.join(', ')}`);

      // Step 5: Classify content by project (NEW)
      const storiesByProject = await this.classifyContentByProject(parsed, featureMapping);
      console.log(`   📊 Classified ${parsed.userStories.length} user stories across ${storiesByProject.size} project(s)`);

      // Step 6: Generate epic file (OPTIONAL - only if not GitHub)
      const epicFile = epicMapping && shouldCreateEpic ? await this.generateEpicFile(parsed, epicMapping, featureMapping) : null;

      // Step 7: Generate feature file (REQUIRED)
      const featureFile = await this.generateFeatureFile(parsed, featureMapping, storiesByProject, incrementId);

      // Step 8: Generate project context files (REQUIRED)
      const projectContextFiles = await this.generateProjectContextFiles(featureMapping, parsed);

      // Step 9: Generate user story files by project (REQUIRED)
      const userStoryFilesByProject = await this.generateUserStoryFilesByProject(
        storiesByProject,
        featureMapping,
        incrementId
      );

      // Step 10: Write epic file (if exists and not GitHub)
      const epicPath = epicFile && epicMapping && shouldCreateEpic ? await this.writeEpicFile(epicFile, epicMapping) : null;

      // Step 11: Write feature file
      const featurePath = await this.writeFeatureFile(featureFile, featureMapping);

      // Step 12: Write project context files
      const contextPaths = await this.writeProjectContextFiles(projectContextFiles, featureMapping);

      // Step 13: Write user story files by project
      const storyPathsByProject = await this.writeUserStoryFilesByProject(
        userStoryFilesByProject,
        featureMapping,
        incrementId
      );

      // Step 14: Update tasks.md with bidirectional links (project-aware)
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
    let overviewMatch = bodyContent.match(/##\s+(?:Quick\s+)?(?:Overview|Executive\s+Summary)\s*\n+([\s\S]*?)(?=\n\*\*Business Value\*\*:|\n##|\n---|$)/im);
    if (overviewMatch) {
      overview = overviewMatch[1].trim();
      // Remove any trailing fragments or incomplete sentences
      if (overview && !overview.endsWith('.') && !overview.endsWith('!') && !overview.endsWith('?')) {
        // Try to complete the sentence by looking ahead
        const extendedMatch = bodyContent.match(/##\s+(?:Quick\s+)?(?:Overview|Executive\s+Summary)\s*\n+([\s\S]{0,1000}?)(?:\n\n|\n\*\*|\n##|\n---|$)/im);
        if (extendedMatch) {
          const extended = extendedMatch[1].trim();
          // Find the last complete sentence
          const sentences = extended.match(/[^.!?]+[.!?]/g);
          if (sentences) {
            overview = sentences.join('').trim();
          }
        }
      }
    }

    if (!overview) {
      // Try "Overview" section
      overviewMatch = bodyContent.match(/##\s+Overview\s*\n+([\s\S]*?)(?=\n##|\n---|$)/im);
      if (overviewMatch) {
        const parts = overviewMatch[1].trim().split(/\n\n|\n---/);
        overview = parts[0].trim();
      }
    }

    if (!overview) {
      // Try "Problem Statement" section
      const problemMatch = bodyContent.match(/##\s+Problem\s+Statement\s*\n+([\s\S]*?)(?=\n##|\n---|$)/im);
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
   * Detect external tool mapping from metadata.json
   *
   * Maps SpecWeave hierarchy to external tool hierarchy with clear indicators.
   * Examples:
   * - SpecWeave Feature (FS-031) → JIRA Epic (AUTH-100)
   * - SpecWeave Feature (FS-031) → GitHub Issue (#45)
   * - SpecWeave Feature (FS-031) → ADO Feature (12345)
   */
  private async detectExternalToolMapping(incrementId: string): Promise<ExternalToolMapping | undefined> {
    const metadataPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return undefined;
    }

    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Priority order: JIRA > ADO > GitHub
      // (JIRA has most divergence, GitHub has least)

      // JIRA mapping (Epic → Feature divergence)
      if (metadata.jira?.epicKey) {
        return {
          provider: 'jira',
          externalType: 'epic',
          externalId: metadata.jira.epicKey,
          externalUrl: metadata.jira.url || `https://jira.atlassian.com/browse/${metadata.jira.epicKey}`,
          hierarchyLevel: 'feature',
          mappingNote: 'JIRA Epic maps to SpecWeave Feature',
        };
      }

      // Azure DevOps mapping (Feature → Feature same level)
      if (metadata.ado?.workItemId) {
        return {
          provider: 'ado',
          externalType: 'feature',
          externalId: String(metadata.ado.workItemId),
          externalUrl: metadata.ado.workItemUrl,
          hierarchyLevel: 'feature',
          mappingNote: 'ADO Feature maps to SpecWeave Feature',
        };
      }

      // GitHub mapping - Features should NOT map to issues
      // According to Universal Hierarchy:
      // - SpecWeave Feature (FS-*) → GitHub Milestone
      // - SpecWeave User Story (US-*) → GitHub Issue
      // We should NOT show GitHub issue mapping at feature level
      // This will be handled at user story level instead
    } catch (error) {
      console.warn(`   ⚠️  Failed to parse metadata.json for external mapping: ${error}`);
    }

    return undefined;
  }

  /**
   * Extract user stories from increment spec
   */
  private async extractUserStories(content: string, incrementId: string): Promise<UserStory[]> {
    const userStories: UserStory[] = [];

    // Split content into individual user stories
    // Each story runs from "### US-XXX:" or "#### US-XXX:" until the next user story or end of content
    const storyParts = content.split(/(?=^#{3,4}\s+US-\d+:)/m);

    for (const part of storyParts) {
      // Skip empty parts or parts that don't start with US-
      if (!part.trim() || !part.match(/^#{3,4}\s+US-\d+:/)) continue;

      // Extract the user story ID and title from the first line (supports both ### and ####)
      const headerMatch = part.match(/^#{3,4}\s+(US-\d+):\s+(.+?)$/m);
      if (!headerMatch) continue;

      const id = headerMatch[1];
      const title = headerMatch[2];

      // Get everything after the header line, removing trailing ---
      const storyContent = part
        .substring(part.indexOf('\n') + 1)
        .replace(/\n---\s*$/, '')
        .trim();

      // Extract description (As a... I want... So that...) - supports both inline and separate line formats
      const descMatch = storyContent.match(/\*\*As a\*\*\s+(.*?)\n\*\*I want\*\*\s+(.*?)\n\*\*So that\*\*\s+(.*?)(?:\n|$)/is);
      const description = descMatch
        ? `**As a** ${descMatch[1].trim()}\n**I want** ${descMatch[2].trim()}\n**So that** ${descMatch[3].trim()}`
        : '';

      // Extract acceptance criteria from the Acceptance Criteria section
      // Try full content first (works for #### headings), then story content (works for ### headings)
      let acceptanceCriteria = this.extractAcceptanceCriteriaFromSection(content, id);
      if (!acceptanceCriteria || acceptanceCriteria.length === 0) {
        acceptanceCriteria = this.extractAcceptanceCriteria(storyContent);
      }


      // Extract business rationale
      const rationaleMatch = storyContent.match(/\*\*Business Rationale\*\*:\s+(.*?)(?=\n\n---|\n\n##|$)/is);
      const businessRationale = rationaleMatch ? rationaleMatch[1].trim() : undefined;

      // Extract phase (look for phase header before this story in the original content)
      const storyIndex = content.indexOf(part);
      const phaseMatch = content.substring(0, storyIndex).match(/###\s+(Phase\s+\d+:.*?)$/im);
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

    // Pattern 1: - [x] **AC-US1-01**: Description (P1, testable)
    // Pattern 2: - [ ] **AC-001**: Description (P0, testable)
    // Pattern 3: - AC-001: Description (P0, testable) [without checkbox]
    // Also handles both ** bold ** and plain text formats
    const acPatterns = [
      // With checkbox and bold
      /^[-*]\s+\[([ x])\]\s+\*\*(AC-[^:]+)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
      // Without checkbox but with bold
      /^[-*]\s+\*\*(AC-[^:]+)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
      // Without checkbox and without bold (common in specs)
      /^[-*]\s+(AC-\d+):\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
    ];

    // Try each pattern
    for (const pattern of acPatterns) {
      const contentCopy = content; // Work with a copy for each pattern
      pattern.lastIndex = 0; // Reset regex state

      let match;
      while ((match = pattern.exec(contentCopy)) !== null) {
        let completed = false;
        let id = '';
        let description = '';
        let metaString = '';

        // Handle different match groups based on pattern
        if (match.length === 5) {
          // Pattern with checkbox: [1]=checkbox, [2]=id, [3]=desc, [4]=meta
          completed = match[1] === 'x';
          id = match[2];
          description = match[3];
          metaString = match[4] || '';
        } else if (match.length === 4) {
          // Pattern without checkbox: [1]=id, [2]=desc, [3]=meta
          completed = false; // Default to not completed
          id = match[1];
          description = match[2];
          metaString = match[3] || '';
        }

        // Skip if already added (avoid duplicates from multiple patterns)
        if (criteria.some(c => c.id === id)) {
          continue;
        }

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
    }

    return criteria;
  }

  /**
   * Extract acceptance criteria from the full spec content for a specific user story
   * This handles cases where AC is in a separate section after the user story
   */
  private extractAcceptanceCriteriaFromSection(content: string, userStoryId: string): any[] {
    const criteria: any[] = [];

    // Find the user story section and its acceptance criteria
    const usNumber = userStoryId.replace('US-', '');

    // Try multiple patterns to find AC section (supports both ### and #### headings)
    const patterns = [
      // Pattern 1: AC in "**Acceptance Criteria**:" section (most common - matches spec format)
      // This matches: **Acceptance Criteria**:\n- AC-XXX: description
      new RegExp(
        `####+?\\s+${userStoryId}:.*?\\n[\\s\\S]*?\\*\\*Acceptance Criteria\\*\\*:\\s*\\n+((?:[-*]\\s+AC-\\d+:[^\\n]+\\n?)+)`,
        'im'
      ),
      // Pattern 2: AC with checkboxes format
      new RegExp(
        `####+?\\s+${userStoryId}:.*?\\n[\\s\\S]*?\\*\\*Acceptance Criteria\\*\\*:\\s*\\n+((?:[-*]\\s+\\[[ x]\\]\\s+\\*\\*AC-[^\\n]+\\n?)+)`,
        'im'
      ),
      // Pattern 3: AC directly after user story (no separate section)
      new RegExp(
        `####+?\\s+${userStoryId}:.*?\\n[\\s\\S]*?(?:\\n\\n|\\n)+([-*]\\s+\\[[ x]\\]\\s+\\*\\*AC-US${usNumber}-\\d+[\\s\\S]*?)(?=\\n\\s*\\*\\*Business|\\n###|\\n---|$)`,
        'im'
      ),
      // Pattern 4: AC in a dedicated "### Acceptance Criteria" subsection
      new RegExp(
        `####+?\\s+${userStoryId}:.*?\\n[\\s\\S]*?####+?\\s+Acceptance Criteria\\s*\\n+([\\s\\S]*?)(?=\\n\\s*\\*\\*Business|\\n###|\\n---|$)`,
        'im'
      ),
    ];

    let acContent = '';
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        acContent = match[1];
        break;
      }
    }

    if (!acContent) {
      return criteria;
    }

    // Multiple patterns to handle different AC formats
    // Pattern 1: - [ ] **AC-USX-XX**: Description (P1, testable)
    // Pattern 2: - [x] **AC-001**: Description (P0, testable)
    // Pattern 3: - AC-001: Description (P0, testable) [without checkbox]
    const acPatterns = [
      // With checkbox and bold (specific user story format)
      /^[-*]\s+\[([ x])\]\s+\*\*(AC-US\d+-\d+)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
      // With checkbox and bold (general format)
      /^[-*]\s+\[([ x])\]\s+\*\*(AC-\d+)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
      // Without checkbox but with bold
      /^[-*]\s+\*\*(AC-\d+)\*\*:\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
      // Without checkbox and without bold (common in specs)
      /^[-*]\s+(AC-\d+):\s+(.+?)(?:\s+\(([^)]+)\))?$/gm,
    ];

    // Try each pattern
    for (const pattern of acPatterns) {
      pattern.lastIndex = 0; // Reset regex state

      let match;
      while ((match = pattern.exec(acContent)) !== null) {
        let completed = false;
        let id = '';
        let description = '';
        let metaString = '';

        // Handle different match groups based on pattern
        if (match.length === 5) {
          // Pattern with checkbox: [1]=checkbox, [2]=id, [3]=desc, [4]=meta
          completed = match[1] === 'x';
          id = match[2];
          description = match[3];
          metaString = match[4] || '';
        } else if (match.length === 4) {
          // Pattern without checkbox: [1]=id, [2]=desc, [3]=meta
          completed = false; // Default to not completed
          id = match[1];
          description = match[2];
          metaString = match[3] || '';
        }

        // Skip if already added (avoid duplicates from multiple patterns)
        if (criteria.some(c => c.id === id)) {
          continue;
        }

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
    lines.push(`feature: ${userStory.epic}`);  // ✅ FIX: Use 'feature:' not 'epic:' (Universal Hierarchy)
    lines.push(`title: "${userStory.title}"`);
    lines.push(`status: ${userStory.status}`);
    if (userStory.priority) lines.push(`priority: ${userStory.priority}`);
    lines.push(`created: ${userStory.created}`);
    if (userStory.completed) lines.push(`completed: ${userStory.completed}`);

    // Add external tool mapping to frontmatter
    if (userStory.externalToolMapping) {
      lines.push('externalTool:');
      lines.push(`  provider: ${userStory.externalToolMapping.provider}`);
      lines.push(`  type: ${userStory.externalToolMapping.externalType}`);
      lines.push(`  id: "${userStory.externalToolMapping.externalId}"`);
      lines.push(`  url: "${userStory.externalToolMapping.externalUrl}"`);
    }

    lines.push('---');
    lines.push('');

    // Title with external tool indicator
    let titleLine = `# ${userStory.id}: ${userStory.title}`;
    if (userStory.externalToolMapping) {
      const provider = userStory.externalToolMapping.provider.toUpperCase();
      const type = userStory.externalToolMapping.externalType.charAt(0).toUpperCase() +
                   userStory.externalToolMapping.externalType.slice(1);
      titleLine += ` (${provider} ${type}: ${userStory.externalToolMapping.externalId})`;
    }
    lines.push(titleLine);
    lines.push('');

    // Feature link (to _features folder)
    // User story is at: .specweave/docs/internal/specs/{project}/{FS-XXX}/us-*.md
    // Feature is at: .specweave/docs/internal/specs/_features/{FS-XXX}/FEATURE.md
    // From {project}/{FS-XXX}/ we need to go up 2 levels to specs/, then into _features/
    // Relative path: ../../_features/{FS-XXX}/FEATURE.md
    const featureRelativePath = `../../_features/${userStory.epic}/FEATURE.md`;
    lines.push(`**Feature**: [${userStory.epic}](${featureRelativePath})`);
    lines.push('');

    // Description
    if (userStory.description) {
      lines.push(userStory.description);
      lines.push('');
    }
    lines.push('---');
    lines.push('');

    // Acceptance Criteria
    lines.push('## Acceptance Criteria');
    lines.push('');
    if (userStory.acceptanceCriteria && userStory.acceptanceCriteria.length > 0) {
      for (const ac of userStory.acceptanceCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        const priorityText = ac.priority ? ` (${ac.priority}, testable)` : '';
        lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}${priorityText}`);
      }
    } else {
      lines.push('*Acceptance criteria to be extracted from increment specification*');
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // ✅ NEW: Tasks section with checkboxes (project-specific)
    if (userStory.tasks && userStory.tasks.length > 0) {
      lines.push('## Tasks');
      lines.push('');
      for (const task of userStory.tasks) {
        const checkbox = task.completed ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} **${task.id}**: ${task.title}`);
      }
      lines.push('');
      lines.push('> **Note**: Tasks are project-specific. For the full increment task list, see [increment tasks.md](../../../../../increments/${userStory.implementation.increment}/tasks.md)');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Implementation (source reference)
    lines.push('## Implementation');
    lines.push('');
    const incrementLink = userStory.implementation.tasks[0]?.path.replace(/#.*$/, '') || `../../../../../increments/${userStory.implementation.increment}/tasks.md`;
    lines.push(`**Increment**: [${userStory.implementation.increment}](${incrementLink})`);
    lines.push('');
    if (userStory.implementation.tasks.length > 0) {
      lines.push('**Source Tasks**: See increment tasks.md for complete task breakdown');
      lines.push('');
    }

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
    storiesByProject: Map<string, UserStory[]>,
    incrementId?: string
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

    // Detect external tool mapping
    const externalToolMapping = incrementId ? await this.detectExternalToolMapping(incrementId) : undefined;

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
      sourceIncrement: incrementId, // Track the source increment
      externalToolMapping, // Include external tool mapping
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
   * IMPORTANT: This README is created for ALL increments, even without user stories!
   */
  private formatProjectContextFile(
    featureMapping: FeatureMapping,
    projectContext: ProjectContext,
    parsed: ParsedIncrementSpec
  ): string {
    const featurePathUp = featureMapping.projects.length > 1 ? '../../../' : '../../';

    // Determine if this increment has user stories
    const hasUserStories = parsed.userStories && parsed.userStories.length > 0;
    const statusNote = parsed.status === 'abandoned' ? 'abandoned' :
                       parsed.status === 'complete' ? 'complete' : 'in-progress';

    return `---
id: ${featureMapping.featureId}-${projectContext.projectId}
title: "${parsed.title} - ${projectContext.projectName} Implementation"
feature: ${featureMapping.featureId}
project: ${projectContext.projectId}
type: feature-context
status: ${statusNote}
sourceIncrement: ${parsed.incrementId}
---

# ${projectContext.projectName} Implementation: ${parsed.title}

**Feature**: [${featureMapping.featureId}](${featurePathUp}_features/${featureMapping.featureFolder}/FEATURE.md)

## Overview

${parsed.overview}

## ${projectContext.projectName}-Specific Context

This document contains the ${projectContext.projectName} implementation details for the ${parsed.title} feature.

## Tech Stack

${projectContext.techStack.map(t => `- ${t}`).join('\n')}

## User Stories (${projectContext.projectName})

${hasUserStories ? 'User stories for this project are listed below.' : `_This increment has no user stories. See [FEATURE.md](${featurePathUp}_features/${featureMapping.featureFolder}/FEATURE.md) for overview and implementation details._`}

## Dependencies

[Project-specific dependencies will be documented here]

## Architecture Considerations

[${projectContext.projectName}-specific architecture notes]

---

**Source**: [Increment ${parsed.incrementId}](../../../../../increments/${parsed.incrementId})
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

    // Load tasks for linking (LEGACY - for backward compatibility)
    const taskMap = await this.loadTaskReferences(incrementId);

    for (const [project, stories] of storiesByProject.entries()) {
      const userStoryFiles: UserStoryFile[] = [];

      // Get project context for AC and task transformation
      const rawProjectContext = await this.hierarchyMapper.getProjectContext(project);

      for (const userStory of stories) {
        // LEGACY: Find tasks that implement this user story (for backward compatibility)
        const taskReferences = this.findTasksForUserStory(userStory.id, taskMap);

        // ✅ NEW: Generate project-specific tasks with completion status
        const projectSpecificTasks = await this.taskGenerator.generateProjectSpecificTasks(
          incrementId,
          userStory.id,
          rawProjectContext ? {
            id: rawProjectContext.projectId,
            name: rawProjectContext.projectName,
            type: this.detectProjectType(rawProjectContext),
            techStack: rawProjectContext.techStack,
            keywords: rawProjectContext.keywords,
          } : undefined
        );

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

        // ✨ Apply project-specific AC transformation
        let projectSpecificACs = userStory.acceptanceCriteria;
        if (rawProjectContext) {
          // Map ProjectContext to AC generator's expected format
          const acGeneratorContext = {
            id: rawProjectContext.projectId,
            name: rawProjectContext.projectName,
            type: this.detectProjectType(rawProjectContext),
            techStack: rawProjectContext.techStack,
            keywords: rawProjectContext.keywords,
          };

          projectSpecificACs = this.acGenerator.makeProjectSpecific(
            userStory.acceptanceCriteria,
            userStory.id,
            acGeneratorContext
          );
        }

        userStoryFiles.push({
          id: userStory.id,
          epic: featureMapping.featureId, // Feature is the parent
          title: userStory.title,
          status: userStory.status,
          priority: userStory.priority,
          created: new Date().toISOString().split('T')[0],
          completed: userStory.status === 'complete' ? new Date().toISOString().split('T')[0] : undefined,
          description: userStory.description,
          acceptanceCriteria: projectSpecificACs, // ✅ Use project-specific AC
          tasks: projectSpecificTasks, // ✅ NEW: Project-specific tasks with completion status
          implementation: {
            increment: incrementId,
            tasks: taskReferences, // LEGACY: Keep for backward compatibility
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
    // Build YAML frontmatter with external tool mapping
    let yaml = `---
id: ${feature.id}
title: "${feature.title}"
type: ${feature.type}
status: ${feature.status}
priority: ${feature.priority}
created: ${feature.created}
lastUpdated: ${feature.lastUpdated}
projects: [${feature.projects.map(p => `"${p}"`).join(', ')}]
${feature.epic ? `epic: ${feature.epic}` : ''}
${feature.sourceIncrement ? `sourceIncrement: ${feature.sourceIncrement}` : ''}`;

    // Add external tool mapping to frontmatter
    if (feature.externalToolMapping) {
      yaml += `
externalTool:
  provider: ${feature.externalToolMapping.provider}
  type: ${feature.externalToolMapping.externalType}
  id: "${feature.externalToolMapping.externalId}"
  url: "${feature.externalToolMapping.externalUrl}"`;
    }

    yaml += '\n---';

    const storiesByProjectSection = Array.from(feature.userStoriesByProject.entries())
      .map(([project, stories]) => `
### ${project}

${stories.map(s => `- [${s.id}: ${s.title}](${s.filePath}) - ${s.status}`).join('\n')}`)
      .join('\n');

    // Build title with external tool indicator
    let titleLine = `# ${feature.title}`;
    if (feature.externalToolMapping) {
      const provider = feature.externalToolMapping.provider.toUpperCase();
      const type = feature.externalToolMapping.externalType.charAt(0).toUpperCase() +
                   feature.externalToolMapping.externalType.slice(1);
      titleLine += ` (${provider} ${type}: ${feature.externalToolMapping.externalId})`;
    }

    // Add external tool mapping section
    let externalMappingSection = '';
    if (feature.externalToolMapping) {
      externalMappingSection = `
## External Tool Mapping

**Mapped from**: ${feature.externalToolMapping.provider.toUpperCase()} ${feature.externalToolMapping.externalType.charAt(0).toUpperCase() + feature.externalToolMapping.externalType.slice(1)} [${feature.externalToolMapping.externalId}](${feature.externalToolMapping.externalUrl})

> **Note**: ${feature.externalToolMapping.mappingNote}

This SpecWeave Feature corresponds to a ${feature.externalToolMapping.externalType} in ${feature.externalToolMapping.provider.toUpperCase()}. The hierarchy mapping is:
- **SpecWeave**: Feature (${feature.id})
- **${feature.externalToolMapping.provider.toUpperCase()}**: ${feature.externalToolMapping.externalType.charAt(0).toUpperCase() + feature.externalToolMapping.externalType.slice(1)} (${feature.externalToolMapping.externalId})

`;
    }

    // Add source section based on where the feature came from
    let sourceSection = '';
    if (feature.sourceIncrement) {
      sourceSection = `
## Source

This feature was created from increment: [\`${feature.sourceIncrement}\`](../../../../../increments/${feature.sourceIncrement})
`;
    } else if (feature.externalLinks?.github || feature.externalLinks?.jira || feature.externalLinks?.ado) {
      sourceSection = `
## Source

This feature was imported from external tool:
${feature.externalLinks?.github ? `- GitHub: ${feature.externalLinks.github}` : ''}
${feature.externalLinks?.jira ? `- JIRA: ${feature.externalLinks.jira}` : ''}
${feature.externalLinks?.ado ? `- Azure DevOps: ${feature.externalLinks.ado}` : ''}

Note: No explicit feature was specified during import.
`;
    }

    return `${yaml}

${titleLine}
${externalMappingSection}
## Overview

${feature.overview}
${sourceSection}
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
   * Write project context files (README.md for each project)
   * IMPORTANT: Always create README.md even if increment has no user stories!
   * This ensures every increment is represented in living docs, preventing gaps.
   */
  private async writeProjectContextFiles(
    contextFiles: Map<string, string>,
    featureMapping: FeatureMapping
  ): Promise<string[]> {
    const writtenPaths: string[] = [];

    // Write README.md for EVERY project, even if no user stories exist
    for (const [project, content] of contextFiles.entries()) {
      const projectPath = featureMapping.projectPaths.get(project);
      if (!projectPath) {
        console.warn(`   ⚠️  No project path found for ${project}, skipping README`);
        continue;
      }

      // Ensure directory exists
      await fs.ensureDir(projectPath);

      // Write README.md
      const readmePath = path.join(projectPath, 'README.md');
      await fs.writeFile(readmePath, content, 'utf-8');
      writtenPaths.push(readmePath);
    }

    if (writtenPaths.length > 0) {
      console.log(`   ✅ Written README.md to ${writtenPaths.length} project folder(s)`);
    }

    return writtenPaths;
  }

  /**
   * Write user story files by project
   * IMPORTANT: Ensures project folders exist even if no user stories!
   */
  private async writeUserStoryFilesByProject(
    userStoryFilesByProject: Map<string, UserStoryFile[]>,
    featureMapping: FeatureMapping,
    incrementId: string
  ): Promise<Map<string, string[]>> {
    const pathsByProject = new Map<string, string[]>();

    // CRITICAL FIX: Ensure ALL project folders exist, even without user stories
    for (const project of featureMapping.projects) {
      const projectPath = featureMapping.projectPaths.get(project);
      if (!projectPath) {
        console.warn(`   ⚠️  No project path found for ${project}, skipping`);
        continue;
      }

      // Ensure directory exists (even if no stories to write)
      await fs.ensureDir(projectPath);

      const stories = userStoryFilesByProject.get(project) || [];
      const paths: string[] = [];

      // Write user story files (if any exist)
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

    if (totalStories > 0) {
      console.log(`   ✅ Written ${totalStories} user stories to ${featureMapping.projects.length} project(s)`);
    } else {
      console.log(`   ℹ️  No user stories to write, but created ${featureMapping.projects.length} project folder(s)`);
    }

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
        const { story, project } = linkedStory;
        // Use the FS-XXX feature ID from featureMapping, not featureFolder
        const newRelativePath = `../../docs/internal/specs/${project}/${featureMapping.featureId}/${this.generateUserStoryFilename(story.id, story.title)}`;
        const newLinkLine = `**User Story**: [${story.id}: ${story.title}](${newRelativePath})`;

        // Check for existing user story links (old or new format)
        const userStoryLinkPattern = /\*\*User Story\*\*:.*/g;
        const existingLinks = section.match(userStoryLinkPattern);

        if (!existingLinks || existingLinks.length === 0) {
          // No link exists - add new one
          const lines = section.split('\n');
          const headingIndex = lines.findIndex(line => line.match(/^##+ T-\d+:/));
          if (headingIndex >= 0) {
            lines.splice(headingIndex + 1, 0, '', newLinkLine);
            updatedSections.push(lines.join('\n'));
          } else {
            updatedSections.push(section);
          }
        } else {
          // Link(s) exist - update them and remove duplicates/blank lines
          const lines = section.split('\n');
          let foundFirst = false;
          const cleanedLines: string[] = [];
          let consecutiveBlankLines = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Handle user story links
            if (line.includes('**User Story**:')) {
              if (!foundFirst) {
                foundFirst = true;
                cleanedLines.push(newLinkLine); // Replace with updated link
                consecutiveBlankLines = 0;
              }
              // Skip duplicate links
              continue;
            }

            // Handle blank lines (keep max 1 consecutive)
            if (line.trim() === '') {
              consecutiveBlankLines++;
              if (consecutiveBlankLines <= 1) {
                cleanedLines.push(line);
              }
            } else {
              consecutiveBlankLines = 0;
              cleanedLines.push(line);
            }
          }

          updatedSections.push(cleanedLines.join('\n'));
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

  /**
   * Update acceptance criteria status in user stories based on completed tasks
   * This method synchronizes AC checkboxes with task completion status
   */
  public async updateAcceptanceCriteriaStatus(incrementId: string): Promise<void> {
    console.log(`\n📊 Updating acceptance criteria status for increment: ${incrementId}`);

    const incrementPath = path.join(this.projectRoot, '.specweave', 'increments', incrementId);
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const specPath = path.join(incrementPath, 'spec.md');

    if (!await fs.pathExists(tasksPath)) {
      console.log(`   ⚠️  No tasks.md found, skipping AC status update`);
      return;
    }

    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Parse completed tasks and their AC references
    const completedACs = this.extractCompletedAcceptanceCriteria(tasksContent);

    if (completedACs.size === 0) {
      console.log(`   ℹ️  No completed acceptance criteria found`);
      return;
    }

    console.log(`   📝 Found ${completedACs.size} user stories with completed acceptance criteria`);

    // Try to detect the feature folder this increment maps to
    let featureId: string | null = null;
    if (await fs.pathExists(specPath)) {
      const specContent = await fs.readFile(specPath, 'utf-8');
      // Look for feature mapping in frontmatter or content
      const featureMatch = specContent.match(/feature:\s*(FS-[^\s\n]+)/i);
      if (featureMatch) {
        const declaredFeature = featureMatch[1];
        // Try to find the actual feature folder that exists
        featureId = await this.findActualFeatureFolder(incrementId, declaredFeature);
        console.log(`   📁 Feature mapping: ${declaredFeature} → ${featureId || 'not found'}`);
      }
    }

    // Update user story files with completed ACs
    await this.updateUserStoryACStatus(completedACs, incrementId, featureId);
  }

  /**
   * Extract completed acceptance criteria from tasks
   */
  private extractCompletedAcceptanceCriteria(tasksContent: string): Map<string, Set<string>> {
    const completedACs = new Map<string, Set<string>>(); // US-ID -> Set of AC-IDs

    // Split into task sections
    const taskSections = tasksContent.split(/^#{2,3}\s+T-\d+:/m);

    for (const section of taskSections) {
      if (!section.trim()) continue;

      // Check if task is completed
      const statusMatch = section.match(/\*\*Status\*\*:\s*\[x\]/i);
      if (!statusMatch) continue; // Skip incomplete tasks

      // Extract AC field
      const acMatch = section.match(/\*\*AC\*\*:\s*([^\n]+)/);
      if (!acMatch) continue;

      // Parse AC-IDs
      const acIds = acMatch[1].split(/[,\s]+/).filter(id => id.match(/^AC-/));

      for (const acId of acIds) {
        // Determine user story from AC-ID
        // Patterns: AC-US1-01 -> US-001, AC-001 -> US-001 (assume single story)
        let userStoryId = '';

        const usMatch = acId.match(/AC-US(\d+)-/);
        if (usMatch) {
          userStoryId = `US-${usMatch[1].padStart(3, '0')}`;
        } else {
          // For generic AC-XXX format, try to infer from task's user story link
          const usLinkMatch = section.match(/\[US-(\d+):/);
          if (usLinkMatch) {
            userStoryId = `US-${usLinkMatch[1].padStart(3, '0')}`;
          }
        }

        if (userStoryId) {
          if (!completedACs.has(userStoryId)) {
            completedACs.set(userStoryId, new Set());
          }
          completedACs.get(userStoryId)!.add(acId);
        }
      }
    }

    return completedACs;
  }

  /**
   * Update user story files with completed AC status
   */
  private async updateUserStoryACStatus(
    completedACs: Map<string, Set<string>>,
    incrementId: string,
    featureId: string | null = null
  ): Promise<void> {
    const specsPath = path.join(this.projectRoot, '.specweave', 'docs', 'internal', 'specs');

    // Find all user story files
    const projects = await this.getProjectFolders();
    let updatedCount = 0;

    for (const project of projects) {
      const projectSpecsPath = path.join(specsPath, project);

      if (!await fs.pathExists(projectSpecsPath)) continue;

      // Find all feature folders
      const entries = await fs.readdir(projectSpecsPath, { withFileTypes: true });
      let featureFolders = entries.filter(e => e.isDirectory() && e.name.startsWith('FS-'));

      // If we have a specific feature ID, only look in that folder
      if (featureId) {
        featureFolders = featureFolders.filter(e =>
          e.name === featureId || e.name.includes(featureId)
        );
        if (featureFolders.length === 0) {
          console.log(`   ⚠️  Feature folder ${featureId} not found in ${project}`);
        }
      }

      for (const folder of featureFolders) {
        const featurePath = path.join(projectSpecsPath, folder.name);

        // Find all user story files
        const files = await fs.readdir(featurePath);
        const userStoryFiles = files.filter(f => f.match(/^us-\d+-.+\.md$/));

        for (const file of userStoryFiles) {
          const filePath = path.join(featurePath, file);
          const content = await fs.readFile(filePath, 'utf-8');

          // Extract user story ID from content or filename
          const idMatch = content.match(/^id:\s*(US-\d+)/m) || file.match(/us-(\d+)/);
          if (!idMatch) continue;

          const userStoryId = idMatch[1].startsWith('US') ? idMatch[1] : `US-${idMatch[1].padStart(3, '0')}`;

          const acsToComplete = completedACs.get(userStoryId);
          if (!acsToComplete || acsToComplete.size === 0) continue;

          // Update AC checkboxes
          let updatedContent = content;
          let hasUpdates = false;

          for (const acId of acsToComplete) {
            // Find and update the AC checkbox
            // Pattern: - [ ] **AC-XXX**: Description
            const acPattern = new RegExp(
              `^(\\s*-\\s*)\\[\\s\\](\\s*\\*\\*${acId}\\*\\*:.*)$`,
              'gm'
            );

            // Check if pattern exists before replacing
            const originalContent = updatedContent;
            updatedContent = updatedContent.replace(
              acPattern,
              '$1[x]$2'
            );

            // Check if replacement actually happened
            if (originalContent !== updatedContent) {
              hasUpdates = true;
              console.log(`   ✅ Updated ${acId} in ${userStoryId} (${project}/${folder.name})`);
            } else {
              // Debug: pattern didn't match
              console.log(`   ⚠️  Could not find ${acId} in ${userStoryId} (${project}/${folder.name})`);
              // Try to find what format the AC actually has
              const lineWithAc = updatedContent.split('\n').find(line => line.includes(acId));
              if (lineWithAc) {
                console.log(`      Found line: "${lineWithAc}"`);
              }
            }
          }

          if (hasUpdates) {
            await fs.writeFile(filePath, updatedContent, 'utf-8');
            updatedCount++;
          }
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`   ✅ Updated ${updatedCount} user story file(s) with completed acceptance criteria`);
    }
  }

  /**
   * Get all project folders from specs
   */
  private async getProjectFolders(): Promise<string[]> {
    const specsPath = path.join(this.projectRoot, '.specweave', 'docs', 'internal', 'specs');

    if (!await fs.pathExists(specsPath)) {
      return ['default'];
    }

    const entries = await fs.readdir(specsPath, { withFileTypes: true });
    const projectFolders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => e.name);

    return projectFolders.length > 0 ? projectFolders : ['default'];
  }

  /**
   * Detect project type for AC generation (backend, frontend, mobile, infrastructure, generic)
   */
  private detectProjectType(context: ProjectContext): 'backend' | 'frontend' | 'mobile' | 'infrastructure' | 'generic' {
    const projectId = context.projectId.toLowerCase();
    const keywords = context.keywords.map(k => k.toLowerCase());
    const techStack = context.techStack.map(t => t.toLowerCase());

    // Direct match on project ID
    if (projectId.includes('backend') || projectId.includes('api') || projectId.includes('service')) {
      return 'backend';
    }
    if (projectId.includes('frontend') || projectId.includes('web') || projectId.includes('ui')) {
      return 'frontend';
    }
    if (projectId.includes('mobile') || projectId.includes('ios') || projectId.includes('android')) {
      return 'mobile';
    }
    if (projectId.includes('infra') || projectId.includes('devops') || projectId.includes('deployment')) {
      return 'infrastructure';
    }

    // Keyword-based detection
    const backendKeywords = ['api', 'backend', 'service', 'server', 'database'];
    const frontendKeywords = ['frontend', 'ui', 'component', 'react', 'web'];
    const mobileKeywords = ['mobile', 'ios', 'android', 'react-native'];
    const infraKeywords = ['infrastructure', 'devops', 'deployment', 'ci/cd', 'kubernetes'];

    if (keywords.some(k => backendKeywords.includes(k))) return 'backend';
    if (keywords.some(k => frontendKeywords.includes(k))) return 'frontend';
    if (keywords.some(k => mobileKeywords.includes(k))) return 'mobile';
    if (keywords.some(k => infraKeywords.includes(k))) return 'infrastructure';

    // Tech stack-based detection
    const backendTech = ['node.js', 'express', 'postgresql', 'mongodb', 'redis'];
    const frontendTech = ['react', 'next.js', 'vue', 'angular', 'typescript'];
    const mobileTech = ['react native', 'swift', 'kotlin', 'flutter'];
    const infraTech = ['docker', 'kubernetes', 'terraform', 'ansible'];

    if (techStack.some(t => backendTech.some(bt => t.includes(bt)))) return 'backend';
    if (techStack.some(t => frontendTech.some(ft => t.includes(ft)))) return 'frontend';
    if (techStack.some(t => mobileTech.some(mt => t.includes(mt)))) return 'mobile';
    if (techStack.some(t => infraTech.some(it => t.includes(it)))) return 'infrastructure';

    // Default to generic if no match
    return 'generic';
  }

  /**
   * Find the actual feature folder that matches an increment
   * Handles mapping between different naming conventions
   */
  private async findActualFeatureFolder(
    incrementId: string,
    declaredFeature: string
  ): Promise<string | null> {
    const specsPath = path.join(this.projectRoot, '.specweave', 'docs', 'internal', 'specs');
    const projects = await this.getProjectFolders();

    // Extract increment number
    const incrementNum = incrementId.match(/^(\d+)/)?.[1];

    for (const project of projects) {
      const projectPath = path.join(specsPath, project);
      if (!await fs.pathExists(projectPath)) continue;

      const entries = await fs.readdir(projectPath);
      const featureFolders = entries.filter(e => e.startsWith('FS-'));

      // Strategy 1: Direct match
      if (featureFolders.includes(declaredFeature)) {
        return declaredFeature;
      }

      // Strategy 2: Match by increment number (FS-031 for increment 0031)
      if (incrementNum) {
        const paddedNum = incrementNum.padStart(3, '0');
        const numericFeature = `FS-${paddedNum}`;
        if (featureFolders.includes(numericFeature)) {
          return numericFeature;
        }
      }

      // Strategy 3: Match by suffix (e.g., FS-XXX-external-tool-sync matches external-tool-sync)
      const incrementSuffix = incrementId.replace(/^\d+-/, '');
      for (const folder of featureFolders) {
        if (folder.includes(incrementSuffix)) {
          return folder;
        }
      }

      // Strategy 4: Match by date pattern
      if (declaredFeature.match(/^FS-\d{2}-\d{2}-\d{2}-/)) {
        // Find folder with same date prefix
        const datePrefix = declaredFeature.match(/^FS-\d{2}-\d{2}-\d{2}/)?.[0];
        for (const folder of featureFolders) {
          if (folder.startsWith(datePrefix)) {
            return folder;
          }
        }
      }

      // Strategy 5: Smart content-based matching
      // Look for feature folders containing user stories that reference this increment
      for (const folder of featureFolders) {
        const featurePath = path.join(projectPath, folder);
        const files = await fs.readdir(featurePath);
        const userStoryFiles = files.filter(f => f.match(/^us-\d+-.+\.md$/));

        for (const file of userStoryFiles) {
          const filePath = path.join(featurePath, file);
          const content = await fs.readFile(filePath, 'utf-8');

          // Check if this user story references our increment
          if (content.includes(`increments/${incrementId}/`) ||
              content.includes(`Increment**: [${incrementId}]`)) {
            console.log(`   🎯 Found feature folder ${folder} by content match in ${file}`);
            return folder;
          }
        }
      }

      // Strategy 6: Fuzzy match on increment name parts
      // Split increment name into words and look for feature folders with matching words
      const incrementWords = incrementId.toLowerCase().split(/[-_]/);
      let bestMatch: { folder: string; score: number } | null = null;

      for (const folder of featureFolders) {
        const folderWords = folder.toLowerCase().split(/[-_]/);
        let matchScore = 0;

        // Count matching words (ignoring numbers and 'FS' prefix)
        for (const word of incrementWords) {
          if (word.match(/^\d+$/) || word === 'fs') continue;
          if (folderWords.includes(word)) {
            matchScore++;
          }
        }

        // Update best match if this score is better
        if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
          bestMatch = { folder, score: matchScore };
        }
      }

      if (bestMatch && bestMatch.score >= 2) {  // Require at least 2 word matches
        console.log(`   🎯 Found feature folder ${bestMatch.folder} by fuzzy match (score: ${bestMatch.score})`);
        return bestMatch.folder;
      }
    }

    return null;
  }
}
