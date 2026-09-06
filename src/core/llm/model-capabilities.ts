/**
 * Per-model API capability gates for the Anthropic first-party provider.
 *
 * The Messages API surface is not uniform across the models this repo can be
 * pointed at, and getting either of these wrong is a hard 400 rather than a
 * degraded response:
 *
 * - Sampling params (`temperature`, `top_p`, `top_k`) were removed on Opus 4.7+
 *   and Sonnet 5. They are still accepted on Sonnet 4.6, Haiku 4.5 and Opus 4.6
 *   and older — which are exactly the models `MODEL_ALIASES.sonnet` and
 *   `.haiku` resolve to, so a blanket "never send temperature" is wrong too.
 * - Structured outputs (`output_config.format`) require a schema with
 *   `additionalProperties: false` on every object node, and are not available
 *   on every model that is otherwise current.
 *
 * These helpers are deliberately allow-list shaped: an unrecognised model id
 * gets the conservative answer (no structured outputs, no sampling params),
 * because a missing capability degrades quality while a wrongly-claimed one
 * fails the request outright.
 *
 * @module core/llm/model-capabilities
 */

/**
 * Parse the family and version out of a first-party or Bedrock model id.
 *
 * Handles `claude-opus-4-8`, `claude-opus-4-8-20260101`,
 * `anthropic.claude-sonnet-4-6-v1:0` and the bare aliases.
 */
function parseModel(modelId: string): { family: string; major: number; minor: number } | null {
  if (!modelId) return null;
  const m = /claude-(opus|sonnet|haiku)-(\d+)-(\d+)/.exec(modelId);
  if (!m) return null;
  const major = Number(m[2]);
  const minor = Number(m[3]);
  if (Number.isNaN(major) || Number.isNaN(minor)) return null;
  return { family: m[1], major, minor };
}

/** Compare a parsed model against a `major.minor` floor. */
function atLeast(v: { major: number; minor: number }, major: number, minor: number): boolean {
  if (v.major !== major) return v.major > major;
  return v.minor >= minor;
}

/**
 * Does this model still accept `temperature` / `top_p` / `top_k`?
 *
 * Removed on Opus 4.7+ and on Sonnet 5+; still accepted on Opus 4.6 and older,
 * Sonnet 4.6 and older, and every Haiku.
 */
export function acceptsSamplingParams(modelId: string): boolean {
  const v = parseModel(modelId);
  if (!v) return false;
  if (v.family === 'opus') return !atLeast(v, 4, 7);
  if (v.family === 'sonnet') return !atLeast(v, 5, 0);
  return true;  // haiku
}

/**
 * Does this model support structured outputs (`output_config.format`)?
 *
 * Opus 4.7+, Sonnet 5+ and Haiku 4.5+. Notably NOT Sonnet 4.6, which is what
 * `MODEL_ALIASES.sonnet` resolves to — sending `output_config.format` there is
 * a 400, so callers must keep a prompt-based fallback.
 */
export function supportsStructuredOutputs(modelId: string): boolean {
  const v = parseModel(modelId);
  if (!v) return false;
  if (v.family === 'opus') return atLeast(v, 4, 7);
  if (v.family === 'sonnet') return atLeast(v, 5, 0);
  return atLeast(v, 4, 5);  // haiku
}

/**
 * Rewrite a JSON schema into the shape Anthropic structured outputs require.
 *
 * The API rejects a schema whose object nodes do not pin
 * `additionalProperties: false` and list every property in `required`. The
 * repo's own `JSONSchemaType<T>` cannot express either, and no caller sets
 * them, so normalise here rather than asking every call site to remember.
 *
 * Returns a deep copy; the caller's schema is never mutated.
 */
export function toStrictJsonSchema(schema: unknown): Record<string, unknown> {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;

    const out: Record<string, unknown> = { ...(node as Record<string, unknown>) };

    if (out.properties && typeof out.properties === 'object') {
      const props = out.properties as Record<string, unknown>;
      const walked: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        walked[key] = walk(value);
      }
      out.properties = walked;
      out.additionalProperties = false;
      // Structured outputs require every property to be required; optionality is
      // expressed by the model emitting an empty value, not by omitting the key.
      out.required = Object.keys(walked);
    }

    if (out.items) out.items = walk(out.items);

    return out;
  };

  return walk(schema) as Record<string, unknown>;
}

/** The `output_config` shape callers may pass through `AnalyzeOptions`. */
export interface OutputConfigInput {
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  format?: { type: 'json_schema'; schema: unknown };
}

/**
 * Prepare an `output_config` for one request against one model.
 *
 * Strips `format` when the model cannot do structured outputs (so the request
 * still succeeds and the caller's own JSON extraction handles the response),
 * and rewrites a surviving schema into the strict shape the API requires.
 * Returns `undefined` when there is nothing left to send.
 */
export function buildOutputConfig(
  modelId: string,
  input: OutputConfigInput | undefined,
): Record<string, unknown> | undefined {
  if (!input) return undefined;

  const out: Record<string, unknown> = {};
  if (input.effort) out.effort = input.effort;
  if (input.format && supportsStructuredOutputs(modelId)) {
    out.format = { type: input.format.type, schema: toStrictJsonSchema(input.format.schema) };
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
