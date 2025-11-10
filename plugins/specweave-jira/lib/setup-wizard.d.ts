/**
 * Smart Jira Setup Wizard
 *
 * Intelligent credential detection and setup flow:
 * 1. Check .env for credentials (uses credentialsManager)
 * 2. Interactive prompt only if missing
 * 3. Never ask twice for same credentials
 */
import { JiraCredentials } from '../../../src/core/credentials-manager.js';
export { JiraCredentials } from '../../../src/core/credentials-manager.js';
export interface CredentialDetectionResult {
    found: boolean;
    credentials?: JiraCredentials;
    source?: 'env' | 'interactive';
}
/**
 * Smart credential detection - uses existing credentialsManager
 */
export declare function detectJiraCredentials(): Promise<CredentialDetectionResult>;
/**
 * Interactive Jira credential setup
 * Only runs if credentials not found
 */
export declare function setupJiraCredentials(): Promise<JiraCredentials>;
/**
 * Get Jira credentials - smart detection with fallback to interactive setup
 */
export declare function getJiraCredentials(): Promise<JiraCredentials>;
//# sourceMappingURL=setup-wizard.d.ts.map