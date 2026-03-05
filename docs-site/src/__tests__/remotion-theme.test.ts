import {describe, it, expect} from 'vitest';
import {COLORS, CONFIG} from '../../remotion/lib/theme';
import fs from 'fs';
import path from 'path';

describe('Remotion theme', () => {
  it('resolution is 1920x1080', () => {
    expect(CONFIG.width).toBe(1920);
    expect(CONFIG.height).toBe(1080);
  });

  it('surfaceDark matches --sw-surface-dark', () => {
    expect(COLORS.surfaceDark).toBe('#0b0816');
  });

  it('primary500 matches --sw-color-primary-500', () => {
    expect(COLORS.primary500).toBe('#6b58b8');
  });

  it('primary400 matches --sw-color-primary-400', () => {
    expect(COLORS.primary400).toBe('#8f7dce');
  });

  it('success matches --sw-color-success', () => {
    expect(COLORS.success).toBe('#10b981');
  });

  it('danger matches --sw-color-danger', () => {
    expect(COLORS.danger).toBe('#ef4444');
  });

  it('warning matches --sw-color-warning', () => {
    expect(COLORS.warning).toBe('#f59e0b');
  });

  it('each color has a comment referencing --sw-* token', () => {
    const themeContent = fs.readFileSync(
      path.resolve(__dirname, '../../remotion/lib/theme.ts'),
      'utf-8',
    );
    expect(themeContent).toContain('// --sw-surface-dark');
    expect(themeContent).toContain('// --sw-color-primary-500');
    expect(themeContent).toContain('// --sw-color-primary-400');
    expect(themeContent).toContain('// --sw-color-primary-300');
    expect(themeContent).toContain('// --sw-color-primary-200');
    expect(themeContent).toContain('// --sw-color-danger');
    expect(themeContent).toContain('// --sw-color-warning');
  });
});
