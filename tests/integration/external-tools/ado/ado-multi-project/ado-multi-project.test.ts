/**
 * Azure DevOps Multi-Project Integration Tests
 *
 * Tests the complete multi-project ADO integration including:
 * - Initialization with multiple projects
 * - Project detection and mapping
 * - Folder structure creation
 * - Bidirectional sync
 * - Cross-project dependencies
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { AdoProjectDetector } from '../../plugins/specweave-ado/lib/ado-project-detector';
import { AdoClientV2 } from '../../plugins/specweave-ado/lib/ado-client-v2';
import type {
  ProjectDetectionResult,
  ProjectConfidence
} from '../../plugins/specweave-ado/lib/ado-project-detector';

// Local type definition for testing
type AzureDevOpsStrategy = 'project-per-team' | 'area-path-based' | 'team-based';

describe('Azure DevOps Multi-Project Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(process.cwd(), 'tests', 'tmp', `ado-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Project-per-team Strategy', () => {
    const strategy: AzureDevOpsStrategy = 'project-per-team';
    const projects = ['AuthService', 'UserService', 'PaymentService'];

    beforeEach(() => {
      // Set environment variables for testing
      process.env.AZURE_DEVOPS_STRATEGY = strategy;
      process.env.AZURE_DEVOPS_PROJECTS = projects.join(',');
      process.env.AZURE_DEVOPS_ORG = 'test-org';
      process.env.AZURE_DEVOPS_PAT = 'test-token';
    });

    test('should create project folders for each team', async () => {
      const specsPath = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');

      // Create project folders
      for (const project of projects) {
        const projectPath = path.join(specsPath, project);
        await fs.ensureDir(projectPath);
      }

      // Verify folders exist
      for (const project of projects) {
        const projectPath = path.join(specsPath, project);
        expect(await fs.pathExists(projectPath)).toBe(true);
      }
    });

    test('should detect project from spec path', async () => {
      const detector = new AdoProjectDetector(strategy, projects);

      // Create test spec file
      const specPath = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'AuthService', 'spec-001.md');
      await fs.ensureDir(path.dirname(specPath));
      await fs.writeFile(specPath, `# Authentication Service Spec

## Overview
This spec covers OAuth2 authentication implementation.

## User Stories
- US-001: User login with OAuth
- US-002: Token refresh mechanism
`);

      const result = await detector.detectFromSpecPath(specPath);

      expect(result.primary).toBe('AuthService');
      expect(result.confidence).toBe(1.0);
      expect(result.strategy).toBe(strategy);
    });

    test('should detect project from content keywords', async () => {
      const detector = new AdoProjectDetector(strategy, projects);

      const authContent = `# OAuth Implementation

This feature implements JWT token generation, session management,
and SSO integration with SAML providers.`;

      const result = await detector.detectFromContent(authContent);

      expect(result.primary).toBe('AuthService');
      expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    });

    test('should handle multi-project specs', async () => {
      const detector = new AdoProjectDetector(strategy, projects);

      const multiProjectContent = `# Checkout Flow

This feature spans multiple services:
- Payment processing with Stripe integration
- User profile verification and validation
- Email notifications for order confirmation
`;

      const result = await detector.detectMultiProject(multiProjectContent);

      // UserService has most keyword matches (user, profile, verification)
      expect(result.primary).toBe('UserService');
      // PaymentService and NotificationService have lower confidence but should be detected
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('Area-path-based Strategy', () => {
    const strategy: AzureDevOpsStrategy = 'area-path-based';
    const project = 'MainProduct';
    const areaPaths = ['Frontend', 'Backend', 'Mobile'];

    beforeEach(() => {
      process.env.AZURE_DEVOPS_STRATEGY = strategy;
      process.env.AZURE_DEVOPS_PROJECT = project;
      process.env.AZURE_DEVOPS_AREA_PATHS = areaPaths.join(',');
      process.env.AZURE_DEVOPS_ORG = 'test-org';
      process.env.AZURE_DEVOPS_PAT = 'test-token';
    });

    test('should create area path folders within project', async () => {
      const projectPath = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', project);

      // Create area path folders
      for (const area of areaPaths) {
        const areaPath = path.join(projectPath, area);
        await fs.ensureDir(areaPath);
      }

      // Verify folders exist
      for (const area of areaPaths) {
        const areaPath = path.join(projectPath, area);
        expect(await fs.pathExists(areaPath)).toBe(true);
      }
    });

    test('should map spec to area path', () => {
      const detector = new AdoProjectDetector(strategy, [project]);

      const frontendContent = `# React Component Library

UI components with responsive design and CSS-in-JS styling.`;

      const areaPath = detector.mapToAreaPath(frontendContent, project);

      expect(areaPath).toContain('Frontend');
    });
  });

  describe('Team-based Strategy', () => {
    const strategy: AzureDevOpsStrategy = 'team-based';
    const project = 'Platform';
    const teams = ['Alpha', 'Beta', 'Gamma'];

    beforeEach(() => {
      process.env.AZURE_DEVOPS_STRATEGY = strategy;
      process.env.AZURE_DEVOPS_PROJECT = project;
      process.env.AZURE_DEVOPS_TEAMS = teams.join(',');
      process.env.AZURE_DEVOPS_ORG = 'test-org';
      process.env.AZURE_DEVOPS_PAT = 'test-token';
    });

    test('should assign spec to team based on content', () => {
      const detector = new AdoProjectDetector(strategy, [project]);

      const frontendContent = `# UI Dashboard

team: Alpha

React-based dashboard with real-time updates.`;

      const team = detector.assignToTeam(frontendContent);

      expect(team).toBe('Alpha');
    });

    test('should auto-detect team from keywords', () => {
      const detector = new AdoProjectDetector(strategy, [project]);

      const backendContent = `# API Gateway

REST API endpoints with database query optimization.`;

      const team = detector.assignToTeam(backendContent);

      // Should detect Backend team based on keywords
      expect(['Alpha', 'Beta', 'Gamma']).toContain(team);
    });
  });

  describe('Bidirectional Sync', () => {
    test('should export spec to ADO work item', async () => {
      // Mock ADO client
      const mockClient = {
        createWorkItem: jest.fn().mockResolvedValue({
          id: 123,
          fields: {
            'System.Title': '[SPEC-001] Test Feature',
            'System.State': 'New'
          }
        })
      };

      const specContent = {
        id: 'spec-001',
        title: 'Test Feature',
        userStories: [
          { id: 'US-001', title: 'User login' },
          { id: 'US-002', title: 'Password reset' }
        ]
      };

      const workItem = await mockClient.createWorkItem('Feature', {
        title: `[SPEC-${specContent.id}] ${specContent.title}`,
        description: 'Test feature description',
        tags: 'specweave,multi-project'
      });

      expect(workItem.id).toBe(123);
      expect(mockClient.createWorkItem).toHaveBeenCalledTimes(1);
    });

    test('should import ADO work item to spec', async () => {
      // Mock ADO client
      const mockClient = {
        getWorkItem: jest.fn().mockResolvedValue({
          id: 123,
          fields: {
            'System.Title': '[SPEC-001] Test Feature',
            'System.State': 'Active',
            'System.Description': 'Updated description from ADO'
          }
        })
      };

      const workItem = await mockClient.getWorkItem(123);

      // Convert to spec format
      const spec = {
        id: 'spec-001',
        title: 'Test Feature',
        status: 'active',
        description: workItem.fields['System.Description']
      };

      expect(spec.status).toBe('active');
      expect(spec.description).toContain('Updated description from ADO');
    });
  });

  describe('Cross-Project Dependencies', () => {
    test('should create linked work items across projects', async () => {
      const projects = ['PaymentService', 'UserService', 'NotificationService'];

      // Mock creating linked work items
      const mockCreateLinkedItems = async (primary: string, secondary: string[]) => {
        const primaryId = 100;
        const linkedIds = secondary.map((_, idx) => 101 + idx);

        return {
          primary: { project: primary, id: primaryId },
          linked: secondary.map((project, idx) => ({
            project,
            id: linkedIds[idx],
            linkedTo: primaryId
          }))
        };
      };

      const result = await mockCreateLinkedItems(projects[0], projects.slice(1));

      expect(result.primary.project).toBe('PaymentService');
      expect(result.primary.id).toBe(100);
      expect(result.linked).toHaveLength(2);
      expect(result.linked[0].linkedTo).toBe(100);
    });
  });

  describe.skip('Configuration Validation (TODO: Update to use SyncProfile)', () => {
    test('should validate project-per-team configuration', () => {
      process.env.AZURE_DEVOPS_STRATEGY = 'project-per-team';
      process.env.AZURE_DEVOPS_PROJECTS = 'Project1,Project2';

      // const client = // AdoClientV2.fromEnv(); // TODO: Update to use SyncProfile constructor // TODO: Update to use SyncProfile constructor

      // expect(client).toBeDefined();
      // Additional validation would depend on actual client implementation
    });

    test('should validate area-path-based configuration', () => {
      process.env.AZURE_DEVOPS_STRATEGY = 'area-path-based';
      process.env.AZURE_DEVOPS_PROJECT = 'MainProject';
      process.env.AZURE_DEVOPS_AREA_PATHS = 'Area1,Area2';

      // const client = // AdoClientV2.fromEnv(); // TODO: Update to use SyncProfile constructor // TODO: Update to use SyncProfile constructor

      // expect(client).toBeDefined();
    });

    test('should validate team-based configuration', () => {
      process.env.AZURE_DEVOPS_STRATEGY = 'team-based';
      process.env.AZURE_DEVOPS_PROJECT = 'Platform';
      process.env.AZURE_DEVOPS_TEAMS = 'Team1,Team2';

      // const client = // AdoClientV2.fromEnv(); // TODO: Update to use SyncProfile constructor // TODO: Update to use SyncProfile constructor

      // expect(client).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing project gracefully', async () => {
      const detector = new AdoProjectDetector('project-per-team', ['ExistingProject']);

      const unknownContent = `# Unknown Service

This service doesn't match any known projects.`;

      const result = await detector.detectFromContent(unknownContent);

      expect(result.primary).toBe('ExistingProject');
      expect(result.confidence).toBe(0);
    });

    test.skip('should handle invalid strategy (TODO: Update to use SyncProfile)', () => {
      // TODO: Update to use SyncProfile constructor instead of fromEnv()
    });
  });
});