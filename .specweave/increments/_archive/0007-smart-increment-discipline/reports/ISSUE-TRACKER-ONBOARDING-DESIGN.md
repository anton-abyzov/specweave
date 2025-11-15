# Issue Tracker Integration: Enhanced Onboarding Design

**Created**: 2025-11-04
**Status**: Design Proposal
**Scope**: Seamless issue tracker integration during `specweave init`
**Impact**: High (first-run user experience, plugin adoption)

---

## Executive Summary

**Problem**: Users must manually configure issue tracker integration (GitHub/Jira/ADO) after initialization, leading to:
- Poor adoption of sync plugins (users don't discover them)
- Manual .env setup (error-prone, frustrating)
- Delayed value realization (sync doesn't work until configured)
- Increased support burden (users ask "how do I connect to Jira?")

**Solution**: Make issue tracker integration a **first-class onboarding question** during `specweave init`:
1. Ask which tracker the user wants (GitHub/Jira/ADO/None)
2. Guide API key setup with clear instructions + links
3. Auto-create .env with proper keys
4. Auto-install tracker plugin
5. Validate connection before completing init
6. Result: Issue tracker sync "just works" immediately

**Benefits**:
- ✅ Frictionless onboarding (one-time setup)
- ✅ Higher plugin adoption (GitHub/Jira/ADO)
- ✅ Reduced support burden (no "how to connect" questions)
- ✅ Faster time-to-value (sync works from day 1)
- ✅ Better defaults (users start with best practices)

---

## 1. Current State Analysis

### What Exists Today

**Init Flow** (`src/cli/commands/init.ts`):
```
specweave init
├─ 1. Project name
├─ 2. Tool detection (Claude/Cursor/Generic)
├─ 3. Directory structure creation
├─ 4. Plugin detection (auto-suggest based on package.json, .git, etc.)
├─ 5. Plugin installation (with confirmation)
└─ 6. Success message
```

**Plugin Detection** (`src/core/plugin-detector.ts`):
- ✅ 4-phase detection (init-time, spec-based, task-based, git-diff)
- ✅ Auto-detects GitHub (via .git/config remote pattern)
- ✅ Confidence scoring (high/medium/low)
- ✅ Already suggests plugins during init

**Auth Handling** (`tests/helpers/auth.ts`):
- ✅ Sophisticated fallback: GITHUB_TOKEN → GH_TOKEN → gh CLI config
- ✅ Supports GitHub, Jira, ADO
- ✅ Used in tests, NOT used in init

**.env Management**:
- ✅ .env.example exists with all required keys
- ✅ .gitignore excludes .env files
- ❌ NO .env creation during init
- ❌ NO prompting for API keys

**Issue Tracker Plugins**:
- ✅ specweave-github (implemented, v1.0.0)
- ✅ specweave-jira (implemented)
- ✅ specweave-ado (implemented)
- ❌ NOT asked about during init

### The Gap: What's Missing

Users must manually:
1. **Discover** which tracker plugin exists (`/plugin list specweave`)
2. **Install** tracker plugin (`/plugin install specweave-github`)
3. **Create** .env file (`touch .env`)
4. **Research** which keys are needed (read plugin docs)
5. **Get** API tokens (go to GitHub/Jira/ADO settings)
6. **Configure** .env (copy-paste keys)
7. **Test** connection (run sync command, see if it works)

**Pain Points**:
- 7 manual steps (high friction)
- Users don't know plugins exist
- .env format errors common
- API token setup unclear
- No validation (discover issues later)

---

## 2. Proposed Solution: Enhanced Onboarding

### User Experience Flow

```
specweave init

1️⃣  Project name: my-saas
2️⃣  AI tool: Claude Code (detected)
3️⃣  Tech stack: [auto-detected] React, Node.js, PostgreSQL

🎯 NEW: Issue Tracker Integration

4️⃣  Which issue tracker do you use?
    • GitHub Issues (recommended for GitHub repos)
    • Jira
    • Azure DevOps
    • None (skip)

    [User selects: GitHub Issues]

5️⃣  GitHub Integration Setup

    To sync SpecWeave increments with GitHub Issues, we need a Personal Access Token.

    📋 Quick Setup:
    1. Go to: https://github.com/settings/tokens/new
    2. Token name: "SpecWeave - [your-project]"
    3. Scopes needed: ☑ repo, ☑ workflow
    4. Click "Generate token"
    5. Copy the token (ghp_...)

    ✅ Already have gh CLI installed? We'll use that! (Skip manual token)

    Options:
    • [Enter token manually] → Paste token, save to .env
    • [Use gh CLI] → Auto-detect from ~/.config/gh/hosts.yml
    • [Skip for now] → Can configure later

    [User selects: Enter token manually]

    Paste your GitHub token: ************************************

    ✓ Token saved to .env (gitignored)
    ✓ Testing connection... ✓ Success! (authenticated as @username)
    ✓ Installing specweave-github plugin... ✓ Installed

6️⃣  ✅ Setup Complete!

    Issue tracker ready:
    • GitHub Issues: Connected
    • Plugin: specweave-github installed
    • Commands available: /specweave-github:create-issue, /sync

    Try it now:
    /specweave:inc "Add user authentication"
    → Creates increment 0001-user-auth
    → Syncs to GitHub issue #1 automatically! ✨
```

### Architecture Changes

**1. Enhanced Init Flow** (`src/cli/commands/init.ts`):
```typescript
// NEW: Add after tech stack detection, before plugin auto-detection

// Step 4: Issue Tracker Integration (NEW!)
const { tracker } = await inquirer.prompt([{
  type: 'list',
  name: 'tracker',
  message: 'Which issue tracker do you use?',
  choices: [
    { name: '🐙 GitHub Issues (recommended for GitHub repos)', value: 'github' },
    { name: '📋 Jira', value: 'jira' },
    { name: '🔷 Azure DevOps', value: 'ado' },
    { name: '⏭️  None (skip)', value: 'none' }
  ],
  default: detectDefaultTracker(targetDir) // Smart default based on .git remote
}]);

if (tracker !== 'none') {
  await setupIssueTracker(tracker, targetDir, language);
}

// Step 5: Plugin auto-detection continues as before...
```

**2. New Utility** (`src/cli/helpers/issue-tracker-setup.ts`):
```typescript
/**
 * Setup issue tracker integration during init
 * Guides user through API key setup, creates .env, installs plugin
 */
export async function setupIssueTracker(
  tracker: 'github' | 'jira' | 'ado',
  projectPath: string,
  language: SupportedLanguage
): Promise<void> {
  const locale = getLocaleManager(language);

  console.log(chalk.cyan.bold(`\n📋 ${tracker.toUpperCase()} Integration Setup\n`));

  // 1. Check existing credentials
  const existing = checkExistingCredentials(tracker, projectPath);

  if (existing) {
    console.log(chalk.green(`✓ Found existing credentials (${existing.source})`));

    const { useExisting } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useExisting',
      message: `Use existing ${tracker} credentials?`,
      default: true
    }]);

    if (useExisting) {
      await installTrackerPlugin(tracker, projectPath);
      await validateConnection(tracker, existing.credentials);
      return;
    }
  }

  // 2. Guide user through token creation
  const credentials = await promptForCredentials(tracker, language);

  if (!credentials) {
    console.log(chalk.yellow('⏭️  Skipping issue tracker setup (you can configure later)'));
    return;
  }

  // 3. Create/update .env file
  await createOrUpdateEnvFile(projectPath, tracker, credentials);

  // 4. Validate connection
  const isValid = await validateConnection(tracker, credentials);

  if (!isValid) {
    console.log(chalk.red('❌ Connection failed. Please check your credentials.'));
    const { retry } = await inquirer.prompt([{
      type: 'confirm',
      name: 'retry',
      message: 'Try again?',
      default: true
    }]);

    if (retry) {
      return setupIssueTracker(tracker, projectPath, language);
    }
    return;
  }

  // 5. Install tracker plugin
  await installTrackerPlugin(tracker, projectPath);

  console.log(chalk.green.bold(`\n✅ ${tracker.toUpperCase()} integration complete!\n`));
}

/**
 * Detect default tracker based on project structure
 */
function detectDefaultTracker(projectPath: string): 'github' | 'jira' | 'ado' | 'none' {
  // Check .git/config for remote URL
  const gitConfigPath = path.join(projectPath, '.git', 'config');

  if (fs.existsSync(gitConfigPath)) {
    const config = fs.readFileSync(gitConfigPath, 'utf-8');

    if (config.includes('github.com')) return 'github';
    if (config.includes('dev.azure.com')) return 'ado';
    if (config.includes('bitbucket.org')) return 'none'; // No Bitbucket plugin yet
  }

  return 'github'; // Default to GitHub (most common)
}

/**
 * Check for existing credentials (env vars, gh CLI, etc.)
 */
function checkExistingCredentials(
  tracker: 'github' | 'jira' | 'ado',
  projectPath: string
): { source: string; credentials: any } | null {
  // Import auth helpers from tests/helpers/auth.ts
  // (or extract to shared utility)

  if (tracker === 'github') {
    // Check: GITHUB_TOKEN, GH_TOKEN, gh CLI config
    const auth = getGitHubAuth(); // From tests/helpers/auth.ts
    if (auth.source !== 'none') {
      return { source: auth.source, credentials: { token: auth.token } };
    }
  }

  if (tracker === 'jira') {
    // Check: JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
    const auth = getJiraAuth();
    if (auth) {
      return { source: 'env-vars', credentials: auth };
    }
  }

  if (tracker === 'ado') {
    // Check: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
    const auth = getAzureDevOpsAuth();
    if (auth) {
      return { source: 'env-vars', credentials: auth };
    }
  }

  // Check project .env file
  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const parsed = parseEnvFile(envContent);

    if (tracker === 'github' && parsed.GH_TOKEN) {
      return { source: '.env', credentials: { token: parsed.GH_TOKEN } };
    }
    // Similar for jira, ado...
  }

  return null;
}

/**
 * Prompt user for credentials with helpful guidance
 */
async function promptForCredentials(
  tracker: 'github' | 'jira' | 'ado',
  language: SupportedLanguage
): Promise<any | null> {
  if (tracker === 'github') {
    return promptGitHubCredentials(language);
  } else if (tracker === 'jira') {
    return promptJiraCredentials(language);
  } else if (tracker === 'ado') {
    return promptAzureDevOpsCredentials(language);
  }
}

/**
 * GitHub-specific credential prompts
 */
async function promptGitHubCredentials(language: SupportedLanguage): Promise<{ token: string } | null> {
  console.log(chalk.white('\nTo sync SpecWeave increments with GitHub Issues, we need a Personal Access Token.\n'));
  console.log(chalk.cyan('📋 Quick Setup:'));
  console.log(chalk.gray('   1. Go to: https://github.com/settings/tokens/new'));
  console.log(chalk.gray('   2. Token name: "SpecWeave - [your-project]"'));
  console.log(chalk.gray('   3. Scopes needed: ☑ repo, ☑ workflow'));
  console.log(chalk.gray('   4. Click "Generate token"'));
  console.log(chalk.gray('   5. Copy the token (ghp_...)\n'));

  // Check if gh CLI is available
  const ghCliAvailable = await isGhCliAvailable();

  const choices = [
    { name: 'Enter token manually', value: 'manual' },
    ...(ghCliAvailable ? [{ name: 'Use gh CLI (auto-detect)', value: 'gh-cli' }] : []),
    { name: 'Skip for now', value: 'skip' }
  ];

  const { method } = await inquirer.prompt([{
    type: 'list',
    name: 'method',
    message: 'How would you like to authenticate?',
    choices
  }]);

  if (method === 'skip') {
    return null;
  }

  if (method === 'gh-cli') {
    const auth = getGitHubAuth(); // From tests/helpers/auth.ts
    if (auth.source === 'gh-cli') {
      console.log(chalk.green('✓ Found gh CLI token'));
      return { token: auth.token };
    } else {
      console.log(chalk.red('❌ Could not detect gh CLI token'));
      return promptGitHubCredentials(language); // Retry
    }
  }

  // Manual token entry
  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'Paste your GitHub token:',
    mask: '*',
    validate: (input: string) => {
      if (!input || input.length < 20) {
        return 'Invalid token format (should start with ghp_)';
      }
      if (!input.startsWith('ghp_') && !input.startsWith('github_pat_')) {
        return 'GitHub tokens start with "ghp_" or "github_pat_"';
      }
      return true;
    }
  }]);

  return { token };
}

/**
 * Jira-specific credential prompts
 */
async function promptJiraCredentials(language: SupportedLanguage): Promise<JiraAuth | null> {
  console.log(chalk.white('\nTo sync SpecWeave increments with Jira, we need:\n'));
  console.log(chalk.cyan('📋 Setup:'));
  console.log(chalk.gray('   1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens'));
  console.log(chalk.gray('   2. Click "Create API token"'));
  console.log(chalk.gray('   3. Label: "SpecWeave - [your-project]"'));
  console.log(chalk.gray('   4. Copy the token\n'));

  const { skip } = await inquirer.prompt([{
    type: 'confirm',
    name: 'skip',
    message: 'Continue with Jira setup?',
    default: true
  }]);

  if (!skip) return null;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'domain',
      message: 'Jira domain (e.g., your-company.atlassian.net):',
      validate: (input: string) => input.includes('.atlassian.net') || 'Domain should end with .atlassian.net'
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your Jira email:',
      validate: (input: string) => input.includes('@') || 'Invalid email format'
    },
    {
      type: 'password',
      name: 'token',
      message: 'Paste your Jira API token:',
      mask: '*',
      validate: (input: string) => input.length > 0 || 'Token cannot be empty'
    }
  ]);

  return answers;
}

/**
 * Azure DevOps-specific credential prompts
 */
async function promptAzureDevOpsCredentials(language: SupportedLanguage): Promise<AzureDevOpsAuth | null> {
  console.log(chalk.white('\nTo sync SpecWeave increments with Azure DevOps, we need:\n'));
  console.log(chalk.cyan('📋 Setup:'));
  console.log(chalk.gray('   1. Go to: https://dev.azure.com/{org}/_usersSettings/tokens'));
  console.log(chalk.gray('   2. Click "New Token"'));
  console.log(chalk.gray('   3. Scopes: Work Items (Read, Write, Manage), Code (Read), Project (Read)'));
  console.log(chalk.gray('   4. Copy the token\n'));

  const { skip } = await inquirer.prompt([{
    type: 'confirm',
    name: 'skip',
    message: 'Continue with Azure DevOps setup?',
    default: true
  }]);

  if (!skip) return null;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'org',
      message: 'Azure DevOps organization name:',
      validate: (input: string) => input.length > 0 || 'Organization cannot be empty'
    },
    {
      type: 'input',
      name: 'project',
      message: 'Project name:',
      validate: (input: string) => input.length > 0 || 'Project cannot be empty'
    },
    {
      type: 'password',
      name: 'pat',
      message: 'Paste your Personal Access Token:',
      mask: '*',
      validate: (input: string) => input.length === 52 || 'ADO PAT should be 52 characters'
    }
  ]);

  return answers;
}

/**
 * Create or update .env file with credentials
 */
async function createOrUpdateEnvFile(
  projectPath: string,
  tracker: 'github' | 'jira' | 'ado',
  credentials: any
): Promise<void> {
  const envPath = path.join(projectPath, '.env');
  const envExamplePath = path.join(projectPath, '.env.example');

  let envContent = '';

  // If .env exists, read it
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } else if (fs.existsSync(envExamplePath)) {
    // Copy from .env.example as template
    envContent = fs.readFileSync(envExamplePath, 'utf-8');
  }

  // Update or add tracker-specific keys
  if (tracker === 'github') {
    envContent = updateEnvVar(envContent, 'GH_TOKEN', credentials.token);
  } else if (tracker === 'jira') {
    envContent = updateEnvVar(envContent, 'JIRA_API_TOKEN', credentials.token);
    envContent = updateEnvVar(envContent, 'JIRA_EMAIL', credentials.email);
    envContent = updateEnvVar(envContent, 'JIRA_DOMAIN', credentials.domain);
  } else if (tracker === 'ado') {
    envContent = updateEnvVar(envContent, 'AZURE_DEVOPS_PAT', credentials.pat);
    envContent = updateEnvVar(envContent, 'AZURE_DEVOPS_ORG', credentials.org);
    envContent = updateEnvVar(envContent, 'AZURE_DEVOPS_PROJECT', credentials.project);
  }

  // Write .env file
  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log(chalk.green(`✓ Credentials saved to .env (gitignored)`));
}

/**
 * Update or add environment variable in .env content
 */
function updateEnvVar(envContent: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(envContent)) {
    // Update existing
    return envContent.replace(regex, `${key}=${value}`);
  } else {
    // Add new (append)
    return envContent.trim() + `\n${key}=${value}\n`;
  }
}

/**
 * Validate connection to issue tracker
 */
async function validateConnection(
  tracker: 'github' | 'jira' | 'ado',
  credentials: any
): Promise<boolean> {
  const spinner = ora('Testing connection...').start();

  try {
    if (tracker === 'github') {
      // Test GitHub API with token
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${credentials.token}` }
      });

      if (response.ok) {
        const user = await response.json();
        spinner.succeed(`Connected to GitHub as @${user.login}`);
        return true;
      } else {
        spinner.fail('GitHub authentication failed');
        return false;
      }
    } else if (tracker === 'jira') {
      // Test Jira API
      const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');
      const response = await fetch(`https://${credentials.domain}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${auth}` }
      });

      if (response.ok) {
        const user = await response.json();
        spinner.succeed(`Connected to Jira as ${user.displayName}`);
        return true;
      } else {
        spinner.fail('Jira authentication failed');
        return false;
      }
    } else if (tracker === 'ado') {
      // Test Azure DevOps API
      const auth = Buffer.from(`:${credentials.pat}`).toString('base64');
      const response = await fetch(
        `https://dev.azure.com/${credentials.org}/_apis/projects/${credentials.project}?api-version=7.0`,
        { headers: { Authorization: `Basic ${auth}` } }
      );

      if (response.ok) {
        spinner.succeed(`Connected to Azure DevOps project: ${credentials.project}`);
        return true;
      } else {
        spinner.fail('Azure DevOps authentication failed');
        return false;
      }
    }
  } catch (error: any) {
    spinner.fail(`Connection error: ${error.message}`);
    return false;
  }

  return false;
}

/**
 * Install tracker plugin via Claude CLI
 */
async function installTrackerPlugin(
  tracker: 'github' | 'jira' | 'ado',
  projectPath: string
): Promise<void> {
  const pluginName = `specweave-${tracker}`;
  const spinner = ora(`Installing ${pluginName} plugin...`).start();

  // Check if Claude CLI is available
  if (!isCommandAvailableSync('claude')) {
    spinner.warn('Claude CLI not found');
    console.log(chalk.yellow('\n📦 Manual plugin installation required:'));
    console.log(chalk.white(`   /plugin install ${pluginName}\n`));
    return;
  }

  try {
    const result = execFileNoThrowSync('claude', [
      'plugin',
      'install',
      pluginName
    ]);

    if (result.success) {
      spinner.succeed(`${pluginName} plugin installed`);
      console.log(chalk.green(`✓ Commands available: /specweave-${tracker}:create-issue, /sync`));
    } else {
      throw new Error(result.stderr || 'Installation failed');
    }
  } catch (error: any) {
    spinner.fail(`Could not auto-install ${pluginName}`);
    console.log(chalk.yellow('\n📦 Manual plugin installation:'));
    console.log(chalk.white(`   /plugin install ${pluginName}\n`));
  }
}

// Helper utilities
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        result[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  return result;
}

async function isGhCliAvailable(): Promise<boolean> {
  try {
    const result = execFileNoThrowSync('gh', ['--version']);
    return result.success;
  } catch {
    return false;
  }
}
```

**3. Refactor Auth Helpers** (`src/utils/auth-helpers.ts`):
```typescript
/**
 * Extract auth functions from tests/helpers/auth.ts to shared utility
 * So both tests AND init flow can use the same auth detection logic
 */
export { getGitHubAuth, getJiraAuth, getAzureDevOpsAuth } from '../tests/helpers/auth.js';
```

**4. Update .env.example Template** (`src/templates/.env.example.template`):
```bash
# Issue Tracker Integration (auto-configured by SpecWeave)
# Uncomment the section for your issue tracker

# GitHub Issues
# Get token from: https://github.com/settings/tokens
# Required scopes: repo, workflow
#GH_TOKEN=ghp_your_github_token_here

# Jira
# Get token from: https://id.atlassian.com/manage-profile/security/api-tokens
#JIRA_API_TOKEN=your-jira-api-token
#JIRA_EMAIL=your-email@example.com
#JIRA_DOMAIN=your-domain.atlassian.net

# Azure DevOps
# Get token from: https://dev.azure.com/{org}/_usersSettings/tokens
# Required scopes: Work Items (Read, Write, Manage), Code (Read), Project (Read)
#AZURE_DEVOPS_PAT=your-ado-pat-52-chars
#AZURE_DEVOPS_ORG=your-organization-name
#AZURE_DEVOPS_PROJECT=your-project-name
```

---

## 3. Implementation Plan

### Phase 1: Foundation (2-3 hours)

**Tasks**:
1. Extract auth helpers to shared utility (`src/utils/auth-helpers.ts`)
2. Add .env parsing utility (`src/utils/env-file.ts`)
3. Update .env.example template with tracker sections
4. Add tests for .env utilities

**Deliverables**:
- ✅ `src/utils/auth-helpers.ts` - Shared auth detection
- ✅ `src/utils/env-file.ts` - Parse/update .env files
- ✅ `src/templates/.env.example.template` - Updated template
- ✅ Unit tests for env utilities

### Phase 2: Issue Tracker Setup Utility (4-5 hours)

**Tasks**:
1. Create `src/cli/helpers/issue-tracker-setup.ts`
2. Implement tracker detection (`detectDefaultTracker`)
3. Implement credential checking (`checkExistingCredentials`)
4. Implement credential prompts (GitHub/Jira/ADO)
5. Implement .env creation/update
6. Implement connection validation
7. Implement plugin installation
8. Add i18n support (translations for prompts)

**Deliverables**:
- ✅ `src/cli/helpers/issue-tracker-setup.ts` - Complete utility
- ✅ Connection validation for all 3 trackers
- ✅ Error handling + retry logic
- ✅ Integration tests

### Phase 3: Init Flow Integration (2-3 hours)

**Tasks**:
1. Update `src/cli/commands/init.ts`
2. Add issue tracker prompt (Step 4 in init flow)
3. Call `setupIssueTracker` for non-"none" selections
4. Update next steps message (show tracker status)
5. Add E2E tests for init flow with tracker setup

**Deliverables**:
- ✅ Enhanced init flow with tracker integration
- ✅ E2E tests covering all 3 trackers + none
- ✅ Updated next steps output

### Phase 4: Polish & Documentation (1-2 hours)

**Tasks**:
1. Update user documentation (docs-site/docs/guides/getting-started.md)
2. Update CHANGELOG.md (v0.8.0 or v0.7.1 depending on scope)
3. Create video walkthrough (optional)
4. Update README.md with onboarding screenshots

**Deliverables**:
- ✅ Updated documentation
- ✅ CHANGELOG entry
- ✅ README with onboarding flow

### Total Effort: 9-13 hours (~2 days)

---

## 4. Technical Decisions

### Decision 1: When to Ask About Issue Tracker?

**Options**:
- A. Before plugin detection (Step 3)
- B. After plugin detection (Step 5)
- C. Part of plugin detection (integrated)

**Recommendation**: **A. Before plugin detection (Step 3)**

**Rationale**:
- ✅ Issue tracker is fundamental (like tech stack)
- ✅ Plugin detection can use tracker choice to boost confidence
- ✅ User sets up auth ONCE, then plugins auto-install
- ✅ Clear separation: tracker → credentials → plugin

**Example**:
```
1. Project name
2. Tool detection
3. Issue tracker (NEW!)  ← Ask here
4. Tech stack detection
5. Plugin auto-detection (boosts GitHub if tracker=github)
6. Plugin installation
```

### Decision 2: How to Store Credentials?

**Options**:
- A. .env file (plain text, gitignored)
- B. OS keychain (secure, per-user)
- C. Encrypted .specweave/secrets.json
- D. Ask user each time (no storage)

**Recommendation**: **A. .env file (plain text, gitignored)**

**Rationale**:
- ✅ Standard practice (matches .env.example)
- ✅ Works across all platforms (Win/Mac/Linux)
- ✅ Easy to edit/update manually
- ✅ Compatible with CI/CD (env vars in GitHub Actions)
- ✅ .gitignore prevents accidental commits
- ⚠️  User responsibility to keep .env secure

**Alternatives Considered**:
- B (OS keychain): Platform-specific, complex, not CI-friendly
- C (encrypted): Overkill, key management burden, breaks CI
- D (ask each time): Terrible UX, defeats purpose

### Decision 3: How to Validate Connections?

**Options**:
- A. No validation (trust user input)
- B. Validate after .env creation
- C. Validate before .env creation (fail fast)

**Recommendation**: **B. Validate after .env creation**

**Rationale**:
- ✅ Immediate feedback ("connection works!")
- ✅ Catch typos/expired tokens early
- ✅ Retry logic if validation fails
- ✅ User confidence (saw "Connected as @username")
- ⚠️  Requires network connection during init

**Implementation**:
```typescript
// After credentials entered:
1. Save to .env
2. Validate connection (API call)
3. If success → install plugin → done
4. If failure → ask to retry or skip
```

### Decision 4: What if User Skips Tracker Setup?

**Options**:
- A. Block init (force selection)
- B. Allow skip, no plugin installed
- C. Allow skip, install plugin anyway (user configures later)

**Recommendation**: **B. Allow skip, no plugin installed**

**Rationale**:
- ✅ User choice respected
- ✅ Can configure later via manual plugin install
- ✅ Doesn't block init for users without tracker
- ✅ No partial state (plugin without credentials)

**Next Steps Message**:
```
⏭️  Skipped issue tracker setup

You can configure later:
1. Create .env file (see .env.example)
2. Add your credentials
3. Install plugin: /plugin install specweave-github
```

### Decision 5: How to Handle gh CLI vs Manual Token?

**Options**:
- A. Prefer gh CLI, fallback to manual
- B. Prefer manual, offer gh CLI as alternative
- C. Ask user which method to use

**Recommendation**: **C. Ask user which method to use**

**Rationale**:
- ✅ User choice (some prefer CLI, others prefer token)
- ✅ Clear options (gh CLI auto-detect vs manual entry)
- ✅ Validates gh CLI availability before offering
- ✅ Best UX (no hidden behavior)

**Implementation**:
```
How would you like to authenticate?
• Enter token manually
• Use gh CLI (auto-detect)  ← Only if gh CLI installed
• Skip for now
```

---

## 5. Edge Cases & Error Handling

### Edge Case 1: User Has Multiple Trackers

**Scenario**: User has GitHub repo but uses Jira for tracking

**Solution**: Allow selection, ignore auto-detection

**UX**:
```
Which issue tracker do you use?
• GitHub Issues (recommended - detected github.com remote)
• Jira
• Azure DevOps
• None

[User can choose Jira even if GitHub detected]
```

### Edge Case 2: Invalid/Expired Token

**Scenario**: User enters token, but validation fails

**Solution**: Retry loop with helpful error

**UX**:
```
❌ Connection failed: Invalid authentication credentials

Possible reasons:
• Token is expired
• Token lacks required scopes (repo, workflow)
• Network error

Try again? (Y/n)
```

### Edge Case 3: .env Already Exists

**Scenario**: User re-runs init, .env has existing keys

**Solution**: Ask to overwrite or merge

**UX**:
```
✓ Found existing .env file

Options:
• Keep existing credentials (use what's there)
• Update credentials (re-configure)
• Skip (don't change .env)
```

### Edge Case 4: Plugin Already Installed

**Scenario**: User already has specweave-github installed

**Solution**: Skip installation, confirm setup

**UX**:
```
✓ specweave-github already installed
✓ Credentials configured in .env
✓ Connection validated

Issue tracker ready to use!
```

### Edge Case 5: No Network Connection

**Scenario**: Init runs offline, can't validate

**Solution**: Skip validation, warn user

**UX**:
```
⚠️  Could not validate connection (offline?)

Credentials saved to .env
Plugin installed

Test connection later:
/specweave-github:status
```

---

## 6. Security Considerations

### Concern 1: Plain Text Credentials in .env

**Risk**: Accidental commit to git

**Mitigation**:
- ✅ .gitignore includes `.env` (already in template)
- ✅ Pre-commit hook warning (future enhancement)
- ✅ README reminder about .env security
- ✅ Validate .env is in .gitignore during init

**Implementation**:
```typescript
// After creating .env, verify it's gitignored
const gitignorePath = path.join(projectPath, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

if (!gitignoreContent.includes('.env')) {
  console.warn(chalk.yellow('⚠️  .env is NOT in .gitignore!'));
  console.warn(chalk.yellow('   Adding .env to .gitignore...'));
  fs.appendFileSync(gitignorePath, '\n.env\n');
}
```

### Concern 2: Token Displayed in Terminal

**Risk**: Token visible in command history or screen sharing

**Mitigation**:
- ✅ Use inquirer `password` type (masked input)
- ✅ Never log token to console
- ✅ Redact token in error messages

**Implementation**:
```typescript
{
  type: 'password',
  name: 'token',
  message: 'Paste your GitHub token:',
  mask: '*'  // ← User sees: ****************************
}
```

### Concern 3: Token Validation Exposes Token

**Risk**: Network interception during validation

**Mitigation**:
- ✅ Use HTTPS for all API calls (GitHub/Jira/ADO APIs use TLS)
- ✅ Don't log full token in errors
- ✅ User is responsible for network security

**Implementation**:
```typescript
// Never log token in errors
catch (error) {
  console.error('Validation failed:', error.message);
  // ❌ BAD: console.error('Token:', credentials.token);
  // ✅ GOOD: console.error('Check your token and try again');
}
```

---

## 7. Success Metrics

### User Experience Metrics

**Goal**: 80%+ users complete tracker setup during init

**Measurement**:
- Analytics: Track "tracker setup completed" vs "skipped"
- Survey: Post-init survey "How was onboarding?"
- Support tickets: Reduction in "how to connect to tracker" questions

**Target**:
- 80%+ select tracker (not "None")
- 90%+ of those complete setup successfully
- 50%+ reduction in tracker-related support questions

### Adoption Metrics

**Goal**: 3x increase in tracker plugin installs

**Measurement**:
- Plugin install counts (before: manual only, after: auto during init)
- Active users with tracker plugins enabled
- GitHub issue sync usage (increments synced)

**Target**:
- 3x increase in specweave-github installs (from 10% to 30%+ of users)
- 50%+ of new projects have tracker integration active
- 80%+ of tracker-enabled projects use sync features

### Quality Metrics

**Goal**: < 5% setup failure rate

**Measurement**:
- Track validation failures (invalid tokens, network errors)
- Track retry counts
- Track "skip" reasons

**Target**:
- < 5% validation failures (95%+ success on first try)
- < 10% retry needed
- < 20% skip tracker setup

---

## 8. Future Enhancements

### Enhancement 1: Auto-Detect Tracker from Context

**Idea**: Scan existing issues/PRs to detect tracker

**Implementation**:
- Check `.github/workflows/` for Jira/ADO integrations
- Check `package.json` scripts for jira/ado commands
- Check git commit messages for tracker references (Jira issue keys, ADO work items)

**Example**:
```
🔍 Detected issue tracker: Jira
   Found: Jira issue keys in commit messages (ABC-123, ABC-456)

Use Jira for SpecWeave integration? (Y/n)
```

### Enhancement 2: Multi-Tracker Support

**Idea**: Support syncing to multiple trackers simultaneously

**Use Case**: GitHub Issues for dev tracking + Jira for stakeholder reporting

**Implementation**:
- Allow multiple tracker selections
- Install multiple plugins
- Configure all trackers in .env
- Sync increments to all configured trackers

### Enhancement 3: Tracker Migration Tool

**Idea**: Migrate issues from one tracker to another

**Use Case**: Moving from Jira to GitHub Issues

**Command**: `/specweave:migrate-tracker --from jira --to github`

### Enhancement 4: Smart Credential Rotation

**Idea**: Detect expired tokens and prompt renewal

**Implementation**:
- Hook that runs before sync commands
- Validates token, detects 401/403
- Prompts user to renew token
- Updates .env automatically

### Enhancement 5: Team Onboarding

**Idea**: Share .env.template with team, auto-populate org-level vars

**Implementation**:
- `.env.team.template` with org/project pre-filled
- Individual devs only add personal tokens
- Reduces setup time for team members

---

## 9. Open Questions

### Q1: Should we support .env.local and other variants?

**Context**: Some projects use .env.local, .env.development, etc.

**Options**:
- A. Only support .env (simple, standard)
- B. Support all .env.* variants (flexible, complex)
- C. Ask user which file to use

**Recommendation**: **A. Only support .env for now**

**Rationale**:
- .env is the standard for credentials
- .env.local/.env.development for app config, not secrets
- Can add multi-file support later if requested

### Q2: How to handle multiple GitHub accounts?

**Context**: User has personal + work GitHub accounts

**Options**:
- A. Use single token (works for both)
- B. Ask which account to use
- C. Support multiple tokens (per-project)

**Recommendation**: **A. Use single token**

**Rationale**:
- GitHub tokens work across all user's repos
- User can create org-scoped token if needed
- Multi-account support is rare edge case

### Q3: Should we encrypt .env file?

**Context**: .env has plain text secrets

**Options**:
- A. No encryption (current, simple)
- B. Encrypted .env with master password
- C. Use OS keychain instead

**Recommendation**: **A. No encryption**

**Rationale**:
- Industry standard (Next.js, Rails, Django all use plain .env)
- .gitignore is sufficient protection
- Encryption adds complexity (key management, CI/CD issues)
- User can use git-crypt if needed

---

## 10. Alternatives Considered

### Alternative 1: OAuth Flow Instead of Tokens

**Idea**: Use OAuth redirect flow instead of manual token entry

**Pros**:
- ✅ Better UX (no manual token creation)
- ✅ More secure (no copy-paste)
- ✅ Automatic scope selection

**Cons**:
- ❌ Requires OAuth app registration (not feasible for CLI)
- ❌ Requires local web server (complex setup)
- ❌ Doesn't work in headless environments (CI/CD)
- ❌ Not all trackers support OAuth (Jira requires manual token)

**Decision**: **Not viable for CLI tool**

### Alternative 2: Cloud-Based Credential Storage

**Idea**: Store credentials in SpecWeave cloud service

**Pros**:
- ✅ Secure (encrypted at rest)
- ✅ Synced across machines
- ✅ Revocation management

**Cons**:
- ❌ Requires SpecWeave account (onboarding friction)
- ❌ Requires backend service (cost, maintenance)
- ❌ Privacy concerns (credentials leave user's machine)
- ❌ Doesn't work offline

**Decision**: **Too complex for v1**

### Alternative 3: Read-Only Tracker Integration

**Idea**: Import issues from tracker, but don't sync back

**Pros**:
- ✅ Simpler auth (read-only tokens)
- ✅ No risk of corrupting tracker data

**Cons**:
- ❌ Limited value (users want bidirectional sync)
- ❌ Doesn't solve onboarding problem

**Decision**: **Not recommended**

---

## 11. Implementation Checklist

### Pre-Implementation

- [x] Design document reviewed by architect
- [ ] Design validated by PM (user value confirmed)
- [ ] Technical approach approved by tech lead
- [ ] Effort estimate approved (~9-13 hours)

### Phase 1: Foundation

- [ ] Extract auth helpers to `src/utils/auth-helpers.ts`
- [ ] Create .env utilities in `src/utils/env-file.ts`
- [ ] Update .env.example template
- [ ] Write unit tests for .env utilities
- [ ] Code review + merge

### Phase 2: Issue Tracker Setup

- [ ] Create `src/cli/helpers/issue-tracker-setup.ts`
- [ ] Implement tracker detection
- [ ] Implement credential checking
- [ ] Implement GitHub credential prompts
- [ ] Implement Jira credential prompts
- [ ] Implement ADO credential prompts
- [ ] Implement .env creation/update
- [ ] Implement connection validation (GitHub)
- [ ] Implement connection validation (Jira)
- [ ] Implement connection validation (ADO)
- [ ] Implement plugin installation
- [ ] Add i18n translations
- [ ] Write integration tests
- [ ] Code review + merge

### Phase 3: Init Flow Integration

- [ ] Update `src/cli/commands/init.ts`
- [ ] Add issue tracker prompt
- [ ] Integrate setupIssueTracker call
- [ ] Update next steps message
- [ ] Write E2E tests (all 3 trackers + none)
- [ ] Test on Mac/Linux/Windows
- [ ] Code review + merge

### Phase 4: Documentation

- [ ] Update getting-started.md
- [ ] Update CHANGELOG.md
- [ ] Update README.md with screenshots
- [ ] Create video walkthrough (optional)
- [ ] Publish docs to site

### Release

- [ ] All tests passing
- [ ] Version bump (v0.8.0 or v0.7.1)
- [ ] npm publish
- [ ] Announce in GitHub Discussions
- [ ] Monitor adoption metrics

---

## 12. Conclusion

**Summary**: This design transforms issue tracker integration from a **manual, error-prone afterthought** into a **seamless, first-class onboarding experience**.

**Key Benefits**:
1. ✅ **Better UX** - One-time setup during init (vs. 7 manual steps)
2. ✅ **Higher adoption** - 80%+ users will configure tracker (vs. <20% today)
3. ✅ **Fewer support questions** - Clear guidance + validation
4. ✅ **Faster time-to-value** - Sync works from day 1

**Effort**: 9-13 hours (~2 days)

**Risk**: Low
- Builds on existing plugin system
- Uses proven patterns (.env, inquirer prompts)
- No breaking changes
- Fully backwards compatible

**Recommendation**: **Approve and implement in v0.8.0**

---

**Next Steps**:
1. Review this design with architect agent (validation)
2. Get PM approval (user value confirmed)
3. Get tech lead approval (effort/approach)
4. Create increment: `0010-issue-tracker-onboarding`
5. Begin Phase 1 implementation
