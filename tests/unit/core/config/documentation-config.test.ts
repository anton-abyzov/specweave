import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { SpecWeaveConfig, DocumentationConfig } from '../../../../src/core/config/types.js';

describe('DocumentationConfig (0208)', () => {
  it('should accept directories array in DocumentationConfig', () => {
    const docConfig: DocumentationConfig = {
      directories: ['.specweave/docs', 'docs'],
    };
    expect(docConfig.directories).toEqual(['.specweave/docs', 'docs']);
  });

  it('should allow documentation.directories in SpecWeaveConfig', () => {
    const config: Partial<SpecWeaveConfig> = {
      documentation: {
        directories: ['.specweave/docs', 'docs/'],
        preview: { enabled: false },
      },
    };
    expect(config.documentation?.directories).toEqual(['.specweave/docs', 'docs/']);
  });

  it('should default directories to undefined in DEFAULT_CONFIG (skill handles fallback)', () => {
    // DEFAULT_CONFIG.documentation may not have directories set
    // The /sw:docs skill defaults to [".specweave/docs"] via jq fallback
    expect(DEFAULT_CONFIG.documentation?.directories).toBeUndefined();
  });
});
