import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('docusaurus.config.ts (AC-US7-03)', () => {
  const configContent = readFileSync(
    join(process.cwd(), 'docusaurus.config.ts'),
    'utf-8',
  );

  it('sets onBrokenLinks to throw', () => {
    // Verify the config has onBrokenLinks set to 'throw' (not 'warn' or 'log')
    expect(configContent).toMatch(/onBrokenLinks:\s*['"]throw['"]/);
  });

  it('does not use warn for onBrokenLinks', () => {
    expect(configContent).not.toMatch(/onBrokenLinks:\s*['"]warn['"]/);
  });
});
