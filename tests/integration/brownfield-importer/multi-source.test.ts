/**
 * Integration Tests: Multi-Source Brownfield Import
 * Coverage Target: 85%
 *
 * Tests importing from multiple external sources into different projects
 */

import { BrownfieldImporter, ImportOptions } from '../../../src/core/brownfield/importer';
import { ConfigManager } from '../../../src/core/config-manager';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldImporter - Multi-Source Import (Integration)', () => {
  it('should import from multiple sources to different projects without conflicts', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup multi-project structure
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/web-app'));
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/mobile-app'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'web-app',
          projects: [
            {
              id: 'web-app',
              name: 'Web Application',
              description: 'Frontend web app',
              techStack: ['react'] as string[],
              team: 'Web Team'
            },
            {
              id: 'mobile-app',
              name: 'Mobile Application',
              description: 'Mobile app',
              techStack: ['react-native'] as string[],
              team: 'Mobile Team'
            }
          ]
        }
      }, null, 2));

      const importer = new BrownfieldImporter(tmpDir);

      // Import from Notion to web-app project
      const notionSource = path.join(tmpDir, 'notion-web');
      await fs.ensureDir(notionSource);
      await fs.writeFile(
        path.join(notionSource, 'web-spec.md'),
        'user story acceptance criteria feature spec requirement epic given when then'
      );

      await importer.import({
        sourcePath: notionSource,
        project: 'web-app',
        source: 'notion'
      });

      // Import from Confluence to mobile-app project
      const confluenceSource = path.join(tmpDir, 'confluence-mobile');
      await fs.ensureDir(confluenceSource);
      await fs.writeFile(
        path.join(confluenceSource, 'mobile-spec.md'),
        'user story acceptance criteria feature spec requirement given when then as a i want'
      );

      await importer.import({
        sourcePath: confluenceSource,
        project: 'mobile-app',
        source: 'confluence'
      });

      // Verify files went to correct project folders
      const webSpecsPath = path.join(specweaveRoot, 'docs/internal/specs/web-app');
      const mobileSpecsPath = path.join(specweaveRoot, 'docs/internal/specs/mobile-app');

      expect(await fs.pathExists(path.join(webSpecsPath, 'web-spec.md'))).toBe(true);
      expect(await fs.pathExists(path.join(mobileSpecsPath, 'mobile-spec.md'))).toBe(true);

      // Verify no cross-contamination
      expect(await fs.pathExists(path.join(webSpecsPath, 'mobile-spec.md'))).toBe(false);
      expect(await fs.pathExists(path.join(mobileSpecsPath, 'web-spec.md'))).toBe(false);

      // Verify separate legacy folders
      expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/legacy/web-app/notion'))).toBe(true);
      expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/legacy/mobile-app/confluence'))).toBe(true);

      // Verify import history tracks both imports
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      expect(config.brownfield!.importHistory.length).toBe(2);

      const webImport = config.brownfield!.importHistory.find((h: any) => h.project === 'web-app');
      const mobileImport = config.brownfield!.importHistory.find((h: any) => h.project === 'mobile-app');

      expect(webImport).toBeDefined();
      expect(webImport!.source).toBe('notion');
      expect(webImport!.filesImported).toBe(1);

      expect(mobileImport).toBeDefined();
      expect(mobileImport!.source).toBe('confluence');
      expect(mobileImport!.filesImported).toBe(1);
    });
  });

  it('should handle large-scale import with many files from multiple sources', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      const importer = new BrownfieldImporter(tmpDir);

      // Create 20 files from Notion (10 specs, 5 modules, 5 team)
      const notionSource = path.join(tmpDir, 'notion-large');
      await fs.ensureDir(notionSource);

      for (let i = 1; i <= 10; i++) {
        await fs.writeFile(
          path.join(notionSource, `spec-${i}.md`),
          'user story acceptance criteria feature spec requirement epic given when then'
        );
      }

      for (let i = 1; i <= 5; i++) {
        await fs.writeFile(
          path.join(notionSource, `module-${i}.md`),
          'module component architecture api interface design service domain model system'
        );
      }

      for (let i = 1; i <= 5; i++) {
        await fs.writeFile(
          path.join(notionSource, `team-${i}.md`),
          'onboarding getting started setup guide workflow convention style guide team playbook developer onboarding process best practices coding standards'
        );
      }

      const report1 = await importer.import({
        sourcePath: notionSource,
        project: 'default',
        source: 'notion'
      });

      // Verify large import
      expect(report1.totalFiles).toBe(20);
      expect(report1.specsImported).toBe(10);
      expect(report1.modulesImported).toBe(5);
      expect(report1.teamImported).toBe(5);

      // Create 15 files from Confluence (8 specs, 4 modules, 3 team)
      const confluenceSource = path.join(tmpDir, 'confluence-large');
      await fs.ensureDir(confluenceSource);

      for (let i = 1; i <= 8; i++) {
        await fs.writeFile(
          path.join(confluenceSource, `confluence-spec-${i}.md`),
          'user story acceptance criteria feature spec requirement as a i want so that'
        );
      }

      for (let i = 1; i <= 4; i++) {
        await fs.writeFile(
          path.join(confluenceSource, `confluence-module-${i}.md`),
          'module component architecture api interface design service domain technical'
        );
      }

      for (let i = 1; i <= 3; i++) {
        await fs.writeFile(
          path.join(confluenceSource, `confluence-team-${i}.md`),
          'onboarding getting started developer guide team workflow process standards playbook setup best practices coding conventions'
        );
      }

      const report2 = await importer.import({
        sourcePath: confluenceSource,
        project: 'default',
        source: 'confluence'
      });

      // Verify second large import
      expect(report2.totalFiles).toBe(15);
      expect(report2.specsImported).toBe(8);
      expect(report2.modulesImported).toBe(4);
      expect(report2.teamImported).toBe(3);

      // Verify all files imported
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const specFiles = await fs.readdir(specsPath);
      expect(specFiles.length).toBe(18); // 10 + 8

      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');
      const moduleFiles = await fs.readdir(modulesPath);
      expect(moduleFiles.length).toBe(9); // 5 + 4

      const teamPath = path.join(specweaveRoot, 'docs/internal/team/default');
      const teamFiles = await fs.readdir(teamPath);
      expect(teamFiles.length).toBe(8); // 5 + 3

      // Verify import history
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      expect(config.brownfield!.importHistory.length).toBe(2);
      expect(config.brownfield!.importHistory[0].filesImported).toBe(20);
      expect(config.brownfield!.importHistory[1].filesImported).toBe(15);
    });
  });

  it('should handle nested structure imports from multiple sources', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      const importer = new BrownfieldImporter(tmpDir);

      // Import from Notion with nested structure
      const notionSource = path.join(tmpDir, 'notion-nested');
      await fs.ensureDir(path.join(notionSource, 'features/auth'));
      await fs.ensureDir(path.join(notionSource, 'features/payment'));

      await fs.writeFile(
        path.join(notionSource, 'features/auth/login.md'),
        'user story acceptance criteria feature spec requirement epic'
      );
      await fs.writeFile(
        path.join(notionSource, 'features/payment/checkout.md'),
        'user story acceptance criteria feature spec requirement given when then'
      );

      await importer.import({
        sourcePath: notionSource,
        project: 'default',
        source: 'notion',
        preserveStructure: true
      });

      // Import from Wiki with different nested structure
      const wikiSource = path.join(tmpDir, 'wiki-nested');
      await fs.ensureDir(path.join(wikiSource, 'docs/modules'));
      await fs.ensureDir(path.join(wikiSource, 'docs/guides'));

      await fs.writeFile(
        path.join(wikiSource, 'docs/modules/api.md'),
        'module component architecture api interface design service domain model system architecture technical design'
      );
      await fs.writeFile(
        path.join(wikiSource, 'docs/guides/setup.md'),
        'onboarding getting started developer guide setup workflow team playbook best practices coding standards conventions'
      );

      await importer.import({
        sourcePath: wikiSource,
        project: 'default',
        source: 'wiki',
        preserveStructure: true
      });

      // Verify nested structures preserved independently
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');
      const teamPath = path.join(specweaveRoot, 'docs/internal/team/default');

      expect(await fs.pathExists(path.join(specsPath, 'features/auth/login.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specsPath, 'features/payment/checkout.md'))).toBe(true);
      expect(await fs.pathExists(path.join(modulesPath, 'docs/modules/api.md'))).toBe(true);
      expect(await fs.pathExists(path.join(teamPath, 'docs/guides/setup.md'))).toBe(true);

      // Verify structures don't interfere with each other
      // (Notion has 'features/*', Wiki has 'docs/*' - both should exist independently)
      expect(await fs.pathExists(path.join(specsPath, 'features'))).toBe(true);
      expect(await fs.pathExists(path.join(modulesPath, 'docs'))).toBe(true);
    });
  });

  it('should track workspace names for each import source', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: [
            {
              id: 'default',
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          ]
        }
      }, null, 2));

      const importer = new BrownfieldImporter(tmpDir);

      // Import from different workspaces
      const workspace1 = path.join(tmpDir, 'acme-corp-notion');
      await fs.ensureDir(workspace1);
      await fs.writeFile(path.join(workspace1, 'doc1.md'), 'user story acceptance criteria feature');

      await importer.import({
        sourcePath: workspace1,
        project: 'default',
        source: 'notion'
      });

      const workspace2 = path.join(tmpDir, 'engineering-confluence');
      await fs.ensureDir(workspace2);
      await fs.writeFile(path.join(workspace2, 'doc2.md'), 'module component architecture api');

      await importer.import({
        sourcePath: workspace2,
        project: 'default',
        source: 'confluence'
      });

      // Verify workspace names tracked in history
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      const notionHistory = config.brownfield!.importHistory.find((h: any) => h.source === 'notion');
      const confluenceHistory = config.brownfield!.importHistory.find((h: any) => h.source === 'confluence');

      expect(notionHistory).toBeDefined();
      expect(notionHistory!.workspace).toBe('acme-corp-notion');

      expect(confluenceHistory).toBeDefined();
      expect(confluenceHistory!.workspace).toBe('engineering-confluence');
    });
  });
});
