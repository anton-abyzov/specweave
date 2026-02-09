/**
 * Tests for github-auto-create-handler.sh
 *
 * Validates:
 * 1. Feature ID derivation (FS-XXX from increment number)
 * 2. User story parsing (both formats: with and without priority)
 * 3. Config checks (autoSync, auto_create_github_issue)
 * 4. Idempotency (skips when issues already exist)
 * 5. Metadata.json update structure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HANDLER_PATH = path.resolve(
  __dirname,
  '../../../../plugins/specweave-github/hooks/github-auto-create-handler.sh',
);

function createTempProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-auto-create-test-'));

  // Create .specweave directory structure
  const swDir = path.join(tmpDir, '.specweave');
  const incDir = path.join(swDir, 'increments', '0042-test-feature');
  const stateDir = path.join(swDir, 'state');
  const logsDir = path.join(swDir, 'logs');
  fs.mkdirSync(incDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  return tmpDir;
}

function writeConfig(tmpDir: string, overrides: Record<string, unknown> = {}): void {
  const config = {
    project: { name: 'test-project' },
    sync: {
      enabled: true,
      autoSync: true,
      github: {
        enabled: true,
        owner: 'test-owner',
        repo: 'test-repo',
      },
    },
    hooks: {
      post_increment_planning: {
        auto_create_github_issue: true,
      },
    },
    ...overrides,
  };
  fs.writeFileSync(path.join(tmpDir, '.specweave', 'config.json'), JSON.stringify(config, null, 2));
}

function writeMetadata(tmpDir: string, incId: string, overrides: Record<string, unknown> = {}): void {
  const metadata = {
    id: incId,
    status: 'active',
    type: 'feature',
    priority: 'P1',
    externalLinks: {},
    ...overrides,
  };
  fs.writeFileSync(
    path.join(tmpDir, '.specweave', 'increments', incId, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
  );
}

function writeSpec(tmpDir: string, incId: string, content: string): void {
  fs.writeFileSync(
    path.join(tmpDir, '.specweave', 'increments', incId, 'spec.md'),
    content,
  );
}

function runHandler(tmpDir: string, incId: string, env: Record<string, string> = {}): {
  stdout: string;
  exitCode: number;
} {
  try {
    const stdout = execSync(
      `bash "${HANDLER_PATH}" "${incId}"`,
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          SPECWEAVE_SKIP_DEBOUNCE: '1',
          // Mock gh CLI with a script that just logs what it would do
          PATH: `${path.join(tmpDir, 'mock-bin')}:${process.env.PATH}`,
          ...env,
        },
        timeout: 15000,
        encoding: 'utf-8',
      },
    );
    return { stdout: stdout.toString(), exitCode: 0 };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; status?: number };
    return { stdout: execErr.stdout?.toString() || '', exitCode: execErr.status || 1 };
  }
}

function createMockGh(tmpDir: string): void {
  const mockBinDir = path.join(tmpDir, 'mock-bin');
  fs.mkdirSync(mockBinDir, { recursive: true });

  // Build mock gh script - use heredoc-style to avoid escaping issues
  const logFile = path.join(tmpDir, 'mock-gh.log');
  const counterFile = path.join(tmpDir, 'issue-counter');
  const mockGh = [
    '#!/bin/bash',
    'ARGS="$*"',
    `echo "[mock-gh] $ARGS" >> "${logFile}"`,
    '',
    '# Label create - always succeed',
    'if [[ "$ARGS" == *"label create"* ]]; then exit 0; fi',
    '',
    '# Milestones POST (create)',
    'if [[ "$ARGS" == *"milestones"* ]] && [[ "$ARGS" == *"POST"* ]]; then echo "99"; exit 0; fi',
    '',
    '# Milestones GET (list) - return empty (no existing milestones)',
    'if [[ "$ARGS" == *"milestones"* ]]; then echo ""; exit 0; fi',
    '',
    '# Issue list (search) - return empty',
    'if [[ "$ARGS" == *"issue list"* ]]; then echo "[]"; exit 0; fi',
    '',
    '# Issue create - return a URL with incrementing number',
    'if [[ "$ARGS" == *"issue create"* ]]; then',
    `  COUNTER_FILE="${counterFile}"`,
    '  NUM=100',
    '  if [ -f "$COUNTER_FILE" ]; then NUM=$(cat "$COUNTER_FILE"); fi',
    '  NUM=$((NUM + 1))',
    '  echo "$NUM" > "$COUNTER_FILE"',
    '  echo "https://github.com/test-owner/test-repo/issues/$NUM"',
    '  exit 0',
    'fi',
    '',
    'exit 0',
  ].join('\n');
  const mockGhPath = path.join(mockBinDir, 'gh');
  fs.writeFileSync(mockGhPath, mockGh, { mode: 0o755 });
}

describe('github-auto-create-handler.sh', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Feature ID derivation', () => {
    it('should derive FS-42 from increment 0042-test-feature', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test Feature"
---
## User Stories

### US-001: First Story (P1)

**As a** user, **I want** something

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First AC
`);

      const result = runHandler(tmpDir, '0042-test-feature');
      expect(result.exitCode).toBe(0);

      // Check the log for Feature ID
      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Derived Feature ID: FS-42');

      // Check mock gh was called with FS-42 in issue title
      const ghLog = fs.readFileSync(path.join(tmpDir, 'mock-gh.log'), 'utf-8');
      expect(ghLog).toContain('[FS-42][US-001]');
    });

    it('should derive FS-1 from increment 0001-setup', () => {
      // Create the increment directory
      const incDir = path.join(tmpDir, '.specweave', 'increments', '0001-setup');
      fs.mkdirSync(incDir, { recursive: true });

      createMockGh(tmpDir);
      writeConfig(tmpDir);

      // Write metadata and spec to 0001-setup
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ id: '0001-setup', status: 'active', priority: 'P1', externalLinks: {} }),
      );
      fs.writeFileSync(
        path.join(incDir, 'spec.md'),
        `---
title: "Setup"
---
## User Stories

### US-001: Init Setup (P1)

**As a** dev, **I want** setup

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`,
      );

      const result = runHandler(tmpDir, '0001-setup');
      expect(result.exitCode).toBe(0);

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Derived Feature ID: FS-1');
    });
  });

  describe('User story parsing', () => {
    it('should parse US with priority suffix: ### US-001: Title (P1)', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
## User Stories

### US-001: Auth Login (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works

### US-002: Auth Signup (P2)

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Found 2 user stories');

      const ghLog = fs.readFileSync(path.join(tmpDir, 'mock-gh.log'), 'utf-8');
      expect(ghLog).toContain('[FS-42][US-001] Auth Login');
      expect(ghLog).toContain('[FS-42][US-002] Auth Signup');
    });

    it('should parse US without priority suffix: ### US-001: Title', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
## User Stories

### US-001: Token-Efficient Automation

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Found 1 user stories');
    });
  });

  describe('Config checks', () => {
    it('should skip when autoSync is false and auto_create is false', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir, {
        sync: {
          enabled: true,
          autoSync: false,
          github: { enabled: true, owner: 'test', repo: 'test' },
        },
        hooks: { post_increment_planning: { auto_create_github_issue: false } },
      });
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
### US-001: Test (P1)
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Auto-sync disabled');
    });

    it('should proceed when only autoSync is true', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir, {
        sync: {
          enabled: true,
          autoSync: true,
          github: { enabled: true, owner: 'test', repo: 'test' },
        },
        hooks: { post_increment_planning: { auto_create_github_issue: false } },
      });
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
### US-001: Test (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Found 1 user stories');
    });

    it('should skip when GitHub sync is disabled', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir, {
        sync: {
          enabled: true,
          autoSync: true,
          github: { enabled: false, owner: 'test', repo: 'test' },
        },
        hooks: { post_increment_planning: { auto_create_github_issue: true } },
      });
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
### US-001: Test (P1)
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('GitHub sync not enabled');
    });
  });

  describe('Idempotency', () => {
    it('should skip when issues already exist in metadata', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature', {
        externalLinks: {
          github: {
            issues: {
              'US-001': { issueNumber: 42, issueUrl: 'https://example.com', status: 'created' },
            },
            milestone: 10,
          },
        },
      });
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
### US-001: Test (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const logContent = fs.readFileSync(
        path.join(tmpDir, '.specweave', 'logs', 'github-auto-create.log'),
        'utf-8',
      );
      expect(logContent).toContain('Issues already exist');
    });
  });

  describe('Metadata update', () => {
    it('should update metadata.json with issue links after creation', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test Feature"
---
## User Stories

### US-001: First Story (P1)

**As a** user, **I want** something

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First AC

### US-002: Second Story (P2)

**As a** user, **I want** something else

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Second AC
`);

      runHandler(tmpDir, '0042-test-feature');

      const metadata = JSON.parse(
        fs.readFileSync(
          path.join(tmpDir, '.specweave', 'increments', '0042-test-feature', 'metadata.json'),
          'utf-8',
        ),
      );

      // Should have github.issues with US-001 and US-002
      expect(metadata.externalLinks.github).toBeDefined();
      expect(metadata.externalLinks.github.issues).toBeDefined();
      expect(metadata.externalLinks.github.issues['US-001']).toBeDefined();
      expect(metadata.externalLinks.github.issues['US-002']).toBeDefined();
      expect(metadata.externalLinks.github.issues['US-001'].issueNumber).toBeGreaterThan(0);
      expect(metadata.externalLinks.github.issues['US-001'].issueUrl).toContain('github.com');
    });
  });

  describe('Label creation', () => {
    it('should create priority labels via gh label create', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test"
---
### US-001: P1 Story (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works

### US-002: P3 Story (P3)

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const ghLog = fs.readFileSync(path.join(tmpDir, 'mock-gh.log'), 'utf-8');
      expect(ghLog).toContain('label create priority:p1');
      expect(ghLog).toContain('label create priority:p3');
      expect(ghLog).toContain('label create user-story');
      expect(ghLog).toContain('label create specweave');
    });
  });

  describe('Milestone creation', () => {
    it('should create milestone with FS-XXX format', () => {
      createMockGh(tmpDir);
      writeConfig(tmpDir);
      writeMetadata(tmpDir, '0042-test-feature');
      writeSpec(tmpDir, '0042-test-feature', `---
title: "Test Feature"
---
### US-001: Story (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Works
`);

      runHandler(tmpDir, '0042-test-feature');

      const ghLog = fs.readFileSync(path.join(tmpDir, 'mock-gh.log'), 'utf-8');
      // Should search for milestone with FS-42 title
      expect(ghLog).toContain('FS-42');

      // Should update metadata with milestone number
      const metadata = JSON.parse(
        fs.readFileSync(
          path.join(tmpDir, '.specweave', 'increments', '0042-test-feature', 'metadata.json'),
          'utf-8',
        ),
      );
      expect(metadata.externalLinks.github.milestone).toBe(99);
    });
  });
});
