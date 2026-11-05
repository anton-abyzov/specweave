import {describe, expect, it} from 'vitest';
import {unprefixPathname} from '../unprefixPathname';

describe('unprefixPathname', () => {
  it('strips the locale base in every form a pathname takes', () => {
    expect(unprefixPathname('/ru/code/', '/ru/')).toBe('/code/');
    expect(unprefixPathname('/ru/', '/ru/')).toBe('/');
    expect(unprefixPathname('/ru', '/ru/')).toBe('/');
    expect(unprefixPathname('/pt-BR/docs/x/', '/pt-BR/')).toBe('/docs/x/');
  });

  it('leaves English paths alone', () => {
    expect(unprefixPathname('/code/', '/')).toBe('/code/');
    expect(unprefixPathname('/', '/')).toBe('/');
  });
});
