import { describe, it, expect } from 'vitest';
import { GenericAdapter } from '../../../src/adapters/generic/adapter.js';

describe('generic adapter post-install text', () => {
  it('is short and names nothing that does not exist', () => {
    const text = new GenericAdapter().getInstructions();
    expect(text.trim().split('\n').length).toBeLessThanOrEqual(3);
    expect(text).not.toContain('tasks.md');
    expect(text).not.toContain('Common Workflows');
    expect(text).toContain('AGENTS.md');
  });
});
