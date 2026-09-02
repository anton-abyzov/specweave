/**
 * resolveGitHubToken — one resolver, one documented order:
 * config → process.env → .env → gh CLI.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveGitHubToken, describeGitHubAuth, resolveGitHubLogin } from '../../../src/utils/auth-helpers.js';

describe('resolveGitHubToken', () => {
  let root: string;
  const noGh = () => undefined;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-token-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('config token wins over everything', () => {
    fs.writeFileSync(path.join(root, '.env'), 'GITHUB_TOKEN=ghp_dotenv\n');
    const auth = resolveGitHubToken(root, {
      configToken: 'ghp_config',
      env: { GITHUB_TOKEN: 'ghp_shell' },
      ghCliToken: () => 'gho_cli',
    });
    expect(auth).toMatchObject({ token: 'ghp_config', source: 'config', origin: 'config', isOAuthToken: false });
  });

  it('process.env beats .env (shell exports and CI are explicit)', () => {
    fs.writeFileSync(path.join(root, '.env'), 'GITHUB_TOKEN=ghp_dotenv\n');
    const auth = resolveGitHubToken(root, { env: { GH_TOKEN: 'ghp_shell' }, ghCliToken: noGh });
    expect(auth).toMatchObject({ token: 'ghp_shell', source: 'GH_TOKEN', origin: 'process.env' });
  });

  it('.env beats gh CLI; GITHUB_TOKEN beats GH_TOKEN inside .env', () => {
    fs.writeFileSync(path.join(root, '.env'), 'GH_TOKEN=ghp_alt\nGITHUB_TOKEN="ghp_dotenv"\n');
    const auth = resolveGitHubToken(root, { env: {}, ghCliToken: () => 'gho_cli' });
    expect(auth).toMatchObject({ token: 'ghp_dotenv', source: 'GITHUB_TOKEN', origin: '.env' });
  });

  it('falls back to gh CLI, then none', () => {
    const cli = resolveGitHubToken(root, { env: {}, ghCliToken: () => 'gho_cli' });
    expect(cli).toMatchObject({ token: 'gho_cli', source: 'gh-cli', origin: 'gh-cli', isOAuthToken: true });
    const none = resolveGitHubToken(root, { env: {}, ghCliToken: noGh });
    expect(none).toMatchObject({ token: '', source: 'none', origin: 'none' });
  });

  it('describeGitHubAuth never prints the token and names the layer + account', () => {
    const auth = resolveGitHubToken(root, { env: { GITHUB_TOKEN: 'ghp_secret_value' }, ghCliToken: noGh });
    const line = describeGitHubAuth(auth, 'anton-abyzov');
    expect(line).toBe('GitHub token: process.env GITHUB_TOKEN (pat, account anton-abyzov)');
    expect(line).not.toContain('ghp_secret_value');
    expect(describeGitHubAuth({ token: '', source: 'none' })).toContain('none');
  });

  it('resolveGitHubLogin is best-effort and passes the token via GH_TOKEN', () => {
    let seenEnv: NodeJS.ProcessEnv | undefined;
    const login = resolveGitHubLogin('ghp_x', (_cmd, env) => { seenEnv = env; return 'octocat\n'; });
    expect(login).toBe('octocat');
    expect(seenEnv?.GH_TOKEN).toBe('ghp_x');
    expect(resolveGitHubLogin('ghp_x', () => { throw new Error('gh missing'); })).toBeNull();
    expect(resolveGitHubLogin('', () => 'never')).toBeNull();
  });
});
