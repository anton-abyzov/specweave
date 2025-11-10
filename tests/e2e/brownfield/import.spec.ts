/**
 * E2E Tests: Brownfield Import Workflow
 * Coverage Target: 78%
 *
 * Tests end-to-end brownfield import workflow:
 * - Import docs command execution
 * - File importing to correct folders
 * - Migration report generation
 * - Config persistence
 * - Performance (<10s for 50 files)
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Brownfield Import Workflow (E2E)', () => {
  const testDir = path.join(__dirname, '../../fixtures/e2e-brownfield-import');
  const specweaveRoot = path.join(testDir, '.specweave');
  const sourceDir = path.join(testDir, 'source-docs');

  test.beforeEach(async () => {
    // Create test directories
    await fs.ensureDir(testDir);
    await fs.ensureDir(specweaveRoot);
    await fs.ensureDir(sourceDir);

    // Create config.json
    const configPath = path.join(specweaveRoot, 'config.json');
    await fs.writeFile(configPath, JSON.stringify({
      multiProject: {
        enabled: false,
        activeProject: 'default',
        projects: []
      },
      brownfieldImports: []
    }, null, 2));

    // Create test source files with various classifications
    await fs.ensureDir(path.join(sourceDir, 'specs'));
    await fs.ensureDir(path.join(sourceDir, 'modules'));
    await fs.ensureDir(path.join(sourceDir, 'team'));
    await fs.ensureDir(path.join(sourceDir, 'misc'));

    // Spec files (high keyword density)
    await fs.writeFile(
      path.join(sourceDir, 'specs/auth-feature.md'),
      `# User Authentication Feature

## User Story
As a user, I want to log in with email and password so that I can access my account.

## Acceptance Criteria
- AC-1: User can log in with valid credentials
- AC-2: Invalid credentials show error
- AC-3: Password must be hashed
`
    );

    await fs.writeFile(
      path.join(sourceDir, 'specs/payment-flow.md'),
      `# Payment Flow Specification

## User Story
As a customer, I want to checkout with credit card...

## Acceptance Criteria
- AC-1: Stripe integration
- AC-2: Payment confirmation
`
    );

    // Module files
    await fs.writeFile(
      path.join(sourceDir, 'modules/api-client.md'),
      `# API Client Module

## Architecture
REST API client with interceptors...

## API Reference
- GET /users
- POST /users
`
    );

    // Team files
    await fs.writeFile(
      path.join(sourceDir, 'team/onboarding.md'),
      `# Team Onboarding Guide

## Setup
1. Install Node.js
2. Clone repository
3. Run npm install

## Workflows
Daily standup at 10am
`
    );

    await fs.writeFile(
      path.join(sourceDir, 'team/conventions.md'),
      `# Coding Conventions

## Style Guide
- Use 2 spaces
- Prefer const over let
- Write JSDoc comments
`
    );

    // Legacy files (low keyword density)
    await fs.writeFile(
      path.join(sourceDir, 'misc/meeting-notes.md'),
      `# Meeting Notes - 2024-01-15

Discussed project timeline.
Next meeting: Friday.
`
    );

    await fs.writeFile(
      path.join(sourceDir, 'misc/random-ideas.md'),
      `# Random Ideas

- Maybe add dark mode?
- Consider GraphQL?
`
    );
  });

  test.afterEach(async () => {
    await fs.remove(testDir);
  });

  test('should execute import and copy files to correct folders', async () => {
    // Dynamically import BrownfieldImporter
    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Step 1: Analyze source directory
    const analysisResult = await analyzer.analyze(sourceDir);

    expect(analysisResult.totalFiles).toBeGreaterThanOrEqual(7);
    expect(analysisResult.specs.length).toBeGreaterThanOrEqual(2);
    expect(analysisResult.modules.length).toBeGreaterThanOrEqual(1);
    expect(analysisResult.team.length).toBeGreaterThanOrEqual(2);
    expect(analysisResult.legacy.length).toBeGreaterThanOrEqual(2);

    // Step 2: Import files
    await importer.import({
      sourcePath: sourceDir,
      sourceType: 'notion',
      preserveStructure: false,
      analysisResult
    });

    // Step 3: Verify files copied to correct destinations
    const specsPath = path.join(specweaveRoot, 'docs/internal/projects/default/specs');
    const modulesPath = path.join(specweaveRoot, 'docs/internal/projects/default/modules');
    const teamPath = path.join(specweaveRoot, 'docs/internal/projects/default/team');
    const legacyPath = path.join(specweaveRoot, 'docs/internal/projects/default/legacy/notion');

    // Check spec files
    expect(await fs.pathExists(path.join(specsPath, 'auth-feature.md'))).toBe(true);
    expect(await fs.pathExists(path.join(specsPath, 'payment-flow.md'))).toBe(true);

    // Check module files
    expect(await fs.pathExists(path.join(modulesPath, 'api-client.md'))).toBe(true);

    // Check team files
    expect(await fs.pathExists(path.join(teamPath, 'onboarding.md'))).toBe(true);
    expect(await fs.pathExists(path.join(teamPath, 'conventions.md'))).toBe(true);

    // Check legacy files
    expect(await fs.pathExists(path.join(legacyPath, 'meeting-notes.md'))).toBe(true);
    expect(await fs.pathExists(path.join(legacyPath, 'random-ideas.md'))).toBe(true);
  });

  test('should create migration report in legacy folder', async () => {
    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Analyze and import
    const analysisResult = await analyzer.analyze(sourceDir);
    await importer.import({
      sourcePath: sourceDir,
      sourceType: 'notion',
      preserveStructure: false,
      analysisResult
    });

    // Verify migration report created
    const reportPath = path.join(
      specweaveRoot,
      'docs/internal/projects/default/legacy/notion/README.md'
    );

    expect(await fs.pathExists(reportPath)).toBe(true);

    const reportContent = await fs.readFile(reportPath, 'utf-8');

    // Verify report includes required sections
    expect(reportContent).toContain('# Brownfield Import Report');
    expect(reportContent).toContain('Source: notion');
    expect(reportContent).toContain('Classification Summary');
    expect(reportContent).toContain('Next Steps');
    expect(reportContent).toContain('specs:');
    expect(reportContent).toContain('modules:');
    expect(reportContent).toContain('team:');
    expect(reportContent).toContain('legacy:');
  });

  test('should update config with import history', async () => {
    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Analyze and import
    const analysisResult = await analyzer.analyze(sourceDir);
    await importer.import({
      sourcePath: sourceDir,
      sourceType: 'notion',
      preserveStructure: false,
      analysisResult
    });

    // Verify config updated
    const configPath = path.join(specweaveRoot, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    expect(config.brownfieldImports).toBeDefined();
    expect(config.brownfieldImports.length).toBeGreaterThan(0);

    const lastImport = config.brownfieldImports[config.brownfieldImports.length - 1];
    expect(lastImport.source).toBe('notion');
    expect(lastImport.timestamp).toBeDefined();
    expect(lastImport.totalFiles).toBeGreaterThanOrEqual(7);
    expect(lastImport.classification).toBeDefined();
    expect(lastImport.classification.specs).toBeGreaterThanOrEqual(2);
  });

  test('should support dry run mode (preview without copying)', async () => {
    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Analyze
    const analysisResult = await analyzer.analyze(sourceDir);

    // Dry run (should not copy files)
    const previewResult = await importer.preview({
      sourcePath: sourceDir,
      sourceType: 'notion',
      analysisResult
    });

    // Verify preview result
    expect(previewResult.totalFiles).toBeGreaterThanOrEqual(7);
    expect(previewResult.specs).toBeGreaterThanOrEqual(2);
    expect(previewResult.modules).toBeGreaterThanOrEqual(1);

    // Verify NO files were copied
    const specsPath = path.join(specweaveRoot, 'docs/internal/projects/default/specs');
    expect(await fs.pathExists(path.join(specsPath, 'auth-feature.md'))).toBe(false);
  });

  test('should handle structure preservation mode', async () => {
    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Analyze
    const analysisResult = await analyzer.analyze(sourceDir);

    // Import with structure preservation
    await importer.import({
      sourcePath: sourceDir,
      sourceType: 'confluence',
      preserveStructure: true,
      analysisResult
    });

    // Verify folder structure preserved
    const legacyPath = path.join(specweaveRoot, 'docs/internal/projects/default/legacy/confluence');

    expect(await fs.pathExists(path.join(legacyPath, 'specs/auth-feature.md'))).toBe(true);
    expect(await fs.pathExists(path.join(legacyPath, 'specs/payment-flow.md'))).toBe(true);
    expect(await fs.pathExists(path.join(legacyPath, 'modules/api-client.md'))).toBe(true);
    expect(await fs.pathExists(path.join(legacyPath, 'team/onboarding.md'))).toBe(true);
  });

  test('should complete import of 50 files in <10 seconds (performance)', async () => {
    // Create 50 test files
    for (let i = 1; i <= 50; i++) {
      const filename = `test-file-${i}.md`;
      const content = i % 2 === 0
        ? `# User Story ${i}\nAs a user, I want feature ${i}.\nAcceptance criteria: AC-${i}`
        : `# Document ${i}\nSome content for file ${i}`;

      await fs.writeFile(
        path.join(sourceDir, filename),
        content
      );
    }

    const { BrownfieldImporter } = await import('../../../src/core/brownfield/importer.js');
    const { BrownfieldAnalyzer } = await import('../../../src/core/brownfield/analyzer.js');

    const analyzer = new BrownfieldAnalyzer();
    const importer = new BrownfieldImporter(testDir);

    // Measure performance
    const startTime = Date.now();

    const analysisResult = await analyzer.analyze(sourceDir);
    await importer.import({
      sourcePath: sourceDir,
      sourceType: 'wiki',
      preserveStructure: false,
      analysisResult
    });

    const duration = Date.now() - startTime;

    // Should complete in <10 seconds
    expect(duration).toBeLessThan(10000);

    // Verify all files imported
    expect(analysisResult.totalFiles).toBeGreaterThanOrEqual(57); // 7 + 50 = 57
  });
});
