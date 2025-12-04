/**
 * Tests for LLM JSON Extractor
 *
 * Covers all common LLM output patterns and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  extractJson,
  buildJsonPrompt,
  generateCorrectionPrompt,
  extractRequiredFieldsFromSchema,
  extractJsonWithRetry
} from '../../../src/utils/llm-json-extractor.js';

describe('extractJson', () => {
  describe('pure JSON responses', () => {
    it('should parse pure JSON object', () => {
      const response = '{"purpose": "test", "complexity": "low"}';
      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ purpose: 'test', complexity: 'low' });
      expect(result.extractionMethod).toBe('pure');
    });

    it('should parse pure JSON array', () => {
      const response = '[1, 2, 3]';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.extractionMethod).toBe('pure');
    });

    it('should handle whitespace around JSON', () => {
      const response = '  \n  {"key": "value"}  \n  ';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });
  });

  describe('markdown code blocks', () => {
    it('should extract from ```json code block', () => {
      const response = '```json\n{"purpose": "test", "complexity": "high"}\n```';
      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ purpose: 'test', complexity: 'high' });
      expect(result.extractionMethod).toBe('code-block');
    });

    it('should extract from ``` code block without json label', () => {
      const response = '```\n{"key": "value"}\n```';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.extractionMethod).toBe('code-block');
    });

    it('should handle code block with extra whitespace', () => {
      const response = '```json  \n  {"nested": {"deep": true}}  \n```';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ nested: { deep: true } });
    });
  });

  describe('prose before JSON (the main failure case)', () => {
    it('should extract JSON after "Based on..." prose', () => {
      const response = `Based on the analysis of the module, here is the JSON response:

{"purpose": "Handles authentication", "keyConcepts": ["JWT", "OAuth"], "complexity": "medium"}`;

      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        purpose: 'Handles authentication',
        keyConcepts: ['JWT', 'OAuth'],
        complexity: 'medium'
      });
      expect(result.extractionMethod).toBe('regex');
    });

    it('should extract JSON after "Here is..." prose', () => {
      const response = `Here is my analysis:

{
  "purpose": "Data processing module",
  "complexity": "high",
  "architecturalNotes": "Uses streaming for large files"
}`;

      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data?.purpose).toBe('Data processing module');
      expect(result.extractionMethod).toBe('regex');
    });

    it('should handle JSON followed by additional prose', () => {
      const response = `The module analysis is:
{"purpose": "test", "complexity": "low"}

I hope this helps! Let me know if you need more details.`;

      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ purpose: 'test', complexity: 'low' });
    });

    it('should handle multi-paragraph prose before JSON', () => {
      const response = `Based on my thorough analysis of the codebase structure and the module patterns observed, I have identified the key characteristics.

The module appears to be well-structured with clear separation of concerns.

Here is my assessment in the requested format:
{"purpose": "Core business logic", "complexity": "medium", "keyConcepts": ["DDD", "CQRS"]}`;

      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data?.purpose).toBe('Core business logic');
    });
  });

  describe('nested JSON structures', () => {
    it('should handle deeply nested objects', () => {
      const response = '{"level1": {"level2": {"level3": {"value": 42}}}}';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ level1: { level2: { level3: { value: 42 } } } });
    });

    it('should handle arrays within objects', () => {
      const response = '{"items": [{"id": 1}, {"id": 2}], "count": 2}';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ items: [{ id: 1 }, { id: 2 }], count: 2 });
    });

    it('should handle strings with escaped quotes', () => {
      const response = '{"message": "He said \\"hello\\"", "valid": true}';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('He said "hello"');
    });

    it('should handle strings with braces inside', () => {
      const response = '{"code": "function() { return {}; }", "type": "snippet"}';
      const result = extractJson(response);

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('snippet');
    });
  });

  describe('required field validation', () => {
    it('should fail when required fields are missing', () => {
      const response = '{"purpose": "test"}';
      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(false);
      // Error message indicates JSON was found but validation failed
      expect(result.error).toBeTruthy();
    });

    it('should pass when all required fields are present', () => {
      const response = '{"purpose": "test", "complexity": "low", "extra": "field"}';
      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
    });

    it('should accept any valid JSON when no required fields specified', () => {
      const response = '{"any": "structure"}';
      const result = extractJson(response);

      expect(result.success).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should fail on empty string', () => {
      const result = extractJson('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty or invalid response');
    });

    it('should fail on null/undefined', () => {
      const result = extractJson(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty or invalid response');
    });

    it('should fail on pure prose without JSON', () => {
      const response = 'This is just a text response without any JSON content.';
      const result = extractJson(response);

      expect(result.success).toBe(false);
      expect(result.extractionMethod).toBe('failed');
    });

    it('should fail on malformed JSON', () => {
      const response = '{"unclosed": "string';
      const result = extractJson(response);

      expect(result.success).toBe(false);
    });

    it('should detect apology responses', () => {
      const response = "I apologize, but I cannot provide that information.";
      const result = extractJson(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('apology');
    });

    it('should detect "Based on" without JSON', () => {
      const response = 'Based on my analysis, the module is quite complex but I cannot format it as JSON.';
      const result = extractJson(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prose instead of JSON');
    });
  });

  describe('real-world LLM response patterns', () => {
    it('should handle the exact failing pattern from logs', () => {
      const response = `Based on my analysis of the core-experience module, this appears to be a frontend module for the core user experience. Here's the analysis:

{
  "purpose": "Core user experience module providing the main UI components and interaction patterns",
  "keyConcepts": ["React components", "State management", "UI/UX patterns"],
  "dependencies": ["react", "redux", "@company/design-system"],
  "complexity": "high",
  "suggestedDocs": ["component-guide.md", "state-management.md"],
  "architecturalNotes": "Heavy use of HOCs and render props, may benefit from hooks migration"
}`;

      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data?.purpose).toContain('Core user experience');
      expect(result.data?.complexity).toBe('high');
      expect(result.extractionMethod).toBe('regex');
    });

    it('should handle Claude response with thinking prefix', () => {
      const response = `Let me analyze this module...

After reviewing the exports and file structure, I can see this is a data access layer.

{"purpose": "Database access layer with ORM integration", "complexity": "medium", "keyConcepts": ["TypeORM", "Repository pattern"], "dependencies": ["typeorm", "pg"], "suggestedDocs": ["database-schema.md"], "architecturalNotes": "Consider adding connection pooling"}`;

      const result = extractJson(response, { requiredFields: ['purpose', 'complexity'] });

      expect(result.success).toBe(true);
      expect(result.data?.purpose).toContain('Database access');
    });
  });
});

describe('buildJsonPrompt', () => {
  it('should place instruction at the start', () => {
    const prompt = buildJsonPrompt(
      'context here',
      { field1: 'desc1', field2: 'desc2' },
      'Do the analysis'
    );

    expect(prompt.startsWith('IMPORTANT:')).toBe(true);
    expect(prompt).toContain('Respond with ONLY valid JSON');
  });

  it('should include schema example', () => {
    const prompt = buildJsonPrompt(
      'context',
      { purpose: 'description', complexity: 'low|medium|high' },
      'instruction'
    );

    expect(prompt).toContain('"purpose"');
    expect(prompt).toContain('"complexity"');
  });

  it('should include reminder at end', () => {
    const prompt = buildJsonPrompt('ctx', { f: 'd' }, 'instr');

    expect(prompt).toContain('Remember: Output ONLY the JSON');
  });
});

describe('generateCorrectionPrompt', () => {
  it('should include preview of failed response', () => {
    const correction = generateCorrectionPrompt(
      'original prompt',
      'Based on the analysis, here is what I found...'
    );

    expect(correction).toContain('was not valid JSON');
    expect(correction).toContain('Based on');
  });

  it('should truncate long failed responses', () => {
    const longResponse = 'x'.repeat(500);
    const correction = generateCorrectionPrompt('original', longResponse);

    expect(correction).toContain('...');
    expect(correction.length).toBeLessThan(1000);
  });

  it('should include schema reminder', () => {
    const correction = generateCorrectionPrompt('original', 'failed');

    expect(correction).toContain('"purpose"');
    expect(correction).toContain('"complexity"');
    // Check for strong wording about JSON-only output
    expect(correction).toMatch(/ONLY|INCORRECT|CORRECT/);
  });

  it('should use provided schema when available', () => {
    const schema = { name: 'string', age: 'number', active: 'boolean' };
    const correction = generateCorrectionPrompt('original', 'failed', schema);

    expect(correction).toContain('"name"');
    expect(correction).toContain('"age"');
    expect(correction).toContain('"active"');
    // Should NOT have default schema fields
    expect(correction).not.toContain('"purpose"');
  });
});

describe('extractRequiredFieldsFromSchema', () => {
  it('should extract top-level keys from simple schema', () => {
    const schema = { purpose: 'string', complexity: 'low|medium|high', count: 0 };
    const fields = extractRequiredFieldsFromSchema(schema);

    expect(fields).toContain('purpose');
    expect(fields).toContain('complexity');
    expect(fields).toContain('count');
    expect(fields.length).toBe(3);
  });

  it('should return empty array for null/undefined', () => {
    expect(extractRequiredFieldsFromSchema(null as any)).toEqual([]);
    expect(extractRequiredFieldsFromSchema(undefined as any)).toEqual([]);
  });

  it('should return empty array for non-object', () => {
    expect(extractRequiredFieldsFromSchema('string' as any)).toEqual([]);
  });

  it('should handle empty schema', () => {
    expect(extractRequiredFieldsFromSchema({})).toEqual([]);
  });
});

describe('input sanitization', () => {
  it('should handle UTF-8 BOM character', () => {
    const responseWithBom = '\uFEFF{"key": "value"}';
    const result = extractJson(responseWithBom);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  it('should handle trailing comma in object', () => {
    const responseWithTrailingComma = '{"key": "value", "items": [1, 2, 3],}';
    const result = extractJson(responseWithTrailingComma);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value', items: [1, 2, 3] });
  });

  it('should handle trailing comma in array', () => {
    const responseWithTrailingComma = '{"items": [1, 2, 3,]}';
    const result = extractJson(responseWithTrailingComma);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [1, 2, 3] });
  });

  it('should handle BOM + prose + JSON with trailing comma', () => {
    const complexResponse = '\uFEFFBased on analysis: {"count": 5, "items": ["a", "b",]}';
    const result = extractJson(complexResponse);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 5, items: ['a', 'b'] });
  });
});

describe('extractJsonWithRetry', () => {
  it('should succeed on first try for valid JSON', async () => {
    let callCount = 0;
    const mockSend = async () => {
      callCount++;
      return '{"result": "success"}';
    };

    const result = await extractJsonWithRetry(mockSend, 'test prompt');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ result: 'success' });
    expect(callCount).toBe(1);
  });

  it('should retry on failure and succeed', async () => {
    let callCount = 0;
    const mockSend = async (prompt: string) => {
      callCount++;
      if (callCount === 1) {
        return 'Based on my analysis, the result is...'; // Invalid
      }
      return '{"result": "success"}'; // Valid on retry
    };

    const result = await extractJsonWithRetry(mockSend, 'test prompt', { maxRetries: 2 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ result: 'success' });
    expect(callCount).toBe(2);
  });

  it('should pass schema to correction prompt', async () => {
    let receivedPrompt = '';
    let callCount = 0;
    const mockSend = async (prompt: string) => {
      callCount++;
      receivedPrompt = prompt;
      if (callCount === 1) {
        return 'Invalid response';
      }
      return '{"name": "test"}';
    };

    const schema = { name: 'string', value: 'number' };
    await extractJsonWithRetry(mockSend, 'original', { schema, maxRetries: 1 });

    // Check that correction prompt contains schema fields
    expect(receivedPrompt).toContain('"name"');
    expect(receivedPrompt).toContain('"value"');
  });

  it('should fail after max retries exceeded', async () => {
    const mockSend = async () => 'Not valid JSON ever';

    const result = await extractJsonWithRetry(mockSend, 'test', { maxRetries: 2 });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
