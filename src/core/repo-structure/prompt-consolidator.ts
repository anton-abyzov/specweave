/**
 * Prompt Consolidator
 *
 * Consolidates multi-repo architecture prompts into clear, jargon-free questions.
 * Removes duplicated "polyrepo" terminology and provides visual examples.
 *
 * @module prompt-consolidator
 */

/**
 * Architecture choice (GitHub-only, 2 options)
 */
export type ArchitectureChoice = 'single' | 'github-parent';

/**
 * Architecture prompt option
 */
export interface ArchitectureOption {
  value: ArchitectureChoice;
  label: string;
  description: string;
  example: string;
}

/**
 * Get consolidated architecture prompt
 *
 * Replaces separate questions about "single vs multi" and "polyrepo vs parent"
 * with a single clear question.
 *
 * @returns Architecture options for user selection
 */
export function getArchitecturePrompt(): {
  question: string;
  options: ArchitectureOption[];
} {
  return {
    question: 'What is your repository architecture?',
    options: [
      {
        value: 'single',
        label: '1️⃣  Single repository',
        description: 'All code in one repository',
        example: `
my-project/
├── .specweave/
├── frontend/
├── backend/
└── shared/
        `.trim()
      },
      {
        value: 'github-parent',
        label: '2️⃣  Multiple repositories (microservices/polyrepo)',
        description: 'Multiple GitHub repos - all equal, first is default for issues',
        example: `
my-org/
├── frontend-app/          ← GitHub repo (default for issues)
├── backend-api/           ← GitHub repo
└── shared-lib/            ← GitHub repo
        `.trim()
      }
    ]
  };
}

/**
 * Get parent folder benefits explanation
 * @deprecated v1.0.13 - Parent repo concept removed. Kept for backward compatibility.
 * @returns Detailed benefits with examples
 */
export function getParentRepoBenefits(): string {
  // v1.0.13: This function is deprecated - all repos are now equal
  return `
**Multi-Repository Setup**
Each repository is equal - first one is used as default for issue tracking.

my-org/
├── frontend-app/          ← GitHub repo (default)
├── backend-api/           ← GitHub repo
└── shared-lib/            ← GitHub repo
  `.trim();
}

/**
 * Get repository count clarification
 *
 * @param parentCount - Number of parent repos
 * @param implCount - Number of implementation repos
 * @returns Clarification message
 */
export function getRepoCountClarification(parentCount: number, implCount: number): string {
  const total = parentCount + implCount;

  if (parentCount === 1) {
    return `**Total repositories to create**: ${total}
  • 1 parent repository (specs, docs, increments)
  • ${implCount} implementation ${implCount === 1 ? 'repository' : 'repositories'}

This means **${total} GitHub repositories** will be created.`;
  }

  return `**Total repositories to create**: ${total}`;
}

/**
 * Get visibility prompt
 *
 * @param repoName - Repository name
 * @returns Visibility question and options
 */
export function getVisibilityPrompt(repoName: string): {
  question: string;
  options: Array<{ value: 'private' | 'public'; label: string; description: string }>;
  default: 'private' | 'public';
} {
  return {
    question: `Repository visibility for "${repoName}"?`,
    options: [
      {
        value: 'private',
        label: 'Private (Recommended)',
        description: 'Only you and collaborators can see this repository'
      },
      {
        value: 'public',
        label: 'Public',
        description: 'Anyone can see this repository'
      }
    ],
    default: 'private'
  };
}

/**
 * Get Git remote URL type prompt (SSH vs HTTPS)
 *
 * @param platform - Optional platform name for examples
 * @returns URL type question and options
 */
export function getUrlTypePrompt(platform: string = 'github.com'): {
  question: string;
  options: Array<{ value: 'ssh' | 'https'; label: string; description: string }>;
  default: 'ssh' | 'https';
} {
  return {
    question: 'Git remote URL format?',
    options: [
      {
        value: 'https',
        label: 'HTTPS',
        description: `https://${platform}/owner/repo.git - Works everywhere, uses tokens`
      },
      {
        value: 'ssh',
        label: 'SSH',
        description: `git@${platform}:owner/repo.git - More secure, no password needed`
      }
    ],
    default: 'https'
  };
}

/**
 * Get platform selection prompt
 *
 * @returns Platform selection question and options
 */
export function getPlatformSelectionPrompt(): {
  question: string;
  message: string;
} {
  return {
    question: 'Select your Git hosting platform:',
    message: `
🌐 Git Platform Selection

SpecWeave supports multiple Git hosting platforms.
Choose where your repositories will be hosted.

✅ Fully Supported Platforms:
   • GitHub (github.com)
   • Bitbucket (bitbucket.org)
   • Azure DevOps (dev.azure.com)
   • Local Git (local-only repositories)

⏳ Coming Soon:
   • GitLab (repo operations work, issue sync pending)

Fully supported platforms include repository validation, creation, and issue tracking sync.
    `.trim()
  };
}

/**
 * Get platform-specific token permission guidance
 *
 * @param platform - Platform type
 * @param tokenUrl - URL to create token
 * @param scopes - Required scopes/permissions
 * @param isOrganization - Whether creating repos in an organization
 * @returns Formatted guidance message
 */
export function getTokenGuidance(
  platform: string,
  tokenUrl: string,
  scopes: string[],
  isOrganization: boolean = false
): string {
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  return `
📋 ${platformName} Access Token Requirements

Required Scopes/Permissions:
${scopes.map(s => `• ${s}`).join('\n')}

🔗 Create token at: ${tokenUrl}

⚠️  Important:
   - Select all required scopes/permissions above
   ${isOrganization && platform === 'github' ? '- Select "admin:org" if creating in organization\n' : ''}- Token will be stored in .env (never committed)
   - Keep your token secure
  `.trim();
}

const ARCHITECTURE_LABELS: Record<ArchitectureChoice, string> = {
  'single': 'Single repository',
  'github-parent': 'Parent repo + nested repos (GitHub)'
};

export function formatArchitectureChoice(choice: ArchitectureChoice): string {
  return ARCHITECTURE_LABELS[choice] ?? choice;
}
