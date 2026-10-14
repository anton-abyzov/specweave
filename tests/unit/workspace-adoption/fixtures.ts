import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
export const roots: string[] = [];
export function sandbox(): string { const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-adopt-'))); roots.push(root); return root; }
export function workspace(root: string, repos: unknown[] = [], extras: object = {}): string {
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave/config.json'), JSON.stringify({ workspace: { name: 'test', repos }, ...extras }));
  return root;
}
export function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
export function checkout(root: string, remote?: string): string {
  fs.mkdirSync(root, { recursive: true }); git(root, ['init', '-q']);
  if (remote) git(root, ['remote', 'add', 'origin', remote]);
  return root;
}
export function cleanup(): void { delete process.env.SPECWEAVE_WORKSPACE; for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); }
