/**
 * Brownfield Importer - Import External Documentation
 *
 * Imports brownfield documentation from Notion, Confluence, Wiki, etc.
 * Classifies files and copies to appropriate destinations
 */

import path from 'path';
import fs from 'fs-extra';
import { BrownfieldAnalyzer, FileClassification } from './analyzer.js';
import { ProjectManager } from '../project-manager.js';
import { ConfigManager } from '../config-manager.js';

export interface ImportOptions {
  sourcePath: string;
  project: string;
  source: 'notion' | 'confluence' | 'wiki' | 'custom';
  preserveStructure?: boolean;
  dryRun?: boolean;
}

export interface ImportReport {
  totalFiles: number;
  specsImported: number;
  modulesImported: number;
  teamImported: number;
  legacyImported: number;
  destination: string;
  timestamp: string;
  classifications: {
    specs: FileClassification[];
    modules: FileClassification[];
    team: FileClassification[];
    legacy: FileClassification[];
  };
}

export class BrownfieldImporter {
  private analyzer: BrownfieldAnalyzer;
  private projectManager: ProjectManager;
  private configManager: ConfigManager;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.analyzer = new BrownfieldAnalyzer();
    this.projectManager = new ProjectManager(projectRoot);
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Import brownfield docs
   *
   * @param options - Import options
   * @returns ImportReport
   */
  async import(options: ImportOptions): Promise<ImportReport> {
    console.log(`\n🔍 Analyzing ${options.sourcePath}...`);

    // Validate source path
    if (!(await fs.pathExists(options.sourcePath))) {
      throw new Error(`Source path does not exist: ${options.sourcePath}`);
    }

    // Validate project exists
    const project = this.projectManager.getProjectById(options.project);
    if (!project) {
      throw new Error(`Project '${options.project}' not found. Create it first with /specweave:init-multiproject`);
    }

    // 1. Analyze files
    const analysis = await this.analyzer.analyze(options.sourcePath);

    if (analysis.totalFiles === 0) {
      throw new Error('No markdown files found in source directory');
    }

    console.log(`\n📊 Analysis Results:`);
    console.log(`   Total files: ${analysis.totalFiles}`);
    console.log(`   - Specs: ${analysis.specs.length} (${(analysis.statistics.specsConfidence * 100).toFixed(0)}% avg confidence)`);
    console.log(`   - Modules: ${analysis.modules.length} (${(analysis.statistics.modulesConfidence * 100).toFixed(0)}% avg confidence)`);
    console.log(`   - Team docs: ${analysis.team.length} (${(analysis.statistics.teamConfidence * 100).toFixed(0)}% avg confidence)`);
    console.log(`   - Legacy: ${analysis.legacy.length}\n`);

    // Dry run mode - just show analysis
    if (options.dryRun) {
      console.log('🔍 Dry run mode - no files will be imported\n');

      const report = this.analyzer.generateSummaryReport(analysis);
      console.log(report);

      return {
        totalFiles: analysis.totalFiles,
        specsImported: 0,
        modulesImported: 0,
        teamImported: 0,
        legacyImported: 0,
        destination: this.projectManager.getLegacyPath(options.source, options.project),
        timestamp: new Date().toISOString(),
        classifications: {
          specs: analysis.specs,
          modules: analysis.modules,
          team: analysis.team,
          legacy: analysis.legacy
        }
      };
    }

    // 2. Confirm with user (in real usage, this would be an interactive prompt)
    console.log('📦 Importing files...\n');

    // 3. Import specs
    const specsPath = this.projectManager.getSpecsPath(options.project);
    await this.importFiles(analysis.specs, specsPath, options.preserveStructure, options.sourcePath);
    console.log(`✅ Imported ${analysis.specs.length} spec(s) to specs/`);

    // 4. Import modules
    const modulesPath = this.projectManager.getModulesPath(options.project);
    await this.importFiles(analysis.modules, modulesPath, options.preserveStructure, options.sourcePath);
    console.log(`✅ Imported ${analysis.modules.length} module doc(s) to modules/`);

    // 5. Import team docs
    const teamPath = this.projectManager.getTeamPath(options.project);
    await this.importFiles(analysis.team, teamPath, options.preserveStructure, options.sourcePath);
    console.log(`✅ Imported ${analysis.team.length} team doc(s) to team/`);

    // 6. Import legacy
    const legacyPath = this.projectManager.getLegacyPath(options.source, options.project);
    await this.importFiles(analysis.legacy, legacyPath, options.preserveStructure, options.sourcePath);
    console.log(`✅ Imported ${analysis.legacy.length} legacy doc(s) to legacy/${options.source}/`);

    // 7. Create migration report
    const report: ImportReport = {
      totalFiles: analysis.totalFiles,
      specsImported: analysis.specs.length,
      modulesImported: analysis.modules.length,
      teamImported: analysis.team.length,
      legacyImported: analysis.legacy.length,
      destination: this.projectManager.getLegacyPath(options.source, options.project),
      timestamp: new Date().toISOString(),
      classifications: {
        specs: analysis.specs,
        modules: analysis.modules,
        team: analysis.team,
        legacy: analysis.legacy
      }
    };

    await this.createMigrationReport(options, report, analysis);

    // 8. Update config
    await this.updateConfig(options, report);

    console.log('\n✅ Import complete!\n');
    console.log(`📄 Migration report: ${path.join(legacyPath, '../README.md')}\n`);

    return report;
  }

  /**
   * Import files to destination
   *
   * @param files - Files to import
   * @param destination - Destination directory
   * @param preserveStructure - Preserve original folder structure
   * @param basePath - Base path for relative path calculation
   */
  private async importFiles(
    files: FileClassification[],
    destination: string,
    preserveStructure = false,
    basePath: string
  ): Promise<void> {
    await fs.ensureDir(destination);

    for (const file of files) {
      let destPath: string;

      if (preserveStructure) {
        // Preserve folder structure
        const relativePath = path.relative(basePath, file.path);
        destPath = path.join(destination, relativePath);

        // Ensure parent directory exists
        await fs.ensureDir(path.dirname(destPath));
      } else {
        // Flatten structure - just use filename
        const fileName = path.basename(file.path);
        destPath = path.join(destination, fileName);

        // Handle duplicate filenames
        if (await fs.pathExists(destPath)) {
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          const timestamp = Date.now();
          destPath = path.join(destination, `${base}-${timestamp}${ext}`);
        }
      }

      await fs.copy(file.path, destPath);
    }
  }

  /**
   * Create migration report in legacy/ folder
   *
   * @param options - Import options
   * @param report - Import report
   * @param analysis - Analysis result
   */
  private async createMigrationReport(
    options: ImportOptions,
    report: ImportReport,
    analysis: any
  ): Promise<void> {
    const legacyBasePath = this.projectManager.getLegacyPath(undefined, options.project);
    const legacyREADME = path.join(legacyBasePath, 'README.md');

    // Generate analysis summary
    const analysisReport = this.analyzer.generateSummaryReport(analysis);

    const content = `# Brownfield Migration Report

**Source**: ${options.source}
**Source Path**: ${options.sourcePath}
**Imported**: ${report.timestamp}
**Total Files**: ${report.totalFiles}

## Import Summary

- **Specs**: ${report.specsImported} files → \`specs/\`
- **Modules**: ${report.modulesImported} files → \`modules/\`
- **Team Docs**: ${report.teamImported} files → \`team/\`
- **Legacy**: ${report.legacyImported} files → \`legacy/${options.source}/\`

## Classification Analysis

${analysisReport}

## Next Steps

1. **Review imported files** for accuracy
2. **Manually move misclassified files** if needed:
   - Use file manager or git to move files between folders
   - Update references in other docs if needed
3. **Update spec numbers** to follow SpecWeave conventions:
   - Specs should be numbered: \`spec-001-feature-name.md\`
   - Current files may have different naming
4. **Clean up legacy folder** when migration is complete:
   - Move useful docs to appropriate folders
   - Delete obsolete or duplicate content
5. **Update team docs** to match SpecWeave templates:
   - See \`team/README.md\` for template guidance

## Migration Notes

### Structure Preservation
${options.preserveStructure ?
'✅ Original folder structure preserved' :
'📁 Files flattened to destination folders (no subdirectories)'}

### Confidence Scores

Files were classified with confidence scores (0-100%):
- **70%+**: High confidence (likely correct)
- **50-70%**: Medium confidence (review recommended)
- **30-50%**: Low confidence (likely legacy)
- **<30%**: No match (moved to legacy)

### Common Issues

**Misclassified files?**
- Check confidence scores in analysis above
- Files with low confidence may be in wrong folder
- Manually move files as needed

**Duplicate content?**
- Compare imported files with existing docs
- Merge duplicates or mark for deletion
- Update cross-references

**Outdated information?**
- Review dates and version numbers
- Mark obsolete docs for deletion
- Update references to current systems

## Source Information

- **Type**: ${options.source}
- **Source Path**: \`${options.sourcePath}\`
- **Destination**: \`${report.destination}\`
- **Project**: ${options.project}

## Import History

See \`.specweave/config.json\` → \`brownfield.importHistory\` for complete import history.

---

**Generated**: ${new Date().toISOString()}
**Tool**: SpecWeave Brownfield Importer
`;

    await fs.writeFile(legacyREADME, content);
  }

  /**
   * Update config with import history
   *
   * @param options - Import options
   * @param report - Import report
   */
  private async updateConfig(
    options: ImportOptions,
    report: ImportReport
  ): Promise<void> {
    const config = this.configManager.load();

    if (!config.brownfield) {
      config.brownfield = { importHistory: [] };
    }

    config.brownfield.importHistory.push({
      source: options.source,
      workspace: path.basename(options.sourcePath),
      importedAt: report.timestamp,
      project: options.project,
      filesImported: report.totalFiles,
      destination: report.destination
    });

    await this.configManager.save(config);
  }

  /**
   * Preview import (dry run)
   *
   * @param options - Import options
   * @returns Analysis result as string
   */
  async preview(options: ImportOptions): Promise<string> {
    const dryRunOptions = { ...options, dryRun: true };
    const report = await this.import(dryRunOptions);

    return this.analyzer.generateSummaryReport({
      totalFiles: report.totalFiles,
      specs: report.classifications.specs,
      modules: report.classifications.modules,
      team: report.classifications.team,
      legacy: report.classifications.legacy,
      statistics: {
        specsConfidence: this.calculateAvgConfidence(report.classifications.specs),
        modulesConfidence: this.calculateAvgConfidence(report.classifications.modules),
        teamConfidence: this.calculateAvgConfidence(report.classifications.team)
      }
    });
  }

  private calculateAvgConfidence(files: FileClassification[]): number {
    if (files.length === 0) return 0;
    return files.reduce((sum, file) => sum + file.confidence, 0) / files.length;
  }
}
