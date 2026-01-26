import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Unit Tests: Session State Tracker
 *
 * Tests session state management for tracking plugin installations
 * and other session-level data.
 *
 * TDD Phase: RED - Tests written BEFORE implementation
 */

import {
  initSessionState,
  recordPluginInstallation,
  loadSessionState,
  clearSessionState,
  type SessionState,
} from '../../../src/core/session/session-state.js';

describe('Session State Tracker', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(async () => {
    // Create temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-session-test-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initSessionState()', () => {
    it('should create empty state with sessionId', () => {
      // Given: A new session starts
      // When: initSessionState() is called
      const state = initSessionState(tempDir);

      // Then: it should create empty state with sessionId
      expect(state).toBeDefined();
      expect(state.sessionId).toBeDefined();
      expect(state.sessionId.length).toBeGreaterThan(0);
      expect(state.pluginsInstalledDuringSession).toEqual([]);
    });

    it('should include startTime in session state', () => {
      // Given: A new session
      // When: initSessionState() is called
      const state = initSessionState(tempDir);

      // Then: startTime should be a valid ISO timestamp
      expect(state.startTime).toBeDefined();
      expect(new Date(state.startTime).getTime()).not.toBeNaN();
    });

    it('should persist state to file', () => {
      // Given: A new session
      // When: initSessionState() is called
      initSessionState(tempDir);

      // Then: state file should exist
      const stateFile = path.join(stateDir, 'session-state.json');
      expect(fs.existsSync(stateFile)).toBe(true);
    });

    it('should generate unique sessionId for each call', () => {
      // Given: Multiple session initializations
      const state1 = initSessionState(tempDir);
      clearSessionState(tempDir);
      const state2 = initSessionState(tempDir);

      // Then: sessionIds should be different
      expect(state1.sessionId).not.toBe(state2.sessionId);
    });
  });

  describe('recordPluginInstallation()', () => {
    it('should add plugins to state', () => {
      // Given: An initialized session
      initSessionState(tempDir);

      // When: recordPluginInstallation() is called
      const state = recordPluginInstallation(tempDir, ['sw', 'sw-frontend']);

      // Then: state should include the installed plugins
      expect(state.pluginsInstalledDuringSession).toContain('sw');
      expect(state.pluginsInstalledDuringSession).toContain('sw-frontend');
    });

    it('should append to existing plugins', () => {
      // Given: Session with previously installed plugins
      initSessionState(tempDir);
      recordPluginInstallation(tempDir, ['sw']);

      // When: More plugins are installed
      const state = recordPluginInstallation(tempDir, ['sw-backend']);

      // Then: All plugins should be present
      expect(state.pluginsInstalledDuringSession).toContain('sw');
      expect(state.pluginsInstalledDuringSession).toContain('sw-backend');
    });

    it('should not duplicate plugins', () => {
      // Given: Session with installed plugins
      initSessionState(tempDir);
      recordPluginInstallation(tempDir, ['sw']);

      // When: Same plugin is recorded again
      const state = recordPluginInstallation(tempDir, ['sw']);

      // Then: Plugin should appear only once
      const swCount = state.pluginsInstalledDuringSession.filter(p => p === 'sw').length;
      expect(swCount).toBe(1);
    });

    it('should update lastInstallationEvent', () => {
      // Given: An initialized session
      initSessionState(tempDir);

      // When: recordPluginInstallation() is called
      const state = recordPluginInstallation(tempDir, ['sw'], {
        trigger: 'specweave-init',
        projectPath: '/some/path',
      });

      // Then: lastInstallationEvent should be set
      expect(state.lastInstallationEvent).toBeDefined();
      expect(state.lastInstallationEvent?.trigger).toBe('specweave-init');
      expect(state.lastInstallationEvent?.projectPath).toBe('/some/path');
    });
  });

  describe('loadSessionState()', () => {
    it('should return persisted state', () => {
      // Given: State file exists
      initSessionState(tempDir);
      recordPluginInstallation(tempDir, ['sw', 'sw-frontend']);

      // When: loadSessionState() is called
      const state = loadSessionState(tempDir);

      // Then: it should return the persisted state
      expect(state).toBeDefined();
      expect(state?.pluginsInstalledDuringSession).toContain('sw');
      expect(state?.pluginsInstalledDuringSession).toContain('sw-frontend');
    });

    it('should return null when state file does not exist', () => {
      // Given: No state file exists
      // When: loadSessionState() is called
      const state = loadSessionState(tempDir);

      // Then: should return null
      expect(state).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      // Given: Invalid JSON in state file
      const stateFile = path.join(stateDir, 'session-state.json');
      fs.writeFileSync(stateFile, '{invalid json}');

      // When: loadSessionState() is called
      const state = loadSessionState(tempDir);

      // Then: should return null (graceful handling)
      expect(state).toBeNull();
    });
  });

  describe('clearSessionState()', () => {
    it('should remove state file', () => {
      // Given: State file exists
      initSessionState(tempDir);
      const stateFile = path.join(stateDir, 'session-state.json');
      expect(fs.existsSync(stateFile)).toBe(true);

      // When: clearSessionState() is called
      clearSessionState(tempDir);

      // Then: state file should be removed
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('should not throw when state file does not exist', () => {
      // Given: No state file exists
      // When: clearSessionState() is called
      // Then: should not throw
      expect(() => clearSessionState(tempDir)).not.toThrow();
    });
  });
});
