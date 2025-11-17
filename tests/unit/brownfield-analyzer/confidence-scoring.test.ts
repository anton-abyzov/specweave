import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: BrownfieldAnalyzer Confidence Scoring
 * Coverage Target: 95%
 */

import { BrownfieldAnalyzer } from '../../../src/core/brownfield/analyzer.js';
import { withTempDir } from '../../utils/temp-dir.js';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldAnalyzer - Confidence Scoring', () => {
  let analyzer: BrownfieldAnalyzer;

  beforeEach(() => {
    analyzer = new BrownfieldAnalyzer();
  });

  it('should set confidence to 0 for legacy classification', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'legacy.md');
      await fs.writeFile(filePath, 'No relevant keywords');

      const result = await (analyzer as any).classifyFile(filePath, tmpDir);

      expect(result.type).toBe('legacy');
      expect(result.confidence).toBe(0);
    });
  });

  it('should respect 0.3 confidence threshold for spec classification', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'weak-spec.md');
      await fs.writeFile(filePath, 'feature'); // Only 1 keyword

      const result = await (analyzer as any).classifyFile(filePath, tmpDir);

      // Single keyword likely below 0.3 threshold
      expect(result.type).toBe('legacy');
    });
  });

  it('should set confidence > 0.3 for strong spec classification', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'strong-spec.md');
      await fs.writeFile(filePath, 'user story with acceptance criteria feature spec requirement');

      const result = await (analyzer as any).classifyFile(filePath, tmpDir);

      expect(result.type).toBe('spec');
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  it('should assign confidence based on highest scoring category', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'mixed.md');
      // Module keywords stronger than spec keywords
      await fs.writeFile(filePath, 'module component architecture api interface design service domain');

      const result = await (analyzer as any).classifyFile(filePath, tmpDir);

      expect(result.type).toBe('module');
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  it('should calculate average confidence correctly across multiple files', async () => {
    await withTempDir(async (tmpDir) => {
      // Create 3 spec files with strong keywords
      await fs.writeFile(path.join(tmpDir, 'spec1.md'), 'user story acceptance criteria feature spec requirement epic');
      await fs.writeFile(path.join(tmpDir, 'spec2.md'), 'user story acceptance criteria given when then as a i want');
      await fs.writeFile(path.join(tmpDir, 'spec3.md'), 'requirement functional requirement epic milestone product requirement prd');

      const result = await analyzer.analyze(tmpDir);

      expect(result.specs.length).toBe(3);
      expect(result.statistics.specsConfidence).toBeGreaterThan(0);
      expect(result.statistics.specsConfidence).toBeLessThanOrEqual(1);
    });
  });

  it('should return 0 average confidence for empty category', async () => {
    await withTempDir(async (tmpDir) => {
      // Only team docs, no specs
      await fs.writeFile(path.join(tmpDir, 'team.md'), 'onboarding getting started workflow');

      const result = await analyzer.analyze(tmpDir);

      expect(result.specs.length).toBe(0);
      expect(result.statistics.specsConfidence).toBe(0);
    });
  });
});
