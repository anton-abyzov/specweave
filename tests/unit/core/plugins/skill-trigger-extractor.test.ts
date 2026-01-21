/**
 * Unit tests for Skill Trigger Extractor
 *
 * Tests the extraction of activation trigger keywords from SKILL.md files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillTriggerExtractor, ExtractedTriggers } from '../../../../src/core/plugins/skill-trigger-extractor.js';

describe('SkillTriggerExtractor', () => {
  let extractor: SkillTriggerExtractor;

  beforeEach(() => {
    extractor = new SkillTriggerExtractor();
  });

  describe('extractFromContent', () => {
    it('should extract triggers from standard "Activates for:" format', () => {
      const content = `---
name: kubernetes-architect
description: Expert K8s architect. Activates for: kubernetes, k8s, EKS, AKS, GKE, helm, GitOps.
---

# Kubernetes Architect

Expert in Kubernetes deployments.
`;

      const result = extractor.extractFromContent(
        content,
        'kubernetes-architect',
        'specweave-kubernetes',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.name).toBe('kubernetes-architect');
      expect(result.plugin).toBe('specweave-kubernetes');
      expect(result.type).toBe('skill');
      expect(result.triggers).toContain('kubernetes');
      expect(result.triggers).toContain('k8s');
      expect(result.triggers).toContain('eks');
      expect(result.triggers).toContain('aks');
      expect(result.triggers).toContain('gke');
      expect(result.triggers).toContain('helm');
      expect(result.triggers).toContain('gitops');
    });

    it('should extract triggers from comma-separated keywords', () => {
      const content = `---
name: nodejs-backend
description: Node.js developer. Activates for: Node.js, NodeJS, Express, Fastify, NestJS, Prisma, TypeORM.
---

# Node.js Backend
`;

      const result = extractor.extractFromContent(
        content,
        'nodejs-backend',
        'specweave-backend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('node.js');
      expect(result.triggers).toContain('nodejs');
      expect(result.triggers).toContain('express');
      expect(result.triggers).toContain('fastify');
      expect(result.triggers).toContain('nestjs');
      expect(result.triggers).toContain('prisma');
      expect(result.triggers).toContain('typeorm');
    });

    it('should extract technology terms from description without "Activates for:"', () => {
      const content = `---
name: react-expert
description: Build React applications with Next.js, Redux, and TypeScript. Expert in component architecture and state management.
---

# React Expert
`;

      const result = extractor.extractFromContent(
        content,
        'react-expert',
        'specweave-frontend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('react');
      expect(result.triggers).toContain('next.js');
      expect(result.triggers).toContain('typescript');
    });

    it('should handle missing description gracefully', () => {
      const content = `---
name: empty-skill
---

# Empty Skill

No description provided.
`;

      const result = extractor.extractFromContent(
        content,
        'empty-skill',
        'specweave-test',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.name).toBe('empty-skill');
      expect(result.description).toBe('');
      expect(result.triggers).toEqual([]);
    });

    it('should extract from "When to Use" sections', () => {
      const content = `---
name: database-optimizer
description: Database optimization expert.
---

# Database Optimizer

## When to Use This Skill

Use this skill when working with:
- PostgreSQL performance tuning
- MySQL query optimization
- MongoDB indexing
- Redis caching strategies
`;

      const result = extractor.extractFromContent(
        content,
        'database-optimizer',
        'specweave-backend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('postgresql');
      expect(result.triggers).toContain('mysql');
      expect(result.triggers).toContain('mongodb');
      expect(result.triggers).toContain('redis');
    });

    it('should normalize keywords to lowercase', () => {
      const content = `---
name: test-skill
description: Activates for: AWS, Azure, GCP, KUBERNETES, Docker.
---
`;

      const result = extractor.extractFromContent(
        content,
        'test-skill',
        'test-plugin',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('aws');
      expect(result.triggers).toContain('azure');
      expect(result.triggers).toContain('gcp');
      expect(result.triggers).toContain('kubernetes');
      expect(result.triggers).toContain('docker');
      // Should not contain uppercase versions
      expect(result.triggers).not.toContain('AWS');
      expect(result.triggers).not.toContain('KUBERNETES');
    });

    it('should handle agent type correctly', () => {
      const content = `---
name: mobile-architect
description: Expert mobile architect for React Native and Expo SDK. Activates for: React Native, Expo, iOS, Android.
---
`;

      const result = extractor.extractFromContent(
        content,
        'mobile-architect',
        'specweave-mobile',
        'agent',
        '/path/to/AGENT.md'
      );

      expect(result.type).toBe('agent');
      expect(result.triggers).toContain('react native');
      expect(result.triggers).toContain('expo');
      expect(result.triggers).toContain('ios');
      expect(result.triggers).toContain('android');
    });
  });

  describe('extractTriggerKeywords', () => {
    it('should extract from "Use when" pattern', () => {
      const content = '';
      const description = 'Database helper. Use when optimizing PostgreSQL queries or working with Prisma ORM.';

      const triggers = extractor.extractTriggerKeywords(content, description);

      expect(triggers).toContain('postgresql');
      expect(triggers).toContain('prisma');
    });

    it('should filter out stop words', () => {
      const content = '';
      const description = 'Activates for: the, React, and, Vue, is, Angular.';

      const triggers = extractor.extractTriggerKeywords(content, description);

      expect(triggers).toContain('react');
      expect(triggers).toContain('vue');
      expect(triggers).toContain('angular');
      expect(triggers).not.toContain('the');
      expect(triggers).not.toContain('and');
      expect(triggers).not.toContain('is');
    });

    it('should filter out keywords shorter than 2 characters', () => {
      const content = '';
      const description = 'Activates for: Go, a, JS, AI, ML.';

      const triggers = extractor.extractTriggerKeywords(content, description);

      expect(triggers).toContain('go');
      expect(triggers).not.toContain('a');
      // JS, AI, ML are 2 chars - should be included
      // (but they need to match patterns)
    });
  });

  describe('buildIndex', () => {
    it('should build inverted index from triggers', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'k8s-skill',
          plugin: 'specweave-k8s',
          type: 'skill',
          description: 'K8s expert',
          triggers: ['kubernetes', 'k8s', 'helm'],
          path: '/path/1'
        },
        {
          name: 'docker-skill',
          plugin: 'specweave-infra',
          type: 'skill',
          description: 'Docker expert',
          triggers: ['docker', 'kubernetes', 'containers'],
          path: '/path/2'
        }
      ];

      const index = extractor.buildIndex(triggers);

      // Check inverted index
      expect(index.keywords['kubernetes']).toContain('specweave-k8s:k8s-skill');
      expect(index.keywords['kubernetes']).toContain('specweave-infra:docker-skill');
      expect(index.keywords['k8s']).toEqual(['specweave-k8s:k8s-skill']);
      expect(index.keywords['docker']).toEqual(['specweave-infra:docker-skill']);

      // Check skill metadata
      expect(index.skills['specweave-k8s:k8s-skill']).toBeDefined();
      expect(index.skills['specweave-k8s:k8s-skill'].plugin).toBe('specweave-k8s');
      expect(index.skills['specweave-k8s:k8s-skill'].triggers).toContain('kubernetes');

      // Check counts
      expect(index.skillCount).toBe(2);
      expect(index.keywordCount).toBe(5); // kubernetes, k8s, helm, docker, containers
    });

    it('should include generation timestamp', () => {
      const triggers: ExtractedTriggers[] = [];
      const index = extractor.buildIndex(triggers);

      expect(index.generatedAt).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(index.generatedAt).toISOString()).toBe(index.generatedAt);
    });
  });

  describe('matchPrompt', () => {
    it('should match prompts to skills based on keywords', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'kubernetes-architect',
          plugin: 'specweave-k8s',
          type: 'agent',
          description: 'K8s expert',
          triggers: ['kubernetes', 'k8s', 'eks', 'gitops', 'helm'],
          path: '/path/1'
        },
        {
          name: 'docker-skill',
          plugin: 'specweave-infra',
          type: 'skill',
          description: 'Docker expert',
          triggers: ['docker', 'containers', 'dockerfile'],
          path: '/path/2'
        }
      ];

      const index = extractor.buildIndex(triggers);

      // Test matching
      const matches = extractor.matchPrompt(
        'I need to deploy microservices to EKS with GitOps',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].fqn).toBe('specweave-k8s:kubernetes-architect');
      expect(matches[0].matchedKeywords).toContain('eks');
      expect(matches[0].matchedKeywords).toContain('gitops');
    });

    it('should rank matches by score (longer keywords = higher score)', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'react-skill',
          plugin: 'specweave-frontend',
          type: 'skill',
          description: 'React',
          triggers: ['react'],
          path: '/path/1'
        },
        {
          name: 'react-native-skill',
          plugin: 'specweave-mobile',
          type: 'skill',
          description: 'React Native',
          triggers: ['react native', 'react'],
          path: '/path/2'
        }
      ];

      const index = extractor.buildIndex(triggers);

      const matches = extractor.matchPrompt(
        'Build a React Native mobile app',
        index
      );

      // React Native skill should rank higher (longer keyword match)
      expect(matches[0].fqn).toBe('specweave-mobile:react-native-skill');
    });

    it('should return empty array for no matches', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'k8s-skill',
          plugin: 'specweave-k8s',
          type: 'skill',
          description: 'K8s',
          triggers: ['kubernetes'],
          path: '/path/1'
        }
      ];

      const index = extractor.buildIndex(triggers);

      const matches = extractor.matchPrompt(
        'How do I write Python code?',
        index
      );

      expect(matches).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'aws-skill',
          plugin: 'specweave-cloud',
          type: 'skill',
          description: 'AWS',
          triggers: ['aws', 'amazon web services'],
          path: '/path/1'
        }
      ];

      const index = extractor.buildIndex(triggers);

      const matches = extractor.matchPrompt(
        'Deploy to AWS Lambda',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchedKeywords).toContain('aws');
    });
  });

  describe('real-world skill examples', () => {
    it('should handle kubernetes-architect SKILL.md format', () => {
      const content = `---
name: k8s-manifest-generator
description: Create production-ready Kubernetes manifests for Deployments, Services, ConfigMaps, and Secrets following best practices and security standards. Use when generating Kubernetes YAML manifests, creating K8s resources, or implementing production-grade Kubernetes configurations.
---

# Kubernetes Manifest Generator
`;

      const result = extractor.extractFromContent(
        content,
        'k8s-manifest-generator',
        'specweave-kubernetes',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('kubernetes');
    });

    it('should handle nodejs-backend SKILL.md format', () => {
      const content = `---
name: nodejs-backend
description: Node.js/TypeScript backend developer. Builds Express.js, Fastify, NestJS APIs with Prisma ORM, TypeORM, Mongoose. Implements REST APIs, GraphQL, authentication (JWT, session, OAuth), authorization, database operations, background jobs, WebSockets, real-time features, API validation, error handling, middleware. Activates for: Node.js, NodeJS, Express, Fastify, NestJS, TypeScript backend, API, REST API, GraphQL, Prisma, TypeORM, Mongoose, MongoDB, PostgreSQL with Node, MySQL with Node, authentication backend, JWT, passport.js, bcrypt, async/await, promises, middleware, error handling, validation, Zod, class-validator, background jobs, Bull, BullMQ, Redis, WebSocket, Socket.io, real-time.
tools: Read, Write, Edit, Bash
model: opus
---
`;

      const result = extractor.extractFromContent(
        content,
        'nodejs-backend',
        'specweave-backend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('node.js');
      expect(result.triggers).toContain('express');
      expect(result.triggers).toContain('nestjs');
      expect(result.triggers).toContain('prisma');
      expect(result.triggers).toContain('graphql');
      expect(result.triggers).toContain('jwt');
      expect(result.triggers).toContain('mongodb');
      expect(result.triggers).toContain('redis');
    });

    it('should handle react-native-setup SKILL.md format', () => {
      const content = `---
name: react-native-setup
description: Expert in React Native 0.83+ and Expo SDK 54+ environment setup. Helps with Node.js 20+, Xcode 16.1+, Android Studio, watchman, CocoaPods, EAS Build, simulators, emulators, and troubleshooting. Activates for environment setup, installation issues, xcode setup, android studio, simulators, emulators, react-native init, expo init, development environment, SDK configuration, EAS Build, development builds.
---
`;

      const result = extractor.extractFromContent(
        content,
        'react-native-setup',
        'specweave-mobile',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('react native');
      expect(result.triggers).toContain('expo');
      // Note: iOS not explicitly in "Activates for:" section - only in description as Xcode
      expect(result.triggers).toContain('node.js');
    });
  });
});
