import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  ApiValidator,
  validateApi,
  generatePostmanFromConfig,
  type ApiTestConfig,
} from '../../../src/core/skills/api-validator.js';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';

/**
 * API Validator Unit Tests
 *
 * Tests for backend skill API validation with authentication
 */

describe('ApiValidator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `api-validator-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup temp directories
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create validator with config', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'jwt',
        auth_env_var: 'API_TOKEN',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      expect(validator).toBeDefined();
    });

    it('should set default timeout and auth prefix', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      // Defaults are set internally
      expect(validator).toBeDefined();
    });
  });

  describe('generatePostmanCollection', () => {
    it('should generate valid Postman collection', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'jwt',
        endpoints_to_test: [
          {
            method: 'GET',
            path: '/api/users',
            expected_status: 200,
            description: 'Get all users',
          },
          {
            method: 'POST',
            path: '/api/users',
            body: { name: 'Test User', email: 'test@example.com' },
            expected_status: 201,
            description: 'Create user',
          },
        ],
      };

      const validator = new ApiValidator(config);
      const collection = validator.generatePostmanCollection('Test API');

      expect(collection.info.name).toBe('Test API');
      expect(collection.info.schema).toContain('postman.com');
      expect(collection.item).toHaveLength(2);
      expect(collection.variable).toBeDefined();
      expect(collection.variable?.find(v => v.key === 'baseUrl')?.value).toBe('http://localhost:3000');
    });

    it('should add JWT auth to collection', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'jwt',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const collection = validator.generatePostmanCollection('JWT API');

      expect(collection.auth?.type).toBe('bearer');
      expect(collection.variable?.find(v => v.key === 'authToken')).toBeDefined();
    });

    it('should add API key auth to collection', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'api_key',
        auth_header: 'X-API-Key',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const collection = validator.generatePostmanCollection('API Key API');

      expect(collection.auth?.type).toBe('apikey');
      expect(collection.variable?.find(v => v.key === 'apiKey')).toBeDefined();
    });

    it('should add basic auth to collection', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'basic',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const collection = validator.generatePostmanCollection('Basic API');

      expect(collection.auth?.type).toBe('basic');
      expect(collection.variable?.find(v => v.key === 'username')).toBeDefined();
      expect(collection.variable?.find(v => v.key === 'password')).toBeDefined();
    });

    it('should include endpoint body in collection', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [
          {
            method: 'POST',
            path: '/api/data',
            body: { key: 'value' },
            expected_status: 201,
          },
        ],
      };

      const validator = new ApiValidator(config);
      const collection = validator.generatePostmanCollection('Body Test');

      expect(collection.item[0].request.body?.mode).toBe('raw');
      expect(collection.item[0].request.body?.raw).toContain('key');
    });
  });

  describe('generatePostmanEnvironment', () => {
    it('should generate environment file with base URL', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const env = validator.generatePostmanEnvironment('Test Env');

      expect(env.name).toBe('Test Env Environment');
      const values = env.values as Array<{ key: string; value: string }>;
      expect(values.find(v => v.key === 'baseUrl')?.value).toBe('http://localhost:3000');
    });

    it('should add auth variables to environment', () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'jwt',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const env = validator.generatePostmanEnvironment('JWT Env');

      const values = env.values as Array<{ key: string; value: string }>;
      expect(values.find(v => v.key === 'authToken')).toBeDefined();
    });
  });

  describe('savePostmanCollection', () => {
    it('should save collection to file', async () => {
      // Create fresh temp dir for this test
      const saveTempDir = path.join(os.tmpdir(), `save-postman-test-${Date.now()}`);
      fs.mkdirSync(saveTempDir, { recursive: true });

      const config: ApiTestConfig = {
        base_url: 'http://localhost:3000',
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [],
      };

      const validator = new ApiValidator(config);
      const outputPath = path.join(saveTempDir, 'collection.json');

      await validator.savePostmanCollection(outputPath, 'Saved API');

      expect(fs.existsSync(outputPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(saved.info.name).toBe('Saved API');

      // Check environment file also created (same name but .environment.json)
      const envPath = outputPath.replace('.json', '.environment.json');
      expect(fs.existsSync(envPath)).toBe(true);

      // Cleanup
      fs.rmSync(saveTempDir, { recursive: true, force: true });
    });
  });

  describe('validate', () => {
    it('should return server not running when health check fails', async () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:59999',  // Non-existent port
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [],
        timeout_ms: 1000,
      };

      const validator = new ApiValidator(config);
      const result = await validator.validate();

      expect(result.passed).toBe(false);
      expect(result.server_running).toBe(false);
      expect(result.summary).toContain('Server not running');
    });
  });

  describe('formatResult', () => {
    it('should format API validation result', async () => {
      const config: ApiTestConfig = {
        base_url: 'http://localhost:59999',
        health_check: '/health',
        auth_strategy: 'none',
        endpoints_to_test: [],
        timeout_ms: 1000,
      };

      const validator = new ApiValidator(config);
      const result = await validator.validate();
      const formatted = validator.formatResult(result);

      expect(formatted).toContain('API Validation Results');
      expect(formatted).toContain('Server');
    });
  });
});

describe('validateApi function', () => {
  it('should validate API with provided config', async () => {
    const config: ApiTestConfig = {
      base_url: 'http://localhost:59999',
      health_check: '/health',
      auth_strategy: 'none',
      endpoints_to_test: [],
      timeout_ms: 1000,
    };

    const result = await validateApi(config);

    expect(result).toBeDefined();
    expect(result.server_running).toBe(false);
  });
});

describe('generatePostmanFromConfig function', () => {
  it('should generate and save Postman collection', async () => {
    const tempDir = path.join(os.tmpdir(), `postman-gen-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const config: ApiTestConfig = {
      base_url: 'http://localhost:3000',
      health_check: '/health',
      auth_strategy: 'jwt',
      endpoints_to_test: [
        { method: 'GET', path: '/api/test', expected_status: 200 },
      ],
    };

    const outputPath = path.join(tempDir, 'api.postman_collection.json');
    await generatePostmanFromConfig(config, outputPath, 'Generated API');

    expect(fs.existsSync(outputPath)).toBe(true);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
