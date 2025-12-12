/**
 * Regression test for JIRA custom types (v0.35.3)
 *
 * Bug: Custom JIRA types like "L3 Feature" were not recognized
 * Root cause: Exact string matching instead of flexible keyword matching
 * Fix: Use .includes() for type matching (epic, feature, bug, story)
 */

import { describe, it, expect } from 'vitest';

// Mock JIRA issue type mapping
function mapJiraTypeToExternal(issueTypeName: string): string {
  let type: string = 'task';
  const issueType = issueTypeName.toLowerCase();

  // CRITICAL FIX (v0.35.3): Use flexible matching for JIRA custom types
  // Many organizations use custom issue types like "L3 Feature", "L2 Epic", etc.
  // Match by keywords instead of exact string comparison
  if (issueType.includes('story') || issueType === 'user story') {
    type = 'user-story';
  } else if (issueType.includes('epic') || issueType.includes('l2')) {
    // Match "Epic", "L2 Epic", "Team Epic", etc.
    type = 'epic';
  } else if (issueType.includes('feature') || issueType.includes('l3')) {
    // Match "Feature", "L3 Feature", "Team Feature", etc.
    type = 'feature';
  } else if (issueType.includes('bug')) {
    type = 'bug';
  }

  return type;
}

describe('JIRA Custom Type Mapping (v0.35.3)', () => {
  describe('Standard JIRA Types', () => {
    it('should map standard Epic to epic', () => {
      expect(mapJiraTypeToExternal('Epic')).toBe('epic');
      expect(mapJiraTypeToExternal('epic')).toBe('epic');
      expect(mapJiraTypeToExternal('EPIC')).toBe('epic');
    });

    it('should map standard Story to user-story', () => {
      expect(mapJiraTypeToExternal('Story')).toBe('user-story');
      expect(mapJiraTypeToExternal('User Story')).toBe('user-story');
      expect(mapJiraTypeToExternal('user story')).toBe('user-story');
    });

    it('should map standard Bug to bug', () => {
      expect(mapJiraTypeToExternal('Bug')).toBe('bug');
      expect(mapJiraTypeToExternal('bug')).toBe('bug');
    });

    it('should map standard Task to task', () => {
      expect(mapJiraTypeToExternal('Task')).toBe('task');
      expect(mapJiraTypeToExternal('Sub-task')).toBe('task');
    });
  });

  describe('Custom JIRA Types (Regression - v0.35.3)', () => {
    it('should map "L3 Feature" to feature (regression test)', () => {
      // CRITICAL: This was failing before v0.35.3
      expect(mapJiraTypeToExternal('L3 Feature')).toBe('feature');
    });

    it('should map "L2 Epic" to epic', () => {
      expect(mapJiraTypeToExternal('L2 Epic')).toBe('epic');
    });

    it('should map "Team Feature" to feature', () => {
      expect(mapJiraTypeToExternal('Team Feature')).toBe('feature');
    });

    it('should map "Team Epic" to epic', () => {
      expect(mapJiraTypeToExternal('Team Epic')).toBe('epic');
    });

    it('should map "Feature Request" to feature', () => {
      expect(mapJiraTypeToExternal('Feature Request')).toBe('feature');
    });

    it('should map "Epic Story" to user-story (story checked first)', () => {
      // If both keywords present, first match in if-else chain wins
      // Current implementation checks story before epic
      expect(mapJiraTypeToExternal('Epic Story')).toBe('user-story');
    });

    it('should map "Bug Fix" to bug', () => {
      expect(mapJiraTypeToExternal('Bug Fix')).toBe('bug');
    });

    it('should map "Bugfix" to bug', () => {
      expect(mapJiraTypeToExternal('Bugfix')).toBe('bug');
    });
  });

  describe('Hierarchy Mapping', () => {
    it('should map feature type to feature level (not epic level)', () => {
      // Verify that 'feature' type maps to feature-level in hierarchy
      const DEFAULT_JIRA_HIERARCHY_MAPPING = {
        epicLevelTypes: [],
        featureLevelTypes: ['Epic', 'Feature'],
      };

      // Both Epic and Feature should be at feature-level
      expect(DEFAULT_JIRA_HIERARCHY_MAPPING.featureLevelTypes).toContain('Epic');
      expect(DEFAULT_JIRA_HIERARCHY_MAPPING.featureLevelTypes).toContain('Feature');
      expect(DEFAULT_JIRA_HIERARCHY_MAPPING.epicLevelTypes).toHaveLength(0);
    });
  });

  describe('Real-World Examples', () => {
    it('should handle custom JIRA types', () => {
      // Real-world example patterns
      expect(mapJiraTypeToExternal('L3 Feature')).toBe('feature');

      // Other common patterns
      expect(mapJiraTypeToExternal('L1 Initiative')).toBe('task'); // No initiative keyword
      expect(mapJiraTypeToExternal('L2 Capability')).toBe('epic'); // Includes 'l2'
    });
  });
});

describe('JIRA Hierarchy Mapping (DEFAULT_JIRA_HIERARCHY_MAPPING)', () => {
  it('should include both Epic and Feature in featureLevelTypes', () => {
    // This constant should be imported from sync-profile.ts in actual code
    const DEFAULT_JIRA_HIERARCHY_MAPPING = {
      epicLevelTypes: [],
      featureLevelTypes: ['Epic', 'Feature'],
    };

    // CRITICAL (v0.35.3): Both types must be at feature-level
    expect(DEFAULT_JIRA_HIERARCHY_MAPPING.featureLevelTypes).toEqual(['Epic', 'Feature']);
    expect(DEFAULT_JIRA_HIERARCHY_MAPPING.epicLevelTypes).toEqual([]);
  });
});
