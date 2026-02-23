/**
 * Trigger Activation Tests for New Skills (Increment 0191)
 *
 * Verifies that the 25 new skills are properly triggered by realistic user prompts.
 * Uses the SkillTriggerExtractor to extract keywords from actual SKILL.md files
 * and validates that prompt matching activates the correct skills.
 *
 * Updated for v1.0.315 migration: domain skills moved to vskill repo.
 * - specweave-mobile → mobile (vskill repo)
 * - specweave-ml → ml (vskill repo)
 * - specweave-backend → backend (vskill repo)
 * - specweave-infrastructure → infra (vskill repo)
 * - specweave-desktop, specweave-blockchain → stayed in specweave repo
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  SkillTriggerExtractor,
  ExtractedTriggers,
} from '../../../../src/core/plugins/skill-trigger-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');
const specweavePluginsDir = join(projectRoot, 'plugins');

// vskill repo plugins directory (sibling repo in umbrella)
const vskillPluginsDir = join(projectRoot, '..', 'vskill', 'plugins');

// Skills that migrated to vskill repo (v1.0.315)
const VSKILL_SKILLS: Record<string, string[]> = {
  'mobile': [
    'swiftui',
    'jetpack-compose',
    'flutter',
    'expo',
    'mobile-testing',
    'deep-linking-push',
    'capacitor-ionic',
  ],
  'ml': [
    'langchain-agents',
    'rag-vectordb',
    'llm-fine-tuning',
    'huggingface',
    'edge-ml',
  ],
  'backend': ['go-backend', 'java-spring', 'rust-backend', 'graphql'],
  'infra': [
    'terraform-opentofu',
    'opentelemetry',
    'github-actions',
    'devsecops',
    'secret-management',
    'azure-bicep-aks',
    'aws-deep-dive',
  ],
};

// Skills that stayed in specweave repo
const SPECWEAVE_SKILLS: Record<string, string[]> = {
  'specweave-desktop': ['electron'],
  'specweave-blockchain': ['blockchain'],
};

describe('New Skills Trigger Activation (Increment 0191)', () => {
  let extractor: SkillTriggerExtractor;
  let allTriggers: ExtractedTriggers[];
  let index: ReturnType<SkillTriggerExtractor['buildIndex']>;

  beforeAll(() => {
    extractor = new SkillTriggerExtractor();
    allTriggers = [];

    // Extract triggers from vskill repo skills
    for (const [plugin, skills] of Object.entries(VSKILL_SKILLS)) {
      for (const skill of skills) {
        const skillPath = join(vskillPluginsDir, plugin, 'skills', skill, 'SKILL.md');
        if (!existsSync(skillPath)) continue;

        const content = readFileSync(skillPath, 'utf-8');
        const result = extractor.extractFromContent(
          content,
          skill,
          plugin,
          'skill',
          skillPath
        );
        allTriggers.push(result);
      }
    }

    // Extract triggers from specweave repo skills (desktop, blockchain)
    for (const [plugin, skills] of Object.entries(SPECWEAVE_SKILLS)) {
      for (const skill of skills) {
        const skillPath = join(specweavePluginsDir, plugin, 'skills', skill, 'SKILL.md');
        if (!existsSync(skillPath)) continue;

        const content = readFileSync(skillPath, 'utf-8');
        const result = extractor.extractFromContent(
          content,
          skill,
          plugin,
          'skill',
          skillPath
        );
        allTriggers.push(result);
      }
    }

    // Build the inverted index
    index = extractor.buildIndex(allTriggers);
  });

  describe('Trigger Extraction', () => {
    it('should extract triggers from all 25 new skills', () => {
      expect(allTriggers.length).toBe(25);
    });

    it('every skill should have at least 2 triggers', () => {
      for (const trigger of allTriggers) {
        expect(
          trigger.triggers.length,
          `${trigger.plugin}:${trigger.name} has ${trigger.triggers.length} triggers (need at least 2)`
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it('should build an index with all skills', () => {
      expect(index.skillCount).toBe(25);
    });
  });

  describe('Mobile Skills Activation', () => {
    it('SwiftUI: "Build an iOS app with SwiftUI and SwiftData"', () => {
      const matches = extractor.matchPrompt(
        'Build an iOS app with SwiftUI and SwiftData',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:swiftui');
    });

    it('Jetpack Compose: "Create an Android app using Jetpack Compose with Material Design 3"', () => {
      const matches = extractor.matchPrompt(
        'Create an Android app using Jetpack Compose with Material Design 3',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:jetpack-compose');
    });

    it('Flutter: "Build a cross-platform app with Flutter and Riverpod"', () => {
      const matches = extractor.matchPrompt(
        'Build a cross-platform app with Flutter and Riverpod',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:flutter');
    });

    it('Expo: "Set up a React Native project with Expo Router"', () => {
      const matches = extractor.matchPrompt(
        'Set up a React Native project with Expo Router',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:expo');
    });

    it('Mobile Testing: "Write UI tests for the Android app using Espresso"', () => {
      const matches = extractor.matchPrompt(
        'Write UI tests for the Android app using Espresso',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:mobile-testing');
    });

    it('Deep Linking: "Set up Universal Links and push notifications for iOS"', () => {
      const matches = extractor.matchPrompt(
        'Set up Universal Links and push notifications for iOS',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:deep-linking-push');
    });

    it('Capacitor: "Convert our web app to mobile using Capacitor and Ionic"', () => {
      const matches = extractor.matchPrompt(
        'Convert our web app to mobile using Capacitor and Ionic',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('mobile:capacitor-ionic');
    });
  });

  describe('AI/ML Skills Activation', () => {
    it('LangChain: "Build an AI agent using LangChain with tool calling"', () => {
      const matches = extractor.matchPrompt(
        'Build an AI agent using LangChain with tool calling',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('ml:langchain-agents');
    });

    it('RAG: "Implement RAG with Pinecone vector database"', () => {
      const matches = extractor.matchPrompt(
        'Implement RAG with Pinecone vector database',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('ml:rag-vectordb');
    });

    it('Fine-tuning: "Fine-tune an LLM using LoRA and QLoRA"', () => {
      const matches = extractor.matchPrompt(
        'Fine-tune an LLM using LoRA and QLoRA',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('ml:llm-fine-tuning');
    });

    it('Hugging Face: "Deploy a model from Hugging Face Hub with TGI"', () => {
      const matches = extractor.matchPrompt(
        'Deploy a model from Hugging Face Hub with TGI',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('ml:huggingface');
    });

    it('Edge ML: "Convert a PyTorch model to Core ML for iOS"', () => {
      const matches = extractor.matchPrompt(
        'Convert a PyTorch model to Core ML for iOS',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('ml:edge-ml');
    });
  });

  describe('Backend Skills Activation', () => {
    it('Go: "Build a REST API in Go using Gin and sqlx"', () => {
      const matches = extractor.matchPrompt(
        'Build a REST API in Go using Gin and sqlx',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('backend:go-backend');
    });

    it('Java/Spring: "Create a Spring Boot 3 application with JPA and Security"', () => {
      const matches = extractor.matchPrompt(
        'Create a Spring Boot 3 application with JPA and Security',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('backend:java-spring');
    });

    it('Rust: "Build a web service with Axum and SQLx in Rust"', () => {
      const matches = extractor.matchPrompt(
        'Build a web service with Axum and SQLx in Rust',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('backend:rust-backend');
    });

    it('GraphQL: "Set up a GraphQL API with Apollo Server and federation"', () => {
      const matches = extractor.matchPrompt(
        'Set up a GraphQL API with Apollo Server and federation',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('backend:graphql');
    });
  });

  describe('Infrastructure Skills Activation', () => {
    it('Terraform: "Write Terraform modules for AWS VPC and EKS"', () => {
      const matches = extractor.matchPrompt(
        'Write Terraform modules for AWS VPC and EKS',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:terraform-opentofu');
    });

    it('OpenTelemetry: "Set up distributed tracing with OpenTelemetry Collector"', () => {
      const matches = extractor.matchPrompt(
        'Set up distributed tracing with OpenTelemetry Collector',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:opentelemetry');
    });

    it('GitHub Actions: "Create a CI/CD pipeline with GitHub Actions and OIDC"', () => {
      const matches = extractor.matchPrompt(
        'Create a CI/CD pipeline with GitHub Actions and OIDC',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:github-actions');
    });

    it('DevSecOps: "Add container scanning with Trivy to our pipeline"', () => {
      const matches = extractor.matchPrompt(
        'Add container scanning with Trivy to our pipeline',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:devsecops');
    });

    it('Secret Management: "Set up HashiCorp Vault with External Secrets Operator"', () => {
      const matches = extractor.matchPrompt(
        'Set up HashiCorp Vault with External Secrets Operator',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:secret-management');
    });

    it('Azure: "Deploy an AKS cluster with Bicep and Managed Identity"', () => {
      const matches = extractor.matchPrompt(
        'Deploy an AKS cluster with Bicep and Managed Identity',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:azure-bicep-aks');
    });

    it('AWS: "Create AWS CDK stacks for Lambda and API Gateway"', () => {
      const matches = extractor.matchPrompt(
        'Create AWS CDK stacks for Lambda and API Gateway',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('infra:aws-deep-dive');
    });
  });

  describe('Desktop & Other Skills Activation', () => {
    it('Electron: "Build a desktop app with Electron and auto-updates"', () => {
      const matches = extractor.matchPrompt(
        'Build a desktop app with Electron and auto-updates',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('specweave-desktop:electron');
    });

    it('Blockchain: "Write a Solidity smart contract with Hardhat"', () => {
      const matches = extractor.matchPrompt(
        'Write a Solidity smart contract with Hardhat',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      expect(fqns).toContain('specweave-blockchain:blockchain');
    });
  });

  describe('Cross-Domain Prompt Matching', () => {
    it('should match multiple skills for a multi-stack prompt', () => {
      const matches = extractor.matchPrompt(
        'Build a Flutter mobile app with a Go backend and deploy to AWS with Terraform',
        index
      );

      const fqns = matches.map((m) => m.fqn);
      // Should match at least 2 domains
      const domains = new Set(fqns.map((f) => f.split(':')[0]));
      expect(domains.size).toBeGreaterThanOrEqual(2);
    });

    it('should match OpenTelemetry for tracing prompts', () => {
      const matches = extractor.matchPrompt(
        'Set up OpenTelemetry distributed tracing with Jaeger backend',
        index
      );
      const fqns = matches.map((m) => m.fqn);

      // OpenTelemetry skill should be in the matches
      expect(fqns).toContain('infra:opentelemetry');
    });
  });
});
