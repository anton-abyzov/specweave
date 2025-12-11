import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { Logger, consoleLogger } from './logger.js';

/**
 * AC Embedder Utility
 *
 * Embeds Acceptance Criteria from living docs into increment spec.md
 *
 * **Why this exists**: The AC sync hook requires ACs to be in spec.md.
 * Even when using `structure: user-stories` with external living docs,
 * ACs MUST be duplicated in spec.md for sync to work.
 *
 * **Usage**:
 * - Called by spec generators after creating spec.md
 * - Called by validation hooks to fix missing ACs
 * - Called manually via `/sw:embed-acs`
 *
 * **See**: ADR-0062 (AC Embedding Architecture)
 */

export interface ACEmbedderOptions {
  logger?: Logger;
  /**
   * If true, only validates ACs exist without modifying files
   */
  dryRun?: boolean;
}

export interface UserStoryAC {
  id: string;  // e.g., "AC-US1-01"
  title: string;
  description?: string;
  priority?: string;
  testable?: boolean;
}

export interface UserStoryInfo {
  id: string;  // e.g., "US-001"
  title: string;
  acs: UserStoryAC[];
  filePath: string;
}

/**
 * Extract ACs from a single User Story markdown file
 */
export function extractACsFromUserStory(filePath: string, logger: Logger = consoleLogger): UserStoryInfo | null {
  if (!existsSync(filePath)) {
    logger.warn(`User story file not found: ${filePath}`);
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');

  // Extract US ID from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    logger.warn(`No frontmatter found in ${filePath}`);
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const idMatch = frontmatter.match(/^id:\s*["']?([^"'\n]+)["']?$/m);
  const titleMatch = frontmatter.match(/^title:\s*["']?([^"'\n]+)["']?$/m);

  if (!idMatch) {
    logger.warn(`No 'id' field in frontmatter: ${filePath}`);
    return null;
  }

  const usId = idMatch[1].trim();
  const title = titleMatch ? titleMatch[1].trim() : usId;

  // Extract ACs from markdown body
  const acs: UserStoryAC[] = [];
  const acRegex = /^### (AC-US\d+-\d+):\s*(.+)$/gm;

  let match;
  while ((match = acRegex.exec(content)) !== null) {
    const acId = match[1];
    const acTitle = match[2];

    // Extract additional metadata if present
    const acSection = content.substring(match.index, content.indexOf('\n###', match.index + 1));
    const priorityMatch = acSection.match(/\*\*Priority\*\*:\s*(\w+)/);
    const testableMatch = acSection.match(/\*\*Testable\*\*:\s*(\w+)/);

    acs.push({
      id: acId,
      title: acTitle,
      priority: priorityMatch ? priorityMatch[1] : undefined,
      testable: testableMatch ? testableMatch[1].toLowerCase() === 'yes' : undefined,
    });
  }

  if (acs.length === 0) {
    logger.warn(`No ACs found in ${filePath}`);
    return null;
  }

  return {
    id: usId,
    title,
    acs,
    filePath,
  };
}

/**
 * Format ACs as markdown checkboxes for spec.md
 */
export function formatACsAsMarkdown(userStories: UserStoryInfo[]): string {
  let markdown = '## Acceptance Criteria\n\n<!-- Auto-synced from living docs -->\n\n';

  for (const us of userStories) {
    markdown += `### ${us.id}: ${us.title}\n\n`;

    for (const ac of us.acs) {
      markdown += `- [ ] **${ac.id}**: ${ac.title}\n`;
    }

    markdown += '\n';
  }

  return markdown;
}

/**
 * Embed ACs from living docs into increment spec.md
 *
 * @param incrementPath - Path to increment directory (e.g., ".specweave/increments/0050-feature")
 * @param livingDocsPath - Path to living docs directory (e.g., ".specweave/docs/internal/specs/specweave/FS-048")
 * @param options - Embedding options
 * @returns Number of ACs embedded, or -1 if error
 */
export async function embedACsFromLivingDocs(
  incrementPath: string,
  livingDocsPath: string,
  options: ACEmbedderOptions = {}
): Promise<number> {
  const logger = options.logger ?? consoleLogger;

  logger.log(`Embedding ACs from living docs: ${livingDocsPath}`);

  // 1. Read spec.md to find which user stories are included
  const specPath = join(incrementPath, 'spec.md');
  if (!existsSync(specPath)) {
    logger.error(`spec.md not found: ${specPath}`);
    return -1;
  }

  const specContent = readFileSync(specPath, 'utf-8');

  // Extract user_stories from frontmatter
  const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    logger.error('No frontmatter found in spec.md');
    return -1;
  }

  const frontmatter = frontmatterMatch[1];
  const userStoriesMatch = frontmatter.match(/user_stories:\s*\n((?:  - US-\d+\n?)+)/);

  if (!userStoriesMatch) {
    logger.warn('No user_stories field in frontmatter');
    return -1;
  }

  const userStoryIds = userStoriesMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- US-'))
    .map(line => line.replace('- ', ''));

  logger.log(`Found ${userStoryIds.length} user stories in spec.md frontmatter`);

  // 2. Read each user story file from living docs
  const userStories: UserStoryInfo[] = [];

  for (const usId of userStoryIds) {
    // Try multiple file naming patterns
    const possiblePaths = [
      join(livingDocsPath, `${usId.toLowerCase()}.md`),
      join(livingDocsPath, `us-${usId.toLowerCase().replace('us-', '')}.md`),
      join(livingDocsPath, `${usId.toLowerCase()}-*.md`),
    ];

    let found = false;
    for (const pattern of possiblePaths) {
      if (pattern.includes('*')) {
        // Glob pattern - need to find matching files
        const { sync: globSync } = await import('glob');
        const matches = globSync(pattern);
        if (matches.length > 0) {
          const usInfo = extractACsFromUserStory(matches[0], logger);
          if (usInfo) {
            userStories.push(usInfo);
            found = true;
            break;
          }
        }
      } else if (existsSync(pattern)) {
        const usInfo = extractACsFromUserStory(pattern, logger);
        if (usInfo) {
          userStories.push(usInfo);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      logger.warn(`User story file not found for ${usId} in ${livingDocsPath}`);
    }
  }

  if (userStories.length === 0) {
    logger.error('No user story files found in living docs');
    return -1;
  }

  logger.log(`Extracted ACs from ${userStories.length} user stories`);

  // 3. Format ACs as markdown
  const acMarkdown = formatACsAsMarkdown(userStories);
  const totalACs = userStories.reduce((sum, us) => sum + us.acs.length, 0);

  logger.log(`Formatted ${totalACs} ACs for embedding`);

  // 4. Dry run - just validate
  if (options.dryRun) {
    logger.log('[DRY RUN] Would embed ACs into spec.md');
    return totalACs;
  }

  // 5. Insert ACs into spec.md (before the final line or after "Implementation Summary")
  // Check if ACs already exist
  if (specContent.includes('## Acceptance Criteria')) {
    logger.warn('spec.md already contains Acceptance Criteria section - skipping');
    return totalACs;
  }

  // Find insertion point (after "Implementation Summary" or before end)
  const insertionPoints = [
    specContent.lastIndexOf('## Implementation Summary'),
    specContent.lastIndexOf('**See**:'),
    specContent.length - 1,
  ];

  let insertionIndex = insertionPoints.find(idx => idx !== -1 && idx > 0) ?? specContent.length - 1;

  // Find end of section (next ## or end of file)
  const nextSectionIndex = specContent.indexOf('\n##', insertionIndex + 1);
  if (nextSectionIndex !== -1) {
    insertionIndex = nextSectionIndex;
  } else {
    // Insert before final line
    insertionIndex = specContent.lastIndexOf('\n') + 1;
  }

  const updatedContent =
    specContent.substring(0, insertionIndex) +
    '\n---\n\n' +
    acMarkdown +
    specContent.substring(insertionIndex);

  // Write back (would use Edit tool in agent context)
  const { writeFileSync } = await import('fs');
  writeFileSync(specPath, updatedContent, 'utf-8');

  logger.log(`✅ Embedded ${totalACs} ACs into spec.md`);

  return totalACs;
}

/**
 * Validate that spec.md contains all required ACs
 *
 * @param specPath - Path to spec.md
 * @param expectedACCount - Expected number of ACs (from metadata.json)
 * @returns true if valid, false otherwise
 */
export function validateACsInSpec(specPath: string, expectedACCount: number, logger: Logger = consoleLogger): boolean {
  if (!existsSync(specPath)) {
    logger.error(`spec.md not found: ${specPath}`);
    return false;
  }

  const content = readFileSync(specPath, 'utf-8');

  // Count ACs in spec.md
  const acMatches = content.match(/^- \[[x ]\] \*\*AC-US\d+-\d+\*\*/gm);
  const actualCount = acMatches ? acMatches.length : 0;

  if (actualCount === 0) {
    logger.error(`❌ spec.md contains 0 ACs (expected ${expectedACCount})`);
    return false;
  }

  if (actualCount !== expectedACCount) {
    logger.warn(`⚠️  AC count mismatch: spec.md has ${actualCount} ACs, metadata.json expects ${expectedACCount}`);
    return false;
  }

  logger.log(`✅ spec.md contains ${actualCount} ACs (matches metadata.json)`);
  return true;
}
