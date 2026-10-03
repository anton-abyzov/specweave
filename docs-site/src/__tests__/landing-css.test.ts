import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// The production minifier merges rules with identical bodies and may move an
// active-state rule above its base rule. Repeating the base class keeps the
// active state winning on specificity, whatever order the rules end up in.
describe('landing page active states', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../components/landing/landing.module.css'), 'utf8');

  it.each([['storyStep', 'storyStepActive'], ['stageBeat', 'stageBeatActive']])('%s active rule repeats the base class', (base, active) => {
    expect(css).toMatch(new RegExp(`\\.${base}\\.${active}\\s*\\{`));
    expect(css).not.toMatch(new RegExp(`(^|[\\s,}])\\.${active}\\s*\\{`, 'm'));
  });
});
