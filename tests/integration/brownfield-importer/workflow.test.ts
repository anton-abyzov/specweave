/**
 * Integration Tests: Brownfield Import Workflow
 * Coverage Target: 85%
 *
 * Tests the complete brownfield import workflow from source to destination
 */

import { BrownfieldImporter, ImportOptions } from '../../../src/core/brownfield/importer';
import { ConfigManager } from '../../../src/core/config-manager';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldImporter - Full Workflow (Integration)', () => {
  it('should complete full import workflow from source to destination', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup project structure
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          }
        }
      }, null, 2));

      // Create source files with different types
      const sourceDir = path.join(tmpDir, 'notion-export');
      await fs.ensureDir(sourceDir);

      // Spec files
      await fs.writeFile(
        path.join(sourceDir, 'user-auth-spec.md'),
        'user story acceptance criteria feature spec requirement epic given when then'
      );
      await fs.writeFile(
        path.join(sourceDir, 'payment-flow.md'),
        'user story as a i want so that acceptance criteria feature requirement'
      );

      // Module file
      await fs.writeFile(
        path.join(sourceDir, 'auth-module.md'),
        'module component architecture api interface design service domain model'
      );

      // Team file
      await fs.writeFile(
        path.join(sourceDir, 'onboarding.md'),
        'onboarding getting started setup guide workflow convention style guide team playbook developer onboarding process best practices coding standards'
      );

      // Legacy file
      await fs.writeFile(
        path.join(sourceDir, 'meeting-notes.md'),
        'discussed project timeline budget no relevant keywords'
      );

      // Import
      const importer = new BrownfieldImporter(tmpDir);
      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'notion',
        preserveStructure: false
      };

      const report = await importer.import(options);

      // Verify import report
      expect(report.totalFiles).toBe(5);
      expect(report.specsImported).toBe(2);
      expect(report.modulesImported).toBe(1);
      expect(report.teamImported).toBe(1);
      expect(report.legacyImported).toBe(1);

      // Verify files copied to correct destinations
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');
      const teamPath = path.join(specweaveRoot, 'docs/internal/team/default');
      const legacyPath = path.join(specweaveRoot, 'docs/internal/legacy/default/notion');

      expect(await fs.pathExists(path.join(specsPath, 'user-auth-spec.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specsPath, 'payment-flow.md'))).toBe(true);
      expect(await fs.pathExists(path.join(modulesPath, 'auth-module.md'))).toBe(true);
      expect(await fs.pathExists(path.join(teamPath, 'onboarding.md'))).toBe(true);
      expect(await fs.pathExists(path.join(legacyPath, 'meeting-notes.md'))).toBe(true);

      // Verify migration report created
      const reportPath = path.join(specweaveRoot, 'docs/internal/legacy/default/README.md');
      expect(await fs.pathExists(reportPath)).toBe(true);

      const reportContent = await fs.readFile(reportPath, 'utf-8');
      expect(reportContent).toContain('# Brownfield Migration Report');
      expect(reportContent).toContain('**Specs**: 2 files');
      expect(reportContent).toContain('**Modules**: 1 files');
      expect(reportContent).toContain('**Team Docs**: 1 files');
      expect(reportContent).toContain('**Legacy**: 1 files');

      // Verify config updated with import history
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      expect(config.brownfield).toBeDefined();
      expect(config.brownfield!.importHistory).toBeDefined();
      expect(config.brownfield!.importHistory.length).toBe(1);

      const historyEntry = config.brownfield!.importHistory[0];
      expect(historyEntry.source).toBe('notion');
      expect(historyEntry.project).toBe('default');
      expect(historyEntry.filesImported).toBe(5);
    });
  });

  it('should handle dry run mode without importing files', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          }
        }
      }, null, 2));

      // Create source files
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'spec.md'), 'user story acceptance criteria feature');
      await fs.writeFile(path.join(sourceDir, 'module.md'), 'module component architecture');

      // Dry run import
      const importer = new BrownfieldImporter(tmpDir);
      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'custom',
        dryRun: true
      };

      const report = await importer.import(options);

      // Verify report shows analysis but no imports
      expect(report.totalFiles).toBe(2);
      expect(report.specsImported).toBe(0);
      expect(report.modulesImported).toBe(0);
      expect(report.teamImported).toBe(0);
      expect(report.legacyImported).toBe(0);

      // Verify files were NOT copied
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');

      expect(await fs.pathExists(path.join(specsPath, 'spec.md'))).toBe(false);
      expect(await fs.pathExists(path.join(modulesPath, 'module.md'))).toBe(false);

      // Verify no migration report created (dry run)
      const reportPath = path.join(specweaveRoot, 'docs/internal/legacy/default/README.md');
      expect(await fs.pathExists(reportPath)).toBe(false);
    });
  });

  it('should preserve folder structure when requested', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          }
        }
      }, null, 2));

      // Create nested source structure
      const sourceDir = path.join(tmpDir, 'confluence-export');
      await fs.ensureDir(path.join(sourceDir, 'product/features'));
      await fs.ensureDir(path.join(sourceDir, 'engineering'));

      await fs.writeFile(
        path.join(sourceDir, 'product/features/checkout.md'),
        'user story acceptance criteria feature spec requirement'
      );
      await fs.writeFile(
        path.join(sourceDir, 'engineering/architecture.md'),
        'module component architecture api design interface service domain model system architecture technical design'
      );

      // Import with structure preservation
      const importer = new BrownfieldImporter(tmpDir);
      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'confluence',
        preserveStructure: true
      };

      const report = await importer.import(options);

      // Verify structure preserved
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');

      expect(await fs.pathExists(path.join(specsPath, 'product/features/checkout.md'))).toBe(true);
      expect(await fs.pathExists(path.join(modulesPath, 'engineering/architecture.md'))).toBe(true);

      // Verify report notes structure preservation
      const reportPath = path.join(specweaveRoot, 'docs/internal/legacy/default/README.md');
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      expect(reportContent).toContain('✅ Original folder structure preserved');
    });
  });

  it('should handle import from multiple sources sequentially', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          }
        }
      }, null, 2));

      const importer = new BrownfieldImporter(tmpDir);

      // Import from Notion
      const notionSource = path.join(tmpDir, 'notion');
      await fs.ensureDir(notionSource);
      await fs.writeFile(path.join(notionSource, 'notion-spec.md'), 'user story acceptance criteria feature spec');

      await importer.import({
        sourcePath: notionSource,
        project: 'default',
        source: 'notion'
      });

      // Import from Confluence
      const confluenceSource = path.join(tmpDir, 'confluence');
      await fs.ensureDir(confluenceSource);
      await fs.writeFile(path.join(confluenceSource, 'confluence-module.md'), 'module component architecture api interface design service domain model system');

      await importer.import({
        sourcePath: confluenceSource,
        project: 'default',
        source: 'confluence'
      });

      // Verify both imports completed
      const specsPath = path.join(specweaveRoot, 'docs/internal/specs/default');
      const modulesPath = path.join(specweaveRoot, 'docs/internal/modules/default');

      expect(await fs.pathExists(path.join(specsPath, 'notion-spec.md'))).toBe(true);
      expect(await fs.pathExists(path.join(modulesPath, 'confluence-module.md'))).toBe(true);

      // Verify separate legacy folders
      expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/legacy/default/notion'))).toBe(true);
      expect(await fs.pathExists(path.join(specweaveRoot, 'docs/internal/legacy/default/confluence'))).toBe(true);

      // Verify import history has 2 entries
      const configManager = new ConfigManager(tmpDir);
      const config = configManager.load();

      expect(config.brownfield!.importHistory.length).toBe(2);
      expect(config.brownfield!.importHistory[0].source).toBe('notion');
      expect(config.brownfield!.importHistory[1].source).toBe('confluence');
    });
  });

  it('should reject import for non-existent project', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup with only default project
      const specweaveRoot = path.join(tmpDir, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/specs/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        multiProject: {
          enabled: true,
          activeProject: 'default',
          projects: {
            'default': {
              name: 'Default Project',
              description: 'Default project',
              techStack: [] as string[],
              team: 'Engineering Team'
            }
          }
        }
      }, null, 2));

      // Create source
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'doc.md'), 'content');

      // Try to import to non-existent project
      const importer = new BrownfieldImporter(tmpDir);
      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'non-existent',
        source: 'notion'
      };

      await expect(importer.import(options)).rejects.toThrow("Project 'non-existent' not found");
    });
  });
});
