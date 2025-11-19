/**
 * CLI Command: /specweave:import-docs
 *
 * Import brownfield documentation from external sources
 */

import path from 'path';
import inquirer from 'inquirer';
import { BrownfieldImporter, ImportOptions } from '../../core/brownfield/importer.js';
import { ProjectManager } from '../../core/project-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI import command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (import progress, classification results, warnings).
// Logger infrastructure available for future internal debug logs if needed.

export interface ImportDocsArgs {
  sourcePath: string;
  source?: 'notion' | 'confluence' | 'wiki' | 'custom';
  project?: string;
  preserveStructure?: boolean;
  dryRun?: boolean;
}

export async function importDocs(
  projectRoot: string,
  args: ImportDocsArgs
): Promise<void> {
  console.log('\n📥 Import Brownfield Documentation\n');

  try {
    // Validate source path
    if (!args.sourcePath) {
      throw new Error('Source path is required. Usage: /specweave:import-docs <source-path> [options]');
    }

    // Resolve source path (handle relative paths)
    const sourcePath = path.isAbsolute(args.sourcePath)
      ? args.sourcePath
      : path.resolve(process.cwd(), args.sourcePath);

    // Get source type if not provided
    let source = args.source;
    if (!source) {
      const { sourceType } = await inquirer.prompt([{
        type: 'list',
        name: 'sourceType',
        message: 'Select source type:',
        choices: [
          { name: 'Notion (markdown export)', value: 'notion' },
          { name: 'Confluence (HTML/markdown export)', value: 'confluence' },
          { name: 'GitHub Wiki (git repository)', value: 'wiki' },
          { name: 'Custom (any markdown folder)', value: 'custom' }
        ]
      }]);
      source = sourceType;
    }

    // Get target project
    const projectManager = new ProjectManager(projectRoot);
    const allProjects = projectManager.getAllProjects();
    const activeProject = projectManager.getActiveProject();

    let targetProject = args.project || activeProject.projectId;

    if (!args.project && allProjects.length > 1) {
      const { projectId } = await inquirer.prompt([{
        type: 'list',
        name: 'projectId',
        message: 'Select target project:',
        choices: allProjects.map(p => ({
          name: `${p.projectName} (${p.projectId})`,
          value: p.projectId
        })),
        default: activeProject.projectId
      }]);
      targetProject = projectId;
    }

    // Confirm before import (unless dry run)
    if (!args.dryRun) {
      console.log('\n📋 Import Configuration:\n');
      console.log(`  Source: ${sourcePath}`);
      console.log(`  Type: ${source}`);
      console.log(`  Target project: ${targetProject}`);
      console.log(`  Preserve structure: ${args.preserveStructure ? 'Yes' : 'No'}\n`);

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with import?',
        default: true
      }]);

      if (!confirm) {
        console.log('\n❌ Import cancelled\n');
        return;
      }
    }

    // Create importer
    const importer = new BrownfieldImporter(projectRoot);

    // Import options
    const options: ImportOptions = {
      sourcePath,
      project: targetProject,
      source: source as 'notion' | 'confluence' | 'wiki' | 'custom',
      preserveStructure: args.preserveStructure || false,
      dryRun: args.dryRun || false
    };

    // Import
    const report = await importer.import(options);

    if (args.dryRun) {
      console.log('\n🔍 Dry run complete - no files were imported');
      console.log('   Remove --dry-run flag to perform actual import\n');
    } else {
      // Show summary
      console.log('\n📊 Import Summary:\n');
      console.log(`  Total files: ${report.totalFiles}`);
      console.log(`  - Specs: ${report.specsImported}`);
      console.log(`  - Modules: ${report.modulesImported}`);
      console.log(`  - Team docs: ${report.teamImported}`);
      console.log(`  - Legacy: ${report.legacyImported}\n`);

      console.log('📄 Migration report created:');
      console.log(`   ${path.join(report.destination, '../README.md')}\n`);

      console.log('✅ Next steps:');
      console.log('   1. Review migration report for classification accuracy');
      console.log('   2. Manually move misclassified files if needed');
      console.log('   3. Update spec numbers to follow SpecWeave conventions');
      console.log('   4. Clean up legacy/ folder when migration complete\n');
    }

  } catch (error) {
    console.error(`\n❌ Import failed: ${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

/**
 * Parse command-line arguments for import-docs
 *
 * @param args - Raw command-line arguments
 * @returns Parsed arguments
 */
export function parseImportDocsArgs(args: string[]): ImportDocsArgs {
  const result: ImportDocsArgs = {
    sourcePath: ''
  };

  // First arg is source path
  if (args.length > 0) {
    result.sourcePath = args[0];
  }

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--source=')) {
      const value = arg.substring('--source='.length);
      if (['notion', 'confluence', 'wiki', 'custom'].includes(value)) {
        result.source = value as 'notion' | 'confluence' | 'wiki' | 'custom';
      }
    } else if (arg.startsWith('--project=')) {
      result.project = arg.substring('--project='.length);
    } else if (arg === '--preserve-structure') {
      result.preserveStructure = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}
