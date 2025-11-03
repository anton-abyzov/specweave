#!/usr/bin/env node

/**
 * BMAD Setup Checker
 *
 * Verifies BMAD-METHOD installation and configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BMADSetupChecker {
  constructor() {
    this.checks = [];
    this.issues = [];
    this.warnings = [];
  }

  checkNodeVersion() {
    try {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);

      if (majorVersion >= 20) {
        this.checks.push(`✓ Node.js ${version} (required: v20+)`);
      } else {
        this.issues.push(`✗ Node.js ${version} is too old. Required: v20+`);
      }
    } catch (error) {
      this.issues.push('✗ Could not determine Node.js version');
    }
  }

  checkNpmAvailable() {
    try {
      const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
      this.checks.push(`✓ npm ${version}`);
    } catch (error) {
      this.issues.push('✗ npm not found. Install Node.js from https://nodejs.org/');
    }
  }

  checkBMADInstallation() {
    const homeDir = require('os').homedir();
    const bmadPaths = [
      path.join(process.cwd(), 'bmad-core'),
      path.join(process.cwd(), '.bmad-core'),
      path.join(homeDir, '.bmad'),
    ];

    let found = false;
    for (const bmadPath of bmadPaths) {
      if (fs.existsSync(bmadPath)) {
        this.checks.push(`✓ BMAD installation found at ${bmadPath}`);
        found = true;
        break;
      }
    }

    if (!found) {
      this.warnings.push('⚠ BMAD installation not found in current directory');
      this.warnings.push('  Run: npx bmad-method install');
    }
  }

  checkGitAvailable() {
    try {
      const version = execSync('git --version', { encoding: 'utf-8' }).trim();
      this.checks.push(`✓ ${version}`);
    } catch (error) {
      this.warnings.push('⚠ git not found - recommended for version control');
    }
  }

  checkIDEIntegration() {
    const ideMarkers = {
      'VS Code': ['.vscode'],
      'Cursor': ['.cursor', '.cursorrules'],
      'WebStorm': ['.idea']
    };

    let foundIDE = false;
    for (const [ide, markers] of Object.entries(ideMarkers)) {
      for (const marker of markers) {
        if (fs.existsSync(path.join(process.cwd(), marker))) {
          this.checks.push(`✓ ${ide} integration detected`);
          foundIDE = true;
          break;
        }
      }
    }

    if (!foundIDE) {
      this.warnings.push('⚠ No IDE integration detected - BMAD works best with IDE integration');
    }
  }

  checkProjectStructure() {
    const requiredDirs = ['docs'];
    const optionalDirs = ['bmad-core', 'expansion-packs', 'dist', 'tools'];

    for (const dir of requiredDirs) {
      if (fs.existsSync(path.join(process.cwd(), dir))) {
        this.checks.push(`✓ ${dir}/ directory exists`);
      } else {
        this.warnings.push(`⚠ ${dir}/ directory not found - create with: mkdir ${dir}`);
      }
    }

    for (const dir of optionalDirs) {
      if (fs.existsSync(path.join(process.cwd(), dir))) {
        this.checks.push(`✓ ${dir}/ directory exists`);
      }
    }
  }

  checkConfiguration() {
    const configFiles = [
      '.bmad-core/core-config.yaml',
      '.bmad-core/data/technical-preferences.md',
      'package.json'
    ];

    for (const configFile of configFiles) {
      const fullPath = path.join(process.cwd(), configFile);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        this.checks.push(`✓ ${configFile} (${(stats.size / 1024).toFixed(1)}KB)`);
      } else {
        if (configFile === 'package.json') {
          this.warnings.push(`⚠ ${configFile} not found - run: npm init`);
        } else {
          this.warnings.push(`⚠ ${configFile} not found`);
        }
      }
    }
  }

  checkBMADCommand() {
    try {
      // Try to check if bmad-method is available
      execSync('npx bmad-method --version', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      this.checks.push('✓ bmad-method CLI accessible via npx');
    } catch (error) {
      // This is not necessarily an error, just means it's not cached
      this.warnings.push('⚠ bmad-method not cached - first run will download it');
    }
  }

  generateReport() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('         BMAD-METHOD SETUP VERIFICATION');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Running setup checks...\n');

    this.checkNodeVersion();
    this.checkNpmAvailable();
    this.checkBMADInstallation();
    this.checkGitAvailable();
    this.checkIDEIntegration();
    this.checkProjectStructure();
    this.checkConfiguration();
    this.checkBMADCommand();

    if (this.checks.length > 0) {
      console.log('✅ PASSED CHECKS:\n');
      this.checks.forEach(check => console.log(`  ${check}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.issues.length > 0) {
      console.log('\n🚨 ISSUES:\n');
      this.issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log('\n═══════════════════════════════════════════════════════');

    if (this.issues.length === 0) {
      console.log('              ✓ SETUP VERIFICATION PASSED');
    } else {
      console.log('           ⚠ SETUP ISSUES DETECTED - SEE ABOVE');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 Your BMAD-METHOD setup looks good!\n');
      console.log('Next steps:');
      console.log('  1. Create a project brief');
      console.log('  2. Use @pm to create a PRD');
      console.log('  3. Use @architect to design architecture');
      console.log('  4. Start developing!\n');
    }
  }
}

// Main execution
const checker = new BMADSetupChecker();
checker.generateReport();
