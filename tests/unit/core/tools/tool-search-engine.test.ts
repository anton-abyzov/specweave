/**
 * Tool Search Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSearchEngine } from '../../../../src/core/tools/tool-search-engine.js';
import type { IndexedTool } from '../../../../src/core/tools/types/tool-registry-types.js';

describe('ToolSearchEngine', () => {
  let engine: ToolSearchEngine;
  let mockTools: IndexedTool[];

  beforeEach(() => {
    engine = new ToolSearchEngine();
    mockTools = [
      {
        id: 'sw-github:skill:github-sync',
        name: 'github-sync',
        type: 'skill',
        pluginName: 'sw-github',
        description: 'Sync to GitHub issues. Activates for: github, issues, sync',
        keywords: ['github', 'sync', 'issues', 'pull', 'request'],
        relativePath: 'plugins/sw-github/skills/github-sync/SKILL.md',
        loaded: false,
        indexedAt: new Date().toISOString(),
      },
      {
        id: 'sw-jira:skill:jira-sync',
        name: 'jira-sync',
        type: 'skill',
        pluginName: 'sw-jira',
        description: 'Sync to JIRA. Handles epics, stories, and boards.',
        keywords: ['jira', 'sync', 'epics', 'stories', 'atlassian'],
        relativePath: 'plugins/sw-jira/skills/jira-sync/SKILL.md',
        loaded: false,
        indexedAt: new Date().toISOString(),
      },
      {
        id: 'sw-k8s:agent:k8s-architect',
        name: 'k8s-architect',
        type: 'agent',
        pluginName: 'sw-k8s',
        description: 'Kubernetes architecture expert. Creates manifests, deployments.',
        keywords: ['kubernetes', 'k8s', 'manifest', 'deployment', 'helm'],
        capabilities: [
          { description: 'Create K8s manifests', keywords: ['manifest', 'yaml'] },
          { description: 'Deploy to EKS/AKS/GKE', keywords: ['deploy', 'cloud'] },
        ],
        relativePath: 'plugins/sw-k8s/agents/k8s-architect/AGENT.md',
        loaded: false,
        indexedAt: new Date().toISOString(),
      },
    ];
    engine.buildIndex(mockTools);
  });

  describe('buildIndex', () => {
    it('should build index from tools', () => {
      expect(engine.getByKeyword('github')).toHaveLength(1);
      expect(engine.getByKeyword('sync')).toHaveLength(2);
      expect(engine.getByKeyword('kubernetes')).toHaveLength(1);
    });

    it('should handle empty tools array', () => {
      engine.buildIndex([]);
      expect(engine.search('anything')).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find exact keyword matches', () => {
      const results = engine.search('github');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tool.id).toBe('sw-github:skill:github-sync');
    });

    it('should find partial matches', () => {
      const results = engine.search('sync issues');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedKeywords).toContain('sync');
    });

    it('should filter by type', () => {
      const results = engine.search('sync', { type: 'agent' });
      expect(results).toHaveLength(0);

      const skillResults = engine.search('sync', { type: 'skill' });
      expect(skillResults.length).toBeGreaterThan(0);
    });

    it('should filter by plugin', () => {
      const results = engine.search('sync', { plugin: 'sw-github' });
      expect(results).toHaveLength(1);
      expect(results[0].tool.pluginName).toBe('sw-github');
    });

    it('should respect limit option', () => {
      const results = engine.search('sync', { limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should respect minScore option', () => {
      const results = engine.search('xyznotfound', { minScore: 0.5 });
      expect(results).toHaveLength(0);
    });

    it('should return empty for empty query', () => {
      expect(engine.search('')).toHaveLength(0);
      expect(engine.search('   ')).toHaveLength(0);
    });

    it('should score exact matches higher', () => {
      const results = engine.search('jira');
      expect(results[0].tool.id).toBe('sw-jira:skill:jira-sync');
      expect(results[0].score).toBeGreaterThan(0.3);
    });
  });

  describe('suggest', () => {
    it('should suggest tools based on partial query', () => {
      const suggestions = engine.suggest('git');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('github-sync');
    });

    it('should limit suggestions', () => {
      const suggestions = engine.suggest('s', 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getByKeyword', () => {
    it('should return tools with exact keyword', () => {
      const tools = engine.getByKeyword('kubernetes');
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('k8s-architect');
    });

    it('should return empty for unknown keyword', () => {
      expect(engine.getByKeyword('nonexistent')).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const lower = engine.getByKeyword('github');
      const upper = engine.getByKeyword('GITHUB');
      expect(lower).toEqual(upper);
    });
  });
});
