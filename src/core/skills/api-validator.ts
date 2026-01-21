/**
 * API Validator - Backend skill validation with authentication
 *
 * Tests API endpoints using curl/fetch, handles various auth strategies,
 * and generates Postman collections.
 *
 * @since v1.0.130
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Authentication strategies
 */
export type AuthStrategy = 'jwt' | 'api_key' | 'basic' | 'oauth2' | 'none';

/**
 * Endpoint test definition
 */
export interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body_file?: string;
  body?: Record<string, unknown>;
  expected_status: number;
  expected_shape?: Record<string, string>;
  headers?: Record<string, string>;
  description?: string;
}

/**
 * API test configuration
 */
export interface ApiTestConfig {
  base_url: string;
  health_check: string;
  auth_strategy: AuthStrategy;
  auth_env_var?: string;
  auth_header?: string;
  auth_prefix?: string;  // e.g., "Bearer " for JWT
  endpoints_to_test: EndpointTest[];
  timeout_ms?: number;
}

/**
 * Result of a single endpoint test
 */
export interface EndpointTestResult {
  endpoint: string;
  method: string;
  passed: boolean;
  status_code?: number;
  expected_status: number;
  duration_ms: number;
  response_body?: string;
  error?: string;
}

/**
 * Result of full API validation
 */
export interface ApiTestResult {
  passed: boolean;
  server_running: boolean;
  auth_valid: boolean;
  endpoints: EndpointTestResult[];
  duration_ms: number;
  summary: string;
}

/**
 * Postman collection format (simplified)
 */
interface PostmanCollection {
  info: {
    name: string;
    schema: string;
    description?: string;
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    url: string | { raw: string };
    header?: Array<{ key: string; value: string }>;
    body?: {
      mode: string;
      raw?: string;
    };
    auth?: PostmanAuth;
  };
  response?: unknown[];
}

interface PostmanAuth {
  type: string;
  bearer?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string; in: string }>;
  basic?: Array<{ key: string; value: string }>;
}

interface PostmanVariable {
  key: string;
  value: string;
}

/**
 * API Validator
 *
 * Validates backend APIs with authentication support
 */
export class ApiValidator {
  private config: ApiTestConfig;
  private authToken?: string;
  private verbose: boolean;

  constructor(config: ApiTestConfig, options?: { verbose?: boolean }) {
    this.config = {
      timeout_ms: 30000,
      auth_prefix: 'Bearer ',
      ...config,
    };
    this.verbose = options?.verbose ?? false;
  }

  /**
   * Run full API validation
   */
  async validate(): Promise<ApiTestResult> {
    const startTime = Date.now();
    const results: EndpointTestResult[] = [];

    // 1. Check if server is running
    const serverRunning = await this.checkServerRunning();
    if (!serverRunning) {
      return {
        passed: false,
        server_running: false,
        auth_valid: false,
        endpoints: [],
        duration_ms: Date.now() - startTime,
        summary: '❌ Server not running at ' + this.config.base_url,
      };
    }

    // 2. Get auth token if needed
    let authValid = true;
    if (this.config.auth_strategy !== 'none') {
      authValid = await this.setupAuth();
      if (!authValid) {
        return {
          passed: false,
          server_running: true,
          auth_valid: false,
          endpoints: [],
          duration_ms: Date.now() - startTime,
          summary: '❌ Authentication failed - check ' + (this.config.auth_env_var || 'auth config'),
        };
      }
    }

    // 3. Test each endpoint
    for (const endpoint of this.config.endpoints_to_test) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
    }

    const passed = results.every(r => r.passed);
    const passedCount = results.filter(r => r.passed).length;

    return {
      passed,
      server_running: true,
      auth_valid: authValid,
      endpoints: results,
      duration_ms: Date.now() - startTime,
      summary: passed
        ? `✅ API validation PASSED: ${passedCount}/${results.length} endpoints`
        : `❌ API validation FAILED: ${passedCount}/${results.length} endpoints passed`,
    };
  }

  /**
   * Check if server is running via health check
   */
  private async checkServerRunning(): Promise<boolean> {
    try {
      const url = this.config.base_url + this.config.health_check;
      const response = await this.makeRequest('GET', url, {}, null, false);
      return response.status >= 200 && response.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * Setup authentication based on strategy
   */
  private async setupAuth(): Promise<boolean> {
    switch (this.config.auth_strategy) {
      case 'jwt':
        return this.setupJwtAuth();
      case 'api_key':
        return this.setupApiKeyAuth();
      case 'basic':
        return this.setupBasicAuth();
      case 'oauth2':
        return this.setupOAuth2Auth();
      default:
        return true;
    }
  }

  /**
   * Setup JWT authentication from env var
   */
  private async setupJwtAuth(): Promise<boolean> {
    const envVar = this.config.auth_env_var || 'API_TEST_TOKEN';
    this.authToken = process.env[envVar];

    if (!this.authToken) {
      // Try to read from .env file
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const match = envContent.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
          if (match) {
            this.authToken = match[1].replace(/["']/g, '');
          }
        }
      } catch {
        // Ignore
      }
    }

    return !!this.authToken;
  }

  /**
   * Setup API key authentication
   */
  private async setupApiKeyAuth(): Promise<boolean> {
    const envVar = this.config.auth_env_var || 'API_KEY';
    this.authToken = process.env[envVar];

    if (!this.authToken) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const match = envContent.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
          if (match) {
            this.authToken = match[1].replace(/["']/g, '');
          }
        }
      } catch {
        // Ignore
      }
    }

    return !!this.authToken;
  }

  /**
   * Setup Basic authentication
   */
  private async setupBasicAuth(): Promise<boolean> {
    const userEnv = this.config.auth_env_var || 'API_USER';
    const passEnv = 'API_PASSWORD';

    const user = process.env[userEnv];
    const pass = process.env[passEnv];

    if (user && pass) {
      this.authToken = Buffer.from(`${user}:${pass}`).toString('base64');
      return true;
    }

    return false;
  }

  /**
   * Setup OAuth2 authentication (simplified)
   */
  private async setupOAuth2Auth(): Promise<boolean> {
    // For OAuth2, expect token to be pre-obtained and stored in env
    const envVar = this.config.auth_env_var || 'OAUTH2_TOKEN';
    this.authToken = process.env[envVar];
    return !!this.authToken;
  }

  /**
   * Test a single endpoint
   */
  private async testEndpoint(endpoint: EndpointTest): Promise<EndpointTestResult> {
    const startTime = Date.now();
    const url = this.config.base_url + endpoint.path;

    try {
      // Prepare body
      let body: string | null = null;
      if (endpoint.body) {
        body = JSON.stringify(endpoint.body);
      } else if (endpoint.body_file) {
        const bodyPath = path.join(process.cwd(), endpoint.body_file);
        if (fs.existsSync(bodyPath)) {
          body = fs.readFileSync(bodyPath, 'utf-8');
        }
      }

      // Make request
      const response = await this.makeRequest(
        endpoint.method,
        url,
        endpoint.headers || {},
        body,
        true
      );

      const passed = response.status === endpoint.expected_status;

      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        passed,
        status_code: response.status,
        expected_status: endpoint.expected_status,
        duration_ms: Date.now() - startTime,
        response_body: response.body?.slice(0, 500),
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        passed: false,
        expected_status: endpoint.expected_status,
        duration_ms: Date.now() - startTime,
        error: err.message || 'Request failed',
      };
    }
  }

  /**
   * Make HTTP request using curl
   */
  private async makeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | null,
    useAuth: boolean
  ): Promise<{ status: number; body: string }> {
    const curlArgs: string[] = [
      '-s',  // Silent
      '-w', '\\n%{http_code}',  // Append status code
      '-X', method,
      '--max-time', String(Math.floor((this.config.timeout_ms || 30000) / 1000)),
    ];

    // Add auth header
    if (useAuth && this.authToken) {
      const authHeader = this.config.auth_header || 'Authorization';
      let authValue: string;

      switch (this.config.auth_strategy) {
        case 'jwt':
          authValue = `${this.config.auth_prefix || 'Bearer '}${this.authToken}`;
          break;
        case 'api_key':
          authValue = this.authToken;
          break;
        case 'basic':
          authValue = `Basic ${this.authToken}`;
          break;
        default:
          authValue = this.authToken;
      }

      curlArgs.push('-H', `${authHeader}: ${authValue}`);
    }

    // Add custom headers
    for (const [key, value] of Object.entries(headers)) {
      curlArgs.push('-H', `${key}: ${value}`);
    }

    // Add body for POST/PUT/PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      curlArgs.push('-H', 'Content-Type: application/json');
      curlArgs.push('-d', body);
    }

    curlArgs.push(url);

    const command = `curl ${curlArgs.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`;

    if (this.verbose) {
      console.log(chalk.gray(`Running: ${command}`));
    }

    const { stdout } = await execAsync(command, {
      timeout: (this.config.timeout_ms || 30000) + 5000,
    });

    // Parse response - status code is on last line
    const lines = stdout.trim().split('\n');
    const statusCode = parseInt(lines[lines.length - 1], 10);
    const responseBody = lines.slice(0, -1).join('\n');

    return {
      status: statusCode,
      body: responseBody,
    };
  }

  /**
   * Generate Postman collection from endpoint tests
   */
  generatePostmanCollection(name: string): PostmanCollection {
    const collection: PostmanCollection = {
      info: {
        name,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: `API tests generated by SpecWeave for ${name}`,
      },
      item: [],
      variable: [
        { key: 'baseUrl', value: this.config.base_url },
      ],
    };

    // Add auth based on strategy
    if (this.config.auth_strategy !== 'none') {
      switch (this.config.auth_strategy) {
        case 'jwt':
          collection.auth = {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{authToken}}' }],
          };
          collection.variable?.push({ key: 'authToken', value: '' });
          break;
        case 'api_key':
          collection.auth = {
            type: 'apikey',
            apikey: [
              { key: 'key', value: this.config.auth_header || 'X-API-Key', in: 'header' },
              { key: 'value', value: '{{apiKey}}', in: 'header' },
            ],
          };
          collection.variable?.push({ key: 'apiKey', value: '' });
          break;
        case 'basic':
          collection.auth = {
            type: 'basic',
            basic: [
              { key: 'username', value: '{{username}}' },
              { key: 'password', value: '{{password}}' },
            ],
          };
          collection.variable?.push({ key: 'username', value: '' });
          collection.variable?.push({ key: 'password', value: '' });
          break;
      }
    }

    // Add endpoints
    for (const endpoint of this.config.endpoints_to_test) {
      const item: PostmanItem = {
        name: endpoint.description || `${endpoint.method} ${endpoint.path}`,
        request: {
          method: endpoint.method,
          url: {
            raw: `{{baseUrl}}${endpoint.path}`,
          },
          header: endpoint.headers
            ? Object.entries(endpoint.headers).map(([key, value]) => ({ key, value }))
            : undefined,
        },
      };

      // Add body if present
      if (endpoint.body || endpoint.body_file) {
        item.request.body = {
          mode: 'raw',
          raw: endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '{}',
        };
      }

      collection.item.push(item);
    }

    return collection;
  }

  /**
   * Save Postman collection to file
   * Also generates environment file automatically
   */
  async savePostmanCollection(outputPath: string, name: string): Promise<void> {
    const collection = this.generatePostmanCollection(name);
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    // Also generate environment file
    const envPath = outputPath.replace('.json', '.environment.json');
    const env = this.generatePostmanEnvironment(name);
    fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
  }

  /**
   * Generate Postman environment file
   */
  generatePostmanEnvironment(name: string): Record<string, unknown> {
    const env: Record<string, unknown> = {
      id: `env-${Date.now()}`,
      name: `${name} Environment`,
      values: [
        { key: 'baseUrl', value: this.config.base_url, enabled: true },
      ],
      _postman_variable_scope: 'environment',
    };

    // Add auth variables (empty, user fills in)
    switch (this.config.auth_strategy) {
      case 'jwt':
        (env.values as Array<{ key: string; value: string; enabled: boolean }>).push(
          { key: 'authToken', value: '', enabled: true }
        );
        break;
      case 'api_key':
        (env.values as Array<{ key: string; value: string; enabled: boolean }>).push(
          { key: 'apiKey', value: '', enabled: true }
        );
        break;
      case 'basic':
        (env.values as Array<{ key: string; value: string; enabled: boolean }>).push(
          { key: 'username', value: '', enabled: true },
          { key: 'password', value: '', enabled: true }
        );
        break;
    }

    return env;
  }

  /**
   * Format validation result for display
   */
  formatResult(result: ApiTestResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold('API Validation Results'));
    lines.push('─'.repeat(50));

    lines.push(`Server: ${result.server_running ? chalk.green('✅ Running') : chalk.red('❌ Not running')}`);
    lines.push(`Auth: ${result.auth_valid ? chalk.green('✅ Valid') : chalk.red('❌ Failed')}`);
    lines.push('');

    if (result.endpoints.length > 0) {
      lines.push(chalk.bold('Endpoints:'));
      for (const ep of result.endpoints) {
        const icon = ep.passed ? '✅' : '❌';
        const status = ep.status_code
          ? `${ep.status_code} (expected ${ep.expected_status})`
          : `error: ${ep.error}`;
        lines.push(`  ${icon} ${ep.method} ${ep.endpoint}: ${status} (${ep.duration_ms}ms)`);
      }
    }

    lines.push('');
    lines.push('─'.repeat(50));
    lines.push(result.summary);

    return lines.join('\n');
  }
}

/**
 * Run API validation with default config detection
 */
export async function validateApi(
  config: ApiTestConfig,
  options?: { verbose?: boolean }
): Promise<ApiTestResult> {
  const validator = new ApiValidator(config, options);
  return validator.validate();
}

/**
 * Generate Postman collection from API config
 */
export async function generatePostmanFromConfig(
  config: ApiTestConfig,
  outputPath: string,
  name: string
): Promise<void> {
  const validator = new ApiValidator(config);
  await validator.savePostmanCollection(outputPath, name);

  // Also generate environment file
  const envPath = outputPath.replace('.json', '.environment.json');
  const env = validator.generatePostmanEnvironment(name);
  fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
}
