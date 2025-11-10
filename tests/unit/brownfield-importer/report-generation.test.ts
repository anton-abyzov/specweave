/**
 * Unit Tests: BrownfieldImporter Report Generation
 * Coverage Target: 95%
 */

import { BrownfieldImporter } from '../../../src/core/brownfield/importer';
import { ImportOptions } from '../../../src/core/brownfield/importer';
import { withTempDir } from '../../utils/temp-dir';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldImporter - Report Generation', () => {
  let importer: BrownfieldImporter;
  let testRoot: string;

  beforeEach(async () => {
    await withTempDir(async (tmpDir) => {
      testRoot = tmpDir;

      // Create .specweave structure with default project
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

      // Create config.json with default project
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

      importer = new BrownfieldImporter(testRoot);
    });
  });

  it('should create migration report in legacy folder', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup test root
      testRoot = tmpDir;

      // Create .specweave structure
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

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

      importer = new BrownfieldImporter(testRoot);

      // Create source files
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'spec.md'), 'user story acceptance criteria feature spec requirement');
      await fs.writeFile(path.join(sourceDir, 'module.md'), 'component architecture api interface design service');
      await fs.writeFile(path.join(sourceDir, 'team.md'), 'onboarding getting started workflow convention');

      // Import
      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'notion',
        preserveStructure: false
      };

      await importer.import(options);

      // Verify report exists
      const reportPath = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      expect(await fs.pathExists(reportPath)).toBe(true);

      // Read report content
      const reportContent = await fs.readFile(reportPath, 'utf-8');

      // Verify report structure
      expect(reportContent).toContain('# Brownfield Migration Report');
      expect(reportContent).toContain('## Import Summary');
      expect(reportContent).toContain('## Classification Analysis');
      expect(reportContent).toContain('## Next Steps');
      expect(reportContent).toContain('## Migration Notes');
      expect(reportContent).toContain('## Source Information');
    });
  });

  it('should include correct import statistics in report', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      testRoot = tmpDir;
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

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

      importer = new BrownfieldImporter(testRoot);

      // Create files: 2 specs, 1 module, 1 legacy
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'spec1.md'), 'user story acceptance criteria feature spec requirement epic');
      await fs.writeFile(path.join(sourceDir, 'spec2.md'), 'user story given when then as a i want so that');
      await fs.writeFile(path.join(sourceDir, 'module.md'), 'module component architecture api interface design service domain');
      await fs.writeFile(path.join(sourceDir, 'legacy.md'), 'no relevant keywords here');

      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'confluence',
        preserveStructure: false
      };

      await importer.import(options);

      // Read report
      const reportPath = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      const reportContent = await fs.readFile(reportPath, 'utf-8');

      // Verify statistics
      expect(reportContent).toContain('**Total Files**: 4');
      expect(reportContent).toContain('**Specs**: 2 files');
      expect(reportContent).toContain('**Modules**: 1 files');
      expect(reportContent).toContain('**Team Docs**: 0 files');
      expect(reportContent).toContain('**Legacy**: 1 files');
    });
  });

  it('should include source metadata in report', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      testRoot = tmpDir;
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

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

      importer = new BrownfieldImporter(testRoot);

      // Create source
      const sourceDir = path.join(tmpDir, 'my-notion-workspace');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'doc.md'), 'user story acceptance criteria');

      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'notion',
        preserveStructure: true
      };

      await importer.import(options);

      // Read report
      const reportPath = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      const reportContent = await fs.readFile(reportPath, 'utf-8');

      // Verify metadata
      expect(reportContent).toContain('**Source**: notion');
      expect(reportContent).toContain(`**Source Path**: ${sourceDir}`);
      expect(reportContent).toContain('**Project**: default');
      expect(reportContent).toContain('✅ Original folder structure preserved');
    });
  });

  it('should include ISO timestamp in report', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      testRoot = tmpDir;
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

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

      importer = new BrownfieldImporter(testRoot);

      // Create source
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'doc.md'), 'user story feature');

      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'wiki',
        preserveStructure: false
      };

      const before = new Date().toISOString();
      await importer.import(options);
      const after = new Date().toISOString();

      // Read report
      const reportPath = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      const reportContent = await fs.readFile(reportPath, 'utf-8');

      // Verify ISO timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)
      const timestampMatch = reportContent.match(/\*\*Imported\*\*: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      expect(timestampMatch).toBeTruthy();

      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        // Verify timestamp is within reasonable range (between before and after)
        expect(timestamp >= before).toBe(true);
        expect(timestamp <= after).toBe(true);
      }
    });
  });

  it('should note structure preservation mode in report', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      testRoot = tmpDir;
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

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

      importer = new BrownfieldImporter(testRoot);

      // Create source
      const sourceDir = path.join(tmpDir, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'doc.md'), 'user story feature');

      // Test with preserveStructure=false
      const options1: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'custom',
        preserveStructure: false
      };

      await importer.import(options1);

      const reportPath1 = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      const reportContent1 = await fs.readFile(reportPath1, 'utf-8');

      expect(reportContent1).toContain('📁 Files flattened to destination folders (no subdirectories)');

      // Clean up and test with preserveStructure=true
      await fs.remove(path.join(testRoot, '.specweave/docs/internal/projects/default/legacy'));

      const options2: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'custom',
        preserveStructure: true
      };

      await importer.import(options2);

      const reportPath2 = path.join(testRoot, '.specweave/docs/internal/projects/default/legacy/README.md');
      const reportContent2 = await fs.readFile(reportPath2, 'utf-8');

      expect(reportContent2).toContain('✅ Original folder structure preserved');
    });
  });

  it('should update config with import history', async () => {
    await withTempDir(async (tmpDir) => {
      // Setup
      testRoot = tmpDir;
      const specweaveRoot = path.join(testRoot, '.specweave');
      await fs.ensureDir(path.join(specweaveRoot, 'docs/internal/projects/default'));

      const configPath = path.join(specweaveRoot, 'config.json');
      const initialConfig = {
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
      };
      await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));

      importer = new BrownfieldImporter(testRoot);

      // Create source
      const sourceDir = path.join(tmpDir, 'my-workspace');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'doc.md'), 'user story feature');

      const options: ImportOptions = {
        sourcePath: sourceDir,
        project: 'default',
        source: 'notion',
        preserveStructure: false
      };

      await importer.import(options);

      // Read updated config
      const updatedConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Verify import history added
      expect(updatedConfig.brownfield).toBeDefined();
      expect(updatedConfig.brownfield.importHistory).toBeDefined();
      expect(updatedConfig.brownfield.importHistory.length).toBe(1);

      const historyEntry = updatedConfig.brownfield.importHistory[0];
      expect(historyEntry.source).toBe('notion');
      expect(historyEntry.workspace).toBe('my-workspace');
      expect(historyEntry.project).toBe('default');
      expect(historyEntry.filesImported).toBe(1);
      expect(historyEntry.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
