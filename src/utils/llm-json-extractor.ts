/**
 * LLM JSON Extractor - Robust JSON parsing from LLM responses
 *
 * Handles common LLM output patterns:
 * - "Based on the analysis, here is the JSON: {...}"
 * - "```json\n{...}\n```"
 * - "Here's what I found:\n{...}"
 * - Pure JSON responses
 *
 * Features:
 * - 4-level extraction strategy (pure -> code blocks -> regex -> array)
 * - Input sanitization (BOM, trailing commas)
 * - Schema-aware correction prompts
 * - Required field validation
 * - Retry-with-correction prompting
 */

import { Logger, consoleLogger } from './logger.js';

/**
 * Result of JSON extraction attempt
 */
export interface ExtractionResult<T = unknown> {
  success: boolean;
  data: T | null;
  rawResponse: string;
  extractedJson: string | null;
  error: string | null;
  /** How the JSON was extracted */
  extractionMethod: 'pure' | 'code-block' | 'regex' | 'failed';
}

/**
 * Options for JSON extraction
 */
export interface ExtractionOptions {
  /** Required fields to validate in the parsed JSON */
  requiredFields?: string[];
  /** Schema for correction prompts (recommended for retry flows) */
  schema?: Record<string, unknown>;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Extract JSON from an LLM response that may contain prose
 *
 * Tries multiple extraction strategies in order:
 * 1. Direct parse (pure JSON)
 * 2. Remove markdown code blocks
 * 3. Find JSON object via regex (handles prose around JSON)
 * 4. Find JSON array via regex
 */
export function extractJson<T = unknown>(
  response: string,
  options: ExtractionOptions = {}
): ExtractionResult<T> {
  const logger = options.logger ?? consoleLogger;
  const result: ExtractionResult<T> = {
    success: false,
    data: null,
    rawResponse: response,
    extractedJson: null,
    error: null,
    extractionMethod: 'failed'
  };

  if (!response || typeof response !== 'string') {
    result.error = 'Empty or invalid response';
    return result;
  }

  // Sanitize input: strip BOM and normalize
  const sanitized = sanitizeInput(response);
  const trimmed = sanitized.trim();

  // Strategy 1: Direct parse (pure JSON) - with trailing comma fallback
  const directParsed = tryParseJson(trimmed);
  if (directParsed !== null && validateParsedJson(directParsed, options.requiredFields)) {
    result.success = true;
    result.data = directParsed as T;
    result.extractedJson = trimmed;
    result.extractionMethod = 'pure';
    return result;
  }

  // Strategy 2: Remove markdown code blocks
  const codeBlockPatterns = [
    /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m,  // Full code block
    /```(?:json)?\s*\n?([\s\S]*?)\n?```/,      // Code block anywhere
  ];

  for (const pattern of codeBlockPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const codeBlockContent = match[1].trim();
      const parsed = tryParseJson(codeBlockContent);
      if (parsed !== null && validateParsedJson(parsed, options.requiredFields)) {
        result.success = true;
        result.data = parsed as T;
        result.extractedJson = codeBlockContent;
        result.extractionMethod = 'code-block';
        return result;
      }
    }
  }

  // Strategy 3: Find JSON object via regex (handles "Based on... here is: {...}")
  // Find the outermost balanced braces
  const jsonObject = findBalancedJson(trimmed, '{', '}');
  if (jsonObject) {
    const parsed = tryParseJson(jsonObject);
    if (parsed !== null && validateParsedJson(parsed, options.requiredFields)) {
      result.success = true;
      result.data = parsed as T;
      result.extractedJson = jsonObject;
      result.extractionMethod = 'regex';
      return result;
    }
  }

  // Strategy 4: Find JSON array
  const jsonArray = findBalancedJson(trimmed, '[', ']');
  if (jsonArray) {
    const parsed = tryParseJson(jsonArray);
    if (parsed !== null && validateParsedJson(parsed, options.requiredFields)) {
      result.success = true;
      result.data = parsed as T;
      result.extractedJson = jsonArray;
      result.extractionMethod = 'regex';
      return result;
    }
  }

  // All strategies failed
  result.error = generateErrorMessage(trimmed);
  logger.debug?.(`JSON extraction failed: ${result.error}`);
  return result;
}

/**
 * Find balanced JSON by matching opening/closing brackets
 * Handles nested structures and strings with escaped characters
 */
function findBalancedJson(text: string, openChar: string, closeChar: string): string | null {
  const startIdx = text.indexOf(openChar);
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.slice(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Validate parsed JSON has required fields
 */
function validateParsedJson(parsed: unknown, requiredFields?: string[]): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  if (!requiredFields || requiredFields.length === 0) {
    return true;
  }

  const obj = parsed as Record<string, unknown>;
  return requiredFields.every(field => field in obj);
}

/**
 * Sanitize LLM response input before JSON extraction
 *
 * Handles common issues:
 * - UTF-8 BOM character
 * - Trailing commas in arrays/objects (common LLM mistake)
 */
function sanitizeInput(input: string): string {
  // Strip UTF-8 BOM if present
  return input.replace(/^\uFEFF/, '');
}

/**
 * Clean trailing commas from JSON string
 * Called after extraction but before parsing
 */
function cleanTrailingCommas(json: string): string {
  // Remove trailing commas before ] or }
  // Be careful not to modify strings - only do this on extracted JSON
  return json.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Try to parse JSON with trailing comma cleanup as fallback
 */
function tryParseJson(json: string): unknown | null {
  try {
    return JSON.parse(json);
  } catch {
    // Try with trailing comma cleanup
    try {
      const cleaned = cleanTrailingCommas(json);
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

/**
 * Generate helpful error message for failed extraction
 */
function generateErrorMessage(response: string): string {
  const preview = response.slice(0, 100).replace(/\n/g, ' ');

  if (response.toLowerCase().startsWith('based on')) {
    return `Model returned prose instead of JSON. Response starts with: "${preview}..."`;
  }

  if (response.toLowerCase().includes('i apologize') || response.toLowerCase().includes('sorry')) {
    return `Model returned an apology/error message instead of JSON. Response starts with: "${preview}..."`;
  }

  if (response.includes('{')) {
    return `Found JSON-like content but parsing failed. Response starts with: "${preview}..."`;
  }

  return `No valid JSON found in response. Response starts with: "${preview}..."`;
}

/**
 * Generate a correction prompt for retry after failed JSON extraction
 *
 * @param originalPrompt - The original prompt that was sent
 * @param failedResponse - The failed response from the LLM
 * @param schema - Optional schema to show expected structure (recommended)
 */
export function generateCorrectionPrompt(
  originalPrompt: string,
  failedResponse: string,
  schema?: Record<string, unknown>
): string {
  // Build schema example - either from provided schema or use default
  let schemaExample: string;

  if (schema && Object.keys(schema).length > 0) {
    // Use provided schema
    schemaExample = JSON.stringify(schema, null, 2);
  } else {
    // Fallback to generic example (backward compatible)
    schemaExample = `{
  "purpose": "...",
  "keyConcepts": [...],
  "dependencies": [...],
  "complexity": "low|medium|high",
  "suggestedDocs": [...],
  "architecturalNotes": "..."
}`;
  }

  return `Your previous response was not valid JSON. I need ONLY a JSON object, with no explanations or prose.

INCORRECT (what you sent):
${failedResponse.slice(0, 200)}${failedResponse.length > 200 ? '...' : ''}

CORRECT format - respond with ONLY this JSON structure, nothing else before or after:
${schemaExample}

Now provide ONLY the JSON for: ${originalPrompt.slice(0, 500)}`;
}

/**
 * Extract required field names from a JSON schema object
 *
 * Handles common schema patterns:
 * - Simple objects: extracts top-level keys
 * - Objects with "type" descriptors: extracts keys
 *
 * @param schema - The schema object passed to analyzeStructured (any object type)
 * @returns Array of required field names
 */
export function extractRequiredFieldsFromSchema(
  schema: unknown
): string[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  // For simple schemas like { purpose: "...", complexity: "..." }
  // Return all top-level keys
  return Object.keys(schema as object);
}

/**
 * Build a prompt that strongly encourages JSON-only output
 *
 * Uses multiple techniques:
 * 1. Leading instruction (most important position)
 * 2. Schema definition
 * 3. Trailing reminder
 */
export function buildJsonPrompt(
  context: string,
  schema: Record<string, string>,
  instruction: string
): string {
  const schemaExample = JSON.stringify(
    Object.fromEntries(
      Object.entries(schema).map(([k, v]) => [k, v])
    ),
    null,
    2
  );

  return `IMPORTANT: Respond with ONLY valid JSON. No explanations, no markdown, no text before or after.

${instruction}

${context}

Required JSON schema:
${schemaExample}

Remember: Output ONLY the JSON object. Any text outside the JSON will cause errors.`;
}

/**
 * Retry wrapper that attempts extraction with correction prompts
 *
 * Uses schema-aware correction prompts for better retry success.
 */
export async function extractJsonWithRetry<T = unknown>(
  sendPrompt: (prompt: string) => Promise<string>,
  originalPrompt: string,
  options: ExtractionOptions & { maxRetries?: number } = {}
): Promise<ExtractionResult<T>> {
  const maxRetries = options.maxRetries ?? 2;
  const logger = options.logger ?? consoleLogger;

  let lastResult: ExtractionResult<T>;
  let currentPrompt = originalPrompt;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.debug?.(`JSON extraction retry ${attempt}/${maxRetries}`);
    }

    const response = await sendPrompt(currentPrompt);
    lastResult = extractJson<T>(response, options);

    if (lastResult.success) {
      if (attempt > 0) {
        logger.debug?.(`JSON extraction succeeded on retry ${attempt}`);
      }
      return lastResult;
    }

    // Generate schema-aware correction prompt for next attempt
    if (attempt < maxRetries) {
      currentPrompt = generateCorrectionPrompt(originalPrompt, response, options.schema);
    }
  }

  return lastResult!;
}

/**
 * Create a structured output analyzer with built-in retry
 *
 * This is the recommended way to get structured JSON from LLMs.
 * Combines prompt building, extraction, validation, and retry.
 *
 * @param analyze - Function that sends prompt to LLM and returns response
 * @param schema - Expected schema (used for prompt, validation, and correction)
 * @param options - Configuration options
 */
export async function analyzeStructuredWithRetry<T = unknown>(
  analyze: (prompt: string) => Promise<string>,
  prompt: string,
  schema: Record<string, unknown>,
  options: {
    maxRetries?: number;
    logger?: Logger;
  } = {}
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const requiredFields = extractRequiredFieldsFromSchema(schema);

  const result = await extractJsonWithRetry<T>(
    analyze,
    prompt,
    {
      requiredFields,
      schema,
      maxRetries: options.maxRetries ?? 2,
      logger: options.logger
    }
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error
  };
}
