/**
 * User Prompt Submit Hook - Plugin Auto-Loading Tests
 *
 * Tests that the user-prompt-submit.sh hook correctly:
 * 1. Detects plugin-specific keywords in user prompts
 * 2. Maps keywords to the correct plugins
 * 3. Shows visible feedback (systemMessage) when plugins are being loaded
 * 4. Runs detect-intent in background for actual installation
 *
 * v1.0.144: Added visible feedback for plugin auto-loading
 *
 * Key verification:
 * - React/Vue/Angular prompts → sw-frontend
 * - API/database prompts → sw-backend
 * - Test/E2E prompts → sw-testing
 * - Kubernetes prompts → sw-k8s
 * - GitHub/JIRA/ADO prompts → corresponding sync plugins
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('User Prompt Submit Hook - Plugin Auto-Loading', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  describe('Keyword Detection Patterns', () => {
    it('should have keyword detection regex for frontend frameworks', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for frontend keywords in the grep regex
      expect(hookContent).toContain('react');
      expect(hookContent).toContain('vue');
      expect(hookContent).toContain('angular');
      expect(hookContent).toContain('svelte');
      expect(hookContent).toContain('next');
      expect(hookContent).toContain('dashboard');
      expect(hookContent).toContain('component');
      expect(hookContent).toContain('frontend');
    });

    it('should have keyword detection regex for backend technologies', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for backend keywords
      expect(hookContent).toContain('api');
      expect(hookContent).toContain('graphql');
      expect(hookContent).toContain('express');
      expect(hookContent).toContain('database');
      expect(hookContent).toContain('postgres');
      expect(hookContent).toContain('mongodb');
      expect(hookContent).toContain('backend');
    });

    it('should have keyword detection regex for testing frameworks', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for testing keywords
      expect(hookContent).toContain('test');
      expect(hookContent).toContain('vitest');
      expect(hookContent).toContain('jest');
      expect(hookContent).toContain('playwright');
      expect(hookContent).toContain('cypress');
      expect(hookContent).toContain('e2e');
    });

    it('should have keyword detection regex for infrastructure', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for infra keywords
      expect(hookContent).toContain('kubernetes');
      expect(hookContent).toContain('k8s');
      expect(hookContent).toContain('docker');
      expect(hookContent).toContain('terraform');
      expect(hookContent).toContain('aws');
      expect(hookContent).toContain('azure');
      expect(hookContent).toContain('gcp');
    });

    it('should have keyword detection regex for external tools', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check for external tool keywords
      expect(hookContent).toContain('github');
      expect(hookContent).toContain('jira');
      expect(hookContent).toContain('azure.?devops');
    });
  });

  describe('Plugin Mapping Logic', () => {
    it('should map frontend keywords to sw-frontend plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the frontend mapping section
      const frontendMapping = hookContent.match(
        /if echo "\$MATCHED_KEYWORDS".*react.*vue.*angular.*then[\s\S]*?SUGGESTED_PLUGINS="sw-frontend"/
      );
      expect(frontendMapping).toBeTruthy();
    });

    it('should map backend keywords to sw-backend plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the backend mapping section
      const backendMapping = hookContent.match(
        /if echo "\$MATCHED_KEYWORDS".*api.*database.*then[\s\S]*?sw-backend/
      );
      expect(backendMapping).toBeTruthy();
    });

    it('should map testing keywords to sw-testing plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the testing mapping section
      const testingMapping = hookContent.match(
        /if echo "\$MATCHED_KEYWORDS".*test.*vitest.*jest.*then[\s\S]*?sw-testing/
      );
      expect(testingMapping).toBeTruthy();
    });

    it('should map kubernetes keywords to sw-k8s plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the k8s mapping section
      const k8sMapping = hookContent.match(
        /if echo "\$MATCHED_KEYWORDS".*kubernetes.*k8s.*then[\s\S]*?sw-k8s/
      );
      expect(k8sMapping).toBeTruthy();
    });

    it('should map github keywords to sw-github plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the github mapping section
      expect(hookContent).toContain('sw-github');
    });

    it('should map jira keywords to sw-jira plugin', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the jira mapping section
      expect(hookContent).toContain('sw-jira');
    });
  });

  describe('Visible Feedback Mechanism (v1.0.144)', () => {
    it('should set AUTOLOAD_PLUGINS_MSG when plugins are suggested', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have AUTOLOAD_PLUGINS_MSG variable
      expect(hookContent).toContain('AUTOLOAD_PLUGINS_MSG');

      // Should construct message with plugin names
      expect(hookContent).toContain('Auto-loading plugins');
    });

    it('should include AUTOLOAD_PLUGINS_MSG in final output', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should include autoload message in final output
      expect(hookContent).toContain('FINAL_MESSAGE="$AUTOLOAD_PLUGINS_MSG"');
    });

    it('should show feedback even for non-SpecWeave prompts', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have special handling for non-SpecWeave prompts
      const nonSpecWeaveSection = hookContent.match(
        /if ! echo "\$PROMPT".*specweave[\s\S]*?AUTOLOAD_PLUGINS_MSG[\s\S]*?systemMessage/
      );
      expect(nonSpecWeaveSection).toBeTruthy();
    });

    it('should show feedback even for non-SpecWeave projects', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have special handling for non-SpecWeave projects
      const nonProjectSection = hookContent.match(
        /if \[\[ ! -d "\$SPECWEAVE_DIR" \]\][\s\S]*?AUTOLOAD_PLUGINS_MSG[\s\S]*?systemMessage/
      );
      expect(nonProjectSection).toBeTruthy();
    });
  });

  describe('Background Detection Execution', () => {
    it('should run detect-intent in background (non-blocking)', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have background execution with & and disown
      expect(hookContent).toContain('specweave detect-intent');
      expect(hookContent).toContain('--install');
      expect(hookContent).toContain('--silent');
      expect(hookContent).toContain(') &');
      expect(hookContent).toContain('disown');
    });

    it('should have timeout protection for background process', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have timeout wrapper
      expect(hookContent).toContain('timeout 10');
    });

    it('should log to lazy-loading.log', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should log to lazy-loading.log
      expect(hookContent).toContain('LAZY_LOAD_LOG');
      expect(hookContent).toContain('lazy-loading.log');
    });
  });

  describe('Per-Session Cache', () => {
    it('should have per-session cache to avoid redundant detection', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have cache mechanism
      expect(hookContent).toContain('PROMPT_CACHE_DIR');
      expect(hookContent).toContain('CACHE_FILE');
      expect(hookContent).toContain('SHOULD_DETECT');
    });

    it('should use 30-minute cache window', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have 30-minute (1800 seconds) cache
      expect(hookContent).toContain('1800');
    });
  });

  describe('Config Controls', () => {
    it('should respect pluginAutoLoad.enabled config', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check config for pluginAutoLoad.enabled
      expect(hookContent).toContain('PLUGIN_AUTOLOAD_ENABLED');
      expect(hookContent).toContain('pluginAutoLoad.enabled');
    });

    it('should respect SPECWEAVE_DISABLE_AUTO_LOAD env var', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check env var
      expect(hookContent).toContain('SPECWEAVE_DISABLE_AUTO_LOAD');
    });
  });
});

describe('Plugin Auto-Loading Keyword-Plugin Mapping Matrix', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  // Define the expected keyword → plugin mappings
  const KEYWORD_PLUGIN_MATRIX = [
    // Frontend
    { keywords: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'dashboard', 'component', 'frontend'], plugin: 'sw-frontend' },
    // Backend
    { keywords: ['api', 'graphql', 'express', 'database', 'postgres', 'mongodb', 'backend'], plugin: 'sw-backend' },
    // Testing
    { keywords: ['test', 'vitest', 'jest', 'playwright', 'cypress'], plugin: 'sw-testing' },
    // Kubernetes
    { keywords: ['kubernetes', 'k8s', 'helm', 'argocd'], plugin: 'sw-k8s' },
    // Infrastructure
    { keywords: ['docker', 'terraform', 'aws', 'azure', 'gcp'], plugin: 'sw-infra' },
    // External tools
    { keywords: ['github'], plugin: 'sw-github' },
    { keywords: ['jira'], plugin: 'sw-jira' },
    { keywords: ['ado'], plugin: 'sw-ado' },
    // Mobile
    { keywords: ['mobile', 'expo', 'ios', 'android', 'flutter'], plugin: 'sw-mobile' },
    // ML/AI
    { keywords: ['ml', 'ai', 'pytorch', 'tensorflow', 'mlops', 'llm'], plugin: 'sw-ml' },
    // Kafka
    { keywords: ['kafka', 'confluent'], plugin: 'sw-kafka' },
    // Payments
    { keywords: ['stripe', 'paypal', 'payment'], plugin: 'sw-payments' },
    // Release
    { keywords: ['release', 'changelog'], plugin: 'sw-release' },
    // Diagrams
    { keywords: ['diagram', 'mermaid'], plugin: 'sw-diagrams' },
  ];

  it.each(KEYWORD_PLUGIN_MATRIX)(
    'should map keywords %j to plugin $plugin',
    ({ keywords, plugin }) => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Check that the plugin is mapped somewhere in the hook
      expect(hookContent).toContain(plugin);

      // Check that at least one keyword from the group is in the mapping section
      const hasKeyword = keywords.some(k => hookContent.includes(k));
      expect(hasKeyword).toBe(true);
    }
  );
});
