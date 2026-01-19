import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import {
  loadActivations,
  initSession,
  trackActivation,
  clearActivations,
  getActivatedDomains,
  hasActivations,
  getActivationSummary,
  inferDomain,
} from '../../../src/core/skills/activation-tracker.js';

/**
 * Skill/Agent Activation Tracker Unit Tests
 *
 * Tests for tracking skill activations during sessions
 * and integration with stop hook validation.
 */

describe('ActivationTracker', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `activation-tracker-test-${Date.now()}`);
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initSession', () => {
    it('should create a new session state file', () => {
      const sessionId = 'test-session-123';
      const state = initSession(sessionId, tempDir);

      expect(state.sessionId).toBe(sessionId);
      expect(state.activations).toEqual([]);
      expect(state.domains).toEqual([]);
      expect(state.startedAt).toBeDefined();

      // Verify file was created
      const statePath = path.join(stateDir, 'skill-activations.json');
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it('should create state directory if not exists', () => {
      const newDir = path.join(os.tmpdir(), `new-activation-test-${Date.now()}`);
      try {
        const state = initSession('test', newDir);
        expect(state).toBeDefined();

        const statePath = path.join(newDir, '.specweave', 'state', 'skill-activations.json');
        expect(fs.existsSync(statePath)).toBe(true);
      } finally {
        fs.rmSync(newDir, { recursive: true, force: true });
      }
    });
  });

  describe('trackActivation', () => {
    it('should track a skill activation', () => {
      initSession('test-session', tempDir);

      trackActivation({
        type: 'skill',
        fqn: 'sw-frontend:component',
        domain: 'frontend',
        trigger: 'react, component',
        confidence: 0.85,
      }, tempDir);

      const state = loadActivations(tempDir);
      expect(state?.activations).toHaveLength(1);
      expect(state?.activations[0].fqn).toBe('sw-frontend:component');
      expect(state?.activations[0].domain).toBe('frontend');
      expect(state?.domains).toContain('frontend');
    });

    it('should track multiple activations', () => {
      initSession('test-session', tempDir);

      trackActivation({
        type: 'skill',
        fqn: 'sw-frontend:component',
        domain: 'frontend',
        trigger: 'react',
        confidence: 0.8,
      }, tempDir);

      trackActivation({
        type: 'agent',
        fqn: 'sw-backend:api-architect',
        domain: 'backend',
        trigger: 'api, express',
        confidence: 0.9,
      }, tempDir);

      const state = loadActivations(tempDir);
      expect(state?.activations).toHaveLength(2);
      expect(state?.domains).toContain('frontend');
      expect(state?.domains).toContain('backend');
    });

    it('should not duplicate domains', () => {
      initSession('test-session', tempDir);

      trackActivation({
        type: 'skill',
        fqn: 'sw-frontend:component',
        domain: 'frontend',
        trigger: 'react',
        confidence: 0.8,
      }, tempDir);

      trackActivation({
        type: 'skill',
        fqn: 'sw-frontend:styling',
        domain: 'frontend',
        trigger: 'css',
        confidence: 0.7,
      }, tempDir);

      const state = loadActivations(tempDir);
      expect(state?.activations).toHaveLength(2);
      expect(state?.domains).toEqual(['frontend']);
    });

    it('should auto-init session if not exists', () => {
      // Don't call initSession - trackActivation should handle it
      trackActivation({
        type: 'skill',
        fqn: 'sw-testing:qa',
        domain: 'testing',
        trigger: 'test',
        confidence: 0.75,
      }, tempDir);

      const state = loadActivations(tempDir);
      expect(state).not.toBeNull();
      expect(state?.activations).toHaveLength(1);
    });
  });

  describe('loadActivations', () => {
    it('should return null if no state file exists', () => {
      const emptyDir = path.join(os.tmpdir(), `empty-activation-test-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });

      try {
        const state = loadActivations(emptyDir);
        expect(state).toBeNull();
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it('should load existing state', () => {
      const sessionId = 'loaded-session';
      initSession(sessionId, tempDir);

      const state = loadActivations(tempDir);
      expect(state?.sessionId).toBe(sessionId);
    });
  });

  describe('clearActivations', () => {
    it('should delete the state file', () => {
      initSession('test', tempDir);
      const statePath = path.join(stateDir, 'skill-activations.json');

      expect(fs.existsSync(statePath)).toBe(true);

      clearActivations(tempDir);

      expect(fs.existsSync(statePath)).toBe(false);
    });

    it('should not error if file does not exist', () => {
      expect(() => clearActivations(tempDir)).not.toThrow();
    });
  });

  describe('getActivatedDomains', () => {
    it('should return empty array if no activations', () => {
      const domains = getActivatedDomains(tempDir);
      expect(domains).toEqual([]);
    });

    it('should return activated domains', () => {
      initSession('test', tempDir);
      trackActivation({ type: 'skill', fqn: 'sw-ml:model', domain: 'ml', trigger: 'training', confidence: 0.8 }, tempDir);
      trackActivation({ type: 'skill', fqn: 'sw-infra:terraform', domain: 'infrastructure', trigger: 'terraform', confidence: 0.9 }, tempDir);

      const domains = getActivatedDomains(tempDir);
      expect(domains).toContain('ml');
      expect(domains).toContain('infrastructure');
    });
  });

  describe('hasActivations', () => {
    it('should return false if no activations', () => {
      expect(hasActivations(tempDir)).toBe(false);
    });

    it('should return true if activations exist', () => {
      initSession('test', tempDir);
      trackActivation({ type: 'skill', fqn: 'test', domain: 'testing', trigger: 'test', confidence: 0.5 }, tempDir);

      expect(hasActivations(tempDir)).toBe(true);
    });
  });

  describe('getActivationSummary', () => {
    it('should return message for no activations', () => {
      const summary = getActivationSummary(tempDir);
      expect(summary).toContain('No skills or agents were activated');
    });

    it('should return formatted summary', () => {
      initSession('summary-test', tempDir);
      trackActivation({
        type: 'skill',
        fqn: 'sw-frontend:react',
        domain: 'frontend',
        trigger: 'react, component',
        confidence: 0.85,
      }, tempDir);

      const summary = getActivationSummary(tempDir);
      expect(summary).toContain('summary-test');
      expect(summary).toContain('Activations: 1');
      expect(summary).toContain('frontend');
      expect(summary).toContain('sw-frontend:react');
    });
  });

  describe('inferDomain', () => {
    it('should detect frontend domain', () => {
      expect(inferDomain('sw-frontend:component')).toBe('frontend');
      expect(inferDomain('react-dashboard')).toBe('frontend');
      expect(inferDomain('vue-app')).toBe('frontend');
      expect(inferDomain('angular-component')).toBe('frontend');
    });

    it('should detect backend domain', () => {
      expect(inferDomain('sw-backend:api')).toBe('backend');
      expect(inferDomain('express-router')).toBe('backend');
      expect(inferDomain('fastapi-endpoint')).toBe('backend');
    });

    it('should detect mobile domain', () => {
      expect(inferDomain('sw-mobile:expo')).toBe('mobile');
      expect(inferDomain('expo-app')).toBe('mobile');
      expect(inferDomain('ios-screen')).toBe('mobile');
      expect(inferDomain('android-activity')).toBe('mobile');
    });

    it('should detect infrastructure domain', () => {
      expect(inferDomain('sw-infra:terraform')).toBe('infrastructure');
      expect(inferDomain('terraform-module')).toBe('infrastructure');
      expect(inferDomain('k8s-deployment')).toBe('infrastructure');
      expect(inferDomain('docker-compose')).toBe('infrastructure');
    });

    it('should detect ML domain', () => {
      expect(inferDomain('sw-ml:model')).toBe('ml');
      expect(inferDomain('training-pipeline')).toBe('ml');
      expect(inferDomain('ai-assistant')).toBe('ml');
    });

    it('should detect testing domain', () => {
      expect(inferDomain('sw-testing:qa')).toBe('testing');
      expect(inferDomain('vitest-suite')).toBe('testing');
      expect(inferDomain('playwright-e2e')).toBe('testing');
    });

    it('should return general for unknown domains', () => {
      expect(inferDomain('random-stuff')).toBe('general');
      expect(inferDomain('unknown')).toBe('general');
    });
  });
});
