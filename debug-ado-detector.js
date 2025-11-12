/**
 * Debug script for ADO Project Detector
 */

import { AdoProjectDetector, PROJECT_KEYWORDS } from './dist/plugins/specweave-ado/lib/ado-project-detector.js';

const strategy = 'project-per-team';
const projects = ['AuthService', 'UserService', 'PaymentService'];

const authContent = `# OAuth Implementation

This feature implements JWT token generation, session management,
and SSO integration with SAML providers.`;

console.log('=== Debug ADO Project Detector ===\n');
console.log('Projects:', projects);
console.log('\nContent:', authContent);
console.log('\nAuthService Keywords:', PROJECT_KEYWORDS.AuthService);

const detector = new AdoProjectDetector(strategy, projects);

// Test detectFromContent
console.log('\n=== Testing detectFromContent ===');
detector.detectFromContent(authContent).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));

  // Check what analyzeContent returns
  console.log('\n=== Checking keyword matches manually ===');
  const lowerContent = authContent.toLowerCase();
  const keywords = PROJECT_KEYWORDS.AuthService || [];

  let matches = 0;
  const matchedKeywords = [];
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      matches++;
      matchedKeywords.push(keyword);
    }
  }

  console.log('Matched keywords:', matchedKeywords);
  console.log('Total matches:', matches);
  console.log('Expected confidence:', Math.min(matches * 0.1, 0.4));
}).catch(err => {
  console.error('Error:', err);
});
