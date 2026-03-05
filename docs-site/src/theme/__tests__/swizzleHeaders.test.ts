import {describe, it, expect} from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Swizzle version headers', () => {
  it('NavbarItem has wrap mode header with version 3.9.2', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../NavbarItem/index.tsx'),
      'utf-8',
    );
    expect(content).toContain('3.9.2');
    expect(content.toLowerCase()).toContain('wrap');
  });

  it('Footer has eject mode header with version 3.9.2', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../Footer/index.tsx'),
      'utf-8',
    );
    expect(content).toContain('3.9.2');
    expect(content.toLowerCase()).toContain('eject');
  });
});
