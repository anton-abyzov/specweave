/**
 * Human Gate Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HumanGateDetector } from '../../../src/core/auto/human-gate.js';

describe('HumanGateDetector', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'human-gate-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectGate', () => {
    it('should detect deploy operations', () => {
      const detector = new HumanGateDetector(tempDir);

      const result = detector.detectGate('npm run deploy');

      expect(result.triggered).toBe(true);
      expect(result.pattern).toBe('deploy');
      expect(result.operation).toBe('npm run deploy');
    });

    it('should detect npm publish', () => {
      const detector = new HumanGateDetector(tempDir);

      const result = detector.detectGate('Running npm publish to publish package');

      expect(result.triggered).toBe(true);
      // Pattern matches the first matching pattern in the list
      expect(result.pattern).toContain('publish');
      expect(result.isNeverAutoApprove).toBe(true);
    });

    it('should detect force push', () => {
      const detector = new HumanGateDetector(tempDir);

      const result = detector.detectGate('git push --force origin main');

      expect(result.triggered).toBe(true);
      expect(result.isNeverAutoApprove).toBe(true);
    });

    it('should not trigger on normal operations', () => {
      const detector = new HumanGateDetector(tempDir);

      const result = detector.detectGate('npm run build');

      expect(result.triggered).toBe(false);
      expect(result.pattern).toBeNull();
    });

    it('should detect credentials/secrets', () => {
      const detector = new HumanGateDetector(tempDir);

      const result = detector.detectGate('Setting API key for service');

      expect(result.triggered).toBe(true);
    });

    it('should detect pre-approved patterns', () => {
      const detector = new HumanGateDetector(tempDir, {
        preApproved: ['deploy'],
      });

      const result = detector.detectGate('npm run deploy');

      expect(result.triggered).toBe(true);
      expect(result.isPreApproved).toBe(true);
    });
  });

  describe('createRequest', () => {
    it('should create gate request with unique ID', () => {
      // Create session file
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: {} })
      );

      const detector = new HumanGateDetector(tempDir);
      const request = detector.createRequest(
        'npm run deploy',
        'deploy',
        'Deploying to production'
      );

      expect(request.id).toMatch(/^gate-\d+-\w+$/);
      expect(request.operation).toBe('npm run deploy');
      expect(request.pattern).toBe('deploy');
      expect(new Date(request.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should save pending gate to session', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: {} })
      );

      const detector = new HumanGateDetector(tempDir);
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');

      const session = JSON.parse(
        fs.readFileSync(path.join(stateDir, 'auto-session.json'), 'utf-8')
      );

      expect(session.humanGates.pending).not.toBeNull();
      expect(session.humanGates.pending.id).toBe(request.id);
    });
  });

  describe('approveGate', () => {
    it('should approve gate and update session', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null, approved: [], blocked: [] } })
      );

      const detector = new HumanGateDetector(tempDir);
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');
      const response = detector.approveGate(request.id);

      expect(response.approved).toBe(true);
      expect(response.respondedBy).toBe('user');

      const session = JSON.parse(
        fs.readFileSync(path.join(stateDir, 'auto-session.json'), 'utf-8')
      );

      expect(session.humanGates.pending).toBeNull();
      expect(session.humanGates.approved).toContain(request.id);
    });
  });

  describe('denyGate', () => {
    it('should deny gate and update session', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null, approved: [], blocked: [] } })
      );

      const detector = new HumanGateDetector(tempDir);
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');
      const response = detector.denyGate(request.id, 'Not ready for deployment');

      expect(response.approved).toBe(false);
      expect(response.reason).toBe('Not ready for deployment');

      const session = JSON.parse(
        fs.readFileSync(path.join(stateDir, 'auto-session.json'), 'utf-8')
      );

      expect(session.humanGates.blocked).toContain(request.id);
    });
  });

  describe('checkApproval', () => {
    it('should return null for pending gates', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null, approved: [], blocked: [] } })
      );

      const detector = new HumanGateDetector(tempDir);
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');
      const approval = detector.checkApproval(request.id);

      expect(approval).toBeNull();
    });

    it('should return approved for pre-approved patterns', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null, approved: [], blocked: [] } })
      );

      const detector = new HumanGateDetector(tempDir, { preApproved: ['deploy'] });
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');
      const approval = detector.checkApproval(request.id);

      expect(approval?.approved).toBe(true);
      expect(approval?.respondedBy).toBe('pre-approved');
    });

    it('should timeout after expiry', async () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null, approved: [], blocked: [] } })
      );

      const detector = new HumanGateDetector(tempDir, { timeout: 0 }); // Immediate timeout
      const request = detector.createRequest('npm run deploy', 'deploy', 'context');

      // Wait a tiny bit for timeout
      await new Promise((r) => setTimeout(r, 10));

      const approval = detector.checkApproval(request.id);

      expect(approval?.approved).toBe(false);
      expect(approval?.respondedBy).toBe('timeout');
    });
  });

  describe('isNeverAutoApprove', () => {
    it('should return true for dangerous operations', () => {
      const detector = new HumanGateDetector(tempDir);

      expect(detector.isNeverAutoApprove('git push --force')).toBe(true);
      expect(detector.isNeverAutoApprove('rm -rf /')).toBe(true);
      expect(detector.isNeverAutoApprove('npm publish')).toBe(true);
    });

    it('should return false for normal operations', () => {
      const detector = new HumanGateDetector(tempDir);

      expect(detector.isNeverAutoApprove('npm run deploy')).toBe(false);
      expect(detector.isNeverAutoApprove('git push')).toBe(false);
    });
  });

  describe('getPendingGate', () => {
    it('should return pending gate from session', () => {
      const pendingGate = {
        id: 'gate-123',
        operation: 'npm run deploy',
        pattern: 'deploy',
        context: 'test',
        requestedAt: new Date().toISOString(),
        timeout: 1800,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
      };

      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: pendingGate } })
      );

      const detector = new HumanGateDetector(tempDir);
      const gate = detector.getPendingGate();

      expect(gate?.id).toBe('gate-123');
      expect(gate?.operation).toBe('npm run deploy');
    });

    it('should return null when no pending gate', () => {
      fs.writeFileSync(
        path.join(stateDir, 'auto-session.json'),
        JSON.stringify({ humanGates: { pending: null } })
      );

      const detector = new HumanGateDetector(tempDir);
      const gate = detector.getPendingGate();

      expect(gate).toBeNull();
    });
  });
});
