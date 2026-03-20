/**
 * Unit tests for root-repo-detection.ts
 * T-010: detectRootRepo() cascade
 * T-011: promptRootRepoConnection() interactive flow
 * T-012: CI/quick mode skip
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockDetectProvider } = vi.hoisted(() => ({
  mockDetectProvider: vi.fn(),
}));

const { mockConfirm, mockInput } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockInput: vi.fn(),
}));

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

// ============================================================================
// vi.mock() declarations
// ============================================================================

vi.mock('../../../../../src/cli/helpers/init/provider-detection.js', () => ({
  detectProvider: mockDetectProvider,
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: mockConfirm,
  input: mockInput,
}));

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      return new Proxy(identity, handler);
    },
    apply(_target, _this, args) { return String(args[0]); },
  };
  return { default: new Proxy(identity, handler) };
});

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import {
  detectRootRepo,
  promptRootRepoConnection,
} from '../../../../../src/cli/helpers/init/root-repo-detection.js';

// ============================================================================
// T-010: detectRootRepo() cascade
// ============================================================================

describe('detectRootRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns owner/repo from git remote when detectProvider finds GitHub', () => {
    mockDetectProvider.mockReturnValue({
      provider: 'github',
      owner: 'myorg',
      repo: 'myrepo',
    });

    const result = detectRootRepo('/fake/dir');

    expect(result).toEqual({
      owner: 'myorg',
      repo: 'myrepo',
      source: 'git-remote',
    });
    expect(mockDetectProvider).toHaveBeenCalledWith('/fake/dir');
  });

  it('skips non-GitHub providers from detectProvider', () => {
    mockDetectProvider.mockReturnValue({
      provider: 'ado',
      organization: 'myorg',
    });
    mockExistsSync.mockReturnValue(false);

    const result = detectRootRepo('/fake/dir');

    expect(result).toBeNull();
  });

  it('falls through to package.json repository URL when no git remote', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      repository: 'https://github.com/pkgorg/pkgrepo',
    }));

    const result = detectRootRepo('/fake/dir');

    expect(result).toEqual({
      owner: 'pkgorg',
      repo: 'pkgrepo',
      source: 'package-json',
    });
  });

  it('parses package.json repository.url object form', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      repository: {
        type: 'git',
        url: 'https://github.com/objorg/objrepo.git',
      },
    }));

    const result = detectRootRepo('/fake/dir');

    expect(result).toEqual({
      owner: 'objorg',
      repo: 'objrepo',
      source: 'package-json',
    });
  });

  it('parses package.json SSH repository URL', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      repository: 'git@github.com:sshorg/sshrepo.git',
    }));

    const result = detectRootRepo('/fake/dir');

    expect(result).toEqual({
      owner: 'sshorg',
      repo: 'sshrepo',
      source: 'package-json',
    });
  });

  it('falls through to @scope/name when no repository field', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      name: '@myorg/my-pkg',
    }));

    const result = detectRootRepo('/fake/dir');

    expect(result).toEqual({
      owner: 'myorg',
      repo: 'my-pkg',
      source: 'package-json',
    });
  });

  it('returns null when no package.json exists', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);

    const result = detectRootRepo('/fake/dir');

    expect(result).toBeNull();
  });

  it('returns null when package.json has no repository or scoped name', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      name: 'plain-pkg',
      version: '1.0.0',
    }));

    const result = detectRootRepo('/fake/dir');

    expect(result).toBeNull();
  });

  it('handles malformed package.json gracefully', () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not-json{{{');

    const result = detectRootRepo('/fake/dir');

    expect(result).toBeNull();
  });
});

// ============================================================================
// T-011: promptRootRepoConnection() interactive flow
// ============================================================================

describe('promptRootRepoConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows detected repo and returns it on confirm', async () => {
    mockDetectProvider.mockReturnValue({
      provider: 'github',
      owner: 'detected-org',
      repo: 'detected-repo',
    });
    mockConfirm.mockResolvedValue(true);

    const result = await promptRootRepoConnection('/fake/dir', 'en', false);

    expect(result).toEqual({
      owner: 'detected-org',
      repo: 'detected-repo',
      source: 'git-remote',
    });
    expect(mockConfirm).toHaveBeenCalled();
  });

  it('prompts for manual input when user declines auto-detected repo', async () => {
    mockDetectProvider.mockReturnValue({
      provider: 'github',
      owner: 'detected-org',
      repo: 'detected-repo',
    });
    mockConfirm
      .mockResolvedValueOnce(false)  // decline auto-detect
      .mockResolvedValueOnce(true);  // yes, connect manually
    mockInput
      .mockResolvedValueOnce('manual-org')
      .mockResolvedValueOnce('manual-repo');

    const result = await promptRootRepoConnection('/fake/dir', 'en', false);

    expect(result).toEqual({
      owner: 'manual-org',
      repo: 'manual-repo',
      source: 'user-input',
    });
  });

  it('returns null when user declines connection entirely', async () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);
    mockConfirm.mockResolvedValue(false);

    const result = await promptRootRepoConnection('/fake/dir', 'en', false);

    expect(result).toBeNull();
  });

  it('shows explanation text about umbrella workspace when prompting', async () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);
    mockConfirm.mockResolvedValue(false);

    await promptRootRepoConnection('/fake/dir', 'en', false);

    // Confirm prompt should include explanation about the umbrella model
    const confirmCall = mockConfirm.mock.calls[0]?.[0];
    expect(confirmCall?.message).toContain('GitHub');
  });

  // ============================================================================
  // T-012: CI/quick mode skip
  // ============================================================================

  it('returns auto-detected result without prompting in CI mode', async () => {
    mockDetectProvider.mockReturnValue({
      provider: 'github',
      owner: 'ci-org',
      repo: 'ci-repo',
    });

    const result = await promptRootRepoConnection('/fake/dir', 'en', true);

    expect(result).toEqual({
      owner: 'ci-org',
      repo: 'ci-repo',
      source: 'git-remote',
    });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockInput).not.toHaveBeenCalled();
  });

  it('returns null without prompting in CI mode when nothing detected', async () => {
    mockDetectProvider.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);

    const result = await promptRootRepoConnection('/fake/dir', 'en', true);

    expect(result).toBeNull();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
