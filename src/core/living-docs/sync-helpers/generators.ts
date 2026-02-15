/**
 * Generator utilities for Living Docs Sync
 * Generates markdown files for features, READMEs, and user stories
 *
 * IMPORTANT: All generators are PROJECT-AGNOSTIC
 * They work for ANY user project, not just SpecWeave itself.
 *
 * @module core/living-docs/sync-helpers/generators
 */

import type { ParsedSpec, UserStoryData } from '../types.js';

/**
 * Generator context - provides project-specific information
 * for template generation without hardcoding paths.
 */
export interface GeneratorContext {
  /** Project ID (e.g., "my-app", "backend-service") */
  projectId: string;

  /** Project name for display (e.g., "My Application") */
  projectName?: string;

  /** Relative path from feature folder to increments folder */
  incrementsRelativePath?: string;

  /** Whether to use relative links (default: true) */
  useRelativeLinks?: boolean;
}

/**
 * Default context for backward compatibility
 */
const DEFAULT_CONTEXT: GeneratorContext = {
  projectId: 'default',
  projectName: 'Project',
  incrementsRelativePath: '../../../../../increments',
  useRelativeLinks: true,
};

/**
 * Merge user context with defaults
 */
function resolveContext(context?: Partial<GeneratorContext>): GeneratorContext {
  return { ...DEFAULT_CONTEXT, ...context };
}

/**
 * Generate FEATURE.md content
 *
 * @param featureId - Feature ID (e.g., "FS-001")
 * @param parsed - Parsed spec content
 * @param incrementId - Increment ID (e.g., "0001-feature-name")
 * @param context - Optional generator context for project-specific paths
 */
export function generateFeatureFile(
  featureId: string,
  parsed: ParsedSpec,
  incrementId: string,
  context?: Partial<GeneratorContext>
): string {
  const ctx = resolveContext(context);
  const lines: string[] = [];

  lines.push('---');
  lines.push('id: ' + featureId);
  lines.push('title: "' + parsed.title + '"');
  lines.push('type: feature');
  lines.push('status: ' + parsed.status);
  lines.push('priority: ' + parsed.priority);
  lines.push('created: ' + parsed.created);
  lines.push('lastUpdated: ' + new Date().toISOString().split('T')[0]);
  if (ctx.projectId !== 'default') {
    lines.push('project: ' + ctx.projectId);
  }
  // LLM-optimized fields for quick context loading
  const tldrSummary = parsed.overview
    ? parsed.overview.split('.')[0].trim() + '.'
    : parsed.title;
  lines.push('tldr: "' + tldrSummary.replace(/"/g, "'") + '"');
  lines.push('complexity: ' + (parsed.userStories.length > 3 ? 'high' : parsed.userStories.length > 1 ? 'medium' : 'low'));
  lines.push('stakeholder_relevant: true');
  lines.push('---');
  lines.push('');
  lines.push('# ' + parsed.title);
  lines.push('');

  // TL;DR summary block for LLM and stakeholder quick context
  lines.push('## TL;DR');
  lines.push('');
  lines.push('**What**: ' + (parsed.overview ? parsed.overview.split('.')[0].trim() + '.' : parsed.title));
  lines.push('**Status**: ' + parsed.status + ' | **Priority**: ' + parsed.priority);
  lines.push('**User Stories**: ' + parsed.userStories.length);
  lines.push('');

  if (parsed.overview) {
    lines.push('## Overview');
    lines.push('');
    lines.push(parsed.overview);
    lines.push('');
  }

  lines.push('## Implementation History');
  lines.push('');
  lines.push('| Increment | Status | Completion Date |');
  lines.push('|-----------|--------|----------------|');
  const statusEmoji = parsed.status === 'completed' ? '✅' : '⏳';

  // Use context-aware path for increment link
  const incrementLink = ctx.useRelativeLinks
    ? `${ctx.incrementsRelativePath}/${incrementId}/spec.md`
    : `/.specweave/increments/${incrementId}/spec.md`;

  lines.push('| [' + incrementId + '](' + incrementLink + ') | ' + statusEmoji + ' ' + parsed.status + ' | ' + parsed.created + ' |');
  lines.push('');

  if (parsed.userStories.length > 0) {
    lines.push('## User Stories');
    lines.push('');
    for (const story of parsed.userStories) {
      const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // User story files are in the SAME directory as FEATURE.md - use relative path
      const storyFile = './' + story.id.toLowerCase() + '-' + storySlug + '.md';
      lines.push('- [' + story.id + ': ' + story.title + '](' + storyFile + ')');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate README.md content
 *
 * @param featureId - Feature ID (e.g., "FS-001")
 * @param parsed - Parsed spec content
 * @param _incrementId - Increment ID (unused but kept for signature compatibility)
 * @param context - Optional generator context for project-specific content
 */
export function generateReadmeFile(
  featureId: string,
  parsed: ParsedSpec,
  _incrementId: string,
  context?: Partial<GeneratorContext>
): string {
  const ctx = resolveContext(context);
  const lines: string[] = [];

  // Use project ID from context, not hardcoded "specweave"
  const projectSuffix = ctx.projectId !== 'default' ? `-${ctx.projectId}` : '';
  const projectDisplay = ctx.projectName || ctx.projectId;

  lines.push('---');
  lines.push('id: ' + featureId + projectSuffix);
  lines.push('title: "' + parsed.title + ' - ' + projectDisplay + ' Implementation"');
  lines.push('feature: ' + featureId);
  lines.push('project: ' + ctx.projectId);
  lines.push('type: feature-context');
  lines.push('status: ' + parsed.status);
  lines.push('---');
  lines.push('');
  lines.push('# ' + parsed.title);
  lines.push('');
  lines.push('**Feature**: [' + featureId + '](./FEATURE.md)');
  lines.push('');

  if (parsed.overview) {
    lines.push('## Overview');
    lines.push('');
    lines.push(parsed.overview);
    lines.push('');
  }

  lines.push('## User Stories');
  lines.push('');
  lines.push('See user story files in this directory.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Options for user story file generation
 */
export interface UserStoryFileOptions {
  /** All projects in cross-project increment (for related_projects frontmatter) */
  allProjects?: string[];

  /** Generator context for project-specific paths */
  context?: Partial<GeneratorContext>;
}

/**
 * Generate user story file content
 *
 * @param story - User story data
 * @param featureId - Feature ID (e.g., "FS-001")
 * @param incrementId - Increment ID (e.g., "0001-feature-name")
 * @param parsed - Parsed spec content
 * @param options - Generation options including context
 */
export function generateUserStoryFile(
  story: UserStoryData,
  featureId: string,
  incrementId: string,
  parsed: ParsedSpec,
  options?: UserStoryFileOptions
): string {
  const ctx = resolveContext(options?.context);
  const lines: string[] = [];

  lines.push('---');
  lines.push('id: ' + story.id);
  lines.push('feature: ' + featureId);
  lines.push('title: "' + story.title + '"');
  lines.push('status: ' + (story.status || parsed.status));
  lines.push('priority: ' + parsed.priority);
  lines.push('created: ' + parsed.created);
  // LLM-optimized fields
  const storyTldr = story.description
    ? story.description.split('.')[0].trim() + '.'
    : story.title;
  lines.push('tldr: "' + storyTldr.replace(/"/g, "'") + '"');

  // Cross-project targeting (v0.33.0+)
  // Use story.project if available, otherwise use context project
  const projectId = story.project || ctx.projectId;
  if (projectId && projectId !== 'default') {
    lines.push('project: ' + projectId);
  }
  if (story.board) {
    lines.push('board: ' + story.board);
  }
  if (story.externalProvider) {
    lines.push('external_provider: ' + story.externalProvider);
  }

  // Related projects (for cross-project increments)
  if (options?.allProjects && story.project) {
    const relatedProjects = options.allProjects.filter(p => p !== story.project);
    if (relatedProjects.length > 0) {
      lines.push('related_projects: [' + relatedProjects.join(', ') + ']');
    }
  }

  if (story.format_preservation !== undefined) {
    lines.push('format_preservation: ' + story.format_preservation);
  }
  if (story.external_title) {
    lines.push('external_title: "' + story.external_title + '"');
  }
  if (story.external_source) {
    lines.push('external_source: ' + story.external_source);
  }
  if (story.external_id) {
    lines.push('external_id: "' + story.external_id + '"');
  }
  if (story.external_url) {
    lines.push('external_url: "' + story.external_url + '"');
  }
  if (story.imported_at) {
    lines.push('imported_at: "' + story.imported_at + '"');
  }
  if (story.origin) {
    lines.push('origin: ' + story.origin);
  }

  lines.push('---');
  lines.push('');
  lines.push('# ' + story.id + ': ' + story.title);
  lines.push('');
  lines.push('**Feature**: [' + featureId + '](./FEATURE.md)');
  lines.push('');

  if (story.description) {
    lines.push(story.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Acceptance Criteria');
  lines.push('');

  const storyCriteria = parsed.acceptanceCriteria.filter(
    ac => ac.userStoryId === story.id
  );

  if (storyCriteria.length > 0) {
    for (const ac of storyCriteria) {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      lines.push('- ' + checkbox + ' **' + ac.id + '**: ' + ac.description);
    }
  } else {
    lines.push('No acceptance criteria defined.');
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Implementation');
  lines.push('');

  // Use context-aware path for increment link
  const incrementLink = ctx.useRelativeLinks
    ? `${ctx.incrementsRelativePath}/${incrementId}/spec.md`
    : `/.specweave/increments/${incrementId}/spec.md`;

  lines.push('**Increment**: [' + incrementId + '](' + incrementLink + ')');
  lines.push('');
  lines.push('**Tasks**: See increment tasks.md for implementation details.');
  lines.push('');

  return lines.join('\n');
}
