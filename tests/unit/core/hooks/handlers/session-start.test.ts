/**
 * Session-start hook handler tests (TDD)
 *
 * Tests session initialization: cleanup stale auto-mode files,
 * reset context pressure, and baseline health check.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import type { HookContext, HookInput } from '../../../../../src/core/hooks/handlers/types.js';

describe('session-start handler', () => {
  let tempDir: string;
  let stateDir: string;
  let logsDir: string;
  let context: HookContext;
  const input: HookInput = {};

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `sw-session-start-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    stateDir = path.join(tempDir, '.specweave', 'state');
    logsDir = path.join(tempDir, '.specweave', 'logs');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
    // Create config.json so findProjectRoot would find it
    fs.writeFileSync(
      path.join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '1.0.0' }),
    );

    context = {
      projectRoot: tempDir,
      stateDir,
      logsDir,
      configPath: path.join(tempDir, '.specweave', 'config.json'),
      timestamp: '2026-03-27T10:00:00.000Z',
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return {continue:true}', async () => {
    const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
    const result = await handle(input, context);
    expect(result.continue).toBe(true);
  });

  describe('auto-mode cleanup', () => {
    it('should remove stale auto-mode.json (>24h old)', async () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(autoFile, JSON.stringify({ started: '2026-03-25T10:00:00Z' }));
      // Set mtime to 25 hours ago
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(autoFile, staleTime, staleTime);

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      expect(fs.existsSync(autoFile)).toBe(false);
    });

    it('should remove associated dedup files when auto-mode is stale', async () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      const dedupFile = path.join(stateDir, '.stop-auto-dedup');
      const dedupPrevFile = path.join(stateDir, '.stop-auto-dedup-prev');
      const turnsFile = path.join(stateDir, '.stop-auto-turns');

      fs.writeFileSync(autoFile, '{}');
      fs.writeFileSync(dedupFile, 'x');
      fs.writeFileSync(dedupPrevFile, 'x');
      fs.writeFileSync(turnsFile, 'x');

      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(autoFile, staleTime, staleTime);

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      expect(fs.existsSync(dedupFile)).toBe(false);
      expect(fs.existsSync(dedupPrevFile)).toBe(false);
      expect(fs.existsSync(turnsFile)).toBe(false);
    });

    it('should NOT remove auto-mode.json if less than 24h old', async () => {
      const autoFile = path.join(stateDir, 'auto-mode.json');
      fs.writeFileSync(autoFile, JSON.stringify({ started: new Date().toISOString() }));
      // mtime is now (just created), so < 24h

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      expect(fs.existsSync(autoFile)).toBe(true);
    });
  });

  describe('context pressure reset', () => {
    it('should remove context-pressure.json if it exists', async () => {
      const pressureFile = path.join(stateDir, 'context-pressure.json');
      fs.writeFileSync(pressureFile, JSON.stringify({ level: 'critical', compactionCount: 2 }));

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      expect(fs.existsSync(pressureFile)).toBe(false);
    });

    it('should remove prompt-health-alert.json if it exists', async () => {
      const alertFile = path.join(stateDir, 'prompt-health-alert.json');
      fs.writeFileSync(alertFile, JSON.stringify({ level: 'elevated' }));

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      expect(fs.existsSync(alertFile)).toBe(false);
    });

    it('should not error when pressure files do not exist', async () => {
      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      const result = await handle(input, context);
      expect(result.continue).toBe(true);
    });
  });

  describe('baseline health check', () => {
    it('should write prompt-health.json with baseline metrics', async () => {
      // Create a CLAUDE.md for size measurement
      fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(5000));

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      const healthFile = path.join(stateDir, 'prompt-health.json');
      expect(fs.existsSync(healthFile)).toBe(true);

      const health = JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
      expect(health.claudeMdSize).toBe(5000);
      expect(health.baseline).toBeGreaterThan(0);
      expect(health.warningLevel).toBeDefined();
    });

    it('should set warningLevel to normal for small CLAUDE.md', async () => {
      fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'small content');

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      const health = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health.json'), 'utf-8'));
      expect(health.warningLevel).toBe('normal');
    });

    it('should set warningLevel to warning when baseline > 80KB', async () => {
      // Create a large CLAUDE.md to push baseline over 80K
      // baseline = claudeMd + systemEstimate(12000) + skillBudget(15000) + hookPerTurn(3000)
      // Need claudeMd > 80000 - 30000 = 50000
      fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(55000));

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      const health = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health.json'), 'utf-8'));
      expect(health.warningLevel).toBe('warning');
    });

    it('should set warningLevel to critical when baseline > 120KB', async () => {
      fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), 'x'.repeat(100000));

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      const health = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health.json'), 'utf-8'));
      expect(health.warningLevel).toBe('critical');
    });

    it('should handle missing CLAUDE.md', async () => {
      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      await handle(input, context);

      const health = JSON.parse(fs.readFileSync(path.join(stateDir, 'prompt-health.json'), 'utf-8'));
      expect(health.claudeMdSize).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should create stateDir if missing', async () => {
      fs.rmSync(stateDir, { recursive: true, force: true });

      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      const result = await handle(input, context);

      expect(result.continue).toBe(true);
      expect(fs.existsSync(stateDir)).toBe(true);
    });

    it('should not throw on any error', async () => {
      const { handle } = await import('../../../../../src/core/hooks/handlers/session-start.js');
      // Even with a bad context, should not throw
      const badContext: HookContext = {
        ...context,
        stateDir: '/nonexistent/path/that/will/fail',
        logsDir: '/nonexistent/logs',
      };

      const result = await handle(input, badContext);
      expect(result.continue).toBe(true);
    });
  });
});
