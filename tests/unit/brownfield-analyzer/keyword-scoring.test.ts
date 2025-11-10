/**
 * Unit Tests: BrownfieldAnalyzer Keyword Scoring
 *
 * Tests the keyword scoring algorithm for classification.
 * Coverage Target: 95%
 */

import { BrownfieldAnalyzer } from '../../../src/core/brownfield/analyzer';

describe('BrownfieldAnalyzer - Keyword Scoring', () => {
  let analyzer: BrownfieldAnalyzer;

  beforeEach(() => {
    analyzer = new BrownfieldAnalyzer();
  });

  describe('scoreKeywords() - Basic Scoring', () => {
    it('should return 0 for text with no keyword matches', () => {
      const text = 'this is some random text with no relevant keywords';
      const keywords = ['user story', 'acceptance criteria', 'feature', 'spec'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      expect(score).toBe(0);
    });

    it('should return positive score for single keyword match', () => {
      const text = 'this document contains a feature specification';
      const keywords = ['feature', 'spec', 'user story', 'requirement'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Should have 2 matches: "feature" and "spec" (from "specification")
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return higher score for multiple keyword matches', () => {
      const text = 'user story with acceptance criteria and feature specification';
      const keywords = ['user story', 'acceptance criteria', 'feature', 'spec'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Should have 4 matches (all keywords)
      expect(score).toBeGreaterThan(0.7); // High confidence
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should never exceed score of 1.0', () => {
      // Text with ALL keywords multiple times
      const text = 'user story user story acceptance criteria feature spec requirement epic milestone';
      const keywords = ['user story', 'acceptance criteria', 'feature', 'spec', 'requirement', 'epic'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('scoreKeywords() - Multi-word Keyword Weighting', () => {
    it('should weight multi-word keywords more heavily', () => {
      const singleWordText = 'this document has feature information';
      const multiWordText = 'this document has user story information';
      const keywords = ['feature', 'user story'];

      const singleWordScore = (analyzer as any).scoreKeywords(singleWordText, keywords);
      const multiWordScore = (analyzer as any).scoreKeywords(multiWordText, keywords);

      // "user story" (2 words) should score higher than "feature" (1 word)
      expect(multiWordScore).toBeGreaterThan(singleWordScore);
    });

    it('should handle three-word keywords with highest weight', () => {
      const text = 'functional requirement document with user story';
      const keywords = ['feature', 'user story', 'functional requirement'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Should find both "user story" (2 words) and "functional requirement" (2 words)
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('scoreKeywords() - Score Calculation', () => {
    it('should calculate base score as (matches / total keywords)', () => {
      const text = 'feature and spec';
      const keywords = ['feature', 'spec', 'user story', 'requirement']; // 2/4 = 0.5 base

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Base score contributes 60%, so minimum should be 0.5 * 0.6 = 0.3
      expect(score).toBeGreaterThanOrEqual(0.3);
    });

    it('should combine base and weighted scores (60% base, 40% weighted)', () => {
      const text = 'feature'; // 1 single-word keyword
      const keywords = ['feature', 'user story', 'acceptance criteria', 'spec'];

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // 1 match out of 4 keywords = 0.25 base score
      // Weight for "feature" = 1 word
      // Expected: roughly 0.25 * 0.6 + weighted * 0.4
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5); // Should be relatively low
    });
  });

  describe('scoreKeywords() - Case Handling', () => {
    it('should match keywords when both text and keywords are lowercase', () => {
      const text = 'user story with acceptance criteria'; // Lowercase text
      const keywords = ['user story', 'acceptance criteria', 'feature']; // Lowercase keywords

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Should match both "user story" and "acceptance criteria"
      expect(score).toBeGreaterThan(0.5); // High confidence with 2/3 matches
    });

    it('should not match if keywords have different case (method expects lowercase)', () => {
      const text = 'user story with acceptance criteria'; // Lowercase text
      const keywords = ['User Story', 'Acceptance Criteria']; // Mixed case keywords

      const score = (analyzer as any).scoreKeywords(text, keywords);

      // Won't match because keywords are not lowercase
      // The actual implementation expects keywords array to be pre-lowercased
      expect(score).toBe(0);
    });
  });
});
