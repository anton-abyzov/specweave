/**
 * Repository Selector - Pattern-Based Multi-Repo Selection
 *
 * Enables batch selection of repositories using:
 * - Prefix patterns ("ec-*")
 * - Owner/org filtering
 * - Keyword matching
 * - Combined rules
 * - Manual exclusions
 */

import { RepositorySelectionRule, RepositoryMetadata, SelectionType } from './types.js';

/**
 * Select repositories based on selection rule
 *
 * @param rule - Selection rule with type and patterns
 * @param allRepos - All available repositories (from GitHub API)
 * @returns Filtered repositories matching the rule
 */
export function selectRepositories(
  rule: RepositorySelectionRule,
  allRepos: RepositoryMetadata[]
): RepositoryMetadata[] {
  let filtered = [...allRepos];

  // Apply selection type filter
  switch (rule.type) {
    case 'all':
      // No filtering, return all
      break;

    case 'prefix':
      if (rule.pattern) {
        filtered = filtered.filter(r => r.name.startsWith(rule.pattern!));
      }
      break;

    case 'owner':
      if (rule.owner) {
        filtered = filtered.filter(r =>
          r.owner.toLowerCase() === rule.owner!.toLowerCase()
        );
      }
      break;

    case 'keyword':
      if (rule.pattern) {
        const keyword = rule.pattern.toLowerCase();
        filtered = filtered.filter(r =>
          r.name.toLowerCase().includes(keyword)
        );
      }
      break;

    case 'combined':
      // Apply both prefix and owner filters
      if (rule.pattern) {
        filtered = filtered.filter(r => r.name.startsWith(rule.pattern!));
      }
      if (rule.owner) {
        filtered = filtered.filter(r =>
          r.owner.toLowerCase() === rule.owner!.toLowerCase()
        );
      }
      break;

    case 'manual':
      // Return empty - user will enter manually
      return [];
  }

  // Apply exclusion patterns
  if (rule.excludePatterns && rule.excludePatterns.length > 0) {
    for (const excludePattern of rule.excludePatterns) {
      const pattern = excludePattern.toLowerCase();
      filtered = filtered.filter(r =>
        !r.name.toLowerCase().includes(pattern)
      );
    }
  }

  return filtered;
}

/**
 * Get adaptive UX recommendation based on repo count
 *
 * @param repoCount - Number of repositories
 * @returns Recommended selection type with reason
 */
export function getAdaptiveRecommendation(repoCount: number): {
  recommendedType: SelectionType;
  reason: string;
} {
  if (repoCount <= 5) {
    return {
      recommendedType: 'all',
      reason: 'Small number of repos - selecting all is fastest'
    };
  } else if (repoCount <= 20) {
    return {
      recommendedType: 'prefix',
      reason: 'Moderate number of repos - prefix pattern recommended'
    };
  } else {
    return {
      recommendedType: 'prefix',
      reason: 'Large number of repos - pattern-based selection strongly recommended'
    };
  }
}

/**
 * Preview selection before confirming
 *
 * @param repos - Repositories to preview
 * @returns Preview summary with count and sample
 */
export function previewSelection(repos: RepositoryMetadata[]): {
  count: number;
  summary: string;
  sample: Array<{ name: string; language: string; stars: number }>;
} {
  const count = repos.length;
  const sample = repos.slice(0, 5).map(r => ({
    name: r.name,
    language: r.language,
    stars: r.stars
  }));

  const languages = new Set(repos.map(r => r.language));
  const summary = `${count} repositories selected (${languages.size} languages)`;

  return { count, summary, sample };
}
