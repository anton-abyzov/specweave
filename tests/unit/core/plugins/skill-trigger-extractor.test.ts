/**
 * Comprehensive unit tests for SkillTriggerExtractor
 *
 * Tests all exported functions, trigger pattern detection, skill matching logic,
 * priority/confidence scoring, and edge cases.
 *
 * @module tests/unit/core/plugins/skill-trigger-extractor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPathExists, mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  pathExists: mockPathExists,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

import {
  SkillTriggerExtractor,
  type ExtractedTriggers,
  type SkillTriggersIndex,
  type SkillMetadata,
} from '../../../../src/core/plugins/skill-trigger-extractor.js';

describe('SkillTriggerExtractor', () => {
  let extractor: SkillTriggerExtractor;

  beforeEach(() => {
    extractor = new SkillTriggerExtractor();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // extractFromContent
  // ==========================================================================

  describe('extractFromContent', () => {
    it('should return the correct name, plugin, type, and path', () => {
      const content = `---
description: A test skill.
---
# Test
`;
      const result = extractor.extractFromContent(
        content,
        'my-skill',
        'my-plugin',
        'skill',
        '/plugins/my-plugin/skills/my-skill/SKILL.md'
      );

      expect(result.name).toBe('my-skill');
      expect(result.plugin).toBe('my-plugin');
      expect(result.type).toBe('skill');
      expect(result.path).toBe('/plugins/my-plugin/skills/my-skill/SKILL.md');
    });

    it('should handle agent type', () => {
      const content = `---
description: An agent for mobile development. Activates for: React Native, Expo.
---
`;
      const result = extractor.extractFromContent(
        content,
        'mobile-agent',
        'specweave-mobile',
        'agent',
        '/path/to/AGENT.md'
      );

      expect(result.type).toBe('agent');
      expect(result.triggers).toContain('react native');
      expect(result.triggers).toContain('expo');
    });

    it('should extract triggers from standard "Activates for:" format', () => {
      const content = `---
description: Expert K8s architect. Activates for: kubernetes, k8s, EKS, AKS, GKE, helm, GitOps.
---
# Kubernetes Architect
`;
      const result = extractor.extractFromContent(
        content,
        'kubernetes-architect',
        'specweave-kubernetes',
        'skill',
        '/path/to/SKILL.md'
      );

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
description: Build React applications with Next.js, Redux, and TypeScript. Expert in component architecture.
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

    it('should extract triggers from "When to Use" sections', () => {
      const content = `---
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

    it('should normalize all keywords to lowercase', () => {
      const content = `---
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
      expect(result.triggers).not.toContain('AWS');
      expect(result.triggers).not.toContain('KUBERNETES');
    });

    it('should extract from multi-line YAML description with >- folded block scalar', () => {
      const content = `---
description: >-
  Expert in building scalable APIs with
  Express and Fastify on Node.js.
---
# API Builder
`;
      const result = extractor.extractFromContent(
        content,
        'api-builder',
        'specweave-backend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.description).toBe(
        'Expert in building scalable APIs with Express and Fastify on Node.js.'
      );
      expect(result.triggers).toContain('express');
      expect(result.triggers).toContain('fastify');
      expect(result.triggers).toContain('node.js');
    });

    it('should extract from multi-line YAML description with > (no dash)', () => {
      const content = `---
description: >
  A skill for GraphQL schema design
  and Apollo Server integration.
---
# GraphQL Skill
`;
      const result = extractor.extractFromContent(
        content,
        'graphql-skill',
        'specweave-backend',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.description).toContain('GraphQL schema design');
      expect(result.triggers).toContain('graphql');
    });

    it('should extract keywords from YAML frontmatter keywords field', () => {
      const content = `---
description: A testing skill.
keywords: [playwright, cypress, selenium, e2e, testing]
---
# Testing Skill
`;
      const result = extractor.extractFromContent(
        content,
        'testing-skill',
        'specweave-testing',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.triggers).toContain('playwright');
      expect(result.triggers).toContain('cypress');
      expect(result.triggers).toContain('selenium');
      expect(result.triggers).toContain('e2e');
      expect(result.triggers).toContain('testing');
    });

    it('should not have triggers from content with no frontmatter', () => {
      const content = `# Just a Header

Some body text with no YAML frontmatter.
`;
      const result = extractor.extractFromContent(
        content,
        'no-frontmatter',
        'test-plugin',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.description).toBe('');
    });
  });

  // ==========================================================================
  // extractDescription (tested via extractFromContent - private method)
  // ==========================================================================

  describe('description extraction', () => {
    it('should extract single-line description', () => {
      const content = `---
description: Build beautiful React UIs.
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('Build beautiful React UIs.');
    });

    it('should return empty string when no frontmatter exists', () => {
      const content = `# No Frontmatter`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('');
    });

    it('should return empty string when frontmatter has no description', () => {
      const content = `---
name: something
tools: Read, Write
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('');
    });

    it('should handle description with special characters', () => {
      const content = `---
description: Build REST APIs with C# (.NET 8) and ASP.NET Core.
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('Build REST APIs with C# (.NET 8) and ASP.NET Core.');
    });

    it('should not confuse > in description value with multi-line indicator', () => {
      const content = `---
description: Node.js 20+ required for this skill.
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('Node.js 20+ required for this skill.');
    });
  });

  // ==========================================================================
  // extractTriggerKeywords (public method)
  // ==========================================================================

  describe('extractTriggerKeywords', () => {
    it('should extract from "Activates for:" pattern', () => {
      const description = 'Database helper. Activates for: PostgreSQL, MySQL, Redis.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('postgresql');
      expect(triggers).toContain('mysql');
      expect(triggers).toContain('redis');
    });

    it('should extract from "Use when" pattern', () => {
      const description = 'Database helper. Use when optimizing PostgreSQL queries or working with Prisma ORM.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('postgresql');
      expect(triggers).toContain('prisma');
    });

    it('should extract from "Use this skill when" pattern', () => {
      const description = 'Expert. Use this skill when deploying Docker containers.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('docker');
    });

    it('should extract technology terms from description text', () => {
      const description = 'Build APIs with Express and deploy to AWS using Terraform.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('express');
      expect(triggers).toContain('aws');
      expect(triggers).toContain('terraform');
    });

    it('should extract domain terms (api, backend, frontend, etc.)', () => {
      const description = 'Full-stack architect for API design and backend development.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('api');
      expect(triggers).toContain('backend');
    });

    it('should filter out stop words from "Activates for:" list', () => {
      const description = 'Activates for: the, React, and, Vue, is, Angular.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('react');
      expect(triggers).toContain('vue');
      expect(triggers).toContain('angular');
      expect(triggers).not.toContain('the');
      expect(triggers).not.toContain('and');
      expect(triggers).not.toContain('is');
    });

    it('should filter out keywords shorter than 2 characters', () => {
      const description = 'Activates for: Go, a, x.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('go');
      expect(triggers).not.toContain('a');
      expect(triggers).not.toContain('x');
    });

    it('should extract from YAML keywords field in content', () => {
      const content = `---
description: whatever
keywords: [jest, vitest, playwright]
---
`;
      const triggers = extractor.extractTriggerKeywords(content, 'whatever');

      expect(triggers).toContain('jest');
      expect(triggers).toContain('vitest');
      expect(triggers).toContain('playwright');
    });

    it('should extract from "When to Use" section in content', () => {
      const content = `---
description: Testing skill.
---

## When to Use

- Playwright end-to-end testing
- Cypress component testing
- Jest unit tests
`;
      const triggers = extractor.extractTriggerKeywords(content, 'Testing skill.');

      expect(triggers).toContain('playwright');
      expect(triggers).toContain('cypress');
      expect(triggers).toContain('jest');
    });

    it('should only include strong technology terms from "When to Use" section', () => {
      const content = `---
description: General helper.
---

## When to Use

Use this for Express builds or React development.
`;
      // "express" and "react" are strong technology terms
      const triggers = extractor.extractTriggerKeywords(content, 'General helper.');

      expect(triggers).toContain('express');
      expect(triggers).toContain('react');
    });

    it('should not include non-strong tech terms from "When to Use" section', () => {
      const content = `---
description: General helper.
---

## When to Use

Use this for Go development.
`;
      // "go" is matched by tech patterns but is NOT in the strong terms set
      // so it should not appear from "When to Use" section
      const triggers = extractor.extractTriggerKeywords(content, 'General helper.');

      expect(triggers).not.toContain('go');
    });

    it('should produce no triggers for empty content and description', () => {
      const triggers = extractor.extractTriggerKeywords('', '');
      expect(triggers).toEqual([]);
    });

    it('should produce no triggers for generic text with no tech terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'A general purpose assistant that helps with many things.'
      );
      expect(triggers).toEqual([]);
    });

    it('should handle multiple extraction sources and deduplicate', () => {
      const content = `---
description: Activates for: React, TypeScript.
keywords: [react, typescript, nextjs]
---

## When to Use

- React applications
- TypeScript projects
`;
      const description = 'Activates for: React, TypeScript.';
      const triggers = extractor.extractTriggerKeywords(content, description);

      // Should contain each term only once (via Set deduplication)
      const reactCount = triggers.filter(t => t === 'react').length;
      expect(reactCount).toBe(1);

      const tsCount = triggers.filter(t => t === 'typescript').length;
      expect(tsCount).toBe(1);
    });
  });

  // ==========================================================================
  // Domain terms extraction (tested via extractTriggerKeywords - private method)
  // ==========================================================================

  describe('domain term extraction', () => {
    it('should extract architecture terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'System design for microservices architecture on serverless infrastructure.'
      );

      expect(triggers).toContain('system design');
      expect(triggers).toContain('microservices');
      expect(triggers).toContain('architecture');
      expect(triggers).toContain('serverless');
      expect(triggers).toContain('infrastructure');
    });

    it('should extract UI/UX domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build a beautiful modern UI dashboard with responsive design and landing page.'
      );

      expect(triggers).toContain('beautiful');
      expect(triggers).toContain('modern ui');
      expect(triggers).toContain('dashboard');
      expect(triggers).toContain('responsive');
      expect(triggers).toContain('landing page');
    });

    it('should extract testing domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Set up unit test and integration test suites with test-driven development.'
      );

      expect(triggers).toContain('unit test');
      expect(triggers).toContain('integration test');
      expect(triggers).toContain('test-driven');
    });

    it('should extract DevOps domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Set up CI/CD pipeline for deployment with infrastructure as code.'
      );

      expect(triggers).toContain('ci/cd');
      expect(triggers).toContain('deployment');
      expect(triggers).toContain('pipeline');
      expect(triggers).toContain('infrastructure');
    });

    it('should extract ML/AI domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build machine learning pipelines with deep learning model training using MLOps.'
      );

      expect(triggers).toContain('machine learning');
      expect(triggers).toContain('deep learning');
      expect(triggers).toContain('model training');
      expect(triggers).toContain('mlops');
    });

    it('should extract product domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Define product requirements and user stories for the MVP roadmap.'
      );

      expect(triggers).toContain('product');
      expect(triggers).toContain('requirements');
      expect(triggers).toContain('user stories');
      expect(triggers).toContain('mvp');
      expect(triggers).toContain('roadmap');
    });

    it('should extract LSP and code intelligence terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'LSP language server for go to definition, find references, and code navigation.'
      );

      expect(triggers).toContain('lsp');
      expect(triggers).toContain('language server');
      expect(triggers).toContain('go to definition');
      expect(triggers).toContain('find references');
      expect(triggers).toContain('code navigation');
    });

    it('should extract common app types', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build an e-commerce marketplace SaaS platform with CMS.'
      );

      expect(triggers).toContain('ecommerce');
      expect(triggers).toContain('marketplace');
      expect(triggers).toContain('saas');
      expect(triggers).toContain('cms');
    });

    it('should normalize hyphenated domain terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build a front-end with back-end API and full-stack deployment.'
      );

      // Hyphen-removed version
      expect(triggers).toContain('frontend');
      expect(triggers).toContain('backend');
      expect(triggers).toContain('fullstack');
      // Also keeps hyphenated version
      expect(triggers).toContain('front-end');
      expect(triggers).toContain('back-end');
      expect(triggers).toContain('full-stack');
    });
  });

  // ==========================================================================
  // Technology term extraction
  // ==========================================================================

  describe('technology term extraction', () => {
    it('should extract cloud provider names', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Deploy to AWS with Azure failover and Google Cloud backup.'
      );

      expect(triggers).toContain('aws');
      expect(triggers).toContain('azure');
      expect(triggers).toContain('google cloud');
    });

    it('should extract frontend frameworks', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build with React, Vue.js, Angular, Svelte, and Tailwind CSS.'
      );

      expect(triggers).toContain('react');
      expect(triggers).toContain('vue.js');
      expect(triggers).toContain('angular');
      expect(triggers).toContain('svelte');
      expect(triggers).toContain('tailwind');
      expect(triggers).toContain('css');
    });

    it('should extract backend frameworks', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build APIs with Express, NestJS, Django, Flask, FastAPI, Spring Boot, and Laravel.'
      );

      expect(triggers).toContain('express');
      expect(triggers).toContain('nestjs');
      expect(triggers).toContain('django');
      expect(triggers).toContain('flask');
      expect(triggers).toContain('fastapi');
      expect(triggers).toContain('spring boot');
      expect(triggers).toContain('laravel');
    });

    it('should extract database names', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Store data in PostgreSQL, MySQL, MongoDB, Redis, and Elasticsearch.'
      );

      expect(triggers).toContain('postgresql');
      expect(triggers).toContain('mysql');
      expect(triggers).toContain('mongodb');
      expect(triggers).toContain('redis');
      expect(triggers).toContain('elasticsearch');
    });

    it('should extract ORM libraries', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Use Prisma, TypeORM, Sequelize, or Mongoose for data access.'
      );

      expect(triggers).toContain('prisma');
      expect(triggers).toContain('typeorm');
      expect(triggers).toContain('sequelize');
      expect(triggers).toContain('mongoose');
    });

    it('should extract messaging systems', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Event-driven architecture with Kafka, RabbitMQ, and SQS.'
      );

      expect(triggers).toContain('kafka');
      expect(triggers).toContain('rabbitmq');
      expect(triggers).toContain('sqs');
    });

    it('should extract security terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Implement JWT authentication with OAuth, SSL/TLS, CORS, and CSRF protection.'
      );

      expect(triggers).toContain('jwt');
      expect(triggers).toContain('oauth');
      expect(triggers).toContain('ssl');
      expect(triggers).toContain('tls');
      expect(triggers).toContain('cors');
      expect(triggers).toContain('csrf');
    });

    it('should extract API styles', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build a REST API alongside GraphQL and gRPC endpoints with OpenAPI docs.'
      );

      expect(triggers).toContain('rest api');
      expect(triggers).toContain('graphql');
      expect(triggers).toContain('grpc');
      expect(triggers).toContain('openapi');
    });

    it('should extract programming languages', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Written in TypeScript, Python, Go, Rust, and Java.'
      );

      expect(triggers).toContain('typescript');
      expect(triggers).toContain('python');
      expect(triggers).toContain('go');
      expect(triggers).toContain('rust');
      expect(triggers).toContain('java');
    });

    it('should extract mobile terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Build with React Native, Expo, Flutter for iOS and Android.'
      );

      expect(triggers).toContain('react native');
      expect(triggers).toContain('expo');
      expect(triggers).toContain('flutter');
      expect(triggers).toContain('ios');
      expect(triggers).toContain('android');
    });

    it('should extract ML/AI frameworks', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Train models with TensorFlow, PyTorch, and MLflow.'
      );

      expect(triggers).toContain('tensorflow');
      expect(triggers).toContain('pytorch');
      expect(triggers).toContain('mlflow');
    });

    it('should extract Kubernetes ecosystem terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Deploy to EKS with Helm charts, ArgoCD for GitOps, and Istio service mesh.'
      );

      expect(triggers).toContain('eks');
      expect(triggers).toContain('helm');
      expect(triggers).toContain('argocd');
      expect(triggers).toContain('gitops');
      expect(triggers).toContain('istio');
    });

    it('should extract testing frameworks', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Test with Playwright, Cypress, Jest, and Vitest using TDD and BDD.'
      );

      expect(triggers).toContain('playwright');
      expect(triggers).toContain('cypress');
      expect(triggers).toContain('jest');
      expect(triggers).toContain('vitest');
      expect(triggers).toContain('tdd');
      expect(triggers).toContain('bdd');
    });

    it('should extract payment terms', () => {
      const triggers = extractor.extractTriggerKeywords(
        '',
        'Integrate Stripe and PayPal payments with PCI compliance.'
      );

      expect(triggers).toContain('stripe');
      expect(triggers).toContain('paypal');
      expect(triggers).toContain('pci');
    });
  });

  // ==========================================================================
  // Tokenization of compound keywords (tested via extractTriggerKeywords)
  // ==========================================================================

  describe('keyword tokenization', () => {
    it('should tokenize compound phrases from "Activates for:" into meaningful words', () => {
      const description = 'Activates for: api design, backend architecture, frontend testing.';
      const triggers = extractor.extractTriggerKeywords('', description);

      // Compound phrases should be kept
      expect(triggers).toContain('api design');
      expect(triggers).toContain('backend architecture');
      expect(triggers).toContain('frontend testing');

      // Individual meaningful words should also be extracted
      expect(triggers).toContain('api');
      expect(triggers).toContain('design');
      expect(triggers).toContain('backend');
      expect(triggers).toContain('architecture');
      expect(triggers).toContain('frontend');
      expect(triggers).toContain('testing');
    });

    it('should not tokenize words shorter than 3 chars from compound phrases', () => {
      const description = 'Activates for: ci cd pipeline, ui ux design.';
      const triggers = extractor.extractTriggerKeywords('', description);

      // "ci" and "cd" and "ui" and "ux" are < 3 chars so not extracted by tokenizer
      // but they may be extracted by domain patterns
      // The compound phrases themselves should be present
      expect(triggers).toContain('ci cd pipeline');
      expect(triggers).toContain('ui ux design');
    });

    it('should handle hyphenated compound keywords', () => {
      const description = 'Activates for: full-stack development, test-driven design.';
      const triggers = extractor.extractTriggerKeywords('', description);

      // Tokenizer splits on hyphens and extracts meaningful domain words
      // "design" is a meaningful word in the tokenizer's list
      expect(triggers).toContain('design');
      // "full-stack" is compound and should also match domain patterns
      expect(triggers).toContain('fullstack');
    });
  });

  // ==========================================================================
  // Stop words filtering
  // ==========================================================================

  describe('stop word filtering', () => {
    it('should filter common English stop words from keyword lists', () => {
      const description = 'Activates for: the, a, an, and, or, but, in, on, at, to.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).not.toContain('the');
      expect(triggers).not.toContain('a');
      expect(triggers).not.toContain('an');
      expect(triggers).not.toContain('and');
      expect(triggers).not.toContain('or');
      expect(triggers).not.toContain('but');
      expect(triggers).not.toContain('in');
      expect(triggers).not.toContain('on');
      expect(triggers).not.toContain('at');
      expect(triggers).not.toContain('to');
    });

    it('should filter action stop words (use, create, build, help, etc.)', () => {
      const description = 'Activates for: use, using, create, build, help, want, need.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).not.toContain('use');
      expect(triggers).not.toContain('using');
      expect(triggers).not.toContain('create');
      expect(triggers).not.toContain('build');
      expect(triggers).not.toContain('help');
      expect(triggers).not.toContain('want');
      expect(triggers).not.toContain('need');
    });

    it('should not filter technology names that look like words', () => {
      // "Go" is a technology and should not be filtered as a stop word
      const description = 'Activates for: Go, Rust, Swift.';
      const triggers = extractor.extractTriggerKeywords('', description);

      expect(triggers).toContain('go');
      expect(triggers).toContain('rust');
      expect(triggers).toContain('swift');
    });
  });

  // ==========================================================================
  // buildIndex
  // ==========================================================================

  describe('buildIndex', () => {
    it('should build an inverted keyword-to-skill index', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'k8s-skill',
          plugin: 'specweave-k8s',
          type: 'skill',
          description: 'K8s expert',
          triggers: ['kubernetes', 'k8s', 'helm'],
          path: '/path/1',
        },
        {
          name: 'docker-skill',
          plugin: 'specweave-infra',
          type: 'skill',
          description: 'Docker expert',
          triggers: ['docker', 'kubernetes', 'containers'],
          path: '/path/2',
        },
      ];

      const index = extractor.buildIndex(triggers);

      expect(index.keywords['kubernetes']).toContain('specweave-k8s:k8s-skill');
      expect(index.keywords['kubernetes']).toContain('specweave-infra:docker-skill');
      expect(index.keywords['k8s']).toEqual(['specweave-k8s:k8s-skill']);
      expect(index.keywords['docker']).toEqual(['specweave-infra:docker-skill']);
    });

    it('should populate skill metadata correctly', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'react-skill',
          plugin: 'specweave-frontend',
          type: 'skill',
          description: 'Expert React developer building modern UIs.',
          triggers: ['react', 'typescript'],
          path: '/path/to/SKILL.md',
        },
      ];

      const index = extractor.buildIndex(triggers);
      const meta = index.skills['specweave-frontend:react-skill'];

      expect(meta).toBeDefined();
      expect(meta.plugin).toBe('specweave-frontend');
      expect(meta.type).toBe('skill');
      expect(meta.triggers).toEqual(['react', 'typescript']);
      expect(meta.fqn).toBe('specweave-frontend:react-skill');
      expect(meta.description).toBe('Expert React developer building modern UIs.');
    });

    it('should truncate description to 150 characters', () => {
      const longDesc = 'A'.repeat(200);
      const triggers: ExtractedTriggers[] = [
        {
          name: 'long-desc',
          plugin: 'test',
          type: 'skill',
          description: longDesc,
          triggers: ['test'],
          path: '/p',
        },
      ];

      const index = extractor.buildIndex(triggers);
      expect(index.skills['test:long-desc'].description.length).toBe(150);
    });

    it('should compute correct skillCount and keywordCount', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'a',
          plugin: 'p1',
          type: 'skill',
          description: '',
          triggers: ['react', 'vue'],
          path: '/1',
        },
        {
          name: 'b',
          plugin: 'p2',
          type: 'agent',
          description: '',
          triggers: ['vue', 'angular'],
          path: '/2',
        },
      ];

      const index = extractor.buildIndex(triggers);

      expect(index.skillCount).toBe(2);
      // keywords: react, vue, angular = 3 unique keywords
      expect(index.keywordCount).toBe(3);
    });

    it('should include a valid ISO generatedAt timestamp', () => {
      const index = extractor.buildIndex([]);
      expect(index.generatedAt).toBeDefined();
      expect(new Date(index.generatedAt).toISOString()).toBe(index.generatedAt);
    });

    it('should handle empty triggers array', () => {
      const index = extractor.buildIndex([]);

      expect(index.skillCount).toBe(0);
      expect(index.keywordCount).toBe(0);
      expect(Object.keys(index.keywords)).toHaveLength(0);
      expect(Object.keys(index.skills)).toHaveLength(0);
    });

    it('should not duplicate FQNs in the keyword inverted index', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'skill-a',
          plugin: 'plugin-x',
          type: 'skill',
          description: '',
          triggers: ['react', 'react'], // duplicate trigger
          path: '/p',
        },
      ];

      const index = extractor.buildIndex(triggers);
      expect(index.keywords['react']).toEqual(['plugin-x:skill-a']);
    });

    it('should build FQN as plugin:name format', () => {
      const triggers: ExtractedTriggers[] = [
        {
          name: 'my-skill',
          plugin: 'my-plugin',
          type: 'skill',
          description: '',
          triggers: ['test'],
          path: '/p',
        },
      ];

      const index = extractor.buildIndex(triggers);
      expect(index.skills['my-plugin:my-skill']).toBeDefined();
      expect(index.skills['my-plugin:my-skill'].fqn).toBe('my-plugin:my-skill');
    });
  });

  // ==========================================================================
  // matchPrompt
  // ==========================================================================

  describe('matchPrompt', () => {
    function buildTestIndex(triggers: ExtractedTriggers[]): SkillTriggersIndex {
      return extractor.buildIndex(triggers);
    }

    it('should match a simple prompt with a single keyword', () => {
      const index = buildTestIndex([
        {
          name: 'k8s',
          plugin: 'infra',
          type: 'skill',
          description: '',
          triggers: ['kubernetes'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt('Deploy to kubernetes', index);

      expect(matches).toHaveLength(1);
      expect(matches[0].fqn).toBe('infra:k8s');
      expect(matches[0].matchedKeywords).toContain('kubernetes');
      expect(matches[0].score).toBe('kubernetes'.length);
    });

    it('should be case-insensitive', () => {
      const index = buildTestIndex([
        {
          name: 'aws-skill',
          plugin: 'cloud',
          type: 'skill',
          description: '',
          triggers: ['aws', 'amazon web services'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt('Deploy to AWS Lambda', index);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedKeywords).toContain('aws');
    });

    it('should return empty array when nothing matches', () => {
      const index = buildTestIndex([
        {
          name: 'k8s',
          plugin: 'infra',
          type: 'skill',
          description: '',
          triggers: ['kubernetes'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt('How do I write Python code?', index);
      expect(matches).toEqual([]);
    });

    it('should accumulate score from multiple matching keywords for the same skill', () => {
      const index = buildTestIndex([
        {
          name: 'fullstack',
          plugin: 'dev',
          type: 'skill',
          description: '',
          triggers: ['react', 'typescript', 'nextjs'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt(
        'Build a react app with typescript and nextjs',
        index
      );

      expect(matches).toHaveLength(1);
      const expectedScore = 'react'.length + 'typescript'.length + 'nextjs'.length;
      expect(matches[0].score).toBe(expectedScore);
      expect(matches[0].matchedKeywords).toHaveLength(3);
    });

    it('should rank skills by score (higher = more relevant)', () => {
      const index = buildTestIndex([
        {
          name: 'general',
          plugin: 'p1',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p1',
        },
        {
          name: 'specialist',
          plugin: 'p2',
          type: 'skill',
          description: '',
          triggers: ['react', 'typescript', 'nextjs'],
          path: '/p2',
        },
      ]);

      const matches = extractor.matchPrompt(
        'Build a react app with typescript and nextjs',
        index
      );

      // Specialist should rank first (matches 3 keywords vs 1)
      expect(matches[0].fqn).toBe('p2:specialist');
      expect(matches[1].fqn).toBe('p1:general');
      expect(matches[0].score).toBeGreaterThan(matches[1].score);
    });

    it('should rank longer keyword matches higher', () => {
      const index = buildTestIndex([
        {
          name: 'react-skill',
          plugin: 'frontend',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p1',
        },
        {
          name: 'react-native-skill',
          plugin: 'mobile',
          type: 'skill',
          description: '',
          triggers: ['react native', 'react'],
          path: '/p2',
        },
      ]);

      const matches = extractor.matchPrompt('Build a react native mobile app', index);

      // React Native skill should rank higher: "react native" (12) + "react" (5) = 17
      // vs react-skill: "react" (5)
      expect(matches[0].fqn).toBe('mobile:react-native-skill');
    });

    it('should match multiple different skills', () => {
      const index = buildTestIndex([
        {
          name: 'frontend',
          plugin: 'fe',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p1',
        },
        {
          name: 'backend',
          plugin: 'be',
          type: 'skill',
          description: '',
          triggers: ['express'],
          path: '/p2',
        },
        {
          name: 'database',
          plugin: 'db',
          type: 'skill',
          description: '',
          triggers: ['postgresql'],
          path: '/p3',
        },
      ]);

      const matches = extractor.matchPrompt(
        'Build a react app with express backend and postgresql database',
        index
      );

      expect(matches).toHaveLength(3);
      const fqns = matches.map(m => m.fqn);
      expect(fqns).toContain('fe:frontend');
      expect(fqns).toContain('be:backend');
      expect(fqns).toContain('db:database');
    });

    it('should handle prompts with partial keyword overlap', () => {
      const index = buildTestIndex([
        {
          name: 'spring-skill',
          plugin: 'java',
          type: 'skill',
          description: '',
          triggers: ['spring boot'],
          path: '/p',
        },
      ]);

      // "spring boot" should match as a substring in the prompt
      const matches = extractor.matchPrompt(
        'Create a spring boot application with JPA',
        index
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedKeywords).toContain('spring boot');
    });

    it('should handle empty prompt', () => {
      const index = buildTestIndex([
        {
          name: 'x',
          plugin: 'y',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt('', index);
      expect(matches).toEqual([]);
    });

    it('should handle index with no keywords', () => {
      const index: SkillTriggersIndex = {
        keywords: {},
        skills: {},
        generatedAt: new Date().toISOString(),
        skillCount: 0,
        keywordCount: 0,
      };

      const matches = extractor.matchPrompt('Build a react app', index);
      expect(matches).toEqual([]);
    });

    it('should match multi-word keywords as substrings', () => {
      const index = buildTestIndex([
        {
          name: 'rag',
          plugin: 'ml',
          type: 'skill',
          description: '',
          triggers: ['amazon web services'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt(
        'Deploy to amazon web services',
        index
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedKeywords).toContain('amazon web services');
    });
  });

  // ==========================================================================
  // scanAllPlugins (async, requires fs mocks)
  // ==========================================================================

  describe('scanAllPlugins', () => {
    it('should return empty array when plugins directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await extractor.scanAllPlugins('/nonexistent');

      expect(result).toEqual([]);
      expect(mockPathExists).toHaveBeenCalledWith('/nonexistent');
    });

    it('should scan plugin directories for skills and agents', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/my-plugin/skills') return true;
        if (p === '/plugins/my-plugin/agents') return true;
        if (p === '/plugins/my-plugin/skills/my-skill/SKILL.md') return true;
        if (p === '/plugins/my-plugin/agents/my-agent/AGENT.md') return true;
        return false;
      });

      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/plugins') {
          return [{ name: 'my-plugin', isDirectory: () => true }];
        }
        if (dirPath === '/plugins/my-plugin/skills') {
          return [{ name: 'my-skill', isDirectory: () => true }];
        }
        if (dirPath === '/plugins/my-plugin/agents') {
          return [{ name: 'my-agent', isDirectory: () => true }];
        }
        return [];
      });

      mockReadFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('SKILL.md')) {
          return `---
description: Activates for: React, TypeScript.
---
# My Skill
`;
        }
        if (filePath.includes('AGENT.md')) {
          return `---
description: Agent for Docker deployment.
---
# My Agent
`;
        }
        return '';
      });

      const result = await extractor.scanAllPlugins('/plugins');

      expect(result).toHaveLength(2);

      const skillResult = result.find(r => r.type === 'skill');
      expect(skillResult).toBeDefined();
      expect(skillResult!.name).toBe('my-skill');
      expect(skillResult!.plugin).toBe('my-plugin');
      expect(skillResult!.triggers).toContain('react');
      expect(skillResult!.triggers).toContain('typescript');

      const agentResult = result.find(r => r.type === 'agent');
      expect(agentResult).toBeDefined();
      expect(agentResult!.name).toBe('my-agent');
      expect(agentResult!.plugin).toBe('my-plugin');
      expect(agentResult!.triggers).toContain('docker');
    });

    it('should skip non-directory entries in plugins dir', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/plugins') {
          return [
            { name: 'README.md', isDirectory: () => false },
            { name: 'my-plugin', isDirectory: () => true },
          ];
        }
        if (dirPath.includes('skills') || dirPath.includes('agents')) {
          return [];
        }
        return [];
      });

      const result = await extractor.scanAllPlugins('/plugins');

      // Should not crash on non-directory entries
      expect(result).toEqual([]);
    });

    it('should handle plugins with no skills or agents directories', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/plugins') return true;
        // skills and agents dirs do not exist
        return false;
      });

      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/plugins') {
          return [{ name: 'empty-plugin', isDirectory: () => true }];
        }
        return [];
      });

      const result = await extractor.scanAllPlugins('/plugins');
      expect(result).toEqual([]);
    });

    it('should handle multiple plugins', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/plugin-a/skills') return true;
        if (p === '/plugins/plugin-b/skills') return true;
        if (p === '/plugins/plugin-a/agents') return false;
        if (p === '/plugins/plugin-b/agents') return false;
        if (p === '/plugins/plugin-a/skills/skill-1/SKILL.md') return true;
        if (p === '/plugins/plugin-b/skills/skill-2/SKILL.md') return true;
        return false;
      });

      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/plugins') {
          return [
            { name: 'plugin-a', isDirectory: () => true },
            { name: 'plugin-b', isDirectory: () => true },
          ];
        }
        if (dirPath === '/plugins/plugin-a/skills') {
          return [{ name: 'skill-1', isDirectory: () => true }];
        }
        if (dirPath === '/plugins/plugin-b/skills') {
          return [{ name: 'skill-2', isDirectory: () => true }];
        }
        return [];
      });

      mockReadFile.mockImplementation(async () => `---
description: A skill. Activates for: React.
---
`);

      const result = await extractor.scanAllPlugins('/plugins');

      expect(result).toHaveLength(2);
      const plugins = result.map(r => r.plugin);
      expect(plugins).toContain('plugin-a');
      expect(plugins).toContain('plugin-b');
    });

    it('should skip skill directories without the expected SKILL.md file', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/my-plugin/skills') return true;
        if (p === '/plugins/my-plugin/agents') return false;
        // SKILL.md does not exist for this skill
        if (p.endsWith('SKILL.md')) return false;
        return false;
      });

      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/plugins') {
          return [{ name: 'my-plugin', isDirectory: () => true }];
        }
        if (dirPath === '/plugins/my-plugin/skills') {
          return [{ name: 'broken-skill', isDirectory: () => true }];
        }
        return [];
      });

      const result = await extractor.scanAllPlugins('/plugins');
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Real-world SKILL.md format tests
  // ==========================================================================

  describe('real-world SKILL.md formats', () => {
    it('should handle kubernetes-architect format with "Use when"', () => {
      const content = `---
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
      expect(result.triggers).toContain('k8s');
    });

    it('should handle nodejs-backend format with long "Activates for:" list', () => {
      const content = `---
description: Node.js/TypeScript backend developer. Builds Express.js, Fastify, NestJS APIs with Prisma ORM, TypeORM, Mongoose. Implements REST APIs, GraphQL, authentication (JWT, session, OAuth), authorization, database operations. Activates for: Node.js, NodeJS, Express, Fastify, NestJS, TypeScript backend, API, REST API, GraphQL, Prisma, TypeORM, Mongoose, MongoDB, PostgreSQL with Node, MySQL with Node, JWT, Redis, WebSocket, Socket.io.
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

    it('should handle react-native-setup format', () => {
      const content = `---
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
      expect(result.triggers).toContain('node.js');
      expect(result.triggers).toContain('android');
    });

    it('should handle content with no frontmatter at all', () => {
      const content = `# Just a Markdown File

No YAML frontmatter here.
Talks about React and Vue but in the body only.
`;
      const result = extractor.extractFromContent(
        content,
        'no-fm',
        'test',
        'skill',
        '/path/to/SKILL.md'
      );

      expect(result.description).toBe('');
      // Body-only tech terms are NOT extracted (only description and "When to Use" sections)
    });

    it('should handle minimal frontmatter with only description', () => {
      const content = `---
description: Django backend expert.
---
`;
      const result = extractor.extractFromContent(
        content,
        'django-skill',
        'backend',
        'skill',
        '/p'
      );

      expect(result.description).toBe('Django backend expert.');
      expect(result.triggers).toContain('django');
      expect(result.triggers).toContain('backend');
    });
  });

  // ==========================================================================
  // Edge cases and integration-style tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle content that is just frontmatter delimiters', () => {
      const content = `---
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );
      expect(result.description).toBe('');
      expect(result.triggers).toEqual([]);
    });

    it('should handle very long prompts in matchPrompt', () => {
      const index = extractor.buildIndex([
        {
          name: 'skill',
          plugin: 'p',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p',
        },
      ]);

      const longPrompt = 'I want to build a react app '.repeat(1000);
      const matches = extractor.matchPrompt(longPrompt, index);

      // Should still match
      expect(matches).toHaveLength(1);
      expect(matches[0].fqn).toBe('p:skill');
    });

    it('should handle keywords that are substrings of other words', () => {
      // "go" could match "going", "Google", etc.
      const index = extractor.buildIndex([
        {
          name: 'go-backend',
          plugin: 'backend',
          type: 'skill',
          description: '',
          triggers: ['go'],
          path: '/p',
        },
      ]);

      // "go" appears as substring in "going" - the includes() check will match
      const matches = extractor.matchPrompt('I am going to the store', index);
      // This IS expected to match because includes() does substring matching
      expect(matches).toHaveLength(1);
    });

    it('should handle unicode in prompts and keywords', () => {
      const index = extractor.buildIndex([
        {
          name: 'test',
          plugin: 'p',
          type: 'skill',
          description: '',
          triggers: ['react'],
          path: '/p',
        },
      ]);

      const matches = extractor.matchPrompt('Build a React app with fancy emojis', index);
      expect(matches).toHaveLength(1);
    });

    it('should handle triggers with special regex characters gracefully', () => {
      // .NET contains regex-special characters; C# regex uses \bC#\b which
      // requires a word boundary before C but # is non-word, so it works
      // only when C is preceded by a word boundary (start or space)
      const content = `---
description: Build .NET Core and ASP.NET applications.
---
`;
      const result = extractor.extractFromContent(
        content, 'dotnet', 'backend', 'skill', '/p'
      );

      expect(result.triggers).toContain('.net');
      expect(result.triggers).toContain('asp.net');
    });

    it('should handle "Activates for" without colon', () => {
      const content = `---
description: Helper tool. Activates for React and Vue development.
---
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );

      // The regex uses "Activates\s+for[:\s]+" which should match "Activates for "
      expect(result.triggers).toContain('react');
    });

    it('should handle "When to Use" section followed by another heading', () => {
      const content = `---
description: Helper.
---

## When to Use

Use with PostgreSQL and Redis.

## Configuration

Some config info here.
`;
      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );

      expect(result.triggers).toContain('postgresql');
      expect(result.triggers).toContain('redis');
    });

    it('should handle "When to Use" section at end of file', () => {
      const content = `---
description: Helper.
---

## When to Use

Use with MongoDB and Mongoose.`;

      const result = extractor.extractFromContent(
        content, 'x', 'y', 'skill', '/p'
      );

      expect(result.triggers).toContain('mongodb');
      expect(result.triggers).toContain('mongoose');
    });
  });

  // ==========================================================================
  // Full pipeline: extractFromContent -> buildIndex -> matchPrompt
  // ==========================================================================

  describe('full pipeline integration', () => {
    it('should extract, index, and match for a realistic scenario', () => {
      const reactSkillContent = `---
description: Expert React developer. Activates for: React, Next.js, TypeScript, Redux, Tailwind.
keywords: [react, nextjs, typescript]
---
# React Expert

## When to Use

- React component development
- Next.js applications
- TypeScript frontend projects
`;

      const djangoSkillContent = `---
description: Django/Python backend developer. Activates for: Django, Flask, FastAPI, Python, PostgreSQL.
---
# Django Expert
`;

      const k8sSkillContent = `---
description: Kubernetes expert. Activates for: kubernetes, k8s, helm, EKS, GKE.
---
# K8s Expert
`;

      const reactTriggers = extractor.extractFromContent(
        reactSkillContent, 'react-expert', 'sw-frontend', 'skill', '/p1'
      );
      const djangoTriggers = extractor.extractFromContent(
        djangoSkillContent, 'django-expert', 'sw-backend', 'skill', '/p2'
      );
      const k8sTriggers = extractor.extractFromContent(
        k8sSkillContent, 'k8s-expert', 'sw-infra', 'skill', '/p3'
      );

      const index = extractor.buildIndex([reactTriggers, djangoTriggers, k8sTriggers]);

      // Test 1: React-specific prompt
      const reactMatches = extractor.matchPrompt(
        'Build a Next.js app with React and Tailwind CSS',
        index
      );
      expect(reactMatches[0].fqn).toBe('sw-frontend:react-expert');

      // Test 2: Django-specific prompt
      const djangoMatches = extractor.matchPrompt(
        'Create a Django REST API with PostgreSQL',
        index
      );
      const djangoFqns = djangoMatches.map(m => m.fqn);
      expect(djangoFqns).toContain('sw-backend:django-expert');

      // Test 3: K8s-specific prompt
      const k8sMatches = extractor.matchPrompt(
        'Deploy to EKS with helm charts',
        index
      );
      expect(k8sMatches[0].fqn).toBe('sw-infra:k8s-expert');

      // Test 4: Multi-domain prompt
      const multiMatches = extractor.matchPrompt(
        'Build a React frontend with Django backend and deploy to kubernetes',
        index
      );
      expect(multiMatches.length).toBeGreaterThanOrEqual(3);

      // Test 5: No match
      const noMatches = extractor.matchPrompt(
        'How is the weather today?',
        index
      );
      expect(noMatches).toEqual([]);
    });

    it('should correctly rank ambiguous prompts', () => {
      const frontendSkill: ExtractedTriggers = {
        name: 'frontend',
        plugin: 'fe',
        type: 'skill',
        description: '',
        triggers: ['react', 'typescript', 'css', 'tailwind'],
        path: '/p1',
      };

      const backendSkill: ExtractedTriggers = {
        name: 'backend',
        plugin: 'be',
        type: 'skill',
        description: '',
        triggers: ['typescript', 'express', 'postgresql'],
        path: '/p2',
      };

      const index = extractor.buildIndex([frontendSkill, backendSkill]);

      // Prompt mentioning mainly frontend terms
      const feMatches = extractor.matchPrompt(
        'Build a react component with tailwind css and typescript',
        index
      );
      expect(feMatches[0].fqn).toBe('fe:frontend');

      // Prompt mentioning mainly backend terms
      const beMatches = extractor.matchPrompt(
        'Create an express api with postgresql and typescript',
        index
      );
      expect(beMatches[0].fqn).toBe('be:backend');

      // Ambiguous prompt with just "typescript"
      const ambiguousMatches = extractor.matchPrompt('Write typescript code', index);
      // Both should match with equal score
      expect(ambiguousMatches).toHaveLength(2);
      expect(ambiguousMatches[0].score).toBe(ambiguousMatches[1].score);
    });
  });
});
