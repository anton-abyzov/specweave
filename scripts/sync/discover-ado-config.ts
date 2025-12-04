/**
 * ADO Configuration Discovery Script
 *
 * Uses the AZURE_DEVOPS_PAT to discover available organizations and projects.
 */

import https from 'https';

interface AdoProfile {
  id: string;
  displayName: string;
  emailAddress: string;
}

interface AdoOrganization {
  accountId: string;
  accountName: string;
  accountUri: string;
}

interface AdoProject {
  id: string;
  name: string;
  description: string;
  state: string;
}

/**
 * Make authenticated request to ADO API
 */
function request<T>(url: string, pat: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const authHeader = 'Basic ' + Buffer.from(`:${pat}`).toString('base64');

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data) as T);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Get user profile and organizations
 */
async function discoverAdoConfig(pat: string): Promise<void> {
  console.log('🔍 Discovering ADO configuration...\n');

  try {
    // Step 1: Get user profile
    console.log('Step 1: Getting user profile...');
    const profile = await request<AdoProfile>(
      'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1',
      pat
    );
    console.log(`✅ User: ${profile.displayName} (${profile.emailAddress})\n`);

    // Step 2: Get organizations
    console.log('Step 2: Getting organizations...');
    const orgsResponse = await request<{ value: AdoOrganization[] }>(
      'https://app.vssps.visualstudio.com/_apis/accounts?api-version=7.1',
      pat
    );

    if (!orgsResponse.value || orgsResponse.value.length === 0) {
      console.log('❌ No organizations found. Your PAT may not have access.\n');
      return;
    }

    console.log(`✅ Found ${orgsResponse.value.length} organization(s):\n`);

    for (const org of orgsResponse.value) {
      console.log(`📁 Organization: ${org.accountName}`);
      console.log(`   URI: ${org.accountUri}`);

      // Step 3: Get projects for this organization
      try {
        const projectsResponse = await request<{ value: AdoProject[] }>(
          `https://dev.azure.com/${org.accountName}/_apis/projects?api-version=7.1`,
          pat
        );

        if (projectsResponse.value && projectsResponse.value.length > 0) {
          console.log(`   Projects (${projectsResponse.value.length}):`);
          for (const project of projectsResponse.value) {
            console.log(`     - ${project.name} (${project.state})`);
          }
        } else {
          console.log('   Projects: None');
        }
      } catch (error) {
        console.log(`   Projects: Error - ${error}`);
      }
      console.log('');
    }

    // Step 4: Generate .env entries
    console.log('📝 Add these to your .env file:\n');
    const firstOrg = orgsResponse.value[0];

    // Get projects for first org
    const projectsResponse = await request<{ value: AdoProject[] }>(
      `https://dev.azure.com/${firstOrg.accountName}/_apis/projects?api-version=7.1`,
      pat
    );

    const firstProject = projectsResponse.value?.[0];

    console.log(`ADO_ORGANIZATION=${firstOrg.accountName}`);
    if (firstProject) {
      console.log(`ADO_PROJECT=${firstProject.name}`);
    } else {
      console.log('ADO_PROJECT=YOUR_PROJECT_NAME_HERE');
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check PAT is valid (not expired)');
    console.error('2. PAT needs "Work Items - Read" scope at minimum');
    console.error('3. Ensure you have access to at least one ADO organization');
  }
}

// Run discovery
const pat = process.env.AZURE_DEVOPS_PAT;

if (!pat) {
  console.error('❌ AZURE_DEVOPS_PAT not set in environment');
  console.error('Run: export AZURE_DEVOPS_PAT="your-token"');
  process.exit(1);
}

discoverAdoConfig(pat);
