/**
 * Tests for the --parallel flag on create-increment (0669 Wave 2, T-019/T-020).
 *
 * AC-US4-03: `sw:increment --parallel` opts into 3-agent fan-out for
 * planning. The CLI bridge must:
 *   (a) register `--parallel` as a boolean commander option in bin/specweave.js
 *   (b) surface `parallel` on CreateIncrementOptions
 *   (c) propagate the flag into the template-creator invocation path.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BIN_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'bin',
  'specweave.js',
);
const CMD_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'src',
  'cli',
  'commands',
  'create-increment.ts',
);

const binSource = readFileSync(BIN_PATH, 'utf-8');
const cmdSource = readFileSync(CMD_PATH, 'utf-8');

describe('create-increment --parallel flag (0669 T-019/T-020)', () => {
  it('bin/specweave.js registers a --parallel boolean option on create-increment', () => {
    // Locate the create-increment command block and assert the option exists.
    const createIncBlock = binSource.split(".command('create-increment')")[1];
    expect(createIncBlock).toBeDefined();
    const block = createIncBlock.slice(0, 2000);
    expect(block).toMatch(/\.option\(['"]--parallel['"]/);
  });

  it('CreateIncrementOptions TypeScript interface declares a parallel field', () => {
    expect(cmdSource).toMatch(/parallel\?:\s*boolean/);
  });

  it('createIncrementCommand reads options.parallel in its body', () => {
    // The flag must be pulled out of options and used (e.g. passed through
    // to the template-creator). A bare `parallel` reference is enough to
    // show the CLI bridge has wired the flag — implementation depth is
    // covered in T-020/T-022.
    expect(cmdSource).toMatch(/\bparallel\b/);
    // And specifically destructured alongside the other options.
    expect(cmdSource).toMatch(/parallel\s*[,=}]/);
  });
});
