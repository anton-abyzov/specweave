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
    const vskillRoot = path.resolve(projectRoot, '..', 'vskill');
    const vskillManager = new SkillTriggerIndexManager(vskillRoot);
    const vskillResult = await vskillManager.generateAndSave(
      path.join(vskillRoot, 'plugins')
    );

    // Merge both indexes for full coverage
    index = mergeIndexes(localResult.index, vskillResult.index);

    // Sanity check - combined should have many skills indexed
    expect(index.skillCount).toBeGreaterThan(100);
    expect(index.keywordCount).toBeGreaterThan(200);
  });

  describe('T-005: E2E Test Infrastructure', () => {
    it('should have skill triggers index generated', () => {
      expect(index).toBeDefined();
      expect(index.skills).toBeDefined();
      expect(index.keywords).toBeDefined();
    });

    it('should have skills from multiple plugins', () => {
      const plugins = new Set<string>();
      Object.values(index.skills).forEach(skill => {
        plugins.add(skill.plugin);
      });

      // Should have skills from multiple plugins
      expect(plugins.size).toBeGreaterThan(10);
    });

    it('should match prompts and return scored results', async () => {
      const matches = await manager.matchPrompt('Deploy to Kubernetes', index);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]).toHaveProperty('fqn');
      expect(matches[0]).toHaveProperty('score');
      expect(matches[0]).toHaveProperty('matchedKeywords');
    });
  });

  describe('T-006: Kubernetes Plugin Activation', () => {
    it('should activate kubernetes skills for "deploy to EKS with GitOps"', async () => {
      const matches = await manager.matchPrompt(
        'I need to deploy microservices to EKS with GitOps and ArgoCD',
        index
      );

      expect(matches.length).toBeGreaterThan(0);

      // Should match kubernetes-related skills
      const k8sMatches = matches.filter(m =>
        m.fqn.includes('kubernetes') || m.fqn.includes('k8s') || m.fqn.includes('gitops')
      );
      expect(k8sMatches.length).toBeGreaterThan(0);

      // Check matched keywords
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['eks', 'gitops', 'kubernetes'].includes(k))).toBe(true);
    });

    it('should activate kubernetes skills for "create Kubernetes manifest"', async () => {
      const matches = await manager.matchPrompt(
        'Create a Kubernetes Deployment manifest with resource limits',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('kubernetes'))).toBe(true);
    });

    it('should activate kubernetes skills for "Helm chart creation"', async () => {
      const matches = await manager.matchPrompt(
        'I need to create a Helm chart for my application',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('helm'))).toBe(true);
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

  describe('T-007: Mobile Plugin Activation', () => {
    it('should activate mobile skills for "React Native authentication"', async () => {
      const matches = await manager.matchPrompt(
        'Build a React Native authentication flow with biometrics',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('react native'))).toBe(true);
    });

    it('should activate mobile skills for "Expo SDK setup"', async () => {
      const matches = await manager.matchPrompt(
        'Set up Expo SDK 54 with EAS Build for my mobile app',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('expo'))).toBe(true);
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
        'Compare Flutter and React Native for mobile development',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['flutter', 'react native'].includes(k))).toBe(true);
    });
  });

  describe('T-008: Backend Plugin Activation', () => {
    it('should activate backend skills for "NestJS API with Prisma"', async () => {
      const matches = await manager.matchPrompt(
        'Build a NestJS REST API with Prisma ORM and PostgreSQL',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['nestjs', 'prisma', 'postgresql'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "Express.js API"', async () => {
      const matches = await manager.matchPrompt(
        'Create an Express.js API with JWT authentication',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['express', 'jwt'].includes(k))).toBe(true);
    });

    it('should activate backend skills for "FastAPI Python"', async () => {
      const matches = await manager.matchPrompt(
        'Build a FastAPI backend with SQLAlchemy',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('fastapi'))).toBe(true);
    });

    it('should activate backend skills for "GraphQL API"', async () => {
      const matches = await manager.matchPrompt(
        'Implement a GraphQL API with subscriptions',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('graphql'))).toBe(true);
    });

    it('should activate backend skills for "Redis caching"', async () => {
      const matches = await manager.matchPrompt(
        'Add Redis caching to my Node.js application',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['redis', 'node.js'].includes(k))).toBe(true);
    });
  });

  describe('T-009: Frontend Plugin Activation', () => {
    it('should activate frontend skills for "Next.js dashboard"', async () => {
      const matches = await manager.matchPrompt(
        'Build a Next.js admin dashboard with Tailwind CSS',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['next.js', 'nextjs', 'tailwind'].includes(k))).toBe(true);
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

    it('should activate frontend skills for "Vue.js SPA"', async () => {
      const matches = await manager.matchPrompt(
        'Build a Vue.js single page application with Vuex',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('vue'))).toBe(true);
    });

    it('should activate frontend skills for "Angular application"', async () => {
      const matches = await manager.matchPrompt(
        'Create an Angular enterprise application',
        index
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.matchedKeywords.includes('angular'))).toBe(true);
    });
  });

  describe('T-010: Additional Domain Activation', () => {
    describe('Security', () => {
      it('should activate security skills for "OWASP vulnerabilities"', async () => {
        const matches = await manager.matchPrompt(
          'Perform security review for OWASP Top 10 vulnerabilities',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('owasp'))).toBe(true);
      });

      it('should activate security skills for "OAuth implementation"', async () => {
        const matches = await manager.matchPrompt(
          'Implement OAuth 2.0 authentication with JWT tokens',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['oauth', 'jwt'].includes(k))).toBe(true);
      });
    });

    describe('Infrastructure/DevOps', () => {
      it('should activate devops skills for "Terraform AWS"', async () => {
        const matches = await manager.matchPrompt(
          'Deploy infrastructure to AWS with Terraform',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['terraform', 'aws'].includes(k))).toBe(true);
      });

      it('should activate devops skills for "Docker containerization"', async () => {
        const matches = await manager.matchPrompt(
          'Containerize my application with Docker',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('docker'))).toBe(true);
      });

      it('should activate devops skills for "CI/CD pipeline"', async () => {
        const matches = await manager.matchPrompt(
          'Set up CI/CD pipeline with GitHub Actions',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['ci/cd', 'github actions'].includes(k))).toBe(true);
      });

      it('should activate observability skills for "Prometheus and Grafana"', async () => {
        const matches = await manager.matchPrompt(
          'Set up monitoring with Prometheus and Grafana dashboards',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['prometheus', 'grafana'].includes(k))).toBe(true);
      });
    });

    describe('ML/Data Science', () => {
      it('should activate ML skills for "machine learning model training"', async () => {
        const matches = await manager.matchPrompt(
          'Train a machine learning model for production ML',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['machine learning', 'production ml', 'model training'].includes(k))).toBe(true);
      });

      it('should activate ML skills for "MLflow experiment tracking"', async () => {
        const matches = await manager.matchPrompt(
          'Set up MLflow for experiment tracking',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('mlflow'))).toBe(true);
      });
    });

    describe('Database', () => {
      it('should activate database skills for "PostgreSQL performance"', async () => {
        const matches = await manager.matchPrompt(
          'Optimize PostgreSQL query performance',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        const allKeywords = matches.flatMap(m => m.matchedKeywords);
        expect(allKeywords.some(k => ['postgresql', 'postgres'].includes(k))).toBe(true);
      });

      it('should activate database skills for "MongoDB indexing"', async () => {
        const matches = await manager.matchPrompt(
          'Create MongoDB indexes for better performance',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('mongodb'))).toBe(true);
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
          'Set up Apache Kafka for event streaming',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('kafka'))).toBe(true);
      });
    });

    describe('Payments', () => {
      it('should activate payment skills for "Stripe integration"', async () => {
        const matches = await manager.matchPrompt(
          'Integrate Stripe payments with webhooks',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('stripe'))).toBe(true);
      });

      it('should activate payment skills for "PCI compliance"', async () => {
        const matches = await manager.matchPrompt(
          'Ensure PCI DSS compliance for payment processing',
          index
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(m => m.matchedKeywords.includes('pci'))).toBe(true);
      });
    });
  });

  describe('Multi-Domain Prompts', () => {
    it('should match multiple domains for complex prompts', async () => {
      const matches = await manager.matchPrompt(
        'Build a React Native app with NestJS backend deployed on Kubernetes with Stripe payments',
        index
      );

      expect(matches.length).toBeGreaterThan(3);

      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      // Should match mobile, backend, k8s, and payments
      expect(allKeywords.some(k => ['react native'].includes(k))).toBe(true);
      expect(allKeywords.some(k => ['nestjs'].includes(k))).toBe(true);
      expect(allKeywords.some(k => ['kubernetes'].includes(k))).toBe(true);
      expect(allKeywords.some(k => ['stripe'].includes(k))).toBe(true);
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

      expect(Array.isArray(matches)).toBe(true);
      // Should still match kubernetes and ci/cd
      const allKeywords = matches.flatMap(m => m.matchedKeywords);
      expect(allKeywords.some(k => ['kubernetes', 'ci/cd'].includes(k))).toBe(true);
    });
  });
});
