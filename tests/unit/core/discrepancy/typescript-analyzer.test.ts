/**
 * Tests for TypeScript Analyzer
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { TypeScriptAnalyzer } from '../../../../src/core/discrepancy/analyzers/typescript-analyzer.js';

describe('TypeScriptAnalyzer', () => {
  const fixturesPath = path.join(__dirname, '../../../fixtures/discrepancy/sample-project');
  let analyzer: TypeScriptAnalyzer;

  beforeAll(() => {
    analyzer = new TypeScriptAnalyzer({
      config: { basePath: fixturesPath },
    });
  });

  describe('analyze', () => {
    it('should extract exported functions', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      expect(result.errors).toHaveLength(0);

      // Find the add function
      const addFunc = result.functions.find(f => f.name === 'add');
      expect(addFunc).toBeDefined();
      expect(addFunc?.exported).toBe(true);
      expect(addFunc?.params).toHaveLength(2);
      expect(addFunc?.params[0].name).toBe('a');
      expect(addFunc?.params[0].type).toBe('number');
      expect(addFunc?.returnType).toBe('number');
    });

    it('should extract arrow functions', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const subtractFunc = result.functions.find(f => f.name === 'subtract');
      expect(subtractFunc).toBeDefined();
      expect(subtractFunc?.exported).toBe(true);
    });

    it('should mark private functions as not exported', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const privateFunc = result.functions.find(f => f.name === 'privateHelper');
      expect(privateFunc).toBeDefined();
      expect(privateFunc?.exported).toBe(false); // Extracted but marked as not exported
    });

    it('should extract interfaces', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const userInterface = result.types.find(t => t.name === 'User');
      expect(userInterface).toBeDefined();
      expect(userInterface?.kind).toBe('interface');
      expect(userInterface?.exported).toBe(true);
      expect(userInterface?.properties).toHaveLength(4);
    });

    it('should extract type aliases', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const apiResponseType = result.types.find(t => t.name === 'ApiResponse');
      expect(apiResponseType).toBeDefined();
      expect(apiResponseType?.kind).toBe('type');
    });

    it('should extract class methods', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const multiplyMethod = result.functions.find(f => f.name === 'Calculator.multiply');
      expect(multiplyMethod).toBeDefined();
      expect(multiplyMethod?.exported).toBe(true);

      const divideMethod = result.functions.find(f => f.name === 'Calculator.divide');
      expect(divideMethod).toBeDefined();
      expect(divideMethod?.async).toBe(true);
    });

    it('should extract JSDoc comments', async () => {
      const result = await analyzer.analyzeFile(path.join(fixturesPath, 'sample-functions.ts'));

      const addFunc = result.functions.find(f => f.name === 'add');
      expect(addFunc?.jsdoc).toContain('Adds two numbers');
    });

    it('should handle file not found', async () => {
      const result = await analyzer.analyzeFile('/nonexistent/file.ts');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });
  });

  describe('analyze multiple files', () => {
    it('should analyze multiple files', async () => {
      const result = await analyzer.analyze([
        path.join(fixturesPath, 'sample-functions.ts'),
      ]);

      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.types.length).toBeGreaterThan(0);
    });
  });
});
