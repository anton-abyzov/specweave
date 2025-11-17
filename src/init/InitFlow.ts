/**
 * Enhanced Init Flow - Research-Driven Strategic Planning
 *
 * Orchestrates 6-phase research flow:
 * 1. Vision & Market Research
 * 2. Scaling & Performance Goals
 * 3. Data & Compliance Detection
 * 4. Budget & Cloud Credits
 * 5. Methodology & Organization
 * 6. Repository Selection (optional)
 *
 * Synthesizes insights → Architecture recommendation → Project structure
 */

import inquirer from 'inquirer';
import { VisionAnalyzer } from './research/VisionAnalyzer.js';
import { ComplianceDetector } from './compliance/ComplianceDetector.js';
import { TeamRecommender } from './team/TeamRecommender.js';
import { GitHubAPIClient } from './repo/GitHubAPIClient.js';
import { selectRepositories, getAdaptiveRecommendation } from './repo/RepositorySelector.js';
import { ArchitectureDecisionEngine } from './architecture/ArchitectureDecisionEngine.js';
import type { DataType } from './compliance/types.js';
import type { BudgetType } from './architecture/types.js';
import type { RepositorySelectionRule } from './repo/types.js';

/**
 * Init flow result containing all research insights
 */
export interface InitFlowResult {
  /** Vision insights */
  vision: any;

  /** Detected compliance standards */
  compliance: any;

  /** Team recommendations */
  teams: any[];

  /** Architecture recommendation */
  architecture: any;

  /** Selected repositories (if multi-repo) */
  repositories?: any[];

  /** Complete configuration ready to save */
  config: any;
}

/**
 * Execute enhanced strategic init flow
 *
 * @returns Complete init result with all insights
 */
export async function executeStrategicInit(): Promise<InitFlowResult> {
  console.log('🚀 SpecWeave Strategic Init\n');
  console.log('Transform your product vision into perfect architecture.\n');

  // PHASE 1: Vision & Market Research
  console.log('📊 Phase 1: Product Vision & Market Analysis\n');

  const visionText = await promptVision();
  const visionAnalyzer = new VisionAnalyzer();
  const vision = await visionAnalyzer.analyze(visionText);

  console.log(`\n✓ Market: ${vision.market}`);
  console.log(`✓ Keywords: ${vision.keywords.slice(0, 5).join(', ')}`);
  console.log(`✓ Opportunity Score: ${vision.opportunityScore}/10`);
  console.log(`✓ Viral Potential: ${vision.viralPotential ? 'Yes' : 'No'}`);

  if (vision.competitors.length > 0) {
    console.log(`✓ Competitors: ${vision.competitors.map(c => c.name).slice(0, 3).join(', ')}`);
  }

  // PHASE 2: Scaling & Performance Goals
  console.log('\n⚡ Phase 2: Scaling & Growth Goals\n');

  const expectedUsers = await promptExpectedUsers(vision.viralPotential);
  const expectedServices = await promptExpectedServices();

  // PHASE 3: Data & Compliance Detection
  console.log('\n🔒 Phase 3: Data Handling & Compliance\n');

  const dataTypes = await promptDataTypes();
  const regions = await promptRegions();

  const complianceDetector = new ComplianceDetector();
  const complianceRequirements = complianceDetector.detect(visionText, vision.market);

  if (complianceRequirements.length > 0) {
    console.log(`\n✓ Detected ${complianceRequirements.length} compliance standard(s):`);
    for (const req of complianceRequirements.slice(0, 5)) {
      console.log(`  • ${req.standard}: ${req.rationale} (${req.priority} priority)`);
    }

    const criticalCount = complianceRequirements.filter(r => r.priority === 'critical').length;
    console.log(`\n💰 Estimated Cost Impact: ${criticalCount > 0 ? 'High' : 'Medium'} (${criticalCount} critical standards)`);

    console.log('\n📋 Key Requirements:');
    for (const req of complianceRequirements.slice(0, 3)) {
      console.log(`  ${req.standard}:`);
      for (const keyReq of req.keyRequirements.slice(0, 2)) {
        console.log(`    • ${keyReq}`);
      }
    }
  } else {
    console.log('✓ No compliance standards detected');
  }

  // PHASE 4: Budget & Cloud Credits
  console.log('\n💰 Phase 4: Budget & Funding\n');

  const budget = await promptBudget();

  console.log('\n☁️  Available Cloud Credits:');
  const relevantCredits = getRelevantCredits(budget);
  for (const credit of relevantCredits.slice(0, 3)) {
    console.log(`  • ${credit.provider}: ${credit.amount} (${credit.duration})`);
  }

  // PHASE 5: Methodology & Organization
  console.log('\n📋 Phase 5: Development Approach\n');

  const methodology = await promptMethodology();

  // PHASE 6: Repository Selection (if multi-repo)
  let repositories: any[] = [];
  const isMultiRepo = await promptIsMultiRepo();

  if (isMultiRepo) {
    console.log('\n📦 Phase 6: Repository Selection\n');
    repositories = await promptRepositorySelection();
    console.log(`\n✓ Selected ${repositories.length} repositories`);
  }

  // FINAL: Architecture Recommendation
  console.log('\n🏗️  Generating Architecture Recommendation...\n');

  // Generate team recommendations
  const teamRecommender = new TeamRecommender();

  // Detect use cases from vision keywords
  const useCases: string[] = [];
  if (vision.keywords.some(k => /auth|login|user/i.test(k))) useCases.push('auth');
  if (vision.keywords.some(k => /file|upload|storage/i.test(k))) useCases.push('file-uploads');
  if (vision.keywords.some(k => /image|photo|picture/i.test(k))) useCases.push('image-processing');
  if (vision.keywords.some(k => /email|notification/i.test(k))) useCases.push('email');
  if (vision.keywords.some(k => /job|queue|worker|background/i.test(k))) useCases.push('background-jobs');

  // Detect analytics from keywords
  const hasAnalytics = vision.keywords.some(k => /analytic|ml|ai|data|insight/i.test(k));

  // Map budget to project type
  const projectType: 'startup' | 'scale-up' | 'enterprise' | 'learning' =
    budget === 'bootstrapped' ? 'startup' :
    budget === 'pre-seed' || budget === 'seed' ? 'scale-up' :
    budget === 'series-a-plus' ? 'enterprise' :
    'learning';

  // Filter dataTypes to only supported ones in TeamRecommendationInput
  const supportedDataTypes = dataTypes.filter(dt =>
    ['healthcare', 'payment', 'personal', 'financial'].includes(dt)
  ) as ('healthcare' | 'payment' | 'personal' | 'financial')[];

  const teams = teamRecommender.recommend({
    complianceStandards: complianceRequirements.map(req => req.standard),
    microserviceCount: expectedServices,
    hasAnalytics,
    useCases,
    projectType,
    dataTypes: supportedDataTypes
  });

  // Generate architecture recommendation
  const architectureEngine = new ArchitectureDecisionEngine();
  const complianceIds = complianceRequirements.map(req => req.standard);
  const architecture = architectureEngine.decide(visionText, complianceIds);

  // Present architecture recommendation
  presentArchitectureRecommendation(architecture, teams);

  // Build final config
  const config = {
    research: {
      vision,
      compliance: complianceRequirements,
      teams,
      scaling: { expectedUsers, expectedServices },
      budget,
      methodology
    },
    architecture,
    repositories: repositories.length > 0 ? repositories : undefined,
    projects: ['backend', 'frontend'], // Default projects
    livingDocs: {
      copyBasedSync: {
        enabled: true,
        threeLayerSync: true
      }
    }
  };

  console.log('\n✅ Strategic init complete!');
  console.log('   Projects known from day 1 → Copy-based sync enabled\n');

  return {
    vision,
    compliance: complianceRequirements,
    teams: [teams], // Wrap in array for compatibility
    architecture,
    repositories: repositories.length > 0 ? repositories : undefined,
    config
  };
}

// Helper prompt functions (stubs - would be implemented with actual prompts)

async function promptVision(): Promise<string> {
  // In real implementation, this would use inquirer or similar
  return 'A collaborative design tool for remote teams';
}

async function promptExpectedUsers(viralPotential: boolean): Promise<number> {
  return viralPotential ? 100000 : 10000;
}

async function promptExpectedServices(): Promise<number> {
  return 3;
}

async function promptDataTypes(): Promise<DataType[]> {
  return ['personal'];
}

async function promptRegions(): Promise<string[]> {
  return ['US'];
}

async function promptBudget(): Promise<BudgetType> {
  return 'bootstrapped';
}

/**
 * T-044: Methodology Selection (Agile vs Waterfall)
 *
 * Asks user to choose development methodology:
 * - Agile: Iterative sprints, continuous delivery (SpecWeave increments = 1-2 week sprints)
 * - Waterfall: Sequential phases, planned releases (SpecWeave increments = project phases)
 *
 * AC-US5-12: Support both Agile and Waterfall methodologies
 */
async function promptMethodology(): Promise<'agile' | 'waterfall'> {
  const { methodology } = await inquirer.prompt([{
    type: 'list',
    name: 'methodology',
    message: 'How will your team work?',
    choices: [
      {
        name: '✨ Agile (Recommended) - Iterative sprints, continuous delivery. SpecWeave increments = 1-2 week sprints.',
        value: 'agile',
        short: 'Agile'
      },
      {
        name: '📋 Waterfall - Sequential phases, planned releases. SpecWeave increments = project phases.',
        value: 'waterfall',
        short: 'Waterfall'
      }
    ],
    default: 'agile'
  }]);

  console.log(`\n✓ Methodology: ${methodology === 'agile' ? 'Agile (iterative sprints)' : 'Waterfall (sequential phases)'}`);

  return methodology;
}

async function promptIsMultiRepo(): Promise<boolean> {
  return false;
}

async function promptRepositorySelection(): Promise<any[]> {
  return [];
}

function getRelevantCredits(budget: BudgetType): any[] {
  return [
    { provider: 'AWS Activate', amount: '$1K-$100K', duration: '12 months' },
    { provider: 'Google Cloud', amount: '$2K-$350K', duration: '24 months' },
    { provider: 'Azure', amount: '$1K-$100K', duration: '90-180 days' }
  ];
}

function presentArchitectureRecommendation(architecture: any, teams: any): void {
  console.log('═'.repeat(60));
  console.log(`  ARCHITECTURE RECOMMENDATIONS`);
  console.log('═'.repeat(60));

  if (Array.isArray(architecture)) {
    console.log('\n📐 Architecture Decisions:');
    for (const decision of architecture) {
      console.log(`\n• ${decision.category}: ${decision.decision}`);
      console.log(`  ${decision.rationale}`);
    }
  }

  console.log('\n👥 Team Recommendations:');
  console.log(`   • Recommended Size: ${teams.recommended} people`);
  console.log(`   • Range: ${teams.min}-${teams.max} people`);
  console.log(`   • Roles: ${teams.roles.join(', ')}`);

  console.log(`\n💡 ${teams.rationale}`);
  console.log('\n' + '═'.repeat(60));
}
