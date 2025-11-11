/**
 * Spec Content Synchronization
 *
 * Syncs spec CONTENT (title, description, user stories) to external tools.
 * Does NOT sync STATUS - that's managed by external tool.
 *
 * Sync Direction:
 * - Title/Description/User Stories: SpecWeave → External Tool (we update)
 * - Status/State: External Tool → SpecWeave (we read)
 */

import fs from 'fs/promises';
import path from 'path';

export interface SpecContent {
  id: string; // spec-001
  title: string;
  description: string;
  userStories: SpecUserStory[];
  metadata: {
    priority?: string;
    tags?: string[];
    githubProject?: string;
    jiraEpic?: string;
    adoFeature?: string;
  };
}

export interface SpecUserStory {
  id: string; // US-001
  title: string;
  acceptanceCriteria: SpecAcceptanceCriterion[];
}

export interface SpecAcceptanceCriterion {
  id: string; // AC-US1-01
  description: string;
  completed: boolean;
  priority?: string;
  testable: boolean;
}

export interface ContentSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'no-change' | 'error';
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

/**
 * Parse spec.md to extract content
 */
export async function parseSpecContent(specPath: string): Promise<SpecContent | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');

    // Extract spec ID from filename
    // spec-001-feature-name.md → spec-001
    const filename = path.basename(specPath);
    const specIdMatch = filename.match(/^(spec-\d+)/);
    const specId = specIdMatch ? specIdMatch[1] : 'unknown';

    // Extract title (first heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/^SPEC-\d+:\s*/, '') : 'Untitled';

    // Extract description (text between title and first ## heading)
    const descMatch = content.match(/^#\s+.+\n\n(.+?)(?=\n##|\n---|\n\*\*|$)/s);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract metadata from frontmatter or body
    const metadata: SpecContent['metadata'] = {};

    // GitHub Project
    const githubMatch = content.match(/\*\*GitHub Project\*\*:\s*(.+)/);
    if (githubMatch) metadata.githubProject = githubMatch[1].trim();

    // JIRA Epic
    const jiraMatch = content.match(/\*\*JIRA Epic\*\*:\s*(.+)/);
    if (jiraMatch) metadata.jiraEpic = jiraMatch[1].trim();

    // ADO Feature
    const adoMatch = content.match(/\*\*ADO Feature\*\*:\s*(.+)/);
    if (adoMatch) metadata.adoFeature = adoMatch[1].trim();

    // Priority
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*(P\d)/);
    if (priorityMatch) metadata.priority = priorityMatch[1];

    // Parse user stories
    const userStories: SpecUserStory[] = [];

    // Match user story patterns: **US-001**: Title
    const userStoryRegex = /\*\*US-(\d+)\*\*:\s*(.+)/g;
    const usMatches = [...content.matchAll(userStoryRegex)];

    for (const usMatch of usMatches) {
      const usNumber = usMatch[1];
      const usId = `US-${usNumber}`;
      const usTitle = usMatch[2].trim();

      // Find acceptance criteria for this user story
      const acRegex = new RegExp(
        `- \\[([ x])\\] \\*\\*AC-US${usNumber}-(\\d+)\\*\\*:\\s*([^(]+)(?:\\(([^)]+)\\))?`,
        'g'
      );

      const acceptanceCriteria: SpecAcceptanceCriterion[] = [];
      const acMatches = [...content.matchAll(acRegex)];

      for (const acMatch of acMatches) {
        const completed = acMatch[1] === 'x';
        const acNumber = acMatch[2];
        const acDescription = acMatch[3].trim();
        const acMetadata = acMatch[4] || '';

        acceptanceCriteria.push({
          id: `AC-US${usNumber}-${acNumber}`,
          description: acDescription,
          completed,
          priority: acMetadata.includes('P1') ? 'P1' : acMetadata.includes('P2') ? 'P2' : undefined,
          testable: acMetadata.includes('testable'),
        });
      }

      userStories.push({
        id: usId,
        title: usTitle,
        acceptanceCriteria,
      });
    }

    return {
      id: specId,
      title,
      description,
      userStories,
      metadata,
    };
  } catch (error: any) {
    console.error(`Failed to parse spec: ${error.message}`);
    return null;
  }
}

/**
 * Detect changes between local spec and external tool
 */
export function detectContentChanges(
  localSpec: SpecContent,
  externalContent: {
    title: string;
    description: string;
    userStoryCount: number;
  }
): {
  hasChanges: boolean;
  changes: string[];
} {
  const changes: string[] = [];

  // Title changed
  if (localSpec.title !== externalContent.title) {
    changes.push(`title: "${externalContent.title}" → "${localSpec.title}"`);
  }

  // Description changed (normalize whitespace for comparison)
  const normalizeDesc = (str: string) => str.replace(/\s+/g, ' ').trim();
  if (normalizeDesc(localSpec.description) !== normalizeDesc(externalContent.description)) {
    changes.push('description updated');
  }

  // User stories changed
  if (localSpec.userStories.length !== externalContent.userStoryCount) {
    changes.push(`user stories: ${externalContent.userStoryCount} → ${localSpec.userStories.length}`);
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}

/**
 * Build external tool description from spec content
 */
export function buildExternalDescription(spec: SpecContent): string {
  let description = '';

  // Add spec description
  if (spec.description) {
    description += spec.description + '\n\n';
  }

  // Add user stories as checklist
  if (spec.userStories.length > 0) {
    description += '## User Stories\n\n';

    for (const us of spec.userStories) {
      description += `### ${us.id}: ${us.title}\n\n`;

      if (us.acceptanceCriteria.length > 0) {
        description += '**Acceptance Criteria:**\n';
        for (const ac of us.acceptanceCriteria) {
          const checkbox = ac.completed ? '[x]' : '[ ]';
          description += `- ${checkbox} ${ac.id}: ${ac.description}\n`;
        }
        description += '\n';
      }
    }
  }

  // Add metadata
  if (spec.metadata.priority) {
    description += `\n**Priority:** ${spec.metadata.priority}\n`;
  }

  return description;
}

/**
 * Check if spec has external tool link
 */
export async function hasExternalLink(
  specPath: string,
  provider: 'github' | 'jira' | 'ado'
): Promise<string | null> {
  try {
    const content = await fs.readFile(specPath, 'utf-8');

    switch (provider) {
      case 'github':
        const githubMatch = content.match(/\*\*GitHub Project\*\*:\s*(.+)/);
        return githubMatch ? githubMatch[1].trim() : null;

      case 'jira':
        const jiraMatch = content.match(/\*\*JIRA Epic\*\*:\s*([A-Z]+-\d+)/);
        return jiraMatch ? jiraMatch[1] : null;

      case 'ado':
        const adoMatch = content.match(/\*\*ADO Feature\*\*:\s*#?(\d+)/);
        return adoMatch ? adoMatch[1] : null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Update spec.md with external tool link
 */
export async function updateSpecWithExternalLink(
  specPath: string,
  provider: 'github' | 'jira' | 'ado',
  externalId: string,
  externalUrl: string
): Promise<void> {
  try {
    let content = await fs.readFile(specPath, 'utf-8');

    const linkText = {
      github: `**GitHub Project**: ${externalUrl}`,
      jira: `**JIRA Epic**: ${externalId}`,
      ado: `**ADO Feature**: #${externalId}`,
    }[provider];

    // Add link after title if not present
    if (!content.includes(linkText.split(':')[0])) {
      // Find first heading
      const titleMatch = content.match(/^(#\s+.+\n)/m);
      if (titleMatch) {
        const insertPos = titleMatch.index! + titleMatch[0].length;
        content =
          content.slice(0, insertPos) +
          '\n' +
          linkText +
          '\n' +
          content.slice(insertPos);
      } else {
        // Add at top
        content = linkText + '\n\n' + content;
      }

      await fs.writeFile(specPath, content);
    }
  } catch (error: any) {
    console.error(`Failed to update spec with external link: ${error.message}`);
  }
}

/**
 * Get spec modification time
 */
export async function getSpecModificationTime(specPath: string): Promise<Date> {
  const stats = await fs.stat(specPath);
  return stats.mtime;
}

/**
 * Check if spec was modified since last sync
 */
export async function wasSpecModifiedSinceSync(
  specPath: string,
  lastSyncTime?: Date
): Promise<boolean> {
  if (!lastSyncTime) {
    return true; // No previous sync
  }

  const modTime = await getSpecModificationTime(specPath);
  return modTime > lastSyncTime;
}
