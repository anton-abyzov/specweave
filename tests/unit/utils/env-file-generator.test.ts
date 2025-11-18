import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Environment File Generator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 85%
 */

import fs from 'fs-extra';
import {
  generateEnvFile,
  envFileExists,
  loadEnvConfig,
} from '../../../src/utils/env-file-generator.js';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    pathExists: vi.fn(),
    chmod: vi.fn(),
  },
}));

const mockedWriteFile = vi.mocked(fs.writeFile);
const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReadFile = vi.mocked(fs.readFile);
const mockedChmod = vi.mocked(fs.chmod);

describe('generateEnvFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create .env with required environment variables', async () => {
    // Given: valid config
    const projectRoot = '/test/project';
    const config = {
      owner: 'myorg',
      repos: [
        { id: 'frontend', repo: 'frontend' },
        { id: 'backend', repo: 'backend' }
      ],
      token: 'ghp_test123',
    };

    // When: generateEnvFile is called
    await generateEnvFile(projectRoot, config);

    // Then: .env contains required variables
    expect(mockedWriteFile).toHaveBeenCalled();
    const writeCall = mockedWriteFile.mock.calls[0];
    const envContent = writeCall[1];
    expect(envContent).toContain('GITHUB_TOKEN');
    expect(envContent).toContain('GITHUB_OWNER');
    expect(envContent).toContain('GITHUB_REPOS');
  });
});

describe('envFileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when .env file exists', async () => {
    // Given: .env file exists
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(true);

    // When: envFileExists is called
    const result = await envFileExists(projectRoot);

    // Then: returns true
    expect(result).toBe(true);
    expect(mockedPathExists).toHaveBeenCalled();
  });

  it('should return false when .env file missing', async () => {
    // Given: .env file missing
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(false);

    // When: envFileExists is called
    const result = await envFileExists(projectRoot);

    // Then: returns false
    expect(result).toBe(false);
  });
});

describe('loadEnvConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid .env file and return EnvConfig', async () => {
    // Given: valid .env file
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(
      'GITHUB_TOKEN=ghp_test123\nGITHUB_OWNER=myorg\nGITHUB_REPOS=frontend:frontend,backend:backend\n' as any
    );

    // When: loadEnvConfig is called
    const result = await loadEnvConfig(projectRoot);

    // Then: returns EnvConfig with parsed values
    expect(result).toBeDefined();
    expect(result?.githubToken).toBe('ghp_test123');
    expect(result?.githubOwner).toBe('myorg');
    expect(result?.repos).toEqual([
      { id: 'frontend', repo: 'frontend' },
      { id: 'backend', repo: 'backend' }
    ]);
  });

  it('should return null when .env file missing', async () => {
    // Given: .env file missing
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(false);

    // When: loadEnvConfig is called
    const result = await loadEnvConfig(projectRoot);

    // Then: returns null
    expect(result).toBeNull();
  });
});
