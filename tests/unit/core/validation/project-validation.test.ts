/**
 * Tests for project validation rules (T-011 / T-012 / T-013)
 *
 * AC-US4-01: umbrella + childRepos.length > 1 + no metadata.project → WARNING
 * AC-US4-02: single-repo + no metadata.project → NO warning
 * AC-US4-03: metadata.project not matching any childRepo → WARNING
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ThreeFileValidator,
  ValidationSeverity,
  ValidationErrorCode,
} from '../../../../src/core/validation/three-file-validator.js';

describe('Project field validation (T-011 / T-012 / T-013)', () => {
  let tempDir: string;
  let validator: ThreeFileValidator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-proj-val-'));
    validator = new ThreeFileValidator();

    // Write minimal valid files
    fs.writeFileSync(path.join(tempDir, 'spec.md'), `# Feature
## Acceptance Criteria
- [ ] AC-US1-01: criterion
`);
    fs.writeFileSync(path.join(tempDir, 'plan.md'), `# Plan
## Architecture
Overview
`);
    fs.writeFileSync(path.join(tempDir, 'tasks.md'), `# Tasks
## Phase 1
### T-001: Task
**Implementation**: step
**Test Plan**: test
**AC-IDs**: AC-US1-01
`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Clean up any .specweave/ written to the parent of os.tmpdir() (two levels up from tempDir).
    // These tests simulate an umbrella root by writing to path.resolve(tempDir, '..', '..'),
    // which lands outside os.tmpdir() and must be cleaned up explicitly.
    try {
      const parentConfigDir = path.resolve(tempDir, '..', '..', '.specweave');
      if (fs.existsSync(parentConfigDir)) {
        const configFile = path.join(parentConfigDir, 'config.json');
        if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
        // Only remove the directory if it's now empty (other tests may still need it)
        try { fs.rmdirSync(parentConfigDir); } catch { /* not empty, skip */ }
      }
    } catch { /* non-critical cleanup */ }
  });

  function writeMetadata(data: Record<string, unknown>): void {
    fs.writeFileSync(path.join(tempDir, 'metadata.json'), JSON.stringify(data, null, 2));
  }

  function writeConfig(data: Record<string, unknown>): void {
    // Config is in the parent .specweave directory
    const specweaveDir = path.dirname(tempDir);
    const configPath = path.join(specweaveDir, 'config.json');
    if (!fs.existsSync(path.dirname(configPath))) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  }

  // T-011/T-012: METADATA_MISSING_PROJECT
  // AC-US4-01: umbrella + childRepos > 1 + no project → WARNING
  it('should emit METADATA_MISSING_PROJECT when umbrella enabled and no project', () => {
    writeMetadata({ id: '0001-test', status: 'active' });
    // Write config in parent .specweave/ dir
    const configDir = path.resolve(tempDir, '..', '..');
    const configPath = path.join(configDir, '.specweave', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          { id: 'repo-a', path: 'repos/a' },
          { id: 'repo-b', path: 'repos/b' },
        ],
      },
    }));

    const result = validator.validateIncrement(tempDir, configDir);
    const projectWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_MISSING_PROJECT
    );
    expect(projectWarnings).toHaveLength(1);
    expect(projectWarnings[0].severity).toBe(ValidationSeverity.WARNING);
  });

  // AC-US4-02: no umbrella + no project → NO warning
  it('should NOT emit warning for single-repo project without project field', () => {
    writeMetadata({ id: '0002-test', status: 'active' });
    const configDir = path.resolve(tempDir, '..', '..');
    const configPath = path.join(configDir, '.specweave', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: { enabled: false },
    }));

    const result = validator.validateIncrement(tempDir, configDir);
    const projectWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_MISSING_PROJECT
    );
    expect(projectWarnings).toHaveLength(0);
  });

  it('should NOT emit warning when no config exists', () => {
    writeMetadata({ id: '0003-test', status: 'active' });

    const result = validator.validateIncrement(tempDir);
    const projectWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_MISSING_PROJECT ||
           i.code === ValidationErrorCode.METADATA_UNKNOWN_PROJECT
    );
    expect(projectWarnings).toHaveLength(0);
  });

  // T-013: METADATA_UNKNOWN_PROJECT
  // AC-US4-03: project = "unknown-repo" → WARNING
  it('should emit METADATA_UNKNOWN_PROJECT for unrecognized project name', () => {
    writeMetadata({ id: '0004-test', status: 'active', project: 'unknown-repo' });
    const configDir = path.resolve(tempDir, '..', '..');
    const configPath = path.join(configDir, '.specweave', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          { id: 'repo-a', path: 'repos/a' },
          { id: 'repo-b', path: 'repos/b' },
        ],
      },
    }));

    const result = validator.validateIncrement(tempDir, configDir);
    const unknownWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_UNKNOWN_PROJECT
    );
    expect(unknownWarnings).toHaveLength(1);
    expect(unknownWarnings[0].severity).toBe(ValidationSeverity.WARNING);
    expect(unknownWarnings[0].message).toContain('unknown-repo');
  });

  it('should NOT emit METADATA_UNKNOWN_PROJECT when project matches a childRepo', () => {
    writeMetadata({ id: '0005-test', status: 'active', project: 'repo-a' });
    const configDir = path.resolve(tempDir, '..', '..');
    const configPath = path.join(configDir, '.specweave', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          { id: 'repo-a', path: 'repos/a' },
          { id: 'repo-b', path: 'repos/b' },
        ],
      },
    }));

    const result = validator.validateIncrement(tempDir, configDir);
    const unknownWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_UNKNOWN_PROJECT
    );
    expect(unknownWarnings).toHaveLength(0);
  });

  it('should NOT emit METADATA_UNKNOWN_PROJECT when project matches umbrella.projectName', () => {
    writeMetadata({ id: '0006-test', status: 'active', project: 'ws' });
    const configDir = path.resolve(tempDir, '..', '..');
    const configPath = path.join(configDir, '.specweave', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({
      umbrella: {
        enabled: true,
        projectName: 'ws',
        childRepos: [
          { id: 'repo-a', path: 'repos/a' },
        ],
      },
    }));

    const result = validator.validateIncrement(tempDir, configDir);
    const unknownWarnings = result.issues.filter(
      i => i.code === ValidationErrorCode.METADATA_UNKNOWN_PROJECT
    );
    expect(unknownWarnings).toHaveLength(0);
  });
});
