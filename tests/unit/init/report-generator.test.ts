/**
 * Unit tests for ReportGenerator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ReportGenerator } from '../../../src/init/research/ReportGenerator.js';
import type { VisionInsights } from '../../../src/init/research/types.js';

const TEST_REPORT_PATH = '.specweave/test-reports/market-research.md';

describe('ReportGenerator', () => {
  beforeEach(async () => {
    // Clean up test reports before each test
    try {
      await fs.rm(path.dirname(TEST_REPORT_PATH), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test reports after each test
    try {
      await fs.rm(path.dirname(TEST_REPORT_PATH), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  it('should generate market research report with all sections', async () => {
    const insights: VisionInsights = {
      keywords: ['design', 'collaboration', 'real-time'],
      market: 'productivity-saas',
      competitors: [
        {
          name: 'Figma',
          url: 'https://figma.com',
          similarity: 0.85,
          strengths: ['Real-time collaboration', 'Web-based'],
          weaknesses: ['Complex for beginners']
        }
      ],
      opportunityScore: 8,
      viralPotential: true,
      followUpQuestions: [
        { question: 'Expected user growth?', purpose: 'Scaling planning' }
      ],
      confidence: 0.9,
      rawVision: 'A Figma-like design tool for remote teams'
    };

    await ReportGenerator.generate(insights, TEST_REPORT_PATH);

    // Verify file was created
    const content = await fs.readFile(TEST_REPORT_PATH, 'utf-8');

    expect(content).toContain('# Market Research Report');
    expect(content).toContain('A Figma-like design tool for remote teams');
    expect(content).toContain('design');
    expect(content).toContain('collaboration');
    expect(content).toContain('productivity-saas');
    expect(content).toContain('8/10');
    expect(content).toContain('Viral Potential**: Yes');
    expect(content).toContain('Figma');
    expect(content).toContain('Expected user growth?');
  });

  it('should handle insights with no competitors', async () => {
    const insights: VisionInsights = {
      keywords: ['analytics'],
      market: 'data-analytics',
      competitors: [],
      opportunityScore: 7,
      viralPotential: false,
      followUpQuestions: [],
      confidence: 0.8,
      rawVision: 'An analytics platform'
    };

    await ReportGenerator.generate(insights, TEST_REPORT_PATH);

    const content = await fs.readFile(TEST_REPORT_PATH, 'utf-8');

    expect(content).toContain('No similar products identified');
  });

  it('should handle insights with no follow-up questions', async () => {
    const insights: VisionInsights = {
      keywords: ['gaming'],
      market: 'gaming',
      competitors: [],
      opportunityScore: 6,
      viralPotential: false,
      followUpQuestions: [],
      confidence: 0.7,
      rawVision: 'A gaming platform'
    };

    await ReportGenerator.generate(insights, TEST_REPORT_PATH);

    const content = await fs.readFile(TEST_REPORT_PATH, 'utf-8');

    expect(content).not.toContain('Recommended Next Steps');
  });

  it('should create reports directory if it doesn\'t exist', async () => {
    const insights: VisionInsights = {
      keywords: ['test'],
      market: 'productivity-saas',
      competitors: [],
      opportunityScore: 5,
      viralPotential: false,
      followUpQuestions: [],
      confidence: 0.6,
      rawVision: 'Test vision'
    };

    await ReportGenerator.generate(insights, TEST_REPORT_PATH);

    // Verify directory was created
    const dirExists = await fs.access(path.dirname(TEST_REPORT_PATH))
      .then(() => true)
      .catch(() => false);

    expect(dirExists).toBe(true);
  });

  it('should include timestamp and metadata', async () => {
    const insights: VisionInsights = {
      keywords: ['test'],
      market: 'productivity-saas',
      competitors: [],
      opportunityScore: 5,
      viralPotential: false,
      followUpQuestions: [],
      confidence: 0.6,
      rawVision: 'Test vision'
    };

    await ReportGenerator.generate(insights, TEST_REPORT_PATH);

    const content = await fs.readFile(TEST_REPORT_PATH, 'utf-8');

    expect(content).toContain('**Generated**:');
    expect(content).toContain('**Timestamp**:');
    expect(content).toContain('SpecWeave Strategic Init');
  });
});
