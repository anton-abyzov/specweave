import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import { mergeRubricLayers } from '../../../../src/core/rubric/rubric-merger.js';

const FIXTURES = path.resolve(__dirname, 'fixtures');

describe('mergeRubricLayers', () => {
  it('TC-001: global only — no project, no increment overrides', async () => {
    const result = await mergeRubricLayers(
      FIXTURES,           // projectRoot — global defaults at FIXTURES/plugins/...
      '0663-test',
      FIXTURES,           // incrementPath — no rubric.md here
      { globalPath: path.join(FIXTURES, 'global-defaults.md') },
    );
    expect(result).not.toBeNull();
    expect(result!.criteria.some(c => c.id === 'R-D01')).toBe(true);
    expect(result!.criteria.some(c => c.id === 'R-D02')).toBe(true);
  });

  it('TC-002: project overrides global on ID collision', async () => {
    const result = await mergeRubricLayers(
      FIXTURES,
      '0663-test',
      FIXTURES,
      {
        globalPath: path.join(FIXTURES, 'global-defaults.md'),
        projectPath: path.join(FIXTURES, 'project-overrides.md'),
      },
    );
    const rd01 = result!.criteria.find(c => c.id === 'R-D01')!;
    expect(rd01.threshold).toContain('95%');
  });

  it('TC-003: increment overrides project on ID collision', async () => {
    const result = await mergeRubricLayers(
      FIXTURES,
      '0663-test',
      FIXTURES,
      {
        globalPath: path.join(FIXTURES, 'global-defaults.md'),
        projectPath: path.join(FIXTURES, 'project-overrides.md'),
        incrementPath: path.join(FIXTURES, 'increment-rubric.md'),
      },
    );
    const rd01 = result!.criteria.find(c => c.id === 'R-D01')!;
    expect(rd01.threshold).toContain('80%');
  });

  it('TC-004: non-conflicting criteria from all tiers are combined', async () => {
    const result = await mergeRubricLayers(
      FIXTURES,
      '0663-test',
      FIXTURES,
      {
        globalPath: path.join(FIXTURES, 'global-defaults.md'),
        projectPath: path.join(FIXTURES, 'project-overrides.md'),
        incrementPath: path.join(FIXTURES, 'increment-rubric.md'),
      },
    );
    // R-D01 from increment, R-D02 from global, R-001 and R-002 from increment
    expect(result!.criteria.some(c => c.id === 'R-D01')).toBe(true);
    expect(result!.criteria.some(c => c.id === 'R-D02')).toBe(true);
    expect(result!.criteria.some(c => c.id === 'R-001')).toBe(true);
  });

  it('TC-005: no rubric files at any tier returns null', async () => {
    const result = await mergeRubricLayers(
      '/nonexistent/path',
      '0663-test',
      '/nonexistent/path',
    );
    expect(result).toBeNull();
  });

  it('TC-006: missing global tier is silently skipped', async () => {
    const result = await mergeRubricLayers(
      '/nonexistent/path',
      '0663-test',
      FIXTURES,
      { incrementPath: path.join(FIXTURES, 'increment-rubric.md') },
    );
    expect(result).not.toBeNull();
    expect(result!.criteria.some(c => c.id === 'R-001')).toBe(true);
  });

  it('TC-007: whole-criterion replacement — no field-level merge', async () => {
    const result = await mergeRubricLayers(
      FIXTURES,
      '0663-test',
      FIXTURES,
      {
        globalPath: path.join(FIXTURES, 'global-defaults.md'),
        projectPath: path.join(FIXTURES, 'project-overrides.md'),
      },
    );
    const rd01 = result!.criteria.find(c => c.id === 'R-D01')!;
    // Project overrides entirely — source should be project-override, not project-default
    expect(rd01.sourceACs).toContain('project-override');
  });
});
