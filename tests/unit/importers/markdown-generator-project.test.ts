/**
 * Unit tests for markdown-generator **Project**: field placement (T-029)
 *
 * Verifies that **Project**: appears inside each ### US-NNN block,
 * not as a top-level spec field.
 */

import { describe, it, expect } from 'vitest';
import { MarkdownGenerator, type UserStoryMarkdownData } from '../../../src/importers/markdown-generator.js';

describe('MarkdownGenerator **Project** field (T-029)', () => {
  const generator = new MarkdownGenerator();

  function makeStoryData(overrides: Partial<UserStoryMarkdownData> = {}): UserStoryMarkdownData {
    return {
      id: 'US-001',
      title: 'Test Story',
      description: 'A test user story',
      acceptanceCriteria: ['AC-1: Foo'],
      priority: 'P1',
      status: 'Open',
      originBadge: '🔗 [GitHub #1](https://github.com/acme/fe/issues/1)',
      metadata: {
        externalId: 'github#acme/fe#1',
        externalUrl: 'https://github.com/acme/fe/issues/1',
        externalPlatform: 'github',
        importedAt: '2026-03-19T00:00:00Z',
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-19T00:00:00Z',
        labels: ['bug'],
        sourceRepo: 'acme/fe',
      },
      ...overrides,
    };
  }

  it('should include **Project**: inside user story markdown', () => {
    const data = makeStoryData({ metadata: { ...makeStoryData().metadata, sourceRepo: 'acme/fe' } });
    const md = generator.generateUserStoryMarkdown(data);

    // **Project**: must appear in the output
    expect(md).toContain('**Project**:');
  });

  it('should place **Project**: after title, before description', () => {
    const data = makeStoryData();
    const md = generator.generateUserStoryMarkdown(data);
    const lines = md.split('\n');

    const titleIdx = lines.findIndex(l => l.startsWith('# US-001'));
    const projectIdx = lines.findIndex(l => l.includes('**Project**:'));
    const descIdx = lines.findIndex(l => l === '## Description');

    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(projectIdx).toBeGreaterThan(titleIdx);
    expect(descIdx).toBeGreaterThan(projectIdx);
  });

  it('should use sourceRepo as project value when available', () => {
    const data = makeStoryData();
    const md = generator.generateUserStoryMarkdown(data);

    expect(md).toContain('**Project**: acme/fe');
  });

  it('should use workspace.name fallback when no sourceRepo', () => {
    const data = makeStoryData({
      metadata: {
        ...makeStoryData().metadata,
        sourceRepo: undefined,
      },
    });
    // When no sourceRepo, generateUserStoryMarkdown uses projectId param or 'unknown'
    const md = generator.generateUserStoryMarkdown(data, 'my-workspace');

    expect(md).toContain('**Project**: my-workspace');
  });

  it('should not have **Project**: as top-level spec field', () => {
    const data = makeStoryData();
    const md = generator.generateUserStoryMarkdown(data);
    const lines = md.split('\n');

    // **Project**: should NOT appear before the first # heading
    const firstHeadingIdx = lines.findIndex(l => l.startsWith('#'));
    const projectIdx = lines.findIndex(l => l.includes('**Project**:'));

    // Project should be AFTER the heading, not before
    expect(projectIdx).toBeGreaterThan(firstHeadingIdx);
  });
});
