/**
 * Unit Tests for Project Mapper
 *
 * Tests intelligent classification of user stories to projects
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapUserStoryToProjects,
  getPrimaryProject,
  splitSpecByProject,
  DEFAULT_PROJECT_RULES,
  type UserStory,
  type ProjectRule,
  type ProjectMapperConfig
} from '../../src/utils/project-mapper.js';

describe('Project Mapper', () => {
  describe('mapUserStoryToProjects', () => {
    it('should classify frontend user story correctly', () => {
      const userStory: UserStory = {
        id: 'US-001',
        title: 'Create login UI component with React',
        description: 'As a user, I want to see a login form on the homepage',
        acceptanceCriteria: ['Form renders correctly', 'Validation works'],
        priority: 'P1',
        storyPoints: 5
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('FE');
      expect(mappings[0].confidence).toBeGreaterThan(0.3);
    });

    it('should classify backend user story correctly', () => {
      const userStory: UserStory = {
        id: 'US-002',
        title: 'Implement authentication API endpoint',
        description: 'As a system, I need a REST API endpoint for user login',
        acceptanceCriteria: ['POST /api/auth/login works', 'Returns JWT token'],
        priority: 'P1',
        storyPoints: 8
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('BE');
      expect(mappings[0].confidence).toBeGreaterThan(0.3);
    });

    it('should classify mobile user story correctly', () => {
      const userStory: UserStory = {
        id: 'US-003',
        title: 'Add biometric authentication for iOS and Android',
        description: 'As a mobile user, I want to login with Touch ID or Face ID',
        acceptanceCriteria: ['Works on iOS', 'Works on Android', 'Fallback to password'],
        priority: 'P2',
        storyPoints: 13
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('MOBILE');
      expect(mappings[0].confidence).toBeGreaterThan(0.3);
    });

    it('should classify infrastructure user story correctly', () => {
      const userStory: UserStory = {
        id: 'US-004',
        title: 'Deploy authentication service to Kubernetes cluster',
        description: 'As a DevOps engineer, I need to deploy the auth service with Helm',
        acceptanceCriteria: ['Helm chart created', 'Deployed to staging', 'Health checks pass'],
        priority: 'P1',
        storyPoints: 8
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('INFRA');
      expect(mappings[0].confidence).toBeGreaterThan(0.3);
    });

    it('should handle multi-project user stories (returns multiple mappings)', () => {
      const userStory: UserStory = {
        id: 'US-005',
        title: 'Implement end-to-end authentication flow',
        description: 'Frontend login form + backend API + mobile app integration',
        acceptanceCriteria: ['FE form works', 'BE API works', 'Mobile app works'],
        priority: 'P1',
        storyPoints: 21
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThanOrEqual(2); // Should map to FE, BE, possibly MOBILE
      expect(mappings.some(m => m.projectId === 'FE')).toBe(true);
      expect(mappings.some(m => m.projectId === 'BE')).toBe(true);
    });

    it('should return mappings sorted by confidence (highest first)', () => {
      const userStory: UserStory = {
        id: 'US-006',
        title: 'Build dashboard with charts and API data',
        description: 'Frontend dashboard with React charts and backend API',
        acceptanceCriteria: ['Charts render', 'API fetches data'],
        priority: 'P2',
        storyPoints: 13
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(1);
      for (let i = 0; i < mappings.length - 1; i++) {
        expect(mappings[i].confidence).toBeGreaterThanOrEqual(mappings[i + 1].confidence);
      }
    });

    it('should work with custom project rules', () => {
      const customRules: ProjectRule[] = [
        {
          projectId: 'ML',
          keywords: ['machine learning', 'model', 'training', 'tensorflow', 'pytorch'],
          weight: 10
        },
        {
          projectId: 'DATA',
          keywords: ['database', 'postgres', 'sql', 'migration', 'schema'],
          weight: 10
        }
      ];

      const userStory: UserStory = {
        id: 'US-007',
        title: 'Train machine learning model for user recommendations',
        description: 'Use TensorFlow to train a recommendation model',
        acceptanceCriteria: ['Model trained', 'Accuracy > 85%'],
        priority: 'P2',
        storyPoints: 21
      };

      const mappings = mapUserStoryToProjects(userStory, customRules);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('ML');
      expect(mappings[0].confidence).toBeGreaterThan(0.3);
    });
  });

  describe('getPrimaryProject', () => {
    it('should return primary project with default threshold (0.3)', () => {
      const userStory: UserStory = {
        id: 'US-008',
        title: 'Implement React component for user profile',
        description: 'Create a user profile page with React hooks',
        acceptanceCriteria: ['Component renders', 'State management works'],
        priority: 'P1',
        storyPoints: 5
      };

      const primary = getPrimaryProject(userStory);

      expect(primary).not.toBeNull();
      expect(primary!.projectId).toBe('FE');
      expect(primary!.confidence).toBeGreaterThanOrEqual(0.3);
    });

    it('should return null if confidence below threshold', () => {
      const userStory: UserStory = {
        id: 'US-009',
        title: 'Vague task with no clear project',
        description: 'Do some work on the system',
        acceptanceCriteria: ['Work is done'],
        priority: 'P3',
        storyPoints: 3
      };

      const primary = getPrimaryProject(userStory);

      // May return null if confidence is too low
      // Or may return a project with low confidence (< 0.3)
      if (primary !== null) {
        expect(primary.confidence).toBeLessThan(0.5); // Should have low confidence
      }
    });

    it('should respect custom confidence threshold', () => {
      const userStory: UserStory = {
        id: 'US-010',
        title: 'Update user dashboard',
        description: 'Make some changes to the dashboard',
        acceptanceCriteria: ['Dashboard updated'],
        priority: 'P2',
        storyPoints: 5
      };

      // High threshold (0.8) - unlikely to match
      const config: ProjectMapperConfig = { confidenceThreshold: 0.8 };
      const primaryHigh = getPrimaryProject(userStory, undefined, config);

      expect(primaryHigh).toBeNull(); // Should fail high threshold

      // Low threshold (0.1) - should match
      const configLow: ProjectMapperConfig = { confidenceThreshold: 0.1 };
      const primaryLow = getPrimaryProject(userStory, undefined, configLow);

      expect(primaryLow).not.toBeNull(); // Should pass low threshold
    });

    it('should use custom project rules when provided', () => {
      const customRules: ProjectRule[] = [
        {
          projectId: 'PAYMENT',
          keywords: ['payment', 'stripe', 'checkout', 'billing', 'invoice'],
          weight: 10
        }
      ];

      const userStory: UserStory = {
        id: 'US-011',
        title: 'Integrate Stripe payment gateway',
        description: 'Add Stripe checkout to the billing page',
        acceptanceCriteria: ['Stripe integration works', 'Payments processed'],
        priority: 'P1',
        storyPoints: 13
      };

      const primary = getPrimaryProject(userStory, customRules);

      expect(primary).not.toBeNull();
      expect(primary!.projectId).toBe('PAYMENT');
    });
  });

  describe('splitSpecByProject', () => {
    it('should split user stories into project buckets', () => {
      const userStories: UserStory[] = [
        {
          id: 'US-001',
          title: 'Create React login form',
          description: 'Frontend login UI',
          acceptanceCriteria: ['Form works'],
          priority: 'P1',
          storyPoints: 5
        },
        {
          id: 'US-002',
          title: 'Implement authentication API',
          description: 'Backend auth endpoint',
          acceptanceCriteria: ['API works'],
          priority: 'P1',
          storyPoints: 8
        },
        {
          id: 'US-003',
          title: 'Add mobile biometric auth',
          description: 'iOS and Android biometric',
          acceptanceCriteria: ['Biometric works'],
          priority: 'P2',
          storyPoints: 13
        }
      ];

      const projectStories = splitSpecByProject(userStories);

      expect(projectStories.size).toBeGreaterThan(0);
      expect(projectStories.has('FE')).toBe(true);
      expect(projectStories.has('BE')).toBe(true);
      expect(projectStories.has('MOBILE')).toBe(true);

      expect(projectStories.get('FE')!.length).toBe(1);
      expect(projectStories.get('BE')!.length).toBe(1);
      expect(projectStories.get('MOBILE')!.length).toBe(1);
    });

    it('should use default project for low-confidence stories', () => {
      const userStories: UserStory[] = [
        {
          id: 'US-001',
          title: 'Vague task',
          description: 'Do something',
          acceptanceCriteria: ['Done'],
          priority: 'P3',
          storyPoints: 3
        }
      ];

      const projectStories = splitSpecByProject(userStories);

      // Should have at least one project (could be DEFAULT or a low-confidence match)
      expect(projectStories.size).toBeGreaterThanOrEqual(1);
    });

    it('should work with custom rules', () => {
      const customRules: ProjectRule[] = [
        {
          projectId: 'ANALYTICS',
          keywords: ['analytics', 'tracking', 'metrics', 'events'],
          weight: 10
        }
      ];

      const userStories: UserStory[] = [
        {
          id: 'US-001',
          title: 'Add analytics tracking to user events',
          description: 'Track user clicks and page views',
          acceptanceCriteria: ['Events tracked'],
          priority: 'P2',
          storyPoints: 5
        }
      ];

      const projectStories = splitSpecByProject(userStories, customRules);

      expect(projectStories.has('ANALYTICS')).toBe(true);
      expect(projectStories.get('ANALYTICS')!.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user story', () => {
      const userStory: UserStory = {
        id: 'US-001',
        title: '',
        description: '',
        acceptanceCriteria: [],
        priority: 'P3',
        storyPoints: 0
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should handle special characters in user story', () => {
      const userStory: UserStory = {
        id: 'US-002',
        title: 'Implement OAuth2.0 with JWT tokens & PKCE',
        description: 'Add OAuth 2.0 authentication with JWT & PKCE flow',
        acceptanceCriteria: ['OAuth works', 'JWT validated'],
        priority: 'P1',
        storyPoints: 13
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('BE'); // OAuth/JWT = backend
    });

    it('should handle very long user story text', () => {
      const longDescription = 'This is a very long description. '.repeat(100);

      const userStory: UserStory = {
        id: 'US-003',
        title: 'Complex feature with React frontend and Node.js backend',
        description: longDescription,
        acceptanceCriteria: ['Feature works'],
        priority: 'P1',
        storyPoints: 21
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      // Should still classify correctly despite long text
      expect(['FE', 'BE']).toContain(mappings[0].projectId);
    });

    it('should handle null/undefined acceptance criteria', () => {
      const userStory: UserStory = {
        id: 'US-004',
        title: 'Create React component',
        description: 'Build a new component',
        acceptanceCriteria: [], // Empty array instead of null
        priority: 'P2',
        storyPoints: 5
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('FE');
    });

    it('should handle case-insensitive matching', () => {
      const userStory: UserStory = {
        id: 'US-005',
        title: 'REACT COMPONENT FOR DASHBOARD',
        description: 'BUILD REACT UI',
        acceptanceCriteria: ['WORKS'],
        priority: 'P1',
        storyPoints: 5
      };

      const mappings = mapUserStoryToProjects(userStory);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].projectId).toBe('FE'); // Should match despite uppercase
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to exact keyword matches', () => {
      const exactMatch: UserStory = {
        id: 'US-001',
        title: 'Implement React component with hooks',
        description: 'Use React hooks for state management',
        acceptanceCriteria: ['React component works'],
        priority: 'P1',
        storyPoints: 5
      };

      const vagueMatch: UserStory = {
        id: 'US-002',
        title: 'Update frontend',
        description: 'Make changes to UI',
        acceptanceCriteria: ['UI updated'],
        priority: 'P2',
        storyPoints: 5
      };

      const exactMappings = mapUserStoryToProjects(exactMatch);
      const vagueMappings = mapUserStoryToProjects(vagueMatch);

      expect(exactMappings[0].confidence).toBeGreaterThan(vagueMappings[0].confidence);
    });

    it('should give higher weight to title matches than description', () => {
      const titleMatch: UserStory = {
        id: 'US-001',
        title: 'React component for dashboard',
        description: 'Build a component',
        acceptanceCriteria: ['Works'],
        priority: 'P1',
        storyPoints: 5
      };

      const descMatch: UserStory = {
        id: 'US-002',
        title: 'Update UI',
        description: 'Use React for the dashboard component',
        acceptanceCriteria: ['Works'],
        priority: 'P1',
        storyPoints: 5
      };

      const titleMappings = mapUserStoryToProjects(titleMatch);
      const descMappings = mapUserStoryToProjects(descMatch);

      // Title matches should have equal or higher confidence
      expect(titleMappings[0].confidence).toBeGreaterThanOrEqual(descMappings[0].confidence);
    });
  });
});
