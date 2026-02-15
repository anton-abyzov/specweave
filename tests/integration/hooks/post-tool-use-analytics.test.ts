/**
 * Integration Test: PostToolUse Analytics Hook
 *
 * Tests that the post-tool-use-analytics.sh dispatcher correctly:
 * 1. Tracks Skill tool invocations as type "skill" events
 * 2. Tracks Task tool invocations as type "agent" events
 * 3. Extracts plugin name from skill name prefix
 * 4. Exits cleanly on invalid input
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as nodeFs from 'fs';
import path from 'path';
import os from 'os';
import * as fs from '../../../src/utils/fs-native.js';
import { getCleanEnv } from '../../test-utils/clean-env.js';
import { findProjectRoot } from '../../test-utils/project-root.js';

const projectRoot = findProjectRoot(import.meta.url);

describe('PostToolUse Analytics Hook', () => {
  const hookPath = path.join(
    projectRoot,
    'plugins/specweave/hooks/v2/dispatchers/post-tool-use-analytics.sh'
  );

  let testRoot: string;
  let eventsPath: string;

  beforeEach(async () => {
    testRoot = path.join(
      os.tmpdir(),
      `post-tool-analytics-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );

    await fs.ensureDir(path.join(testRoot, '.specweave', 'state', 'analytics'));
    eventsPath = path.join(testRoot, '.specweave', 'state', 'analytics', 'events.jsonl');
  });

  afterEach(() => {
    nodeFs.rmSync(testRoot, { recursive: true, force: true });
  });

  function runHook(input: Record<string, unknown>): ReturnType<typeof spawnSync> {
    return spawnSync('bash', [hookPath], {
      input: JSON.stringify(input),
      cwd: testRoot,
      env: {
        ...getCleanEnv(),
        PWD: testRoot,
        HOME: os.homedir(),
        PATH: process.env.PATH,
      },
      timeout: 10000,
    });
  }

  function readLastEvent(): Record<string, unknown> | null {
    if (!nodeFs.existsSync(eventsPath)) return null;
    const content = nodeFs.readFileSync(eventsPath, 'utf-8').trim();
    if (!content) return null;
    const lines = content.split('\n');
    return JSON.parse(lines[lines.length - 1]);
  }

  function waitForBackground(ms = 500): void {
    spawnSync('sleep', [String(ms / 1000)]);
  }

  describe('Skill tool tracking', () => {
    it('should write a skill event when Skill tool input is received', () => {
      runHook({ tool_name: 'Skill', tool_input: { skill: 'sw:pm' } });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('skill');
      expect(event!.name).toBe('sw:pm');
      expect(event!.success).toBe(true);
    });

    it('should set plugin to "specweave" for sw: prefix skills', () => {
      runHook({ tool_name: 'Skill', tool_input: { skill: 'sw:do' } });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.plugin).toBe('specweave');
    });

    it('should extract plugin name from non-sw prefixed skills', () => {
      runHook({ tool_name: 'Skill', tool_input: { skill: 'sw-frontend:frontend-architect' } });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('skill');
      expect(event!.name).toBe('sw-frontend:frontend-architect');
      expect(event!.plugin).toBe('sw-frontend');
    });

    it('should detect Skill from input fields when tool_name is missing', () => {
      runHook({ skill: 'sw:pm' });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('skill');
      expect(event!.name).toBe('sw:pm');
    });
  });

  describe('Task tool tracking', () => {
    it('should write an agent event when Task tool input is received', () => {
      runHook({ tool_name: 'Task', tool_input: { subagent_type: 'Explore', prompt: 'Find files' } });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('agent');
      expect(event!.name).toBe('Explore');
    });

    it('should detect Task from input fields when tool_name is missing', () => {
      runHook({ subagent_type: 'Plan', prompt: 'Design architecture' });
      waitForBackground();

      const event = readLastEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('agent');
      expect(event!.name).toBe('Plan');
    });
  });

  describe('error handling', () => {
    it('should exit 0 with empty input', () => {
      const result = spawnSync('bash', [hookPath], {
        input: '{}',
        cwd: testRoot,
        env: {
          ...getCleanEnv(),
          PWD: testRoot,
          HOME: os.homedir(),
          PATH: process.env.PATH,
        },
        timeout: 5000,
      });

      expect(result.status).toBe(0);
    });

    it('should exit 0 with invalid JSON', () => {
      const result = spawnSync('bash', [hookPath], {
        input: 'not-json',
        cwd: testRoot,
        env: {
          ...getCleanEnv(),
          PWD: testRoot,
          HOME: os.homedir(),
          PATH: process.env.PATH,
        },
        timeout: 5000,
      });

      expect(result.status).toBe(0);
    });

    it('should not create events file when input has no skill or agent data', () => {
      runHook({ tool_name: 'Read', tool_input: { file_path: '/foo/bar.ts' } });
      waitForBackground();

      expect(nodeFs.existsSync(eventsPath)).toBe(false);
    });
  });
});
