/**
 * Sync Profile Types for Multi-Project External Integration
 *
 * Supports multiple projects per provider (GitHub, JIRA, ADO, etc.)
 * with time range filtering and rate limiting protection.
 */
// ============================================================================
// Type Guard Functions (v0.10.0+)
// ============================================================================
/**
 * Check if profile uses simple strategy (one container, backward compatible)
 */
export function isSimpleStrategy(profile) {
    // If strategy not specified, default to simple (backward compatibility)
    if (!profile.strategy)
        return true;
    return profile.strategy === 'simple';
}
/**
 * Check if profile uses filtered strategy (multiple containers + boards)
 */
export function isFilteredStrategy(profile) {
    return profile.strategy === 'filtered';
}
/**
 * Check if profile uses custom strategy (raw query)
 */
export function isCustomStrategy(profile) {
    return profile.strategy === 'custom';
}
/**
 * Check if config has hierarchical containers (Jira)
 */
export function hasJiraContainers(config) {
    return !!(config.containers && config.containers.length > 0);
}
/**
 * Check if config has hierarchical containers (GitHub)
 */
export function hasGitHubContainers(config) {
    return !!(config.containers && config.containers.length > 0);
}
/**
 * Check if config has hierarchical containers (ADO)
 */
export function hasAdoContainers(config) {
    return !!(config.containers && config.containers.length > 0);
}
/**
 * Get effective strategy (defaults to 'simple' if not specified)
 */
export function getEffectiveStrategy(profile) {
    return profile.strategy || 'simple';
}
//# sourceMappingURL=sync-profile.js.map