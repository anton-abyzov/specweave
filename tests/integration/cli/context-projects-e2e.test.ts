import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '../../../bin/specweave.js');

describe('context projects CLI e2e', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-e2e-context-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('prints workspace repo projects for current-schema workspaces', () => {
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({
        version: '3.0',
        workspace: {
          name: 'my-workspace',
          repos: [
            { id: 'frontend-app', path: 'repositories/acme/frontend-app', name: 'Frontend App', prefix: 'FE' },
            { id: 'backend-api', path: 'repositories/acme/backend-api', name: 'Backend API', prefix: 'BE' },
          ],
        },
      }, null, 2),
    );

    const result = execSync(`node "${CLI_PATH}" context projects`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    const output = JSON.parse(result.trim());
    expect(output.level).toBe(1);
    expect(output.projects.map((project: { id: string }) => project.id)).toEqual([
      'frontend-app',
      'backend-api',
    ]);
  });
});
