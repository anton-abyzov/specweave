#!/usr/bin/env node

/**
 * BMAD Project Analyzer
 *
 * Analyzes a BMAD-METHOD project structure and provides health assessment
 * and recommendations.
 */

const fs = require('fs');
const path = require('path');

class BMADProjectAnalyzer {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.issues = [];
    this.warnings = [];
    this.info = [];
    this.structure = {
      hasBmadCore: false,
      hasDocs: false,
      hasPRD: false,
      hasArchitecture: false,
      hasEpics: false,
      hasStories: false,
      hasQA: false,
      hasTechnicalPreferences: false,
      hasCoreConfig: false,
      nodeModules: false,
      packageJson: false
    };
  }

  checkPath(relativePath) {
    const fullPath = path.join(this.projectPath, relativePath);
    return fs.existsSync(fullPath);
  }

  readFile(relativePath) {
    try {
      const fullPath = path.join(this.projectPath, relativePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  countFiles(dirPath) {
    try {
      const fullPath = path.join(this.projectPath, dirPath);
      if (!fs.existsSync(fullPath)) return 0;
      const files = fs.readdirSync(fullPath);
      return files.filter(f => !f.startsWith('.')).length;
    } catch (error) {
      return 0;
    }
  }

  analyzeStructure() {
    console.log('\n🔍 Analyzing BMAD Project Structure...\n');

    // Check core BMAD structure
    this.structure.hasBmadCore = this.checkPath('bmad-core');
    this.structure.hasDocs = this.checkPath('docs');
    this.structure.hasPRD = this.checkPath('docs/prd.md');
    this.structure.hasArchitecture = this.checkPath('docs/architecture.md');
    this.structure.hasEpics = this.checkPath('docs/epics');
    this.structure.hasStories = this.checkPath('docs/stories');
    this.structure.hasQA = this.checkPath('docs/qa');
    this.structure.hasTechnicalPreferences = this.checkPath('.bmad-core/data/technical-preferences.md');
    this.structure.hasCoreConfig = this.checkPath('.bmad-core/core-config.yaml');
    this.structure.packageJson = this.checkPath('package.json');
    this.structure.nodeModules = this.checkPath('node_modules');

    // Core structure checks
    if (!this.structure.hasBmadCore && !this.structure.hasDocs) {
      this.issues.push('No BMAD structure detected. Run: npx bmad-method install');
      return; // Early return if not a BMAD project
    }

    if (this.structure.hasBmadCore) {
      this.info.push('✓ bmad-core/ directory found');
    } else {
      this.warnings.push('⚠ bmad-core/ directory not found - custom setup?');
    }

    if (this.structure.hasDocs) {
      this.info.push('✓ docs/ directory found');
    } else {
      this.warnings.push('⚠ docs/ directory not found - create with: mkdir docs');
    }

    // Planning artifacts
    if (this.structure.hasPRD) {
      const prdContent = this.readFile('docs/prd.md');
      const prdSize = prdContent ? prdContent.length : 0;
      this.info.push(`✓ PRD found (${(prdSize / 1024).toFixed(1)}KB)`);
    } else {
      this.info.push('ℹ No PRD yet - use @pm to create one');
    }

    if (this.structure.hasArchitecture) {
      const archContent = this.readFile('docs/architecture.md');
      const archSize = archContent ? archContent.length : 0;
      this.info.push(`✓ Architecture document found (${(archSize / 1024).toFixed(1)}KB)`);
    } else {
      this.info.push('ℹ No architecture document - use @architect to create one');
    }

    // Development artifacts
    const epicCount = this.countFiles('docs/epics');
    const storyCount = this.countFiles('docs/stories');
    const qaCount = this.countFiles('docs/qa/assessments');

    if (epicCount > 0) {
      this.info.push(`✓ ${epicCount} epic(s) found`);
    } else {
      this.info.push('ℹ No epics yet - use @po to shard PRD into epics');
    }

    if (storyCount > 0) {
      this.info.push(`✓ ${storyCount} user story(ies) found`);
    } else {
      this.info.push('ℹ No user stories yet - use @pm or @scrum to create stories');
    }

    if (qaCount > 0) {
      this.info.push(`✓ ${qaCount} QA assessment(s) found`);
    } else if (storyCount > 0) {
      this.warnings.push('⚠ Stories exist but no QA assessments - consider using @qa *risk and @qa *design');
    }

    // Configuration
    if (this.structure.hasTechnicalPreferences) {
      this.info.push('✓ Technical preferences configured');
    } else {
      this.warnings.push('⚠ No technical-preferences.md - consider creating one for consistent tech stack decisions');
    }

    if (this.structure.hasCoreConfig) {
      this.info.push('✓ Core configuration found');
    } else {
      this.warnings.push('⚠ No core-config.yaml found');
    }

    // Node.js setup
    if (this.structure.packageJson) {
      this.info.push('✓ package.json found');
    }

    if (this.structure.nodeModules) {
      this.info.push('✓ Dependencies installed');
    } else if (this.structure.packageJson) {
      this.warnings.push('⚠ package.json exists but node_modules missing - run: npm install');
    }
  }

  analyzeDocumentAlignment() {
    if (!this.structure.hasPRD || !this.structure.hasArchitecture) {
      return; // Can't check alignment without both documents
    }

    console.log('\n📋 Analyzing Document Alignment...\n');

    const prd = this.readFile('docs/prd.md');
    const arch = this.readFile('docs/architecture.md');

    // Basic checks for alignment
    const prdSections = this.extractSections(prd);
    const archSections = this.extractSections(arch);

    // Check if architecture references key PRD elements
    const prdHasEpics = /##\s*Epics/i.test(prd);
    const prdHasUserStories = /##\s*User Stories/i.test(prd);
    const archHasSystemDesign = /##\s*(System Design|Architecture Overview)/i.test(arch);
    const archHasTechStack = /##\s*(Tech(nology)? Stack|Technical Stack)/i.test(arch);

    if (prdHasEpics) {
      this.info.push('✓ PRD contains Epics section');
    }

    if (prdHasUserStories) {
      this.info.push('✓ PRD contains User Stories section');
    }

    if (archHasSystemDesign) {
      this.info.push('✓ Architecture has System Design section');
    } else {
      this.warnings.push('⚠ Architecture should include System Design section');
    }

    if (archHasTechStack) {
      this.info.push('✓ Architecture specifies Tech Stack');
    } else {
      this.warnings.push('⚠ Architecture should specify Technology Stack');
    }

    // Check document sizes - PRD and Architecture should be substantial
    if (prd.length < 2000) {
      this.warnings.push('⚠ PRD seems short (<2KB) - ensure it\'s comprehensive');
    }

    if (arch.length < 1500) {
      this.warnings.push('⚠ Architecture document seems short (<1.5KB) - ensure it\'s detailed');
    }
  }

  extractSections(markdown) {
    const sections = [];
    const lines = markdown.split('\n');
    for (const line of lines) {
      const match = line.match(/^#+\s+(.+)$/);
      if (match) {
        sections.push(match[1].trim());
      }
    }
    return sections;
  }

  analyzeWorkflowProgress() {
    console.log('\n📊 Workflow Progress Assessment...\n');

    const hasPRD = this.structure.hasPRD;
    const hasArch = this.structure.hasArchitecture;
    const hasEpics = this.structure.hasEpics && this.countFiles('docs/epics') > 0;
    const hasStories = this.structure.hasStories && this.countFiles('docs/stories') > 0;
    const hasQA = this.structure.hasQA && this.countFiles('docs/qa/assessments') > 0;

    let phase = 'Not Started';
    let nextSteps = [];

    if (!hasPRD && !hasArch) {
      phase = 'Planning Phase - Not Started';
      nextSteps = [
        '1. Create project brief',
        '2. Use @pm to create PRD',
        '3. Use @architect to design architecture',
        '4. Use @po to validate alignment'
      ];
    } else if (hasPRD && !hasArch) {
      phase = 'Planning Phase - PRD Created';
      nextSteps = [
        '1. Use @architect to design system architecture',
        '2. Use @po to validate PRD/Architecture alignment',
        '3. Use @po to shard documents into epics/stories'
      ];
    } else if (hasPRD && hasArch && !hasEpics) {
      phase = 'Planning Phase - Documents Complete';
      nextSteps = [
        '1. Use @po to validate document alignment',
        '2. Use @po to shard PRD into epics and stories',
        '3. Transition to IDE for development phase'
      ];
    } else if (hasEpics && !hasStories) {
      phase = 'Development Preparation';
      nextSteps = [
        '1. Use @pm or @scrum to create user stories from epics',
        '2. Use @qa *risk to assess story risks',
        '3. Use @qa *design to create test strategies'
      ];
    } else if (hasStories && !hasQA) {
      phase = 'Development Phase - Stories Ready';
      nextSteps = [
        '1. Use @qa *risk {story} for risk assessment',
        '2. Use @qa *design {story} for test strategy',
        '3. Use @dev to implement first story',
        '4. Use @qa *review after implementation'
      ];
    } else if (hasStories && hasQA) {
      phase = 'Development Phase - Active';
      nextSteps = [
        '1. Continue iterative development cycle',
        '2. Use @dev to implement stories',
        '3. Use @qa *review for quality checks',
        '4. Commit and move to next story'
      ];
    }

    console.log(`Current Phase: ${phase}\n`);
    console.log('Recommended Next Steps:');
    nextSteps.forEach(step => console.log(`  ${step}`));
  }

  generateReport() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('         BMAD-METHOD PROJECT ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\nProject Path: ${this.projectPath}\n`);

    this.analyzeStructure();
    this.analyzeDocumentAlignment();
    this.analyzeWorkflowProgress();

    if (this.issues.length > 0) {
      console.log('\n🚨 ISSUES:\n');
      this.issues.forEach(issue => console.log(`  ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.info.length > 0) {
      console.log('\nℹ️  INFO:\n');
      this.info.forEach(info => console.log(`  ${info}`));
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// Main execution
const projectPath = process.argv[2] || process.cwd();
const analyzer = new BMADProjectAnalyzer(projectPath);
analyzer.generateReport();
