import { describe, it, expect } from 'vitest';
import {
  NPM_REGISTRY_URL,
  npmRegistryFlag,
} from '../../../src/utils/npm-constants.js';

describe('npm-constants', () => {
  describe('NPM_REGISTRY_URL', () => {
    it('should be the public npm registry URL', () => {
      expect(NPM_REGISTRY_URL).toBe('https://registry.npmjs.org');
    });

    it('should be a string constant (not undefined)', () => {
      expect(typeof NPM_REGISTRY_URL).toBe('string');
      expect(NPM_REGISTRY_URL.length).toBeGreaterThan(0);
    });
  });

  describe('npmRegistryFlag', () => {
    it('should return the --registry flag with the public URL', () => {
      expect(npmRegistryFlag()).toBe('--registry https://registry.npmjs.org');
    });

    it('should start with --registry', () => {
      expect(npmRegistryFlag()).toMatch(/^--registry /);
    });

    it('should contain the NPM_REGISTRY_URL value', () => {
      expect(npmRegistryFlag()).toContain(NPM_REGISTRY_URL);
    });
  });
});
