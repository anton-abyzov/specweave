import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

it('supervises a synchronously stuck router below the 10-second host timeout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-deadline-'));
  try {
    const handler = path.join(root, 'dist/src/core/hooks/handlers');
    fs.mkdirSync(handler, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'specweave', type: 'module' }));
    fs.writeFileSync(path.join(handler, 'hook-router.js'), 'export function hookRouter() { while (true) {} }');
    const start = Date.now();
    const result = spawnSync(process.execPath, [path.resolve('plugins/specweave/hooks/run.mjs'), 'session-start'], {
      input: '{}', encoding: 'utf8', timeout: 9500, env: { ...process.env, SPECWEAVE_HOME: root },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
    expect(Date.now() - start).toBeLessThan(9500);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}, 12000);

it('preserves UTF-8 when stdin bytes arrive in separate chunks', async () => {
  const { spawn } = await import('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-unicode-'));
  try {
    const handler = path.join(root, 'dist/src/core/hooks/handlers');
    fs.mkdirSync(handler, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'specweave', type: 'module' }));
    fs.writeFileSync(path.join(handler, 'hook-router.js'), 'export function hookRouter(event, raw) { return JSON.parse(raw); }');
    const child = spawn(process.execPath, [path.resolve('plugins/specweave/hooks/run.mjs'), 'session-start'], {
      env: { ...process.env, SPECWEAVE_HOME: root }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const bytes = Buffer.from(JSON.stringify({ cwd: '/tmp/é' }));
    const split = bytes.indexOf(0xc3) + 1;
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', c => { output += c; });
    const done = new Promise<void>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
    });
    child.stdin.write(bytes.subarray(0, split));
    await new Promise(resolve => setTimeout(resolve, 100));
    child.stdin.end(bytes.subarray(split));
    await done;
    expect(JSON.parse(output).cwd).toBe('/tmp/é');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
