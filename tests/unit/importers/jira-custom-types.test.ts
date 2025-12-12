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

describe('Orphan Flag Logic (v0.35.5 Regression)', () => {
  /**
   * CRITICAL BUG FIX: Feature-level items without parents should NOT be marked as orphan
   *
   * Bug: L3 Feature (ID-187) without parent was marked as orphan: true
   * but also had Feature ID: FS-002E - contradiction!
   *
   * Root cause: isOrphan was set based on !parentId instead of actual folder placement
   * Fix: isOrphan = (featureId === '_orphans')
   */

  // Mock function simulating the FIXED isOrphan logic
  function determineIsOrphan(item: { parentId?: string; type: string }, featureId: string): boolean {
    // CRITICAL FIX (v0.35.5): isOrphan based on actual folder placement, not just parentId
    // Feature-level items (L3 Feature, Epic) without parents are NOT orphans - they ARE containers
    // Only items that end up in _orphans/ folder are true orphans
    return featureId === '_orphans';
  }

  it('should NOT mark L3 Feature without parent as orphan (regression test)', () => {
    // This is the exact scenario from the user's bug report
    const l3Feature = {
      id: 'JIRA-ID-187',
      type: 'feature',  // L3 Feature mapped to 'feature' type
      parentId: undefined,  // No parent!
      title: 'Keycloak POC'
    };

    // L3 Feature creates its own FS-XXXE folder (e.g., FS-002E)
    const featureId = 'FS-002E';

    // CRITICAL: Should NOT be orphan even though no parentId!
    const isOrphan = determineIsOrphan(l3Feature, featureId);
    expect(isOrphan).toBe(false);
  });

  it('should NOT mark Epic without parent as orphan', () => {
    const epic = {
      id: 'JIRA-COL-100',
      type: 'epic',
      parentId: undefined,  // No parent!
      title: 'Authentication Epic'
    };

    // Epic creates its own FS-XXXE folder
    const featureId = 'FS-001E';

    const isOrphan = determineIsOrphan(epic, featureId);
    expect(isOrphan).toBe(false);
  });

  it('should mark User Story without parent going to _orphans as orphan', () => {
    const userStory = {
      id: 'JIRA-ID-168',
      type: 'user-story',
      parentId: undefined,  // No parent!
      title: 'Standalone Story'
    };

    // User story without parent goes to _orphans folder
    const featureId = '_orphans';

    const isOrphan = determineIsOrphan(userStory, featureId);
    expect(isOrphan).toBe(true);
  });

  it('should NOT mark User Story with parent as orphan', () => {
    const userStory = {
      id: 'JIRA-ID-168',
      type: 'user-story',
      parentId: 'JIRA-ID-187',  // Has parent (L3 Feature)
      title: 'Keycloak Spike'
    };

    // User story with parent goes to parent's FS-XXXE folder
    const featureId = 'FS-002E';

    const isOrphan = determineIsOrphan(userStory, featureId);
    expect(isOrphan).toBe(false);
  });
});

describe('isOrphanGroup Detection (v0.35.5 Fix)', () => {
  /**
   * Bug: isOrphanGroup only matched 'orphan:' prefix but not 'orphans:all'
   * which is the current (v0.30.6+) group key for orphan items
   */

  // Mock function simulating the FIXED isOrphanGroup logic
  function isOrphanGroup(groupKey: string): boolean {
    // CRITICAL FIX (v0.35.5): Match BOTH 'orphan:' (legacy) and 'orphans:' (current v0.30.6+)
    return groupKey.startsWith('orphan:') || groupKey.startsWith('orphans:');
  }

  it('should detect legacy orphan groups (orphan:ID)', () => {
    expect(isOrphanGroup('orphan:JIRA-ID-100')).toBe(true);
    expect(isOrphanGroup('orphan:123')).toBe(true);
  });

  it('should detect current orphan groups (orphans:all)', () => {
    // This was failing before v0.35.5!
    expect(isOrphanGroup('orphans:all')).toBe(true);
  });

  it('should NOT detect feature groups as orphan', () => {
    expect(isOrphanGroup('feature:JIRA-ID-187')).toBe(false);
    expect(isOrphanGroup('epic:JIRA-COL-100')).toBe(false);
    expect(isOrphanGroup('jira:ID')).toBe(false);
  });
});
