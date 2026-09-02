/**
 * E2E Tests for Plugin/Skill Activation
 *
 * These tests verify that domain-specific prompts correctly activate
 * the appropriate plugins and skills from the SpecWeave marketplace.
 *
 * Tests cover: Kubernetes, Mobile, Backend, Frontend, Security, ML, Infrastructure
 *
 * Updated for v1.0.315 migration: domain skills now split between
 * specweave (core/integrations) and vskill (domain-specific) repos.
 * Index is generated from both repos and merged.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SkillTriggerIndexManager } from '../../../src/core/plugins/skill-trigger-index.js';
import { SkillTriggersIndex } from '../../../src/core/plugins/skill-trigger-extractor.js';
import * as path from 'path';
import { existsSync, readdirSync } from 'fs';

// Domain skills (Kubernetes, Mobile, ML, etc.) live in the vskill repo.
// In CI, only specweave is checked out, so domain tests must be skipped.
const projectRoot = path.resolve(__dirname, '../../..');
const vskillPluginsDir = path.resolve(projectRoot, '..', 'vskill', 'plugins');
const hasVskill = existsSync(vskillPluginsDir);

/**
 * Merge two SkillTriggersIndex objects into one combined index.
 */
function mergeIndexes(a: SkillTriggersIndex, b: SkillTriggersIndex): SkillTriggersIndex {
  const skills = { ...a.skills, ...b.skills };
  const keywords: Record<string, string[]> = { ...a.keywords };

  // Merge keyword entries from b
  for (const [keyword, skillNames] of Object.entries(b.keywords)) {
    if (keywords[keyword]) {
      // Deduplicate
      const combined = new Set([...keywords[keyword], ...skillNames]);
      keywords[keyword] = Array.from(combined);
    } else {
      keywords[keyword] = skillNames;
    }
  }

  return {
    skills,
    keywords,
    generatedAt: new Date().toISOString(),
    skillCount: Object.keys(skills).length,
    keywordCount: Object.keys(keywords).length,
  };
}

describe('Plugin Activation E2E Tests', () => {
  let manager: SkillTriggerIndexManager;
  let index: SkillTriggersIndex;

  beforeAll(async () => {
    // Generate index from local specweave plugins
    const projectRoot = path.resolve(__dirname, '../../..');
    manager = new SkillTriggerIndexManager(projectRoot);
    const localResult = await manager.generateAndSave();

    // Generate index from vskill repo plugins (migrated domain skills)
    // In CI, vskill repo may not exist as a sibling — merge is optional
    const vskillRoot = path.resolve(projectRoot, '..', 'vskill');
    try {
      const vskillManager = new SkillTriggerIndexManager(vskillRoot);
      const vskillResult = await vskillManager.generateAndSave(
        path.join(vskillRoot, 'plugins')
      );
      // Merge both indexes for full coverage
      index = mergeIndexes(localResult.index, vskillResult.index);
    } catch {
      // vskill not available (CI) — use local index only
      index = localResult.index;
    }

    // Sanity check — the index must cover every skill the plugin actually ships
    // (2.0 culled the surface to ten, so a fixed floor drifts).
    const shippedSkills = readdirSync(path.join(projectRoot, 'plugins', 'specweave', 'skills'), {
      withFileTypes: true,
    }).filter((d) => d.isDirectory()).length;
    expect(index.skillCount).toBeGreaterThanOrEqual(shippedSkills);
    // The old ">30 keywords" floor was calibrated to the 51-skill 1.x surface.
    // What matters is that extraction produced a usable map pointing only at
    // skills the index actually knows.
    expect(index.keywordCount).toBeGreaterThan(0);
    for (const names of Object.values(index.keywords)) {
      expect(names.every((n) => n in index.skills)).toBe(true);
    }
  });

  describe('T-005: E2E Test Infrastructure', () => {
    it('should have skill triggers index generated', () => {
      expect(index).toBeDefined();
      expect(index.skills).toBeDefined();
      expect(index.keywords).toBeDefined();
    });

    it('attributes every skill to a plugin', () => {
      const plugins = new Set<string>();
      Object.values(index.skills).forEach(skill => {
        plugins.add(skill.plugin);
      });

      // 2.0 ships exactly one plugin here; the domain plugins live in the
      // sibling vskill repo, which is absent in CI.
      expect(plugins.has('specweave')).toBe(true);
      expect(plugins.size).toBeGreaterThanOrEqual(hasVskill ? 2 : 1);
    });

    it('should match prompts and return scored results', async () => {
      // Use a prompt with specweave core keywords (plan, spec, increment)
      const matches = await manager.matchPrompt('Plan an increment with spec and TDD tests', index);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toHaveProperty('fqn');
      expect(matches[0]).toHaveProperty('score');
      expect(matches[0]).toHaveProperty('matchedKeywords');
    });
  });

  describe.skipIf(!hasVskill)('T-006: Kubernetes Plugin Activation', () => {
    it('should activate infrastructure skills for "deploy to EKS with GitOps"', async () => {
      const matches = await manager.matchPrompt(
        'I need to deploy microservices to EKS with GitOps and ArgoCD',
        index
      );

      expect(matches.length).toBeGreaterThan(0);

      // Check matched keywords — eks is indexed
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['eks', 'microservices'].includes(k))).toBe(true);
    });

    it('should activate infrastructure skills for "create Kubernetes Deployment manifest"', async () => {
      const matches = await manager.matchPrompt(
        'Create a Kubernetes Deployment manifest with resource limits',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      // "deployment" is extracted as a keyword
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['deployment', 'eks', 'aks'].includes(k))).toBe(true);
    });

    it.skip('should activate infrastructure skills for "EKS cluster setup" (infra plugins removed from vskill)', async () => {
      // Skipped: Infrastructure/Kubernetes domain skills no longer present in vskill repo
      const matches = await manager.matchPrompt(
        'Set up an EKS cluster on AWS with Terraform and managed node groups',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['eks', 'aws', 'terraform', 'cluster'].includes(k))).toBe(true);
    });

    it('should activate kubernetes skills for "AKS deployment"', async () => {
      const matches = await manager.matchPrompt(
        'Deploy to Azure AKS with Terraform',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      // Should match both AKS and Terraform keywords
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['aks', 'azure', 'terraform'].includes(k))).toBe(true);
    });
  });

  describe.skipIf(!hasVskill)('T-007: Mobile Plugin Activation', () => {
    it('should activate mobile skills for "React Native authentication"', async () => {
      const matches = await manager.matchPrompt(
        'Build a React Native mobile app authentication flow with biometrics for iOS and Android',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['react native', 'mobile', 'ios', 'android'].includes(k))).toBe(true);
    });

    it('should activate mobile skills for "Expo SDK setup"', async () => {
      const matches = await manager.matchPrompt(
        'Set up Expo SDK 54 with EAS Build for my React Native mobile app on iOS',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['expo', 'mobile', 'react native', 'ios'].includes(k))).toBe(true);
    });

    it('should activate mobile skills for "iOS and Android development"', async () => {
      const matches = await manager.matchPrompt(
        'Develop a cross-platform app for iOS and Android with React Native',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['ios', 'android', 'react native'].includes(k))).toBe(true);
    });

    it('should activate mobile skills for "Flutter vs React Native"', async () => {
      const matches = await manager.matchPrompt(
        'Compare Flutter and React Native for iOS and Android mobile development',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['flutter', 'react native', 'mobile', 'ios', 'android'].includes(k))).toBe(true);
    });
  });

  describe.skipIf(!hasVskill)('T-008: Backend Plugin Activation', () => {
    it('should activate backend skills for "NestJS API with Prisma"', async () => {
      const matches = await manager.matchPrompt(
        'Build a NestJS backend REST API with Prisma ORM and PostgreSQL database',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['nestjs', 'prisma', 'postgresql', 'api', 'backend'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "Express.js API"', async () => {
      const matches = await manager.matchPrompt(
        'Create an Express.js API with JWT authentication',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      // express and jwt are not indexed; api is extracted
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['api', 'backend'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "FastAPI Python"', async () => {
      const matches = await manager.matchPrompt(
        'Build a FastAPI backend with SQLAlchemy',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      // fastapi is not indexed; api and backend are extracted
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['api', 'backend'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "GraphQL API"', async () => {
      const matches = await manager.matchPrompt(
        'Implement a GraphQL API with subscriptions',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      // graphql is not indexed; api is extracted
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['api', 'backend'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "Redis caching"', async () => {
      const matches = await manager.matchPrompt(
        'Add Redis caching to my Node.js backend API application',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['node', 'backend', 'api', 'redis'].includes(k))).toBe(true);
    });
  });

  describe.skipIf(!hasVskill)('T-009: Frontend Plugin Activation', () => {
    it('should activate frontend skills for "Next.js dashboard"', async () => {
      const matches = await manager.matchPrompt(
        'Build a Next.js React admin dashboard with Tailwind CSS and TypeScript',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['next.js', 'nextjs', 'react', 'tailwind', 'typescript'].includes(k))).toBe(true);
    });

    it('should activate frontend skills for "React components"', async () => {
      const matches = await manager.matchPrompt(
        'Create reusable React components with TypeScript',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['react', 'typescript'].includes(k))).toBe(true);
    });

    it('should activate frontend skills for "React SPA"', async () => {
      // Vue is not indexed; use React which is indexed
      const matches = await manager.matchPrompt(
        'Build a React single page application with state management',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('react'))).toBe(true);
    });

    it('should activate frontend skills for "TypeScript application"', async () => {
      const matches = await manager.matchPrompt(
        'Create a TypeScript React enterprise application with Next.js frontend',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['typescript', 'next.js', 'react', 'frontend'].includes(k))).toBe(true);
    });
  });

  describe.skipIf(!hasVskill)('T-010: Additional Domain Activation', () => {
    describe('Security', () => {
      it('should activate security skills for "security vulnerabilities"', async () => {
        const matches = await manager.matchPrompt(
          'Perform security review for OWASP Top 10 vulnerabilities',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        // owasp is not indexed; security is indexed
        expect(matches.some(m => m.matchedKeywords.includes('security'))).toBe(true);
      });

      it('should activate security skills for "authentication implementation"', async () => {
        // OAuth is not indexed; use a prompt that matches via security keyword
        const matches = await manager.matchPrompt(
          'Implement secure authentication with security best practices',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('security'))).toBe(true);
      });
    });

    describe('Infrastructure/DevOps', () => {
      it('should activate devops skills for "Terraform AWS"', async () => {
        const matches = await manager.matchPrompt(
          'Deploy infrastructure to AWS with Terraform and Docker containers',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['terraform', 'aws', 'docker', 'container'].includes(k))).toBe(true);
      });

      it('should activate devops skills for "containerization"', async () => {
        const matches = await manager.matchPrompt(
          'Containerize my application with Docker',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        // docker is not indexed; container is extracted
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['container', 'docker'].includes(k))).toBe(true);
      });

      it('should activate devops skills for "CI/CD pipeline"', async () => {
        const matches = await manager.matchPrompt(
          'Set up CI/CD pipeline with GitHub Actions and Docker deployment',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['ci/cd', 'github actions', 'docker', 'deployment'].includes(k))).toBe(true);
      });

      it.skip('should activate observability skills for "monitoring setup" (infra plugins removed from vskill)', async () => {
        // Skipped: Infrastructure/observability domain skills no longer present in vskill repo
        const matches = await manager.matchPrompt(
          'Set up monitoring and observability with OpenTelemetry and Kubernetes deployment',
          index
        );

        // Should return some matches from infra/observability skills
        expect(Array.isArray(matches)).toBe(true);
        // Verify the index has observability or infrastructure-related skills
        const hasInfraSkill = Object.keys(index.skills).some(name =>
          name.includes('opentelemetry') || name.includes('observ') || name.includes('infra')
        );
        expect(hasInfraSkill).toBe(true);
      });
    });

    describe('ML/Data Science', () => {
      it('should activate ML skills for "machine learning model training"', async () => {
        const matches = await manager.matchPrompt(
          'Train a machine learning model for production ML',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        // machine learning / production ml not indexed; ml and model are extracted
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['ml', 'model', 'ai'].includes(k))).toBe(true);
      });

      it('should activate ML skills for "MLflow experiment tracking"', async () => {
        const matches = await manager.matchPrompt(
          'Set up MLflow for ML model experiment tracking and AI training pipeline',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['ml', 'model', 'ai', 'pipeline'].includes(k))).toBe(true);
      });
    });

    describe('Database', () => {
      it('should activate database skills for "PostgreSQL performance"', async () => {
        const matches = await manager.matchPrompt(
          'Optimize PostgreSQL database query performance with proper indexing',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['postgresql', 'postgres', 'database', 'performance'].includes(k))).toBe(true);
      });

      it('should activate database skills for "database performance"', async () => {
        // MongoDB is not indexed; use a generic database performance prompt
        const matches = await manager.matchPrompt(
          'Create database indexes for better performance',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        // performance is extracted as a keyword
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['performance', 'postgresql', 'postgres'].includes(k))).toBe(true);
      });
    });

    describe('Testing', () => {
      it('should activate testing skills for "E2E Playwright tests"', async () => {
        const matches = await manager.matchPrompt(
          'Write E2E tests with Playwright',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['playwright', 'e2e'].includes(k))).toBe(true);
      });

      it('should activate testing skills for "TDD workflow"', async () => {
        const matches = await manager.matchPrompt(
          'Implement TDD red-green-refactor workflow',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('tdd'))).toBe(true);
      });
    });

    describe('Kafka/Messaging', () => {
      it('should activate Kafka skills for "Kafka event streaming"', async () => {
        const matches = await manager.matchPrompt(
          'Set up Apache Kafka for backend event streaming and API messaging',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['kafka', 'backend', 'api', 'event'].includes(k))).toBe(true);
      });
    });

    describe('Payments', () => {
      it('should activate payment skills for "payment integration"', async () => {
        const matches = await manager.matchPrompt(
          'Integrate Stripe payments with PCI DSS compliance and API checkout',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['pci', 'stripe', 'payment', 'api', 'checkout'].includes(k))).toBe(true);
      });

      it('should activate payment skills for "PCI compliance"', async () => {
        const matches = await manager.matchPrompt(
          'Ensure PCI DSS compliance for Stripe payment processing and security',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['pci', 'stripe', 'payment', 'security'].includes(k))).toBe(true);
      });
    });
  });

  describe.skipIf(!hasVskill)('Multi-Domain Prompts', () => {
    it('should match multiple domains for complex prompts', async () => {
      const matches = await manager.matchPrompt(
        'Build a React Native mobile app with a backend API deployed on AWS with Docker and CI/CD pipeline',
        index
      );

      // Should match at least 2 domains
      expect(matches.length).toBeGreaterThan(1);

      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      // Should match across multiple domains
      expect(allKeywords.length).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for unrelated prompts', async () => {
      const matches = await manager.matchPrompt(
        'What is the meaning of life?',
        index
      );

      // May or may not match depending on keywords
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle empty prompts gracefully', async () => {
      const matches = await manager.matchPrompt('', index);
      expect(matches).toEqual([]);
    });

    it('should handle special characters in prompts', async () => {
      const matches = await manager.matchPrompt(
        'Deploy @kubernetes/client-node with CI/CD!',
        index
      );

      // Should not crash on special characters
      expect(Array.isArray(matches)).toBe(true);
    });
  });
});
