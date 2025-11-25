import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit Tests for Environment File Generator
 *
 * Following BDD Given/When/Then format for test cases
 */

import * as fs from '../../../src/utils/fs-native.js';
import {
  generateEnvFile,
  envFileExists,
  loadEnvConfig,
} from '../../../src/utils/env-file-generator.js';

// Mock fs-native
vi.mock('../../../src/utils/fs-native.js', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn(),
  chmod: vi.fn(),
}));

const mockedWriteFile = vi.mocked(fs.writeFile);
const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReadFile = vi.mocked(fs.readFile);

describe('generateEnvFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create .env with GITHUB_TOKEN only', async () => {
    // Given: valid config with token
    const projectRoot = '/test/project';
    const config = {
      githubToken: 'ghp_test123',
    };

    // When: generateEnvFile is called
    await generateEnvFile(projectRoot, config);

    // Then: .env contains only GITHUB_TOKEN
    expect(mockedWriteFile).toHaveBeenCalled();
    const writeCall = mockedWriteFile.mock.calls[0];
    const envContent = writeCall[1] as string;
    expect(envContent).toContain('GITHUB_TOKEN=ghp_test123');
    expect(envContent).toContain('gh CLI authentication is recommended');
    expect(envContent).not.toContain('GITHUB_REPOS');
    expect(envContent).not.toContain('GITHUB_SYNC_ENABLED');
  });

  it('should create .env.example with gh CLI recommendation', async () => {
    // Given: any config
    const projectRoot = '/test/project';
    const config = {};

    // When: generateEnvFile is called
    await generateEnvFile(projectRoot, config);

    // Then: .env.example recommends gh CLI
    const exampleWriteCall = mockedWriteFile.mock.calls[1];
    const exampleContent = exampleWriteCall[1] as string;
    expect(exampleContent).toContain('RECOMMENDED: Use gh CLI');
    expect(exampleContent).toContain('gh auth login');
    expect(exampleContent).toContain('GITHUB_TOKEN');
    expect(exampleContent).not.toContain('GITHUB_REPOS');
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

  it('should parse GITHUB_TOKEN from .env file', async () => {
    // Given: valid .env file with token
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue('GITHUB_TOKEN=ghp_test123\n' as any);

    // When: loadEnvConfig is called
    const result = await loadEnvConfig(projectRoot);

    // Then: returns config with token
    expect(result).toBeDefined();
    expect(result?.githubToken).toBe('ghp_test123');
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

  it('should ignore comments and empty lines', async () => {
    // Given: .env with comments
    const projectRoot = '/test/project';
    mockedPathExists.mockResolvedValue(true);
    mockedReadFile.mockResolvedValue(
      '# Comment\n\nGITHUB_TOKEN=ghp_abc\n# Another comment\n' as any
    );

    // When: loadEnvConfig is called
    const result = await loadEnvConfig(projectRoot);

    // Then: parses token correctly
    expect(result?.githubToken).toBe('ghp_abc');
  });
});
