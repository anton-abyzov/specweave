/**
 * Architecture Presenter - Display recommendations with interactive UI
 *
 * Presents architecture recommendations with clear rationale and allows
 * user to accept, reject, or modify the suggestion.
 *
 * AC-US5-08: Clear rationale for architecture decision
 * AC-US5-09: User can accept/reject/modify recommendation
 */

import type { ArchitectureRecommendation } from './architecture/types.js';
import type { TeamRecommendation } from './team/types.js';

/**
 * Present architecture recommendation to user with full details
 *
 * Shows:
 * - Architecture type with rationale
 * - Infrastructure components
 * - Cost estimates at different scales
 * - Cloud credits available
 * - Generated project list
 * - Team recommendations
 *
 * @param architecture - Architecture recommendation from decision engine
 * @param teams - Team recommendations
 */
export function presentArchitectureRecommendation(
  architecture: ArchitectureRecommendation | any,
  teams: TeamRecommendation | any
): void {
  console.log('\n' + '═'.repeat(70));
  console.log('  🏗️  ARCHITECTURE RECOMMENDATION');
  console.log('═'.repeat(70));

  // Handle array format (legacy architecture decisions)
  if (Array.isArray(architecture)) {
    console.log('\n📐 Architecture Decisions:');
    for (const decision of architecture) {
      console.log(`\n• ${decision.category}: ${decision.decision}`);
      console.log(`  ${decision.rationale}`);
    }

    // Show team recommendations (legacy format)
    if (teams) {
      console.log('\n👥 Team Recommendations:');
      console.log(`   • Recommended Size: ${teams.recommended} people`);
      console.log(`   • Range: ${teams.min}-${teams.max} people`);
      console.log(`   • Roles: ${teams.roles.join(', ')}`);
      console.log(`\n💡 ${teams.rationale}`);
    }

    console.log('\n' + '═'.repeat(70));
    return;
  }

  // Full ArchitectureRecommendation format
  const arch = architecture as ArchitectureRecommendation;

  // 1. Architecture Type & Rationale
  console.log(`\n📐 Architecture Type: ${formatArchitectureType(arch.architecture)}`);
  console.log(`\n💡 Rationale:`);
  console.log(`   ${arch.rationale}`);

  // 2. Infrastructure Components
  if (arch.infrastructure && arch.infrastructure.length > 0) {
    console.log(`\n🔧 Infrastructure:`);
    for (const component of arch.infrastructure) {
      console.log(`   • ${component}`);
    }
  }

  // 3. Cost Estimates
  if (arch.costEstimate) {
    console.log(`\n💰 Cost Estimates:`);
    console.log(`   • At 1K users:   ${arch.costEstimate.at1K}`);
    console.log(`   • At 10K users:  ${arch.costEstimate.at10K}`);
    console.log(`   • At 100K users: ${arch.costEstimate.at100K}`);
    console.log(`   • At 1M users:   ${arch.costEstimate.at1M}`);
  }

  // 4. Cloud Credits
  if (arch.cloudCredits && arch.cloudCredits.length > 0) {
    console.log(`\n☁️  Available Cloud Credits:`);
    for (const credit of arch.cloudCredits.slice(0, 3)) {
      console.log(`   • ${credit.provider}: ${credit.amount} (${credit.duration})`);
      if (credit.requirements) {
        console.log(`     Requirements: ${credit.requirements}`);
      }
      if (credit.url) {
        console.log(`     Apply: ${credit.url}`);
      }
    }
  }

  // 5. Generated Projects
  if (arch.projects && arch.projects.length > 0) {
    console.log(`\n📦 Generated Projects:`);
    for (const project of arch.projects) {
      console.log(`   • ${project.name}`);
      console.log(`     ${project.description}`);
      if (project.stack && project.stack.length > 0) {
        console.log(`     Stack: ${project.stack.join(', ')}`);
      }
    }
  }

  // 6. Team Recommendations
  if (teams) {
    console.log(`\n👥 Team Recommendations:`);
    if (typeof teams.recommended === 'number') {
      console.log(`   • Recommended Size: ${teams.recommended} people`);
      console.log(`   • Range: ${teams.min}-${teams.max} people`);
    }
    if (teams.roles && teams.roles.length > 0) {
      console.log(`   • Roles: ${teams.roles.join(', ')}`);
    }
    if (teams.rationale) {
      console.log(`\n💡 ${teams.rationale}`);
    }
  }

  // 7. Alternative Architectures
  if (arch.alternatives && arch.alternatives.length > 0) {
    console.log(`\n🔄 Alternative Architectures Considered:`);
    for (const alt of arch.alternatives) {
      console.log(`\n   ${formatArchitectureType(alt.architecture)}:`);
      console.log(`   Pros:`);
      for (const pro of alt.pros) {
        console.log(`     ✓ ${pro}`);
      }
      console.log(`   Cons:`);
      for (const con of alt.cons) {
        console.log(`     ✗ ${con}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
}

/**
 * Format architecture type for display
 */
function formatArchitectureType(type: string): string {
  const typeMap: Record<string, string> = {
    'serverless': 'Serverless (AWS Lambda, Vercel, Supabase)',
    'traditional-monolith': 'Traditional Monolith (EC2/ECS)',
    'microservices': 'Microservices (Kubernetes)',
    'modular-monolith': 'Modular Monolith',
    'jamstack': 'JAMstack (Static site + APIs)',
    'hybrid': 'Hybrid Architecture'
  };

  return typeMap[type] || type;
}

/**
 * Prompt user to accept, reject, or modify recommendation
 *
 * Note: In real implementation, this would use inquirer for interactive prompts
 * For now, we provide the interface structure
 */
export async function promptAcceptArchitecture(): Promise<'accept' | 'reject' | 'modify'> {
  // TODO: Replace with interactive prompt using inquirer
  // Question: "Do you accept this architecture recommendation?"
  // Options:
  //   - "Yes, this looks good (accept)"
  //   - "No, I want a different architecture (reject)"
  //   - "Let me customize this recommendation (modify)"

  // Default to accept for now
  return 'accept';
}

/**
 * Prompt user to modify architecture recommendation
 *
 * Allows customization of:
 * - Architecture type
 * - Infrastructure components
 * - Project structure
 */
export async function promptModifyArchitecture(
  architecture: ArchitectureRecommendation
): Promise<ArchitectureRecommendation> {
  // TODO: Replace with interactive prompt using inquirer
  // Allow user to:
  // 1. Change architecture type
  // 2. Add/remove infrastructure components
  // 3. Customize project list
  // 4. Adjust cost estimates

  // For now, return unchanged
  return architecture;
}

/**
 * Present architecture summary after user acceptance
 */
export function presentArchitectureSummary(architecture: ArchitectureRecommendation): void {
  console.log('\n✅ Architecture Confirmed!\n');
  console.log(`   Type: ${formatArchitectureType(architecture.architecture)}`);
  console.log(`   Projects: ${architecture.projects.length} projects`);
  console.log(`   Infrastructure: ${architecture.infrastructure.length} components`);
  console.log('\n   Your architecture is ready to use.\n');
}
