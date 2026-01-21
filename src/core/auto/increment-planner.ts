/**
 * Increment Planning Algorithm
 *
 * Groups features into right-sized increments with dependency tracking.
 *
 * @module increment-planner
 */

import type { Feature } from './prompt-chunker.js';

export interface IncrementPlan {
  id: string; // e.g., "0001-authentication"
  name: string; // e.g., "User Authentication"
  description: string; // e.g., "Login, signup, password reset"
  features: Feature[];
  estimatedTasks: number;
  dependencies: string[]; // IDs of increments this depends on
  priority: number; // Lower = higher priority
}

export interface PlanningResult {
  increments: IncrementPlan[];
  totalFeatures: number;
  totalTasks: number;
  estimatedDuration: string; // e.g., "2-3 days"
}

/** Task count constraints per increment */
const MIN_TASKS_PER_INCREMENT = 5;
const MAX_TASKS_PER_INCREMENT = 15;

/**
 * Plan increments from extracted features
 *
 * @param features - Features extracted from prompt
 * @returns Planned increments with dependencies
 *
 * @example
 * ```typescript
 * const features = extractFeatures("Build e-commerce with auth, products, cart, checkout");
 * const plan = planIncrements(features);
 * // Returns: [
 * //   { id: "0001-authentication", features: [auth], tasks: 7 },
 * //   { id: "0002-products-and-cart", features: [products, cart], tasks: 14 },
 * //   { id: "0003-checkout", features: [checkout], tasks: 12 }
 * // ]
 * ```
 */
export function planIncrements(features: Feature[]): PlanningResult {
  if (features.length === 0) {
    throw new Error('No features provided for planning');
  }

  // Sort features by dependency and complexity
  const sorted = topologicalSort(features);

  // Group features into increments
  const increments: IncrementPlan[] = [];
  let currentGroup: Feature[] = [];
  let currentTasks = 0;
  let incrementId = 1;

  for (const feature of sorted) {
    const wouldExceed = currentTasks + feature.estimatedTasks > MAX_TASKS_PER_INCREMENT;
    const hasMinimum = currentTasks >= MIN_TASKS_PER_INCREMENT;

    if (currentGroup.length > 0 && wouldExceed && hasMinimum) {
      // Commit current group as an increment
      increments.push(createIncrement(incrementId++, currentGroup));
      currentGroup = [feature];
      currentTasks = feature.estimatedTasks;
    } else {
      // Add to current group
      currentGroup.push(feature);
      currentTasks += feature.estimatedTasks;
    }
  }

  // Commit remaining group
  if (currentGroup.length > 0) {
    increments.push(createIncrement(incrementId, currentGroup));
  }

  // Identify dependencies between increments
  identifyIncrementDependencies(increments);

  // Calculate totals
  const totalFeatures = features.length;
  const totalTasks = features.reduce((sum, f) => sum + f.estimatedTasks, 0);
  const estimatedDuration = estimateDuration(totalTasks);

  return {
    increments,
    totalFeatures,
    totalTasks,
    estimatedDuration,
  };
}

/**
 * Topological sort of features based on dependencies
 */
function topologicalSort(features: Feature[]): Feature[] {
  const sorted: Feature[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(feature: Feature) {
    if (visited.has(feature.name)) return;
    if (visiting.has(feature.name)) {
      // Circular dependency - skip for now
      return;
    }

    visiting.add(feature.name);

    // Visit dependencies first
    for (const depName of feature.dependencies) {
      const depFeature = features.find((f) => f.name === depName);
      if (depFeature) {
        visit(depFeature);
      }
    }

    visiting.delete(feature.name);
    visited.add(feature.name);
    sorted.push(feature);
  }

  for (const feature of features) {
    visit(feature);
  }

  return sorted;
}

/**
 * Create an increment from a group of features
 */
function createIncrement(id: number, features: Feature[]): IncrementPlan {
  const paddedId = String(id).padStart(4, '0');
  const name = generateIncrementName(features);
  // Clean slug: lowercase, replace spaces with dashes, remove non-alphanumeric, collapse multiple dashes
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  const description = features.map((f) => f.name).join(', ');
  const estimatedTasks = features.reduce((sum, f) => sum + f.estimatedTasks, 0);

  return {
    id: `${paddedId}-${slug}`,
    name,
    description,
    features,
    estimatedTasks,
    dependencies: [],
    priority: id,
  };
}

/**
 * Generate a human-readable name for an increment
 */
function generateIncrementName(features: Feature[]): string {
  if (features.length === 1) {
    return capitalizeWords(features[0].name.replace(/-/g, ' '));
  }

  // Try to find a common theme
  const firstFeature = features[0].name;
  if (firstFeature.includes('auth')) {
    return 'User Authentication';
  }
  if (firstFeature.includes('product')) {
    return 'Product Catalog';
  }
  if (firstFeature.includes('cart') || firstFeature.includes('checkout')) {
    return 'Shopping Cart & Checkout';
  }

  // Default: use first 2 features
  const names = features.slice(0, 2).map((f) => capitalizeWords(f.name.replace(/-/g, ' ')));
  return names.join(' & ');
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Identify dependencies between increments based on feature dependencies
 */
function identifyIncrementDependencies(increments: IncrementPlan[]): void {
  for (let i = 0; i < increments.length; i++) {
    const increment = increments[i];

    // Check if any feature in this increment depends on features in earlier increments
    for (const feature of increment.features) {
      for (const depName of feature.dependencies) {
        // Find which increment contains this dependency
        for (let j = 0; j < i; j++) {
          const earlierIncrement = increments[j];
          if (earlierIncrement.features.some((f) => f.name === depName)) {
            // This increment depends on an earlier one
            if (!increment.dependencies.includes(earlierIncrement.id)) {
              increment.dependencies.push(earlierIncrement.id);
            }
          }
        }
      }
    }
  }
}

/**
 * Estimate duration based on task count (~30 min per task in auto mode)
 */
function estimateDuration(totalTasks: number): string {
  const totalHours = totalTasks * 0.5;

  if (totalHours < 1) return '< 1 hour';
  if (totalHours < 4) return `${Math.ceil(totalHours)} hours`;
  if (totalHours < 8) return '~1 day';
  if (totalHours < 16) return '1-2 days';
  if (totalHours < 40) return `2-${Math.ceil(totalHours / 8)} days`;

  const weeks = Math.ceil(totalHours / 40);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}
