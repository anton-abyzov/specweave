export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ResourceValidator {
  validate(url: string): ValidationResult;
  ping(url: string): Promise<boolean>;
  formatUrl(rawInput: string): string;
}

export abstract class BaseResourceValidator implements ResourceValidator {
  protected abstract readonly urlPattern: RegExp;
  protected abstract readonly baseUrl: string;

  validate(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL must be a non-empty string' };
    }
    const trimmed = url.trim();
    if (!this.urlPattern.test(trimmed)) {
      return {
        valid: false,
        error: `URL does not match expected pattern for ${this.constructor.name}`,
      };
    }
    return { valid: true };
  }

  async ping(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  formatUrl(rawInput: string): string {
    return rawInput.trim().replace(/\/+$/, '');
  }
}

export class GitHubResourceValidator extends BaseResourceValidator {
  protected readonly urlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;
  protected readonly baseUrl = 'https://github.com';
}

export class JiraResourceValidator extends BaseResourceValidator {
  protected readonly urlPattern = /^https?:\/\/[\w.-]+\.atlassian\.net\//;
  protected readonly baseUrl = '';
}

export class AzureDevOpsResourceValidator extends BaseResourceValidator {
  protected readonly urlPattern = /^https:\/\/dev\.azure\.com\/[\w.-]+/;
  protected readonly baseUrl = 'https://dev.azure.com';
}
