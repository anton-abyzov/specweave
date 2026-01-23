/**
 * Universal External Sync Tests
 *
 * Tests that ALL external tools (GitHub/JIRA/ADO) are properly synced
 * on task.updated, spec.updated, and other events.
 *
 * v1.0.144: Ensures universal sync architecture is properly implemented.
 *
 * Key verification:
 * - task.updated → project-bridge-handler → ALL external tools
 * - spec.updated → project-bridge-handler → ALL external tools
 * - user-story.completed → ALL external tools (not just GitHub)
 * - increment.created → ALL external tools (not just GitHub)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Universal External Sync Architecture', () => {
  describe('processor.sh Event Routing', () => {
    const processorPath = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/queue/processor.sh'
    );

    it('should route task.updated to project-bridge-handler', () => {
      const content = fs.readFileSync(processorPath, 'utf-8');

      // Find the task.updated case block
      const taskUpdatedMatch = content.match(/task\.updated\)([\s\S]*?);;/);
      expect(taskUpdatedMatch).toBeTruthy();

      const taskUpdatedBlock = taskUpdatedMatch![1];

      // Should contain project-bridge-handler for universal sync
      expect(taskUpdatedBlock).toContain('project-bridge-handler.sh');
      // Should also contain GitHub-specific handler
      expect(taskUpdatedBlock).toContain('github-sync-handler.sh');
      // Should contain AC validation
      expect(taskUpdatedBlock).toContain('ac-validation-handler.sh');
    });

    it('should route spec.updated to project-bridge-handler', () => {
      const content = fs.readFileSync(processorPath, 'utf-8');

      // Find the spec.updated case block
      const specUpdatedMatch = content.match(/spec\.updated\)([\s\S]*?);;/);
      expect(specUpdatedMatch).toBeTruthy();

      const specUpdatedBlock = specUpdatedMatch![1];

      // Should contain project-bridge-handler for universal sync
      expect(specUpdatedBlock).toContain('project-bridge-handler.sh');
      // Should also contain GitHub-specific handler
      expect(specUpdatedBlock).toContain('github-sync-handler.sh');
    });

    it('should route metadata.changed to project-bridge-handler', () => {
      const content = fs.readFileSync(processorPath, 'utf-8');

      // Find the metadata.changed case block
      const metadataMatch = content.match(/metadata\.changed\)([\s\S]*?);;/);
      expect(metadataMatch).toBeTruthy();

      const metadataBlock = metadataMatch![1];

      // Should contain project-bridge-handler for universal sync
      expect(metadataBlock).toContain('project-bridge-handler.sh');
    });

    it('should document universal external tool sync in comments', () => {
      const content = fs.readFileSync(processorPath, 'utf-8');

      // Should have comment about ALL external tools
      expect(content).toContain('ALL external tools');
      expect(content).toContain('GitHub/JIRA/ADO');
    });
  });

  describe('ProjectService Event Types', () => {
    const servicePath = path.join(
      process.cwd(),
      'src/core/project/project-service.ts'
    );

    it('should include spec.updated in IncrementEventType', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content).toContain("| 'spec.updated'");
    });

    it('should include task.updated in IncrementEventType', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content).toContain("| 'task.updated'");
    });

    it('should include metadata.changed in IncrementEventType', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content).toContain("| 'metadata.changed'");
    });
  });

  describe('ProjectService emitIncrementEvent', () => {
    const servicePath = path.join(
      process.cwd(),
      'src/core/project/project-service.ts'
    );

    it('should sync spec.updated to ALL external tools', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the spec.updated case
      const specCase = content.match(/case 'spec\.updated':([\s\S]*?)break;/);
      expect(specCase).toBeTruthy();

      const specBlock = specCase![1];
      // Should sync to all three tools
      expect(specBlock).toContain("['github', 'ado', 'jira']");
    });

    it('should sync task.updated to ALL external tools', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the task.updated case
      const taskCase = content.match(/case 'task\.updated':([\s\S]*?)break;/);
      expect(taskCase).toBeTruthy();

      const taskBlock = taskCase![1];
      // Should sync to all three tools
      expect(taskBlock).toContain("['github', 'ado', 'jira']");
    });

    it('should sync user-story.completed to ALL external tools (not just GitHub)', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the user-story.completed case
      const usCase = content.match(/case 'user-story\.completed':([\s\S]*?)break;/);
      expect(usCase).toBeTruthy();

      const usBlock = usCase![1];
      // Should sync to all three tools (v1.0.144 fix)
      expect(usBlock).toContain("['github', 'ado', 'jira']");
    });

    it('should sync increment.created to ALL external tools (not just GitHub)', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the increment.created case
      const incCase = content.match(/case 'increment\.created':([\s\S]*?)break;/);
      expect(incCase).toBeTruthy();

      const incBlock = incCase![1];
      // Should sync to all three tools (v1.0.144 fix - was GitHub-only before)
      expect(incBlock).toContain("['github', 'ado', 'jira']");
    });

    it('should sync increment.reopened to ALL external tools', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the increment.reopened case
      const reopenCase = content.match(/case 'increment\.reopened':([\s\S]*?)break;/);
      expect(reopenCase).toBeTruthy();

      const reopenBlock = reopenCase![1];
      // Should sync to all three tools (v1.0.144 fix - was GitHub-only before)
      expect(reopenBlock).toContain("['github', 'ado', 'jira']");
    });

    it('should sync increment.archived to ALL external tools', () => {
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Find the increment.archived case
      const archiveCase = content.match(/case 'increment\.archived':([\s\S]*?)break;/);
      expect(archiveCase).toBeTruthy();

      const archiveBlock = archiveCase![1];
      // Should sync to all three tools (v1.0.144 fix - was no-op before)
      expect(archiveBlock).toContain("['github', 'ado', 'jira']");
    });
  });

  describe('project-bridge.js Documentation', () => {
    const bridgePath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/project-bridge.js'
    );

    it('should document spec.updated event type', () => {
      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content).toContain('spec.updated');
    });

    it('should document task.updated event type', () => {
      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content).toContain('task.updated');
    });

    it('should document metadata.changed event type', () => {
      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content).toContain('metadata.changed');
    });

    it('should document universal sync to ALL external tools', () => {
      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content).toContain('ALL enabled external tools');
      expect(content).toContain('GitHub/JIRA/ADO');
    });
  });
});

describe('External Tool Adapters Registration', () => {
  const servicePath = path.join(
    process.cwd(),
    'src/core/project/project-service.ts'
  );

  it('should import GitHubProjectAdapter', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('GitHubProjectAdapter');
  });

  it('should import ADOProjectAdapter', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('ADOProjectAdapter');
  });

  it('should import JiraProjectAdapter', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('JiraProjectAdapter');
  });

  it('should initialize all adapters when enabled in config', () => {
    const content = fs.readFileSync(servicePath, 'utf-8');

    // Check for conditional adapter initialization
    expect(content).toContain('config.github?.enabled');
    expect(content).toContain('config.ado?.enabled');
    expect(content).toContain('config.jira?.enabled');
  });
});
