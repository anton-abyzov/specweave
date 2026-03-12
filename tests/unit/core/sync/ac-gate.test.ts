import { describe, it, expect } from 'vitest';
import { ACGate } from '../../../../src/core/sync/ac-gate.js';

const makeSpec = (acs: Record<string, boolean>) => {
  const lines = ['# Spec', '', '## US-001', ''];
  for (const [id, checked] of Object.entries(acs)) {
    lines.push(`- [${checked ? 'x' : ' '}] **${id}**: Some criterion`);
  }
  return lines.join('\n');
};

const makeTask = (id: string, acs: string[], completed: boolean) => {
  return [
    `### ${id}: Task Title`,
    `**User Story**: US-001`,
    `**Satisfies ACs**: ${acs.join(', ')}`,
    `**Status**: [${completed ? 'x' : ' '}] ${completed ? 'completed' : 'pending'}`,
    '',
  ].join('\n');
};

describe('ACGate', () => {
  it('returns shouldSync false when no AC transitions', () => {
    const spec = makeSpec({ 'AC-US1-01': false });
    const tasks = [
      makeTask('T-001', ['AC-US1-01'], true),
      makeTask('T-002', ['AC-US1-01'], false), // T-002 not done yet
    ].join('\n---\n');

    // T-001 just completed, but AC-US1-01 still has T-002 incomplete
    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-001');
    expect(result.shouldSync).toBe(false);
  });

  it('returns shouldSync true when AC transitions to fully satisfied', () => {
    // Both T-001 and T-002 reference AC-US1-01, both are completed
    const spec = makeSpec({ 'AC-US1-01': false }); // not yet marked in spec
    const tasks = [
      makeTask('T-001', ['AC-US1-01'], true),
      makeTask('T-002', ['AC-US1-01'], true),
    ].join('\n---\n');

    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-002');
    expect(result.shouldSync).toBe(true);
    expect(result.transitionedACs).toContain('AC-US1-01');
  });

  it('returns affected story IDs from transitioned ACs', () => {
    const spec = [
      '# Spec', '',
      '## US-001', '',
      '- [ ] **AC-US1-01**: Criterion 1',
      '',
      '## US-002', '',
      '- [ ] **AC-US2-01**: Criterion 2',
    ].join('\n');

    const tasks = [
      makeTask('T-001', ['AC-US1-01', 'AC-US2-01'], true),
    ].join('\n');

    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-001');
    expect(result.shouldSync).toBe(true);
    expect(result.affectedStoryIds).toContain('US-001');
    expect(result.affectedStoryIds).toContain('US-002');
  });

  it('returns shouldSync true when task has no AC tags (backward compat)', () => {
    const spec = makeSpec({ 'AC-US1-01': false });
    const tasks = [
      '### T-001: Legacy Task',
      '**User Story**: US-001',
      '**Status**: [x] completed',
      '',
    ].join('\n');

    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-001');
    expect(result.shouldSync).toBe(true);
    expect(result.transitionedACs).toEqual([]);
    expect(result.affectedStoryIds).toEqual([]);
  });

  it('returns shouldSync false when all ACs were already checked', () => {
    const spec = makeSpec({ 'AC-US1-01': true }); // already checked in spec
    const tasks = [
      makeTask('T-001', ['AC-US1-01'], true),
    ].join('\n');

    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-001');
    expect(result.shouldSync).toBe(false);
  });

  it('handles multiple AC transitions across stories', () => {
    const spec = [
      '# Spec', '',
      '## US-001', '',
      '- [ ] **AC-US1-01**: Criterion 1',
      '- [ ] **AC-US1-02**: Criterion 2',
      '',
      '## US-002', '',
      '- [ ] **AC-US2-01**: Criterion 3',
    ].join('\n');

    // T-001 satisfies all three ACs and is the only task
    const tasks = makeTask('T-001', ['AC-US1-01', 'AC-US1-02', 'AC-US2-01'], true);

    const result = ACGate.shouldSyncExternal(spec, tasks, 'T-001');
    expect(result.shouldSync).toBe(true);
    expect(result.transitionedACs).toHaveLength(3);
    expect(result.affectedStoryIds).toContain('US-001');
    expect(result.affectedStoryIds).toContain('US-002');
  });
});
