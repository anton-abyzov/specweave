/**
 * Media Plugin Registry Tests
 *
 * Verifies that sw-media is properly registered in the plugin system
 * and that the LLM detection prompt includes media-related keywords.
 *
 * @module tests/unit/core/lazy-loading/media-plugin-registry
 */

import { describe, it, expect } from 'vitest';
import {
  SPECWEAVE_PLUGINS,
  isSpecWeavePlugin,
  getPluginMarketplace,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

describe('sw-media Plugin Registry', () => {
  it('should include sw-media in SPECWEAVE_PLUGINS array', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-media');
  });

  it('should recognize sw-media as a SpecWeave plugin', () => {
    expect(isSpecWeavePlugin('sw-media')).toBe(true);
  });

  it('should return specweave marketplace for sw-media', () => {
    expect(getPluginMarketplace('sw-media')).toBe('specweave');
  });
});

describe('sw-media Detection Prompt Keywords', () => {
  // We test the exported function indirectly by checking the prompt
  // contains media-related keywords for LLM detection
  // Since buildDetectionPrompt is not exported, we import and test the module behavior

  it('should detect media keywords in detection prompt', async () => {
    // Import the module source to check the detection prompt content
    const fs = await import('fs');
    const path = await import('path');
    const detectorPath = path.resolve(
      import.meta.dirname,
      '../../../../src/core/lazy-loading/llm-plugin-detector.ts'
    );
    const source = fs.readFileSync(detectorPath, 'utf-8');

    // The detection prompt must include sw-media with relevant keywords
    expect(source).toMatch(/sw-media.*(?:image|video|media)/i);
  });

  it('should include image generation keywords', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const detectorPath = path.resolve(
      import.meta.dirname,
      '../../../../src/core/lazy-loading/llm-plugin-detector.ts'
    );
    const source = fs.readFileSync(detectorPath, 'utf-8');

    // Must mention key terms in the detection prompt
    expect(source).toContain('text-to-image');
    expect(source).toContain('text-to-video');
  });
});
