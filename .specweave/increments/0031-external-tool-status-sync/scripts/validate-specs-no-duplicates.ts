#!/usr/bin/env ts-node

/**
 * SpecWeave Living Docs Validation Script
 *
 * Detects and reports duplicate feature folders created by date-based FS- prefixes
 *
 * Purpose:
 * - Find all FS-* folders with date prefixes (FS-25-11-XX-feature-name)
 * - Group them by core feature name
 * - Report duplicates
 * - Suggest consolidation strategy
 */

import fs from 'fs-extra';
import path from 'path';

interface FeatureFolder {
  fullPath: string;
  folderName: string;
  datePrefix: string | null;
  coreName: string;
  userStoryCount: number;
  created: Date | null;
}

interface DuplicateGroup {
  coreName: string;
  folders: FeatureFolder[];
  totalUserStories: number;
  recommendedFolder: string;
}

class SpecsValidator {
  private specsDir: string;

  constructor(projectRoot: string, projectId: string = 'default') {
    this.specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs', projectId);
  }

  /**
   * Main validation entry point
   */
  async validate(): Promise<void> {
    console.log('🔍 SpecWeave Living Docs Validation\n');
    console.log(`📂 Specs Directory: ${this.specsDir}\n`);

    if (!await fs.pathExists(this.specsDir)) {
      console.log('❌ Specs directory does not exist!');
      return;
    }

    // Scan all feature folders
    const folders = await this.scanFeatureFolders();

    console.log(`📊 Found ${folders.length} feature folders\n`);

    // Detect duplicates
    const duplicates = this.detectDuplicates(folders);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates detected! All features are unique.\n');
      return;
    }

    // Report duplicates
    console.log(`⚠️  Found ${duplicates.length} duplicate feature groups:\n`);
    this.reportDuplicates(duplicates);

    // Suggest consolidation
    console.log('\n📝 Consolidation Recommendations:\n');
    this.suggestConsolidation(duplicates);
  }

  /**
   * Scan all feature folders in specs directory
   */
  private async scanFeatureFolders(): Promise<FeatureFolder[]> {
    const entries = await fs.readdir(this.specsDir, { withFileTypes: true });
    const folders: FeatureFolder[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '_archive') continue; // Skip archive folder
      if (entry.name.startsWith('.')) continue; // Skip hidden folders

      const folderPath = path.join(this.specsDir, entry.name);
      const folder = await this.analyzeFolder(folderPath, entry.name);

      if (folder) {
        folders.push(folder);
      }
    }

    return folders;
  }

  /**
   * Analyze a single feature folder
   */
  private async analyzeFolder(folderPath: string, folderName: string): Promise<FeatureFolder | null> {
    // Extract date prefix and core name
    const dateMatch = folderName.match(/^FS-(\d{2}-\d{2}-\d{2})-(.+)$/);

    const datePrefix = dateMatch ? dateMatch[1] : null;
    const coreName = dateMatch ? dateMatch[2] : folderName;

    // Count user stories
    const userStoryCount = await this.countUserStories(folderPath);

    // Get creation date from README.md or folder stats
    const created = await this.getFolderCreationDate(folderPath);

    return {
      fullPath: folderPath,
      folderName,
      datePrefix,
      coreName,
      userStoryCount,
      created,
    };
  }

  /**
   * Count user story files in folder
   */
  private async countUserStories(folderPath: string): Promise<number> {
    try {
      const files = await fs.readdir(folderPath);
      return files.filter(f => f.match(/^us-\d{3}-.+\.md$/)).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get folder creation date
   */
  private async getFolderCreationDate(folderPath: string): Promise<Date | null> {
    try {
      // Try README.md frontmatter first
      const readmePath = path.join(folderPath, 'README.md');
      if (await fs.pathExists(readmePath)) {
        const content = await fs.readFile(readmePath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          const yaml = await import('yaml');
          const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

          if (frontmatter.created) {
            return new Date(frontmatter.created);
          }
        }
      }

      // Fallback: folder stats
      const stats = await fs.stat(folderPath);
      return stats.birthtime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect duplicate feature folders (same core name, different date prefixes)
   */
  private detectDuplicates(folders: FeatureFolder[]): DuplicateGroup[] {
    const groups = new Map<string, FeatureFolder[]>();

    // Group by core name
    for (const folder of folders) {
      const existing = groups.get(folder.coreName) || [];
      existing.push(folder);
      groups.set(folder.coreName, existing);
    }

    // Find groups with multiple folders (duplicates)
    const duplicates: DuplicateGroup[] = [];

    for (const [coreName, folderList] of groups.entries()) {
      if (folderList.length > 1) {
        // Sort by user story count (descending)
        folderList.sort((a, b) => b.userStoryCount - a.userStoryCount);

        const totalUserStories = folderList.reduce((sum, f) => sum + f.userStoryCount, 0);
        const recommendedFolder = folderList[0].folderName; // Folder with most user stories

        duplicates.push({
          coreName,
          folders: folderList,
          totalUserStories,
          recommendedFolder,
        });
      }
    }

    return duplicates;
  }

  /**
   * Report duplicates to console
   */
  private reportDuplicates(duplicates: DuplicateGroup[]): void {
    for (const group of duplicates) {
      console.log(`📦 Feature: ${group.coreName}`);
      console.log(`   Total User Stories: ${group.totalUserStories}`);
      console.log(`   Duplicate Folders (${group.folders.length}):`);

      for (const folder of group.folders) {
        const recommended = folder.folderName === group.recommendedFolder ? ' ⭐ KEEP' : '';
        console.log(`     - ${folder.folderName} (${folder.userStoryCount} user stories)${recommended}`);
      }

      console.log('');
    }
  }

  /**
   * Suggest consolidation strategy
   */
  private suggestConsolidation(duplicates: DuplicateGroup[]): void {
    console.log('Strategy: Consolidate to simple feature names (no date prefixes)\n');

    for (const group of duplicates) {
      const targetFolder = group.coreName; // Simple name (no FS- prefix, no date)

      console.log(`📁 ${group.coreName}:`);
      console.log(`   Target: ${targetFolder}/`);
      console.log(`   Actions:`);

      for (const folder of group.folders) {
        if (folder.folderName === targetFolder) {
          console.log(`     ✓ Already correct: ${folder.folderName}`);
        } else {
          console.log(`     → Merge: ${folder.folderName} → ${targetFolder}`);
        }
      }

      console.log('');
    }

    console.log('📝 Consolidation Script:');
    console.log('   Run: npm run migrate:consolidate-specs\n');
  }
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const projectId = process.argv[2] || 'default';

  const validator = new SpecsValidator(projectRoot, projectId);
  await validator.validate();
}

main().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
