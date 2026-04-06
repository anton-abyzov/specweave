import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkReflectConfig } from '../../../../src/core/session/reflect-checker.js';

describe('core/session/reflect-checker', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-reflect-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-006
  it('should return enabled:true when reflect.enabled is true', () => {
    fs.writeFileSync(configPath, JSON.stringify({ reflect: { enabled: true } }));
    const result = checkReflectConfig(configPath);
    expect(result.enabled).toBe(true);
  });

  // TC-007
  it('should return enabled:false when reflect.enabled is false', () => {
    fs.writeFileSync(configPath, JSON.stringify({ reflect: { enabled: false } }));
    const result = checkReflectConfig(configPath);
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('disabled');
  });

  it('should default to enabled when config file does not exist', () => {
    const result = checkReflectConfig(path.join(tmpDir, 'nonexistent.json'));
    expect(result.enabled).toBe(true);
    expect(result.reason).toContain('No config');
  });

  it('should default to enabled when reflect key is missing', () => {
    fs.writeFileSync(configPath, JSON.stringify({ version: '1.0' }));
    const result = checkReflectConfig(configPath);
    expect(result.enabled).toBe(true);
  });

  it('should default to enabled on corrupt JSON', () => {
    fs.writeFileSync(configPath, 'not json');
    const result = checkReflectConfig(configPath);
    expect(result.enabled).toBe(true);
    expect(result.reason).toContain('error');
  });
});
