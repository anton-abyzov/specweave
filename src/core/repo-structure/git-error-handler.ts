/**
 * Git Provider Error Handler
 *
 * Provides actionable error messages for common Git API errors (401, 403, 404, etc.)
 * with platform-specific guidance and troubleshooting steps.
 *
 * @module git-error-handler
 */

export interface GitApiError {
  status: number;
  message: string;
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';
  operation: 'validate_repo' | 'validate_owner' | 'create_repo' | 'fetch_data';
  resourceType?: 'repository' | 'organization' | 'user' | 'project' | 'namespace' | 'workspace';
  resourceName?: string;
}

export interface ActionableError {
  title: string;
  message: string;
  suggestions: string[];
  helpUrl?: string;
}

/**
 * Convert API error to actionable error with suggestions
 *
 * @param error - Git API error details
 * @returns Actionable error with troubleshooting steps
 */
export function getActionableError(error: GitApiError): ActionableError {
  switch (error.status) {
    case 401:
      return handle401Unauthorized(error);
    case 403:
      return handle403Forbidden(error);
    case 404:
      return handle404NotFound(error);
    case 422:
      return handle422UnprocessableEntity(error);
    default:
      return handleGenericError(error);
  }
}

/**
 * Handle 401 Unauthorized errors
 */
function handle401Unauthorized(error: GitApiError): ActionableError {
  const platformName = getPlatformDisplayName(error.platform);

  return {
    title: 'Authentication Failed (401)',
    message: `Your ${platformName} token is invalid or has expired.`,
    suggestions: [
      `Verify your ${platformName} token is correct`,
      'Check if the token has expired',
      'Ensure the token has not been revoked',
      `Generate a new token at: ${getTokenUrl(error.platform)}`,
      'Update your .env file with the new token',
      `Required scopes: ${getRequiredScopes(error.platform)}`
    ],
    helpUrl: getTokenUrl(error.platform)
  };
}

/**
 * Handle 403 Forbidden errors
 */
function handle403Forbidden(error: GitApiError): ActionableError {
  const platformName = getPlatformDisplayName(error.platform);

  const suggestions: string[] = [
    `Your ${platformName} token lacks required permissions`,
    'Check token scopes/permissions',
    `Required scopes: ${getRequiredScopes(error.platform)}`,
  ];

  if (error.operation === 'create_repo' && error.resourceType === 'organization') {
    suggestions.push(
      'For organizations: Ensure you have admin access',
      'Organization may restrict repository creation',
      'Contact organization admin if needed'
    );
  }

  suggestions.push(`Regenerate token with correct scopes: ${getTokenUrl(error.platform)}`);

  return {
    title: 'Permission Denied (403)',
    message: `You don't have permission to perform this operation on ${platformName}.`,
    suggestions,
    helpUrl: getTokenUrl(error.platform)
  };
}

/**
 * Handle 404 Not Found errors
 */
function handle404NotFound(error: GitApiError): ActionableError {
  const platformName = getPlatformDisplayName(error.platform);
  const resourceType = error.resourceType || 'resource';
  const resourceName = error.resourceName || 'unknown';

  let message: string;
  let suggestions: string[];

  if (error.operation === 'validate_owner') {
    message = `${resourceType === 'organization' ? 'Organization' : 'User'} "${resourceName}" not found on ${platformName}.`;
    suggestions = [
      'Check the spelling of the username/organization',
      `Verify the account exists on ${platformName}`,
      'Ensure it\'s a public account or you have access',
      'Use your personal username if unsure'
    ];
  } else if (error.operation === 'validate_repo') {
    message = `Repository "${resourceName}" not found on ${platformName}.`;
    suggestions = [
      'Check the repository name spelling',
      'Verify the repository exists',
      'Ensure you have access to private repositories',
      'Repository may have been deleted or renamed'
    ];
  } else {
    message = `${resourceType} "${resourceName}" not found on ${platformName}.`;
    suggestions = [
      'Double-check the name/path',
      'Verify it exists on the platform',
      'Check your access permissions'
    ];
  }

  return {
    title: 'Resource Not Found (404)',
    message,
    suggestions
  };
}

/**
 * Handle 422 Unprocessable Entity errors (e.g., repo already exists)
 */
function handle422UnprocessableEntity(error: GitApiError): ActionableError {
  const platformName = getPlatformDisplayName(error.platform);

  return {
    title: 'Validation Error (422)',
    message: `${platformName} could not process the request.`,
    suggestions: [
      'Repository name may already exist',
      'Check if the repository was already created',
      'Choose a different repository name',
      'Invalid characters in repository name',
      'Repository name may be too long'
    ]
  };
}

/**
 * Handle generic errors
 */
function handleGenericError(error: GitApiError): ActionableError {
  const platformName = getPlatformDisplayName(error.platform);

  return {
    title: `API Error (${error.status})`,
    message: error.message || `An error occurred while communicating with ${platformName}.`,
    suggestions: [
      'Check your internet connection',
      `Verify ${platformName} is accessible`,
      'Try again in a few moments',
      'Check ${platformName} status page for outages'
    ]
  };
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'bitbucket': 'Bitbucket',
  'azure-devops': 'Azure DevOps'
};

const PLATFORM_TOKEN_URLS: Record<string, string> = {
  'github': 'https://github.com/settings/tokens/new',
  'gitlab': 'https://gitlab.com/-/profile/personal_access_tokens',
  'bitbucket': 'https://bitbucket.org/account/settings/app-passwords/',
  'azure-devops': 'https://dev.azure.com/{organization}/_usersSettings/tokens'
};

const PLATFORM_SCOPES: Record<string, string> = {
  'github': 'repo, admin:org (for organizations)',
  'gitlab': 'api, read_repository, write_repository',
  'bitbucket': 'repository:read, repository:write',
  'azure-devops': 'Code (Read & Write), Project and Team (Read, Write, & Manage)'
};

function getPlatformDisplayName(platform: string): string {
  return PLATFORM_DISPLAY_NAMES[platform] ?? platform;
}

function getTokenUrl(platform: string): string {
  return PLATFORM_TOKEN_URLS[platform] ?? `https://${platform}.com`;
}

function getRequiredScopes(platform: string): string {
  return PLATFORM_SCOPES[platform] ?? 'Full repository access';
}

/**
 * Format actionable error for display
 *
 * @param error - Actionable error
 * @returns Formatted error message
 */
export function formatActionableError(error: ActionableError): string {
  const lines: string[] = [
    `❌ ${error.title}`,
    '',
    error.message,
    '',
    '💡 Troubleshooting Steps:',
    ...error.suggestions.map((s, i) => `   ${i + 1}. ${s}`)
  ];

  if (error.helpUrl) {
    lines.push('', `🔗 Help: ${error.helpUrl}`);
  }

  return lines.join('\n');
}
