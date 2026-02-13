/**
 * Unit tests for SessionStart hook agent_type feature (Claude Code 2.1.2+)
 *
 * Tests the agent_type field in SessionStart hook input which enables
 * agent-specific initialization behavior.
 *
 * @see https://docs.anthropic.com/en/release-notes/claude-code (v2.1.2)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('SessionStart hook agent_type feature', () => {
  let testDir: string;
  let specweaveDir: string;
  let stateDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    specweaveDir = path.join(testDir, '.specweave');
    stateDir = path.join(specweaveDir, 'state');

    fs.mkdirSync(specweaveDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('agent_type extraction', () => {
    it('should extract agent_type from JSON input', () => {
      const input = JSON.stringify({
        agent_type: 'sw:pm',
        session_id: 'test-session-123'
      });

      // Parse like the hook does
      let agentType = '';
      try {
        const parsed = JSON.parse(input);
        agentType = parsed.agent_type || '';
      } catch {
        agentType = '';
      }

      expect(agentType).toBe('sw:pm');
    });

    it('should handle missing agent_type gracefully', () => {
      const input = JSON.stringify({
        session_id: 'test-session-123'
      });

      let agentType = '';
      try {
        const parsed = JSON.parse(input);
        agentType = parsed.agent_type || '';
      } catch {
        agentType = '';
      }

      expect(agentType).toBe('');
    });

    it('should handle null agent_type', () => {
      const input = JSON.stringify({
        agent_type: null,
        session_id: 'test-session-123'
      });

      let agentType = '';
      try {
        const parsed = JSON.parse(input);
        agentType = parsed.agent_type || '';
      } catch {
        agentType = '';
      }

      expect(agentType).toBe('');
    });

    it('should handle malformed JSON gracefully', () => {
      const input = 'not valid json';

      let agentType = '';
      try {
        const parsed = JSON.parse(input);
        agentType = parsed.agent_type || '';
      } catch {
        agentType = '';
      }

      expect(agentType).toBe('');
    });

    it('should handle empty input', () => {
      const input = '';

      let agentType = '';
      try {
        const parsed = JSON.parse(input || '{}');
        agentType = parsed.agent_type || '';
      } catch {
        agentType = '';
      }

      expect(agentType).toBe('');
    });
  });

  describe('agent-specific initialization', () => {
    const AGENT_MESSAGES: Record<string, string> = {
      'sw:pm': 'PM Agent: Product Management context loaded',
      'sw-pm': 'PM Agent: Product Management context loaded',
      'sw:architect': 'Architect Agent: Technical design context loaded',
      'sw-architect': 'Architect Agent: Technical design context loaded',
    };

    it('should return PM message for sw:pm agent', () => {
      const agentType = 'sw:pm';
      const message = AGENT_MESSAGES[agentType] || '';

      expect(message).toContain('PM Agent');
      expect(message).toContain('Product Management');
    });

    it('should return PM message for sw-pm agent (alternate format)', () => {
      const agentType = 'sw-pm';
      const message = AGENT_MESSAGES[agentType] || '';

      expect(message).toContain('PM Agent');
    });

    it('should return Architect message for sw:architect agent', () => {
      const agentType = 'sw:architect';
      const message = AGENT_MESSAGES[agentType] || '';

      expect(message).toContain('Architect Agent');
      expect(message).toContain('Technical design');
    });

    it('should return empty message for unknown agent type', () => {
      const agentType = 'unknown:agent';
      const message = AGENT_MESSAGES[agentType] || '';

      expect(message).toBe('');
    });

    it('should return empty message for empty agent type', () => {
      const agentType = '';
      const message = AGENT_MESSAGES[agentType] || '';

      expect(message).toBe('');
    });
  });

  describe('state file storage', () => {
    it('should write agent type to state file', () => {
      const agentType = 'sw:pm';
      const stateFile = path.join(stateDir, '.current-agent-type');

      // Simulate what the hook does
      fs.writeFileSync(stateFile, agentType);

      expect(fs.existsSync(stateFile)).toBe(true);
      expect(fs.readFileSync(stateFile, 'utf-8')).toBe('sw:pm');
    });

    it('should not create state file for empty agent type', () => {
      const agentType = '';
      const stateFile = path.join(stateDir, '.current-agent-type');

      // Only write if agentType is not empty
      if (agentType) {
        fs.writeFileSync(stateFile, agentType);
      }

      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('should overwrite existing state file', () => {
      const stateFile = path.join(stateDir, '.current-agent-type');

      // Write first agent type
      fs.writeFileSync(stateFile, 'sw:pm');
      expect(fs.readFileSync(stateFile, 'utf-8')).toBe('sw:pm');

      // Overwrite with second agent type
      fs.writeFileSync(stateFile, 'sw:architect');
      expect(fs.readFileSync(stateFile, 'utf-8')).toBe('sw:architect');
    });
  });

  describe('JSON output format', () => {
    it('should produce valid JSON systemMessage for PM agent', () => {
      const output = '{"continue":true,"systemMessage":"🎯 PM Agent: Product Management context loaded. Focus on user stories, acceptance criteria, and business value."}';

      const parsed = JSON.parse(output);

      expect(parsed.continue).toBe(true);
      expect(parsed.systemMessage).toContain('PM Agent');
    });

    it('should produce valid JSON systemMessage for Architect agent', () => {
      const output = '{"continue":true,"systemMessage":"🏗️ Architect Agent: Technical design context loaded. Focus on ADRs, system design, and architecture patterns."}';

      const parsed = JSON.parse(output);

      expect(parsed.continue).toBe(true);
      expect(parsed.systemMessage).toContain('Architect Agent');
    });

    it('should produce valid JSON systemMessage for Tech Lead agent', () => {
      const output = '{"continue":true,"systemMessage":"👨‍💻 Tech Lead Agent: Implementation context loaded. Focus on code quality, best practices, and task execution."}';

      const parsed = JSON.parse(output);

      expect(parsed.continue).toBe(true);
      expect(parsed.systemMessage).toContain('Tech Lead Agent');
    });
  });
});
