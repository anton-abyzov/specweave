import { describe, it, expect } from 'vitest';
import {
  generateLabels,
  type LabelConfig,
} from '../../../src/sync/engine.js';

describe('Label Generation', () => {
  describe('generateLabels', () => {
    it('should generate correct priority label for P1', () => {
      const labels = generateLabels({
        priority: 'P1',
        type: 'user-story',
        projectName: 'specweave',
      });

      const priorityLabel = labels.find(l => l.name.startsWith('priority:'));
      expect(priorityLabel).toBeDefined();
      expect(priorityLabel!.name).toBe('priority:P1');
    });

    it('should generate priority:P0 for P0 (not "critical")', () => {
      const labels = generateLabels({
        priority: 'P0',
        type: 'user-story',
        projectName: 'specweave',
      });

      const priorityLabel = labels.find(l => l.name.startsWith('priority:'));
      expect(priorityLabel!.name).toBe('priority:P0');
      expect(labels.every(l => l.name !== 'critical')).toBe(true);
    });

    it('should use only ONE project label format: project:name', () => {
      const labels = generateLabels({
        priority: 'P1',
        type: 'user-story',
        projectName: 'specweave',
      });

      const projectLabels = labels.filter(l => l.name.includes('specweave'));
      expect(projectLabels).toHaveLength(1);
      expect(projectLabels[0].name).toBe('project:specweave');
    });

    it('should generate type label', () => {
      const labels = generateLabels({
        priority: 'P1',
        type: 'user-story',
        projectName: 'specweave',
      });

      const typeLabel = labels.find(l => l.name.startsWith('type:'));
      expect(typeLabel).toBeDefined();
      expect(typeLabel!.name).toBe('type:user-story');
    });

    it('should include color for each label', () => {
      const labels = generateLabels({
        priority: 'P1',
        type: 'user-story',
        projectName: 'specweave',
      });

      for (const label of labels) {
        expect(label.color).toBeDefined();
        expect(label.color.length).toBe(6); // hex color without #
      }
    });

    it('should handle task type', () => {
      const labels = generateLabels({
        priority: 'P2',
        type: 'task',
        projectName: 'myproject',
      });

      expect(labels.find(l => l.name === 'type:task')).toBeDefined();
      expect(labels.find(l => l.name === 'priority:P2')).toBeDefined();
      expect(labels.find(l => l.name === 'project:myproject')).toBeDefined();
    });

    it('should not generate duplicate labels', () => {
      const labels = generateLabels({
        priority: 'P1',
        type: 'user-story',
        projectName: 'specweave',
      });

      const names = labels.map(l => l.name);
      const unique = [...new Set(names)];
      expect(names).toEqual(unique);
    });
  });
});
