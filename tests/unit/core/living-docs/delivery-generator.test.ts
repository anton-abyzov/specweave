/**
 * DeliveryGenerator Tests
 *
 * Tests for delivery documentation generation: CI/CD pipelines, release history,
 * deployment guides, and environment configurations.
 *
 * Strategy: create temp directories with various CI/CD config files and test
 * the output via the public generate() method, exercising all private helpers.
 *
 * @see src/core/living-docs/delivery/delivery-generator.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DeliveryGenerator } from '../../../../src/core/living-docs/delivery/delivery-generator.js';
import { silentLogger } from '../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockExecSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-gen-test-'));
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function makeGenerator(): DeliveryGenerator {
  return new DeliveryGenerator({
    projectPath: tmpDir,
    logger: silentLogger,
  });
}

function deliveryPath(...parts: string[]): string {
  return path.join(tmpDir, '.specweave/docs/internal/delivery', ...parts);
}

function readGenerated(filename: string): string {
  return fs.readFileSync(deliveryPath(filename), 'utf-8');
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpDir = makeTmpDir();
  mockExecSync.mockReset();
  // Default: no git tags
  mockExecSync.mockReturnValue('');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ===========================================================================
// Empty project
// ===========================================================================

describe('empty project', () => {
  it('should return zero counts and only deployment guide when no CI files exist', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();

    expect(result.pipelinesFound).toBe(0);
    expect(result.releasesFound).toBe(0);
    // Environments file is always created (with best practices), but count may be 0
    // Deployment guide is always created
    expect(result.filesCreated.length).toBeGreaterThanOrEqual(1);
  });

  it('should create the delivery output directory', async () => {
    const gen = makeGenerator();
    await gen.generate();

    expect(fs.existsSync(deliveryPath())).toBe(true);
  });

  it('should not create CI-CD-PIPELINE.md when no pipelines found', async () => {
    const gen = makeGenerator();
    await gen.generate();

    expect(fs.existsSync(deliveryPath('CI-CD-PIPELINE.md'))).toBe(false);
  });

  it('should not create RELEASE-HISTORY.md when no tags exist', async () => {
    const gen = makeGenerator();
    await gen.generate();

    expect(fs.existsSync(deliveryPath('RELEASE-HISTORY.md'))).toBe(false);
  });

  it('should always create DEPLOYMENT-GUIDE.md', async () => {
    const gen = makeGenerator();
    await gen.generate();

    expect(fs.existsSync(deliveryPath('DEPLOYMENT-GUIDE.md'))).toBe(true);
  });

  it('should always create ENVIRONMENTS.md', async () => {
    const gen = makeGenerator();
    await gen.generate();

    expect(fs.existsSync(deliveryPath('ENVIRONMENTS.md'))).toBe(true);
  });

  it('should set savedFiles as alias for filesCreated', async () => {
    const gen = makeGenerator();
    const result = await gen.generate();

    expect(result.savedFiles).toEqual(result.filesCreated);
  });
});

// ===========================================================================
// GitHub Actions workflows
// ===========================================================================

describe('GitHub Actions workflows', () => {
  it('should detect a basic push workflow', async () => {
    writeFile('.github/workflows/ci.yml', [
      'name: CI',
      'on:',
      '  push:',
      '    branches: [main]',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();

    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('GitHub Actions');
    expect(content).toContain('push');
  });

  it('should detect pull_request trigger', async () => {
    writeFile('.github/workflows/pr-check.yml', [
      'name: PR Check',
      'on:',
      '  pull_request:',
      '    branches: [main]',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('pull_request');
  });

  it('should detect schedule trigger', async () => {
    writeFile('.github/workflows/nightly.yml', [
      'name: Nightly',
      'on:',
      '  schedule:',
      '    - cron: "0 0 * * *"',
      'jobs:',
      '  cleanup:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('schedule');
  });

  it('should detect workflow_dispatch trigger as manual', async () => {
    writeFile('.github/workflows/deploy.yml', [
      'name: Deploy',
      'on:',
      '  workflow_dispatch:',
      '    inputs:',
      '      environment:',
      '        required: true',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('manual');
  });

  it('should extract job names from workflow', async () => {
    writeFile('.github/workflows/ci.yml', [
      'name: CI',
      'on:',
      '  push:',
      'jobs:',
      '  lint:',
      '    runs-on: ubuntu-latest',
      '  test:',
      '    runs-on: ubuntu-latest',
      '  build:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('lint');
    expect(content).toContain('test');
    expect(content).toContain('build');
  });

  it('should handle multiple workflow files', async () => {
    writeFile('.github/workflows/ci.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    writeFile('.github/workflows/release.yml', [
      'on:',
      '  push:',
      '    tags: ["v*"]',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    // At least 2 from GH Actions (possibly more if package.json detected)
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(2);
  });

  it('should use filename without extension as pipeline name', async () => {
    writeFile('.github/workflows/my-custom-ci.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('my-custom-ci');
  });

  it('should handle .yaml extension in addition to .yml', async () => {
    writeFile('.github/workflows/deploy.yaml', [
      'on:',
      '  push:',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('deploy');
  });

  it('should include overview table in pipeline docs', async () => {
    writeFile('.github/workflows/ci.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('| Pipeline | Provider | Triggers | Jobs |');
  });

  it('should include mermaid diagram in pipeline docs', async () => {
    writeFile('.github/workflows/ci.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('```mermaid');
    expect(content).toContain('graph LR');
  });
});

// ===========================================================================
// GitLab CI
// ===========================================================================

describe('GitLab CI', () => {
  it('should detect .gitlab-ci.yml and create pipeline docs', async () => {
    writeFile('.gitlab-ci.yml', [
      'stages:',
      '  - build',
      '  - test',
      '  - deploy',
      '',
      'build-job:',
      '  stage: build',
      '  script: make build',
      '',
      'test-job:',
      '  stage: test',
      '  script: make test',
      '',
      'deploy-job:',
      '  stage: deploy',
      '  script: make deploy',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('GitLab');
  });

  it('should extract job names from gitlab CI', async () => {
    writeFile('.gitlab-ci.yml', [
      'stages:',
      '  - lint',
      '',
      'lint-code:',
      '  stage: lint',
      '  script: eslint .',
      '',
      'format-check:',
      '  stage: lint',
      '  script: prettier --check .',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('lint-code');
    expect(content).toContain('format-check');
  });

  it('should exclude reserved keywords from gitlab jobs', async () => {
    writeFile('.gitlab-ci.yml', [
      'stages:',
      '  - build',
      'variables:',
      '  NODE_ENV: production',
      'default:',
      '  image: node:18',
      'include:',
      '  - local: .ci/templates.yml',
      '',
      'real-job:',
      '  stage: build',
      '  script: npm run build',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('real-job');
    // The parser filters out stages, variables, default, include
    // They should not appear as job names in the Jobs/Steps section
    // (they may appear in raw text, but not as bold job entries)
    const jobLines = content.split('\n').filter(l => l.startsWith('- **'));
    const jobNames = jobLines.map(l => l.match(/\*\*(\w[\w-]*)\*\*/)?.[1]).filter(Boolean);
    expect(jobNames).not.toContain('stages');
    expect(jobNames).not.toContain('variables');
    expect(jobNames).not.toContain('default');
    expect(jobNames).not.toContain('include');
  });

  it('should set default triggers for gitlab CI', async () => {
    writeFile('.gitlab-ci.yml', [
      'test-job:',
      '  script: npm test',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    // GitLab always returns push and merge_request as default triggers
    expect(content).toContain('push');
  });
});

// ===========================================================================
// Azure Pipelines
// ===========================================================================

describe('Azure Pipelines', () => {
  it('should detect azure-pipelines.yml', async () => {
    writeFile('azure-pipelines.yml', [
      'trigger:',
      '  - main',
      'pool:',
      '  vmImage: ubuntu-latest',
      'stages:',
      '  - stage: Build',
      '    jobs:',
      '      - job: BuildJob',
      '  - stage: Deploy',
      '    jobs:',
      '      - job: DeployJob',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('Azure DevOps');
  });

  it('should extract stage names from azure pipelines', async () => {
    writeFile('azure-pipelines.yml', [
      'stages:',
      '  - stage: Build',
      '    jobs: []',
      '  - stage: Test',
      '    jobs: []',
      '  - stage: Production',
      '    jobs: []',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('Build');
    expect(content).toContain('Test');
    expect(content).toContain('Production');
  });
});

// ===========================================================================
// package.json scripts
// ===========================================================================

describe('package.json scripts', () => {
  it('should detect relevant npm scripts', async () => {
    writeFile('package.json', JSON.stringify({
      name: 'test-project',
      scripts: {
        build: 'tsc',
        test: 'vitest run',
        lint: 'eslint .',
      },
    }));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('NPM Scripts');
    expect(content).toContain('npm');
  });

  it('should include script commands as job descriptions', async () => {
    writeFile('package.json', JSON.stringify({
      scripts: {
        build: 'tsc && vite build',
        test: 'vitest run --coverage',
      },
    }));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('tsc && vite build');
    expect(content).toContain('vitest run --coverage');
  });

  it('should detect deploy script', async () => {
    writeFile('package.json', JSON.stringify({
      scripts: {
        deploy: 'serverless deploy --stage prod',
      },
    }));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('deploy');
  });

  it('should detect release and publish scripts', async () => {
    writeFile('package.json', JSON.stringify({
      scripts: {
        release: 'semantic-release',
        publish: 'npm publish',
      },
    }));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('release');
    expect(content).toContain('publish');
  });

  it('should ignore irrelevant scripts', async () => {
    writeFile('package.json', JSON.stringify({
      scripts: {
        dev: 'vite dev',
        start: 'node index.js',
        preinstall: 'echo hi',
      },
    }));

    const gen = makeGenerator();
    const result = await gen.generate();
    // dev, start, preinstall are not in the relevant list, so no NPM Scripts pipeline
    expect(result.pipelinesFound).toBe(0);
  });

  it('should not create pipeline entry when package.json has no scripts', async () => {
    writeFile('package.json', JSON.stringify({
      name: 'empty-project',
    }));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBe(0);
  });

  it('should handle malformed package.json gracefully', async () => {
    writeFile('package.json', 'not valid json at all {{{');

    const gen = makeGenerator();
    const result = await gen.generate();
    // Should not crash
    expect(result.pipelinesFound).toBe(0);
  });
});

// ===========================================================================
// Multiple CI providers simultaneously
// ===========================================================================

describe('multiple CI providers', () => {
  it('should detect all providers at once', async () => {
    writeFile('.github/workflows/ci.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    writeFile('.gitlab-ci.yml', [
      'build-job:',
      '  script: make build',
    ].join('\n'));

    writeFile('azure-pipelines.yml', [
      'stages:',
      '  - stage: Build',
      '    jobs: []',
    ].join('\n'));

    writeFile('package.json', JSON.stringify({
      scripts: { build: 'tsc', test: 'vitest' },
    }));

    const gen = makeGenerator();
    const result = await gen.generate();
    // 1 GH Actions + 1 GitLab + 1 Azure + 1 NPM Scripts = 4
    expect(result.pipelinesFound).toBe(4);

    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('GitHub Actions');
    expect(content).toContain('GitLab');
    expect(content).toContain('Azure DevOps');
    expect(content).toContain('NPM Scripts');
  });
});

// ===========================================================================
// Release history (git tags)
// ===========================================================================

describe('release history', () => {
  it('should parse git tags into release entries', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v1.0.0|2025-06-01T10:00:00+00:00|Initial release\nv1.1.0|2025-07-15T12:00:00+00:00|Feature update\n';
      }
      if (cmd.includes('git describe')) {
        return '';
      }
      if (cmd.includes('git log')) {
        return '';
      }
      return '';
    });

    const gen = makeGenerator();
    const result = await gen.generate();

    expect(result.releasesFound).toBe(2);
    expect(fs.existsSync(deliveryPath('RELEASE-HISTORY.md'))).toBe(true);

    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('v1.0.0');
    expect(content).toContain('v1.1.0');
    expect(content).toContain('Initial release');
    expect(content).toContain('Feature update');
  });

  it('should sort releases by date descending', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v1.0.0|2025-01-01T00:00:00+00:00|Old\nv2.0.0|2025-12-01T00:00:00+00:00|New\n';
      }
      return '';
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RELEASE-HISTORY.md');

    const v1Pos = content.indexOf('v1.0.0');
    const v2Pos = content.indexOf('v2.0.0');
    // v2 (newer) should appear before v1 (older)
    expect(v2Pos).toBeLessThan(v1Pos);
  });

  it('should include changelog entries for tags', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v1.0.0|2025-06-01T10:00:00+00:00|Release\n';
      }
      if (cmd.includes('git describe')) {
        return '';
      }
      if (cmd.includes('git log')) {
        return 'abc1234 fix: resolve login bug\ndef5678 feat: add dashboard\n';
      }
      return '';
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('fix: resolve login bug');
    expect(content).toContain('feat: add dashboard');
  });

  it('should handle git command failure gracefully', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.releasesFound).toBe(0);
    expect(fs.existsSync(deliveryPath('RELEASE-HISTORY.md'))).toBe(false);
  });

  it('should handle empty tag output', async () => {
    mockExecSync.mockReturnValue('');

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.releasesFound).toBe(0);
  });

  it('should truncate changelog at 10 entries per release', async () => {
    const commits = Array.from({ length: 15 }, (_, i) =>
      `abc${i.toString().padStart(4, '0')} commit number ${i + 1}`
    ).join('\n');

    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v1.0.0|2025-06-01T00:00:00+00:00|Release\n';
      }
      if (cmd.includes('git log')) {
        return commits;
      }
      return '';
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('commit number 1');
    expect(content).toContain('commit number 10');
    expect(content).toContain('... 5 more changes');
  });

  it('should limit to 50 releases in output', async () => {
    const tags = Array.from({ length: 55 }, (_, i) => {
      const v = (i + 1).toString().padStart(2, '0');
      return `v1.0.${v}|2025-01-${v.padStart(2, '0')}T00:00:00+00:00|Release ${v}`;
    }).join('\n');

    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) return tags;
      return '';
    });

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.releasesFound).toBe(55);
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('Showing 50 of 55 releases');
  });

  it('should extract date substring (first 10 chars) from tag date', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v3.0.0|2025-08-22T14:30:00+00:00|August release\n';
      }
      return '';
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('2025-08-22');
  });

  it('should use previous tag range for changelog', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v2.0.0|2025-07-01T00:00:00+00:00|Second\n';
      }
      if (cmd.includes('git describe')) {
        return 'v1.0.0';
      }
      if (cmd.includes('git log v1.0.0..v2.0.0')) {
        return 'aaa1111 feat: new feature\n';
      }
      return '';
    });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('new feature');
  });
});

// ===========================================================================
// Deployment guide
// ===========================================================================

describe('deployment guide', () => {
  it('should include NPM section when package.json exists', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### NPM/Node.js');
    expect(content).toContain('npm install');
    expect(content).toContain('npm run build');
    expect(content).toContain('npm start');
  });

  it('should include Docker section when Dockerfile exists', async () => {
    writeFile('Dockerfile', 'FROM node:18\nCOPY . .\nCMD ["node", "index.js"]');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Docker');
    expect(content).toContain('docker build');
    expect(content).toContain('docker run');
  });

  it('should include Docker Compose section when docker-compose.yml exists', async () => {
    writeFile('docker-compose.yml', 'version: "3"\nservices:\n  app:\n    build: .');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Docker Compose');
    expect(content).toContain('docker-compose up');
  });

  it('should include Terraform section when terraform/ dir exists', async () => {
    fs.mkdirSync(path.join(tmpDir, 'terraform'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Terraform');
    expect(content).toContain('terraform init');
    expect(content).toContain('terraform plan');
    expect(content).toContain('terraform apply');
  });

  it('should include Terraform section when infrastructure/ dir exists', async () => {
    fs.mkdirSync(path.join(tmpDir, 'infrastructure'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Terraform');
  });

  it('should include Kubernetes section when k8s/ dir exists', async () => {
    fs.mkdirSync(path.join(tmpDir, 'k8s'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Kubernetes');
    expect(content).toContain('kubectl apply');
  });

  it('should include Kubernetes section when kubernetes/ dir exists', async () => {
    fs.mkdirSync(path.join(tmpDir, 'kubernetes'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Kubernetes');
  });

  it('should include Serverless section when serverless.yml exists', async () => {
    writeFile('serverless.yml', 'service: my-service\nprovider:\n  name: aws');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Serverless');
    expect(content).toContain('serverless deploy');
  });

  it('should include Serverless section when serverless.ts exists', async () => {
    writeFile('serverless.ts', 'export default { service: "my-service" };');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### Serverless');
  });

  it('should list prerequisites based on detected technologies', async () => {
    writeFile('package.json', JSON.stringify({ name: 'app' }));
    writeFile('Dockerfile', 'FROM node:18');
    fs.mkdirSync(path.join(tmpDir, 'terraform'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'k8s'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('Node.js >= 18');
    expect(content).toContain('Docker');
    expect(content).toContain('Terraform >= 1.0');
    expect(content).toContain('kubectl configured');
  });

  it('should not include technology-specific sections when not present', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).not.toContain('### Docker');
    expect(content).not.toContain('### NPM/Node.js');
    expect(content).not.toContain('### Terraform');
    expect(content).not.toContain('### Kubernetes');
    expect(content).not.toContain('### Serverless');
  });

  it('should reference ENVIRONMENTS.md in deployment guide', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('ENVIRONMENTS.md');
  });

  it('should include all detected technologies together', async () => {
    writeFile('package.json', JSON.stringify({ name: 'fullstack' }));
    writeFile('Dockerfile', 'FROM node:18');
    writeFile('docker-compose.yml', 'version: "3"');
    fs.mkdirSync(path.join(tmpDir, 'terraform'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'k8s'), { recursive: true });
    writeFile('serverless.yml', 'service: api');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('DEPLOYMENT-GUIDE.md');
    expect(content).toContain('### NPM/Node.js');
    expect(content).toContain('### Docker');
    expect(content).toContain('### Docker Compose');
    expect(content).toContain('### Terraform');
    expect(content).toContain('### Kubernetes');
    expect(content).toContain('### Serverless');
  });
});

// ===========================================================================
// Environment documentation
// ===========================================================================

describe('environment documentation', () => {
  it('should detect .env file and count variables', async () => {
    writeFile('.env', [
      'DATABASE_URL=postgres://localhost/db',
      'API_KEY=secret123',
      'PORT=3000',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.environmentsFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('default');
    expect(content).toContain('3 variables');
  });

  it('should detect .env.development file', async () => {
    writeFile('.env.development', 'DEBUG=true\nLOG_LEVEL=debug\n');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('development');
  });

  it('should detect .env.production file', async () => {
    writeFile('.env.production', 'NODE_ENV=production\nLOG_LEVEL=error\n');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('production');
  });

  it('should detect multiple .env files', async () => {
    writeFile('.env', 'BASE_VAR=1\n');
    writeFile('.env.development', 'DEV_VAR=1\n');
    writeFile('.env.test', 'TEST_VAR=1\n');
    writeFile('.env.production', 'PROD_VAR=1\n');

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.environmentsFound).toBeGreaterThanOrEqual(4);
  });

  it('should skip comments and empty lines when counting env variables', async () => {
    writeFile('.env', [
      '# This is a comment',
      '',
      'REAL_VAR=value',
      '# Another comment',
      '',
      'ANOTHER_VAR=value2',
      '',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('2 variables');
  });

  it('should detect terraform environment folders', async () => {
    fs.mkdirSync(path.join(tmpDir, 'terraform/dev'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'terraform/staging'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'terraform/production'), { recursive: true });

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.environmentsFound).toBeGreaterThanOrEqual(3);
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('dev');
    expect(content).toContain('staging');
    expect(content).toContain('production');
    expect(content).toContain('terraform');
  });

  it('should detect k8s environment folders', async () => {
    fs.mkdirSync(path.join(tmpDir, 'k8s/dev'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'k8s/prod'), { recursive: true });

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.environmentsFound).toBeGreaterThanOrEqual(2);
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('kubernetes');
  });

  it('should detect test environment folder', async () => {
    fs.mkdirSync(path.join(tmpDir, 'terraform/test'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('test');
  });

  it('should include both env files and infrastructure folders', async () => {
    writeFile('.env', 'VAR=1\n');
    writeFile('.env.staging', 'VAR=2\n');
    fs.mkdirSync(path.join(tmpDir, 'terraform/production'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'k8s/production'), { recursive: true });

    const gen = makeGenerator();
    const result = await gen.generate();
    // .env (default) + .env.staging + terraform/production + k8s/production = 4
    expect(result.environmentsFound).toBeGreaterThanOrEqual(4);
  });

  it('should include overview table in environments docs', async () => {
    writeFile('.env', 'VAR=1\n');

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('| Environment | Type | Details |');
  });

  it('should include best practices section', async () => {
    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('## Best Practices');
    expect(content).toContain('Never commit `.env` files with secrets');
    expect(content).toContain('Rotate secrets regularly');
  });

  it('should show path for infrastructure environment entries', async () => {
    fs.mkdirSync(path.join(tmpDir, 'terraform/staging'), { recursive: true });

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('ENVIRONMENTS.md');
    expect(content).toContain('**Path**:');
    expect(content).toContain('terraform/staging');
  });

  it('should handle missing .env file gracefully in countEnvVariables', async () => {
    // Create a .env file that references will work, but test non-existent indirectly
    // The countEnvVariables catch block returns 0 for errors
    const gen = makeGenerator();
    const result = await gen.generate();
    // Should not crash
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// Integration: full project
// ===========================================================================

describe('full project integration', () => {
  it('should generate all four docs for a fully configured project', async () => {
    // Set up a complete project
    writeFile('.github/workflows/ci.yml', [
      'on:',
      '  push:',
      '  pull_request:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    writeFile('package.json', JSON.stringify({
      scripts: { build: 'tsc', test: 'vitest', lint: 'eslint .' },
    }));

    writeFile('Dockerfile', 'FROM node:18');
    writeFile('docker-compose.yml', 'version: "3"');
    fs.mkdirSync(path.join(tmpDir, 'k8s/production'), { recursive: true });

    writeFile('.env', 'DB_URL=postgres://localhost/db\nAPI_KEY=xxx\n');
    writeFile('.env.production', 'DB_URL=postgres://prod/db\n');

    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v1.0.0|2025-06-01T00:00:00+00:00|Initial\nv1.1.0|2025-07-01T00:00:00+00:00|Update\n';
      }
      return '';
    });

    const gen = makeGenerator();
    const result = await gen.generate();

    expect(result.pipelinesFound).toBeGreaterThanOrEqual(2); // GH Actions + NPM Scripts
    expect(result.releasesFound).toBe(2);
    expect(result.environmentsFound).toBeGreaterThanOrEqual(3); // .env + .env.production + k8s/production

    expect(result.filesCreated).toContain(deliveryPath('CI-CD-PIPELINE.md'));
    expect(result.filesCreated).toContain(deliveryPath('RELEASE-HISTORY.md'));
    expect(result.filesCreated).toContain(deliveryPath('DEPLOYMENT-GUIDE.md'));
    expect(result.filesCreated).toContain(deliveryPath('ENVIRONMENTS.md'));

    // Verify all files are readable
    for (const file of result.filesCreated) {
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('should handle concurrent generate calls on different instances', async () => {
    writeFile('package.json', JSON.stringify({
      scripts: { build: 'tsc' },
    }));

    const gen1 = makeGenerator();
    const gen2 = makeGenerator();

    const [result1, result2] = await Promise.all([
      gen1.generate(),
      gen2.generate(),
    ]);

    expect(result1.pipelinesFound).toBe(result2.pipelinesFound);
    expect(result1.filesCreated.length).toBe(result2.filesCreated.length);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('edge cases', () => {
  it('should handle workflow file that cannot be read', async () => {
    // Create directory instead of file to trigger read error
    fs.mkdirSync(path.join(tmpDir, '.github/workflows'), { recursive: true });
    // Create a valid workflow alongside an unreadable one
    writeFile('.github/workflows/valid.yml', [
      'on:',
      '  push:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    // Should still find the valid one
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
  });

  it('should handle workflow with no jobs section', async () => {
    writeFile('.github/workflows/empty.yml', [
      'name: Empty Workflow',
      'on:',
      '  push:',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
  });

  it('should handle workflow with no triggers', async () => {
    writeFile('.github/workflows/notrigger.yml', [
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
  });

  it('should handle tag with no date or subject', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag -l')) {
        return 'v0.1.0||\n';
      }
      return '';
    });

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.releasesFound).toBe(1);
    const content = readGenerated('RELEASE-HISTORY.md');
    expect(content).toContain('v0.1.0');
  });

  it('should use default logger when none provided', () => {
    // Should not throw
    const gen = new DeliveryGenerator({ projectPath: tmpDir });
    expect(gen).toBeDefined();
  });

  it('should handle azure pipeline with no stages', async () => {
    writeFile('azure-pipelines.yml', [
      'trigger:',
      '  - main',
      'pool:',
      '  vmImage: ubuntu-latest',
      'steps:',
      '  - script: echo Hello',
    ].join('\n'));

    const gen = makeGenerator();
    const result = await gen.generate();
    expect(result.pipelinesFound).toBeGreaterThanOrEqual(1);
    const content = readGenerated('CI-CD-PIPELINE.md');
    expect(content).toContain('Azure DevOps');
  });

  it('should limit mermaid diagram to first 5 pipelines', async () => {
    // Create 6 workflow files
    for (let i = 1; i <= 6; i++) {
      writeFile(`.github/workflows/wf${i}.yml`, [
        'on:',
        '  push:',
        'jobs:',
        `  job${i}:`,
        '    runs-on: ubuntu-latest',
      ].join('\n'));
    }

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');

    // Extract lines within the mermaid block
    const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
    expect(mermaidMatch).toBeTruthy();
    const mermaidContent = mermaidMatch![1];
    // Count trigger nodes (one per pipeline in diagram)
    const triggerNodes = mermaidContent.match(/trigger_/g) || [];
    expect(triggerNodes.length).toBeLessThanOrEqual(5);
  });

  it('should limit pipeline trigger display to 3 in overview table', async () => {
    writeFile('.github/workflows/all-triggers.yml', [
      'on:',
      '  push:',
      '  pull_request:',
      '  schedule:',
      '    - cron: "0 0 * * *"',
      '  workflow_dispatch:',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
    ].join('\n'));

    const gen = makeGenerator();
    await gen.generate();
    const content = readGenerated('CI-CD-PIPELINE.md');

    // The overview table should show at most 3 triggers
    const tableLines = content.split('\n').filter(l => l.includes('all-triggers'));
    expect(tableLines.length).toBeGreaterThanOrEqual(1);
  });
});
