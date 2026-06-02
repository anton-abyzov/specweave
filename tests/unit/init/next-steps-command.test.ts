import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showNextSteps } from '../../../src/cli/helpers/init/next-steps.js';

/**
 * Regression test for increment 0866 (F1):
 * `specweave init` / `auto` "Next steps" must guide users to a command that
 * actually exists (`specweave create-increment`), never the non-existent
 * `specweave increment "feature"` form.
 */
describe('init next-steps guided command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let output: string;

  beforeEach(() => {
    output = '';
    logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      output += args.map((a) => String(a)).join(' ') + '\n';
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('shows the real `create-increment` command', () => {
    showNextSteps('my-project', 'claude', 'en', false, true);
    expect(output).toContain('create-increment');
  });

  it('never suggests the non-existent `specweave increment "..."` command', () => {
    showNextSteps('my-project', 'claude', 'en', false, true);
    expect(output).not.toContain('increment "');
  });

  it('holds across adapters (generic, codex)', () => {
    for (const adapter of ['generic', 'codex']) {
      output = '';
      showNextSteps('my-project', adapter, 'en', false, true);
      expect(output).not.toContain('increment "');
    }
  });
});
