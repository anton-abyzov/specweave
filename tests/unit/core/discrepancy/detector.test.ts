/**
 * Tests for Discrepancy Detector
 */

import { describe, it, expect } from 'vitest';
import { DiscrepancyDetector, CodeSignatures } from '../../../../src/core/discrepancy/detector.js';
import { ParsedSpec } from '../../../../src/core/discrepancy/spec-parser.js';

describe('DiscrepancyDetector', () => {
  const detector = new DiscrepancyDetector();

  describe('detect', () => {
    it('should detect added API routes', () => {
      const specs: ParsedSpec[] = [];
      const code: CodeSignatures = {
        functions: [],
        types: [],
        routes: [
          {
            method: 'GET',
            path: '/users',
            filePath: 'src/routes.ts',
            lineNumber: 10,
            params: [],
            framework: 'express',
          },
        ],
      };

      const result = detector.detect(specs, code);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].category).toBe('added');
      expect(result.discrepancies[0].type).toBe('api-route');
      expect(result.discrepancies[0].codeValue).toBe('GET /users');
    });

    it('should detect removed API routes', () => {
      const specs: ParsedSpec[] = [
        {
          type: 'api',
          source: 'docs/api.md',
          lineNumber: 5,
          identifier: '/users',
          description: 'Get users',
          method: 'GET',
          params: [],
        },
      ];
      const code: CodeSignatures = {
        functions: [],
        types: [],
        routes: [],
      };

      const result = detector.detect(specs, code);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].category).toBe('removed');
      expect(result.discrepancies[0].severity).toBe('breaking');
    });

    it('should detect modified API routes', () => {
      const specs: ParsedSpec[] = [
        {
          type: 'api',
          source: 'docs/api.md',
          lineNumber: 5,
          identifier: '/users',
          description: 'Get users',
          method: 'GET',
          params: [],
        },
      ];
      const code: CodeSignatures = {
        functions: [],
        types: [],
        routes: [
          {
            method: 'GET',
            path: '/api/v2/users',
            filePath: 'src/routes.ts',
            lineNumber: 10,
            params: [],
            framework: 'express',
          },
        ],
      };

      const result = detector.detect(specs, code);

      // Should detect both as separate (added + removed) or as modified
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it('should detect added functions', () => {
      const specs: ParsedSpec[] = [];
      const code: CodeSignatures = {
        functions: [
          {
            name: 'newFunction',
            filePath: 'src/utils.ts',
            lineNumber: 20,
            params: [{ name: 'x', type: 'number', optional: false }],
            returnType: 'string',
            exported: true,
            async: false,
          },
        ],
        types: [],
        routes: [],
      };

      const result = detector.detect(specs, code);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].category).toBe('added');
      expect(result.discrepancies[0].type).toBe('function-signature');
    });

    it('should detect removed functions', () => {
      const specs: ParsedSpec[] = [
        {
          type: 'function',
          source: 'docs/api.md',
          lineNumber: 10,
          identifier: 'oldFunction',
          description: 'Old function',
          params: ['x'],
          returnType: 'string',
        },
      ];
      const code: CodeSignatures = {
        functions: [],
        types: [],
        routes: [],
      };

      const result = detector.detect(specs, code);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].category).toBe('removed');
      expect(result.discrepancies[0].severity).toBe('breaking');
    });

    it('should detect signature modifications', () => {
      const specs: ParsedSpec[] = [
        {
          type: 'function',
          source: 'docs/api.md',
          lineNumber: 10,
          identifier: 'myFunc',
          description: 'My function',
          params: ['a', 'b'],
          returnType: 'number',
        },
      ];
      const code: CodeSignatures = {
        functions: [
          {
            name: 'myFunc',
            filePath: 'src/utils.ts',
            lineNumber: 5,
            params: [
              { name: 'a', type: 'number', optional: false },
              { name: 'b', type: 'number', optional: false },
              { name: 'c', type: 'number', optional: true },
            ],
            returnType: 'number',
            exported: true,
            async: false,
          },
        ],
        types: [],
        routes: [],
      };

      const result = detector.detect(specs, code);

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].category).toBe('modified');
      expect(result.discrepancies[0].description).toContain('Parameter count');
    });

    it('should calculate summary correctly', () => {
      const specs: ParsedSpec[] = [
        {
          type: 'api',
          source: 'docs/api.md',
          lineNumber: 5,
          identifier: '/old',
          description: 'Old route',
          method: 'GET',
        },
      ];
      const code: CodeSignatures = {
        functions: [
          {
            name: 'newFunc',
            filePath: 'src/utils.ts',
            lineNumber: 1,
            params: [],
            returnType: 'void',
            exported: true,
            async: false,
          },
        ],
        types: [],
        routes: [],
      };

      const result = detector.detect(specs, code);

      expect(result.summary.total).toBe(2);
      expect(result.summary.byCategory.added).toBe(1);
      expect(result.summary.byCategory.removed).toBe(1);
    });
  });
});
