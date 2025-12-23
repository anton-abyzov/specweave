/**
 * Tool Registry Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolRegistry } from '../../../../src/core/tools/tool-registry.js';

describe('ToolRegistry', () => {
  let tempDir: string;
  let registry: ToolRegistry;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-registry-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    registry = new ToolRegistry(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('load/save', () => {
    it('should start with empty registry', async () => {
      await registry.load();
      const tools = await registry.listTools();
      expect(tools).toHaveLength(0);
    });

    it('should save and load registry data', async () => {
      // Manually add a tool to test persistence
      const registryPath = path.join(tempDir, '.specweave', 'state', 'tool-registry.json');
      const testData = {
        version: '1.0.0',
        tools: {
          'test:skill:test': {
            id: 'test:skill:test',
            name: 'test',
            type: 'skill',
            pluginName: 'test',
            description: 'Test skill',
            keywords: ['test'],
            relativePath: 'test/SKILL.md',
            loaded: false,
            indexedAt: new Date().toISOString(),
          },
        },
        metadata: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          toolCount: 1,
        },
        keywordIndex: {
          test: ['test:skill:test'],
        },
      };
      fs.writeFileSync(registryPath, JSON.stringify(testData, null, 2));

      await registry.load();
      const tools = await registry.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, '.specweave', 'state', 'tool-registry.json');
      const testData = {
        version: '1.0.0',
        tools: {
          'github:skill:sync': {
            id: 'github:skill:sync',
            name: 'sync',
            type: 'skill',
            pluginName: 'github',
            description: 'Sync to GitHub',
            keywords: ['github', 'sync'],
            relativePath: 'github/sync/SKILL.md',
            loaded: false,
            indexedAt: new Date().toISOString(),
          },
          'jira:skill:sync': {
            id: 'jira:skill:sync',
            name: 'sync',
            type: 'skill',
            pluginName: 'jira',
            description: 'Sync to JIRA',
            keywords: ['jira', 'sync'],
            relativePath: 'jira/sync/SKILL.md',
            loaded: false,
            indexedAt: new Date().toISOString(),
          },
        },
        metadata: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          toolCount: 2,
        },
        keywordIndex: {
          github: ['github:skill:sync'],
          jira: ['jira:skill:sync'],
          sync: ['github:skill:sync', 'jira:skill:sync'],
        },
      };
      fs.writeFileSync(registryPath, JSON.stringify(testData, null, 2));
    });

    it('should search for tools', async () => {
      const results = await registry.search('github');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tool.pluginName).toBe('github');
    });

    it('should find best match', async () => {
      const result = await registry.findBestMatch('sync jira');
      expect(result).not.toBeNull();
      expect(result!.tool.pluginName).toBe('jira');
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, '.specweave', 'state', 'tool-registry.json');
      const testData = {
        version: '1.0.0',
        tools: {
          'test:skill:test': {
            id: 'test:skill:test',
            name: 'test',
            type: 'skill',
            pluginName: 'test',
            description: 'Test',
            keywords: ['test'],
            relativePath: 'test/SKILL.md',
            loaded: false,
            indexedAt: new Date().toISOString(),
          },
        },
        metadata: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          toolCount: 1,
        },
      };
      fs.writeFileSync(registryPath, JSON.stringify(testData, null, 2));
    });

    it('should get tool by ID', async () => {
      const tool = await registry.getTool('test:skill:test');
      expect(tool).not.toBeNull();
      expect(tool!.name).toBe('test');
    });

    it('should return null for unknown ID', async () => {
      const tool = await registry.getTool('nonexistent');
      expect(tool).toBeNull();
    });

    it('should check if tool exists', async () => {
      expect(await registry.hasTool('test:skill:test')).toBe(true);
      expect(await registry.hasTool('nonexistent')).toBe(false);
    });

    it('should count tools', async () => {
      expect(await registry.count()).toBe(1);
    });

    it('should list tools with filter', async () => {
      const skills = await registry.listTools({ type: 'skill' });
      expect(skills).toHaveLength(1);

      const agents = await registry.listTools({ type: 'agent' });
      expect(agents).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('should return registry statistics', async () => {
      const registryPath = path.join(tempDir, '.specweave', 'state', 'tool-registry.json');
      const testData = {
        version: '1.0.0',
        tools: {
          'p1:skill:s1': { id: 'p1:skill:s1', type: 'skill', pluginName: 'p1', name: 's1', description: '', keywords: [], relativePath: '', loaded: false, indexedAt: '' },
          'p1:agent:a1': { id: 'p1:agent:a1', type: 'agent', pluginName: 'p1', name: 'a1', description: '', keywords: [], relativePath: '', loaded: false, indexedAt: '' },
          'p2:command:c1': { id: 'p2:command:c1', type: 'command', pluginName: 'p2', name: 'c1', description: '', keywords: [], relativePath: '', loaded: false, indexedAt: '' },
        },
        metadata: { created: '', lastUpdated: '2024-01-01', toolCount: 3 },
        keywordIndex: { k1: ['p1:skill:s1'], k2: ['p1:agent:a1'] },
      };
      fs.writeFileSync(registryPath, JSON.stringify(testData));

      const stats = await registry.getStats();
      expect(stats.totalTools).toBe(3);
      expect(stats.skillCount).toBe(1);
      expect(stats.agentCount).toBe(1);
      expect(stats.commandCount).toBe(1);
      expect(stats.pluginCount).toBe(2);
    });
  });

  describe('event bus', () => {
    it('should return event bus', () => {
      const bus = registry.getEventBus();
      expect(bus).toBeDefined();
      expect(typeof bus.on).toBe('function');
    });

    it('should record tool selection', async () => {
      const bus = registry.getEventBus();
      const handler = vi.fn();
      bus.onToolSelected(handler);

      registry.recordToolSelection('test:skill:test', 'test query', 0.9);
      expect(handler).toHaveBeenCalled();
    });
  });
});
