/**
 * Prompt Consolidator
 *
 * Consolidates multi-repo architecture prompts into clear, jargon-free questions.
 * Removes duplicated "polyrepo" terminology and provides visual examples.
 *
 * @module prompt-consolidator
 */

/**
 * Architecture choice
 */
export type ArchitectureChoice = 'single' | 'multi-with-parent' | 'multi-without-parent' | 'monorepo';

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
        label: 'Single repository',
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
        value: 'multi-with-parent',
        label: 'Multiple separate repositories WITH parent repository',
        description: '1 parent repo (specs, docs) + N implementation repos (recommended for teams)',
        example: `
my-project-parent/         ← Parent repo (specs, docs, increments)
├── .specweave/
my-project-frontend/       ← Separate GitHub repo
my-project-backend/        ← Separate GitHub repo
        `.trim()
      },
      {
        value: 'multi-without-parent',
        label: 'Multiple separate repositories WITHOUT parent repository',
        description: 'Each repo has its own .specweave/ (NOT RECOMMENDED - leads to fragmentation)',
        example: `
my-project-frontend/
├── .specweave/            ← Duplicated
my-project-backend/
├── .specweave/            ← Duplicated (causes conflicts)
        `.trim()
      },
      {
        value: 'monorepo',
        label: 'Monorepo (single repo, multiple projects)',
        description: 'All code in one repo, organized by project (best for tightly coupled services)',
        example: `
my-monorepo/
├── .specweave/
├── packages/
│   ├── frontend/
│   ├── backend/
│   └── shared/
        `.trim()
      }
    ]
  };
}

/**
 * Get parent repository benefits explanation
 *
 * @returns Detailed benefits with examples
 */
export function getParentRepoBenefits(): string {
  return `
**Why use a parent repository?**

✅ **Central .specweave/ for all specs/docs**
   - One source of truth for entire system
   - No duplication or fragmentation
   - Easy to search and navigate

✅ **Cross-cutting features naturally supported**
   - Authentication spans frontend + backend + mobile
   - All specs in one place, not scattered

✅ **System-wide architecture decisions**
   - ADRs apply to entire system
   - Technology stack decisions documented centrally

✅ **Simplified onboarding**
   - New developers read one set of docs
   - Complete system overview in one repo

✅ **Compliance & auditing**
   - Complete audit trail in one place
   - Regulatory requirements easier to satisfy

**Example Structure:**

my-project-parent/         ← Contains .specweave/ (cloned locally)
├── .specweave/
│   ├── increments/
│   ├── docs/
│   └── logs/
├── .env                   ← GitHub config
└── .gitignore

frontend/                  ← Cloned from GitHub (root-level!)
backend/                   ← Cloned from GitHub (root-level!)
shared/                    ← Cloned from GitHub (root-level!)

**Note:** Implementation repos are cloned at root level for clean folder structure.
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
    case 'multi-with-parent':
      return 'Multiple repositories with parent';
    case 'multi-without-parent':
      return 'Multiple repositories without parent';
    case 'monorepo':
      return 'Monorepo';
    default:
      return choice;
  }
}
