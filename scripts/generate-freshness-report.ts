/**
 * Generate Platform Data Freshness Report
 *
 * Creates a markdown report showing the freshness status of all serverless platforms.
 * Helps users and maintainers understand when platform data was last verified.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FreshnessStatus {
  platform: string;
  provider: string;
  lastVerified: string;
  daysOld: number;
  status: 'fresh' | 'warning' | 'stale';
  emoji: string;
  color: string;
}

const PLATFORM_DIR = path.join(__dirname, '../plugins/specweave/knowledge-base/serverless/platforms');
const OUTPUT_PATH = path.join(
  __dirname,
  '../plugins/specweave/knowledge-base/serverless/FRESHNESS.md'
);

function getDaysOld(lastVerified: string): number {
  const verifiedDate = new Date(lastVerified);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - verifiedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getStatus(daysOld: number): { status: 'fresh' | 'warning' | 'stale'; emoji: string; color: string } {
  if (daysOld <= 30) {
    return { status: 'fresh', emoji: '✅', color: 'green' };
  } else if (daysOld <= 60) {
    return { status: 'warning', emoji: '⚠️', color: 'yellow' };
  } else {
    return { status: 'stale', emoji: '❌', color: 'red' };
  }
}

function generateReport(): void {
  console.log('📊 Generating platform freshness report...\n');

  // Read all platform files
  const platformFiles = fs.readdirSync(PLATFORM_DIR).filter((f) => f.endsWith('.json'));

  const freshnessData: FreshnessStatus[] = [];

  for (const file of platformFiles) {
    const filePath = path.join(PLATFORM_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const daysOld = getDaysOld(data.lastVerified);
    const statusData = getStatus(daysOld);

    freshnessData.push({
      platform: data.name,
      provider: data.provider,
      lastVerified: data.lastVerified,
      daysOld,
      status: statusData.status,
      emoji: statusData.emoji,
      color: statusData.color,
    });
  }

  // Sort by days old (freshest first)
  freshnessData.sort((a, b) => a.daysOld - b.daysOld);

  // Generate markdown report
  const report = generateMarkdown(freshnessData);

  // Write to file
  fs.writeFileSync(OUTPUT_PATH, report, 'utf-8');

  console.log(`✅ Freshness report generated: ${OUTPUT_PATH}\n`);

  // Console output
  const staleCount = freshnessData.filter((p) => p.status === 'stale').length;
  const warningCount = freshnessData.filter((p) => p.status === 'warning').length;
  const freshCount = freshnessData.filter((p) => p.status === 'fresh').length;

  console.log('📈 Summary:');
  console.log(`  ✅ Fresh (< 30 days): ${freshCount}`);
  console.log(`  ⚠️  Warning (30-60 days): ${warningCount}`);
  console.log(`  ❌ Stale (> 60 days): ${staleCount}\n`);

  if (staleCount > 0 || warningCount > 0) {
    console.log('⚠️  ACTION REQUIRED: Some platforms need data updates!');
    console.log('   Please verify current pricing, features, and limits.\n');
  }
}

function generateMarkdown(data: FreshnessStatus[]): string {
  const now = new Date().toISOString().split('T')[0];

  let md = `# Serverless Platform Data Freshness Report\n\n`;
  md += `**Generated**: ${now}\n\n`;

  md += `## Status Legend\n\n`;
  md += `- ✅ **Fresh**: Data verified within last 30 days\n`;
  md += `- ⚠️ **Warning**: Data verified 30-60 days ago (update recommended)\n`;
  md += `- ❌ **Stale**: Data not verified for > 60 days (update required)\n\n`;

  md += `## Platform Status Overview\n\n`;
  md += `| Platform | Provider | Last Verified | Days Old | Status |\n`;
  md += `|----------|----------|---------------|----------|--------|\n`;

  for (const platform of data) {
    md += `| ${platform.platform} | ${platform.provider} | ${platform.lastVerified} | ${platform.daysOld} | ${platform.emoji} ${platform.status.toUpperCase()} |\n`;
  }

  md += `\n## Detailed Status\n\n`;

  // Fresh platforms
  const fresh = data.filter((p) => p.status === 'fresh');
  if (fresh.length > 0) {
    md += `### ✅ Fresh Platforms (${fresh.length})\n\n`;
    md += `These platforms have up-to-date data verified within the last 30 days:\n\n`;
    for (const p of fresh) {
      md += `- **${p.platform}** (${p.provider}): Last verified ${p.lastVerified} (${p.daysOld} days ago)\n`;
    }
    md += `\n`;
  }

  // Warning platforms
  const warning = data.filter((p) => p.status === 'warning');
  if (warning.length > 0) {
    md += `### ⚠️ Warning: Update Recommended (${warning.length})\n\n`;
    md += `These platforms should be verified soon (verified 30-60 days ago):\n\n`;
    for (const p of warning) {
      md += `- **${p.platform}** (${p.provider}): Last verified ${p.lastVerified} (${p.daysOld} days ago)\n`;
      md += `  - **Action**: Verify current pricing, free tier, and features\n`;
    }
    md += `\n`;
  }

  // Stale platforms
  const stale = data.filter((p) => p.status === 'stale');
  if (stale.length > 0) {
    md += `### ❌ Stale: Update Required (${stale.length})\n\n`;
    md += `**IMPORTANT**: These platforms have not been verified for > 60 days and may have outdated data:\n\n`;
    for (const p of stale) {
      md += `- **${p.platform}** (${p.provider}): Last verified ${p.lastVerified} (${p.daysOld} days ago)\n`;
      md += `  - **Action**: URGENT - Verify and update all platform data\n`;
      md += `  - **Risk**: Pricing and features may have changed significantly\n`;
    }
    md += `\n`;
  }

  md += `## How to Update Platform Data\n\n`;
  md += `1. Visit the platform's official documentation/pricing page\n`;
  md += `2. Verify current:\n`;
  md += `   - Free tier limits (requests, compute, storage)\n`;
  md += `   - Pricing (per request, per GB-second)\n`;
  md += `   - Features (max memory, max execution time, runtime support)\n`;
  md += `   - Ecosystem (new integrations, SDKs)\n`;
  md += `   - Startup programs (credit amounts, eligibility)\n`;
  md += `3. Update the platform JSON file in \`plugins/specweave/knowledge-base/serverless/platforms/\`\n`;
  md += `4. Update \`lastVerified\` field to today's date (YYYY-MM-DD)\n`;
  md += `5. Run validation: \`npx ts-node scripts/validate-platforms.ts\`\n`;
  md += `6. Run tests: \`npm test\`\n`;
  md += `7. Commit changes and create PR\n\n`;

  md += `## Platform Documentation Links\n\n`;
  md += `- **AWS Lambda**: https://aws.amazon.com/lambda/pricing/\n`;
  md += `- **Azure Functions**: https://azure.microsoft.com/en-us/pricing/details/functions/\n`;
  md += `- **GCP Cloud Functions**: https://cloud.google.com/functions/pricing\n`;
  md += `- **Firebase**: https://firebase.google.com/pricing\n`;
  md += `- **Supabase**: https://supabase.com/pricing\n\n`;

  md += `---\n\n`;
  md += `*This report is auto-generated by \`scripts/generate-freshness-report.ts\`*\n`;
  md += `*Last updated: ${now}*\n`;

  return md;
}

// Run report generation
try {
  generateReport();
} catch (error) {
  console.error('❌ Error generating freshness report:', error);
  process.exit(1);
}
