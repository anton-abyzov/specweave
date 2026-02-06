/**
 * Hierarchy Mapping & Auto-Detection
 *
 * ADR-0237: Flexible hierarchy that collapses gracefully.
 * Core principle: User Story and Task are FIXED; container levels are FLEXIBLE.
 *
 * Collapsing rules:
 * - Flat (Tasks only) → Task = User Story
 * - Standard (Epic/Story/Sub-task) → Epic=Feature, Story=US, Sub-task=Task
 * - SAFe (5 levels) → Top 2 skip/container, Feature→Feature, Story→US
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HierarchyPattern = 'flat' | 'standard' | 'safe' | 'custom';
export type SpecweaveType = 'feature' | 'user-story' | 'task' | 'skip';

export interface CollapsingRule {
  externalType: string;
  specweaveType: SpecweaveType;
}

export interface ExternalItem {
  id: string;
  type: string;
  title: string;
  description: string;
  parent?: string;
}

export interface MappedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  parent?: string;
  specweaveType: SpecweaveType;
  acceptanceCriteria?: string[];
}

// ---------------------------------------------------------------------------
// Predefined collapsing rules per pattern
// ---------------------------------------------------------------------------

const FLAT_RULES: CollapsingRule[] = [
  { externalType: 'Task', specweaveType: 'user-story' },
];

const STANDARD_RULES: CollapsingRule[] = [
  { externalType: 'Epic', specweaveType: 'feature' },
  { externalType: 'Story', specweaveType: 'user-story' },
  { externalType: 'Sub-task', specweaveType: 'task' },
  { externalType: 'Task', specweaveType: 'task' },
];

const SAFE_RULES: CollapsingRule[] = [
  { externalType: 'Initiative', specweaveType: 'skip' },
  { externalType: 'Theme', specweaveType: 'skip' },
  { externalType: 'Epic', specweaveType: 'feature' },
  { externalType: 'Feature', specweaveType: 'feature' },
  { externalType: 'Story', specweaveType: 'user-story' },
  { externalType: 'Task', specweaveType: 'task' },
  { externalType: 'Sub-task', specweaveType: 'task' },
];

const PATTERN_RULES: Record<HierarchyPattern, CollapsingRule[]> = {
  flat: FLAT_RULES,
  standard: STANDARD_RULES,
  safe: SAFE_RULES,
  custom: [], // user-provided
};

// ---------------------------------------------------------------------------
// Hierarchy mapping
// ---------------------------------------------------------------------------

/**
 * Map external items to SpecWeave hierarchy using collapsing rules.
 */
export function mapHierarchy(
  items: ExternalItem[],
  pattern: HierarchyPattern,
  customRules?: CollapsingRule[],
): MappedItem[] {
  const rules = pattern === 'custom' && customRules ? customRules : PATTERN_RULES[pattern];

  return items.map(item => {
    const specweaveType = collapseHierarchy(item.type, rules) || 'user-story';

    const mapped: MappedItem = {
      ...item,
      specweaveType,
    };

    // Auto-extract ACs for flat tasks mapped to user stories
    if (specweaveType === 'user-story' && item.description) {
      mapped.acceptanceCriteria = extractAcceptanceCriteria(item.description);
    }

    return mapped;
  });
}

/**
 * Look up the SpecWeave type for an external type using collapsing rules.
 */
export function collapseHierarchy(
  externalType: string,
  rules: CollapsingRule[],
): SpecweaveType | undefined {
  const rule = rules.find(r => r.externalType.toLowerCase() === externalType.toLowerCase());
  return rule?.specweaveType;
}

// ---------------------------------------------------------------------------
// AC Auto-Extraction
// ---------------------------------------------------------------------------

/**
 * Extract acceptance criteria from a task description.
 *
 * Supported patterns:
 * 1. Markdown checklists: `- [ ] item` or `- [x] item`
 * 2. Numbered lists: `1. item`
 * 3. Bullet points: `- item`
 * 4. Fallback: single default AC
 */
export function extractAcceptanceCriteria(description: string): string[] {
  if (!description || !description.trim()) {
    return ['Task completed as described'];
  }

  // Try checklists first: - [ ] item or - [x] item
  const checklistItems = description.match(/^[-*]\s*\[[ xX]\]\s*(.+)$/gm);
  if (checklistItems && checklistItems.length > 0) {
    return checklistItems.map(line => line.replace(/^[-*]\s*\[[ xX]\]\s*/, '').trim());
  }

  // Try numbered lists: 1. item
  const numberedItems = description.match(/^\d+\.\s+(.+)$/gm);
  if (numberedItems && numberedItems.length > 0) {
    return numberedItems.map(line => line.replace(/^\d+\.\s+/, '').trim());
  }

  // Try bullet points: - item (but not checklists)
  const bulletItems = description.match(/^[-*]\s+(?!\[[ xX]\])(.+)$/gm);
  if (bulletItems && bulletItems.length > 0) {
    return bulletItems.map(line => line.replace(/^[-*]\s+/, '').trim());
  }

  // Fallback
  return ['Task completed as described'];
}
