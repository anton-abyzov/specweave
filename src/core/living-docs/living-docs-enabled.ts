/**
 * The `livingDocs` config gate (SpecWeave 2.0).
 *
 * Auto-generated living docs are an explicit DROP in 2.0: config
 * `livingDocs: false | 'onDone'`, default `false`. Every automatic writer
 * (status transitions, task-completion hooks, closure) must consult this
 * before generating anything under `.specweave/docs/`.
 *
 * Deliberately dependency-free and synchronous so the status-change trigger
 * can call it without pulling the whole living-docs engine (circular import).
 *
 * @module core/living-docs/living-docs-enabled
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * True when the project asked for generated living docs.
 *
 * Defensive by design: a missing or broken config means "off" (the 2.0
 * default), never "write files the user did not ask for".
 */
export function livingDocsEnabled(projectRoot: string): boolean {
  try {
    const raw = fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf-8');
    return (JSON.parse(raw) as { livingDocs?: unknown }).livingDocs === 'onDone';
  } catch {
    return false;
  }
}
