/**
 * Types for Enhanced Content Sync
 */

export interface AcceptanceCriterion {
  id: string;           // AC-US1-01
  description: string;
  priority?: string;    // Priority string (P1, P2, P3, etc.) - optional for backward compatibility
  completed?: boolean;  // Completion status (for backward compatibility with SpecAcceptanceCriterion)
  testable?: boolean;   // Testability flag (for backward compatibility with SpecAcceptanceCriterion)
}

export interface UserStory {
  id: string;           // US-001
  title: string;
  description?: string;  // "As a... I want... So that..." (optional for backward compatibility)
  acceptanceCriteria?: AcceptanceCriterion[];  // Optional for backward compatibility
}

export interface TaskLink {
  id: string;           // T-001
  title: string;
  githubIssue?: number;
  jiraIssue?: string;
  adoWorkItem?: number;
  userStoryIds: string[]; // ['US-001', 'US-002']
  completed?: boolean;     // Task completion status
}

export interface SourceLinks {
  spec: string;
  plan: string;
  tasks: string;
}

export interface SpecContent {
  id: string;           // SPEC-001
  title: string;
  summary: string;      // Executive summary
  userStories: UserStory[];
  tasks?: TaskLink[];   // Optional for backward compatibility
  architectureDocs?: string[];  // Optional
  sourceLinks?: SourceLinks;    // Optional
}

export interface EnhancedContent {
  title: string;
  body: string;
}

/**
 * Enhanced spec content for external tool sync
 * Extends SpecContent with additional metadata
 */
export interface EnhancedSpecContent extends SpecContent {
  taskMapping?: any;  // Task mapping from SpecIncrementMapper
  [key: string]: any; // Allow additional properties for flexibility
}
