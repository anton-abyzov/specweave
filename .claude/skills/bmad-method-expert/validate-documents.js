#!/usr/bin/env node

/**
 * BMAD Document Validator
 *
 * Validates alignment between PRD and Architecture documents
 */

const fs = require('fs');
const path = require('path');

class DocumentValidator {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.issues = [];
    this.warnings = [];
    this.successes = [];
  }

  readDocument(relativePath) {
    try {
      const fullPath = path.join(this.projectPath, relativePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  extractSections(markdown) {
    const sections = [];
    const lines = markdown.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#+)\s+(.+)$/);

      if (headerMatch) {
        if (currentSection) {
          sections.push({
            level: currentSection.level,
            title: currentSection.title,
            content: currentContent.join('\n')
          });
        }

        currentSection = {
          level: headerMatch[1].length,
          title: headerMatch[2].trim()
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections.push({
        level: currentSection.level,
        title: currentSection.title,
        content: currentContent.join('\n')
      });
    }

    return sections;
  }

  extractFeatures(content) {
    const features = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for feature headings
      if (/^#{3,4}\s+(Feature|Epic|Story).*:/i.test(line)) {
        features.push(line.replace(/^#+\s+/, '').trim());
      }
    }

    return features;
  }

  extractTechnologies(content) {
    const technologies = new Set();
    const techPatterns = [
      /React/gi, /Vue/gi, /Angular/gi, /Node\.js/gi, /Python/gi,
      /PostgreSQL/gi, /MongoDB/gi, /MySQL/gi, /Redis/gi,
      /Express/gi, /FastAPI/gi, /Django/gi, /Flask/gi,
      /TypeScript/gi, /JavaScript/gi, /Go/gi, /Java/gi,
      /Docker/gi, /Kubernetes/gi, /AWS/gi, /Azure/gi, /GCP/gi,
      /REST/gi, /GraphQL/gi, /gRPC/gi
    ];

    techPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => technologies.add(match));
      }
    });

    return Array.from(technologies);
  }

  validatePRD(prdContent) {
    console.log('\n📋 Validating PRD Structure...\n');

    const sections = this.extractSections(prdContent);
    const sectionTitles = sections.map(s => s.title.toLowerCase());

    // Required PRD sections
    const requiredSections = [
      { name: 'project overview', aliases: ['overview', 'executive summary'] },
      { name: 'functional requirements', aliases: ['requirements', 'features'] },
      { name: 'non-functional requirements', aliases: ['nfr', 'quality attributes'] },
      { name: 'user stories', aliases: ['stories'] }
    ];

    requiredSections.forEach(req => {
      const found = sectionTitles.some(title =>
        title.includes(req.name) || req.aliases.some(alias => title.includes(alias))
      );

      if (found) {
        this.successes.push(`✓ PRD has '${req.name}' section`);
      } else {
        this.warnings.push(`⚠ PRD missing '${req.name}' section`);
      }
    });

    // Check for epics
    const hasEpics = /##\s*Epics?/i.test(prdContent);
    if (hasEpics) {
      this.successes.push('✓ PRD contains Epics section');
    } else {
      this.warnings.push('⚠ PRD should include Epics section');
    }

    // Check document length
    if (prdContent.length < 2000) {
      this.warnings.push('⚠ PRD seems short (<2KB) - ensure comprehensive coverage');
    } else {
      this.successes.push(`✓ PRD has substantial content (${(prdContent.length / 1024).toFixed(1)}KB)`);
    }

    // Extract features
    const features = this.extractFeatures(prdContent);
    if (features.length > 0) {
      this.successes.push(`✓ PRD defines ${features.length} feature(s)/epic(s)`);
    }

    return features;
  }

  validateArchitecture(archContent) {
    console.log('\n🏗️  Validating Architecture Document...\n');

    const sections = this.extractSections(archContent);
    const sectionTitles = sections.map(s => s.title.toLowerCase());

    // Required Architecture sections
    const requiredSections = [
      { name: 'architecture overview', aliases: ['overview', 'system overview'] },
      { name: 'technology stack', aliases: ['tech stack', 'technologies'] },
      { name: 'system components', aliases: ['components', 'modules'] },
      { name: 'data architecture', aliases: ['data model', 'database schema', 'data design'] },
      { name: 'api design', aliases: ['api', 'endpoints', 'api specification'] },
      { name: 'security', aliases: ['security architecture', 'authentication'] }
    ];

    requiredSections.forEach(req => {
      const found = sectionTitles.some(title =>
        title.includes(req.name) || req.aliases.some(alias => title.includes(alias))
      );

      if (found) {
        this.successes.push(`✓ Architecture has '${req.name}' section`);
      } else {
        this.warnings.push(`⚠ Architecture missing '${req.name}' section`);
      }
    });

    // Check document length
    if (archContent.length < 1500) {
      this.warnings.push('⚠ Architecture seems short (<1.5KB) - ensure detailed design');
    } else {
      this.successes.push(`✓ Architecture has substantial content (${(archContent.length / 1024).toFixed(1)}KB)`);
    }

    // Extract technologies
    const technologies = this.extractTechnologies(archContent);
    if (technologies.length > 0) {
      this.successes.push(`✓ Architecture specifies ${technologies.length} technology(ies): ${technologies.slice(0, 5).join(', ')}${technologies.length > 5 ? '...' : ''}`);
    } else {
      this.warnings.push('⚠ Architecture should explicitly list technologies used');
    }

    return technologies;
  }

  validateAlignment(prdContent, archContent, prdFeatures, archTechnologies) {
    console.log('\n🔗 Validating PRD-Architecture Alignment...\n');

    // Check if PRD features are mentioned in Architecture
    if (prdFeatures.length > 0) {
      const featuresMentioned = prdFeatures.filter(feature => {
        // Extract key terms from feature name
        const terms = feature.toLowerCase().split(/\s+/).filter(t => t.length > 3);
        return terms.some(term => archContent.toLowerCase().includes(term));
      });

      if (featuresMentioned.length > 0) {
        this.successes.push(`✓ ${featuresMentioned.length}/${prdFeatures.length} PRD features referenced in Architecture`);
      }

      if (featuresMentioned.length < prdFeatures.length) {
        const unreferenced = prdFeatures.filter(f => !featuresMentioned.includes(f));
        this.warnings.push(`⚠ ${unreferenced.length} PRD feature(s) not clearly referenced in Architecture`);
      }
    }

    // Check if Architecture technologies align with PRD constraints
    const prdMentionsTech = /technology|tech stack|framework|language|database/i.test(prdContent);
    const archDefinesTech = archTechnologies.length > 0;

    if (prdMentionsTech && !archDefinesTech) {
      this.warnings.push('⚠ PRD mentions technology but Architecture doesn\'t specify tech stack');
    } else if (archDefinesTech) {
      this.successes.push('✓ Architecture defines technology stack');
    }

    // Check for API definitions
    const prdHasAPI = /api|endpoint|rest|graphql/i.test(prdContent);
    const archHasAPI = /api|endpoint|rest|graphql/i.test(archContent);

    if (prdHasAPI && !archHasAPI) {
      this.warnings.push('⚠ PRD mentions APIs but Architecture lacks API design section');
    } else if (prdHasAPI && archHasAPI) {
      this.successes.push('✓ Both PRD and Architecture address API design');
    }

    // Check for data/database mentions
    const prdHasData = /database|data model|schema|entity|table/i.test(prdContent);
    const archHasData = /database|data model|schema|entity|table/i.test(archContent);

    if (prdHasData && !archHasData) {
      this.warnings.push('⚠ PRD mentions data but Architecture lacks data model section');
    } else if (prdHasData && archHasData) {
      this.successes.push('✓ Both PRD and Architecture address data design');
    }

    // Check for security mentions
    const prdHasSecurity = /security|authentication|authorization|auth/i.test(prdContent);
    const archHasSecurity = /security|authentication|authorization|auth/i.test(archContent);

    if (prdHasSecurity && !archHasSecurity) {
      this.warnings.push('⚠ PRD has security requirements but Architecture lacks security design');
    } else if (prdHasSecurity && archHasSecurity) {
      this.successes.push('✓ Both PRD and Architecture address security');
    }
  }

  generateReport() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('      BMAD DOCUMENT VALIDATION REPORT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\nProject Path: ${this.projectPath}\n`);

    const prdPath = 'docs/prd.md';
    const archPath = 'docs/architecture.md';

    const prdContent = this.readDocument(prdPath);
    const archContent = this.readDocument(archPath);

    if (!prdContent) {
      this.issues.push('❌ PRD not found at docs/prd.md');
      console.log('❌ Cannot proceed - PRD not found\n');
      console.log('Create a PRD using: node generate-template.js prd\n');
      return;
    }

    if (!archContent) {
      this.issues.push('❌ Architecture document not found at docs/architecture.md');
      console.log('❌ Cannot proceed - Architecture document not found\n');
      console.log('Create an Architecture document using: node generate-template.js architecture\n');
      return;
    }

    const prdFeatures = this.validatePRD(prdContent);
    const archTechnologies = this.validateArchitecture(archContent);
    this.validateAlignment(prdContent, archContent, prdFeatures, archTechnologies);

    // Print results
    if (this.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:\n');
      this.issues.forEach(issue => console.log(`  ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.successes.length > 0) {
      console.log('\n✅ VALIDATIONS PASSED:\n');
      this.successes.forEach(success => console.log(`  ${success}`));
    }

    console.log('\n═══════════════════════════════════════════════════════');

    const totalChecks = this.issues.length + this.warnings.length + this.successes.length;
    const passRate = totalChecks > 0 ? ((this.successes.length / totalChecks) * 100).toFixed(1) : 0;

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('           ✓ ALL VALIDATIONS PASSED');
    } else if (this.issues.length === 0) {
      console.log(`           VALIDATION SCORE: ${passRate}%`);
    } else {
      console.log('           ⚠ CRITICAL ISSUES DETECTED');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 Documents are well-aligned and ready for development!\n');
      console.log('Next steps:');
      console.log('  1. Use @po to shard documents into epics/stories');
      console.log('  2. Move to IDE for development phase');
      console.log('  3. Use @scrum to draft first story\n');
    } else if (this.warnings.length > 0 && this.issues.length === 0) {
      console.log('📋 Documents need minor improvements. Consider:');
      console.log('  1. Addressing warnings above');
      console.log('  2. Using @po to validate alignment');
      console.log('  3. Refining PRD or Architecture as needed\n');
    }
  }
}

// Main execution
const projectPath = process.argv[2] || process.cwd();
const validator = new DocumentValidator(projectPath);
validator.generateReport();
