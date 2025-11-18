/**
 * Test Factories - Builder pattern for creating test data
 *
 * Usage:
 * ```typescript
 * import { IncrementFactory, GitHubFactory } from 'tests/test-utils/factories';
 *
 * const increment = new IncrementFactory()
 *   .withId('0099')
 *   .withStatus('active')
 *   .build();
 *
 * const issue = new GitHubFactory()
 *   .issue()
 *   .withNumber(42)
 *   .withTitle('Test Issue')
 *   .build();
 * ```
 */

export { IncrementFactory } from './increment-factory.js';
export { GitHubFactory } from './github-factory.js';
export { ADOFactory } from './ado-factory.js';
export { JiraFactory } from './jira-factory.js';
