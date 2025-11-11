/**
 * Spec Splitter - Split Monolithic Specs into Project-Specific Files
 *
 * Takes a comprehensive spec file covering multiple projects and intelligently
 * splits it into project-specific spec files (FE/, BE/, MOBILE/, etc.)
 *
 * @module spec-splitter
 */

import fs from 'fs-extra';
import path from 'path';
import {
  mapUserStoryToProjects,
  splitSpecByProject,
  DEFAULT_PROJECT_RULES,
  type UserStory,
  type ProjectRule
} from './project-mapper.js';

export interface SpecMetadata {
  specId?: string;
  spec_id?: string; // Alternative naming
  title: string;
  version: string;
  status: string;
  created: string;
  lastUpdated?: string;
  last_updated?: string; // Alternative naming
  authors: string[];
  reviewers?: string[];
  priority: string;
  estimatedEffort?: string;
  estimated_effort?: string; // Alternative naming
  targetRelease?: string;
  target_release?: string; // Alternative naming
  jiraSync?: boolean;
  jira_sync?: boolean; // Alternative naming
  jiraProjects?: string[];
  jira_projects?: string[]; // Alternative naming
}

export interface ParsedSpec {
  metadata: SpecMetadata;
  executiveSummary: string;
  problemStatement: string;
  userStories: UserStory[];
  functionalRequirements: string;
  nonFunctionalRequirements: string;
  successMetrics: string;
  technicalArchitecture: string;
  testStrategy: string;
  riskAnalysis: string;
  futureRoadmap: string;
  appendices: string;
}

/**
 * Parse spec file into structured format
 *
 * @param specPath Path to spec.md file
 * @returns Parsed spec structure
 */
export async function parseSpecFile(specPath: string): Promise<ParsedSpec> {
  const content = await fs.readFile(specPath, 'utf-8');

  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('No frontmatter found in spec file');
  }

  const metadata = parseFrontmatter(frontmatterMatch[1]);

  // Extract sections
  const sections = extractSections(content);

  // Parse user stories
  const userStories = parseUserStories(sections.userStories || '');

  return {
    metadata,
    executiveSummary: sections.executiveSummary || '',
    problemStatement: sections.problemStatement || '',
    userStories,
    functionalRequirements: sections.functionalRequirements || '',
    nonFunctionalRequirements: sections.nonFunctionalRequirements || '',
    successMetrics: sections.successMetrics || '',
    technicalArchitecture: sections.technicalArchitecture || '',
    testStrategy: sections.testStrategy || '',
    riskAnalysis: sections.riskAnalysis || '',
    futureRoadmap: sections.futureRoadmap || '',
    appendices: sections.appendices || ''
  };
}

/**
 * Parse YAML frontmatter into metadata object
 */
function parseFrontmatter(frontmatter: string): SpecMetadata {
  const lines = frontmatter.split('\n');
  const metadata: any = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of lines) {
    // Check for array items (starts with -)
    if (currentKey && line.trim().startsWith('-')) {
      const value = line.trim().slice(1).trim();
      currentArray.push(value);
      continue;
    }

    // If we were collecting an array, save it
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    // Parse key: value line
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();

      // Handle arrays (JSON format like ["a", "b"])
      if (value.startsWith('[')) {
        metadata[key] = JSON.parse(value);
      }
      // Handle empty array (key: with nothing after)
      else if (!value || value === '') {
        currentKey = key;
        currentArray = [];
      }
      // Handle boolean
      else if (value === 'true' || value === 'false') {
        metadata[key] = value === 'true';
      }
      // Handle string
      else {
        metadata[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  // Save any remaining array
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }

  return metadata as SpecMetadata;
}

/**
 * Extract sections from spec markdown
 */
function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Split by h2 headers (##)
  const parts = withoutFrontmatter.split(/^## /m);

  for (const part of parts) {
    if (!part.trim()) continue;

    const lines = part.split('\n');
    const sectionName = lines[0].trim();
    const sectionContent = lines.slice(1).join('\n').trim();

    // Normalize section names
    const normalizedName = sectionName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/^(.)/,  (m) => m.toLowerCase());

    sections[normalizedName] = sectionContent;
  }

  return sections;
}

/**
 * Parse user stories from spec section
 */
function parseUserStories(userStoriesSection: string): UserStory[] {
  const stories: UserStory[] = [];

  // Split by h3 headers (###)
  const storyParts = userStoriesSection.split(/^### /m);

  for (const part of storyParts) {
    if (!part.trim()) continue;

    const lines = part.split('\n');
    const titleLine = lines[0].trim();

    // Extract US-XXX: Title
    const match = titleLine.match(/^(US-\d+):\s*(.+?)(?:\s*\(Priority|$)/);
    if (!match) continue;

    const id = match[1];
    const title = match[2].trim();

    // Extract description (As a... I want... So that...)
    const descriptionMatch = part.match(/\*\*As a\*\*\s+(.+?)\n\*\*I want\*\*\s+(.+?)\n\*\*So that\*\*\s+(.+?)(?:\n|$)/s);
    const description = descriptionMatch
      ? `As a ${descriptionMatch[1].trim()} I want ${descriptionMatch[2].trim()} So that ${descriptionMatch[3].trim()}`
      : '';

    // Extract acceptance criteria
    const acceptanceCriteria: string[] = [];
    const acMatches = part.matchAll(/\*\*AC-[A-Z0-9-]+\*\*:\s*(.+?)(?:\n-|\n\*\*|$)/gs);
    for (const acMatch of acMatches) {
      acceptanceCriteria.push(acMatch[1].trim());
    }

    // Extract technical context (if present)
    const technicalContextMatch = part.match(/#### Technical Context\n\n([\s\S]+?)(?:\n####|\n---|\n###|$)/);
    const technicalContext = technicalContextMatch ? technicalContextMatch[1].trim() : undefined;

    stories.push({
      id,
      title,
      description,
      acceptanceCriteria,
      technicalContext
    });
  }

  return stories;
}

/**
 * Split spec into project-specific files
 *
 * @param specPath Path to monolithic spec.md
 * @param outputDir Directory to write project-specific specs (e.g., .specweave/docs/internal/specs/)
 * @param projectRules Custom project mapping rules (optional)
 * @returns Map of projectId → output file path
 */
export async function splitSpecIntoProjects(
  specPath: string,
  outputDir: string,
  projectRules: ProjectRule[] = DEFAULT_PROJECT_RULES
): Promise<Map<string, string>> {
  // Parse spec
  const parsedSpec = await parseSpecFile(specPath);

  // Split user stories by project
  const projectStories = splitSpecByProject(parsedSpec.userStories, projectRules);

  // Create output map
  const outputMap = new Map<string, string>();

  // Generate project-specific specs
  for (const [projectId, stories] of projectStories.entries()) {
    const projectDir = path.join(outputDir, projectId);
    await fs.ensureDir(projectDir);

    const specId = (parsedSpec.metadata.specId || parsedSpec.metadata.spec_id || '0001').replace(/^SPEC-/, '');
    const outputPath = path.join(projectDir, `spec-${specId.toLowerCase()}-${projectId.toLowerCase()}.md`);

    const projectSpec = generateProjectSpec(parsedSpec, projectId, stories);

    await fs.writeFile(outputPath, projectSpec, 'utf-8');

    outputMap.set(projectId, outputPath);
  }

  return outputMap;
}

/**
 * Generate project-specific spec file
 */
function generateProjectSpec(
  parsedSpec: ParsedSpec,
  projectId: string,
  userStories: UserStory[]
): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`spec_id: ${parsedSpec.metadata.specId}`);
  lines.push(`project: ${projectId}`);
  lines.push(`title: "${parsedSpec.metadata.title} - ${projectId}"`);
  lines.push(`version: ${parsedSpec.metadata.version}`);
  lines.push(`status: ${parsedSpec.metadata.status}`);
  lines.push(`created: ${parsedSpec.metadata.created}`);
  lines.push(`last_updated: ${parsedSpec.metadata.lastUpdated}`);
  lines.push(`authors:`);
  for (const author of parsedSpec.metadata.authors) {
    lines.push(`  - ${author}`);
  }
  lines.push(`priority: ${parsedSpec.metadata.priority}`);
  lines.push(`estimated_effort: ${parsedSpec.metadata.estimatedEffort}`);
  lines.push(`target_release: ${parsedSpec.metadata.targetRelease}`);
  if (parsedSpec.metadata.jiraSync) {
    lines.push(`jira_sync: true`);
    lines.push(`jira_project: ${projectId}`);
  }
  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# SPEC-${parsedSpec.metadata.specId}: ${parsedSpec.metadata.title} - ${projectId}`);
  lines.push('');

  // Executive Summary (project-specific)
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`**Project**: ${projectId}`);
  lines.push(`**Scope**: ${userStories.length} user stories for ${projectId} component`);
  lines.push('');
  lines.push(parsedSpec.executiveSummary);
  lines.push('');

  // User Stories (filtered for this project)
  lines.push('## User Stories');
  lines.push('');

  for (const story of userStories) {
    lines.push(`### ${story.id}: ${story.title}`);
    lines.push('');
    lines.push(story.description);
    lines.push('');

    if (story.acceptanceCriteria.length > 0) {
      lines.push('#### Acceptance Criteria');
      lines.push('');
      for (const ac of story.acceptanceCriteria) {
        lines.push(`**${ac}**`);
        lines.push('');
      }
    }

    if (story.technicalContext) {
      lines.push('#### Technical Context');
      lines.push('');
      lines.push(story.technicalContext);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Shared sections (include full content from original spec)
  if (parsedSpec.functionalRequirements) {
    lines.push('## Functional Requirements (Shared)');
    lines.push('');
    lines.push('*See main spec for complete functional requirements*');
    lines.push('');
  }

  if (parsedSpec.nonFunctionalRequirements) {
    lines.push('## Non-Functional Requirements (Shared)');
    lines.push('');
    lines.push('*See main spec for complete non-functional requirements*');
    lines.push('');
  }

  if (parsedSpec.technicalArchitecture) {
    lines.push('## Technical Architecture');
    lines.push('');
    lines.push(parsedSpec.technicalArchitecture);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('**Document End**');
  lines.push('');

  return lines.join('\n');
}

/**
 * Create multi-project folder structure
 *
 * @param specsDir Base specs directory (.specweave/docs/internal/specs/)
 * @param projectIds Array of project IDs (e.g., ['FE', 'BE', 'MOBILE'])
 */
export async function createMultiProjectFolderStructure(
  specsDir: string,
  projectIds: string[]
): Promise<void> {
  await fs.ensureDir(specsDir);

  for (const projectId of projectIds) {
    const projectDir = path.join(specsDir, projectId);
    await fs.ensureDir(projectDir);

    // Create README.md for project
    const readme = `# ${projectId} Specifications

This folder contains specifications for the **${projectId}** project.

## Organization

- \`spec-NNNN-*.md\` - Project-specific specifications (living docs)
- Each spec is permanently archived here after increment completion
- Specs are auto-generated from increment specs and split by project

## External Sync

${projectId} specs sync to:
- **JIRA**: Project ${projectId} (Epics)
- **GitHub**: Issues tagged with \`${projectId}\` label

## Maintenance

- Specs are auto-updated via living docs sync hooks
- Manual edits should be made in increment specs, not here
`;

    await fs.writeFile(path.join(projectDir, 'README.md'), readme, 'utf-8');
  }
}
