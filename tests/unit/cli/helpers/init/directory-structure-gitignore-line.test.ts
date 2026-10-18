import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const detected = vi.hoisted(() => ({ list: ['node'] as string[] }));
vi.mock('../../../../../src/cli/helpers/init/gitignore-generator.js', async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  generateSmartGitignore: vi.fn(async () => ({ detection: { detected: detected.list }, result: { action: 'created' } })),
}));

describe('copyTemplates .gitignore line', () => {
  let root: string;
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  it('says "1 tech pattern" for one, "2 tech patterns" for two', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((m: unknown) => { lines.push(String(m)); });
    const { copyTemplates } = await import('../../../../../src/cli/helpers/init/directory-structure.js');
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-dirs-'));
    await copyTemplates(path.resolve('src/templates'), root, 'demo');
    detected.list = ['node', 'python'];
    fs.rmSync(path.join(root, '.gitignore'), { force: true });
    await copyTemplates(path.resolve('src/templates'), root, 'demo');
    const text = lines.join('\n');
    expect(text).toContain('(1 tech pattern detected)');
    expect(text).toContain('(2 tech patterns detected)');
  });
});
