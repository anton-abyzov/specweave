import { describe, it, expect } from 'vitest';

describe('resource-base shared validator module', () => {
  it('ResourceValidator interface exports are present', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    expect(mod).toBeDefined();
  });

  it('BaseResourceValidator is an instantiable concrete class via subclass', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    expect(mod).toHaveProperty('BaseResourceValidator');
    expect(mod).toHaveProperty('GitHubResourceValidator');

    const ModuleCls = (mod as Record<string, unknown>).GitHubResourceValidator as new () => {
      validate(url: string): { valid: boolean; error?: string };
      ping(url: string): Promise<boolean>;
      formatUrl(raw: string): string;
    };
    const instance = new ModuleCls();
    expect(typeof instance.validate).toBe('function');
    expect(typeof instance.ping).toBe('function');
    expect(typeof instance.formatUrl).toBe('function');
  });

  it('validate returns a ValidationResult with boolean valid field', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    const GitHubResourceValidator = (mod as Record<string, unknown>)
      .GitHubResourceValidator as new () => { validate(url: string): { valid: boolean; error?: string } };
    const v = new GitHubResourceValidator();
    const ok = v.validate('https://github.com/acme/repo');
    expect(ok).toHaveProperty('valid');
    expect(typeof ok.valid).toBe('boolean');
    expect(ok.valid).toBe(true);

    const bad = v.validate('not-a-url');
    expect(bad.valid).toBe(false);
    expect(typeof bad.error).toBe('string');
  });

  it('ping returns a Promise<boolean>', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    const GitHubResourceValidator = (mod as Record<string, unknown>)
      .GitHubResourceValidator as new () => { ping(url: string): Promise<boolean> };
    const v = new GitHubResourceValidator();
    const result = v.ping('https://example.invalid/definitely-not-real');
    expect(result).toBeInstanceOf(Promise);
    const value = await result;
    expect(typeof value).toBe('boolean');
  });

  it('formatUrl trims whitespace and trailing slashes', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    const GitHubResourceValidator = (mod as Record<string, unknown>)
      .GitHubResourceValidator as new () => { formatUrl(raw: string): string };
    const v = new GitHubResourceValidator();
    expect(v.formatUrl('  https://github.com/acme/repo/  ')).toBe('https://github.com/acme/repo');
  });

  it('JiraResourceValidator and AzureDevOpsResourceValidator are also exported', async () => {
    const mod = await import('./resource-base.js').catch(() => null);
    expect(mod).not.toBeNull();
    expect(mod).toHaveProperty('JiraResourceValidator');
    expect(mod).toHaveProperty('AzureDevOpsResourceValidator');
  });
});
