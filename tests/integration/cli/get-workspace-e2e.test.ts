import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '../../../bin/specweave.js');

describe('get workspace CLI e2e', () => {
  let tempDir: string;
  let repoDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-e2e-get-'));
    repoDir = path.join(tempDir, 'repositories', 'org', 'my-service');
    configPath = path.join(tempDir, '.specweave', 'config.json');

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.mkdirSync(repoDir, { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        version: '3.0',
        workspace: { name: 'workspace', repos: [] },
      }, null, 2),
    );

    execSync('git init -q', { cwd: repoDir });
    execSync('git remote add origin https://github.com/org/my-service.git', { cwd: repoDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('registers an existing local repo in workspace.repos without duplicates', () => {
    execSync(`node "${CLI_PATH}" get "${repoDir}" --no-init`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    execSync(`node "${CLI_PATH}" get "${repoDir}" --no-init`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.workspace.repos).toHaveLength(1);
    expect(config.workspace.repos[0]).toEqual(expect.objectContaining({
      id: 'my-service',
      path: 'repositories/org/my-service',
      name: 'my-service',
      prefix: 'MY-',
      sync: { github: { owner: 'org', repo: 'my-service' } },
    }));
  });
});
