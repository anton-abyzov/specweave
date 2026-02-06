import { describe, it, expect } from 'vitest';
import {
  mapHierarchy,
  extractAcceptanceCriteria,
  collapseHierarchy,
  type HierarchyPattern,
  type CollapsingRule,
  type ExternalItem,
} from '../../../src/sync/hierarchy.js';

describe('Flexible Hierarchy Mapping', () => {
  describe('mapHierarchy', () => {
    it('should map flat JIRA tasks to User Stories (AC-US5-01)', () => {
      const items: ExternalItem[] = [
        { id: '1', type: 'Task', title: 'Login page', description: '- User can enter email\n- User can enter password', parent: undefined },
        { id: '2', type: 'Task', title: 'Signup page', description: '1. Email validation\n2. Password strength', parent: undefined },
      ];

      const result = mapHierarchy(items, 'flat');
      expect(result).toHaveLength(2);
      expect(result[0].specweaveType).toBe('user-story');
      expect(result[1].specweaveType).toBe('user-story');
    });

    it('should map standard Epic/Story/Sub-task (AC-US5-03)', () => {
      const items: ExternalItem[] = [
        { id: '1', type: 'Epic', title: 'Auth Module', description: '', parent: undefined },
        { id: '2', type: 'Story', title: 'Login', description: '', parent: '1' },
        { id: '3', type: 'Sub-task', title: 'Add tests', description: '', parent: '2' },
      ];

      const result = mapHierarchy(items, 'standard');
      expect(result[0].specweaveType).toBe('feature');
      expect(result[1].specweaveType).toBe('user-story');
      expect(result[2].specweaveType).toBe('task');
    });

    it('should handle SAFe hierarchy with level collapsing (AC-US5-04)', () => {
      const items: ExternalItem[] = [
        { id: '1', type: 'Initiative', title: 'Q1 Goals', description: '', parent: undefined },
        { id: '2', type: 'Epic', title: 'Auth', description: '', parent: '1' },
        { id: '3', type: 'Story', title: 'Login', description: '', parent: '2' },
      ];

      const result = mapHierarchy(items, 'safe');
      expect(result[0].specweaveType).toBe('skip'); // Initiative skipped
      expect(result[1].specweaveType).toBe('feature'); // Epic → Feature
      expect(result[2].specweaveType).toBe('user-story'); // Story → US
    });
  });

  describe('extractAcceptanceCriteria (AC-US5-02)', () => {
    it('should extract ACs from markdown checklists', () => {
      const description = '- [ ] User can login with email\n- [ ] Error shown on wrong password\n- [x] Remember me works';
      const acs = extractAcceptanceCriteria(description);
      expect(acs).toHaveLength(3);
      expect(acs[0]).toBe('User can login with email');
      expect(acs[1]).toBe('Error shown on wrong password');
      expect(acs[2]).toBe('Remember me works');
    });

    it('should extract ACs from numbered lists', () => {
      const description = '1. Validate email format\n2. Check password strength\n3. Show confirmation';
      const acs = extractAcceptanceCriteria(description);
      expect(acs).toHaveLength(3);
      expect(acs[0]).toBe('Validate email format');
    });

    it('should extract ACs from bullet points', () => {
      const description = '- Login with Google\n- Login with GitHub\n- Login with email';
      const acs = extractAcceptanceCriteria(description);
      expect(acs).toHaveLength(3);
    });

    it('should return default AC when no pattern found', () => {
      const description = 'Just a plain text description without any list.';
      const acs = extractAcceptanceCriteria(description);
      expect(acs).toHaveLength(1);
      expect(acs[0]).toContain('completed as described');
    });

    it('should handle empty description', () => {
      const acs = extractAcceptanceCriteria('');
      expect(acs).toHaveLength(1);
      expect(acs[0]).toContain('completed as described');
    });
  });

  describe('collapseHierarchy', () => {
    it('should collapse flat tasks to user stories', () => {
      const rules: CollapsingRule[] = [
        { externalType: 'Task', specweaveType: 'user-story' },
      ];

      const result = collapseHierarchy('Task', rules);
      expect(result).toBe('user-story');
    });

    it('should skip unmapped types', () => {
      const rules: CollapsingRule[] = [
        { externalType: 'Initiative', specweaveType: 'skip' },
        { externalType: 'Epic', specweaveType: 'feature' },
      ];

      expect(collapseHierarchy('Initiative', rules)).toBe('skip');
      expect(collapseHierarchy('Epic', rules)).toBe('feature');
    });

    it('should return undefined for unknown types', () => {
      const rules: CollapsingRule[] = [
        { externalType: 'Task', specweaveType: 'user-story' },
      ];

      expect(collapseHierarchy('UnknownType', rules)).toBeUndefined();
    });
  });
});
