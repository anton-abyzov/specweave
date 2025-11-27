/**
 * Generator utilities for Living Docs Sync
 * Generates markdown files for features, READMEs, and user stories
 * @module core/living-docs/sync-helpers/generators
 */

import type { ParsedSpec, UserStoryData } from '../types.js';

/**
 * Generate FEATURE.md content
 */
export function generateFeatureFile(
  featureId: string,
  parsed: ParsedSpec,
  incrementId: string
): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('id: ' + featureId);
  lines.push('title: "' + parsed.title + '"');
  lines.push('type: feature');
  lines.push('status: ' + parsed.status);
  lines.push('priority: ' + parsed.priority);
  lines.push('created: ' + parsed.created);
  lines.push('lastUpdated: ' + new Date().toISOString().split('T')[0]);
  lines.push('---');
  lines.push('');
  lines.push('# ' + parsed.title);
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
  lines.push('| [' + incrementId + '](../../../../increments/' + incrementId + '/spec.md) | ' + statusEmoji + ' ' + parsed.status + ' | ' + parsed.created + ' |');
  lines.push('');

  if (parsed.userStories.length > 0) {
    lines.push('## User Stories');
    lines.push('');
    for (const story of parsed.userStories) {
      const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const storyFile = '../../specweave/' + featureId + '/' + story.id.toLowerCase() + '-' + storySlug + '.md';
      lines.push('- [' + story.id + ': ' + story.title + '](' + storyFile + ')');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate README.md content
 */
export function generateReadmeFile(
  featureId: string,
  parsed: ParsedSpec,
  _incrementId: string
): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('id: ' + featureId + '-specweave');
  lines.push('title: "' + parsed.title + ' - SpecWeave Implementation"');
  lines.push('feature: ' + featureId);
  lines.push('project: specweave');
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
 * Generate user story file content
 */
export function generateUserStoryFile(
  story: UserStoryData,
  featureId: string,
  incrementId: string,
  parsed: ParsedSpec
): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('id: ' + story.id);
  lines.push('feature: ' + featureId);
  lines.push('title: "' + story.title + '"');
  lines.push('status: ' + (story.status || parsed.status));
  lines.push('priority: ' + parsed.priority);
  lines.push('created: ' + parsed.created);

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
  lines.push('**Increment**: [' + incrementId + '](../../../../increments/' + incrementId + '/spec.md)');
  lines.push('');
  lines.push('**Tasks**: See increment tasks.md for implementation details.');
  lines.push('');

  return lines.join('\n');
}
