/**
 * Loads team-lead agent prompt templates and auto-prepends the shared
 * _protocol.md content so every domain template gets the common
 * SendMessage/TaskUpdate/shutdown_response boilerplate without duplicating it
 * on disk.
 *
 * Usage:
 *   const prompt = await loadTemplate('backend.md');
 *   // → "# Shared Agent Protocol ... \n\n<!-- domain template --> ..."
 *
 * Contract (0669 Wave 2c, T-037/T-038):
 *   - If name === '_protocol.md': return the file verbatim (no double-prepend).
 *   - Otherwise: read _protocol.md + '\n\n' + <domain template> and return it.
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AGENTS_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'plugins',
  'specweave',
  'skills',
  'team-lead',
  'agents'
);

const PROTOCOL_FILENAME = '_protocol.md';

export interface LoadTemplateOptions {
  agentsDir?: string;
}

export async function loadTemplate(
  name: string,
  options: LoadTemplateOptions = {}
): Promise<string> {
  const dir = options.agentsDir ?? AGENTS_DIR;
  const templatePath = resolve(dir, name);
  const templateContent = await readFile(templatePath, 'utf-8');

  if (name === PROTOCOL_FILENAME) {
    return templateContent;
  }

  const protocolPath = resolve(dir, PROTOCOL_FILENAME);
  const protocolContent = await readFile(protocolPath, 'utf-8');

  return `${protocolContent}\n\n${templateContent}`;
}
