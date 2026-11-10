import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { matchProjectId, pathToProjectId } from '../../../src/dashboard/project-id.js';
import { DashboardServer } from '../../../src/dashboard/server/dashboard-server.js';

const MAC_ID = 'Users-antonabyzov-Projects-github-specweave-umb';

describe('project ids across machines', () => {
  const local = { id: 'srv-work-github-specweave-umb', path: '/srv/work/github/specweave-umb' };
  it('makes the same id for POSIX and Windows spellings of a path', () => {
    expect(pathToProjectId('/srv/work/github/specweave-umb')).toBe(local.id);
    expect(pathToProjectId('C:\\work\\app\\')).toBe('C-work-app');
  });
  it("resolves another machine's id to the local checkout of the same folder", () => {
    expect(matchProjectId(MAC_ID, [local])).toBe(local);
    expect(matchProjectId(local.id, [local])).toBe(local);
  });
  it('does not guess when no project or more than one project fits', () => {
    const other = { id: 'home-me-vskill', path: '/home/me/vskill' };
    const twin = { id: 'home-me-specweave-umb', path: '/home/me/specweave-umb' };
    expect(matchProjectId(MAC_ID, [other])).toBeNull();
    expect(matchProjectId(MAC_ID, [local, twin])).toBeNull();
    expect(matchProjectId('Users-me-umb', [local])).toBeNull();
    expect(matchProjectId(null, [local])).toBeNull();
  });
});

describe('dashboard server project resolution', () => {
  let base: string;
  let root: string;
  let other: string;
  let stop: (() => Promise<void>) | undefined;
  const seed = (dir: string, title: string) => {
    const inc = path.join(dir, '.specweave/increments/0001-first');
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave/config.json'), '{}');
    fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ title, status: 'active' }));
    fs.writeFileSync(path.join(inc, 'spec.md'), `# ${title}\n`);
  };
  beforeEach(() => {
    base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-project-id-')));
    other = path.join(base, 'a', 'other-app');
    root = path.join(base, 'b', 'specweave-umb');
    seed(other, 'Other work');
    seed(root, 'Umbrella work');
  });
  afterEach(async () => {
    await stop?.();
    stop = undefined;
    fs.rmSync(base, { recursive: true, force: true });
  });
  async function start(roots: string[]) {
    const instance = await new DashboardServer({ port: 0, projectRoots: roots, openBrowser: false }).start();
    stop = () => instance.stop();
    const get = async (url: string) => (await (await fetch(instance.url + url)).json()).data;
    return { url: instance.url, get };
  }

  it("serves the local project for a link recorded under a foreign machine's path", async () => {
    // `other` is registered first: a plain fallback to the first project would show the wrong board.
    const { get } = await start([other, root]);
    const board = await get(`/api/work?project=${MAC_ID}`);
    expect(board.items.map((i: { title: string }) => i.title)).toEqual(['Umbrella work']);
    const projects = await get('/api/projects');
    expect(projects.map((p: { path: string }) => p.path)).toEqual([other, root]);
    expect(projects[1]).toMatchObject({ id: pathToProjectId(root), machine: os.hostname() });
  });

  it('registers a symlinked spelling of a project once, under its real path', async () => {
    const link = path.join(base, 'Projects');
    fs.symlinkSync(path.join(base, 'b'), link, 'dir');
    const { url, get } = await start([path.join(link, 'specweave-umb')]);
    const added = await fetch(`${url}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: root }),
    });
    expect(added.status).toBe(200);
    const projects = await get('/api/projects');
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe(root);
  });
});
