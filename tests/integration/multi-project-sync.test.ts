/**
 * Integration Tests for Multi-Project Sync
 *
 * Tests complete workflow for GitHub, JIRA, and ADO multi-project sync
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { parseSpecFile, splitSpecIntoProjects } from '../../src/utils/spec-splitter.js';
import { mapUserStoryToProjects, getPrimaryProject } from '../../src/utils/project-mapper.js';

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, '../fixtures/multi-project-sync');
const TEMP_DIR = path.join(__dirname, '../temp/multi-project-sync');

describe('Multi-Project Sync Integration', () => {
  beforeAll(async () => {
    await fs.ensureDir(FIXTURES_DIR);
    await fs.ensureDir(TEMP_DIR);

    // Create test spec file
    const testSpec = `---
specId: SPEC-FITNESS-001
title: Fitness Tracker Multi-Platform Feature
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Product Team
priority: P1
estimatedEffort: 120 hours
targetRelease: v2.0.0
---

# Fitness Tracker Multi-Platform Feature

## Executive Summary

Complete fitness tracking system across web, mobile, and backend infrastructure.

## Problem Statement

Users need a seamless fitness tracking experience across all platforms.

## User Stories

### US-001: Create workout dashboard (Web)

**Description**: As a web user, I want to see my workout history in a React dashboard with charts

**Acceptance Criteria**:
- Dashboard renders workout data
- Charts show progress over time
- Responsive design for different screen sizes

**Priority**: P1
**Story Points**: 8
**Technical Context**: React, TypeScript, Chart.js

### US-002: Implement workout tracking API (Backend)

**Description**: As a system, I need REST API endpoints to track workouts

**Acceptance Criteria**:
- POST /api/workouts creates workout
- GET /api/workouts/:id retrieves workout
- PUT /api/workouts/:id updates workout
- Proper error handling and validation

**Priority**: P1
**Story Points**: 13
**Technical Context**: Node.js, Express, PostgreSQL

### US-003: Add workout tracking to mobile app (Mobile)

**Description**: As a mobile user, I want to log workouts from my iPhone or Android device

**Acceptance Criteria**:
- Works on iOS and Android
- Offline mode with sync when online
- Push notifications for workout reminders

**Priority**: P1
**Story Points**: 21
**Technical Context**: React Native, AsyncStorage

### US-004: Deploy workout service to Kubernetes (Infrastructure)

**Description**: As a DevOps engineer, I need to deploy the workout service with high availability

**Acceptance Criteria**:
- Kubernetes deployment with 3 replicas
- Health checks configured
- Auto-scaling based on load
- Monitoring with Prometheus

**Priority**: P2
**Story Points**: 13
**Technical Context**: Kubernetes, Helm, Prometheus, Grafana

### US-005: Integrate with wearable devices (Multi-platform)

**Description**: As a user, I want to sync data from my Apple Watch or Fitbit

**Acceptance Criteria**:
- Apple Watch integration (iOS)
- Fitbit API integration (Backend)
- Real-time sync to web dashboard (Frontend)

**Priority**: P2
**Story Points**: 21
**Technical Context**: HealthKit (iOS), Fitbit API, WebSockets

## Functional Requirements

- Cross-platform data synchronization
- Real-time updates
- Offline mode for mobile

## Non-Functional Requirements

- API response time < 200ms
- 99.9% uptime
- Support 10,000 concurrent users

## Success Metrics

- 80% user engagement across all platforms
- <1% error rate
- 95% positive user feedback

## Technical Architecture

- Microservices architecture
- PostgreSQL for persistence
- Redis for caching
- WebSockets for real-time updates

## Test Strategy

- Unit tests: 85% coverage
- Integration tests: 80% coverage
- E2E tests for critical paths

## Risk Analysis

- API rate limiting from third-party services
- Cross-platform consistency challenges

## Future Roadmap

- AI-powered workout recommendations
- Social features (friend challenges)
- Integration with more wearables
`;

    await fs.writeFile(path.join(FIXTURES_DIR, 'fitness-tracker-spec.md'), testSpec, 'utf-8');
  });

  afterAll(async () => {
    await fs.remove(TEMP_DIR);
  });

  describe('End-to-End Workflow', () => {
    it('should parse multi-project spec correctly', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      expect(parsed.metadata.specId).toBe('SPEC-FITNESS-001');
      expect(parsed.metadata.title).toContain('Fitness Tracker');
      expect(parsed.userStories.length).toBe(5);
      expect(parsed.executiveSummary).toContain('fitness tracking system');
    });

    it('should classify user stories to correct projects', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      const classifications = parsed.userStories.map(story => ({
        id: story.id,
        primary: getPrimaryProject(story)
      }));

      // US-001: Web dashboard → FE
      expect(classifications[0].primary?.projectId).toBe('FE');

      // US-002: API endpoints → BE
      expect(classifications[1].primary?.projectId).toBe('BE');

      // US-003: Mobile app → MOBILE
      expect(classifications[2].primary?.projectId).toBe('MOBILE');

      // US-004: Kubernetes deployment → INFRA
      expect(classifications[3].primary?.projectId).toBe('INFRA');

      // US-005: Multi-platform (should classify, confidence may vary)
      expect(classifications[4].primary).not.toBeNull();
    });

    it('should split spec into project-specific files', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const outputMap = await splitSpecIntoProjects(specPath, TEMP_DIR);

      // Should create files for FE, BE, MOBILE, INFRA
      expect(outputMap.size).toBeGreaterThanOrEqual(4);
      expect(outputMap.has('FE')).toBe(true);
      expect(outputMap.has('BE')).toBe(true);
      expect(outputMap.has('MOBILE')).toBe(true);
      expect(outputMap.has('INFRA')).toBe(true);

      // Verify each project file
      for (const [projectId, filePath] of outputMap.entries()) {
        const exists = await fs.pathExists(filePath);
        expect(exists).toBe(true);

        const content = await fs.readFile(filePath, 'utf-8');

        // Should contain project-specific user stories
        expect(content).toContain(projectId);

        // Should preserve metadata
        expect(content).toContain('SPEC-FITNESS-001');
        expect(content).toContain('Fitness Tracker');

        // Should only contain relevant stories
        const parsed = await parseSpecFile(filePath);
        expect(parsed.userStories.length).toBeGreaterThan(0);

        // Verify stories match project
        for (const story of parsed.userStories) {
          const primary = getPrimaryProject(story);
          // Primary project should match or be multi-project story
          if (primary) {
            const isRelevant = primary.projectId === projectId || primary.confidence < 0.7;
            expect(isRelevant).toBe(true);
          }
        }
      }
    });

    it('should handle confidence threshold variations', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Test different threshold levels
      const thresholds = [0.2, 0.3, 0.5, 0.8];

      for (const threshold of thresholds) {
        const config = { confidenceThreshold: threshold };

        const classifiedCount = parsed.userStories.filter(story => {
          const primary = getPrimaryProject(story, undefined, config);
          return primary !== null;
        }).length;

        // Higher threshold = fewer classifications
        // This should hold true generally
        console.log(`Threshold ${threshold}: ${classifiedCount}/${parsed.userStories.length} classified`);

        if (threshold < 0.5) {
          // Low threshold: most stories should classify
          expect(classifiedCount).toBeGreaterThan(parsed.userStories.length * 0.6);
        }
      }
    });
  });

  describe('GitHub Multi-Project Sync Simulation', () => {
    it('should prepare data for GitHub multiple repos pattern', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Simulate GitHub config
      const githubConfig = {
        owner: 'fitness-corp',
        repos: ['frontend-web', 'backend-api', 'mobile-app', 'infrastructure']
      };

      // Classify stories
      const projectStories = new Map<string, typeof parsed.userStories>();

      for (const story of parsed.userStories) {
        const primary = getPrimaryProject(story);

        if (primary) {
          const existing = projectStories.get(primary.projectId) || [];
          existing.push(story);
          projectStories.set(primary.projectId, existing);
        }
      }

      // Should have stories for multiple projects
      expect(projectStories.size).toBeGreaterThanOrEqual(3);

      // Map to GitHub repos
      const repoMapping = {
        FE: 'frontend-web',
        BE: 'backend-api',
        MOBILE: 'mobile-app',
        INFRA: 'infrastructure'
      };

      for (const [projectId, stories] of projectStories.entries()) {
        const repo = repoMapping[projectId as keyof typeof repoMapping];

        if (repo) {
          expect(githubConfig.repos).toContain(repo);
          expect(stories.length).toBeGreaterThan(0);

          console.log(`${projectId} → ${repo}: ${stories.length} stories`);
        }
      }
    });

    it('should prepare data for GitHub master+nested pattern', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Simulate GitHub master+nested config
      const githubConfig = {
        owner: 'fitness-corp',
        masterRepo: 'master-project',
        nestedRepos: ['frontend-web', 'backend-api', 'mobile-app']
      };

      // Epic data (goes to master repo)
      const epicData = {
        title: parsed.metadata.title,
        summary: parsed.executiveSummary,
        totalStories: parsed.userStories.length
      };

      expect(epicData.title).toContain('Fitness Tracker');
      expect(epicData.totalStories).toBe(5);

      // Detailed stories (go to nested repos)
      const projectStories = new Map<string, typeof parsed.userStories>();

      for (const story of parsed.userStories) {
        const primary = getPrimaryProject(story);

        if (primary) {
          const existing = projectStories.get(primary.projectId) || [];
          existing.push(story);
          projectStories.set(primary.projectId, existing);
        }
      }

      // Each nested repo should have stories
      expect(projectStories.size).toBeGreaterThan(0);

      for (const [projectId, stories] of projectStories.entries()) {
        expect(stories.length).toBeGreaterThan(0);
        console.log(`Nested ${projectId}: ${stories.length} stories`);
      }
    });
  });

  describe('JIRA Multi-Project Sync Simulation', () => {
    it('should prepare data for JIRA multiple projects pattern', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Simulate JIRA config
      const jiraConfig = {
        domain: 'fitness-corp.atlassian.net',
        projects: ['FE', 'BE', 'MOBILE', 'INFRA'],
        intelligentMapping: true
      };

      // Classify stories
      const projectStories = new Map<string, typeof parsed.userStories>();

      for (const story of parsed.userStories) {
        const primary = getPrimaryProject(story);

        if (primary && jiraConfig.projects.includes(primary.projectId)) {
          const existing = projectStories.get(primary.projectId) || [];
          existing.push(story);
          projectStories.set(primary.projectId, existing);
        }
      }

      // Should have stories for multiple JIRA projects
      expect(projectStories.size).toBeGreaterThanOrEqual(3);

      // Each project should have epics
      for (const [projectKey, stories] of projectStories.entries()) {
        expect(stories.length).toBeGreaterThan(0);

        // Simulate epic creation
        const epic = {
          project: projectKey,
          summary: `${parsed.metadata.title} - ${projectKey}`,
          storyCount: stories.length,
          totalPoints: stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
        };

        console.log(`JIRA Epic ${projectKey}: ${epic.storyCount} stories, ${epic.totalPoints} points`);
        expect(epic.totalPoints).toBeGreaterThan(0);
      }
    });
  });

  describe('ADO Multi-Project Sync Simulation', () => {
    it('should prepare data for ADO multiple projects pattern', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Simulate ADO config
      const adoConfig = {
        organization: 'fitness-corp',
        projects: ['Frontend-Web', 'Backend-API', 'Mobile-App', 'Infrastructure'],
        intelligentMapping: true
      };

      // Classify stories
      const projectStories = new Map<string, typeof parsed.userStories>();

      const projectMapping = {
        FE: 'Frontend-Web',
        BE: 'Backend-API',
        MOBILE: 'Mobile-App',
        INFRA: 'Infrastructure'
      };

      for (const story of parsed.userStories) {
        const primary = getPrimaryProject(story);

        if (primary) {
          const adoProject = projectMapping[primary.projectId as keyof typeof projectMapping];

          if (adoProject) {
            const existing = projectStories.get(adoProject) || [];
            existing.push(story);
            projectStories.set(adoProject, existing);
          }
        }
      }

      // Should have stories for multiple ADO projects
      expect(projectStories.size).toBeGreaterThanOrEqual(3);

      for (const [projectName, stories] of projectStories.entries()) {
        expect(adoConfig.projects).toContain(projectName);
        expect(stories.length).toBeGreaterThan(0);

        console.log(`ADO Project ${projectName}: ${stories.length} work items`);
      }
    });

    it('should prepare data for ADO area path pattern', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Simulate ADO area path config
      const adoConfig = {
        organization: 'fitness-corp',
        project: 'FitnessTracker',
        areaPaths: [
          'FitnessTracker\\Frontend',
          'FitnessTracker\\Backend',
          'FitnessTracker\\Mobile',
          'FitnessTracker\\Infrastructure'
        ]
      };

      // Map stories to area paths
      const areaPathStories = new Map<string, typeof parsed.userStories>();

      const areaPathMapping = {
        FE: 'FitnessTracker\\Frontend',
        BE: 'FitnessTracker\\Backend',
        MOBILE: 'FitnessTracker\\Mobile',
        INFRA: 'FitnessTracker\\Infrastructure'
      };

      for (const story of parsed.userStories) {
        const primary = getPrimaryProject(story);

        if (primary) {
          const areaPath = areaPathMapping[primary.projectId as keyof typeof areaPathMapping];

          if (areaPath) {
            const existing = areaPathStories.get(areaPath) || [];
            existing.push(story);
            areaPathStories.set(areaPath, existing);
          }
        }
      }

      // Should have stories for multiple area paths
      expect(areaPathStories.size).toBeGreaterThanOrEqual(3);

      for (const [areaPath, stories] of areaPathStories.entries()) {
        expect(adoConfig.areaPaths).toContain(areaPath);
        expect(stories.length).toBeGreaterThan(0);

        console.log(`Area Path ${areaPath}: ${stories.length} items`);
      }
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should classify the same story consistently across all platforms', async () => {
      const specPath = path.join(FIXTURES_DIR, 'fitness-tracker-spec.md');
      const parsed = await parseSpecFile(specPath);

      // Take first story (web dashboard)
      const story = parsed.userStories[0];

      const githubClassification = getPrimaryProject(story);
      const jiraClassification = getPrimaryProject(story);
      const adoClassification = getPrimaryProject(story);

      // All platforms should classify to same project (FE)
      expect(githubClassification?.projectId).toBe('FE');
      expect(jiraClassification?.projectId).toBe('FE');
      expect(adoClassification?.projectId).toBe('FE');

      // Confidence should be similar (within 0.1)
      const confidences = [
        githubClassification?.confidence || 0,
        jiraClassification?.confidence || 0,
        adoClassification?.confidence || 0
      ];

      const maxConfidence = Math.max(...confidences);
      const minConfidence = Math.min(...confidences);

      expect(maxConfidence - minConfidence).toBeLessThan(0.1);
    });
  });
});
