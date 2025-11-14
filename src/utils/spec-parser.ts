/**
 * SpecWeave Spec Parser Utilities
 *
 * Parses increment and living docs specifications to extract structured data.
 *
 * Key responsibilities:
 * - Extract user stories from markdown
 * - Parse increment specs (temporary, implementation-focused)
 * - Parse living docs specs (permanent, epic-level)
 * - Generate links to related documentation (avoid duplication)
 * - Merge user stories intelligently
 *
 * @author SpecWeave Team
 * @version 2.0.0
 */

import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User story with acceptance criteria
 */
export interface UserStory {
  id: string; // US-001, US-002, etc.
  title: string;
  description: string; // Full markdown description
  acceptanceCriteria: AcceptanceCriterion[];
  implementedIn?: string; // Increment ID (e.g., "0001-core-framework")
  status: 'pending' | 'in-progress' | 'complete';
  epic?: string; // Epic name (e.g., "Epic 1: CLI Framework")
  priority?: string; // P0, P1, P2, P3
}

/**
 * Acceptance criterion
 */
export interface AcceptanceCriterion {
  id: string; // AC-US1-01, AC-US1-02, etc.
  description: string;
  priority?: string; // P1, P2, P3
  testable: boolean;
  completed: boolean;
}

/**
 * Implementation history entry
 */
export interface ImplementationHistoryEntry {
  increment: string; // Increment ID (e.g., "0001-core-framework")
  stories: string[]; // User story IDs (e.g., ["US-001", "US-002"])
  status: 'complete' | 'in-progress' | 'planned';
  date?: string; // ISO date string
  notes?: string;
}

/**
 * Related documentation links
 */
export interface RelatedDocs {
  architecture: string[]; // Links to architecture/*.md
  adrs: string[]; // Links to adr/*.md
  strategy: string[]; // Links to strategy/*.md
  operations: string[]; // Links to operations/*.md
  delivery: string[]; // Links to delivery/*.md
}

/**
 * External tool links
 */
export interface ExternalLinks {
  github?: string; // GitHub Project URL
  jira?: string; // Jira Epic URL
  ado?: string; // Azure DevOps Feature URL
}

/**
 * Increment spec structure (temporary, implementation-focused)
 */
export interface IncrementSpec {
  id: string; // Increment ID (e.g., "0001-core-framework")
  title: string;
  overview: string;
  implementsSpec?: string; // Living docs spec ID (e.g., "SPEC-001")
  userStories: UserStory[];
  outOfScope?: string[]; // User story IDs deferred to future increments
  architecture?: string; // Raw markdown (will be discarded during sync)
  adrs?: string[]; // Raw markdown (will be discarded during sync)
  priority?: string;
  status?: string;
}

/**
 * Living docs spec structure (permanent, epic-level)
 */
export interface LivingDocsSpec {
  id: string; // Spec ID (e.g., "SPEC-001")
  title: string;
  featureArea: string; // Category (e.g., "Foundation & Plugin System")
  overview: string;
  userStories: UserStory[];
  implementationHistory: ImplementationHistoryEntry[];
  relatedDocs: RelatedDocs;
  externalLinks: ExternalLinks;
  priority?: string;
  status?: string;
  created?: string;
  lastUpdated?: string;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse increment spec.md into structured data
 *
 * Extracts user stories, acceptance criteria, and metadata.
 * Discards architecture details (those belong in architecture/ folder).
 */
export async function parseIncrementSpec(filePath: string): Promise<IncrementSpec> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Extract metadata from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let metadata: any = {};

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        metadata[key.trim()] = value;
      }
    }
  }

  // Extract title (from frontmatter or first heading)
  let title = metadata.title || '';
  if (!title) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }

  // Extract overview (first paragraph after title)
  const overviewMatch = content.match(/##\s+Overview\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
  const overview = overviewMatch ? overviewMatch[1].trim() : '';

  // Extract user stories
  const userStories = extractUserStories(content);

  // Extract "Implements" reference
  const implementsMatch = content.match(/\*\*Implements\*\*:\s*(?:\[)?SPEC-(\d+)/i);
  const implementsSpec = implementsMatch ? `SPEC-${implementsMatch[1]}` : undefined;

  // Extract out of scope
  const outOfScopeMatch = content.match(/##\s+Out of Scope[\s\S]*?\n([\s\S]*?)(?=\n##|\Z)/i);
  const outOfScope: string[] = [];
  if (outOfScopeMatch) {
    const outOfScopeText = outOfScopeMatch[1];
    const storyMatches = outOfScopeText.matchAll(/US-(\d+)/g);
    for (const match of storyMatches) {
      outOfScope.push(`US-${match[1]}`);
    }
  }

  return {
    id: metadata.increment || path.basename(path.dirname(filePath)),
    title: title.replace(/^Increment \d+:\s*/, ''),
    overview,
    implementsSpec,
    userStories,
    outOfScope,
    priority: metadata.priority,
    status: metadata.status,
  };
}

/**
 * Parse living docs spec.md into structured data
 */
export async function parseLivingDocsSpec(filePath: string): Promise<LivingDocsSpec> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Extract metadata from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let metadata: any = {};

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        metadata[key.trim()] = value;
      }
    }
  }

  // Extract title
  let title = metadata.title || '';
  if (!title) {
    const titleMatch = content.match(/^#\s+SPEC-\d+:\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }

  // Extract spec ID
  const specIdMatch = content.match(/^#\s+(SPEC-\d+)/m) || content.match(/id:\s*(SPEC-\d+)/i);
  const id = specIdMatch ? specIdMatch[1] : metadata.id || '';

  // Extract feature area
  const featureAreaMatch = content.match(/\*\*Feature Area\*\*:\s*(.+)/);
  const featureArea = featureAreaMatch ? featureAreaMatch[1].trim() : '';

  // Extract overview
  const overviewMatch = content.match(/##\s+Overview\s*\n+([\s\S]*?)(?=\n##|\n---|\Z)/i);
  const overview = overviewMatch ? overviewMatch[1].trim() : '';

  // Extract user stories
  const userStories = extractUserStories(content);

  // Extract implementation history
  const implementationHistory = extractImplementationHistory(content);

  // Extract related docs (links only)
  const relatedDocs = extractRelatedDocs(content);

  // Extract external links
  const externalLinks = extractExternalLinks(content);

  return {
    id,
    title,
    featureArea,
    overview,
    userStories,
    implementationHistory,
    relatedDocs,
    externalLinks,
    priority: metadata.priority,
    status: metadata.status,
    created: metadata.created,
    lastUpdated: metadata.last_updated || new Date().toISOString().split('T')[0],
  };
}

/**
 * Extract user stories from markdown content
 *
 * Supports formats:
 * - **US-001**: Description
 * - ### US-001: Title
 * - **US1**: Description (legacy)
 */
export function extractUserStories(markdown: string): UserStory[] {
  const stories: UserStory[] = [];

  // Find all user story sections
  // Pattern 1: ### US-001: Title (most common in living docs)
  // Pattern 2: **US-001**: Description (common in increment specs)
  const storyPattern = /(?:###\s+US-(\d+):\s*(.+)|\\*\\*US-(\d+)\\*\\*:\s*As a\s+(.+?)(?=\n\n|\n\\*\\*|\\Z))/gs;

  let match;
  while ((match = storyPattern.exec(markdown)) !== null) {
    const storyId = match[1] || match[3];
    const storyTitle = match[2] || '';
    const storyDescription = match[4] || '';

    if (!storyId) continue;

    const id = `US-${storyId.padStart(3, '0')}`;

    // Find the full story content
    const storyStartIndex = match.index;
    const nextStoryMatch = markdown.slice(storyStartIndex + match[0].length).match(/(?:###\s+US-\d+|\\*\\*US-\d+\\*\\*)/);
    const storyEndIndex = nextStoryMatch
      ? storyStartIndex + match[0].length + nextStoryMatch.index
      : markdown.length;

    const storyContent = markdown.slice(storyStartIndex, storyEndIndex);

    // Extract acceptance criteria
    const acceptanceCriteria = extractAcceptanceCriteria(storyContent, id);

    // Extract epic (if present)
    const epicMatch = markdown.slice(0, storyStartIndex).match(/###\s+(Epic\s+\d+:[^\n]+)/g);
    const epic = epicMatch ? epicMatch[epicMatch.length - 1].replace(/^###\s+/, '') : undefined;

    // Extract priority
    const priorityMatch = storyContent.match(/Priority:\s*(P[0-3])/i);
    const priority = priorityMatch ? priorityMatch[1] : undefined;

    // Determine status (check if all ACs are completed)
    const allCompleted = acceptanceCriteria.length > 0 && acceptanceCriteria.every(ac => ac.completed);
    const anyInProgress = acceptanceCriteria.some(ac => !ac.completed);
    const status = allCompleted ? 'complete' : anyInProgress ? 'in-progress' : 'pending';

    // Extract implementation reference
    const implementedInMatch = storyContent.match(/\\*\\*Implementation\\*\\*:\s*Increment\s+(\d{4}-[a-z0-9-]+)/i);
    const implementedIn = implementedInMatch ? implementedInMatch[1] : undefined;

    stories.push({
      id,
      title: storyTitle.trim() || storyDescription.split('\n')[0].trim(),
      description: storyContent.trim(),
      acceptanceCriteria,
      epic,
      priority,
      status,
      implementedIn,
    });
  }

  return stories;
}

/**
 * Extract acceptance criteria from user story content
 */
function extractAcceptanceCriteria(storyContent: string, storyId: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];

  // Pattern: - [ ] **AC-US1-01**: Description (P1, Testable: Yes)
  // Pattern: - [x] **AC-US1-01**: Description
  const acPattern = /- \[([ xX])\]\s+\*\*AC-([^:]+)\*\*:\s*(.+?)(?:\((.+?)\))?$/gm;

  let match;
  while ((match = acPattern.exec(storyContent)) !== null) {
    const completed = match[1].toLowerCase() === 'x';
    const acId = `AC-${match[2]}`;
    const description = match[3].trim();
    const metadata = match[4] || '';

    // Extract priority and testable flag from metadata
    const priorityMatch = metadata.match(/P[0-3]/);
    const priority = priorityMatch ? priorityMatch[0] : undefined;

    const testableMatch = metadata.match(/Testable:\s*(Yes|No)/i);
    const testable = testableMatch ? testableMatch[1].toLowerCase() === 'yes' : true;

    criteria.push({
      id: acId,
      description,
      priority,
      testable,
      completed,
    });
  }

  return criteria;
}

/**
 * Extract implementation history from living docs
 */
function extractImplementationHistory(markdown: string): ImplementationHistoryEntry[] {
  const history: ImplementationHistoryEntry[] = [];

  // Find implementation history table
  const tableMatch = markdown.match(/##\s+(?:Increments|Implementation History)[\s\S]*?\n\|[\s\S]*?\n([\s\S]*?)(?=\n##|\Z)/i);

  if (!tableMatch) return history;

  const tableContent = tableMatch[1];

  // Parse table rows
  const rows = tableContent.split('\n').filter(line => line.trim().startsWith('|'));

  for (const row of rows) {
    if (row.includes('Increment') || row.includes('---')) continue; // Skip header

    const cells = row.split('|').map(c => c.trim()).filter(c => c);

    if (cells.length < 2) continue;

    const incrementMatch = cells[0].match(/(\d{4}-[a-z0-9-]+)/);
    if (!incrementMatch) continue;

    const increment = incrementMatch[1];

    // Extract stories from second column
    const storiesText = cells[1] || '';
    const storyMatches = Array.from(storiesText.matchAll(/US-(\d+)/g));
    const stories = storyMatches.map(m => `US-${m[1]}`);

    // Extract status
    const statusMatch = cells[2]?.match(/(Complete|In Progress|Planned)/i);
    const status = statusMatch
      ? (statusMatch[1].toLowerCase().replace(' ', '-') as 'complete' | 'in-progress' | 'planned')
      : 'planned';

    // Extract date
    const dateMatch = cells[3]?.match(/\d{4}-\d{2}-\d{2}/);
    const date = dateMatch ? dateMatch[0] : undefined;

    history.push({
      increment,
      stories,
      status,
      date,
    });
  }

  return history;
}

/**
 * Extract related documentation links
 */
function extractRelatedDocs(markdown: string): RelatedDocs {
  const relatedDocs: RelatedDocs = {
    architecture: [],
    adrs: [],
    strategy: [],
    operations: [],
    delivery: [],
  };

  // Find related documentation section
  const relatedMatch = markdown.match(/##\s+(?:Architecture & Design|Related Documentation)[\s\S]*?\n([\s\S]*?)(?=\n##|\Z)/i);

  if (!relatedMatch) return relatedDocs;

  const content = relatedMatch[1];

  // Extract links
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const linkText = match[1];
    const linkPath = match[2];

    if (linkPath.includes('/architecture/') && !linkPath.includes('/adr/')) {
      relatedDocs.architecture.push(linkPath);
    } else if (linkPath.includes('/adr/')) {
      relatedDocs.adrs.push(linkPath);
    } else if (linkPath.includes('/strategy/')) {
      relatedDocs.strategy.push(linkPath);
    } else if (linkPath.includes('/operations/')) {
      relatedDocs.operations.push(linkPath);
    } else if (linkPath.includes('/delivery/')) {
      relatedDocs.delivery.push(linkPath);
    }
  }

  return relatedDocs;
}

/**
 * Extract external tool links
 */
function extractExternalLinks(markdown: string): ExternalLinks {
  const externalLinks: ExternalLinks = {};

  // Find external tools section
  const externalMatch = markdown.match(/##\s+External Tool Links[\s\S]*?\n([\s\S]*?)(?=\n##|\Z)/i);

  if (!externalMatch) return externalLinks;

  const content = externalMatch[1];

  // Extract GitHub link
  const githubMatch = content.match(/\*\*GitHub\*\*:\s*\[([^\]]+)\]\(([^)]+)\)/);
  if (githubMatch) {
    externalLinks.github = githubMatch[2];
  }

  // Extract Jira link
  const jiraMatch = content.match(/\*\*Jira\*\*:\s*\[([^\]]+)\]\(([^)]+)\)/);
  if (jiraMatch) {
    externalLinks.jira = jiraMatch[2];
  }

  // Extract Azure DevOps link
  const adoMatch = content.match(/\*\*Azure DevOps\*\*:\s*\[([^\]]+)\]\(([^)]+)\)/);
  if (adoMatch) {
    externalLinks.ado = adoMatch[2];
  }

  return externalLinks;
}

// ============================================================================
// LINK GENERATION
// ============================================================================

/**
 * Generate links to related documentation (avoid duplication)
 *
 * Analyzes increment spec to find architecture references and generates
 * proper links instead of duplicating content.
 */
export function generateRelatedDocsLinks(spec: IncrementSpec, projectRoot: string = process.cwd()): RelatedDocs {
  const relatedDocs: RelatedDocs = {
    architecture: [],
    adrs: [],
    strategy: [],
    operations: [],
    delivery: [],
  };

  // Check for architecture folder
  const architectureDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'architecture');

  if (fs.existsSync(architectureDir)) {
    // Find HLD files
    const hldPattern = `hld-*.md`;
    const hldFiles = fs.readdirSync(architectureDir).filter(f => f.startsWith('hld-') && f.endsWith('.md'));

    for (const file of hldFiles) {
      relatedDocs.architecture.push(`../../architecture/${file}`);
    }

    // Find ADR files
    const adrDir = path.join(architectureDir, 'adr');
    if (fs.existsSync(adrDir)) {
      const adrFiles = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));

      for (const file of adrFiles) {
        relatedDocs.adrs.push(`../../architecture/adr/${file}`);
      }
    }
  }

  // Check for strategy folder
  const strategyDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'strategy');
  if (fs.existsSync(strategyDir)) {
    const strategyFiles = fs.readdirSync(strategyDir).filter(f => f.endsWith('.md'));

    for (const file of strategyFiles) {
      relatedDocs.strategy.push(`../../strategy/${file}`);
    }
  }

  // Check for operations folder
  const operationsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'operations');
  if (fs.existsSync(operationsDir)) {
    const operationsFiles = fs.readdirSync(operationsDir).filter(f => f.endsWith('.md'));

    for (const file of operationsFiles) {
      relatedDocs.operations.push(`../../operations/${file}`);
    }
  }

  // Check for delivery folder
  const deliveryDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'delivery');
  if (fs.existsSync(deliveryDir)) {
    const deliveryFiles = fs.readdirSync(deliveryDir).filter(f => f.endsWith('.md'));

    for (const file of deliveryFiles) {
      relatedDocs.delivery.push(`../../delivery/${file}`);
    }
  }

  return relatedDocs;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract spec ID from increment ID
 *
 * Examples:
 * - 0001-core-framework → SPEC-001
 * - 0002-core-enhancements → SPEC-002 (if part of same spec)
 * - 0005-cross-platform-cli → SPEC-001 (if part of core spec)
 */
export function extractSpecId(incrementId: string): string {
  // Extract numeric prefix
  const numMatch = incrementId.match(/^(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 1;

  // For now, use same numbering (can be customized later)
  return `SPEC-${num.toString().padStart(3, '0')}`;
}

/**
 * Merge user stories from increment into living docs
 *
 * Adds new stories, updates existing stories with completion status.
 */
export function mergeUserStories(
  existingStories: UserStory[],
  newStories: UserStory[],
  incrementId: string
): UserStory[] {
  const merged = [...existingStories];

  for (const newStory of newStories) {
    const existingIndex = merged.findIndex(s => s.id === newStory.id);

    if (existingIndex >= 0) {
      // Update existing story
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...newStory,
        implementedIn: incrementId,
        status: newStory.status,
      };
    } else {
      // Add new story
      merged.push({
        ...newStory,
        implementedIn: incrementId,
      });
    }
  }

  // Sort by ID
  merged.sort((a, b) => a.id.localeCompare(b.id));

  return merged;
}

/**
 * Write living docs spec to file
 */
export async function writeLivingDocsSpec(filePath: string, spec: LivingDocsSpec): Promise<void> {
  const content = formatLivingDocsSpec(spec);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Format living docs spec as markdown
 */
function formatLivingDocsSpec(spec: LivingDocsSpec): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`id: ${spec.id}`);
  lines.push(`title: "${spec.title}"`);
  if (spec.status) lines.push(`status: ${spec.status}`);
  if (spec.priority) lines.push(`priority: ${spec.priority}`);
  if (spec.created) lines.push(`created: ${spec.created}`);
  lines.push(`last_updated: ${spec.lastUpdated || new Date().toISOString().split('T')[0]}`);
  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${spec.id}: ${spec.title}`);
  lines.push('');
  lines.push(`**Feature Area**: ${spec.featureArea}`);
  if (spec.status) lines.push(`**Status**: ${spec.status}`);
  if (spec.priority) lines.push(`**Priority**: ${spec.priority}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(spec.overview);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Implementation History
  if (spec.implementationHistory.length > 0) {
    lines.push('## Implementation History');
    lines.push('');
    lines.push('| Increment | Stories Implemented | Status | Completion Date |');
    lines.push('|-----------|-------------------|--------|----------------|');

    for (const entry of spec.implementationHistory) {
      const statusEmoji = entry.status === 'complete' ? '✅' : entry.status === 'in-progress' ? '⏳' : '📋';

      // Link to increment tasks.md instead of just folder
      const incrementLink = `[${entry.increment}](../../../../increments/${entry.increment}/tasks.md)`;

      // Generate story summary instead of listing all IDs
      const storyCount = entry.stories.length;
      const firstStory = entry.stories[0];
      const lastStory = entry.stories[entry.stories.length - 1];
      const storiesText = storyCount === 1
        ? firstStory
        : storyCount === entry.stories.length
          ? `${firstStory} through ${lastStory} (all)`
          : entry.stories.join(', ');

      const dateText = entry.date || '-';

      lines.push(`| ${incrementLink} | ${storiesText} | ${statusEmoji} ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)} | ${dateText} |`);
    }

    const totalStories = spec.userStories.length;
    const completeStories = spec.userStories.filter(s => s.status === 'complete').length;
    const percentage = totalStories > 0 ? Math.round((completeStories / totalStories) * 100) : 0;

    lines.push('');
    lines.push(`**Overall Progress**: ${completeStories}/${totalStories} user stories complete (${percentage}%)`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // User Stories & Acceptance Criteria
  lines.push('## User Stories & Acceptance Criteria');
  lines.push('');

  // Group by epic
  const epicGroups = new Map<string, UserStory[]>();

  for (const story of spec.userStories) {
    const epicName = story.epic || 'General';
    if (!epicGroups.has(epicName)) {
      epicGroups.set(epicName, []);
    }
    epicGroups.get(epicName)!.push(story);
  }

  for (const [epicName, stories] of epicGroups) {
    if (epicName !== 'General') {
      lines.push(`### ${epicName}`);
      lines.push('');
    }

    for (const story of stories) {
      const statusEmoji = story.status === 'complete' ? '✅' : story.status === 'in-progress' ? '⏳' : '📋';

      lines.push(`**${story.id}**: ${story.title} ${statusEmoji}`);
      lines.push('');

      if (story.acceptanceCriteria.length > 0) {
        lines.push('**Acceptance Criteria**:');
        for (const ac of story.acceptanceCriteria) {
          const checkbox = ac.completed ? '[x]' : '[ ]';
          const priorityText = ac.priority ? ` (${ac.priority})` : '';
          lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}${priorityText}`);
        }
        lines.push('');
      }

      if (story.implementedIn) {
        lines.push(`**Implementation**: Increment ${story.implementedIn}`);
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('');

  // Architecture & Design (LINKS ONLY)
  lines.push('## Architecture & Design');
  lines.push('');

  if (spec.relatedDocs.architecture.length > 0) {
    lines.push('**High-Level Design**:');
    for (const link of spec.relatedDocs.architecture) {
      const fileName = path.basename(link, '.md');
      const title = fileName.replace(/^hld-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      lines.push(`- [${title}](${link})`);
    }
    lines.push('');
  }

  if (spec.relatedDocs.adrs.length > 0) {
    lines.push('**Architecture Decisions**:');
    for (const link of spec.relatedDocs.adrs) {
      const fileName = path.basename(link, '.md');
      // Extract ADR title from filename (e.g., "0001-plugin-system" -> "ADR-001: Plugin System")
      const numMatch = fileName.match(/^(\d+)/);
      const num = numMatch ? numMatch[1] : '001';
      const title = fileName.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      lines.push(`- [ADR-${num}: ${title}](${link})`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // External Tool Links
  if (spec.externalLinks.github || spec.externalLinks.jira || spec.externalLinks.ado) {
    lines.push('## External Tool Links');
    lines.push('');

    if (spec.externalLinks.github) {
      lines.push(`**GitHub**: [Project Board](${spec.externalLinks.github})`);
    }

    if (spec.externalLinks.jira) {
      lines.push(`**Jira**: [Epic](${spec.externalLinks.jira})`);
    }

    if (spec.externalLinks.ado) {
      lines.push(`**Azure DevOps**: [Feature](${spec.externalLinks.ado})`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Related Documentation (other folders)
  if (spec.relatedDocs.strategy.length > 0 || spec.relatedDocs.operations.length > 0 || spec.relatedDocs.delivery.length > 0) {
    lines.push('## Related Documentation');
    lines.push('');

    if (spec.relatedDocs.strategy.length > 0) {
      lines.push('**Strategy**:');
      for (const link of spec.relatedDocs.strategy) {
        const fileName = path.basename(link, '.md');
        const title = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        lines.push(`- [${title}](${link})`);
      }
      lines.push('');
    }

    if (spec.relatedDocs.operations.length > 0) {
      lines.push('**Operations**:');
      for (const link of spec.relatedDocs.operations) {
        const fileName = path.basename(link, '.md');
        const title = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        lines.push(`- [${title}](${link})`);
      }
      lines.push('');
    }

    if (spec.relatedDocs.delivery.length > 0) {
      lines.push('**Delivery**:');
      for (const link of spec.relatedDocs.delivery) {
        const fileName = path.basename(link, '.md');
        const title = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        lines.push(`- [${title}](${link})`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Footer
  lines.push(`**Last Updated**: ${spec.lastUpdated || new Date().toISOString().split('T')[0]}`);
  lines.push(`**Owner**: SpecWeave Core Team`);
  lines.push('');

  return lines.join('\n');
}
