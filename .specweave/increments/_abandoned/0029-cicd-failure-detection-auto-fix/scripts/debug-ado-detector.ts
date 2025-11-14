/**
 * Debug script to understand ADO project detector behavior
 */

import { AdoProjectDetector, PROJECT_KEYWORDS } from '../../../../plugins/specweave-ado/lib/ado-project-detector';
import { AzureDevOpsStrategy } from '../../../../src/cli/helpers/issue-tracker/types';

async function debug() {
  const strategy: AzureDevOpsStrategy = 'project-per-team';
  const projects = ['AuthService', 'UserService', 'PaymentService'];

  const detector = new AdoProjectDetector(strategy, projects);

  const authContent = `# OAuth Implementation

This feature implements JWT token generation, session management,
and SSO integration with SAML providers.`;

  console.log('\n=== Debug Info ===');
  console.log('Strategy:', strategy);
  console.log('Projects:', projects);
  console.log('\nContent:', authContent);
  console.log('\nAuthService keywords:', PROJECT_KEYWORDS['AuthService']);

  const result = await detector.detectFromContent(authContent);

  console.log('\n=== Result ===');
  console.log('Primary:', result.primary);
  console.log('Confidence:', result.confidence);
  console.log('Secondary:', result.secondary);

  // Manual keyword check
  const lowerContent = authContent.toLowerCase();
  const authKeywords = PROJECT_KEYWORDS['AuthService'] || [];
  console.log('\n=== Manual Keyword Check ===');
  let matches = 0;
  for (const keyword of authKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      console.log(`✓ Found: "${keyword}"`);
      matches++;
    }
  }
  console.log(`Total matches: ${matches}`);
}

debug().catch(console.error);
