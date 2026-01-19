/**
 * Tool Index Builder Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolIndexBuilder } from '../../../../src/core/tools/tool-index-builder.js';

describe('ToolIndexBuilder', () => {
  let tempDir: string;
  let pluginsDir: string;
  let builder: ToolIndexBuilder;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-index-builder-test-'));
    pluginsDir = path.join(tempDir, 'plugins');
    fs.mkdirSync(pluginsDir, { recursive: true });
    builder = new ToolIndexBuilder(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('buildIndex', () => {
    it('should return empty result when plugins directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      const result = await builder.buildIndex({ pluginsDir: nonExistentDir });

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(0);
      expect(result.warnings).toContain(`Plugins directory not found: ${nonExistentDir}`);
    });

    it('should index skills from plugins', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: test-skill
description: A test skill for unit testing. Activates for: testing, unit tests.
---

# Test Skill
`
      );

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(1);
      expect(result.skillCount).toBe(1);

      const tools = builder.getIndexedTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe('test-plugin:skill:test-skill');
      expect(tools[0].type).toBe('skill');
      expect(tools[0].keywords).toContain('testing');
    });

    it('should index agents from plugins', async () => {
      const agentDir = path.join(pluginsDir, 'test-plugin', 'agents', 'test-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'AGENT.md'),
        `---
name: test-agent
description: A test agent for architecture. Activates for: design, architecture.
model: opus
---

# Test Agent

## Capabilities

- Design system architecture
- Create diagrams
`
      );

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.agentCount).toBe(1);

      const tools = builder.getIndexedTools();
      expect(tools[0].type).toBe('agent');
      expect(tools[0].capabilities).toHaveLength(2);
      expect(tools[0].modelPreference).toBe('sonnet');
    });

    it('should index commands from plugins', async () => {
      const commandsDir = path.join(pluginsDir, 'test-plugin', 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.writeFileSync(
        path.join(commandsDir, 'deploy.md'),
        `---
name: deploy
description: Deploy application to production
---

# Deploy Command
`
      );

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.commandCount).toBe(1);

      const tools = builder.getIndexedTools();
      expect(tools[0].id).toBe('test-plugin:command:deploy');
      expect(tools[0].type).toBe('command');
    });

    it('should handle malformed YAML gracefully', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'broken-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `This file has no YAML frontmatter

# Broken Skill

Just some content.
`
      );

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(1);

      const tools = builder.getIndexedTools();
      expect(tools[0].description).toBe('No description');
    });

    it('should skip directories without SKILL.md or AGENT.md', async () => {
      const emptyDir = path.join(pluginsDir, 'test-plugin', 'skills', 'empty-skill');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(0);
    });

    it('should warn when specified plugin not found', async () => {
      const result = await builder.buildIndex({
        pluginsDir,
        plugins: ['nonexistent-plugin'],
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Plugin not found: nonexistent-plugin');
    });

    it('should generate content hash for change detection', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'hash-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: hash-skill
description: Test hash generation
---
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].contentHash).toBeDefined();
      expect(tools[0].contentHash).toHaveLength(12);
    });

    it('should extract allowed-tools from SKILL.md', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'limited-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: limited-skill
description: A skill with limited tools
allowed-tools: Read, Grep, Glob
---
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].allowedTools).toEqual(['Read', 'Grep', 'Glob']);
    });

    it('should index multiple plugins in parallel', async () => {
      for (let i = 1; i <= 3; i++) {
        const skillDir = path.join(pluginsDir, `plugin-${i}`, 'skills', `skill-${i}`);
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(
          path.join(skillDir, 'SKILL.md'),
          `---
name: skill-${i}
description: Skill number ${i}
---
`
        );
      }

      const result = await builder.buildIndex({ pluginsDir });

      expect(result.success).toBe(true);
      expect(result.toolCount).toBe(3);
      expect(result.skillCount).toBe(3);
    });
  });

  describe('indexPlugin', () => {
    it('should return tools from a single plugin', async () => {
      const pluginPath = path.join(pluginsDir, 'my-plugin');
      const skillDir = path.join(pluginPath, 'skills', 'my-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: my-skill
description: My custom skill
---
`
      );

      const tools = await builder.indexPlugin(pluginPath, 'my-plugin');

      expect(tools).toHaveLength(1);
      expect(tools[0].pluginName).toBe('my-plugin');
    });
  });

  describe('keyword extraction', () => {
    it('should extract keywords from activates clause', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'keyword-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: keyword-skill
description: GitHub sync tool. Activates for: github, issues, pull requests, sync.
---
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].keywords).toContain('github');
      expect(tools[0].keywords).toContain('issues');
      expect(tools[0].keywords).toContain('sync');
    });

    it('should extract keywords from tool name', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'database-optimizer');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: database-optimizer
description: Optimizes database queries
---
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].keywords).toContain('database');
      expect(tools[0].keywords).toContain('optimizer');
    });

    it('should filter stop words', async () => {
      const skillDir = path.join(pluginsDir, 'test-plugin', 'skills', 'stopword-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: stopword-skill
description: This is a skill that does something with the things
---
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].keywords).not.toContain('this');
      expect(tools[0].keywords).not.toContain('the');
      expect(tools[0].keywords).not.toContain('with');
    });
  });

  describe('capabilities extraction', () => {
    it('should extract capabilities from agent markdown', async () => {
      const agentDir = path.join(pluginsDir, 'test-plugin', 'agents', 'capable-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'AGENT.md'),
        `---
name: capable-agent
description: An agent with many capabilities
---

# Capable Agent

## Capabilities

- Create Kubernetes manifests
- Deploy to AWS EKS
- Monitor pod health

## Usage

Use this agent for K8s work.
`
      );

      await builder.buildIndex({ pluginsDir });
      const tools = builder.getIndexedTools();

      expect(tools[0].capabilities).toHaveLength(3);
      expect(tools[0].capabilities![0].description).toBe('Create Kubernetes manifests');
      expect(tools[0].capabilities![0].keywords).toContain('kubernetes');
    });
  });
});
