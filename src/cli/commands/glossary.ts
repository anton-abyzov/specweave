/**
 * CLI: `specweave glossary [check|list]` — the project's shared language.
 * `check` lists drift between GLOSSARY.md and the code (exit 1 with --strict
 * when there is any); `list` prints the terms. The sw-glossary skill writes
 * the file.
 *
 * @module cli/commands/glossary
 */

import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { readGlossary } from '../../core/glossary/parse.js';
import { checkGlossary, describeFinding } from '../../core/glossary/check.js';

export interface GlossaryCommandOptions {
  strict?: boolean;
  json?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
}

const NO_GLOSSARY = 'No GLOSSARY.md here. Build one with the sw-glossary skill (specweave skills enable glossary).';

export async function glossaryCommand(action: string | undefined, opts: GlossaryCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const verb = action ?? 'check';

  if (verb === 'list') {
    const terms = readGlossary(root);
    if (opts.json) out(JSON.stringify(terms, null, 2));
    else if (!terms.length) out(NO_GLOSSARY);
    else for (const t of terms) out(`${t.term}${t.avoid.length ? `  (avoid: ${t.avoid.join(', ')})` : ''}`);
    return 0;
  }
  if (verb !== 'check') {
    err(`Unknown action "${verb}". Use: specweave glossary [check|list] [--strict] [--json]`);
    return 1;
  }

  const result = checkGlossary(root);
  const failed = opts.strict && result.findings.length > 0;
  if (opts.json) {
    out(JSON.stringify(result, null, 2));
    return failed ? 1 : 0;
  }
  if (!result.files.length) {
    out(NO_GLOSSARY);
    return 0;
  }
  out(`${result.files.join(', ')}: ${result.terms} term${result.terms === 1 ? '' : 's'}`);
  for (const f of result.findings) out(`  ${describeFinding(f)}`);
  if (result.truncated) out(`  ... ${result.truncated} more avoided-word hit(s) not listed`);
  const total = result.findings.length + result.truncated;
  if (!total) out('No drift: the code uses the glossary\'s words.');
  else out(`${total} finding${total === 1 ? '' : 's'}. Rename the code or fix the glossary; drift that needs real work becomes an increment.`);
  return failed ? 1 : 0;
}
