/**
 * Prompt Consolidator
 *
 * Consolidates multi-repo architecture prompts into clear, jargon-free questions.
 * Removes duplicated "polyrepo" terminology and provides visual examples.
 *
 * @module prompt-consolidator
 */

/**
 * Architecture choice (GitHub-only, simplified to 2 options)
 */
export type ArchitectureChoice = 'single' | 'local-parent';

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
        value: 'local-parent',
        label: '2️⃣  Parent folder with nested repos',
        description: 'Parent folder with .specweave (local only), nested implementation repos',
        example: `
my-parent-folder/          ← Parent folder (LOCAL, NOT synced to GitHub)
├── .specweave/            ← Gitignored (local only)
├── .env
├── frontend/              ← Cloned from GitHub (or init new)
├── backend/               ← Cloned from GitHub (or init new)
        `.trim()
      }
    ]
  };
}

/**
 * Get parent folder benefits explanation
 *
 * @returns Detailed benefits with examples
 */
export function getParentRepoBenefits(): string {
  return `
**Why use a parent folder?**

✅ **Central .specweave/ for all specs/docs**
   - One source of truth for entire system
   - No duplication or fragmentation
   - Easy to search and navigate

✅ **Cross-cutting features naturally supported**
   - Authentication spans frontend + backend
   - All specs in one place, not scattered

✅ **System-wide architecture decisions**
   - ADRs apply to entire system
   - Technology stack decisions documented centrally

✅ **Simplified onboarding**
   - New developers read one set of docs
   - Complete system overview in one location

✅ **Local-only approach**
   - Parent folder stays on your machine
   - .specweave/ is gitignored (not synced to GitHub)
   - Implementation repos still on GitHub
   - Lighter setup, no parent repo overhead

**Example Structure:**

my-parent-folder/          ← Local folder (NOT a GitHub repo)
├── .specweave/            ← Gitignored (local only)
│   ├── increments/
│   ├── docs/
│   └── logs/
├── .env                   ← Config
├── frontend/              ← Cloned from GitHub (or init new)
└── backend/               ← Cloned from GitHub (or init new)

**Note:** .specweave/ is NOT synced to GitHub - it's local only.
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
 * Format architecture choice for display
 *
 * @param choice - Architecture choice
 * @returns Human-readable format
 */
export function formatArchitectureChoice(choice: ArchitectureChoice): string {
  switch (choice) {
    case 'single':
      return 'Single repository';
    case 'local-parent':
      return 'Parent folder with nested repos';
    default:
      return choice;
  }
}
