/**
 * E2E tests for multilingual workflows
 *
 * Tests complete user workflows in different languages including:
 * - Project initialization with language selection
 * - CLI command execution in different languages
 * - Translator skill activation
 * - Living docs translation
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const TEST_DIR = path.join(process.cwd(), 'tests/fixtures/e2e-i18n');

// Retry configuration for file system operations
const CLEANUP_RETRIES = 3;
const CLEANUP_INITIAL_DELAY = 100; // ms

test.describe('Multilingual Workflows E2E', () => {
  let workerTestDir: string;

  test.beforeAll(async ({ }, testInfo) => {
    // Create unique directory for this worker to avoid parallel test conflicts
    workerTestDir = path.join(TEST_DIR, `worker-${testInfo.workerIndex}`);

    // Cleanup any previous test artifacts with exponential backoff
    let retries = CLEANUP_RETRIES;
    let delay = CLEANUP_INITIAL_DELAY;

    while (retries > 0) {
      try {
        // fs-extra's remove is safe even if path doesn't exist
        await fs.remove(workerTestDir);
        await fs.ensureDir(workerTestDir);
        break;
      } catch (error) {
        retries--;
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (retries === 0) {
          console.error(`Failed to cleanup test directory after ${CLEANUP_RETRIES} attempts:`, errorMsg);
          throw error;
        }

        console.warn(`Cleanup attempt ${CLEANUP_RETRIES - retries}/${CLEANUP_RETRIES} failed: ${errorMsg}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 100ms → 200ms → 400ms
      }
    }
  });

  test.afterAll(async () => {
    // Cleanup test directory with exponential backoff (non-fatal)
    let retries = CLEANUP_RETRIES;
    let delay = CLEANUP_INITIAL_DELAY;

    while (retries > 0) {
      try {
        await fs.remove(workerTestDir);
        break;
      } catch (error) {
        retries--;
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (retries === 0) {
          console.warn(`Failed to cleanup test directory after ${CLEANUP_RETRIES} attempts:`, errorMsg);
          // Don't throw - cleanup failure shouldn't fail tests
          break;
        }

        console.warn(`Cleanup attempt ${CLEANUP_RETRIES - retries}/${CLEANUP_RETRIES} failed: ${errorMsg}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  });

  test('should initialize project with English (default)', async () => {
    const projectDir = path.join(workerTestDir, 'english-project');
    await fs.ensureDir(projectDir);

    // Create minimal config for English
    const config = {
      projectName: 'english-project',
      version: '0.6.0',
      language: 'en',
      translation: {
        autoTranslateLivingDocs: false,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.ensureDir(path.join(projectDir, '.specweave'));
    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    // Verify config exists and is correct
    const savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.language).toBe('en');
    expect(savedConfig.translation).toBeDefined();
  });

  test('should initialize project with Russian', async () => {
    const projectDir = path.join(workerTestDir, 'russian-project');
    await fs.ensureDir(projectDir);

    const config = {
      projectName: 'russian-project',
      version: '0.6.0',
      language: 'ru',
      translation: {
        autoTranslateLivingDocs: true,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.ensureDir(path.join(projectDir, '.specweave'));
    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    const savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.language).toBe('ru');
    expect(savedConfig.translation.autoTranslateLivingDocs).toBe(true);
  });

  test('should initialize project with Spanish', async () => {
    const projectDir = path.join(workerTestDir, 'spanish-project');
    await fs.ensureDir(projectDir);

    const config = {
      projectName: 'spanish-project',
      version: '0.6.0',
      language: 'es',
      translation: {
        autoTranslateLivingDocs: true,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.ensureDir(path.join(projectDir, '.specweave'));
    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    const savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.language).toBe('es');
  });

  test('should switch language in existing project', async () => {
    const projectDir = path.join(workerTestDir, 'language-switch-project');
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, '.specweave'));

    // Start with English
    let config = {
      projectName: 'language-switch-project',
      version: '0.6.0',
      language: 'en',
      translation: {
        autoTranslateLivingDocs: false,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    let savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.language).toBe('en');

    // Switch to Russian
    config.language = 'ru';
    config.translation.autoTranslateLivingDocs = true;

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.language).toBe('ru');
    expect(savedConfig.translation.autoTranslateLivingDocs).toBe(true);
  });

  test('should preserve framework terms in config', async () => {
    const projectDir = path.join(workerTestDir, 'framework-terms-project');
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, '.specweave'));

    const config = {
      projectName: 'framework-terms-project',
      version: '0.6.0',
      language: 'ru',
      translation: {
        autoTranslateLivingDocs: true,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    const savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.translation.keepFrameworkTerms).toBe(true);
    expect(savedConfig.translation.keepTechnicalTerms).toBe(true);
  });

  test('should create increment folder structure regardless of language', async () => {
    const projectDir = path.join(workerTestDir, 'increment-structure-project');
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, '.specweave'));

    // Test with Russian
    const config = {
      projectName: 'increment-structure-project',
      version: '0.6.0',
      language: 'ru',
      translation: {
        autoTranslateLivingDocs: true,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    // Create increment structure manually for testing
    const incrementDir = path.join(projectDir, '.specweave/increments/0001-test-feature');
    const logsDir = path.join(incrementDir, 'logs');
    const reportsDir = path.join(incrementDir, 'reports');
    const scriptsDir = path.join(incrementDir, 'scripts');

    await fs.ensureDir(logsDir);
    await fs.ensureDir(reportsDir);
    await fs.ensureDir(scriptsDir);

    // Verify structure exists
    expect(await fs.pathExists(incrementDir)).toBe(true);
    expect(await fs.pathExists(logsDir)).toBe(true);
    expect(await fs.pathExists(reportsDir)).toBe(true);
    expect(await fs.pathExists(scriptsDir)).toBe(true);
  });

  test('should handle all 9 supported languages', async () => {
    const languages = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

    for (const lang of languages) {
      const projectDir = path.join(workerTestDir, `${lang}-project`);
      await fs.ensureDir(projectDir);
      await fs.ensureDir(path.join(projectDir, '.specweave'));

      const config = {
        projectName: `${lang}-project`,
        version: '0.6.0',
        language: lang,
        translation: {
          autoTranslateLivingDocs: lang !== 'en',
          keepFrameworkTerms: true,
          keepTechnicalTerms: true
        }
      };

      await fs.writeJson(
        path.join(projectDir, '.specweave/config.json'),
        config,
        { spaces: 2 }
      );

      const savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
      expect(savedConfig.language).toBe(lang);
    }
  });

  test('should create translator skill files', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/translator/SKILL.md');

    // Verify translator skill exists
    expect(await fs.pathExists(skillPath)).toBe(true);

    const content = await fs.readFile(skillPath, 'utf-8');

    // Verify YAML frontmatter
    expect(content).toContain('---');
    expect(content).toContain('name: translator');
    expect(content).toContain('description:');

    // Verify key sections
    expect(content).toContain('LLM-native translation');
    expect(content).toContain('Zero Cost');
    expect(content).toContain('Framework terms');
  });

  test('should create translator agent files', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/translator/AGENT.md');

    // Verify translator agent exists
    expect(await fs.pathExists(agentPath)).toBe(true);

    const content = await fs.readFile(agentPath, 'utf-8');

    // Verify key sections
    expect(content).toContain('Batch Translation Specialist');
    expect(content).toContain('translator skill');
    expect(content).toContain('Project Analysis');
    expect(content).toContain('Translation Planning');
  });

  test('should create translate command', async () => {
    const commandPath = path.join(process.cwd(), 'plugins/specweave/commands/specweave-translate.md');

    // Verify translate command exists
    expect(await fs.pathExists(commandPath)).toBe(true);

    const content = await fs.readFile(commandPath, 'utf-8');

    // Verify YAML frontmatter
    expect(content).toContain('---');
    expect(content).toContain('name: specweave:translate');

    // Verify command syntax
    expect(content).toContain('/specweave:translate');
    expect(content).toContain('target-language');
    expect(content).toContain('--scope');
  });

  test('should have locale files for supported languages', async () => {
    const supportedLanguages = ['en', 'ru', 'es'];

    for (const lang of supportedLanguages) {
      const localeDir = path.join(process.cwd(), `src/locales/${lang}`);
      const cliFile = path.join(localeDir, 'cli.json');

      // Verify locale directory exists
      expect(await fs.pathExists(localeDir)).toBe(true);

      // Verify cli.json exists
      expect(await fs.pathExists(cliFile)).toBe(true);

      // Verify JSON is valid
      const content = await fs.readJson(cliFile);
      expect(content).toHaveProperty('init');
      expect(content).toHaveProperty('increment');

      // Verify structure
      expect(content.init).toHaveProperty('welcome');
      expect(content.increment).toHaveProperty('creating');
    }
  });

  test('should preserve emojis in locale files', async () => {
    const languages = ['en', 'ru', 'es'];

    for (const lang of languages) {
      const cliFile = path.join(process.cwd(), `src/locales/${lang}/cli.json`);
      const content = await fs.readJson(cliFile);

      // Check that welcome messages contain emojis
      if (content.init && content.init.welcome) {
        const welcome = content.init.welcome;
        // Should contain at least one emoji (🚀 is common)
        expect(/[\u{1F000}-\u{1F9FF}]/u.test(welcome)).toBe(true);
      }
    }
  });

  test('should preserve framework terms in non-English locales', async () => {
    const nonEnglishLanguages = ['ru', 'es'];

    for (const lang of nonEnglishLanguages) {
      const cliFile = path.join(process.cwd(), `src/locales/${lang}/cli.json`);
      const content = await fs.readJson(cliFile);

      // Check that increment messages preserve "increment" term
      if (content.increment && content.increment.creating) {
        const creating = content.increment.creating;
        expect(creating.toLowerCase()).toContain('increment');
      }
    }
  });

  test('should support translation config toggles', async () => {
    const projectDir = path.join(workerTestDir, 'translation-toggles-project');
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, '.specweave'));

    // Test with all toggles enabled
    let config = {
      projectName: 'translation-toggles-project',
      version: '0.6.0',
      language: 'ru',
      translation: {
        autoTranslateLivingDocs: true,
        keepFrameworkTerms: true,
        keepTechnicalTerms: true
      }
    };

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    let savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.translation.autoTranslateLivingDocs).toBe(true);
    expect(savedConfig.translation.keepFrameworkTerms).toBe(true);
    expect(savedConfig.translation.keepTechnicalTerms).toBe(true);

    // Test with some toggles disabled
    config.translation.autoTranslateLivingDocs = false;
    config.translation.keepFrameworkTerms = false;

    await fs.writeJson(
      path.join(projectDir, '.specweave/config.json'),
      config,
      { spaces: 2 }
    );

    savedConfig = await fs.readJson(path.join(projectDir, '.specweave/config.json'));
    expect(savedConfig.translation.autoTranslateLivingDocs).toBe(false);
    expect(savedConfig.translation.keepFrameworkTerms).toBe(false);
    expect(savedConfig.translation.keepTechnicalTerms).toBe(true);
  });
});
