/**
 * Tests for AC-US1-07: User-friendly questions (no jargon)
 *
 * Validates that all init prompt functions use user-friendly language
 * and avoid technical jargon like "microservices", "monorepo", etc.
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('AC-US1-07: User-friendly questions validation', () => {
  // List of jargon words that should NOT appear in user-facing questions
  const JARGON_WORDS = [
    'microservices',
    'microservice',
    'monorepo',
    'polyrepo',
    'monorepository',
    'multi-repo',  // Allow in comments, but not in question strings
  ];

  // Extract question text from comments in InitFlow.ts
  function extractQuestionStrings(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const questions: string[] = [];

    // Match lines like: // Question: "..."
    const questionRegex = /\/\/ Question: "(.*?)"/g;
    let match;

    while ((match = questionRegex.exec(content)) !== null) {
      questions.push(match[1]);
    }

    return questions;
  }

  it('should have at least 5 question strings defined', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const questions = extractQuestionStrings(initFlowPath);

    expect(questions.length).toBeGreaterThanOrEqual(5);
  });

  it('should NOT contain "microservices" in any question', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const questions = extractQuestionStrings(initFlowPath);

    for (const question of questions) {
      expect(question.toLowerCase()).not.toContain('microservices');
      expect(question.toLowerCase()).not.toContain('microservice');
    }
  });

  it('should NOT contain "monorepo" in any question', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const questions = extractQuestionStrings(initFlowPath);

    for (const question of questions) {
      expect(question.toLowerCase()).not.toContain('monorepo');
      expect(question.toLowerCase()).not.toContain('polyrepo');
      expect(question.toLowerCase()).not.toContain('monorepository');
    }
  });

  it('should use "backend services" instead of "microservices"', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const questions = extractQuestionStrings(initFlowPath);

    // Find the services question
    const servicesQuestion = questions.find(q => q.toLowerCase().includes('services'));

    expect(servicesQuestion).toBeDefined();
    expect(servicesQuestion?.toLowerCase()).toContain('backend services');
    expect(servicesQuestion?.toLowerCase()).not.toContain('microservices');
  });

  it('should use "code repositories" instead of "monorepo/polyrepo"', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const questions = extractQuestionStrings(initFlowPath);

    // Find the repository question
    const repoQuestion = questions.find(q => q.toLowerCase().includes('repositories'));

    expect(repoQuestion).toBeDefined();
    expect(repoQuestion?.toLowerCase()).toContain('code repositories');
    expect(repoQuestion?.toLowerCase()).not.toContain('monorepo');
    expect(repoQuestion?.toLowerCase()).not.toContain('polyrepo');
  });

  it('should have explanatory help text for complex questions', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const content = fs.readFileSync(initFlowPath, 'utf-8');

    // Count "Help:" comments
    const helpRegex = /\/\/ Help: "(.*?)"/g;
    const helpTexts = [];
    let match;

    while ((match = helpRegex.exec(content)) !== null) {
      helpTexts.push(match[1]);
    }

    // Should have at least 3 help texts
    expect(helpTexts.length).toBeGreaterThanOrEqual(3);
  });

  it('should provide examples for abstract questions', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const content = fs.readFileSync(initFlowPath, 'utf-8');

    // Count examples (either "Example:" or "Options:" in comments)
    const exampleRegex = /\/\/ (?:Example|Options): "(.*?)"/g;
    const examples = [];
    let match;

    while ((match = exampleRegex.exec(content)) !== null) {
      examples.push(match[1]);
    }

    // Should have at least 5 examples/options
    expect(examples.length).toBeGreaterThanOrEqual(5);
  });

  it('should mark functions with ✅ USER-FRIENDLY markers', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const content = fs.readFileSync(initFlowPath, 'utf-8');

    // Count ✅ USER-FRIENDLY markers
    const markerCount = (content.match(/✅ USER-FRIENDLY/g) || []).length;

    // Should have at least 6 markers (one per prompt function)
    expect(markerCount).toBeGreaterThanOrEqual(6);
  });

  it('should have ❌ AVOID markers for jargon terms', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const content = fs.readFileSync(initFlowPath, 'utf-8');

    // Should document what to avoid
    const avoidMarkerCount = (content.match(/❌ AVOID/g) || []).length;

    expect(avoidMarkerCount).toBeGreaterThanOrEqual(1);
  });

  it('should NOT use jargon in function doc comments', () => {
    const initFlowPath = path.join(process.cwd(), 'src/init/InitFlow.ts');
    const content = fs.readFileSync(initFlowPath, 'utf-8');

    // Extract all JSDoc comments for prompt functions
    const promptFunctionDocs = content.match(/\/\*\*[\s\S]*?\*\/\s*async function prompt/g) || [];

    for (const doc of promptFunctionDocs) {
      // Check for jargon in JSDoc summaries (first line)
      const firstLine = doc.split('\n')[1] || '';

      for (const jargon of JARGON_WORDS) {
        if (jargon === 'multi-repo') continue; // Allowed in technical docs

        expect(firstLine.toLowerCase()).not.toContain(jargon);
      }
    }
  });
});
